import type { ToolMetadata } from "./tool-catalog.js";

const SYNONYM_GROUPS: string[][] = [
  ["wiggle", "抖动", "shake", "jitter"],
  ["elastic", "弹性", "bounce"],
  ["precompose_layers", "precompose", "预合成", "pre-comp", "打组"],
  ["set_layer_parent", "parent", "parenting", "父级", "跟随"],
  ["add_keyframe", "add_keyframes_batch", "keyframe", "关键帧", "key", "帧"],
  ["opacity", "不透明度", "透明度", "alpha"],
  ["create_null_layer", "null", "null object", "空物体", "空对象"],
  ["gaussian blur", "blur", "高斯", "模糊"],
  ["apply_expression", "expression", "expr", "表达式"],
  ["add_effect", "effect", "fx", "添加效果", "效果"],
  ["precompose_layers", "precompose", "预合成"],
  ["create_composition", "new comp", "create composition", "新建合成", "创建合成"],
  ["set_property_value", "set value", "property value", "设置属性值", "属性赋值"]
];

export class ToolSearchEngine {
  constructor(private readonly tools: ToolMetadata[]) {}

  search(query: string, category?: string): ToolMetadata[] {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];
    const filteredTools = category
      ? this.tools.filter((tool) => tool.category === category)
      : this.tools.slice();
    const keywords = this.expandKeywords(normalizedQuery);
    const exactNameMatches = filteredTools.filter((tool) => normalize(tool.name) === normalizedQuery);
    const tagMatches = filteredTools.filter(
      (tool) => !exactNameMatches.includes(tool) && this.matchesAny(tool.tags, keywords, normalizedQuery)
    );
    const promptMatches = filteredTools.filter(
      (tool) =>
        !exactNameMatches.includes(tool) &&
        !tagMatches.includes(tool) &&
        this.matchesAny(tool.examplePrompts, keywords, normalizedQuery)
    );
    const descriptionMatches = filteredTools.filter(
      (tool) =>
        !exactNameMatches.includes(tool) &&
        !tagMatches.includes(tool) &&
        !promptMatches.includes(tool) &&
        this.matchesText(tool.description, keywords, normalizedQuery)
    );
    return [...exactNameMatches, ...tagMatches, ...promptMatches, ...descriptionMatches];
  }

  private expandKeywords(query: string): string[] {
    const baseTokens = query
      .split(/[\s,_-]+/g)
      .map((token) => token.trim())
      .filter(Boolean);
    const keywords = new Set<string>([query, ...baseTokens]);
    for (const group of SYNONYM_GROUPS) {
      const normalizedGroup = group.map((word) => normalize(word));
      if (normalizedGroup.some((word) => query.includes(word) || baseTokens.includes(word))) {
        for (const word of normalizedGroup) keywords.add(word);
      }
    }
    return [...keywords];
  }

  private matchesAny(fields: string[], keywords: string[], query: string): boolean {
    for (const field of fields) {
      if (this.matchesText(field, keywords, query)) return true;
    }
    return false;
  }

  private matchesText(field: string, keywords: string[], query: string): boolean {
    const normalizedField = normalize(field);
    if (normalizedField.includes(query) || query.includes(normalizedField)) return true;
    return keywords.some((keyword) => normalizedField.includes(keyword) || keyword.includes(normalizedField));
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
