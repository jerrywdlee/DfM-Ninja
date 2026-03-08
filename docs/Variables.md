# DfM-Ninja テンプレート変数リファレンス

DfM-Ninja のテンプレートエンジン（`{{変数名}}`）で使用できる変数の一覧です。
変数は `DfmCase.render` 関数によって解決され、以下の優先順位で評価されます。

1. **システムテンプレート**: 登録済みの System Template の ID に一致する場合、そのテンプレートのコンテンツが再帰的に展開されます
2. **特殊な動的変数**: NC日付計算、ライセンス名変換、連絡先フォーマットなどの特殊な変数
3. **アクティブなステップデータ**: 現在開いている Step の固有データ
4. **アクティブなステージデータ**: 現在開いている Stage の固有データ（およびその中の Step 全体の結合データ）
5. **ケースメタデータ**: DfM から抽出された Case 情報 (`Metadata.json` 準拠)
6. **設定YAMLデータ**: `settings.yml` で定義されたトップレベルのプロパティ

---

## 1. ケースメタデータ (Case Info)
DfM から抽出、または JSON から直接新規作成されたケースの基本情報です。

| 変数名 | 説明 | 例 |
|---|---|---|
| `caseTitle` | ケースのタイトル | テスト用のお問い合わせについて |
| `caseNum` | 16桁のケース番号 | 4201180000000042 |
| `assignedTo` | 担当者名 | Demo Agent |
| `internalTitle` | 内部用タイトル | [PTA Pickup] |
| `custStatement` | 顧客の申告内容 | これはテスト用のお問い合わせ… |
| `phoneNum` | 電話番号 | +81-09012345678 |
| `email` | 顧客のメールアドレス | demo.customer@example.com |
| `contactMethod` | 連絡方法 | Email |
| `lastUpdatedAt` | 最終更新日時 | Created on: 9:17 AM |
| `SLA` | SLAステータス（未定義時は"Met"） | Met |
| `servName` | サービス名 | Unified Suppt \| Enterprise Base |
| `severity` | 深刻度 | B |
| `statusReason` | ステータス理由 | Initial contact pending |
| `createdAt` | ケース作成日時 (ISO) | 2026-03-08T... |
| `updatedAt` | 最終更新日時 (ISO) | 2026-03-09T... |
| `resolvedAt` | 解決日時 (null または ISO) | 2026-03-09T... |
| `emailCcList` | （配列として内部保持されるため直接は非推奨） | - |

---

## 2. 動的変数 (Dynamic Variables)

### 日付・NC (Next Contact) 関連
現在のアクティブなステージを基準にして、自動的に日付が計算・フォーマットされます。

*   **ベース変数**:
    *   `prevNC` : 1つ前のステージのNC日
    *   `currentNC`: 現在のステージのNC日（未設定の場合は今日）
    *   `nextNC` : 現在のNC日から**指定日数後**（デフォルトは3営業日。設定や個別調整可能）

*   **フォーマット指定 (Suffix)**: ベース変数にアンダースコア付きのサフィックスを付けて呼び出します。
    *   `_XS`: `MMDD` (例: `0123`)
    *   `_S` : `MM/DD` (例: `01/23`)
    *   `_L` : `MMM-DD` (例: `Jan-23`)
    *   `_XL`: `M 月 D 日（曜日）` (例: `1 月 23 日（金）`)

*   **オフセット指定 (Optional)**: 日付に対して営業日単位で加減算が可能です。
    *   `+N` : N営業日後 (例: `{{nextNC+2}}`)
    *   `-1` : 1営業日前 (例: `{{currentNC-1}}`)
    *   `+0` : 当日（プログラム生成時の正規化用）

**使用例**: `{{nextNC_XL}}`, `{{currentNC+2_S}}`, `{{prevNC-1}}`, `{{nextNC+0_L}}`

### サポートライセンス関連 (Lic)
`servName` に基づいて、「Professional (Pro)」か「Unified / Premier (Pre)」かを自動判定します。（"Professional" や "Office Technical Support" が含まれていれば Pro 扱い）

| 変数名 | Pro の場合の出力 | Pro 以外の場合の出力 |
|---|---|---|
| `{{Lic}}` | Pro | Pre |
| `{{Lic_S}}` | Pro | Pre |
| `{{Lic_L}}` | Pro | Unified |
| `{{Lic_L}}` | Pro | Unified |
| `{{Lic_XL}}`| Professional | Premier |

### クローズ・進捗関連
| 変数名 | 説明 | 例 / 出力 |
|---|---|---|
| `{{closeType_Str}}` | クローズ種別の文字列 | `お客様承認` または `Strike3` |
| `{{closeType_YN}}` | クローズ種別のフラグ | `Y` (承認あり) または `N` (なし) |
| `{{resolutionDays}}`| ケース開始から解決までの日数 | `14` |
| `{{isResolvedWithin14Days_YN}}`| 14日以内に解決したか | `Y` または `N` |

### ステージ履歴関連
| 変数名 | 説明 | 例 |
|---|---|---|
| `{{stageLog}}` | アクティブなステージより「前」の全ステージ履歴を改行区切りで出力します。<br>※現在およびそれ以降のステージは除外されます。 | 02/23 QuickAck<br>02/24 Answer<br>02/25 Answer #2 |
| `{{stageLog_Dot}}` | 各行の冒頭に「・」を付与したステージ履歴を出力します。 | ・02/23 QuickAck<br>・02/24 Answer<br>・02/25 Answer |
| `{{stageLog_Dash}}` | 各行の冒頭に「- 」を付与したステージ履歴を出力します。 | - 02/23 QuickAck<br>- 02/24 Answer<br>- 02/25 Answer |

---

## 3. 設定ファイル (YAML) 関連
`settings.yml` のデータに基づく変数群です。

### 構成情報
| 変数名 | 説明 |
|---|---|
| `TeamName` | チーム名 |
| `CompanyName` | 会社名 |
| `SectionName` | 部署名 |

### 人物・メール連携された特殊変数
Settings の `Editor`, `CoEditors`, `MailList` の設定を組み合わせて、定型文を自動生成します。

| 特殊変数名 | 展開される内容 |
|---|---|
| `nameWithKana` | Editor の名前とカナ (`settings.Editor.nameWithKana`) |
| `familyName` | Editor の苗字 (`settings.Editor.familyName`) |
| `agentEmail` | Editor のメールアドレス (`settings.Editor.email`) |
| `mailTo` | `MailList.to` のリストをカンマ区切りで結合 |
| `mailCc` | `MailList.cc` のリストをカンマ区切りで結合 |
| `dfmCc` | `MailList.ccDfM` のリストをカンマ区切りで結合 |
| `mailToNames` | `MailList.to` に含まれるメールアドレスを `CoEditors` から検索し、「苗字＋さん」形式でカンマ区切りにした文字列 |
| `agentAndLeaders`| `MailList.ccDfM` に含まれるメンバーの役職、フルネーム、内線番号、メールアドレスを改行区切りのリストテキストとして出力 |

---

## 4. 実行時解決 (Active Stage / Step)
UI上で入力・保存された値も変数として利用可能です。
例えば Step UI で `<input name="foobar">` に入力してセーブした場合、`{{foobar}}` として他のテンプレート内で参照できます。

---
 
 ## 6. 高度なレンダリング (EJS サポート)
 
 DfM-Ninja では、従来の `{{ }}` による単純な置換に加えて、**EJS (Embedded JavaScript)** による高度なロジック制御が可能です。
 
 ### デリミタ (区切り文字)
 外側のテンプレートとの競合を避けるため、独自のデリミタを使用します。
 *   **ロジック用**: `{% JavaScriptコード %}`
 *   **出力用**: `{%= JavaScript式 %}`
 
 ### 実行コンテキスト (アクセス可能な変数)
 EJS 評価時、以下のデータがマージされた単一のオブジェクトがコンテキストとして提供されます。そのため、`this.` を付けずに直接変数名で参照可能です。
 
 1.  **Case プロパティ**: `caseNum`, `Lic`, `assignedTo` 等
 2.  **Active Stage プロパティ**: 現在のステージの `name`, `nc` 等
 3.  **Active Stage 内の全 Step の入力値**: `askContent`, `askResult`, `closeType` 等（全ステップの最新保存値がマージされます）
 
 ※ クラスのメソッドや Getter にアクセスしたい場合は、`this` 変数（例: `{%= this.activeStage.name %}`）を使用してください。
 
 ### 使用例
 ```html
 [状況]
 {% if (!!askResult.trim()) { %}
   回答を生成しました。
 {% } else { %}
   調査中 (QuickAck) です。
 {% } %}
 
 [ライセンス]
 {%= Lic === 'Pro' ? 'Professional' : 'Unified' %}
 ```
 
 ---
 
 ## 7. レンダリングの優先順位と流れ
 
 1.  **EJS 評価**: 最初に `{% %}` 部が JavaScript として実行され、テキストが生成されます。
 2.  **Mustache 置換**: EJS 評価後の結果に対して、`{{ }}` 部の置換が実行されます。
     *   システムテンプレートの展開（再帰的）
     *   特殊動的変数の解決
     *   Case/Settings データの埋め込み
