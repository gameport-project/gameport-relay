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
  A8210: "Pico 4 Pro",
  A92Y0: "Pico 4 Ultra",
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
