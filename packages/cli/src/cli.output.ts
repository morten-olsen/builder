import type { Command } from 'commander';

type Column = {
  header: string;
  key: string;
};

const printTable = (rows: Record<string, unknown>[], columns: Column[]): void => {
  if (rows.length === 0) {
    console.log('No results.');
    return;
  }

  const widths = columns.map((col) => {
    const maxValLen = rows.reduce((max, row) => {
      const val = String(row[col.key] ?? '');
      return Math.max(max, val.length);
    }, 0);
    return Math.max(col.header.length, maxValLen);
  });

  const header = columns.map((col, i) => col.header.padEnd(widths[i])).join('  ');
  console.log(header);
  console.log(columns.map((_, i) => '-'.repeat(widths[i])).join('  '));

  for (const row of rows) {
    const line = columns.map((col, i) => String(row[col.key] ?? '').padEnd(widths[i])).join('  ');
    console.log(line);
  }
};

const printJson = (data: unknown): void => {
  console.log(JSON.stringify(data, null, 2));
};

const printError = (message: string): void => {
  console.error(`Error: ${message}`);
};

const isJson = (cmd: Command): boolean => {
  return cmd.optsWithGlobals().json === true;
};

export type { Column };
export { printTable, printJson, printError, isJson };
