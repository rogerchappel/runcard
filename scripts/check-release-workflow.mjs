import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");

function job(name, nextName) {
  const start = workflow.indexOf(`  ${name}:\n`);
  assert.notEqual(start, -1, `release workflow must define ${name}`);
  const end = nextName ? workflow.indexOf(`  ${nextName}:\n`, start) : workflow.length;
  assert.notEqual(end, -1, `release workflow must define ${nextName}`);
  return workflow.slice(start, end);
}

const verify = job("verify", "publish-npm");
const npmPublish = job("publish-npm", "publish-github");
const githubPublish = job("publish-github");

assert.match(verify, /permissions:\n\s+contents: read/);
assert.doesNotMatch(verify, /id-token: write|contents: write|npm publish/);
for (const required of ["npm ci", "releasebox.js check", "npm run release:check", "npm pack", "releasebox.js notes", "actions\/upload-artifact@v4"]) {
  assert.ok(verify.includes(required), `verify job must run ${required}`);
}

assert.match(npmPublish, /needs: verify/);
assert.match(npmPublish, /permissions:\n\s+contents: read\n\s+id-token: write/);
assert.doesNotMatch(npmPublish, /contents: write/);
assert.match(npmPublish, /actions\/download-artifact@v4/);
assert.match(npmPublish, /npm publish \*\.tgz --access public --provenance/);

assert.match(githubPublish, /needs:\n\s+- verify\n\s+- publish-npm/);
assert.match(githubPublish, /permissions:\n\s+contents: write/);
assert.doesNotMatch(githubPublish, /id-token: write|npm publish/);
assert.match(githubPublish, /actions\/download-artifact@v4/);
assert.match(githubPublish, /gh release create .*RELEASE_NOTES\.md \*\.tgz/);

console.log("release workflow dependency and permission checks passed");
