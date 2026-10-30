const pad = (n: number) => String(n).padStart(2, '0')

/** Date -> `yyyy-MM-ddTHH:mm` for <input type="datetime-local"> */
export function toInputDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local value -> API format `yyyy-MM-dd HH:mm:ss` */
export function toApiDate(value: string) {
  const [date, time = '00:00'] = value.split('T')
  return `${date} ${time.length === 5 ? `${time}:00` : time}`
}

/** Default [from, to] range ending now. */
export function defaultRange(hours = 1): [string, string] {
  const now = new Date()
  return [toInputDate(new Date(now.getTime() - hours * 3600_000)), toInputDate(now)]
}

/** Earliest selectable date for a retention like '7D' or '6M'. */
export function retentionMin(retention?: string) {
  const m = retention?.match(/^(\d+)([DM])$/)
  if (!m) return undefined
  const d = new Date()
  if (m[2] === 'D') d.setDate(d.getDate() - Number(m[1]))
  else d.setMonth(d.getMonth() - Number(m[1]))
  return toInputDate(d)
}

/** Build data-table headers from the keys of the first item (for schemaless responses). */
export function headersFrom(items: Record<string, unknown>[]) {
  return Object.keys(items[0] ?? {}).map((key) => ({ title: key, key }))
}

function csvCell(v: unknown) {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(filename: string, headers: { title: string; key: string }[], items: Record<string, unknown>[]) {
  const rows = [headers.map((h) => csvCell(h.title)), ...items.map((i) => headers.map((h) => csvCell(i[h.key])))]
  // BOM so Excel opens Thai text correctly
  const blob = new Blob(['﻿' + rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
