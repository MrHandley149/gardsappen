const crypto = require('crypto');

function getTodaySweden() {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm'
    }).format(new Date()); // Format: YYYY-MM-DD
}

function getDailyCode() {
    const secret = process.env.APP_SECRET;
    if (!secret) throw new Error('APP_SECRET saknas i Vercel.');

    const today = getTodaySweden();
    const hmac = crypto.createHmac('sha256', secret).update(`code:${today}`).digest();
    const num = hmac.readUInt32BE(0) % 1000000;
    return num.toString().padStart(6, '0');
}

function getSessionToken() {
    const secret = process.env.APP_SECRET;
    const today = getTodaySweden();
    return crypto.createHmac('sha256', secret).update(`session:${today}`).digest('hex');
}

function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorized(req) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/(?:^|;\s*)ga_session=([^;]+)/);
    if (!match) return false;
    return safeEqual(match[1], getSessionToken());
}

module.exports = {
    getTodaySweden,
    getDailyCode,
    getSessionToken,
    safeEqual,
    isAuthorized
};
