import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const css = fs.readFileSync(path.join(root, 'apps/web/src/index.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'apps/web/src/features/navigation/MinimalAppShell.tsx'), 'utf8');
const search = fs.readFileSync(path.join(root, 'apps/web/src/features/navigation/GeniusGlobalSearch.tsx'), 'utf8');

test('topbar usa coluna central dedicada para a busca global', () => {
  assert.match(css, /\.gso-topbar\s*\{[\s\S]*display:\s*grid;/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*420px\)\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /\.gso-topbar-search\s*\{[\s\S]*min-width:\s*0;[\s\S]*grid-column:\s*2;[\s\S]*width:\s*100%;[\s\S]*justify-self:\s*center;/);
  assert.match(css, /\.gso-topbar-search\s*>\s*\*\s*\{[\s\S]*width:\s*100%;[\s\S]*max-width:\s*420px;/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*\.gso-topbar-search\s*\{\s*display:\s*none;/);
  assert.match(shell, /<GeniusGlobalSearch permissions=\{searchPermissions\}\s*\/>/);
});

test('busca preserva teclado, foco, navegação e filtro por permissão', () => {
  assert.match(search, /\(event\.metaKey\s*\|\|\s*event\.ctrlKey\).*event\.key\.toLowerCase\(\)\s*===\s*'k'/);
  assert.match(search, /if\s*\(event\.key\s*===\s*'Escape'\)\s*setOpen\(false\)/);
  assert.match(search, /requestAnimationFrame\(\(\)\s*=>\s*inputRef\.current\?\.focus\(\)\)/);
  assert.match(search, /navigate\(target\.to\)/);
  assert.match(search, /canOpenSettingsSection|screenKeys\.includes/);
});
