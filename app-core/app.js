(function () {
    const appEl = document.getElementById('app');
    const toastEl = document.getElementById('toast');

    let currentView = 'start';
    let ledareSubView = null; // 'qr' | 'manuell' | 'kiosk' | 'resurser' | 'onskemal' | 'push' | 'banner' | 'aktivitet'
    let suspendFormOpen = false;
    let suspendPreselectId = '';
    let showAllCheckedIn = false;
    let checkinSearch = '';
    let expandedContactId = null;
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

    function defaultSuspendDate() {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 10);
    }

    function go(view) {
        currentView = view;
        ledareSubView = null;
        suspendFormOpen = false;
        expandedContactId = null;
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

    function renderCheckedInItemsHtml() {
        const s = Store.get();
        const incheckade = s.ungdomar.filter(u => u.incheckad);
        const q = checkinSearch.trim().toLowerCase();

        if (incheckade.length === 0) {
            return `<p class="muted">Inga ungdomar incheckade just nu.</p>`;
        }

        if (!showAllCheckedIn && !q) {
            return `<p class="muted">Listan är dold. Sök på namn ovan eller slå på "Visa hela listan".</p>`;
        }

        const filtered = q
            ? incheckade.filter(u => Store.displayName(u).toLowerCase().includes(q))
            : incheckade;

        if (filtered.length === 0) {
            return `<p class="muted">Ingen incheckad ungdom matchade "${esc(checkinSearch)}".</p>`;
        }

        return `
            <ul class="list">
                ${filtered.map(u => `
                    <li class="list-item" style="flex-direction:column; align-items:stretch;">
                        <div class="row">
                            <div>
                                <h3>${esc(Store.displayName(u))}${u.geofenceStatus === 'ute_tillfalligt' ? '<span class="pill pill-amber">Ute ur zonen</span>' : ''}</h3>
                                <div class="muted">Incheckad ${esc(u.incheckadTid)} • ${esc(u.kon)}${u.allergier ? ` • Allergi: ${esc(u.allergier)}` : ''}</div>
                            </div>
                            <div class="row" style="gap:6px;">
                                <button class="btn-small" onclick="App.toggleContact('${u.id}')">Kontakt</button>
                                <button class="btn-small danger" onclick="App.openSuspendForm('${u.id}')">Stäng av</button>
                            </div>
                        </div>
                        ${expandedContactId === u.id ? `
                            <div class="surface" style="margin-top:10px; padding:12px 14px;">
                                <p class="kicker">Vårdnadshavare</p>
                                <strong>${esc(u.foralderNamn)}</strong>
                                <div class="muted">${esc(u.foralderTelefon)}</div>
                            </div>
                        ` : ''}
                    </li>
                `).join('')}
            </ul>
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
            ? `<span class="pill pill-red">Avstängd t.o.m. ${esc(u.avstangdTill || '')}</span>`
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
                                    <h3>${esc(r.namn)}</h3>${status}
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
                            <p class="muted" style="margin-bottom:14px;">${esc(a.tid)} • Max ${a.maxPerLag} per lag</p>${a.lag.map(l => `
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
            if (qty > 0 && item.iLager) {
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
        const uteUrZon = incheckade.filter(u => u.geofenceStatus === 'ute_tillfalligt');
        const springerUtIn = incheckade.filter(u => (u.utInAntal || 0) >= 2);
        const aktivaMonster = (s.monsterAlerts || []).filter(m => !m.hanterad);

        const scope = s.tenant.avstangningScope || 'alla';
        const specifika = s.tenant.avstangningSpecifikaGardar || [];
        const avstangda = s.ungdomar.filter(u => {
            if (!u.avstangd) return false;
            if (scope === 'alla') return true;
            if (scope === 'en') return u.avstangdGardId === gard.id;
            if (scope === 'specifika') return specifika.includes(gard.id) || u.avstangdGardId === gard.id;
            return true;
        });

        const scopeText = scope === 'alla'
            ? 'Visas för alla gårdar i kommunen'
            : scope === 'en'
                ? `Visas endast för ${gard.namn}`
                : 'Visas för utvalda gårdar';

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

        const suspendFormHtml = suspendFormOpen ? `
            <div id="suspend-form-box" class="surface" style="margin-bottom:16px; border:2px solid #d32f2f;">
                <div class="row" style="margin-bottom:12px;">
                    <h3>Ny avstängning</h3>
                    <button class="btn-link" onclick="App.closeSuspendForm()">Avbryt</button>
                </div>
                <div class="field">
                    <label class="field-label" for="suspend-youth">Välj ungdom</label>
                    <select id="suspend-youth">
                        ${s.ungdomar.filter(u => !u.avstangd).map(u => `
                            <option value="${u.id}" ${u.id === suspendPreselectId ? 'selected' : ''}>${esc(Store.displayName(u))}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="field">
                    <label class="field-label" for="suspend-until">Avstängningen upphör (datum)</label>
                    <input type="date" id="suspend-until" value="${defaultSuspendDate()}" style="width:100%; min-height:52px; padding:12px 14px; font-size:16px; border:2px solid #e5e5e5; border-radius:12px; background:#fafafa;">
                </div>
                <div class="field">
                    <label class="field-label" for="suspend-reason">Orsak</label>
                    <input type="text" id="suspend-reason" placeholder="Ange orsak till avstängningen...">
                </div>
                <button class="btn-primary" style="background:#d32f2f; border-color:#d32f2f;" onclick="App.confirmSuspend()">Bekräfta avstängning</button>
            </div>
        ` : '';

        const managePanels = {
            kiosk: `
                <div class="surface">
                    <div class="row" style="margin-bottom:14px;">
                        <h3>Hantera kiosken</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    <ul class="list" style="margin-bottom:16px;">
                        ${s.kiosk.map(k => `
                            <li class="list-item">
                                <div>
                                    <strong>${esc(k.namn)}</strong>${!k.iLager ? '<span class="pill pill-amber">Slut</span>' : ''}
                                    <div class="muted">${k.pris} kr</div>
                                </div>
                                <div class="row" style="gap:6px;">
                                    <button class="btn-small" onclick="App.toggleKioskStock('${k.id}')">${k.iLager ? 'Slut' : 'I lager'}</button>
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
                </div>
            `,
            resurser: `
                <div class="surface">
                    <div class="row" style="margin-bottom:14px;">
                        <h3>Bokningsbara resurser & köer</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    <ul class="list" style="margin-bottom:16px;">
                        ${s.resurser.map(r => `
                            <li class="list-item" style="flex-direction:column; align-items:stretch;">
                                <div class="row">
                                    <div>
                                        <strong>${esc(r.namn)}</strong>
                                        <span class="pill ${r.ko.length > 0 ? 'pill-red' : 'pill-green'}" style="margin-left:6px;">${r.ko.length} i kö</span>
                                    </div>
                                    <div class="row" style="gap:6px;">
                                        <button class="btn-small" onclick="App.renameResource('${r.id}')">Byt namn</button>
                                        <button class="btn-small danger" onclick="App.deleteResource('${r.id}')">Ta bort</button>
                                    </div>
                                </div>
                                ${r.ko.length > 0 ? `
                                    <div style="margin-top:10px;">
                                        <div class="muted" style="margin-bottom:8px;">Kö: ${r.ko.map((n, idx) => `${idx + 1}.${esc(n)}`).join(', ')}</div>
                                        <div class="row" style="justify-content:flex-start; gap:8px;">
                                            <button class="btn-small dark" onclick="App.nextInQueue('${r.id}')">Nästa på tur</button>
                                            <button class="btn-small" onclick="App.clearQueue('${r.id}')">Rensa kö</button>
                                        </div>
                                    </div>
                                ` : ''}
                            </li>
                        `).join('')}
                    </ul>
                    <div class="row">
                        <input type="text" id="new-resource-name" placeholder="Ny resurs (t.ex. Studio)">
                        <button class="btn-small dark" style="min-height:52px;" onclick="App.addResource()">Lägg till</button>
                    </div>
                </div>
            `,
            onskemal: `
                <div class="surface">
                    <div class="row" style="margin-bottom:14px;">
                        <h3>Önskemål från ungdomar</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    ${s.onskemal.length === 0 ? `<p class="muted">Inga nya önskemål just nu.</p>` : `
                        <ul class="list">
                            ${s.onskemal.map(o => `
                                <li class="list-item" style="padding:10px 0;">
                                    <div>
                                        <strong>${esc(o.text)}</strong>
                                        <div class="muted" style="font-size:12px;">${esc(o.av)}</div>
                                    </div>
                                    <button class="btn-small" onclick="App.deleteWish('${o.id}')">Klar</button>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>
            `,
            push: `
                <div class="surface">
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
            `,
            banner: `
                <div class="surface">
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
            `,
            aktivitet: `
                <div class="surface">
                    <div class="row" style="margin-bottom:12px;">
                        <h3>Aktiviteter & anmälda lag</h3>
                        <button class="btn-link" onclick="App.setLedareSub(null)">Stäng</button>
                    </div>
                    ${s.aktiviteter.length === 0 ? `<p class="muted" style="margin-bottom:14px;">Inga aktiva aktiviteter.</p>` : `
                        <ul class="list" style="margin-bottom:16px;">
                            ${s.aktiviteter.map(a => `
                                <li class="list-item" style="flex-direction:column; align-items:stretch;">
                                    <div class="row">
                                        <div>
                                            <strong>${esc(a.namn)}</strong>
                                            <div class="muted" style="font-size:12px;">${esc(a.tid)} • ${a.lag.length} lag</div>
                                        </div>
                                        <button class="btn-small danger" onclick="App.deleteActivity('${a.id}')">Ta bort</button>
                                    </div>
                                    ${a.lag.length > 0 ? `
                                        <div style="margin-top:8px;">
                                            ${a.lag.map(l => `<div class="muted" style="font-size:13px;">• <strong>${esc(l.namn)}</strong> (PIN ${esc(l.pinkod)}): ${l.medlemmar.map(esc).join(', ')}</div>`).join('')}
                                        </div>
                                    ` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    `}
                    <p class="kicker" style="margin-bottom:8px;">Skapa ny aktivitet</p>
                    <div class="field">
                        <label class="field-label" for="act-name">Namn</label>
                        <input type="text" id="act-name" placeholder="T.ex. Pingisturnering">
                    </div>
                    <div class="field">
                        <label class="field-label" for="act-time">Tid</label>
                        <input type="text" id="act-time" placeholder="T.ex. Fredag 19:30">
                    </div>
                    <button class="btn-primary" style="min-height:46px;" onclick="App.addActivity()">Skapa aktivitet</button>
                </div>
            `
        };

        const manageButtons = [
            ['kiosk', 'Hantera kiosken (utbud, lager & priser)'],
            ['resurser', 'Hantera bokningsbara resurser & köer'],
            ['onskemal', `Hantera önskemål från ungdomar (${s.onskemal.length})`],
            ['push', 'Skicka pushmeddelande'],
            ['banner', 'Uppdatera info-banner (Ungdomsvy)'],
            ['aktivitet', 'Aktiviteter & lag']
        ];

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
                    <div class="field" style="margin-bottom:10px;">
                        <input type="text" id="checkin-search" value="${esc(checkinSearch)}" placeholder="Sök incheckad ungdom..." oninput="App.setCheckinSearch(this.value)">
                    </div>
                    <label class="check-row" style="border-bottom:none; padding:6px 0 12px; font-size:14px;">
                        <input type="checkbox" ${showAllCheckedIn ? 'checked' : ''} onchange="App.toggleShowAllCheckedIn()">
                        <span>Visa hela listan (${incheckade.length} incheckade)</span>
                    </label>
                    <div id="checkin-list-container">
                        ${renderCheckedInItemsHtml()}
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h2>Geofencing (Ut & in)</h2>
                        <button class="btn-small" onclick="App.simulateGeofence()">Simulera ut/in</button>
                    </div>
                    <div class="surface">
                        <p class="kicker">Just nu utanför 50 m-zonen (${uteUrZon.length})</p>
                        ${uteUrZon.length === 0 ? `<p class="muted" style="margin-bottom:14px;">Alla incheckade befinner sig inom zonen.</p>` : `
                            <ul class="list" style="margin-bottom:14px;">
                                ${uteUrZon.map(u => `
                                    <li class="list-item" style="padding:8px 0;">
                                        <strong>${esc(Store.displayName(u))}</strong>
                                        <span class="pill pill-amber">Ute ur zonen</span>
                                    </li>
                                `).join('')}
                            </ul>
                        `}
                        <p class="kicker">Springer ut och in ofta ikväll</p>
                        ${springerUtIn.length === 0 ? `<p class="muted" style="margin-bottom:14px;">Ingen avvikande rörelse.</p>` : `
                            <p class="muted" style="margin-bottom:14px;">${springerUtIn.map(u => `${esc(Store.displayName(u))} (${u.utInAntal} ggr)`).join(' • ')}</p>
                        `}
                        <p class="kicker">Senaste passager</p>
                        <ul class="list">
                            ${(s.geofenceLog || []).slice(0, 5).map(g => `
                                <li class="list-item" style="padding:8px 0;">
                                    <span class="muted"><strong>${esc(g.namn)}</strong> –${esc(g.handelse)}</span>
                                    <strong style="font-size:12px;">${esc(g.tid)}</strong>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h2>Ändrade mönster</h2>
                        <span class="pill ${aktivaMonster.length > 0 ? 'pill-amber' : 'pill-dark'}">${aktivaMonster.length}</span>
                    </div>
                    ${aktivaMonster.length === 0 ? `<p class="muted">Inga flaggade mönsterändringar just nu.</p>` : `
                        <ul class="list">
                            ${aktivaMonster.map(m => `
                                <li class="list-item">
                                    <div>
                                        <h3>${esc(m.namn)} <span class="pill pill-amber">${esc(m.typ)}</span></h3>
                                        <div class="muted">${esc(m.beskrivning)}</div>
                                    </div>
                                    <button class="btn-small" onclick="App.dismissPattern('${m.id}')">Noterat</button>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>

                <div class="section">
                    <div class="section-header">
                        <h2>Avstängningar</h2>
                        <button class="btn-small danger" onclick="App.openSuspendForm('')">+ Stäng av ungdom</button>
                    </div>
                    <p class="muted" style="margin-bottom:12px;">${esc(scopeText)}</p>
                    ${suspendFormHtml}
                    ${avstangda.length === 0 ? `<p class="muted">Inga aktiva avstängningar.</p>` : `
                        <ul class="list">
                            ${avstangda.map(u => `
                                <li class="list-item">
                                    <div>
                                        <h3>${esc(Store.displayName(u))}</h3>
                                        <div class="muted">Upphör: <strong>${esc(u.avstangdTill || 'Ej angivet')}</strong></div>
                                        <div class="muted">Orsak: ${esc(u.avstangdOrsak || 'Ej angiven')}</div>
                                    </div>
                                    <button class="btn-small" onclick="App.liftSuspend('${u.id}')">Häv</button>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>

                <div class="section">
                    <div class="section-header"><h2>Hantera gården</h2></div>
                    <div class="stack">
                        ${manageButtons.map(([key, label]) => `
                            <button class="btn-secondary" style="text-align:left;" onclick="App.setLedareSub('${key}')">${label}</button>${ledareSubView === key ? managePanels[key] : ''}
                        `).join('')}
                    </div>
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
        const scope = s.tenant.avstangningScope || 'alla';
        const specifika = s.tenant.avstangningSpecifikaGardar || [];

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
                        <h2>Synlighet för avstängningar</h2>
                    </div>
                    <p class="muted" style="margin-bottom:12px;">Välj var en avstängning ska synas för fritidsledare.</p>
                    <div class="surface">
                        <div class="field" style="margin-bottom:${scope === 'specifika' ? '14px' : '0'};">
                            <select onchange="App.setSuspendScope(this.value)">
                                <option value="alla" ${scope === 'alla' ? 'selected' : ''}>Alla gårdar i kommunen</option>
                                <option value="en" ${scope === 'en' ? 'selected' : ''}>Endast gården där avstängningen gjordes</option>
                                <option value="specifika" ${scope === 'specifika' ? 'selected' : ''}>Specifika gårdar</option>
                            </select>
                        </div>
                        ${scope === 'specifika' ? s.tenant.gardar.map(g => `
                            <label class="check-row">
                                <input type="checkbox" ${specifika.includes(g.id) ? 'checked' : ''} onchange="App.toggleSuspendGard('${g.id}')">
                                <span>${esc(g.namn)}</span>
                            </label>
                        `).join('') : ''}
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
                                <input type="checkbox" ${flags[key] ? 'checked' : ''} onchange="App.
