import { BridgeClient } from "../../src/bridge/client.js";
import { executeTool } from "../../src/registry/tool-registry.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const TEST_COMP_NAME = "AE_TEST_COMP_INTEGRATION";
const NEW_COMP_NAME = "AE_TEST_NEW_COMP";
const CLONE_RESULT_COMP_NAME = "AE_TEST_CLONE_RESULT";
const PRECOMP_NAME = "AE_TEST_PRECOMP";
const NULL_LAYER_NAME = "NULL_CTRL";
const BG_LAYER_NAME = "BG";
const TEST_INTERVAL_MS = 200;

async function run(): Promise<void> {
  const bridge = new BridgeClient();
  await bridge.initialize();

  const summaryResults: TestResult[] = [];
  let textLayerIndex = 0;

  await runCase("T00 setup", async () => {
    const response = await bridge.execute("execute_raw_jsx", {
      script: buildSetupScript()
    });
    assertBridgeSuccess(response, "T00 setup");
  });

  await runCase(
    "T01 check_ae_connection",
    async () => {
      const result = await executeTool(bridge, "check_ae_connection", {});
      if (result.isError) {
        throw new Error(readToolText(result));
      }
      const payload = parseJson(readToolText(result));
      if (!isRecord(payload)) {
        throw new Error("check_ae_connection 返回格式错误");
      }
      if (payload.connected !== true) {
        throw new Error(`connected=${String(payload.connected)}`);
      }
    },
    summaryResults
  );

  await runCase(
    "T02 get_active_context",
    async () => {
      const response = await bridge.execute("get_active_context", {});
      assertBridgeSuccess(response, "T02 get_active_context");
      if (!("activeComp" in response.data)) {
        throw new Error("响应缺少 activeComp 字段");
      }
    },
    summaryResults
  );

  await runCase(
    "T03 get_comp_tree",
    async () => {
      const response = await bridge.execute("get_comp_tree", { compName: TEST_COMP_NAME });
      assertBridgeSuccess(response, "T03 get_comp_tree");
      if (!Array.isArray(response.data.layers)) {
        throw new Error("response.data.layers 不是数组");
      }
    },
    summaryResults
  );

  await runCase(
    "T04 create_solid_layer",
    async () => {
      const response = await bridge.execute("create_solid_layer", {
        compName: TEST_COMP_NAME,
        name: BG_LAYER_NAME,
        width: 1920,
        height: 1080,
        color: [0.1, 0.1, 0.1]
      });
      assertBridgeSuccess(response, "T04 create_solid_layer");
      const layerIndex = asNumber(response.data.layerIndex);
      if (!layerIndex || layerIndex <= 0) {
        throw new Error("layerIndex <= 0");
      }
    },
    summaryResults
  );

  await runCase(
    "T05 create_null_layer",
    async () => {
      const beforeCount = await getLayerCount(bridge, TEST_COMP_NAME);
      const response = await bridge.execute("execute_raw_jsx", {
        script: buildCreateNullLayerScript()
      });
      assertBridgeSuccess(response, "T05 create_null_layer");
      const afterCount = await getLayerCount(bridge, TEST_COMP_NAME);
      if (afterCount !== beforeCount + 1) {
        throw new Error(`图层数量未增加：before=${beforeCount}, after=${afterCount}`);
      }
    },
    summaryResults
  );

  await runCase(
    "T06 create_text_layer",
    async () => {
      const response = await bridge.execute("create_text_layer", {
        compName: TEST_COMP_NAME,
        text: "HELLO",
        fontSize: 72,
        color: [1, 1, 1]
      });
      assertBridgeSuccess(response, "T06 create_text_layer");
      textLayerIndex = asNumber(response.data.layerIndex);
      if (!textLayerIndex || textLayerIndex <= 0) {
        throw new Error("layerIndex <= 0");
      }
    },
    summaryResults
  );

  await runCase(
    "T07 set_transform",
    async () => {
      const bgLayerIndex = await findLayerIndexByName(bridge, TEST_COMP_NAME, BG_LAYER_NAME);
      const result = await executeTool(bridge, "set_transform", {
        compName: TEST_COMP_NAME,
        layerIndex: bgLayerIndex,
        scale: [80, 80],
        opacity: 90
      });
      if (result.isError) {
        throw new Error(readToolText(result));
      }
    },
    summaryResults
  );

  await runCase(
    "T08 set_property_value",
    async () => {
      const bgLayerIndex = await findLayerIndexByName(bridge, TEST_COMP_NAME, BG_LAYER_NAME);
      const response = await bridge.execute("set_property_value", {
        compName: TEST_COMP_NAME,
        layerIndex: bgLayerIndex,
        propertyMatchName: "ADBE Opacity",
        value: 75
      });
      assertBridgeSuccess(response, "T08 set_property_value");
      const valueSet = asNumber(response.data.valueSet);
      if (valueSet !== 75) {
        throw new Error(`valueSet=${String(response.data.valueSet)}`);
      }
    },
    summaryResults
  );

  await runCase(
    "T09 apply_expression",
    async () => {
      if (textLayerIndex < 1) {
        throw new Error("textLayerIndex 未初始化");
      }
      const response = await bridge.execute("apply_expression", {
        compName: TEST_COMP_NAME,
        layerIndex: textLayerIndex,
        propertyMatchName: "ADBE Opacity",
        expression: "wiggle(2,20)"
      });
      assertBridgeSuccess(response, "T09 apply_expression");
    },
    summaryResults
  );

  await runCase(
    "T10 apply_expression_preset",
    async () => {
      if (textLayerIndex < 1) {
        throw new Error("textLayerIndex 未初始化");
      }
      const result = await executeTool(bridge, "apply_expression_preset", {
        preset: "wiggle_soft",
        compName: TEST_COMP_NAME,
        layerIndex: textLayerIndex,
        propertyMatchName: "ADBE Opacity"
      });
      if (result.isError) {
        throw new Error(readToolText(result));
      }
    },
    summaryResults
  );

  await runCase(
    "T11 add_effect",
    async () => {
      const bgLayerIndex = await findLayerIndexByName(bridge, TEST_COMP_NAME, BG_LAYER_NAME);
      const response = await bridge.execute("add_effect", {
        compName: TEST_COMP_NAME,
        layerIndex: bgLayerIndex,
        effectMatchName: "ADBE Gaussian Blur 2"
      });
      assertBridgeSuccess(response, "T11 add_effect");
      const effectIndex = asNumber(response.data.effectIndex);
      if (effectIndex !== 1) {
        throw new Error(`effectIndex=${String(response.data.effectIndex)}`);
      }
    },
    summaryResults
  );

  await runCase(
    "T12 add_keyframes_batch",
    async () => {
      const nullLayerIndex = await findLayerIndexByName(bridge, TEST_COMP_NAME, NULL_LAYER_NAME);
      const response = await bridge.execute("add_keyframes_batch", {
        compName: TEST_COMP_NAME,
        layerIndex: nullLayerIndex,
        propertyMatchName: "ADBE Position",
        keyframes: [
          { time: 0, value: [200, 540, 0] },
          { time: 5, value: [1720, 540, 0] }
        ],
        easing: "ease"
      });
      assertBridgeSuccess(response, "T12 add_keyframes_batch");
      const keyframesAdded = asNumber(response.data.keyframesAdded);
      if (keyframesAdded !== 2) {
        throw new Error(`keyframesAdded=${String(response.data.keyframesAdded)}`);
      }
    },
    summaryResults
  );

  await runCase(
    "T13 set_layer_parent",
    async () => {
      if (textLayerIndex < 1) {
        throw new Error("textLayerIndex 未初始化");
      }
      const nullLayerIndex = await findLayerIndexByName(bridge, TEST_COMP_NAME, NULL_LAYER_NAME);
      const currentTextLayerIndex = await findLayerIndexByName(bridge, TEST_COMP_NAME, "HELLO");
      textLayerIndex = currentTextLayerIndex;
      const response = await bridge.execute("set_layer_parent", {
        compName: TEST_COMP_NAME,
        layerIndex: textLayerIndex,
        parentIndex: nullLayerIndex
      });
      assertBridgeSuccess(response, "T13 set_layer_parent");
    },
    summaryResults
  );

  await runCase(
    "T14 batch_rename_layers",
    async () => {
      const response = await bridge.execute("batch_rename_layers", {
        compName: TEST_COMP_NAME,
        prefix: "TEST_"
      });
      assertBridgeSuccess(response, "T14 batch_rename_layers");
      const renamedCount = asNumber(response.data.renamedCount);
      if (!renamedCount || renamedCount < 3) {
        throw new Error(`renamedCount=${String(response.data.renamedCount)}`);
      }
    },
    summaryResults
  );

  await runCase(
    "T15 get_comp_structure_summary",
    async () => {
      const response = await bridge.execute("get_comp_structure_summary", {
        compName: TEST_COMP_NAME
      });
      assertBridgeSuccess(response, "T15 get_comp_structure_summary");
      if (!Array.isArray(response.data.layers) || response.data.layers.length < 3) {
        throw new Error("layers 数量不足");
      }
      if (!response.data.patterns || typeof response.data.patterns !== "object") {
        throw new Error("patterns 不存在");
      }
    },
    summaryResults
  );

  await runCase(
    "T16 create_composition",
    async () => {
      const response = await bridge.execute("create_composition", {
        name: NEW_COMP_NAME,
        width: 1280,
        height: 720,
        frameRate: 30,
        duration: 3
      });
      assertBridgeSuccess(response, "T16 create_composition");
      if (String(response.data.compName ?? "") !== NEW_COMP_NAME) {
        throw new Error(`compName=${String(response.data.compName)}`);
      }
    },
    summaryResults
  );

  await runCase(
    "T17 clone_comp_structure",
    async () => {
      const response = await bridge.execute("clone_comp_structure", {
        sourceCompName: TEST_COMP_NAME,
        newCompName: CLONE_RESULT_COMP_NAME
      });
      assertBridgeSuccess(response, "T17 clone_comp_structure");
      const layersCreated = asNumber(response.data.layersCreated);
      if (!layersCreated || layersCreated <= 0) {
        throw new Error(`layersCreated=${String(response.data.layersCreated)}`);
      }
    },
    summaryResults
  );

  await runCase(
    "T18 precompose_layers",
    async () => {
      const response = await bridge.execute("precompose_layers", {
        compName: TEST_COMP_NAME,
        layerIndices: [1, 2],
        newCompName: PRECOMP_NAME
      });
      assertBridgeSuccess(response, "T18 precompose_layers");
      if (typeof response.data.newCompName !== "string" && typeof response.data.layersCreated === "undefined") {
        throw new Error("响应缺少 newCompName 或 layersCreated");
      }
    },
    summaryResults
  );

  await runCase(
    "T19 execute_raw_jsx",
    async () => {
      const response = await bridge.execute("execute_raw_jsx", { script: "1+1;" });
      assertBridgeSuccess(response, "T19 execute_raw_jsx");
    },
    summaryResults
  );

  await runCase(
    "T20 search_ae_tools",
    async () => {
      const result = await executeTool(bridge, "search_ae_tools", { query: "弹性表达式" });
      if (result.isError) {
        throw new Error(readToolText(result));
      }
      const payload = parseJson(readToolText(result));
      if (!Array.isArray(payload)) {
        throw new Error("search_ae_tools 返回值不是数组");
      }
      const hasApplyExpression = payload.some(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "name" in item &&
          (item as { name?: unknown }).name === "apply_expression"
      );
      if (!hasApplyExpression) {
        throw new Error("结果中未包含 apply_expression");
      }
    },
    summaryResults
  );

  await runCase("T99 teardown", async () => {
    const response = await bridge.execute("execute_raw_jsx", {
      script: buildTeardownScript()
    });
    assertBridgeSuccess(response, "T99 teardown");
  });

  const passed = summaryResults.filter((result) => result.passed).length;
  const failed = summaryResults.length - passed;
  console.log("─────────────────");
  console.log(`结果：${passed}/${summaryResults.length} 通过，${failed} 失败`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function runCase(name: string, task: () => Promise<void>, summaryResults?: TestResult[]): Promise<void> {
  try {
    await task();
    console.log(`✅ PASS  ${name}`);
    if (summaryResults) {
      summaryResults.push({ name, passed: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`❌ FAIL  ${name} — ${message}`);
    if (summaryResults) {
      summaryResults.push({ name, passed: false, error: message });
    }
  } finally {
    await delay(TEST_INTERVAL_MS);
  }
}

async function getLayerCount(bridge: BridgeClient, compName: string): Promise<number> {
  const response = await bridge.execute("get_comp_tree", { compName });
  assertBridgeSuccess(response, "get_comp_tree");
  if (!Array.isArray(response.data.layers)) {
    throw new Error("response.data.layers 不是数组");
  }
  return response.data.layers.length;
}

async function findLayerIndexByName(bridge: BridgeClient, compName: string, layerName: string): Promise<number> {
  const response = await bridge.execute("get_comp_tree", { compName });
  assertBridgeSuccess(response, "get_comp_tree");
  const layers = response.data.layers;
  if (!Array.isArray(layers)) {
    throw new Error("response.data.layers 不是数组");
  }
  const found = layers.find(
    (layer) =>
      typeof layer === "object" &&
      layer !== null &&
      "name" in layer &&
      "index" in layer &&
      (layer as { name?: unknown }).name === layerName
  );
  if (!found || typeof (found as { index?: unknown }).index !== "number") {
    throw new Error(`找不到图层: ${layerName}`);
  }
  return (found as { index: number }).index;
}

function assertBridgeSuccess(
  response: { status: string; error?: { message?: string } },
  testName: string
): asserts response is { status: "success" } {
  if (response.status !== "success") {
    throw new Error(`${testName} 返回错误: ${response.error?.message ?? "unknown error"}`);
  }
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : NaN;
}

function readToolText(result: { content: Array<{ type: "text"; text: string }> }): string {
  const text = result.content[0]?.text;
  if (typeof text !== "string") {
    throw new Error("工具返回空内容");
  }
  return text;
}

function parseJson(text: string): Record<string, unknown> | Array<unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown> | Array<unknown>;
  } catch {
    throw new Error(`JSON 解析失败: ${text}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildSetupScript(): string {
  return [
    "if (!app.project) { app.newProject(); }",
    "var names = ['AE_TEST_COMP_INTEGRATION', 'AE_TEST_NEW_COMP', 'AE_TEST_CLONE_RESULT', 'AE_TEST_PRECOMP'];",
    "for (var i = app.project.numItems; i >= 1; i--) {",
    "  var item = app.project.item(i);",
    "  if (!(item instanceof CompItem)) { continue; }",
    "  for (var j = 0; j < names.length; j++) {",
    "    if (item.name === names[j]) {",
    "      item.remove();",
    "      break;",
    "    }",
    "  }",
    "}",
    "var comp = app.project.items.addComp('AE_TEST_COMP_INTEGRATION', 1920, 1080, 1, 5, 25);",
    "comp.openInViewer();",
    "'OK';"
  ].join("\n");
}

function buildCreateNullLayerScript(): string {
  return [
    "var comp = null;",
    "for (var i = 1; i <= app.project.numItems; i++) {",
    "  var item = app.project.item(i);",
    "  if (item instanceof CompItem && item.name === 'AE_TEST_COMP_INTEGRATION') {",
    "    comp = item;",
    "    break;",
    "  }",
    "}",
    "if (!comp) { throw new Error('Comp not found'); }",
    "var layer = comp.layers.addNull();",
    "layer.name = 'NULL_CTRL';",
    "'OK';"
  ].join("\n");
}

function buildTeardownScript(): string {
  return [
    "if (!app.project) { 'OK'; }",
    "var names = ['AE_TEST_COMP_INTEGRATION', 'AE_TEST_NEW_COMP', 'AE_TEST_CLONE_RESULT', 'AE_TEST_PRECOMP'];",
    "for (var i = app.project.numItems; i >= 1; i--) {",
    "  var item = app.project.item(i);",
    "  if (!(item instanceof CompItem)) { continue; }",
    "  for (var j = 0; j < names.length; j++) {",
    "    if (item.name === names[j]) {",
    "      item.remove();",
    "      break;",
    "    }",
    "  }",
    "}",
    "'OK';"
  ].join("\n");
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ FAIL  bootstrap — ${message}`);
  process.exitCode = 1;
});
