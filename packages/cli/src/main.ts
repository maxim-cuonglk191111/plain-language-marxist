import { buildProgram } from "./program.ts";

try {
  await buildProgram().parseAsync(process.argv);
} catch (error) {
  // Expected failures (refused fetches, invalid files) read better without a stack trace.
  console.error(`plm: ${error instanceof Error ? error.message : String(error)}`);
  if (process.env.PLM_DEBUG && error instanceof Error) console.error(error.stack);
  process.exitCode = 1;
}
