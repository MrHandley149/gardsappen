(function () {
    const appEl = document.getElementById('app');
    const toastEl = document.getElementById('toast');

    let currentView = 'start';
    let ledareSubView = null; // 'qr' | 'manuell' | 'kiosk' | 'resurser' | 'push' | 'banner' | 'aktivitet'
    let editRutin = { oppning: false, stangning: false };
    let cart = {}; // { kioskItemId: antal }
    let evacSafeIds = new Set();
    let statPeriod = 'vecka';
    let toastTimer = null;

    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
    }

    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function go(view) {
        currentView = view;
        ledareSubView = null;
        window.scrollTo(0, 0);
        render();
    }

    function topbar(title, showBack = true) {
        const gard = Store.getAktivGard();
        return `
            <div class="topbar">
                <div>
                    <div class="topbar-title">${esc(title)}</div>
                    <div class="muted" style="font-size:12px;">${esc(gard.namn)}</div>
                </div>
                <div class="topbar-actions">
                    ${showBack ? `<button class="btn-link" onclick="App.go('start')">Byt vy</button>` : ''}
                </div>
            </div>
        `;
    }

    // ==================== VY: START ====================
    function renderStart() {
        const s = Store.get();
        const gard = Store.getAktivGard();
        const gardOptions = s.tenant.gardar.map(g =>
            `<option value="${g.id}" ${g.id === gard.id ? 'selected' : ''}>${esc(g.namn)} (${esc(g.stadsdel)})</option>`
        ).join('');

        return `
            <div class="app-shell">
                <div style="padding-top: 24px;">
                    <p class="kicker">${esc(s.tenant.kommunNamn)}</p>
                    <h1>Gårdsappen</h1>
                    <p class="muted" style="margin-bottom: 28px;">Fullskalig app med lokal testdata. Alla ändringar synkas mellan vyerna.</p>

                    <div class="field">
                        <label class="field-label" for="gard-select">Aktiv gård</label>
                        <select id="gard-select" onchange="App.selectGard(this.value)">
                            ${gardOptions}
                        </select>
                    </div>

                    <div class="stack" style="margin-top: 24px;">
                        <button class="btn-primary" onclick="App.go('ungdom')">Ungdom</button>
                        <button class="btn-secondary" onclick="App.go('ledare')">Fritidsledare</button>
                        <button class="btn-secondary" onclick="App.go('chef')">Chef</button>
                        <button class="btn-bankid" onclick="App.go('foralder')">Förälder (BankID)</button>
                    </div>

                    <div class="section" style="text-align:center;">
                        <button class="btn-link" onclick="App.resetData()">Återställ all testdata</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== VY: UNGDOM ====================
    function renderUngdom() {
        const s = Store.get();
        const gard = Store.getAktivGard();
        const u = Store.getAktivUngdom();
        const flags = gard.featureFlags;
        const fullName = Store.displayName(u);

        const statusBadge = u.avstangd
            ? `<span class="pill pill-red">Avstängd</span>`
            : u.status === 'godkant'
                ? `<span class="pill pill-green">Gårdskort godkänt</span>`
                : `<span class="pill pill-amber">Inväntar föräldrars godkännande</span>`;

        const notisHtml = (s.notiser && s.notiser.length > 0) ? `
            <div class="surface" style="margin-top:16px; border:2px solid #111;">
                <p class="kicker">Meddelande från ledarna (${esc(s.notiser[0].tid)})</p>
                <p style="font-weight:700;">${esc(s.notiser[0].text)}</p>
            </div>
        ` : '';

        const koerHtml = flags.koer ? `
            <div class="section">
                <div class="section-header"><h2>Boka resurser</h2></div>
                <div class="stack">
                    ${s.resurser.map(r => {
                        const inQueue = r.ko.includes(fullName);
                        const status = r.ko.length === 0
                            ? `<span class="pill pill-green">Ledigt</span>`
                            : `<span class="pill pill-red">${r.ko.length} i kö</span>`;
                        return `
                            <div class="surface">
                                <div class="row" style="margin-bottom: 12px;">
                                    <h3>${esc(r.namn)}</h3>
                                    ${status}
                                </div>
                                ${r.ko.length > 0 ? `<p class="muted" style="margin-bottom:12px;">Kö: ${r.ko.map(esc).join(', ')}</p>` : ''}
                                <button class="${inQueue ? 'btn-secondary' : 'btn-primary'}" style="min-height:46px;" onclick="App.toggleQueue('${r.id}')">
                                    ${inQueue ? 'Lämna kö' : 'Ställ dig i kö'}
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : '';

        const lagHtml = flags.lag ? `
            <div class="section">
                <div class="section-header"><h2>Aktiviteter & Lag</h2></div>
                <div class="stack">
                    ${s.aktiviteter.map(a => `
                        <div class="surface">
                            <h3>${esc(a.namn)}</h3>
                            <p class="muted" style="margin-bottom:14px;">${esc(a.tid)} • Max ${a.maxPerLag} per lag</p>
                            ${a.lag.map(l => `
                                <div class="row" style="padding:8px 0; border-top:1px solid #e5e5e5;">
                                    <div>
                                        <strong>${esc(l.namn)}</strong>
                                        <div class="muted" style="font-size:12px;">${l.medlemmar.map(esc).join(', ')}</div>
                                    </div>
                                    <span class="pill pill-dark">PIN ${esc(l.pinkod)}</span>
                                </div>
                            `).join('')}
                            <div class="grid-2" style="margin-top:14px;">
                                <button class="btn-primary" style="min-height:46px;" onclick="App.createTeam('${a.id}')">Skapa lag</button>
                                <button class="btn-secondary" style="min-height:46px;" onclick="App.joinTeam('${a.id}')">Gå med (PIN)</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        let cartTotal = 0;
        const cartItems = [];
        s.kiosk.forEach(item => {
            const qty = cart[item.id] || 0;
            if (qty > 0) {
                cartTotal += qty * item.pris;
                cartItems.push(`${qty}x ${item.namn}`);
            }
        });

        const kioskHtml = flags.kiosk ? `
            <div class="section">
                <div class="section-header">
                    <h2>Kiosken</h2>
                    <span class="muted">Swish: ${esc(gard.swishNummer)}</span>
                </div>
                <ul class="list">
                    ${s.kiosk.filter(k => k.iLager).map(k => {
                        const qty = cart[k.id] || 0;
                        return `
                            <li class="list-item">
                                <div>
                                    <h3>${esc(k.namn)}</h3>
                                    <div class="muted">${k.pris} kr</div>
                                </div>
                                <div class="row" style="gap:8px;">
                                    ${qty > 0 ? `<button class="btn-small" onclick="App.cartDelta('${k.id}', -1)">−</button><strong>${qty}</strong>` : ''}
                                    <button class="btn-small dark" onclick="App.cartDelta('${k.id}', 1)">+</button>
                                </div>
                            </li>
                        `;
                    }).join('')}
                </ul>
                ${cartTotal > 0 ? `
                    <div class="surface" style="margin-top:16px;">
                        <div class="row" style="margin-bottom:12px;">
                            <div>
                                <strong>Din korg</strong>
                                <div class="muted" style="font-size:13px;">${esc(cartItems.join(', '))}</div>
                            </div>
                            <strong style="font-size:20px;">${cartTotal} kr</strong>
                        </div>
                        <button class="btn-primary" onclick="App.paySwish(${cartTotal})">Öppna Swish (${cartTotal} kr)</button>
                    </div>
                ` : ''}
            </div>
        ` : '';

        const onskemalHtml = flags.onskemal ? `
            <div class="section">
                <div class="surface" style="background:#111; color:#fff;">
                    <h3 style="margin-bottom:10px;">Saknar du något i kiosken?</h3>
                    <div class="row">
                        <input type="text" id="wish-input" placeholder="Önska vara..." style="background:#222; color:#fff; border-color:#333;">
                        <button class="btn-small" style="background:#fff; color:#111; border-color:#fff; min-height:52px;" onclick="App.addWish()">Önska</button>
                    </div>
                </div>
            </div>
        ` : '';

        return `
            <div class="marquee"><div class="marquee-inner">${esc(gard.banner)}</div></div>
            <div class="app-shell">
                ${topbar('Ungdom')}

                <div style="text-align:center; padding: 12px 0 8px;">
                    <p class="kicker">Digitalt gårdskort</p>
                    <h1>${esc(fullName)}</h1>
                    <div style="margin-top:10px;">${statusBadge}</div>
                    ${u.allergier ? `<p style="color:#d32f2f; font-weight:700; font-size:14px; margin-top:12px;">Allergi: ${esc(u.allergier)}</p>` : ''}
                </div>

                ${notisHtml}

                <div class="surface" style="margin-top:20px;">
                    <div class="row">
                        <div>
                            <p class="kicker">Närvaro på ${esc(gard.namn)}</p>
                            <h3>${u.incheckad ? `Incheckad sedan ${esc(u.incheckadTid)}` : 'Inte incheckad'}</h3>
                        </div>
                        <button class="btn-small ${u.incheckad ? '' : 'dark'}" onclick="App.toggleCheckin('${u.id}')">
                            ${u.incheckad ? 'Checka ut' : 'Checka in'}
                        </button>
                    </div>
                </div>

                ${koerHtml}
                ${lagHtml}
                ${kioskHtml}
                ${onskemalHtml}
            </div>
        `;
    }

    // ==================== VY: FRITIDSLEDARE ====================
    function renderLedare() {
        const s = Store.get();
        const gard = Store.getAktivGard();
        const incheckade = s.ungdomar.filter(u => u.incheckad);
        const avstangda = s.ungdomar.filter(u => u.avstangd);

        let topSubPanel = '';
        if (ledareSubView === 'qr') {
            topSubPanel = `
                <div class="surface" style="margin-top:16px; text-align:center;">
                    <p class="kicker">Inchecknings-QR för ${esc(gard.namn)}</p>
                    <div style="width:160px; height:160px; margin:16px auto; background:#111; color:#fff; display:flex; align-items:center; justify-content:center; border-radius:12px; font-weight:900; font-size:20px; letter-spacing:2px;">
                        QR-KOD
                    </div>
                    <p class="muted" style="margin-bottom:14px;">Ungdomar skannar koden för kvällens första incheckning.</p>
                    <button class="btn-secondary" onclick="App.setLedareSub(null)">Stäng</button>
                </div>
            `;
        } else if (ledareSubView === 'manuell') {
            topSubPanel = `
                <div class="surface" style="margin-top:16px;">
                    <div class="row" style="margin-bottom:12px;">
                        <h3>Manuell incheckning</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    <ul class="list">
                        ${s.ungdomar.map(u => `
                            <li class="list-item">
                                <div>
                                    <strong>${esc(Store.displayName(u))}</strong>
                                    <div class="muted" style="font-size:12px;">${u.status === 'godkant' ? 'Godkänt kort' : 'Inväntar föräldrars godkännande'}</div>
                                </div>
                                <button class="btn-small ${u.incheckad ? '' : 'dark'}" onclick="App.toggleCheckin('${u.id}')">
                                    ${u.incheckad ? 'Checka ut' : 'Checka in'}
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        let manageSubPanel = '';
        if (ledareSubView === 'kiosk') {
            manageSubPanel = `
                <div class="surface" style="margin-top:16px;">
                    <div class="row" style="margin-bottom:14px;">
                        <h3>Hantera kiosken</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    <ul class="list" style="margin-bottom:16px;">
                        ${s.kiosk.map(k => `
                            <li class="list-item">
                                <div>
                                    <strong>${esc(k.namn)}</strong>
                                    <div class="muted">${k.pris} kr</div>
                                </div>
                                <div class="row" style="gap:6px;">
                                    <button class="btn-small" onclick="App.editKioskPrice('${k.id}')">Pris</button>
                                    <button class="btn-small danger" onclick="App.deleteKioskItem('${k.id}')">Ta bort</button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                    <div class="grid-2" style="margin-bottom:10px;">
                        <input type="text" id="new-kiosk-name" placeholder="Ny vara">
                        <input type="number" id="new-kiosk-price" placeholder="Pris (kr)">
                    </div>
                    <button class="btn-primary" style="min-height:46px;" onclick="App.addKioskItem()">Lägg till vara</button>
                    ${s.onskemal.length > 0 ? `
                        <div style="margin-top:18px; padding-top:14px; border-top:1px solid #e0e0e0;">
                            <p class="kicker">Önskemål från ungdomar</p>
                            ${s.onskemal.map(o => `<p class="muted" style="margin-top:4px;">• ${esc(o.text)} (${esc(o.av)})</p>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (ledareSubView === 'resurser') {
            manageSubPanel = `
                <div class="surface" style="margin-top:16px;">
                    <div class="row" style="margin-bottom:14px;">
                        <h3>Hantera bokningsbara resurser</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    <ul class="list" style="margin-bottom:16px;">
                        ${s.resurser.map(r => `
                            <li class="list-item">
                                <strong>${esc(r.namn)}</strong>
                                <div class="row" style="gap:6px;">
                                    <button class="btn-small" onclick="App.renameResource('${r.id}')">Byt namn</button>
                                    <button class="btn-small danger" onclick="App.deleteResource('${r.id}')">Ta bort</button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                    <div class="row">
                        <input type="text" id="new-resource-name" placeholder="Ny resurs (t.ex. Studio)">
                        <button class="btn-small dark" style="min-height:52px;" onclick="App.addResource()">Lägg till</button>
                    </div>
                </div>
            `;
        } else if (ledareSubView === 'push') {
            manageSubPanel = `
                <div class="surface" style="margin-top:16px;">
                    <div class="row" style="margin-bottom:12px;">
                        <h3>Skicka pushmeddelande</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    <div class="field">
                        <label class="field-label" for="push-input">Meddelande till ungdomarna</label>
                        <input type="text" id="push-input" placeholder="T.ex. Ikväll bjuder vi på fika kl 20:00!">
                    </div>
                    <button class="btn-primary" style="min-height:46px;" onclick="App.sendPush()">Skicka notis</button>
                    ${(s.notiser && s.notiser.length > 0) ? `
                        <div style="margin-top:18px; padding-top:14px; border-top:1px solid #e0e0e0;">
                            <p class="kicker">Skickade notiser</p>
                            ${s.notiser.slice(0, 5).map(n => `<p class="muted" style="margin-top:4px;">• ${esc(n.tid)} – ${esc(n.text)}</p>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (ledareSubView === 'banner') {
            manageSubPanel = `
                <div class="surface" style="margin-top:16px;">
                    <div class="row" style="margin-bottom:12px;">
                        <h3>Uppdatera info-banner</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    <div class="field">
                        <label class="field-label" for="banner-input">Text som rullar i ungdomsvyn</label>
                        <input type="text" id="banner-input" value="${esc(gard.banner)}">
                    </div>
                    <button class="btn-primary" style="min-height:46px;" onclick="App.saveBanner()">Spara banner</button>
                </div>
            `;
        } else if (ledareSubView === 'aktivitet') {
            manageSubPanel = `
                <div class="surface" style="margin-top:16px;">
                    <div class="row" style="margin-bottom:12px;">
                        <h3>Skapa aktivitet</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    <div class="field">
                        <label class="field-label" for="act-name">Namn</label>
                        <input type="text" id="act-name" placeholder="T.ex. Pingisturnering">
                    </div>
                    <div class="field">
                        <label class="field-label" for="act-time">Tid</label>
                        <input type="text" id="act-time" placeholder="T.ex. Fredag 19:30">
                    </div>
                    <button class="btn-primary" style="min-height:46px;" onclick="App.addActivity()">Skapa</button>
                </div>
            `;
        }

        function renderRutinBlock(type, title, actionLabel, actionFn) {
            const items = s.rutiner[type];
            const isEditing = editRutin[type];
            return `
                <div class="section surface">
                    <div class="row" style="margin-bottom:12px;">
                        <h2 style="margin-bottom:0;">${title}</h2>
                        <button class="btn-link" onclick="App.toggleEditRutin('${type}')">${isEditing ? 'Klar' : 'Redigera'}</button>
                    </div>
                    ${isEditing ? `
                        <ul class="list" style="margin-bottom:14px;">
                            ${items.map(r => `
                                <li class="list-item">
                                    <span>${esc(r.text)}</span>
                                    <button class="btn-small danger" onclick="App.deleteRutinItem('${type}', '${r.id}')">Ta bort</button>
                                </li>
                            `).join('')}
                        </ul>
                        <div class="row">
                            <input type="text" id="new-rutin-${type}" placeholder="Ny punkt...">
                            <button class="btn-small dark" style="min-height:52px;" onclick="App.addRutinItem('${type}')">Lägg till</button>
                        </div>
                    ` : `
                        ${items.map(r => `
                            <label class="check-row">
                                <input type="checkbox" ${r.klar ? 'checked' : ''} onchange="App.toggleRutin('${type}', '${r.id}')">
                                <span>${esc(r.text)}</span>
                            </label>
                        `).join('')}
                        <button class="btn-primary" style="margin-top:16px;" onclick="App.${actionFn}()">${actionLabel}</button>
                    `}
                </div>
            `;
        }

        return `
            <div class="app-shell">
                ${topbar('Fritidsledare')}

                <div class="row" style="margin-bottom:20px;">
                    <div>
                        <p class="kicker">${esc(gard.stadsdel)}</p>
                        <h1>${esc(gard.namn)}</h1>
                    </div>
                    <span class="pill ${gard.oppen ? 'pill-green' : 'pill-red'}">${gard.oppen ? 'Öppen' : 'Stängd'}</span>
                </div>

                <button class="btn-emergency" onclick="App.startEvac()">Nödutrymning</button>

                <div class="grid-2" style="margin-top:16px;">
                    <button class="btn-secondary" onclick="App.setLedareSub('qr')">Visa inchecknings-QR</button>
                    <button class="btn-secondary" onclick="App.setLedareSub('manuell')">Manuell incheck</button>
                </div>

                ${topSubPanel}

                <div class="section">
                    <div class="section-header">
                        <h2>Incheckade just nu</h2>
                        <span class="pill pill-dark">${incheckade.length}</span>
                    </div>
                    ${incheckade.length === 0 ? `<p class="muted">Inga ungdomar incheckade just nu.</p>` : `
                        <ul class="list">
                            ${incheckade.map(u => `
                                <li class="list-item">
                                    <div>
                                        <h3>${esc(Store.displayName(u))}</h3>
                                        <div class="muted">Incheckad ${esc(u.incheckadTid)} • ${esc(u.kon)}${u.allergier ? ` • Allergi: ${esc(u.allergier)}` : ''}</div>
                                    </div>
                                    <button class="btn-small danger" onclick="App.toggleSuspend('${u.id}')">Stäng av</button>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>

                <div class="section">
                    <div class="section-header">
                        <h2>Avstängningar</h2>
                        <span class="pill ${avstangda.length > 0 ? 'pill-red' : 'pill-dark'}">${avstangda.length}</span>
                    </div>
                    ${avstangda.length === 0 ? `<p class="muted">Inga aktiva avstängningar.</p>` : `
                        <ul class="list">
                            ${avstangda.map(u => `
                                <li class="list-item">
                                    <div>
                                        <h3>${esc(Store.displayName(u))}</h3>
                                        <div class="muted">Avstängd</div>
                                    </div>
                                    <button class="btn-small" onclick="App.toggleSuspend('${u.id}')">Häv avstängning</button>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>

                <div class="section">
                    <div class="section-header"><h2>Hantera gården</h2></div>
                    <div class="stack">
                        <button class="btn-secondary" style="text-align:left;" onclick="App.setLedareSub('kiosk')">Hantera kiosken (utbud & priser)</button>
                        <button class="btn-secondary" style="text-align:left;" onclick="App.setLedareSub('resurser')">Hantera bokningsbara resurser</button>
                        <button class="btn-secondary" style="text-align:left;" onclick="App.setLedareSub('push')">Skicka pushmeddelande</button>
                        <button class="btn-secondary" style="text-align:left;" onclick="App.setLedareSub('banner')">Uppdatera info-banner (Ungdomsvy)</button>
                        <button class="btn-secondary" style="text-align:left;" onclick="App.setLedareSub('aktivitet')">Skapa aktivitet</button>
                    </div>
                    ${manageSubPanel}
                </div>

                ${renderRutinBlock('oppning', 'Öppningsrutin', 'Öppna gården', 'openGard')}
                ${renderRutinBlock('stangning', 'Stängningsrutin', 'Alla punkter klara – Stäng gården', 'closeGard')}
            </div>
        `;
    }

    // ==================== VY: CHEF ====================
    function renderChef() {
        const s = Store.get();
        const gard = Store.getAktivGard();
        const flags = gard.featureFlags;
        const besok = statPeriod === 'vecka' ? s.statistik.besokVecka : s.statistik.besokManad;

        return `
            <div class="app-shell">
                ${topbar('Chef')}

                <p class="kicker">${esc(s.tenant.kommunNamn)}</p>
                <h1>Överblick & Styrning</h1>

                <div class="row" style="justify-content:flex-start; margin:20px 0;">
                    <button class="btn-small ${statPeriod === 'vecka' ? 'dark' : ''}" onclick="App.setStatPeriod('vecka')">Denna vecka</button>
                    <button class="btn-small ${statPeriod === 'manad' ? 'dark' : ''}" onclick="App.setStatPeriod('manad')">Denna månad</button>
                </div>

                <div class="grid-2">
                    <div class="stat-box">
                        <div class="stat-num">${besok}</div>
                        <div class="stat-label">Besökare</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-num">${s.tenant.gardar.length}</div>
                        <div class="stat-label">Aktiva gårdar</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h2>Funktioner på ${esc(gard.namn)}</h2>
                    </div>
                    <p class="muted" style="margin-bottom:12px;">Göm funktioner som inte används på denna gård. Slår igenom direkt i ungdomsvyn.</p>
                    <div class="surface">
                        ${[
                            ['kiosk', 'Digital kiosk & Swish'],
                            ['koer', 'Kösystem för spel'],
                            ['lag', 'Aktiviteter & Lag (PIN)'],
                            ['onskemal', 'Önskemålslåda']
                        ].map(([key, label]) => `
                            <label class="check-row">
                                <input type="checkbox" ${flags[key] ? 'checked' : ''} onchange="App.toggleFlag('${key}')">
                                <span>${label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h2>Personal</h2>
                        <button class="btn-small dark" onclick="App.addStaff()">+ Lägg till</button>
                    </div>
                    <ul class="list">
                        ${s.personal.map(p => `
                            <li class="list-item">
                                <div>
                                    <h3>${esc(p.namn)} ${!p.aktiv ? '<span class="pill pill-amber">Pausad</span>' : ''}</h3>
                                    <div class="muted">${esc(p.roll)} • ${esc(p.gard)}</div>
                                </div>
                                <div class="row" style="gap:6px;">
                                    <button class="btn-small" onclick="App.toggleStaff('${p.id}')">${p.aktiv ? 'Pausa' : 'Aktivera'}</button>
                                    <button class="btn-small danger" onclick="App.deleteStaff('${p.id}')">Ta bort</button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="section">
                    <div class="section-header"><h2>Spårbarhetslogg (Audit Log)</h2></div>
                    <ul class="list">
                        ${s.auditLog.slice(0, 6).map(l => `
                            <li class="list-item">
                                <span class="muted">${esc(l.text)}</span>
                                <strong style="font-size:12px;">${esc(l.tid)}</strong>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    // ==================== VY: FÖRÄLDER ====================
    function renderForalder() {
        const s = Store.get();
        const u = s.ungdomar.find(x => x.id === 'u36') || s.ungdomar[0];
        const godkant = u.status === 'godkant';

        return `
            <div class="app-shell">
                ${topbar('Förälder')}

                <p class="kicker">Digital signering</p>
                <h1>Gårdskort</h1>
                <p class="muted" style="margin-bottom:24px;">Godkänn ditt barns gårdskort med BankID och håll kontakt- och allergiuppgifter uppdaterade.</p>

                <div class="surface" style="margin-bottom:20px;">
                    <div class="row" style="margin-bottom:12px;">
                        <div>
                            <p class="kicker">Ungdom</p>
                            <h3>${esc(u.fornamn)} ${esc(u.efternamn)} (${u.fodelsear})</h3>
                        </div>
                        <span class="pill ${godkant ? 'pill-green' : 'pill-amber'}">${godkant ? 'Godkänt' : 'Ej signerat'}</span>
                    </div>
                    <p class="muted">Vårdnadshavare: ${esc(u.foralderNamn)} (${esc(u.foralderTelefon)})</p>
                </div>

                <div class="field">
                    <label class="field-label" for="parent-allergy">Allergier / viktig information</label>
                    <input type="text" id="parent-allergy" value="${esc(u.allergier)}" placeholder="T.ex. Jordnötter, laktos (lämna tomt om inget)">
                </div>

                <button class="btn-bankid" onclick="App.signBankId('${u.id}')">
                    ${godkant ? 'Uppdatera uppgifter med BankID' : 'Godkänn & signera med BankID'}
                </button>
            </div>
        `;
    }

    // ==================== VY: UTRYMNING ====================
    function renderUtrymning() {
        const s = Store.get();
        const gard = Store.getAktivGard();
        const incheckade = s.ungdomar.filter(u => u.incheckad);
        const sorted = [...incheckade].sort((a, b) => Number(evacSafeIds.has(a.id)) - Number(evacSafeIds.has(b.id)));

        return `
            <div class="evac-mode">
                <div class="app-shell">
                    <div style="text-align:center; padding: 16px 0 24px;">
                        <h1>UTRYMNING</h1>
                        <p style="font-weight:700; opacity:0.9;">Återsamlingsplats: ${esc(gard.atersamlingsplats)}</p>
                        <div style="font-size:48px; font-weight:900; margin-top:16px;">${evacSafeIds.size} / ${incheckade.length}</div>
                        <p style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">I säkerhet</p>
                    </div>

                    <div style="border-radius:14px; overflow:hidden;">
                        ${sorted.map(u => {
                            const safe = evacSafeIds.has(u.id);
                            return `
                                <div class="evac-item ${safe ? 'safe' : ''}" onclick="App.toggleEvacSafe('${u.id}')">
                                    <span>${esc(Store.displayName(u))}</span>
                                    <span>${safe ? 'KLAR' : ''}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <button class="btn-secondary" style="margin-top:32px; background:transparent; color:#fff; border-color:#fff;" onclick="App.go('ledare')">
                        Avsluta utrymningsläge
                    </button>
                </div>
            </div>
        `;
    }

    function render() {
        if (currentView === 'start') appEl.innerHTML = renderStart();
        else if (currentView === 'ungdom') appEl.innerHTML = renderUngdom();
        else if (currentView === 'ledare') appEl.innerHTML = renderLedare();
        else if (currentView === 'chef') appEl.innerHTML = renderChef();
        else if (currentView === 'foralder') appEl.innerHTML = renderForalder();
        else if (currentView === 'utrymning') appEl.innerHTML = renderUtrymning();
    }

    // ==================== ACTIONS ====================
    window.App = {
        go,
        selectGard(id) {
            Store.get().tenant.aktivGardId = id;
            Store.save();
            showToast('Bytte gård');
            render();
        },
        resetData() {
            Store.reset();
            cart = {};
            evacSafeIds.clear();
            showToast('All testdata återställd');
            render();
        },
        toggleCheckin(id) {
            const u = Store.get().ungdomar.find(x => x.id === id);
            if (!u) return;
            u.incheckad = !u.incheckad;
            u.incheckadTid = u.incheckad ? new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : null;
            Store.log(`${Store.displayName(u)} ${u.incheckad ? 'checkade in' : 'checkade ut'}`);
            showToast(u.incheckad ? `${u.fornamn} incheckad` : `${u.fornamn} utcheckad`);
            render();
        },
        toggleQueue(resId) {
            const r = Store.get().resurser.find(x => x.id === resId);
            const name = Store.displayName(Store.getAktivUngdom());
            const idx = r.ko.indexOf(name);
            if (idx >= 0) {
                r.ko.splice(idx, 1);
                showToast(`Lämnade kön till ${r.namn}`);
            } else {
                r.ko.push(name);
                showToast(`Plats ${r.ko.length} i kön till ${r.namn}`);
            }
            Store.save();
            render();
        },
        createTeam(actId) {
            const a = Store.get().aktiviteter.find(x => x.id === actId);
            const pin = String(Math.floor(1000 + Math.random() * 9000));
            const name = Store.displayName(Store.getAktivUngdom());
            a.lag.push({ id: 'l' + Date.now(), namn: `Lag ${a.lag.length + 1}`, pinkod: pin, medlemmar: [name] });
            Store.save();
            showToast(`Lag skapat! Pinkod: ${pin}`);
            render();
        },
        joinTeam(actId) {
            const a = Store.get().aktiviteter.find(x => x.id === actId);
            const pin = prompt('Ange lagets 4-siffriga pinkod (t.ex. 8472):');
            if (!pin) return;
            const team = a.lag.find(l => l.pinkod === pin.trim());
            if (!team) return showToast('Hittade inget lag med den pinkoden');
            const name = Store.displayName(Store.getAktivUngdom());
            if (!team.medlemmar.includes(name)) team.medlemmar.push(name);
            Store.save();
            showToast(`Gick med i ${team.namn}`);
            render();
        },
        cartDelta(id, delta) {
            cart[id] = Math.max(0, (cart[id] || 0) + delta);
            render();
        },
        paySwish(total) {
            const gard = Store.getAktivGard();
            cart = {};
            Store.log(`Kioskköp ${total} kr via Swish`);
            showToast(`Swish förifylld: ${total} kr till ${gard.swishNummer}`);
            render();
        },
        addWish() {
            const input = document.getElementById('wish-input');
            const text = (input?.value || '').trim();
            if (!text) return;
            Store.get().onskemal.unshift({ id: 'o' + Date.now(), text, av: Store.displayName(Store.getAktivUngdom()) });
            Store.save();
            showToast('Önskemål skickat till ledarna');
            render();
        },
        setLedareSub(sub) {
            ledareSubView = ledareSubView === sub ? null : sub;
            render();
        },
        toggleSuspend(id) {
            const u = Store.get().ungdomar.find(x => x.id === id);
            u.avstangd = !u.avstangd;
            if (u.avstangd) u.incheckad = false;
            Store.log(`${Store.displayName(u)} ${u.avstangd ? 'avstängd' : 'avstängning hävd'}`);
            showToast(u.avstangd ? `${u.fornamn} är avstängd` : `Avstängning hävd`);
            render();
        },
        addKioskItem() {
            const name = (document.getElementById('new-kiosk-name')?.value || '').trim();
            const price = parseInt(document.getElementById('new-kiosk-price')?.value, 10);
            if (!name || isNaN(price)) return showToast('Ange namn och pris');
            Store.get().kiosk.push({ id: 'k' + Date.now(), namn: name, pris: price, iLager: true });
            Store.save();
            showToast(`${name} tillagd i kiosken`);
            render();
        },
        editKioskPrice(id) {
            const item = Store.get().kiosk.find(k => k.id === id);
            const next = prompt(`Nytt pris för ${item.namn} (kr):`, item.pris);
            if (next === null) return;
            const parsed = parseInt(next, 10);
            if (!isNaN(parsed)) {
                item.pris = parsed;
                Store.save();
                showToast('Pris uppdaterat');
                render();
            }
        },
        deleteKioskItem(id) {
            const s = Store.get();
            s.kiosk = s.kiosk.filter(k => k.id !== id);
            Store.save();
            showToast('Vara borttagen');
            render();
        },
        addResource() {
            const name = (document.getElementById('new-resource-name')?.value || '').trim();
            if (!name) return showToast('Ange namn på resursen');
            Store.get().resurser.push({ id: 'r' + Date.now(), namn: name, ko: [] });
            Store.save();
            showToast(`${name} tillagd`);
            render();
        },
        renameResource(id) {
            const r = Store.get().resurser.find(x => x.id === id);
            const next = prompt('Nytt namn på resurs:', r.namn);
            if (next === null || !next.trim()) return;
            r.namn = next.trim();
            Store.save();
            showToast('Namn uppdaterat');
            render();
        },
        deleteResource(id) {
            const s = Store.get();
            s.resurser = s.resurser.filter(x => x.id !== id);
            Store.save();
            showToast('Resurs borttagen');
            render();
        },
        sendPush() {
            const input = document.getElementById('push-input');
            const text = (input?.value || '').trim();
            if (!text) return showToast('Skriv ett meddelande först');
            const tid = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
            const s = Store.get();
            if (!s.notiser) s.notiser = [];
            s.notiser.unshift({ id: 'n' + Date.now(), tid, text });
            Store.log(`Pushmeddelande skickat: "${text}"`);
            showToast('Pushmeddelande skickat till ungdomarna');
            render();
        },
        saveBanner() {
            const val = (document.getElementById('banner-input')?.value || '').trim();
            if (!val) return;
            Store.getAktivGard().banner = val;
            Store.save();
            ledareSubView = null;
            showToast('Banner uppdaterad i ungdomsvyn');
            render();
        },
        addActivity() {
            const name = (document.getElementById('act-name')?.value || '').trim();
            const time = (document.getElementById('act-time')?.value || '').trim() || 'Ikväll';
            if (!name) return showToast('Ange namn på aktiviteten');
            Store.get().aktiviteter.unshift({ id: 'a' + Date.now(), namn: name, tid: time, maxPerLag: 2, lag: [] });
            Store.save();
            ledareSubView = null;
            showToast('Aktivitet skapad');
            render();
        },
        toggleRutin(type, id) {
            const item = Store.get().rutiner[type].find(r => r.id === id);
            if (item) item.klar = !item.klar;
            Store.save();
        },
        toggleEditRutin(type) {
            editRutin[type] = !editRutin[type];
            render();
        },
        addRutinItem(type) {
            const input = document.getElementById(`new-rutin-${type}`);
            const text = (input?.value || '').trim();
            if (!text) return;
            Store.get().rutiner[type].push({ id: type + Date.now(), text, klar: false });
            Store.save();
            showToast('Punkt tillagd');
            render();
        },
        deleteRutinItem(type, id) {
            const rutiner = Store.get().rutiner;
            rutiner[type] = rutiner[type].filter(r => r.id !== id);
            Store.save();
            showToast('Punkt borttagen');
            render();
        },
        openGard() {
            Store.getAktivGard().oppen = true;
            Store.log(`${Store.getAktivGard().namn} öppnad`);
            showToast('Gården är nu öppen');
            render();
        },
        closeGard() {
            const s = Store.get();
            Store.getAktivGard().oppen = false;
            s.ungdomar.forEach(u => { u.incheckad = false; u.incheckadTid = null; });
            s.resurser.forEach(r => { r.ko = []; });
            Store.log(`${Store.getAktivGard().namn} stängd – alla utcheckade`);
            showToast('Gården stängd. Alla utcheckade och köer rensade.');
            render();
        },
        startEvac() {
            evacSafeIds.clear();
            Store.log('Nödutrymning aktiverad');
            go('utrymning');
        },
        toggleEvacSafe(id) {
            if (evacSafeIds.has(id)) evacSafeIds.delete(id);
            else evacSafeIds.add(id);
            render();
        },
        setStatPeriod(p) {
            statPeriod = p;
            render();
        },
        toggleFlag(key) {
            const flags = Store.getAktivGard().featureFlags;
            flags[key] = !flags[key];
            Store.log(`Feature "${key}" ${flags[key] ? 'aktiverad' : 'gömd'}`);
            showToast('Inställning sparad');
            render();
        },
        addStaff() {
            const namn = prompt('Namn på ny personal:');
            if (!namn) return;
            Store.get().personal.push({
                id: 'p' + Date.now(),
                namn: namn.trim(),
                roll: 'Fritidsledare',
                gard: Store.getAktivGard().namn,
                aktiv: true
            });
            Store.log(`Personal tillagd: ${namn.trim()}`);
            showToast(`${namn.trim()} tillagd`);
            render();
        },
        toggleStaff(id) {
            const p = Store.get().personal.find(x => x.id === id);
            p.aktiv = !p.aktiv;
            Store.log(`${p.namn} ${p.aktiv ? 'aktiverad' : 'pausad'}`);
            render();
        },
        deleteStaff(id) {
            const s = Store.get();
            s.personal = s.personal.filter(x => x.id !== id);
            Store.save();
            showToast('Personal borttagen');
            render();
        },
        signBankId(id) {
            const u = Store.get().ungdomar.find(x => x.id === id);
            const allergy = (document.getElementById('parent-allergy')?.value || '').trim();
            u.allergier = allergy;
            u.status = 'godkant';
            Store.log(`Gårdskort signerat med BankID för ${u.fornamn}`);
            showToast('Signerat med BankID! Gårdskortet är nu aktivt.');
            render();
        }
    };

    render();
})();
