#!/usr/bin/env node
'use strict';
/**
 * mcp-attach.js
 * ─────────────────────────────────────────────────────────────────
 * Encodes a file to Base64 — ready to paste into the Brioright MCP
 * `add_task_attachment` tool's `fileContent` parameter.
 *
 * Usage:
 *   node scripts/mcp-attach.js <file-path> [--mime <mime-type>]
 *   npm run mcp:attach -- <file-path>
 *
 * Examples:
 *   node scripts/mcp-attach.js implementation_plan.md
 *   node scripts/mcp-attach.js screenshot.png --mime image/png
 *   node scripts/mcp-attach.js report.pdf --mime application/pdf
 * ─────────────────────────────────────────────────────────────────
 */

const { readFileSync } = require('fs');
const { resolve, basename, extname } = require('path');

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: node scripts/mcp-attach.js <file-path> [--mime <mime-type>]

Options:
  --mime    Override the auto-detected MIME type
  --help    Show this help message

Auto-detected MIME types:
  .md .txt  → text/markdown / text/plain
  .png      → image/png
  .jpg/jpeg → image/jpeg
  .pdf      → application/pdf
  .json     → application/json
  .zip      → application/zip
  (others)  → application/octet-stream
`);
    process.exit(0);
}

// ── Parse args ────────────────────────────────────────────────────
const filePath = resolve(args[0]);
const mimeOverrideIdx = args.indexOf('--mime');
const mimeOverride = mimeOverrideIdx !== -1 ? args[mimeOverrideIdx + 1] : null;

// ── Auto-detect MIME ──────────────────────────────────────────────
const MIME_MAP = {
    '.md':   'text/markdown',
    '.txt':  'text/plain',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.pdf':  'application/pdf',
    '.json': 'application/json',
    '.zip':  'application/zip',
    '.csv':  'text/csv',
    '.html': 'text/html',
};

const ext = extname(filePath).toLowerCase();
const mimeType = mimeOverride || MIME_MAP[ext] || 'application/octet-stream';
const fileName = basename(filePath);

// ── Read & encode ─────────────────────────────────────────────────
let fileContent;
try {
    fileContent = readFileSync(filePath).toString('base64');
} catch (err) {
    console.error(`\n❌ Could not read file: ${filePath}`);
    console.error(`   ${err.message}\n`);
    process.exit(1);
}

// ── Output ────────────────────────────────────────────────────────
const SEP = '─'.repeat(60);
console.log(`\n${SEP}`);
console.log(`  fileName   : ${fileName}`);
console.log(`  mimeType   : ${mimeType}`);
console.log(`  size       : ${(fileContent.length * 0.75 / 1024).toFixed(1)} KB`);
console.log(`  preview    : ${fileContent.slice(0, 60)}...`);
console.log(`${SEP}`);
console.log(`\n📋 Full Base64 — copy this as fileContent:\n`);
console.log(fileContent);
console.log();
