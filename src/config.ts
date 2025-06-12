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
        "Required environment variables are not set; set CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN.",
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
      }... (${config.apiToken.length} characters)`,
    );

    if (config.allowedSpaces && config.allowedSpaces.length > 0) {
      console.error(`   Allowed Spaces: ${config.allowedSpaces.join(", ")}`);
    } else {
      console.error("   Space Restrictions: None");
    }

    if (
      config.allowedReadParentPages && config.allowedReadParentPages.length > 0
    ) {
      console.error(
        `   Allowed Read Parent Pages: ${config.allowedReadParentPages.join(", ")}`,
      );
    } else {
      console.error("   Allowed Read Parent Pages: None");
    }

    if (
      config.allowedWriteParentPages &&
      config.allowedWriteParentPages.length > 0
    ) {
      console.error(
        `   Allowed Write Parent Pages: ${config.allowedWriteParentPages.join(", ")}`,
      );
    } else {
      console.error("   Allowed Write Parent Pages: None");
    }

    if (config.readOnly) {
      console.error("   Mode: Read-Only");
    } else {
      console.error("   Mode: Read-Write");
    }
  }

  /**
   * 環境変数の設定例を表示
   */
  static showConfigurationHelp(): void {
    console.error("❌ Required environment variables are not set; set the following:");
    console.error("");
    console.error("Required:");
    console.error("- CONFLUENCE_BASE_URL: Confluence instance URL");
    console.error("- CONFLUENCE_EMAIL: Confluence account email");
    console.error("- CONFLUENCE_API_TOKEN: Confluence API token");
    console.error("");
    console.error("Optional:");
    console.error(
      "- CONFLUENCE_ALLOWED_SPACES: Allowed space keys (comma-separated)",
    );
    console.error(
      "- CONFLUENCE_ALLOWED_READ_PARENT_PAGES: Allowed read parent page IDs (comma-separated)",
    );
    console.error(
      "- CONFLUENCE_ALLOWED_WRITE_PARENT_PAGES: Allowed write parent page IDs (comma-separated)",
    );
    console.error(
      "- CONFLUENCE_READ_ONLY: Read-only mode (enabled if 'true')",
    );
    console.error("");
    console.error("Example configuration:");
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
