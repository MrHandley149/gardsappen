(function () {
    const appEl = document.getElementById('app');
    const toastEl = document.getElementById('toast');

    let currentView = 'start';
    let ledareSubView = null; // 'qr' | 'manuell' | 'kiosk' | 'resurser' | 'onskemal' | 'push' | 'banner' | 'aktivitet'
    let manualSearch = '';
    let suspendFormOpen = false;
    let suspendPreselectId = '';
    let showAllCheckedIn = false;
    let checkinSearch = '';
    let expandedContactId = null;
    let editingYouthId = null;
    let parentSignerIndex = 0;
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
        editingYouthId = null;
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

    function renderManualSearchResultsHtml() {
        const s = Store.get();
        const ejIncheckade = s.ungdomar.filter(u => !u.incheckad && !u.avstangd);
        const q = manualSearch.trim().toLowerCase();
        const matches = q
            ? ejIncheckade.filter(u => Store.displayName(u).toLowerCase().includes(q))
            : ejIncheckade;

        if (matches.length === 0) {
            return `<p class="muted" style="margin-bottom:14px;">${q ? `Ingen ej incheckad ungdom matchade "${esc(manualSearch)}".` : 'Alla befintliga ungdomar är redan incheckade.'}</p>`;
        }

        return `
            <ul class="list" style="margin-bottom:16px;">
                ${matches.map(u => `
                    <li class="list-item">
                        <div>
                            <strong>${esc(Store.displayName(u))}</strong>
                            <div class="muted" style="font-size:12px;">${esc(u.fodelsedatum || '')} • ${u.status === 'godkant' ? 'Godkänt kort' : 'Inväntar föräldrars godkännande'}</div>
                        </div>
                        <button class="btn-small dark" onclick="App.toggleCheckin('${u.id}')">Checka in</button>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    function renderYouthCardPanel(u) {
        const vh = u.vardnadshavare || [];
        const vh1 = vh[0] || { namn: '', telefon: '', signerat: false };
        const vh2 = vh[1] || { namn: '', telefon: '', signerat: false };

        if (editingYouthId === u.id) {
            return `
                <div class="surface" style="margin-top:10px; border:2px solid #111;">
                    <div class="row" style="margin-bottom:12px;">
                        <p class="kicker" style="margin-bottom:0;">Redigera gårdskort</p>
                        <button class="btn-link" onclick="App.cancelEditYouth()">Avbryt</button>
                    </div>
                    <div class="grid-2">
                        <div class="field"><label class="field-label">Förnamn</label><input type="text" id="ey-fornamn" value="${esc(u.fornamn)}"></div>
                        <div class="field"><label class="field-label">Efternamn</label><input type="text" id="ey-efternamn" value="${esc(u.efternamn)}"></div>
                    </div>
                    <div class="grid-2">
                        <div class="field"><label class="field-label">År-Mån-Dag</label><input type="date" id="ey-fodelsedatum" value="${esc(u.fodelsedatum || '')}" style="width:100%; min-height:52px; padding:12px 14px; font-size:16px; border:2px solid #e5e5e5; border-radius:12px; background:#fafafa;"></div>
                        <div class="field">
                            <label class="field-label">Kön</label>
                            <select id="ey-kon">
                                <option value="Kille" ${u.kon === 'Kille' ? 'selected' : ''}>Kille</option>
                                <option value="Tjej" ${u.kon === 'Tjej' ? 'selected' : ''}>Tjej</option>
                                <option value="Vill ej uppge" ${u.kon === 'Vill ej uppge' ? 'selected' : ''}>Vill ej uppge</option>
                            </select>
                        </div>
                    </div>
                    <div class="field"><label class="field-label">Adress</label><input type="text" id="ey-adress" value="${esc(u.adress || '')}"></div>
                    <div class="field"><label class="field-label">Mobilnr (ungdom)</label><input type="text" id="ey-mobil" value="${esc(u.mobil || '')}"></div>
                    <div class="field"><label class="field-label">Allergier</label><input type="text" id="ey-allergier" value="${esc(u.allergier || '')}"></div>
                    <div class="field"><label class="field-label">Viktigt att veta</label><input type="text" id="ey-viktigt" value="${esc(u.viktigtAttVeta || '')}"></div>
                    <div class="grid-2">
                        <div class="field"><label class="field-label">Vårdnadshavare 1 – Namn</label><input type="text" id="ey-vh1-namn" value="${esc(vh1.namn)}"></div>
                        <div class="field"><label class="field-label">Vårdnadshavare 1 – Mobil</label><input type="text" id="ey-vh1-tel" value="${esc(vh1.telefon)}"></div>
                    </div>
                    <div class="grid-2">
                        <div class="field"><label class="field-label">Vårdnadshavare 2 – Namn (valfri)</label><input type="text" id="ey-vh2-namn" value="${esc(vh2.namn)}"></div>
                        <div class="field"><label class="field-label">Vårdnadshavare 2 – Mobil</label><input type="text" id="ey-vh2-tel" value="${esc(vh2.telefon)}"></div>
                    </div>
                    <label class="check-row" style="border-bottom:none; padding:4px 0 14px; font-size:14px;">
                        <input type="checkbox" id="ey-skyddad" ${u.skyddadIdentitet ? 'checked' : ''}>
                        <span>Skyddat ID</span>
                    </label>
                    <button class="btn-primary" style="min-height:46px;" onclick="App.saveEditYouth('${u.id}')">Spara ändringar</button>
                </div>
            `;
        }

        return `
            <div class="surface" style="margin-top:10px; padding:14px;">
                <div class="row" style="margin-bottom:10px;">
                    <p class="kicker" style="margin-bottom:0;">Gårdskort</p>
                    <button class="btn-link" onclick="App.startEditYouth('${u.id}')">Redigera gårdskort</button>
                </div>
                <div class="muted" style="font-size:13px; line-height:1.6;">
                    <div><strong>Namn:</strong> ${esc(u.fornamn)} ${esc(u.efternamn)}</div>
                    <div><strong>Födelsedatum:</strong> ${esc(u.fodelsedatum || 'Ej angivet')}</div>
                    <div><strong>Adress:</strong> ${esc(u.adress || 'Ej angiven')}</div>
                    <div><strong>Mobil (ungdom):</strong> ${esc(u.mobil || 'Ej angivet')}</div>
                    <div><strong>Allergier:</strong> ${esc(u.allergier || 'Inga angivna')}</div>
                    <div><strong>Viktigt att veta:</strong> ${esc(u.viktigtAttVeta || 'Inget angivet')}</div>
                </div>
                <div style="margin-top:12px; padding-top:10px; border-top:1px solid #e5e5e5;">
                    <p class="kicker">Vårdnadshavare</p>
                    ${vh.length === 0 ? `<div class="muted" style="font-size:13px;">Ingen vårdnadshavare angiven</div>` : vh.map((v, idx) => `
                        <div class="row" style="padding:4px 0; font-size:13px;">
                            <div><strong>${idx + 1}. ${esc(v.namn)}</strong> • ${esc(v.telefon)}</div>
                            <span class="pill ${v.signerat ? 'pill-green' : 'pill-amber'}">${v.signerat ? 'BankID OK' : 'Ej signerat'}</span>
                        </div>
                    `).join('')}
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
                                <h3>${esc(Store.displayName(u))} ${u.geofenceStatus === 'ute_tillfalligt' ? '<span class="pill pill-amber">Ute ur zonen</span>' : ''}</h3>
                                <div class="muted">${esc(u.fodelsedatum || '')} • Incheckad ${esc(u.incheckadTid)} • ${esc(u.kon)}${u.allergier ? ` • Allergi: ${esc(u.allergier)}` : ''}</div>
                                ${u.viktigtAttVeta ? `<div class="muted" style="font-size:12px;">Viktigt: ${esc(u.viktigtAttVeta)}</div>` : ''}
                            </div>
                            <div class="row" style="gap:6px;">
                                <button class="btn-small" onclick="App.toggleContact('${u.id}')">Gårdskort</button>
                                <button class="btn-small danger" onclick="App.openSuspendForm('${u.id}')">Stäng av</button>
                            </div>
                        </div>
                        ${expandedContactId === u.id ? renderYouthCardPanel(u) : ''}
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
                    <p class="muted" style="margin-bottom:14px;">Befintliga besökare checkas in direkt. Nya besökare får upp gårdskortet.</p>
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
                    <p class="kicker">Glömt / urladdad mobil (befintlig ungdom)</p>
                    <div class="field" style="margin-bottom:10px;">
                        <input type="text" id="manual-search" value="${esc(manualSearch)}" placeholder="Sök ej incheckad ungdom..." oninput="App.setManualSearch(this.value)">
                    </div>
                    <div id="manual-search-results">
                        ${renderManualSearchResultsHtml()}
                    </div>

                    <div style="margin-top:18px; padding-top:16px; border-top:1px solid #e0e0e0;">
                        <p class="kicker" style="margin-bottom:10px;">Första besöket (ej mobil) / Skyddat ID</p>
                        <div class="grid-2">
                            <div class="field"><label class="field-label">Förnamn *</label><input type="text" id="m-fornamn" placeholder="Förnamn"></div>
                            <div class="field"><label class="field-label">Efternamn</label><input type="text" id="m-efternamn" placeholder="Efternamn"></div>
                        </div>
                        <div class="grid-2">
                            <div class="field"><label class="field-label">År-Mån-Dag</label><input type="date" id="m-fodelsedatum" style="width:100%; min-height:52px; padding:12px 14px; font-size:16px; border:2px solid #e5e5e5; border-radius:12px; background:#fafafa;"></div>
                            <div class="field">
                                <label class="field-label">Kön</label>
                                <select id="m-kon">
                                    <option value="Kille">Kille</option>
                                    <option value="Tjej">Tjej</option>
                                    <option value="Vill ej uppge">Vill ej uppge</option>
                                </select>
                            </div>
                        </div>
                        <div class="field"><label class="field-label">Adress</label><input type="text" id="m-adress" placeholder="Gatuadress, ort"></div>
                        <div class="field"><label class="field-label">Mobilnr (ungdom)</label><input type="text" id="m-mobil" placeholder="070-..."></div>
                        <div class="field"><label class="field-label">Allergier</label><input type="text" id="m-allergier" placeholder="T.ex. Jordnötter (valfritt)"></div>
                        <div class="field"><label class="field-label">Viktigt att veta</label><input type="text" id="m-viktigt" placeholder="Valfritt"></div>
                        <div class="grid-2">
                            <div class="field"><label class="field-label">Vårdnadshavare 1 – Namn</label><input type="text" id="m-vh1-namn" placeholder="Namn"></div>
                            <div class="field"><label class="field-label">Vårdnadshavare 1 – Mobil</label><input type="text" id="m-vh1-tel" placeholder="070-..."></div>
                        </div>
                        <div class="grid-2">
                            <div class="field"><label class="field-label">Vårdnadshavare 2 – Namn (valfri)</label><input type="text" id="m-vh2-namn" placeholder="Namn"></div>
                            <div class="field"><label class="field-label">Vårdnadshavare 2 – Mobil</label><input type="text" id="m-vh2-tel" placeholder="070-..."></div>
                        </div>
                        <label class="check-row" style="border-bottom:none; padding:4px 0 14px; font-size:14px;">
                            <input type="checkbox" id="m-skyddad">
                            <span>Skyddat ID (döljer efternamn och kontaktuppgifter)</span>
                        </label>
                        <button class="btn-primary" style="min-height:46px;" onclick="App.addManualGuest()">Skapa gårdskort & checka in</button>
                    </div>
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
                                    <strong>${esc(k.namn)}</strong> ${!k.iLager ? '<span class="pill pill-amber">Slut</span>' : ''}
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
                                        <div class="muted" style="margin-bottom:8px;">Kö: ${r.ko.map((n, idx) => `${idx + 1}. ${esc(n)}`).join(', ')}</div>
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
                                    <span class="muted"><strong>${esc(g.namn)}</strong> – ${esc(g.handelse)}</span>
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
                            <button class="btn-secondary" style="text-align:left;" onclick="App.setLedareSub('${key}')">${label}</button>
                            ${ledareSubView === key ? managePanels[key] : ''}
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
        const vh = u.vardnadshavare || [];
        if (parentSignerIndex >= vh.length) parentSignerIndex = 0;
        const aktivVh = vh[parentSignerIndex] || { namn: 'Vårdnadshavare', telefon: '', signerat: false };

        return `
            <div class="app-shell">
                ${topbar('Förälder')}

                <p class="kicker">Digital signering (BankID)</p>
                <h1>Gårdskort</h1>
                <p class="muted" style="margin-bottom:24px;">Granska och godkänn ditt barns gårdskort. Det räcker att en vårdnadshavare signerar för att kortet ska bli aktivt.</p>

                ${vh.length > 1 ? `
                    <div class="field">
                        <label class="field-label" for="parent-signer">Inloggad som vårdnadshavare (test)</label>
                        <select id="parent-signer" onchange="App.setParentSigner(this.value)">
                            ${vh.map((v, i) => `<option value="${i}" ${i === parentSignerIndex ? 'selected' : ''}>${esc(v.namn)} (${v.signerat ? 'Signerat' : 'Ej signerat'})</option>`).join('')}
                        </select>
                    </div>
                ` : ''}

                <div class="surface" style="margin-bottom:20px;">
                    <div class="row" style="margin-bottom:12px;">
                        <div>
                            <p class="kicker">Ungdom</p>
                            <h3>${esc(u.fornamn)} ${esc(u.efternamn)}</h3>
                            <div class="muted" style="font-size:13px;">${esc(u.fodelsedatum || '')}</div>
                        </div>
                        <span class="pill ${godkant ? 'pill-green' : 'pill-amber'}">${godkant ? 'Godkänt' : 'Ej signerat'}</span>
                    </div>
                    <div class="muted" style="font-size:13px; line-height:1.6;">
                        <div><strong>Adress:</strong> ${esc(u.adress || 'Ej angiven')}</div>
                        <div><strong>Mobil (ungdom):</strong> ${esc(u.mobil || 'Ej angivet')}</div>
                        <div><strong>Din kontakt:</strong> ${esc(aktivVh.namn)} (${esc(aktivVh.telefon)})</div>
                    </div>
                </div>

                <div class="field">
                    <label class="field-label" for="parent-allergy">Allergier</label>
                    <input type="text" id="parent-allergy" value="${esc(u.allergier || '')}" placeholder="T.ex. Jordnötter, laktos (lämna tomt om inget)">
                </div>

                <div class="field">
                    <label class="field-label" for="parent-viktigt">Viktigt att veta</label>
                    <input type="text" id="parent-viktigt" value="${esc(u.viktigtAttVeta || '')}" placeholder="T.ex. medicin, anpassningar, hemgångstid">
                </div>

                <button class="btn-bankid" onclick="App.signBankId('${u.id}')">
                    ${aktivVh.signerat ? 'Uppdatera uppgifter med BankID' : 'Godkänn & signera med BankID'}
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
        setManualSearch(val) {
            manualSearch = val;
            const el = document.getElementById('manual-search-results');
            if (el) el.innerHTML = renderManualSearchResultsHtml();
        },
        addManualGuest() {
            const fornamn = (document.getElementById('m-fornamn')?.value || '').trim();
            if (!fornamn) return showToast('Ange minst förnamn');
            const skyddad = !!document.getElementById('m-skyddad')?.checked;
            const efternamn = skyddad ? '(Skyddad)' : ((document.getElementById('m-efternamn')?.value || '').trim());
            const fodelsedatum = document.getElementById('m-fodelsedatum')?.value || '';
            const kon = document.getElementById('m-kon')?.value || 'Vill ej uppge';
            const adress = skyddad ? 'Skyddad uppgift' : ((document.getElementById('m-adress')?.value || '').trim());
            const mobil = skyddad ? 'Skyddad uppgift' : ((document.getElementById('m-mobil')?.value || '').trim());
            const allergier = (document.getElementById('m-allergier')?.value || '').trim();
            const viktigtAttVeta = (document.getElementById('m-viktigt')?.value || '').trim();

            const vardnadshavare = [];
            if (skyddad) {
                vardnadshavare.push({ namn: 'Kontakt via samordnare', telefon: 'Skyddat nummer', signerat: false });
            } else {
                const vh1Namn = (document.getElementById('m-vh1-namn')?.value || '').trim();
                const vh1Tel = (document.getElementById('m-vh1-tel')?.value || '').trim();
                if (vh1Namn || vh1Tel) vardnadshavare.push({ namn: vh1Namn || 'Vårdnadshavare 1', telefon: vh1Tel, signerat: false });
                const vh2Namn = (document.getElementById('m-vh2-namn')?.value || '').trim();
                const vh2Tel = (document.getElementById('m-vh2-tel')?.value || '').trim();
                if (vh2Namn || vh2Tel) vardnadshavare.push({ namn: vh2Namn || 'Vårdnadshavare 2', telefon: vh2Tel, signerat: false });
            }

            const tid = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
            const ny = {
                id: 'u' + Date.now(),
                fornamn,
                efternamn,
                fodelsedatum,
                kon,
                adress,
                mobil,
                status: 'vantar_foralder',
                allergier,
                viktigtAttVeta,
                skyddadIdentitet: skyddad,
                incheckad: true,
                incheckadTid: tid,
                geofenceStatus: 'inne',
                utInAntal: 0,
                avstangd: false,
                avstangdTill: null,
                avstangdOrsak: '',
                avstangdGardId: null,
                vardnadshavare
            };

            Store.get().ungdomar.unshift(ny);
            Store.log(`Manuell incheckning (ny): ${Store.displayName(ny)}`);
            ledareSubView = null;
            showToast(`${ny.fornamn} skapad och incheckad`);
            render();
        },
        setCheckinSearch(val) {
            checkinSearch = val;
            const container = document.getElementById('checkin-list-container');
            if (container) container.innerHTML = renderCheckedInItemsHtml();
        },
        toggleShowAllCheckedIn() {
            showAllCheckedIn = !showAllCheckedIn;
            render();
        },
        toggleContact(id) {
            expandedContactId = expandedContactId === id ? null : id;
            editingYouthId = null;
            const container = document.getElementById('checkin-list-container');
            if (container) container.innerHTML = renderCheckedInItemsHtml();
        },
        startEditYouth(id) {
            editingYouthId = id;
            const container = document.getElementById('checkin-list-container');
            if (container) container.innerHTML = renderCheckedInItemsHtml();
        },
        cancelEditYouth() {
            editingYouthId = null;
            const container = document.getElementById('checkin-list-container');
            if (container) container.innerHTML = renderCheckedInItemsHtml();
        },
        saveEditYouth(id) {
            const u = Store.get().ungdomar.find(x => x.id === id);
            if (!u) return;
            const prevVh = u.vardnadshavare || [];
            u.fornamn = (document.getElementById('ey-fornamn')?.value || '').trim() || u.fornamn;
            u.efternamn = (document.getElementById('ey-efternamn')?.value || '').trim();
            u.fodelsedatum = document.getElementById('ey-fodelsedatum')?.value || '';
            u.kon = document.getElementById('ey-kon')?.value || u.kon;
            u.adress = (document.getElementById('ey-adress')?.value || '').trim();
            u.mobil = (document.getElementById('ey-mobil')?.value || '').trim();
            u.allergier = (document.getElementById('ey-allergier')?.value || '').trim();
            u.viktigtAttVeta = (document.getElementById('ey-viktigt')?.value || '').trim();
            u.skyddadIdentitet = !!document.getElementById('ey-skyddad')?.checked;

            const nyVh = [];
            const vh1Namn = (document.getElementById('ey-vh1-namn')?.value || '').trim();
            const vh1Tel = (document.getElementById('ey-vh1-tel')?.value || '').trim();
            if (vh1Namn || vh1Tel) nyVh.push({ namn: vh1Namn, telefon: vh1Tel, signerat: !!(prevVh[0] && prevVh[0].signerat) });
            const vh2Namn = (document.getElementById('ey-vh2-namn')?.value || '').trim();
            const vh2Tel = (document.getElementById('ey-vh2-tel')?.value || '').trim();
            if (vh2Namn || vh2Tel) nyVh.push({ namn: vh2Namn, telefon: vh2Tel, signerat: !!(prevVh[1] && prevVh[1].signerat) });
            u.vardnadshavare = nyVh;

            editingYouthId = null;
            Store.log(`Gårdskort uppdaterat av ledare för ${Store.displayName(u)}`);
            showToast('Gårdskort sparat');
            render();
        },
        simulateGeofence() {
            const s = Store.get();
            const incheckade = s.ungdomar.filter(u => u.incheckad);
            if (incheckade.length === 0) return;
            const u = incheckade[Math.floor(Math.random() * Math.min(6, incheckade.length))];
            const leaving = u.geofenceStatus !== 'ute_tillfalligt';
            u.geofenceStatus = leaving ? 'ute_tillfalligt' : 'inne';
            u.utInAntal = (u.utInAntal || 0) + 1;
            const tid = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
            const handelse = leaving ? 'Lämnade zonen (50 m)' : 'Kom tillbaka in i zonen';
            if (!s.geofenceLog) s.geofenceLog = [];
            s.geofenceLog.unshift({ tid, namn: Store.displayName(u), handelse });
            Store.save();
            showToast(`${Store.displayName(u)}: ${handelse}`);
            render();
        },
        dismissPattern(id) {
            const m = (Store.get().monsterAlerts || []).find(x => x.id === id);
            if (m) m.hanterad = true;
            Store.save();
            showToast('Markerat som noterat');
            render();
        },
        toggleCheckin(id) {
            const u = Store.get().ungdomar.find(x => x.id === id);
            if (!u) return;
            u.incheckad = !u.incheckad;
            u.incheckadTid = u.incheckad ? new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : null;
            u.geofenceStatus = 'inne';
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
        nextInQueue(resId) {
            const r = Store.get().resurser.find(x => x.id === resId);
            if (!r || r.ko.length === 0) return;
            const next = r.ko.shift();
            Store.save();
            showToast(`${next} är nu på tur vid ${r.namn}`);
            render();
        },
        clearQueue(resId) {
            const r = Store.get().resurser.find(x => x.id === resId);
            if (!r) return;
            r.ko = [];
            Store.save();
            showToast(`Kön till ${r.namn} rensad`);
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
        deleteWish(id) {
            const s = Store.get();
            s.onskemal = s.onskemal.filter(o => o.id !== id);
            Store.save();
            showToast('Önskemål markerat som klart');
            render();
        },
        setLedareSub(sub) {
            ledareSubView = ledareSubView === sub ? null : sub;
            render();
        },
        openSuspendForm(id) {
            suspendPreselectId = id || '';
            suspendFormOpen = true;
            render();
            const el = document.getElementById('suspend-form-box');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
        closeSuspendForm() {
            suspendFormOpen = false;
            render();
        },
        confirmSuspend() {
            const id = document.getElementById('suspend-youth')?.value;
            const until = document.getElementById('suspend-until')?.value;
            const reason = (document.getElementById('suspend-reason')?.value || '').trim();
            if (!id || !until || !reason) {
                return showToast('Välj ungdom, slutdatum och ange orsak');
            }
            const u = Store.get().ungdomar.find(x => x.id === id);
            if (!u) return;
            u.avstangd = true;
            u.avstangdTill = until;
            u.avstangdOrsak = reason;
            u.avstangdGardId = Store.getAktivGard().id;
            u.incheckad = false;
            u.incheckadTid = null;
            suspendFormOpen = false;
            Store.log(`${Store.displayName(u)} avstängd t.o.m. ${until} (${reason})`);
            showToast(`${u.fornamn} är avstängd t.o.m. ${until}`);
            render();
        },
        liftSuspend(id) {
            const u = Store.get().ungdomar.find(x => x.id === id);
            if (!u) return;
            u.avstangd = false;
            u.avstangdTill = null;
            u.avstangdOrsak = '';
            u.avstangdGardId = null;
            Store.log(`Avstängning hävd för ${Store.displayName(u)}`);
            showToast(`Avstängning hävd för ${u.fornamn}`);
            render();
        },
        setSuspendScope(val) {
            Store.get().tenant.avstangningScope = val;
            Store.log(`Synlighet för avstängningar ändrad till: ${val}`);
            showToast('Synlighet uppdaterad');
            render();
        },
        toggleSuspendGard(gardId) {
            const t = Store.get().tenant;
            if (!t.avstangningSpecifikaGardar) t.avstangningSpecifikaGardar = [];
            const idx = t.avstangningSpecifikaGardar.indexOf(gardId);
            if (idx >= 0) t.avstangningSpecifikaGardar.splice(idx, 1);
            else t.avstangningSpecifikaGardar.push(gardId);
            Store.save();
            showToast('Uppdaterade valda gårdar');
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
        toggleKioskStock(id) {
            const item = Store.get().kiosk.find(k => k.id === id);
            if (!item) return;
            item.iLager = !item.iLager;
            Store.save();
            showToast(item.iLager ? `${item.namn} åter i lager` : `${item.namn} markerad som slut`);
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
            showToast('Aktivitet skapad');
            render();
        },
        deleteActivity(id) {
            const s = Store.get();
            s.aktiviteter = s.aktiviteter.filter(a => a.id !== id);
            Store.save();
            showToast('Aktivitet borttagen');
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
            s.ungdomar.forEach(u => { u.incheckad = false; u.incheckadTid = null; u.geofenceStatus = 'inne'; });
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
        setParentSigner(idx) {
            parentSignerIndex = parseInt(idx, 10) || 0;
            render();
        },
        signBankId(id) {
            const u = Store.get().ungdomar.find(x => x.id === id);
            if (!u) return;
            u.allergier = (document.getElementById('parent-allergy')?.value || '').trim();
            u.viktigtAttVeta = (document.getElementById('parent-viktigt')?.value || '').trim();
            const vh = u.vardnadshavare || [];
            if (vh[parentSignerIndex]) {
                vh[parentSignerIndex].signerat = true;
            }
            // Alternativ A: det räcker att en vårdnadshavare signerar
            u.status = 'godkant';
            const signerName = vh[parentSignerIndex] ? vh[parentSignerIndex].namn : 'Vårdnadshavare';
            Store.log(`Gårdskort signerat med BankID av ${signerName} för ${u.fornamn}`);
            showToast(`Signerat av ${signerName}! Gårdskortet är nu godkänt.`);
            render();
        }
    };

    render();
})();
