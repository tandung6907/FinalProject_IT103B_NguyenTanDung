const CATEGORY_KEY = "categories";

// KHỞI TẠO BIẾN
let nextId = 1;
let categories = [];
let editingId = null;
let deleteId = null;

let categoryName, categoryImg, listCategory, errorName;
let overlay, popupForm, popupConfirm;
let previewImg, fileName, currentBase64Img, errorIcon;

// 2 BIẾN PHÂN TRANG
const ITEMS_PER_PAGE = 5;
let currentPage = 1;

// LƯU - LOAD - RUN LOAD
function saveToLocalStorage() {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

function loadFromLocalStorage() {
  const data = localStorage.getItem(CATEGORY_KEY);
  return data ? JSON.parse(data) : [];
}

window.onload = function () {
  const data = loadFromLocalStorage();
  if (data.length > 0) {
    categories = data;
    nextId = Math.max(...categories.map((p) => p.id)) + 1;
  }

  // LẤY DOM
  categoryName = document.getElementById("category-name");
  categoryImg = document.getElementById("category-img");
  listCategory = document.querySelector(".list-category");
  errorName = document.querySelector(".error-name");
  overlay = document.getElementById("overlay");
  popupForm = document.getElementById("popup-form");
  popupConfirm = document.getElementById("popup-confirm");
  previewImg = document.getElementById("preview-img");
  fileName = document.getElementById("file-name");
  currentBase64Img = ""; // biến lưu base64 của ảnh hiện tại (dùng để validate và giữ nguyên khi sửa)

  errorIcon = document.querySelector(".error-icon");

  // MỞ POPUP THÊM
  document.querySelector(".btn-add").addEventListener("click", openAddPopup);

  // ĐÓNG POPUP
  document.getElementById("popup-close").addEventListener("click", closePopup);
  document.getElementById("btn-cancel").addEventListener("click", closePopup);
  overlay.addEventListener("click", function () {
    closePopup();
    closeConfirm();
  });

  // LƯU
  document.getElementById("btn-save").addEventListener("click", handleSubmit);

  // XÓA - confirm
  document
    .getElementById("btn-cancel-delete")
    .addEventListener("click", closeConfirm);
  document
    .getElementById("btn-confirm-delete")
    .addEventListener("click", handleDelete);

  // Preview ảnh
  categoryImg.addEventListener("change", function () {
    const file = categoryImg.files[0]; // lấy file từ input
    if (!file) {
      currentBase64Img = "";
      return;
    } // nếu không có file nào được chọn thì reset và dừng
    fileName.textContent = file.name;
    const reader = new FileReader(); // Đọc file bằng FileReader - đọc file cục bộ không cân upload lên server
    reader.onload = (e) => {
      currentBase64Img = e.target.result; // lưu chuỗi base64
      previewImg.src = currentBase64Img; // gán vào thẻ img
      previewImg.style.display = "block"; // hiển thị thẻ img khi đã có ảnh
    };
    reader.readAsDataURL(file); // 
  });

  renderCategories();
};

// POPUP
function openAddPopup() {
  editingId = null;
  document.getElementById("popup-title").textContent = "Thêm danh mục";
  categoryName.value = "";
  categoryImg.value = "";
  fileName.textContent = "Chưa chọn ảnh";
  previewImg.style.display = "none";
  previewImg.src = "";
  currentBase64Img = "";
  errorName.style.display = "none";
  overlay.classList.add("active");
  popupForm.classList.add("active");
  categoryName.focus();
}

function openEditPopup(id) {
  const item = categories.find((p) => p.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById("popup-title").textContent = "Sửa danh mục";
  categoryName.value = item.name;
  categoryImg.value = "";
  fileName.textContent = item.img ? "Đã có ảnh" : "Chưa chọn ảnh";
  if (item.img) {
    previewImg.src = item.img;
    previewImg.style.display = "block";
    currentBase64Img = item.img;
  } else {
    previewImg.style.display = "none";
    currentBase64Img = "";
  }
  errorName.style.display = "none";
  overlay.classList.add("active");
  popupForm.classList.add("active");
  categoryName.focus();
}

function closePopup() {
  overlay.classList.remove("active");
  popupForm.classList.remove("active");
}

function openConfirmDelete(id) {
  const item = categories.find((p) => p.id === id);
  if (!item) return;
  deleteId = id;
  document.getElementById("confirm-name").textContent = item.name;
  overlay.classList.add("active");
  popupConfirm.classList.add("active");
}

function closeConfirm() {
  overlay.classList.remove("active");
  popupConfirm.classList.remove("active");
  deleteId = null;
}

// SUBMIT
function handleSubmit() {
  const name = categoryName.value.trim();
  if (!validateName(name)) return;

  const file = categoryImg.files[0];

  const save = (imgBase64) => {
    if (editingId !== null) {
      // SỬA
      const item = categories.find((p) => p.id === editingId);
      item.name = name;
      if (imgBase64 !== undefined) item.img = imgBase64;
    } else {
      // THÊM
      categories.push({ id: nextId++, name, img: imgBase64 || "" });
    }
    saveToLocalStorage();
    renderCategories();
    closePopup();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => save(e.target.result);
    reader.readAsDataURL(file);
  } else {
    save(undefined); // giữ ảnh cũ nếu đang sửa
  }
}

// XÓA
function handleDelete() {
  categories = categories.filter((p) => p.id !== deleteId);
  saveToLocalStorage();
  renderCategories();
  closeConfirm();
}

// VALIDATE
function validateName(name) {
  errorName.style.display = "none";
  errorIcon.style.display = "none";

  if (name.length === 0) {
    errorName.style.display = "block";
    errorName.textContent = "Tên danh mục không được để trống!";
    return false;
  }

  const duplicated = categories.some((p) => p.name === name);
  if (duplicated) {
    errorName.style.display = "block";
    errorName.textContent = "Danh mục đã tồn tại!";
    return false;
  }

  if (name.length < 2 || name.length > 30) {
    errorName.style.display = "block";
    errorName.textContent = "Tên danh mục phải từ 2-30 ký tự!";
    return false;
  }

  if (!currentBase64Img) {
    errorIcon.style.display = "block";
    errorIcon.textContent = "Chưa chọn icon!";
    return false;
  }

  errorName.style.display = "none";
  errorIcon.style.display = "none";
  return true;
}

// RENDER + PHÂN TRANG
function renderCategories() {
  const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE);

  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
  if (totalPages === 0) currentPage = 1;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageData = categories.slice(start, start + ITEMS_PER_PAGE);

  if (categories.length === 0) {
    listCategory.innerHTML = `<tr><td colspan="3" class="empty-state">Chưa có danh mục nào...!!!</td></tr>`;
    totalPages.style.display = "none";
  } else {
    listCategory.innerHTML = "";
    pageData.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.id}</td>
        <td class="category-name">
          ${p.img ? `<img src="${p.img}" class="category-icon" alt="icon" />` : ""}
          ${p.name}
        </td>
        <td>
          <div class="action-cell">
            <button class="btn-edit" onclick="openEditPopup(${p.id})">Sửa</button>
            <button class="btn-delete" onclick="openConfirmDelete(${p.id})">Xoá</button>
          </div>
        </td>
      `;
      listCategory.appendChild(tr);
    });
  }

  renderPagination(totalPages);
}

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
      renderCategories();
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
      renderCategories();
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
      renderCategories();
    }
  });
  pagination.appendChild(next);
}

// LOG OUT
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

// Bước 2: Xác nhận đóng confirm, hiện thông báo thành công, rồi chuyển trang
function confirmLogOut() {
  closeLogoutConfirm();
  document.getElementById("popup-logout").classList.add("active");
  setTimeout(() => {
    window.location.href = "../pages/login.html";
  }, 1000);
}
