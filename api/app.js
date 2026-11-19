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
    <link rel="stylesheet" href="/app-core/style.css">
</head>
<body>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <div id="app"></div>
    <script src="/app-core/store.js"></script>
    <script src="/app-core/app.js"></script>
</body>
</html>`);
};
