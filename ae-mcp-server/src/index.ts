import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BridgeClient } from "./bridge/client.js";
import { executeTool, listToolDefinitions } from "./registry/tool-registry.js";

async function main(): Promise<void> {
  const bridge = new BridgeClient();
  await bridge.initialize();
  const server = new Server(
    {
      name: "ae-agent-mcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listToolDefinitions().map((tool) => ({
      name: tool.name,
      description:
        tool.riskLevel === "dangerous" ? `${tool.description} (riskLevel: dangerous)` : tool.description,
      inputSchema: tool.inputSchema
    }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = toRecord(request.params.arguments);
    return executeTool(bridge, request.params.name, args);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
