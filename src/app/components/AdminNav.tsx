"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

const LINKS_PRINCIPALES = [
  { href: "/admin",            label: "Dashboard" },
  { href: "/pedido",           label: "Pedidos"   },
  { href: "/admin/productos",  label: "Productos" },
  { href: "/admin/categorias", label: "Categorías"},
  { href: "/admin/tamanos",    label: "Tamaños"   },
  { href: "/admin/escalas",    label: "Escalas"   },
]

const TABS_MOBILE = [
  { href: "/admin",           icon: "📊", label: "Dashboard" },
  { href: "/pedido",          icon: "📋", label: "Pedidos"   },
  { href: "/admin/productos", icon: "📦", label: "Productos" },
  { href: "/catalogo",        icon: "🛍️", label: "Catálogo"  },
]

const MAS_MOBILE = [
  { href: "/admin/categorias", icon: "🏷️", label: "Categorías" },
  { href: "/admin/tamanos",    icon: "📏", label: "Tamaños"    },
  { href: "/admin/escalas",    icon: "💰", label: "Escalas"    },
]

export default function AdminNav() {
  const router = useRouter()
  const [isAdmin, setIsAdmin]       = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [masOpen, setMasOpen]       = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => setIsAdmin(!!session)
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!desktopOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setDesktopOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [desktopOpen])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    setMasOpen(false)
    setDesktopOpen(false)
    router.replace("/login")
  }

  if (!isAdmin) return null

  return (
    <>
      {/* Spacer: empuja el contenido sobre la barra fija (solo mobile) */}
      <div aria-hidden className="h-20 lg:hidden" />

      {/* ── Barra inferior mobile (< lg) ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden
                   bg-white border-t border-[#F4D4CF]
                   shadow-[0_-2px_20px_rgba(0,0,0,0.08)]"
      >
        <div className="flex h-[68px]">

          {TABS_MOBILE.map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1 gap-1
                         text-[#20B8C9] hover:bg-[#F0FAFA] active:bg-[#D9F5F8] transition"
            >
              <span className="text-[22px] leading-none">{icon}</span>
              <span className="text-[9px] font-bold tracking-wide leading-none">
                {label}
              </span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setMasOpen(true)}
            className="flex flex-col items-center justify-center flex-1 gap-1
                       text-[#20B8C9] hover:bg-[#F0FAFA] active:bg-[#D9F5F8] transition"
          >
            <span className="text-[18px] font-black leading-none tracking-tighter">···</span>
            <span className="text-[9px] font-bold tracking-wide leading-none">Más</span>
          </button>

        </div>
      </nav>

      {/* ── Sheet "Más" ── */}
      {masOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/30 lg:hidden"
            onClick={() => setMasOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden
                          bg-white rounded-t-[28px] border-t border-[#F4D4CF]
                          shadow-2xl px-4 pb-10 pt-4">
            <div className="w-10 h-1 rounded-full bg-[#F4D4CF] mx-auto mb-5" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-3">
              Admin Panel
            </p>
            <div className="space-y-1">
              {MAS_MOBILE.map(({ href, icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMasOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl
                             font-bold text-base text-[#20B8C9]
                             hover:bg-[#F0FAFA] transition"
                >
                  <span className="text-xl">{icon}</span>
                  {label}
                </Link>
              ))}
              <div className="border-t border-[#F4D4CF] my-1" />
              <button
                type="button"
                onClick={cerrarSesion}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl
                           font-bold text-base text-red-600 w-full
                           hover:bg-[#FFD6D6] transition"
              >
                <span className="text-xl">🚪</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Panel flotante desktop (lg+) ── */}
      <div
        ref={panelRef}
        className="hidden lg:block fixed bottom-8 right-6 z-50"
      >
        {desktopOpen && (
          <div
            className="absolute bottom-full right-0 mb-3 w-52
                       bg-white rounded-[24px] border border-[#F4D4CF]
                       shadow-2xl overflow-hidden"
          >
            <div className="px-4 pt-4 pb-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                Admin Panel
              </p>
            </div>
            <div className="p-2 space-y-0.5">
              {LINKS_PRINCIPALES.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDesktopOpen(false)}
                  className="block px-3 py-2.5 rounded-xl font-bold text-sm
                             text-[#20B8C9] hover:bg-[#F0FAFA] transition"
                >
                  {label}
                </Link>
              ))}
              <div className="border-t border-[#F4D4CF] my-1 mx-1" />
              <button
                type="button"
                onClick={cerrarSesion}
                className="w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm
                           text-red-600 hover:bg-[#FFD6D6] transition"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setDesktopOpen(!desktopOpen)}
          className="flex items-center gap-2 bg-[#20B8C9] hover:bg-[#17A7B8]
                     text-white px-5 py-3 rounded-2xl font-bold
                     shadow-lg hover:shadow-xl transition-all"
        >
          <span>⚙</span>
          <span>Admin</span>
          <span className="text-xs opacity-70 ml-1">
            {desktopOpen ? "▾" : "▴"}
          </span>
        </button>
      </div>
    </>
  )
}
