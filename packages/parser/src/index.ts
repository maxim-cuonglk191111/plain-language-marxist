// Source adapters (MIA, …) with fixtures and golden files (SDD §7).
import { MiaAdapter } from "./mia/adapter.ts";
import type { SourceAdapter } from "./types.ts";

export * from "./decode.ts";
export * from "./fetch.ts";
export * from "./types.ts";
export { MiaAdapter };

export const ADAPTERS: readonly SourceAdapter[] = [MiaAdapter];

export function adapterFor(url: URL): SourceAdapter | undefined {
  return ADAPTERS.find((a) => a.canHandle(url));
}
