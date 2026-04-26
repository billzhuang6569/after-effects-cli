import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { BridgeClientOptions, BridgeRequest, BridgeResponse } from "./protocol.js";

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_POLL_INTERVAL_MS = 300;

export class BridgeClient {
  private readonly bridgeDir: string;
  private readonly timeoutMs: number;
  private readonly pollIntervalMs: number;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: BridgeClientOptions = {}) {
    this.bridgeDir = options.bridgeDir ?? path.join(os.homedir(), "Documents", "AE_Agent_Bridge");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  async initialize(): Promise<void> {
    await mkdir(this.bridgeDir, { recursive: true });
    await this.cleanupProcessingFiles();
  }

  async execute(action: string, payload: Record<string, unknown>): Promise<BridgeResponse> {
    const task = this.queue.then(async () => this.executeSingle(action, payload));
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async executeSingle(action: string, payload: Record<string, unknown>): Promise<BridgeResponse> {
    await mkdir(this.bridgeDir, { recursive: true });
    const requestId = this.createRequestId();
    const fileBase = `${requestId}.json`;
    const requestPath = path.join(this.bridgeDir, fileBase);
    const responsePath = `${requestPath}.response`;
    const request: BridgeRequest = {
      id: requestId,
      action,
      payload
    };
    await writeFile(requestPath, JSON.stringify(request), "utf8");
    const startedAt = Date.now();
    while (Date.now() - startedAt < this.timeoutMs) {
      if (await this.exists(responsePath)) {
        const raw = await readFile(responsePath, "utf8");
        const parsed = this.parseResponse(raw, requestId);
        await this.safeRemove(path.join(this.bridgeDir, `${fileBase}.processing`));
        await this.safeRemove(responsePath);
        return parsed;
      }
      await this.delay(this.pollIntervalMs);
    }
    await this.safeRemove(requestPath);
    await this.safeRemove(path.join(this.bridgeDir, `${fileBase}.processing`));
    throw new Error(`AE 响应超时（${this.timeoutMs}ms），请确认 AE 与 CEP 扩展已启动`);
  }

  private createRequestId(): string {
    return `cmd_${Date.now()}_${randomUUID().slice(0, 8)}`;
  }

  private parseResponse(raw: string, expectedId: string): BridgeResponse {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        id: expectedId,
        status: "error",
        data: {},
        error: { message: `Invalid response JSON: ${raw}` }
      };
    }
    if (!parsed || typeof parsed !== "object") {
      return {
        id: expectedId,
        status: "error",
        data: {},
        error: { message: "Invalid response object" }
      };
    }
    const candidate = parsed as Partial<BridgeResponse>;
    const status = candidate.status === "success" || candidate.status === "error" ? candidate.status : "error";
    return {
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : expectedId,
      status,
      data: this.toRecord(candidate.data),
      error:
        status === "error"
          ? {
              message: this.resolveErrorMessage(candidate.error),
              line: this.resolveErrorLine(candidate.error),
              code: this.resolveErrorCode(candidate.error),
              details: this.resolveErrorDetails(candidate.error)
            }
          : undefined
    };
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private resolveErrorMessage(value: unknown): string {
    if (!value || typeof value !== "object") return "Unknown bridge error";
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" && message ? message : "Unknown bridge error";
  }

  private resolveErrorLine(value: unknown): number | undefined {
    if (!value || typeof value !== "object") return undefined;
    const line = (value as { line?: unknown }).line;
    return typeof line === "number" ? line : undefined;
  }

  private resolveErrorCode(value: unknown): string | undefined {
    if (!value || typeof value !== "object") return undefined;
    const code = (value as { code?: unknown }).code;
    return typeof code === "string" && code ? code : undefined;
  }

  private resolveErrorDetails(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object") return undefined;
    const details = (value as { details?: unknown }).details;
    if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
    return details as Record<string, unknown>;
  }

  private async cleanupProcessingFiles(): Promise<void> {
    const entries = await readdir(this.bridgeDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".processing")) continue;
      const fullPath = path.join(this.bridgeDir, entry.name);
      const originalPath = fullPath.replace(/\.processing$/, "");
      if (await this.exists(originalPath)) {
        await this.safeRemove(fullPath);
        continue;
      }
      await rename(fullPath, originalPath).catch(async () => this.safeRemove(fullPath));
    }
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async safeRemove(filePath: string): Promise<void> {
    await rm(filePath, { force: true }).catch(() => undefined);
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
