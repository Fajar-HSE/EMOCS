// Minimal RFC4180-ish CSV parser/writer — deliberately dependency-free.
// (The obvious alternative, the `xlsx` npm package, currently ships
// unpatched high-severity prototype-pollution/ReDoS advisories with no fix
// available, so participant bulk import/export uses CSV instead — Excel
// opens and saves CSV natively, so this doesn't cost real functionality.)

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ""
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      pushField()
    } else if (c === "\n") {
      pushRow()
    } else if (c === "\r") {
      // skip, \n handles the row break
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) pushRow()

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0))
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map((cell) => csvEscape(cell == null ? "" : String(cell))).join(",")).join("\r\n")
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
