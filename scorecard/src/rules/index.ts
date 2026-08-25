import type { Rule } from "../types.js";

import { rule as test1 } from "./test-1.js";
import { rule as test2 } from "./test-2.js";
import { rule as test3 } from "./test-3.js";
import { rule as cicd1 } from "./cicd-1.js";
import { rule as cicd2 } from "./cicd-2.js";
import { rule as sec1 } from "./sec-1.js";
import { rule as sec2 } from "./sec-2.js";
import { rule as sec3 } from "./sec-3.js";
import { rule as sec4 } from "./sec-4.js";
import { rule as auth1 } from "./auth-1.js";
import { rule as auth2 } from "./auth-2.js";
import { rule as obs1 } from "./obs-1.js";
import { rule as obs2 } from "./obs-2.js";
import { rule as eval1 } from "./eval-1.js";
import { rule as eval2 } from "./eval-2.js";
import { rule as iac1 } from "./iac-1.js";
import { rule as doc1 } from "./doc-1.js";
import { rule as doc2 } from "./doc-2.js";
import { rule as doc3 } from "./doc-3.js";
import { rule as sup1 } from "./sup-1.js";

/**
 * The ordered rule registry. Order matches docs/RUBRIC.md's rule catalog
 * exactly, and every renderer (markdown, JSON, --list-rules) walks this
 * array directly, so report ordering is always deterministic.
 *
 * 20 rules total: TEST-1..3, CICD-1..2, SEC-1..4, AUTH-1..2, OBS-1..2,
 * EVAL-1..2, IAC-1, DOC-1..3, SUP-1. Weights sum to 100.
 */
export const rules: readonly Rule[] = [
  test1,
  test2,
  test3,
  cicd1,
  cicd2,
  sec1,
  sec2,
  sec3,
  sec4,
  auth1,
  auth2,
  obs1,
  obs2,
  eval1,
  eval2,
  iac1,
  doc1,
  doc2,
  doc3,
  sup1,
];
