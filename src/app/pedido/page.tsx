"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function Page() {
  const [carrito, setCarrito] = useState<any[]>([])
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [fecha, setFecha] = useState("")
  const [notas, setNotas] = useState("")

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("carrito") || "[]")
    setCarrito(data)
  }, [])

  const total = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  )

  // 🔥 GUARDAR PEDIDO EN SUPABASE
  const guardarPedido = async (pedido: any) => {
    const { error } = await supabase.from("pedidos").insert([
      {
        cliente: pedido.cliente,
        telefono: pedido.telefono,
        fecha: pedido.fecha,
        notas: pedido.notas,

        productos: pedido.productos.map((p: any) => ({
          nombre: p.nombre,
          precio: p.precio,
          cantidad: p.cantidad,
        })),

        total: pedido.total,
        estado: "pendiente",
      },
    ])

    if (error) {
      alert(JSON.stringify(error))
      alert("Error al guardar pedido")
      return false
    }

    return true
  }

  // 🔥 GENERAR PEDIDO
  const generarPedido = async () => {
    if (!nombre || !telefono || !fecha) {
      alert("Faltan datos del cliente")
      return
    }

    const pedido = {
      cliente: nombre,
      telefono,
      fecha,
      notas,
      productos: carrito,
      total,
    }

    const ok = await guardarPedido(pedido)

    if (!ok) return

    // Limpiar carrito
    localStorage.removeItem("carrito")
    setCarrito([])

    alert("Pedido guardado correctamente")
  }

  return (
    <div className="p-10 bg-[#FFFDF8] min-h-screen">
      <h1 className="text-4xl font-bold mb-6 text-[#27B6C7]">
        Tu Pedido
      </h1>

      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border border-[#FFD9D4] p-3 rounded-2xl bg-white"
        />

        <input
          type="text"
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="w-full border border-[#FFD9D4] p-3 rounded-2xl bg-white"
        />

        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full border border-[#FFD9D4] p-3 rounded-2xl bg-white"
        />

        <textarea
          placeholder="Notas del pedido"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="w-full border border-[#FFD9D4] p-3 rounded-2xl bg-white"
        />
      </div>

      {carrito.length === 0 ? (
        <p className="text-gray-500">
          No hay productos en el pedido
        </p>
      ) : (
        <div className="space-y-4">
          {carrito.map((item, index) => (
            <div
              key={index}
              className="bg-white border border-[#FFD9D4] p-5 rounded-3xl shadow-sm"
            >
              <h2 className="text-2xl font-bold text-[#27B6C7]">
                {item.nombre}
              </h2>

              <p className="text-lg mt-2 text-gray-700">
                {item.cantidad} x ${item.precio} = $
                {item.precio * item.cantidad}
              </p>
            </div>
          ))}

          <div className="mt-6 text-3xl font-bold text-[#F59AA3]">
            Total: ${total}
          </div>

          <button
            onClick={generarPedido}
            className="mt-6 bg-[#27B6C7] hover:bg-[#1fa3b3] text-white px-8 py-4 rounded-2xl text-xl font-bold transition"
          >
            Generar Pedido
          </button>
        </div>
      )}
    </div>
  )
}
