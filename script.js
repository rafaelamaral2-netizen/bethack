// ================================================
// BETHACK - LIVE SUPABASE FRONTEND
// Public key only. Never put service_role here.
// ================================================

const SUPABASE_URL = "https://qlmifrawzbwwaguxwrbw.supabase.co";
const SUPABASE_KEY = "sb_publishable_NTDz2SAzeSCwcfUdAtDqQg_B7dReq0Z";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  events: [],
  odds: [],
  bookmakers: [],
  leagues: [],
  valuePicks: [],
  predictions: [],
  loading: false
};

const $ = id => document.getElementById(id);

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "Fecha pendiente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha pendiente";
  return date.toLocaleString("es-PR", {
    month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"
  });
}

function number(value, decimals = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(decimals) : "—";
}

function leagueName(id) {
  return state.leagues.find(x => x.id === id)?.name || "Liga sin identificar";
}

function bookmakerName(id) {
  return state.bookmakers.find(x => x.id === id)?.name || "Casa desconocida";
}

function eventName(id) {
  const event = state.events.find(x => x.id === id);
  return event ? `${event.home_team} vs ${event.away_team}` : "Partido";
}

function setConnection(ok, message) {
  const dot = $("connectionDot");
  const label = $("connectionText");
  if (dot) dot.style.background = ok ? "#20e59a" : "#ff6474";
  if (label) label.textContent = message;
}

function showError(containerId, message) {
  const el = $(containerId);
  if (el) el.innerHTML = `<div class="error">${safe(message)}</div>`;
}

async function loadTable(table, options = {}) {
  let query = db.from(table).select("*");

  if (options.order) {
    query = query.order(options.order, {
      ascending: options.ascending ?? false,
      nullsFirst: false
    });
  }

  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

async function loadData() {
  if (state.loading) return;
  state.loading = true;
  setConnection(false, "Actualizando...");

  try {
    const results = await Promise.all([
      loadTable("events", { order:"starts_at", ascending:true, limit:500 }),
      loadTable("odds", { order:"captured_at", ascending:false, limit:3000 }),
      loadTable("bookmakers", { limit:500 }),
      loadTable("leagues", { limit:500 }),
      loadTable("value_picks", { order:"evaluated_at", ascending:false, limit:1000 }),
      loadTable("predictions", { order:"predicted_at", ascending:false, limit:1000 })
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
      hour:"2-digit", minute:"2-digit", second:"2-digit"
    });

    if ($("lastUpdated")) $("lastUpdated").textContent = `Actualizado ${now}`;
    if ($("footerUpdated")) $("footerUpdated").textContent = now;

  } catch (error) {
    console.error("BETHACK database error:", error);
    setConnection(false, "Error de conexión");

    const message = error.message || "No se pudieron cargar los datos.";
    ["dashboardMatches","matchesTable","oddsTable","valueTable"].forEach(id => {
      showError(id, message);
    });
  } finally {
    state.loading = false;
  }
}

// ---------------- NAVIGATION ----------------

const pageNames = {
  dashboard:"Dashboard",
  matches:"Partidos",
  scanner:"Odds Scanner",
  value:"Value Finder",
  analysis:"Match Analysis",
  performance:"Performance"
};

function navigate(page) {
  if (!pageNames[page]) return;

  document.querySelectorAll(".page").forEach(el => {
    el.classList.toggle("active", el.id === page);
  });

  document.querySelectorAll(".nav-link[data-page]").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });

  $("pageTitle").textContent = pageNames[page];
  $("sidebar").classList.remove("open");
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.goto));
});

$("menuButton")?.addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

$("refreshButton")?.addEventListener("click", loadData);
$("dashboardRefresh")?.addEventListener("click", loadData);

// ---------------- DASHBOARD ----------------

function renderStats() {
  $("statEvents").textContent = state.events.length;
  $("statOdds").textContent = state.odds.length;
  $("statBooks").textContent = state.bookmakers.length;
  $("statValue").textContent = state.valuePicks.length;

  $("perfPicks").textContent = state.valuePicks.length;

  $("perfPositive").textContent = state.valuePicks.filter(
    p => Number(p.ev_percent) > 0
  ).length;

  $("perfNegative").textContent = state.valuePicks.filter(
    p => Number(p.ev_percent) < 0
  ).length;

  $("systemStatus").innerHTML = `
    <div class="status-item"><span>Supabase</span><span>Conectado</span></div>
    <div class="status-item"><span>Partidos</span><span>${state.events.length}</span></div>
    <div class="status-item"><span>Cuotas</span><span>${state.odds.length}</span></div>
    <div class="status-item"><span>Bookmakers</span><span>${state.bookmakers.length}</span></div>
    <div class="status-item"><span>Predicciones</span><span>${state.predictions.length}</span></div>
  `;
}

function eventRow(event) {
  return `
    <tr>
      <td class="team-cell">
        ${safe(event.home_team)} vs ${safe(event.away_team)}
        <span class="sub-cell">${safe(leagueName(event.league_id))}</span>
      </td>
      <td>${formatDate(event.starts_at)}</td>
      <td><span class="tag">${safe(event.status || "Sin estado")}</span></td>
    </tr>
  `;
}

function renderDashboard() {
  const upcoming = [...state.events]
    .sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0,8);

  $("dashboardMatches").innerHTML = upcoming.length
    ? `<table><thead><tr><th>PARTIDO</th><th>FECHA</th><th>ESTADO</th></tr></thead>
       <tbody>${upcoming.map(eventRow).join("")}</tbody></table>`
    : `<div class="empty">No hay partidos registrados todavía.</div>`;
}

// ---------------- MATCHES ----------------

function renderMatches() {
  const search = ($("matchSearch")?.value || "").toLowerCase();
  const status = $("matchStatus")?.value || "all";

  const filtered = state.events.filter(event => {
    const text = `${event.home_team} ${event.away_team} ${leagueName(event.league_id)}`.toLowerCase();
    const matchesSearch = text.includes(search);
    const currentStatus = String(event.status || "").toLowerCase();

    const matchesStatus = status === "all" ||
      (status === "live" && ["live","in_progress","in-play"].includes(currentStatus)) ||
      (status === "scheduled" && ["scheduled","upcoming","not_started"].includes(currentStatus));

    return matchesSearch && matchesStatus;
  });

  $("matchesTable").innerHTML = filtered.length
    ? `<table><thead><tr><th>EVENTO</th><th>LIGA</th><th>FECHA</th><th>RESULTADO</th><th>ESTADO</th></tr></thead>
       <tbody>${filtered.map(e => `
         <tr>
           <td class="team-cell">${safe(e.home_team)} vs ${safe(e.away_team)}</td>
           <td>${safe(leagueName(e.league_id))}</td>
           <td>${formatDate(e.starts_at)}</td>
           <td>${e.home_score ?? "—"} : ${e.away_score ?? "—"}</td>
           <td><span class="tag">${safe(e.status || "—")}</span></td>
         </tr>`).join("")}</tbody></table>`
    : `<div class="empty">No hay partidos que coincidan con tu búsqueda.</div>`;
}

// ---------------- ODDS SCANNER ----------------

function renderOdds() {
  const search = ($("oddsSearch")?.value || "").toLowerCase();
  const market = $("marketFilter")?.value || "all";

  const filtered = state.odds.filter(odd => {
    const event = state.events.find(e => e.id === odd.event_id);
    const text = `${event?.home_team || ""} ${event?.away_team || ""} ${odd.selection || ""} ${bookmakerName(odd.bookmaker_id)}`.toLowerCase();

    return text.includes(search) &&
      (market === "all" || odd.market_key === market);
  }).slice(0,500);

  $("oddsTable").innerHTML = filtered.length
    ? `<table><thead><tr>
       <th>PARTIDO</th><th>MERCADO</th><th>SELECCIÓN</th><th>CASA</th><th>LÍNEA</th><th>CUOTA</th><th>CAPTURA</th>
       </tr></thead><tbody>${filtered.map(o => `
       <tr>
         <td class="team-cell">${safe(eventName(o.event_id))}</td>
         <td>${safe(o.market_name || o.market_key)}</td>
         <td>${safe(o.selection)}</td>
         <td>${safe(bookmakerName(o.bookmaker_id))}</td>
         <td>${o.line == null ? "—" : number(o.line)}</td>
         <td class="odds-value">${number(o.decimal_odds)}</td>
         <td>${formatDate(o.captured_at)}</td>
       </tr>`).join("")}</tbody></table>`
    : `<div class="empty">No hay cuotas disponibles para este filtro.</div>`;
}

// ---------------- VALUE FINDER ----------------

function renderValue() {
  const picks = [...state.valuePicks].sort(
    (a,b) => Number(b.ev_percent) - Number(a.ev_percent)
  );

  $("valueTable").innerHTML = picks.length
    ? `<table><thead><tr>
       <th>PARTIDO</th><th>MERCADO</th><th>SELECCIÓN</th><th>PROB.</th><th>CUOTA</th><th>EV</th><th>TIPO</th>
       </tr></thead><tbody>${picks.map(p => {
         const ev = Number(p.ev_percent);
         const positive = ev > 0;

         return `<tr>
           <td class="team-cell">${safe(eventName(p.event_id))}</td>
           <td>${safe(p.market_key)}</td>
           <td>${safe(p.selection)}</td>
           <td>${number(p.probability * (Number(p.probability) <= 1 ? 100 : 1),1)}%</td>
           <td>${number(p.decimal_odds)}</td>
           <td class="${positive ? "positive" : "negative"}">${number(ev)}%</td>
           <td><span class="tag">${positive ? "EV+" : ev < 0 ? "EV-" : "NEUTRAL"}</span></td>
         </tr>`;
       }).join("")}</tbody></table>`
    : `<div class="empty">Todavía no hay value picks calculados en Supabase. No se mostrarán picks inventados.</div>`;
}

// ---------------- MATCH ANALYSIS ----------------

function renderAnalysis() {
  const search = ($("analysisSearch")?.value || "").toLowerCase();

  const events = state.events.filter(e =>
    `${e.home_team} ${e.away_team} ${leagueName(e.league_id)}`.toLowerCase().includes(search)
  );

  $("analysisCards").innerHTML = events.length
    ? events.map(e => {
      const odds = state.odds.filter(o => o.event_id === e.id);
      const markets = [...new Set(odds.map(o => o.market_name || o.market_key))];

      return `<article class="analysis-card">
        <h3>${safe(e.home_team)} vs ${safe(e.away_team)}</h3>
        <p>${safe(leagueName(e.league_id))}</p>
        <p>Fecha: ${formatDate(e.starts_at)}</p>
        <p>Cuotas registradas: <strong>${odds.length}</strong></p>
        <p>Mercados: <strong>${markets.length ? safe(markets.join(", ")) : "Sin mercados"}</strong></p>
        <p>Estado: <span class="tag">${safe(e.status || "—")}</span></p>
      </article>`;
    }).join("")
    : `<div class="empty">No hay partidos para analizar.</div>`;
}

// ---------------- PERFORMANCE ----------------

function renderPerformance() {
  const picks = [...state.valuePicks].sort(
    (a,b) => Number(b.ev_percent) - Number(a.ev_percent)
  );

  $("performanceTable").innerHTML = picks.length
    ? `<table><thead><tr><th>EVENTO</th><th>SELECCIÓN</th><th>EV</th><th>ESTADO</th><th>FECHA</th></tr></thead>
       <tbody>${picks.map(p => `
       <tr>
         <td>${safe(eventName(p.event_id))}</td>
         <td>${safe(p.selection)}</td>
         <td class="${Number(p.ev_percent) >= 0 ? "positive" : "negative"}">${number(p.ev_percent)}%</td>
         <td>${safe(p.status || "—")}</td>
         <td>${formatDate(p.evaluated_at)}</td>
       </tr>`).join("")}</tbody></table>`
    : `<div class="empty">No hay historial de picks disponible todavía.</div>`;
}

// ---------------- RENDER ----------------

function renderAll() {
  renderStats();
  renderDashboard();
  renderMatches();
  renderOdds();
  renderValue();
  renderAnalysis();
  renderPerformance();
}

["matchSearch","matchStatus"].forEach(id =>
  $(id)?.addEventListener("input", renderMatches)
);

["oddsSearch","marketFilter"].forEach(id =>
  $(id)?.addEventListener("input", renderOdds)
);

$("analysisSearch")?.addEventListener("input", renderAnalysis);

// Initial load and automatic database refresh
loadData();
setInterval(loadData, 60000);
