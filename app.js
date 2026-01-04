const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  sport: "ALL",
  query: "",
  onlyLive: false,
  onlyTop: false,
  betslip: [], // {id, matchId, pickKey, pickLabel, odd}
  loggedIn: false,
  promo: { booster:false, cashout:false, freebet:false }
};

const matches = [
  {
    id: "m1",
    sport: "FOOTBALL",
    league: "HNL • Hrvatska",
    time: "Danas 18:00",
    home: "Dinamo Zagreb",
    away: "Hajduk Split",
    top: true,
    live: false,
    odds: { "1": 1.85, "X": 3.40, "2": 4.20 }
  },
  {
    id: "m2",
    sport: "FOOTBALL",
    league: "LaLiga • Španjolska",
    time: "Danas 21:00",
    home: "Real Madrid",
    away: "Barcelona",
    top: true,
    live: true,
    score: { h: 1, a: 1, min: 63 },
    odds: { "1": 2.25, "X": 3.10, "2": 2.95 }
  },
  {
    id: "m3",
    sport: "FOOTBALL",
    league: "Premier League • Engleska",
    time: "Sutra 17:30",
    home: "Manchester City",
    away: "Arsenal",
    top: false,
    live: false,
    odds: { "1": 1.72, "X": 3.85, "2": 4.95 }
  },
  {
    id: "m4",
    sport: "BASKET",
    league: "EuroLeague",
    time: "Danas 20:30",
    home: "Partizan",
    away: "Panathinaikos",
    top: false,
    live: true,
    score: { h: 54, a: 49, min: 28 },
    odds: { "1": 1.65, "X": 0.00, "2": 2.20 },
    noDraw: true
  },
  {
    id: "m5",
    sport: "TENNIS",
    league: "ATP • Indoor",
    time: "Danas 15:00",
    home: "Igrač A",
    away: "Igrač B",
    top: false,
    live: false,
    odds: { "1": 1.92, "X": 0.00, "2": 1.92 },
    noDraw: true
  },
  {
    id: "m6",
    sport: "ESPORT",
    league: "CS2 • Main",
    time: "Danas 19:45",
    home: "Squad Nova",
    away: "Vector Five",
    top: true,
    live: true,
    score: { h: 9, a: 7, min: 2 },
    odds: { "1": 1.88, "X": 0.00, "2": 1.88 },
    noDraw: true
  }
];

function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=> t.classList.remove("show"), 1600);
}

function formatOdd(x){
  if (!x || x <= 0) return "—";
  return x.toFixed(2);
}

function route(){
  const hash = (location.hash || "#sport").replace("#","");
  const routes = ["sport","live","promo","racun"];
  const r = routes.includes(hash) ? hash : "sport";

  $$(".route").forEach(el => el.classList.add("hidden"));
  $(`#route-${r}`).classList.remove("hidden");

  $$(".navLink").forEach(a => a.classList.toggle("active", a.dataset.route === r));
}

function filteredMatches(){
  const q = state.query.trim().toLowerCase();

  return matches.filter(m => {
    if (state.sport !== "ALL" && m.sport !== state.sport) return false;
    if (state.onlyLive && !m.live) return false;
    if (state.onlyTop && !m.top) return false;

    if (q){
      const hay = `${m.league} ${m.home} ${m.away}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderMatches(){
  const list = $("#matchList");
  const items = filteredMatches();

  $("#kpiMatches").textContent = items.length.toString();

  list.innerHTML = items.map(m => {
    const tags = [
      m.live ? `<span class="tagLive">LIVE</span>` : "",
      m.top ? `<span class="tagTop">TOP</span>` : ""
    ].filter(Boolean).join(" ");

    const marketKeys = m.noDraw ? ["1","2"] : ["1","X","2"];
    const cols = m.noDraw ? "grid-template-columns: repeat(2, 1fr);" : "";

    const oddsHtml = marketKeys.map(k => `
      <button class="odd" data-match="${m.id}" data-pick="${k}">
        <div class="oddKey">${k}</div>
        <div class="oddVal">${formatOdd(m.odds[k])}</div>
      </button>
    `).join("");

    return `
      <article class="match">
        <div class="matchTop">
          <div>
            <div class="league">${m.league}</div>
            <div class="time">${m.time}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center">${tags}</div>
        </div>

        <div class="teams">
          <div class="teamRow">
            <div class="teamName">${m.home}</div>
            ${m.live && m.score ? `<div class="score">${m.score.h}:${m.score.a} • ${m.score.min}'</div>` : ""}
          </div>
          <div class="teamRow">
            <div class="teamName">${m.away}</div>
          </div>
        </div>

        <div class="matchBottom" style="${cols}">
          ${oddsHtml}
        </div>
      </article>
    `;
  }).join("");

  // Click handlers for odds
  $$("#matchList .odd").forEach(btn => {
    btn.addEventListener("click", () => {
      const matchId = btn.dataset.match;
      const pickKey = btn.dataset.pick;
      addToSlip(matchId, pickKey);
    });
  });
}

function addToSlip(matchId, pickKey){
  const m = matches.find(x => x.id === matchId);
  if (!m) return;

  const odd = m.odds[pickKey];
  if (!odd || odd <= 0){
    toast("Ovo tržište nije dostupno (demo).");
    return;
  }

  const label = m.noDraw
    ? (pickKey === "1" ? "Pobjeda 1" : "Pobjeda 2")
    : (pickKey === "1" ? "1" : pickKey === "X" ? "X" : "2");

  // one pick per match (replace if exists)
  const existingIdx = state.betslip.findIndex(x => x.matchId === matchId);
  const entry = {
    id: `${matchId}:${pickKey}`,
    matchId,
    pickKey,
    pickLabel: label,
    odd
  };

  if (existingIdx >= 0) state.betslip[existingIdx] = entry;
  else state.betslip.push(entry);

  toast("Dodano u listić");
  syncSlipUI();
}

function removeFromSlip(id){
  state.betslip = state.betslip.filter(x => x.id !== id);
  syncSlipUI();
}

function clearSlip(){
  state.betslip = [];
  syncSlipUI();
  toast("Listić očišćen");
}

function totalOdds(){
  // product of odds
  let t = 1;
  for (const s of state.betslip) t *= s.odd;
  // promo booster: if 3+ picks boost +5% on total odds (demo)
  if (state.promo.booster && state.betslip.length >= 3) t *= 1.05;
  return t;
}

function payout(stake){
  const odds = totalOdds();
  if (!stake || stake <= 0 || state.betslip.length === 0) return 0;

  // freebet demo: payout excludes stake (common freebet behavior)
  if (state.promo.freebet) return stake * (odds - 1);
  return stake * odds;
}

function renderSlip(targetEl){
  if (!targetEl) return;
  const html = state.betslip.map(s => {
    const m = matches.find(x => x.id === s.matchId);
    const title = m ? `${m.home} vs ${m.away}` : s.matchId;
    return `
      <div class="slipItem">
        <div class="slipTop">
          <div>
            <div class="slipPick">${s.pickLabel} • <span style="color:#e8eefc">${formatOdd(s.odd)}</span></div>
            <div class="slipMeta">${title}</div>
          </div>
          <button class="remove" data-remove="${s.id}">X</button>
        </div>
      </div>
    `;
  }).join("");

  targetEl.innerHTML = html || `<p class="muted tiny">Listić je prazan. Klikni kvotu da dodaš.</p>`;

  targetEl.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => removeFromSlip(btn.dataset.remove));
  });
}

function syncSlipUI(){
  $("#betslipCount").textContent = String(state.betslip.length);
  $("#kpiSlip").textContent = String(state.betslip.length);

  renderSlip($("#slipList"));
  renderSlip($("#slipListMobile"));

  // sync stake between inputs
  const stakeDesktop = Number($("#stakeInput").value || 0);
  const stakeMobile = Number($("#stakeInputMobile").value || 0);
  const stake = Math.max(stakeDesktop, stakeMobile);

  if ($("#stakeInput").value !== String(stake) && stake > 0) $("#stakeInput").value = String(stake);
  if ($("#stakeInputMobile").value !== String(stake) && stake > 0) $("#stakeInputMobile").value = String(stake);

  // totals
  const odds = totalOdds();
  const pay = payout(stake);

  $("#totalOdds").textContent = odds.toFixed(2);
  $("#payout").textContent = pay.toFixed(2);

  $("#totalOddsMobile").textContent = odds.toFixed(2);
  $("#payoutMobile").textContent = pay.toFixed(2);

  // freebet toggles reflect promo state
  $("#freebetToggle").checked = state.promo.freebet;
  $("#freebetToggleMobile").checked = state.promo.freebet;
}

function renderLive(){
  const grid = $("#liveGrid");
  const live = matches.filter(m => m.live);

  grid.innerHTML = live.map(m => {
    const min = m.score?.min ?? 0;
    const progress = Math.min(100, Math.max(5, Math.round((min / 90) * 100)));

    const marketKeys = m.noDraw ? ["1","2"] : ["1","X","2"];
    const oddsHtml = marketKeys.map(k => `
      <button class="odd" data-match="${m.id}" data-pick="${k}">
        <div class="oddKey">${k}</div>
        <div class="oddVal">${formatOdd(m.odds[k])}</div>
      </button>
    `).join("");

    return `
      <div class="liveCard">
        <div class="liveHead">
          <div class="liveMeta">
            <span class="tagLive">LIVE</span>
            <span>${m.league}</span>
          </div>
          <div class="score">${m.score.h}:${m.score.a} • ${m.score.min}'</div>
        </div>

        <div style="font-weight:950; margin-bottom:8px">${m.home} — ${m.away}</div>

        <div class="progress"><div style="width:${progress}%"></div></div>

        <div class="liveOdds">
          ${oddsHtml}
        </div>

        ${state.promo.cashout ? `<div style="margin-top:10px"><button class="btn sm ghost">Cashout (demo)</button></div>` : ""}
      </div>
    `;
  }).join("");

  // odds click
  $$("#liveGrid .odd").forEach(btn => {
    btn.addEventListener("click", () => addToSlip(btn.dataset.match, btn.dataset.pick));
  });
}

function tickLive(){
  // small random changes (demo)
  matches.forEach(m => {
    if (!m.live || !m.score) return;

    // minute
    m.score.min = Math.min(m.score.min + (Math.random() < 0.6 ? 1 : 0), 90);

    // occasionally score
    if (Math.random() < 0.08){
      if (Math.random() < 0.5) m.score.h += 1;
      else m.score.a += 1;
      toast("LIVE: promjena rezultata (demo)");
    }

    // small odds drift
    const keys = Object.keys(m.odds);
    keys.forEach(k => {
      if (m.odds[k] <= 0) return;
      const drift = (Math.random() - 0.5) * 0.08;
      m.odds[k] = Math.max(1.05, m.odds[k] + drift);
    });
  });

  renderLive();
  renderMatches();
  syncSlipUI();
}

function openDrawer(open){
  const d = $("#betslipDrawer");
  d.classList.toggle("hidden", !open);
  d.setAttribute("aria-hidden", String(!open));
}

function openModal(open){
  const m = $("#loginModal");
  m.classList.toggle("hidden", !open);
  m.setAttribute("aria-hidden", String(!open));
}

function setLoggedIn(v){
  state.loggedIn = v;
  $("#accountStatus").textContent = v ? "Prijavljen" : "Gost";
  toast(v ? "Prijavljen (demo)" : "Odjavljen");
}

function wireUI(){
  // Year
  $("#year").textContent = String(new Date().getFullYear());

  // Routing
  window.addEventListener("hashchange", route);
  route();

  // Chips
  $$("#sportChips .chip").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("#sportChips .chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.sport = btn.dataset.sport;
      renderMatches();
    });
  });

  // Search
  $("#searchInput").addEventListener("input", (e) => {
    state.query = e.target.value || "";
    renderMatches();
  });

  // Toggles
  $("#onlyLiveToggle").addEventListener("change", (e)=> {
    state.onlyLive = e.target.checked;
    renderMatches();
  });
  $("#onlyTopToggle").addEventListener("change", (e)=> {
    state.onlyTop = e.target.checked;
    renderMatches();
  });

  // Slip buttons
  $("#clearSlipBtn").addEventListener("click", clearSlip);
  $("#clearSlipBtnMobile").addEventListener("click", clearSlip);

  // Stake sync
  const onStake = () => syncSlipUI();
  $("#stakeInput").addEventListener("input", onStake);
  $("#stakeInputMobile").addEventListener("input", onStake);

  // Freebet toggles
  const onFreebet = (checked) => {
    state.promo.freebet = checked;
    syncSlipUI();
  };
  $("#freebetToggle").addEventListener("change", (e)=> onFreebet(e.target.checked));
  $("#freebetToggleMobile").addEventListener("change", (e)=> onFreebet(e.target.checked));

  // Place bet (demo)
  const place = () => {
    const stake = Number($("#stakeInput").value || $("#stakeInputMobile").value || 0);
    if (state.betslip.length === 0) return toast("Dodaj barem 1 par.");
    if (!stake || stake <= 0) return toast("Upiši ulog.");
    toast("Uplata evidentirana (demo) ✅");
  };
  $("#placeBetBtn").addEventListener("click", place);
  $("#placeBetBtnMobile").addEventListener("click", place);

  // Drawer open/close
  $("#openBetslipBtn").addEventListener("click", () => openDrawer(true));
  $("#openBetslipBtn").addEventListener("dblclick", () => openDrawer(true)); // mobile-friendly
  $("#openBetslipBtn").addEventListener("touchstart", () => {});
  $("#openBetslipBtn").addEventListener("pointerdown", () => {}); // no-op to avoid delay

  $("#openBetslipBtn").addEventListener("click", () => {
    // on desktop it's visible; on mobile use drawer
    if (window.matchMedia("(max-width: 980px)").matches) openDrawer(true);
  });

  $("#openBetslipBtn").addEventListener("keydown", (e)=> {
    if (e.key === "Enter") openDrawer(true);
  });

  $("#openBetslipBtn").addEventListener("auxclick", ()=>{});

  $("#openBetslipBtn").addEventListener("contextmenu",(e)=>e.preventDefault());

  $("#openBetslipBtn").addEventListener("mousedown", ()=>{});

  $("#openBetslipBtn").addEventListener("mouseup", ()=>{});

  $("#openBetslipBtn").addEventListener("touchend", ()=>{});

  $("#openBetslipBtn").addEventListener("touchcancel", ()=>{});

  $("#openBetslipBtn").addEventListener("pointerup", ()=>{});

  $("#openBetslipBtn").addEventListener("pointercancel", ()=>{});

  $("#openBetslipBtn").addEventListener("click", () => {
    // keep it simple
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // already handled above; no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  $("#openBetslipBtn").addEventListener("click", () => {
    // no-op
  });

  // Drawer close
  $("#closeDrawerBtn").addEventListener("click", () => openDrawer(false));
  $("#betslipDrawer").addEventListener("click", (e)=> {
    if (e.target.id === "betslipDrawer") openDrawer(false);
  });

  // Login modal
  const openLogin = () => openModal(true);
  $("#openLoginBtn").addEventListener("click", openLogin);
  $("#openLoginBtn2").addEventListener("click", openLogin);
  $("#closeLoginBtn").addEventListener("click", ()=> openModal(false));
  $("#loginModal").addEventListener("click", (e)=> {
    if (e.target.id === "loginModal") openModal(false);
  });

  $("#loginBtn").addEventListener("click", ()=> setLoggedIn(true));
  $("#logoutBtn").addEventListener("click", ()=> setLoggedIn(false));

  // Promo buttons
  $$("[data-add-demo]").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.addDemo;
      if (type === "booster") state.promo.booster = !state.promo.booster;
      if (type === "cashout") state.promo.cashout = !state.promo.cashout;
      if (type === "freebet") state.promo.freebet = !state.promo.freebet;
      syncSlipUI();
      renderLive();
      toast("Promo ažuriran (demo)");
    });
  });

  // Refresh
  $("#refreshBtn").addEventListener("click", ()=> {
    renderMatches();
    renderLive();
    toast("Osvježeno");
  });

  // Escape closes overlays
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      openDrawer(false);
      openModal(false);
    }
  });
}

function init(){
  wireUI();
  renderMatches();
  renderLive();
  syncSlipUI();

  // live ticker
  setInterval(() => {
    // pulse text
    $("#livePulse").textContent = "Ažurirano " + new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    tickLive();
  }, 4500);
}

init();
