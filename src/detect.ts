import path from 'node:path';
import { readJsonIfExists, readTextIfExists } from './fs.js';
import type { DetectedFile, DetectedScript, Ecosystem } from './types.js';

interface PackageJson {
  scripts?: Record<string, string>;
  packageManager?: string;
}

export interface DetectionResult {
  files: DetectedFile[];
  scripts: DetectedScript[];
}

const lockfileKinds: Record<string, string> = {
  'package-lock.json': 'npm lockfile',
  'pnpm-lock.yaml': 'pnpm lockfile',
  'yarn.lock': 'yarn lockfile',
  'bun.lock': 'bun lockfile',
  'bun.lockb': 'bun lockfile',
  'poetry.lock': 'poetry lockfile',
  'uv.lock': 'uv lockfile',
  'Pipfile.lock': 'pipenv lockfile',
  'Cargo.lock': 'cargo lockfile',
  'go.sum': 'go checksum lockfile'
};

export async function detectRepo(root: string, repoFiles: string[]): Promise<DetectionResult> {
  const files: DetectedFile[] = [];
  const scripts: DetectedScript[] = [];
  const fileSet = new Set(repoFiles);

  addKnownFiles(files, fileSet);
  await addNode(root, fileSet, files, scripts);
  await addPython(root, fileSet, files, scripts);
  await addRust(root, fileSet, files, scripts);
  await addGo(root, fileSet, files, scripts);
  await addMake(root, fileSet, files, scripts);
  await addShell(root, repoFiles, files, scripts);

  return { files, scripts };
}

export function ecosystemsFor(files: DetectedFile[], scripts: DetectedScript[]): Ecosystem[] {
  return Array.from(new Set([...files.map((file) => file.ecosystem), ...scripts.map((script) => script.ecosystem)])).sort();
}

function addKnownFiles(files: DetectedFile[], fileSet: Set<string>): void {
  for (const [filePath, kind] of Object.entries(lockfileKinds)) {
    if (fileSet.has(filePath)) {
      files.push({ path: filePath, kind, ecosystem: 'lockfile' });
    }
  }
}

async function addNode(
  root: string,
  fileSet: Set<string>,
  files: DetectedFile[],
  scripts: DetectedScript[]
): Promise<void> {
  if (!fileSet.has('package.json')) {
    return;
  }

  files.push({ path: 'package.json', kind: 'node manifest', ecosystem: 'node' });
  const packageJson = await readJsonIfExists<PackageJson>(path.join(root, 'package.json'));

  const packageManager = nodePackageManager(packageJson?.packageManager, fileSet);
  for (const [name, scriptBody] of Object.entries(packageJson?.scripts ?? {})) {
    scripts.push({
      name,
      command: nodeScriptCommand(packageManager, name),
      scriptBody,
      source: `package.json#scripts.${name}`,
      ecosystem: 'node'
    });
  }
}

function nodePackageManager(declared: string | undefined, fileSet: Set<string>): 'npm' | 'pnpm' | 'yarn' | 'bun' {
  const name = declared?.split('@', 1)[0];
  if (name === 'npm' || name === 'pnpm' || name === 'yarn' || name === 'bun') {
    return name;
  }
  if (fileSet.has('pnpm-lock.yaml')) return 'pnpm';
  if (fileSet.has('yarn.lock')) return 'yarn';
  if (fileSet.has('bun.lock') || fileSet.has('bun.lockb')) return 'bun';
  return 'npm';
}

function nodeScriptCommand(packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun', name: string): string {
  if (packageManager === 'npm' && name === 'test') {
    return 'npm test';
  }
  if (packageManager === 'npm' && name === 'start') {
    return 'npm start';
  }
  return `${packageManager} run ${name}`;
}

async function addPython(
  root: string,
  fileSet: Set<string>,
  files: DetectedFile[],
  scripts: DetectedScript[]
): Promise<void> {
  for (const filePath of ['pyproject.toml', 'requirements.txt', 'setup.py', 'tox.ini', 'pytest.ini', 'noxfile.py']) {
    if (fileSet.has(filePath)) {
      files.push({ path: filePath, kind: pythonKind(filePath), ecosystem: 'python' });
    }
  }

  const pyproject = await readTextIfExists(path.join(root, 'pyproject.toml'));
  if (pyproject?.includes('[tool.pytest')) {
    scripts.push({ name: 'pytest', command: 'python -m pytest', source: 'pyproject.toml', ecosystem: 'python' });
  }
  if (pyproject?.includes('[tool.ruff')) {
    scripts.push({ name: 'ruff', command: 'python -m ruff check .', source: 'pyproject.toml', ecosystem: 'python' });
  }
  if (fileSet.has('pytest.ini')) {
    scripts.push({ name: 'pytest', command: 'python -m pytest', source: 'pytest.ini', ecosystem: 'python' });
  }
  if (fileSet.has('tox.ini')) {
    scripts.push({ name: 'tox', command: 'tox', source: 'tox.ini', ecosystem: 'python' });
  }
}

async function addRust(
  root: string,
  fileSet: Set<string>,
  files: DetectedFile[],
  scripts: DetectedScript[]
): Promise<void> {
  if (!fileSet.has('Cargo.toml')) {
    return;
  }

  files.push({ path: 'Cargo.toml', kind: 'cargo manifest', ecosystem: 'rust' });
  const cargoToml = await readTextIfExists(path.join(root, 'Cargo.toml'));
  if (cargoToml?.includes('[workspace]') || cargoToml?.includes('[package]')) {
    scripts.push({ name: 'cargo check', command: 'cargo check', source: 'Cargo.toml', ecosystem: 'rust' });
    scripts.push({ name: 'cargo test', command: 'cargo test', source: 'Cargo.toml', ecosystem: 'rust' });
  }
}

async function addGo(
  root: string,
  fileSet: Set<string>,
  files: DetectedFile[],
  scripts: DetectedScript[]
): Promise<void> {
  if (!fileSet.has('go.mod')) {
    return;
  }

  files.push({ path: 'go.mod', kind: 'go module', ecosystem: 'go' });
  const goMod = await readTextIfExists(path.join(root, 'go.mod'));
  if (goMod?.includes('module ')) {
    scripts.push({ name: 'go test', command: 'go test ./...', source: 'go.mod', ecosystem: 'go' });
    scripts.push({ name: 'go build', command: 'go build ./...', source: 'go.mod', ecosystem: 'go' });
  }
}

async function addMake(
  root: string,
  fileSet: Set<string>,
  files: DetectedFile[],
  scripts: DetectedScript[]
): Promise<void> {
  const makefile = fileSet.has('Makefile') ? 'Makefile' : fileSet.has('makefile') ? 'makefile' : undefined;
  if (!makefile) {
    return;
  }

  files.push({ path: makefile, kind: 'makefile', ecosystem: 'make' });
  const text = await readTextIfExists(path.join(root, makefile));
  const targets = text?.matchAll(/^([A-Za-z0-9_.-]+):(?:\s|$)/gm) ?? [];
  for (const match of targets) {
    const name = match[1];
    if (name && !name.startsWith('.')) {
      scripts.push({ name, command: `make ${name}`, source: makefile, ecosystem: 'make' });
    }
  }
}

async function addShell(
  root: string,
  repoFiles: string[],
  files: DetectedFile[],
  scripts: DetectedScript[]
): Promise<void> {
  const shellFiles = repoFiles.filter((filePath) => filePath.endsWith('.sh') || filePath.startsWith('scripts/'));

  for (const filePath of shellFiles) {
    const absolutePath = path.join(root, filePath);
    const text = await readTextIfExists(absolutePath);
    if (filePath.endsWith('.sh') || text?.startsWith('#!')) {
      files.push({ path: filePath, kind: 'shell script', ecosystem: 'shell' });
      scripts.push({ name: path.basename(filePath), command: shellCommand(filePath), source: filePath, ecosystem: 'shell' });
    }
  }
}

function pythonKind(filePath: string): string {
  if (filePath === 'pyproject.toml') {
    return 'python project manifest';
  }
  if (filePath === 'requirements.txt') {
    return 'python requirements';
  }
  return 'python tool config';
}

function shellCommand(filePath: string): string {
  return filePath.startsWith('scripts/') ? `bash ${filePath}` : `./${filePath}`;
}
