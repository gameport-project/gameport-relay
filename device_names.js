import generated from "./device_names.generated.js";

// The headsets that Google Play's list does not have (they are not certified by Google), by hand. Only what is certain is here: a model not listed shows as its raw code.
const HEADSET_MODELS = {
  Quest: "Meta Quest",
  "Quest 2": "Meta Quest 2",
  "Quest 3": "Meta Quest 3",
  "Quest 3S": "Meta Quest 3S",
  "Quest Pro": "Meta Quest Pro",
  A8110: "Pico 4",
  A81E0: "Pico 4",
  A8150: "Pico 4",
  A8170: "Pico 4",
  A8210: "Pico 4 Pro",
  A92Y0: "Pico 4 Ultra",
  A921C: "Pico 4 Ultra",
  B3110: "Pico Space Pro",
};
/** The headsets the console lists by kind of device, by the model code the app sends and the name shown: the first model of each name. */
export const DEVICE_CHOICES = Object.entries(HEADSET_MODELS)
  .filter(([, label], i, all) => all.findIndex(([, other]) => other === label) === i)
  .map(([model, label]) => ({ model, label, kind: label.startsWith("Pico") ? "pico" : "quest" }));

const HEADSET_CODENAMES = {
  monterey: "Meta Quest",
  hollywood: "Meta Quest 2",
  eureka: "Meta Quest 3",
  panther: "Meta Quest 3S",
  seacliff: "Meta Quest Pro",
  PICOA8110: "Pico 4",
  sparrow: "Pico 4 Ultra",
  swan: "Pico Space Pro",
};

/**
 * What a device is called, from the model and the codename it reports: the headsets first, then Google Play's list by model, then by codename.
 * Returns null when nothing is known, so the caller shows the raw code.
 */
export function deviceLabel(model, codename) {
  return HEADSET_MODELS[model] ?? generated.models[model] ?? HEADSET_CODENAMES[codename] ?? generated.codenames[codename] ?? null;
}

const HEADSET_KINDS = { quest: "Quest", pico: "Pico" };

/**
 * What a headset is called when its model is not in the list: its kind with its code ("Pico A8150"), so that it is never shown as a bare code, and the same way on the site, in the app and in
 * the console. Null for a model that is known (use [deviceLabel]), and for a device that is not a headset or carries no code.
 */
export function unknownHeadsetName(kind, model) {
  return typeof model === "string" && model !== "" && HEADSET_KINDS[kind] ? `${HEADSET_KINDS[kind]} ${model}` : null;
}

/**
 * THE name of a device, from its kind, its model and its codename: the one every place that shows a device calls (the summary the site and the app read, the details of a game, the console,
 * the messages), so that two places never give a device two names. Null when the kind is not a headset and nothing is known.
 */
export function deviceName(model, codename, kind) {
  return deviceLabel(model, codename) ?? unknownHeadsetName(kind, model);
}

const DEVICE_KINDS = new Set(["quest", "pico", "phone", "tablet", "other"]);

const plainName = (name) => String(name).trim().toLowerCase().replace(/^meta /, "").replace(/^oculus /, "").trim();

/**
 * The model codes and the codenames of the devices that go by these names ("Quest 3", "Pico 4"): what the app compares with what its device calls itself, so that the app keeps no list of names
 * of its own. The headsets are looked at first; Google Play's list only for a name that no headset has.
 */
export function codesOf(names) {
  const codes = new Set();
  for (const name of names) {
    const wanted = plainName(name);
    // A kind of device ("quest", "pico") is not the name of a device: the app compares its own kind as it is, and "quest" must not become the codes of the first Quest.
    if (DEVICE_KINDS.has(wanted)) continue;
    const before = codes.size;
    for (const table of [HEADSET_MODELS, HEADSET_CODENAMES]) for (const [code, label] of Object.entries(table)) if (plainName(label) === wanted) codes.add(code);
    if (codes.size === before) for (const table of [generated.models, generated.codenames]) for (const [code, label] of Object.entries(table)) if (plainName(label) === wanted) codes.add(code);
  }
  return [...codes];
}

/** True for a model code the relay can name: a headset it lists by hand, or a device of Google Play's list. */
export function knownModel(model) {
  return typeof model === "string" && (model in HEADSET_MODELS || model in generated.models);
}

/** The devices whose name or model code holds [query] (at least two characters, no matter the case), the headsets first: for the console's search of a precise device. */
export function searchModels(query, limit = 20) {
  const text = typeof query === "string" ? query.trim().toLowerCase() : "";
  if (text.length < 2) return [];
  const found = [];
  const seen = new Set();
  const add = (model, label) => {
    if (found.length >= limit || seen.has(model)) return;
    if (model.toLowerCase().includes(text) || label.toLowerCase().includes(text)) { seen.add(model); found.push({ model, label }); }
  };
  for (const [model, label] of Object.entries(HEADSET_MODELS)) add(model, label);
  for (const [model, label] of Object.entries(generated.models)) add(model, label);
  return found;
}
