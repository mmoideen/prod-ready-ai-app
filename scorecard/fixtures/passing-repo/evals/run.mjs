// Minimal eval runner referenced by EVAL-2.
import { readFileSync } from "node:fs";

const lines = readFileSync(new URL("./dataset.jsonl", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean);

console.log(`Ran ${lines.length} eval item(s).`);
process.exit(0);
