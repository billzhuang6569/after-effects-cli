import { describe, expect, it, vi } from "vitest";
import type { BridgeClient } from "../../src/bridge/client.js";
import { executeTool, listToolDefinitions } from "../../src/registry/tool-registry.js";

describe("tool-registry", () => {
  it("exposes phase 3-C tools in listToolDefinitions", () => {
    const tools = listToolDefinitions();
    expect(tools.some((tool) => tool.name === "get_layer_info")).toBe(true);
    expect(tools.some((tool) => tool.name === "find_project_item")).toBe(true);
    expect(tools.some((tool) => tool.name === "apply_expression_preset")).toBe(true);
    expect(tools.some((tool) => tool.name === "get_comp_structure_summary")).toBe(true);
    expect(tools.some((tool) => tool.name === "clone_comp_structure")).toBe(true);
    expect(tools.some((tool) => tool.name === "set_transform")).toBe(true);
    expect(tools.some((tool) => tool.name === "create_null_layer")).toBe(true);
    expect(tools.some((tool) => tool.name === "set_layer_parent")).toBe(true);
    expect(tools.some((tool) => tool.name === "reorder_layers")).toBe(true);
    expect(tools.some((tool) => tool.name === "set_layer_switches")).toBe(true);
    expect(tools.some((tool) => tool.name === "create_text_layer")).toBe(true);
    expect(tools.some((tool) => tool.name === "batch_rename_layers")).toBe(true);
    expect(tools.some((tool) => tool.name === "add_effect")).toBe(true);
    expect(tools.some((tool) => tool.name === "add_keyframes_batch")).toBe(true);
    expect(tools.some((tool) => tool.name === "precompose_layers")).toBe(true);
    expect(tools.some((tool) => tool.name === "create_composition")).toBe(true);
    expect(tools.some((tool) => tool.name === "delete_composition")).toBe(true);
    expect(tools.some((tool) => tool.name === "set_property_value")).toBe(true);
  });

  it("routes apply_expression_preset to apply_expression bridge action", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: { applied: true }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "apply_expression_preset", {
      preset: "wiggle_soft",
      compName: "Main_Title",
      layerIndex: 1,
      propertyMatchName: "ADBE Position"
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith("apply_expression", {
      compName: "Main_Title",
      layerIndex: 1,
      propertyMatchName: "ADBE Position",
      expression: "wiggle(2, 20)"
    });
  });

  it('search_ae_tools("分析合成结构") returns get_comp_structure_summary', async () => {
    const bridge = { execute: vi.fn() } as unknown as BridgeClient;
    const result = await executeTool(bridge, "search_ae_tools", { query: "分析合成结构" });
    const text = result.content[0]?.text ?? "[]";
    expect(text.includes('"name": "get_comp_structure_summary"')).toBe(true);
  });

  it('search_ae_tools("模仿合成") returns clone_comp_structure', async () => {
    const bridge = { execute: vi.fn() } as unknown as BridgeClient;
    const result = await executeTool(bridge, "search_ae_tools", { query: "模仿合成" });
    const text = result.content[0]?.text ?? "[]";
    expect(text.includes('"name": "clone_comp_structure"')).toBe(true);
  });

  it("search_ae_tools without query returns the full tool catalog for capability probes", async () => {
    const bridge = { execute: vi.fn() } as unknown as BridgeClient;
    const result = await executeTool(bridge, "search_ae_tools", {});
    const text = result.content[0]?.text ?? "[]";
    expect(text.includes('"name": "find_project_item"')).toBe(true);
    expect(text.includes('"name": "delete_composition"')).toBe(true);
  });

  it('search_ae_tools("清理合成") returns delete_composition', async () => {
    const bridge = { execute: vi.fn() } as unknown as BridgeClient;
    const result = await executeTool(bridge, "search_ae_tools", { query: "清理合成" });
    const text = result.content[0]?.text ?? "[]";
    expect(text.includes('"name": "delete_composition"')).toBe(true);
  });

  it("routes find_project_item to bridge action", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: {
        existed: true,
        item: { itemId: 128, name: "TAN_TEST_demo", type: "composition" }
      }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "find_project_item", {
      name: "TAN_TEST_demo",
      type: "composition"
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledWith("find_project_item", {
      name: "TAN_TEST_demo",
      type: "composition"
    });
  });

  it("routes set_transform to execute_raw_jsx bridge action", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: { applied: true }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "set_transform", {
      compName: "Main_Title",
      layerIndex: 2,
      position: [960, 540],
      opacity: 80
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      "execute_raw_jsx",
      expect.objectContaining({
        script: expect.stringContaining("ADBE Position")
      })
    );
  });

  it("routes create_null_layer to execute_raw_jsx bridge action", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: { layerIndex: 1 }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "create_null_layer", {
      compName: "Main_Title",
      name: "CTRL_Null",
      startTime: 0
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      "execute_raw_jsx",
      expect.objectContaining({
        script: expect.stringContaining("addNull")
      })
    );
  });

  it("routes reorder_layers to bridge action", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: { layerName: "TXT_Title", fromIndex: 3, toIndex: 1 }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "reorder_layers", {
      compName: "Main_Title",
      layerIndex: 3,
      targetPosition: 1
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledWith("reorder_layers", {
      compName: "Main_Title",
      layerIndex: 3,
      targetPosition: 1
    });
  });

  it("routes set_layer_switches to bridge action", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: { layerName: "CTRL_Null", applied: { is3D: true } }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "set_layer_switches", {
      compName: "Main_Title",
      layerIndex: 1,
      is3D: true
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledWith("set_layer_switches", {
      compName: "Main_Title",
      layerIndex: 1,
      is3D: true
    });
  });

  it("rejects set_layer_switches when no switch is provided", async () => {
    const execute = vi.fn();
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "set_layer_switches", {
      compName: "Main_Title",
      layerIndex: 1
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text.includes("At least one layer switch must be provided")).toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it("routes delete_composition to bridge action with compName alias", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: {
        existed: true,
        deleted: true,
        deletedItem: { itemId: 128, name: "TAN_TEST_demo", type: "composition" }
      }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "delete_composition", {
      compName: "TAN_TEST_demo"
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledWith("delete_composition", {
      compName: "TAN_TEST_demo"
    });
  });

  it("returns structured error payloads for ambiguous delete results", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "error" as const,
      data: {},
      error: {
        message: "Ambiguous composition match: 2 exact matches",
        code: "PROJECT_ITEM_AMBIGUOUS",
        details: {
          matches: [
            { itemId: 1, name: "TAN_TEST_demo", type: "composition" },
            { itemId: 2, name: "TAN_TEST_demo", type: "composition" }
          ]
        }
      }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "delete_composition", {
      name: "TAN_TEST_demo"
    });
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as { errorCode?: string };

    expect(result.isError).toBe(true);
    expect(payload.errorCode).toBe("PROJECT_ITEM_AMBIGUOUS");
  });

  it("routes add_effect to add_effect bridge action", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: { effectIndex: 1, effectName: "Blur" }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "add_effect", {
      compName: "Main_Title",
      layerIndex: 1,
      effectMatchName: "ADBE Gaussian Blur 2"
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledWith("add_effect", {
      compName: "Main_Title",
      layerIndex: 1,
      effectMatchName: "ADBE Gaussian Blur 2"
    });
  });

  it("routes get_comp_tree detail to bridge action", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: { layers: [] }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "get_comp_tree", {
      compName: "Main_Title",
      detail: "with-effects"
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledWith("get_comp_tree", {
      compName: "Main_Title",
      detail: "with-effects"
    });
  });

  it("routes get_layer_info to bridge action", async () => {
    const execute = vi.fn(async () => ({
      id: "cmd_x",
      status: "success" as const,
      data: { index: 1, name: "TXT" }
    }));
    const bridge = { execute } as unknown as BridgeClient;

    const result = await executeTool(bridge, "get_layer_info", {
      compName: "Main_Title",
      layerIndex: 1,
      detail: "full"
    });

    expect(result.isError).toBeUndefined();
    expect(execute).toHaveBeenCalledWith("get_layer_info", {
      compName: "Main_Title",
      layerIndex: 1,
      detail: "full"
    });
  });

  it("returns connected and message for check_ae_connection", async () => {
    const bridge = {
      execute: vi.fn(async () => ({
        id: "cmd_x",
        status: "success" as const,
        data: { message: "Executed" }
      }))
    } as unknown as BridgeClient;

    const result = await executeTool(bridge, "check_ae_connection", {});
    const text = result.content[0]?.text ?? "{}";

    expect(text.includes('"connected": true')).toBe(true);
    expect(text.includes('"message": "AE bridge reachable"')).toBe(true);
  });
});
