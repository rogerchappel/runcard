import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { detectRepo, ecosystemsFor } from './detect.js';
import { listRepoFiles } from './fs.js';
import { renderRunCard } from './markdown.js';
import { findingsFor, rankCommands } from './rank.js';
import type { ScanOptions, ScanResult, ScanWriteOptions } from './types.js';

export async function scanRepo(options: ScanOptions): Promise<ScanResult> {
  const root = path.resolve(options.root);
  const files = await listRepoFiles(root);
  const detection = await detectRepo(root, files);
  const commands = rankCommands(detection.files, detection.scripts);

  return {
    schemaVersion: 1,
    generatedAt: (options.now ?? new Date()).toISOString(),
    repo: {
      name: path.basename(root),
      root
    },
    ecosystems: ecosystemsFor(detection.files, detection.scripts),
    files: detection.files,
    scripts: detection.scripts,
    commands,
    findings: findingsFor(commands)
  };
}

export async function writeScanResult(result: ScanResult, options: ScanWriteOptions): Promise<void> {
  if (options.markdownPath) {
    await mkdir(path.dirname(options.markdownPath), { recursive: true });
    await writeFile(options.markdownPath, renderRunCard(result), 'utf8');
  }

  if (options.jsonPath) {
    await mkdir(path.dirname(options.jsonPath), { recursive: true });
    await writeFile(options.jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
}
