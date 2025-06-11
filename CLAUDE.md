# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) への指針を提供します。

## 重要ルール

- このプロジェクトでは常に日本語で回答してください。
- 新しいルール追加のプロセス
  - ユーザーから今回限りではなく常に対応が必要だと思われる指示を受けた場合、以下の手順に従ってください。
    1. ユーザーからの指示を確認し、必要なルールを特定します。
    2. `CLAUDE.md` ファイルに新しいルールを追加します。
    3. ルールが追加されたことをユーザーに通知します。

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

これは4つの主要ツールを通じてConfluence統合を提供するModel Context Protocol (MCP) サーバーです：
- `confluence_search`: Confluence全体でのコンテンツ検索
- `confluence_get_page`: IDによる特定ページの取得
- `confluence_get_space`: スペース情報の取得
- `confluence_list_pages`: スペース内のページ一覧

### コアコンポーネント

**ConfluenceMCPServer** (`src/index.ts:11`): メインサーバークラス
- `@modelcontextprotocol/sdk`を使用してMCPツールハンドラーを設定
- Confluenceクライアントの初期化と管理
- ツールリクエストの処理とJSON レスポンスの返却
- 起動時の環境変数の検証

**ConfluenceClient** (`src/confluence-client.ts:87`): HTTP クライアントラッパー
- メール/APIトークンを使用したBasic認証の処理
- Confluence Cloud への REST API 呼び出し
- すべてのConfluenceレスポンスの型付きインターフェースを提供
- 検索操作にCQL（Confluence Query Language）を使用

### 環境設定

サーバーは3つの環境変数が必要です：
- `CONFLUENCE_BASE_URL`: Confluenceインスタンスの URL
- `CONFLUENCE_EMAIL`: 認証用のユーザーメール
- `CONFLUENCE_API_TOKEN`: AtlassianアカウントのAPIトークン

### MCP統合

サーバーはstdio転送で通信し、MCPプロトコル標準に従います。Claude DesktopなどのMCPクライアントで使用する際は、クライアント設定で適切なDenoコマンドと権限を指定してください。
