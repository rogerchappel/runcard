#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanRepo, writeScanResult } from './scan.js';

interface CliOptions {
  command: string | undefined;
  root: string | undefined;
  fixture: string | undefined;
  out: string | undefined;
  json: string | undefined;
  help: boolean | undefined;
}

async function main(argv: string[]): Promise<void> {
  const options = parseArgs(argv);

  if (options.help || options.command !== 'scan') {
    printHelp();
    process.exitCode = options.help ? 0 : 1;
    return;
  }

  const root = options.fixture ? fixtureRoot(options.fixture) : path.resolve(options.root ?? process.cwd());
  const outDir = path.resolve(options.out ?? root);
  const markdownPath = path.join(outDir, 'RUN_CARD.md');
  const jsonPath = options.json === undefined ? undefined : path.resolve(options.json === '' ? path.join(outDir, 'run-card.json') : options.json);
  const result = await scanRepo({ root });

  await writeScanResult(result, jsonPath ? { markdownPath, jsonPath } : { markdownPath });

  const warningCount = result.findings.filter((finding) => finding.level === 'warning').length;
  console.log(`Wrote ${markdownPath}`);
  if (jsonPath) {
    console.log(`Wrote ${jsonPath}`);
  }
  console.log(`Detected: ${result.ecosystems.length === 0 ? 'none' : result.ecosystems.join(', ')}`);
  console.log(`Ranked commands: ${result.commands.length}`);
  if (warningCount > 0) {
    console.log(`Warnings: ${warningCount}`);
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    command: undefined,
    root: undefined,
    fixture: undefined,
    out: undefined,
    json: undefined,
    help: undefined
  };
  const args = [...argv];

  if (args[0] === '--help' || args[0] === '-h') {
    options.help = true;
    args.shift();
  } else {
    options.command = args.shift();
  }

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--root') {
      options.root = requireValue(arg, args.shift());
    } else if (arg === '--fixture') {
      options.fixture = requireValue(arg, args.shift());
    } else if (arg === '--out') {
      options.out = requireValue(arg, args.shift());
    } else if (arg === '--json') {
      const next = args[0];
      options.json = next && !next.startsWith('--') ? requireValue(arg, args.shift()) : '';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function fixtureRoot(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', 'fixtures', name);
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp(): void {
  console.log(`runcard

Usage:
  runcard scan [--root <path>] [--fixture <name>] [--out <dir>] [--json [path]]

Options:
  --root <path>      Repository root to scan. Defaults to the current directory.
  --fixture <name>   Scan a bundled fixture, useful for smoke tests.
  --out <dir>        Directory for RUN_CARD.md. Defaults to the scanned root.
  --json [path]      Also write JSON. Defaults to <out>/run-card.json when no path is supplied.
`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
