// Aplica a versão da tag nos arquivos de build (sem commit de volta: a tag é a fonte da versão).
import { readFileSync, writeFileSync } from 'node:fs';
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v ?? '')) throw new Error('uso: set-version.mjs X.Y.Z');
const edit = (f, fn) => writeFileSync(f, fn(readFileSync(f, 'utf8')));
edit('package.json', (s) => s.replace(/"version": "[^"]+"/, `"version": "${v}"`));
edit('src-tauri/tauri.conf.json', (s) => s.replace(/"version": "[^"]+"/, `"version": "${v}"`));
edit('src-tauri/Cargo.toml', (s) => s.replace(/^version = "[^"]+"/m, `version = "${v}"`));
