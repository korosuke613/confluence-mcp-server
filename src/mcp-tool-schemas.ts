const TOOL_NAME_SEARCH = "confluence_search";
const TOOL_NAME_GET_PAGE = "confluence_get_page";
const TOOL_NAME_GET_SPACE = "confluence_get_space";
const TOOL_NAME_LIST_PAGES = "confluence_list_pages";
const TOOL_NAME_CREATE_PAGE = "confluence_create_page";
const TOOL_NAME_UPDATE_PAGE = "confluence_update_page";

export const CONFLUENCE_TOOL_SCHEMAS = [
  {
    name: TOOL_NAME_SEARCH,
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
    name: TOOL_NAME_GET_PAGE,
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
    name: TOOL_NAME_GET_SPACE,
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
    name: TOOL_NAME_LIST_PAGES,
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
    name: TOOL_NAME_CREATE_PAGE,
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
            'Page content in Confluence Storage Format. Use proper HTML tags like <h1>, <h2> for headings, <ul><li> for lists, <strong> for bold, <em> for italic, <a href=""> for links. For table of contents, use <ac:structured-macro ac:name="toc" />. Avoid markdown syntax like ## or * as they will display as plain text.',
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
    name: TOOL_NAME_UPDATE_PAGE,
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
            'Updated page content in Confluence Storage Format. Use proper HTML tags like <h1>, <h2> for headings, <ul><li> for lists, <strong> for bold, <em> for italic, <a href=""> for links. For table of contents, use <ac:structured-macro ac:name="toc" />. Avoid markdown syntax like ## or * as they will display as plain text.',
        },
      },
      required: ["pageId", "title", "content"],
    },
  },
];

export const WRITABLE_TOOL_NAMES = [
  TOOL_NAME_CREATE_PAGE,
  TOOL_NAME_UPDATE_PAGE,
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
