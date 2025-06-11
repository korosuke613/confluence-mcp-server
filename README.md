# Confluence MCP Server

A Model Context Protocol (MCP) server that provides access to Confluence content through API tokens.

## Features

- Search Confluence content
- Retrieve specific pages by ID
- Get space information
- List pages in a space
- TypeScript support with Deno runtime

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

- `CONFLUENCE_BASE_URL`: Your Confluence instance URL (e.g., `https://your-domain.atlassian.net`)
- `CONFLUENCE_EMAIL`: Your Confluence account email
- `CONFLUENCE_API_TOKEN`: Your Confluence API token

## MCP Tools

This server provides the following MCP tools:

### `confluence_search`
Search for content in Confluence.
- `query` (required): Search query string
- `limit` (optional): Maximum number of results (default: 10)

### `confluence_get_page`
Get a specific Confluence page by ID.
- `pageId` (required): Confluence page ID
- `expand` (optional): Properties to expand (default: "body.storage,version")

### `confluence_get_space`
Get information about a Confluence space.
- `spaceKey` (required): Confluence space key

### `confluence_list_pages`
List pages in a Confluence space.
- `spaceKey` (required): Confluence space key
- `limit` (optional): Maximum number of pages (default: 25)

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
        "CONFLUENCE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Requirements

- Deno 1.40+
- Valid Confluence Cloud account with API access
- API token for authentication