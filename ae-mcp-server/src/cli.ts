import { ZodError } from "zod";
import { BridgeClient } from "./bridge/client.js";
import { executeTool } from "./registry/tool-registry.js";

type OutputWriter = Pick<NodeJS.WriteStream, "write">;

interface CliIo {
  stdout: OutputWriter;
  stderr: OutputWriter;
}

interface BridgeClientLike {
  initialize(): Promise<void>;
}

interface CliDeps {
  createBridge: () => BridgeClientLike;
  executeTool: typeof executeTool;
}

const DEFAULT_IO: CliIo = {
  stdout: process.stdout,
  stderr: process.stderr
};

const DEFAULT_DEPS: CliDeps = {
  createBridge: () => new BridgeClient(),
  executeTool
};

export async function runCli(argv: string[], io: CliIo = DEFAULT_IO, deps: CliDeps = DEFAULT_DEPS): Promise<number> {
  try {
    const parsed = parseCliArgs(argv);
    const bridge = deps.createBridge();
    await bridge.initialize();
    const result = await deps.executeTool(bridge as BridgeClient, parsed.toolName, parsed.args);
    const text = result.content[0]?.text ?? "";

    if (result.isError) {
      if (!parsed.silent) {
        io.stderr.write(`${formatOutput(text, parsed.compactJson)}\n`);
      } else {
        io.stderr.write(`${text}\n`);
      }
      return classifyErrorExitCode(text);
    }

    if (!parsed.silent) {
      io.stdout.write(`${formatOutput(text, parsed.compactJson)}\n`);
    }
    return 0;
  } catch (error) {
    const message = formatCliError(error);
    io.stderr.write(`${message}\n`);
    if (error instanceof ZodError) return 2;
    return classifyErrorExitCode(message);
  }
}

function parseCliArgs(argv: string[]): {
  toolName: string;
  args: Record<string, unknown>;
  compactJson: boolean;
  silent: boolean;
} {
  const flags = readGlobalFlags(argv);
  const args = flags.argv;
  const command = args[0];

  if (!command) {
    throw new Error("Usage: ae-cli <check|context|layers|layer|call> [options]");
  }

  if (command === "check") {
    ensureNoExtraArgs(args.slice(1), "check");
    return { toolName: "check_ae_connection", args: {}, compactJson: flags.compactJson, silent: flags.silent };
  }

  if (command === "context") {
    ensureNoExtraArgs(args.slice(1), "context");
    return { toolName: "get_active_context", args: {}, compactJson: flags.compactJson, silent: flags.silent };
  }

  if (command === "layers") {
    const compName = args[1];
    if (!compName) {
      throw new ZodError([
        {
          code: "custom",
          message: "layers 命令需要 compName",
          path: ["compName"]
        }
      ]);
    }
    const detail = readOptionalStringOption(args.slice(2), "--detail", "layers");
    return {
      toolName: "get_comp_tree",
      args: detail ? { compName, detail } : { compName },
      compactJson: flags.compactJson,
      silent: flags.silent
    };
  }

  if (command === "layer") {
    const compName = args[1];
    const rawLayerIndex = args[2];
    if (!compName || !rawLayerIndex) {
      throw new ZodError([
        {
          code: "custom",
          message: "layer 命令需要 compName 和 layerIndex",
          path: ["layer"]
        }
      ]);
    }
    const layerIndex = Number(rawLayerIndex);
    if (!isFinite(layerIndex) || layerIndex < 1 || Math.floor(layerIndex) !== layerIndex) {
      throw new ZodError([
        {
          code: "custom",
          message: "layerIndex 必须是正整数",
          path: ["layerIndex"]
        }
      ]);
    }
    const detail = readOptionalStringOption(args.slice(3), "--detail", "layer");
    return {
      toolName: "get_layer_info",
      args: detail ? { compName, layerIndex, detail } : { compName, layerIndex },
      compactJson: flags.compactJson,
      silent: flags.silent
    };
  }

  if (command === "call") {
    const toolName = args[1];
    if (!toolName) {
      throw new ZodError([
        {
          code: "custom",
          message: "call 命令需要 toolName",
          path: ["toolName"]
        }
      ]);
    }
    const toolArgs = readJsonObjectOption(args.slice(2), "--args", "call");
    return {
      toolName,
      args: toolArgs,
      compactJson: flags.compactJson,
      silent: flags.silent
    };
  }

  throw new Error(`Unknown command: ${command}`);
}

function readGlobalFlags(argv: string[]): { argv: string[]; compactJson: boolean; silent: boolean } {
  const args: string[] = [];
  let compactJson = false;
  let silent = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (typeof value === "undefined") {
      continue;
    }
    if (value === "--json") {
      compactJson = true;
      continue;
    }
    if (value === "--silent") {
      silent = true;
      continue;
    }
    args.push(value);
  }

  return {
    argv: args,
    compactJson,
    silent
  };
}

function readOptionalStringOption(argv: string[], optionName: string, commandName: string): string | undefined {
  if (argv.length === 0) return undefined;
  if (argv.length !== 2 || argv[0] !== optionName || !argv[1]) {
    throw new ZodError([
      {
        code: "custom",
        message: `${commandName} 命令仅支持 ${optionName} <value>`,
        path: [optionName]
      }
    ]);
  }
  return argv[1];
}

function readJsonObjectOption(argv: string[], optionName: string, commandName: string): Record<string, unknown> {
  if (argv.length === 0) return {};
  if (argv.length !== 2 || argv[0] !== optionName || !argv[1]) {
    throw new ZodError([
      {
        code: "custom",
        message: `${commandName} 命令仅支持 ${optionName} '<json object>'`,
        path: [optionName]
      }
    ]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(argv[1]);
  } catch {
    throw new ZodError([
      {
        code: "custom",
        message: "--args 必须是合法 JSON",
        path: [optionName]
      }
    ]);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ZodError([
      {
        code: "custom",
        message: "--args 必须是 JSON 对象",
        path: [optionName]
      }
    ]);
  }
  return parsed as Record<string, unknown>;
}

function ensureNoExtraArgs(argv: string[], commandName: string): void {
  if (argv.length > 0) {
    throw new ZodError([
      {
        code: "custom",
        message: `${commandName} 命令不接受额外参数`,
        path: [commandName]
      }
    ]);
  }
}

function formatOutput(text: string, compactJson: boolean): string {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, compactJson ? 0 : 2);
  } catch {
    return text;
  }
}

function classifyErrorExitCode(message: string): number {
  const lower = String(message).toLowerCase();
  if (lower.indexOf("timeout") >= 0 || message.indexOf("超时") >= 0 || message.indexOf("未响应") >= 0) {
    return 3;
  }
  if (
    lower.indexOf("zod") >= 0 ||
    lower.indexOf("invalid") >= 0 ||
    lower.indexOf("required") >= 0 ||
    lower.indexOf("expected") >= 0 ||
    message.indexOf("必须") >= 0
  ) {
    return 2;
  }
  return 1;
}

function formatCliError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join("; ");
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

if (typeof process.argv[1] === "string" && import.meta.url === new URL(process.argv[1], "file://").href) {
  runCli(process.argv.slice(2)).then((exitCode) => {
    process.exit(exitCode);
  });
}
