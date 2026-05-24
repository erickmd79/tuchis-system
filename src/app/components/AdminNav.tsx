"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

const ALL_TABS = [
  { href: "/admin",            icon: "📊", label: "Dashboard"  },
  { href: "/pedido",           icon: "📋", label: "Pedidos"    },
  { href: "/admin/productos",  icon: "📦", label: "Productos"  },
  { href: "/admin/categorias", icon: "🏷️", label: "Categorías" },
  { href: "/admin/tamanos",    icon: "📏", label: "Tamaños"    },
  { href: "/admin/escalas",    icon: "💰", label: "Escalas"    },
]

export default function AdminNav() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => setIsAdmin(!!session)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (!isAdmin) return null

  return (
    <>
      {/* Spacer: empuja el contenido sobre la barra fija (solo mobile) */}
      <div aria-hidden className="h-[76px] lg:hidden" />

      {/* ── Barra inferior mobile (< lg) ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden
                   bg-white border-t border-[#F4D4CF]
                   shadow-[0_-2px_20px_rgba(0,0,0,0.08)]"
      >
        <div className="flex h-[76px]">
          {ALL_TABS.map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1 gap-[3px]
                         text-[#20B8C9] hover:bg-[#F0FAFA] active:bg-[#D9F5F8] transition
                         px-0.5"
            >
              <span className="text-[22px] leading-none">{icon}</span>
              <span className="text-[9px] font-bold tracking-wide leading-none">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
