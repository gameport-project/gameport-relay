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
:root { --env-soft:rgba(60,76,122,.6); --env-glow:rgba(79,134,255,.45); --bg:#222932; --card:rgba(23,28,34,.66); --line:rgba(255,255,255,.12); --text:#e3e8ef; --muted:#b4bdc9; --env:#2f6fed; --warn:#f0b24a; color-scheme: dark; }
body.test { --env:#4f86ff; } body.prod { --env:#ef5b61; --env-soft:rgba(140,58,72,.55); --env-glow:rgba(239,91,97,.5); }
* { box-sizing: border-box; }
body { margin:0; background:radial-gradient(1100px 620px at 12% -12%, var(--env-soft), transparent 62%), linear-gradient(160deg, #222932 0%, #2a3350 58%, #3c4c7a 120%); background-attachment:fixed; color:var(--text); font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
button, input, select { font:inherit; color:inherit; }
.banner { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:12px 24px; background:rgba(20,25,34,.74); -webkit-backdrop-filter:blur(18px); backdrop-filter:blur(18px); border-bottom:1px solid var(--line); box-shadow:inset 0 3px 0 var(--env), 0 10px 30px rgba(0,0,0,.3); color:var(--text); font-weight:600; letter-spacing:.01em; }
.brand { display:flex; line-height:0; }
.pages { display:flex; flex-wrap:wrap; gap:8px; }
.banner-btn { border:1px solid var(--line); background:rgba(255,255,255,.05); color:var(--text); cursor:pointer; padding:7px 16px; border-radius:999px; font:inherit; font-weight:600; transition:background .15s, border-color .15s; }
.banner-btn:hover { background:rgba(255,255,255,.12); border-color:rgba(255,255,255,.3); }
.switch { display:flex; gap:2px; padding:3px; border-radius:999px; background:rgba(255,255,255,.06); border:1px solid var(--line); }
.switch button { border:0; background:none; cursor:pointer; padding:6px 16px; border-radius:999px; font-weight:700; font-size:13px; letter-spacing:.06em; color:var(--muted); transition:background .15s, color .15s; }
.switch button:hover { color:var(--text); }
.switch button[aria-pressed="true"] { background:var(--env); color:#fff; box-shadow:0 0 0 1px rgba(255,255,255,.14) inset, 0 4px 18px var(--env-glow); }
.lang-pick { margin-left:auto; }
main { display:grid; grid-template-columns:minmax(280px,360px) minmax(0,1fr); gap:20px; padding:20px 28px 32px; width:100%; }
@media (max-width:820px) { main { grid-template-columns:1fr; } }
main > .panel:first-child { position:relative; z-index:4; }
.panel { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:20px; box-shadow:0 12px 34px rgba(0,0,0,.22); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); }
h2 { margin:0 0 12px; font-size:17px; }
input[type=search], .field { width:100%; height:42px; padding:0 16px; background:rgba(15,19,27,.55); border:1px solid var(--line); border-radius:999px; outline:0; }
input[type=search]:focus, .field:focus { border-color:rgba(255,255,255,.4); }
.games { margin-top:12px; max-height:68vh; overflow:auto; display:grid; gap:4px; }
.game { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:6px 10px 6px 6px; border:1px solid transparent; border-radius:12px; background:none; cursor:pointer; }
.game img { width:40px; height:60px; object-fit:cover; border-radius:8px; background:#0f131b; flex:none; }
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
.sbox-menu { position:absolute; right:0; left:auto; top:calc(100% + 4px); z-index:30; min-width:100%; width:max-content; max-width:min(320px, 86vw); background:#1b2130; border:1px solid var(--line); border-radius:10px; padding:6px; }
.sbox-menu label { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; cursor:pointer; }
.sbox-menu label:hover { background:rgba(255,255,255,.08); }
.sbox-menu input { accent-color:#fff; }
.sbox-menu .sdot { width:9px; height:9px; border-radius:50%; flex:none; }
.sdot-4cc38a { background:#4cc38a; } .sdot-f0b24a { background:#f0b24a; } .sdot-ef6b6b { background:#ef6b6b; }
.report-state { margin-top:6px; }
.tgl-row { display:flex; align-items:center; justify-content:space-between; gap:16px; cursor:pointer; padding:6px 0; font-weight:600; }
.tgl-row small { display:block; font-weight:400; font-size:12px; margin-top:2px; }
.tgl { appearance:none; -webkit-appearance:none; flex:none; margin:0; width:46px; height:26px; border-radius:999px; background:rgba(255,255,255,.16); border:1px solid var(--line); position:relative; cursor:pointer; transition:background .15s; }
.tgl::after { content:""; position:absolute; top:2px; left:2px; width:20px; height:20px; border-radius:50%; background:#fff; transition:transform .15s; }
.tgl:checked { background:#4cc38a; border-color:transparent; }
.tgl:checked::after { transform:translateX(20px); }
.tgl:focus-visible { outline:2px solid rgba(255,255,255,.6); outline-offset:2px; }
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
.synth { margin:0 0 10px; font-size:13px; opacity:.85; }
.trail { margin-top:4px; font-size:12px; }
.trail summary { cursor:pointer; opacity:.85; }
.trail-line { margin:2px 0 0 14px; opacity:.8; }
.t-works { color:#4cc38a; } .t-offline_only { color:#f0b24a; } .t-fails { color:#ef6b6b; }
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
.gcard { background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025)); border:1px solid var(--line); border-radius:20px; padding:22px 26px; margin:0 0 20px; box-shadow:0 8px 24px rgba(0,0,0,.18); }
.gcard > h2 { margin:0 0 16px; font-size:15px; color:var(--muted); font-weight:600; letter-spacing:.03em; text-transform:uppercase; }
.gcard-head { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
.gcard-head h2 { margin:0; font-size:15px; color:var(--muted); font-weight:600; letter-spacing:.03em; text-transform:uppercase; }
.seg { display:inline-flex; border:1px solid var(--line); border-radius:999px; padding:3px; }
.seg button { background:none; border:0; color:var(--muted); font:inherit; font-size:13.5px; padding:6px 16px; border-radius:999px; cursor:pointer; }
.seg button[aria-pressed="true"] { background:rgba(255,255,255,.12); color:var(--text); }
.bars { margin:4px -10px 8px; max-width:640px; }
button.bar-row { display:grid; grid-template-columns:150px 1fr 44px 48px; gap:14px; align-items:center; width:100%; margin:3px 0; padding:9px 10px; font:inherit; font-size:14.5px; color:inherit; text-align:left; background:none; border:1px solid transparent; border-radius:12px; cursor:pointer; }
button.bar-row:hover { background:rgba(255,255,255,.04); }
button.bar-row[aria-pressed="true"] { background:rgba(255,255,255,.06); border-color:var(--line); }
.bar { width:100%; height:14px; display:block; border-radius:999px; overflow:hidden; }
.defs { position:absolute; width:0; height:0; }
.filter-note { margin:10px 0 0; font-size:13.5px; color:var(--muted); }
.filter-note button { margin-left:8px; background:none; border:1px solid var(--line); border-radius:999px; color:inherit; font:inherit; font-size:12.5px; padding:2px 12px; cursor:pointer; }
.gcard .issue-list { gap:10px; }
.gcard .chg-group { padding:12px 0; border-top:1px solid var(--line); } .gcard .chg-group:first-of-type { border-top:0; padding-top:0; }
.home-head { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
.home-head h2 { margin:0; }
.seg-fine { display:inline-flex; gap:2px; padding:2px; border:1px solid var(--line); border-radius:999px; background:rgba(255,255,255,.04); }
.seg-fine button { border:0; background:none; cursor:pointer; padding:4px 14px; border-radius:999px; font-size:13px; line-height:1.4; color:var(--muted); transition:background .15s, color .15s; }
.seg-fine button:hover { color:var(--text); }
.seg-fine button[aria-pressed="true"] { background:#fff; color:#11151c; font-weight:600; }
.hero-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:20px; }
.stat { position:relative; overflow:hidden; padding:20px 22px; border-radius:20px; border:1px solid var(--line); background:linear-gradient(150deg, rgba(255,255,255,.09), rgba(255,255,255,.02)); box-shadow:0 8px 24px rgba(0,0,0,.2); }
.stat::after { content:""; position:absolute; right:-30px; top:-30px; width:110px; height:110px; border-radius:50%; background:rgba(88,101,242,.18); }
.stat small { display:block; color:var(--muted); font-size:12.5px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
.stat .stat-span { display:block; margin:3px 0 0; font-size:12px; font-weight:500; color:#fff; opacity:.92; }
.stat b { display:block; margin:6px 0 4px; font-size:34px; line-height:1.1; letter-spacing:-.02em; }
.stat span { font-size:13.5px; color:var(--muted); }
.stat .up { color:#4cc38a; } .stat .down { color:#ef6b6b; }
.home-grid .wide { grid-column:1 / -1; }
.home-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:20px; margin-bottom:20px; }
@media (max-width:1100px) { .home-grid { grid-template-columns:minmax(0,1fr); } }
.home-grid .gcard { margin:0; }
.stat-table { width:100%; border-collapse:collapse; } .stat-table th { color:var(--muted); font-size:12.5px; font-weight:600; text-align:right; padding:0 8px 8px; } .stat-table th:first-child { text-align:left; }
.stat-table { table-layout:fixed; } .stat-table th:first-child, .stat-table td:first-child { width:34%; }
.stat-table td { text-align:right; padding:10px 6px; border-top:1px solid var(--line); font-size:15px; } .stat-table td:first-child { text-align:left; color:var(--muted); font-size:14px; }
.stat-table b { font-size:19px; } .stat-table small { display:block; color:var(--muted); font-size:12px; }
.line-works { fill:none; stroke:#4cc38a; stroke-width:2; } .line-offline_only { fill:none; stroke:#f0b24a; stroke-width:2; } .line-fails { fill:none; stroke:#ef6b6b; stroke-width:2; }
.axis { stroke:rgba(255,255,255,.1); stroke-width:1; } .axis-text { fill:#98a2b3; font-size:9px; }
.barstack { display:flex; gap:2px; height:14px; border-radius:999px; overflow:hidden; background:rgba(255,255,255,.07); }
.barstack-part { display:flex; align-items:center; justify-content:center; flex-basis:0; min-width:18px; overflow:hidden; font-size:11px; font-weight:700; color:#10131a; text-shadow:0 1px 0 rgba(255,255,255,.25); }
.barstack-part.seg-works { background:linear-gradient(180deg,#6ee7b0,#37a972); } .barstack-part.seg-offline_only { background:linear-gradient(180deg,#f8cd75,#dc9a2f); } .barstack-part.seg-fails { background:linear-gradient(180deg,#fa9494,#dc5252); }
.device-pick { height:34px; padding:0 34px 0 14px; border:1px solid var(--line); border-radius:999px; background:rgba(15,19,27,.55); color:inherit; font:inherit; font-size:13.5px; cursor:pointer; }
.device-pick option { background:#1b2130; }
.legend.key { margin:0 0 14px; } .dot-accent { background:#7f8fd4; }
.who-dev { display:flex; flex-wrap:wrap; gap:4px 8px; margin-top:3px; font-size:12px; } .who-dev .ver-link { color:var(--muted); }
.top-head { display:block; margin:14px 0 4px; font-size:12.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; } .top-head:first-child { margin-top:0; }
.top-head.ok { color:#6ee7b0; } .top-head.bad { color:#fa9494; }
.headline { margin:12px 0 14px; font-size:15px; } .headline b { font-size:22px; margin-right:4px; }
.sort-row { margin:0 0 12px; }
.gb-row { display:grid; grid-template-columns:minmax(120px,1.4fr) 2fr minmax(74px,auto); gap:14px; align-items:center; padding:6px 0; font-size:14px; } .gb-row small { text-align:right; } .gb .top-head { margin-top:16px; } .gb:first-child .top-head { margin-top:0; }
.top-table { table-layout:fixed; } .top-table th:nth-child(1), .top-table td:nth-child(1) { width:46%; } .top-table th:nth-child(n+2), .top-table td:nth-child(n+2) { width:18%; }
.top-table tr.sec td { padding-top:16px; border-top:0; font-size:12.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; text-align:left; } .top-table tr.sec.ok td { color:#6ee7b0; } .top-table tr.sec.bad td { color:#fa9494; }
.adopt .upd { min-width:200px; } .adopt .upd .bar { width:120px; display:inline-block; vertical-align:middle; margin-right:10px; } .adopt .upd b { vertical-align:middle; }
.rate.ongoing { opacity:.6; }
.rate { display:inline-block; min-width:52px; padding:2px 10px; border-radius:999px; font-weight:700; font-size:13.5px; text-align:center; }
.rate.hi { background:rgba(76,195,138,.18); color:#6ee7b0; } .rate.mid { background:rgba(240,178,74,.18); color:#f8cd75; } .rate.lo { background:rgba(239,107,107,.18); color:#fa9494; }
.adopt { table-layout:auto; } .adopt th, .adopt td { text-align:left !important; width:auto !important; }
.legend { display:flex; flex-wrap:wrap; gap:6px 18px; margin:10px 0 0; font-size:13.5px; } .legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:6px; }
.rank { width:100%; border-collapse:collapse; } .rank td, .rank th { padding:9px 8px; border-top:1px solid var(--line); text-align:right; font-size:14px; } .rank th { color:var(--muted); font-size:12.5px; font-weight:600; border-top:0; } .rank td:first-child, .rank th:first-child { text-align:left; }
.dev-group + .dev-group { margin-top:18px; }
.dev-brand { display:block; margin:0 0 4px; font-size:12.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
.dev-row { display:grid; grid-template-columns:minmax(150px,210px) 1fr minmax(190px,auto); gap:14px; align-items:center; padding:8px 0; font-size:14px; }
.scroll-list { max-height:430px; overflow:auto; padding-right:6px; }
.chips { display:flex; flex-wrap:wrap; margin:8px 0 0; }
.chg-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:999px; border:1px solid var(--line); margin:4px 8px 0 0; font-size:13.5px; }
.chg-chip.worse { border-color:rgba(239,107,107,.45); background:rgba(239,107,107,.09); } .chg-chip.better { border-color:rgba(76,195,138,.45); background:rgba(76,195,138,.09); }
.chg-chip .arrow-worse { color:#ef6b6b; } .chg-chip .arrow-better { color:#4cc38a; }
.vstats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:6px 0 16px; }
.vstat { padding:12px 14px; border-radius:14px; border:1px solid var(--line); background:rgba(255,255,255,.04); } .vstat b { display:block; font-size:24px; line-height:1.15; } .vstat small { color:var(--muted); font-size:12px; }
.vstat.ok { border-color:rgba(76,195,138,.5); background:rgba(76,195,138,.10); } .vstat.mid { border-color:rgba(240,178,74,.5); background:rgba(240,178,74,.10); } .vstat.old { border-color:rgba(239,107,107,.5); background:rgba(239,107,107,.10); }
.tag-latest { margin-left:8px; padding:1px 9px; border-radius:999px; background:rgba(76,195,138,.18); color:#6ee7b0; font-size:11.5px; font-weight:700; letter-spacing:.04em; }
.rank { table-layout:fixed; } .rank th:nth-child(1), .rank td:nth-child(1) { width:34%; } .rank th:nth-child(2), .rank td:nth-child(2) { width:11%; } .rank th:nth-child(3), .rank td:nth-child(3) { width:27%; } .rank th:nth-child(4), .rank td:nth-child(4), .rank th:nth-child(5), .rank td:nth-child(5) { width:14%; }
.rank .bar { width:100%; } .rank .player-cell small { overflow-wrap:anywhere; }
.home-grid > * { min-width:0; } .gcard { min-width:0; }
.rank td.split { text-align:left; }
.new-list { margin:8px 0 0; padding:0; list-style:none; font-size:14px; } .new-list li { margin:5px 0; }
.bar-track { fill:rgba(255,255,255,.07); } .bar-fill.bar-accent { fill:url(#g-accent); } .dot-works { background:#4cc38a; } .dot-offline_only { background:#f0b24a; } .dot-fails { background:#ef6b6b; } .evo { width:100%; height:auto; display:block; } .ver-only { grid-template-columns:110px 1fr 44px 150px; }
.bar-fill.bar-works, .seg-works { fill:url(#g-works); } .bar-fill.bar-offline_only, .seg-offline_only { fill:url(#g-offline); } .bar-fill.bar-fails, .seg-fails { fill:url(#g-fails); }
.bars-sum { margin:2px 0 14px; font-size:13px; }
.vchart { margin:4px 0 4px; max-width:760px; }
.vrow { display:grid; grid-template-columns:110px 1fr 60px 200px; gap:14px; align-items:center; margin:9px 0; font-size:14px; }
.vrow.thin { opacity:.55; }
.up { color:#4cc38a; } .down { color:#ef6b6b; }
.trend-better { color:#4cc38a; } .trend-worse { color:#ef6b6b; }
.chg-group { margin:0; } .chg-pair { font-weight:600; margin-right:10px; }
.chg-tag { display:inline-block; padding:1px 9px; border-radius:999px; font-size:12.5px; margin-right:6px; border:1px solid var(--line); }
.chg-tag.worse { color:#ef6b6b; border-color:rgba(239,107,107,.4); } .chg-tag.better { color:#4cc38a; border-color:rgba(76,195,138,.4); }
.chg-list { margin:6px 0 2px 4px; padding:0; list-style:none; font-size:13.5px; } .chg-list li { margin:3px 0; }
.ver-link { color:inherit; text-decoration:underline; text-decoration-color:var(--line); text-underline-offset:3px; }
.ver-link:hover { text-decoration-color:currentColor; }
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
<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="g-works" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ee7b0"/><stop offset="1" stop-color="#37a972"/></linearGradient>
  <linearGradient id="g-offline" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8cd75"/><stop offset="1" stop-color="#dc9a2f"/></linearGradient>
  <linearGradient id="g-fails" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fa9494"/><stop offset="1" stop-color="#dc5252"/></linearGradient>
  <linearGradient id="g-accent" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa8ff"/><stop offset="1" stop-color="#5865f2"/></linearGradient>
</defs></svg>
<div class="banner" id="banner">
  <a class="brand" id="brand" href="/console" aria-label="GamePort console">
    <svg viewBox="0 0 512 512" width="30" height="30" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#222932"/><path d="M348.2,173 A124,124 0 1 0 380,256 L272,256" fill="none" stroke="#F5F5F7" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(-12)"><path d="M206,214 L206,298 Q206,312 218,305 L284,263 Q294,256 284,249 L218,207 Q206,200 206,214 Z" fill="#F5F5F7" stroke="#F5F5F7" stroke-width="8" stroke-linejoin="round"/></g></svg>
  </a>
  <div class="switch" role="group" aria-label="Environment">
    <button type="button" id="b-test" aria-pressed="true">TEST</button>
    <button type="button" id="b-prod" aria-pressed="false">PRODUCTION</button>
  </div>
  <nav class="pages" aria-label="Pages">
    <button type="button" class="banner-btn" id="home">Home</button>
    <button type="button" class="banner-btn" id="latest">Latest reports<span class="badge" id="latest-count" hidden></span></button>
    <button type="button" class="banner-btn" id="news">What is new<span class="badge" id="news-count" hidden></span></button>
    <button type="button" class="banner-btn" id="reasons">Incompatibility reasons</button>
    <button type="button" class="banner-btn" id="defaults">Game settings</button>
  </nav>
  <div class="seg-fine lang-pick" id="lang" role="group" aria-label="Language">
    <button type="button" data-lang="fr" aria-pressed="false">FR</button>
    <button type="button" data-lang="en" aria-pressed="false">EN</button>
  </div>
</div>
<main>
  <section class="panel">
    <h2>Games <small class="muted" id="gcount"></small></h2>
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
// ---- Language: English (as written in the page) or French, picked at the top and remembered in this browser. Everything visible is translated after it is drawn:
// the fixed texts by the dictionary below, the sentences made of a number and a word by the rules, and what the developer or a player wrote (names, labels) is left alone.
var LANG = "en";
try {
  var savedLang = localStorage.getItem("gp-console-lang");
  LANG = savedLang === "fr" || savedLang === "en" ? savedLang : String(navigator.language || "").slice(0, 2) === "fr" ? "fr" : "en";
} catch (e) { LANG = "en"; }

var FR = {
  "GamePort console": "Console GamePort", "Environment": "Environnement", "Pages": "Pages", "Language": "Langue", "Period": "Période",
  "Search a game": "Rechercher un jeu", "Device": "Appareil", "Status of the games": "Statut des jeux", "Games": "Jeux",
  "Home": "Accueil", "Latest reports": "Derniers rapports", "What is new": "Nouveautés", "Incompatibility reasons": "Raisons d'incompatibilité", "Game settings": "Réglages des jeux",
  "Only games with votes": "Seulement les jeux avec des votes", "Pick a game.": "Choisir un jeu.", "All devices": "Tous les appareils", "All statuses": "Tous les statuts",
  "Works": "Marche", "Offline only": "Hors ligne seulement", "Does not work": "Ne marche pas", "Works offline only": "Marche hors ligne seulement",
  "Work": "Marchent", "Work offline only": "Marchent hors ligne seulement", "Do not work": "Ne marchent pas", "No vote": "Aucun vote", "no vote": "aucun vote",
  "Passthrough": "Passthrough", "Saved": "Enregistré", "Removed": "Retiré", "Deleted": "Supprimé", "Edit": "Modifier", "Delete": "Supprimer", "Remove": "Retirer", "Save": "Enregistrer",
  "Game": "Jeu", "Setting": "Réglage", "Since": "Depuis", "Player": "Joueur", "Day": "Jour", "Answer": "Réponse", "State": "État", "Size": "Taille", "Problems": "Problèmes", "Report": "Rapport",
  "Reopen": "Rouvrir", "Mark handled": "Marquer comme traité", "Back to waiting": "Remis en attente", "Marked handled": "Marqué comme traité", "Download": "Télécharger", "To handle": "À traiter",
  "Report sent": "Rapport envoyé", "The relay has the report": "Le relais a le rapport", "Report waiting": "Rapport en attente",
  "Kept on the device: no network, or the relay was busy": "Gardé sur l'appareil : pas de réseau, ou le relais était occupé",
  "Report refused": "Rapport refusé", "The relay would not take the report": "Le relais n'a pas pris le rapport", "No report": "Aucun rapport",
  "None was made: the game is not installed, or the report is too large": "Aucun n'a été fait : le jeu n'est pas installé, ou le rapport est trop gros",
  "Declared by the app, unless the player chose otherwise": "Déclaré par l'app, sauf si le joueur a choisi autrement",
  "What the app is told about each game. It reads this once a day and when it patches a game, and applies it where the player left the choice on automatic. A game is added from its own page.": "Ce que l'app sait de chaque jeu. Elle le lit une fois par jour et quand elle patche un jeu, et l'applique là où le joueur a laissé le choix sur automatique. Un jeu s'ajoute depuis sa propre page.",
  "No game has a setting.": "Aucun jeu n'a de réglage.", "Passthrough declared": "Passthrough déclaré", "Compatibility": "Compatibilité",
  "Settings sent to the app: passthrough declared": "Réglages envoyés à l'app : passthrough déclaré", "Settings sent to the app: none": "Réglages envoyés à l'app : aucun",
  "No reason yet: add one first, then a game can be marked as incompatible.": "Aucune raison pour l'instant : en ajouter une d'abord, puis un jeu pourra être marqué comme incompatible.",
  "Add a reason": "Ajouter une raison", "Change the reason": "Changer la raison", "Mark as incompatible": "Marquer comme incompatible", "Make compatible": "Rendre compatible", "Taken off the list": "Retiré de la liste",
  "Incompatible: shown as such in the app and on the site": "Incompatible : affiché comme tel dans l'app et sur le site", "Compatibility: not marked as incompatible": "Compatibilité : non marqué comme incompatible",
  "Identifier, e.g. anti-tamper": "Identifiant, par ex. anti-tamper", "Explanation, for any reader": "Explication, pour tout lecteur", "Title": "Titre", "Save the reason": "Enregistrer la raison",
  "New reason, or change one by its identifier": "Nouvelle raison, ou en modifier une par son identifiant", "English": "Anglais", "Français": "Français", "No reason yet.": "Aucune raison pour l'instant.",
  "Games still name this reason": "Des jeux citent encore cette raison", "The first 200 are listed": "Les 200 premiers sont listés", "not in the catalog": "pas dans le catalogue", "Not in the catalog": "Pas dans le catalogue",
  "Flat": "Plat", "Incompatible": "Incompatible", "Steady": "Stable", "Handled": "Traité",
  "Discord name": "Pseudo Discord", "Everything this player sent": "Tout ce que ce joueur a envoyé", "Every answer and report of this version": "Toutes les réponses et tous les rapports de cette version",
  "few answers": "peu de réponses", "same game build": "même version du jeu", "the game was updated too": "le jeu a aussi été mis à jour", "game updated": "jeu mis à jour",
  "game build unknown": "version du jeu inconnue",
  "Changes between versions of GamePort": "Changements entre versions de GamePort", "No player moved between these versions.": "Aucun joueur n'a changé entre ces versions.",
  "What is counted": "Ce qui est compté", "Answers": "Réponses", "Different games": "Jeux différents",
  "Each player counts once per game, with the last answer they gave": "Chaque joueur compte une fois par jeu, avec la dernière réponse qu'il a donnée",
  "Each game counts once, as the answer most of its answers give": "Chaque jeu compte une fois, selon la réponse que donnent la plupart de ses réponses",
  "Does it work?": "Est-ce que ça marche ?", "What goes wrong": "Ce qui ne va pas", "By version of GamePort": "Par version de GamePort", "Show all": "Tout afficher",
  "No answer here.": "Aucune réponse ici.", "No report here.": "Aucun rapport ici.", "Games that work or not, day by day": "Jeux qui marchent ou non, jour par jour",
  "Today": "Aujourd'hui", "New players": "Nouveaux joueurs", "Reports received": "Rapports reçus", "New games": "Nouveaux jeux", "Reports to handle": "Rapports à traiter", "On the newest version": "Sur la version la plus récente",
  "Activity": "Activité", "Arrows: change against the period of the same length just before.": "Flèches : écart avec la période de même durée juste avant.",
  "No new game in the last 31 days.": "Aucun nouveau jeu ces 31 derniers jours.", "Top players": "Top joueurs", "By different games answered, with how their games split": "Par jeux différents notés, avec la répartition de leurs jeux",
  "No player yet.": "Aucun joueur pour l'instant.", "Nothing yet.": "Rien pour l'instant.", "Top games": "Top jeux", "Most answered": "Les plus notés", "Most “does not work”": "Les plus « ne marche pas »",
  "Work / not": "Marche / non", "NEWEST": "RÉCENTE", "Players by version of GamePort": "Joueurs par version de GamePort",
  "Seen in the last 31 days, by the version of their last answer. Click a version for everything it sent.": "Vus ces 31 derniers jours, selon la version de leur dernière réponse. Cliquer sur une version pour tout ce qu'elle a envoyé.",
  "No player seen.": "Aucun joueur vu.", "Games by device: work, work offline only, do not work": "Jeux par appareil : marchent, marchent hors ligne seulement, ne marchent pas", "No answer yet.": "Aucune réponse pour l'instant.",
  "Changes this week between versions": "Changements de la semaine entre versions", "Name of this player (a Discord name, for example)": "Nom de ce joueur (un pseudo Discord, par exemple)", "Name of this player": "Nom de ce joueur",
  "Save the name": "Enregistrer le nom", "Name saved": "Nom enregistré", "Name removed": "Nom retiré",
  "The name stays in the relay's database and in this console. The app and the site never see it.": "Le nom reste dans la base du relais et dans cette console. L'app et le site ne le voient jamais.",
  "No answer from this player.": "Aucune réponse de ce joueur.", "No report from this player.": "Aucun rapport de ce joueur.", "No new vote.": "Aucun nouveau vote.",
  "New votes": "Nouveaux votes", "Games that came to Android": "Jeux arrivés sur Android", "Yesterday": "Hier", "No game.": "Aucun jeu.", "No report.": "Aucun rapport.", "Free": "Gratuit", "SteamDB": "SteamDB",
  "View game": "Voir le jeu", "SteamDB: the full game": "SteamDB : le jeu complet", "Problems reported": "Problèmes signalés", "No vote counted": "Aucun vote compté", "GamePort version": "Version de GamePort",
  "GamePort version (empty: the newest release)": "Version de GamePort, facultatif", "Problems: none": "Problèmes : aucun", "Add a vote": "Ajouter un vote", "Vote added": "Vote ajouté", "New vote (to try the console)": "Nouveau vote (pour essayer la console)",
  "The version: letters, digits, dots, dashes only": "La version : lettres, chiffres, points, tirets seulement", "Reports of this game": "Rapports de ce jeu",
  "No vote for this game on this device.": "Aucun vote pour ce jeu sur cet appareil.", "No vote for this game.": "Aucun vote pour ce jeu.",
  "Nothing shows": "Rien ne s'affiche", "Flat window instead of VR": "Fenêtre plate au lieu de la VR", "Closes by itself": "Se ferme tout seul", "Stuck on loading": "Bloqué au chargement",
  "Controls missing or wrong": "Commandes absentes ou fausses", "No sound": "Pas de son", "Cannot play online": "Impossible de jouer en ligne", "Slow or stuttering": "Lent ou saccadé", "No passthrough": "Pas de passthrough",
  "Wrong colors or broken image": "Couleurs fausses ou image cassée", "Something else": "Autre chose", "Not specified": "Non précisé", "Search a model": "Rechercher un modèle",
  "Not fixed": "Non corrigé", "Mark fixed": "Marquer comme corrigé", "Back to the answer given": "Retour à la réponse donnée",
  "Fixed in which version? (optional, for example 0.9.0)": "Corrigé dans quelle version ? (facultatif, par exemple 0.9.0)", "Letters, digits, dots, dashes and spaces only": "Lettres, chiffres, points, tirets et espaces seulement", "Marked fixed": "Marqué comme corrigé",
  "More": "Plus", "Model": "Modèle", "Worked offline": "A marché hors ligne", "worked offline": "a marché hors ligne",
  "Version of GamePort that sent this vote: opens every answer of this version": "Version de GamePort qui a envoyé ce vote : ouvre toutes les réponses de cette version", "Every answer of this player for the game": "Toutes les réponses de ce joueur pour ce jeu",
  "The catalog could not be read": "Le catalogue n'a pas pu être lu", "Mark as incompatible: ": "Marquer comme incompatible : ",
  "Votes": "Votes", "Version": "Version", "Offline": "Hors ligne", "Fixed": "Corrigé", "Edit the vote": "Modifier le vote",
  "Every answer and report of": "Toutes les réponses et tous les rapports de",
  "No new game in this period.": "Aucun nouveau jeu sur cette période.",
  "Each game counts once, as the answer most of its answers give (a tie counts as not working). Only games with at least one answer are counted.": "Chaque jeu compte une fois, selon la réponse que donnent la plupart de ses réponses (une égalité compte comme « ne marche pas »). Seuls les jeux avec au moins une réponse sont comptés.",
  "By different games answered, with how their games split and the devices they use": "Par jeux différents notés, avec la répartition de leurs jeux et les appareils utilisés",
  "Work best": "Marchent le mieux", "Fail the most": "Échouent le plus", "Newest version seen": "Version la plus récente vue", "A little behind: same line or the one before": "Un peu en retard : même ligne ou la précédente",
  "Old version": "Version ancienne", "Not a version number (added by hand)": "Pas un numéro de version (ajouté à la main)",
  "Updates: how fast players move to a new version": "Mises à jour : à quelle vitesse les joueurs passent à une nouvelle version",
  "For each version: among the players who answered in the days after it first appeared, the share already on it (or a newer one). Only players who answer are seen.": "Pour chaque version : parmi les joueurs qui ont répondu dans les jours après son apparition, la part déjà dessus (ou sur une plus récente). Seuls les joueurs qui répondent sont vus.",
  "No version yet.": "Aucune version pour l'instant.", "No release version yet.": "Aucune version publiée pour l'instant.", "Out since": "Sortie le", "Within 3 days": "En 3 jours", "Within 7 days": "En 7 jours", "Within 14 days": "En 14 jours", "in progress": "en cours", "Nobody answered in this window": "Personne n'a répondu sur cette fenêtre",
  "Reading: among the players who answered during the first 7 days of a version, this share was already on it. Only players who answer are seen.": "Lecture : parmi les joueurs qui ont répondu pendant les 7 premiers jours d'une version, cette part était déjà dessus. Seuls les joueurs qui répondent sont vus.",
  "Players": "Joueurs", "Verdict": "Verdict", "No game here.": "Aucun jeu ici.", "Phones": "Téléphones", "Tablets": "Tablettes", "Other": "Autres", "now": "en ce moment", "last 31 days": "31 derniers jours", "month": "mois", "Players concerned": "Joueurs concernés", "Updated": "Mis à jour", "Usual wait": "Délai habituel", "the same day": "le même jour", "Do not work": "Ne marchent pas",
  "Only players who answered in this period are counted, and only those who were already there before a version came out. Of them, the share whose last answer is on that version or a newer one.": "Seuls les joueurs qui ont répondu sur cette période sont comptés, et seulement ceux qui étaient déjà là avant la sortie d'une version. Parmi eux, la part dont la dernière réponse est sur cette version ou une plus récente.",
  "No player seen in this period was there before this version": "Aucun joueur vu sur cette période n'était là avant cette version", "Sort": "Trier"
};

// Sentences made of a number and a word, or of fixed words around a name. Each rule is tried on every text, in this order.
function plFr(n, one, many) { return n + " " + (Number(n) === 1 ? one : many); }
var FR_RULES = [
  [/^New games \\((\\d+) in (?:the month|(\\d+) days)\\)$/, function (m, n, d) { return "Nouveaux jeux (" + n + " en " + (d ? d + " jours" : "1 mois") + ")"; }],
  [/^(\\d+) of (\\d+) players$/, "$1 joueurs sur $2"],
  [/^Updates: players seen in (the last month|the last (\\d+) days)$/, function (m, w, d) { return "Mises à jour : joueurs vus " + (d ? "ces " + d + " derniers jours" : "le dernier mois"); }],
  [/^of those players already updated to (\\S+) \\(out (.+)\\)$/, "de ces joueurs ont déjà mis à jour vers $1 (sortie le $2)"],
  [/^(\\d+) (day|days)$/, function (m, n) { return plFr(n, "jour", "jours"); }],
  [/^Sort by (version|players)$/, function (m, w) { return "Trier par " + (w === "version" ? "version" : "nombre de joueurs"); }],
  [/^(Version|Players) ([\\u25bc\\u25b2])$/, function (m, w, a) { return (w === "Version" ? "Version" : "Joueurs") + " " + a; }],
  [/^(\\d+) of (\\d+) players who answered in these (\\d+) days were on it$/, "$1 joueurs sur $2 ayant répondu pendant ces $3 jours étaient déjà dessus"],
  [/^(\\d+) % typically move to a new version within 7 days$/, "$1 % passent en général à une nouvelle version en 7 jours"],
  [/^of the players are on the newest version seen \\((.+)\\)$/, "des joueurs sont sur la version la plus récente vue ($1)"],
  [/^typically move to a new version within 7 days$/, "passent en général à une nouvelle version en 7 jours"],
  [/^([A-Za-z]+) \\(all models\\)$/, "$1 (tous modèles)"],
  [/(\\d+) games? do not work/g, function (m, n) { return plFr(n, "jeu ne marche pas", "jeux ne marchent pas"); }],
  [/(\\d+) games? work offline only/g, function (m, n) { return plFr(n, "jeu marche hors ligne seulement", "jeux marchent hors ligne seulement"); }],
  [/(\\d+) games? work\\b/g, function (m, n) { return plFr(n, "jeu marche", "jeux marchent"); }],
  [/^(Answers|New players|New games|Reports received|Reports to handle) · /, function (m, w) { return trText(w) + " \\u00b7 "; }],
  [/^(Work offline only|Work|Do not work|Works|Offline only|Does not work) (\\d+)$/, function (m, w, n) { return trText(w) + " " + n; }],
  [/from not working to working/g, "de « ne marche pas » à « marche »"],
  [/^(Works|Offline only|Does not work) \\u2192 (Works|Offline only|Does not work) \\((.+)\\)$/, function (m, a, b, c) { return trText(a) + " \\u2192 " + trText(b) + " (" + trText(c) + ")"; }],
  [/^Show only: (.+)$/, function (m, what) { return "Afficher seulement : " + trText(what); }],
  [/(\\d+) answers? from (\\d+) players?/g, function (m, n, p) { return plFr(n, "réponse", "réponses") + " de " + plFr(p, "joueur", "joueurs"); }],
  [/(\\d+) of (\\d+) players on (\\S+)/g, "$1 joueurs sur $2 sont sur $3"],
  [/(\\d+) work \\u00b7 (\\d+) offline only \\u00b7 (\\d+) do not work/g, "$1 marchent \\u00b7 $2 hors ligne seulement \\u00b7 $3 ne marchent pas"],
  [/(\\d+) games work, (\\d+) offline only, (\\d+) do not work/g, "$1 jeux marchent, $2 hors ligne seulement, $3 ne marchent pas"],
  [/(\\d+) different games?/g, function (m, n) { return plFr(n, "jeu différent", "jeux différents"); }],
  [/(\\d+) answers?/g, function (m, n) { return plFr(n, "réponse", "réponses"); }],
  [/(\\d+) players? moved/g, function (m, n) { return plFr(n, "joueur est passé", "joueurs sont passés"); }],
  [/(\\d+) players?/g, function (m, n) { return plFr(n, "joueur", "joueurs"); }],
  [/(\\d+) games?/g, function (m, n) { return plFr(n, "jeu", "jeux"); }],
  [/(\\d+) votes?/g, function (m, n) { return plFr(n, "vote", "votes"); }],
  [/(\\d+) reports?\\b/g, function (m, n) { return plFr(n, "rapport", "rapports"); }],
  [/(\\d+) do not work/g, "$1 ne marchent pas"], [/(\\d+) does not work/g, "$1 ne marche pas"],
  [/(\\d+) work offline only/g, "$1 marchent hors ligne seulement"], [/(\\d+) work\\b/g, "$1 marchent"],
  [/(\\d+) offline only/g, "$1 hors ligne seulement"],
  [/\\bAnswers \\((\\d+)\\)/g, "Réponses ($1)"], [/\\bReports \\((\\d+)\\)/g, "Rapports ($1)"], [/\\bLatest reports \\((.+?)\\)/g, "Derniers rapports ($1)"],
  [/\\bOverview \\((production|test)\\)/g, "Vue d'ensemble ($1)"], [/\\bWhat is new \\((production|test)\\)/g, "Nouveautés ($1)"], [/\\bGame settings \\((production|test)\\)/g, "Réglages des jeux ($1)"],
  [/\\bReasons for incompatibility \\((production|test)\\)/g, "Raisons d'incompatibilité ($1)"],
  [/\\bNew games \\((\\d+) in 31 days\\)/g, "Nouveaux jeux ($1 en 31 jours)"], [/\\bChanges between versions of GamePort \\((\\d+)\\)/g, "Changements entre versions de GamePort ($1)"],
  [/\\bChanges this week between versions \\((\\d+)\\)/g, "Changements de la semaine entre versions ($1)"],
  [/\\bArrived on (\\S+) from an older version \\((\\d+)\\)/g, "Arrivés sur $1 depuis une version plus ancienne ($2)"], [/\\bWent on from (\\S+) to a newer version \\((\\d+)\\)/g, "Partis de $1 vers une version plus récente ($2)"],
  [/\\bOnly the games that (work offline only|work|do not work)/g, function (m, w) { return "Seulement les jeux qui " + ({ "work": "marchent", "work offline only": "marchent hors ligne seulement", "do not work": "ne marchent pas" })[w]; }],
  [/\\bOnly the answers that (work offline only|work|do not work)/g, function (m, w) { return "Seulement les réponses qui " + ({ "work": "marchent", "work offline only": "marchent hors ligne seulement", "do not work": "ne marchent pas" })[w]; }],
  [/\\bShow only: /g, "Afficher seulement : "], [/\\bAgainst the version before that has enough answers: /g, "Par rapport à la version d'avant qui a assez de réponses : "],
  [/(\\d+) % do not work/g, "$1 % ne marchent pas"], [/(\\d+) % work\\b/g, "$1 % marchent"], [/(\\d+) % of players/g, "$1 % des joueurs"], [/(\\d+) on the newest version seen/g, "$1 sur la version la plus récente vue"],
  [/(\\d+) a little behind \\(same line or the one before\\)/g, "$1 un peu en retard (même ligne ou la précédente)"], [/(\\d+) on an old version/g, "$1 sur une version ancienne"],
  [/▲ better/g, "▲ mieux"], [/▼ worse/g, "▼ moins bien"], [/(\\d+) worse/g, "$1 moins bien"], [/(\\d+) better/g, "$1 mieux"], [/ with the game updated\\)/g, " avec le jeu mis à jour)"],
  [/vs the month before/g, "par rapport au mois d'avant"], [/vs the (\\d+) days before/g, "par rapport aux $1 jours d'avant"], [/(\\d+) received in the month/g, "$1 reçus ce mois"], [/(\\d+) received in the (\\d+) days/g, "$1 reçus en $2 jours"],
  [/in 31 days/g, "en 31 jours"], [/ · month\\b/g, " · mois"], [/ · (\\d+) days/g, " · $1 jours"],
  [/(\\d+) days\\b/g, "$1 jours"], [/\\b1 month\\b/g, "1 mois"],
  [/\\bQuest \\(model not sent\\)/g, "Quest (modèle non envoyé)"], [/\\bPico \\(model not sent\\)/g, "Pico (modèle non envoyé)"], [/\\(model not sent\\)/g, "(modèle non envoyé)"],
  [/\\bFrom (\\d+) to (\\d+)/g, "De $1 à $2"], [/\\bPlayer ([0-9a-f]{12})/g, "Joueur $1"], [/\\bEvery answer and report of (.+)/g, "Toutes les réponses et tous les rapports de $1"],
  [/\\bVotes since (.+) UTC/g, "Votes depuis $1 UTC"], [/\\bSince my last visit \\((.+)\\)/g, "Depuis ma dernière visite ($1)"],
  [/\\bSteady (\\d+) %/g, "Stable $1 %"], [/(\\d+) of (\\d+) measured seconds \\((\\d+) min\\) held (\\d+) frames a second without old frames shown again/g, "$1 secondes mesurées sur $2 ($3 min) à $4 images par seconde sans images répétées"],
  [/\\bHandled (\\S+)/g, "Traité $1"], [/(\\d+) report\\(s\\) to handle/g, "$1 rapport(s) à traiter"],
  [/\\bNot in the catalog\\b/g, "Pas dans le catalogue"], [/ · App (\\d+)/g, " · App $1"], [/ · not published yet/g, " · pas encore publié"], [/ · name unknown: /g, " · nom inconnu : "], [/ · soon/g, " · bientôt"],
  [/\\bDemo: /g, "Démo : "], [/\\bSteamDB: /g, "SteamDB : "], [/ tried offline/g, " essayé hors ligne"], [/\\bfixed in /g, "corrigé dans "], [/, still works in /g, ", marche encore dans "], [/\\bbroke in /g, "cassé dans "],
  [/ · build /g, " · build "], [/ · GamePort /g, " · GamePort "], [/ · game ([0-9A-Za-z._-]+)/g, " \u00b7 jeu $1"], [/^game ([0-9A-Za-z._-]+)$/g, "jeu $1"], [/([\u2713\u2248\u2717]) (Works offline only|Works|Offline only|Does not work)/g, function (m, mark, what) { return mark + " " + trText(what); }],
  [/ fixed (.+), was (.+)/g, " corrigé $1, était $2"], [/\\bFixed (.+), was (.+)/g, "Corrigé $1, était $2"],
  [/\\bDelete this vote\\?/g, "Supprimer ce vote ?"], [/\\bThis changes the real votes at once\\./g, "Cela change les vrais votes immédiatement."],
  [/\\bChange a vote of (.+): (.+) becomes (.+)\\. The problems ticked by the player are removed\\./g, "Modifier un vote de $1 : $2 devient $3. Les problèmes cochés par le joueur sont retirés."],
  [/\\bDeclare the passthrough for (.+)\\. The app reads it once a day, and when it patches a game\\./g, "Déclarer le passthrough pour $1. L'app le lit une fois par jour, et quand elle patche un jeu."],
  [/\\bStop declaring the passthrough for (.+)\\. The app reads it once a day, and when it patches a game\\./g, "Arrêter de déclarer le passthrough pour $1. L'app le lit une fois par jour, et quand elle patche un jeu."],
  [/\\bRemove the (.+) setting of app (\\d+)/g, "Retirer le réglage $1 de l'app $2"], [/\\bTake (.+) off the incompatible list\\./g, "Retirer $1 de la liste des incompatibles."],
  [/\\bMark as incompatible: (.+)\\. The app and the site show it at once\\./g, "Marquer comme incompatible : $1. L'app et le site l'affichent immédiatement."],
  [/\\bIncompatible: (.+)/g, "Incompatible : $1"], [/\\bChange the reason for (.+)/g, "Changer la raison pour $1"],
  [/\\bSave the reason (.+)\\. Every game that names it shows these texts at once\\./g, "Enregistrer la raison $1. Tous les jeux qui la citent affichent ces textes immédiatement."], [/\\bDelete the reason (.+)/g, "Supprimer la raison $1"],
  [/\\bMark as fixed, counted as works: (.+)/g, "Marquer comme corrigé, compté comme marche : $1"], [/\\bCount this vote as it was, not fixed: (.+)/g, "Compter ce vote tel qu'il était, non corrigé : $1"],
  [/\\bAdd a vote: (.+)/g, "Ajouter un vote : $1"], [/\\bProblems: (.+)/g, "Problèmes : $1"], [/ \\(admin\\)/g, " (admin)"],
  [/\\bGames \\(([0-9]+)\\)/g, "Jeux ($1)"], [/\\bEvery answer and report of ([^\\n]+)/g, "Toutes les réponses et tous les rapports de $1"]
];

function trText(text) {
  var lead = /^\\s*/.exec(text)[0];
  var tail = /\\s*$/.exec(text)[0];
  var core = text.slice(lead.length, text.length - tail.length);
  if (!core) return text;
  if (Object.prototype.hasOwnProperty.call(FR, core)) return lead + FR[core] + tail;
  var out = core;
  FR_RULES.forEach(function (rule) { out = out.replace(rule[0], rule[1]); });
  return lead + out + tail;
}

var EN_TEXT = typeof WeakMap === "function" ? new WeakMap() : null;
var EN_ATTR = typeof WeakMap === "function" ? new WeakMap() : null;
var TRANSLATED_ATTRS = ["title", "placeholder", "aria-label"];

/** Draws [node] and what is under it in the language picked: a text keeps its English original, so the language can be switched back and forth. */
function localize(node) {
  if (!node) return;
  if (node.nodeType === 3) {
    var parent = node.parentNode;
    if (!parent || /^(SCRIPT|STYLE|TEXTAREA)$/.test(parent.nodeName)) return;
    if (!EN_TEXT.has(node)) EN_TEXT.set(node, node.nodeValue);
    var wanted = LANG === "fr" ? trText(EN_TEXT.get(node)) : EN_TEXT.get(node);
    if (node.nodeValue !== wanted) node.nodeValue = wanted;
    return;
  }
  if (node.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(node.nodeName)) return;
  var saved = EN_ATTR.get(node) || {};
  TRANSLATED_ATTRS.forEach(function (name) {
    if (!node.hasAttribute(name)) return;
    if (saved[name] === undefined) saved[name] = node.getAttribute(name);
    var value = LANG === "fr" ? trText(saved[name]) : saved[name];
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  });
  EN_ATTR.set(node, saved);
  for (var child = node.firstChild; child; child = child.nextSibling) localize(child);
}

/** Switches the language: the whole page is drawn again in it, and the choice is kept for next time. */
function setLang(lang) {
  LANG = lang === "fr" ? "fr" : "en";
  try { localStorage.setItem("gp-console-lang", LANG); } catch (e) { /* not kept */ }
  document.documentElement.setAttribute("lang", LANG);
  Array.prototype.forEach.call(document.querySelectorAll("#lang button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === LANG)); });
  localize(document.body);
}

if (EN_TEXT && typeof MutationObserver === "function") {
  new MutationObserver(function (records) {
    if (LANG !== "fr") return;
    records.forEach(function (record) { Array.prototype.forEach.call(record.addedNodes, localize); });
  }).observe(document.body, { childList: true, subtree: true });
}
var nativeConfirm = window.confirm;
window.confirm = function (text) { return nativeConfirm.call(window, LANG === "fr" ? trText(String(text)) : text); };

var CATALOG = "https://raw.githubusercontent.com/gameport-project/gameport-catalog/main/v1/catalog.json";
var DEVICES = ["quest", "pico", "phone", "tablet", "other"];
var VERDICTS = { works: "Works", offline_only: "Offline only", fails: "Does not work" };
var state = { env: "test", games: [], current: null, votes: [], counts: {}, onlyVoted: false, incompat: {}, reasons: [], view: "", playerId: null, statuses: {}, defaults: {}, defaultRows: [], extra: {}, unhandled: 0, waiting: {}, news: null, device: "all", ready: false };

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
  document.getElementById("brand").setAttribute("href", "/console/" + env);
  syncUrl();
  document.body.className = env;
  document.getElementById("b-test").setAttribute("aria-pressed", String(env === "test"));
  document.getElementById("b-prod").setAttribute("aria-pressed", String(env === "prod"));
  loadWaiting();
  loadNews();
  loadIncompatible();
  loadDefaults();
  loadCounts().then(function () {
    drawGames();
    if (state.view === "reports") showLatestReports();
    else if (state.view === "news") showNews();
    else if (state.view === "defaults") showDefaults();
    else if (state.view === "home") showHome();
    else if (state.view === "player" && state.playerId) showPlayer(state.playerId);
    else if (state.view === "group" && state.groupKind) showGroup(state.groupKind, state.groupValue);
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

/** What the developer tells the app about each game, for this set: read again after each change, and drawn where it is open. */
function loadDefaults() {
  return call("/console/api/game-defaults?env=" + state.env).then(function (data) {
    state.defaultRows = data.games;
    state.defaults = {};
    data.games.forEach(function (row) { (state.defaults[row.appId] = state.defaults[row.appId] || {})[row.setting] = row.value; });
    if (state.view === "defaults") drawDefaults();
    else if (state.current && state.view === "game") drawGameDefaults();
  }).catch(function () { state.defaults = {}; state.defaultRows = []; });
}

/** The block of the open game that says what the app is told about it. For now one setting: the game declares the headset's passthrough, which the app does when the player left the choice on automatic. */
function drawGameDefaults() {
  var g = state.current;
  var holder = document.getElementById("game-defaults");
  if (!holder) return;
  var before = holder.querySelector("details");
  var wasOpen = !!before && before.open;
  holder.textContent = "";
  var on = (state.defaults[g.appid] || {}).passthrough === "on";
  // A switch at the right of its name: on, the app declares the passthrough for this game; a change is asked for in production and written at once.
  var toggle = el("input", { type: "checkbox", class: "tgl", role: "switch", "aria-label": "Passthrough" });
  toggle.checked = on;
  toggle.addEventListener("change", function () {
    var wanted = toggle.checked;
    if (!confirmWrite((wanted ? "Declare the passthrough for " : "Stop declaring the passthrough for ") + g.name + ". The app reads it once a day, and when it patches a game.")) { toggle.checked = !wanted; return; }
    toggle.disabled = true;
    call("/console/api/game-default-set", { appId: g.appid, setting: "passthrough", value: wanted ? "on" : null }).then(function () { toast("Saved"); loadDefaults(); }).catch(function (e) { toggle.checked = !wanted; toggle.disabled = false; toast(e.message, true); });
  });
  // Folded like the blocks around it, with the line saying where the game stands; it stays open after a change, so the result is seen.
  var box = el("details", { class: "incompat" }, [
    el("summary", { text: on ? "Settings sent to the app: passthrough declared" : "Settings sent to the app: none" }),
    el("div", { class: "add stack" }, [
      el("label", { class: "tgl-row" }, [el("span", {}, [document.createTextNode("Passthrough"), el("small", { class: "muted", text: "Declared by the app, unless the player chose otherwise" })]), toggle]),
    ]),
  ]);
  box.open = wasOpen;
  holder.appendChild(box);
}

function showDefaults() {
  state.current = null;
  state.view = "defaults";
  drawGames();
  drawDefaults();
}

/** The list of what the app is told, game by game, to look at it and to take a setting away. */
function drawDefaults() {
  var panel = document.getElementById("detail");
  panel.textContent = "";
  panel.appendChild(el("h2", { text: "Game settings (" + (state.env === "prod" ? "production" : "test") + ")" }));
  panel.appendChild(el("p", { class: "muted", text: "What the app is told about each game. It reads this once a day and when it patches a game, and applies it where the player left the choice on automatic. A game is added from its own page." }));
  if (!state.defaultRows.length) {
    panel.appendChild(el("p", { class: "muted", text: "No game has a setting." }));
    return;
  }
  var table = el("table", {}, [el("thead", {}, [el("tr", {}, ["Game", "Setting", "Since", ""].map(function (h) { return el("th", { text: h }); }))])]);
  var body = el("tbody");
  state.defaultRows.forEach(function (row) {
    var remove = el("button", { type: "button", class: "btn danger", text: "Remove", onclick: function () {
      if (!confirmWrite("Remove the " + row.setting + " setting of app " + row.appId + ".")) return;
      call("/console/api/game-default-set", { appId: row.appId, setting: row.setting, value: null }).then(function () { toast("Removed"); loadDefaults(); }).catch(function (e) { toast(e.message, true); });
    } });
    body.appendChild(el("tr", {}, [el("td", {}, [gameLink(row.appId)]), el("td", { text: row.setting === "passthrough" ? "Passthrough declared" : row.setting + ": " + row.value }), el("td", { text: formatDay(row.updated) }), el("td", {}, [remove])]));
  });
  table.appendChild(body);
  panel.appendChild(el("div", { class: "scroll" }, [table]));
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
  var tail = state.view === "player" && state.playerId ? "/player/" + state.playerId : state.view === "group" && state.groupKind ? "/" + state.groupKind + "/" + encodeURIComponent(state.groupValue) : state.view === "game" && state.current ? "/" + state.current.appid : state.view === "reports" || state.view === "news" || state.view === "reasons" || state.view === "defaults" ? "/" + state.view : "";
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
  var shown = allGames().filter(function (g) {
    if ((state.onlyVoted || state.device !== "all") && !deviceCounts(state.counts[g.appid])) return false;
    // The status a game shows (the colour of its badge, for the chosen device): only the games whose status is ticked, none that has no vote.
    var ticked = Object.keys(state.statuses).filter(function (k) { return state.statuses[k]; });
    if (ticked.length) {
      var own = deviceCounts(state.counts[g.appid]);
      if (!own || ticked.indexOf(majority(own)) === -1) return false;
    }
    return !q || g.name.toLowerCase().indexOf(q) !== -1 || String(g.appid) === q;
  });
  // The number follows every filter (search, device, status, only the voted); the list itself shows the first 200.
  var gcount = document.getElementById("gcount");
  gcount.textContent = "\u00b7 " + shown.length;
  gcount.title = shown.length > 200 ? "The first 200 are listed" : "";
  shown.slice(0, 200).forEach(function (g) {
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
    state.synth = data.synth;
    state.deviceChoices = data.deviceChoices || [];
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

/** How steadily the game ran for the player who sent it: the share of the measured seconds that held the frame rate the screen asked for, in the colour of an answer (nothing when not sent). */
function perfPill(v) {
  if (!v.perfSeconds) return document.createTextNode("");
  var pct = Math.round(100 * v.perfHeld / v.perfSeconds);
  var minutes = Math.round(v.perfSeconds / 60);
  var level = pct >= 90 ? "v-works" : pct >= 70 ? "v-offline_only" : "v-fails";
  return el("span", { class: "pill " + level, text: "Steady " + pct + " %", title: v.perfHeld + " of " + v.perfSeconds + " measured seconds (" + minutes + " min) held " + v.perfTarget + " frames a second without old frames shown again" });
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
function playerLink(hash, label, stacked, nameOnly) {
  var link = el("a", { class: "player-link", href: "/console/" + state.env + "/player/" + hash, title: "Everything this player sent",
    onclick: function (event) { event.preventDefault(); showPlayer(hash); } });
  link.appendChild(document.createTextNode(label || hash));
  if (!label) return link;
  // With [nameOnly] the name stands alone (the hash is still in the link's address).
  if (nameOnly) return el("span", {}, [discordIcon(), link]);
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

/** The version of GamePort as a link to every answer and report that came from it; a version that is not a number (an "admin" vote) stays plain text. */
function versionLink(version) {
  if (!/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(-alpha\\.\\d{1,5})?$/.test(version || "")) return document.createTextNode(version || "");
  return el("a", { class: "ver-link", href: "/console/" + state.env + "/version/" + version, text: version, title: "Every answer and report of this version",
    onclick: function (event) { event.preventDefault(); showGroup("version", version); } });
}

/** What the page of a device is named after: the name when the list knows the device, else its model, else the kind of device (the relay groups the same way). */
function deviceKey(v) {
  return v.deviceName || v.model || v.device || "";
}

/** A device (a headset, say) as a link to every answer and report that came from it. [plain] draws it as the strong title of a vote rather than as a small link. */
function deviceLink(v, text, tip, plain) {
  var key = deviceKey(v);
  var label = plain ? el("strong", { text: text, title: tip }) : document.createTextNode(text);
  if (!key || key.length > 80 || !/^[\\w %.\\-]+$/.test(key)) return label;
  return el("a", { class: "ver-link", href: "/console/" + state.env + "/device/" + encodeURIComponent(key), title: "Every answer and report of " + key,
    onclick: function (event) { event.preventDefault(); showGroup("device", key); } }, [label]);
}

/** The answers as a table, for the page of a player (the version of each), of a version (the player and the device of each) and of a device (the player and the version of each): the rest is the same. */
function answersTable(votes, kind) {
  var head = ["Game", "Answer"].concat(kind === "player" ? [] : ["Player"], kind === "device" ? [] : ["Device"], kind === "version" ? [] : ["GamePort"], ["Day", "Problems", "Report"]);
  var table = el("table", {}, [el("thead", {}, [el("tr", {}, head.map(function (h) { return el("th", { text: h }); }))])]);
  var body = el("tbody");
  votes.forEach(function (v) {
    var codes = (v.issues || "").split(",").filter(Boolean);
    var shown = v.fixed ? { verdict: "works", offline: false } : v;
    body.appendChild(el("tr", {}, [
      el("td", {}, [gameLink(v.appId)]),
      el("td", {}, [answerPill(shown), v.fixed ? el("small", { class: "muted", text: " fixed " + formatDay(v.fixed) + ", was " + ANSWERS[v.verdict] }) : null]),
      kind === "player" ? null : el("td", {}, [playerLink(v.voter, v.label, true)]),
      kind === "device" ? null : el("td", {}, [document.createTextNode(v.device), modelLine(v)]),
      kind === "version" ? null : el("td", {}, [versionLink(v.app)]),
      el("td", { text: formatDay(v.updated) }),
      el("td", {}, [codes.length ? issuePills(codes) : document.createTextNode("")]),
      el("td", {}, [reportPill(v.reportState)]),
    ]));
  });
  table.appendChild(body);
  return el("div", { class: "scroll" }, [table]);
}

/** An element of an SVG, drawn from attributes only (the page's policy allows no style attribute). */
function svgNode(tag, attrs) {
  var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.keys(attrs).forEach(function (name) { node.setAttribute(name, attrs[name]); });
  return node;
}

/** The three answers as three bars in the colours of the answers, each with its count and its share; each bar is a button: [onPick] is called with the answer it stands for (or null for the same one again). */
function answerBars(count, picked, onPick) {
  var total = count.works + count.offline_only + count.fails;
  var box = el("div", { class: "bars" });
  [["works", "Works"], ["offline_only", "Works offline only"], ["fails", "Does not work"]].forEach(function (row) {
    var n = count[row[0]];
    var share = total ? (n * 100) / total : 0;
    var svg = svgNode("svg", { class: "bar", viewBox: "0 0 100 12", preserveAspectRatio: "none", role: "img", "aria-hidden": "true" });
    svg.appendChild(svgNode("rect", { x: "0", y: "0", width: "100", height: "12", rx: "3", class: "bar-track" }));
    if (n) svg.appendChild(svgNode("rect", { x: "0", y: "0", width: String(Math.max(share, 1.5)), height: "12", rx: "3", class: "bar-fill bar-" + row[0] }));
    box.appendChild(el("button", Object.assign({ type: "button", class: "bar-row", "aria-pressed": String(picked === row[0]), title: n ? "Show only: " + row[1] : "",
      onclick: function () { onPick(picked === row[0] ? null : row[0]); } }, n ? {} : { disabled: "disabled" }), [el("span", { text: row[1] }), svg, el("b", { text: String(n) }), el("small", { class: "muted", text: total ? Math.round(share) + " %" : "" })]));
  });
  return box;
}

/** A version of GamePort as numbers to sort by, or null when it is not one; a test build (0.9.2-alpha.3) comes before its release. */
function versionParts(text) {
  var found = /^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})(?:-alpha\\.(\\d{1,5}))?$/.exec(text || "");
  return found ? [Number(found[1]), Number(found[2]), Number(found[3]), found[4] === undefined ? Infinity : Number(found[4])] : null;
}
function byVersion(a, b) {
  var x = versionParts(a), y = versionParts(b);
  if (!x || !y) return x ? -1 : y ? 1 : 0;
  for (var i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

var THIN_VERSION = 5;
var TREND_POINTS = 10;

/** One line per version of GamePort, oldest first: the three answers as one bar, the number of answers, and whether the share that does not work went up or down since the version before. A version with few answers is dimmed and not compared. */
function versionChart(votes) {
  var rows = {};
  votes.forEach(function (v) {
    var row = rows[v.app] || (rows[v.app] = { app: v.app, works: 0, offline_only: 0, fails: 0 });
    row[v.fixed ? "works" : v.verdict]++;
  });
  var list = Object.keys(rows).map(function (k) { return rows[k]; }).sort(function (a, b) { return byVersion(a.app, b.app); });
  var box = el("div", { class: "vchart" });
  var before = null;
  list.forEach(function (row) {
    var total = row.works + row.offline_only + row.fails;
    var thin = total < THIN_VERSION;
    var share = (row.fails * 100) / total;
    var svg = svgNode("svg", { class: "bar", viewBox: "0 0 100 12", preserveAspectRatio: "none", role: "img", "aria-label": row.app + ": " + row.works + " work, " + row.offline_only + " offline only, " + row.fails + " do not work" });
    var x = 0;
    ["works", "offline_only", "fails"].forEach(function (key) {
      if (!row[key]) return;
      var width = (row[key] * 100) / total;
      svg.appendChild(svgNode("rect", { x: String(x), y: "0", width: String(width), height: "12", class: "seg-" + key }));
      x += width;
    });
    var note = el("small", { class: "muted" });
    if (thin) note.textContent = "few answers";
    else {
      note.textContent = Math.round(share) + " % do not work";
      if (before !== null && Math.abs(share - before) >= TREND_POINTS) {
        note.appendChild(el("span", { class: share < before ? "trend-better" : "trend-worse", text: share < before ? " \u25b2 better" : " \u25bc worse", title: "Against the version before that has enough answers: " + Math.round(before) + " %" }));
      }
      before = share;
    }
    box.appendChild(el("div", { class: "vrow" + (thin ? " thin" : "") }, [versionLink(row.app), svg, el("b", { text: String(total) }), note]));
  });
  return box;
}

var WAS_NOW = { works: "Works", offline_only: "Offline only", fails: "Does not work" };
var GAME_NOTE = { same: "same game build", changed: "the game was updated too", unknown: "game build unknown" };

/** The moves of the players from a version of GamePort to a newer one, grouped by pair of versions: how many got worse, how many got better, and the games. */
function changesBlocks(panel, changes, version) {
  if (version) {
    changesGroup(panel, "Arrived on " + version + " from an older version", changes.filter(function (c) { return c.to === version; }));
    changesGroup(panel, "Went on from " + version + " to a newer version", changes.filter(function (c) { return c.from === version; }));
  } else changesGroup(panel, "Changes between versions of GamePort", changes);
}
function changesGroup(panel, title, list) {
  var rows = [];
  if (!list.length) rows.push(el("p", { class: "muted", text: "No player moved between these versions." }));
  var pairs = {};
  list.forEach(function (c) { (pairs[c.from + "|" + c.to] = pairs[c.from + "|" + c.to] || []).push(c); });
  Object.keys(pairs).sort(function (a, b) {
    var x = a.split("|"), y = b.split("|");
    return byVersion(y[1], x[1]) || byVersion(y[0], x[0]);
  }).forEach(function (key) {
    var items = pairs[key];
    var worse = items.filter(function (c) { return c.kind === "regression"; });
    var better = items.filter(function (c) { return c.kind === "improvement"; });
    var tags = el("div", {}, [el("span", { class: "chg-pair", text: key.split("|")[0] + " \u2192 " + key.split("|")[1] })]);
    if (worse.length) tags.appendChild(el("span", { class: "chg-tag worse", text: "\u25bc " + worse.length + " worse" + (worse.some(function (c) { return c.game === "changed"; }) ? " (" + worse.filter(function (c) { return c.game === "changed"; }).length + " with the game updated)" : "") }));
    if (better.length) tags.appendChild(el("span", { class: "chg-tag better", text: "\u25b2 " + better.length + " better" }));
    var chips = el("div", { class: "chips" });
    worse.concat(better).forEach(function (c) {
      chips.appendChild(el("span", { class: "chg-chip " + (c.kind === "regression" ? "worse" : "better"), title: WAS_NOW[c.was] + " \u2192 " + WAS_NOW[c.now] + " (" + GAME_NOTE[c.game] + ")" }, [
        el("span", { class: c.kind === "regression" ? "arrow-worse" : "arrow-better", text: c.kind === "regression" ? "\u25bc" : "\u25b2" }), gameLink(c.appId),
        c.game === "changed" ? el("small", { class: "muted", text: "game updated" }) : null,
      ]));
    });
    rows.push(el("div", { class: "chg-group" }, [tags, chips]));
  });
  panel.appendChild(card(title + " (" + list.length + ")", rows));
}

/** The games of a page of a version or of a device, one line each: the answer most of their answers give, and how those answers split. [ids] are the apps, in the order to show. */
function gamesTable(ids, perGame, classOfGame) {
  var table = el("table", {}, [el("thead", {}, [el("tr", {}, ["Game", "Verdict", "Work", "Work offline only", "Do not work", "Answers"].map(function (h) { return el("th", { text: h }); }))])]);
  var body = el("tbody");
  ids.forEach(function (id) {
    var c = perGame[id];
    body.appendChild(el("tr", { class: "v-" + classOfGame[id] }, [
      el("td", {}, [gameLink(Number(id))]), el("td", {}, [answerPill({ verdict: classOfGame[id], offline: false })]),
      el("td", { class: c.works ? "up" : "muted", text: String(c.works) }), el("td", { class: c.offline_only ? "" : "muted", text: String(c.offline_only) }), el("td", { class: c.fails ? "down" : "muted", text: String(c.fails) }),
      el("td", { text: String(c.works + c.offline_only + c.fails) }),
    ]));
  });
  table.appendChild(body);
  return el("div", { class: "scroll" }, [table]);
}

var groupAsked = 0;

/** A card with a title: the page of a version, of a device and the home are made of them. */
function card(title, children) {
  return el("section", { class: "gcard" }, (title ? [el("h2", { text: title })] : []).concat(children));
}

/** Every answer and every report of one version of GamePort, or of one device: the page of a player, for what many players have in common. */
function showGroup(kind, value) {
  state.current = null;
  state.view = "group";
  state.groupKind = kind;
  state.groupValue = value;
  state.playerId = null;
  var mine = ++groupAsked;
  drawGames();
  var panel = document.getElementById("detail");
  panel.textContent = "";
  panel.appendChild(el("h2", { text: (kind === "version" ? "GamePort " : "") + value }));
  call("/console/api/" + kind + "?env=" + state.env + "&" + (kind === "version" ? "app" : "name") + "=" + encodeURIComponent(value)).then(function (data) {
    // Only the last request draws, as for a player.
    if (mine !== groupAsked || state.view !== "group") return;
    var body = el("div");
    panel.appendChild(body);
    var mode = "answers";
    var picked = null;
    var paint = function () {
      body.textContent = "";
      // What each answer is, and what each game is (the answer most of its answers give): the two ways to count.
      var perGame = {};
      data.votes.forEach(function (v) { var c = perGame[v.appId] || (perGame[v.appId] = { works: 0, offline_only: 0, fails: 0 }); c[v.fixed ? "works" : v.verdict]++; });
      var classOfGame = {};
      Object.keys(perGame).forEach(function (id) { classOfGame[id] = majority(perGame[id]); });
      var classOf = function (v) { return mode === "games" ? classOfGame[v.appId] : (v.fixed ? "works" : v.verdict); };
      var count = { works: 0, offline_only: 0, fails: 0 };
      var players = {};
      if (mode === "games") Object.keys(classOfGame).forEach(function (id) { count[classOfGame[id]]++; });
      data.votes.forEach(function (v) { if (mode === "answers") count[classOf(v)]++; players[v.voter] = true; });
      var many = Object.keys(players).length;
      var gamesCount = Object.keys(perGame).length;
      var seg = el("div", { class: "seg", role: "group", "aria-label": "What is counted" }, [
        el("button", { type: "button", text: "Answers", "aria-pressed": String(mode === "answers"), title: "Each player counts once per game, with the last answer they gave", onclick: function () { mode = "answers"; picked = null; paint(); } }),
        el("button", { type: "button", text: "Different games", "aria-pressed": String(mode === "games"), title: "Each game counts once, as the answer most of its answers give", onclick: function () { mode = "games"; picked = null; paint(); } }),
      ]);
      var sum = mode === "games" ? gamesCount + (gamesCount === 1 ? " different game" : " different games") + " \u00b7 " + data.votes.length + (data.votes.length === 1 ? " answer" : " answers") : data.votes.length + (data.votes.length === 1 ? " answer" : " answers") + " from " + many + (many === 1 ? " player" : " players") + " \u00b7 " + gamesCount + (gamesCount === 1 ? " game" : " games");
      body.appendChild(card("", [
        el("div", { class: "gcard-head" }, [el("h2", { text: "Does it work?" }), seg]),
        answerBars(count, picked, function (answer) { picked = answer; paint(); }),
        el("p", { class: "muted bars-sum", text: sum }),
      ]));
      var problems = {};
      data.votes.forEach(function (v) { if (!v.fixed && v.verdict !== "works") (v.issues || "").split(",").filter(Boolean).forEach(function (code) { problems[code] = (problems[code] || 0) + 1; }); });
      var ticked = Object.keys(problems).sort(function (x, y) { return problems[y] - problems[x]; }).map(function (code) { return [code, problems[code]]; });
      if (ticked.length) body.appendChild(card("What goes wrong", [issuePills(ticked)]));
      // The move from one version to the next, version by version, for the page of a device.
      if (kind === "device" && data.votes.length) body.appendChild(card("By version of GamePort", [versionChart(data.votes)]));
      var changes = el("div");
      changesBlocks(changes, data.changes || [], kind === "version" ? value : null);
      body.appendChild(changes);
      // Counting answers, the table lists the answers; counting different games, it lists the games (one line each, with how their answers split), so a game that mostly works never shows up
      // with a "does not work" line of its own under "works".
      var shown = picked ? data.votes.filter(function (v) { return classOf(v) === picked; }) : data.votes;
      var shownGames = Object.keys(perGame).filter(function (id) { return !picked || classOfGame[id] === picked; }).sort(function (x, y) {
        var a = perGame[x], b = perGame[y];
        return (b.works + b.offline_only + b.fails) - (a.works + a.offline_only + a.fails);
      });
      var list = [el("h2", { text: (mode === "games" ? "Games (" + shownGames.length : "Answers (" + shown.length) + ")" })];
      if (picked) list.push(el("p", { class: "filter-note" }, [document.createTextNode("Only " + (mode === "games" ? "the games that " : "the answers that ") + { works: "work", offline_only: "work offline only", fails: "do not work" }[picked]), el("button", { type: "button", text: "Show all", onclick: function () { picked = null; paint(); } })]));
      if (mode === "games") list.push(shownGames.length ? gamesTable(shownGames, perGame, classOfGame) : el("p", { class: "muted", text: "No game here." }));
      else list.push(shown.length ? answersTable(shown, kind) : el("p", { class: "muted", text: "No answer here." }));
      body.appendChild(el("div", { class: "answers-block" }, list));
      body.appendChild(el("h2", { text: "Reports (" + data.reports.length + ")" }));
      body.appendChild(data.reports.length ? reportsTable(data.reports, true, function () { showGroup(kind, value); }, false) : el("p", { class: "muted", text: "No report here." }));
    };
    paint();
  }).catch(function (e) { toast(e.message, true); });
}

/**
 * A stacked bar with its numbers inside it: one block per answer that has games, as wide as its share, rounded at both ends (the box clips it). [parts] are [class, count, label];
 * every block holds its number, and is never narrower than a digit needs (18 px), so a small block is a little wider than its exact share. The widths are set from script (a style attribute in the markup is not allowed by the page's policy).
 */
function stackBar(parts, total) {
  var box = el("div", { class: "barstack", role: "img", "aria-label": parts.map(function (p) { return p[1] + " " + p[2]; }).join(", ") });
  parts.forEach(function (part) {
    if (!part[1]) return;
    var block = el("span", { class: "barstack-part " + part[0], title: part[1] + " " + part[2], text: String(part[1]) });
    block.style.flexGrow = String(part[1]);
    box.appendChild(block);
  });
  return box;
}

var homeAsked = 0;

/** The sum of one field over the days of [list] from index [from] (included) to [to] (excluded), counted from the end when negative. */
function sumOf(list, field, from, to) {
  return list.slice(from, to).reduce(function (total, row) { return total + row[field]; }, 0);
}

/** A number with how it moved against the period before: "+4" or "-2" in the colour of the move, nothing when both are zero. */
function deltaNote(now, before, label) {
  var tail = label ? " " + label : "";
  if (!now && !before) return el("span", { class: "muted", text: label || "\u2013" });
  var diff = now - before;
  return el("span", { class: diff > 0 ? "up" : diff < 0 ? "down" : "muted", text: (diff > 0 ? "\u25b2 +" : diff < 0 ? "\u25bc " : "= ") + diff + tail });
}

/** "1 answer", "2 answers". */
function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

/** The kind of device a console name stands for when the app did not say the model ("quest", "pico"): shown with a note, linked under its own name. */
function deviceShown(name) { return /^[a-z]+$/.test(name) ? name.charAt(0).toUpperCase() + name.slice(1) + " (model not sent)" : name; }

/** The games the catalog says became installable on Android in [from, to) (days written YYYY-MM-DD; a missing bound is open). */
function newGamesBetween(from, to) {
  return state.games.filter(function (g) { return g.androidSince && (!from || g.androidSince >= from) && (!to || g.androidSince < to); });
}

/** A line chart of the number of games that work, work offline only and do not work, day by day, drawn from attributes only. */
function evolutionChart(series) {
  var width = 640, height = 190, left = 30, right = 8, top = 8, bottom = 22;
  var max = 1;
  series.forEach(function (d) { max = Math.max(max, d.works, d.offline_only, d.fails); });
  var svg = svgNode("svg", { viewBox: "0 0 " + width + " " + height, class: "evo", role: "img", "aria-label": "Games that work or not, day by day" });
  [0, 0.5, 1].forEach(function (f) {
    var y = top + (1 - f) * (height - top - bottom);
    svg.appendChild(svgNode("line", { x1: String(left), x2: String(width - right), y1: String(y), y2: String(y), class: "axis" }));
    var label = svgNode("text", { x: "0", y: String(y + 3), class: "axis-text" });
    label.textContent = String(Math.round(max * f));
    svg.appendChild(label);
  });
  ["works", "offline_only", "fails"].forEach(function (key) {
    var points = series.map(function (d, i) {
      var x = left + (series.length === 1 ? 0 : (i * (width - left - right)) / (series.length - 1));
      var y = top + (1 - d[key] / max) * (height - top - bottom);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    svg.appendChild(svgNode("polyline", { points: points, class: "line-" + key, "stroke-linejoin": "round", "stroke-linecap": "round" }));
  });
  [0, series.length - 1].forEach(function (i, n) {
    var t = svgNode("text", { x: String(n ? width - right : left), y: String(height - 5), class: "axis-text", "text-anchor": n ? "end" : "start" });
    t.textContent = series[i] ? formatDay(series[i].day) : "";
    svg.appendChild(t);
  });
  return svg;
}

/** The home: what the last days look like, and how the games, the players, the versions and the devices stand. */
function showHome() {
  state.current = null;
  state.view = "home";
  state.playerId = null;
  var mine = ++homeAsked;
  drawGames();
  var panel = document.getElementById("detail");
  panel.textContent = "";
  var head = el("div", { class: "home-head" }, [el("h2", { text: "Overview (" + (state.env === "prod" ? "production" : "test") + ")" })]);
  panel.appendChild(head);
  call("/console/api/home?env=" + state.env).then(function (data) {
    if (mine !== homeAsked || state.view !== "home") return;
    var daily = data.daily;
    var n = daily.length;
    var day = function (back) { return daily[n - 1 - back].day; };
    // The periods are the last days, not the calendar: today, the last 7 days and the last 31, each against the period of the same length just before it.
    var periods = [["Today", 1], ["7 days", 7], ["31 days", 31]];
    var count = function (field, length) {
      return [sumOf(daily, field, n - length, n), sumOf(daily, field, n - 2 * length, n - length)];
    };
    var fresh = function (length) {
      return [newGamesBetween(daily[n - length].day, null).length, newGamesBetween(daily[n - 2 * length].day, daily[n - length].day).length];
    };
    var rows = [["Answers", function (len) { return count("answers", len); }], ["New players", function (len) { return count("newPlayers", len); }], ["Reports received", function (len) { return count("reports", len); }], ["New games", fresh]];
    var hero = el("div", { class: "hero-stats" });
    var heroVersions = data.versions.filter(function (v) { return versionParts(v.app); }).sort(function (x, y) { return byVersion(y.app, x.app); });
    var heroTotal = data.versions.reduce(function (t, v) { return t + v.players; }, 0);
    // The four tiles follow the period picked at the top (7 days, 14 days or a month), each against the period of the same length just before it.
    var periodPick = state.homePeriod || 7;
    var paintPeriod = function () {};
    var paintHero = function () {
      hero.textContent = "";
      var span = periodPick === 31 ? "month" : periodPick + " days";
      var before = periodPick === 31 ? "the month before" : "the " + periodPick + " days before";
      [["Answers", rows[0][1](periodPick)], ["New players", rows[1][1](periodPick)], ["New games", rows[3][1](periodPick)]].forEach(function (t) {
        hero.appendChild(el("div", { class: "stat" }, [el("small", { text: t[0] }), el("span", { class: "stat-span", text: span }), el("b", { text: String(t[1][0]) }), deltaNote(t[1][0], t[1][1], "vs " + before)]));
      });
      hero.appendChild(el("div", { class: "stat" }, [el("small", { text: "Reports to handle" }), el("span", { class: "stat-span", text: "now" }), el("b", { text: String(data.waiting) }), el("span", { class: "muted", text: rows[2][1](periodPick)[0] + " received in the " + (periodPick === 31 ? "month" : periodPick + " days") })]));
      if (heroVersions.length && heroTotal) hero.appendChild(el("div", { class: "stat" }, [el("small", { text: "On the newest version" }), el("span", { class: "stat-span", text: "last 31 days" }), el("b", { text: Math.round((heroVersions[0].players * 100) / heroTotal) + " %" }), el("span", { class: "muted", text: heroVersions[0].players + " of " + heroTotal + " players on " + heroVersions[0].app })]));
    };
    var pick = el("div", { class: "seg-fine", role: "group", "aria-label": "Period" });
    [[7, "7 days"], [14, "14 days"], [31, "1 month"]].forEach(function (choice) {
      pick.appendChild(el("button", { type: "button", text: choice[1], "aria-pressed": String(periodPick === choice[0]), onclick: function () {
        periodPick = choice[0];
        state.homePeriod = choice[0];
        Array.prototype.forEach.call(pick.children, function (b, i) { b.setAttribute("aria-pressed", String([7, 14, 31][i] === periodPick)); });
        paintHero();
        paintPeriod();
      } }));
    });
    head.appendChild(pick);
    paintHero();
    panel.appendChild(hero);

    var table = el("table", { class: "stat-table" }, [el("thead", {}, [el("tr", {}, [el("th", { text: "" })].concat(periods.map(function (p) { return el("th", { text: p[0] }); })))])]);
    var body = el("tbody");
    rows.forEach(function (row) {
      body.appendChild(el("tr", {}, [el("td", { text: row[0] })].concat(periods.map(function (p) {
        var v = row[1](p[1]);
        return el("td", {}, [el("b", { text: String(v[0]) }), el("small", {}, [deltaNote(v[0], v[1], "")])]);
      }))));
    });
    table.appendChild(body);

    var grid = el("div", { class: "home-grid" });
    grid.appendChild(card("Activity", [table, el("p", { class: "muted bars-sum", text: "Arrows: change against the period of the same length just before." })]));

    // The new games of the period picked at the top, newest first, each a link to its page: the card is drawn again when the period changes.
    var newBody = el("div");
    var newTitle = el("h2");
    var paintNew = function () {
      var since = daily[n - periodPick].day;
      var newest = newGamesBetween(since, null).sort(function (a, b) { return a.androidSince < b.androidSince ? 1 : -1; });
      newTitle.textContent = "New games (" + newest.length + " in " + (periodPick === 31 ? "the month" : periodPick + " days") + ")";
      newBody.textContent = "";
      if (!newest.length) { newBody.appendChild(el("p", { class: "muted", text: "No new game in this period." })); return; }
      var list = el("ul", { class: "new-list" });
      newest.forEach(function (g) { list.appendChild(el("li", {}, [gameLink(g.appid), el("small", { class: "muted", text: "  " + formatDay(g.androidSince) })])); });
      newBody.appendChild(el("div", { class: "scroll-list" }, [list]));
    };
    grid.appendChild(el("section", { class: "gcard" }, [newTitle, newBody]));
    paintNew();
    paintPeriod = paintNew;

    // The games that work or not, day by day: all devices, or one picked in the list.
    var evoHost = el("div");
    var legendHost = el("div");
    var chosenDevice = "";
    var paintEvolution = function () {
      var series = chosenDevice ? data.evolutionByDevice[chosenDevice] : data.evolution;
      var last = series[series.length - 1];
      var first = series[0];
      evoHost.textContent = "";
      evoHost.appendChild(evolutionChart(series));
      legendHost.textContent = "";
      legendHost.appendChild(el("div", { class: "legend" }, [["works", "Work", "#4cc38a"], ["offline_only", "Work offline only", "#f0b24a"], ["fails", "Do not work", "#ef6b6b"]].map(function (k) {
        var dot = el("i"); dot.setAttribute("class", "dot-" + k[0]);
        return el("span", {}, [dot, document.createTextNode(k[1] + " " + last[k[0]] + " "), deltaNote(last[k[0]], first[k[0]], "in 31 days")]);
      })));
    };
    var pickKeys = Object.keys(data.evolutionByDevice);
    var pickKinds = pickKeys.filter(function (k) { return k.indexOf("kind:") === 0; });
    var pickModels = pickKeys.filter(function (k) { return k.indexOf("kind:") !== 0; });
    var kindWord = function (k) { var w = k.slice(5); return w.charAt(0).toUpperCase() + w.slice(1) + " (all models)"; };
    var deviceSelect = el("select", { class: "device-pick", "aria-label": "Device" }, [el("option", { value: "", text: "All devices" })]
      .concat(pickKinds.map(function (k) { return el("option", { value: k, text: kindWord(k) }); }))
      .concat(pickModels.map(function (name) { return el("option", { value: name, text: deviceShown(name) }); })));
    deviceSelect.addEventListener("change", function () { chosenDevice = deviceSelect.value; paintEvolution(); });
    grid.appendChild(el("section", { class: "gcard wide" }, [
      el("div", { class: "gcard-head" }, [el("h2", { text: "Games that work or not, day by day" }), deviceSelect]),
      evoHost, legendHost,
      el("p", { class: "muted bars-sum", text: "Each game counts once, as the answer most of its answers give (a tie counts as not working). Only games with at least one answer are counted." }),
    ]));
    paintEvolution();

    var players = el("table", { class: "rank" }, [el("thead", {}, [el("tr", {}, ["Player", "Games", "Work / not", "Answers", "Reports"].map(function (h) { return el("th", { text: h }); }))])]);
    var pbody = el("tbody");
    data.topPlayers.forEach(function (p) {
      var who = el("div", { class: "who" }, [playerLink(p.voter, p.label, true, true)]);
      if (p.devices && p.devices.length) who.appendChild(el("div", { class: "who-dev" }, p.devices.slice(0, 3).map(function (name) { return deviceLink({ deviceName: name }, deviceShown(name)); })));
      var parts = [["seg-works", p.works, "work"], ["seg-offline_only", p.offline_only, "work offline only"], ["seg-fails", p.fails, "do not work"]];
      pbody.appendChild(el("tr", {}, [el("td", {}, [who]), el("td", { text: String(p.games) }), el("td", { class: "split" }, [stackBar(parts, p.games)]), el("td", { text: String(p.answers) }), el("td", { text: String(p.reports) })]));
    });
    players.appendChild(pbody);
    grid.appendChild(card("Top players", [el("small", { class: "muted", text: "By different games answered, with how their games split and the devices they use" }), data.topPlayers.length ? players : el("p", { class: "muted", text: "No player yet." })]));

    // The games that work best and the games that fail the most: a line per game with a bar of how its answers split, the counts inside it, and no table lines.
    var gameBars = function (title, level, items) {
      var box = el("div", { class: "gb" }, [el("small", { class: "top-head " + level, text: title })]);
      if (!items.length) box.appendChild(el("p", { class: "muted", text: "Nothing yet." }));
      items.forEach(function (g) {
        var parts = [["seg-works", g.works, "work"], ["seg-offline_only", g.offline_only, "work offline only"], ["seg-fails", g.fails, "do not work"]];
        box.appendChild(el("div", { class: "gb-row" }, [gameLink(g.appId), stackBar(parts, g.answers), el("small", { class: "muted", text: plural(g.answers, "answer") })]));
      });
      return box;
    };
    grid.appendChild(card("Top games", [gameBars("Work best", "ok", data.topGames.working), gameBars("Fail the most", "bad", data.topGames.failing)]));

    // The players by version of GamePort: the share of the players seen lately on each, newest first. One colour: the length of the bar is the only thing to read.
    var real = data.versions.filter(function (v) { return versionParts(v.app); }).sort(function (x, y) { return byVersion(y.app, x.app); });
    var other = data.versions.filter(function (v) { return !versionParts(v.app); });
    var allPlayers = data.versions.reduce(function (t, v) { return t + v.players; }, 0);
    var percent = function (n) { return allPlayers ? Math.round((n * 100) / allPlayers) + " %" : "0 %"; };
    var versions = el("div", { class: "vchart" });
    var biggest = 1;
    data.versions.forEach(function (v) { biggest = Math.max(biggest, v.players); });
    var newestApp = real.length ? real[0].app : null;
    var versionRow = function (v) {
      var svg = svgNode("svg", { class: "bar", viewBox: "0 0 100 12", preserveAspectRatio: "none", role: "img", "aria-hidden": "true" });
      svg.appendChild(svgNode("rect", { x: "0", y: "0", width: "100", height: "12", class: "bar-track" }));
      svg.appendChild(svgNode("rect", { x: "0", y: "0", width: String(Math.max((v.players * 100) / biggest, 2)), height: "12", class: "bar-fill bar-accent" }));
      var name = el("span", {}, [versionLink(v.app)]);
      if (v.app === newestApp) name.appendChild(el("span", { class: "tag-latest", text: "NEWEST" }));
      return el("div", { class: "vrow ver-only" }, [name, svg, el("b", { text: String(v.players) }), el("small", { class: "muted", text: percent(v.players) + " of players" })]);
    };
    // Sorted by the number of players or by the version, each way: a click on the sort already in use flips it.
    var vsort = state.versionSort || { by: "players", dir: "desc" };
    var sortButtons = el("div", { class: "seg-fine", role: "group", "aria-label": "Sort" });
    var paintVersions = function () {
      state.versionSort = vsort;
      // A line that is not a version number (added by hand) always comes last, whatever the sort.
      var numbered = data.versions.filter(function (v) { return versionParts(v.app); }).sort(function (x, y) {
        var order = vsort.by === "players" ? x.players - y.players || byVersion(x.app, y.app) : byVersion(x.app, y.app);
        return vsort.dir === "desc" ? -order : order;
      });
      var rows = numbered.concat(data.versions.filter(function (v) { return !versionParts(v.app); }));
      versions.textContent = "";
      rows.forEach(function (v) { versions.appendChild(versionRow(v)); });
      sortButtons.textContent = "";
      [["version", "Version"], ["players", "Players"]].forEach(function (choice) {
        var on = vsort.by === choice[0];
        sortButtons.appendChild(el("button", { type: "button", "aria-pressed": String(on), title: "Sort by " + choice[1].toLowerCase(), text: choice[1] + (on ? (vsort.dir === "desc" ? " \u25bc" : " \u25b2") : ""), onclick: function () {
          vsort = on ? { by: vsort.by, dir: vsort.dir === "desc" ? "asc" : "desc" } : { by: choice[0], dir: "desc" };
          paintVersions();
        } }));
      });
    };
    paintVersions();
    var headline = real.length ? el("p", { class: "headline" }, [el("b", { text: percent(real[0].players) }), document.createTextNode(" of the players are on the newest version seen (" + real[0].app + ")")]) : null;
    grid.appendChild(el("section", { class: "gcard wide" }, [el("h2", { text: "Players by version of GamePort" }), el("small", { class: "muted", text: "Seen in the last 31 days, by the version of their last answer. Click a version for everything it sent." }), data.versions.length ? el("div", {}, [headline, el("div", { class: "sort-row" }, [sortButtons]), versions]) : el("p", { class: "muted", text: "No player seen." })]));

    // The updates: of the players seen in the period picked at the top (a player not seen since may have stopped using GamePort), who were already there before a release came out, the share
    // now on it or on a newer one, and the usual wait. Release versions only. The card is drawn again when the period changes.
    var adoptTitle = el("h2");
    var adoptBody = el("div");
    var paintAdopt = function () {
      var span = periodPick === 31 ? "the last month" : "the last " + periodPick + " days";
      adoptTitle.textContent = "Updates: players seen in " + span;
      adoptBody.textContent = "";
      var releases = ((data.adoption || {})[periodPick] || []).filter(function (v) { return v.app.indexOf("-alpha") === -1; }).slice(0, 8);
      var lead = releases.filter(function (v) { return v.eligible > 0; })[0];
      adoptBody.appendChild(el("p", { class: "muted bars-sum", text: "Only players who answered in this period are counted, and only those who were already there before a version came out. Of them, the share whose last answer is on that version or a newer one." }));
      if (lead) adoptBody.appendChild(el("p", { class: "headline" }, [el("b", { text: Math.round((lead.moved * 100) / lead.eligible) + " %" }), document.createTextNode(" of those players already updated to " + lead.app + " (out " + formatDay(lead.firstSeen) + ")")]));
      if (!releases.length) { adoptBody.appendChild(el("p", { class: "muted", text: "No release version yet." })); return; }
      var table = el("table", { class: "rank adopt" }, [el("thead", {}, [el("tr", {}, ["Version", "Out since", "Players concerned", "Updated", "Usual wait"].map(function (h) { return el("th", { text: h }); }))])]);
      var tbody = el("tbody");
      releases.forEach(function (v) {
        var share = v.eligible ? Math.round((v.moved * 100) / v.eligible) : null;
        var bar = svgNode("svg", { class: "bar", viewBox: "0 0 100 12", preserveAspectRatio: "none", role: "img", "aria-hidden": "true" });
        bar.appendChild(svgNode("rect", { x: "0", y: "0", width: "100", height: "12", class: "bar-track" }));
        if (share) bar.appendChild(svgNode("rect", { x: "0", y: "0", width: String(Math.max(share, 2)), height: "12", class: "bar-fill bar-accent" }));
        var updated = share === null ? el("td", { class: "muted", text: "\u2013", title: "No player seen in this period was there before this version" })
          : el("td", { class: "upd", title: v.moved + " of " + v.eligible + " players" }, [bar, el("b", { text: share + " %" })]);
        var wait = v.medianDays === null ? el("td", { class: "muted", text: "\u2013" }) : el("td", { text: v.medianDays === 0 ? "the same day" : v.medianDays + (v.medianDays === 1 ? " day" : " days") });
        tbody.appendChild(el("tr", {}, [el("td", {}, [versionLink(v.app)]), el("td", { text: formatDay(v.firstSeen) }), el("td", { text: String(v.eligible) }), updated, wait]));
      });
      table.appendChild(tbody);
      adoptBody.appendChild(el("div", { class: "scroll" }, [table]));
    };
    grid.appendChild(el("section", { class: "gcard wide" }, [adoptTitle, adoptBody]));
    paintAdopt();
    var paintNewGames = paintPeriod;
    paintPeriod = function () { paintNewGames(); paintAdopt(); };

    // The devices grouped by brand (Meta, Pico, the others), the brand with the most answers first and the biggest device first inside it.
    var devices = el("div");
    var brandOf = { quest: "Meta", pico: "Pico", phone: "Phones", tablet: "Tablets", other: "Other" };
    var brands = {};
    data.devices.forEach(function (d) {
      var brand = brandOf[d.kind] || "Other";
      var group = brands[brand] || (brands[brand] = { brand: brand, answers: 0, items: [] });
      group.answers += d.answers;
      group.items.push(d);
    });
    Object.keys(brands).map(function (k) { return brands[k]; }).sort(function (x, y) { return y.answers - x.answers; }).forEach(function (group) {
      var section = el("div", { class: "dev-group" }, [el("small", { class: "dev-brand", text: group.brand })]);
      group.items.sort(function (x, y) { return y.answers - x.answers; }).forEach(function (d) {
        var total = d.works + d.offline_only + d.fails;
        var okShare = total ? Math.round((d.works * 100) / total) : 0;
        var parts = [["seg-works", d.works, "games work"], ["seg-offline_only", d.offline_only, "games work offline only"], ["seg-fails", d.fails, "games do not work"]];
        section.appendChild(el("div", { class: "dev-row" }, [deviceLink({ deviceName: d.name }, deviceShown(d.name)), stackBar(parts, total), el("small", { class: "muted" }, [el("b", { class: okShare >= 80 ? "up" : okShare >= 60 ? "" : "down", text: okShare + " % work" }), document.createTextNode(" \u00b7 " + plural(d.answers, "answer"))])]));
      });
      devices.appendChild(section);
    });
    grid.appendChild(el("section", { class: "gcard wide" }, [el("h2", { text: "Games by device: work, work offline only, do not work" }), data.devices.length ? devices : el("p", { class: "muted", text: "No answer yet." })]));
    panel.appendChild(grid);

    var changes = el("div");
    changesGroup(changes, "Changes this week between versions", data.changes);
    panel.appendChild(changes);
  }).catch(function (e) { toast(e.message, true); });
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
    panel.appendChild(data.votes.length ? answersTable(data.votes, "player") : el("p", { class: "muted", text: "No answer from this player." }));

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
  panel.appendChild(el("div", { id: "game-defaults" }));
  drawGameDefaults();

  var device = select(DEVICES, "quest");
  var verdict = select(Object.keys(VERDICTS), "works", VERDICTS);
  var offline = el("input", { type: "checkbox", id: "add-offline" });
  var offlineLabel = el("label", { class: "muted" }, [offline, document.createTextNode(" tried offline")]);
  var version = el("input", { type: "text", class: "field wide", "aria-label": "GamePort version", placeholder: "GamePort version (empty: the newest release)", maxlength: "32" });
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
  panel.appendChild(synthLine());
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
  if (v.deviceName) box.appendChild(el("div", { class: "dev-name" }, [deviceLink(v, v.deviceName)]));
  // With a name, the model is enough (the codename is in the tooltip); without one, everything the device said, one code per line.
  (v.deviceName ? [v.model || v.codename] : [v.model, v.codename].filter(Boolean)).forEach(function (code) { box.appendChild(el("div", { class: "dev-code", text: code })); });
  return box;
}

/** A day written YYYY-MM-DD, shown the way the browser of whoever reads the console writes dates. Anything else is shown as it is. */
function formatDay(day) {
  var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(day || "");
  if (!m) return day || "";
  var date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return date.toLocaleDateString(LANG === "fr" ? "fr-FR" : "en-GB", { year: "numeric", month: "short", day: "numeric" });
}

/** When a vote arrived: the day and the hour (the relay keeps no finer time than the hour, UTC) in the time of whoever reads the console; the day alone for a vote from before it kept the hour. */
function whenText(v) {
  var at = v.votedAt ? new Date(v.votedAt) : null;
  if (at && !isNaN(at.getTime())) return at.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit" });
  return v.updated ? formatDay(v.updated) : "";
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
  // The precise device, by the kind picked: the headsets of that brand for a Quest or a Pico, a search in the list of devices for the others.
  var picked = v.model || "";
  var modelBox = el("span", { class: "model-box" });
  var found = {};
  var refresh = function () { verdict.className = "ans-" + verdict.value; save.hidden = !dirty(); };
  var drawModel = function () {
    modelBox.textContent = "";
    var kind = device.value;
    var headsets = (state.deviceChoices || []).filter(function (c) { return c.kind === kind; });
    if (kind === "quest" || kind === "pico") {
      var labels = { "": "Not specified" };
      headsets.forEach(function (c) { labels[c.model] = c.label; });
      // A model the player's app sent that is not in the list stays as it is, so saving another change never wipes it.
      if (picked && !(picked in labels)) labels[picked] = v.deviceName || picked;
      var menu = select(Object.keys(labels), picked, labels);
      menu.addEventListener("change", function () { picked = menu.value; refresh(); });
      modelBox.appendChild(menu);
    } else {
      var list = el("datalist", { id: "models-" + v.voter });
      var typed = el("input", { type: "text", list: "models-" + v.voter, placeholder: "Search a model", value: picked ? (v.deviceName || picked) : "" });
      typed.addEventListener("input", function () {
        var text = typed.value.trim();
        if (text === "") { picked = ""; refresh(); return; }
        if (found[text]) { picked = found[text]; refresh(); return; }
        if (text.length < 2) return;
        call("/console/api/models?q=" + encodeURIComponent(text)).then(function (data) {
          list.textContent = "";
          found = {};
          data.models.forEach(function (m) { var name = m.label + " (" + m.model + ")"; found[name] = m.model; list.appendChild(el("option", { value: name })); });
        }).catch(function () {});
      });
      modelBox.appendChild(typed);
      modelBox.appendChild(list);
    }
  };
  var dirty = function () { return device.value !== v.device || verdict.value !== answer || offline.checked !== v.offline || picked !== (v.model || ""); };
  var save = el("button", { type: "button", class: "btn", text: "Save", onclick: function () {
    if (!confirmWrite("Change a vote of " + g.name + ": " + v.device + ", " + VERDICTS[answer] + " becomes " + device.value + ", " + VERDICTS[verdict.value] + "." + (verdict.value === "works" && answer !== "works" ? " The problems ticked by the player are removed." : ""))) return;
    var message = { appId: g.appid, voter: v.voter, device: device.value, verdict: verdict.value, offline: offline.checked };
    if (picked !== (v.model || "")) message.model = picked === "" ? null : picked;
    call("/console/api/change", message)
      .then(function () { toast("Saved"); loadVotes(); loadCounts().then(drawGames); }).catch(function (e) { toast(e.message, true); });
  } });
  // The answer shows its colour, and Save only appears once something is changed.
  verdict.className = "ans-" + verdict.value;
  save.hidden = true;
  [verdict, offline].forEach(function (n) { n.addEventListener("change", refresh); });
  // Another kind of device offers other models: the one picked goes when it does not belong to it.
  device.addEventListener("change", function () { picked = (v.model && device.value === v.device) ? v.model : ""; drawModel(); refresh(); });
  drawModel();

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
    el("label", {}, [document.createTextNode("Device "), device]), el("label", {}, [document.createTextNode("Model "), modelBox]), el("label", {}, [document.createTextNode("Answer "), verdict]),
    el("label", { class: "check" }, [offline, document.createTextNode(" Worked offline")]), save,
  ]);
  var edit = el("button", { type: "button", class: "btn", text: "Edit", onclick: function () { editor.hidden = !editor.hidden; } });

  // The title is what the device is: its name when the list knows it, the kind of device otherwise, the model and the codename in its tooltip.
  var title = v.deviceName || (v.model ? v.model : v.device);
  // What the title already says is not repeated: with a name, neither the kind of device nor the model; with a raw model as the title, the kind of device only.
  var details = [v.deviceName || title === v.device ? null : v.device, whenText(v) || null, v.game ? "game " + v.game : null, v.voter, v.offline ? "worked offline" : null, state2 || null].filter(Boolean);
  return el("div", { class: "vote v-" + answer, title: VERDICTS[answer] }, [
    el("div", { class: "vote-main" }, [
      el("div", { class: "vote-title" }, [deviceLink(v, title, [v.model, v.codename].filter(Boolean).join(" / "), true), el("span", { class: "ver", title: "Version of GamePort that sent this vote: opens every answer of this version" }, [document.createTextNode("- "), versionLink(v.app)])]),
      codes.length ? issuePills(codes) : document.createTextNode(""),
      v.reportState ? el("div", { class: "report-state" }, [reportPill(v.reportState)]) : document.createTextNode(""),
      v.perfSeconds ? el("div", { class: "report-state" }, [perfPill(v)]) : document.createTextNode(""),
      v.trail ? trailLine(v) : document.createTextNode(""),
      el("div", { class: "vote-meta" }, details.map(function (piece, i) {
        var part = piece === v.voter ? el("span", {}, [playerLink(v.voter, v.label), document.createTextNode(v.app === "admin" ? " (admin)" : "")]) : document.createTextNode(piece);
        return i ? el("span", {}, [document.createTextNode(" \u00b7 "), part]) : part;
      })),
    ]),
    el("div", { class: "actions" }, [fixedBtn, edit, more]),
    editor,
  ]);
}

/** The answers of a player for the game, oldest first, as marks and versions of GamePort (✗ 0.8.2 → ✓ 0.9.0 → ✓ 0.9.3); opened, each one with its day. */
var MARKS = { works: "✓", offline_only: "≈", fails: "✗" };
function trailLine(v) {
  var box = el("details", { class: "trail" });
  var words = v.trail.map(function (t) { return (MARKS[t.verdict] || "?") + " " + t.app; }).join(" → ");
  box.appendChild(el("summary", { text: words, title: "Every answer of this player for the game" }));
  v.trail.forEach(function (t) {
    var ticked = t.issues ? " · " + t.issues.split(",").map(function (c) { return ISSUE_LABELS[c] || c; }).join(", ") : "";
    box.appendChild(el("div", { class: "trail-line t-" + t.verdict, text: whenText(t) + " · " + (MARKS[t.verdict] || "?") + " " + VERDICTS[t.verdict] + " · GamePort " + t.app + (t.game ? " · build " + t.game : "") + ticked }));
  });
  return box;
}

/** What the history says of the game: how many players went from not working to working, and the turns of the kinds of device in view. */
function synthLine() {
  var s = state.synth;
  if (!s) return document.createTextNode("");
  var parts = [];
  if (s.moved) parts.push(s.moved + (s.moved === 1 ? " player moved" : " players moved") + " from not working to working");
  Object.keys(s.turns || {}).forEach(function (d) {
    if (state.device !== "all" && d !== state.device) return;
    var t = s.turns[d];
    var bits = [];
    if (t.fixedIn) bits.push("fixed in " + t.fixedIn + (t.stillIn ? ", still works in " + t.stillIn : ""));
    if (t.brokeIn) bits.push("broke in " + t.brokeIn);
    if (bits.length) parts.push((state.device === "all" ? d + ": " : "") + bits.join(", "));
  });
  return parts.length ? el("p", { class: "synth", text: parts.join(" · ") }) : document.createTextNode("");
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
document.getElementById("defaults").addEventListener("click", showDefaults);
document.getElementById("home").addEventListener("click", showHome);
Array.prototype.forEach.call(document.querySelectorAll("#lang button"), function (b) { b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); }); });
document.getElementById("brand").addEventListener("click", function (event) { event.preventDefault(); showHome(); });
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
  var route = location.pathname.match(/^\\/console\\/(test|prod)(?:\\/(\\d+|reports|news|reasons|defaults|player\\/[0-9a-f]{12}|version\\/\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(?:-alpha\\.\\d{1,5})?|device\\/[\\w%.\\-]{1,80}))?\\/?$/);
  var env = route ? route[1] : "test";
  var section = route ? route[2] : null;
  var old = location.hash.match(/^#(?:(\\d+)|(reports))(\\/prod)?$/);
  if (!route && old) { env = old[3] ? "prod" : "test"; section = old[1] || old[2]; }
  if (location.search === "?voted" || location.hash === "#voted") { state.onlyVoted = true; document.getElementById("only").setAttribute("aria-pressed", "true"); }
  setEnv(env);
  if (section === "reports") showLatestReports();
  else if (section === "news") showNews();
  else if (section === "reasons") showReasons();
  else if (section === "defaults") showDefaults();
  else if (!section) showHome();
  else if (section && section.indexOf("player/") === 0) showPlayer(section.slice(7));
  else if (section && section.indexOf("version/") === 0) showGroup("version", section.slice(8));
  else if (section && section.indexOf("device/") === 0) showGroup("device", decodeURIComponent(section.slice(7)));
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
setLang(LANG);
</script>
</body>
</html>`;
}
