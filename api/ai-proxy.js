// Vercel Serverless Function: AI Proxy for NVIDIA NIM / LLM APIs (Bypasses Browser CORS)
module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
    }

    try {
        const { endpoint, apiKey, payload } = req.body || {};

        if (!endpoint || !apiKey || !payload) {
            return res.status(400).json({ error: 'Missing required parameters: endpoint, apiKey, or payload' });
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            return res.status(response.status).json(data || { error: `Upstream error ${response.statusText}` });
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error('[AI Proxy Error]:', err);
        return res.status(500).json({ error: err.message || 'Internal proxy error' });
    }
}
