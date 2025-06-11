#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { ConfluenceClient } from "./src/confluence-client.ts";

console.log("Testing Confluence MCP Server components...");

console.log("✓ ConfluenceClient imported successfully");

const testConfig = {
  baseUrl: "https://test.atlassian.net",
  email: "test@example.com",
  apiToken: "test-token"
};

try {
  const client = new ConfluenceClient(testConfig);
  console.log("✓ ConfluenceClient instantiated successfully");
} catch (error) {
  console.error("✗ Failed to instantiate ConfluenceClient:", error);
  Deno.exit(1);
}

console.log("✓ All basic tests passed!");
console.log("\nTo run the actual server, set the following environment variables:");
console.log("- CONFLUENCE_BASE_URL");
console.log("- CONFLUENCE_EMAIL");
console.log("- CONFLUENCE_API_TOKEN");
console.log("\nThen run: deno task start");