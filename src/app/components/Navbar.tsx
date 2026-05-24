"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

const leerProductosCarrito = () => {
  if (typeof window === "undefined") return 0

  try {
    const carrito = JSON.parse(
      localStorage.getItem("carrito") || "[]"
    )

    return Array.isArray(carrito)
      ? carrito.length
      : 0
  } catch {
    return 0
  }
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [productosCarrito, setProductosCarrito] =
    useState(0)
  const [badgeKey, setBadgeKey] = useState(0)
  const prevCount = useRef(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const adminRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const actualizarContador = () =>
      setProductosCarrito(leerProductosCarrito())

    actualizarContador()

    window.addEventListener(
      "storage",
      actualizarContador
    )
    window.addEventListener(
      "tuchis:cart-updated",
      actualizarContador
    )

    return () => {
      window.removeEventListener(
        "storage",
        actualizarContador
      )
      window.removeEventListener(
        "tuchis:cart-updated",
        actualizarContador
      )
    }
  }, [])

  useEffect(() => {
    if (productosCarrito > prevCount.current) {
      setBadgeKey((k) => k + 1)
    }
    prevCount.current = productosCarrito
  }, [productosCarrito])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setIsAdmin(!!session) }
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!adminOpen) return
    const handler = (e: MouseEvent) => {
      if (
        adminRef.current &&
        !adminRef.current.contains(e.target as Node)
      ) {
        setAdminOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [adminOpen])

  const abrirCarrito = () => {
    setMenuAbierto(false)

    if (pathname === "/catalogo") {
      window.dispatchEvent(
        new Event("tuchis:open-cart")
      )
      return
    }

    window.location.href = "/catalogo?abrirCarrito=1"
  }

  const cerrarMenu = () => setMenuAbierto(false)

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    setAdminOpen(false)
    cerrarMenu()
    router.replace("/login")
  }

  return (
    <nav className="navbar">
      <Link
        href="/"
        className="navbar-brand"
        onClick={cerrarMenu}
      >
        <Image
          src="/logo.png"
          alt="TUCHIS alcancías"
          width={148}
          height={70}
          priority
          className="navbar-logo"
        />
      </Link>

      <div className="navbar-menu">
        <button
          type="button"
          className="navbar-toggle"
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          onClick={() =>
            setMenuAbierto(!menuAbierto)
          }
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className={`navbar-links ${
            menuAbierto ? "is-open" : ""
          }`}
        >
          <Link
            href="/"
            onClick={cerrarMenu}
          >
            Inicio
          </Link>

          <Link
            href="/catalogo"
            onClick={cerrarMenu}
          >
            Catálogo
          </Link>

          <Link
            href="/mis-pedidos"
            onClick={cerrarMenu}
          >
            Mis pedidos
          </Link>

          {isAdmin ? (
            <>
              {/* Desktop: dropdown trigger (hidden on mobile) */}
              <div
                ref={adminRef}
                className="relative hidden lg:block"
              >
                <button
                  type="button"
                  onClick={() => setAdminOpen(!adminOpen)}
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#20B8C9",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Admin ▾
                </button>
                {adminOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 bg-white rounded-2xl
                               border border-[#F4D4CF] shadow-lg p-2 min-w-[160px] z-50
                               flex flex-col gap-1"
                  >
                    <Link
                      href="/admin"
                      onClick={() => {
                        setAdminOpen(false)
                        cerrarMenu()
                      }}
                      className="block px-4 py-2 rounded-xl font-bold text-[#20B8C9]
                                 hover:bg-[#D9F5F8] transition text-sm"
                    >
                      Panel admin
                    </Link>
                    <button
                      type="button"
                      onClick={cerrarSesion}
                      className="block w-full text-left px-4 py-2 rounded-xl font-bold
                                 text-red-500 hover:bg-[#FFD6D6] transition text-sm"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile: flat entries inside hamburger (hidden on desktop) */}
              <Link
                href="/admin"
                onClick={cerrarMenu}
                className="lg:hidden"
              >
                Panel admin
              </Link>
              <button
                type="button"
                onClick={cerrarSesion}
                className="lg:hidden"
                style={{
                  width: "100%",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#ef4444",
                  background: "none",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link href="/login" onClick={cerrarMenu}>
              Admin
            </Link>
          )}
        </div>
      </div>

      <button
        type="button"
        className="navbar-cart"
        aria-label="Abrir carrito"
        onClick={abrirCarrito}
      >
        <span className="navbar-cart-icon">
          🛒
        </span>
        {productosCarrito > 0 && (
          <span key={badgeKey} className="navbar-cart-badge badge-pop">
            {productosCarrito}
          </span>
        )}
      </button>
    </nav>
  )
}
