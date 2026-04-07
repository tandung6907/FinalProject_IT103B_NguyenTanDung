const TEST_KEY = "tests";
const CATEGORY_KEY = "categories";

let tests = [];
let questions = [];
let nextQuesId = 1;
let editingQuesId = null;
let deleteQuesId = null;
let currentBase64Img = "";
let currentTestId = null;

// Mảng đáp án tạm thời trong popup
let tempAnswers = [];
// tempAnswers: [{ id, text, isCorrect }]

// DOM refs
let testName, testImg, testTime, previewImg, fileName;
let listCategory, quesName, questionList;
let overlay, popupForm, popupConfirm, confirmName;
let errorTest,
  errorTime,
  errorQuestion,
  errorAnswer,
  missingQuestion,
  errorIcon;

// LOCALSTORAGE
function loadTestFromLocalStorage() {
  const data = localStorage.getItem(TEST_KEY);
  return data ? JSON.parse(data) : [];
}

function saveTestToLocalStorage() {
  localStorage.setItem(TEST_KEY, JSON.stringify(tests));
}

function loadCategoryFromLocalStorage() {
  const data = localStorage.getItem(CATEGORY_KEY);
  return data ? JSON.parse(data) : [];
}

// INIT
window.onload = function () {
  tests = loadTestFromLocalStorage();

  const params = new URLSearchParams(window.location.search);
  currentTestId = parseInt(params.get("id"));

  const currentTest = tests.find((t) => t.id === currentTestId);
  if (!currentTest) {
    alert("Không tìm thấy bài test!");
    window.location.href = "../pages/test-manager.html";
    return;
  }

  // DOM
  testName = document.getElementById("test-name");
  testImg = document.getElementById("category-img");
  testTime = document.getElementById("test-time");
  listCategory = document.getElementById("test-category");
  previewImg = document.getElementById("preview-img");
  fileName = document.getElementById("file-name");
  overlay = document.getElementById("overlay");
  popupForm = document.getElementById("popup-form");
  popupConfirm = document.getElementById("popup-confirm");
  quesName = document.getElementById("question-name");
  questionList = document.querySelector(".question-test");
  errorTest = document.querySelector(".error-test");
  errorQuestion = document.querySelector(".error-question");
  errorAnswer = document.querySelector(".error-answer");
  errorTime = document.querySelector(".error-time");
  errorIcon = document.querySelector(".error-icon");
  missingQuestion = document.querySelector(".missing-question");
  confirmName = document.getElementById("confirm-name");

  renderCategories(loadCategoryFromLocalStorage());
  fillFormData(currentTest);

  // EVENTS
  document.querySelector(".btn-add").onclick = openAddPopup;
  document.querySelector(".btn-save").onclick = handleSubmitTest;
  document.getElementById("btn-save").onclick = handleSubmitQuestion;
  document.getElementById("btn-confirm-delete").onclick = handleDeleteQuestion;
  document.getElementById("btn-add-answer").onclick = addAnswerRow;
  document.getElementById("popup-close").onclick = closePopup;
  document.getElementById("btn-cancel").onclick = closePopup;
  document.getElementById("btn-cancel-delete").onclick = closeConfirm;

  overlay.onclick = () => {
    closePopup();
    closeConfirm();
  };

  testImg.onchange = function () {
    const file = this.files[0];
    if (!file) return;
    fileName.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentBase64Img = e.target.result;
      previewImg.src = currentBase64Img;
      previewImg.style.display = "block";
    };
    reader.readAsDataURL(file);
  };
};

// FILL DỮ LIỆU VÀO FORM
function fillFormData(test) {
  testName.value = test.name || "";
  testTime.value = test.time || "";

  if (test.img) {
    currentBase64Img = test.img;
    previewImg.src = test.img;
    previewImg.style.display = "block";
    fileName.textContent = "Ảnh hiện tại";
  }

  questions = test.questions ? test.questions.map((q) => ({ ...q })) : [];
  nextQuesId =
    questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;

  renderQuestions();

  if (test.categoryId) {
    listCategory.value = test.categoryId;
  }
}

// RENNDER CATEGORIES
function renderCategories(categories) {
  listCategory.innerHTML = "";
  if (categories.length === 0) {
    listCategory.innerHTML = `<option disabled>Chưa có danh mục</option>`;
    return;
  }
  categories.forEach((c) => {
    listCategory.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

// RENDER QUESTION
function renderQuestions() {
  if (!questionList) return;

  if (questions.length === 0) {
    questionList.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center;color:#888;padding:20px 0;">
          Chưa có câu hỏi nào...
        </td>
      </tr>`;
    return;
  }

  questionList.innerHTML = questions
    .map(
      (q) => `
      <tr>
        <td class="col-id">${q.id}</td>
        <td class="col-name">
          <div class="question-cell">
            <span class="question-text">${q.name}</span>
            <span class="answer-count">${q.answers ? q.answers.length : 0} đáp án</span>
          </div>
        </td>
        <td class="col-action">
          <button class="btn-edit" onclick="openEditPopup(${q.id})">Sửa</button>
          <button class="btn-delete" onclick="openConfirmDelete(${q.id})">Xoá</button>
        </td>
      </tr>`,
    )
    .join("");
}

// QUẢN LÝ ĐÁP ÁN TRONG POPUP
function renderAnswerList() {
  const container = document.getElementById("answer-list");
  if (tempAnswers.length === 0) {
    container.innerHTML = `<p class="answer-empty">Chưa có đáp án nào. Nhấn "+ Thêm đáp án" để bắt đầu.</p>`;
    return;
  }

  container.innerHTML = tempAnswers
    .map(
      (a, idx) => `
      <div class="answer-row" data-id="${a.id}">
        <span class="answer-index">${idx + 1}.</span>
        <input
          type="text"
          class="answer-input"
          value="${escapeHtml(a.text)}"
          placeholder="Nhập đáp án..."
          oninput="updateAnswerText(${a.id}, this.value)"
        />
        <label class="correct-label" title="Đáp án đúng">
          <input
            type="radio"
            name="correct-answer"
            class="correct-radio"
            ${a.isCorrect ? "checked" : ""}
            onchange="setCorrectAnswer(${a.id})"
          />
          <span class="correct-text">Đúng</span>
        </label>
        <button type="button" class="btn-remove-answer" onclick="removeAnswer(${a.id})" title="Xoá đáp án">&#x2715;</button>
      </div>`,
    )
    .join("");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function addAnswerRow() {
  const newId = Date.now();
  tempAnswers.push({ id: newId, text: "", isCorrect: false });
  renderAnswerList();
  const inputs = document.querySelectorAll(".answer-input");
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
}

function updateAnswerText(id, value) {
  const ans = tempAnswers.find((a) => a.id === id);
  if (ans) ans.text = value;
}

function setCorrectAnswer(id) {
  tempAnswers.forEach((a) => (a.isCorrect = a.id === id));
}

function removeAnswer(id) {
  tempAnswers = tempAnswers.filter((a) => a.id !== id);
  renderAnswerList();
}

// POPUP THÊM/ SỬA CÂU HỎI
function openAddPopup() {
  editingQuesId = null;
  document.getElementById("popup-title").textContent = "Thêm câu hỏi";
  quesName.value = "";
  tempAnswers = [];
  renderAnswerList();
  hideAnswerError();
  errorQuestion.style.display = "none";
  overlay.classList.add("active");
  popupForm.classList.add("active");
  quesName.focus();
}

function openEditPopup(id) {
  const q = questions.find((x) => x.id === id);
  if (!q) return;

  editingQuesId = id;
  document.getElementById("popup-title").textContent = "Sửa câu hỏi";
  quesName.value = q.name;

  // Load đáp án cũ vào temp
  tempAnswers = (q.answers || []).map((a, idx) => ({
    id: Date.now() + idx,
    text: a.text,
    isCorrect: a.isCorrect,
  }));

  renderAnswerList();
  hideAnswerError();
  errorQuestion.style.display = "none";
  overlay.classList.add("active");
  popupForm.classList.add("active");
  quesName.focus();
}

function closePopup() {
  overlay.classList.remove("active");
  popupForm.classList.remove("active");
}

// POPUP XÁC NHẬN XÓA
function openConfirmDelete(id) {
  const item = questions.find((p) => p.id === id);
  if (!item) return;
  deleteQuesId = id;
  confirmName.textContent = item.name;
  overlay.classList.add("active");
  popupConfirm.classList.add("active");
}

function closeConfirm() {
  overlay.classList.remove("active");
  popupConfirm.classList.remove("active");
}

function handleDeleteQuestion() {
  questions = questions.filter((q) => q.id !== deleteQuesId);
  renderQuestions();
  closeConfirm();
}

// LƯU CÂU HỎI
function handleSubmitQuestion() {
  const name = quesName.value.trim();

  if (!validateQuestion(name)) return;

  // Sync text từ DOM vào tempAnswers
  document.querySelectorAll(".answer-row").forEach((row) => {
    const id = Number(row.dataset.id);
    const input = row.querySelector(".answer-input");
    const ans = tempAnswers.find((a) => a.id === id);
    if (ans && input) ans.text = input.value.trim();
  });

  if (!validateAnswers()) return;

  const answersToSave = tempAnswers.map((a) => ({
    text: a.text.trim(),
    isCorrect: a.isCorrect,
  }));

  if (editingQuesId !== null) {
    const q = questions.find((x) => x.id === editingQuesId);
    if (q) {
      q.name = name;
      q.answers = answersToSave;
    }
  } else {
    questions.push({ id: nextQuesId++, name, answers: answersToSave });
  }

  renderQuestions();
  closePopup();
}

// VALIDATE
function validateQuestion(name) {
  errorQuestion.style.display = "none";
  if (name.length === 0) {
    errorQuestion.style.display = "block";
    errorQuestion.textContent = "Nhập nội dung câu hỏi!";
    return false;
  }
  if (name.length < 10 || name.length > 100) {
    errorQuestion.style.display = "block";
    errorQuestion.textContent = "Câu hỏi phải từ 10 đến 100 ký tự!";
    return false;
  }
  return true;
}

function validateAnswers() {
  const nonEmpty = tempAnswers.filter((a) => a.text.trim().length > 0);

  if (nonEmpty.length < 2) {
    showAnswerError("Phải có ít nhất 2 đáp án!");
    return false;
  }

  const hasCorrect = tempAnswers.some((a) => a.isCorrect);
  if (!hasCorrect) {
    showAnswerError("Phải chọn 1 đáp án đúng!");
    return false;
  }

  const correctAns = tempAnswers.find((a) => a.isCorrect);
  if (!correctAns || correctAns.text.trim().length === 0) {
    showAnswerError("Đáp án đúng không được để trống!");
    return false;
  }

  hideAnswerError();
  return true;
}

function showAnswerError(msg) {
  errorAnswer.style.display = "block";
  errorAnswer.textContent = msg;
}

function hideAnswerError() {
  errorAnswer.style.display = "none";
  errorAnswer.textContent = "";
}

function validateTest(name, time) {
  errorTest.style.display = "none";
  errorTime.style.display = "none";
  errorIcon.style.display = "none";

  if (name.length === 0) {
    errorTest.style.display = "block";
    errorTest.textContent = "Nhập tên bài test!";
    return false;
  }

  const duplicated = tests.some(
    (p) => p.name === name && p.id !== currentTestId,
  );
  if (duplicated) {
    errorTest.style.display = "block";
    errorTest.textContent = "Tên bài test đã tồn tại!";
    return false;
  }

  if (!time || time.length === 0) {
    errorTime.style.display = "block";
    errorTime.textContent = "Nhập thời gian làm bài!";
    return false;
  }

  if (Number(time) <= 0) {
    errorTime.style.display = "block";
    errorTime.textContent = "Thời gian không âm!";
    return false;
  }

  if (!currentBase64Img) {
    errorIcon.style.display = "block";
    errorIcon.textContent = "Chưa chọn ảnh!";
    return false;
  }

  return true;
}

function validateQuestionList() {
  missingQuestion.style.display = "none";
  if (questions.length === 0) {
    missingQuestion.style.display = "block";
    missingQuestion.textContent = "Danh sách câu hỏi không được trống!";
    return false;
  }
  return true;
}

// LƯU BÀI TEST
function handleSubmitTest() {
  const name = testName.value.trim();
  const time = testTime.value.trim();

  if (!validateTest(name, time)) return;
  if (!validateQuestionList()) return;

  const selected = listCategory.options[listCategory.selectedIndex];

  const idx = tests.findIndex((t) => t.id === currentTestId);
  if (idx === -1) {
    alert("Không tìm thấy bài test để cập nhật!");
    return;
  }

  tests[idx] = {
    ...tests[idx],
    name,
    category: selected?.textContent || "",
    categoryId: Number(selected?.value) || null,
    questions: [...questions],
    time: parseInt(time) || 0,
    img: currentBase64Img,
  };

  saveTestToLocalStorage();

  const successPopup = document.getElementById("popup-success");
  if (successPopup) successPopup.classList.add("active");

  setTimeout(() => {
    window.location.href = "../pages/test-manager.html";
  }, 1000);
}
