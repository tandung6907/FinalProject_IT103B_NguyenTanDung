const TEST_KEY = "tests";
const RESULT_KEY = "quizResults";

let currentTest = null;
let questions = [];
let currentIndex = 0;
let answers = {};
let timerInterval = null;
let remainingSeconds = 0;
let quizSubmitted = false;

function getQuizTimerKey(id) {
  return `quiz-remaining-${id}`;
}

function loadSavedRemainingSeconds(id) {
  const raw = sessionStorage.getItem(getQuizTimerKey(id));
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function saveRemainingSeconds(id, seconds) {
  sessionStorage.setItem(getQuizTimerKey(id), String(seconds));
}

function clearSavedRemainingSeconds(id) {
  sessionStorage.removeItem(getQuizTimerKey(id));
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function loadQuizResults() {
  const data = localStorage.getItem(RESULT_KEY);
  return data ? JSON.parse(data) : [];
}

function saveQuizResults(results) {
  localStorage.setItem(RESULT_KEY, JSON.stringify(results));
}

function saveQuizResult(entry) {
  const allResults = loadQuizResults();
  allResults.unshift(entry);
  saveQuizResults(allResults);
}

async function syncQuizResultToRemote(entry) {
  const config = getRemoteResultConfig();
  if (!config) return;

  try {
    const remoteResults = await loadRemoteResultsFromGithub().catch(() => []);
    const merged = mergeResultRecords(remoteResults, [entry]);
    await saveRemoteResultsToGithub(merged);
  } catch (error) {
    console.warn("Không thể đồng bộ kết quả lên GitHub:", error);
  }
}

function createQuizResultRecord(user, totalQuestions, answered, correct, totalMCQ, essayCount) {
  const answersData = questions.map((q) => {
    if (q.type === "essay") {
      return {
        id: q.id,
        type: "essay",
        name: q.name,
        userText: String(answers[q.id] || "").trim(),
        modelAnswer:
          q.answer ||
          (q.answers && q.answers.find((a) => a.isCorrect)?.text) ||
          "",
      };
    }

    const opts = (q.answers || []).map((a) => String(a.text || ""));
    return {
      id: q.id,
      type: "mcq",
      name: q.name,
      options: opts,
      correctIdx: (q.answers || []).findIndex((a) => a.isCorrect === true),
      userIdx:
        answers[q.id] === undefined || answers[q.id] === null
          ? null
          : Number(answers[q.id]),
    };
  });

  return {
    id: Date.now(),
    testId: currentTest.id,
    testName: currentTest.name,
    userId: user.id || null,
    userName: user.name || "Khách",
    userEmail: user.email || "",
    score100: totalMCQ > 0 ? Math.round((correct / totalMCQ) * 100 * 100) / 100 : 0,
    correctMCQ: correct,
    totalMCQ,
    totalQuestions,
    answeredCount: answered,
    essayCount,
    createdAt: new Date().toISOString(),
    status: "pending",
    adminNote: "",
    answers: answersData,
  };
}

let pendingAction = null;

async function loadStaticTests() {
  try {
    const response = await fetch("../data/tests.json");
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

async function loadTests() {
  const localData = JSON.parse(localStorage.getItem(TEST_KEY) || "[]");
  const staticData = await loadStaticTests();
  const remoteData = await loadRemoteTestsFromGithub().catch(() => []);
  const map = new Map();
  staticData.forEach((t) => map.set(t.id, t));
  remoteData.forEach((t) => map.set(t.id, t));
  localData.forEach((t) => map.set(t.id, t));
  return Array.from(map.values());
}

// INIT
window.onload = async function () {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"));

  const tests = await loadTests();
  currentTest = tests.find((t) => t.id === id);

  if (!currentTest) {
    alert("Không tìm thấy bài test!");
    window.location.href = "../pages/home.html";
    return;
  }

  questions = currentTest.questions || [];

  if (questions.length === 0) {
    alert("Bài test chưa có câu hỏi!");
    window.location.href = "../pages/home.html";
    return;
  }

  document.getElementById("quiz-test-name").textContent = currentTest.name;
  document.getElementById("total-time-val").textContent =
    `${currentTest.time} phút`;

  const saved = loadSavedRemainingSeconds(id);
  remainingSeconds = saved !== null ? Math.max(0, saved) : Math.round(parseFloat(currentTest.time) * 60);

  if (remainingSeconds <= 0) {
    submitQuiz();
    return;
  }

  startTimer();
  renderNavGrid();
  renderQuestion();

  document
    .getElementById("overlay-quiz")
    .addEventListener("click", handleOverlayClick);
};

// TIMER
function startTimer() {
  updateCountdown();
  timerInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateCountdown();
      clearInterval(timerInterval);
      submitQuiz();
      return;
    }
    saveRemainingSeconds(currentTest.id, remainingSeconds);
    updateCountdown();
  }, 1000);
}

function updateCountdown() {
  const m = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (remainingSeconds % 60).toString().padStart(2, "0");
  const el = document.getElementById("countdown");
  const block = document.getElementById("countdown-block");
  el.textContent = `${m}:${s}`;

  block.classList.remove("timer--danger", "timer--warning");
  if (remainingSeconds <= 60) block.classList.add("timer--danger");
  else if (remainingSeconds <= 180) block.classList.add("timer--warning");
}

// RENDER NAV GRID
function renderNavGrid() {
  const grid = document.getElementById("nav-grid");
  grid.innerHTML = questions
    .map((q, i) => {
      const answerValue = answers[q.id];
      const answered = answerValue !== undefined && answerValue !== "";
      const isCurrent = i === currentIndex;
      let cls = "nav-btn";
      if (isCurrent) cls += " nav-btn--current";
      else if (answered) cls += " nav-btn--answered";
      return `<button class="${cls}" onclick="jumpTo(${i})">${i + 1}</button>`;
    })
    .join("");
}

// RENDER QUESTION
function renderQuestion() {
  const q = questions[currentIndex];
  const total = questions.length;

  document.getElementById("quiz-qnum").textContent =
    `Câu ${currentIndex + 1} / ${total}`;

  const pct = ((currentIndex + 1) / total) * 100;
  document.getElementById("progress-fill").style.width = `${pct}%`;

  document.getElementById("quiz-qtext").textContent = q.name;

  const optList = document.getElementById("quiz-options");
  if (q.type === "essay") {
    const value = answers[q.id] || "";
    optList.innerHTML = `
      <li class="quiz-option quiz-option--essay">
        <label for="essay-answer">Đáp án tự luận</label>
        <textarea id="essay-answer" rows="6" placeholder="Nhập câu trả lời..." oninput="saveEssayAnswer(${q.id}, this.value)">${escapeHtml(value)}</textarea>
      </li>`;
  } else {
    const opts = (q.answers || []).map((a) => a.text);
    optList.innerHTML = opts
      .map((opt, idx) => {
        const selected = answers[q.id] === idx;
        return `
          <li class="quiz-option ${selected ? "quiz-option--selected" : ""}"
              onclick="selectAnswer(${q.id}, ${idx}, this)">
            <span class="option-marker">${String.fromCharCode(65 + idx)}</span>
            <span class="option-text">${opt}</span>
          </li>`;
      })
      .join("");
  }

  document.getElementById("btn-prev").disabled = currentIndex === 0;
  document.getElementById("btn-next").disabled = currentIndex === total - 1;

  renderNavGrid();
}

function saveEssayAnswer(qId, value) {
  answers[qId] = value;
  renderNavGrid();
}

// SELECT ANSWER
function selectAnswer(qId, optIdx, el) {
  answers[qId] = optIdx;
  document
    .querySelectorAll(".quiz-option")
    .forEach((li) => li.classList.remove("quiz-option--selected"));
  el.classList.add("quiz-option--selected");
  renderNavGrid();
}

// NAVIGATE
function goQuestion(dir) {
  const next = currentIndex + dir;
  if (next < 0 || next >= questions.length) return;
  currentIndex = next;
  renderQuestion();
}

function jumpTo(idx) {
  currentIndex = idx;
  renderQuestion();
}

// OVERLAY CLICK
function handleOverlayClick() {
  closeFinishPopup();
}

// POPUP FINISH
function handleFinish() {
  const answered = Object.keys(answers).length;
  const unanswered = questions.length - answered;

  document.getElementById("unanswered-count").textContent = unanswered;
  document.getElementById("answered-count").textContent = answered;
  document.getElementById("total-count").textContent = questions.length;

  showOverlay();
  document.getElementById("popup-finish").classList.add("active");
}

function closeFinishPopup() {
  document.getElementById("popup-finish").classList.remove("active");
  if (
    !document.getElementById("popup-result").classList.contains("active") &&
    !document.getElementById("popup-warning").classList.contains("active")
  ) {
    hideOverlay();
  }
}

// POPUP CẢNH BÁO
function showWarningPopup(action) {
  pendingAction = action;
  showOverlay();
  document.getElementById("popup-warning").classList.add("active");
}

function closeWarningPopup() {
  pendingAction = null;
  document.getElementById("popup-warning").classList.remove("active");
  hideOverlay();
}

function confirmLeave() {
  document.getElementById("popup-warning").classList.remove("active");
  submitQuiz(pendingAction);
}

// ĐĂNG XUẤT / TRANG CHỦ
function handleHome() {
  if (!quizSubmitted) showWarningPopup("home");
  else window.location.href = "../pages/home.html";
}

function logOut() {
  if (!quizSubmitted) showWarningPopup("logout");
  else doLogout();
}

function doLogout() {
  localStorage.removeItem("currentUser");
  window.location.href = "../pages/login.html";
}

// TÍNH ĐIỂM
// Câu essay KHÔNG tự chấm — chỉ tính câu trắc nghiệm
function calcScore() {
  let correct = 0;
  questions.forEach((q) => {
    if (q.type === "essay") return; // bỏ qua, giáo viên chấm thủ công

    const chosenIdx = answers[q.id];
    if (chosenIdx === undefined) return;
    const chosen = (q.answers || [])[chosenIdx];
    if (chosen && chosen.isCorrect === true) correct++;
  });
  return correct;
}

// Đếm riêng câu trắc nghiệm để tính điểm đúng
function countMCQ() {
  return questions.filter((q) => q.type !== "essay").length;
}

// NỘP BÀI
function submitQuiz(afterAction) {
  clearInterval(timerInterval);
  quizSubmitted = true;
  closeFinishPopup();

  const total = questions.length;
  const answered = Object.keys(answers).length;
  const mcqTotal = countMCQ();
  const correct = calcScore();

  // Tính điểm chỉ trên phần trắc nghiệm
  const score100 =
    mcqTotal > 0 ? Math.round((correct / mcqTotal) * 100 * 100) / 100 : 0;
  const pct = mcqTotal > 0 ? Math.round((correct / mcqTotal) * 100) : 0;

  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const resultRecord = createQuizResultRecord(
    currentUser,
    total,
    answered,
    correct,
    mcqTotal,
    total - mcqTotal,
  );
  saveQuizResult(resultRecord);
  syncQuizResultToRemote(resultRecord);

  document.getElementById("popup-result").style.setProperty("--pct", `${pct}%`);
  document.getElementById("result-score").textContent = `${score100}/100`;

  const essayCount = total - mcqTotal;
  const essayNote =
    essayCount > 0
      ? ` &nbsp;·&nbsp; <span style="color:var(--warning, #f59e0b)">${essayCount} câu tự luận sẽ được giáo viên chấm sau</span>`
      : "";

  document.getElementById("result-detail").innerHTML =
    `Điểm hiện tại chỉ tính phần trắc nghiệm: <strong style="color:var(--primary)">${score100}/100</strong>.` +
    ` <br>Đúng ${correct} / ${mcqTotal} câu trắc nghiệm` +
    ` &nbsp;·&nbsp; Đã trả lời ${answered} / ${total} câu` +
    essayNote;

  const btnHome = document.querySelector(".btn-home");
  if (afterAction === "logout") {
    btnHome.textContent = "Đăng xuất";
    btnHome.onclick = doLogout;
  } else {
    btnHome.textContent = "Về trang chủ";
    btnHome.onclick = () => {
      window.location.href = "../pages/home.html";
    };
  }

  clearSavedRemainingSeconds(currentTest.id);
  showOverlay();
  document.getElementById("popup-result").classList.add("active");
}

// XEM LẠI ĐÁP ÁN SAU KHI NỘP
function renderReview() {
  // Tìm hoặc tạo container review trong popup-result body
  let reviewEl = document.getElementById("result-review");
  const resultBody = document.querySelector("#popup-result .popup-result__body");
  if (!resultBody) return;

  if (!reviewEl) {
    reviewEl = document.createElement("div");
    reviewEl.id = "result-review";
    resultBody.appendChild(reviewEl);
  }

  reviewEl.innerHTML = `
    <div class="review-header">
      <h3 class="review-title">Xem lại đáp án</h3>
    </div>
    <div class="review-list">
      ${questions.map((q, idx) => renderReviewItem(q, idx)).join("")}
    </div>`;
}

function renderReviewItem(q, idx) {
  const isEssay = q.type === "essay";
  const userAnswer = answers[q.id];

  if (isEssay) {
    // Lấy đáp án mẫu từ answers[0].text (cách lưu của file Excel import)
    const modelAnswer =
      q.answers && q.answers[0] && q.answers[0].text
        ? q.answers[0].text
        : q.answer || "";

    const userText = String(userAnswer || "").trim();

    return `
      <div class="review-item review-item--essay">
        <div class="review-qnum">Câu ${idx + 1} <span class="review-tag review-tag--essay">Tự luận</span></div>
        <div class="review-qtext">${escapeHtml(q.name)}</div>
        <div class="review-essay-row">
          <div class="review-essay-block review-essay-block--user">
            <div class="review-essay-label">Bài làm của bạn</div>
            <div class="review-essay-content">${userText ? escapeHtml(userText) : '<em style="color:#aaa">Chưa trả lời</em>'}</div>
          </div>
          <div class="review-essay-block review-essay-block--model">
            <div class="review-essay-label">Đáp án gợi ý</div>
            <div class="review-essay-content">${modelAnswer ? escapeHtml(modelAnswer) : '<em style="color:#aaa">Không có đáp án mẫu</em>'}</div>
          </div>
        </div>
        <div class="review-essay-note">⚠ Câu tự luận do giáo viên chấm điểm</div>
      </div>`;
  }

  // Trắc nghiệm
  const chosenIdx = userAnswer;
  const optList = q.answers || [];
  const correctIdx = optList.findIndex((a) => a.isCorrect === true);
  const isCorrect = chosenIdx !== undefined && chosenIdx === correctIdx;
  const statusClass =
    chosenIdx === undefined
      ? "review-item--skipped"
      : isCorrect
        ? "review-item--correct"
        : "review-item--wrong";
  const statusLabel =
    chosenIdx === undefined ? "Bỏ qua" : isCorrect ? "✓ Đúng" : "✗ Sai";
  const statusTag =
    chosenIdx === undefined
      ? "review-tag--skipped"
      : isCorrect
        ? "review-tag--correct"
        : "review-tag--wrong";

  const optsHtml = optList
    .map((opt, oi) => {
      let cls = "review-opt";
      if (oi === correctIdx) cls += " review-opt--correct";
      if (oi === chosenIdx && !isCorrect) cls += " review-opt--wrong";
      const marker = String.fromCharCode(65 + oi);
      const icon =
        oi === correctIdx ? " ✓" : oi === chosenIdx && !isCorrect ? " ✗" : "";
      return `<div class="${cls}"><span class="option-marker">${marker}</span><span>${escapeHtml(opt.text)}${icon}</span></div>`;
    })
    .join("");

  return `
    <div class="review-item ${statusClass}">
      <div class="review-qnum">Câu ${idx + 1} <span class="review-tag ${statusTag}">${statusLabel}</span></div>
      <div class="review-qtext">${escapeHtml(q.name)}</div>
      <div class="review-opts">${optsHtml}</div>
    </div>`;
}

// OVERLAY HELPER
function showOverlay() {
  document.getElementById("overlay-quiz").classList.add("active");
}

function hideOverlay() {
  document.getElementById("overlay-quiz").classList.remove("active");
}
