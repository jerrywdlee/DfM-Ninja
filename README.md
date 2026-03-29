# DfM-Ninja

DfM-Ninja is a premium, frontend-only SPA (Single Page Application) designed to assist Dynamics 365 customer support engineers. It provides a clean, fast, and feature-rich interface to manage support cases, format emails, handle metadata, and easily copy-paste templates into the Dynamics 365 environment.

## Overview

The application is built with **React** and **Vite**, using **Tailwind CSS** for styling. It runs entirely in the browser and persists data using **IndexedDB** (with automatic migration from legacy `localStorage`), requiring no backend server. Cases can be backed up in bulk or exported individually as JSON (`MetaData_<caseNum>.json`) via the UI.

It uses a Bookmarklet script (found in `tmp/bookmarklet.js`) injected into the DfM (Dynamics 365) page to extract case metadata and communicate with the DfM-Ninja SPA via `postMessage`.

## Key Features

### 🔍 Full-Text Search (`cmd+p` / `ctrl+p`)
Press **`Cmd+P`** (Mac) or **`Ctrl+P`** (Windows/Linux) to open the global full-text search modal. It searches across **all cases** stored in IndexedDB using **regular expressions**. Results are displayed in an accordion view grouped by case, showing the matching stage and a ±5-character snippet around each hit (matched text is highlighted). Clicking a result navigates directly to that case and stage via URL hash routing (`#caseId=...&stageId=...`).

### 📋 Sidebar Case List
The sidebar search query is **persisted to `localStorage`** across page reloads. When a query is present, the search icon changes to a ❌ clear button that wipes the query with one click. The input expands to fill the available width when active.

### 🥷 Bookmarklet Integration
The Bookmarklet injects a **🥷 button** into the Dynamics 365 case page. Clicking it extracts the case metadata and **automatically focuses an existing DfM-Ninja window** (or opens a new one if none is found), eliminating the need to switch tabs manually.

### 🔰 Variables List Modal
The Variables List modal (opened via the 🔰 button on a stage header) provides:

| Section | Description |
|---|---|
| **Editable Var.** | User-defined variables backed by the current case's top-level data; pre-populated from System Template `variables` definitions. |
| **Dynamic Var.** | Visual builder for date/NC variables (`nextNC_XL`, `Lic_S`, `stageLog_Dot`, etc.) with live preview. |
| **Stage Var.** | Variables extracted from `name="..."` attributes in the active stage's HTML. Empty variables are hidden by default; a 🔽 toggle reveals them (minimum 2 rows shown if all are empty). |
| **Sys Temp.** | Lists all registered System Templates with their ID and title, copyable as `{{templateId}}`. |

Each row has two copy buttons:
- **🧲** — Copies the variable name wrapped in `{{...}}` syntax.
- **📋** — Copies the current resolved value directly.

## Documentation & Templating
 
DfM-Ninja features a robust templating engine that automatically resolves variables like `{{caseNum}}`, `{{nextNC_XL}}`, `{{stageLog}}`, and dynamic email configurations from `settings.yml`. 
 
In addition to standard variable replacement, it supports **EJS (Embedded JavaScript)** for complex logic (e.g., conditional blocks, formatting) within templates using custom `{% %}` and `{%= %}` delimiters.
 
Users can construct custom "Stages" by uploading `.zip` templates containing custom HTML and YAML configuration, mapping natively to the tabbed interface. HTML contents are automatically compressed via `lz-string` to save storage space.
 
Templates have access to a rich EJS context including `settings` (the full YAML config), `isNearHoliday` (a flag indicating whether the current stage's send date falls within 10 days before a major holiday cluster as configured in `settings.Holidays`), and other date helpers.
 
For a full list of rendering variables and how they resolve, please see **[Variables Reference](docs/Variables.md)**.

## Getting Started

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the application at `http://localhost:5178` (or `5179` if 5178 is in use).

> [!NOTE]
> **初回セットアップについて**
>
> `src/utils/bookmarkletCode.js` は **自動生成ファイル** のため `.gitignore` に含まれています。
> `npm run dev` または `npm run build` 実行時に Vite プラグイン (`bookmarkletPlugin`) が自動的に生成します。
>
> 手動で生成したい場合は以下を実行してください：
> ```bash
> npm run build:bookmarklet
> ```
> スクリプトのソースは `src/utils/dfmBookmarklet.js` です。このファイルのみ Git 管理してください。


### Custom Port
You can specify a custom port using the `PORT` environment variable:
```bash
PORT=8888 npm run dev
```
Alternatively, use the Vite flag:
```bash
npm run dev -- --port 8888
```

## ローカル（オフライン）使用について

DfM-Ninja はサーバーなしで `file:///` からも起動できるオフライン版を生成できます。

### ビルド方法

```bash
npm run build:local
```

通常の `npm run build` と違い、以下の処理が追加されます：

1. **相対パスビルド** — Vite の `base="./"` で全アセットのパスを相対化
2. **CDN スクリプトのローカル化** — jQuery / EJS / japanese-holidays を `dist/vendor/` にダウンロードし、`index.html` の参照を書き換え
3. **dist.zip の生成** — `dist/` フォルダ全体を `dist.zip` にパッケージ

生成された `dist.zip` を解凍し、`dist/index.html` をブラウザで直接開いて使用します。

### Edge でのオフライン起動（推奨設定）

`file:///` で IndexedDB や cross-origin 通信が正常に動作するよう、Edge に以下のフラグを追加してください。

**設定方法：**
1. Edge のショートカットを**右クリック ＞ プロパティ**を開く
2. 「リンク先」の末尾に以下を追記：

```
--allow-file-access-from-files --user-data-dir="C:\temp\edge_dev"
```

> [!NOTE]
> `--user-data-dir` には任意のパスを指定できます。このフラグにより、`file:///` 同士の通信制限や IndexedDB の制限が解除され、通常のサーバー環境に近い挙動になります。専用のプロファイルが作成されるため、通常の Edge セッションとは独立して動作します。

> [!WARNING]
> このフラグ付き Edge ウィンドウでは通常のウェブブラウジングを行わないでください。セキュリティポリシーが緩和されているためです。

---

## Deployment & Release

### GitHub Pages (Automatic)
Pushing changes to the `main` branch automatically triggers a GitHub Action that builds and deploys the latest version to:
`https://jerrywdlee.github.io/DfM-Ninja/`

> [!IMPORTANT]
> Ensure **Settings > Pages > Build and deployment > Source** is set to **GitHub Actions**.

### GitHub Releases (Manual/Automated)
To create a formal release with a downloadable `dist.zip` on GitHub:
1. Ensure your `package.json` version is updated.
2. Run the release command:
   ```bash
   npm run release
   ```
This script automatically tags the current commit with the version number (e.g., `v0.5.0`) and pushes it to GitHub, triggering the release workflow.

## Built With
- React 19
- Vite 7
- Tailwind CSS 4
- JS-YAML (for settings & templates parsing)
- JSZip (for template bundle uploads)
- idb-keyval (for robust IndexedDB storage)
- lz-string (for HTML template compression)

## License
MIT License - see the [LICENSE](LICENSE) file for details.
