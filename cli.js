#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const cmd = process.argv[2];
const cmds = {
  canonicalize: ['node', ['core/input.js']],
  'adapt:salla': ['node', ['core/adapter-salla.js']],
  export: ['node', ['core/export.js']]
};

if (!cmd || !cmds[cmd]) {
  console.log('Usage: node cli.js <canonicalize|adapt:salla|export>');
  process.exit(1);
}

const [prog, args] = cmds[cmd];
const res = spawnSync(prog, args, { stdio: 'inherit' });
process.exit(res.status ?? 0);

