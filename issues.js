// What a player can tick as going wrong (the app's Symptom): a fixed list, so what is stored can be counted and nothing else can get in.
export const ISSUES = ["no_image", "flat_window", "closes", "stuck_loading", "no_controls", "no_sound", "no_online", "slow", "no_passthrough", "visual", "other"];
export const ISSUE_SET = new Set(ISSUES);
