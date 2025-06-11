import type { ConfluenceConfig } from "./types.ts";

export class ConfigManager {
  /**
   * 環境変数からConfluence設定を読み込み
   */
  static loadConfluenceConfig(): ConfluenceConfig {
    const baseUrl = Deno.env.get("CONFLUENCE_BASE_URL");
    const email = Deno.env.get("CONFLUENCE_EMAIL");
    const apiToken = Deno.env.get("CONFLUENCE_API_TOKEN");
    const allowedSpacesEnv = Deno.env.get("CONFLUENCE_ALLOWED_SPACES");
    const readOnlyEnv = Deno.env.get("CONFLUENCE_READ_ONLY");
    const allowedReadParentPagesEnv = Deno.env.get(
      "CONFLUENCE_ALLOWED_PARENT_READ_PAGES",
    );
    const allowedWriteParentPagesEnv = Deno.env.get(
      "CONFLUENCE_ALLOWED_PARENT_WRITE_PAGES",
    );

    if (!baseUrl || !email || !apiToken) {
      throw new Error(
        "必須の環境変数が設定されていません。CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN を設定してください。",
      );
    }

    // スペース制限の解析
    const allowedSpaces = allowedSpacesEnv
      ? allowedSpacesEnv.split(",").map((s) => s.trim()).filter((s) =>
        s.length > 0
      )
      : undefined;

    // ページ階層制限の解析
    const allowedReadParentPages = allowedReadParentPagesEnv
      ? allowedReadParentPagesEnv.split(",").map((s) => s.trim()).filter((s) =>
        s.length > 0
      )
      : undefined;

    const allowedWriteParentPages = allowedWriteParentPagesEnv
      ? allowedWriteParentPagesEnv.split(",").map((s) => s.trim()).filter((s) =>
        s.length > 0
      )
      : undefined;

    // read-onlyモードの設定
    const readOnly = readOnlyEnv === "true";

    return {
      baseUrl,
      email,
      apiToken,
      allowedSpaces,
      readOnly,
      allowedReadParentPages,
      allowedWriteParentPages,
    };
  }

  /**
   * 設定を検証し、コンソールに出力
   */
  static validateAndLogConfig(config: ConfluenceConfig): void {
    console.error("📋 Confluence MCP Server 設定:");
    console.error(`   Base URL: ${config.baseUrl}`);
    console.error(`   Email: ${config.email}`);
    console.error(
      `   API Token: ${
        config.apiToken.substring(0, 8)
      }... (${config.apiToken.length} 文字)`,
    );

    if (config.allowedSpaces && config.allowedSpaces.length > 0) {
      console.error(`   許可スペース: ${config.allowedSpaces.join(", ")}`);
    } else {
      console.error("   スペース制限: なし");
    }

    if (
      config.allowedReadParentPages && config.allowedReadParentPages.length > 0
    ) {
      console.error(
        `   読み取り許可親ページ: ${config.allowedReadParentPages.join(", ")}`,
      );
    } else {
      console.error("   読み取り親ページ制限: なし");
    }

    if (
      config.allowedWriteParentPages &&
      config.allowedWriteParentPages.length > 0
    ) {
      console.error(
        `   書き込み許可親ページ: ${config.allowedWriteParentPages.join(", ")}`,
      );
    } else {
      console.error("   書き込み親ページ制限: なし");
    }

    if (config.readOnly) {
      console.error("   モード: 読み取り専用");
    } else {
      console.error("   モード: 読み書き可能");
    }
  }

  /**
   * 環境変数の設定例を表示
   */
  static showConfigurationHelp(): void {
    console.error("❌ 環境変数が不足しています。以下の設定が必要です:");
    console.error("");
    console.error("必須:");
    console.error("- CONFLUENCE_BASE_URL: Confluence インスタンスの URL");
    console.error("- CONFLUENCE_EMAIL: Confluence アカウントのメール");
    console.error("- CONFLUENCE_API_TOKEN: Confluence API トークン");
    console.error("");
    console.error("オプション:");
    console.error(
      "- CONFLUENCE_ALLOWED_SPACES: 許可するスペースキー（カンマ区切り）",
    );
    console.error(
      "- CONFLUENCE_ALLOWED_READ_PARENT_PAGES: 読み取り許可ページID（カンマ区切り）",
    );
    console.error(
      "- CONFLUENCE_ALLOWED_WRITE_PARENT_PAGES: 書き込み許可ページID（カンマ区切り）",
    );
    console.error(
      "- CONFLUENCE_READ_ONLY: 読み取り専用モード（'true' で有効）",
    );
    console.error("");
    console.error("設定例:");
    console.error(
      'export CONFLUENCE_BASE_URL="https://your-domain.atlassian.net"',
    );
    console.error('export CONFLUENCE_EMAIL="your-email@example.com"');
    console.error('export CONFLUENCE_API_TOKEN="your-api-token"');
    console.error('export CONFLUENCE_ALLOWED_SPACES="TEAM,PROJECT"');
    console.error('export CONFLUENCE_ALLOWED_READ_PAGES="12345,67890"');
    console.error('export CONFLUENCE_ALLOWED_WRITE_PAGES="12345"');
    console.error('export CONFLUENCE_READ_ONLY="false"');
  }
}
