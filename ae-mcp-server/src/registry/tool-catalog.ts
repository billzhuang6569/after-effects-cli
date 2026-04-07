import { z, type ZodType } from "zod";
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
  GetActiveContextSchema,
  GetCompStructureSummarySchema,
  GetLayerInfoSchema,
  GetCompTreeSchema,
  PrecomposeLayersSchema,
  SetPropertyValueSchema,
  SetLayerParentSchema,
  SetTransformSchema,
  SearchAeToolsSchema
} from "../tools/schemas.js";

export type ToolCategory =
  | "meta"
  | "context"
  | "layers"
  | "properties"
  | "effects"
  | "compositions"
  | "render"
  | "assets"
  | "advanced";

export interface ToolMetadata {
  name: string;
  title: string;
  description: string;
  category: ToolCategory;
  tags: string[];
  examplePrompts: string[];
  inputSchema: ZodType;
  outputDescription: string;
  riskLevel: "safe" | "moderate" | "dangerous";
  requiresActiveComp: boolean;
}

export const toolCatalog: ToolMetadata[] = [
  {
    name: "search_ae_tools",
    title: "Search AE Tools",
    description: "Search tool metadata by keyword and return schemas for matched tools.",
    category: "meta",
    tags: ["search", "tool", "metadata", "schema", "检索", "工具搜索"],
    examplePrompts: ["查找表达式相关工具", "search tools for layer rename", "找能做预合成的工具"],
    inputSchema: SearchAeToolsSchema,
    outputDescription: "JSON string of matched tools with name, description, inputSchema and examplePrompts.",
    riskLevel: "safe",
    requiresActiveComp: false
  },
  {
    name: "get_active_context",
    title: "Get Active Context",
    description: "Get active composition, selected layers and selected properties.",
    category: "context",
    tags: ["active", "context", "selection", "当前", "选中", "状态", "get"],
    examplePrompts: ["get active context", "当前选中了什么", "查看当前合成状态"],
    inputSchema: GetActiveContextSchema,
    outputDescription: "Current active comp info, selected layers and selected properties.",
    riskLevel: "safe",
    requiresActiveComp: false
  },
  {
    name: "get_comp_tree",
    title: "Get Comp Tree",
    description: "Get layer tree structure for a composition by comp name with optional detail levels.",
    category: "context",
    tags: ["comp", "tree", "layers", "structure", "detail", "结构", "合成", "图层树", "图层详情"],
    examplePrompts: ["查看合成图层结构", "get comp tree for Main_Title", "读取这个合成的图层树", "查看合成图层效果"],
    inputSchema: GetCompTreeSchema,
    outputDescription: "Layer tree in the target composition with optional timing, effects and expression details.",
    riskLevel: "safe",
    requiresActiveComp: false
  },
  {
    name: "get_layer_info",
    title: "Get Layer Info",
    description: "Get detailed information for one layer with optional timing, effects and expression details.",
    category: "context",
    tags: ["layer", "info", "detail", "effect", "expression", "图层", "详情", "效果", "表达式"],
    examplePrompts: ["查看 3 号图层详情", "get layer info for layer 2", "读取图层效果和表达式"],
    inputSchema: GetLayerInfoSchema,
    outputDescription: "Detailed information for a target layer.",
    riskLevel: "safe",
    requiresActiveComp: false
  },
  {
    name: "apply_expression",
    title: "Apply Expression",
    description: "Apply expression to a layer property by property matchName.",
    category: "properties",
    tags: [
      "expression",
      "expr",
      "wiggle",
      "elastic",
      "bounce",
      "表达式",
      "抖动",
      "弹性",
      "opacity"
    ],
    examplePrompts: ["给位置加个 wiggle", "弹性表达式", "apply expression to opacity"],
    inputSchema: ApplyExpressionSchema,
    outputDescription: "Execution result for expression application.",
    riskLevel: "moderate",
    requiresActiveComp: true
  },
  {
    name: "apply_expression_preset",
    title: "Apply Expression Preset",
    description: "Apply built-in expression preset to a layer property by matchName.",
    category: "properties",
    tags: ["expression", "preset", "wiggle", "elastic", "bounce", "表达式预设", "抖动", "弹性"],
    examplePrompts: ["给位置加预设抖动", "应用弹性入场表达式", "apply expression preset to opacity"],
    inputSchema: ApplyExpressionPresetSchema,
    outputDescription: "Execution result after resolving preset expression and applying it.",
    riskLevel: "moderate",
    requiresActiveComp: true
  },
  {
    name: "get_comp_structure_summary",
    title: "Get Comp Structure Summary",
    description: "Analyze composition structure with layer types, expression usage and naming patterns.",
    category: "context",
    tags: ["comp", "structure", "summary", "analysis", "分析", "结构", "命名规律", "表达式"],
    examplePrompts: ["分析合成结构", "读取合成命名规律", "summarize comp structure"],
    inputSchema: GetCompStructureSummarySchema,
    outputDescription: "Composition summary with layers and derived structural patterns.",
    riskLevel: "safe",
    requiresActiveComp: false
  },
  {
    name: "clone_comp_structure",
    title: "Clone Comp Structure",
    description: "Create a new composition skeleton by cloning supported layer structure from source comp.",
    category: "compositions",
    tags: ["clone", "comp", "structure", "template", "模仿", "克隆", "骨架", "合成"],
    examplePrompts: ["模仿合成", "按模板重建合成骨架", "clone composition structure"],
    inputSchema: CloneCompStructureSchema,
    outputDescription: "New composition name, created layer count and clone warnings.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "create_solid_layer",
    title: "Create Solid Layer",
    description: "Create a solid layer in target composition with color and size.",
    category: "layers",
    tags: ["solid", "layer", "创建", "纯色层", "背景"],
    examplePrompts: ["创建一个红色背景纯色层", "create solid layer in current comp"],
    inputSchema: CreateSolidLayerSchema,
    outputDescription: "Created layer info.",
    riskLevel: "moderate",
    requiresActiveComp: true
  },
  {
    name: "set_transform",
    title: "Set Transform",
    description: "Set one or more transform properties on a layer by composition and layer index.",
    category: "properties",
    tags: ["transform", "position", "scale", "rotation", "opacity", "anchor", "位移", "缩放", "旋转"],
    examplePrompts: ["set position for layer 2", "调整图层位移和缩放", "set layer opacity to 80"],
    inputSchema: SetTransformSchema,
    outputDescription: "Execution result for transform update.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "create_null_layer",
    title: "Create Null Layer",
    description: "Create a null layer in target composition and optionally set layer name and start time.",
    category: "layers",
    tags: ["null", "layer", "controller", "空对象", "控制器"],
    examplePrompts: ["创建空对象图层", "create null layer in Main_Title", "create controller null"],
    inputSchema: CreateNullLayerSchema,
    outputDescription: "Created null layer information.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "set_layer_parent",
    title: "Set Layer Parent",
    description: "Set or clear parent relationship for a layer in target composition.",
    category: "layers",
    tags: ["parent", "parenting", "hierarchy", "父级", "跟随"],
    examplePrompts: ["设置父级", "clear parent for layer 3", "set layer parent to controller"],
    inputSchema: SetLayerParentSchema,
    outputDescription: "Layer name and parent name after parenting update.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "create_text_layer",
    title: "Create Text Layer",
    description: "Create text layer with optional font size, fill color and position.",
    category: "layers",
    tags: ["text", "title", "caption", "文字图层", "字幕", "文本"],
    examplePrompts: ["创建文字图层", "create text layer in comp", "add title text at center"],
    inputSchema: CreateTextLayerSchema,
    outputDescription: "Created text layer index and name.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "add_effect",
    title: "Add Effect",
    description: "Add effect to a layer by effect matchName and optionally rename the effect display name.",
    category: "effects",
    tags: ["effect", "fx", "blur", "glow", "添加效果", "高斯模糊", "发光"],
    examplePrompts: ["给文字图层加高斯模糊", "添加发光效果", "add blur effect"],
    inputSchema: AddEffectSchema,
    outputDescription: "Added effect index and final effect name.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "add_keyframes_batch",
    title: "Add Keyframes Batch",
    description: "Write multiple keyframes to one property and apply optional global easing mode.",
    category: "properties",
    tags: ["keyframe", "animation", "timing", "关键帧", "缓动", "动画"],
    examplePrompts: ["批量添加关键帧", "给位置加两段关键帧", "add keyframes to position"],
    inputSchema: AddKeyframesBatchSchema,
    outputDescription: "Number of keyframes written.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "set_property_value",
    title: "Set Property Value",
    description: "Set property value by property matchName with 1D/2D/3D/color value conversion.",
    category: "properties",
    tags: ["property", "value", "matchname", "set value", "属性赋值", "设置属性"],
    examplePrompts: ["set value for position", "设置属性值", "set property value by matchName"],
    inputSchema: SetPropertyValueSchema,
    outputDescription: "Property matchName and value actually set.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "precompose_layers",
    title: "Precompose Layers",
    description: "Precompose selected layer indices into a new composition.",
    category: "compositions",
    tags: ["precompose", "layers", "nested", "预合成", "合并图层", "打组"],
    examplePrompts: ["预合成这些图层", "precompose selected layers", "把图层打成预合成"],
    inputSchema: PrecomposeLayersSchema,
    outputDescription: "New precomposition name and layer index in source comp.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "create_composition",
    title: "Create Composition",
    description: "Create a new composition item with size, frame rate and duration.",
    category: "compositions",
    tags: ["composition", "create", "new comp", "新建合成", "合成", "项目"],
    examplePrompts: ["新建合成", "create composition 1920x1080", "create a new comp"],
    inputSchema: CreateCompositionSchema,
    outputDescription: "Created composition name and item id.",
    riskLevel: "moderate",
    requiresActiveComp: false
  },
  {
    name: "execute_raw_jsx",
    title: "Execute Raw JSX",
    description: "Execute raw ExtendScript directly for advanced fallback scenarios.",
    category: "advanced",
    tags: ["jsx", "raw", "script", "高级", "兜底", "dangerous"],
    examplePrompts: ["执行一段 JSX 脚本", "run raw extendscript code"],
    inputSchema: ExecuteRawJsxSchema,
    outputDescription: "Raw execution result from AE.",
    riskLevel: "dangerous",
    requiresActiveComp: false
  },
  {
    name: "check_ae_connection",
    title: "Check AE Connection",
    description: "Probe whether AE and CEP bridge are reachable.",
    category: "meta",
    tags: ["check", "connection", "health", "AE", "桥接", "连通性"],
    examplePrompts: ["检查 AE 连接", "check ae connection"],
    inputSchema: z.object({}),
    outputDescription: "Connection status JSON.",
    riskLevel: "safe",
    requiresActiveComp: false
  },
  {
    name: "batch_rename_layers",
    title: "Batch Rename Layers",
    description: "Rename layers in batch by naming rules for timeline cleanup.",
    category: "layers",
    tags: ["batch", "rename", "layers", "整理图层", "命名", "cleanup", "打组"],
    examplePrompts: ["整理图层", "批量重命名图层", "cleanup layer names"],
    inputSchema: BatchRenameLayersSchema,
    outputDescription: "Renamed layer list and count.",
    riskLevel: "moderate",
    requiresActiveComp: true
  }
];

export function toJsonSchema(schema: ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema) as Record<string, unknown>;
}
