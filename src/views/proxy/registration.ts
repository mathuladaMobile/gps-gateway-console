import dayjs from "dayjs";
import type { Paged, RegisterAction, RegistrationResult } from "@/api";

export const PAGE_SIZE = 50;
/** Largest page the registration endpoints return */
export const MAX_PAGE_SIZE = 500;
export const PAGE_SIZES = [50, 100, 200, MAX_PAGE_SIZE];

export const ACTION_COLOR: Record<RegisterAction, string | undefined> = {
  ADD: "primary",
  UPDATE: "purple",
  REMOVE: undefined,
};

export const RESULT_COLOR: Record<RegistrationResult, string> = {
  SUCCESS: "success",
  FAILED: "error",
};

/** `YYYY-MM-DD` of an API time, or "" */
export const datePart = (v: string | null | undefined) => {
  const d = dayjs(v);
  return v && d.isValid() ? d.format("YYYY-MM-DD") : "";
};

/** `HH:mm:ss.SSS` of an API time, or "" */
export const timePart = (v: string | null | undefined) => {
  const d = dayjs(v);
  return v && d.isValid() ? d.format("HH:mm:ss.SSS") : "";
};

/** Full `YYYY-MM-DD HH:mm:ss.SSS`, or "-" */
export const stamp = (v: string | null | undefined) =>
  datePart(v) ? `${datePart(v)} ${timePart(v)}` : "-";

/** JSON (or plain text) shown in the detail dialog */
export function pretty(v: unknown) {
  if (v == null || v === "") return "-";
  if (typeof v === "string") {
    try {
      return JSON.stringify(JSON.parse(v), null, 2);
    } catch {
      return v;
    }
  }
  return JSON.stringify(v, null, 2);
}

/** Load every page of a server-paginated list (for Excel export). */
export async function fetchAll<T>(
  load: (page: number, pageSize: number) => Promise<Paged<T>>,
) {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const res = await load(page, MAX_PAGE_SIZE);
    rows.push(...res.items);
    if (!res.items.length || rows.length >= res.total) return rows;
  }
}
