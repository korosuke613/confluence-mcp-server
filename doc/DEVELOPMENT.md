# Development Guide

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

**APIテストの実行:**

```bash
deno task test-api
```

**認証診断の実行:**

```bash
deno task debug-auth
```

**コード品質チェック:**

```bash
deno task preCommit
```

## アーキテクチャ概要

これは6つの主要ツールを通じてConfluence統合を提供するModel Context Protocol
(MCP) サーバーです：

**読み取り機能:**

- `confluence_search`: Confluence全体でのコンテンツ検索
- `confluence_get_page`: IDによる特定ページの取得
- `confluence_get_space`: スペース情報の取得
- `confluence_list_pages`: スペース内のページ一覧

**書き込み機能:**

- `confluence_create_page`: 汎用ページ作成
- `confluence_update_page`: 汎用ページ更新

### コアコンポーネント

**ConfluenceMCPServer** (`src/index.ts:15`): メインサーバークラス

- `@modelcontextprotocol/sdk`を使用してMCPツールハンドラーを設定
- Confluenceサービスの初期化と管理
- ツールリクエストの処理とJSON レスポンスの返却
- 起動時の環境変数の検証
- Read-onlyモードのサポート

**ConfigManager** (`src/config.ts`): 設定管理クラス

- 環境変数の読み込みと検証
- 設定エラー時のヘルプ表示
- 許可スペースの管理

**ConfluenceAPIClient** (`src/confluence-api-client.ts`):
HTTPクライアントラッパー

- メール/APIトークンを使用したBasic認証の処理
- Confluence Cloud への REST API 呼び出し（v1/v2混合）
- すべてのConfluenceレスポンスの型付きインターフェースを提供
- 検索操作にCQL（Confluence Query Language）を使用

**ConfluenceService** (`src/confluence-service.ts`): 高レベル業務ロジック

- ページ作成・更新機能（Confluence Storage Format対応）
- スペースアクセス制限機能
- エラーハンドリングとレスポンス変換

**MCPToolHandlers** (`src/mcp-tool-handlers.ts`): ツールハンドラー

- 各MCPツールの実装
- パラメータ検証と変換
- Confluenceサービスとの連携

### 環境設定

サーバーは以下の環境変数を使用します：

**必須:**

- `CONFLUENCE_BASE_URL`: Confluenceインスタンスの URL
- `CONFLUENCE_EMAIL`: 認証用のユーザーメール
- `CONFLUENCE_API_TOKEN`: AtlassianアカウントのAPIトークン

**オプション:**

- `CONFLUENCE_ALLOWED_SPACES`: アクセス許可スペース（カンマ区切り）
- `CONFLUENCE_READ_ONLY`: 読み取り専用モード（'true' で書き込み機能を無効化）

### MCP統合

サーバーはstdio転送で通信し、MCPプロトコル標準に従います。Claude
DesktopなどのMCPクライアントで使用する際は、クライアント設定で適切なDenoコマンドと権限を指定してください。

## GitHub Actions

### セキュリティガイドライン

**サードパーティアクションのハッシュ固定:**

- `actions/*` 以外のGitHub Actionsはセキュリティのためコミットハッシュで固定する
- バージョンタグではなく、対応するコミットハッシュを使用する
- コメントでバージョン情報を併記する

例:

```yaml
# ❌ バージョンタグ使用（推奨しない）
uses: orhun/git-cliff-action@v3

# ✅ ハッシュ固定（推奨）
uses: orhun/git-cliff-action@4a4a951bc43fafe41cd2348d181853f52356bee7 # v4.4.2
```

これにより、タグの改ざんやアクションの予期しない変更からプロジェクトを保護できます。
