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
};
const HEADSET_CODENAMES = {
  monterey: "Meta Quest",
  hollywood: "Meta Quest 2",
  eureka: "Meta Quest 3",
  panther: "Meta Quest 3S",
  seacliff: "Meta Quest Pro",
  PICOA8110: "Pico 4",
  sparrow: "Pico 4 Ultra",
};

/**
 * What a device is called, from the model and the codename it reports: the headsets first, then Google Play's list by model, then by codename.
 * Returns null when nothing is known, so the caller shows the raw code.
 */
export function deviceLabel(model, codename) {
  return HEADSET_MODELS[model] ?? generated.models[model] ?? HEADSET_CODENAMES[codename] ?? generated.codenames[codename] ?? null;
}
