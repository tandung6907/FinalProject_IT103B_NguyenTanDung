function checkAuth() {
  const user = sessionStorage.getItem("currentUser");
  if (!user) {
    window.location.href = "../pages/login.html";
    return null;
  }
  return JSON.parse(user);
}

function checkAdmin() {
  const user = checkAuth();
  if (user && user.role !== "admin") {
    window.location.href = "../pages/home.html";
    return null;
  }
  return user;
}

function logOut() {
  sessionStorage.removeItem("currentUser");
  window.location.href = "../pages/login.html";
}
