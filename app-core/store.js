(function () {
    const STORAGE_KEY = 'gardsappen_live_v3';

    function buildYouthList() {
        const list = [
            { id: 'u1', fornamn: 'Filip', efternamn: 'Filipsson', fodelsear: 2010, kon: 'Kille', status: 'godkant', allergier: 'Jordnötter', skyddadIdentitet: false, incheckad: true, incheckadTid: '18:05', avstangd: false, avstangdTill: null, avstangdOrsak: '', avstangdGardId: null, foralderNamn: 'Karin Filipsson', foralderTelefon: '070-123 45 67' },
            { id: 'u2', fornamn: 'Anna', efternamn: 'Andersson', fodelsear: 2011, kon: 'Tjej', status: 'godkant', allergier: '', skyddadIdentitet: false, incheckad: true, incheckadTid: '18:08', avstangd: false, avstangdTill: null, avstangdOrsak: '', avstangdGardId: null, foralderNamn: 'Per Andersson', foralderTelefon: '070-234 56 78' },
            { id: 'u3', fornamn: 'Alex', efternamn: '(Skyddad)', fodelsear: 2009, kon: 'Vill ej uppge', status: 'godkant', allergier: 'Laktos', skyddadIdentitet: true, incheckad: true, incheckadTid: '18:10', avstangd: false, avstangdTill: null, avstangdOrsak: '', avstangdGardId: null, foralderNamn: 'Kontakt via samordnare', foralderTelefon: 'Skyddat nummer' },
            { id: 'u4', fornamn: 'Sam', efternamn: '(Skyddad)', fodelsear: 2011, kon: 'Vill ej uppge', status: 'godkant', allergier: '', skyddadIdentitet: true, incheckad: true, incheckadTid: '18:12', avstangd: false, avstangdTill: null, avstangdOrsak: '', avstangdGardId: null, foralderNamn: 'Kontakt via samordnare', foralderTelefon: 'Skyddat nummer' }
        ];

        const extra = [
            ['Lucas', 'Eriksson', 2010, 'Kille', ''],
            ['Maja', 'Johansson', 2011, 'Tjej', ''],
            ['Hugo', 'Karlsson', 2009, 'Kille', 'Mjölkprotein'],
            ['Ella', 'Nilsson', 2012, 'Tjej', ''],
            ['William', 'Larsson', 2010, 'Kille', ''],
            ['Astrid', 'Olsson', 2011, 'Tjej', ''],
            ['Noah', 'Persson', 2009, 'Kille', ''],
            ['Wilma', 'Svensson', 2010, 'Tjej', 'Gluten'],
            ['Elias', 'Gustafsson', 2012, 'Kille', ''],
            ['Freja', 'Pettersson', 2011, 'Tjej', ''],
            ['Oliver', 'Jonsson', 2010, 'Kille', ''],
            ['Ebba', 'Jansson', 2009, 'Tjej', ''],
            ['Oscar', 'Hansson', 2011, 'Kille', ''],
            ['Klara', 'Bengtsson', 2010, 'Tjej', ''],
            ['Adam', 'Jönsson', 2012, 'Kille', ''],
            ['Alma', 'Lind', 2011, 'Tjej', 'Nötter'],
            ['Leo', 'Jakobsson', 2009, 'Kille', ''],
            ['Agnes', 'Magnusson', 2010, 'Tjej', ''],
            ['Viktor', 'Olofsson', 2011, 'Kille', ''],
            ['Selma', 'Lindström', 2012, 'Tjej', ''],
            ['Albin', 'Lindqvist', 2010, 'Kille', ''],
            ['Elsa', 'Lindgren', 2009, 'Tjej', ''],
            ['Isak', 'Berg', 2011, 'Kille', ''],
            ['Signe', 'Axelsson', 2010, 'Tjej', ''],
            ['Theo', 'Bergström', 2012, 'Kille', ''],
            ['Vera', 'Lundberg', 2011, 'Tjej', ''],
            ['Arvid', 'Lundgren', 2009, 'Kille', ''],
            ['Stella', 'Mattsson', 2010, 'Tjej', ''],
            ['Melker', 'Berglund', 2011, 'Kille', ''],
            ['Nora', 'Fredriksson', 2010, 'Tjej', ''],
            ['Emil', 'Sandberg', 2012, 'Kille', '']
        ];

        extra.forEach((row, i) => {
            const min = String(15 + i).padStart(2, '0');
            list.push({
                id: 'u' + (i + 5),
                fornamn: row[0],
                efternamn: row[1],
                fodelsear: row[2],
                kon: row[3],
                status: 'godkant',
                allergier: row[4],
                skyddadIdentitet: false,
                incheckad: true,
                incheckadTid: `18:${min}`,
                avstangd: false,
                avstangdTill: null,
                avstangdOrsak: '',
                avstangdGardId: null,
                foralderNamn: `Vårdnadshavare ${row[1]}`,
                foralderTelefon: '070-555 00 ' + String(10 + i)
            });
        });

        // Ej incheckad, inväntar föräldrars godkännande
        list.push({
            id: 'u36',
            fornamn: 'Liam',
            efternamn: 'Lindberg',
            fodelsear: 2012,
            kon: 'Kille',
            status: 'vantar_foralder',
            allergier: '',
            skyddadIdentitet: false,
            incheckad: false,
            incheckadTid: null,
            avstangd: false,
            avstangdTill: null,
            avstangdOrsak: '',
            avstangdGardId: null,
            foralderNamn: 'Maria Lindberg',
            foralderTelefon: '070-345 67 89'
        });

        return list;
    }

    function createInitialData() {
        return {
            tenant: {
                kommunId: 'solleftea',
                kommunNamn: 'Sollefteå Kommun',
                aktivGardId: 'garn-langsele',
                avstangningScope: 'alla', // 'en' | 'alla' | 'specifika'
                avstangningSpecifikaGardar: ['garn-langsele'],
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
            ungdomar: buildYouthList(),
            resurser: [
                { id: 'r1', namn: 'Biljard', ko: [] },
                { id: 'r2', namn: 'Pingis', ko: [] },
                { id: 'r3', namn: 'TV-spel', ko: ['Anna Andersson'] },
                { id: 'r4', namn: 'Pysselrum', ko: [] },
                { id: 'r5', namn: 'Replokal', ko: [] }
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
            notiser: [],
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
