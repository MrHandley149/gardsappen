const { isAuthorized } = require('./_auth');

module.exports = async function handler(req, res) {
    if (!isAuthorized(req)) {
        res.writeHead(302, { Location: '/appen' });
        return res.end();
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Gårdsappen</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #fff; color: #111; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .wrap { max-width: 360px; width: 100%; text-align: center; }
        h1 { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 12px; }
        p { font-size: 16px; color: #555; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="wrap">
        <h1>Upplåst</h1>
        <p>Sifferlåset fungerar. Här bygger vi nu in den fullskaliga appen med fejkdata.</p>
    </div>
</body>
</html>`);
};
