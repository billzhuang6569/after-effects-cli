import type { BridgeClient } from "../bridge/client.js";
import type { BridgeResponse } from "../bridge/protocol.js";
import {
  AddEffectSchema,
  AddKeyframesBatchSchema,
  ApplyExpressionPresetSchema,
  ApplyExpressionSchema,
  BatchRenameLayersSchema,
  CloneCompStructureSchema,
  CreateCompositionSchema,
  CreateNullLayerSchema,
  CreateSolidLayerSchema,
  CreateTextLayerSchema,
  ExecuteRawJsxSchema,
  FindProjectItemSchema,
  GetActiveContextSchema,
  GetCompStructureSummarySchema,
  GetLayerInfoSchema,
  GetCompTreeSchema,
  PrecomposeLayersSchema,
  ReorderLayersSchema,
  DeleteCompositionSchema,
  SetPropertyValueSchema,
  SetLayerParentSchema,
  SetLayerSwitchesSchema,
  SetTransformSchema,
  SearchAeToolsSchema
} from "../tools/schemas.js";
import { EXPRESSION_PRESETS } from "../tools/expression-presets.js";
import { formatBridgeError } from "../utils/error-messages.js";
import { toJsonSchema, toolCatalog } from "./tool-catalog.js";
import { ToolSearchEngine } from "./tool-search.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  riskLevel?: "safe" | "moderate" | "dangerous";
}

export function listToolDefinitions(): ToolDefinition[] {
  const implementedTools = new Set([
    "search_ae_tools",
    "get_active_context",
    "get_comp_tree",
    "get_layer_info",
    "find_project_item",
    "apply_expression",
    "apply_expression_preset",
    "get_comp_structure_summary",
    "clone_comp_structure",
    "create_solid_layer",
    "set_transform",
    "create_null_layer",
    "set_layer_parent",
    "reorder_layers",
    "set_layer_switches",
    "create_text_layer",
    "batch_rename_layers",
    "add_effect",
    "add_keyframes_batch",
    "precompose_layers",
    "create_composition",
    "delete_composition",
    "set_property_value",
    "execute_raw_jsx",
    "check_ae_connection"
  ]);
  return toolCatalog
    .filter((tool) => implementedTools.has(tool.name))
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: toJsonSchema(tool.inputSchema),
      riskLevel: tool.riskLevel
    }));
}

export async function executeTool(
  bridge: BridgeClient,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    if (toolName === "search_ae_tools") {
      const payload = SearchAeToolsSchema.parse(args);
      return searchAeTools(payload.query, payload.category);
    }
    if (toolName === "get_active_context") {
      const payload = GetActiveContextSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("get_active_context", payload), payload);
    }
    if (toolName === "get_comp_tree") {
      const payload = GetCompTreeSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("get_comp_tree", payload), payload);
    }
    if (toolName === "get_layer_info") {
      const payload = GetLayerInfoSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("get_layer_info", payload), payload);
    }
    if (toolName === "find_project_item") {
      const payload = FindProjectItemSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("find_project_item", payload), payload);
    }
    if (toolName === "apply_expression") {
      const payload = ApplyExpressionSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("apply_expression", payload), payload);
    }
    if (toolName === "apply_expression_preset") {
      const payload = ApplyExpressionPresetSchema.parse(args);
      const expression = EXPRESSION_PRESETS[payload.preset];
      const bridgePayload = {
        compName: payload.compName,
        layerIndex: payload.layerIndex,
        propertyMatchName: payload.propertyMatchName,
        expression
      };
      return await formatBridgeResult(await bridge.execute("apply_expression", bridgePayload), bridgePayload);
    }
    if (toolName === "get_comp_structure_summary") {
      const payload = GetCompStructureSummarySchema.parse(args);
      return await formatBridgeResult(await bridge.execute("get_comp_structure_summary", payload), payload);
    }
    if (toolName === "clone_comp_structure") {
      const payload = CloneCompStructureSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("clone_comp_structure", payload), payload);
    }
    if (toolName === "create_solid_layer") {
      const payload = CreateSolidLayerSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("create_solid_layer", payload), payload);
    }
    if (toolName === "set_transform") {
      const payload = SetTransformSchema.parse(args);
      const bridgePayload = {
        script: assembleSetTransformScript(payload)
      };
      return await formatBridgeResult(await bridge.execute("execute_raw_jsx", bridgePayload), payload);
    }
    if (toolName === "create_null_layer") {
      const payload = CreateNullLayerSchema.parse(args);
      const bridgePayload = {
        script: assembleCreateNullLayerScript(payload)
      };
      return await formatBridgeResult(await bridge.execute("execute_raw_jsx", bridgePayload), payload);
    }
    if (toolName === "set_layer_parent") {
      const payload = SetLayerParentSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("set_layer_parent", payload), payload);
    }
    if (toolName === "reorder_layers") {
      const payload = ReorderLayersSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("reorder_layers", payload), payload);
    }
    if (toolName === "set_layer_switches") {
      const payload = SetLayerSwitchesSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("set_layer_switches", payload), payload);
    }
    if (toolName === "create_text_layer") {
      const payload = CreateTextLayerSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("create_text_layer", payload), payload);
    }
    if (toolName === "batch_rename_layers") {
      const payload = BatchRenameLayersSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("batch_rename_layers", payload), payload);
    }
    if (toolName === "add_effect") {
      const payload = AddEffectSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("add_effect", payload), payload);
    }
    if (toolName === "add_keyframes_batch") {
      const payload = AddKeyframesBatchSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("add_keyframes_batch", payload), payload);
    }
    if (toolName === "precompose_layers") {
      const payload = PrecomposeLayersSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("precompose_layers", payload), payload);
    }
    if (toolName === "create_composition") {
      const payload = CreateCompositionSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("create_composition", payload), payload);
    }
    if (toolName === "delete_composition") {
      const payload = DeleteCompositionSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("delete_composition", payload), payload);
    }
    if (toolName === "set_property_value") {
      const payload = SetPropertyValueSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("set_property_value", payload), payload);
    }
    if (toolName === "execute_raw_jsx") {
      const payload = ExecuteRawJsxSchema.parse(args);
      return await formatBridgeResult(await bridge.execute("execute_raw_jsx", payload), payload);
    }
    if (toolName === "check_ae_connection") {
      return await checkAeConnection(bridge);
    }
    return {
      content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
      isError: true
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: formatBridgeError(formatError(error), args) }],
      isError: true
    };
  }
}

function searchAeTools(
  query?: string,
  category?: string
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  const trimmedQuery = query ? query.trim() : "";
  const results = trimmedQuery
    ? new ToolSearchEngine(toolCatalog).search(trimmedQuery, category)
    : toolCatalog.filter((tool) => !category || tool.category === category);
  const payload = results.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toJsonSchema(tool.inputSchema),
    examplePrompts: tool.examplePrompts
  }));
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
  };
}

async function checkAeConnection(
  bridge: BridgeClient
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const probe = await bridge.execute("execute_raw_jsx", { script: "0;" });
    if (probe.status === "error") {
      const message = formatBridgeError(probe.error?.message ?? "Unknown bridge error");
      return {
        content: [{ type: "text", text: JSON.stringify({ connected: false, message }, null, 2) }],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ connected: true, message: "AE bridge reachable" }, null, 2) }]
    };
  } catch (error) {
    const message = formatBridgeError(formatError(error));
    return {
      content: [{ type: "text", text: JSON.stringify({ connected: false, message }, null, 2) }],
      isError: true
    };
  }
}

async function formatBridgeResult(
  response: BridgeResponse,
  params?: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  if (response.status === "error") {
    if (response.error?.code) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: false,
                errorCode: response.error.code,
                message: formatBridgeError(response.error.message, params),
                details: response.error.details ?? null
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: formatBridgeError(response.error?.message ?? "Unknown bridge error", params) }],
      isError: true
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function assembleSetTransformScript(payload: {
  compName: string;
  layerIndex: number;
  position?: [number, number];
  scale?: [number, number];
  rotation?: number;
  opacity?: number;
  anchorPoint?: [number, number];
}): string {
  const lines: string[] = [];
  lines.push("var comp = null;");
  lines.push("for (var i = 1; i <= app.project.numItems; i++) {");
  lines.push("  var item = app.project.item(i);");
  lines.push(`  if (item instanceof CompItem && item.name === ${toJsSingleQuoted(payload.compName)}) {`);
  lines.push("    comp = item;");
  lines.push("    break;");
  lines.push("  }");
  lines.push("}");
  lines.push("if (!comp) { throw new Error('Comp not found'); }");
  lines.push(`var layer = comp.layer(${payload.layerIndex});`);
  lines.push("if (!layer) { throw new Error('Layer not found'); }");
  lines.push("var transformGroup = layer.property('ADBE Transform Group');");
  lines.push("if (!transformGroup) { throw new Error('Transform group not found'); }");
  if (typeof payload.position !== "undefined") {
    lines.push("var positionProp = transformGroup.property('ADBE Position');");
    lines.push("if (!positionProp) { throw new Error('Position property not found'); }");
    lines.push(`positionProp.setValue([${payload.position[0]}, ${payload.position[1]}]);`);
  }
  if (typeof payload.scale !== "undefined") {
    lines.push("var scaleProp = transformGroup.property('ADBE Scale');");
    lines.push("if (!scaleProp) { throw new Error('Scale property not found'); }");
    lines.push(`scaleProp.setValue([${payload.scale[0]}, ${payload.scale[1]}]);`);
  }
  if (typeof payload.rotation !== "undefined") {
    lines.push("var rotationProp = transformGroup.property('ADBE Rotate Z');");
    lines.push("if (!rotationProp) { throw new Error('Rotation property not found'); }");
    lines.push(`rotationProp.setValue(${payload.rotation});`);
  }
  if (typeof payload.opacity !== "undefined") {
    lines.push("var opacityProp = transformGroup.property('ADBE Opacity');");
    lines.push("if (!opacityProp) { throw new Error('Opacity property not found'); }");
    lines.push(`opacityProp.setValue(${payload.opacity});`);
  }
  if (typeof payload.anchorPoint !== "undefined") {
    lines.push("var anchorPointProp = transformGroup.property('ADBE Anchor Point');");
    lines.push("if (!anchorPointProp) { throw new Error('Anchor point property not found'); }");
    lines.push(`anchorPointProp.setValue([${payload.anchorPoint[0]}, ${payload.anchorPoint[1]}]);`);
  }
  lines.push("'OK';");
  return lines.join("\n");
}

function assembleCreateNullLayerScript(payload: { compName: string; name?: string; startTime?: number }): string {
  const lines: string[] = [];
  const layerName = payload.name ?? "Null 1";
  const startTime = payload.startTime ?? 0;
  lines.push("var comp = null;");
  lines.push("for (var i = 1; i <= app.project.numItems; i++) {");
  lines.push("  var item = app.project.item(i);");
  lines.push(`  if (item instanceof CompItem && item.name === ${toJsSingleQuoted(payload.compName)}) {`);
  lines.push("    comp = item;");
  lines.push("    break;");
  lines.push("  }");
  lines.push("}");
  lines.push("if (!comp) { throw new Error('Comp not found'); }");
  lines.push("var layer = comp.layers.addNull();");
  lines.push(`layer.name = ${toJsSingleQuoted(layerName)};`);
  lines.push(`layer.startTime = ${startTime};`);
  lines.push("'OK';");
  return lines.join("\n");
}

function toJsSingleQuoted(text: string): string {
  return `'${text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")}'`;
}
