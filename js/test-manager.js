const ITEMS_PER_PAGE = 5;
const TEST_KEY = "tests";
const CATEGORY_KEY = "categories";

let tests = [];
let currentPage = 1;
let pendingDeleteId = null;
let filtered = [];
let categories = [];

const tbody = document.getElementById("table-body");
const pagination = document.getElementById("pagination");
const overlay = document.getElementById("overlay");
const confirmName = document.getElementById("confirm-name");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");

// LOAD
function loadLocalTests() {
  const data = localStorage.getItem(TEST_KEY);
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
  const localData = loadLocalTests();
  const staticData = await loadStaticTests();
  const map = new Map();
  staticData.forEach((t) => map.set(t.id, t));
  localData.forEach((t) => map.set(t.id, t));
  return Array.from(map.values());
}

function saveTestToLocalStorage() {
  localStorage.setItem(TEST_KEY, JSON.stringify(tests));
}

function loadCategories() {
  const data = localStorage.getItem(CATEGORY_KEY);
  return data ? JSON.parse(data) : [];
}

// Lấy icon ảnh của danh mục theo categoryId
function getCategoryIcon(categoryId) {
  const cat = categories.find((c) => c.id === categoryId);
  return cat && cat.img ? cat.img : null;
}

// FILTER AND SORT
function getFiltered() {
  const query = searchInput.value.trim().toLowerCase();
  const sort = sortSelect.value;
  let result = tests.filter((t) => t.name.toLowerCase().includes(query));
  if (sort === "asc") result.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  if (sort === "desc")
    result.sort((a, b) => b.name.localeCompare(a.name, "vi"));
  if (sort === "ascT") result.sort((a, b) => (parseFloat(a.time) || 0) - (parseFloat(b.time) || 0));
  if (sort === "descT") result.sort((a, b) => (parseFloat(b.time) || 0) - (parseFloat(a.time) || 0));
  return result;
}

// RENDER BẢNG
function renderTable() {
  filtered = getFiltered();
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Không tìm thấy bài test nào...</td></tr>`;
  } else {
    tbody.innerHTML = pageItems
      .map((t) => {
        // Xử lý hiển thị ảnh hoặc SVG mặc định
        const imgDisplay = t.img
          ? `<img src="${t.img}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-right:8px;" />`
          : `<svg class="category-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="#555" width="20" height="20" style="margin-right:8px;">
                         <path d="M96 0C43 0 0 43 0 96v320c0 53 43 96 96 96h256c17.7 0 32-14.3 32-32s-14.3-32-32-32H96c-17.7 0-32-14.3-32-32s14.3-32 32-32h288c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H96zm32 128h192c8.8 0 16 7.2 16 16s-7.2 16-16 16H128c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64h192c8.8 0 16 7.2 16 16s-7.2 16-16 16H128c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
                       </svg>`;
        // ICON NHỎ: icon ảnh của danh mục
        const catIcon = getCategoryIcon(t.categoryId);
        const categoryIconHtml = catIcon
          ? `<img src="${catIcon}" alt="icon" class="icon" />`
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#555" width="14" height="14">
            <path d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zm152 16c-17.7 0-32 14.3-32 32s14.3 32 32 32H488c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H488c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H488c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"/>
          </svg>`;

        return `
                <tr>
                    <td class="col-id">${t.id}</td>
                    <td class="col-name">
                        <div>
                          ${imgDisplay}
                        </div>
                        <div class="category-name">
                            <span>${t.name}</span>
                        </div>
                    </td>
                    <td class="col-category">
                    <div style="display:flex; align-items: center;">
                      ${categoryIconHtml}
                      ${t.category || "—"}
                    </div>
                    </td>
                    <td class="col-question">${t.questions ? t.questions.length : 0} câu</td>
                    <td class="col-time">${t.time || 0} phút</td>
                    <td>
                        <div class="action-cell">
                            <a class="btn-edit" href="../pages/test-edit.html?id=${t.id}">Sửa</a>
                            <button class="btn-delete" onclick="handleDeleteClick(${t.id}, '${t.name.replace(/'/g, "\\'")}')">Xoá</button>
                        </div>
                    </td>
                </tr>`;
      })
      .join("");
  }
  renderPagination(totalPages);
}

// PHÂN TRANG
function renderPagination(totalPages) {
  const pagination = document.querySelector(".pagination");
  if (!pagination) return;

  pagination.innerHTML = "";

  const prev = document.createElement("a");
  prev.href = "#";
  prev.className = "page-arrow" + (currentPage === 1 ? " disabled" : "");
  prev.innerHTML = "&#8249;";
  prev.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  pagination.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = i;
    if (i === currentPage) a.className = "active";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = i;
      renderTable();
    });
    pagination.appendChild(a);
  }

  const next = document.createElement("a");
  next.href = "#";
  next.className =
    "page-arrow" +
    (currentPage === totalPages || totalPages === 0 ? " disabled" : "");
  next.innerHTML = "&#8250;";
  next.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
  pagination.appendChild(next);
}

// XÓA
function handleDeleteClick(id, name) {
  pendingDeleteId = id;
  confirmName.textContent = name;
  overlay.classList.add("active");
}

document.getElementById("btn-cancel").addEventListener("click", () => {
  overlay.classList.remove("active");
  pendingDeleteId = null;
});

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) {
    overlay.classList.remove("active");
    pendingDeleteId = null;
  }
});

document.getElementById("btn-confirm-delete").addEventListener("click", () => {
  if (pendingDeleteId !== null) {
    tests = tests.filter((t) => t.id !== pendingDeleteId);
    saveTestToLocalStorage();
    pendingDeleteId = null;
    overlay.classList.remove("active");
    renderTable();
  }
});

// SEARCH AND SORT
searchInput.addEventListener("input", () => {
  currentPage = 1;
  renderTable();
});
sortSelect.addEventListener("change", () => {
  currentPage = 1;
  renderTable();
});

// LẮNG NGHE SỰ KIỆN LƯU THÊM TỪ TEST ADD
window.addEventListener("storage", async (e) => {
  if (e.key === TEST_KEY) {
    tests = await loadTests();
    renderTable();
  }
});

async function initTestManager() {
  tests = await loadTests();
  categories = loadCategories();
  renderTable();
}

initTestManager();
