"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function Page() {
  const [carrito, setCarrito] = useState<any[]>([])
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [fecha, setFecha] = useState("")
  const [notas, setNotas] = useState("")
  const [imagen, setImagen] = useState<File | null>(null)

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("carrito") || "[]")
    setCarrito(data)
  }, [])

  const total = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  )

  // 🔥 FUNCIÓN PARA GUARDAR EN SUPABASE
 const guardarPedido = async (pedido: any) => {
   let imagenUrl = ""
   if (imagen) {

  const nombreArchivo =
    `${Date.now()}-${imagen.name}`

  const { error: uploadError } =
    await supabase.storage
      .from("productos")
      .upload(nombreArchivo, imagen)

  if (!uploadError) {

    const { data } = supabase.storage
      .from("productos")
      .getPublicUrl(nombreArchivo)

    imagenUrl = data.publicUrl
  }
}
  const { error } = await supabase.from("pedidos").insert([
    {
      cliente: pedido.cliente,
      telefono: pedido.telefono,
      fecha: pedido.fecha,
      notas: pedido.notas,

      productos: pedido.productos.map((p: any) => ({
        nombre: p.nombre,
        precio: p.precio,
        cantidad: p.cantidad
      })),

      total: pedido.total,
      estado: "pendiente",
      imagen: imagenUrl,
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
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Tu Pedido</h1>

      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <textarea
          placeholder="Notas del pedido"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <div className="mt-4">
  <label className="block mb-2 font-semibold">
    Imagen de referencia
  </label>

  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      if (e.target.files?.[0]) {
        setImagen(e.target.files[0])
      }
    }}
    className="w-full bg-white p-3 rounded-2xl border"
  />
</div>
      </div>

      {carrito.length === 0 ? (
        <p>No hay productos en el pedido</p>
      ) : (
        <div className="space-y-4">
          {carrito.map((item, index) => (
            <div key={index} className="border p-4 rounded">
              <h2 className="text-xl font-semibold">{item.nombre}</h2>
              <p>
                {item.cantidad} x ${item.precio} = $
                {item.precio * item.cantidad}
              </p>
            </div>
          ))}

          <div className="mt-6 text-2xl font-bold">
            Total: ${total}
          </div>

          <button
            onClick={generarPedido}
            className="mt-6 bg-green-600 text-white px-6 py-3 rounded"
          >
            Generar Pedido
          </button>
        </div>
      )}
    </div>
  )
}
