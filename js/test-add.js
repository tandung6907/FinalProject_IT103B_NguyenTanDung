const TEST_KEY = "tests";
const CATEGORY_KEY = "categories";

// KHAI BÁO BIẾN
let tests = [];
let nextTestId = 1;

let questions = [];
let nextQuesId = 1;
let editingQuesId = null;
let deleteQuesId = null;

// Mảng đáp án tạm thời trong popup
let tempAnswers = [];
// tempAnswers: [{ id, text, isCorrect }]

let testName, testImg, testTime, previewImg;
let listCategory, fileName, quesName, excelFile, excelStatus;
let overlay, popupForm, popupConfirm, confirmName;
let questionList;
let currentBase64Img = "";

let errorTest,
  errorTime,
  errorQuestion,
  errorAnswer,
  missingQuestion,
  errorIcon;

// LOCAL STORAGE
function saveTestToLocalStorage() {
  localStorage.setItem(TEST_KEY, JSON.stringify(tests));
}

function loadTestFromLocalStorage() {
  const data = localStorage.getItem(TEST_KEY);
  return data ? JSON.parse(data) : [];
}

function loadCategoryFromLocalStorage() {
  const data = localStorage.getItem(CATEGORY_KEY);
  return data ? JSON.parse(data) : [];
}

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
  const localData = loadTestFromLocalStorage();
  const staticData = await loadStaticTests();
  const map = new Map();
  staticData.forEach((t) => map.set(t.id, t));
  localData.forEach((t) => map.set(t.id, t));
  return Array.from(map.values());
}

// INIT
window.onload = async function () {
  tests = await loadTests();
  if (tests.length > 0) {
    nextTestId = Math.max(...tests.map((t) => t.id)) + 1;
  }

  // DOM
  testName = document.getElementById("test-name");
  testImg = document.getElementById("test-img");
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
  renderQuestions();

  excelFile = document.getElementById("excel-file");
  excelStatus = document.getElementById("excel-import-status");
  if (excelFile) excelFile.onchange = handleExcelImport;

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

  // Preview ảnh
  testImg.onchange = function () {
    const file = this.files[0];
    if (!file) {
      currentBase64Img = "";
      return;
    }
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

// QUẢN LÝ ĐÁP ÁN TRONG POPUP
// Render danh sách đáp án tạm
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

// Thêm 1 hàng đáp án mới
function addAnswerRow() {
  const newId = Date.now();
  tempAnswers.push({ id: newId, text: "", isCorrect: false });
  renderAnswerList();
  // Focus vào input vừa thêm
  const inputs = document.querySelectorAll(".answer-input");
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
}

// Cập nhật text đáp án
function updateAnswerText(id, value) {
  const ans = tempAnswers.find((a) => a.id === id);
  if (ans) ans.text = value;
}

// Chọn đáp án đúng (radio → chỉ 1 cái được chọn)
function setCorrectAnswer(id) {
  tempAnswers.forEach((a) => (a.isCorrect = a.id === id));
}

// Xoá 1 đáp án
function removeAnswer(id) {
  tempAnswers = tempAnswers.filter((a) => a.id !== id);
  renderAnswerList();
}

// POPUP CÂU HỎI
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

  // Clone đáp án vào temp (dùng Date.now + index để tạo id tạm)
  tempAnswers = q.answers.map((a, idx) => ({
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

// DELETE POPUP
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

  // Validate nội dung câu hỏi
  if (!validateQuestion(name)) return;

  // Sync text từ input hiện tại vào tempAnswers trước khi validate
  document.querySelectorAll(".answer-row").forEach((row) => {
    const id = Number(row.dataset.id);
    const input = row.querySelector(".answer-input");
    const ans = tempAnswers.find((a) => a.id === id);
    if (ans && input) ans.text = input.value.trim();
  });

  // Validate đáp án
  if (!validateAnswers()) return;

  // Chuẩn hóa đáp án lưu
  const answersToSave = tempAnswers.map((a) => ({
    text: a.text.trim(),
    isCorrect: a.isCorrect,
  }));

  if (editingQuesId !== null) {
    // SỬA
    const q = questions.find((x) => x.id === editingQuesId);
    if (q) {
      q.name = name;
      q.answers = answersToSave;
    }
  } else {
    // THÊM
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
  if (name.length < 10 || name.length > 100000) {
    errorQuestion.style.display = "block";
    errorQuestion.textContent = "Câu hỏi phải từ 10 đến 100000 ký tự!";
    return false;
  }
  return true;
}

function validateAnswers() {
  // Lọc đáp án không rỗng
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

  // Kiểm tra đáp án đúng có nội dung không
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

// RENDER BẢNG CÂU HỎI
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
            <span class="answer-count">${q.answers.length} đáp án</span>
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

// LƯU BÀI TEST
function handleSubmitTest() {
  const name = testName.value.trim();
  const time = testTime.value.trim();

  if (!validateTest(name, time)) return;
  if (!validateQuestionList()) return;

  const selected = listCategory.options[listCategory.selectedIndex];

  const newTest = {
    id: nextTestId++,
    name,
    category: selected?.textContent || "",
    categoryId: Number(selected?.value) || null,
    questions: [...questions],
    time: parseInt(time) || 0,
    img: currentBase64Img,
  };

  tests.push(newTest);
  saveTestToLocalStorage();

  // RESET
  questions = [];
  currentBase64Img = "";
  renderQuestions();

  testName.value = "";
  testTime.value = "";
  testImg.value = "";
  previewImg.style.display = "none";
  fileName.textContent = "Chưa chọn file";

  showSuccessPopup();
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

  const duplicated = tests.some((p) => p.name === name);
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

  errorTest.style.display = "none";
  errorTime.style.display = "none";
  errorIcon.style.display = "none";
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

function showSuccessPopup() {
  document.getElementById("popup-success").classList.add("active");
  setTimeout(() => {
    window.location.href = "../pages/test-manager.html";
  }, 1000);
}

function showExcelStatus(message, isError = false) {
  if (!excelStatus) return;
  excelStatus.textContent = message;
  excelStatus.style.color = isError ? "#d32f2f" : "#2e7d32";
}

function handleExcelImport(event) {
  if (typeof XLSX === "undefined") {
    showExcelStatus("Chưa nạp được thư viện đọc Excel. Vui lòng kiểm tra kết nối internet.", true);
    return;
  }

  const file = event.target.files[0];
  if (!file) {
    showExcelStatus("Không có file Excel được chọn.", true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = e.target.result;
    try {
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      importQuestionsFromExcel(rows);
    } catch (error) {
      showExcelStatus("Không thể đọc file Excel. Vui lòng kiểm tra định dạng hoặc thử file khác.", true);
    }
  };
  reader.readAsArrayBuffer(file);
}

function getRowValue(row, aliases) {
  const normalized = Object.keys(row).reduce((acc, key) => {
    const normalizedKey = String(key || "").trim().toLowerCase().replace(/\s+/g, " ");
    acc[normalizedKey] = row[key];
    return acc;
  }, {});

  for (const alias of aliases) {
    const normalizedAlias = String(alias || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (normalizedAlias in normalized) {
      return normalized[normalizedAlias];
    }
  }
  return "";
}

function importQuestionsFromExcel(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    showExcelStatus("File Excel không có dữ liệu.", true);
    return;
  }

  const imported = [];
  rows.forEach((row) => {
    const questionText = String(
      getRowValue(row, ["Question", "question", "Câu hỏi", "cau hoi", "noi dung"]))
      .trim();
    if (!questionText) return;

    const typeValue = String(
      getRowValue(row, ["Type", "type", "Loại", "loai", "Hình thức", "hinh thuc", "Kiểu", "kieu"])
    )
      .trim()
      .toLowerCase();
    const isEssay =
      typeValue.includes("essay") ||
      typeValue.includes("tự luận") ||
      typeValue.includes("tu luan") ||
      typeValue.includes("trac luan") ||
      typeValue.includes("tự luận");

    if (isEssay) {
      const answerText = String(
        getRowValue(row, ["Answer", "answer", "Đáp án", "dap an", "Kết quả", "ket qua"])
      ).trim();
      imported.push({
        id: nextQuesId++,
        name: questionText,
        type: "essay",
        answer: answerText,
      });
      return;
    }

    const optionKeys = [
      ["Option A", "option a", "A", "a", "Đáp án A", "dap an a"],
      ["Option B", "option b", "B", "b", "Đáp án B", "dap an b"],
      ["Option C", "option c", "C", "c", "Đáp án C", "dap an c"],
      ["Option D", "option d", "D", "d", "Đáp án D", "dap an d"],
    ];
    const options = optionKeys
      .map((keys) => {
        const text = String(getRowValue(row, keys)).trim();
        return text ? { id: Date.now() + Math.random(), text, isCorrect: false } : null;
      })
      .filter(Boolean);

    if (options.length < 2) {
      return;
    }

    const correctValue = String(
      getRowValue(row, ["Correct", "correct", "Đáp án đúng", "dap an dung", "Answer", "answer"])
    )
      .trim()
      .toLowerCase();

    let correctAssigned = false;
    options.forEach((option) => {
      const optionText = String(option.text || "").trim().toLowerCase();
      if (
        correctValue === optionText ||
        correctValue === optionText.charAt(0) ||
        correctValue === optionText.slice(0, 1)
      ) {
        option.isCorrect = true;
        correctAssigned = true;
      }
    });

    if (!correctAssigned) {
      const letterIndex = ["a", "b", "c", "d"].indexOf(correctValue);
      if (letterIndex >= 0 && options[letterIndex]) {
        options[letterIndex].isCorrect = true;
        correctAssigned = true;
      }
    }

    if (!correctAssigned) {
      options[0].isCorrect = true;
    }

    imported.push({
      id: nextQuesId++,
      name: questionText,
      type: "mcq",
      answers: options,
    });
  });

  if (imported.length === 0) {
    showExcelStatus("Không tìm thấy câu hỏi hợp lệ trong file Excel.", true);
    return;
  }

  questions = imported;
  renderQuestions();
  showExcelStatus(`Đã nhập ${imported.length} câu hỏi từ Excel.`);
}

// Giữ tương thích nếu nút Lưu gọi handleSave()
function handleSave() {
  handleSubmitTest();
}
