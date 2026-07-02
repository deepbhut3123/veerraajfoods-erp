'use strict';

const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-dev-utils',
  'checkRequiredFiles.js'
);

const deprecatedCode = 'fs.accessSync(filePath, fs.F_OK);';
const fixedCode = 'fs.accessSync(filePath, fs.constants.F_OK);';

if (!fs.existsSync(targetFile)) {
  console.warn(`[postinstall] Skipped patch; file not found: ${targetFile}`);
  process.exit(0);
}

const source = fs.readFileSync(targetFile, 'utf8');

if (source.includes(fixedCode)) {
  console.log('[postinstall] react-dev-utils is already patched.');
  process.exit(0);
}

if (!source.includes(deprecatedCode)) {
  console.warn('[postinstall] Skipped patch; expected code was not found.');
  process.exit(0);
}

fs.writeFileSync(targetFile, source.replace(deprecatedCode, fixedCode), 'utf8');
console.log('[postinstall] Patched react-dev-utils to use fs.constants.F_OK.');
