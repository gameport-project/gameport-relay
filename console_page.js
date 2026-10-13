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
.chip { padding:3px 12px; border-radius:999px; background:rgba(255,255,255,.08); border:1px solid var(--line); font-size:13px; }
.add { display:flex; flex-wrap:wrap; gap:10px; align-items:center; padding:12px; border:1px dashed var(--line); border-radius:12px; margin-bottom:16px; }
select, .field { cursor:pointer; }
select { height:38px; padding:0 10px; background:#0f131b; border:1px solid var(--line); border-radius:10px; }
.btn { height:38px; padding:0 16px; border-radius:999px; border:1px solid var(--line); background:rgba(255,255,255,.07); cursor:pointer; font-weight:600; }
.btn:hover { background:rgba(255,255,255,.15); }
.btn.fill { background:#fff; color:#111; border-color:transparent; }
.btn.danger { color:#ff8a8a; }
.btn[disabled] { opacity:.4; cursor:default; }
table { width:100%; border-collapse:collapse; }
th { text-align:left; color:var(--muted); font-weight:500; font-size:13px; padding:6px 8px; }
td { padding:8px; border-top:1px solid var(--line); vertical-align:middle; }
tr.fixed td:not(:last-child) { opacity:.55; }
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
var state = { env: "test", games: [], current: null, votes: [], counts: {}, onlyVoted: false, incompat: {}, reasons: [], view: "", extra: {}, unhandled: 0, waiting: {}, news: null };

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
  holder.appendChild(el("div", { class: "add stack" }, children));
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
  return fetch(path).then(function (r) { return r.ok ? r.json() : { games: [] }; }).then(function (data) {
    state.counts = {};
    (data.games || []).forEach(function (g) { state.counts[g.appId] = { total: g.works + g.offlineOnly + g.fails, works: g.works, offline_only: g.offlineOnly, fails: g.fails }; });
    // The votes of an app that is not in the catalog (a demo, a game without an Android version) still have to be reachable: the name comes from Steam.
    Object.keys(state.counts).forEach(function (id) {
      var n = Number(id);
      if (state.games.some(function (g) { return g.appid === n; }) || state.extra[n]) return;
      state.extra[n] = { appid: n, name: "App " + n, vr: false, installable: true, extra: true };
      resolveName(state.extra[n]);
    });
  }).catch(function () { state.counts = {}; });
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

function drawGames() {
  var q = document.getElementById("q").value.trim().toLowerCase();
  if (/^\\d{1,10}$/.test(q) && Number(q) >= 1 && Number(q) <= 2000000000 && !allGames().some(function (g) { return g.appid === Number(q); })) {
    state.extra[Number(q)] = { appid: Number(q), name: "App " + q, vr: false, installable: true, extra: true };
    resolveName(state.extra[Number(q)]);
  }
  var box = document.getElementById("games");
  box.textContent = "";
  allGames().filter(function (g) {
    if (state.onlyVoted && !(state.counts[g.appid] && state.counts[g.appid].total)) return false;
    return !q || g.name.toLowerCase().indexOf(q) !== -1 || String(g.appid) === q;
  }).slice(0, 200).forEach(function (g) {
    var c = state.counts[g.appid];
    var n = c && c.total ? c : null;
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

/** What the player answered for the game the report is about: the colour says which answer, "no vote" when there is none. */
function answerPill(r) {
  if (!r.verdict) return el("span", { class: "pill v-none", text: "No vote" });
  var text = ANSWERS[r.verdict] + (r.verdict === "works" && r.offline ? " (offline mode)" : "");
  return el("span", { class: "pill v-" + r.verdict, text: text });
}

/** The reports as a table. Each has what the player answered, whether it waits or was handled, a link that saves the zip and a button to mark it. A game name is shown when the reports are of several games. */
function reportsTable(reports, withGame, refresh) {
  var head = (withGame ? ["Game"] : []).concat(["Device", "GamePort", "Day", "Answer", "State", "Size", ""]);
  var table = el("table", {}, [el("thead", {}, [el("tr", {}, head.map(function (h) { return el("th", { text: h }); }))])]);
  var body = el("tbody");
  reports.forEach(function (r) {
    var game = allGames().filter(function (g) { return g.appid === r.appId; })[0];
    var nameCell = el("td", { text: game ? game.name : "App " + r.appId });
    if (!game && withGame) {
      game = { appid: r.appId, name: "App " + r.appId, vr: false, installable: true, extra: true };
      state.extra[r.appId] = game;
      // The name comes from Steam a moment later: it is written in the cell, the table is not drawn again.
      resolveName(game).then(function () { nameCell.textContent = game.name; });
    }
    // A game whose name is still being asked: the cell is written when the answer comes.
    if (game && game.pending) game.pending.then(function () { nameCell.textContent = game.name; });
    var toggle = el("button", { type: "button", class: "btn", text: r.handled ? "Reopen" : "Mark handled", onclick: function () {
      call("/console/api/report-handled", { id: r.id, handled: !r.handled })
        .then(function () { toast(r.handled ? "Back to waiting" : "Marked handled"); loadWaiting(); refresh(); }).catch(function (e) { toast(e.message, true); });
    } });
    var download = el("a", { class: "btn fill", href: "/console/api/report?env=" + state.env + "&id=" + r.id, download: "gameport-report-" + r.appId + "-" + r.id + ".zip", text: "Download" });
    var cells = (withGame ? [nameCell] : []).concat([
      el("td", { text: r.device }), el("td", { text: r.app }), el("td", { text: r.updated }),
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
  if (demos.length || g.parent) {
    var links = el("div", { class: "related" });
    demos.forEach(function (d) {
      links.appendChild(el("a", { class: "pill", href: "#" + d.appid + (state.env === "prod" ? "/prod" : ""), text: "Demo: " + d.name, onclick: function () { setTimeout(function () { location.reload(); }, 0); } }));
      links.appendChild(el("a", { class: "pill", href: "https://store.steampowered.com/app/" + d.appid, target: "_blank", rel: "noopener", text: "Steam" }));
    });
    if (g.parent) {
      links.appendChild(el("a", { class: "pill", href: "https://store.steampowered.com/app/" + g.parent, target: "_blank", rel: "noopener", text: "Demo of " + (parentGame ? parentGame.name : "App " + g.parent) }));
    }
    hero.querySelector("div").appendChild(links);
  }
  // Set through the style object: a style attribute would be refused by the page's policy.
  if (g.banner || g.header) hero.style.backgroundImage = "url('" + (g.banner || g.header) + "')";
  panel.appendChild(hero);

  var totals = el("div", { class: "totals" });
  var counted = state.votes.filter(function (v) { return !v.fixed; });
  DEVICES.forEach(function (d) {
    var own = counted.filter(function (v) { return v.device === d; });
    if (!own.length) return;
    var w = own.filter(function (v) { return v.verdict === "works"; }).length;
    var o = own.filter(function (v) { return v.verdict === "offline_only"; }).length;
    var f = own.filter(function (v) { return v.verdict === "fails"; }).length;
    totals.appendChild(el("span", { class: "chip" }, [
      el("b", { text: d + "  " }),
      el("span", { class: "dot d-works" }), document.createTextNode(w + "  "),
      el("span", { class: "dot d-offline_only" }), document.createTextNode(o + "  "),
      el("span", { class: "dot d-fails" }), document.createTextNode(String(f)),
    ]));
  });
  if (!totals.childNodes.length) totals.appendChild(el("span", { class: "chip", text: "No vote counted" }));
  panel.appendChild(totals);

  panel.appendChild(el("div", { id: "incompat" }));
  drawIncompatible();

  var device = select(DEVICES, "quest");
  var verdict = select(Object.keys(VERDICTS), "works", VERDICTS);
  var offline = el("input", { type: "checkbox", id: "add-offline" });
  var offlineLabel = el("label", { class: "muted" }, [offline, document.createTextNode(" tried offline")]);
  var add = el("button", { type: "button", class: "btn fill", text: "Add a vote", onclick: function () {
    var message = { appId: g.appid, device: device.value, verdict: verdict.value, offline: offline.checked };
    if (!confirmWrite("Add a vote: " + g.name + ", " + device.value + ", " + VERDICTS[verdict.value] + ".")) return;
    call("/console/api/add", message).then(function () { toast("Vote added"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
  } });
  panel.appendChild(el("div", { class: "add" }, [el("strong", { text: "New vote" }), device, verdict, offlineLabel, add]));

  var reports = el("div");
  call("/console/api/reports?env=" + state.env + "&appId=" + g.appid).then(function (data) {
    if (!data.reports.length) return;
    reports.appendChild(el("h2", { text: "Reports of this game" }));
    reports.appendChild(reportsTable(data.reports, false, drawDetail));
  }).catch(function () {});
  if (!state.votes.length) { panel.appendChild(el("p", { class: "muted", text: "No vote for this game." })); panel.appendChild(reports); return; }
  var table = el("table", {}, [el("thead", {}, [el("tr", {}, ["Player", "Device", "Answer", "Offline", "GamePort", "Day", "State", ""].map(function (h) { return el("th", { text: h }); }))])]);
  var body = el("tbody");
  state.votes.forEach(function (v) { body.appendChild(row(v)); });
  table.appendChild(body);
  panel.appendChild(el("div", { class: "scroll" }, [table]));
  panel.appendChild(el("div", { class: "gap" }, [reports]));
}

function row(v) {
  var g = state.current;
  var device = select(DEVICES, v.device);
  var verdict = select(Object.keys(VERDICTS), v.verdict, VERDICTS);
  var offline = el("input", { type: "checkbox" });
  offline.checked = v.offline;
  var dirty = function () { return device.value !== v.device || verdict.value !== v.verdict || offline.checked !== v.offline; };
  var save = el("button", { type: "button", class: "btn", text: "Save", disabled: "disabled", onclick: function () {
    if (!confirmWrite("Change a vote of " + g.name + ": " + v.device + ", " + VERDICTS[v.verdict] + " becomes " + device.value + ", " + VERDICTS[verdict.value] + ".")) return;
    call("/console/api/change", { appId: g.appid, voter: v.voter, device: device.value, verdict: verdict.value, offline: offline.checked })
      .then(function () { toast("Saved"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
  } });
  [device, verdict, offline].forEach(function (n) { n.addEventListener("change", function () { if (dirty()) save.removeAttribute("disabled"); else save.setAttribute("disabled", "disabled"); }); });

  var fixedBtn = el("button", { type: "button", class: "btn", text: v.fixed ? "Count again" : "Mark fixed", onclick: function () {
    if (v.fixed) {
      if (!confirmWrite("Count this vote again: " + g.name + ", " + v.device + ", " + VERDICTS[v.verdict] + ".")) return;
      call("/console/api/change", { appId: g.appid, voter: v.voter, fixed: false }).then(function () { toast("Counted again"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
      return;
    }
    var where = window.prompt("Fixed in which version? (optional, for example 0.9.0)", "");
    if (where === null) return;
    where = where.trim();
    if (where && !/^[0-9A-Za-z._ -]{1,32}$/.test(where)) { toast("Letters, digits, dots, dashes and spaces only", true); return; }
    if (!confirmWrite("Mark as fixed, no longer counted: " + g.name + ", " + v.device + ", " + VERDICTS[v.verdict] + ".")) return;
    var message = { appId: g.appid, voter: v.voter, fixed: true };
    if (where) message.fixedIn = where;
    call("/console/api/change", message).then(function () { toast("Marked fixed"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
  } });
  var del = el("button", { type: "button", class: "btn danger", text: "Delete", onclick: function () {
    if (!window.confirm((state.env === "prod" ? "PRODUCTION\\n\\n" : "") + "Delete this vote?\\n" + g.name + ", " + v.device + ", " + VERDICTS[v.verdict] + ", " + v.updated)) return;
    call("/console/api/remove", { appId: g.appid, voter: v.voter }).then(function () { toast("Deleted"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
  } });

  var state2 = v.fixed ? "Fixed " + v.fixed + (v.fixedIn ? " in " + v.fixedIn : "") : "Counted";
  return el("tr", { class: "v-" + v.verdict + (v.fixed ? " fixed" : "") }, [
    el("td", { class: "muted", text: v.voter.slice(0, 6) + (v.app === "admin" ? " (admin)" : "") }),
    el("td", {}, [device]), el("td", {}, [verdict]), el("td", {}, [offline]),
    el("td", { text: v.app }), el("td", { text: v.updated }),
    el("td", { class: v.fixed ? "state" : "muted", text: state2 }),
    el("td", {}, [el("div", { class: "actions" }, [save, fixedBtn, del])]),
  ]);
}

document.getElementById("b-test").addEventListener("click", function () { setEnv("test"); });
document.getElementById("b-prod").addEventListener("click", function () { setEnv("prod"); });
document.getElementById("q").addEventListener("input", drawGames);
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
  // An address like #1125240 opens that game, #1125240/prod opens it in production, #voted lists only the games with votes, and #reports (or #reports/prod) shows the latest reports.
  if (location.hash === "#voted") { state.onlyVoted = true; document.getElementById("only").setAttribute("aria-pressed", "true"); }
  var link = location.hash.match(/^#(\\d+)(\\/prod)?$/);
  var inReports = location.hash.match(/^#reports(\\/prod)?$/);
  setEnv((link && link[2]) || (inReports && inReports[1]) ? "prod" : "test");
  if (inReports) showLatestReports();
  else if (link && !state.games.some(function (g) { return g.appid === Number(link[1]); })) {
    var other = { appid: Number(link[1]), name: "App " + link[1], vr: false, installable: true, extra: true };
    state.extra[other.appid] = other; state.current = other; state.view = "game"; resolveName(other); loadVotes();
  }
  if (link) {
    var found = state.games.filter(function (g) { return g.appid === Number(link[1]); })[0];
    if (found) { state.current = found; state.view = "game"; drawGames(); loadVotes(); }
  }
}).catch(function () { toast("The catalog could not be read", true); setEnv("test"); });
</script>
</body>
</html>`;
}
