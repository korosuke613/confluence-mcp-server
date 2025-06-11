# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)
への指針を提供します。

## 重要ルール

- **重要**: このプロジェクトでは常に日本語で回答してください。
- **重要**: 新しいルールを CLAUDE.md に追加
  - ユーザーからの今回限りではなく常に対応が必要だと思われる指示を受けた場合、以下の手順に従ってください。
    1. ユーザーからの指示を確認し、必要なルールを特定します。
    2. `CLAUDE.md` ファイルに新しいルールを追加します。
    3. ルールが追加されたことをユーザーに通知します。

## 開発ルール

- コードが完成したらdeno lint, deno check, deno fmtで品質をチェックする
- コミットするたびにコンフルエンスの進捗ページを追加、もしくは、本日分の進捗ページがあれば追記修正すること
- 外部仕様が変更された場合、コンフルエンスの仕様書ページ（id: `65690` ）を更新する

## 開発コマンド

**サーバーの起動:**

```bash
deno task start
```

**開発モード（ファイル監視付き）:**

```bash
deno task dev
```

**基本テストの実行:**

```bash
deno run --allow-net --allow-env --allow-read test.ts
```

## アーキテクチャ概要

これは8つの主要ツールを通じてConfluence統合を提供するModel Context Protocol
(MCP) サーバーです：

**読み取り機能:**

- `confluence_search`: Confluence全体でのコンテンツ検索
- `confluence_get_page`: IDによる特定ページの取得
- `confluence_get_space`: スペース情報の取得
- `confluence_list_pages`: スペース内のページ一覧

**書き込み機能:**

- `confluence_create_task_page`: タスク管理用の構造化ページ作成
- `confluence_update_task_progress`: タスク進捗・発見事項の更新
- `confluence_create_page`: 汎用ページ作成
- `confluence_update_page`: 汎用ページ更新

### コアコンポーネント

**ConfluenceMCPServer** (`src/index.ts:11`): メインサーバークラス

- `@modelcontextprotocol/sdk`を使用してMCPツールハンドラーを設定
- Confluenceクライアントの初期化と管理
- ツールリクエストの処理とJSON レスポンスの返却
- 起動時の環境変数の検証

**ConfluenceClient** (`src/confluence-client.ts:87`): HTTP クライアントラッパー

- メール/APIトークンを使用したBasic認証の処理
- Confluence Cloud への REST API 呼び出し（v1/v2混合）
- すべてのConfluenceレスポンスの型付きインターフェースを提供
- 検索操作にCQL（Confluence Query Language）を使用
- ページ作成・更新機能（Confluence Storage Format対応）
- スペースアクセス制限機能

### 環境設定

サーバーは以下の環境変数を使用します：

**必須:**

- `CONFLUENCE_BASE_URL`: Confluenceインスタンスの URL
- `CONFLUENCE_EMAIL`: 認証用のユーザーメール
- `CONFLUENCE_API_TOKEN`: AtlassianアカウントのAPIトークン

**オプション:**

- `CONFLUENCE_ALLOWED_SPACES`: アクセス許可スペース（カンマ区切り）

### Confluence進捗管理

**ページ構造:**

```
概要 (ID: 131182) - ホームページ
└── Confluence MCP Server の開発 (ID: 131187)
    ├── Confluence MCP Server 仕様書 (ID: 65690)
    └── 進捗 [Confluence MCP Server] (ID: 262145) ← 進捗ページの親
        └── Confluence MCP Server 開発状況 - 2025年6月11日 (ID: 98331)
```

**進捗ページ作成ルール:**

- 進捗ページは「進捗 [Confluence MCP Server]」(ID: 262145) の下に配置
- 日付別のページタイトル形式: `Confluence MCP Server 開発状況 - YYYY年M月D日`
- 本日分の進捗ページが既に存在する場合は、`confluence_update_task_progress`
  で更新
- 新しい日の場合は、`confluence_create_task_page` で新規作成（親ページID:
  262145）

**スペース情報:**

- スペースキー: `~55705871b95d105a43472fa662f76cf8b0c09d`
- 進捗ページの親ID: `262145`

### MCP統合

サーバーはstdio転送で通信し、MCPプロトコル標準に従います。Claude
DesktopなどのMCPクライアントで使用する際は、クライアント設定で適切なDenoコマンドと権限を指定してください。
