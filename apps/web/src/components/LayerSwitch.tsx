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

/**
 * Turns each reader layer on or off (task 023). At least one layer always stays
 * on: the last one's button is marked unavailable, with the reason announced.
 * The choice is client state (?layers=… and a remembered preference); the
 * canonical URL never changes (SDD §10.1). Without JavaScript all layers show.
 */
export function LayerSwitch() {
  const [layers, setLayers] = useState<Layer[] | null>(null);

  useEffect(() => setLayers(currentLayers()), []);

  const toggle = (layer: Layer) => {
    if (!layers) return;
    const on = layers.includes(layer);
    if (on && layers.length === 1) return; // the last visible layer stays
    const next = LAYERS.filter((l) => (l === layer ? !on : layers.includes(l)));
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
        const on = layers?.includes(layer) ?? false;
        const locked = on && layers?.length === 1;
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
