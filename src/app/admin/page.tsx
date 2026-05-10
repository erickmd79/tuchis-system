"use client"

import jsPDF from "jspdf"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Page() {
  const [pedidos, setPedidos] = useState<any[]>([])
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
  }, [])

  useEffect(() => {
    const obtenerPedidos = async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("id", { ascending: false })

      if (error) {
        console.error(error)
      } else {
        setPedidos(data)
      }
    }

    obtenerPedidos()
  }, [])

  const actualizarEstado = async (
    id: number,
    nuevoEstado: string
  ) => {
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
        p.id === id
          ? { ...p, estado: nuevoEstado }
          : p
      )
    )
  }

  const enviarWhatsApp = (pedido: any) => {
    let mensaje = `Hola, te comparto tu pedido:\n\n`

    mensaje += `Cliente: ${pedido.cliente}\n`
    mensaje += `Fecha: ${pedido.fecha}\n\n`

    mensaje += `Productos:\n`

    pedido.productos.forEach((prod: any) => {
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

    pedido.productos.forEach((prod: any) => {
      const totalProd = prod.cantidad * prod.precio

      doc.text(String(prod.cantidad), 10, y)
      doc.text(prod.nombre, 30, y)

      doc.text(`$${prod.precio}`, 140, y, {
        align: "right",
      })

      doc.text(`$${totalProd}`, 190, y, {
        align: "right",
      })

      y += 7
    })

    y += 5
    doc.line(10, y, 200, y)

    y += 10

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(`TOTAL: $${pedido.total}`, 190, y, {
      align: "right",
    })

    y += 12

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")

    doc.text(
      "• Aparta tu pedido con anticipo",
      10,
      y
    )

    y += 5

    doc.text(
      "• Ideal para fiestas y eventos infantiles",
      10,
      y
    )

    y += 10

    doc.text(
      "Gracias por confiar en TUCHIS",
      105,
      y,
      { align: "center" }
    )

    doc.save(`TUCHIS_pedido_${pedido.id}.pdf`)
  }

  return (
    <div className="min-h-screen bg-[#FFF8F1] p-8">

      <div className="flex justify-between items-center mb-10">
        <h1 className="text-5xl font-bold text-[#18AFC4]">
          Panel Administrador
        </h1>

        <button
          onClick={cerrarSesion}
          className="btn-coral"
        >
          Cerrar sesión
        </button>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-lg">
          No hay pedidos registrados
        </p>
      ) : (
        <div className="space-y-8">
          {pedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="card-soft border border-[#F9DDD9]"
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
                      <strong>Notas:</strong>{" "}
                      {pedido.notas}
                    </p>
                  )}
                </div>

                <div>
                  <span
                    className={`px-4 py-2 rounded-full text-white text-sm font-semibold
                    ${
                      pedido.estado === "pendiente"
                        ? "bg-gray-500"
                        : pedido.estado === "anticipo"
                        ? "bg-yellow-500"
                        : pedido.estado === "pagado"
                        ? "bg-[#18AFC4]"
                        : pedido.estado === "entregado"
                        ? "bg-green-600"
                        : "bg-gray-700"
                    }`}
                  >
                    {pedido.estado || "pendiente"}
                  </span>
                </div>

              </div>

              <div className="flex gap-3 mt-6 flex-wrap">

                <button
                  onClick={() =>
                    actualizarEstado(
                      pedido.id,
                      "pendiente"
                    )
                  }
                  className="btn-soft"
                >
                  Pendiente
                </button>

                <button
                  onClick={() =>
                    actualizarEstado(
                      pedido.id,
                      "anticipo"
                    )
                  }
                  className="btn-yellow"
                >
                  Anticipo
                </button>

                <button
                  onClick={() =>
                    actualizarEstado(
                      pedido.id,
                      "pagado"
                    )
                  }
                  className="btn-primary"
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
                  className="btn-coral"
                >
                  Entregado
                </button>

                <button
                  onClick={() =>
                    enviarWhatsApp(pedido)
                  }
                  className="bg-[#A8D5BA] text-[#2E5E4E] px-5 py-3 rounded-2xl font-semibold"
                >
                  WhatsApp
                </button>

                <button
                  onClick={() =>
                    generarPDF(pedido)
                  }
                  className="bg-[#F7B7C3] text-[#7A3E4D] px-5 py-3 rounded-2xl font-semibold"
                >
                  Descargar PDF
                </button>

              </div>

              <div className="mt-6 bg-[#FFFCF8] rounded-3xl p-5">
                <p className="font-bold text-[#18AFC4] mb-3">
                  Productos
                </p>

                <ul className="space-y-2">
                  {pedido.productos?.map(
                    (prod: any, i: number) => (
                      <li
                        key={i}
                        className="bg-white rounded-2xl px-4 py-3 border border-[#F9DDD9]"
                      >
                        {prod.nombre} —{" "}
                        {prod.cantidad} x $
                        {prod.precio}
                      </li>
                    )
                  )}
                </ul>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
