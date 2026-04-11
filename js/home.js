const TEST_KEY = "tests";
const CATEGORY_KEY = "categories";
const ITEMS_PER_PAGE = 8;

let tests = [];
let categories = [];
let filtered = [];
let currentPage = 1;
let sortOrder = ""; // "asc" | "desc" | ""

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
  const remoteData = await loadRemoteTestsFromGithub().catch(() => []);
  const map = new Map();
  staticData.forEach((t) => map.set(t.id, t));
  remoteData.forEach((t) => map.set(t.id, t));
  localData.forEach((t) => map.set(t.id, t));
  return Array.from(map.values());
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

// FILTER + SORT
function getFiltered() {
  const query = document
    .getElementById("search-test")
    .value.trim()
    .toLowerCase();

  let result = tests.filter((t) => t.name.toLowerCase().includes(query));

  if (sortOrder === "asc") {
    result.sort((a, b) => (a.playCount || 0) - (b.playCount || 0));
  } else if (sortOrder === "desc") {
    result.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  }

  return result;
}

// RENDER CARD
function renderCards() {
  filtered = getFiltered();
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  const grid = document.querySelector(".quiz-grid");

  if (pageItems.length === 0) {
    grid.innerHTML = `<p style="color:#888; font-size:15px; grid-column:1/-1; text-align:center; padding: 40px 0;">Không có bài test nào...</p>`;
    renderPagination(totalPages);
    return;
  }

  grid.innerHTML = pageItems
    .map((t) => {
      const thumbnail = t.img
        ? `<img src="${t.img}" alt="Thumbnail" class="card-thumbnail" />`
        : `<div class="card-thumbnail card-thumbnail--empty">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="#ccc" width="36" height="36">
              <path d="M96 0C43 0 0 43 0 96v320c0 53 43 96 96 96h256c17.7 0 32-14.3 32-32s-14.3-32-32-32H96c-17.7 0-32-14.3-32-32s14.3-32 32-32h288c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H96zm32 128h192c8.8 0 16 7.2 16 16s-7.2 16-16 16H128c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64h192c8.8 0 16 7.2 16 16s-7.2 16-16 16H128c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
            </svg>
          </div>`;

      const catIcon = getCategoryIcon(t.categoryId);
      const categoryIconHtml = catIcon
        ? `<img src="${catIcon}" alt="icon" class="icon" />`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#555" width="14" height="14">
            <path d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zm152 16c-17.7 0-32 14.3-32 32s14.3 32 32 32H488c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H488c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H488c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"/>
          </svg>`;

      return `
        <div class="quiz-card">
          ${thumbnail}
          <div class="card-info">
            <p class="card-category">
              ${categoryIconHtml}
              ${t.category || "Chưa phân loại"}
            </p>
            <p class="card-title">${t.name}</p>
            <p class="card-meta">${t.questions ? t.questions.length : 0} câu hỏi · ${t.playCount || 0} lượt chơi</p>
            <p class="card-time">⏱ ${t.time || 0} phút</p>
          </div>
          <button class="btn-play" onclick="openPlayPopup(${t.id})">Chơi</button>
        </div>`;
    })
    .join("");

  renderPagination(totalPages);
}

// PAGINATION
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
      renderCards();
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
      renderCards();
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
      renderCards();
    }
  });
  pagination.appendChild(next);
}

// RANDOM PLAY
document.getElementById("btn-start").onclick = function () {
  if (tests.length === 0) {
    alert("Chưa có bài test nào!");
    return;
  }
  const random = tests[Math.floor(Math.random() * tests.length)];
  startQuiz(random.id);
};

// PLAY POPUP
function openPlayPopup(id) {
  const test = tests.find((t) => t.id === id);
  if (!test) return;

  document.getElementById("popup-test-name").textContent = test.name;
  document.getElementById("popup-test-category").textContent =
    test.category || "Chưa phân loại";
  document.getElementById("popup-test-questions").textContent = test.questions
    ? test.questions.length
    : 0;
  document.getElementById("popup-test-time").textContent = test.time || 0;

  const thumb = document.getElementById("popup-test-thumb");
  if (test.img) {
    thumb.src = test.img;
    thumb.style.display = "block";
  } else {
    thumb.style.display = "none";
  }

  const popupCatIcon = document.getElementById("popup-cat-icon");
  const catIcon = getCategoryIcon(test.categoryId);
  if (catIcon && popupCatIcon) {
    popupCatIcon.src = catIcon;
    popupCatIcon.style.display = "inline";
  } else if (popupCatIcon) {
    popupCatIcon.style.display = "none";
  }

  document.getElementById("popup-play-btn").onclick = () => startQuiz(id);

  document.getElementById("overlay-play").classList.add("active");
  document.getElementById("popup-play").classList.add("active");
}

function closePlayPopup() {
  document.getElementById("overlay-play").classList.remove("active");
  document.getElementById("popup-play").classList.remove("active");
}

// START QUIZ
function startQuiz(id) {
  const idx = tests.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tests[idx].playCount = (tests[idx].playCount || 0) + 1;
    localStorage.setItem(TEST_KEY, JSON.stringify(tests));
  }
  closePlayPopup();
  window.location.href = `../pages/quizz.html?id=${id}`;
}

// SORT BUTTON
document.querySelectorAll(".sort-by-turn button").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".sort-by-turn button")
      .forEach((b) => b.classList.remove("active"));
    const val = this.dataset.sort;
    if (sortOrder === val) {
      sortOrder = "";
    } else {
      sortOrder = val;
      this.classList.add("active");
    }
    currentPage = 1;
    renderCards();
  });
});

// SEARCH
document.getElementById("search-test").addEventListener("input", () => {
  currentPage = 1;
  renderCards();
});

// OVERLAY CLICK (play popup)
document
  .getElementById("overlay-play")
  .addEventListener("click", closePlayPopup);

// LOGOUT
// Bước 1: Mở popup xác nhận đăng xuất
function handleLogOut() {
  document.getElementById("overlay-logout").classList.add("active");
  document.getElementById("popup-confirm-logout").classList.add("active");
}

// Đóng popup xác nhận
function closeLogoutConfirm() {
  document.getElementById("overlay-logout").classList.remove("active");
  document.getElementById("popup-confirm-logout").classList.remove("active");
}

// Bước 2: Xác nhận → đóng confirm, hiện thông báo thành công, rồi chuyển trang
function confirmLogOut() {
  closeLogoutConfirm();
  document.getElementById("popup-logout").classList.add("active");
  setTimeout(() => {
    window.location.href = "../pages/login.html";
  }, 1200);
}

// CHECK ADMIN ROLE VÀ THÊM MANAGEMENT BUTTON VÀO NAV
function addAdminNav() {
  const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  if (user.role === "admin") {
    const nav = document.querySelector(".pages-link");

    const resultBtn = document.createElement("a");
    resultBtn.href = "../pages/result.html";
    resultBtn.textContent = "Kết quả";
    resultBtn.style.marginRight = "15px";
    nav.insertBefore(resultBtn, nav.lastElementChild);

    const managementBtn = document.createElement("a");
    managementBtn.href = "../pages/category-manager.html";
    managementBtn.textContent = "Quản Lý";
    managementBtn.style.marginRight = "15px";
    nav.insertBefore(managementBtn, nav.lastElementChild);
  }
}

// INITS
addAdminNav();

// LẮNG NGHE SỰ KIỆN LƯU THÊM TỪ TEST ADD
window.addEventListener("storage", async (e) => {
  if (e.key === TEST_KEY) {
    tests = await loadTests();
    renderCards();
  }
});

window.addEventListener("focus", async () => {
  tests = await loadTests();
  renderCards();
});

async function initHome() {
  tests = await loadTests();
  categories = loadCategories();
  renderCards();
}

initHome();
