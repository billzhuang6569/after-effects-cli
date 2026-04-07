import { describe, expect, it } from "vitest";
import { toolCatalog } from "../../src/registry/tool-catalog.js";
import { ToolSearchEngine } from "../../src/registry/tool-search.js";

describe("ToolSearchEngine", () => {
  const engine = new ToolSearchEngine(toolCatalog);

  it('search("弹性表达式") includes apply_expression', () => {
    const result = engine.search("弹性表达式");
    expect(result.some((tool) => tool.name === "apply_expression")).toBe(true);
  });

  it('search("弹性表达式") includes apply_expression_preset', () => {
    const result = engine.search("弹性表达式");
    expect(result.some((tool) => tool.name === "apply_expression_preset")).toBe(true);
  });

  it('search("shake wiggle") includes apply_expression', () => {
    const result = engine.search("shake wiggle");
    expect(result.some((tool) => tool.name === "apply_expression")).toBe(true);
  });

  it('search("get active") includes get_active_context', () => {
    const result = engine.search("get active");
    expect(result.some((tool) => tool.name === "get_active_context")).toBe(true);
  });

  it('search("图层详情") includes get_layer_info', () => {
    const result = engine.search("图层详情");
    expect(result.some((tool) => tool.name === "get_layer_info")).toBe(true);
  });

  it('search("分析合成结构") includes get_comp_structure_summary', () => {
    const result = engine.search("分析合成结构");
    expect(result.some((tool) => tool.name === "get_comp_structure_summary")).toBe(true);
  });

  it('search("模仿合成") includes clone_comp_structure', () => {
    const result = engine.search("模仿合成");
    expect(result.some((tool) => tool.name === "clone_comp_structure")).toBe(true);
  });

  it('search("set position") includes set_transform', () => {
    const result = engine.search("set position");
    expect(result.some((tool) => tool.name === "set_transform")).toBe(true);
  });

  it('search("父级") includes set_layer_parent', () => {
    const result = engine.search("父级");
    expect(result.some((tool) => tool.name === "set_layer_parent")).toBe(true);
  });

  it('search("文字图层") includes create_text_layer', () => {
    const result = engine.search("文字图层");
    expect(result.some((tool) => tool.name === "create_text_layer")).toBe(true);
  });

  it('search("重命名") includes batch_rename_layers', () => {
    const result = engine.search("重命名");
    expect(result.some((tool) => tool.name === "batch_rename_layers")).toBe(true);
  });

  it('search("添加效果") includes add_effect', () => {
    const result = engine.search("添加效果");
    expect(result.some((tool) => tool.name === "add_effect")).toBe(true);
  });

  it('search("关键帧") includes add_keyframes_batch', () => {
    const result = engine.search("关键帧");
    expect(result.some((tool) => tool.name === "add_keyframes_batch")).toBe(true);
  });

  it('search("预合成") includes precompose_layers', () => {
    const result = engine.search("预合成");
    expect(result.some((tool) => tool.name === "precompose_layers")).toBe(true);
  });

  it('search("新建合成") includes create_composition', () => {
    const result = engine.search("新建合成");
    expect(result.some((tool) => tool.name === "create_composition")).toBe(true);
  });

  it('search("set value") includes set_property_value', () => {
    const result = engine.search("set value");
    expect(result.some((tool) => tool.name === "set_property_value")).toBe(true);
  });
});
