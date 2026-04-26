import { z } from "zod";

export const GetActiveContextSchema = z.object({});

export const LayerDetailSchema = z.enum(["basic", "timing", "with-effects", "with-expressions", "full"]);

export const GetCompTreeSchema = z.object({
  compName: z.string().min(1),
  detail: LayerDetailSchema.optional()
});

export const GetLayerInfoSchema = z.object({
  compName: z.string().min(1),
  layerIndex: z.number().int().positive(),
  detail: LayerDetailSchema.optional()
});

const ProjectItemIdentifierSchema = z.union([z.number().int().positive(), z.string().min(1)]);

export const ProjectItemTypeSchema = z.enum(["composition", "comp", "folder", "footage", "item", "any"]);

export const FindProjectItemSchema = z
  .object({
    name: z.string().min(1).optional(),
    compName: z.string().min(1).optional(),
    id: ProjectItemIdentifierSchema.optional(),
    itemId: ProjectItemIdentifierSchema.optional(),
    type: ProjectItemTypeSchema.optional()
  })
  .refine(
    (value) =>
      typeof value.name !== "undefined" ||
      typeof value.compName !== "undefined" ||
      typeof value.id !== "undefined" ||
      typeof value.itemId !== "undefined",
    {
      message: "Provide name/compName or id/itemId"
    }
  );

export const ApplyExpressionSchema = z.object({
  compName: z.string().min(1),
  layerIndex: z.number().int().positive(),
  propertyMatchName: z.string().min(1),
  expression: z.string()
});

export const CreateSolidLayerSchema = z.object({
  compName: z.string().min(1),
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)])
});

export const ExecuteRawJsxSchema = z.object({
  script: z.string().min(1)
});

export const SearchAeToolsSchema = z.object({
  query: z.string().min(1).optional(),
  category: z.string().min(1).optional()
});

export const ApplyExpressionPresetSchema = z.object({
  preset: z.enum([
    "wiggle_soft",
    "wiggle_hard",
    "loop_cycle_rotation",
    "loop_cycle_position",
    "elastic_scale_in",
    "elastic_scale_out",
    "inertia_position",
    "inertia_rotation",
    "flicker_opacity",
    "bounce_position"
  ]),
  compName: z.string().min(1),
  layerIndex: z.number().int().positive(),
  propertyMatchName: z.string().min(1)
});

export const GetCompStructureSummarySchema = z.object({
  compName: z.string().min(1)
});

export const CloneCompStructureSchema = z.object({
  sourceCompName: z.string().min(1),
  newCompName: z.string().min(1),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  frameRate: z.number().positive().optional()
});

export const SetTransformSchema = z
  .object({
    compName: z.string().min(1),
    layerIndex: z.number().int().positive(),
    position: z.tuple([z.number(), z.number()]).optional(),
    scale: z.tuple([z.number(), z.number()]).optional(),
    rotation: z.number().optional(),
    opacity: z.number().min(0).max(100).optional(),
    anchorPoint: z.tuple([z.number(), z.number()]).optional()
  })
  .refine(
    (value) =>
      typeof value.position !== "undefined" ||
      typeof value.scale !== "undefined" ||
      typeof value.rotation !== "undefined" ||
      typeof value.opacity !== "undefined" ||
      typeof value.anchorPoint !== "undefined",
    {
      message: "At least one transform property must be provided"
    }
  );

export const CreateNullLayerSchema = z.object({
  compName: z.string().min(1),
  name: z.string().min(1).optional(),
  startTime: z.number().min(0).optional()
});

export const SetLayerParentSchema = z.object({
  compName: z.string().min(1),
  layerIndex: z.number().int().positive(),
  parentIndex: z.number().int().positive().nullable().optional()
});

export const ReorderLayersSchema = z.object({
  compName: z.string().min(1),
  layerIndex: z.number().int().positive(),
  targetPosition: z.number().int().positive()
});

export const SetLayerSwitchesSchema = z
  .object({
    compName: z.string().min(1),
    layerIndex: z.number().int().positive(),
    enabled: z.boolean().optional(),
    solo: z.boolean().optional(),
    shy: z.boolean().optional(),
    is3D: z.boolean().optional(),
    adjustmentLayer: z.boolean().optional(),
    collapseTransformation: z.boolean().optional(),
    motionBlur: z.boolean().optional(),
    guideLayer: z.boolean().optional()
  })
  .refine(
    (value) =>
      typeof value.enabled !== "undefined" ||
      typeof value.solo !== "undefined" ||
      typeof value.shy !== "undefined" ||
      typeof value.is3D !== "undefined" ||
      typeof value.adjustmentLayer !== "undefined" ||
      typeof value.collapseTransformation !== "undefined" ||
      typeof value.motionBlur !== "undefined" ||
      typeof value.guideLayer !== "undefined",
    {
      message: "At least one layer switch must be provided"
    }
  );

export const CreateTextLayerSchema = z.object({
  compName: z.string().min(1),
  text: z.string(),
  fontSize: z.number().positive().optional(),
  color: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
  position: z.tuple([z.number(), z.number()]).optional()
});

export const BatchRenameLayersSchema = z.object({
  compName: z.string().min(1),
  targetIndices: z.array(z.number().int().positive()).optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  findText: z.string().optional(),
  replaceText: z.string().optional()
});

export const AddEffectSchema = z.object({
  compName: z.string().min(1),
  layerIndex: z.number().int().positive(),
  effectMatchName: z.string().min(1),
  effectName: z.string().optional()
});

export const AddKeyframesBatchSchema = z.object({
  compName: z.string().min(1),
  layerIndex: z.number().int().positive(),
  propertyMatchName: z.string().min(1),
  keyframes: z
    .array(
      z.object({
        time: z.number(),
        value: z.union([z.number(), z.array(z.number()).min(1)])
      })
    )
    .min(1),
  easing: z.enum(["linear", "ease", "ease_in", "ease_out"]).optional()
});

export const PrecomposeLayersSchema = z.object({
  compName: z.string().min(1),
  layerIndices: z.array(z.number().int().positive()).min(1),
  newCompName: z.string().min(1),
  moveAllAttributes: z.boolean().optional()
});

export const CreateCompositionSchema = z.object({
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  frameRate: z.number().positive(),
  duration: z.number().positive(),
  pixelAspect: z.number().positive().optional()
});

export const DeleteCompositionSchema = z
  .object({
    name: z.string().min(1).optional(),
    compName: z.string().min(1).optional(),
    id: ProjectItemIdentifierSchema.optional(),
    itemId: ProjectItemIdentifierSchema.optional()
  })
  .refine(
    (value) =>
      typeof value.name !== "undefined" ||
      typeof value.compName !== "undefined" ||
      typeof value.id !== "undefined" ||
      typeof value.itemId !== "undefined",
    {
      message: "Provide name/compName or id/itemId"
    }
  );

export const SetPropertyValueSchema = z.object({
  compName: z.string().min(1),
  layerIndex: z.number().int().positive(),
  propertyMatchName: z.string().min(1),
  value: z.union([z.number(), z.array(z.number()).min(1)])
});

export type GetActiveContextInput = z.infer<typeof GetActiveContextSchema>;
export type GetCompTreeInput = z.infer<typeof GetCompTreeSchema>;
export type GetLayerInfoInput = z.infer<typeof GetLayerInfoSchema>;
export type FindProjectItemInput = z.infer<typeof FindProjectItemSchema>;
export type ApplyExpressionInput = z.infer<typeof ApplyExpressionSchema>;
export type CreateSolidLayerInput = z.infer<typeof CreateSolidLayerSchema>;
export type ExecuteRawJsxInput = z.infer<typeof ExecuteRawJsxSchema>;
export type SearchAeToolsInput = z.infer<typeof SearchAeToolsSchema>;
export type ApplyExpressionPresetInput = z.infer<typeof ApplyExpressionPresetSchema>;
export type GetCompStructureSummaryInput = z.infer<typeof GetCompStructureSummarySchema>;
export type CloneCompStructureInput = z.infer<typeof CloneCompStructureSchema>;
export type SetTransformInput = z.infer<typeof SetTransformSchema>;
export type CreateNullLayerInput = z.infer<typeof CreateNullLayerSchema>;
export type SetLayerParentInput = z.infer<typeof SetLayerParentSchema>;
export type ReorderLayersInput = z.infer<typeof ReorderLayersSchema>;
export type SetLayerSwitchesInput = z.infer<typeof SetLayerSwitchesSchema>;
export type CreateTextLayerInput = z.infer<typeof CreateTextLayerSchema>;
export type BatchRenameLayersInput = z.infer<typeof BatchRenameLayersSchema>;
export type AddEffectInput = z.infer<typeof AddEffectSchema>;
export type AddKeyframesBatchInput = z.infer<typeof AddKeyframesBatchSchema>;
export type PrecomposeLayersInput = z.infer<typeof PrecomposeLayersSchema>;
export type CreateCompositionInput = z.infer<typeof CreateCompositionSchema>;
export type DeleteCompositionInput = z.infer<typeof DeleteCompositionSchema>;
export type SetPropertyValueInput = z.infer<typeof SetPropertyValueSchema>;
