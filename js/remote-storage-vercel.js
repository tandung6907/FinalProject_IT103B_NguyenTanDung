// Remote storage using Vercel serverless functions
// Replace GitHub API with Vercel API calls

const API_BASE_URL = window.location.origin; // Vercel domain
const AUTH_TOKEN = "demo-token"; // In production, use proper auth

// Tests functions
async function loadRemoteTestsFromVercel() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Failed to load tests from Vercel:', response.status);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Error loading tests from Vercel:', error);
    return [];
  }
}

async function saveRemoteTestsToVercel(tests) {
  try {
    // Save all tests (in production, save individually or use batch)
    for (const test of tests) {
      await fetch(`${API_BASE_URL}/api/tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(test)
      });
    }
    console.log('Tests saved to Vercel');
  } catch (error) {
    console.warn('Error saving tests to Vercel:', error);
  }
}

async function deleteRemoteTestFromVercel(testId) {
  try {
    await fetch(`${API_BASE_URL}/api/tests?id=${testId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
  } catch (error) {
    console.warn('Error deleting test from Vercel:', error);
  }
}

// Results functions
async function loadRemoteResultsFromVercel() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/results`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Failed to load results from Vercel:', response.status);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Error loading results from Vercel:', error);
    return [];
  }
}

async function saveRemoteResultsToVercel(results) {
  try {
    for (const result of results) {
      await fetch(`${API_BASE_URL}/api/results`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
    }
    console.log('Results saved to Vercel');
  } catch (error) {
    console.warn('Error saving results to Vercel:', error);
  }
}

async function deleteRemoteResultFromVercel(resultId) {
  try {
    await fetch(`${API_BASE_URL}/api/results?id=${resultId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
  } catch (error) {
    console.warn('Error deleting result from Vercel:', error);
  }
}

// Legacy GitHub functions (keep for backward compatibility)
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

async function loadRemoteTestsFromGithub() {
  return loadRemoteTestsFromVercel(); // Redirect to Vercel
}

async function saveRemoteTestsToGithub(tests) {
  return saveRemoteTestsToVercel(tests); // Redirect to Vercel
}

async function loadRemoteResultsFromGithub() {
  return loadRemoteResultsFromVercel(); // Redirect to Vercel
}

async function saveRemoteResultsToGithub(results) {
  return saveRemoteResultsToVercel(results); // Redirect to Vercel
}