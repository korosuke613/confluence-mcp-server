#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ConfluenceClient } from "./confluence-client.ts";

class ConfluenceMCPServer {
  private server: Server;
  private confluenceClient: ConfluenceClient | null = null;

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
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "confluence_search",
            description: "Search for content in Confluence",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query string",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of results to return (default: 10)",
                  default: 10,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "confluence_get_page",
            description: "Get a specific Confluence page by ID",
            inputSchema: {
              type: "object",
              properties: {
                pageId: {
                  type: "string",
                  description: "Confluence page ID",
                },
                expand: {
                  type: "string",
                  description: "Comma-separated list of properties to expand (e.g., 'body.storage,version')",
                  default: "body.storage,version",
                },
              },
              required: ["pageId"],
            },
          },
          {
            name: "confluence_get_space",
            description: "Get information about a Confluence space",
            inputSchema: {
              type: "object",
              properties: {
                spaceKey: {
                  type: "string",
                  description: "Confluence space key",
                },
              },
              required: ["spaceKey"],
            },
          },
          {
            name: "confluence_list_pages",
            description: "List pages in a Confluence space",
            inputSchema: {
              type: "object",
              properties: {
                spaceKey: {
                  type: "string",
                  description: "Confluence space key",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of pages to return (default: 25)",
                  default: 25,
                },
              },
              required: ["spaceKey"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!this.confluenceClient) {
        throw new Error("Confluence client not initialized. Please set CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN environment variables.");
      }

      if (!args) {
        throw new Error("Arguments are required");
      }

      try {
        switch (name) {
          case "confluence_search":
            const searchResults = await this.confluenceClient.search(
              args.query as string, 
              (args.limit as number) || 10
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(searchResults, null, 2),
                },
              ],
            };

          case "confluence_get_page":
            const page = await this.confluenceClient.getPage(
              args.pageId as string, 
              (args.expand as string) || "body.storage,version"
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(page, null, 2),
                },
              ],
            };

          case "confluence_get_space":
            const space = await this.confluenceClient.getSpace(args.spaceKey as string);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(space, null, 2),
                },
              ],
            };

          case "confluence_list_pages":
            const pages = await this.confluenceClient.listPages(
              args.spaceKey as string, 
              (args.limit as number) || 25
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(pages, null, 2),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Error executing ${name}: ${message}`);
      }
    });
  }

  private initializeConfluenceClient() {
    const baseUrl = Deno.env.get("CONFLUENCE_BASE_URL");
    const email = Deno.env.get("CONFLUENCE_EMAIL");
    const apiToken = Deno.env.get("CONFLUENCE_API_TOKEN");
    const allowedSpacesEnv = Deno.env.get("CONFLUENCE_ALLOWED_SPACES");

    if (!baseUrl || !email || !apiToken) {
      console.error("Missing required environment variables:");
      console.error("- CONFLUENCE_BASE_URL: Your Confluence instance URL");
      console.error("- CONFLUENCE_EMAIL: Your Confluence account email");
      console.error("- CONFLUENCE_API_TOKEN: Your Confluence API token");
      console.error("Optional:");
      console.error("- CONFLUENCE_ALLOWED_SPACES: Comma-separated list of allowed space keys");
      Deno.exit(1);
    }

    // スペース制限の解析
    const allowedSpaces = allowedSpacesEnv 
      ? allowedSpacesEnv.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : undefined;

    if (allowedSpaces && allowedSpaces.length > 0) {
      console.error(`Space access restricted to: ${allowedSpaces.join(', ')}`);
    } else {
      console.error("No space restrictions applied");
    }

    this.confluenceClient = new ConfluenceClient({
      baseUrl,
      email,
      apiToken,
      allowedSpaces,
    });
  }

  async run() {
    this.initializeConfluenceClient();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("Confluence MCP Server running on stdio");
  }
}

if (import.meta.main) {
  const server = new ConfluenceMCPServer();
  await server.run();
}