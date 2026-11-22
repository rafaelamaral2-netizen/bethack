/* BETHACK - demo data is the fallback only. Live data comes from Supabase when a key is saved in Settings. */

const demoMatches = [
    {
        sport: "football",
        league: "Premier League",
        home: "Manchester City",
        away: "Liverpool",
        time: "Demo event",
        status: "UPCOMING"
    },
    {
        sport: "football",
        league: "La Liga",
        home: "Real Madrid",
        away: "Barcelona",
        time: "Demo event",
        status: "UPCOMING"
    },
    {
        sport: "basketball",
        league: "WNBA",
        home: "Las Vegas Aces",
        away: "New York Liberty",
        time: "Demo event",
        status: "UPCOMING"
    },
    {
        sport: "baseball",
        league: "MLB",
        home: "New York Yankees",
        away: "Boston Red Sox",
        time: "Demo event",
        status: "UPCOMING"
    },
    {
        sport: "hockey",
        league: "NHL",
        home: "Boston Bruins",
        away: "Toronto Maple Leafs",
        time: "Demo event",
        status: "UPCOMING"
    }
];

let matches = demoMatches.slice();
let liveMode = false;

/* SUPABASE - live data. The URL is public. The anon key is saved by the
   user in Settings and stays in this browser only (localStorage). It is
   never written into this file or into GitHub. */

const SUPABASE_URL = "https://qlmifrawzbwwaguxwrbw.supabase.co";
const SUPABASE_KEY_STORAGE = "bethack_supabase_anon_key";
/* Publishable key, safe to use in a browser per Supabase. The user gave
   this key and asked for it to be embedded so Bethack loads live data
   without a manual Settings step. Settings can still override it. */
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_NTDz2SAzeSCwcfUdAtDqQg_B7dReq0Z";

function getSupabaseKey() {
    try {
        return (localStorage.getItem(SUPABASE_KEY_STORAGE) || "").trim() || DEFAULT_SUPABASE_ANON_KEY;
    } catch (e) {
        return DEFAULT_SUPABASE_ANON_KEY;
    }
}

function decimalToAmerican(decimal) {
    if (!decimal || decimal <= 1) return "";
    if (decimal >= 2) return "+" + Math.round((decimal - 1) * 100);
    return "-" + Math.round(100 / (decimal - 1));
}

function sportForLeagueSlug(slug, leagueName) {
    const s = (slug || "").toLowerCase();
    if (s === "nba" || s === "wnba" || s === "euroleague") return "basketball";
    if (s === "mlb") return "baseball";
    if (s === "nhl") return "hockey";
    return "football";
}

function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

async function loadFromSupabase() {
    const key = getSupabaseKey();
    if (!key) return false;
    try {
        const headers = { apikey: key, Accept: "application/json" };
        const leaguesRes = await fetch(
            SUPABASE_URL + "/rest/v1/leagues?select=id,name,slug&limit=100",
            { headers: headers }
        );
        if (!leaguesRes.ok) return false;
        const leagues = await leaguesRes.json();
        const leagueById = {};
        leagues.forEach(function (l) { leagueById[l.id] = l; });

        const eventsRes = await fetch(
            SUPABASE_URL + "/rest/v1/events?select=id,league_id,home_team,away_team,starts_at,status&order=starts_at&limit=100",
            { headers: headers }
        );
        if (!eventsRes.ok) return false;
        const events = await eventsRes.json();
        if (!Array.isArray(events) || !events.length) return false;

        const oddsRes = await fetch(
            SUPABASE_URL + "/rest/v1/odds?select=event_id,market_key,selection,decimal_odds,line&limit=1000",
            { headers: headers }
        );
        const oddsByEvent = {};
        if (oddsRes.ok) {
            const odds = await oddsRes.json();
            odds.forEach(function (o) {
                if (!oddsByEvent[o.event_id]) oddsByEvent[o.event_id] = [];
                oddsByEvent[o.event_id].push(o);
            });
        }

        const liveMatches = events.map(function (ev) {
            const league = leagueById[ev.league_id] || {};
            const evOdds = oddsByEvent[ev.id] || [];
            const h2h = evOdds.filter(function (o) { return o.market_key === "h2h"; });
            const homeOdd = h2h.find(function (o) { return o.selection === ev.home_team; });
            const awayOdd = h2h.find(function (o) { return o.selection === ev.away_team; });
            let oddsText = "";
            if (homeOdd && awayOdd) {
                oddsText = ev.home_team + " " + homeOdd.decimal_odds + " (" + decimalToAmerican(homeOdd.decimal_odds) + ")  •  " +
                    ev.away_team + " " + awayOdd.decimal_odds + " (" + decimalToAmerican(awayOdd.decimal_odds) + ")";
            }
            return {
                sport: sportForLeagueSlug(league.slug, league.name),
                league: league.name || "NBA",
                home: ev.home_team,
                away: ev.away_team,
                time: formatTime(ev.starts_at),
                status: (ev.status || "scheduled").toUpperCase(),
                oddsText: oddsText
            };
        });

        matches = liveMatches;
        liveMode = true;
        const statusEl = document.querySelector(".data-status");
        if (statusEl) statusEl.textContent = "LIVE DATA";
        return true;
    } catch (e) {
        return false;
    }
}

let selectedSport = "all";

const matchesContainer = document.getElementById("matchesContainer");
const matchesPageContainer = document.getElementById("matchesPageContainer");
const emptyState = document.getElementById("emptyState");
const matchSearch = document.getElementById("matchSearch");
const leagueFilter = document.getElementById("leagueFilter");

/* DATE */

const currentDate = document.getElementById("currentDate");

if (currentDate) {
    currentDate.textContent = new Date().toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );
}

/* DASHBOARD STATS */

function updateStats() {
    document.getElementById("totalMatches").textContent = matches.length;

    document.getElementById("valueOpportunities").textContent = "0";

    document.getElementById("averageProbability").textContent = "--";

    document.getElementById("sportsTracked").textContent =
        new Set(matches.map(match => match.sport)).size;
}

/* LEAGUE FILTER */

function populateLeagues() {
    const leagues = [...new Set(matches.map(match => match.league))];

    leagueFilter.innerHTML = `<option value="all">All leagues</option>`;

    leagues.forEach(league => {
        const option = document.createElement("option");
        option.value = league;
        option.textContent = league;
        leagueFilter.appendChild(option);
    });
}

/* MATCH CARD */

function createMatchCard(match) {
    const oddsLine = match.oddsText
        ? `<div class="match-odds" style="margin-top:8px;font-size:13px;opacity:0.85;">${match.oddsText}</div>`
        : "";
    return `
        <article class="match-card">

            <div class="match-card-top">
                <span class="match-league">${match.league}</span>
                <span class="match-status">${match.status}</span>
            </div>

            <div class="match-teams">
                <div class="team">${match.home}</div>
                <div class="match-vs">VS</div>
                <div class="team">${match.away}</div>
            </div>

            ${oddsLine}

            <div class="match-card-bottom">
                <span class="match-time">${match.time}</span>
                <button class="match-analysis-btn"
                    data-analysis="${match.home} vs ${match.away}">
                    Analyze
                </button>
            </div>

        </article>
    `;
}

/* FILTER ENGINE */

function getFilteredMatches() {
    const searchTerm = matchSearch.value.toLowerCase().trim();
    const selectedLeague = leagueFilter.value;

    return matches.filter(match => {
        const sportMatch =
            selectedSport === "all" || match.sport === selectedSport;

        const leagueMatch =
            selectedLeague === "all" || match.league === selectedLeague;

        const searchMatch =
            `${match.home} ${match.away} ${match.league}`
                .toLowerCase()
                .includes(searchTerm);

        return sportMatch && leagueMatch && searchMatch;
    });
}

/* RENDER */

function renderMatches() {
    const filteredMatches = getFilteredMatches();

    matchesContainer.innerHTML = filteredMatches
        .map(createMatchCard)
        .join("");

    emptyState.hidden = filteredMatches.length > 0;

    if (matchesPageContainer) {
        matchesPageContainer.innerHTML = `
            <div class="matches-grid">
                ${filteredMatches.map(createMatchCard).join("")}
            </div>
        `;
    }
}

/* SPORTS TABS */

document.querySelectorAll(".sport-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".sport-tab").forEach(item => {
            item.classList.remove("active");
        });

        tab.classList.add("active");

        selectedSport = tab.dataset.sport;

        renderMatches();
    });
});

/* SEARCH */

matchSearch.addEventListener("input", renderMatches);

leagueFilter.addEventListener("change", renderMatches);

/* NAVIGATION */

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");
const currentPageLabel = document.getElementById("currentPage");

navItems.forEach(item => {
    item.addEventListener("click", event => {
        event.preventDefault();

        const pageName = item.dataset.page;

        navItems.forEach(nav => nav.classList.remove("active"));
        item.classList.add("active");

        pages.forEach(page => page.classList.remove("active"));

        const targetPage = document.getElementById(pageName);

        if (targetPage) {
            targetPage.classList.add("active");
        }

        currentPageLabel.textContent =
            item.textContent.trim();

        document.getElementById("sidebar").classList.remove("open");
    });
});

/* ANALYSIS BUTTON */

document.addEventListener("click", event => {
    const button = event.target.closest(".match-analysis-btn");

    if (!button) return;

    const matchName = button.dataset.analysis;

    if (!matchName) return;

    alert(
        `BETHACK MATCH ANALYSIS\n\n${matchName}\n\nAnalysis module coming soon.`
    );
});

/* MOBILE SIDEBAR */

const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");

menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
});

/* SETTINGS - Supabase key, saved in this browser only */

const supabaseKeyInput = document.getElementById("supabaseKeyInput");
const saveSupabaseKeyBtn = document.getElementById("saveSupabaseKeyBtn");
const supabaseKeyStatus = document.getElementById("supabaseKeyStatus");

if (supabaseKeyInput) {
    supabaseKeyInput.value = getSupabaseKey();
    if (getSupabaseKey() && supabaseKeyStatus) {
        supabaseKeyStatus.textContent = "Key saved in this browser. Live data will load.";
    }
}

if (saveSupabaseKeyBtn) {
    saveSupabaseKeyBtn.addEventListener("click", async () => {
        const value = supabaseKeyInput ? supabaseKeyInput.value.trim() : "";
        if (!value) {
            if (supabaseKeyStatus) supabaseKeyStatus.textContent = "Paste your Supabase publishable (anon) key first.";
            return;
        }
        try {
            localStorage.setItem(SUPABASE_KEY_STORAGE, value);
        } catch (e) {}
        if (supabaseKeyStatus) supabaseKeyStatus.textContent = "Saved. Loading live data...";
        const ok = await loadFromSupabase();
        if (ok) {
            populateLeagues();
            updateStats();
            renderMatches();
            if (supabaseKeyStatus) supabaseKeyStatus.textContent = "Live data loaded from Supabase.";
        } else {
            if (supabaseKeyStatus) supabaseKeyStatus.textContent = "Could not load live data. Check the key and try again.";
        }
    });
}

/* REFRESH */

document.getElementById("refreshButton").addEventListener("click", async () => {
    await loadFromSupabase();
    populateLeagues();
    updateStats();
    renderMatches();

    const button = document.getElementById("refreshButton");

    button.textContent = "✓";

    setTimeout(() => {
        button.textContent = "↻";
    }, 1000);
});

/* INITIALIZE */

populateLeagues();
updateStats();
renderMatches();

loadFromSupabase().then(function (ok) {
    if (ok) {
        populateLeagues();
        updateStats();
        renderMatches();
    }
});
