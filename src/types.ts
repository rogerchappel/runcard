export type Ecosystem =
  | 'node'
  | 'python'
  | 'rust'
  | 'go'
  | 'make'
  | 'shell'
  | 'lockfile';

export type CommandCategory =
  | 'install'
  | 'check'
  | 'test'
  | 'build'
  | 'smoke'
  | 'package'
  | 'run'
  | 'other';

export interface DetectedFile {
  path: string;
  kind: string;
  ecosystem: Ecosystem;
}

export interface DetectedScript {
  name: string;
  command: string;
  scriptBody?: string;
  source: string;
  ecosystem: Ecosystem;
}

export interface RankedCommand {
  category: CommandCategory;
  command: string;
  reason: string;
  confidence: number;
  source: string;
  ecosystem?: Ecosystem;
  scriptBody?: string;
}

export interface Finding {
  level: 'info' | 'warning';
  code: string;
  message: string;
  suggestion?: string;
}

export interface ScanResult {
  schemaVersion: 2;
  generatedAt: string;
  repo: {
    name: string;
    root: string;
  };
  ecosystems: Ecosystem[];
  files: DetectedFile[];
  scripts: DetectedScript[];
  commands: RankedCommand[];
  findings: Finding[];
}

export interface ScanOptions {
  root: string;
  now?: Date;
}

export interface ScanWriteOptions {
  markdownPath?: string;
  jsonPath?: string;
}
