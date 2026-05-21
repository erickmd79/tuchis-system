"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

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
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [productosCarrito, setProductosCarrito] =
    useState(0)

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
            href="/pedido"
            onClick={cerrarMenu}
          >
            Pedidos
          </Link>

          <Link
            href="/admin"
            onClick={cerrarMenu}
          >
            Admin
          </Link>
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
          <span className="navbar-cart-badge">
            {productosCarrito}
          </span>
        )}
      </button>
    </nav>
  )
}
