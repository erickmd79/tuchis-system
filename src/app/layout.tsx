import "./globals.css"
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

        </nav>

        <main className="app-wrapper">
          {children}
        </main>

      </body>
    </html>
  )
}
