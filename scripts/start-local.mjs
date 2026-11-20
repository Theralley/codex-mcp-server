#!/usr/bin/env node
// Run the local checkout without requiring generated dist files.
import { tsImport } from 'tsx/esm/api';
import { homedir } from 'node:os';
import path from 'node:path';

// GUI clients do not always inherit the user's standalone Codex install path.
process.env.PATH = [path.join(homedir(), '.local', 'bin'), process.env.PATH]
  .filter(Boolean)
  .join(path.delimiter);
await tsImport('../src/index.ts', import.meta.url);
