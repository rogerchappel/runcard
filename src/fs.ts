import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ignoredDirectories = new Set([
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  'target',
  'node_modules',
  '.venv',
  'venv',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache'
]);

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export async function readTextIfExists(filePath: string): Promise<string | undefined> {
  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return readFile(filePath, 'utf8');
}

export async function readJsonIfExists<T>(filePath: string): Promise<T | undefined> {
  const text = await readTextIfExists(filePath);
  if (text === undefined) {
    return undefined;
  }

  return JSON.parse(text) as T;
}

export async function listRepoFiles(root: string, maxDepth = 3): Promise<string[]> {
  const files: string[] = [];

  async function visit(directory: string, depth: number): Promise<void> {
    if (depth > maxDepth) {
      return;
    }

    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await visit(absolutePath, depth + 1);
        }
        continue;
      }

      if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await visit(root, 0);
  return files.sort();
}
