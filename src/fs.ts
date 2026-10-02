import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const ignoredDirectories = new Set([
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  'target',
  'vendor',
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

export async function readJsonIfExists<T>(filePath: string, displayPath = filePath): Promise<T | undefined> {
  try {
    const text = await readTextIfExists(filePath);
    if (text === undefined) {
      return undefined;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Failed to read JSON manifest ${displayPath}: ${cause.message}`, { cause });
  }
}

export async function listRepoFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const rootRealPath = await realpath(root);
  const isWithinRoot = (target: string): boolean => target === rootRealPath || target.startsWith(`${rootRealPath}${path.sep}`);

  async function visit(directory: string, ancestors: Set<string>): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          const target = await realpath(absolutePath);
          if (!ancestors.has(target)) {
            const nextAncestors = new Set(ancestors);
            nextAncestors.add(target);
            await visit(absolutePath, nextAncestors);
          }
        }
        continue;
      }

      if (entry.isFile()) {
        files.push(relativePath);
        continue;
      }

      if (!entry.isSymbolicLink()) continue;

      let target: string;
      try {
        target = await realpath(absolutePath);
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error &&
            (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'ELOOP')) continue;
        throw error;
      }
      if (!isWithinRoot(target)) continue;

      const targetStat = await stat(absolutePath);
      if (targetStat.isFile()) {
        files.push(relativePath);
      } else if (targetStat.isDirectory() && !ignoredDirectories.has(entry.name) && !ancestors.has(target)) {
        const nextAncestors = new Set(ancestors);
        nextAncestors.add(target);
        await visit(absolutePath, nextAncestors);
      }
    }
  }

  await visit(root, new Set([rootRealPath]));
  return files.sort();
}
