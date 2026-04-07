import { mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BridgeClient } from "../../src/bridge/client.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe("BridgeClient", () => {
  it("writes command and reads response", async () => {
    const bridgeDir = await createTempBridgeDir();
    const client = new BridgeClient({ bridgeDir, timeoutMs: 2000, pollIntervalMs: 50 });
    await client.initialize();

    void respondOnce(bridgeDir, {
      status: "success",
      data: { ok: true }
    });

    const result = await client.execute("get_active_context", {});
    expect(result.status).toBe("success");
    expect(result.data.ok).toBe(true);
  });

  it("runs requests in serial queue", async () => {
    const bridgeDir = await createTempBridgeDir();
    const client = new BridgeClient({ bridgeDir, timeoutMs: 2000, pollIntervalMs: 50 });
    await client.initialize();
    const order: string[] = [];

    void respondInOrder(bridgeDir, [
      { marker: "first", delayMs: 80 },
      { marker: "second", delayMs: 10 }
    ]);

    const first = client.execute("get_active_context", {}).then((res) => {
      order.push(String(res.data.marker));
      return res;
    });
    const second = client.execute("get_active_context", {}).then((res) => {
      order.push(String(res.data.marker));
      return res;
    });

    await Promise.all([first, second]);
    expect(order).toEqual(["first", "second"]);
  });
});

async function createTempBridgeDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ae-mcp-test-"));
  tempDirs.push(dir);
  return dir;
}

async function respondOnce(
  bridgeDir: string,
  response: { status: "success" | "error"; data: Record<string, unknown> }
): Promise<void> {
  const seen = new Set<string>();
  while (true) {
    const command = await findNextCommand(bridgeDir, seen);
    if (!command) {
      await delay(20);
      continue;
    }
    seen.add(command.fileName);
    const processingPath = `${command.fullPath}.processing`;
    await rename(command.fullPath, processingPath);
    const raw = await readFile(processingPath, "utf8");
    const parsed = JSON.parse(raw) as { id: string };
    await writeFile(
      `${command.fullPath}.response`,
      JSON.stringify({ id: parsed.id, status: response.status, data: response.data }),
      "utf8"
    );
    await rm(processingPath, { force: true });
    return;
  }
}

async function respondInOrder(
  bridgeDir: string,
  plans: Array<{ marker: string; delayMs: number }>
): Promise<void> {
  for (const plan of plans) {
    while (true) {
      const command = await findNextCommand(bridgeDir, new Set<string>());
      if (!command) {
        await delay(20);
        continue;
      }
      const processingPath = `${command.fullPath}.processing`;
      await rename(command.fullPath, processingPath);
      await delay(plan.delayMs);
      const raw = await readFile(processingPath, "utf8");
      const parsed = JSON.parse(raw) as { id: string };
      await writeFile(
        `${command.fullPath}.response`,
        JSON.stringify({
          id: parsed.id,
          status: "success",
          data: { marker: plan.marker }
        }),
        "utf8"
      );
      await rm(processingPath, { force: true });
      break;
    }
  }
}

async function findNextCommand(
  bridgeDir: string,
  seen: Set<string>
): Promise<{ fileName: string; fullPath: string } | undefined> {
  const entries = await readdir(bridgeDir);
  const candidates = entries
    .filter(
      (name) =>
        name.startsWith("cmd_") &&
        name.endsWith(".json") &&
        !name.endsWith(".json.response") &&
        !name.endsWith(".processing") &&
        !seen.has(name)
    )
    .sort();
  if (!candidates.length) return undefined;
  const fileName = candidates[0]!;
  return { fileName, fullPath: path.join(bridgeDir, fileName) };
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
