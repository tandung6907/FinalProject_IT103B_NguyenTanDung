const REGISTER_KEY = "registers";

// BIẾN ADMIN CỐ ĐỊNH
const ADMIN_ACCOUNT = {
  id: 0,
  name: "admin",
  email: "admin@gmail.com",
  pass: "admin123@",
  role: "admin",
};

// MẢNG NGƯỜI DÙNG
let users = [];
let nextId = 1;

// KHAI BÁO BIẾN
let emailLogin, passLogin, formLogin, errorLogin;

// LẤY DỮ LIỆU ĐỂ ĐĂNG NHẬP TỪ ĐĂNG KÝ
function loadFromLocalStorage() {
  const data = localStorage.getItem("registers");
  return data ? JSON.parse(data) : [];
}

// RUN LOAD
window.onload = function () {
  const data = loadFromLocalStorage();

  if (data.length > 0) {
    users = data;
    nextId = users.length ? Math.max(...users.map((p) => p.id)) + 1 : 1;
  }
  // LẤY DOM
  emailLogin = document.getElementById("email-login");
  passLogin = document.getElementById("pass-login");
  formLogin = document.querySelector(".form-login");
  errorLogin = document.querySelector(".error-login");

  // GÁN ROLE USER CHO TẤT CẢ TÀI KHOẢN ĐĂNG KÝ
  users = users.map((p) => ({ ...p, role: p.role || "user" }));

  // THÊM ADMIN VÀO DANH SÁCH NẾU CHƯA CÓ
  const hasAdmin = users.some((p) => p.email === ADMIN_ACCOUNT.email);
  if (!hasAdmin) {
    users.push(ADMIN_ACCOUNT);
  }

  formLogin.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  });
  
};

function handleLogin() {
  const mail = emailLogin.value.trim();
  const pass = passLogin.value.trim();
  errorLogin.style.display = "none";
  if (!mail || !pass) {
    errorLogin.style.display = "block";
    errorLogin.textContent = "Email hoặc mật khẩu không đúng!";
    return;
  }

  const existed = users.find((p) => p.email === mail);
  if (!existed) {
    errorLogin.style.display = "block";
    errorLogin.textContent = "Email không tồn tại!";
    return;
  }

  const found = users.find((p) => p.email === mail && p.pass === pass);

  if (!found) {
    errorLogin.style.display = "block";
    errorLogin.textContent = "Email hoặc mật khẩu không đúng!";
    return;
  }

  sessionStorage.setItem("currentUser", JSON.stringify(found));

  // XÉT CHỨC NĂNG ĐỂ ĐĂNG NHẬP
  if (found.role === "admin") {
    window.location.href = "../pages/category-manager.html";
  } else {
    window.location.href = "../pages/home.html";
  }
}

