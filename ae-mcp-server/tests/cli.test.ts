import { describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli.js";

function createIo() {
  const stdout = {
    write: vi.fn()
  };
  const stderr = {
    write: vi.fn()
  };
  return { stdout, stderr };
}

describe("ae-cli", () => {
  it("prints help when command is help", async () => {
    const io = createIo();
    const initialize = vi.fn(async () => undefined);
    const executeTool = vi.fn();

    const exitCode = await runCli(["help"], io, {
      createBridge: () => ({ initialize }),
      executeTool
    });

    expect(exitCode).toBe(0);
    expect(initialize).not.toHaveBeenCalled();
    expect(executeTool).not.toHaveBeenCalled();
    expect(io.stdout.write).toHaveBeenCalledWith(expect.stringContaining("AE CLI — 用命令行操作 After Effects"));
  });

  it("prints help when command is --help", async () => {
    const io = createIo();
    const initialize = vi.fn(async () => undefined);
    const executeTool = vi.fn();

    const exitCode = await runCli(["--help"], io, {
      createBridge: () => ({ initialize }),
      executeTool
    });

    expect(exitCode).toBe(0);
    expect(initialize).not.toHaveBeenCalled();
    expect(executeTool).not.toHaveBeenCalled();
    expect(io.stdout.write).toHaveBeenCalledWith(expect.stringContaining("命令："));
  });

  it("prints help when no arguments are provided", async () => {
    const io = createIo();
    const initialize = vi.fn(async () => undefined);
    const executeTool = vi.fn();

    const exitCode = await runCli([], io, {
      createBridge: () => ({ initialize }),
      executeTool
    });

    expect(exitCode).toBe(0);
    expect(initialize).not.toHaveBeenCalled();
    expect(executeTool).not.toHaveBeenCalled();
    expect(io.stdout.write).toHaveBeenCalledWith(expect.stringContaining("用法："));
  });

  it("runs check command and prints JSON", async () => {
    const io = createIo();
    const initialize = vi.fn(async () => undefined);
    const executeTool = vi.fn(async () => ({
      content: [{ type: "text" as const, text: '{"connected":true,"message":"AE bridge reachable"}' }]
    }));

    const exitCode = await runCli(["check"], io, {
      createBridge: () => ({ initialize }),
      executeTool
    });

    expect(exitCode).toBe(0);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(executeTool).toHaveBeenCalledWith(expect.anything(), "check_ae_connection", {});
    expect(io.stdout.write).toHaveBeenCalledWith('{\n  "connected": true,\n  "message": "AE bridge reachable"\n}\n');
  });

  it("maps layer command to get_layer_info", async () => {
    const io = createIo();
    const executeTool = vi.fn(async () => ({
      content: [{ type: "text" as const, text: '{"index":1}' }]
    }));

    const exitCode = await runCli(["layer", "Main", "3", "--detail", "full", "--json"], io, {
      createBridge: () => ({ initialize: vi.fn(async () => undefined) }),
      executeTool
    });

    expect(exitCode).toBe(0);
    expect(executeTool).toHaveBeenCalledWith(expect.anything(), "get_layer_info", {
      compName: "Main",
      layerIndex: 3,
      detail: "full"
    });
    expect(io.stdout.write).toHaveBeenCalledWith('{"index":1}\n');
  });

  it("returns exit code 2 for invalid cli arguments", async () => {
    const io = createIo();

    const exitCode = await runCli(["layer", "Main", "abc"], io, {
      createBridge: () => ({ initialize: vi.fn(async () => undefined) }),
      executeTool: vi.fn()
    });

    expect(exitCode).toBe(2);
    expect(io.stderr.write).toHaveBeenCalledWith("layerIndex 必须是正整数\n");
  });
});
