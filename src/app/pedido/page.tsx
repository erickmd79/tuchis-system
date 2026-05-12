"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function Page() {

  const [carrito, setCarrito] = useState<any[]>([])
  const [pedidos, setPedidos] = useState<any[]>([])
  const [pedidoEditando, setPedidoEditando] =
  useState<any>(null)

  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [fecha, setFecha] = useState("")
  const [notas, setNotas] = useState("")

  useEffect(() => {

    const data =
      JSON.parse(
        localStorage.getItem("carrito") || "[]"
      )

    setCarrito(data)

    obtenerPedidos()

  }, [])

  const obtenerPedidos = async () => {

    const { data } =
      await supabase
        .from("pedidos")
        .select("*")
        .order("id", { ascending: false })

    if (data) setPedidos(data)
  }

  const total = carrito.reduce(
    (acc, item) =>
      acc + item.precio * item.cantidad,
    0
  )

  const guardarPedido = async (pedido: any) => {

    const { error } =
      await supabase
        .from("pedidos")
        .insert([
          {
            cliente: pedido.cliente,
            telefono: pedido.telefono,
            fecha: pedido.fecha,
            notas: pedido.notas,

            productos:
              pedido.productos.map((p: any) => ({
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

    const ok =
      await guardarPedido(pedido)

    if (!ok) return

    localStorage.removeItem("carrito")

    setCarrito([])

    setNombre("")
    setTelefono("")
    setFecha("")
    setNotas("")

    obtenerPedidos()

    alert("Pedido guardado correctamente")
  }

  const eliminarPedido = async (id: number) => {

  const confirmar =
    confirm("¿Eliminar pedido?")

  if (!confirmar) return

  await supabase
    .from("pedidos")
    .delete()
    .eq("id", id)

  obtenerPedidos()
}
  const cambiarEstado = async (
    id: number,
    estado: string
  ) => {

    await supabase
      .from("pedidos")
      .update({ estado })
      .eq("id", id)

    obtenerPedidos()
  }

  const enviarWhatsApp = (pedido: any) => {

    const productos =
      pedido.productos
        .map(
          (p: any) =>
            `• ${p.nombre} x${p.cantidad}`
        )
        .join("%0A")

    const mensaje =
      `Hola ${pedido.cliente}%0A%0A` +
      `Tu pedido:%0A${productos}%0A%0A` +
      `Total: $${pedido.total}`

    window.open(
      `https://wa.me/52${pedido.telefono}?text=${mensaje}`,
      "_blank"
    )
  }

  const generarPDF = (pedido: any) => {

    const contenido =
      `
      PEDIDO TUCHIS

      Cliente:
      ${pedido.cliente}

      Teléfono:
      ${pedido.telefono}

      Fecha:
      ${pedido.fecha}

      -----------------------

      ${pedido.productos
        .map(
          (p: any) =>
            `${p.nombre}
             x${p.cantidad}
             $${p.precio}`
        )
        .join("\n\n")}

      -----------------------

      TOTAL:
      $${pedido.total}
      `

    const ventana =
      window.open("", "_blank")

    if (!ventana) return

    ventana.document.write(`
      <pre style="
        font-size:18px;
        padding:40px;
        font-family:sans-serif;
      ">
${contenido}
      </pre>
    `)

    ventana.print()
  }

  return (

    <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

  <h1 className="page-title">
    Pedidos
  </h1>

  <button
    onClick={() => window.location.href = "/catalogo"}
    className="
      bg-cyan-500
      hover:bg-cyan-600
      text-white
      px-6
      py-4
      rounded-2xl
      font-black
      text-lg
      shadow-lg
      transition
    "
  >
    + Nuevo pedido
  </button>

</div>

      <div className="section-card">

        <h2 className="text-3xl font-black text-cyan-600 mb-8">
          Nuevo pedido
        </h2>

        <div className="space-y-5">

          <input
            type="text"
            placeholder="Nombre del cliente"
            value={nombre}
            onChange={(e) =>
              setNombre(e.target.value)
            }
            className="input-premium"
          />

          <input
            type="text"
            placeholder="Teléfono"
            value={telefono}
            onChange={(e) =>
              setTelefono(e.target.value)
            }
            className="input-premium"
          />

          <input
            type="date"
            value={fecha}
            onChange={(e) =>
              setFecha(e.target.value)
            }
            className="input-premium"
          />

          <textarea
            placeholder="Notas del pedido"
            value={notas}
            onChange={(e) =>
              setNotas(e.target.value)
            }
            className="input-premium min-h-[120px]"
          />

        </div>

        {carrito.length > 0 && (

          <div className="mt-8 space-y-4">

            {carrito.map((item, index) => (

              <div
                key={index}
                className="bg-white rounded-3xl border border-[#FFD9D4] p-5"
              >

                <h3 className="text-2xl font-black text-cyan-600">
                  {item.nombre}
                </h3>

                <p className="mt-2 text-zinc-600">
                  {item.cantidad}
                  {" x "}
                  ${item.precio}
                </p>

              </div>
            ))}

            <div className="text-4xl font-black text-rose-300 mt-8">
              Total: ${total}
            </div>

            <button
              onClick={generarPedido}
              className="btn-primary mt-4"
            >
              Generar pedido
            </button>

          </div>
        )}

      </div>

      <div className="section-card">

        <h2 className="text-3xl font-black text-cyan-600 mb-8">
          Pedidos guardados
        </h2>

        <div className="space-y-6">

          {pedidos.map((pedido: any) => (

            <div
              key={pedido.id}
              className="bg-white border border-[#FFD9D4] rounded-[28px] p-6 shadow-sm"
            >

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                <div>

                  <h3 className="text-3xl font-black text-cyan-600">
                    {pedido.cliente}
                  </h3>

                  <p className="text-zinc-500 mt-2">
                    {pedido.telefono}
                  </p>

                  <p className="text-zinc-500">
                    {pedido.fecha}
                  </p>

                  <div className="mt-5 space-y-2">

                    {pedido.productos?.map(
                      (p: any, index: number) => (

                        <div
                          key={index}
                          className="text-zinc-700"
                        >
                          • {p.nombre}
                          {" x "}
                          {p.cantidad}
                        </div>
                      )
                    )}

                  </div>

                  <div className="text-4xl font-black text-rose-300 mt-6">
                    ${pedido.total}
                  </div>

                </div>

                <div className="flex flex-col gap-3 min-w-[220px]">

                  <button
                    onClick={() =>
                      cambiarEstado(
                        pedido.id,
                        "pendiente"
                      )
                    }
                    className={`
                      py-3 rounded-2xl font-bold
                      ${
                        pedido.estado === "pendiente"
                          ? "bg-yellow-300"
                          : "bg-zinc-100"
                      }
                    `}
                  >
                    Pendiente
                  </button>

                  <button
                    onClick={() =>
                      cambiarEstado(
                        pedido.id,
                        "pagado"
                      )
                    }
                    className={`
                      py-3 rounded-2xl font-bold
                      ${
                        pedido.estado === "pagado"
                          ? "bg-green-300"
                          : "bg-zinc-100"
                      }
                    `}
                  >
                    Pagado
                  </button>

                  <button
                    onClick={() =>
                      cambiarEstado(
                        pedido.id,
                        "entregado"
                      )
                    }
                    className={`
                      py-3 rounded-2xl font-bold
                      ${
                        pedido.estado === "entregado"
                          ? "bg-cyan-300"
                          : bg-[#CDB4DB]
                      }
                    `}
                  >
                    Entregado
                  </button>

                  <button
                    onClick={() =>
                      enviarWhatsApp(pedido)
                    }
                    className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-bold transition"
                  >
                    WhatsApp
                  </button>

                  <button
                    onClick={() =>
                      generarPDF(pedido)
                    }
                    className="bg-rose-400 hover:bg-rose-500 text-white py-3 rounded-2xl font-bold transition"
                  >
                    PDF
                  </button>

                  <button
  onClick={() =>
    setPedidoEditando(pedido)
  }
  className="
    bg-cyan-500
    hover:bg-cyan-600
    text-white
    py-3
    rounded-2xl
    font-bold
    transition
  "
>
  Editar
</button>

<button
  onClick={() =>
    eliminarPedido(pedido.id)
  }
  className="
    bg-red-500
    hover:bg-red-600
    text-white
    py-3
    rounded-2xl
    font-bold
    transition
  "
>
  Eliminar
</button>

                </div>

              </div>

            </div>
          ))}

        </div>

      </div>
{pedidoEditando && (

  <div className="
    fixed inset-0 z-50
    bg-black/50
    backdrop-blur-sm
    flex items-center justify-center
    p-4
  ">

    <div className="
      bg-white
      w-full
      max-w-3xl
      rounded-[32px]
      p-8
      shadow-2xl
      max-h-[90vh]
      overflow-y-auto
    ">

      <div className="
        flex items-center justify-between
        mb-8
      ">

        <h2 className="
          text-4xl
          font-black
          text-cyan-600
        ">
          Editar pedido
        </h2>

        <button
          onClick={() =>
            setPedidoEditando(null)
          }
          className="
            text-4xl
            text-zinc-400
          "
        >
          ×
        </button>

      </div>

      <div className="space-y-5">

        <input
          type="text"
          value={pedidoEditando.cliente}
          onChange={(e) =>
            setPedidoEditando({
              ...pedidoEditando,
              cliente: e.target.value,
            })
          }
          className="input-premium"
        />

        <input
          type="text"
          value={pedidoEditando.telefono}
          onChange={(e) =>
            setPedidoEditando({
              ...pedidoEditando,
              telefono: e.target.value,
            })
          }
          className="input-premium"
        />

        <input
          type="date"
          value={pedidoEditando.fecha}
          onChange={(e) =>
            setPedidoEditando({
              ...pedidoEditando,
              fecha: e.target.value,
            })
          }
          className="input-premium"
        />

        <textarea
          value={pedidoEditando.notas || ""}
          onChange={(e) =>
            setPedidoEditando({
              ...pedidoEditando,
              notas: e.target.value,
            })
          }
          className="
            input-premium
            min-h-[120px]
          "
        />

      </div>

      <button
        onClick={async () => {

          const { error } =
            await supabase
              .from("pedidos")
              .update({
                cliente:
                  pedidoEditando.cliente,

                telefono:
                  pedidoEditando.telefono,

                fecha:
                  pedidoEditando.fecha,

                notas:
                  pedidoEditando.notas,
              })
              .eq("id", pedidoEditando.id)

          if (error) {

            alert("Error actualizando")
            return
          }

          alert("Pedido actualizado")

          setPedidoEditando(null)

          obtenerPedidos()
        }}
        className="
          btn-primary
          mt-8
        "
      >
        Guardar cambios
      </button>

      </div>

    </div>

  )}
    </div>
  )
}
