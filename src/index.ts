#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ConfigManager } from "./config.ts";
import { ConfluenceService } from "./confluence-service.ts";
import { MCPToolHandlers } from "./mcp-tool-handlers.ts";
import { filterToolsByReadOnlyMode } from "./mcp-tool-schemas.ts";

class ConfluenceMCPServer {
  private server: Server;
  private confluenceService: ConfluenceService | null = null;
  private toolHandlers: MCPToolHandlers | null = null;
  private readOnlyMode: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: "confluence-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      const tools = filterToolsByReadOnlyMode(this.readOnlyMode);
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!this.confluenceService || !this.toolHandlers) {
        throw new Error(
          "Confluence service not initialized. Please set CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN environment variables.",
        );
      }

      return await this.toolHandlers.handleToolCall(name, args || {});
    });
  }

  private initializeServices() {
    try {
      const config = ConfigManager.loadConfluenceConfig();
      this.readOnlyMode = config.readOnly || false;

      ConfigManager.validateAndLogConfig(config);

      this.confluenceService = new ConfluenceService(config);
      this.toolHandlers = new MCPToolHandlers(this.confluenceService);

      console.error("✅ Confluence services initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Confluence services:");
      if (error instanceof Error) {
        console.error(error.message);
      }
      ConfigManager.showConfigurationHelp();
      Deno.exit(1);
    }
  }

  async run() {
    this.initializeServices();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("🚀 Confluence MCP Server running on stdio");
  }
}

if (import.meta.main) {
  const server = new ConfluenceMCPServer();
  await server.run();
}
