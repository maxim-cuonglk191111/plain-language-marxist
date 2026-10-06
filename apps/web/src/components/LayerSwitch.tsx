"use client";

import { useEffect, useState } from "react";
import {
  LAYERS,
  LAYERS_KEY,
  LAYER_LABEL,
  applyLayers,
  currentLayers,
  type Layer,
} from "../lib/layers";

export type AvailableLayers = {
  plain?: boolean | undefined;
  original?: boolean | undefined;
  context?: boolean | undefined;
};

/**
 * Turns each reader layer on or off (task 023). At least one layer always stays
 * on: the last one's button is marked unavailable, with the reason announced.
 * When a document has no Plain English or Context, those layers are disabled
 * and default selection falls back to the original text.
 * The choice is client state (?layers=… and a remembered preference); the
 * canonical URL never changes (SDD §10.1). Without JavaScript all layers show.
 */
export function LayerSwitch({ available }: { available?: AvailableLayers | undefined } = {}) {
  const [layers, setLayers] = useState<Layer[] | null>(null);

  const isAvail = (l: Layer) => (available ? available[l] !== false : true);

  useEffect(() => {
    const current = currentLayers();
    const valid = current.filter(isAvail);
    const fallback: Layer[] = isAvail("plain") ? ["plain"] : ["original"];
    const initial = valid.length > 0 ? valid : fallback;
    if (initial.join(" ") !== current.join(" ")) {
      applyLayers(initial);
    }
    setLayers(initial);
  }, [available?.plain, available?.original, available?.context]);

  const toggle = (layer: Layer) => {
    if (!layers || !isAvail(layer)) return;
    const on = layers.includes(layer);
    const activeAvailable = layers.filter(isAvail);
    if (on && activeAvailable.length === 1) return; // the last visible layer stays
    const next = LAYERS.filter((l) => {
      if (!isAvail(l)) return false;
      return l === layer ? !on : layers.includes(l);
    });
    setLayers(next);
    applyLayers(next);
    try {
      localStorage.setItem(LAYERS_KEY, next.join(","));
    } catch {
      // Storage can be unavailable (private mode); the layers still apply to this page.
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.set("layers", next.join(","));
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="layer-switch" role="group" aria-label="Layers to show">
      {LAYERS.map((layer) => {
        const avail = isAvail(layer);
        const on = avail && (layers?.includes(layer) ?? false);
        const activeAvailable = layers?.filter(isAvail) ?? [];
        const locked = avail && on && activeAvailable.length === 1;

        if (!avail) {
          return (
            <button
              key={layer}
              type="button"
              data-layer={layer}
              data-unavailable="true"
              aria-pressed={false}
              aria-disabled="true"
              disabled
              title={`${LAYER_LABEL[layer]} is not yet available for this text`}
            >
              {LAYER_LABEL[layer]}
            </button>
          );
        }

        return (
          <button
            key={layer}
            type="button"
            data-layer={layer}
            aria-pressed={on}
            aria-disabled={locked || undefined}
            aria-describedby={locked ? "layer-switch-hint" : undefined}
            onClick={() => toggle(layer)}
          >
            {LAYER_LABEL[layer]}
          </button>
        );
      })}
      <span id="layer-switch-hint" className="visually-hidden">
        At least one layer stays visible.
      </span>
    </div>
  );
}
