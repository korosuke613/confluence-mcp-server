# Confluence MCP Server

A Model Context Protocol (MCP) server that provides access to Confluence content through API tokens.

## Features

- Search Confluence content
- Retrieve specific pages by ID
- Get space information
- List pages in a space
- Space access restriction for enhanced security
- TypeScript support with Deno runtime
- REST API v2 with v1 fallback for search

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
- `CONFLUENCE_BASE_URL`: Your Confluence instance URL (e.g., `https://your-domain.atlassian.net`)
- `CONFLUENCE_EMAIL`: Your Confluence account email
- `CONFLUENCE_API_TOKEN`: Your Confluence API token

**Optional:**
- `CONFLUENCE_ALLOWED_SPACES`: Comma-separated list of allowed space keys for access restriction (e.g., `TEAM,PROJECT,DOCS`)

## MCP Tools

This server provides the following MCP tools:

### `confluence_search`
Search for content in Confluence.
- `query` (required): Search query string
- `limit` (optional): Maximum number of results (default: 10)
- **Note**: Results are automatically filtered to allowed spaces if `CONFLUENCE_ALLOWED_SPACES` is set

### `confluence_get_page`
Get a specific Confluence page by ID.
- `pageId` (required): Confluence page ID
- `expand` (optional): Properties to expand (default: "body.storage,version")
- **Note**: Access is restricted to pages in allowed spaces if `CONFLUENCE_ALLOWED_SPACES` is set

### `confluence_get_space`
Get information about a Confluence space.
- `spaceKey` (required): Confluence space key
- **Note**: Access is restricted to allowed spaces if `CONFLUENCE_ALLOWED_SPACES` is set

### `confluence_list_pages`
List pages in a Confluence space.
- `spaceKey` (required): Confluence space key
- `limit` (optional): Maximum number of pages (default: 25)
- **Note**: Access is restricted to allowed spaces if `CONFLUENCE_ALLOWED_SPACES` is set

## Integration with MCP Clients

To use this server with an MCP client like Claude Desktop, add it to your client configuration:

```json
{
  "mcpServers": {
    "confluence": {
      "command": "deno",
      "args": ["run", "--allow-net", "--allow-env", "--allow-read", "/path/to/confluence-mcp-server/src/index.ts"],
      "env": {
        "CONFLUENCE_BASE_URL": "https://your-domain.atlassian.net",
        "CONFLUENCE_EMAIL": "your-email@example.com",
        "CONFLUENCE_API_TOKEN": "your-api-token",
        "CONFLUENCE_ALLOWED_SPACES": "TEAM,PROJECT,DOCS"
      }
    }
  }
}
```

## Security

### Space Access Restriction

You can restrict the server to access only specific Confluence spaces by setting the `CONFLUENCE_ALLOWED_SPACES` environment variable:

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