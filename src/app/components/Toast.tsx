"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type ToastType = "success" | "error" | "info"
export interface ToastItem { id: number; message: string; type: ToastType }

const CONFIG: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "#DDF5EA", border: "#BFEAD8", text: "#238657", icon: "✓" },
  error:   { bg: "#FFE0DD", border: "#F8C4BE", text: "#C95F67", icon: "✕" },
  info:    { bg: "#D9F5F8", border: "#BEE9E8", text: "#0D8EA0", icon: "✦" },
}

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[]
  onRemove: (id: number) => void
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const c = CONFIG[t.type]
        return (
          <div
            key={t.id}
            style={{
              background: c.bg,
              border: `1.5px solid ${c.border}`,
              borderRadius: 18,
              padding: "12px 16px 12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 220,
              maxWidth: "min(360px, calc(100vw - 48px))",
              boxShadow: "0 8px 28px rgba(0,0,0,0.13)",
              pointerEvents: "auto",
              animation: "toast-in 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            <span style={{ fontWeight: 900, fontSize: 14, color: c.text, flexShrink: 0 }}>
              {c.icon}
            </span>
            <span style={{ fontWeight: 700, fontSize: 13, color: c.text, flex: 1, lineHeight: 1.4 }}>
              {t.message}
            </span>
            <button
              onClick={() => onRemove(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: c.text,
                opacity: 0.5,
                fontWeight: 900,
                fontSize: 18,
                padding: "0 2px",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

let _nextId = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    timers.current.delete(id)
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3200) => {
      const id = ++_nextId
      setToasts((prev) => [...prev.slice(-2), { id, message, type }])
      if (duration > 0) {
        const t = setTimeout(() => removeToast(id), duration)
        timers.current.set(id, t)
      }
    },
    [removeToast]
  )

  useEffect(() => {
    const ts = timers.current
    return () => ts.forEach(clearTimeout)
  }, [])

  return { toasts, addToast, removeToast }
}
