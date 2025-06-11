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

- Create structured task tracking pages
- Update task progress with automatic logging
- Create custom Confluence pages
- Update existing page content

**Security & Management:**

- Space access restriction for enhanced security
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

### `confluence_get_page`

Get a specific Confluence page by ID.

- `pageId` (required): Confluence page ID
- `expand` (optional): Properties to expand (default: "body.storage,version")
- **Note**: Access is restricted to pages in allowed spaces if
  `CONFLUENCE_ALLOWED_SPACES` is set

### `confluence_get_space`

Get information about a Confluence space.

- `spaceKey` (required): Confluence space key
- **Note**: Access is restricted to allowed spaces if
  `CONFLUENCE_ALLOWED_SPACES` is set

### `confluence_list_pages`

List pages in a Confluence space.

- `spaceKey` (required): Confluence space key
- `limit` (optional): Maximum number of pages (default: 25)
- **Note**: Access is restricted to allowed spaces if
  `CONFLUENCE_ALLOWED_SPACES` is set

### Content Writing Tools

**Note**: These tools are disabled when `CONFLUENCE_READ_ONLY=true` is set.

### `confluence_create_task_page`

Create a structured task tracking page with predefined template.

- `spaceKey` (required): Confluence space key
- `title` (required): Page title
- `taskDescription` (required): Description of the task or project
- `objectives` (optional): Array of objectives or goals
- `progress` (optional): Current progress status (default: "開始")
- `parentPageId` (optional): Parent page ID
- **Returns**: Page ID and URL for the created page

### `confluence_update_task_progress`

Update task progress and add findings to an existing task page.

- `pageId` (required): Page ID to update
- `progress` (required): Updated progress status
- `newFindings` (optional): Array of new findings or decisions to add
- `nextSteps` (optional): Array of next steps or action items
- **Returns**: Updated page ID and version number

### `confluence_create_page`

Create a custom Confluence page with specified content.

- `spaceKey` (required): Confluence space key
- `title` (required): Page title
- `content` (required): Page content in Confluence storage format or HTML
- `parentPageId` (optional): Parent page ID
- **Returns**: Page ID and URL for the created page

### `confluence_update_page`

Update an existing Confluence page.

- `pageId` (required): Page ID to update
- `title` (required): Updated page title
- `content` (required): Updated page content in Confluence storage format or
  HTML
- **Returns**: Updated page ID and version number

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
- Write tools are completely hidden from MCP clients and will not appear in tool
  lists
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

## Task Management Workflow

This server is designed to help agents track tasks, progress, and decisions in
Confluence:

1. **Create Task Pages**: Use `confluence_create_task_page` to create structured
   pages with predefined sections for task description, objectives, progress
   tracking, findings, and decision logs.

2. **Update Progress**: Use `confluence_update_task_progress` to add new
   findings, update status, and log next steps with automatic timestamps.

3. **Structured Documentation**: All task pages include standardized sections:
   - Task overview and objectives
   - Current progress status
   - Implementation findings and discoveries
   - Next action items
   - Decision log with timestamps

4. **Agent Integration**: Designed for use with MCP-compatible agents that can
   automatically document their work, decisions, and progress in Confluence.

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
