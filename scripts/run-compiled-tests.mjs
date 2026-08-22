import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const testRoot = fileURLToPath(new URL("../.tmp/test-dist/tests/", import.meta.url));

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...await findTests(path));
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      tests.push(path);
    }
  }

  return tests;
}

const tests = await findTests(testRoot);
if (tests.length === 0) {
  throw new Error(`No compiled tests found under ${testRoot}`);
}

const result = spawnSync(process.execPath, ["--test", ...tests], { stdio: "inherit" });
if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
