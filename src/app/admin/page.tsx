"use client"

import jsPDF from "jspdf"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Page() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")

  const router = useRouter()

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  useEffect(() => {
    const verificarLogin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

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
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setPedidos(data || [])
    }
  }

  const actualizarEstado = async (id: number, nuevoEstado: string) => {
    const { error } = await supabase
      .from("pedidos")
      .update({ estado: nuevoEstado })
      .eq("id", id)

    if (error) {
      console.error(error)
      return
    }

    setPedidos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, estado: nuevoEstado } : p
      )
    )
  }

  const enviarWhatsApp = (pedido: any) => {
    let mensaje = `Hola, te comparto tu pedido:\n\n`

    mensaje += `Cliente: ${pedido.cliente}\n`
    mensaje += `Fecha: ${pedido.fecha}\n\n`
    mensaje += `Productos:\n`

    pedido.productos?.forEach((prod: any) => {
      mensaje += `- ${prod.nombre} (${prod.cantidad} x $${prod.precio})\n`
    })

    mensaje += `\nTotal: $${pedido.total}`

    const telefonoLimpio = pedido.telefono.replace(/\D/g, "")
    const url = `https://wa.me/52${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`

    window.open(url, "_blank")
  }

  const generarPDF = (pedido: any) => {
    const doc = new jsPDF()
    let y = 15

    const logo = "/logo.png"
    doc.addImage(logo, "PNG", 10, 10, 40, 20)

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("COTIZACIÓN", 105, 25, { align: "center" })

    doc.line(10, 35, 200, 35)
    y = 45

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Datos del cliente", 10, y)

    y += 6
    doc.setFont("helvetica", "normal")
    doc.text(`Nombre: ${pedido.cliente}`, 10, y)

    y += 6
    doc.text(`Teléfono: ${pedido.telefono}`, 10, y)

    y += 6
    doc.text(`Fecha del evento: ${pedido.fecha}`, 10, y)

    y += 10
    doc.line(10, y, 200, y)
    y += 10

    doc.setFont("helvetica", "bold")
    doc.text("Cant.", 10, y)
    doc.text("Producto", 30, y)
    doc.text("Precio", 140, y, { align: "right" })
    doc.text("Total", 190, y, { align: "right" })

    y += 4
    doc.line(10, y, 200, y)
    y += 6

    doc.setFont("helvetica", "normal")

    pedido.productos?.forEach((prod: any) => {
      const totalProd = prod.cantidad * prod.precio

      doc.text(String(prod.cantidad), 10, y)
      doc.text(prod.nombre, 30, y)
      doc.text(`$${prod.precio}`, 140, y, { align: "right" })
      doc.text(`$${totalProd}`, 190, y, { align: "right" })

      y += 7
    })

    y += 5
    doc.line(10, y, 200, y)
    y += 10

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(`TOTAL: $${pedido.total}`, 190, y, { align: "right" })

    y += 12

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("• Aparta tu pedido con anticipo", 10, y)

    y += 5
    doc.text("• Ideal para fiestas y eventos infantiles", 10, y)

    y += 10
    doc.text("Gracias por confiar en TUCHIS", 105, y, { align: "center" })

    doc.save(`TUCHIS_pedido_${pedido.id}.pdf`)
  }

  const hoy = new Date().toISOString().slice(0, 10)

  const totalPedidos = pedidos.length

  const totalVentas = pedidos.reduce(
    (acc, pedido) => acc + Number(pedido.total || 0),
    0
  )

  const pedidosHoy = pedidos.filter(
    (pedido) => pedido.fecha === hoy
  ).length

  const totalPendientes = pedidos.filter(
    (pedido) => pedido.estado === "pendiente"
  ).length

  const totalPagados = pedidos.filter(
    (pedido) => pedido.estado === "pagado"
  ).length

  const productosVendidos: Record<string, number> = {}

  pedidos.forEach((pedido) => {
    pedido.productos?.forEach((producto: any) => {
      productosVendidos[producto.nombre] =
        (productosVendidos[producto.nombre] || 0) +
        Number(producto.cantidad || 0)
    })
  })

  const productosMasVendidos = Object.entries(productosVendidos)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)

  const categoriasUsadas: Record<string, number> = {}

  pedidos.forEach((pedido) => {
    pedido.productos?.forEach((producto: any) => {
      if (producto.categoria) {
        categoriasUsadas[producto.categoria] =
          (categoriasUsadas[producto.categoria] || 0) +
          Number(producto.cantidad || 0)
      }
    })
  })

  const categoriasMasUsadas = Object.entries(categoriasUsadas)
    .map(([categoria, cantidad]) => ({ categoria, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)

  const maxProducto =
    productosMasVendidos[0]?.cantidad || 1

  const maxCategoria =
    categoriasMasUsadas[0]?.cantidad || 1

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const coincideBusqueda =
      pedido.cliente
        ?.toLowerCase()
        .includes(busqueda.toLowerCase()) ||
      pedido.telefono?.includes(busqueda)

    const coincideEstado =
      filtroEstado === "todos" || pedido.estado === filtroEstado

    return coincideBusqueda && coincideEstado
  })

  return (
    <div className="min-h-screen bg-[#FFF8F1] p-8">

      <div className="flex gap-4 mb-8 flex-wrap">
        <Link
          href="/admin"
          className="bg-[#20B8C9] text-white px-6 py-3 rounded-2xl font-bold"
        >
          Pedidos
        </Link>

        <Link
          href="/admin/productos"
          className="bg-[#F7AFAF] text-white px-6 py-3 rounded-2xl font-bold"
        >
          Productos
        </Link>

        <Link
          href="/admin/categorias"
          className="bg-[#F6D36B] text-[#444] px-6 py-3 rounded-2xl font-bold"
        >
          Categorías
        </Link>
      </div>

      <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
        <div>
          <h1 className="text-5xl font-bold text-[#18AFC4]">
            Dashboard TUCHIS
          </h1>

          <p className="text-[#4A4A4A] mt-2">
            Control de pedidos, ventas y productos.
          </p>
        </div>

        <button
          onClick={cerrarSesion}
          className="bg-[#F9958E] text-white px-6 py-3 rounded-2xl font-bold"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">

        <div className="bg-[#BFE4F2] rounded-3xl p-6 shadow-sm">
          <p className="text-sm text-[#4A4A4A] mb-2">
            Total ventas
          </p>

          <h2 className="text-4xl font-bold text-[#18AFC4]">
            ${totalVentas}
          </h2>
        </div>

        <div className="bg-[#F9DDD9] rounded-3xl p-6 shadow-sm">
          <p className="text-sm text-[#4A4A4A] mb-2">
            Pedidos hoy
          </p>

          <h2 className="text-4xl font-bold text-[#F9958E]">
            {pedidosHoy}
          </h2>
        </div>

        <div className="bg-[#F7EBD8] rounded-3xl p-6 shadow-sm">
          <p className="text-sm text-[#4A4A4A] mb-2">
            Total pedidos
          </p>

          <h2 className="text-4xl font-bold text-[#4A4A4A]">
            {totalPedidos}
          </h2>
        </div>

        <div className="bg-[#FFD976] rounded-3xl p-6 shadow-sm">
          <p className="text-sm text-[#4A4A4A] mb-2">
            Pendientes
          </p>

          <h2 className="text-4xl font-bold text-[#4A4A4A]">
            {totalPendientes}
          </h2>
        </div>

        <div className="bg-[#FFFCF8] rounded-3xl p-6 shadow-sm border border-[#F9DDD9]">
          <p className="text-sm text-[#4A4A4A] mb-2">
            Pagados
          </p>

          <h2 className="text-4xl font-bold text-[#18AFC4]">
            {totalPagados}
          </h2>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

        <div className="bg-[#FFFCF8] rounded-3xl p-6 border border-[#F9DDD9] shadow-sm">
          <h2 className="text-2xl font-bold text-[#18AFC4] mb-5">
            Productos más vendidos
          </h2>

          {productosMasVendidos.length === 0 ? (
            <p>No hay datos todavía.</p>
          ) : (
            <div className="space-y-4">
              {productosMasVendidos.map((item) => (
                <div key={item.nombre}>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">
                      {item.nombre}
                    </span>

                    <span>
                      {item.cantidad}
                    </span>
                  </div>

                  <div className="h-4 bg-[#F9DDD9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#18AFC4] rounded-full"
                      style={{
                        width: `${(item.cantidad / maxProducto) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#FFFCF8] rounded-3xl p-6 border border-[#F9DDD9] shadow-sm">
          <h2 className="text-2xl font-bold text-[#F9958E] mb-5">
            Categorías más usadas
          </h2>

          {categoriasMasUsadas.length === 0 ? (
            <p>No hay datos todavía.</p>
          ) : (
            <div className="space-y-4">
              {categoriasMasUsadas.map((item) => (
                <div key={item.categoria}>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">
                      {item.categoria}
                    </span>

                    <span>
                      {item.cantidad}
                    </span>
                  </div>

                  <div className="h-4 bg-[#BFE4F2] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F9958E] rounded-full"
                      style={{
                        width: `${(item.cantidad / maxCategoria) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="Buscar cliente o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 px-5 py-4 rounded-2xl border border-[#F9DDD9] bg-white outline-none"
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-5 py-4 rounded-2xl border border-[#F9DDD9] bg-white outline-none"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="anticipo">Anticipos</option>
          <option value="pagado">Pagados</option>
          <option value="entregado">Entregados</option>
        </select>
      </div>

      {pedidosFiltrados.length === 0 ? (
        <p className="text-lg">
          No hay pedidos registrados.
        </p>
      ) : (
        <div className="space-y-8">
          {pedidosFiltrados.map((pedido) => (
            <div
              key={pedido.id}
              className="bg-[#FFFCF8] rounded-3xl p-6 border border-[#F9DDD9] shadow-sm"
            >
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#18AFC4]">
                    {pedido.cliente}
                  </h2>

                  <p className="mt-2">
                    📞 {pedido.telefono}
                  </p>

                  <p>
                    📅 {pedido.fecha}
                  </p>

                  <p className="font-semibold mt-2 text-lg">
                    Total: ${pedido.total}
                  </p>

                  {pedido.notas && (
                    <p className="mt-3">
                      <strong>Notas:</strong> {pedido.notas}
                    </p>
                  )}
                </div>

                <span
                  className={`px-4 py-2 rounded-full text-white text-sm font-semibold
                  ${
                    pedido.estado === "pendiente"
                      ? "bg-gray-500"
                      : pedido.estado === "anticipo"
                      ? "bg-[#FFD976] text-[#4A4A4A]"
                      : pedido.estado === "pagado"
                      ? "bg-[#18AFC4]"
                      : pedido.estado === "entregado"
                      ? "bg-[#F9958E]"
                      : "bg-gray-700"
                  }`}
                >
                  {pedido.estado || "pendiente"}
                </span>
              </div>

              <div className="flex gap-3 mt-6 flex-wrap">
                <button
                  onClick={() => actualizarEstado(pedido.id, "pendiente")}
                  className="bg-[#F9DDD9] px-5 py-3 rounded-2xl font-semibold"
                >
                  Pendiente
                </button>

                <button
                  onClick={() => actualizarEstado(pedido.id, "anticipo")}
                  className="bg-[#FFD976] px-5 py-3 rounded-2xl font-semibold"
                >
                  Anticipo
                </button>

                <button
                  onClick={() => actualizarEstado(pedido.id, "pagado")}
                  className="bg-[#18AFC4] text-white px-5 py-3 rounded-2xl font-semibold"
                >
                  Pagado
                </button>

                <button
                  onClick={() => actualizarEstado(pedido.id, "entregado")}
                  className="bg-[#F9958E] text-white px-5 py-3 rounded-2xl font-semibold"
                >
                  Entregado
                </button>

                <button
                  onClick={() => enviarWhatsApp(pedido)}
                  className="bg-[#A8D5BA] text-[#2E5E4E] px-5 py-3 rounded-2xl font-semibold"
                >
                  WhatsApp
                </button>

                <button
                  onClick={() => generarPDF(pedido)}
                  className="bg-[#F7B7C3] text-[#7A3E4D] px-5 py-3 rounded-2xl font-semibold"
                >
                  Descargar PDF
                </button>
              </div>

              <div className="mt-6 bg-[#FFF8F1] rounded-3xl p-5">
                <p className="font-bold text-[#18AFC4] mb-3">
                  Productos
                </p>

                <ul className="space-y-2">
                  {pedido.productos?.map((prod: any, i: number) => (
                    <li
                      key={i}
                      className="bg-white rounded-2xl px-4 py-3 border border-[#F9DDD9]"
                    >
                      {prod.nombre} — {prod.cantidad} x ${prod.precio}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
