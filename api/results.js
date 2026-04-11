// Vercel serverless function for results storage

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://finalproject-it103b-nguyentandung.vercel.app',
  'https://finalproject-it103b-nguyentandung-git-main.vercel.app'
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
    // Simple auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    if (!token) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    let results = [];

    if (process.env.KV_URL) {
      // Vercel KV would go here
      results = global.results || [];
    } else {
      if (!global.results) global.results = [];
      results = global.results;
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json(results);

      case 'POST':
        const newResult = req.body;
        if (!newResult.id) {
          return res.status(400).json({ error: 'Invalid result data' });
        }

        const existingIndex = results.findIndex(r => r.id === newResult.id);
        if (existingIndex >= 0) {
          results[existingIndex] = newResult;
        } else {
          results.push(newResult);
        }

        global.results = results;
        return res.status(200).json({ success: true });

      case 'DELETE':
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'Result ID required' });
        }

        const deleteIndex = results.findIndex(r => r.id === id);
        if (deleteIndex >= 0) {
          results.splice(deleteIndex, 1);
          global.results = results;
          return res.status(200).json({ success: true });
        } else {
          return res.status(404).json({ error: 'Result not found' });
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}