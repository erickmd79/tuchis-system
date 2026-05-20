import "./globals.css"
import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "TUCHIS",
  description: "Sistema TUCHIS",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="es">
      <body>

        <nav className="navbar">

          <Link
            href="/"
            className="navbar-brand"
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
            <input
              id="navbar-toggle"
              type="checkbox"
              className="navbar-checkbox"
            />

            <label
              htmlFor="navbar-toggle"
              className="navbar-toggle"
              aria-label="Abrir menú"
            >
              <span />
              <span />
              <span />
            </label>

            <div className="navbar-links">

              <Link href="/">
                Inicio
              </Link>

              <Link href="/catalogo">
                Catálogo
              </Link>

              <Link href="/pedido">
                Pedidos
              </Link>

              <Link href="/admin">
                Admin
              </Link>

            </div>
          </div>

        </nav>

        <main className="app-wrapper">
          {children}
        </main>

      </body>
    </html>
  )
}
