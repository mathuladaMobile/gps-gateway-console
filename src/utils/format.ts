import dayjs, { type Dayjs } from 'dayjs'

export const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm'
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

/** Longest from–to span allowed per history search. */
export const MAX_RANGE_HOURS = 24

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

/** Table cell text: "-" for null, undefined and empty / blank strings. */
export const orDash = (v: unknown) => (v == null || (typeof v === "string" && !v.trim()) ? "-" : v)

/** Column keys that hold date/time values (recordTime, updatedAt, lastsentAt, utcTs, created_at...). */
export const isDateKey = (key: string) => /(Time|At|Date|Ts)$/.test(key) || /^(time|date)$|_(time|at|date|ts)$/i.test(key)

/** Build data-table headers from the keys of the first item (for schemaless responses). */
export function headersFrom(items: Record<string, unknown>[]) {
  return Object.keys(items[0] ?? {}).map((key) => ({ title: key, key }))
}

function excelCell(v: unknown) {
  if (v == null) return ''
  if (typeof v === 'number' || typeof v === 'boolean') return v
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
}

export async function downloadExcel(filename: string, headers: { title: string; key: string }[], items: Record<string, unknown>[]) {
  // Loaded on demand to keep exceljs out of the main bundle
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')
  ws.columns = headers.map((h) => ({ header: h.title, key: h.key }))
  for (const i of items) {
    ws.addRow(headers.map((h) => excelCell(isDateKey(h.key) ? formatDateTime(i[h.key]) : i[h.key])))
  }
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  // Fit column widths to the longest value (capped)
  ws.columns.forEach((col) => {
    let max = 10
    col.eachCell?.({ includeEmpty: false }, (c) => {
      max = Math.max(max, String(c.value ?? '').length + 2)
    })
    col.width = Math.min(max, 60)
  })

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
