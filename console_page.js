// The page of the developer's console. One file, no dependency: the style and the script carry the nonce the relay makes for each answer, and nothing else may run.
// Everything the page shows is put in with textContent, never as markup.

export function consolePage(nonce) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>GamePort console</title>
<style nonce="${nonce}">
:root { --bg:#0d1016; --card:#171c26; --line:rgba(255,255,255,.12); --text:#eef1f6; --muted:#98a2b3; --env:#2f6fed; --warn:#f0b24a; color-scheme: dark; }
body.prod { --env:#d93a3a; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
button, input, select { font:inherit; color:inherit; }
.banner { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:12px 20px; background:var(--env); color:#fff; font-weight:700; letter-spacing:.02em; }
.brand { display:flex; line-height:0; }
.pages { display:flex; flex-wrap:wrap; gap:8px; }
.banner-btn { border:1px solid rgba(255,255,255,.7); background:none; color:#fff; cursor:pointer; padding:7px 16px; border-radius:999px; font:inherit; font-weight:700; }
.banner-btn:hover { background:rgba(255,255,255,.16); }
.switch { display:flex; gap:4px; padding:3px; border-radius:999px; background:rgba(0,0,0,.28); }
.switch button { border:0; background:none; cursor:pointer; padding:7px 16px; border-radius:999px; font-weight:700; color:#fff; opacity:.8; }
.switch button[aria-pressed="true"] { background:#fff; color:#111; opacity:1; }
main { display:grid; grid-template-columns:minmax(280px,360px) minmax(0,1fr); gap:20px; padding:20px 28px 32px; width:100%; }
@media (max-width:820px) { main { grid-template-columns:1fr; } }
.panel { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; }
h2 { margin:0 0 12px; font-size:17px; }
input[type=search], .field { width:100%; height:42px; padding:0 14px; background:#0f131b; border:1px solid var(--line); border-radius:999px; outline:0; }
input[type=search]:focus, .field:focus { border-color:rgba(255,255,255,.4); }
.games { margin-top:12px; max-height:68vh; overflow:auto; display:grid; gap:4px; }
.game { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:6px 10px 6px 6px; border:1px solid transparent; border-radius:12px; background:none; cursor:pointer; }
.game img { width:40px; height:60px; object-fit:cover; border-radius:6px; background:#0f131b; flex:none; }
.game .t { flex:1; min-width:0; }
.game .t b { display:block; font-weight:600; line-height:1.25; }
.game .t small { color:var(--muted); }
.game:hover { background:rgba(255,255,255,.06); }
.game[aria-pressed="true"] { background:rgba(255,255,255,.1); border-color:var(--line); }
.game .n { min-width:26px; text-align:center; padding:2px 8px; border-radius:999px; color:#10131a; font-size:12px; font-weight:800; }
.n-works { background:#4cc38a; } .n-offline_only { background:#f0b24a; } .n-fails { background:#ef6b6b; }
.only { margin-top:10px; width:100%; }
.device-filter { margin-top:10px; width:100%; }
.filter-row { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1fr); gap:8px; align-items:start; }
.filter-row .device-filter { min-width:0; width:100%; box-sizing:border-box; }
.sbox { position:relative; min-width:0; margin-top:10px; }
.sbox > summary { display:block; box-sizing:border-box; width:100%; list-style:none; height:38px; line-height:36px; padding:0 38px 0 12px; border:1px solid var(--line); border-radius:10px; cursor:pointer; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; background-color:#0f131b; background-repeat:no-repeat; background-position:right 12px center; background-size:12px 8px; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%2398a2b3' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); }
.sbox > summary::-webkit-details-marker { display:none; }
.sbox[open] > summary { border-color:rgba(255,255,255,.4); }
.sbox-menu { position:absolute; left:0; top:calc(100% + 4px); z-index:6; min-width:100%; width:max-content; background:#1b2130; border:1px solid var(--line); border-radius:10px; padding:6px; }
.sbox-menu label { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; cursor:pointer; white-space:nowrap; }
.sbox-menu label:hover { background:rgba(255,255,255,.08); }
.sbox-menu input { accent-color:#fff; }
.sbox-menu .sdot { width:9px; height:9px; border-radius:50%; flex:none; }
.sdot-4cc38a { background:#4cc38a; } .sdot-f0b24a { background:#f0b24a; } .sdot-ef6b6b { background:#ef6b6b; }
.report-state { margin-top:6px; }
.discord-icon { color:#8c96ff; vertical-align:-2px; margin-right:6px; flex:none; }
.only[aria-pressed="true"] { background:#fff; color:#111; border-color:transparent; }
.muted { color:var(--muted); }
.hero { position:relative; min-height:200px; border-radius:16px; overflow:hidden; margin:-4px 0 16px; background:#0f131b center / cover no-repeat; display:flex; align-items:flex-end; }
.hero::before { content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(13,16,22,.05), rgba(13,16,22,.92)); }
.hero > div { position:relative; padding:18px 20px; }
.hero h2 { margin:0 0 4px; font-size:26px; letter-spacing:-.01em; }
.hero .meta { color:#c3cad6; font-size:14px; }
.related { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.related a { color:var(--text); text-decoration:none; }
.related a:hover { background:rgba(255,255,255,.18); }
.totals { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 16px; }
.dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:6px; }
.d-works { background:#4cc38a; } .d-offline_only { background:#f0b24a; } .d-fails { background:#ef6b6b; }
tr td:first-child { border-left:4px solid transparent; }
tr.v-works td:first-child { border-left-color:#4cc38a; } tr.v-offline_only td:first-child { border-left-color:#f0b24a; } tr.v-fails td:first-child { border-left-color:#ef6b6b; }
.overview { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px; margin:0 0 16px; }
.dev-card { padding:12px 14px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid var(--line); display:grid; gap:8px; align-content:start; }
.dev-card h3 { margin:0; font-size:15px; text-transform:capitalize; }
.counts, .issue-list { display:flex; flex-wrap:wrap; gap:6px; }
.count { display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:999px; font-size:13px; background:rgba(255,255,255,.06); border:1px solid var(--line); white-space:nowrap; }
.count .dot { margin-right:0; }
.count.zero { opacity:.45; }
.issue { display:inline-flex; align-items:center; gap:8px; padding:2px 10px; border-radius:999px; font-size:12.5px; white-space:nowrap; background:rgba(239,107,107,.10); border:1px solid rgba(239,107,107,.30); }
.issue b { color:#ef6b6b; }
.issues-label { color:var(--muted); font-size:12.5px; }
details.incompat { margin:0 0 16px; border:1px dashed var(--line); border-radius:12px; }
details.incompat > summary { cursor:pointer; padding:10px 14px; font-weight:600; }
details.incompat[open] > summary { border-bottom:1px dashed var(--line); }
details.incompat > .add { border:0; margin:0; }
details.incompat.is-incompatible > summary { color:#ff9a9a; }
.votes { display:flex; flex-direction:column; gap:10px; }
.vote { display:grid; grid-template-columns:1fr auto; gap:8px 16px; align-items:center; padding:12px 16px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid var(--line); border-left:4px solid transparent; }
.vote.v-works { border-left-color:#4cc38a; } .vote.v-offline_only { border-left-color:#f0b24a; } .vote.v-fails { border-left-color:#ef6b6b; }
.vote-main { display:flex; flex-direction:column; gap:8px; min-width:0; }
.vote-title { display:flex; flex-wrap:wrap; align-items:center; gap:10px; font-size:16px; }
.ver { color:var(--muted); font-weight:500; }
.vote .btn { height:32px; padding:0 14px; font-size:13px; }
.vote .more > summary { padding:4px 12px; font-size:13px; }
.vote-meta { color:var(--muted); font-size:13px; overflow-wrap:anywhere; }
.vote-edit { grid-column:1 / -1; display:flex; flex-wrap:wrap; align-items:center; gap:14px; padding-top:10px; border-top:1px solid var(--line); }
.vote-edit[hidden] { display:none; }
.vote-edit label { display:flex; align-items:center; gap:8px; color:var(--muted); font-size:13px; }
.game-link { color:var(--text); font-weight:600; text-decoration:underline; text-decoration-color:var(--line); text-underline-offset:3px; }
.game-link:hover { text-decoration-color:currentColor; }
.player-link { color:var(--text); font-weight:600; text-decoration:underline; text-decoration-color:var(--line); text-underline-offset:3px; overflow-wrap:anywhere; }
.player-link:hover { text-decoration-color:currentColor; }
.player-cell small { display:block; font-size:12px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; }
.player-edit { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin:6px 0 18px; }
.player-edit .field { width:min(340px, 100%); cursor:text; }
.dev { margin-top:6px; max-width:230px; white-space:normal; line-height:1.3; }
.dev-name { font-size:13px; font-weight:600; }
.dev-code { font-size:12px; color:var(--muted); font-family:ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap:anywhere; }
.mono { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:13px; }
select.ans-works { color:#4cc38a; } select.ans-offline_only { color:#f0b24a; } select.ans-fails { color:#ff8a8a; }
.multi { position:relative; }
.multi > summary { list-style:none; cursor:pointer; height:38px; display:inline-flex; align-items:center; gap:8px; padding:0 14px; background:#0f131b; border:1px solid var(--line); border-radius:10px; min-width:220px; }
.multi > summary::after { content:"\\25BE"; margin-left:auto; color:var(--muted); }
.multi-menu { position:absolute; left:0; top:110%; z-index:6; min-width:290px; display:grid; gap:2px; padding:8px; background:#1b2130; border:1px solid var(--line); border-radius:10px; }
.multi-menu label { display:flex; align-items:center; gap:10px; padding:5px 8px; border-radius:6px; cursor:pointer; }
.multi-menu label:hover { background:rgba(255,255,255,.07); }
.more { position:relative; }
.more > summary { list-style:none; cursor:pointer; padding:7px 14px; border-radius:999px; border:1px solid var(--line); background:rgba(255,255,255,.07); font-weight:700; }
.more-menu { position:absolute; right:0; top:110%; z-index:5; background:#1b2130; border:1px solid var(--line); border-radius:10px; padding:6px; }
.add .field.wide { width:280px; }
.chip { padding:3px 12px; border-radius:999px; background:rgba(255,255,255,.08); border:1px solid var(--line); font-size:13px; }
.add .field { width:210px; height:38px; cursor:text; }
.add { display:flex; flex-wrap:wrap; gap:10px; align-items:center; padding:12px; border:1px dashed var(--line); border-radius:12px; margin-bottom:16px; }
select, .field { cursor:pointer; }
select {
  height:38px; padding:0 38px 0 12px; border:1px solid var(--line); border-radius:10px; appearance:none; -webkit-appearance:none;
  background:#0f131b url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%2398a2b3' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 14px center / 12px 8px;
}
select.field { padding-right:38px; }
.btn { height:38px; padding:0 16px; border-radius:999px; border:1px solid var(--line); background:rgba(255,255,255,.07); cursor:pointer; font-weight:600; }
.btn:hover { background:rgba(255,255,255,.15); }
.btn.fill { background:#fff; color:#111; border-color:transparent; }
.btn.danger { color:#ff8a8a; }
.btn[disabled] { opacity:.4; cursor:default; }
table { width:100%; border-collapse:collapse; }
th { text-align:left; color:var(--muted); font-weight:500; font-size:13px; padding:6px 8px; }
td { padding:8px; border-top:1px solid var(--line); vertical-align:middle; }
td { white-space:nowrap; }
.actions { display:flex; gap:6px; flex-wrap:nowrap; }
.scroll { overflow-x:auto; }
.gap { margin-top:24px; }
.langs { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.lang { display:flex; flex-direction:column; gap:8px; min-width:0; }
.lang p { margin:0; white-space:normal; overflow-wrap:anywhere; }
.reason { border:1px solid var(--line); border-radius:12px; padding:12px 14px; margin-bottom:12px; }
.reason-head { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:10px; }
.reason-head .spacer { flex:1; }
@media (max-width:700px) { .langs { grid-template-columns:1fr; } }
.stack { flex-direction:column; align-items:stretch; }
.stack input, .stack textarea { font:inherit; color:inherit; background:rgba(255,255,255,.06); border:1px solid var(--line); border-radius:8px; padding:6px 10px; }
.pill { display:inline-flex; align-items:center; gap:6px; padding:2px 10px; border-radius:999px; font-size:13px; font-weight:600; background:rgba(255,255,255,.08); border:1px solid var(--line); }
.pill.v-works { color:#4cc38a; } .pill.v-offline_only { color:#f0b24a; } .pill.v-fails { color:#ef6b6b; } .pill.v-none { color:var(--muted); font-weight:500; }
.todo { display:inline-flex; align-items:center; gap:6px; color:var(--warn); font-weight:600; font-size:13px; }
.todo::before { content:""; width:9px; height:9px; border-radius:50%; background:var(--warn); }
tr.waiting td:first-child { border-left:4px solid var(--warn); }
.chip[aria-pressed="true"] { background:#fff; color:#111; border-color:transparent; }
button.chip { cursor:pointer; font:inherit; color:inherit; }
.day { margin:16px 0 6px; color:var(--muted); font-size:13px; font-weight:600; }
.badge { display:inline-block; min-width:20px; padding:1px 7px; margin-left:8px; border-radius:999px; background:var(--warn); color:#10131a; font-size:12px; font-weight:800; text-align:center; }
.game .wait { width:10px; height:10px; border-radius:50%; background:var(--warn); flex:none; }
a.btn { display:inline-flex; align-items:center; text-decoration:none; }
.state { font-size:13px; color:var(--warn); }
.toast { position:fixed; right:20px; bottom:20px; padding:10px 16px; border-radius:12px; background:#1f2633; border:1px solid var(--line); opacity:0; transition:opacity .2s; pointer-events:none; }
.toast.show { opacity:1; }
.toast.bad { border-color:#d93a3a; }
</style>
</head>
<body class="test">
<div class="banner" id="banner">
  <a class="brand" href="/console" aria-label="GamePort console">
    <svg viewBox="0 0 512 512" width="30" height="30" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#222932"/><path d="M348.2,173 A124,124 0 1 0 380,256 L272,256" fill="none" stroke="#F5F5F7" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(-12)"><path d="M206,214 L206,298 Q206,312 218,305 L284,263 Q294,256 284,249 L218,207 Q206,200 206,214 Z" fill="#F5F5F7" stroke="#F5F5F7" stroke-width="8" stroke-linejoin="round"/></g></svg>
  </a>
  <div class="switch" role="group" aria-label="Environment">
    <button type="button" id="b-test" aria-pressed="true">TEST</button>
    <button type="button" id="b-prod" aria-pressed="false">PRODUCTION</button>
  </div>
  <nav class="pages" aria-label="Pages">
    <button type="button" class="banner-btn" id="latest">Latest reports<span class="badge" id="latest-count" hidden></span></button>
    <button type="button" class="banner-btn" id="news">What is new<span class="badge" id="news-count" hidden></span></button>
    <button type="button" class="banner-btn" id="reasons">Incompatibility reasons</button>
  </nav>
</div>
<main>
  <section class="panel">
    <h2>Games</h2>
    <input type="search" id="q" placeholder="Search a game" autocomplete="off" aria-label="Search a game">
    <div class="filter-row">
      <select id="device" class="device-filter" aria-label="Device"><option value="all">All devices</option></select>
      <details class="sbox" id="status"><summary id="status-label" aria-label="Status of the games">All statuses</summary><div class="sbox-menu" id="status-menu"></div></details>
    </div>
    <button type="button" class="btn only" id="only" aria-pressed="false">Only games with votes</button>
    <div class="games" id="games"></div>
  </section>
  <section class="panel" id="detail"><p class="muted">Pick a game.</p></section>
</main>
<div class="toast" id="toast" role="status"></div>
<script nonce="${nonce}">
"use strict";
var CATALOG = "https://raw.githubusercontent.com/gameport-project/gameport-catalog/main/v1/catalog.json";
var DEVICES = ["quest", "pico", "phone", "tablet", "other"];
var VERDICTS = { works: "Works", offline_only: "Offline only", fails: "Does not work" };
var state = { env: "test", games: [], current: null, votes: [], counts: {}, onlyVoted: false, incompat: {}, reasons: [], view: "", playerId: null, statuses: {}, extra: {}, unhandled: 0, waiting: {}, news: null, device: "all", ready: false };

function el(tag, attrs, children) {
  var node = document.createElement(tag);
  Object.keys(attrs || {}).forEach(function (k) {
    if (k === "text") node.textContent = attrs[k];
    else if (k === "class") node.className = attrs[k];
    else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), attrs[k]);
    else node.setAttribute(k, attrs[k]);
  });
  (children || []).forEach(function (c) { if (c) node.appendChild(c); });
  return node;
}

function toast(text, bad) {
  var t = document.getElementById("toast");
  t.textContent = text;
  t.className = "toast show" + (bad ? " bad" : "");
  setTimeout(function () { t.className = "toast"; }, 2600);
}

function call(path, message) {
  var options = message === undefined
    ? { credentials: "same-origin" }
    : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-gameport-console": "1" }, body: JSON.stringify(Object.assign({ env: state.env }, message)) };
  return fetch(path, options).then(function (r) {
    return r.json().then(function (data) {
      if (!r.ok) throw new Error(data.error || "error " + r.status);
      return data;
    });
  });
}

/** Every change in production asks first, with what it is about. */
function confirmWrite(text) {
  return state.env !== "prod" || window.confirm("PRODUCTION\\n\\n" + text + "\\n\\nThis changes the real votes at once.");
}

function setEnv(env) {
  state.env = env;
  syncUrl();
  document.body.className = env;
  document.getElementById("b-test").setAttribute("aria-pressed", String(env === "test"));
  document.getElementById("b-prod").setAttribute("aria-pressed", String(env === "prod"));
  loadWaiting();
  loadNews();
  loadIncompatible();
  loadCounts().then(function () {
    drawGames();
    if (state.view === "reports") showLatestReports();
    else if (state.view === "news") showNews();
    else if (state.view === "player" && state.playerId) showPlayer(state.playerId);
    else if (state.current) loadVotes();
  });
}

function loadIncompatible() {
  return call("/console/api/incompatible?env=" + state.env).then(function (data) {
    state.incompat = {};
    data.games.forEach(function (g) { state.incompat[g.appId] = g; });
    state.reasons = data.reasons;
    drawGames();
    if (state.view === "reasons") drawReasons();
    else if (state.current && state.view === "game") drawIncompatible();
  }).catch(function () { state.incompat = {}; state.reasons = []; });
}

function textField(label, value, long) {
  var input = el(long ? "textarea" : "input", { type: "text", "aria-label": label, placeholder: label, maxlength: long ? "400" : "80", rows: "2" });
  input.value = value || "";
  return input;
}

/** The block of the open game that says whether it is on the list of incompatible games: the reason is chosen from the table of reasons, never typed. */
function drawIncompatible() {
  var g = state.current;
  var holder = document.getElementById("incompat");
  if (!holder) return;
  holder.textContent = "";
  var own = state.incompat[g.appid];
  if (!state.reasons.length) {
    holder.appendChild(el("div", { class: "add stack" }, [el("strong", { text: "Compatibility" }), el("p", { class: "muted", text: "No reason yet: add one first, then a game can be marked as incompatible." }), el("button", { type: "button", class: "btn", text: "Add a reason", onclick: showReasons })]));
    return;
  }
  var labels = {};
  state.reasons.forEach(function (r) { labels[r.id] = r.title.en; });
  var chosen = select(state.reasons.map(function (r) { return r.id; }), own ? own.reason : state.reasons[0].id, labels);
  var preview = el("p", { class: "muted" });
  var showText = function () {
    var r = state.reasons.filter(function (x) { return x.id === chosen.value; })[0];
    preview.textContent = r ? "EN: " + r.title.en + ": " + r.text.en + "  ·  FR: " + r.title.fr + " : " + r.text.fr : "";
  };
  chosen.addEventListener("change", showText);
  showText();
  var save = el("button", { type: "button", class: "btn fill", text: own ? "Change the reason" : "Mark as incompatible", onclick: function () {
    var message = { env: state.env, appId: g.appid, name: g.name, reason: chosen.value };
    if (!confirmWrite((own ? "Change the reason for " : "Mark as incompatible: ") + g.name + " (" + labels[chosen.value] + "). The app and the site show it at once.")) return;
    call("/console/api/incompatible-set", message).then(function () { toast("Saved"); loadIncompatible(); }).catch(function (e) { toast(e.message, true); });
  } });
  var children = [el("strong", { text: own ? "Incompatible: shown as such in the app and on the site" : "Compatibility" }), chosen, preview, save];
  if (own) {
    children.push(el("button", { type: "button", class: "btn danger", text: "Make compatible", onclick: function () {
      if (!confirmWrite("Take " + g.name + " off the incompatible list.")) return;
      call("/console/api/incompatible-remove", { env: state.env, appId: g.appid }).then(function () { toast("Taken off the list"); loadIncompatible(); }).catch(function (e) { toast(e.message, true); });
    } }));
  }
  // Folded: it is rarely used, and it pushed the votes down the page. The line says where the game stands.
  var summary = el("summary", { text: own ? "Incompatible: " + (labels[own.reason] || own.reason) : "Compatibility: not marked as incompatible" });
  var box = el("details", { class: "incompat" + (own ? " is-incompatible" : "") }, [summary, el("div", { class: "add stack" }, children)]);
  holder.appendChild(box);
}

/** The table of reasons: a form to add one (or change one, its texts reach every game that names it) and the list of those that exist. */
function showReasons() {
  state.current = null;
  state.view = "reasons";
  drawGames();
  drawReasons();
}

function drawReasons() {
  var panel = document.getElementById("detail");
  panel.textContent = "";
  panel.appendChild(el("h2", { text: "Reasons for incompatibility (" + (state.env === "prod" ? "production" : "test") + ")" }));
  var id = textField("Identifier, e.g. anti-tamper");
  var titleEn = textField("Title");
  var titleFr = textField("Titre");
  var textEn = textField("Explanation, for any reader", "", true);
  var textFr = textField("Explication, pour tout lecteur", "", true);
  var save = el("button", { type: "button", class: "btn fill", text: "Save the reason", onclick: function () {
    var message = { env: state.env, id: id.value.trim(), title: { en: titleEn.value, fr: titleFr.value }, text: { en: textEn.value, fr: textFr.value } };
    if (!confirmWrite("Save the reason " + message.id + ". Every game that names it shows these texts at once.")) return;
    call("/console/api/reason-set", message).then(function () { toast("Saved"); loadIncompatible(); }).catch(function (e) { toast(e.message, true); });
  } });
  var column = function (name, fields) { return el("div", { class: "lang" }, [el("strong", { text: name })].concat(fields)); };
  panel.appendChild(el("div", { class: "add stack" }, [
    el("strong", { text: "New reason, or change one by its identifier" }),
    id,
    el("div", { class: "langs" }, [column("English", [titleEn, textEn]), column("Français", [titleFr, textFr])]),
    save,
  ]));
  if (!state.reasons.length) { panel.appendChild(el("p", { class: "muted", text: "No reason yet." })); return; }
  state.reasons.forEach(function (r) {
    var edit = el("button", { type: "button", class: "btn", text: "Edit", onclick: function () {
      id.value = r.id; titleEn.value = r.title.en; titleFr.value = r.title.fr; textEn.value = r.text.en; textFr.value = r.text.fr;
      window.scrollTo(0, 0);
    } });
    var del = el("button", { type: "button", class: "btn danger", text: "Delete", onclick: function () {
      if (!confirmWrite("Delete the reason " + r.id + ".")) return;
      call("/console/api/reason-remove", { env: state.env, id: r.id }).then(function () { toast("Deleted"); loadIncompatible(); }).catch(function (e) { toast(e.message, true); });
    } });
    if (r.uses) { del.setAttribute("disabled", "disabled"); del.title = "Games still name this reason"; }
    var shown = function (name, lang) { return el("div", { class: "lang" }, [el("small", { class: "muted", text: name }), el("b", { text: r.title[lang] }), el("p", { text: r.text[lang] })]); };
    panel.appendChild(el("div", { class: "reason" }, [
      el("div", { class: "reason-head" }, [
        el("strong", { text: r.id }),
        el("span", { class: "chip", text: r.uses + (r.uses === 1 ? " game" : " games") }),
        el("span", { class: "spacer" }), edit, del,
      ]),
      el("div", { class: "langs" }, [shown("English", "en"), shown("Français", "fr")]),
    ]));
  });
}

function loadCounts() {
  var path = state.env === "prod" ? "/summary" : "/test/summary";
  // Never from the browser's memory: the summary is kept five minutes for the public, and a vote just changed has to show at once.
  return fetch(path, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : { games: [] }; }).then(function (data) {
    state.counts = {};
    (data.games || []).forEach(function (g) { state.counts[g.appId] = { total: g.works + g.offlineOnly + g.fails, works: g.works, offline_only: g.offlineOnly, fails: g.fails, devices: g.devices || {} }; });
    // The votes of an app that is not in the catalog (a demo, a game without an Android version) still have to be reachable: the name comes from Steam.
    Object.keys(state.counts).forEach(function (id) {
      var n = Number(id);
      if (state.games.some(function (g) { return g.appid === n; }) || state.extra[n]) return;
      state.extra[n] = { appid: n, name: "App " + n, vr: false, installable: true, extra: true };
      resolveName(state.extra[n]);
    });
    drawDeviceOptions();
  }).catch(function () { state.counts = {}; drawDeviceOptions(); });
}

/** The votes of a game for the device chosen in the filter (all of them for "All devices"), or null when there is none. */
function deviceCounts(c) {
  if (!c || !c.total) return null;
  if (state.device === "all") return c;
  var d = c.devices && c.devices[state.device];
  if (!d) return null;
  var total = d.works + d.offlineOnly + d.fails;
  return total ? { total: total, works: d.works, offline_only: d.offlineOnly, fails: d.fails } : null;
}

/** The filter lists "All devices" and each device that has at least one vote in this set; a choice that has no vote any more goes back to all. */
function drawDeviceOptions() {
  var select = document.getElementById("device");
  var present = {};
  Object.keys(state.counts).forEach(function (id) {
    var devices = state.counts[id].devices || {};
    Object.keys(devices).forEach(function (d) { var v = devices[d]; if (v.works + v.offlineOnly + v.fails > 0) present[d] = true; });
  });
  if (state.device !== "all" && !present[state.device]) state.device = "all";
  select.textContent = "";
  select.appendChild(el("option", { value: "all", text: "All devices" }));
  DEVICES.forEach(function (d) { if (present[d]) select.appendChild(el("option", { value: d, text: d.charAt(0).toUpperCase() + d.slice(1) })); });
  select.value = state.device;
}

/** Asks the relay for the name Steam gives an app, and puts it in the game and everywhere the game is shown. */
function resolveName(game) {
  game.pending = call("/console/api/app?id=" + game.appid).then(function (info) {
    if (info.name) { game.name = info.name; game.type = info.type; game.why = null; } else if (info.why) game.why = info.why;
    if (info.image) game.banner = info.image;
    drawGames();
    if (state.current && state.current.appid === game.appid && state.view !== "reports") drawDetail();
    return game;
  }).catch(function () { return game; });
  return game.pending;
}

function allGames() {
  return state.games.concat(Object.keys(state.extra).map(function (id) { return state.extra[id]; })).sort(function (a, b) { return a.name.localeCompare(b.name); });
}

/** How many reports wait in this set, and for which games: the badge of the button and the dots of the list. */
function loadWaiting() {
  return call("/console/api/reports?env=" + state.env).then(function (data) {
    state.unhandled = data.unhandled;
    state.waiting = {};
    data.reports.forEach(function (r) { if (!r.handled) state.waiting[r.appId] = (state.waiting[r.appId] || 0) + 1; });
    var badge = document.getElementById("latest-count");
    badge.textContent = String(state.unhandled);
    badge.hidden = !state.unhandled;
    drawGames();
  }).catch(function () {});
}

/** The answer most votes of a game give: the colour of its badge. When two answers are equal, the more careful one wins. */
function majority(c) {
  if (c.fails >= c.works && c.fails >= c.offline_only) return "fails";
  if (c.offline_only >= c.works) return "offline_only";
  return "works";
}

/** The address says the set and what is open (/console/prod/1125240, /console/test/news): a refresh, a copied link or a bookmark comes back to the same place. */
function syncUrl() {
  if (!state.ready) return;
  var tail = state.view === "player" && state.playerId ? "/player/" + state.playerId : state.view === "game" && state.current ? "/" + state.current.appid : state.view === "reports" || state.view === "news" || state.view === "reasons" ? "/" + state.view : "";
  var path = "/console/" + state.env + tail + (state.onlyVoted ? "?voted" : "");
  if (location.pathname + location.search !== path) history.pushState(null, "", path);
}

function drawGames() {
  syncUrl();
  var q = document.getElementById("q").value.trim().toLowerCase();
  if (/^\\d{1,10}$/.test(q) && Number(q) >= 1 && Number(q) <= 2000000000 && !allGames().some(function (g) { return g.appid === Number(q); })) {
    state.extra[Number(q)] = { appid: Number(q), name: "App " + q, vr: false, installable: true, extra: true };
    resolveName(state.extra[Number(q)]);
  }
  var box = document.getElementById("games");
  box.textContent = "";
  allGames().filter(function (g) {
    if ((state.onlyVoted || state.device !== "all") && !deviceCounts(state.counts[g.appid])) return false;
    // The status a game shows (the colour of its badge, for the chosen device): only the games whose status is ticked, none that has no vote.
    var ticked = Object.keys(state.statuses).filter(function (k) { return state.statuses[k]; });
    if (ticked.length) {
      var own = deviceCounts(state.counts[g.appid]);
      if (!own || ticked.indexOf(majority(own)) === -1) return false;
    }
    return !q || g.name.toLowerCase().indexOf(q) !== -1 || String(g.appid) === q;
  }).slice(0, 200).forEach(function (g) {
    var n = deviceCounts(state.counts[g.appid]);
    var thumb = g.cover ? el("img", { src: g.cover, alt: "", loading: "lazy" }) : el("span");
    box.appendChild(el("button", { type: "button", class: "game", "aria-pressed": String(state.current && state.current.appid === g.appid), onclick: function () { state.current = g; state.view = "game"; drawGames(); loadVotes(); } }, [
      thumb,
      el("span", { class: "t" }, [el("b", { text: g.name }), el("small", { text: g.extra ? (g.type || "not in the catalog") : (g.vr ? "VR" : "Flat") + (g.installable ? "" : " · soon") })]),
      state.incompat[g.appid] ? el("span", { class: "n n-fails", text: "✕", title: "Incompatible" }) : null,
      state.waiting[g.appid] ? el("span", { class: "wait", title: state.waiting[g.appid] + " report(s) to handle" }) : null,
      n ? el("span", { class: "n n-" + majority(n), text: String(n.total) }) : null,
    ]));
  });
}

function loadVotes() {
  call("/console/api/votes?env=" + state.env + "&appId=" + state.current.appid).then(function (data) {
    state.votes = data.votes;
    drawDetail();
  }).catch(function (e) { toast(e.message, true); });
}

function select(options, value, labels) {
  var node = el("select");
  options.forEach(function (o) { node.appendChild(el("option", { value: o, text: labels ? labels[o] : o })); });
  node.value = value;
  return node;
}

function size(bytes) { return bytes < 1024 ? bytes + " B" : Math.round(bytes / 1024) + " KB"; }

var ANSWERS = { works: "Works", offline_only: "Works offline only", fails: "Does not work" };

/** What became of the report the app sent just before an answer, in the colour of what it means: nothing for an answer that has no state (it worked, or an older app). */
var REPORT_STATES = { sent: ["Report sent", "v-works", "The relay has the report"], waiting: ["Report waiting", "v-offline_only", "Kept on the device: no network, or the relay was busy"], refused: ["Report refused", "v-fails", "The relay would not take the report"], none: ["No report", "v-none", "None was made: the game is not installed, or the report is too large"] };
function reportPill(state) {
  var info = REPORT_STATES[state];
  return info ? el("span", { class: "pill " + info[1], text: info[0], title: info[2] }) : document.createTextNode("");
}

/** What the player answered for the game the report is about: the colour says which answer, "no vote" when there is none. */
function answerPill(r) {
  if (!r.verdict) return el("span", { class: "pill v-none", text: "No vote" });
  var text = ANSWERS[r.verdict] + (r.verdict === "works" && r.offline ? " (offline mode)" : "");
  return el("span", { class: "pill v-" + r.verdict, text: text });
}

/** The reports as a table. Each has what the player answered, whether it waits or was handled, a link that saves the zip and a button to mark it. A game name is shown when the reports are of several games. */
function reportsTable(reports, withGame, refresh, hidePlayer) {
  var head = (withGame ? ["Game"] : []).concat(hidePlayer ? [] : ["Player"], ["Device", "GamePort", "Day", "Answer", "State", "Size", ""]);
  var table = el("table", {}, [el("thead", {}, [el("tr", {}, head.map(function (h) { return el("th", { text: h }); }))])]);
  var body = el("tbody");
  reports.forEach(function (r) {
    var game = allGames().filter(function (g) { return g.appid === r.appId; })[0];
    // With the games of several apps in the table, the name opens the page of the game in this console.
    var nameText = el("a", {
      class: "game-link", href: "/console/" + state.env + "/" + r.appId, text: game ? game.name : "App " + r.appId,
      onclick: function (event) { event.preventDefault(); var g = game || { appid: r.appId, name: nameText.textContent, vr: false, installable: true, extra: true }; state.current = g; state.view = "game"; drawGames(); loadVotes(); },
    });
    var nameCell = withGame ? el("td", {}, [nameText]) : el("td", { text: game ? game.name : "App " + r.appId });
    var setName = function (text) { if (withGame) nameText.textContent = text; else nameCell.textContent = text; };
    if (!game && withGame) {
      game = { appid: r.appId, name: "App " + r.appId, vr: false, installable: true, extra: true };
      state.extra[r.appId] = game;
      // The name comes from Steam a moment later: it is written in the cell, the table is not drawn again.
      resolveName(game).then(function () { setName(game.name); });
    }
    // A game whose name is still being asked: the cell is written when the answer comes.
    if (game && game.pending) game.pending.then(function () { setName(game.name); });
    var toggle = el("button", { type: "button", class: "btn", text: r.handled ? "Reopen" : "Mark handled", onclick: function () {
      call("/console/api/report-handled", { id: r.id, handled: !r.handled })
        .then(function () { toast(r.handled ? "Back to waiting" : "Marked handled"); loadWaiting(); refresh(); }).catch(function (e) { toast(e.message, true); });
    } });
    var download = el("a", { class: "btn fill", href: "/console/api/report?env=" + state.env + "&id=" + r.id, download: "gameport-report-" + r.appId + "-" + r.id + ".zip", text: "Download" });
    var cells = (withGame ? [nameCell] : []).concat(hidePlayer ? [] : [el("td", {}, [playerLink(r.voter, r.label, true)])], [
      el("td", {}, [document.createTextNode(r.device), modelLine(r)]), el("td", { text: r.app }), el("td", { text: formatDay(r.updated) }),
      el("td", {}, [answerPill(r)]),
      el("td", {}, [r.handled ? el("span", { class: "muted", text: "Handled " + r.handled }) : el("span", { class: "todo", text: "To handle" })]),
      el("td", { text: size(r.size) }),
      el("td", {}, [el("div", { class: "actions" }, [download, toggle])]),
    ]);
    body.appendChild(el("tr", { class: r.handled ? "" : "waiting" }, cells));
  });
  table.appendChild(body);
  return el("div", { class: "scroll" }, [table]);
}

var reportsAsked = 0;

/** The small Discord mark, drawn from attributes only (the page's policy allows no style attribute). It stands before a name that is a Discord name. */
var DISCORD_PATH = "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z";
function discordIcon(size) {
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size || 14));
  svg.setAttribute("height", String(size || 14));
  svg.setAttribute("class", "discord-icon");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Discord name");
  var title = document.createElementNS(ns, "title");
  title.textContent = "Discord name";
  svg.appendChild(title);
  var path = document.createElementNS(ns, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", DISCORD_PATH);
  svg.appendChild(path);
  return svg;
}

/** A player as a link to everything they sent: the name given to them (a Discord name, say) when there is one, with the short hash beside it. */
function playerLink(hash, label, stacked) {
  var link = el("a", { class: "player-link", href: "/console/" + state.env + "/player/" + hash, title: "Everything this player sent",
    onclick: function (event) { event.preventDefault(); showPlayer(hash); } });
  link.appendChild(document.createTextNode(label || hash));
  if (!label) return link;
  // In a table the hash goes under the name, so the column stays narrow; in a line of text it follows the name. The mark says the name is a Discord name.
  return stacked ? el("div", { class: "player-cell" }, [el("span", {}, [discordIcon(), link]), el("small", { class: "muted", text: hash })]) : el("span", {}, [discordIcon(), link, el("small", { class: "muted", text: " " + hash })]);
}

/** The name of a game as a link that opens it in this console. A game that is not in the catalog is asked from Steam, and the link is written when the name comes. */
function gameLink(appId) {
  var game = allGames().filter(function (g) { return g.appid === appId; })[0];
  if (!game) {
    game = { appid: appId, name: "App " + appId, vr: false, installable: true, extra: true };
    state.extra[appId] = game;
    resolveName(game);
  }
  var link = el("a", { class: "game-link", href: "/console/" + state.env + "/" + appId, text: game.name,
    onclick: function (event) { event.preventDefault(); state.current = game; state.view = "game"; drawGames(); loadVotes(); } });
  if (game.pending) game.pending.then(function () { link.textContent = game.name; });
  return link;
}

var playerAsked = 0;

/** Everything one player sent: the name given to them, their answers on every game, and their reports. */
function showPlayer(hash) {
  state.current = null;
  state.view = "player";
  state.playerId = hash;
  var mine = ++playerAsked;
  drawGames();
  var panel = document.getElementById("detail");
  panel.textContent = "";
  var heading = el("h2", { text: "Player " + hash });
  panel.appendChild(heading);
  call("/console/api/player?env=" + state.env + "&voter=" + hash).then(function (data) {
    // Only the last request draws: a second click, or a switch of environment, must not add a second page.
    if (mine !== playerAsked || state.view !== "player") return;
    if (data.label) {
      heading.textContent = "";
      heading.appendChild(discordIcon(18));
      heading.appendChild(document.createTextNode(data.label + " "));
      heading.appendChild(el("small", { class: "muted", text: hash }));
    }
    var name = el("input", { type: "text", class: "field", maxlength: "40", value: data.label || "", placeholder: "Name of this player (a Discord name, for example)", "aria-label": "Name of this player" });
    var save = el("button", { type: "button", class: "btn fill", text: "Save the name", onclick: function () {
      var typed = name.value.trim();
      call("/console/api/player-label", { voter: hash, label: typed }).then(function () { toast(typed ? "Name saved" : "Name removed"); loadWaiting(); showPlayer(hash); }).catch(function (e) { toast(e.message, true); });
    } });
    panel.appendChild(el("div", { class: "player-edit" }, [name, save]));
    panel.appendChild(el("p", { class: "muted", text: "The name stays in the relay's database and in this console. The app and the site never see it." }));

    panel.appendChild(el("h2", { text: "Answers (" + data.votes.length + ")" }));
    if (!data.votes.length) panel.appendChild(el("p", { class: "muted", text: "No answer from this player." }));
    else {
      var table = el("table", {}, [el("thead", {}, [el("tr", {}, ["Game", "Answer", "Device", "GamePort", "Day", "Problems", "Report"].map(function (h) { return el("th", { text: h }); }))])]);
      var body = el("tbody");
      data.votes.forEach(function (v) {
        var codes = (v.issues || "").split(",").filter(Boolean);
        var shown = v.fixed ? { verdict: "works", offline: false } : v;
        body.appendChild(el("tr", {}, [
          el("td", {}, [gameLink(v.appId)]),
          el("td", {}, [answerPill(shown), v.fixed ? el("small", { class: "muted", text: " fixed " + formatDay(v.fixed) + ", was " + ANSWERS[v.verdict] }) : null]),
          el("td", {}, [document.createTextNode(v.device), modelLine(v)]),
          el("td", { text: v.app }),
          el("td", { text: formatDay(v.updated) }),
          el("td", {}, [codes.length ? issuePills(codes) : document.createTextNode("")]),
          el("td", {}, [reportPill(v.reportState)]),
        ]));
      });
      table.appendChild(body);
      panel.appendChild(el("div", { class: "scroll" }, [table]));
    }

    panel.appendChild(el("h2", { text: "Reports (" + data.reports.length + ")" }));
    panel.appendChild(data.reports.length ? reportsTable(data.reports, true, function () { showPlayer(hash); }, true) : el("p", { class: "muted", text: "No report from this player." }));
  }).catch(function (e) { toast(e.message, true); });
}

/** The day (UTC) a game became installable on Android, as the catalog tells it: only the games that have one can be news. */
function newGames(since) {
  return state.games.filter(function (g) { return g.androidSince && g.androidSince > since; });
}

/** What is new since the last time the news were opened: the badge of the button. The votes come from the relay, the games from the catalog. */
function loadNews() {
  return call("/console/api/news?env=" + state.env).then(function (data) {
    state.news = data;
    var total = data.votes.count + newGames(data.gamesSince).length;
    var badge = document.getElementById("news-count");
    badge.textContent = String(total);
    badge.hidden = !total;
  }).catch(function () { state.news = null; });
}

function dayOffset(offset) {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
}

/** The news: the votes saved since the last visit and the games that came to Android, with a filter on the days. Opening them marks them as seen. */
function showNews() {
  state.current = null;
  state.view = "news";
  drawGames();
  var panel = document.getElementById("detail");
  panel.textContent = "";
  panel.appendChild(el("h2", { text: "What is new (" + (state.env === "prod" ? "production" : "test") + ")" }));
  call("/console/api/news?env=" + state.env).then(function (data) {
    if (state.view !== "news") return;
    drawNews(panel, data);
    // Seen from now on: the list stays on screen until another page is opened, and the badge goes.
    Promise.all([call("/console/api/seen", { env: state.env, what: "votes" }), call("/console/api/seen", { env: state.env, what: "games" })]).then(function () {
      state.news = { votesSince: data.votesSince, gamesSince: data.gamesSince, votes: { count: 0, games: [] } };
      var badge = document.getElementById("news-count");
      badge.hidden = true;
    }).catch(function () {});
  }).catch(function (e) { toast(e.message, true); });
}

function drawNews(panel, data) {
  var votes = data.votes;
  panel.appendChild(el("h3", { text: "Votes since " + data.votesSince.slice(0, 13).replace("T", " ") + " UTC" }));
  if (!votes.count) panel.appendChild(el("p", { class: "muted", text: "No new vote." }));
  else {
    panel.appendChild(el("div", { class: "totals" }, [
      el("span", { class: "chip", text: votes.count + (votes.count === 1 ? " vote" : " votes") }),
      el("span", { class: "chip" }, [el("span", { class: "dot d-works" }), document.createTextNode(String(votes.works))]),
      el("span", { class: "chip" }, [el("span", { class: "dot d-offline_only" }), document.createTextNode(String(votes.offlineOnly))]),
      el("span", { class: "chip" }, [el("span", { class: "dot d-fails" }), document.createTextNode(String(votes.fails))]),
    ]));
    var table = el("table", {}, [el("thead", {}, [el("tr", {}, ["Game", "New votes", "Works", "Offline only", "Does not work"].map(function (h) { return el("th", { text: h }); }))])]);
    var body = el("tbody");
    votes.games.forEach(function (row) {
      var game = allGames().filter(function (g) { return g.appid === row.appId; })[0] || { appid: row.appId, name: "App " + row.appId, vr: false, installable: true, extra: true };
      if (game.extra && !state.extra[game.appid]) { state.extra[game.appid] = game; resolveName(game); }
      var open = el("button", { type: "button", class: "btn", text: game.name, onclick: function () { state.current = game; state.view = "game"; drawGames(); loadVotes(); } });
      body.appendChild(el("tr", {}, [el("td", {}, [open]), el("td", { text: String(row.n) }), el("td", { text: String(row.works) }), el("td", { text: String(row.offlineOnly) }), el("td", { text: String(row.fails) })]));
    });
    table.appendChild(body);
    panel.appendChild(el("div", { class: "scroll" }, [table]));
  }

  panel.appendChild(el("h3", { class: "gap", text: "Games that came to Android" }));
  var today = dayOffset(0);
  var yesterday = dayOffset(-1);
  var filters = [
    { id: "since", label: "Since my last visit (" + data.gamesSince + ")", keep: function (g) { return g.androidSince > data.gamesSince; } },
    { id: "today", label: "Today", keep: function (g) { return g.androidSince === today; } },
    { id: "yesterday", label: "Yesterday", keep: function (g) { return g.androidSince === yesterday; } },
  ];
  var chosen = "since";
  var chips = el("div", { class: "totals" });
  var list = el("div");
  var draw = function () {
    chips.textContent = "";
    list.textContent = "";
    filters.forEach(function (f) {
      var count = state.games.filter(function (g) { return g.androidSince && f.keep(g); }).length;
      chips.appendChild(el("button", { type: "button", class: "chip", "aria-pressed": String(f.id === chosen), text: f.label + " · " + count, onclick: function () { chosen = f.id; draw(); } }));
    });
    var keep = filters.filter(function (f) { return f.id === chosen; })[0].keep;
    var shown = state.games.filter(function (g) { return g.androidSince && keep(g); }).sort(function (a, b) { return b.androidSince.localeCompare(a.androidSince) || a.name.localeCompare(b.name); });
    if (!shown.length) list.appendChild(el("p", { class: "muted", text: "No game." }));
    var day = "";
    shown.forEach(function (g) {
      if (g.androidSince !== day) { day = g.androidSince; list.appendChild(el("div", { class: "day", text: day })); }
      list.appendChild(el("button", { type: "button", class: "game", onclick: function () { state.current = g; state.view = "game"; drawGames(); loadVotes(); } }, [
        g.cover ? el("img", { src: g.cover, alt: "", loading: "lazy" }) : el("span"),
        el("span", { class: "t" }, [el("b", { text: g.name }), el("small", { text: (g.type || "game") + " · " + (g.vr ? "VR" : "Flat") })]),
      ]));
    });
  };
  draw();
  panel.appendChild(chips);
  panel.appendChild(list);
}

function showLatestReports() {
  state.current = null;
  state.view = "reports";
  var mine = ++reportsAsked;
  drawGames();
  var panel = document.getElementById("detail");
  panel.textContent = "";
  panel.appendChild(el("h2", { text: "Latest reports (" + (state.env === "prod" ? "production" : "test") + ")" }));
  call("/console/api/reports?env=" + state.env).then(function (data) {
    // Only the last request draws: a switch of environment, or a second click, must not add a second table.
    if (mine !== reportsAsked || state.view !== "reports") return;
    panel.appendChild(data.reports.length ? reportsTable(data.reports, true, showLatestReports) : el("p", { class: "muted", text: "No report." }));
  }).catch(function (e) { toast(e.message, true); });
}

/** Writes the price of an app after the text of a button: free, or what it costs and, on sale, the discount. */
function addPrice(link, appId, game, skipFree) {
  call("/console/api/price?id=" + appId).then(function (p) {
    if (state.current !== game) return;
    var text = p.free ? (skipFree ? "" : "Free") : p.price ? (p.discount ? "-" + p.discount + "% " : "") + p.price : "";
    if (text) link.appendChild(document.createTextNode(" · " + text));
  }).catch(function () {});
}

/** The Steam logo, drawn as an element: no image to load, so nothing for the page's policy to refuse. */
function steamLogo() {
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("aria-hidden", "true");
  var path = document.createElementNS(ns, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", "M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z");
  svg.appendChild(path);
  return svg;
}

/** The SteamDB page of an app, as a pill with a small database icon. */
function steamdbLink(appId, title) {
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  var top = document.createElementNS(ns, "ellipse");
  top.setAttribute("cx", "12"); top.setAttribute("cy", "6"); top.setAttribute("rx", "7"); top.setAttribute("ry", "3");
  var middle = document.createElementNS(ns, "path");
  middle.setAttribute("d", "M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6");
  var bottom = document.createElementNS(ns, "path");
  bottom.setAttribute("d", "M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6");
  svg.appendChild(top); svg.appendChild(middle); svg.appendChild(bottom);
  var link = el("a", { class: "pill", href: "https://steamdb.info/app/" + appId + "/", target: "_blank", rel: "noopener", title: title });
  link.appendChild(svg);
  link.appendChild(document.createTextNode("SteamDB"));
  return link;
}

function drawDetail() {
  var g = state.current;
  var panel = document.getElementById("detail");
  panel.textContent = "";
  var hero = el("div", { class: "hero" }, [el("div", {}, [
    el("h2", { text: g.name }),
    el("div", { class: "meta", text: (g.extra ? "Not in the catalog" + (g.type ? " · " + g.type : "") : (g.vr ? "VR" : "Flat")) + " · App " + g.appid + (g.installable || g.extra ? "" : " · not published yet") + (g.why ? " · name unknown: " + g.why : "") }),
  ])]);
  // The demos of this game (apps of the catalog whose parent it is), or the game a demo belongs to: a link opens each in the console, another goes to Steam.
  var demos = state.games.filter(function (d) { return d.parent === g.appid && d.type === "demo"; });
  var parentGame = g.parent ? state.games.filter(function (d) { return d.appid === g.parent; })[0] : null;
  var links = el("div", { class: "related" });
  var steamLink = el("a", { class: "pill", href: "https://store.steampowered.com/app/" + g.appid, target: "_blank", rel: "noopener" });
  steamLink.appendChild(steamLogo());
  steamLink.appendChild(document.createTextNode("Steam"));
  links.appendChild(steamLink);
  // The price, as the store shows it, inside the button: free, or what it costs and, on sale, the discount. "Free" says nothing of a demo or a playtest.
  addPrice(steamLink, g.appid, g, g.type === "demo" || g.type === "playtest");
  links.appendChild(steamdbLink(g.appid, "SteamDB: " + g.name));
  {
    demos.forEach(function (d) {
      links.appendChild(el("a", { class: "pill", href: "/console/" + state.env + "/" + d.appid, text: "Demo: " + d.name }));
      links.appendChild(el("a", { class: "pill", href: "https://store.steampowered.com/app/" + d.appid, target: "_blank", rel: "noopener", text: "Steam" }));
    });
    if (g.parent) {
      // The full game of a demo or a playtest, on Steam, with its price.
      var parentLink = el("a", { class: "pill", href: "https://store.steampowered.com/app/" + g.parent, target: "_blank", rel: "noopener", title: parentGame ? parentGame.name : "App " + g.parent });
      parentLink.appendChild(steamLogo());
      parentLink.appendChild(document.createTextNode("View game"));
      links.appendChild(parentLink);
      addPrice(parentLink, g.parent, g, false);
      links.appendChild(steamdbLink(g.parent, "SteamDB: the full game"));
    }
  }
  hero.querySelector("div").appendChild(links);
  // Set through the style object: a style attribute would be refused by the page's policy.
  if (g.banner || g.header) hero.style.backgroundImage = "url('" + (g.banner || g.header) + "')";
  panel.appendChild(hero);

  // One card per kind of device: the three answers, and under them what the players ticked as going wrong (the votes that still are a problem).
  var overview = el("div", { class: "overview" });
  var counted = state.votes.map(function (v) { return Object.assign({}, v, { verdict: v.fixed ? "works" : v.verdict }); });
  DEVICES.forEach(function (d) {
    var own = counted.filter(function (v) { return v.device === d; });
    if (!own.length) return;
    var number = function (verdict) { return own.filter(function (v) { return v.verdict === verdict; }).length; };
    var counts = el("div", { class: "counts" });
    [["works", "Works"], ["offline_only", "Offline only"], ["fails", "Does not work"]].forEach(function (pair) {
      var n = number(pair[0]);
      counts.appendChild(el("span", { class: "count" + (n ? "" : " zero") }, [el("span", { class: "dot d-" + pair[0] }), document.createTextNode(pair[1] + " " + n)]));
    });
    var card = el("div", { class: "dev-card" }, [el("h3", { text: d }), counts]);
    var tally = {};
    state.votes.filter(function (v) { return !v.fixed && v.device === d; }).forEach(function (v) {
      (v.issues || "").split(",").filter(Boolean).forEach(function (code) { tally[code] = (tally[code] || 0) + 1; });
    });
    var codes = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; });
    if (codes.length) {
      card.appendChild(el("div", { class: "issues-label", text: "Problems reported" }));
      card.appendChild(issuePills(codes.map(function (c) { return [c, tally[c]]; })));
    }
    overview.appendChild(card);
  });
  if (!overview.childNodes.length) overview.appendChild(el("span", { class: "chip", text: "No vote counted" }));
  panel.appendChild(overview);

  panel.appendChild(el("div", { id: "incompat" }));
  drawIncompatible();

  var device = select(DEVICES, "quest");
  var verdict = select(Object.keys(VERDICTS), "works", VERDICTS);
  var offline = el("input", { type: "checkbox", id: "add-offline" });
  var offlineLabel = el("label", { class: "muted" }, [offline, document.createTextNode(" tried offline")]);
  var version = el("input", { type: "text", class: "field wide", "aria-label": "GamePort version", placeholder: "GamePort version, optional", maxlength: "32" });
  // What went wrong, to tick (several) for a vote that says something did: a dropdown with a box for each.
  var pressed = {};
  var multiSummary = el("summary", { text: "Problems: none" });
  var multiMenu = el("div", { class: "multi-menu" });
  Object.keys(ISSUE_LABELS).forEach(function (code) {
    var box = el("input", { type: "checkbox" });
    box.addEventListener("change", function () {
      pressed[code] = box.checked;
      var names = Object.keys(ISSUE_LABELS).filter(function (c) { return pressed[c]; }).map(function (c) { return ISSUE_LABELS[c]; });
      multiSummary.textContent = names.length ? "Problems: " + names.length + " (" + names.join(", ") + ")" : "Problems: none";
    });
    multiMenu.appendChild(el("label", {}, [box, document.createTextNode(ISSUE_LABELS[code])]));
  });
  var ticks = el("details", { class: "multi" }, [multiSummary, multiMenu]);
  var showTicks = function () { ticks.hidden = verdict.value === "works"; };
  verdict.addEventListener("change", showTicks);
  showTicks();
  var add = el("button", { type: "button", class: "btn fill", text: "Add a vote", onclick: function () {
    var message = { appId: g.appid, device: device.value, verdict: verdict.value, offline: offline.checked };
    var typed = version.value.trim();
    if (typed && !/^[0-9A-Za-z._-]{1,32}$/.test(typed)) { toast("The version: letters, digits, dots, dashes only", true); return; }
    if (typed) message.app = typed;
    var ticked = Object.keys(ISSUE_LABELS).filter(function (code) { return pressed[code]; });
    if (verdict.value !== "works" && ticked.length) message.issues = ticked;
    if (!confirmWrite("Add a vote: " + g.name + ", " + device.value + ", " + VERDICTS[verdict.value] + ".")) return;
    call("/console/api/add", message).then(function () { toast("Vote added"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
  } });
  // Folded: it is a testing tool, and an open form invites a vote nobody meant to add.
  panel.appendChild(el("details", { class: "incompat" }, [
    el("summary", { text: "New vote (to try the console)" }),
    el("div", { class: "add" }, [device, verdict, ticks, version, offlineLabel, add]),
  ]));

  var reports = el("div");
  call("/console/api/reports?env=" + state.env + "&appId=" + g.appid).then(function (data) {
    if (!data.reports.length) return;
    reports.appendChild(el("h2", { text: "Reports of this game" }));
    reports.appendChild(reportsTable(data.reports, false, drawDetail));
  }).catch(function () {});
  var shown = state.votes.filter(function (v) { return state.device === "all" || v.device === state.device; });
  if (!shown.length) { panel.appendChild(el("p", { class: "muted", text: state.votes.length ? "No vote for this game on this device." : "No vote for this game." })); panel.appendChild(reports); return; }
  var list = el("div", { class: "votes" });
  shown.forEach(function (v) { list.appendChild(row(v)); });
  panel.appendChild(list);
  panel.appendChild(el("div", { class: "gap" }, [reports]));
}

var ISSUE_LABELS = { no_image: "Nothing shows", flat_window: "Flat window instead of VR", closes: "Closes by itself", stuck_loading: "Stuck on loading", no_controls: "Controls missing or wrong", no_sound: "No sound", no_online: "Cannot play online", slow: "Slow or stuttering", no_passthrough: "No passthrough", visual: "Wrong colors or broken image", other: "Something else" };

/** What the device calls itself under the kind of device: its name when the list knows it, with the model, or the raw model and codename. Nothing for a vote that has none. */
function modelLine(v) {
  if (!v.model && !v.codename) return document.createTextNode("");
  var raw = [v.model, v.codename].filter(Boolean).join(" / ");
  var box = el("div", { class: "dev", title: raw });
  if (v.deviceName) box.appendChild(el("div", { class: "dev-name", text: v.deviceName }));
  // With a name, the model is enough (the codename is in the tooltip); without one, everything the device said, one code per line.
  (v.deviceName ? [v.model || v.codename] : [v.model, v.codename].filter(Boolean)).forEach(function (code) { box.appendChild(el("div", { class: "dev-code", text: code })); });
  return box;
}

/** A day written YYYY-MM-DD, shown the way the browser of whoever reads the console writes dates. Anything else is shown as it is. */
function formatDay(day) {
  var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(day || "");
  if (!m) return day || "";
  var date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** The problems as small red pills, each with its count when there is one. [counts] is a list of [code, count] or of codes. */
function issuePills(items) {
  var list = el("div", { class: "issue-list" });
  items.forEach(function (item) {
    var code = Array.isArray(item) ? item[0] : item;
    var pill = el("span", { class: "issue" }, [document.createTextNode(ISSUE_LABELS[code] || code)]);
    if (Array.isArray(item)) pill.appendChild(el("b", { text: String(item[1]) }));
    list.appendChild(pill);
  });
  return list;
}

function row(v) {
  var g = state.current;
  var device = select(DEVICES, v.device);
  // A vote marked fixed counts, and shows, as "works".
  var answer = v.fixed ? "works" : v.verdict;
  var verdict = select(Object.keys(VERDICTS), answer, VERDICTS);
  var offline = el("input", { type: "checkbox" });
  offline.checked = v.offline;
  var dirty = function () { return device.value !== v.device || verdict.value !== answer || offline.checked !== v.offline; };
  var save = el("button", { type: "button", class: "btn", text: "Save", disabled: "disabled", onclick: function () {
    if (!confirmWrite("Change a vote of " + g.name + ": " + v.device + ", " + VERDICTS[answer] + " becomes " + device.value + ", " + VERDICTS[verdict.value] + ".")) return;
    call("/console/api/change", { appId: g.appid, voter: v.voter, device: device.value, verdict: verdict.value, offline: offline.checked })
      .then(function () { toast("Saved"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
  } });
  // The answer shows its colour, and Save only appears once something is changed.
  verdict.className = "ans-" + verdict.value;
  save.hidden = true;
  [device, verdict, offline].forEach(function (n) { n.addEventListener("change", function () { verdict.className = "ans-" + verdict.value; save.hidden = !dirty(); }); });

  var fixedBtn = el("button", { type: "button", class: "btn", text: v.fixed ? "Not fixed" : "Mark fixed", onclick: function () {
    if (v.fixed) {
      if (!confirmWrite("Count this vote as it was, not fixed: " + g.name + ", " + v.device + ", " + VERDICTS[v.verdict] + ".")) return;
      call("/console/api/change", { appId: g.appid, voter: v.voter, fixed: false }).then(function () { toast("Back to the answer given"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
      return;
    }
    var where = window.prompt("Fixed in which version? (optional, for example 0.9.0)", "");
    if (where === null) return;
    where = where.trim();
    if (where && !/^[0-9A-Za-z._ -]{1,32}$/.test(where)) { toast("Letters, digits, dots, dashes and spaces only", true); return; }
    if (!confirmWrite("Mark as fixed, counted as works: " + g.name + ", " + v.device + ", " + VERDICTS[v.verdict] + ".")) return;
    var message = { appId: g.appid, voter: v.voter, fixed: true };
    if (where) message.fixedIn = where;
    call("/console/api/change", message).then(function () { toast("Marked fixed"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
  } });
  var del = el("button", { type: "button", class: "btn danger", text: "Delete", onclick: function () {
    if (!window.confirm((state.env === "prod" ? "PRODUCTION\\n\\n" : "") + "Delete this vote?\\n" + g.name + ", " + v.device + ", " + VERDICTS[v.verdict] + ", " + v.updated)) return;
    call("/console/api/remove", { appId: g.appid, voter: v.voter }).then(function () { toast("Deleted"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
  } });

  // The rare, destructive action goes behind a menu: "Mark fixed" is the one that is used.
  var more = el("details", { class: "more" }, [el("summary", { text: "\u2026", title: "More" }), el("div", { class: "more-menu" }, [del])]);
  var codes = (v.issues || "").split(",").filter(Boolean);
  var state2 = v.fixed ? "Fixed " + formatDay(v.fixed) + (v.fixedIn ? " in " + v.fixedIn : "") + ", was " + VERDICTS[v.verdict] : "";

  // Changing a vote is rare too: its fields stay folded until "Edit" is pressed.
  var editor = el("div", { class: "vote-edit", hidden: "hidden" }, [
    el("label", {}, [document.createTextNode("Device "), device]), el("label", {}, [document.createTextNode("Answer "), verdict]),
    el("label", { class: "check" }, [offline, document.createTextNode(" Worked offline")]), save,
  ]);
  var edit = el("button", { type: "button", class: "btn", text: "Edit", onclick: function () { editor.hidden = !editor.hidden; } });

  // The title is what the device is: its name when the list knows it, the kind of device otherwise, the model and the codename in its tooltip.
  var title = v.deviceName || (v.model ? v.model : v.device);
  // What the title already says is not repeated: with a name, neither the kind of device nor the model; with a raw model as the title, the kind of device only.
  var details = [v.deviceName || title === v.device ? null : v.device, v.updated ? formatDay(v.updated) : null, v.voter, v.offline ? "worked offline" : null, state2 || null].filter(Boolean);
  return el("div", { class: "vote v-" + answer, title: VERDICTS[answer] }, [
    el("div", { class: "vote-main" }, [
      el("div", { class: "vote-title" }, [el("strong", { text: title, title: [v.model, v.codename].filter(Boolean).join(" / ") }), el("span", { class: "ver", title: "Version of GamePort that sent this vote", text: "- " + v.app })]),
      codes.length ? issuePills(codes) : document.createTextNode(""),
      v.reportState ? el("div", { class: "report-state" }, [reportPill(v.reportState)]) : document.createTextNode(""),
      el("div", { class: "vote-meta" }, details.map(function (piece, i) {
        var part = piece === v.voter ? el("span", {}, [playerLink(v.voter, v.label), document.createTextNode(v.app === "admin" ? " (admin)" : "")]) : document.createTextNode(piece);
        return i ? el("span", {}, [document.createTextNode(" \u00b7 "), part]) : part;
      })),
    ]),
    el("div", { class: "actions" }, [fixedBtn, edit, more]),
    editor,
  ]);
}

/** The menu of the status filter: one box per status, any number ticked; the closed box says what is ticked. */
var STATUS_CHOICES = [["works", "Works", "#4cc38a"], ["offline_only", "Works offline only", "#f0b24a"], ["fails", "Does not work", "#ef6b6b"]];
function drawStatusMenu() {
  var menu = document.getElementById("status-menu");
  STATUS_CHOICES.forEach(function (choice) {
    var box = el("input", { type: "checkbox", value: choice[0], "aria-label": choice[1] });
    box.addEventListener("change", function () {
      state.statuses[choice[0]] = box.checked;
      var names = STATUS_CHOICES.filter(function (c) { return state.statuses[c[0]]; }).map(function (c) { return c[1]; });
      document.getElementById("status-label").textContent = names.length ? names.join(", ") : "All statuses";
      drawGames();
    });
    // The colour comes from a class: the page's policy allows no style attribute.
    var dot = el("span", { class: "sdot sdot-" + choice[2].slice(1) });
    menu.appendChild(el("label", {}, [box, dot, document.createTextNode(choice[1])]));
  });
}
drawStatusMenu();
document.addEventListener("click", function (event) { var box = document.getElementById("status"); if (box.open && !box.contains(event.target)) box.open = false; });
document.addEventListener("keydown", function (event) { if (event.key === "Escape") document.getElementById("status").open = false; });
document.getElementById("b-test").addEventListener("click", function () { setEnv("test"); });
document.getElementById("b-prod").addEventListener("click", function () { setEnv("prod"); });
document.getElementById("q").addEventListener("input", drawGames);
document.getElementById("device").addEventListener("change", function () {
  state.device = this.value;
  drawGames();
  if (state.view === "game" && state.current) drawDetail();
});
document.getElementById("latest").addEventListener("click", showLatestReports);
document.getElementById("reasons").addEventListener("click", showReasons);
document.getElementById("news").addEventListener("click", showNews);
document.getElementById("only").addEventListener("click", function () {
  state.onlyVoted = !state.onlyVoted;
  this.setAttribute("aria-pressed", String(state.onlyVoted));
  drawGames();
});

fetch(CATALOG).then(function (r) { return r.json(); }).then(function (data) {
  state.games = data.apps.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  // The address says what to open: /console/prod/1125240 a game in production, /console/test/reports or /news or /reasons a page, ?voted only the games with votes.
  // The old addresses (#1125240/prod, #reports, #voted) still open the same thing, and are rewritten.
  var route = location.pathname.match(/^\\/console\\/(test|prod)(?:\\/(\\d+|reports|news|reasons|player\\/[0-9a-f]{12}))?\\/?$/);
  var env = route ? route[1] : "test";
  var section = route ? route[2] : null;
  var old = location.hash.match(/^#(?:(\\d+)|(reports))(\\/prod)?$/);
  if (!route && old) { env = old[3] ? "prod" : "test"; section = old[1] || old[2]; }
  if (location.search === "?voted" || location.hash === "#voted") { state.onlyVoted = true; document.getElementById("only").setAttribute("aria-pressed", "true"); }
  setEnv(env);
  if (section === "reports") showLatestReports();
  else if (section === "news") showNews();
  else if (section === "reasons") showReasons();
  else if (section && section.indexOf("player/") === 0) showPlayer(section.slice(7));
  else if (section) {
    var id = Number(section);
    var found = state.games.filter(function (g) { return g.appid === id; })[0];
    if (!found) { found = { appid: id, name: "App " + id, vr: false, installable: true, extra: true }; state.extra[id] = found; resolveName(found); }
    state.current = found; state.view = "game"; drawGames(); loadVotes();
  }
  state.ready = true;
  history.replaceState(null, "", "/console/" + state.env + (section ? "/" + section : "") + (state.onlyVoted ? "?voted" : ""));
}).catch(function () { toast("The catalog could not be read", true); setEnv("test"); });
window.addEventListener("popstate", function () { location.reload(); });
</script>
</body>
</html>`;
}
