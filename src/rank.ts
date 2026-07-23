import type { CommandCategory, DetectedFile, DetectedScript, Ecosystem, Finding, RankedCommand } from './types.js';

const categoryOrder: CommandCategory[] = ['install', 'check', 'test', 'build', 'smoke', 'package', 'run', 'other'];

const categoryPatterns: Array<{
  category: CommandCategory;
  patterns: RegExp[];
  reason: string;
  confidence: number;
}> = [
  {
    category: 'smoke',
    patterns: [/(^|[:._-\s])smoke($|[:._-\s])/i, /quick.?start/i, /health/i],
    reason: 'script name suggests a smoke or health check',
    confidence: 96
  },
  {
    category: 'test',
    patterns: [/(^|[:._-])test($|[:._-])/i, /pytest/i, /cargo test/i, /go test/i],
    reason: 'script name or command suggests test execution',
    confidence: 92
  },
  {
    category: 'check',
    patterns: [/check/i, /lint/i, /typecheck/i, /validate/i, /verify/i, /ruff/i, /cargo check/i],
    reason: 'script name or command suggests static validation',
    confidence: 88
  },
  {
    category: 'build',
    patterns: [/build/i, /compile/i],
    reason: 'script name or command suggests build output',
    confidence: 84
  },
  {
    category: 'package',
    patterns: [/pack/i, /package/i, /dist/i, /release/i],
    reason: 'script name or command suggests packaging or release artifact creation',
    confidence: 80
  },
  {
    category: 'install',
    patterns: [/install/i, /bootstrap/i, /setup/i],
    reason: 'script name suggests dependency setup',
    confidence: 76
  },
  {
    category: 'run',
    patterns: [/^start$/i, /^dev$/i, /^serve$/i],
    reason: 'script name suggests running the project locally',
    confidence: 62
  }
];

export function rankCommands(files: DetectedFile[], scripts: DetectedScript[]): RankedCommand[] {
  const commands = new Map<string, RankedCommand>();

  for (const installCommand of installCommands(files)) {
    addCommand(commands, installCommand);
  }

  for (const script of scripts) {
    addCommand(commands, rankScript(script));
  }

  return Array.from(commands.values()).sort((left, right) => {
    const categoryDelta = categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category);
    if (categoryDelta !== 0) {
      return categoryDelta;
    }

    const confidenceDelta = right.confidence - left.confidence;
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    return left.command.localeCompare(right.command);
  });
}

export function findingsFor(commands: RankedCommand[]): Finding[] {
  const categories = new Set(commands.map((command) => command.category));
  const findings: Finding[] = [];

  if (!categories.has('test')) {
    findings.push({
      level: 'warning',
      code: 'missing-test-path',
      message: 'No likely test command was detected.',
      suggestion: 'Add a conventional test script such as npm test, pytest, cargo test, or go test ./....'
    });
  }

  if (!categories.has('smoke')) {
    findings.push({
      level: 'warning',
      code: 'missing-smoke-path',
      message: 'No explicit smoke command was detected.',
      suggestion: 'Add a fast smoke script that exercises the CLI or primary entrypoint without external services.'
    });
  }

  return findings;
}

function installCommands(files: DetectedFile[]): RankedCommand[] {
  const paths = new Set(files.map((file) => file.path));
  const commands: RankedCommand[] = [];

  if (paths.has('package-lock.json')) {
    commands.push(install('npm ci', 'package-lock.json', 'node', 95));
  } else if (paths.has('pnpm-lock.yaml')) {
    commands.push(install('pnpm install --frozen-lockfile', 'pnpm-lock.yaml', 'node', 95));
  } else if (paths.has('yarn.lock')) {
    commands.push(install('yarn install --frozen-lockfile', 'yarn.lock', 'node', 93));
  } else if (paths.has('bun.lock') || paths.has('bun.lockb')) {
    commands.push(install('bun install --frozen-lockfile', paths.has('bun.lock') ? 'bun.lock' : 'bun.lockb', 'node', 93));
  } else if (paths.has('package.json')) {
    commands.push(install('npm install', 'package.json', 'node', 70));
  }

  if (paths.has('uv.lock')) {
    commands.push(install('uv sync', 'uv.lock', 'python', 92));
  } else if (paths.has('poetry.lock')) {
    commands.push(install('poetry install', 'poetry.lock', 'python', 90));
  } else if (paths.has('Pipfile.lock')) {
    commands.push(install('pipenv install --dev', 'Pipfile.lock', 'python', 88));
  } else if (paths.has('requirements.txt')) {
    commands.push(install('python -m pip install -r requirements.txt', 'requirements.txt', 'python', 82));
  } else if (paths.has('pyproject.toml') || paths.has('setup.py')) {
    commands.push(install('python -m pip install -e .', paths.has('pyproject.toml') ? 'pyproject.toml' : 'setup.py', 'python', 72));
  }

  if (paths.has('Cargo.toml')) {
    commands.push(install('cargo fetch', 'Cargo.toml', 'rust', 65));
  }

  if (paths.has('go.mod')) {
    commands.push(install('go mod download', 'go.mod', 'go', 78));
  }

  return commands;
}

function install(command: string, source: string, ecosystem: Ecosystem, confidence: number): RankedCommand {
  return {
    category: 'install',
    command,
    reason: 'manifest or lockfile provides a deterministic dependency install path',
    confidence,
    source,
    ecosystem
  };
}

function rankScript(script: DetectedScript): RankedCommand {
  const haystack = `${script.name} ${script.scriptBody ?? script.command}`;
  if (/\bnpm\s+pack\b|\bpack\s+--dry-run\b/.test(script.scriptBody ?? script.command)) {
    return {
      category: 'package',
      command: script.command,
      reason: 'script command creates or validates a package artifact',
      confidence: 88,
      source: script.source,
      ecosystem: script.ecosystem,
      ...scriptMetadata(script)
    };
  }

  for (const rule of categoryPatterns) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return {
        category: rule.category,
        command: script.command,
        reason: rule.reason,
        confidence: rule.confidence,
        source: script.source,
        ecosystem: script.ecosystem,
        ...scriptMetadata(script)
      };
    }
  }

  return {
    category: 'other',
    command: script.command,
    reason: 'detected script did not match a higher-confidence run-card category',
    confidence: 40,
    source: script.source,
    ecosystem: script.ecosystem,
    ...scriptMetadata(script)
  };
}

function scriptMetadata(script: DetectedScript): Pick<RankedCommand, 'scriptBody'> | Record<string, never> {
  return script.scriptBody === undefined ? {} : { scriptBody: script.scriptBody };
}

function addCommand(commands: Map<string, RankedCommand>, command: RankedCommand): void {
  const key = `${command.category}\u0000${command.command}`;
  const existing = commands.get(key);
  if (!existing || command.confidence > existing.confidence) {
    commands.set(key, command);
  }
}
