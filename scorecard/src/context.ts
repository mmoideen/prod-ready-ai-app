import { readFileSync, readdirSync, statSync, type Dirent } from "node:fs";
import { join, relative, sep } from "node:path";

/** Directory names skipped everywhere they appear while walking a repository. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "out",
  "coverage",
  ".terraform",
  ".venv",
  "__pycache__",
]);

/** Maximum directory nesting depth walked from the repository root. */
const MAX_DEPTH = 12;

/** Files larger than this are treated as unreadable (never loaded into memory). */
const MAX_FILE_BYTES = 1024 * 1024; // 1 MB

/** Detected primary stack for a repository. */
export type Stack = "node" | "python" | "unknown";

/** A workflow file discovered under .github/workflows/. */
export interface WorkflowFile {
  /** Path relative to the repository root, using forward slashes. */
  path: string;
  /** Full text content of the workflow file. */
  content: string;
}

/** A text file discovered anywhere in the repository, with its content. */
export interface TextFile {
  /** Path relative to the repository root, using forward slashes. */
  path: string;
  /** Full text content of the file. */
  content: string;
}

const AI_SDK_DEPENDENCY_NAMES = new Set([
  "openai",
  "@anthropic-ai/sdk",
  "@azure/openai",
  "ai",
  "langchain",
  "llamaindex",
  "ollama",
]);

/**
 * File extensions (and a few bare filenames) treated as text for content
 * scanning rules. This keeps regex based scans away from binary files and
 * keeps scans fast on real world repositories.
 */
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".py",
  ".json",
  ".jsonc",
  ".jsonl",
  ".yml",
  ".yaml",
  ".md",
  ".mdx",
  ".txt",
  ".toml",
  ".cfg",
  ".ini",
  ".ps1",
  ".sh",
  ".bicep",
  ".tf",
  ".tfvars",
  ".graphql",
  ".sql",
  ".html",
  ".css",
  ".env",
]);

const TEXT_BARE_FILENAMES = new Set(["Dockerfile", "dockerfile", "id_rsa", "CODEOWNERS", "Makefile"]);

function toPosixRelative(root: string, absolutePath: string): string {
  const rel = relative(root, absolutePath);
  return sep === "/" ? rel : rel.split(sep).join("/");
}

function isLikelyTextFile(relPath: string): boolean {
  const base = relPath.slice(relPath.lastIndexOf("/") + 1);
  if (base.startsWith(".env")) return true;
  if (TEXT_BARE_FILENAMES.has(base)) return true;
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0) return false;
  const ext = base.slice(dotIndex).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

/** Walk a directory tree once, collecting relative file paths (posix style). */
function walk(root: string): string[] {
  const results: string[] = [];
  const stack: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

  while (stack.length > 0) {
    const next = stack.pop();
    if (!next) break;
    const { dir, depth } = next;
    if (depth > MAX_DEPTH) continue;

    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // unreadable directory: tolerate and move on
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue; // avoid loops and escaping the root
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push({ dir: full, depth: depth + 1 });
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  }

  return results;
}

function safeReadJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read only view of a repository, built by walking the target directory
 * exactly once. The scorecard never executes code from the scanned
 * repository, it only reads files, which keeps it safe to run against
 * untrusted branches in CI.
 */
export class RepoContext {
  /** Absolute path to the repository root that was scanned. */
  readonly root: string;
  /** Every discovered file, as a path relative to root using forward slashes. Sorted. */
  readonly files: readonly string[];
  /** Parsed root package.json, or null if absent or not valid JSON. */
  readonly packageJson: Record<string, unknown> | null;
  /** Every file discovered under .github/workflows/, with content loaded. */
  readonly workflowFiles: readonly WorkflowFile[];
  /** Detected primary stack. */
  readonly stack: Stack;
  /** Whether this repository shows signals of being an AI tool. */
  readonly aiSignals: boolean;

  private readonly fileSet: ReadonlySet<string>;
  private readonly textCache = new Map<string, string | null>();
  private cachedTextFiles: readonly TextFile[] | null = null;

  constructor(root: string) {
    this.root = root;
    const absoluteFiles = walk(root);
    const relFiles = absoluteFiles.map((f) => toPosixRelative(root, f));
    relFiles.sort();
    this.files = relFiles;
    this.fileSet = new Set(relFiles);

    this.packageJson = this.loadPackageJson();
    this.workflowFiles = this.loadWorkflowFiles();
    this.stack = this.detectStack();
    this.aiSignals = this.detectAiSignals();
  }

  /**
   * True if a file exists. Accepts either an exact relative path (forward
   * slashes) or a predicate tested against every relative path.
   */
  hasFile(pathOrPredicate: string | ((relPath: string) => boolean)): boolean {
    if (typeof pathOrPredicate === "function") {
      return this.files.some(pathOrPredicate);
    }
    const target = pathOrPredicate.replace(/\\/g, "/");
    return this.fileSet.has(target);
  }

  /** Every relative file path matching a regular expression, in sorted order. */
  findFiles(regex: RegExp): string[] {
    return this.files.filter((f) => regex.test(f));
  }

  /**
   * Read a file's content as UTF-8 text, relative to the repository root.
   * Returns null if the file does not exist, exceeds the 1 MB read cap, or
   * cannot be read (permissions, binary decode failure, and similar).
   * Results are cached.
   */
  readText(relPath: string): string | null {
    const key = relPath.replace(/\\/g, "/");
    if (this.textCache.has(key)) {
      return this.textCache.get(key) ?? null;
    }
    if (!this.fileSet.has(key)) {
      this.textCache.set(key, null);
      return null;
    }
    const absolute = join(this.root, ...key.split("/"));
    let content: string | null = null;
    try {
      const stats = statSync(absolute);
      if (stats.size <= MAX_FILE_BYTES) {
        content = readFileSync(absolute, "utf8");
      }
    } catch {
      content = null;
    }
    this.textCache.set(key, content);
    return content;
  }

  /**
   * Every file likely to be text (by extension or well known bare filename),
   * with content loaded. Used by rules that scan file contents for patterns.
   * Computed once and cached.
   */
  textFiles(): readonly TextFile[] {
    if (this.cachedTextFiles) return this.cachedTextFiles;
    const result: TextFile[] = [];
    for (const path of this.files) {
      if (!isLikelyTextFile(path)) continue;
      const content = this.readText(path);
      if (content !== null) {
        result.push({ path, content });
      }
    }
    this.cachedTextFiles = result;
    return result;
  }

  private loadPackageJson(): Record<string, unknown> | null {
    const raw = this.readText("package.json");
    if (raw === null) return null;
    return safeReadJson(raw);
  }

  private loadWorkflowFiles(): WorkflowFile[] {
    const paths = this.findFiles(/^\.github\/workflows\/[^/]+\.ya?ml$/i);
    const result: WorkflowFile[] = [];
    for (const path of paths) {
      const content = this.readText(path);
      if (content !== null) {
        result.push({ path, content });
      }
    }
    return result;
  }

  private detectStack(): Stack {
    if (this.packageJson !== null || this.fileSet.has("package.json")) {
      return "node";
    }
    const pythonMarkers = ["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg"];
    if (pythonMarkers.some((m) => this.fileSet.has(m))) {
      return "python";
    }
    return "unknown";
  }

  private detectAiSignals(): boolean {
    if (this.packageJson) {
      const deps = mergedDependencies(this.packageJson);
      for (const name of Object.keys(deps)) {
        if (AI_SDK_DEPENDENCY_NAMES.has(name)) return true;
        if (name.startsWith("@langchain/")) return true;
      }
    }
    const hasPromptsDir = this.files.some((f) => f.startsWith("prompts/"));
    if (hasPromptsDir) return true;
    const hasEvalsDir = this.files.some((f) => f.startsWith("evals/"));
    if (hasEvalsDir) return true;
    return false;
  }
}

/** Merge dependencies and devDependencies from a parsed package.json into one map. */
export function mergedDependencies(pkg: Record<string, unknown> | null): Record<string, string> {
  if (!pkg) return {};
  const deps = (pkg.dependencies as Record<string, string> | undefined) ?? {};
  const devDeps = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
  return { ...deps, ...devDeps };
}

/** Build a RepoContext by walking `root` once. */
export function buildContext(root: string): RepoContext {
  return new RepoContext(root);
}
