"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import AdminLogoutBtn from "./AdminLogoutBtn"

const NAV_LINKS = [
  { href: "/admin",            label: "Dashboard",  bg: "#FFE4EC" },
  { href: "/pedido",           label: "Pedidos",    bg: "#FFD8C2" },
  { href: "/admin/productos",  label: "Productos",  bg: "#FFECA8" },
  { href: "/admin/categorias", label: "Categorías", bg: "#BFF3DF" },
  { href: "/admin/tamanos",    label: "Tamaños",    bg: "#EFE9FF" },
  { href: "/admin/escalas",    label: "Escalas",    bg: "#C8E9FF" },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:block w-full lg:w-[280px] lg:flex-shrink-0">
      <div className="bg-white rounded-[32px] border border-[#F4D4CF] shadow-sm p-6 lg:sticky lg:top-28">
        <h1 className="text-4xl md:text-5xl font-black text-[#FF5C8A]">TUCHIS</h1>
        <p className="text-gray-500 mt-2 text-base">Admin Panel</p>
        <div className="mt-8 flex flex-col gap-4">
          {NAV_LINKS.map(({ href, label, bg }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-5 py-4 rounded-2xl text-center transition hover:opacity-90 ${
                  isActive
                    ? "font-black ring-2 ring-inset ring-black/15"
                    : "font-bold"
                }`}
                style={{ background: bg, color: "#3F334A" }}
              >
                {label}
              </Link>
            )
          })}
          <AdminLogoutBtn />
        </div>
      </div>
    </aside>
  )
}
