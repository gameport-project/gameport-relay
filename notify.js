// A message to the developer's private Discord channel when a vote or a report arrives in production. It is for one person: the address of the webhook is a secret of the
// relay (DISCORD_ADMIN_WEBHOOK), never written in a file or a log. Nothing about the player is sent (no id, no hash), and a failure here changes nothing: the vote or the
// report is already saved, and the player gets the same answer.

const WEBHOOK = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;
const NAME_TTL_MS = 3_600_000;
const names = new Map();

const ANSWERS = {
  works: { text: "Works", color: 0x4cc38a },
  offline_only: { text: "Works offline only", color: 0xf0b24a },
  fails: { text: "Does not work", color: 0xef6b6b },
};
const DEVICES = { quest: "Quest", pico: "Pico", phone: "Phone", tablet: "Tablet", other: "Other" };

/** The name Steam gives an app, kept an hour; the number alone when Steam does not answer. */
async function gameName(appId) {
  const kept = names.get(appId);
  if (kept && Date.now() - kept.at < NAME_TTL_MS) return kept.name;
  try {
    const answer = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic&cc=us&l=english`, {
      headers: { "user-agent": "gameport-relay", accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    const data = answer.ok ? (await answer.json())[String(appId)] : null;
    if (data && data.success && typeof data.data?.name === "string") {
      const name = data.data.name.slice(0, 120);
      names.set(appId, { at: Date.now(), name });
      return name;
    }
  } catch {
    // The number is enough.
  }
  return `App ${appId}`;
}

const cover = (appId) => `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
const steam = (appId) => `https://store.steampowered.com/app/${appId}`;

const field = (name, value, inline = true) => ({ name, value: String(value).slice(0, 200), inline });

async function send(env, embed) {
  if (!WEBHOOK.test(env.DISCORD_ADMIN_WEBHOOK ?? "")) return;
  try {
    await fetch(env.DISCORD_ADMIN_WEBHOOK, {
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

export function notifyVote(env, ctx, origin, vote) {
  if (!env.DISCORD_ADMIN_WEBHOOK) return undefined;
  return later(ctx, (async () => {
    const answer = ANSWERS[vote.verdict];
    const name = await gameName(vote.appId);
    await send(env, {
      title: `New vote: ${name}`,
      url: `${origin}/console#${vote.appId}/prod`,
      description: `[Steam](${steam(vote.appId)}) · [Console](${origin}/console#${vote.appId}/prod)`,
      thumbnail: { url: cover(vote.appId) },
      color: answer.color,
      fields: [
        field("Answer", answer.text + (vote.offline && vote.verdict === "works" ? " (tried offline)" : "")),
        field("Device", DEVICES[vote.device] ?? vote.device),
        field("GamePort", vote.app),
        field("App", vote.appId),
        ...(vote.game ? [field("Game build", vote.game)] : []),
      ],
    });
  })());
}

export function notifyReport(env, ctx, origin, report, verdict) {
  if (!env.DISCORD_ADMIN_WEBHOOK) return undefined;
  return later(ctx, (async () => {
    const name = await gameName(report.appId);
    const answer = verdict ? ANSWERS[verdict] : null;
    await send(env, {
      title: `New report: ${name}`,
      url: `${origin}/console#reports/prod`,
      // The download goes through the console, which only the developer can enter: anyone else who gets the link is turned away.
      description: `${report.id ? `[Download the report](${origin}/console/api/report?env=prod&id=${report.id}) · ` : ""}[Steam](${steam(report.appId)}) · [Console](${origin}/console#${report.appId}/prod)`,
      thumbnail: { url: cover(report.appId) },
      color: answer ? answer.color : 0x9aa4b2,
      fields: [
        field("Player's answer", answer ? answer.text : "No vote"),
        field("Device", DEVICES[report.device] ?? report.device),
        field("GamePort", report.app),
        field("Size", `${Math.max(1, Math.round(report.size / 1024))} KB`),
        field("App", report.appId),
      ],
    });
  })());
}
