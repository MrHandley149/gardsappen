const { getDailyCode, getTodaySweden } = require('./_auth');

let lastSentAt = 0;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Endast POST tillåtet.' });
    }

    const now = Date.now();
    if (now - lastSentAt < 60000) {
        return res.status(429).json({ error: 'Vänta en minut innan du begär en ny kod.' });
    }

    try {
        const code = getDailyCode();
        const today = getTodaySweden();

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Gårdsappen <onboarding@resend.dev>',
                to: ['mattias.handley@gmail.com'],
                subject: `Kod till Gårdsappen (${today})`,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111; padding: 24px;">
                        <p style="font-size: 14px; color: #666; margin: 0 0 8px;">Dagens åtkomstkod (${today})</p>
                        <p style="font-size: 36px; font-weight: 900; letter-spacing: 6px; margin: 0;">${code}</p>
                        <p style="font-size: 13px; color: #666; margin-top: 24px;">Koden gäller till midnatt svensk tid.</p>
                    </div>
                `
            })
        });

        if (!response.ok) {
            return res.status(500).json({ error: 'Kunde inte skicka mailet. Kontrollera RESEND_API_KEY.' });
        }

        lastSentAt = now;
        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Serverfel vid utskick.' });
    }
};
