#!/usr/bin/env node
// Runs the TypeScript sources directly through tsx, so the CLI needs no build step.
import { register } from "tsx/esm/api";

register();
await import("../src/main.ts");
