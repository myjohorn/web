// Vercel Serverless Function: Hana Bank Exchange Rate Proxy for MYR/KRW via Naver Market Index
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const response = await fetch('https://api.stock.naver.com/marketindex/exchange/FX_MYRKRW', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Upstream Naver API responded with status ${response.status}`);
        }

        const data = await response.json();
        const info = data.exchangeInfo || {};
        const rate = parseFloat(info.calcPrice || info.closePrice);
        const bankName = (info.stockExchangeType && info.stockExchangeType.nameKor) || '하나은행';
        const degree = info.degreeCount || null;
        const tradedAt = info.localTradedAt || new Date().toISOString();

        return res.status(200).json({
            provider: bankName,
            rate: rate,
            degree: degree,
            tradedAt: tradedAt,
            currency: 'MYR'
        });
    } catch (err) {
        console.error('[Exchange Rate Proxy Error]:', err);
        return res.status(500).json({ error: err.message || 'Failed to fetch Hana Bank exchange rate' });
    }
};
