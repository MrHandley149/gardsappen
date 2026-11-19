(function () {
    const STORAGE_KEY = 'gardsappen_live_v1';

    function createInitialData() {
        return {
            tenant: {
                kommunId: 'solleftea',
                kommunNamn: 'Sollefteå Kommun',
                aktivGardId: 'garn-langsele',
                gardar: [
                    {
                        id: 'garn-langsele',
                        namn: 'Gårn Långsele',
                        stadsdel: 'Östra Långsele',
                        swishNummer: '123 456 78 90',
                        atersamlingsplats: 'Fotbollsplanen på baksidan',
                        oppen: true,
                        banner: 'VÄLKOMMEN TILL GÅRN! ÖPPET TILL 22:00 IKVÄLL • 20:00 STARTAR FIFA-TURNERINGEN',
                        featureFlags: {
                            kiosk: true,
                            koer: true,
                            lag: true,
                            onskemal: true
                        }
                    },
                    {
                        id: 'ramsele-gard',
                        namn: 'Ramsele Fritidsgård',
                        stadsdel: 'Ramsele',
                        swishNummer: '123 987 65 43',
                        atersamlingsplats: 'Parkeringen vid skolan',
                        oppen: false,
                        banner: 'VÄLKOMMEN TILL RAMSELE FRITIDSGÅRD!',
                        featureFlags: {
                            kiosk: true,
                            koer: true,
                            lag: false,
                            onskemal: true
                        }
                    }
                ]
            },
            aktivUngdomId: 'u1',
            ungdomar: [
                {
                    id: 'u1',
                    fornamn: 'Filip',
                    efternamn: 'Filipsson',
                    fodelsear: 2010,
                    status: 'godkant',
                    allergier: 'Jordnötter',
                    skyddadIdentitet: false,
                    incheckad: true,
                    incheckadTid: '18:42',
                    avstangd: false,
                    foralderNamn: 'Karin Filipsson',
                    foralderTelefon: '070-123 45 67'
                },
                {
                    id: 'u2',
                    fornamn: 'Anna',
                    efternamn: 'Andersson',
                    fodelsear: 2011,
                    status: 'godkant',
                    allergier: '',
                    skyddadIdentitet: false,
                    incheckad: true,
                    incheckadTid: '19:15',
                    avstangd: false,
                    foralderNamn: 'Per Andersson',
                    foralderTelefon: '070-234 56 78'
                },
                {
                    id: 'u3',
                    fornamn: 'Alex',
                    efternamn: '(Skyddad)',
                    fodelsear: 2009,
                    status: 'godkant',
                    allergier: 'Laktos',
                    skyddadIdentitet: true,
                    incheckad: true,
                    incheckadTid: '19:20',
                    avstangd: false,
                    foralderNamn: 'Kontakt via samordnare',
                    foralderTelefon: 'Skyddat nummer'
                },
                {
                    id: 'u4',
                    fornamn: 'Liam',
                    efternamn: 'Lindberg',
                    fodelsear: 2012,
                    status: 'vantar_foralder',
                    allergier: '',
                    skyddadIdentitet: false,
                    incheckad: false,
                    incheckadTid: null,
                    avstangd: false,
                    foralderNamn: 'Maria Lindberg',
                    foralderTelefon: '070-345 67 89'
                }
            ],
            resurser: [
                { id: 'r1', namn: 'Biljardbord 1', ko: [] },
                { id: 'r2', namn: 'PS5 (FIFA)', ko: ['Anna Andersson'] },
                { id: 'r3', namn: 'Pingisbord', ko: [] }
            ],
            aktiviteter: [
                {
                    id: 'a1',
                    namn: 'FIFA-turnering',
                    tid: 'Ikväll 20:00',
                    maxPerLag: 2,
                    lag: [
                        { id: 'l1', namn: 'Gula Igelkottarna', pinkod: '8472', medlemmar: ['Anna Andersson'] }
                    ]
                }
            ],
            kiosk: [
                { id: 'k1', namn: 'Fanta Exotic', pris: 15, iLager: true },
                { id: 'k2', namn: 'Toast (Ost & Skinka)', pris: 20, iLager: true },
                { id: 'k3', namn: 'Kexchoklad', pris: 12, iLager: true }
            ],
            onskemal: [
                { id: 'o1', text: 'Nocco Tropical', av: 'Filip Filipsson' }
            ],
            rutiner: {
                oppning: [
                    { id: 'op1', text: 'Larma av och tänd lokalen', klar: true },
                    { id: 'op2', text: 'Starta kiosken och kontrollera växelkassa', klar: true },
                    { id: 'op3', text: 'Kontrollera nödutgångar', klar: true }
                ],
                stangning: [
                    { id: 'st1', text: 'Töm papperskorgar', klar: false },
                    { id: 'st2', text: 'Stäng av konsoler och ljud', klar: false },
                    { id: 'st3', text: 'Lås nödutgångar och larma på', klar: false }
                ]
            },
            personal: [
                { id: 'p1', namn: 'Sara Svensson', roll: 'Fritidsledare', gard: 'Gårn Långsele', aktiv: true },
                { id: 'p2', namn: 'Johan Berg', roll: 'Fritidsledare', gard: 'Ramsele Fritidsgård', aktiv: true },
                { id: 'p3', namn: 'Elin Nyström', roll: 'Vikarie', gard: 'Gårn Långsele', aktiv: false }
            ],
            statistik: {
                besokVecka: 412,
                besokManad: 1648,
                snittPerKvall: 34
            },
            auditLog: [
                { tid: '17:00', text: 'Demo-miljö laddad (Sollefteå Kommun)' }
            ]
        };
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return createInitialData();
            return JSON.parse(raw);
        } catch {
            return createInitialData();
        }
    }

    let state = load();

    window.Store = {
        get() {
            return state;
        },
        save() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        },
        reset() {
            state = createInitialData();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return state;
        },
        getAktivGard() {
            return state.tenant.gardar.find(g => g.id === state.tenant.aktivGardId) || state.tenant.gardar[0];
        },
        getAktivUngdom() {
            return state.ungdomar.find(u => u.id === state.aktivUngdomId) || state.ungdomar[0];
        },
        displayName(u) {
            return u.skyddadIdentitet ? `${u.fornamn} [Skyddad ID]` : `${u.fornamn} ${u.efternamn}`;
        },
        log(text) {
            const tid = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
            state.auditLog.unshift({ tid, text });
            if (state.auditLog.length > 20) state.auditLog.pop();
            this.save();
        }
    };
})();
