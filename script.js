
const matches = [
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

/* REFRESH */

document.getElementById("refreshButton").addEventListener("click", () => {
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
