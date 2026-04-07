export type BridgeStatus = "success" | "error";

export interface BridgeRequest {
  id: string;
  action: string;
  payload: Record<string, unknown>;
}

export interface BridgeError {
  message: string;
  line?: number;
}

export interface BridgeResponse {
  id: string;
  status: BridgeStatus;
  data: Record<string, unknown>;
  error?: BridgeError;
}

export interface BridgeClientOptions {
  bridgeDir?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}
