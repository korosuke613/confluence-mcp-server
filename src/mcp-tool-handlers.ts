import type { CreatePageResult, UpdatePageResult } from "./types.ts";
import { TaskContentGenerator } from "./task-content-generator.ts";
import type { ConfluenceService } from "./confluence-service.ts";

export class MCPToolHandlers {
  constructor(private confluenceService: ConfluenceService) {}

  async handleSearchTool(args: Record<string, unknown>) {
    const searchResults = await this.confluenceService.search(
      args.query as string,
      (args.limit as number) || 10,
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

  async handleGetPageTool(args: Record<string, unknown>) {
    const page = await this.confluenceService.getPage(
      args.pageId as string,
      (args.expand as string) || "body.storage,version",
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

  async handleGetSpaceTool(args: Record<string, unknown>) {
    const space = await this.confluenceService.getSpace(
      args.spaceKey as string,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(space, null, 2),
        },
      ],
    };
  }

  async handleListPagesTool(args: Record<string, unknown>) {
    const pages = await this.confluenceService.listPages(
      args.spaceKey as string,
      (args.limit as number) || 25,
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

  async handleCreateTaskPageTool(args: Record<string, unknown>) {
    const content = TaskContentGenerator.generateTaskPageContent({
      taskDescription: args.taskDescription as string,
      objectives: (args.objectives as string[]) || [],
      progress: (args.progress as string) || "開始",
    });

    const page = await this.confluenceService.createPage(
      args.spaceKey as string,
      args.title as string,
      content,
      args.parentPageId as string,
    );

    const result: CreatePageResult = {
      success: true,
      pageId: page.id,
      url: page._links?.webui,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleUpdateTaskProgressTool(args: Record<string, unknown>) {
    const existingPage = await this.confluenceService.getPage(
      args.pageId as string,
      "body.storage,version",
    );
    const updatedContent = TaskContentGenerator.updateTaskPageContent(
      existingPage.body?.storage?.value || "",
      {
        progress: args.progress as string,
        newFindings: (args.newFindings as string[]) || [],
        nextSteps: (args.nextSteps as string[]) || [],
      },
    );

    const updatedPage = await this.confluenceService.updatePage(
      args.pageId as string,
      existingPage.title,
      updatedContent,
    );

    const result: UpdatePageResult = {
      success: true,
      pageId: updatedPage.id,
      version: updatedPage.version?.number,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleCreatePageTool(args: Record<string, unknown>) {
    const page = await this.confluenceService.createPage(
      args.spaceKey as string,
      args.title as string,
      args.content as string,
      args.parentPageId as string,
    );

    const result: CreatePageResult = {
      success: true,
      pageId: page.id,
      url: page._links?.webui,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleUpdatePageTool(args: Record<string, unknown>) {
    const updatedPage = await this.confluenceService.updatePage(
      args.pageId as string,
      args.title as string,
      args.content as string,
    );

    const result: UpdatePageResult = {
      success: true,
      pageId: updatedPage.id,
      version: updatedPage.version?.number,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleFindOrCreateParentTool(args: Record<string, unknown>) {
    const parentPageId = await this.confluenceService.findOrCreateParentPage(
      args.spaceKey as string,
      args.parentTitle as string,
      args.parentContent as string,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, parentPageId }, null, 2),
        },
      ],
    };
  }

  async handleManageTodaysProgressTool(args: Record<string, unknown>) {
    const result = await this.confluenceService.findOrCreateTodaysProgressPage(
      args.spaceKey as string,
      args.progressParentId as string,
    );

    // 更新情報がある場合は進捗を更新
    if (args.newFindings || args.nextSteps || args.progress) {
      const existingPage = await this.confluenceService.getPage(
        result.pageId,
        "body.storage,version",
      );
      const updatedContent = TaskContentGenerator.updateTaskPageContent(
        existingPage.body?.storage?.value || "",
        {
          progress: (args.progress as string) || "進行中",
          newFindings: (args.newFindings as string[]) || [],
          nextSteps: (args.nextSteps as string[]) || [],
        },
      );

      await this.confluenceService.updatePage(
        result.pageId,
        existingPage.title,
        updatedContent,
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              pageId: result.pageId,
              isNew: result.isNew,
              updated: !!(args.newFindings || args.nextSteps || args.progress),
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  async handleToolCall(name: string, args: Record<string, unknown>) {
    if (!args) {
      throw new Error("Arguments are required");
    }

    try {
      switch (name) {
        case "confluence_search":
          return await this.handleSearchTool(args);

        case "confluence_get_page":
          return await this.handleGetPageTool(args);

        case "confluence_get_space":
          return await this.handleGetSpaceTool(args);

        case "confluence_list_pages":
          return await this.handleListPagesTool(args);

        case "confluence_create_task_page":
          return await this.handleCreateTaskPageTool(args);

        case "confluence_update_task_progress":
          return await this.handleUpdateTaskProgressTool(args);

        case "confluence_create_page":
          return await this.handleCreatePageTool(args);

        case "confluence_update_page":
          return await this.handleUpdatePageTool(args);

        case "confluence_find_or_create_parent":
          return await this.handleFindOrCreateParentTool(args);

        case "confluence_manage_todays_progress":
          return await this.handleManageTodaysProgressTool(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error executing ${name}: ${message}`);
    }
  }
}
