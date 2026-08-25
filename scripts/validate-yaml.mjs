#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { statSync } from 'fs';
import { join } from 'path';
import { readdirSync } from 'fs';

function getFilesToCheck() {
  try {
    // Tracked AND untracked files (respecting .gitignore), so validation
    // covers new files before they are ever committed.
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

function isYamlFile(filename) {
  return filename.endsWith('.yml') || filename.endsWith('.yaml');
}

function validateYaml(filename) {
  try {
    // execFile avoids the shell entirely, so filenames are passed verbatim.
    execFileSync('npx', ['--yes', 'js-yaml', filename], {
      stdio: 'pipe',
      encoding: 'utf8'
    });
    return null;
  } catch (err) {
    const detail = err && err.stderr ? String(err.stderr).trim() : 'parse error';
    return `${filename}: ${detail}`;
  }
}

function main() {
  const files = getFilesToCheck();
  const yamlFiles = files.filter(isYamlFile);
  const failures = [];

  for (const file of yamlFiles) {
    const failure = validateYaml(file);
    if (failure) {
      failures.push(failure);
    }
  }

  if (failures.length > 0) {
    console.error(`Failed to parse ${failures.length} YAML file(s):`);
    for (const file of failures) {
      console.error(file);
    }
    process.exit(1);
  }

  console.log(`Validated ${yamlFiles.length} YAML files successfully.`);
  process.exit(0);
}

main();
