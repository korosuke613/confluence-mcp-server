#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { ConfigManager } from "./src/config.ts";
import { ConfluenceService } from "./src/confluence-service.ts";
import { ConfluenceAPIClient } from "./src/confluence-api-client.ts";

// 認証テスト
function testAuthentication(apiClient: ConfluenceAPIClient) {
  console.log("🔐 認証テストを実行中...");

  try {
    // 認証情報の形式をテスト
    const headers = apiClient.getAuthHeaders();
    if (headers.Authorization) {
      console.log("✅ 認証情報の形式は正しいです");
      return true;
    } else {
      console.error("❌ 認証ヘッダーが生成されていません");
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ 認証に失敗しました:", message);
    return false;
  }
}

// 接続テスト
async function testConnection(apiClient: ConfluenceAPIClient) {
  console.log("🌐 接続テストを実行中...");

  try {
    // 最も軽いAPIエンドポイントをテスト
    const response = await fetch(
      `${apiClient.config.baseUrl}/wiki/api/v2/spaces?limit=1`,
      {
        headers: apiClient.getAuthHeaders(),
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
async function testSearch(service: ConfluenceService, query: string) {
  console.log(`🔍 検索テストを実行中: "${query}"`);

  try {
    const results = await service.search(query, 5);
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

  try {
    // 設定読み込み
    const config = ConfigManager.loadConfluenceConfig();
    ConfigManager.validateAndLogConfig(config);
    console.log("");

    // クライアントとサービス初期化
    const apiClient = new ConfluenceAPIClient(config);
    const service = new ConfluenceService(config);

    // テスト実行
    const authOk = testAuthentication(apiClient);
    console.log("");

    if (!authOk) {
      console.log("認証テストが失敗したため、テストを中断します。");
      Deno.exit(1);
    }

    const connectionOk = await testConnection(apiClient);
    console.log("");

    if (!connectionOk) {
      console.log("接続テストが失敗したため、検索テストをスキップします。");
      Deno.exit(1);
    }

    // 検索テスト（コマンドライン引数で指定、デフォルトは"test"）
    const searchQuery = Deno.args[0] || "test";
    await testSearch(service, searchQuery);

    console.log("\n🎉 テスト完了!");
  } catch (error) {
    console.error("❌ テスト実行中にエラーが発生しました:");
    if (error instanceof Error) {
      console.error(error.message);
    }
    ConfigManager.showConfigurationHelp();
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
