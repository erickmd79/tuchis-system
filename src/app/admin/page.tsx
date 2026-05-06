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

  // ===== LOGO =====
const logo = "/logo.png"
doc.addImage(logo, "PNG", 10, 10, 40, 20)

// ===== TÍTULO (alineado a la base del logo) =====
doc.setFontSize(18)
doc.setFont("helvetica", "bold")
doc.text("COTIZACIÓN", 105, 25, { align: "center" })

// Línea divisoria
doc.line(10, 35, 200, 35)

y = 45

  // ===== CLIENTE =====
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

  // ===== TABLA HEADER =====
  doc.setFont("helvetica", "bold")
  doc.text("Cant.", 10, y)
  doc.text("Producto", 30, y)
  doc.text("Precio", 140, y, { align: "right" })
  doc.text("Total", 190, y, { align: "right" })

  y += 4
  doc.line(10, y, 200, y)

  y += 6

  // ===== PRODUCTOS =====
  doc.setFont("helvetica", "normal")

  pedido.productos.forEach((prod: any) => {
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

  // ===== TOTAL =====
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(`TOTAL: $${pedido.total}`, 190, y, { align: "right" })

  y += 12

  // ===== NOTA =====
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
    <div className="p-10">
      <div className="flex justify-between items-center mb-6">
  <h1 className="text-3xl font-bold">
    Panel Admin
  </h1>

  <button
    onClick={cerrarSesion}
    className="bg-red-600 text-white px-4 py-2 rounded"
  >
    Cerrar sesión
  </button>
</div>
      <h1 className="text-3xl font-bold mb-6">Panel Administrador</h1>

      {pedidos.length === 0 ? (
        <p>No hay pedidos registrados</p>
      ) : (
        <div className="space-y-6">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="border p-4 rounded shadow">
              
              <h2 className="text-xl font-semibold">
                {pedido.cliente}
              </h2>

              <p>Tel: {pedido.telefono}</p>
              <p>Fecha: {pedido.fecha}</p>
              <p>Total: ${pedido.total}</p>
              {pedido.notas && (
  <p className="mt-2">
    <strong>Notas:</strong> {pedido.notas}
  </p>
)}

              <p className="mt-2">
                Estado: <strong>{pedido.estado || "pendiente"}</strong>
              </p>

              {/* BOTONES DE ESTADO */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => actualizarEstado(pedido.id, "pendiente")}
                  className="bg-gray-500 text-white px-3 py-1 rounded"
                >
                  Pendiente
                </button>

                <button
                  onClick={() => actualizarEstado(pedido.id, "anticipo")}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Anticipo
                </button>

                <button
                  onClick={() => actualizarEstado(pedido.id, "pagado")}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Pagado
                </button>

                <button
                  onClick={() => actualizarEstado(pedido.id, "entregado")}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Entregado
                </button>

                <button
  onClick={() => enviarWhatsApp(pedido)}
  className="bg-green-700 text-white px-4 py-2 rounded mt-3"
>
  Enviar por WhatsApp

</button>

<button
  onClick={() => generarPDF(pedido)}
  className="bg-blue-700 text-white px-4 py-2 rounded mt-2"
>
  Descargar PDF
</button>

              </div>

              {/* DETALLE PRODUCTOS */}
              <div className="mt-4">
                <p className="font-semibold">Productos:</p>
                <ul className="list-disc ml-5">
                  {pedido.productos?.map((prod: any, i: number) => (
                    <li key={i}>
                      {prod.nombre} - {prod.cantidad} x ${prod.precio}
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

