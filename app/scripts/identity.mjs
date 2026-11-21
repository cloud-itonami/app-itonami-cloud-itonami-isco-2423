// The app's identity comes from the repository's own blueprint.edn, so the
// same app/ directory can be stamped into every repository of the
// classification series without a hand-written name anywhere.
import { readAll } from "./edn.mjs";

export const SCHEMES = {
  isic: { label: "ISIC Rev.4", colour: "#1F4E79" },
  isco: { label: "ISCO-08", colour: "#2E6B4F" },
  jsic: { label: "JSIC", colour: "#7A3B1E" },
  cofog: { label: "COFOG", colour: "#5B3A7A" },
  unspsc: { label: "UNSPSC", colour: "#3D4A57" },
};

const ID = /^cloud-itonami-(isic|isco|jsic|cofog|unspsc)-([0-9A-Za-z][0-9A-Za-z.]*)$/;

/** The single blueprint map of a blueprint.edn text. */
export function readBlueprint(text) {
  const forms = readAll(text);
  const top = forms.length === 1 && Array.isArray(forms[0]) ? forms[0] : forms;
  const maps = top.filter((x) => x && typeof x === "object" && !Array.isArray(x) && "itonami.blueprint/id" in x);
  if (maps.length !== 1) throw new Error(`blueprint.edn must hold exactly one blueprint map, found ${maps.length}`);
  return maps[0];
}

/**
 * Identity of the app for one blueprint. Refuses a blueprint outside the
 * classification series instead of guessing a name for it.
 * The Android package id cannot hold "-" or ".", and a segment cannot start
 * with a digit, so "isco-2423" becomes "isco2423" and "cofog-03.2" "cofog032".
 */
export function deriveIdentity(blueprint) {
  const source = blueprint["itonami.blueprint/id"];
  const m = typeof source === "string" ? ID.exec(source) : null;
  if (!m) throw new Error(`not a classification-series blueprint id: ${JSON.stringify(source)}`);
  const [, scheme, code] = m;
  const slug = scheme + code.toLowerCase().replace(/[^0-9a-z]/g, "");
  const name = blueprint["itonami.blueprint/name"];
  if (typeof name !== "string" || !name.trim()) throw new Error("blueprint has no :itonami.blueprint/name");
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(name)) throw new Error(`blueprint name is not usable as a product name: ${JSON.stringify(name)}`);
  return {
    source,
    scheme,
    code,
    slug,
    id: `network.itonami.${slug}`,
    title: name.trim(),
    classification: `${SCHEMES[scheme].label} ${code}`,
    stateSchema: `itonami.series.${slug}.v1`,
  };
}
