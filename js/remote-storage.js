// Remote storage using Vercel serverless functions or GitHub API
// Auto-detect environment

const API_BASE_URL = window.location.origin || ''; // Vercel domain or localhost
const AUTH_TOKEN = "demo-token"; // In production, use proper auth
const USE_VERCEL = API_BASE_URL.includes("vercel.app");

// Tests functions
async function loadRemoteTestsFromGithub() {
  if (USE_VERCEL) {
    return loadRemoteTestsFromVercel();
  }

  const config = getRemoteTestConfig();
  if (!config) return [];

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`,
      {
        headers: {
          Authorization: `token ${config.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log("Test file not found on GitHub, returning empty array");
        return [];
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const content = atob(data.content);
    const tests = JSON.parse(content);
    return Array.isArray(tests) ? tests : [];
  } catch (error) {
    console.warn("Error loading tests from GitHub:", error);
    return [];
  }
}

async function loadRemoteTestsFromVercel() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tests`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Failed to load tests from Vercel:", response.status);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Error loading tests from Vercel:", error);
    return [];
  }
}

async function saveRemoteTestsToGithub(tests) {
  if (USE_VERCEL) {
    return saveRemoteTestsToVercel(tests);
  }

  const config = getRemoteTestConfig();
  if (!config) return;

  try {
    const content = btoa(JSON.stringify(tests, null, 2));
    const fileData = {
      message: "Update tests data",
      content: content,
      sha: await getFileSha(config),
    };

    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fileData),
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    console.log("Tests saved to GitHub");
  } catch (error) {
    console.warn("Error saving tests to GitHub:", error);
  }
}

async function saveRemoteTestsToVercel(tests) {
  try {
    // Save all tests
    for (const test of tests) {
      await fetch(`${API_BASE_URL}/api/tests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(test),
      });
    }
    console.log("Tests saved to Vercel");
  } catch (error) {
    console.warn("Error saving tests to Vercel:", error);
  }
}

// Results functions
async function loadRemoteResultsFromGithub() {
  if (USE_VERCEL) {
    return loadRemoteResultsFromVercel();
  }

  const config = getRemoteResultConfig();
  if (!config) return [];

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`,
      {
        headers: {
          Authorization: `token ${config.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log("Result file not found on GitHub, returning empty array");
        return [];
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const content = atob(data.content);
    const results = JSON.parse(content);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.warn("Error loading results from GitHub:", error);
    return [];
  }
}

async function loadRemoteResultsFromVercel() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/results`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Failed to load results from Vercel:", response.status);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Error loading results from Vercel:", error);
    return [];
  }
}

async function saveRemoteResultsToGithub(results) {
  if (USE_VERCEL) {
    return saveRemoteResultsToVercel(results);
  }

  const config = getRemoteResultConfig();
  if (!config) return;

  try {
    const content = btoa(JSON.stringify(results, null, 2));
    const fileData = {
      message: "Update results data",
      content: content,
      sha: await getFileSha(config),
    };

    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fileData),
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    console.log("Results saved to GitHub");
  } catch (error) {
    console.warn("Error saving results to GitHub:", error);
  }
}

async function saveRemoteResultsToVercel(results) {
  try {
    for (const result of results) {
      await fetch(`${API_BASE_URL}/api/results`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });
    }
    console.log("Results saved to Vercel");
  } catch (error) {
    console.warn("Error saving results to Vercel:", error);
  }
}

// Helper functions
function getGithubContentUrl(config) {
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
}

async function getFileSha(config) {
  try {
    const response = await fetch(getGithubContentUrl(config), {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.sha;
    }
  } catch (error) {
    console.warn("Error getting file SHA:", error);
  }
  return null;
}

function mergeRecords(local, remote) {
  const map = new Map();
  remote.forEach((item) => map.set(item.id, item));
  local.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

// Config functions
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
  if (config && config.owner && config.repo && config.path && config.token) {
    return config;
  }
  return null;
}

function getRemoteTestConfig() {
  const config = loadRemoteTestConfig();
  if (config && config.owner && config.repo && config.path && config.token) {
    return config;
  }
  return null;
}

function encodeContentToBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function decodeContentFromBase64(base64) {
  return decodeURIComponent(escape(atob(base64)));
}
