# AGENTS.md — DfM-Ninja 開発ガイド

このドキュメントは、AIエージェント（Antigravity 等）がこのリポジトリで作業する際に
常に参照すべき **プロジェクト固有ルール・知識・注意点** をまとめたものです。

---

## プロジェクト概要

**DfM-Ninja** は Dynamics 365 (DfM) のカスタマーサポートエンジニア向けに構築された
**フロントエンドのみの SPA**（Single Page Application）です。

- ケース管理・メールテンプレート生成・LLMプロンプト補助などを担う
- データはすべて **IndexedDB**（`idb-keyval`）に永続化（ localStorage はインデックスと設定のみ）
- サーバーは不要。GitHub Pages 上で稼働、またはオフライン（`file:///`）でも動作する（ただし、オフライン時は一部機能が制限される）
- Bookmarklet 経由で Dynamics 365 ページからケースデータを抽出し、`postMessage` RPC で連携する

---

## 技術スタック

| 分野 | 採用技術 |
|---|---|
| UI フレームワーク | React 19 |
| ビルドツール | Vite 7 |
| スタイリング | **Tailwind CSS 4**（CDN 不使用、`@tailwindcss/vite` プラグイン経由） |
| テンプレート圧縮 | `lz-string`（HTML を localStorage/IndexedDB に格納する際に圧縮） |
| ZIP 処理 | `jszip` |
| YAML パース | `js-yaml` |
| IndexedDB ラッパー | `idb-keyval` |
| テンプレートエンジン | **EJS**（CDN 経由、ブラウザ実行）。デリミタは `{% %}` / `{%= %}` / `{%_ %}` |

---

## ディレクトリ構成

```
DfM-Ninja/
├── src/
│   ├── App.jsx                   # ルートコンポーネント。state 管理・routing・モーダル制御
│   ├── components/               # React コンポーネント群
│   │   ├── Sidebar.jsx           # ケース一覧サイドバー（検索・ツールチップ付き日付バッジ）
│   │   ├── MainContent.jsx       # メインコンテンツ（ステージ・ステップ表示）
│   │   ├── SettingsModal.jsx     # 設定モーダル（YAML設定・テンプレート管理・バックアップ）
│   │   ├── SearchModal.jsx       # 全文検索モーダル（正規表現対応・Cmd+P）
│   │   ├── VariablesModal.jsx    # 変数一覧モーダル（🔰ボタン）
│   │   ├── UpdateModal.jsx       # バージョンアップ通知モーダル
│   │   ├── CaseDateBadge.jsx     # 日付バッジ（ツールチップ付き）
│   │   ├── ToastContainer.jsx    # Toast 通知
│   │   ├── NewCaseModal.jsx      # JSON インポートでケース作成
│   │   └── TemplateModal.jsx     # テンプレート詳細モーダル
│   ├── hooks/
│   │   └── useDfmBridge.js       # DfM ↔ Ninja の postMessage RPC 管理
│   ├── models/
│   │   └── DfmCase.js            # ケースデータモデル（render()・変数解決・日付計算）
│   └── utils/
│       ├── db.js                 # IndexedDB CRUD（getCaseDb / saveCaseDb / deleteCaseDb）
│       ├── dateUtils.js          # 日付計算・NC日計算・祝日判定
│       ├── dfmScripts.js         # DfM ページで実行するスクリプト群（extractCaseData 等）
│       ├── dfmBookmarklet.js     # Bookmarklet ソース（Git 管理対象）
│       └── bookmarkletCode.js    # ⚠️ 自動生成。Git 管理外（.gitignore 済み）
├── templates/                    # バンドル対象テンプレート群
│   ├── MP_Answer/
│   ├── MP_AddAsk/
│   ├── MP_QuickAck/
│   ├── MP_Confirm/
│   ├── MP_Strike1/
│   ├── MP_Strike2/
│   ├── MP_Strike3/
│   └── Settings/
├── scripts/
│   ├── build-templates.js        # templates/ を zip 化（npm run build:templates:bundle）
│   ├── build-local.js            # dist.zip 生成（npm run build:local）
│   ├── build-bookmarklet.js      # Bookmarklet を手動コンパイル
│   └── release.js                # git tag & push でリリース
├── docs/
│   └── Variables.md              # テンプレート変数のリファレンス
└── tmp/
    └── TODOs.md                  # 開発ロードマップ・完了タスク記録（GitHub管理外）
```

---

## 開発コマンド

```bash
npm run dev                      # 開発サーバー起動（デフォルト port: 5178）
npm run build                    # GitHub Pages 向けビルド（/DfM-Ninja/ base）
npm run build:local              # オフライン版 dist.zip 生成
npm run build:templates:bundle   # templates/ を zip 化 → templates.zip（--master フラグ付き）
npm run release                  # git tag を打ち、GitHub にプッシュしてリリース
npm run dev -- --port <PORT>     # カスタムポートで起動
```

> **テンプレートを変更したら必ず `npm run build:templates:bundle` を実行し、**
> **templates.zip を再生成してからリリースすること。**

---

## データフロー・ストレージ設計

### localStorage（軽量インデックスのみ）

| キー | 内容 |
|---|---|
| `dfm_ninja_case_index` | `[{id, title, createdAt, updatedAt, resolvedAt}]` のインデックス配列 |
| `dfm_ninja_settings` | 設定オブジェクト（YAML を JSON パースした結果） |
| `dfm_ninja_raw_yaml` | 生の YAML 設定文字列 |
| `dfm_ninja_templates` | アップロード済みテンプレートの配列（HTML は lz-string 圧縮済み） |
| `dfm_ninja_sys_templates` | システムテンプレートの配列 |
| `dfm_ninja_parent_domain` | Bookmarklet から受け取った親ウィンドウのドメイン |
| `dfm_ninja_app_version` | 最後に確認したアプリバージョン（UpdateModal で使用） |

### IndexedDB（ケースデータ本体）

- キー: `dfm_ninja_case_<caseId>`
- 値: ケースの全データ（`DfmCase.toJSON()` の結果）
- アクセスは `src/utils/db.js` の `getCaseDb` / `saveCaseDb` / `deleteCaseDb` を使うこと

---

## キーアーキテクチャ

### DfmCase モデル（`src/models/DfmCase.js`）

- **`render(templateStr)`**: テンプレート文字列内の `{{変数名}}` と EJS 構文を解決して返す
- **`activeStage`** / **`activeStep`**: 現在アクティブなステージ・ステップへのショートカット
- **`activeStageId`** / **`activeStepId`**: URL ハッシュとステート同期される UI 状態
- ケースデータの保存は非同期で行い、UI ブロッキングを避ける

### URL ハッシュルーティング

```
#caseId=<id>&stageId=<stageId>&stepId=<stepId>
```

- ページ読み込み時・`hashchange` イベントで自動処理
- ステージ遷移はDB に書き込まない（transient、インメモリ操作のみ）
- 全文検索の検索結果クリック時もこのハッシュを使用

### postMessage RPC（`src/hooks/useDfmBridge.js`）

- **Ninja → DfM**: `RPC_REQUEST`（`functionStr` + `args` + `timestamp`）
- **DfM → Ninja**: `RPC_RESPONSE`（`data` / `error` + `timestamp`）
- 接続確認: 30秒ごとに `PING` → `PONG` で接続状態を管理

---

## テンプレートシステム

### テンプレートファイル構成

各テンプレートは `templates/<ID>/` ディレクトリに格納：

```
MP_Answer/
├── conf.yml       # テンプレートメタデータ（id, name, version, steps）
├── step1.html     # LLM連携ステップ
├── step2.html     # 確認メールステップ
└── step3.html     # DfM送信ステップ
```

### `conf.yml` フォーマット

```yaml
id: MP_Answer
name: Answer
version: 0.0.29
description: ""
steps:
    - name: LLM連携
    - name: 確認メール
    - name: DfM送信
```

**テンプレートを修正したら必ずバージョン番号をインクリメントすること。**

### ステップ HTML のパターン

```html
<% const uid=new Date().getTime(); %>
<div id="<TemplateId>_step1-<%=uid%>" class="... relative">

    <!-- Action Buttons（右上に絶対配置） -->
    <div class="absolute top-4 right-6 flex gap-1.5">
        <button title="リセット">🔄</button>
        <button title="レンダリング">⚡️</button>
    </div>

    <!-- 2カラムグリッドレイアウト -->
    <div class="grid grid-cols-2 gap-8 mt-6">
        <!-- 左カラム: Prompt -->
        <!-- 右カラム: 入力フィールド群 -->
    </div>

    <!-- LLM プロンプトテンプレート（<noscript> で隠す） -->
    <noscript data-name="prompt">
        ...プロンプト本文...
        # 入力データ
        {{custStatement}} など
        # 出力フォーマット（独立コードブロック）
    </noscript>

    <!-- メール本文テンプレート -->
    <noscript data-name="emailHead">...</noscript>
    <noscript data-name="emailBody">...</noscript>

    <script>
        (function () {
            const divId = '#<TemplateId>_step1-<%=uid%>';
            const $scope = $(divId);
            // ...state 読み込み・ボタンバインド・auto-save...
        })();
    </script>
</div>
```

### ステップ HTML の重要規則

1. **`uid`** を使って div の ID を一意にすること（複数ステージが同時にマウントされるため）
2. **`const $scope = $(divId)`** でスコープを限定し、他のステージのDOM に干渉しないこと
3. state 読み込みは `window.currentCase?.activeStep` から行う
4. **auto-save** は `$scope.find('textarea, [contenteditable]').on('input blur', ...)` で `caseData.activeStep.<field>` に書き込む
5. `div[contenteditable="true"]` の値読み書きには `.html()` を使う（`.val()` は textarea 用）
6. `.off('click').on('click', ...)` または `.on('click', ...)` でイベントの重複登録を防ぐ
7. `noscript[data-name="prompt"]` の text は `text().trim().replace(/\n +/g, '\n')` でインデント除去する

### LLM プロンプト設計方針（MP_Answer・MP_AddAsk・MP_QuickAck 共通）

- 各出力項目（困った点・回答方針・回答文面）はそれぞれ **独立した単一の ` ```text ``` ` コードブロック** で出力するよう指示する
- 「お客様が困った点」「回答方針」はチーム内レビュー用：**挨拶・前置き不要、簡潔に**のよう指示する
- 入力データセクション（`# 入力データ`）はプロンプトの **末尾** に配置する（ユーザーが貼り付ける箇所を下に置く規約）

### グローバル変数（テンプレートから参照可能）

| 変数 | 内容 |
|---|---|
| `window.currentCase` | アクティブな `DfmCase` インスタンス |
| `window.sysTemplates` | システムテンプレート配列 |
| `window.execDfM(fn)` | DfM ページで関数を実行する RPC |
| `window.showToast(msg, type)` | Toast 表示（`success` / `info` / `warning` / `error`） |
| `window.autoLinkUrls(text)` | テキスト内の URL をリンク化 |

テンプレート内では jQuery（`$`）も利用可能（CDN 経由でロード済み）。

---

## コンポーネント設計ルール

### モーダルコンポーネント

- `isOpen` が `false` のとき `null` を返す（アーリーリターン）
- 背景: `fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50`
- カード: `bg-slate-900 rounded-xl shadow-2xl border border-slate-700`
- ヘッダー: `p-4 border-b border-slate-800 bg-slate-800/50 rounded-t-xl`
- フッター: `p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3 rounded-b-xl`
- プライマリボタン: `bg-orange-600 hover:bg-orange-500 text-white ... active:scale-95`

### Toast 通知

```js
window.showToast('メッセージ', 'success');  // success / info / warning / error
// または
showToast('メッセージ', 'success');  // App.jsx 内部から
```

### 日時表示ルール

- 内部で保管する日時はすべて **ISO 8601 形式**（`new Date().toISOString()`）
- **表示時のみ**ブラウザのローカルタイムゾーンに変換する
- `CaseDateBadge.jsx` を再利用すること（ツールチップ付き）
- 短縮表示は `MM/DD` または `YY.MM.DD` 形式を使用

---

## バージョン管理・リリース手順

1. `package.json` の `version` をインクリメント
2. テンプレートを変更した場合は各 `conf.yml` の `version` もインクリメント
3. `npm run build:templates:bundle` を実行して `templates.zip` を更新
4. `npm run release` で git tag を打ち GitHub にプッシュ
   - GitHub Actions が自動的に GitHub Pages にデプロイ
   - GitHub Releases に `dist.zip` が添付される

---

## UpdateModal（バージョンアップ通知）

`src/components/UpdateModal.jsx` にて `localStorage['dfm_ninja_app_version']` を管理。

| モード | 条件 | 表示内容 |
|---|---|---|
| `welcome` | バージョン未記録 & 設定なし | 👋 新規ユーザー向けウェルカム |
| `upgrade` | バージョン未記録 & 設定あり | 🚀 既存ユーザーへのアップデート案内 |
| `update` | 記録バージョン ≠ 現在バージョン | 🎉 v旧 → v新 の更新通知 |

「OK」ボタンを押すと現在バージョンが localStorage に書き込まれ、次回以降は非表示になる。

---

## よくあるミスと注意点

| ミス | 正しい対応 |
|---|---|
| `div[contenteditable]` で `.val()` を使う | `.html()` を使う。`$el.is('textarea, input')` で分岐する |
| テンプレート修正後にバンドルしない | 必ず `npm run build:templates:bundle` を実行 |
| `conf.yml` のバージョンを更新しない | テンプレート編集時は必ずバージョンインクリメント |
| `$('#global-selector')` でDOMを検索する | `$scope.find(...)` でステージスコープ内に限定する |
| `bookmarkletCode.js` を直接編集する | `dfmBookmarklet.js` を編集し、ビルドで自動生成させる |
| ISO日時をそのまま表示する | `new Date(isoStr).toLocaleString()` 等でローカル変換して表示 |
| `checkForUpdate()` の戻り値を再ラップする | 戻り値は `{previousVersion, mode}` または `null` そのままを state に渡す |

---

## 参考ドキュメント

- [docs/Variables.md](docs/Variables.md) — テンプレートで使える変数の完全リファレンス
- [tmp/TODOs.md](tmp/TODOs.md) — 開発ログ・未完了タスク（GitHub管理外）
- [README.md](README.md) — ユーザー向けセットアップ・デプロイガイド
