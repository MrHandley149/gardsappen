const { getDailyCode, getSessionToken, safeEqual, isAuthorized } = require('./_auth');

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        return res.status(200).json({ authorized: isAuthorized(req) });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Endast POST tillåtet.' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const inputCode = String(body.code || '').trim();

        if (!safeEqual(inputCode, getDailyCode())) {
            return res.status(401).json({ error: 'Fel kod. Försök igen.' });
        }

        const token = getSessionToken();
        res.setHeader(
            'Set-Cookie',
            `ga_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
        );

        return res.status(200).json({ ok: true, redirect: '/api/app' });
    } catch (err) {
        return res.status(500).json({ error: 'Kunde inte verifiera koden.' });
    }
};
