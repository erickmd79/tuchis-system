"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

const MODALIDADES = [
  "Blanca",
  "Pintada",
  "Kit",
  "Evento",
]

const numero = (valor: any) =>
  Number(valor || 0)

const obtenerPrecioMenudeo = (producto: any) =>
  numero(producto.precio_menudeo ?? producto.precio)

const obtenerPrecioMayoreo = (producto: any) =>
  numero(producto.precio_mayoreo ?? producto.precio)

const obtenerMinimoMayoreo = (producto: any) =>
  numero(producto.minimo_mayoreo)

const obtenerPrecioPorCantidad = (
  producto: any,
  cantidad: number
) => {
  const minimoMayoreo =
    obtenerMinimoMayoreo(producto)

  const precioMayoreo =
    obtenerPrecioMayoreo(producto)

  if (
    minimoMayoreo > 0 &&
    cantidad >= minimoMayoreo &&
    precioMayoreo > 0
  ) {
    return precioMayoreo
  }

  return obtenerPrecioMenudeo(producto)
}

const calcularTotalProductos = (
  productos: any[] = []
) =>
  productos.reduce(
    (acc, item) =>
      acc +
      numero(item.precio) *
        numero(item.cantidad),
    0
  )

export default function Page() {

  const [carrito, setCarrito] = useState<any[]>([])
  const [pedidos, setPedidos] = useState<any[]>([])
  const [productosDisponibles, setProductosDisponibles] =
    useState<any[]>([])
  const [pedidoEditando, setPedidoEditando] =
  useState<any>(null)
  const [productoParaAgregar, setProductoParaAgregar] =
    useState("")

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
    obtenerProductos()

  }, [])

  const obtenerPedidos = async () => {

    const { data } =
      await supabase
        .from("pedidos")
        .select("*")
        .order("id", { ascending: false })

    if (data) setPedidos(data)
  }

  const obtenerProductos = async () => {

    const { data } =
      await supabase
        .from("productos")
        .select("*")
        .order("nombre")

    if (data) setProductosDisponibles(data)
  }

  const total =
    calcularTotalProductos(carrito)

  const actualizarModalidadCarrito = (
    index: number,
    modalidad: string
  ) => {

    const actualizado =
      carrito.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              modalidad,
            }
          : item
      )

    setCarrito(actualizado)

    localStorage.setItem(
      "carrito",
      JSON.stringify(actualizado)
    )
  }

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
                producto_id: p.producto_id ?? p.id,
                nombre: p.nombre,
                precio: p.precio,
                cantidad: p.cantidad,
                modalidad: p.modalidad,
                precio_menudeo: p.precio_menudeo,
                precio_mayoreo: p.precio_mayoreo,
                minimo_mayoreo: p.minimo_mayoreo,
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

    if (carrito.length === 0) {

      alert("Agrega productos al pedido")
      return
    }

    const faltaModalidad =
      carrito.some(
        (item) => !item.modalidad
      )

    if (faltaModalidad) {

      alert("Selecciona la modalidad de todos los productos")
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

  const { error } = await supabase
    .from("pedidos")
    .update({
      estado,
    })
    .eq("id", id)

  if (error) {
    console.log(error)
    alert("Error actualizando estado")
    return
  }

  await obtenerPedidos()
}

  const prepararProductoPedido = (
    producto: any,
    cantidad = 1
  ) => ({
    producto_id: producto.producto_id ?? producto.id,
    nombre: producto.nombre,
    cantidad,
    modalidad: producto.modalidad || "",
    precio_menudeo:
      producto.precio_menudeo ??
      producto.precio,
    precio_mayoreo:
      producto.precio_mayoreo ??
      producto.precio,
    minimo_mayoreo:
      producto.minimo_mayoreo || 0,
    precio:
      obtenerPrecioPorCantidad(
        producto,
        cantidad
      ),
  })

  const abrirEditorPedido = (pedido: any) => {

    setProductoParaAgregar("")

    setPedidoEditando({
      ...pedido,
      estado: pedido.estado || "pendiente",
      productos: Array.isArray(pedido.productos)
        ? pedido.productos.map((producto: any) => ({
            ...producto,
            cantidad: numero(producto.cantidad) || 1,
            precio: numero(producto.precio),
            modalidad: producto.modalidad || "",
          }))
        : [],
    })
  }

  const actualizarProductoPedido = (
    index: number,
    cambios: any,
    recalcularPrecio = false
  ) => {

    if (!pedidoEditando) return

    const productos =
      (pedidoEditando.productos || []).map(
        (producto: any, productoIndex: number) => {

          if (productoIndex !== index) {
            return producto
          }

          const actualizado = {
            ...producto,
            ...cambios,
          }

          if (recalcularPrecio) {
            actualizado.precio =
              obtenerPrecioPorCantidad(
                actualizado,
                numero(actualizado.cantidad)
              )
          }

          return actualizado
        }
      )

    setPedidoEditando({
      ...pedidoEditando,
      productos,
      total: calcularTotalProductos(productos),
    })
  }

  const quitarProductoPedido = (
    index: number
  ) => {

    if (!pedidoEditando) return

    const productos =
      (pedidoEditando.productos || []).filter(
        (_: any, productoIndex: number) =>
          productoIndex !== index
      )

    setPedidoEditando({
      ...pedidoEditando,
      productos,
      total: calcularTotalProductos(productos),
    })
  }

  const agregarProductoPedido = () => {

    if (!pedidoEditando || !productoParaAgregar) {
      return
    }

    const producto =
      productosDisponibles.find(
        (item) =>
          String(item.id) === productoParaAgregar
      )

    if (!producto) return

    const productos = [
      ...(pedidoEditando.productos || []),
      prepararProductoPedido(producto),
    ]

    setPedidoEditando({
      ...pedidoEditando,
      productos,
      total: calcularTotalProductos(productos),
    })

    setProductoParaAgregar("")
  }

  const enviarWhatsApp = (pedido: any) => {

    const productos =
      pedido.productos
        .map(
          (p: any) =>
            `• ${p.nombre} (${p.modalidad || "Sin modalidad"}) x${p.cantidad}`
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

  const folio =
    `TCH-${pedido.id}`

  const fechaActual =
    new Date().toLocaleDateString()

  const productosHTML =
    pedido.productos
      .map(
        (p: any) => `

        <div style="
          display:flex;
          gap:20px;
          align-items:center;
          background:white;
          border-radius:24px;
          padding:20px;
          margin-bottom:18px;
          border:1px solid #F5D3CD;
        ">

          ${
            p.imagen
              ? `
                <img
                  src="${p.imagen}"
                  style="
                    width:90px;
                    height:90px;
                    object-fit:cover;
                    border-radius:20px;
                  "
                />
              `
              : ""
          }

          <div style="flex:1;">

            <h3 style="
              margin:0;
              color:#27B6C7;
              font-size:24px;
              font-weight:900;
            ">
              ${p.nombre}
            </h3>

            <p style="
              margin:8px 0;
              color:#666;
              font-size:16px;
            ">
              ${p.modalidad || "Sin modalidad"}
            </p>

            <p style="
              margin:0;
              font-size:18px;
              font-weight:bold;
            ">
              ${p.cantidad} x $${p.precio}
            </p>

          </div>

        </div>
      `
      )
      .join("")

  const ventana =
    window.open("", "_blank")

  if (!ventana) return

  ventana.document.write(`

    <html>

      <head>

        <title>
          Pedido ${folio}
        </title>

      </head>

      <body style="
        margin:0;
        padding:0;
        background:#FFF7F5;
        font-family:Arial, sans-serif;
      ">

        <div style="
          max-width:900px;
          margin:auto;
          padding:50px;
        ">

          <!-- HEADER -->

          <div style="
            background:linear-gradient(
              135deg,
              #27B6C7,
              #F8B4C0
            );

            border-radius:40px;
            padding:50px;
            color:white;
            margin-bottom:40px;
          ">

            <h1 style="
              margin:0;
              font-size:64px;
              font-weight:900;
            ">
              TUCHIS
            </h1>

            <p style="
              margin-top:10px;
              font-size:24px;
            ">
              Pedido premium
            </p>

          </div>

          <!-- INFO -->

          <div style="
            background:white;
            border-radius:32px;
            padding:35px;
            margin-bottom:30px;
            border:1px solid #F5D3CD;
          ">

            <div style="
              display:grid;
              grid-template-columns:
                repeat(2,1fr);
              gap:20px;
            ">

              <div>

                <p style="
                  color:#999;
                  margin:0 0 8px 0;
                ">
                  Cliente
                </p>

                <h2 style="
                  margin:0;
                  color:#27B6C7;
                ">
                  ${pedido.cliente}
                </h2>

              </div>

              <div>

                <p style="
                  color:#999;
                  margin:0 0 8px 0;
                ">
                  Teléfono
                </p>

                <h2 style="margin:0;">
                  ${pedido.telefono}
                </h2>

              </div>

              <div>

                <p style="
                  color:#999;
                  margin:0 0 8px 0;
                ">
                  Fecha
                </p>

                <h2 style="margin:0;">
                  ${pedido.fecha}
                </h2>

              </div>

              <div>

                <p style="
                  color:#999;
                  margin:0 0 8px 0;
                ">
                  Folio
                </p>

                <h2 style="
                  margin:0;
                  color:#F59AA3;
                ">
                  ${folio}
                </h2>

              </div>

            </div>

          </div>

          <!-- PRODUCTOS -->

          <div>

            ${productosHTML}

          </div>

          <!-- TOTAL -->

          <div style="
            background:#27B6C7;
            color:white;
            border-radius:32px;
            padding:40px;
            margin-top:40px;
            text-align:center;
          ">

            <p style="
              margin:0;
              font-size:24px;
            ">
              Total
            </p>

            <h2 style="
              margin:10px 0 0 0;
              font-size:64px;
              font-weight:900;
            ">
              $${pedido.total}
            </h2>

          </div>

          <!-- WHATSAPP -->

          <div style="
            text-align:center;
            margin-top:40px;
          ">

            <a
              href="
                https://wa.me/52${pedido.telefono}
              "
              style="
                display:inline-block;
                background:#25D366;
                color:white;
                text-decoration:none;
                padding:18px 32px;
                border-radius:20px;
                font-size:20px;
                font-weight:bold;
              "
            >
              WhatsApp
            </a>

          </div>

          <!-- FOOTER -->

          <div style="
            text-align:center;
            margin-top:50px;
            color:#999;
          ">

            Generado el
            ${fechaActual}

          </div>

        </div>

      </body>

    </html>
  `)

  ventana.document.close()

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

                <select
                  value={item.modalidad || ""}
                  onChange={(e) =>
                    actualizarModalidadCarrito(
                      index,
                      e.target.value
                    )
                  }
                  className="input-premium mt-4"
                >

                  <option value="">
                    Selecciona modalidad
                  </option>

                  {MODALIDADES.map((opcion) => (
                    <option
                      key={opcion}
                      value={opcion}
                    >
                      {opcion}
                    </option>
                  ))}

                </select>

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
                          {p.modalidad && (
                            <>
                              {" - "}
                              {p.modalidad}
                            </>
                          )}
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
    py-3 rounded-2xl font-bold text-black
    ${
      pedido.estado === "entregado"
        ? "bg-[#CDB4DB]"
        : "bg-gray-200 text-black"
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
    abrirEditorPedido(pedido)
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
      max-w-5xl
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

        <select
          value={pedidoEditando.estado || "pendiente"}
          onChange={(e) =>
            setPedidoEditando({
              ...pedidoEditando,
              estado: e.target.value,
            })
          }
          className="input-premium"
        >
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

      <div className="mt-8 space-y-5">

        <h3 className="text-2xl font-black text-cyan-600">
          Productos del pedido
        </h3>

        {(pedidoEditando.productos || []).map(
          (producto: any, index: number) => (

            <div
              key={index}
              className="rounded-3xl border border-[#FFD9D4] p-5 bg-[#FFF8F5] space-y-4"
            >

              <input
                type="text"
                value={producto.nombre || ""}
                onChange={(e) =>
                  actualizarProductoPedido(
                    index,
                    {
                      nombre: e.target.value,
                    }
                  )
                }
                className="input-premium"
              />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <input
                  type="number"
                  min="1"
                  value={producto.cantidad || 1}
                  onChange={(e) =>
                    actualizarProductoPedido(
                      index,
                      {
                        cantidad:
                          Number(e.target.value) || 1,
                      },
                      true
                    )
                  }
                  className="input-premium"
                />

                <input
                  type="number"
                  value={producto.precio || 0}
                  onChange={(e) =>
                    actualizarProductoPedido(
                      index,
                      {
                        precio:
                          Number(e.target.value) || 0,
                      }
                    )
                  }
                  className="input-premium"
                />

                <select
                  value={producto.modalidad || ""}
                  onChange={(e) =>
                    actualizarProductoPedido(
                      index,
                      {
                        modalidad: e.target.value,
                      }
                    )
                  }
                  className="input-premium"
                >

                  <option value="">
                    Modalidad
                  </option>

                  {MODALIDADES.map((opcion) => (
                    <option
                      key={opcion}
                      value={opcion}
                    >
                      {opcion}
                    </option>
                  ))}

                </select>

                <button
                  onClick={() =>
                    quitarProductoPedido(index)
                  }
                  className="bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black transition px-5 py-4"
                >
                  Quitar
                </button>

              </div>

              <p className="text-sm font-black uppercase text-zinc-500">
                Subtotal: ${numero(producto.precio) * numero(producto.cantidad)}
                {Number(producto.minimo_mayoreo || 0) > 0 && (
                  <>
                    {" · "}
                    Mayoreo desde {producto.minimo_mayoreo} piezas
                  </>
                )}
              </p>

            </div>
          )
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">

          <select
            value={productoParaAgregar}
            onChange={(e) =>
              setProductoParaAgregar(e.target.value)
            }
            className="input-premium"
          >

            <option value="">
              Selecciona producto para agregar
            </option>

            {productosDisponibles.map((producto) => (
              <option
                key={producto.id}
                value={producto.id}
              >
                {producto.nombre}
              </option>
            ))}

          </select>

          <button
            onClick={agregarProductoPedido}
            className="btn-primary"
          >
            Agregar producto
          </button>

        </div>

        <div className="text-4xl font-black text-rose-300">
          Total: ${calcularTotalProductos(
            pedidoEditando.productos || []
          )}
        </div>

      </div>

      <button
  onClick={async () => {

    const productos =
      pedidoEditando.productos || []

    if (productos.length === 0) {
      alert("El pedido necesita al menos un producto")
      return
    }

    const faltaModalidad =
      productos.some(
        (producto: any) => !producto.modalidad
      )

    if (faltaModalidad) {
      alert("Selecciona la modalidad de todos los productos")
      return
    }

    const totalActualizado =
      calcularTotalProductos(productos)

    const { error } = await supabase
      .from("pedidos")
      .update({
        cliente: pedidoEditando.cliente,
        telefono: pedidoEditando.telefono,
        fecha: pedidoEditando.fecha,
        notas: pedidoEditando.notas,
        estado: pedidoEditando.estado,
        productos:
          productos.map((producto: any) => ({
            producto_id: producto.producto_id,
            nombre: producto.nombre,
            precio: numero(producto.precio),
            cantidad: numero(producto.cantidad),
            modalidad: producto.modalidad,
            precio_menudeo: producto.precio_menudeo,
            precio_mayoreo: producto.precio_mayoreo,
            minimo_mayoreo: producto.minimo_mayoreo,
          })),
        total: totalActualizado,
      })
      .eq("id", pedidoEditando.id)

    if (error) {
      console.log(error)
      alert("Error actualizando")
      return
    }

    alert("Pedido actualizado")

    setPedidoEditando(null)

    await obtenerPedidos()
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
