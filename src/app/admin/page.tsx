"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Page() {

  const [menuAbierto, setMenuAbierto] =
    useState(false)

  const router = useRouter()

  useEffect(() => {

    const verificarLogin = async () => {

      const {
        data: { session },
      } =
        await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
      }
    }

    verificarLogin()

  }, [router])

  const cerrarSesion = async () => {

    await supabase.auth.signOut()

    router.push("/login")
  }

  return (

    <div className="min-h-screen bg-[#FFF8F5] flex">

      {menuAbierto && (

        <div
          onClick={() =>
            setMenuAbierto(false)
          }
          className="fixed inset-0
          bg-black/40 z-40 lg:hidden"
        />

      )}

      <aside
        className={`fixed lg:static top-0 left-0
        h-full w-[290px]
        bg-white border-r border-[#F8D6D0]
        z-50 transition-all duration-300
        shadow-2xl lg:shadow-none

        ${
          menuAbierto
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >

        <div className="p-7">

          <div className="flex items-center justify-between">

            <div>

              <h1 className="text-4xl font-black text-[#20B8C9]">
                TUCHIS
              </h1>

              <p className="text-gray-500 mt-1">
                Admin Panel
              </p>

            </div>

            <button
              onClick={() =>
                setMenuAbierto(false)
              }
              className="lg:hidden text-3xl"
            >
              ×
            </button>

          </div>

          <div className="mt-12 flex flex-col gap-4">

            <Link
              href="/admin"
              className="bg-[#20B8C9]
              text-white px-5 py-5
              rounded-2xl font-bold
              flex items-center gap-4"
            >
              📊 Dashboard
            </Link>

            <Link
              href="/admin/productos"
              className="bg-[#F9DDD9]
              px-5 py-5 rounded-2xl
              font-bold flex items-center gap-4"
            >
              🧸 Productos
            </Link>

            <Link
              href="/admin/categorias"
              className="bg-[#FFF0B8]
              px-5 py-5 rounded-2xl
              font-bold flex items-center gap-4"
            >
              🏷️ Categorías
            </Link>

            <Link
              href="/catalogo"
              className="bg-[#BEE9E8]
              px-5 py-5 rounded-2xl
              font-bold flex items-center gap-4"
            >
              🛒 Ver catálogo
            </Link>

            <button
              onClick={cerrarSesion}
              className="bg-black text-white
              px-5 py-5 rounded-2xl
              font-bold flex items-center gap-4 mt-5"
            >
              🚪 Cerrar sesión
            </button>

          </div>

        </div>

      </aside>

      <main className="flex-1">

        <div className="p-4 md:p-8">

          <div className="flex items-center gap-4 mb-8">

            <button
              onClick={() =>
                setMenuAbierto(true)
              }
              className="lg:hidden
              bg-white shadow-lg
              w-14 h-14 rounded-2xl
              text-3xl"
            >
              ☰
            </button>

            <div>

              <h1 className="text-4xl md:text-6xl font-black text-[#20B8C9] leading-none">
                Dashboard
              </h1>

              <p className="text-gray-500 mt-2">
                Bienvenido al panel TUCHIS
              </p>

            </div>

          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">

            <div className="bg-[#BEE9E8]
            rounded-[30px] p-6">

              <p className="text-sm">
                Total ventas
              </p>

              <h2 className="text-4xl font-black mt-3">
                $0
              </h2>

            </div>

            <div className="bg-[#FFD6D6]
            rounded-[30px] p-6">

              <p className="text-sm">
                Pedidos hoy
              </p>

              <h2 className="text-4xl font-black mt-3">
                0
              </h2>

            </div>

            <div className="bg-[#FFF0B8]
            rounded-[30px] p-6">

              <p className="text-sm">
                Pendientes
              </p>

              <h2 className="text-4xl font-black mt-3">
                0
              </h2>

            </div>

            <div className="bg-[#D7F5E8]
            rounded-[30px] p-6">

              <p className="text-sm">
                Pagados
              </p>

              <h2 className="text-4xl font-black mt-3">
                0
              </h2>

            </div>

          </div>

          <div className="mt-10 bg-white
          rounded-[32px]
          border border-[#F8D6D0]
          p-8">

            <h2 className="text-3xl font-black text-[#20B8C9]">
              Panel administrativo
            </h2>

            <p className="text-gray-500 mt-3">
              Aquí aparecerán los pedidos,
              gráficas y estadísticas.
            </p>

          </div>

        </div>

      </main>

    </div>
  )
}
