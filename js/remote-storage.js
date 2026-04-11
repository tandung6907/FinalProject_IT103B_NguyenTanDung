const REMOTE_RESULT_CONFIG_KEY = "remoteResultConfig";
const REMOTE_TEST_CONFIG_KEY = "remoteTestConfig";

function loadRemoteResultConfig() {
  const raw = localStorage.getItem(REMOTE_RESULT_CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveRemoteResultConfig(config) {
  localStorage.setItem(REMOTE_RESULT_CONFIG_KEY, JSON.stringify(config));
}

function loadRemoteTestConfig() {
  const raw = localStorage.getItem(REMOTE_TEST_CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveRemoteTestConfig(config) {
  localStorage.setItem(REMOTE_TEST_CONFIG_KEY, JSON.stringify(config));
}

function getRemoteResultConfig() {
  const config = loadRemoteResultConfig();
  if (
    config &&
    config.owner &&
    config.repo &&
    config.path &&
    config.token
  ) {
    return config;
  }
  return null;
}

function getRemoteTestConfig() {
  const config = loadRemoteTestConfig();
  if (
    config &&
    config.owner &&
    config.repo &&
    config.path &&
    config.token
  ) {
    return config;
  }
  return null;
}

function getGithubContentUrl(config) {
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(
    config.path,
  )}`;
}

function encodeContentToBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function decodeContentFromBase64(base64) {
  return decodeURIComponent(escape(atob(base64)));
}

async function fetchGithubFileContent(config) {
  const url = getGithubContentUrl(config);
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${config.token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API lỗi: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function loadRemoteResultsFromGithub() {
  const config = getRemoteResultConfig();
  if (!config) return [];

  const file = await fetchGithubFileContent(config);
  if (!file || !file.content) return [];

  try {
    return JSON.parse(decodeContentFromBase64(file.content));
  } catch (error) {
    throw new Error("Không thể giải mã dữ liệu kết quả từ GitHub.");
  }
}

async function saveRemoteResultsToGithub(results) {
  const config = getRemoteResultConfig();
  if (!config) {
    throw new Error("Chưa cấu hình lưu kết quả từ xa.");
  }

  const url = getGithubContentUrl(config);
  const existingFile = await fetchGithubFileContent(config);
  const content = encodeContentToBase64(JSON.stringify(results, null, 2));

  const body = {
    message: existingFile
      ? `Cập nhật kết quả quiz ${new Date().toLocaleString()}`
      : `Tạo file kết quả quiz`,
    content,
  };
  if (existingFile && existingFile.sha) {
    body.sha = existingFile.sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${config.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API lỗi khi lưu: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function loadRemoteTestsFromGithub() {
  const config = getRemoteTestConfig();
  if (!config) return [];

  const file = await fetchGithubFileContent(config);
  if (!file || !file.content) return [];

  try {
    return JSON.parse(decodeContentFromBase64(file.content));
  } catch (error) {
    throw new Error("Không thể giải mã dữ liệu bài test từ GitHub.");
  }
}

async function saveRemoteTestsToGithub(tests) {
  const config = getRemoteTestConfig();
  if (!config) {
    throw new Error("Chưa cấu hình lưu bài test từ xa.");
  }

  const url = getGithubContentUrl(config);
  const existingFile = await fetchGithubFileContent(config);
  const content = encodeContentToBase64(JSON.stringify(tests, null, 2));

  const body = {
    message: existingFile
      ? `Cập nhật bài test ${new Date().toLocaleString()}`
      : `Tạo file bài test`,
    content,
  };
  if (existingFile && existingFile.sha) {
    body.sha = existingFile.sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${config.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API lỗi khi lưu: ${response.status} ${errorText}`);
  }

  return response.json();
}

function mergeResultRecords(localRecords, remoteRecords) {
  const map = new Map();
  [...localRecords, ...remoteRecords].forEach((item) => {
    if (!item || !item.id) return;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const aDate = new Date(item.createdAt || 0).getTime();
      const bDate = new Date(existing.createdAt || 0).getTime();
      if (aDate > bDate) {
        map.set(item.id, item);
      }
    }
  });
  return Array.from(map.values()).sort((a, b) => {
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });
}

function mergeTestRecords(localTests, remoteTests) {
  const map = new Map();
  [...localTests, ...remoteTests].forEach((item) => {
    if (!item || !item.id) return;
    map.set(item.id, item); // remote override local if same id
  });
  return Array.from(map.values());
}
