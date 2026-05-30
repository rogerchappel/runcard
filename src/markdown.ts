import type { CommandCategory, RankedCommand, ScanResult } from './types.js';

const categories: CommandCategory[] = ['install', 'check', 'test', 'build', 'smoke', 'package', 'run', 'other'];

export function renderRunCard(result: ScanResult): string {
  const lines: string[] = [
    '# RUN_CARD',
    '',
    `Repository: ${result.repo.name}`,
    `Generated: ${result.generatedAt}`,
    '',
    '## Detected Signals',
    ''
  ];

  if (result.files.length === 0) {
    lines.push('- No known repository signals detected.');
  } else {
    for (const file of result.files) {
      lines.push(`- ${file.path} (${file.kind}, ${file.ecosystem})`);
    }
  }

  lines.push('', '## Commands', '');

  for (const category of categories) {
    const commands = result.commands.filter((command) => command.category === category);
    if (commands.length === 0) {
      continue;
    }

    lines.push(`### ${titleCase(category)}`, '');
    for (const command of commands) {
      lines.push(`- \`${command.command}\` (${command.confidence}/100, ${command.source})`);
      lines.push(`  - ${command.reason}`);
    }
    lines.push('');
  }

  lines.push('## Findings', '');
  if (result.findings.length === 0) {
    lines.push('- No missing test or smoke paths detected.');
  } else {
    for (const finding of result.findings) {
      lines.push(`- ${finding.level.toUpperCase()} ${finding.code}: ${finding.message}`);
      if (finding.suggestion) {
        lines.push(`  - ${finding.suggestion}`);
      }
    }
  }

  lines.push('', '## Suggested Verification Order', '');
  for (const category of ['install', 'check', 'test', 'build', 'smoke', 'package'] as CommandCategory[]) {
    const command = bestCommand(result.commands, category);
    if (command) {
      lines.push(`- ${titleCase(category)}: \`${command.command}\``);
    }
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function bestCommand(commands: RankedCommand[], category: CommandCategory): RankedCommand | undefined {
  return commands.filter((command) => command.category === category).sort((left, right) => right.confidence - left.confidence)[0];
}

function titleCase(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
