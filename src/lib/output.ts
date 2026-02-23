import chalk from 'chalk';
import Table from 'cli-table3';

export function success(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

export function error(message: string): void {
  console.error(chalk.red('Error:') + ' ' + message);
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(headers: string[], rows: string[][]): void {
  const table = new Table({
    head: headers.map(h => chalk.cyan(h)),
    style: { head: [], border: [] },
  });

  for (const row of rows) {
    table.push(row);
  }

  console.log(table.toString());
}

export function printDetail(fields: [string, string][]): void {
  const maxLabel = Math.max(...fields.map(([label]) => label.length));
  for (const [label, value] of fields) {
    console.log(`${chalk.bold(label.padEnd(maxLabel + 1))} ${value}`);
  }
}

export function formatLastOnline(dateStr?: string): string {
  if (!dateStr) return 'Never';

  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 60_000) return 'Just now';

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;

  const diffDays = Math.floor(diffMs / 86_400_000);
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
}
