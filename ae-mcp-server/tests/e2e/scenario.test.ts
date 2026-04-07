import { mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BridgeClient } from "../../src/bridge/client.js";
import { executeTool } from "../../src/registry/tool-registry.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe("phase 3-D e2e scenarios with mock bridge files", () => {
  it("场景 A：表达式预设应用", async () => {
    const bridgeDir = await createTempBridgeDir();
    const bridge = new BridgeClient({ bridgeDir, timeoutMs: 2000, pollIntervalMs: 20 });
    await bridge.initialize();

    void respondInOrder(bridgeDir, [
      {
        action: "get_active_context",
        status: "success",
        data: { activeComp: "TestComp", selectedLayers: [1] }
      },
      {
        action: "apply_expression",
        status: "success",
        data: { applied: true }
      }
    ]);

    const contextResult = await executeTool(bridge, "get_active_context", {});
    const applyResult = await executeTool(bridge, "apply_expression_preset", {
      preset: "elastic_scale_in",
      compName: "TestComp",
      layerIndex: 1,
      propertyMatchName: "ADBE Scale"
    });

    expect(contextResult.isError).toBeUndefined();
    expect(applyResult.isError).toBeUndefined();
  });

  it("场景 B：模仿合成创建新合成", async () => {
    const bridgeDir = await createTempBridgeDir();
    const bridge = new BridgeClient({ bridgeDir, timeoutMs: 2000, pollIntervalMs: 20 });
    await bridge.initialize();

    void respondInOrder(bridgeDir, [
      {
        action: "get_comp_structure_summary",
        status: "success",
        data: { layers: [{ type: "text" }, { type: "null" }], patterns: {} }
      },
      {
        action: "create_composition",
        status: "success",
        data: { name: "新合成", width: 1920, height: 1080, frameRate: 25, duration: 10 }
      },
      {
        action: "clone_comp_structure",
        status: "success",
        data: { layersCreated: 2, warnings: [] }
      }
    ]);

    const summaryResult = await executeTool(bridge, "get_comp_structure_summary", { compName: "模板" });
    const createResult = await executeTool(bridge, "create_composition", {
      name: "新合成",
      width: 1920,
      height: 1080,
      frameRate: 25,
      duration: 10
    });
    const cloneResult = await executeTool(bridge, "clone_comp_structure", {
      sourceCompName: "模板",
      newCompName: "新合成"
    });

    expect(summaryResult.isError).toBeUndefined();
    expect(createResult.isError).toBeUndefined();
    expect(cloneResult.isError).toBeUndefined();
  });

  it("场景 C：错误提示优化验证", async () => {
    const bridgeDir = await createTempBridgeDir();
    const bridge = new BridgeClient({ bridgeDir, timeoutMs: 2000, pollIntervalMs: 20 });
    await bridge.initialize();

    void respondInOrder(bridgeDir, [
      {
        action: "get_comp_structure_summary",
        status: "error",
        data: {},
        error: { message: "Comp not found: 不存在合成" }
      }
    ]);

    const result = await executeTool(bridge, "get_comp_structure_summary", { compName: "不存在合成" });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text ?? "").toContain("找不到合成");
  });
});

type ScenarioResponse = {
  action: string;
  status: "success" | "error";
  data: Record<string, unknown>;
  error?: { message: string; line?: number };
};

async function createTempBridgeDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ae-mcp-e2e-"));
  tempDirs.push(dir);
  return dir;
}

async function respondInOrder(bridgeDir: string, plans: ScenarioResponse[]): Promise<void> {
  for (const plan of plans) {
    while (true) {
      const command = await findNextCommand(bridgeDir);
      if (!command) {
        await delay(10);
        continue;
      }
      const processingPath = `${command.fullPath}.processing`;
      await rename(command.fullPath, processingPath);
      const raw = await readFile(processingPath, "utf8");
      const parsed = JSON.parse(raw) as { id: string; action: string };
      if (parsed.action !== plan.action) {
        throw new Error(`Unexpected action order: expected ${plan.action}, got ${parsed.action}`);
      }
      await writeFile(
        `${command.fullPath}.response`,
        JSON.stringify({
          id: parsed.id,
          status: plan.status,
          data: plan.data,
          error: plan.error
        }),
        "utf8"
      );
      await rm(processingPath, { force: true });
      break;
    }
  }
}

async function findNextCommand(bridgeDir: string): Promise<{ fullPath: string } | undefined> {
  const entries = await readdir(bridgeDir);
  const candidates = entries
    .filter(
      (name) =>
        name.startsWith("cmd_") &&
        name.endsWith(".json") &&
        !name.endsWith(".json.response") &&
        !name.endsWith(".processing")
    )
    .sort();
  if (!candidates.length) return undefined;
  return { fullPath: path.join(bridgeDir, candidates[0]!) };
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
