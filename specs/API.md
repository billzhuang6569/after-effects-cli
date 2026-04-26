# API 与通信协议规范 (API.md)

**版本**：v1.0
**日期**：2026年3月26日

本文件定义了独立 App 与 AE 接收器之间通过本地文件进行通信的数据结构和指令集。**所有代码实现必须严格遵守此规范，禁止 AI 编程助手自行捏造字段或指令。**

---

## 1. 通信基础协议

*   **通信媒介**：本地文件系统。
*   **默认目录**：`~/Documents/AE_Agent_Bridge/` (Windows: `C:\Users\<User>\Documents\AE_Agent_Bridge\`)
*   **文件命名规范**：
    *   请求文件：`cmd_<timestamp>_<uuid>.json` (例如：`cmd_1711450000_a1b2.json`)
    *   响应文件：`cmd_<timestamp>_<uuid>.json.response`
*   **字符编码**：UTF-8。

---

## 2. 数据结构定义

### 2.1 请求结构 (Request JSON)

App 写入 Bridge 目录的 JSON 文件必须符合以下 Schema：

```json
{
  "id": "cmd_1711450000_a1b2",
  "action": "string", // 必须是下面定义的 Action 之一
  "payload": {
    // 根据不同的 action，payload 结构不同
  }
}
```

### 2.2 响应结构 (Response JSON)

AE 接收器执行完毕后，写入的 `.response` 文件必须符合以下 Schema：

```json
{
  "id": "cmd_1711450000_a1b2",
  "status": "success | error",
  "data": {
    // 成功时返回的数据，如果只是执行动作，可为空或返回确认信息
  },
  "error": {
    // 仅在 status 为 "error" 时存在
    "message": "string", // 错误描述
    "line": "number",    // 发生错误的 ExtendScript 行号（可选）
    "code": "string",    // 稳定错误码（可选，如 PROJECT_ITEM_AMBIGUOUS）
    "details": {}        // 结构化错误细节（可选）
  }
}
```

---

## 3. 核心指令集 (Actions)

以下是第一阶段必须实现的指令集。**AI 编程助手在生成 ExtendScript 代码时，必须实现以下对应的函数。**

### 3.1 获取上下文 (Context Retrieval)

#### Action: `get_active_context`
*   **描述**：获取当前激活的合成、选中的图层和选中的属性。用于支持 `@Active` 引用。
*   **Payload**: `{}` (空)
*   **Response Data 示例**:
    ```json
    {
      "activeComp": {
        "id": 12,
        "name": "Main_Title",
        "width": 1920,
        "height": 1080,
        "frameRate": 30
      },
      "selectedLayers": [
        { "index": 1, "name": "Logo", "type": "AVLayer" }
      ],
      "selectedProperties": [
        { "layerIndex": 1, "matchName": "ADBE Position", "name": "Position" }
      ]
    }
    ```

*   **Layer Type 枚举**：
    - `TextLayer`
    - `AVLayer`
    - `ShapeLayer`
    - `CameraLayer`
    - `LightLayer`
    - `NullLayer`

    说明：
    - `AVLayer` 同时涵盖素材层与预合成层
    - 如需区分预合成层，额外返回 `isPrecomp: true`

#### Action: `get_comp_tree`
*   **描述**：获取指定合成的完整图层树结构。用于支持 `@Comp` 引用。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "detail": "basic | timing | with-effects | with-expressions | full"
    }
    ```
*   `detail` 为可选字段，默认 `basic`
*   **Response Data 示例**:
    ```json
    {
      "comp": {
        "id": 12,
        "name": "Main_Title"
      },
      "detail": "full",
      "layers": [
        {
          "index": 1,
          "name": "TXT_Title",
          "type": "TextLayer",
          "isPrecomp": false,
          "parentIndex": 0,
          "enabled": true,
          "solo": false,
          "inPoint": 0,
          "outPoint": 8,
          "startTime": 0,
          "effects": [
            {
              "index": 1,
              "name": "动画",
              "matchName": "ADBE Slider Control"
            }
          ],
          "expressionProperties": [
            {
              "matchName": "ADBE Position",
              "name": "Position",
              "expression": "wiggle(2, 20)"
            }
          ]
        }
      ]
    }
    ```

#### Action: `get_layer_info`
*   **描述**：获取指定图层的详细信息，支持按细节级别返回 timing、effects 与 expression 信息。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "layerIndex": 1,
      "detail": "basic | timing | with-effects | with-expressions | full"
    }
    ```
*   `detail` 为可选字段，默认 `basic`
*   **Response Data 示例**:
    ```json
    {
      "index": 1,
      "name": "TXT_Title",
      "type": "TextLayer",
      "isPrecomp": false,
      "parentIndex": 0,
      "enabled": true,
      "solo": false,
      "inPoint": 0,
      "outPoint": 8,
      "startTime": 0,
      "effects": [
        {
          "index": 1,
          "name": "动画",
          "matchName": "ADBE Slider Control",
          "props": [
            {
              "name": "滑块",
              "matchName": "ADBE Slider Control-0001",
              "value": 0
            }
          ]
        }
      ],
      "expressionProperties": [
        {
          "matchName": "ADBE Position",
          "name": "Position",
          "expression": "wiggle(2, 20)"
        }
      ]
    }
    ```

#### Action: `find_project_item`
*   **描述**：按精确名称或 item id 查找 AE 项目项，返回结构化元数据。不会进行模糊匹配；如果多个项目项精确重名且无法唯一确定，则返回错误。
*   **Payload**:
    ```json
    {
      "name": "TAN_TEST_demo",
      "type": "composition"
    }
    ```
*   `name` 可替换为 `compName`；也可使用 `id` 或 `itemId`。`type` 可选，支持 `composition | comp | folder | footage | item | any`。
*   **找到时 Response Data 示例**:
    ```json
    {
      "existed": true,
      "item": {
        "itemId": 128,
        "id": 128,
        "projectIndex": 4,
        "name": "TAN_TEST_demo",
        "type": "composition",
        "width": 320,
        "height": 180,
        "duration": 1,
        "frameRate": 30,
        "pixelAspect": 1,
        "numLayers": 1
      },
      "items": [
        {
          "itemId": 128,
          "id": 128,
          "projectIndex": 4,
          "name": "TAN_TEST_demo",
          "type": "composition"
        }
      ],
      "query": {
        "name": "TAN_TEST_demo",
        "type": "composition"
      },
      "errorCode": null
    }
    ```
*   **找不到时 Response Data 示例**:
    ```json
    {
      "existed": false,
      "item": null,
      "items": [],
      "query": {
        "name": "TAN_TEST_demo",
        "type": "composition"
      },
      "errorCode": "PROJECT_ITEM_NOT_FOUND"
    }
    ```
*   **重名歧义 Error 示例**:
    ```json
    {
      "status": "error",
      "error": {
        "code": "PROJECT_ITEM_AMBIGUOUS",
        "message": "Ambiguous project item match: 2 exact matches",
        "details": {
          "query": {
            "name": "TAN_TEST_demo",
            "type": "composition"
          },
          "matches": [
            { "itemId": 128, "name": "TAN_TEST_demo", "type": "composition" },
            { "itemId": 129, "name": "TAN_TEST_demo", "type": "composition" }
          ]
        }
      }
    }
    ```

### 3.2 执行操作 (Execution)

#### Action: `apply_expression`
*   **描述**：为指定的图层属性添加表达式。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "layerIndex": 1,
      "propertyMatchName": "ADBE Position", // 必须使用 matchName 以保证多语言兼容
      "expression": "Math.sin(time)*100;"
    }
    ```

#### Action: `get_comp_structure_summary`
*   **描述**：读取指定合成的结构摘要，用于分析图层组织、表达式使用和命名规律。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title"
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "compName": "Main_Title",
      "frameRate": 30,
      "duration": 8,
      "width": 1920,
      "height": 1080,
      "layerCount": 6,
      "layers": [
        {
          "index": 1,
          "name": "BG_Main",
          "type": "solid",
          "hasExpression": false,
          "expressionSummary": "",
          "parentIndex": null,
          "inPoint": 0,
          "outPoint": 8
        },
        {
          "index": 2,
          "name": "TXT_Title",
          "type": "text",
          "hasExpression": true,
          "expressionSummary": "wiggle on ADBE Position",
          "parentIndex": 3,
          "inPoint": 0,
          "outPoint": 8
        }
      ],
      "patterns": {
        "namingGroups": ["BG_*", "TXT_*", "CTRL_*"],
        "expressionsUsed": ["wiggle", "loopOut"],
        "hasNullControllers": true,
        "hasPrimaryParenting": true
      }
    }
    ```

#### Action: `clone_comp_structure`
*   **描述**：根据源合成结构创建新合成骨架，仅重建支持的图层类型，不复制素材与内容。
*   **Payload**:
    ```json
    {
      "sourceCompName": "Template_Main",
      "newCompName": "Template_Main_V2",
      "width": 1920,
      "height": 1080,
      "duration": 8,
      "frameRate": 30
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "newCompName": "Template_Main_V2",
      "layersCreated": 4,
      "warnings": [
        "Skipped layer 5 (camera): unsupported type for skeleton clone",
        "Skipped layer 6 (precomp): unsupported type for skeleton clone"
      ]
    }
    ```

#### Action: `create_solid_layer`
*   **描述**：在指定合成中创建一个纯色层。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "name": "Background",
      "width": 1920,
      "height": 1080,
      "color": [1.0, 0.0, 0.0] // RGB 数组，范围 0-1
    }
    ```

#### Action: `set_layer_parent`
*   **描述**：设置指定图层的父级图层，或清除父级关系。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "layerIndex": 2,
      "parentIndex": 1
    }
    ```
    `parentIndex` 传 `null` / `undefined` / `0` 表示清除父级。
*   **Response Data 示例**:
    ```json
    {
      "layerName": "TXT_Title",
      "parentName": "CTRL_Null"
    }
    ```

#### Action: `reorder_layers`
*   **描述**：将指定图层移动到目标层级位置。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "layerIndex": 3,
      "targetPosition": 1
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "layerName": "TXT_Title",
      "fromIndex": 3,
      "toIndex": 1
    }
    ```

#### Action: `set_layer_switches`
*   **描述**：批量设置图层开关状态，至少需要提供一个开关字段。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "layerIndex": 1,
      "enabled": true,
      "solo": false,
      "shy": true,
      "is3D": true,
      "adjustmentLayer": false,
      "collapseTransformation": true,
      "motionBlur": true,
      "guideLayer": false
    }
    ```
*   `enabled`、`solo`、`shy`、`is3D`、`adjustmentLayer`、`collapseTransformation`、`motionBlur`、`guideLayer` 均为可选字段，但至少要提供一个。
*   **Response Data 示例**:
    ```json
    {
      "layerName": "CTRL_Null",
      "applied": {
        "enabled": true,
        "is3D": true,
        "motionBlur": true
      }
    }
    ```
*   当请求的开关对当前图层类型不适用时，可额外返回 `warnings: string[]`，其中仅描述被跳过的字段。

#### Action: `create_text_layer`
*   **描述**：在指定合成中创建文字图层，并可设置字体大小、颜色与位置。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "text": "Hello AE",
      "fontSize": 72,
      "color": [1, 1, 1],
      "position": [960, 540]
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "layerIndex": 3,
      "layerName": "Hello AE"
    }
    ```

#### Action: `batch_rename_layers`
*   **描述**：按命名规则批量重命名图层，支持指定索引范围或全图层处理。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "targetIndices": [1, 2, 3],
      "prefix": "BG_",
      "suffix": "_V2",
      "findText": "Old",
      "replaceText": "New"
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "renamedCount": 2,
      "renames": [
        { "index": 1, "oldName": "OldTitle", "newName": "BG_NewTitle_V2" },
        { "index": 2, "oldName": "OldSub", "newName": "BG_NewSub_V2" }
      ]
    }
    ```

#### Action: `add_effect`
*   **描述**：为指定图层添加效果（Effect），支持按 matchName 添加并可覆盖显示名称。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "layerIndex": 2,
      "effectMatchName": "ADBE Gaussian Blur 2",
      "effectName": "Blur_Main"
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "effectIndex": 1,
      "effectName": "Blur_Main"
    }
    ```

#### Action: `add_keyframes_batch`
*   **描述**：为指定属性批量写入关键帧，并可统一设置时间缓动。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "layerIndex": 1,
      "propertyMatchName": "ADBE Position",
      "keyframes": [
        { "time": 0, "value": [960, 540] },
        { "time": 1, "value": [1160, 540] }
      ],
      "easing": "ease_out"
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "keyframesAdded": 2
    }
    ```

#### Action: `precompose_layers`
*   **描述**：将指定图层列表预合成为新合成，并返回原合成中新预合成层的索引。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "layerIndices": [1, 3, 5],
      "newCompName": "Main_Title_Precomp",
      "moveAllAttributes": true
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "newCompName": "Main_Title_Precomp",
      "newLayerIndex": 3
    }
    ```

#### Action: `create_composition`
*   **描述**：在 AE 项目中创建新合成。
*   **Payload**:
    ```json
    {
      "name": "Shot_010_Main",
      "width": 1920,
      "height": 1080,
      "frameRate": 30,
      "duration": 8,
      "pixelAspect": 1
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "compName": "Shot_010_Main",
      "itemId": 128
    }
    ```

#### Action: `delete_composition`
*   **描述**：按精确名称或 item id 删除单个合成，用于无痕临时资源清理。不会进行模糊匹配；如果多个合成精确重名，则不会删除任何项目，并返回稳定错误码。
*   **Payload**:
    ```json
    {
      "name": "TAN_TEST_demo"
    }
    ```
*   `name` 可替换为 `compName`；也可使用 `id` 或 `itemId`。
*   **删除成功 Response Data 示例**:
    ```json
    {
      "existed": true,
      "deleted": true,
      "deletedItem": {
        "itemId": 128,
        "id": 128,
        "projectIndex": 4,
        "name": "TAN_TEST_demo",
        "type": "composition",
        "width": 320,
        "height": 180,
        "duration": 1,
        "frameRate": 30,
        "pixelAspect": 1,
        "numLayers": 1
      },
      "compName": "TAN_TEST_demo",
      "itemId": 128,
      "query": {
        "name": "TAN_TEST_demo",
        "type": "composition"
      },
      "errorCode": null
    }
    ```
*   **已不存在 Response Data 示例**:
    ```json
    {
      "existed": false,
      "deleted": false,
      "deletedItem": null,
      "query": {
        "name": "TAN_TEST_demo",
        "type": "composition"
      },
      "errorCode": "PROJECT_ITEM_NOT_FOUND"
    }
    ```
*   **重名歧义 Error 示例**:
    ```json
    {
      "status": "error",
      "error": {
        "code": "PROJECT_ITEM_AMBIGUOUS",
        "message": "Ambiguous composition match: 2 exact matches",
        "details": {
          "matches": [
            { "itemId": 128, "name": "TAN_TEST_demo", "type": "composition" },
            { "itemId": 129, "name": "TAN_TEST_demo", "type": "composition" }
          ]
        }
      }
    }
    ```

#### Action: `set_property_value`
*   **描述**：按属性 `matchName` 设置属性值，支持 1D / 2D / 3D / Color 值写入。
*   **Payload**:
    ```json
    {
      "compName": "Main_Title",
      "layerIndex": 1,
      "propertyMatchName": "ADBE Position",
      "value": [960, 540]
    }
    ```
*   **Response Data 示例**:
    ```json
    {
      "propertyMatchName": "ADBE Position",
      "valueSet": [960, 540]
    }
    ```

#### Action: `execute_raw_jsx` (高危，仅限内部或高级模式使用)
*   **描述**：直接执行一段 ExtendScript 代码。为了安全和稳定性，常规的 AI 对话应尽量调用封装好的指令（如 `apply_expression`），仅在没有对应封装工具时才使用此指令。
*   **Payload**:
    ```json
    {
      "script": "app.project.activeItem.layers.addNull();"
    }
    ```

---

## 4. 给 AI 编程助手的特别提醒

1.  **MatchName 的重要性**：在 AE 中，属性的显示名称（如 "Position" / "位置"）会随软件语言版本变化。在设计 `payload` 和编写 ExtendScript 时，**必须优先使用 `matchName`**（如 `ADBE Position`）来定位属性，以保证跨语言兼容性。
2.  **JSON 序列化**：AE 的 ExtendScript 原生不支持 `JSON.stringify` 和 `JSON.parse`。你必须在 CEP 扩展中引入 `json2.js`，或者在 JSX 端手动实现安全的字符串拼接。这是极易踩坑的地方。
