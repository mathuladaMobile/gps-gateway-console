import dayjs, { type Dayjs } from 'dayjs'

export const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm:ss'
const INPUT_FORMAT = 'YYYY-MM-DDTHH:mm'
const API_FORMAT = 'YYYY-MM-DD HH:mm:ss'

/** -> `YYYY-MM-DDTHH:mm` for <input type="datetime-local"> */
export function toInputDate(d: Dayjs | Date = dayjs()) {
  return dayjs(d).format(INPUT_FORMAT)
}

/** datetime-local value -> API format `YYYY-MM-DD HH:mm:ss` */
export function toApiDate(value: string) {
  return dayjs(value).format(API_FORMAT)
}

/** Default [from, to] range ending now. */
export function defaultRange(hours = 1): [string, string] {
  const now = dayjs()
  return [toInputDate(now.subtract(hours, 'hour')), toInputDate(now)]
}

/** Earliest selectable date for a retention like '7D' or '6M'. */
export function retentionMin(retention?: string) {
  const m = retention?.match(/^(\d+)([DM])$/)
  if (!m) return undefined
  return toInputDate(dayjs().subtract(Number(m[1]), m[2] === 'D' ? 'day' : 'month'))
}

/** Length of a datetime-local range in hours. */
export function rangeHours(from: string, to: string) {
  return dayjs(to).diff(dayjs(from), 'hour', true)
}

// API dates are `YYYY-MM-DD HH:mm:ss` or ISO 8601; only those are reformatted
const API_DATE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/

/** Format an API date/time for display; other values are returned unchanged. */
export function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || !API_DATE.test(value)) return value
  const d = dayjs(value)
  return d.isValid() ? d.format(DATE_TIME_FORMAT) : value
}

/** Column keys that hold date/time values (recordTime, updatedAt, lastsentAt, utcTs, created_at...). */
export const isDateKey = (key: string) => /(Time|At|Date|Ts)$/.test(key) || /^(time|date)$|_(time|at|date|ts)$/i.test(key)

/** Build data-table headers from the keys of the first item (for schemaless responses). */
export function headersFrom(items: Record<string, unknown>[]) {
  return Object.keys(items[0] ?? {}).map((key) => ({ title: key, key }))
}

function csvCell(v: unknown) {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(filename: string, headers: { title: string; key: string }[], items: Record<string, unknown>[]) {
  const cell = (i: Record<string, unknown>, key: string) => csvCell(isDateKey(key) ? formatDateTime(i[key]) : i[key])
  const rows = [headers.map((h) => csvCell(h.title)), ...items.map((i) => headers.map((h) => cell(i, h.key)))]
  // BOM so Excel opens Thai text correctly
  const blob = new Blob(['﻿' + rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
