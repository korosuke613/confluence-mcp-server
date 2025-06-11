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

  private generateTaskPageContent(
    taskDescription: string,
    objectives: string[],
    progress: string
  ): string {
    const currentDate = new Date().toLocaleString("ja-JP");
    
    return `<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p><strong>作成日時:</strong> ${currentDate}</p>
    <p><strong>ステータス:</strong> ${progress}</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>タスク概要</h2>
<p>${taskDescription}</p>

<h2>目標・目的</h2>
<ul>
${objectives.map(obj => `  <li>${obj}</li>`).join('\n')}
</ul>

<h2>進捗状況</h2>
<p><strong>現在のステータス:</strong> ${progress}</p>

<h2>実施内容・発見事項</h2>
<ul>
  <li>（ここに実施内容や発見事項を追記していきます）</li>
</ul>

<h2>次のアクション</h2>
<ul>
  <li>（ここに次のステップを記載していきます）</li>
</ul>

<h2>意思決定ログ</h2>
<table>
  <tbody>
    <tr>
      <th>日時</th>
      <th>決定事項</th>
      <th>理由</th>
    </tr>
    <tr>
      <td>${currentDate}</td>
      <td>タスク開始</td>
      <td>-</td>
    </tr>
  </tbody>
</table>`;
  }

  private updateTaskPageContent(
    existingContent: string,
    newProgress: string,
    newFindings: string[],
    nextSteps: string[]
  ): string {
    const currentDate = new Date().toLocaleString("ja-JP");
    let updatedContent = existingContent;

    // ステータス更新
    updatedContent = updatedContent.replace(
      /<p><strong>ステータス:<\/strong>[^<]*<\/p>/,
      `<p><strong>ステータス:</strong> ${newProgress}</p>`
    );

    // 新しい発見事項を追加
    if (newFindings.length > 0) {
      const findingsHtml = newFindings.map(finding => `  <li>${finding} (${currentDate})</li>`).join('\n');
      updatedContent = updatedContent.replace(
        /<h2>実施内容・発見事項<\/h2>\s*<ul>/,
        `<h2>実施内容・発見事項</h2>\n<ul>\n${findingsHtml}`
      );
    }

    // 次のステップを更新
    if (nextSteps.length > 0) {
      const nextStepsHtml = nextSteps.map(step => `  <li>${step}</li>`).join('\n');
      updatedContent = updatedContent.replace(
        /<h2>次のアクション<\/h2>\s*<ul>[\s\S]*?<\/ul>/,
        `<h2>次のアクション</h2>\n<ul>\n${nextStepsHtml}\n</ul>`
      );
    }

    // 意思決定ログにエントリ追加
    const newLogEntry = `    <tr>
      <td>${currentDate}</td>
      <td>進捗更新: ${newProgress}</td>
      <td>${newFindings.length > 0 ? '新しい発見事項を追加' : '進捗状況の更新'}</td>
    </tr>`;
    
    updatedContent = updatedContent.replace(
      /<\/tbody>\s*<\/table>/,
      `${newLogEntry}\n  </tbody>\n</table>`
    );

    return updatedContent;
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
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
          {
            name: "confluence_create_task_page",
            description: "Create a new Confluence page for task tracking with structured content",
            inputSchema: {
              type: "object",
              properties: {
                spaceKey: {
                  type: "string",
                  description: "Confluence space key",
                },
                title: {
                  type: "string",
                  description: "Page title",
                },
                taskDescription: {
                  type: "string",
                  description: "Description of the task or project",
                },
                objectives: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of objectives or goals",
                },
                progress: {
                  type: "string",
                  description: "Current progress status",
                  default: "開始",
                },
                parentPageId: {
                  type: "string",
                  description: "Parent page ID (optional)",
                },
              },
              required: ["spaceKey", "title", "taskDescription"],
            },
          },
          {
            name: "confluence_update_task_progress",
            description: "Update task progress and add new decisions or findings to an existing page",
            inputSchema: {
              type: "object",
              properties: {
                pageId: {
                  type: "string",
                  description: "Page ID to update",
                },
                progress: {
                  type: "string",
                  description: "Updated progress status",
                },
                newFindings: {
                  type: "array",
                  items: { type: "string" },
                  description: "New findings or decisions to add",
                },
                nextSteps: {
                  type: "array",
                  items: { type: "string" },
                  description: "Next steps or action items",
                },
              },
              required: ["pageId", "progress"],
            },
          },
          {
            name: "confluence_create_page",
            description: "Create a new Confluence page with custom content",
            inputSchema: {
              type: "object",
              properties: {
                spaceKey: {
                  type: "string",
                  description: "Confluence space key",
                },
                title: {
                  type: "string",
                  description: "Page title",
                },
                content: {
                  type: "string",
                  description: "Page content in Confluence storage format or simple HTML",
                },
                parentPageId: {
                  type: "string",
                  description: "Parent page ID (optional)",
                },
              },
              required: ["spaceKey", "title", "content"],
            },
          },
          {
            name: "confluence_update_page",
            description: "Update an existing Confluence page",
            inputSchema: {
              type: "object",
              properties: {
                pageId: {
                  type: "string",
                  description: "Page ID to update",
                },
                title: {
                  type: "string",
                  description: "Updated page title",
                },
                content: {
                  type: "string",
                  description: "Updated page content in Confluence storage format or simple HTML",
                },
              },
              required: ["pageId", "title", "content"],
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
          case "confluence_search": {
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
          }

          case "confluence_get_page": {
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
          }

          case "confluence_get_space": {
            const space = await this.confluenceClient.getSpace(args.spaceKey as string);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(space, null, 2),
                },
              ],
            };
          }

          case "confluence_list_pages": {
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
          }

          case "confluence_create_task_page": {
            const content = this.generateTaskPageContent(
              args.taskDescription as string,
              args.objectives as string[] || [],
              args.progress as string || "開始"
            );
            
            const page = await this.confluenceClient.createPage(
              args.spaceKey as string,
              args.title as string,
              content,
              args.parentPageId as string
            );
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ success: true, pageId: page.id, url: page._links?.webui }, null, 2),
                },
              ],
            };
          }

          case "confluence_update_task_progress": {
            const existingPage = await this.confluenceClient.getPage(args.pageId as string, "body.storage,version");
            const updatedContent = this.updateTaskPageContent(
              existingPage.body?.storage?.value || "",
              args.progress as string,
              args.newFindings as string[] || [],
              args.nextSteps as string[] || []
            );
            
            const updatedPage = await this.confluenceClient.updatePage(
              args.pageId as string,
              existingPage.title,
              updatedContent
            );
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ success: true, pageId: updatedPage.id, version: updatedPage.version?.number }, null, 2),
                },
              ],
            };
          }

          case "confluence_create_page": {
            const page = await this.confluenceClient.createPage(
              args.spaceKey as string,
              args.title as string,
              args.content as string,
              args.parentPageId as string
            );
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ success: true, pageId: page.id, url: page._links?.webui }, null, 2),
                },
              ],
            };
          }

          case "confluence_update_page": {
            const updatedPage = await this.confluenceClient.updatePage(
              args.pageId as string,
              args.title as string,
              args.content as string
            );
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ success: true, pageId: updatedPage.id, version: updatedPage.version?.number }, null, 2),
                },
              ],
            };
          }

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