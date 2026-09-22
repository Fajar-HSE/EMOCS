"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
  id: string
  label: string
}

export function CustomerSearchSelect({
  value,
  onChange,
  options,
  placeholder = "Cari atau pilih customer...",
}: {
  value?: string | null
  onChange: (id: string) => void
  options: Option[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value]
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleOpen() {
    setOpen(true)
    setQuery("")
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function selectOption(id: string) {
    onChange(id)
    setOpen(false)
    setQuery("")
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={cn(
          "flex min-h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm cursor-pointer transition hover:bg-accent hover:text-accent-foreground",
          open && "ring-2 ring-ring ring-offset-2",
        )}
        onClick={handleOpen}
        role="combobox"
        aria-expanded={open}
        aria-controls="customer-search-list"
      >
        {selected ? (
          <span className="flex-1 truncate font-medium">{selected.label}</span>
        ) : (
          <span className="flex-1 text-muted-foreground">{placeholder}</span>
        )}
        {selected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
            }}
            className="rounded p-0.5 hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik nama customer..."
            className="w-full rounded px-2 py-1.5 text-sm outline-none"
          />
          <ul id="customer-search-list" role="listbox" className="max-h-52 overflow-auto py-1">
            {filtered.map((opt) => (
              <li
                key={opt.id}
                role="option"
                aria-selected={opt.id === value}
                onClick={() => selectOption(opt.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition",
                  opt.id === value
                    ? "bg-primary/10 font-medium text-primary"
                    : "hover:bg-accent",
                )}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.id === value && <Check className="h-3.5 w-3.5" />}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-2 py-3 text-xs text-muted-foreground">
                Tidak ditemukan. Tambah di menu <strong>Customers</strong>.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
