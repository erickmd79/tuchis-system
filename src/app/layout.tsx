import "./globals.css"
import Navbar from "./components/Navbar"

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

        <Navbar />

        <main className="app-wrapper">
          {children}
        </main>

      </body>
    </html>
  )
}
