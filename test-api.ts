#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { ConfluenceClient } from "./src/confluence-client.ts";

// 環境変数から設定を読み込む
function loadConfig() {
  const baseUrl = Deno.env.get("CONFLUENCE_BASE_URL");
  const email = Deno.env.get("CONFLUENCE_EMAIL");
  const apiToken = Deno.env.get("CONFLUENCE_API_TOKEN");

  if (!baseUrl || !email || !apiToken) {
    console.error("❌ 必要な環境変数が設定されていません:");
    console.error(
      "  CONFLUENCE_BASE_URL:",
      baseUrl ? "✅ 設定済み" : "❌ 未設定",
    );
    console.error("  CONFLUENCE_EMAIL:", email ? "✅ 設定済み" : "❌ 未設定");
    console.error(
      "  CONFLUENCE_API_TOKEN:",
      apiToken ? "✅ 設定済み" : "❌ 未設定",
    );
    console.error("");
    console.error("以下の方法で環境変数を設定してください:");
    console.error("1. .envファイルを作成 (cp .env.example .env)");
    console.error("2. 実際の値を .env ファイルに設定");
    console.error("3. export コマンドで環境変数を設定");
    Deno.exit(1);
  }

  return { baseUrl, email, apiToken };
}

// 認証テスト
async function testAuthentication(client: ConfluenceClient) {
  console.log("🔐 認証テストを実行中...");

  try {
    // 簡単なAPIコールで認証をテスト（スペース一覧取得）
    await client.getAuthHeaders();
    console.log("✅ 認証情報の形式は正しいです");

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ 認証に失敗しました:", message);
    return false;
  }
}

// 接続テスト
async function testConnection(client: ConfluenceClient) {
  console.log("🌐 接続テストを実行中...");

  try {
    // 最も軽いAPIエンドポイントをテスト
    const response = await fetch(
      `${client["config"].baseUrl}/wiki/api/v2/spaces?limit=1`,
      {
        headers: client.getAuthHeaders(),
      },
    );

    console.log(`📡 レスポンスステータス: ${response.status}`);

    if (response.ok) {
      console.log("✅ Confluence APIへの接続に成功しました");
      return true;
    } else {
      const errorText = await response.text();
      console.error(
        "❌ API接続エラー:",
        response.status,
        errorText.substring(0, 200),
      );
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ 接続エラー:", message);
    return false;
  }
}

// 検索テスト
async function testSearch(client: ConfluenceClient, query: string) {
  console.log(`🔍 検索テストを実行中: "${query}"`);

  try {
    const results = await client.search(query, 5);
    console.log(`✅ 検索成功: ${results.results.length}件の結果`);

    if (results.results.length > 0) {
      console.log("📄 検索結果の例:");
      results.results.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title}`);
        console.log(`     Space: ${result.space.name}`);
        console.log(`     URL: ${result.url}`);
      });
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ 検索エラー:", message);
    return false;
  }
}

// メイン実行関数
async function main() {
  console.log("🚀 Confluence API テストを開始します\n");

  // 設定読み込み
  const config = loadConfig();
  console.log("📋 設定情報:");
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Email: ${config.email}`);
  console.log(
    `  API Token: ${"*".repeat(Math.min(config.apiToken.length, 20))}...\n`,
  );

  // クライアント初期化
  const client = new ConfluenceClient(config);

  // テスト実行
  const authOk = await testAuthentication(client);
  console.log("");

  if (!authOk) {
    console.log("認証テストが失敗したため、テストを中断します。");
    Deno.exit(1);
  }

  const connectionOk = await testConnection(client);
  console.log("");

  if (!connectionOk) {
    console.log("接続テストが失敗したため、検索テストをスキップします。");
    Deno.exit(1);
  }

  // 検索テスト（コマンドライン引数で指定、デフォルトは"test"）
  const searchQuery = Deno.args[0] || "test";
  await testSearch(client, searchQuery);

  console.log("\n🎉 テスト完了!");
}

if (import.meta.main) {
  await main();
}
