# Confluence MCP Server

A Model Context Protocol (MCP) server that provides access to Confluence content
through API tokens.

## Features

**Content Reading:**

- Search Confluence content with CQL support
- Retrieve specific pages by ID with content
- Get space information and metadata
- List pages in a space with pagination

**Content Writing:**

- Create custom Confluence pages with Confluence Storage Format
- Update existing page content with proper formatting

**Security & Management:**

- Space access restriction for enhanced security
- Page hierarchy access control with parent permission validation
- Confluence Storage Format support
- Automatic version management
- TypeScript support with Deno runtime
- REST API v2 with v1 fallback for compatibility

## Setup

1. **Clone and navigate to the project directory**

2. **Configure your Confluence connection**:
   - Copy `.env.example` to `.env`
   - Fill in your Confluence instance URL, email, and API token

3. **Generate a Confluence API Token**:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Create a new API token
   - Use this token in your `.env` file

## Usage

### Running the server directly

```bash
deno task start
```

### Development mode (with file watching)

```bash
deno task dev
```

### Environment Variables

**Required:**

- `CONFLUENCE_BASE_URL`: Your Confluence instance URL (e.g.,
  `https://your-domain.atlassian.net`)
- `CONFLUENCE_EMAIL`: Your Confluence account email
- `CONFLUENCE_API_TOKEN`: Your Confluence API token

**Optional:**

- `CONFLUENCE_ALLOWED_SPACES`: Comma-separated list of allowed space keys for
  access restriction (e.g., `TEAM,PROJECT,DOCS`)
- `CONFLUENCE_READ_ONLY`: Set to `'true'` to enable read-only mode (disables all
  write operations)

## MCP Tools

This server provides the following MCP tools:

### Content Reading Tools

### `confluence_search`

Search for content in Confluence.

- `query` (required): Search query string
- `limit` (optional): Maximum number of results (default: 10)
- **Note**: Results are automatically filtered to allowed spaces if
  `CONFLUENCE_ALLOWED_SPACES` is set

**API Details:** `GET /wiki/rest/api/content/search`
([ref](https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-content/#api-wiki-rest-api-content-search-get)) -
Uses CQL (Confluence Query Language) with text search

### `confluence_get_page`

Get a specific Confluence page by ID.

- `pageId` (required): Confluence page ID
- `expand` (optional): Properties to expand (default: "body.storage,version")
- **Note**: Access is restricted to pages in allowed spaces if
  `CONFLUENCE_ALLOWED_SPACES` is set
- **Security**: Page hierarchy access control validates parent page permissions
  before granting access

**API Details:** `GET /wiki/api/v2/pages/{pageId}`
([ref](https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-get)) -
Returns page content in Confluence Storage Format

### `confluence_get_space`

Get information about a Confluence space.

- `spaceKey` (required): Confluence space key
- **Note**: Access is restricted to allowed spaces if
  `CONFLUENCE_ALLOWED_SPACES` is set

**API Details:** `GET /wiki/api/v2/spaces`
([ref](https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-get)) -
Retrieves space metadata and information

### `confluence_list_pages`

List pages in a Confluence space.

- `spaceKey` (required): Confluence space key
- `limit` (optional): Maximum number of pages (default: 25)
- **Note**: Access is restricted to allowed spaces if
  `CONFLUENCE_ALLOWED_SPACES` is set

**API Details:** `GET /wiki/api/v2/pages`
([ref](https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-get)) -
Lists pages with pagination support

### Content Writing Tools

**Note**: These tools are disabled when `CONFLUENCE_READ_ONLY=true` is set.

### `confluence_create_page`

Create a custom Confluence page with specified content.

- `spaceKey` (required): Confluence space key
- `title` (required): Page title
- `content` (required): Page content in Confluence Storage Format. Use proper
  HTML tags like `<h1>`, `<h2>` for headings, `<ul><li>` for lists, `<strong>`
  for bold, `<em>` for italic, `<a href="">` for links. For table of contents,
  use `<ac:structured-macro ac:name="toc" />`. Avoid markdown syntax like `##`
  or `*` as they will display as plain text.
- `parentPageId` (optional): Parent page ID. If not specified, the space's
  homepage will be used as the parent page to avoid creating pages directly
  under the space root.
- **Security**: When a parent page is specified, hierarchy access control
  validates parent page permissions
- **Returns**: Page ID and URL for the created page

**API Details:** `POST /wiki/rest/api/content`
([ref](https://developer.atlassian.com/server/confluence/rest/v1000/api-group-content-resource/#api-rest-api-content-post)) -
Creates new page with Confluence Storage Format content

### `confluence_update_page`

Update an existing Confluence page.

- `pageId` (required): Page ID to update
- `title` (required): Updated page title
- `content` (required): Updated page content in Confluence Storage Format. Use
  proper HTML tags like `<h1>`, `<h2>` for headings, `<ul><li>` for lists,
  `<strong>` for bold, `<em>` for italic, `<a href="">` for links. For table of
  contents, use `<ac:structured-macro ac:name="toc" />`. Avoid markdown syntax
  like `##` or `*` as they will display as plain text.
- **Security**: Page hierarchy access control validates parent page permissions
  before allowing updates
- **Returns**: Updated page ID and version number

**API Details:** `PUT /wiki/rest/api/content/{pageId}`
([ref](https://developer.atlassian.com/server/confluence/rest/v1000/api-group-content-resource/#api-rest-api-content-contentid-put)) -
Updates page content with automatic version increment

## Integration with MCP Clients

To use this server with an MCP client like Claude Desktop, add it to your client
configuration:

```json
{
  "mcpServers": {
    "confluence": {
      "command": "deno",
      "args": [
        "run",
        "--allow-net",
        "--allow-env",
        "--allow-read",
        "/path/to/confluence-mcp-server/src/index.ts"
      ],
      "env": {
        "CONFLUENCE_BASE_URL": "https://your-domain.atlassian.net",
        "CONFLUENCE_EMAIL": "your-email@example.com",
        "CONFLUENCE_API_TOKEN": "your-api-token",
        "CONFLUENCE_ALLOWED_SPACES": "TEAM,PROJECT,DOCS",
        "CONFLUENCE_READ_ONLY": "false"
      }
    }
  }
}
```

## Security

### Read-Only Mode

You can enable read-only mode to restrict the server to only read operations:

```bash
# Enable read-only mode (disables all write operations)
export CONFLUENCE_READ_ONLY="true"

# Disable read-only mode (default)
export CONFLUENCE_READ_ONLY="false"
# or
unset CONFLUENCE_READ_ONLY
```

When read-only mode is enabled:

- All write operations are disabled at both the MCP tool level and client API
  level
- Only content reading tools are available: `confluence_search`,
  `confluence_get_page`, `confluence_get_space`, `confluence_list_pages`
- Write tools (`confluence_create_page`, `confluence_update_page`) are
  completely hidden from MCP clients and will not appear in tool lists
- Attempts to call write operations directly will result in clear error messages
- Perfect for information retrieval scenarios where data integrity is critical

### Space Access Restriction

You can restrict the server to access only specific Confluence spaces by setting
the `CONFLUENCE_ALLOWED_SPACES` environment variable:

```bash
# Restrict to specific spaces
export CONFLUENCE_ALLOWED_SPACES="TEAM,PROJECT,DOCS"

# No restrictions (default)
unset CONFLUENCE_ALLOWED_SPACES
```

When space restrictions are enabled:

- Search results are automatically filtered to allowed spaces only
- Access to pages, spaces, and page lists outside allowed spaces is blocked
- Clear error messages indicate access restrictions

### Page Hierarchy Access Control

The server implements advanced page hierarchy access control to prevent
unauthorized access to child pages when parent pages are restricted:

```bash
# This feature is always enabled and requires no additional configuration
# Access validation is performed automatically for all page operations
```

**How it works:**

- **Parent Permission Validation**: Before accessing any page, the system
  validates that the user has access to all parent pages in the hierarchy
- **Recursive Checking**: The system traverses up the page hierarchy to verify
  permissions at each level
- **Security Enhancement**: Prevents privilege escalation through child page
  access when parent pages are restricted
- **Graceful Error Handling**: Provides clear error messages when access is
  denied due to parent page restrictions

**Access Control Flow:**

1. User attempts to access a page
2. System identifies the page's parent hierarchy
3. Validates access permissions for each parent page recursively
4. Grants access only if all parent pages are accessible to the user
5. Returns appropriate error messages for access violations

This feature ensures consistent access permissions across page hierarchies and
maintains the principle of least privilege.

### API Token Security

- Use API tokens without scope restrictions for full compatibility
- Scoped tokens may cause authentication issues with some API endpoints
- Store tokens securely and rotate them regularly
- Consider creating dedicated service accounts with minimal required permissions

## Development and Testing

### API Testing

Test your Confluence connection and authentication:

```bash
# Basic API functionality test
deno task test-api

# Detailed authentication diagnostics
deno task debug-auth

# Test with specific search query
deno task test-api "your-search-term"
```

## Content Creation Guidelines

This server provides flexible page creation and management capabilities for
Confluence:

1. **Custom Page Creation**: Use `confluence_create_page` to create pages with
   custom content using Confluence Storage Format for proper formatting.

2. **Page Updates**: Use `confluence_update_page` to modify existing page
   content while maintaining version control.

3. **Proper Formatting**: Always use Confluence Storage Format with proper HTML
   tags:
   - Use `<h1>`, `<h2>` for headings instead of markdown `#`, `##`
   - Use `<ul><li>` for unordered lists instead of markdown `*`, `-`
   - Use `<strong>` for bold and `<em>` for italic
   - Use `<ac:structured-macro ac:name="toc" />` for table of contents

4. **Agent Integration**: Designed for use with MCP-compatible agents that can
   create and maintain documentation in Confluence with proper formatting.

## Requirements

- Deno 1.40+
- Valid Confluence Cloud account with API access
- API token for authentication (scope-less recommended)

## Troubleshooting

### Authentication Issues

1. **401 Unauthorized**: Check API token validity and email address
2. **Scope errors**: Use API tokens without specific scopes
3. **Connection timeout**: Verify base URL format and network connectivity

### Space Access Issues

1. **Space not found**: Verify space key exists and is accessible
2. **Access denied**: Check if space is included in `CONFLUENCE_ALLOWED_SPACES`
3. **Empty results**: Ensure target spaces contain searchable content

### Page Hierarchy Access Issues

1. **Parent page access denied**: Verify access permissions to all parent pages
   in the hierarchy
2. **Hierarchy validation failed**: Check that parent pages exist and are
   accessible
3. **Recursive permission errors**: Ensure consistent access permissions
   throughout the page hierarchy
