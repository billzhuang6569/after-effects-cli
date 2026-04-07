export function formatBridgeError(rawMessage: string, params?: Record<string, unknown>): string {
  const message = String(rawMessage ?? "");
  const lower = message.toLowerCase();

  if (message.includes("不支持的属性类型")) {
    return message;
  }
  if (lower.includes("comp not found")) {
    const compName = extractCompName(message) ?? readParamString(params, ["compName", "sourceCompName"]);
    if (compName) {
      return `找不到合成「${compName}」，请检查合成名称是否正确`;
    }
    return "找不到合成，请检查合成名称是否正确";
  }
  if (lower.includes("layer index out of range")) {
    return "图层序号越界，请传入合法的图层编号（1-based）";
  }
  if (lower.includes("property not found")) {
    return "找不到属性，请确认 matchName 正确（如 ADBE Position）";
  }
  if (lower.includes("has expression")) {
    return "该属性已有表达式，请先移除表达式再设置静态值";
  }
  if (lower.includes("timeout")) {
    return "AE 未响应（超时），请确认 AE 已打开且 CEP 扩展面板可见";
  }
  if (lower.includes("enoent")) {
    return "文件桥接目录不可访问，请检查 ~/Documents/AE_Agent_Bridge/ 是否存在";
  }
  return message;
}

function extractCompName(message: string): string | null {
  const index = message.indexOf(":");
  if (index < 0) return null;
  const value = message.slice(index + 1).trim();
  return value || null;
}

function readParamString(params: Record<string, unknown> | undefined, keys: string[]): string | null {
  if (!params) return null;
  for (const key of keys) {
    const raw = params[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
  }
  return null;
}
