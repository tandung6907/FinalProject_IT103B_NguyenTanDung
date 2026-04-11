const RESULT_KEY = "quizResults";
let results = [];
let filteredResults = [];
let selectedResultId = null;

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function loadResults() {
  const data = localStorage.getItem(RESULT_KEY);
  return data ? JSON.parse(data) : [];
}

function saveResults() {
  localStorage.setItem(RESULT_KEY, JSON.stringify(results));
}

function getRemoteStatusElement() {
  return document.getElementById("remote-status");
}

function setRemoteStatus(message, isError = false) {
  const status = getRemoteStatusElement();
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#b91c1c" : "#065f46";
}

function getTestRemoteStatusElement() {
  return document.getElementById("test-remote-status");
}

function setTestRemoteStatus(message, isError = false) {
  const status = getTestRemoteStatusElement();
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#b91c1c" : "#065f46";
}

function populateRemoteConfigForm() {
  const config = loadRemoteResultConfig();
  if (!config) return;
  document.getElementById("remote-owner").value = config.owner || "";
  document.getElementById("remote-repo").value = config.repo || "";
  document.getElementById("remote-path").value = config.path || "";
  document.getElementById("remote-token").value = config.token || "";
}

function populateTestRemoteConfigForm() {
  const config = loadRemoteTestConfig();
  if (!config) return;
  document.getElementById("test-remote-owner").value = config.owner || "";
  document.getElementById("test-remote-repo").value = config.repo || "";
  document.getElementById("test-remote-path").value = config.path || "";
  document.getElementById("test-remote-token").value = config.token || "";
}

function getRemoteConfigFromForm() {
  return {
    owner: document.getElementById("remote-owner")?.value.trim() || "",
    repo: document.getElementById("remote-repo")?.value.trim() || "",
    path: document.getElementById("remote-path")?.value.trim() || "",
    token: document.getElementById("remote-token")?.value.trim() || "",
  };
}

function getTestRemoteConfigFromForm() {
  return {
    owner: document.getElementById("test-remote-owner")?.value.trim() || "",
    repo: document.getElementById("test-remote-repo")?.value.trim() || "",
    path: document.getElementById("test-remote-path")?.value.trim() || "",
    token: document.getElementById("test-remote-token")?.value.trim() || "",
  };
}

function validateRemoteConfig(config) {
  if (!config.owner || !config.repo || !config.path || !config.token) {
    throw new Error("Vui lòng nhập đủ owner, repo, đường dẫn file và token GitHub.");
  }
}

function validateTestRemoteConfig(config) {
  if (!config.owner || !config.repo || !config.path || !config.token) {
    throw new Error("Vui lòng nhập đủ owner, repo, đường dẫn file và token GitHub cho bài test.");
  }
}

async function loadRemoteResults() {
  try {
    const remoteResults = await loadRemoteResultsFromGithub();
    results = mergeResultRecords(results, remoteResults);
    saveResults();
    setRemoteStatus("Đã tải dữ liệu kết quả từ GitHub.");
  } catch (error) {
    setRemoteStatus(error.message || "Không thể tải dữ liệu từ GitHub.", true);
  }
}

async function syncResultsToRemote() {
  const config = getRemoteResultConfig();
  if (!config) return;
  try {
    await saveRemoteResultsToGithub(results);
    setRemoteStatus("Đã đồng bộ kết quả lên GitHub.");
  } catch (error) {
    setRemoteStatus(error.message || "Không thể lưu kết quả lên GitHub.", true);
  }
}

async function loadRemoteTests() {
  try {
    const remoteTests = await loadRemoteTestsFromGithub();
    // Note: This is just for loading, actual merge happens in other scripts
    setTestRemoteStatus("Đã tải dữ liệu bài test từ GitHub.");
  } catch (error) {
    setTestRemoteStatus(error.message || "Không thể tải dữ liệu từ GitHub.", true);
  }
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
}

function getStatusLabel(status) {
  if (status === "graded") return "Đã chấm";
  if (status === "pending") return "Chờ chấm";
  return "Không xác định";
}

function getStatusClass(status) {
  if (status === "graded") return "status-graded";
  if (status === "pending") return "status-pending";
  return "status-unknown";
}

function renderResultsTable() {
  const tbody = document.getElementById("results-table-body");
  if (!tbody) return;
  if (!filteredResults || filteredResults.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7" style="text-align:center; padding: 18px; color: #555;">Chưa có kết quả nào.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filteredResults
    .map((result) => {
      return `
        <tr>
          <td>${result.id}</td>
          <td>${escapeHtml(result.testName)}</td>
          <td>${escapeHtml(result.userName || result.userEmail || "Khách")}</td>
          <td>${result.score100}/100</td>
          <td><span class="status ${getStatusClass(result.status)}">${getStatusLabel(result.status)}</span></td>
          <td>${formatDateTime(result.createdAt)}</td>
          <td><button class="btn-view" onclick="showResultDetail(${result.id})">Xem</button></td>
        </tr>`;
    })
    .join("");
}

function applyFilters() {
  const keyword = document.getElementById("search-result")?.value.trim().toLowerCase() || "";
  const status = document.getElementById("filter-status")?.value || "";

  filteredResults = results.filter((result) => {
    const matchesKeyword =
      result.testName.toLowerCase().includes(keyword) ||
      (result.userName || "").toLowerCase().includes(keyword) ||
      (result.userEmail || "").toLowerCase().includes(keyword);
    const matchesStatus = status ? result.status === status : true;
    return matchesKeyword && matchesStatus;
  });

  renderResultsTable();
}

function showResultDetail(id) {
  selectedResultId = id;
  const detailPanel = document.getElementById("result-detail-panel");
  const result = results.find((item) => item.id === id);
  if (!detailPanel) return;
  if (!result) {
    detailPanel.innerHTML = `<p class="empty-detail">Không tìm thấy kết quả.</p>`;
    return;
  }

  detailPanel.innerHTML = `
    <div class="detail-card">
      <div class="detail-header">
        <h3>Kết quả bài thi #${result.id}</h3>
        <span class="status ${getStatusClass(result.status)}">${getStatusLabel(result.status)}</span>
      </div>
      <div class="detail-summary">
        <div><strong>Bài test:</strong> ${escapeHtml(result.testName)}</div>
        <div><strong>Người làm:</strong> ${escapeHtml(result.userName || result.userEmail || "Khách")}</div>
        <div><strong>Điểm trắc nghiệm:</strong> ${result.score100}/100</div>
        <div><strong>Tổng câu:</strong> ${result.totalQuestions}</div>
        <div><strong>Câu tự luận:</strong> ${result.essayCount}</div>
        <div><strong>Thời gian nộp:</strong> ${formatDateTime(result.createdAt)}</div>
      </div>
      <div class="detail-admin-note">
        <label for="admin-note">Ghi chú chấm bài</label>
        <textarea id="admin-note" placeholder="Nhập nhận xét cho học sinh...">${escapeHtml(result.adminNote)}</textarea>
        <div class="detail-admin-actions">
          <select id="result-status">
            <option value="pending" ${result.status === "pending" ? "selected" : ""}>Chờ chấm</option>
            <option value="graded" ${result.status === "graded" ? "selected" : ""}>Đã chấm</option>
          </select>
          <button class="btn-save" onclick="saveAdminNote(${result.id})">Lưu chấm</button>
        </div>
      </div>
      <div class="review-list">
        ${result.answers
          .map((q, idx) => renderResultQuestion(q, idx, result.status))
          .join("")}
      </div>
    </div>`;
}

function renderResultQuestion(q, idx, status) {
  if (q.type === "essay") {
    return `
      <div class="review-item review-item--essay">
        <div class="review-qnum">Câu ${idx + 1} <span class="review-tag review-tag--essay">Tự luận</span></div>
        <div class="review-qtext">${escapeHtml(q.name)}</div>
        <div class="review-essay-row">
          <div class="review-essay-block review-essay-block--user">
            <div class="review-essay-label">Bài làm của học sinh</div>
            <div class="review-essay-content">${escapeHtml(q.userText) || "<em style=\"color:#aaa\">Chưa trả lời</em>"}</div>
          </div>
          <div class="review-essay-block review-essay-block--model">
            <div class="review-essay-label">Đáp án gợi ý</div>
            <div class="review-essay-content">${escapeHtml(q.modelAnswer) || "<em style=\"color:#aaa\">Không có đáp án mẫu</em>"}</div>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="review-item ${q.userIdx === null ? "review-item--skipped" : q.userIdx === q.correctIdx ? "review-item--correct" : "review-item--wrong"}">
      <div class="review-qnum">Câu ${idx + 1} <span class="review-tag ${q.userIdx === null ? "review-tag--skipped" : q.userIdx === q.correctIdx ? "review-tag--correct" : "review-tag--wrong"}">${q.userIdx === null ? "Bỏ qua" : q.userIdx === q.correctIdx ? "Đúng" : "Sai"}</span></div>
      <div class="review-qtext">${escapeHtml(q.name)}</div>
      <div class="review-opts">
        ${q.options
          .map((option, oi) => {
            const classes = ["review-opt"];
            let icon = "";
            if (oi === q.correctIdx) {
              classes.push("review-opt--correct");
              icon = " ?";
            }
            if (q.userIdx !== null && oi === q.userIdx && q.userIdx !== q.correctIdx) {
              classes.push("review-opt--wrong");
              icon = " ?";
            }
            return `<div class="${classes.join(" ")}"><span class="option-marker">${String.fromCharCode(65 + oi)}</span><span>${escapeHtml(option)}${icon}</span></div>`;
          })
          .join("")}
      </div>
    </div>`;
}

async function saveAdminNote(id) {
  const note = document.getElementById("admin-note")?.value.trim() || "";
  const status = document.getElementById("result-status")?.value || "pending";
  const index = results.findIndex((item) => item.id === id);
  if (index === -1) return;
  results[index].adminNote = note;
  results[index].status = status;
  if (status === "graded") {
    results[index].gradedAt = new Date().toISOString();
  }
  saveResults();
  await syncResultsToRemote();
  applyFilters();
  showResultDetail(id);
}

async function handleSaveRemoteConfig() {
  try {
    const config = getRemoteConfigFromForm();
    validateRemoteConfig(config);
    saveRemoteResultConfig(config);
    setRemoteStatus("Cấu hình GitHub đã được lưu.");
  } catch (error) {
    setRemoteStatus(error.message || "Cấu hình không hợp lệ.", true);
  }
}

async function handleLoadRemoteResults() {
  await loadRemoteResults();
  filteredResults = results;
  renderResultsTable();
}

async function handleSaveTestRemoteConfig() {
  try {
    const config = getTestRemoteConfigFromForm();
    validateTestRemoteConfig(config);
    saveRemoteTestConfig(config);
    setTestRemoteStatus("Cấu hình GitHub cho bài test đã được lưu.");
  } catch (error) {
    setTestRemoteStatus(error.message || "Cấu hình không hợp lệ.", true);
  }
}

async function handleLoadRemoteTests() {
  await loadRemoteTests();
}

window.onload = async function () {
  const user = checkAdmin();
  if (!user) return;
  results = loadResults();
  filteredResults = results;
  populateRemoteConfigForm();
  populateTestRemoteConfigForm();
  document.getElementById("search-result")?.addEventListener("input", applyFilters);
  document.getElementById("filter-status")?.addEventListener("change", applyFilters);
  document.getElementById("refresh-results")?.addEventListener("click", async () => {
    results = loadResults();
    await loadRemoteResults();
    applyFilters();
  });
  document.getElementById("save-remote-config")?.addEventListener("click", handleSaveRemoteConfig);
  document.getElementById("load-remote-results")?.addEventListener("click", handleLoadRemoteResults);
  document.getElementById("save-test-remote-config")?.addEventListener("click", handleSaveTestRemoteConfig);
  document.getElementById("load-remote-tests")?.addEventListener("click", handleLoadRemoteTests);
  await loadRemoteResults();
  filteredResults = results;
  renderResultsTable();
};
