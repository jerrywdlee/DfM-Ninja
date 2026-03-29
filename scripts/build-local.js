/**
 * build-local.js
 * ローカル（file:///）対応のオフライン版 dist を生成します。
 * 
 * やること:
 *   1. vite build を base='./' で実行（相対パス）
 *   2. CDN スクリプトをダウンロードして dist/vendor/ に保存
 *   3. dist/index.html の CDN 参照を ./vendor/xxx.js に書き換え
 *   4. dist.zip を生成
 * 
 * 通常の build / dev / GitHub Pages には影響しません。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const vendorDir = join(distDir, 'vendor');

// ── CDN → ローカルファイル名のマッピング ──────────────────────────────────
const CDN_SCRIPTS = [
  {
    url: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
    filename: 'jquery.min.js',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/ejs@3.1.10/ejs.min.js',
    filename: 'ejs.min.js',
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/osamutake/japanese-holidays-js@v1.0.10/lib/japanese-holidays.min.js',
    filename: 'japanese-holidays.min.js',
  },
];

// ── ユーティリティ: HTTP/HTTPS ダウンロード ──────────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = { data: [] };
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.on('data', (chunk) => file.data.push(chunk));
      res.on('end', () => {
        writeFileSync(destPath, Buffer.concat(file.data));
        resolve();
      });
    });
    req.on('error', reject);
  });
}

// ── メイン処理 ────────────────────────────────────────────────────────────
async function main() {
  console.log('🏗️  Building local (offline) version...');

  // 1. vite build with base='./'
  console.log('📦 Running vite build with base="./"...');
  execSync('npx vite build --base="./"', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VITE_LOCAL_BUILD: '1' },
  });

  // 2. Download CDN scripts → dist/vendor/
  console.log('⬇️  Downloading CDN scripts to dist/vendor/...');
  if (!existsSync(vendorDir)) mkdirSync(vendorDir, { recursive: true });

  for (const { url, filename } of CDN_SCRIPTS) {
    const dest = join(vendorDir, filename);
    process.stdout.write(`   ${filename} ... `);
    await downloadFile(url, dest);
    console.log('✅');
  }

  // 3. Rewrite index.html: replace CDN URLs → ./vendor/xxx.js
  console.log('✏️  Patching dist/index.html...');
  const indexPath = join(distDir, 'index.html');
  let html = readFileSync(indexPath, 'utf-8');

  for (const { url, filename } of CDN_SCRIPTS) {
    html = html.replace(url, `./vendor/${filename}`);
  }

  // Also fix the favicon path if it uses absolute /vite.svg
  html = html.replace(/href="\/vite\.svg"/, 'href="./vite.svg"');

  writeFileSync(indexPath, html, 'utf-8');
  console.log('   dist/index.html patched.');

  // 4. Generate dist.zip
  console.log('📁 Generating dist.zip...');
  const zipPath = join(root, 'dist.zip');
  // Remove existing zip if present
  try { execSync(`rm -f "${zipPath}"`); } catch (e) { /* ignore */ }
  execSync(`cd "${root}" && zip -r dist.zip dist`, { stdio: 'inherit' });
  console.log(`✅ dist.zip created at: ${zipPath}`);
  console.log('');
  console.log('🎉 Local build complete!');
  console.log('   Extract dist.zip and open dist/index.html in Edge with:');
  console.log('   --allow-file-access-from-files --user-data-dir="C:\\temp\\edge_dev"');
}

main().catch((err) => {
  console.error('❌ Local build failed:', err);
  process.exit(1);
});
