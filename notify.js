// A message to the developer's private Discord channel when a vote or a report arrives: the one for production (secret DISCORD_ADMIN_WEBHOOK) and, apart, the one for the
// test set (secret DISCORD_TEST_WEBHOOK), so the tries of a test build never mix with the real ones. It is for one person: the address of a webhook is a secret of the
// relay, never written in a file or a log. The player is only the short salted hash of the console (never the id the app keeps) and the name the developer gave them there,
// when there is one, so the developer can open them in the console; a failure here changes nothing: the vote or the report is already saved, and the player gets the same answer.

const WEBHOOK = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;
const NAME_TTL_MS = 3_600_000;
const names = new Map();

const ANSWERS = {
  works: { text: "Works", color: 0x4cc38a },
  offline_only: { text: "Works offline only", color: 0xf0b24a },
  fails: { text: "Does not work", color: 0xef6b6b },
};
// What a player ticked as going wrong, in words for the developer's channel.
const ISSUE_WORDS = {
  no_image: "Nothing shows", flat_window: "Flat window instead of VR", closes: "Closes by itself", stuck_loading: "Stuck on loading", no_controls: "Controls missing or wrong",
  no_sound: "No sound", no_online: "Cannot play online", slow: "Slow or stuttering", no_passthrough: "No passthrough", visual: "Wrong colors or broken image", other: "Something else",
};
const DEVICES = { quest: "Quest", pico: "Pico", phone: "Phone", tablet: "Tablet", other: "Other" };

/** What Steam says of an app, kept an hour: its name; only the number when Steam does not answer. */
async function gameInfo(appId) {
  const kept = names.get(appId);
  if (kept && Date.now() - kept.at < NAME_TTL_MS) return kept.info;
  try {
    const answer = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic&cc=us&l=english`, {
      headers: { "user-agent": "gameport-relay", accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    const data = answer.ok ? (await answer.json())[String(appId)] : null;
    if (data && data.success && typeof data.data?.name === "string") {
      const info = { name: data.data.name.slice(0, 120) };
      names.set(appId, { at: Date.now(), info });
      return info;
    }
  } catch {
    // The number is enough.
  }
  return { name: `App ${appId}` };
}

const CATALOG = "https://raw.githubusercontent.com/gameport-project/gameport-catalog/main/v1/catalog.json";
const STEAM_IMAGE = /^https:\/\/shared(\.[a-z]+)?\.steamstatic\.com\/store_item_assets\/steam\/apps\/\d+\/[\w./-]+\.(jpg|png)$/;
const asset = (appId, file) => `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/${file}`;
const covers = new Map();
let catalog = null;

/** The apps of the catalog by number, kept an hour: the hashed names of their pictures, and the full game of a demo. */
async function catalogApps() {
  if (catalog && Date.now() - catalog.at < NAME_TTL_MS) return catalog.apps;
  try {
    const answer = await fetch(CATALOG, { headers: { "user-agent": "gameport-relay" }, signal: AbortSignal.timeout(4000) });
    const data = answer.ok ? await answer.json() : null;
    if (data && Array.isArray(data.apps)) {
      catalog = { at: Date.now(), apps: new Map(data.apps.map((app) => [app.appid, app])) };
      return catalog.apps;
    }
  } catch {
    // The standard names are enough.
  }
  return catalog ? catalog.apps : new Map();
}

async function exists(url) {
  try {
    return (await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2500) })).ok;
  } catch {
    return false;
  }
}

/**
 * The tall cover of an app, chosen as the app does it: the picture the catalog names (a demo or a playtest only has its pictures under a hashed name), the
 * standard name, the header, then the full game's cover and header when the app has a parent. The first one Steam serves, kept an hour.
 */
async function cover(appId) {
  const kept = covers.get(appId);
  if (kept && Date.now() - kept.at < NAME_TTL_MS) return kept.url;
  const entry = (await catalogApps()).get(appId);
  const own = (url) => (typeof url === "string" && STEAM_IMAGE.test(url) ? url : null);
  const parent = Number.isInteger(entry?.parent) ? entry.parent : null;
  const candidates = [own(entry?.cover), asset(appId, "library_600x900.jpg"), own(entry?.header), asset(appId, "header.jpg"), ...(parent ? [asset(parent, "library_600x900.jpg"), asset(parent, "header.jpg")] : [])].filter(Boolean);
  let url = candidates[1];
  for (const candidate of candidates) {
    if (await exists(candidate)) { url = candidate; break; }
  }
  covers.set(appId, { at: Date.now(), url });
  return url;
}
/** The name the developer gave a player in the console (the set's own table), or null: none given, or the table is not there yet. */
async function labelOf(env, player, environment) {
  if (!player || !env.DB) return null;
  try {
    const [row] = (await env.DB.prepare(`SELECT label FROM ${environment === "test" ? "player_labels_test" : "player_labels"} WHERE voter = ?`).bind(player).all()).results;
    return row?.label ?? null;
  } catch {
    return null;
  }
}

/** The player as the channel shows them: the name and the code, or the code alone, with the link to their page in the console. Nothing when the relay has no hash for them. */
async function playerOf(env, origin, player, environment) {
  if (!player) return { fields: [], link: "" };
  const label = await labelOf(env, player, environment);
  return {
    fields: [field("Player", label ? `${label} (${player})` : player)],
    link: ` · [Player](${origin}/console/${environment === "test" ? "test" : "prod"}/player/${player})`,
  };
}

const steam = (appId) => `https://store.steampowered.com/app/${appId}`;

const field = (name, value, inline = true) => ({ name, value: String(value).slice(0, 200), inline });

/** The address of the channel for a set of votes ("prod" or "test"), or undefined when none is set. */
const webhookOf = (env, environment) => (environment === "test" ? env.DISCORD_TEST_WEBHOOK : env.DISCORD_ADMIN_WEBHOOK);

/** What the console shows to open a game in a set: production has its own address. */
const consoleGame = (origin, appId, environment) => `${origin}/console/${environment === "test" ? "test" : "prod"}/${appId}`;

async function send(webhook, embed) {
  if (!WEBHOOK.test(webhook ?? "")) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // No mention is ever parsed from a name or a version: only the developer's own notification settings decide.
      body: JSON.stringify({ username: "GamePort relay", embeds: [embed], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Discord being slow or down must never reach the player.
  }
}

/** Runs the notification after the answer has gone out, when the platform allows it. */
function later(ctx, work) {
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(work);
  return work;
}

export function notifyVote(env, ctx, origin, vote, environment = "prod", player = null) {
  const webhook = webhookOf(env, environment);
  if (!webhook) return undefined;
  return later(ctx, (async () => {
    const answer = ANSWERS[vote.verdict];
    const info = await gameInfo(vote.appId);
    const name = info.name;
    const who = await playerOf(env, origin, player, environment);
    await send(webhook, {
      title: `${environment === "test" ? "[TEST] " : ""}New vote: ${name}`,
      url: consoleGame(origin, vote.appId, environment),
      description: `[Steam](${steam(vote.appId)}) · [Console](${consoleGame(origin, vote.appId, environment)})${who.link}`,
      thumbnail: { url: await cover(vote.appId) },
      color: answer.color,
      fields: [
        field("Answer", answer.text + (vote.offline && vote.verdict === "works" ? " (tried offline)" : "")),
        field("Device", DEVICES[vote.device] ?? vote.device),
        field("GamePort", vote.app),
        field("App", vote.appId),
        ...who.fields,
        ...(vote.game ? [field("Game build", vote.game)] : []),
        ...(vote.issues?.length ? [field("Problems", vote.issues.map((code) => `• ${ISSUE_WORDS[code] ?? code}`).join("\n"), false)] : []),
      ],
    });
  })());
}

export function notifyReport(env, ctx, origin, report, verdict, environment = "prod", player = null) {
  const webhook = webhookOf(env, environment);
  if (!webhook) return undefined;
  return later(ctx, (async () => {
    const info = await gameInfo(report.appId);
    const name = info.name;
    const answer = verdict ? ANSWERS[verdict] : null;
    const who = await playerOf(env, origin, player, environment);
    await send(webhook, {
      title: `${environment === "test" ? "[TEST] " : ""}New report: ${name}`,
      url: `${origin}/console/${environment === "test" ? "test" : "prod"}/reports`,
      // The download goes through the console, which only the developer can enter: anyone else who gets the link is turned away.
      description: `${report.id ? `[Download the report](${origin}/console/api/report?env=${environment}&id=${report.id}) · ` : ""}[Steam](${steam(report.appId)}) · [Console](${consoleGame(origin, report.appId, environment)})${who.link}`,
      thumbnail: { url: await cover(report.appId) },
      color: answer ? answer.color : 0x9aa4b2,
      fields: [
        field("Player's answer", answer ? answer.text : "No vote"),
        field("Device", DEVICES[report.device] ?? report.device),
        field("GamePort", report.app),
        field("Size", `${Math.max(1, Math.round(report.size / 1024))} KB`),
        field("App", report.appId),
        ...who.fields,
      ],
    });
  })());
}
