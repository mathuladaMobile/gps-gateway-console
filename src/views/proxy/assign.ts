import type { DestinationInfoResponse, Models } from "@/api";

/**
 * How a proxy is opened / closed:
 * - api:  register at the destination, REMOVE calls its API
 * - reg:  register at the destination, REMOVE only stops sending
 * - none: OPEN / CLOSE in this system, no API call
 */
export type Kind = "api" | "reg" | "none";

export const KIND_COLOR: Record<Kind, string | undefined> = {
  api: "primary",
  reg: "warning",
  none: undefined,
};

export function kindOf(p: DestinationInfoResponse): Kind {
  if (p.registerType !== "API") return "none";
  return p.canRemove ? "api" : "reg";
}

export interface Dest {
  proxyCode: string;
  kind: Kind;
  lines: string[];
  models: Models[];
  /** The device's GPS model is in this proxy's ProxyDeviceType */
  supported: boolean;
  active: boolean;
  registered: boolean;
}

export const supports = (p: DestinationInfoResponse, gpsModelCode: number) =>
  (p.models ?? []).some((m) => m.gpsModelCode === gpsModelCode);
