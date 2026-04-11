// Vercel serverless function for tests storage
// This replaces GitHub remote storage

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://finalproject-it103b-nguyentandung.vercel.app',
  'https://finalproject-it103b-nguyentandung-git-main.vercel.app' // preview deployments
];

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Simple auth check - in production, use proper JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    // For demo, accept any token - in production validate properly
    if (!token) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Use Vercel KV for storage (if available) or in-memory for demo
    let tests = [];

    if (process.env.KV_URL) {
      // Vercel KV integration would go here
      // For now, use in-memory storage
      tests = global.tests || [];
    } else {
      // In-memory storage for demo
      if (!global.tests) global.tests = [];
      tests = global.tests;
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json(tests);

      case 'POST':
        const newTest = req.body;
        if (!newTest.id || !newTest.name) {
          return res.status(400).json({ error: 'Invalid test data' });
        }

        // Check if test exists
        const existingIndex = tests.findIndex(t => t.id === newTest.id);
        if (existingIndex >= 0) {
          tests[existingIndex] = newTest;
        } else {
          tests.push(newTest);
        }

        global.tests = tests;
        return res.status(200).json({ success: true });

      case 'DELETE':
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'Test ID required' });
        }

        const deleteIndex = tests.findIndex(t => t.id === id);
        if (deleteIndex >= 0) {
          tests.splice(deleteIndex, 1);
          global.tests = tests;
          return res.status(200).json({ success: true });
        } else {
          return res.status(404).json({ error: 'Test not found' });
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}