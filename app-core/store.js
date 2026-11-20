(function () {
    const STORAGE_KEY = 'gardsappen_live_v7';

    function buildYouthList() {
        const list = [
            {
                id: 'u1', fornamn: 'Filip', efternamn: 'Filipsson', fodelsedatum: '2010-04-12', kon: 'Kille',
                adress: 'Storgatan 14, Långsele', mobil: '070-111 22 33',
                status: 'godkant', allergier: 'Jordnötter', viktigtAttVeta: 'Har egen EpiPen i ryggsäcken.',
                skyddadIdentitet: false, incheckad: true, incheckadTid: '18:05', geofenceStatus: 'inne', utInAntal: 3,
                avstangd: false, avstangdTill: null, avstangdOrsak: '', avstangdGardId: null,
                vardnadshavare: [
                    { namn: 'Karin Filipsson', telefon: '070-123 45 67', signerat: true },
                    { namn: 'Anders Filipsson', telefon: '070-123 45 68', signerat: false }
                ]
            },
            {
                id: 'u2', fornamn: 'Anna', efternamn: 'Andersson', fodelsedatum: '2011-08-22', kon: 'Tjej',
                adress: 'Björkvägen 3, Långsele', mobil: '070-222 33 44',
                status: 'godkant', allergier: '', viktigtAttVeta: '',
                skyddadIdentitet: false, incheckad: true, incheckadTid: '18:08', geofenceStatus: 'inne', utInAntal: 0,
                avstangd: false, avstangdTill: null, avstangdOrsak: '', avstangdGardId: null,
                vardnadshavare: [
                    { namn: 'Per Andersson', telefon: '070-234 56 78', signerat: true }
                ]
            },
            {
                id: 'u3', fornamn: 'Alex', efternamn: '(Skyddad)', fodelsedatum: '2009-01-01', kon: 'Vill ej uppge',
                adress: 'Skyddad uppgift', mobil: 'Skyddad uppgift',
                status: 'godkant', allergier: 'Laktos', viktigtAttVeta: 'Kontakt enbart via samordnare.',
                skyddadIdentitet: true, incheckad: true, incheckadTid: '18:10', geofenceStatus: 'inne', utInAntal: 1,
                avstangd: false, avstangdTill: null, avstangdOrsak: '', avstangdGardId: null,
                vardnadshavare: [
                    { namn: 'Kontakt via samordnare', telefon: 'Skyddat nummer', signerat: true }
                ]
            },
            {
                id: 'u4', fornamn: 'Sam', efternamn: '(Skyddad)', fodelsedatum: '2011-01-01', kon: 'Vill ej uppge',
                adress: 'Skyddad uppgift', mobil: 'Skyddad uppgift',
                status: 'godkant', allergier: '', viktigtAttVeta: '',
                skyddadIdentitet: true, incheckad: true, incheckadTid: '18:12', geofenceStatus: 'inne', utInAntal: 0,
                avstangd: false, avstangdTill: null, avstangdOrsak: '', avstangdGardId: null,
                vardnadshavare: [
                    { namn: 'Kontakt via samordnare', telefon: 'Skyddat nummer', signerat: true }
                ]
            }
        ];

        const extra = [
            ['Lucas', 'Eriksson', '2010-03-14', 'Kille', ''],
            ['Maja', 'Johansson', '2011-05-09', 'Tjej', ''],
            ['Hugo', 'Karlsson', '2009-11-28', 'Kille', 'Mjölkprotein'],
            ['Ella', 'Nilsson', '2012-02-19', 'Tjej', ''],
            ['William', 'Larsson', '2010-07-04', 'Kille', ''],
            ['Astrid', 'Olsson', '2011-09-15', 'Tjej', ''],
            ['Noah', 'Persson', '2009-06-21', 'Kille', ''],
            ['Wilma', 'Svensson', '2010-12-03', 'Tjej', 'Gluten'],
            ['Elias', 'Gustafsson', '2012-01-17', 'Kille', ''],
            ['Freja', 'Pettersson', '2011-04-25', 'Tjej', ''],
            ['Oliver', 'Jonsson', '2010-08-30', 'Kille', ''],
            ['Ebba', 'Jansson', '2009-10-11', 'Tjej', ''],
            ['Oscar', 'Hansson', '2011-03-07', 'Kille', ''],
            ['Klara', 'Bengtsson', '2010-05-18', 'Tjej', ''],
            ['Adam', 'Jönsson', '2012-06-22', 'Kille', ''],
            ['Alma', 'Lind', '2011-07-29', 'Tjej', 'Nötter'],
            ['Leo', 'Jakobsson', '2009-09-02', 'Kille', ''],
            ['Agnes', 'Magnusson', '2010-11-14', 'Tjej', ''],
            ['Viktor', 'Olofsson', '2011-01-23', 'Kille', ''],
            ['Selma', 'Lindström', '2012-04-08', 'Tjej', ''],
            ['Albin', 'Lindqvist', '2010-06-16', 'Kille', ''],
            ['Elsa', 'Lindgren', '2009-08-19', 'Tjej', ''],
            ['Isak', 'Berg', '2011-10-27', 'Kille', ''],
            ['Signe', 'Axelsson', '2010-02-05', 'Tjej', ''],
            ['Theo', 'Bergström', '2012-03-11', 'Kille', ''],
            ['Vera', 'Lundberg', '2011-05-24', 'Tjej', ''],
            ['Arvid', 'Lundgren', '2009-07-09', 'Kille', ''],
            ['Stella', 'Mattsson', '2010-09-13', 'Tjej', ''],
            ['Melker', 'Berglund', '2011-12-01', 'Kille', ''],
            ['Nora', 'Fredriksson', '2010-01-28', 'Tjej', ''],
            ['Emil', 'Sandberg', '2012-05-06', 'Kille', '']
        ];

        extra.forEach((row, i) => {
            const min = String(15 + i).padStart(2, '0');
            list.push({
                id: 'u' + (i + 5),
                fornamn: row[0],
                efternamn: row[1],
                fodelsedatum: row[2],
                kon: row[3],
                adress: `Skogsvägen ${i + 1}, Långsele`,
                mobil: '070-444 10 ' + String(10 + i),
                status: 'godkant',
                allergier: row[4],
                viktigtAttVeta: '',
                skyddadIdentitet: false,
                incheckad: true,
                incheckadTid: `18:${min}`,
                geofenceStatus: i === 0 ? 'ute_tillfalligt' : 'inne',
                utInAntal: i === 0 ? 4 : (i === 2 ? 2 : 0),
                avstangd: false,
                avstangdTill: null,
                avstangdOrsak: '',
                avstangdGardId: null,
                vardnadshavare: [
                    { namn: `Vårdnadshavare ${row[1]}`, telefon: '070-555 00 ' + String(10 + i), signerat: true }
                ]
            });
        });

        list.push({
            id: 'u36',
            fornamn: 'Liam',
            efternamn: 'Lindberg',
            fodelsedatum: '2012-09-14',
            kon: 'Kille',
            adress: 'Ängsvägen 8, Långsele',
            mobil: '070-888 99 00',
            status: 'vantar_foralder',
            allergier: '',
            viktigtAttVeta: 'Får gå hem själv kl 21:00.',
            skyddadIdentitet: false,
            incheckad: false,
            incheckadTid: null,
            geofenceStatus: 'inne',
            utInAntal: 0,
            avstangd: false,
            avstangdTill: null,
            avstangdOrsak: '',
            avstangdGardId: null,
            vardnadshavare: [
                { namn: 'Maria Lindberg', telefon: '070-345 67 89', signerat: false },
                { namn: 'Johan Lindberg', telefon: '070-987 65 43', signerat: false }
            ]
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
                serviceStatus: {
                    avslutad: false,
                    avslutMeddelande: 'Gårdsappen håller på att avvecklas för Sollefteå Kommun.',
                    pausadHela: false,
                    pausadeGardar: [],
                    pausMeddelande: 'Gårdsappen är för tillfället pausad, vi har öppet som vanligt.'
                },
                gardar: [
                    {
                        id: 'garn-langsele',
                        namn: 'Gårn Långsele',
                        stadsdel: 'Östra Långsele',
                        ansluten: true,
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
                        ansluten: true,
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
            regler: {
                gard: [
                    { id: 'gr1', text: 'Här respekterar vi varandra' },
                    { id: 'gr2', text: 'Vi tänker på ljudnivån så att alla trivs' },
                    { id: 'gr3', text: 'Vi plockar undan efter oss och håller rent' },
                    { id: 'gr4', text: 'Ingen energidryck (dryck sötad med socker eller sötningsmedel som innehåller över 15 mg koffein per 100 ml)' },
                    { id: 'gr5', text: 'Alkohol-, nikotin-, vape- och drogfritt' }
                ],
                spel: [
                    {
                        id: 'sr1',
                        kategori: 'Biljard',
                        titel: '8-ball (Hel- och halvfärgade)',
                        text: 'En spelare spränger. Den som först sänker ett klot får den sorten (hela 1–7 eller halva 9–15). Sänk alla dina egna klot först och sedan svarta 8:an i ett förvalt hål för att vinna. Vid fel (vit i hål, fel klot först eller miss) får motståndaren lägga den vita var som helst på bordet. Sänker du 8:an för tidigt, i fel hål eller med den vita förlorar du direkt.'
                    },
                    {
                        id: 'sr2',
                        kategori: 'Biljard',
                        titel: '9-ball',
                        text: 'Spelas med klot 1–9 i en diamant (1:an längst fram, 9:an i mitten). Du måste alltid träffa det klot på bordet som har lägst siffra först. Den som sänker 9:an på en godkänd stöt vinner – även via en kombination. Vid fel får motståndaren lägga den vita var som helst på bordet.'
                    },
                    {
                        id: 'sr3',
                        kategori: 'Biljard',
                        titel: 'Färg (Sänka andras)',
                        text: 'Alla spelare får varsin färg (en hel och en halv boll). Turordningen går efter ålder. Du ska sänka andras färger, inte dina egna. Sänker du en boll är det din tur igen. Den spelare som har sin färg kvar sist på bordet vinner.'
                    },
                    {
                        id: 'sr4',
                        kategori: 'Biljard',
                        titel: 'Färg (Sänka egna + 8:an)',
                        text: 'Varje spelare får en egen färg (t.ex. gul 1 & 9, blå 2 & 10). Du ska sänka dina två egna klot först och därefter svarta 8:an för att vinna.'
                    },
                    {
                        id: 'sr5',
                        kategori: 'Pingis',
                        titel: 'Vanlig match (till 11)',
                        text: 'Först till 11 poäng vinner setet. Vid 10–10 måste man vinna med två poäng (t.ex. 12–10). Varje spelare servar två gånger i rad, sedan byter man (vid 10–10 byter man efter varje poäng). Vid serve måste bollen studsa en gång på din egen sida och en gång på motståndarens sida.'
                    },
                    {
                        id: 'sr6',
                        kategori: 'Pingis',
                        titel: 'Rundpingis',
                        text: 'Alla spelare ställer sig på kö vid varsin kortsida. Du slår ett slag över nät och springer direkt runt bordet för att ställa dig sist i kön på andra sidan. Missar du bordet eller slår i nät åker du ut (eller tappar ett liv om ni kör med 3 liv). När två spelare är kvar spelas en snabb final.'
                    }
                ]
            },
            geofenceLog: [
                { tid: '19:18', namn: 'Lucas Eriksson', handelse: 'Lämnade zonen (50 m)' },
                { tid: '19:14', namn: 'Filip Filipsson', handelse: 'Kom tillbaka in i zonen' },
                { tid: '19:02', namn: 'Filip Filipsson', handelse: 'Lämnade zonen (50 m)' },
                { tid: '18:55', namn: 'Hugo Karlsson', handelse: 'Kom tillbaka in i zonen' }
            ],
            monsterAlerts: [
                { id: 'm1', ungdomId: 'u7', namn: 'Hugo Karlsson', typ: 'Kommer senare', beskrivning: 'Har kommit ca 1,5 timme senare än vanligt senaste 3 veckorna.', hanterad: false },
                { id: 'm2', ungdomId: 'u6', namn: 'Maja Johansson', typ: 'Går tidigare', beskrivning: 'Lämnar gården 45 min tidigare än normalt senaste besöken.', hanterad: false },
                { id: 'm3', ungdomId: 'u1', namn: 'Filip Filipsson', typ: 'Besöker oftare', beskrivning: 'Ökat från 1 till 4 besök i veckan denna månad.', hanterad: false },
                { id: 'm4', ungdomId: 'u12', namn: 'Wilma Svensson', typ: 'Besöker mer sällan', beskrivning: 'Har inte besökt gården på 3 veckor (tidigare 3 ggr/vecka).', hanterad: false }
            ],
            resurser: [
                { id: 'r1', namn: 'Biljard', ko: ['Filip Filipsson', 'Hugo Karlsson'] },
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
                { id: 'p1', namn: 'Sara Svensson', roll: 'Fritidsledare', gardIds: ['garn-langsele'], allaGardar: false, aktiv: true },
                { id: 'p2', namn: 'Johan Berg', roll: 'Fritidsledare', gardIds: ['ramsele-gard'], allaGardar: false, aktiv: true },
                { id: 'p3', namn: 'Elin Nyström', roll: 'Vikarie', gardIds: [], allaGardar: true, aktiv: false }
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
        isGardPaused(gardId) {
            const ss = state.tenant.serviceStatus;
            if (!ss) return false;
            return ss.pausadHela || (ss.pausadeGardar || []).includes(gardId);
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
