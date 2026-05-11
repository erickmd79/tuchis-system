"use client"

import jsPDF from "jspdf"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Page() {

  const [pedidos, setPedidos] =
    useState<any[]>([])

  const [busqueda, setBusqueda] =
    useState("")

  const [filtroEstado, setFiltroEstado] =
    useState("todos")

  const [menuAbierto, setMenuAbierto] =
    useState(false)

  const router = useRouter()

  const cerrarSesion = async () => {

    await supabase.auth.signOut()

    router.push("/login")
  }

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

  useEffect(() => {
    obtenerPedidos()
  }, [])

  const obtenerPedidos = async () => {

    const { data, error } =
      await supabase
        .from("pedidos")
        .select("*")
        .order("id", {
          ascending: false
        })

    if (!error && data) {
      setPedidos(data)
    }
  }

  const actualizarEstado = async (
    id: number,
    nuevoEstado: string
  ) => {

    const { error } =
      await supabase
        .from("pedidos")
        .update({
          estado: nuevoEstado
        })
        .eq("id", id)

    if (!error) {

      setPedidos((prev) =>
        prev.map((pedido) =>

          pedido.id === id
            ? {
                ...pedido,
                estado: nuevoEstado
              }
            : pedido
        )
      )
    }
  }

  const enviarWhatsApp = (
    pedido: any
  ) => {

    let mensaje =
      `Hola ${pedido.cliente} 👋\n\n`

    mensaje +=
      `Te compartimos tu pedido TUCHIS:\n\n`

    pedido.productos?.forEach(
      (prod: any) => {

        mensaje +=
          `• ${prod.nombre}\n`

        mensaje +=
          `${prod.cantidad} x $${prod.precio}\n\n`
      }
    )

    mensaje +=
      `TOTAL: $${pedido.total}`

    const url =
      `https://wa.me/52${pedido.telefono}?text=${encodeURIComponent(mensaje)}`

    window.open(url, "_blank")
  }

  const generarPDF = (
    pedido: any
  ) => {

    const doc = new jsPDF()

    doc.setFontSize(24)

    doc.text(
      "TUCHIS",
      20,
      25
    )

    doc.setFontSize(14)

    doc.text(
      `Cliente: ${pedido.cliente}`,
      20,
      45
    )

    doc.text(
      `Teléfono: ${pedido.telefono}`,
      20,
      55
    )

    doc.text(
      `Fecha: ${pedido.fecha}`,
      20,
      65
    )

    let y = 90

    pedido.productos?.forEach(
      (prod: any) => {

        doc.text(
          `${prod.nombre} (${prod.cantidad})`,
          20,
          y
        )

        doc.text(
          `$${prod.precio}`,
          160,
          y
        )

        y += 12
      }
    )

    y += 15

    doc.setFontSize(18)

    doc.text(
      `TOTAL: $${pedido.total}`,
      20,
      y
    )

    doc.save(
      `pedido-${pedido.id}.pdf`
    )
  }

  const totalVentas =
    pedidos.reduce(
      (acc, pedido) =>
        acc + Number(pedido.total),
      0
    )

  const pedidosHoy =
    pedidos.filter((pedido) => {

      const hoy =
        new Date()
          .toISOString()
          .split("T")[0]

      return pedido.fecha === hoy
    }).length

  const totalPendientes =
    pedidos.filter(
      (pedido) =>
        pedido.estado ===
        "pendiente"
    ).length

  const totalPagados =
    pedidos.filter(
      (pedido) =>
        pedido.estado ===
        "pagado"
    ).length

  const pedidosFiltrados =
    pedidos.filter((pedido) => {

      const coincideBusqueda =
        pedido.cliente
          ?.toLowerCase()
          .includes(
            busqueda.toLowerCase()
          )

      const coincideEstado =
        filtroEstado === "todos" ||
        pedido.estado ===
          filtroEstado

      return (
        coincideBusqueda &&
        coincideEstado
      )
    })

  return (

    <div className="min-h-screen bg-[#FFF8F5]">

      {menuAbierto && (

        <div
          onClick={() =>
            setMenuAbierto(false)
          }
          className="fixed inset-0
          bg-black/40 z-40"
        />

      )}

      <div
        className={`fixed top-0 left-0
        h-full w-[280px]
        bg-white z-50
        shadow-2xl
        p-6 transition-all duration-300

        ${
          menuAbierto
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        <div className="flex justify-between items-center mb-10">

          <h2 className="text-3xl font-black text-[#20B8C9]">
            TUCHIS
          </h2>

          <button
            onClick={() =>
              setMenuAbierto(false)
            }
            className="text-3xl"
          >
            ×
          </button>

        </div>

        <div className="flex flex-col gap-4">

          <Link
            href="/admin"
            className="bg-[#20B8C9]
            text-white px-5 py-4
            rounded-2xl font-bold"
          >
            Dashboard
          </Link>

          <Link
            href="/admin/productos"
            className="bg-[#F49B93]
            text-white px-5 py-4
            rounded-2xl font-bold"
          >
            Productos
          </Link>

          <Link
            href="/admin/categorias"
            className="bg-[#FFD56B]
            text-[#444] px-5 py-4
            rounded-2xl font-bold"
          >
            Categorías
          </Link>

          <button
            onClick={cerrarSesion}
            className="bg-black
            text-white px-5 py-4
            rounded-2xl font-bold"
          >
            Cerrar sesión
          </button>

        </div>

      </div>

      <div className="px-4 md:px-8 py-6">

        <div className="flex items-center justify-between mb-8">

          <div className="flex items-center gap-4">

            <button
              onClick={() =>
                setMenuAbierto(true)
              }
              className="bg-white
              w-14 h-14 rounded-2xl
              shadow-lg text-3xl"
            >
              ☰
            </button>

            <div>

              <h1 className="text-3xl md:text-6xl font-black text-[#20B8C9] leading-none">
                Dashboard
              </h1>

              <p className="text-gray-500 mt-2">
                Panel administrativo
              </p>

            </div>

          </div>

        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">

          <div className="bg-[#BEE9E8]
          rounded-[30px] p-5">

            <p className="text-sm">
              Total ventas
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-2">
              ${totalVentas}
            </h2>

          </div>

          <div className="bg-[#FFD6D6]
          rounded-[30px] p-5">

            <p className="text-sm">
              Pedidos hoy
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-2">
              {pedidosHoy}
            </h2>

          </div>

          <div className="bg-[#FFF0B8]
          rounded-[30px] p-5">

            <p className="text-sm">
              Pendientes
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-2">
              {totalPendientes}
            </h2>

          </div>

          <div className="bg-[#D7F5E8]
          rounded-[30px] p-5">

            <p className="text-sm">
              Pagados
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-2">
              {totalPagados}
            </h2>

          </div>

        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">

          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={(e) =>
              setBusqueda(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl border bg-white"
          />

          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(
                e.target.value
              )
            }
            className="w-full md:w-[250px]
            p-4 rounded-2xl border bg-white"
          >

            <option value="todos">
              Todos
            </option>

            <option value="pendiente">
              Pendiente
            </option>

            <option value="pagado">
              Pagado
            </option>

            <option value="entregado">
              Entregado
            </option>

          </select>

        </div>

        <div className="space-y-6">

          {pedidosFiltrados.map(
            (pedido) => (

              <div
                key={pedido.id}
                className="bg-white
                rounded-[32px]
                border border-[#F8D6D0]
                p-5 md:p-7"
              >

                <div className="flex flex-col xl:flex-row xl:justify-between gap-5">

                  <div>

                    <h2 className="text-2xl md:text-3xl font-black text-[#20B8C9]">
                      {pedido.cliente}
                    </h2>

                    <p className="mt-3">
                      📞 {pedido.telefono}
                    </p>

                    <p className="mt-1">
                      📅 {pedido.fecha}
                    </p>

                    <p className="text-3xl font-black text-[#F49B93] mt-5">
                      ${pedido.total}
                    </p>

                  </div>

                  <div className="flex flex-wrap gap-3">

                    <button
                      onClick={() =>
                        actualizarEstado(
                          pedido.id,
                          "pendiente"
                        )
                      }
                      className="bg-[#FFE7C5]
                      px-5 py-4 rounded-2xl
                      font-bold"
                    >
                      Pendiente
                    </button>

                    <button
                      onClick={() =>
                        actualizarEstado(
                          pedido.id,
                          "pagado"
                        )
                      }
                      className="bg-[#BEE9E8]
                      px-5 py-4 rounded-2xl
                      font-bold"
                    >
                      Pagado
                    </button>

                    <button
                      onClick={() =>
                        actualizarEstado(
                          pedido.id,
                          "entregado"
                        )
                      }
                      className="bg-[#FFD6D6]
                      px-5 py-4 rounded-2xl
                      font-bold"
                    >
                      Entregado
                    </button>

                    <button
                      onClick={() =>
                        enviarWhatsApp(
                          pedido
                        )
                      }
                      className="bg-[#C9EACF]
                      px-5 py-4 rounded-2xl
                      font-bold"
                    >
                      WhatsApp
                    </button>

                    <button
                      onClick={() =>
                        generarPDF(
                          pedido
                        )
                      }
                      className="bg-[#F7B7C3]
                      px-5 py-4 rounded-2xl
                      font-bold"
                    >
                      PDF
                    </button>

                  </div>

                </div>

                <div className="mt-7">

                  <h3 className="font-black text-xl mb-4">
                    Productos
                  </h3>

                  <div className="space-y-3">

                    {pedido.productos?.map(
                      (
                        prod: any,
                        index: number
                      ) => (

                        <div
                          key={index}
                          className="bg-[#FFF8F5]
                          rounded-2xl p-4
                          flex justify-between
                          items-center"
                        >

                          <div>

                            <p className="font-bold">
                              {prod.nombre}
                            </p>

                            <p className="text-sm text-gray-500">
                              {prod.cantidad} x ${prod.precio}
                            </p>

                          </div>

                          <p className="font-black text-[#20B8C9] text-xl">
                            $
                            {prod.cantidad *
                              prod.precio}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      </div>

    </div>
  )
}
