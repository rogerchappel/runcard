import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { renderRunCard, scanRepo, writeScanResult } from '../src/index.js';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const fixtureRoot = path.join(repoRoot, 'fixtures');

test('scan ranks Node CLI fixture commands deterministically', async () => {
  const result = await scanRepo({
    root: path.join(fixtureRoot, 'node-cli'),
    now: new Date('2026-05-30T00:00:00.000Z')
  });

  assert.deepEqual(result.ecosystems, ['lockfile', 'node', 'shell']);
  assert.equal(result.findings.length, 0);
  assert.ok(result.commands.some((command) => command.category === 'install' && command.command === 'npm ci'));
  assert.ok(result.commands.some((command) => command.category === 'check' && command.command === 'npm run check'));
  assert.ok(result.commands.some((command) => command.category === 'test' && command.command === 'npm test'));
  assert.ok(result.commands.some((command) => command.category === 'build' && command.command === 'npm run build'));
  assert.ok(result.commands.some((command) => command.category === 'smoke' && command.command === 'npm run smoke'));
  assert.ok(result.commands.some((command) => command.category === 'package' && command.command === 'npm run package:smoke'));
  assert.ok(result.scripts.some((script) => script.name === 'check' && script.scriptBody === 'tsc --noEmit'));

  const markdown = renderRunCard(result);
  assert.match(markdown, /# RUN_CARD/);
  assert.match(markdown, /Suggested Verification Order/);
  assert.match(markdown, /`npm ci`/);
});

test('suggested Node verification commands execute through npm in a clean shell', async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'runcard-node-fixture-'));
  const root = path.join(tempRoot, 'node-cli');
  await cp(path.join(fixtureRoot, 'node-cli'), root, { recursive: true });

  const result = await scanRepo({ root });
  const commands = ['install', 'check', 'test', 'build', 'smoke', 'package']
    .map((category) =>
      result.commands.find((command) => command.category === category && command.ecosystem === 'node')?.command
    )
    .filter((command): command is string => command !== undefined);

  assert.deepEqual(commands, [
    'npm ci',
    'npm run check',
    'npm test',
    'npm run build',
    'npm run smoke',
    'npm run package:smoke'
  ]);

  for (const command of commands) {
    await execFileAsync('/bin/sh', ['-c', command], {
      cwd: root,
      env: { PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` }
    });
  }
});

test('scan detects Python, Rust, Go, Make, and shell signals', async () => {
  const result = await scanRepo({
    root: path.join(fixtureRoot, 'polyglot'),
    now: new Date('2026-05-30T00:00:00.000Z')
  });

  assert.deepEqual(result.ecosystems, ['go', 'make', 'python', 'rust', 'shell']);
  assert.ok(result.commands.some((command) => command.command === 'python -m pytest'));
  assert.ok(result.commands.some((command) => command.command === 'python -m ruff check .'));
  assert.ok(result.commands.some((command) => command.command === 'cargo test'));
  assert.ok(result.commands.some((command) => command.command === 'go test ./...'));
  assert.ok(result.commands.some((command) => command.command === 'make smoke'));
  assert.ok(result.commands.some((command) => command.command === 'bash scripts/smoke.sh'));
});

test('scan flags missing test and smoke paths', async () => {
  const result = await scanRepo({
    root: path.join(fixtureRoot, 'missing-paths'),
    now: new Date('2026-05-30T00:00:00.000Z')
  });

  assert.deepEqual(
    result.findings.map((finding) => finding.code),
    ['missing-test-path', 'missing-smoke-path']
  );
});

test('writeScanResult writes markdown and JSON outputs', async () => {
  const result = await scanRepo({
    root: path.join(fixtureRoot, 'node-cli'),
    now: new Date('2026-05-30T00:00:00.000Z')
  });
  const outDir = await mkdtemp(path.join(tmpdir(), 'runcard-test-'));
  const markdownPath = path.join(outDir, 'RUN_CARD.md');
  const jsonPath = path.join(outDir, 'run-card.json');

  await writeScanResult(result, { markdownPath, jsonPath });

  const markdown = await readFile(markdownPath, 'utf8');
  const json = JSON.parse(await readFile(jsonPath, 'utf8')) as { schemaVersion: number };
  assert.match(markdown, /Repository: node-cli/);
  assert.equal(json.schemaVersion, 2);
});

test('cli help documents fixture smoke and json output flags', async () => {
  const { stdout, stderr } = await execFileAsync('node', ['dist/cli.js', '--help']);

  assert.equal(stderr, '');
  assert.match(stdout, /runcard scan/);
  assert.match(stdout, /--fixture <name>/);
  assert.match(stdout, /--json \[path\]/);
});

test('cli writes default JSON beside RUN_CARD when --json has no path', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'runcard-cli-'));
  const { stdout, stderr } = await execFileAsync('node', [
    'dist/cli.js',
    'scan',
    '--fixture',
    'node-cli',
    '--out',
    outDir,
    '--json'
  ]);

  const markdown = await readFile(path.join(outDir, 'RUN_CARD.md'), 'utf8');
  const json = JSON.parse(await readFile(path.join(outDir, 'run-card.json'), 'utf8')) as { schemaVersion: number; repo: { name: string } };

  assert.equal(stderr, '');
  assert.match(stdout, /Wrote .*RUN_CARD\.md/);
  assert.match(stdout, /Wrote .*run-card\.json/);
  assert.match(markdown, /Repository: node-cli/);
  assert.equal(json.schemaVersion, 2);
  assert.equal(json.repo.name, 'node-cli');
});

test('cli exits non-zero for unknown bundled fixtures', async () => {
  await assert.rejects(
    execFileAsync('node', ['dist/cli.js', 'scan', '--fixture', 'does-not-exist']),
    /ENOENT|no such file/
  );
});
