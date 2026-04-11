const TEST_KEY = "tests";

let currentTest = null;
let questions = [];
let currentIndex = 0;
let answers = {};
let timerInterval = null;
let remainingSeconds = 0;
let quizSubmitted = false;

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Hành động pending khi popup cảnh báo hiện ra ("logout" hoặc "home")
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
  const map = new Map();
  staticData.forEach((t) => map.set(t.id, t));
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

  // Dùng Math.round để tránh phần lẻ giây (ví dụ 0.36 * 60 = 21.6 → 22s)
  remainingSeconds = Math.round(parseFloat(currentTest.time) * 60);

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
    updateCountdown();
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      submitQuiz();
    }
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
  if (remainingSeconds <= 60) {
    block.classList.add("timer--danger");
  } else if (remainingSeconds <= 180) {
    block.classList.add("timer--warning");
  }
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

  // Progress bar
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
  // Chỉ đóng popup finish khi click overlay, không đóng result / warning
  closeFinishPopup();
}

// POPUP FINISH (xác nhận nộp)
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

// POPUP CẢNH BÁO (rời trang khi chưa nộp)
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
  // Nộp bài trước rồi thực hiện hành động sau
  document.getElementById("popup-warning").classList.remove("active");
  submitQuiz(pendingAction);
}

// ĐĂNG XUẤT / TRANG CHỦ (chặn khi đang thi)
function handleHome() {
  if (!quizSubmitted) {
    showWarningPopup("home");
  } else {
    window.location.href = "../pages/home.html";
  }
}

function logOut() {
  if (!quizSubmitted) {
    showWarningPopup("logout");
  } else {
    doLogout();
  }
}

function doLogout() {
  localStorage.removeItem("currentUser");
  window.location.href = "../pages/login.html";
}

// TÍNH ĐIỂM
function calcScore() {
  let correct = 0;
  questions.forEach((q) => {
    if (q.type === "essay") {
      const text = String(answers[q.id] || "").trim();
      if (text && q.answer && text.toLowerCase() === String(q.answer).trim().toLowerCase()) {
        correct++;
      }
      return;
    }

    const chosenIdx = answers[q.id];
    if (chosenIdx === undefined) return;
    const chosen = (q.answers || [])[chosenIdx];
    if (chosen && chosen.isCorrect === true) correct++;
  });
  return correct;
}

// NỘP BÀI
function submitQuiz(afterAction) {
  clearInterval(timerInterval);
  quizSubmitted = true;
  closeFinishPopup();

  const total = questions.length;
  const answered = Object.keys(answers).length;
  const correct = calcScore();
  const score100 =
    total > 0 ? Math.round((correct / total) * 100 * 100) / 100 : 0;
  const pct = Math.round((correct / total) * 100);

  // Ring percentage dùng CSS custom property
  document.getElementById("popup-result").style.setProperty("--pct", `${pct}%`);
  document.getElementById("result-score").textContent = `${score100}/100`;
  document.getElementById("result-detail").innerHTML =
    `Đúng <strong style="color:var(--primary)">${correct}</strong> / ${total} câu &nbsp;·&nbsp; Đã trả lời ${answered} / ${total} câu`;

  // Điều chỉnh nút "Về trang chủ" nếu cần logout sau khi nộp
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

  showOverlay();
  document.getElementById("popup-result").classList.add("active");
}

// OVERLAY HELPER
function showOverlay() {
  document.getElementById("overlay-quiz").classList.add("active");
}

function hideOverlay() {
  document.getElementById("overlay-quiz").classList.remove("active");
}
