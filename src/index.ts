#!/usr/bin/env node

import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { CodexMcpServer } from './server.js';

const SERVER_CONFIG = {
  name: 'codex-mcp-server',
  version: (
    JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ) as { version: string }
  ).version,
} as const;

async function main(): Promise<void> {
  try {
    const server = new CodexMcpServer(SERVER_CONFIG);
    await server.start();
  } catch (error) {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  }
}

main();
