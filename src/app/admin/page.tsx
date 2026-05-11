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
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />

      )}

      <aside
        className={`
        fixed lg:sticky top-0 left-0
        h-screen w-[280px]
        bg-white border-r border-[#F8D6D0]
        z-50 transition-transform duration-300
        overflow-y-auto

        ${
          menuAbierto
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }
        `}
      >

        <div className="p-6">

          <div className="flex items-center justify-between">

            <div>

              <h1 className="text-4xl font-black text-[#20B8C9]">
                TUCHIS
              </h1>

              <p className="text-gray-500 mt-1 text-sm">
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

          <div className="mt-10 flex flex-col gap-4">

            <Link
              href="/admin"
              className="bg-[#20B8C9]
              text-white px-5 py-4
              rounded-2xl font-bold"
            >
              📊 Dashboard
            </Link>

            <Link
              href="/admin/productos"
              className="bg-[#F9DDD9]
              px-5 py-4 rounded-2xl
              font-bold"
            >
              🧸 Productos
            </Link>

            <Link
              href="/admin/categorias"
              className="bg-[#FFF0B8]
              px-5 py-4 rounded-2xl
              font-bold"
            >
              🏷️ Categorías
            </Link>

            <Link
              href="/catalogo"
              className="bg-[#BEE9E8]
              px-5 py-4 rounded-2xl
              font-bold"
            >
              🛒 Ver catálogo
            </Link>

            <button
              onClick={cerrarSesion}
              className="bg-black text-white
              px-5 py-4 rounded-2xl
              font-bold mt-6"
            >
              🚪 Cerrar sesión
            </button>

          </div>

        </div>

      </aside>

      <main className="flex-1 min-w-0">

        <div className="max-w-[1600px] mx-auto p-4 md:p-8">

          <div className="flex items-center gap-4 mb-8">

            <button
              onClick={() =>
                setMenuAbierto(true)
              }
              className="lg:hidden
              bg-white border border-[#F8D6D0]
              w-14 h-14 rounded-2xl
              text-3xl shrink-0"
            >
              ☰
            </button>

            <div className="min-w-0">

              <h1 className="text-4xl md:text-6xl font-black text-[#20B8C9] leading-none break-words">
                Dashboard
              </h1>

              <p className="text-gray-500 mt-2">
                Bienvenido al panel TUCHIS
              </p>

            </div>

          </div>

          <div className="
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
          gap-5
          ">

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

          <div className="
          mt-10
          grid
          grid-cols-1
          xl:grid-cols-2
          gap-6
          ">

            <div className="bg-white
            rounded-[32px]
            border border-[#F8D6D0]
            p-6 md:p-8">

              <h2 className="text-2xl md:text-3xl font-black text-[#20B8C9]">
                Productos más vendidos
              </h2>

              <div className="mt-6 space-y-5">

                <div>

                  <div className="flex justify-between mb-2">

                    <p className="font-bold">
                      Unicornio
                    </p>

                    <p className="font-black">
                      20
                    </p>

                  </div>

                  <div className="w-full h-4 bg-[#F8D6D0] rounded-full overflow-hidden">

                    <div className="h-full w-[70%] bg-[#20B8C9]" />

                  </div>

                </div>

              </div>

            </div>

            <div className="bg-white
            rounded-[32px]
            border border-[#F8D6D0]
            p-6 md:p-8">

              <h2 className="text-2xl md:text-3xl font-black text-[#F49B93]">
                Categorías más usadas
              </h2>

              <div className="mt-6 space-y-5">

                <div>

                  <div className="flex justify-between mb-2">

                    <p className="font-bold">
                      Animales
                    </p>

                    <p className="font-black">
                      35
                    </p>

                  </div>

                  <div className="w-full h-4 bg-[#FFE7C5] rounded-full overflow-hidden">

                    <div className="h-full w-[85%] bg-[#F49B93]" />

                  </div>

                </div>

              </div>

            </div>

          </div>

          <div className="
          mt-10
          bg-white
          rounded-[32px]
          border border-[#F8D6D0]
          p-6 md:p-8
          ">

            <h2 className="text-2xl md:text-3xl font-black text-[#20B8C9]">
              Actividad reciente
            </h2>

            <div className="mt-6 space-y-4">

              <div className="bg-[#FFF8F5]
              rounded-2xl p-5">

                <p className="font-bold">
                  Pedido nuevo recibido
                </p>

                <p className="text-gray-500 mt-1 text-sm">
                  Hace unos minutos
                </p>

              </div>

              <div className="bg-[#FFF8F5]
              rounded-2xl p-5">

                <p className="font-bold">
                  Producto actualizado
                </p>

                <p className="text-gray-500 mt-1 text-sm">
                  Hace 1 hora
                </p>

              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  )
}
