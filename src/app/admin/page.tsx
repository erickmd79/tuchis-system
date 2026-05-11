"use client"

import Link from "next/link"

export default function AdminPage() {

  return (
    <div className="min-h-screen bg-[#FFF9F7]">

      {/* HEADER */}

      <div className="w-full bg-black text-white sticky top-0 z-50">

        <div className="max-w-7xl mx-auto px-4 py-4 flex gap-8 overflow-x-auto">

          <Link href="/">
            <span className="font-bold whitespace-nowrap">
              Inicio
            </span>
          </Link>

          <Link href="/catalogo">
            <span className="font-bold whitespace-nowrap">
              Catálogo
            </span>
          </Link>

          <Link href="/pedido">
            <span className="font-bold whitespace-nowrap">
              Pedido
            </span>
          </Link>

          <Link href="/admin">
            <span className="font-bold whitespace-nowrap text-cyan-400">
              Admin
            </span>
          </Link>

        </div>

      </div>

      {/* MAIN */}

      <div className="max-w-7xl mx-auto p-4 md:p-8">

        {/* TOP */}

        <div className="flex flex-col lg:flex-row gap-8">

          {/* SIDEBAR */}

          <aside className="w-full lg:w-[280px] flex-shrink-0">

            <div className="bg-white rounded-[32px] border border-[#F4D4CF] shadow-sm p-6 sticky top-28">

              <h1 className="text-5xl font-black text-cyan-500">
                TUCHIS
              </h1>

              <p className="text-gray-500 mt-2">
                Admin Panel
              </p>

              <div className="mt-8 flex flex-col gap-4">

                <Link
                  href="/admin"
                  className="bg-cyan-500 text-white px-5 py-4 rounded-2xl font-bold text-center"
                >
                  📊 Dashboard
                </Link>

                <Link
                  href="/admin/productos"
                  className="bg-[#FFE0DD] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center"
                >
                  🧸 Productos
                </Link>

                <Link
                  href="/admin/categorias"
                  className="bg-[#FFE9A8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center"
                >
                  🗂 Categorías
                </Link>

                <Link
                  href="/catalogo"
                  className="bg-[#D9F5F8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center"
                >
                  🛒 Ver catálogo
                </Link>

              </div>

            </div>

          </aside>

          {/* CONTENT */}

          <main className="flex-1 min-w-0">

            {/* TITULO */}

            <div className="mb-10">

              <h2 className="text-5xl md:text-7xl font-black text-cyan-500 leading-none">
                Dashboard
              </h2>

              <p className="text-gray-500 text-lg mt-3">
                Bienvenido al panel administrativo TUCHIS
              </p>

            </div>

            {/* STATS */}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

              <div className="rounded-[32px] p-8 bg-[#D9F5F8]">
                <h3 className="text-gray-700 text-xl font-semibold">
                  Total ventas
                </h3>

                <p className="text-5xl font-black mt-4">
                  $12,450
                </p>
              </div>

              <div className="rounded-[32px] p-8 bg-[#FFE0E0]">
                <h3 className="text-gray-700 text-xl font-semibold">
                  Pedidos hoy
                </h3>

                <p className="text-5xl font-black mt-4">
                  24
                </p>
              </div>

              <div className="rounded-[32px] p-8 bg-[#FFF0B8]">
                <h3 className="text-gray-700 text-xl font-semibold">
                  Pendientes
                </h3>

                <p className="text-5xl font-black mt-4">
                  8
                </p>
              </div>

              <div className="rounded-[32px] p-8 bg-[#DDF5EA]">
                <h3 className="text-gray-700 text-xl font-semibold">
                  Pagados
                </h3>

                <p className="text-5xl font-black mt-4">
                  16
                </p>
              </div>

            </div>

            {/* GRID */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-10">

              {/* MÁS VENDIDOS */}

              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-8">

                <h3 className="text-4xl font-black text-cyan-500 mb-8">
                  Productos más vendidos
                </h3>

                <div className="space-y-6">

                  <div>

                    <div className="flex justify-between mb-2 font-bold">
                      <span>Unicornio</span>
                      <span>20</span>
                    </div>

                    <div className="h-5 rounded-full bg-[#FFE0DD] overflow-hidden">

                      <div className="bg-cyan-500 h-full w-[75%]" />

                    </div>

                  </div>

                  <div>

                    <div className="flex justify-between mb-2 font-bold">
                      <span>Capibara</span>
                      <span>15</span>
                    </div>

                    <div className="h-5 rounded-full bg-[#FFE0DD] overflow-hidden">

                      <div className="bg-[#FFB84D] h-full w-[60%]" />

                    </div>

                  </div>

                </div>

              </div>

              {/* CATEGORIAS */}

              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-8">

                <h3 className="text-4xl font-black text-[#F08C8C] mb-8">
                  Categorías más usadas
                </h3>

                <div className="space-y-6">

                  <div>

                    <div className="flex justify-between mb-2 font-bold">
                      <span>Animales</span>
                      <span>35</span>
                    </div>

                    <div className="h-5 rounded-full bg-[#FFF0B8] overflow-hidden">

                      <div className="bg-[#F08C8C] h-full w-[85%]" />

                    </div>

                  </div>

                  <div>

                    <div className="flex justify-between mb-2 font-bold">
                      <span>Disney</span>
                      <span>18</span>
                    </div>

                    <div className="h-5 rounded-full bg-[#FFF0B8] overflow-hidden">

                      <div className="bg-[#FFD166] h-full w-[55%]" />

                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* ACTIVIDAD */}

            <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-8 mt-8">

              <h3 className="text-4xl font-black text-cyan-500 mb-8">
                Actividad reciente
              </h3>

              <div className="space-y-6">

                <div className="border-b border-[#F4D4CF] pb-4">

                  <p className="font-bold text-lg">
                    Pedido nuevo recibido
                  </p>

                  <p className="text-gray-500">
                    Hace unos minutos
                  </p>

                </div>

                <div className="border-b border-[#F4D4CF] pb-4">

                  <p className="font-bold text-lg">
                    Producto actualizado
                  </p>

                  <p className="text-gray-500">
                    Hace 1 hora
                  </p>

                </div>

              </div>

            </div>

          </main>

        </div>

      </div>

    </div>
  )
}
