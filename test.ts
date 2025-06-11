#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { ConfluenceAPIClient } from "./src/confluence-api-client.ts";
import { ConfluenceService } from "./src/confluence-service.ts";
import { TaskContentGenerator } from "./src/task-content-generator.ts";

console.log("Testing Confluence MCP Server components...");

console.log("✓ All modules imported successfully");

const testConfig = {
  baseUrl: "https://test.atlassian.net",
  email: "test@example.com",
  apiToken: "test-token",
  allowedSpaces: ["TEST"],
  readOnly: false,
};

try {
  // Test ConfluenceAPIClient
  const apiClient = new ConfluenceAPIClient(testConfig);
  console.log("✓ ConfluenceAPIClient instantiated successfully");

  // Test ConfluenceService
  const _service = new ConfluenceService(testConfig);
  console.log("✓ ConfluenceService instantiated successfully");

  // Test TaskContentGenerator
  const taskContent = TaskContentGenerator.generateTaskPageContent({
    taskDescription: "テストタスク",
    objectives: ["目標1", "目標2"],
    progress: "開始",
  });
  if (taskContent.includes("テストタスク")) {
    console.log("✓ TaskContentGenerator working correctly");
  } else {
    throw new Error("TaskContentGenerator test failed");
  }

  // Test ConfigManager (without actually loading env vars)
  const authHeaders = apiClient.getAuthHeaders();
  if (authHeaders.Authorization) {
    console.log("✓ Auth headers generation working");
  } else {
    throw new Error("Auth headers generation failed");
  }
} catch (error) {
  console.error("✗ Component test failed:", error);
  Deno.exit(1);
}

console.log("✓ All basic tests passed!");
console.log(
  "\nTo run the actual server, set the following environment variables:",
);
console.log("- CONFLUENCE_BASE_URL");
console.log("- CONFLUENCE_EMAIL");
console.log("- CONFLUENCE_API_TOKEN");
console.log("- CONFLUENCE_ALLOWED_SPACES (optional)");
console.log("- CONFLUENCE_READ_ONLY (optional)");
console.log("\nThen run: deno task start");
