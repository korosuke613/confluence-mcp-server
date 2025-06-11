export const CONFLUENCE_TOOL_SCHEMAS = [
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
          description:
            "Comma-separated list of properties to expand (e.g., 'body.storage,version')",
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
    description:
      "Create a new Confluence page for task tracking with structured content",
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
          description:
            "Parent page ID (optional). If not specified, the space's homepage will be used as the parent page to avoid creating pages directly under the space root.",
        },
      },
      required: ["spaceKey", "title", "taskDescription"],
    },
  },
  {
    name: "confluence_update_task_progress",
    description:
      "Update task progress and add new decisions or findings to an existing page",
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
          description:
            "Page content in Confluence storage format or simple HTML",
        },
        parentPageId: {
          type: "string",
          description:
            "Parent page ID (optional). If not specified, the space's homepage will be used as the parent page to avoid creating pages directly under the space root.",
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
          description:
            "Updated page content in Confluence storage format or simple HTML",
        },
      },
      required: ["pageId", "title", "content"],
    },
  },
  {
    name: "confluence_find_or_create_parent",
    description:
      "Find an existing page by title or create a new parent page if not found",
    inputSchema: {
      type: "object",
      properties: {
        spaceKey: {
          type: "string",
          description: "Confluence space key",
        },
        parentTitle: {
          type: "string",
          description: "Title of the parent page to find or create",
        },
        parentContent: {
          type: "string",
          description:
            "Content for the parent page if it needs to be created (optional)",
        },
      },
      required: ["spaceKey", "parentTitle"],
    },
  },
  {
    name: "confluence_manage_todays_progress",
    description:
      "Find today's progress page or create a new one, then optionally update it with new findings",
    inputSchema: {
      type: "object",
      properties: {
        spaceKey: {
          type: "string",
          description: "Confluence space key",
        },
        progressParentId: {
          type: "string",
          description: "Parent page ID for progress pages",
        },
        newFindings: {
          type: "array",
          items: { type: "string" },
          description: "New findings or updates to add (optional)",
        },
        nextSteps: {
          type: "array",
          items: { type: "string" },
          description: "Next steps or action items (optional)",
        },
        progress: {
          type: "string",
          description: "Updated progress status (optional)",
        },
      },
      required: ["spaceKey", "progressParentId"],
    },
  },
];

export const WRITABLE_TOOL_NAMES = [
  "confluence_create_task_page",
  "confluence_update_task_progress",
  "confluence_create_page",
  "confluence_update_page",
  "confluence_find_or_create_parent",
  "confluence_manage_todays_progress",
];

/**
 * read-onlyモードに応じてツールリストをフィルタリング
 */
export function filterToolsByReadOnlyMode(isReadOnly: boolean) {
  return CONFLUENCE_TOOL_SCHEMAS.filter((tool) => {
    if (isReadOnly) {
      return !WRITABLE_TOOL_NAMES.includes(tool.name);
    }
    return true;
  });
}
