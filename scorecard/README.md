# prod-ready-scorecard

A production readiness scorecard CLI. It scores a repository against the
organization's rubric of 20 rules for internal AI tools
([`docs/RUBRIC.md`](../docs/RUBRIC.md)) and prints a markdown or JSON report
with a score, a letter grade, and a lifecycle stage recommendation
([`docs/LIFECYCLE.md`](../docs/LIFECYCLE.md)).

The scorecard never executes code from the repository it scans. It only reads
files (file presence, and string/regex checks on file content), which keeps
it safe to run against untrusted branches in CI. It has zero runtime
dependencies: the only devDependencies are `typescript` and `@types/node`,
and tests run on the built in `node:test` runner, not a third party test
framework.

## What it does

- Walks the target directory once (skipping `node_modules`, `.git`, `dist`,
  `.next`, `out`, `coverage`, `.terraform`, `.venv`, `__pycache__`).
- Evaluates all 20 rules from the rubric: each rule reports `pass`, `fail`,
  or `na` (not applicable), with evidence citing the file paths it found (or
  what it searched for and did not find), and a remediation hint.
- Scores the repository as the weighted percentage of passing rules among
  applicable rules. Not applicable rules are excluded from both the
  numerator and the denominator, so a repository is never penalized for a
  category that does not apply to its stack (for example the Evaluations
  rules on a repository with no AI signals).
- Maps the score to a letter grade (A through F) and a lifecycle stage
  recommendation (Experimental, Pilot at best, Pilot, Production ready, or
  Production ready with business critical eligibility).

## Install and run

From inside this directory, against another repository:

```sh
cd scorecard
npm install
npx . --path ../some-repo
```

`npm install` runs the `prepare` script, which runs `npm run build`, so
`dist/cli.js` exists before `npx .` looks for it. This is what makes `npx`
work from a clean checkout.

Once this package is published, it can be run without cloning it first:

```sh
npx prod-ready-scorecard --path .
```

A GitHub Action wrapper that runs this CLI in CI is provided at
`actions/reusable-readiness` at the repository root; point a workflow step
at it to gate merges on `--min-score 85` without reinstalling the CLI by
hand in every repository.

### Local development

```sh
npm install       # installs typescript and @types/node, then builds
npm run build      # compile src/ to dist/ with tsc
npm test            # build, then run node --test against dist/tests/*.test.js
```

## Flags

| Flag | Default | Description |
| --- | --- | --- |
| `--path <dir>` | `.` | Directory to scan. |
| `--format <md\|json\|both>` | `md` | Output format. `both` prints the markdown report followed by the JSON report. |
| `--output <file>` | (none) | Also write the report to this file, in addition to stdout. |
| `--min-score <n>` | (none) | When set, the CLI exits 1 if the score is below `n`. When absent, the CLI always reports but never fails on score alone. |
| `--advisory` | off | Always exit 0, even below `--min-score`. A notice is still printed to stderr stating whether the threshold was met. |
| `--baseline <file>` | (none) | Compare against a previously saved JSON report (see Comparison mode below) and print a score delta. |
| `--list-rules` | off | Print the rule catalog (id, category, title, weight) instead of scoring a repository. Respects `--format json` for a machine readable catalog, including the rubric version. This powers a CI sync check between the CLI, `docs/RUBRIC.md`, and `templates/PRODUCTION_READINESS.md`. |
| `--version` | off | Print the CLI version and exit. |
| `--help` | off | Print usage and exit. |

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success, advisory mode, or `--list-rules` / `--help` / `--version`. |
| 1 | The score is below `--min-score`. |
| 2 | Usage error, or `--path` (or `--baseline`) does not exist / is not readable. |

## Sample report (truncated)

Running `prod-ready-scorecard --path fixtures/passing-repo --min-score 85`
produces a report like this (rows omitted for brevity, marked `...`):

```
# Production Readiness Scorecard

Generated for: fixtures/passing-repo
Rubric version: 1.0.0
Generated at: 2026-08-25T01:26:49.575Z

## Summary

- Score: 100.0 / 100 (Grade A)
- Stage recommendation: Production ready (business critical eligible)
- Applicable weight: 100 / 100
- Min score: 85 (met)

## Category breakdown

| Category | Passed / Applicable weight |
| --- | --- |
| Testing | 15 / 15 |
| CI/CD | 10 / 10 |
...
| Support model | 8 / 8 |

## Results

| Status | ID | Title | Weight | Evidence |
| --- | --- | --- | --- | --- |
| PASS | TEST-1 | A real test script exists | 5 | package.json scripts.test is "node --test tests/" |
| PASS | TEST-2 | Test files are present | 5 | Found 1 test file(s), for example tests/example.test.js |
...
| PASS | SUP-1 | An owner is named | 8 | SUPPORT.md names an owner |

## Remediation

No failing rules. Nothing to remediate.
```

When rules fail, the Remediation section lists every failing rule with its
remediation hint, for example:

```
### FAIL SEC-2: No obvious secrets are committed

Remove the committed secret material, rotate any exposed credentials, and
purge the secret from git history before promotion.
```

## JSON report shape

`--format json` (schemaVersion `1.0.0`):

```jsonc
{
  "schemaVersion": "1.0.0",
  "rubricVersion": "1.0.0",
  "generatedAt": "2026-08-25T01:26:49.575Z",
  "path": "fixtures/passing-repo",
  "score": 100.0,
  "grade": "A",
  "stageRecommendation": "Production ready (business critical eligible)",
  "minScore": 85,
  "passed": true,
  "categories": [
    { "name": "Testing", "weightApplicable": 15, "weightPassed": 15 }
    // ... one entry per category, in rubric order
  ],
  "rules": [
    {
      "id": "TEST-1",
      "category": "Testing",
      "title": "A real test script exists",
      "weight": 5,
      "status": "pass",
      "evidence": "package.json scripts.test is \"node --test tests/\"",
      "remediation": "Add a real test runner, write at least one meaningful test for the core behavior, and call the test command from CI."
    }
    // ... one entry per rule, 20 total, in rubric order
  ],
  "baseline": {
    // only present when --baseline was given; see Comparison mode below
    "oldScore": 100.0,
    "newScore": 100.0,
    "delta": 0.0,
    "changes": [{ "id": "TEST-2", "from": "fail", "to": "pass" }]
  }
}
```

`minScore` and `passed` are `null` when `--min-score` was not given. `rules`
and `categories` are always in registry order (the same order as
`docs/RUBRIC.md`'s rule catalog), so report ordering is deterministic.

`--list-rules --format json` returns a smaller, separate shape:
`{ schemaVersion, rubricVersion, rules: [{ id, category, title, weight }], totalWeight }`.

## Comparison mode (`--baseline`)

`--baseline <file>` reads a previously saved `--format json` report and
prints a score delta line, plus any rule level status changes, in both the
markdown and JSON renderers. This is useful for showing "did this PR make
the score better or worse" without re-deriving history from git.

```sh
# Save today's report as a baseline.
prod-ready-scorecard --path . --format json --output baseline.json

# Later, compare the current state against it.
prod-ready-scorecard --path . --baseline baseline.json
```

The markdown renderer adds a "Baseline comparison" section:

```
## Baseline comparison

New score: 91.2, old score: 85.0, delta: +6.2

Rule changes:
- TEST-2: fail -> pass
- SEC-1: fail -> pass
```

When nothing changed, it prints `delta: 0.0` and `No rule status changes.`
instead of a change list. The JSON renderer adds a `baseline` object with
the same `oldScore`, `newScore`, `delta`, and `changes` fields.

## How to add a rule

1. Add `src/rules/<id>.ts` exporting a `Rule` (see `src/types.ts`): an `id`
   matching the rubric exactly, a `category` matching the weight summary
   table, a `title`, a `weight`, and an `evaluate(ctx)` function returning
   `{ status: "pass" | "fail" | "na", evidence, remediation }`. Reuse the
   helpers in `src/rules/util.ts` and the `RepoContext` API in
   `src/context.ts` (`hasFile`, `findFiles`, `readText`, `textFiles`,
   `packageJson`, `workflowFiles`, `stack`, `aiSignals`).
2. Register it in `src/rules/index.ts`, in the same position the rubric
   lists it in.
3. Update `docs/RUBRIC.md` (the rule table and the weight summary, keeping
   the total at 100) and `templates/PRODUCTION_READINESS.md` in the same
   pull request, so the CLI, the rubric doc, and the manual checklist stay
   in lockstep, one to one.
4. Add or update fixtures under `fixtures/passing-repo` and
   `fixtures/failing-repo` so the new rule is exercised by the existing
   pipeline tests, and add a unit test if the detection logic is nontrivial.
5. CI enforces the sync: `prod-ready-scorecard --list-rules --format json`
   is the machine readable source of truth for rule IDs and weights, and a
   sync check job can diff it against `docs/RUBRIC.md`.

## Rules implemented

20 rules across 9 categories, weights summing to 100: `TEST-1..3`,
`CICD-1..2`, `SEC-1..4`, `AUTH-1..2`, `OBS-1..2`, `EVAL-1..2`, `IAC-1`,
`DOC-1..3`, `SUP-1`. Run `prod-ready-scorecard --list-rules` for the full,
current catalog with titles and weights.
