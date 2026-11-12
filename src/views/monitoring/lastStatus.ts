import dayjs from "dayjs";
import type { DeviceLastStatus } from "@/api";
import { i18n } from "@/i18n";

const t = i18n.global.t;

export const STATUS_COLOR: Record<DeviceLastStatus, string> = {
  ONLINE: "success",
  OFFLINE: "error",
  NEVER: "grey",
};

/** swipeType 1 = card in, anything else = card out */
export const SWIPE_IN = 1;

/** 35 → "35 s", 125 → "2 min", ... */
export function durationText(sec: number | null | undefined) {
  if (sec == null) return "-";
  const n = Math.abs(sec);
  if (n < 60) return t("lastStatus.unit.sec", { n: Math.round(n) });
  if (n < 3600) return t("lastStatus.unit.min", { n: Math.floor(n / 60) });
  if (n < 86400) return t("lastStatus.unit.hour", { n: Math.floor(n / 3600) });
  return t("lastStatus.unit.day", { n: Math.floor(n / 86400) });
}

/** "1 h 10 min" style, for ages shown next to a time */
export function durationLong(sec: number) {
  const n = Math.max(0, Math.round(sec));
  if (n < 3600) return durationText(n);
  const h = Math.floor(n / 3600);
  if (h >= 24) return durationText(n);
  const m = Math.floor((n % 3600) / 60);
  return m
    ? `${t("lastStatus.unit.hour", { n: h })} ${t("lastStatus.unit.min", { n: m })}`
    : t("lastStatus.unit.hour", { n: h });
}

export const agoText = (sec: number) =>
  t("lastStatus.ago", { age: durationLong(sec) });

/** Seconds between `value` and `now` (ms); null when `value` is empty or invalid */
export function secondsSince(value: string | null | undefined, now: number) {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? Math.max(0, (now - d.valueOf()) / 1000) : null;
}

export function timeOnly(value: string | null | undefined) {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("HH:mm:ss") : value;
}

export function dateOnly(value: string | null | undefined) {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : value;
}

/** Signed diff: "0 s", "-5 s", "+10 min" */
export function diffText(v: number | null) {
  if (v == null) return "—";
  return (v > 0 ? "+" : v < 0 ? "-" : "") + durationText(v);
}
