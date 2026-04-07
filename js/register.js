const REGISTER_KEY = "registers";

let registers = [];
let nextId = 1;

// khai báo biến
let registerName, registerEmail, registerPass, checkPass, form;
let errorName, errorEmail, errorPass;

//save - load - load không mất dữ liệu
function saveToLocalStorage() {
  localStorage.setItem(REGISTER_KEY, JSON.stringify(registers));
}

function loadFromLocalStorage() {
  const data = localStorage.getItem(REGISTER_KEY);
  return data ? JSON.parse(data) : [];
}

window.onload = function () {
  const data = loadFromLocalStorage();

  if (data.length > 0) {
    registers = data;
    nextId = registers.length ? Math.max(...registers.map((p) => p.id)) + 1 : 1;
  }

  registerName = document.getElementById("name-register");
  registerEmail = document.getElementById("email-register");
  registerPass = document.getElementById("pass-register");
  checkPass = document.getElementById("check-pass");
  errorEmail = document.querySelector(".error-email");
  errorName = document.querySelector(".error-name");
  errorPass = document.querySelector(".error-pass");
  errorCheckPass = document.querySelector(".error-check-pass");
  form = document.querySelector(".form-register");

  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  });
};

function handleSubmit() {
  const name = registerName.value.trim();
  const email = registerEmail.value.trim();
  const pass = registerPass.value.trim();
  const checked = checkPass.value.trim();

  if (!validateName(name) || !validateEmail(email) || !validatePass(pass) || !validateCheckPass(checked, pass)) return;

  const newRegister = {
    id: nextId++,
    name: name,
    email: email,
    pass: pass,
    role: "user",
  };

  registers.push(newRegister);
  saveToLocalStorage();

  // RESET
  registerEmail.value = "";
  registerName.value = "";
  registerPass.value = "";
  checkPass.value = ""; 
  registerName.focus();

  //HIỂN THỊ POPUP ĐĂNG KÝ THÀNH CÔNG + CHUYỂN SANG TRANG ĐĂNG NHẬP
  document.getElementById("popup-success").style.display = "flex";

  setTimeout(() => {
    window.location.href = "../pages/login.html";
  }, 1000);
}

// VALIDATE NAME
function validateName(name) {
  errorName.style.display = "none";

  if (name.length === 0) {
    errorName.style.display = "block";
    errorName.textContent = "Tên đăng nhập không để trống!";
    return false;
  }

  const regexName = /^([A-ZÀ-Ỹ][a-zà-ỹ]+)(\s[A-ZÀ-Ỹ][a-zà-ỹ]+)*$/u;
  if (name.length < 5 || !regexName.test(name)) {
    errorName.style.display = "block";
    errorName.textContent =
      "Tên không được chứa ký tự đặc biệt không có số!";
    return false;
  }

  errorName.style.display = "none";
  return true;
}

// VALIDATE EMAIL
function validateEmail(email) {
  errorEmail.style.display = "none";
  if (email.length === 0) {
    errorEmail.style.display = "block";
    errorEmail.textContent = "Email không được để trống!";
    return false;
  }

  const regexEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;
  if (!regexEmail.test(email)) {
    errorEmail.style.display = "block";
    errorEmail.textContent = `Email không đúng định dạng (cần @"text"."text")!`;
    return false;
  }

  let isDuplicated = false;
  registers.forEach((p) => {
    if (p.email === email) {
      isDuplicated = true;
    }
  });
  if (isDuplicated) {
    errorEmail.style.display = "block";
    errorEmail.textContent = "Email đã tồn tại!";
    return false;
  }

  errorEmail.style.display = "none";
  return true;
}

// VALIDATE PASSWORD
function validatePass(pass) {
  errorPass.style.display = "none";
  if (pass.length === 0 || pass.length < 8) {
    errorPass.style.display = "block";
    errorPass.textContent = "Mật khẩu không để trống và nhiều hơn 8 kí tự!";
    return false;
  }
  return true;
}

// VALIDATE CHECKPASS
function validateCheckPass(checked, pass) {
  errorCheckPass.style.display = "none";
  if (checked.length === 0) {
    errorCheckPass.style.display = "block";
    errorCheckPass.textContent = "Không được để trống!";
    return false;
  }

  if (checked !== pass) {
    errorCheckPass.style.display = "block";
    errorCheckPass.textContent = "Vui lòng xác nhận đúng mật khẩu đăng ký!";
    return false;
  }

  errorCheckPass.style.display = "none";
  return true;
}