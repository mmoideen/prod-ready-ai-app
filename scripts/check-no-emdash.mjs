#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { statSync, readFileSync } from 'fs';
import { join } from 'path';
import { readdirSync } from 'fs';

const EM_DASH = '\u2014';
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg',
  'woff', 'woff2', 'ttf', 'eot',
  'zip', 'tar', 'gz',
  'pdf', 'exe', 'dll', 'so', 'dylib'
]);

function getFilesToCheck() {
  try {
    // Tracked AND untracked files (respecting .gitignore), so the check
    // catches new files before they are ever committed.
    const args = ['ls-files', '--cached', '--others', '--exclude-standard'];
    const files = execFileSync('git', args, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(f => f.length > 0);
    return files;
  } catch (err) {
    console.log('git ls-files not available, walking directory tree...');
    return walkTree('.');
  }
}

function walkTree(dir) {
  const files = [];
  const excludeDirs = new Set(['node_modules', '.git', 'dist', '.next', 'out', 'coverage', '.terraform']);

  function walk(currentPath) {
    try {
      const entries = readdirSync(currentPath);
      for (const entry of entries) {
        const fullPath = join(currentPath, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (!excludeDirs.has(entry)) {
            walk(fullPath);
          }
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Skip inaccessible files
    }
  }

  walk(dir);
  return files;
}

function isBinaryFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext && BINARY_EXTENSIONS.has(ext);
}

function checkFile(filename) {
  try {
    if (isBinaryFile(filename)) {
      return [];
    }

    const content = readFileSync(filename, 'utf8');
    const lines = content.split('\n');
    const issues = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(EM_DASH)) {
        issues.push(`${filename}:${i + 1}`);
      }
    }

    return issues;
  } catch (err) {
    // Skip files that cannot be read as text
    return [];
  }
}

function main() {
  const files = getFilesToCheck();
  const issues = [];

  for (const file of files) {
    const fileIssues = checkFile(file);
    issues.push(...fileIssues);
  }

  if (issues.length > 0) {
    console.error('Em dash (U+2014) found in the following files:');
    for (const issue of issues) {
      console.error(issue);
    }
    process.exit(1);
  }

  console.log(`Checked ${files.length} files, no em dashes found.`);
  process.exit(0);
}

main();
