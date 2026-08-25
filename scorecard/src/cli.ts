#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildContext } from "./context.js";
import { rules } from "./rules/index.js";
import { computeScore, evaluateAll } from "./score.js";
import {
  renderJson,
  renderMarkdown,
  renderRuleCatalogJson,
  renderRuleCatalogMarkdown,
  type BaselineSource,
} from "./report.js";

const HELP_TEXT = `prod-ready-scorecard: score a repository against the production readiness rubric.

Usage:
  prod-ready-scorecard [options]

Options:
  --path <dir>        Directory to scan. Defaults to "."
  --format <fmt>       Output format: md, json, or both. Defaults to "md"
  --output <file>      Also write the report to this file
  --min-score <n>      Fail (exit 1) when the score is below this number
  --advisory            Always exit 0, but still print the score and a notice
  --baseline <file>     Compare against a previously saved JSON report and print a score delta
  --list-rules          Print the rule catalog (id, category, title, weight)
  --version             Print the CLI version and exit
  --help                Print this help text and exit

Exit codes:
  0   success, or advisory mode, or --list-rules/--help/--version
  1   score is below --min-score
  2   usage error, or --path does not exist / is not a directory

Examples:
  prod-ready-scorecard --path ../my-repo
  prod-ready-scorecard --path ../my-repo --min-score 85
  prod-ready-scorecard --path ../my-repo --format json --output report.json
  prod-ready-scorecard --list-rules --format json
`;

class CliUsageError extends Error {}

interface CliOptions {
  path: string;
  format: "md" | "json" | "both";
  output: string | null;
  minScore: number | null;
  advisory: boolean;
  listRules: boolean;
  version: boolean;
  help: boolean;
  baseline: string | null;
}

function defaultOptions(): CliOptions {
  return {
    path: ".",
    format: "md",
    output: null,
    minScore: null,
    advisory: false,
    listRules: false,
    version: false,
    help: false,
    baseline: null,
  };
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (value === undefined) {
    throw new CliUsageError(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv: string[]): CliOptions {
  const options = defaultOptions();
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case "--path":
        options.path = requireValue(argv, i + 1, "--path");
        i += 2;
        break;
      case "--format": {
        const value = requireValue(argv, i + 1, "--format");
        if (value !== "md" && value !== "json" && value !== "both") {
          throw new CliUsageError(`--format must be one of md, json, both (got "${value}")`);
        }
        options.format = value;
        i += 2;
        break;
      }
      case "--output":
        options.output = requireValue(argv, i + 1, "--output");
        i += 2;
        break;
      case "--min-score": {
        const value = requireValue(argv, i + 1, "--min-score");
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          throw new CliUsageError(`--min-score must be a number (got "${value}")`);
        }
        options.minScore = parsed;
        i += 2;
        break;
      }
      case "--baseline":
        options.baseline = requireValue(argv, i + 1, "--baseline");
        i += 2;
        break;
      case "--advisory":
        options.advisory = true;
        i += 1;
        break;
      case "--list-rules":
        options.listRules = true;
        i += 1;
        break;
      case "--version":
        options.version = true;
        i += 1;
        break;
      case "--help":
      case "-h":
        options.help = true;
        i += 1;
        break;
      default:
        throw new CliUsageError(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = join(here, "..", "package.json");
    const raw = readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function readBaseline(baselinePath: string): BaselineSource {
  const raw = readFileSync(baselinePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { score?: unknown }).score !== "number" ||
    !Array.isArray((parsed as { rules?: unknown }).rules)
  ) {
    throw new Error("baseline file does not look like a scorecard JSON report");
  }
  return parsed as BaselineSource;
}

export async function run(argv: string[], stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream): Promise<number> {
  let options: CliOptions;
  try {
    options = parseArgs(argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderr.write(`Error: ${message}\n\n`);
    stderr.write(HELP_TEXT);
    return 2;
  }

  if (options.help) {
    stdout.write(HELP_TEXT);
    return 0;
  }

  if (options.version) {
    stdout.write(`${readPackageVersion()}\n`);
    return 0;
  }

  if (options.listRules) {
    const output =
      options.format === "json" ? renderRuleCatalogJson(rules) : renderRuleCatalogMarkdown(rules);
    stdout.write(`${output}\n`);
    if (options.output) {
      writeFileSync(options.output, `${output}\n`, "utf8");
    }
    return 0;
  }

  const resolvedPath = resolve(options.path);
  let isDirectory = false;
  try {
    isDirectory = existsSync(resolvedPath) && statSync(resolvedPath).isDirectory();
  } catch {
    isDirectory = false;
  }
  if (!isDirectory) {
    stderr.write(`Error: path does not exist or is not a directory: ${options.path}\n`);
    return 2;
  }

  let baseline: BaselineSource | null = null;
  if (options.baseline) {
    const baselineResolved = resolve(options.baseline);
    if (!existsSync(baselineResolved)) {
      stderr.write(`Error: baseline file does not exist: ${options.baseline}\n`);
      return 2;
    }
    try {
      baseline = readBaseline(baselineResolved);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stderr.write(`Error: could not read baseline file: ${message}\n`);
      return 2;
    }
  }

  const ctx = buildContext(resolvedPath);
  const evaluations = evaluateAll(rules, ctx);
  const scoreResult = computeScore(evaluations);
  const passed = options.minScore === null ? null : scoreResult.score >= options.minScore;

  const reportInput = {
    path: options.path,
    scoreResult,
    minScore: options.minScore,
    passed,
    baseline,
  };

  const parts: string[] = [];
  if (options.format === "md" || options.format === "both") {
    parts.push(renderMarkdown(reportInput));
  }
  if (options.format === "json" || options.format === "both") {
    parts.push(renderJson(reportInput));
  }
  const finalOutput = parts.join("\n");

  stdout.write(`${finalOutput}\n`);
  if (options.output) {
    writeFileSync(options.output, `${finalOutput}\n`, "utf8");
  }

  if (options.advisory) {
    if (options.minScore !== null) {
      stderr.write(
        `Advisory mode: score ${scoreResult.score.toFixed(1)} ${passed ? "meets" : "is below"} min-score ${options.minScore}. Exiting 0.\n`,
      );
    }
    return 0;
  }

  if (options.minScore !== null && passed === false) {
    return 1;
  }
  return 0;
}

async function main(): Promise<void> {
  const code = await run(process.argv.slice(2), process.stdout, process.stderr);
  process.exitCode = code;
}

/**
 * True when this file was launched directly as the process entry point
 * (as opposed to being imported by something else, for example a test).
 *
 * Compares realpath-resolved filesystem paths rather than raw strings or
 * "file://" URLs, so this stays correct both when the install path contains
 * spaces (which would otherwise need percent-encoding to compare against
 * import.meta.url) and when the entry point is a symlink, which is exactly
 * how npm/npx invoke package "bin" scripts (for example node_modules/.bin/
 * or an npx shim), since Node resolves import.meta.url to the symlink
 * target while process.argv[1] stays the symlink path.
 */
function computeIsMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return realpathSync(entry) === realpathSync(thisFile);
  } catch {
    return false;
  }
}

const isMainModule = computeIsMainModule();
if (isMainModule) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
