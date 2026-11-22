
// ================================================
// BETHACK - LIVE SUPABASE FRONTEND
// Public key only. Never put service_role here.
// ================================================

const SUPABASE_URL = "https://qlmifrawzbwwaguxwrbw.supabase.co";
const SUPABASE_KEY = "sb_publishable_NTDz2SAzeSCwcfUdAtDqQg_B7dReq0Z";

if (!window.supabase) {
  throw new Error("Supabase JS no está cargado. Verifica el script CDN en index.html.");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================================================
// GLOBAL STATE
// ================================================

const state = {
  events: [],
  odds: [],
  bookmakers: [],
  leagues: [],
  valuePicks: [],
  predictions: [],
  loading: false,
  selectedSport: "all",
  selectedLeagueId: "all"
};

const $ = id => document.getElementById(id);

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setHTML(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "Fecha pendiente";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha pendiente";
  }

  return date.toLocaleString("es-PR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function number(value, decimals = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(decimals) : "—";
}

function leagueName(id) {
  const league = state.leagues.find(
    item => String(item.id) === String(id)
  );

  return league?.name || "Liga sin identificar";
}

function bookmakerName(id) {
  const bookmaker = state.bookmakers.find(
    item => String(item.id) === String(id)
  );

  return bookmaker?.name || "Casa desconocida";
}

function eventName(id) {
  const event = state.events.find(
    item => String(item.id) === String(id)
  );

  return event
    ? `${event.home_team} vs ${event.away_team}`
    : "Partido";
}

// ================================================
// CONNECTION STATUS
// ================================================

function setConnection(ok, message) {
  const dot = $("connectionDot");
  const label = $("connectionText");

  if (dot) {
    dot.style.background = ok ? "#20e59a" : "#ff6474";
  }

  if (label) {
    label.textContent = message;
  }
}

function showError(containerId, message) {
  const el = $(containerId);

  if (el) {
    el.innerHTML = `
      <div class="error">${safe(message)}</div>
    `;
  }
}

// ================================================
// SUPABASE DATA LOADING
// ================================================

async function loadTable(table, options = {}) {
  let query = db.from(table).select("*");

  if (options.order) {
    query = query.order(options.order, {
      ascending: options.ascending ?? false,
      nullsFirst: false
    });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data || [];
}

async function loadData() {
  if (state.loading) return;

  state.loading = true;
  setConnection(false, "Actualizando...");

  try {
    const results = await Promise.all([
      loadTable("events", {
        order: "starts_at",
        ascending: true,
        limit: 500
      }),

      loadTable("odds", {
        order: "captured_at",
        ascending: false,
        limit: 3000
      }),

      loadTable("bookmakers", {
        limit: 500
      }),

      loadTable("leagues", {
        limit: 500
      }),

      loadTable("value_picks", {
        order: "evaluated_at",
        ascending: false,
        limit: 1000
      }),

      loadTable("predictions", {
        order: "predicted_at",
        ascending: false,
        limit: 1000
      })
    ]);

    [
      state.events,
      state.odds,
      state.bookmakers,
      state.leagues,
      state.valuePicks,
      state.predictions
    ] = results;

    setConnection(true, "Supabase conectado");

    renderAll();

    const now = new Date().toLocaleTimeString("es-PR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    setText("lastUpdated", `Actualizado ${now}`);
    setText("footerUpdated", now);

  } catch (error) {
    console.error("BETHACK database error:", error);

    setConnection(false, "Error de conexión");

    const message =
      error.message || "No se pudieron cargar los datos.";

    [
      "dashboardMatches",
      "matchesTable",
      "oddsTable",
      "valueTable"
    ].forEach(id => showError(id, message));

  } finally {
    state.loading = false;
  }
}

// ================================================
// NAVIGATION
// ================================================

const pageNames = {
  dashboard: "Dashboard",
  matches: "Partidos",
  scanner: "Odds Scanner",
  value: "Value Finder",
  analysis: "Match Analysis",
  performance: "Performance"
};

function navigate(page) {
  if (!pageNames[page]) return;

  document.querySelectorAll(".page").forEach(el => {
    el.classList.toggle("active", el.id === page);
  });

  document.querySelectorAll(".nav-link[data-page]").forEach(el => {
    el.classList.toggle(
      "active",
      el.dataset.page === page
    );
  });

  setText("pageTitle", pageNames[page]);

  $("sidebar")?.classList.remove("open");
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.page);
  });
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.goto);
  });
});

$("menuButton")?.addEventListener("click", () => {
  $("sidebar")?.classList.toggle("open");
});

$("refreshButton")?.addEventListener("click", loadData);
$("dashboardRefresh")?.addEventListener("click", loadData);

// ================================================
// DASHBOARD
// ================================================

function renderStats() {
  setText("statEvents", state.events.length);
  setText("statOdds", state.odds.length);
  setText("statBooks", state.bookmakers.length);
  setText("statValue", state.valuePicks.length);

  setText("perfPicks", state.valuePicks.length);

  const positive = state.valuePicks.filter(
    p => Number(p.ev_percent) > 0
  ).length;

  const negative = state.valuePicks.filter(
    p => Number(p.ev_percent) < 0
  ).length;

  setText("perfPositive", positive);
  setText("perfNegative", negative);

  setHTML("systemStatus", `
    <div class="status-item">
      <span>Supabase</span><span>Conectado</span>
    </div>
    <div class="status-item">
      <span>Partidos</span><span>${state.events.length}</span>
    </div>
    <div class="status-item">
      <span>Cuotas</span><span>${state.odds.length}</span>
    </div>
    <div class="status-item">
      <span>Bookmakers</span><span>${state.bookmakers.length}</span>
    </div>
    <div class="status-item">
      <span>Predicciones</span><span>${state.predictions.length}</span>
    </div>
  `);
}

function eventRow(event) {
  return `
    <tr>
      <td class="team-cell">
        ${safe(event.home_team)} vs ${safe(event.away_team)}
        <span class="sub-cell">
          ${safe(leagueName(event.league_id))}
        </span>
      </td>

      <td>${formatDate(event.starts_at)}</td>

      <td>
        <span class="tag">
          ${safe(event.status || "Sin estado")}
        </span>
      </td>
    </tr>
  `;
}

function renderDashboard() {
  const upcoming = [...state.events]
    .sort((a, b) =>
      new Date(a.starts_at) - new Date(b.starts_at)
    )
    .slice(0, 8);

  setHTML(
    "dashboardMatches",
    upcoming.length
      ? `
        <table>
          <thead>
            <tr>
              <th>PARTIDO</th>
              <th>FECHA</th>
              <th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            ${upcoming.map(eventRow).join("")}
          </tbody>
        </table>
      `
      : `
        <div class="empty">
          No hay partidos registrados todavía.
        </div>
      `
  );
}

// ================================================
// SPORTS AND LEAGUES
// ================================================

function getSportKey(league) {
  const key = String(
    league?.provider_key || ""
  ).toLowerCase();

  if (key.startsWith("soccer_")) {
    return "soccer";
  }

  if (key.startsWith("basketball_")) {
    return "basketball";
  }

  if (key.startsWith("icehockey_")) {
    return "hockey";
  }

  if (key.startsWith("americanfootball_")) {
    return "americanfootball";
  }

  if (key.startsWith("baseball_")) {
    return "baseball";
  }

  return "other";
}

function renderLeagueFilters() {
  const container = $("leagueFilters");

  if (!container) return;

  const leagues = state.leagues.filter(league => {
    const active = league.is_active !== false;

    const correctSport =
      state.selectedSport === "all" ||
      getSportKey(league) === state.selectedSport;

    return active && correctSport;
  });

  if (
    state.selectedLeagueId !== "all" &&
    !leagues.some(
      league =>
        String(league.id) === String(state.selectedLeagueId)
    )
  ) {
    state.selectedLeagueId = "all";
  }

  container.innerHTML = `
    <button
      class="league-button ${
        state.selectedLeagueId === "all" ? "active" : ""
      }"
      data-league="all"
    >
      Todas las ligas
    </button>

    ${leagues.map(league => `
      <button
        class="league-button ${
          String(state.selectedLeagueId) === String(league.id)
            ? "active"
            : ""
        }"
        data-league="${safe(league.id)}"
      >
        ${safe(league.name)}
      </button>
    `).join("")}
  `;

  if (!leagues.length) {
    container.innerHTML = `
      <div class="empty">
        No hay ligas registradas para este deporte.
      </div>
    `;
  }
}

function renderSports() {
  const container = $("sportsGrid");

  if (!container) return;

  container.querySelectorAll("[data-sport]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.sport === state.selectedSport
    );
  });

  renderLeagueFilters();
}

// ================================================
// MATCHES
// ================================================

function renderMatches() {
  const container = $("matchesTable");

  if (!container) return;

  const search = (
    $("matchSearch")?.value || ""
  ).toLowerCase().trim();

  const status = $("matchStatus")?.value || "all";

  const filtered = state.events.filter(event => {
    const league = state.leagues.find(
      item =>
        String(item.id) === String(event.league_id)
    );

    const text = `
      ${event.home_team || ""}
      ${event.away_team || ""}
      ${leagueName(event.league_id)}
    `.toLowerCase();

    const matchesSearch = text.includes(search);

    const matchesSport =
      state.selectedSport === "all" ||
      (
        league &&
        getSportKey(league) === state.selectedSport
      );

    const matchesLeague =
      state.selectedLeagueId === "all" ||
      String(event.league_id) ===
        String(state.selectedLeagueId);

    const currentStatus = String(
      event.status || ""
    ).toLowerCase();

    const matchesStatus =
      status === "all" ||
      (
        status === "live" &&
        ["live", "in_progress", "in-play"].includes(currentStatus)
      ) ||
      (
        status === "scheduled" &&
        ["scheduled", "upcoming", "not_started"].includes(currentStatus)
      );

    return (
      matchesSearch &&
      matchesSport &&
      matchesLeague &&
      matchesStatus
    );
  });

  container.innerHTML = filtered.length
    ? `
      <table>
        <thead>
          <tr>
            <th>EVENTO</th>
            <th>LIGA</th>
            <th>FECHA</th>
            <th>RESULTADO</th>
            <th>ESTADO</th>
          </tr>
        </thead>

        <tbody>
          ${filtered.map(event => `
            <tr>
              <td class="team-cell">
                ${safe(event.home_team)} vs ${safe(event.away_team)}
              </td>

              <td>${safe(leagueName(event.league_id))}</td>

              <td>${formatDate(event.starts_at)}</td>

              <td>
                ${event.home_score ?? "—"} :
                ${event.away_score ?? "—"}
              </td>

              <td>
                <span class="tag">
                  ${safe(event.status || "—")}
                </span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `
    : `
      <div class="empty">
        No hay partidos disponibles para esta selección.
      </div>
    `;
}

// ================================================
// ODDS SCANNER
// ================================================

function renderOdds() {
  const container = $("oddsTable");

  if (!container) return;

  const search = (
    $("oddsSearch")?.value || ""
  ).toLowerCase().trim();

  const market = $("marketFilter")?.value || "all";

  const filtered = state.odds.filter(odd => {
    const event = state.events.find(
      item => String(item.id) === String(odd.event_id)
    );

    const text = `
      ${event?.home_team || ""}
      ${event?.away_team || ""}
      ${odd.selection || ""}
      ${bookmakerName(odd.bookmaker_id)}
    `.toLowerCase();

    return (
      text.includes(search) &&
      (market === "all" || odd.market_key === market)
    );
  }).slice(0, 500);

  container.innerHTML = filtered.length
    ? `
      <table>
        <thead>
          <tr>
            <th>PARTIDO</th>
            <th>MERCADO</th>
            <th>SELECCIÓN</th>
            <th>CASA</th>
            <th>LÍNEA</th>
            <th>CUOTA</th>
            <th>CAPTURA</th>
          </tr>
        </thead>

        <tbody>
          ${filtered.map(odd => `
            <tr>
              <td class="team-cell">
                ${safe(eventName(odd.event_id))}
              </td>

              <td>
                ${safe(odd.market_name || odd.market_key)}
              </td>

              <td>${safe(odd.selection)}</td>

              <td>
                ${safe(bookmakerName(odd.bookmaker_id))}
              </td>

              <td>
                ${odd.line == null ? "—" : number(odd.line)}
              </td>

              <td class="odds-value">
                ${number(odd.decimal_odds)}
              </td>

              <td>${formatDate(odd.captured_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `
    : `
      <div class="empty">
        No hay cuotas disponibles para este filtro.
      </div>
    `;
}

// ================================================
// VALUE FINDER
// ================================================

function renderValue() {
  const container = $("valueTable");

  if (!container) return;

  const picks = [...state.valuePicks].sort(
    (a, b) => Number(b.ev_percent) - Number(a.ev_percent)
  );

  container.innerHTML = picks.length
    ? `
      <table>
        <thead>
          <tr>
            <th>PARTIDO</th>
            <th>MERCADO</th>
            <th>SELECCIÓN</th>
            <th>PROB.</th>
            <th>CUOTA</th>
            <th>EV</th>
            <th>TIPO</th>
          </tr>
        </thead>

        <tbody>
          ${picks.map(pick => {
            const ev = Number(pick.ev_percent);
            const positive = ev > 0;

            const rawProbability = Number(pick.probability);

            const probability = Number.isFinite(rawProbability)
              ? rawProbability <= 1
                ? rawProbability * 100
                : rawProbability
              : null;

            return `
              <tr>
                <td class="team-cell">
                  ${safe(eventName(pick.event_id))}
                </td>

                <td>${safe(pick.market_key)}</td>

                <td>${safe(pick.selection)}</td>

                <td>
                  ${probability === null
                    ? "—"
                    : `${number(probability, 1)}%`}
                </td>

                <td>${number(pick.decimal_odds)}</td>

                <td class="${positive ? "positive" : "negative"}">
                  ${number(ev)}%
                </td>

                <td>
                  <span class="tag">
                    ${positive ? "EV+" : ev < 0 ? "EV-" : "NEUTRAL"}
                  </span>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `
    : `
      <div class="empty">
        Todavía no hay value picks calculados en Supabase.
        No se mostrarán picks inventados.
      </div>
    `;
}

// ================================================
// MATCH ANALYSIS
// ================================================

function renderAnalysis() {
  const container = $("analysisCards");

  if (!container) return;

  const search = (
    $("analysisSearch")?.value || ""
  ).toLowerCase().trim();

  const events = state.events.filter(event =>
    `
      ${event.home_team || ""}
      ${event.away_team || ""}
      ${leagueName(event.league_id)}
    `.toLowerCase().includes(search)
  );

  container.innerHTML = events.length
    ? events.map(event => {
        const odds = state.odds.filter(
          odd => String(odd.event_id) === String(event.id)
        );

        const markets = [
          ...new Set(
            odds.map(odd => odd.market_name || odd.market_key)
          )
        ];

        return `
          <article class="analysis-card">
            <h3>
              ${safe(event.home_team)} vs ${safe(event.away_team)}
            </h3>

            <p>${safe(leagueName(event.league_id))}</p>

            <p>Fecha: ${formatDate(event.starts_at)}</p>

            <p>
              Cuotas registradas:
              <strong>${odds.length}</strong>
            </p>

            <p>
              Mercados:
              <strong>
                ${markets.length
                  ? safe(markets.join(", "))
                  : "Sin mercados"}
              </strong>
            </p>

            <p>
              Estado:
              <span class="tag">
                ${safe(event.status || "—")}
              </span>
            </p>
          </article>
        `;
      }).join("")
    : `
      <div class="empty">
        No hay partidos para analizar.
      </div>
    `;
}

// ================================================
// PERFORMANCE
// ================================================

function renderPerformance() {
  const container = $("performanceTable");

  if (!container) return;

  const picks = [...state.valuePicks].sort(
    (a, b) => Number(b.ev_percent) - Number(a.ev_percent)
  );

  container.innerHTML = picks.length
    ? `
      <table>
        <thead>
          <tr>
            <th>EVENTO</th>
            <th>SELECCIÓN</th>
            <th>EV</th>
            <th>ESTADO</th>
            <th>FECHA</th>
          </tr>
        </thead>

        <tbody>
          ${picks.map(pick => `
            <tr>
              <td>
                ${safe(eventName(pick.event_id))}
              </td>

              <td>${safe(pick.selection)}</td>

              <td class="${
                Number(pick.ev_percent) >= 0
                  ? "positive"
                  : "negative"
              }">
                ${number(pick.ev_percent)}%
              </td>

              <td>${safe(pick.status || "—")}</td>

              <td>${formatDate(pick.evaluated_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `
    : `
      <div class="empty">
        No hay historial de picks disponible todavía.
      </div>
    `;
}

// ================================================
// MAIN RENDER
// ================================================

function renderAll() {
  renderStats();
  renderDashboard();
  renderSports();
  renderMatches();
  renderOdds();
  renderValue();
  renderAnalysis();
  renderPerformance();
}

// ================================================
// FILTER EVENTS
// ================================================

// Search and status filters
$("matchSearch")?.addEventListener("input", renderMatches);
$("matchStatus")?.addEventListener("change", renderMatches);

// Sport selection
$("sportsGrid")?.addEventListener("click", event => {
  const button = event.target.closest("[data-sport]");

  if (!button) return;

  state.selectedSport = button.dataset.sport;
  state.selectedLeagueId = "all";

  renderSports();
  renderMatches();
});

// League selection
$("leagueFilters")?.addEventListener("click", event => {
  const button = event.target.closest("[data-league]");

  if (!button) return;

  state.selectedLeagueId = button.dataset.league;

  renderLeagueFilters();
  renderMatches();
});

// Odds filters
$("oddsSearch")?.addEventListener("input", renderOdds);
$("marketFilter")?.addEventListener("change", renderOdds);

// Analysis search
$("analysisSearch")?.addEventListener("input", renderAnalysis);

// ================================================
// INITIAL LOAD AND AUTOMATIC REFRESH
// ================================================

loadData();

setInterval(() => {
  loadData();
}, 60000);
