/**
 * Reader layers (task 023): Plain English | Original | Explanation, each on or
 * off, never all off. The state lives on <html> as data-layers ("plain original")
 * and data-cols (how many are on), so CSS lays the page out. Without JavaScript
 * neither attribute is set and every layer shows.
 */
export type Layer = "plain" | "original" | "explain";
export const LAYERS: readonly Layer[] = ["plain", "original", "explain"];
export const LAYER_LABEL: Record<Layer, string> = {
  plain: "Plain English",
  original: "Original",
  explain: "Explanation",
};
export const LAYERS_KEY = "plm:layers";
/** The pre-023 preference key, still read so a remembered view survives the upgrade. */
export const OLD_VIEW_KEY = "plm:view";
export const DEFAULT_LAYERS: readonly Layer[] = ["plain"];

/** "original,plain" → ["plain", "original"]: known layers in display order, or null if none. */
export function parseLayers(value: string | null | undefined): Layer[] | null {
  if (!value) return null;
  const wanted = new Set(value.split(/[,\s]+/));
  const layers = LAYERS.filter((l) => wanted.has(l));
  return layers.length ? layers : null;
}

/** The old ?view= values, so earlier links keep working. */
export function fromView(view: string | null | undefined): Layer[] | null {
  if (view === "plain") return ["plain"];
  if (view === "original") return ["original"];
  if (view === "parallel") return ["plain", "original"];
  return null;
}

export function applyLayers(layers: readonly Layer[]): void {
  const html = document.documentElement;
  html.dataset["layers"] = layers.join(" ");
  html.dataset["cols"] = String(layers.length);
}

export function currentLayers(): Layer[] {
  return parseLayers(document.documentElement.dataset["layers"]) ?? [...DEFAULT_LAYERS];
}

/**
 * The same resolution as above, inlined in <head> before first paint (no flash):
 * ?layers=, then ?view=, then the remembered layers, then the old remembered view.
 */
export const LAYERS_BOOT = `var L=["plain","original","explain"];var pl=function(v){if(!v)return null;var w=v.split(/[,\\s]+/),o=L.filter(function(l){return w.indexOf(l)>=0});return o.length?o:null};var fv=function(v){return v==="plain"?["plain"]:v==="original"?["original"]:v==="parallel"?["plain","original"]:null};var q=new URLSearchParams(location.search);var ly=pl(q.get("layers"))||fv(q.get("view"))||pl(localStorage.getItem("${LAYERS_KEY}"))||fv(localStorage.getItem("${OLD_VIEW_KEY}"))||["plain"];d.dataset.layers=ly.join(" ");d.dataset.cols=String(ly.length);`;
