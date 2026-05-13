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

const obtenerFechaLocal = () => {
  const fecha = new Date()
  const offset = fecha.getTimezoneOffset()
  const local =
    new Date(fecha.getTime() - offset * 60000)

  return local.toISOString().slice(0, 10)
}

const formatearFecha = (valor?: string) => {
  if (!valor) return ""

  const soloFecha =
    String(valor).split("T")[0]

  const [anio, mes, dia] =
    soloFecha.split("-").map(Number)

  if (!anio || !mes || !dia) {
    return String(valor)
  }

  return new Date(
    anio,
    mes - 1,
    dia
  ).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const obtenerFechaPedido = (pedido: any) =>
  pedido.fecha_pedido ||
  pedido.created_at ||
  pedido.fecha_creacion ||
  ""

const obtenerFechaEntrega = (pedido: any) =>
  pedido.fecha_entrega ||
  pedido.fecha ||
  ""

const escaparHTML = (valor: any) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

const obtenerImagenProducto = (producto: any) =>
  producto.imagen ||
  producto.imagenes?.[0] ||
  ""

export default function Page() {

  const [carrito, setCarrito] = useState<any[]>([])
  const [pedidos, setPedidos] = useState<any[]>([])
  const [productosDisponibles, setProductosDisponibles] =
    useState<any[]>([])
  const [pedidoEditando, setPedidoEditando] =
  useState<any>(null)
  const [catalogoPedidoAbierto, setCatalogoPedidoAbierto] =
    useState(false)
  const [busquedaCatalogoPedido, setBusquedaCatalogoPedido] =
    useState("")
  const [categoriaCatalogoPedido, setCategoriaCatalogoPedido] =
    useState("Todas")

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

  const prepararProductoPedido = (
    producto: any,
    cantidad = numero(producto.cantidad) || 1
  ) => {
    const productoActual =
      productosDisponibles.find(
        (item) =>
          String(item.id) ===
          String(
            producto.producto_id ??
            producto.id
          )
      ) || {}

    const piezas =
      Math.max(1, numero(cantidad) || 1)

    const productoConPrecios = {
      ...productoActual,
      ...producto,
      producto_id:
        producto.producto_id ??
        producto.id ??
        productoActual.id,
      nombre:
        producto.nombre ??
        productoActual.nombre,
      cantidad: piezas,
      modalidad: producto.modalidad || "",
      precio_menudeo:
        productoActual.precio_menudeo ??
        producto.precio_menudeo ??
        productoActual.precio ??
        producto.precio,
      precio_mayoreo:
        productoActual.precio_mayoreo ??
        producto.precio_mayoreo ??
        productoActual.precio ??
        producto.precio,
      minimo_mayoreo:
        productoActual.minimo_mayoreo ??
        producto.minimo_mayoreo ??
        0,
    }

    return {
      ...productoConPrecios,
      precio:
        obtenerPrecioPorCantidad(
          productoConPrecios,
          piezas
        ),
    }
  }

  const carritoConPrecios =
    carrito.map((item) =>
      prepararProductoPedido(item)
    )

  const total =
    calcularTotalProductos(carritoConPrecios)

  const categoriasCatalogoPedido =
    Array.from(
      new Set(
        productosDisponibles
          .map((producto) => producto.categoria)
          .filter(Boolean)
      )
    )

  const productosCatalogoPedido =
    productosDisponibles.filter((producto) => {
      const coincideBusqueda =
        producto.nombre
          ?.toLowerCase()
          .includes(
            busquedaCatalogoPedido.toLowerCase()
          )

      const coincideCategoria =
        categoriaCatalogoPedido === "Todas" ||
        producto.categoria ===
          categoriaCatalogoPedido

      return (
        coincideBusqueda &&
        coincideCategoria
      )
    })

  const actualizarModalidadCarrito = (
    index: number,
    modalidad: string
  ) => {

    const actualizado =
      carrito.map((item, itemIndex) =>
        itemIndex === index
          ? prepararProductoPedido({
              ...item,
              modalidad,
            })
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
                precio: numero(p.precio),
                cantidad: numero(p.cantidad),
                modalidad: p.modalidad,
                precio_menudeo: p.precio_menudeo,
                precio_mayoreo: p.precio_mayoreo,
                minimo_mayoreo: p.minimo_mayoreo,
                imagenes: p.imagenes || [],
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

    if (carritoConPrecios.length === 0) {

      alert("Agrega productos al pedido")
      return
    }

    const faltaModalidad =
      carritoConPrecios.some(
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
      productos: carritoConPrecios,
      total:
        calcularTotalProductos(
          carritoConPrecios
        ),
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

  const abrirEditorPedido = (pedido: any) => {

    setCatalogoPedidoAbierto(false)
    setBusquedaCatalogoPedido("")
    setCategoriaCatalogoPedido("Todas")

    setPedidoEditando({
      ...pedido,
      estado: pedido.estado || "pendiente",
      productos: Array.isArray(pedido.productos)
        ? pedido.productos.map((producto: any) =>
            prepararProductoPedido({
              ...producto,
              cantidad:
                numero(producto.cantidad) || 1,
              modalidad:
                producto.modalidad || "",
            })
          )
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

  const agregarProductoPedido = (
    producto: any
  ) => {

    if (!pedidoEditando || !producto) {
      return
    }

    const productos = [
      ...(pedidoEditando.productos || []),
      prepararProductoPedido(producto),
    ]

    setPedidoEditando({
      ...pedidoEditando,
      productos,
      total: calcularTotalProductos(productos),
    })
  }

  const enviarWhatsApp = (pedido: any) => {

    const productos =
      pedido.productos
        .map(
          (p: any) =>
            `• ${p.nombre} (${p.modalidad || "Sin modalidad"}) x${p.cantidad}`
        )
        .join("\n")

    const fechaPedido =
      formatearFecha(
        obtenerFechaPedido(pedido)
      ) || "Sin fecha"

    const fechaEntrega =
      formatearFecha(
        obtenerFechaEntrega(pedido)
      ) || "Sin fecha"

    const notas =
      pedido.notas
        ? `\nNotas: ${pedido.notas}`
        : ""

    const mensaje =
      `Hola ${pedido.cliente}\n\n` +
      `Fecha de pedido: ${fechaPedido}\n` +
      `Fecha de entrega: ${fechaEntrega}\n` +
      `Tu pedido:\n${productos}\n\n` +
      `Total: $${pedido.total}${notas}`

    window.open(
      `https://wa.me/52${pedido.telefono}?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    )
  }

  const generarPDF = (pedido: any) => {

    const folio =
      `TCH-${pedido.id}`

    const fechaActual =
      new Date().toLocaleDateString()

    const logoUrl =
      `${window.location.origin}/logo.png`

    const fechaPedido =
      formatearFecha(
        obtenerFechaPedido(pedido)
      ) || "Sin fecha"

    const fechaEntrega =
      formatearFecha(
        obtenerFechaEntrega(pedido)
      ) || "Sin fecha"

    const productos =
      Array.isArray(pedido.productos)
        ? pedido.productos
        : []

    const productosHTML =
      productos
        .map(
          (p: any, index: number) => {
            const imagen =
              obtenerImagenProducto(p)

            const subtotal =
              numero(p.precio) *
              numero(p.cantidad)

            return `
            <article class="product-row">
              ${
                imagen
                  ? `
                    <img
                      src="${escaparHTML(imagen)}"
                      alt=""
                      class="product-image"
                    />
                  `
                  : `
                    <div class="product-empty">
                      ${index + 1}
                    </div>
                  `
              }

              <div>
                <h3>
                  ${escaparHTML(p.nombre)}
                </h3>

                <p class="product-meta">
                  ${escaparHTML(p.modalidad || "Sin modalidad")}
                  · ${numero(p.cantidad)} pza.
                </p>
              </div>

              <div class="product-price">
                <strong>
                  $${subtotal}
                </strong>

                <span>
                  $${numero(p.precio)} c/u
                </span>
              </div>
            </article>
          `
          }
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
          <style>
            @page {
              size: letter;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              width: 8.5in;
              min-height: 11in;
              margin: 0;
              padding: 0;
              background: #FFF8F5;
              font-family: Arial, sans-serif;
            }

            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .sheet {
              width: 8.5in;
              height: 11in;
              overflow: hidden;
              background: #FFF8F5;
              padding: .22in;
            }

            .scaler {
              width: 100%;
              transform-origin: top left;
            }

            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: .18in;
              padding: .16in .18in;
              border-radius: .22in;
              background: linear-gradient(135deg, #27B6C7, #F8B4C0);
              color: white;
            }

            .logo-box {
              width: 2.05in;
              background: white;
              border-radius: .16in;
              padding: .07in;
            }

            .logo-box img {
              display: block;
              width: 100%;
              height: auto;
            }

            .header h1 {
              margin: 0;
              font-size: .34in;
              line-height: 1;
              font-weight: 900;
            }

            .header p {
              margin: .05in 0 0;
              font-size: .13in;
              font-weight: 700;
            }

            .folio {
              text-align: right;
              font-weight: 900;
              font-size: .16in;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: .08in;
              margin-top: .12in;
            }

            .info-card {
              min-height: .52in;
              background: white;
              border: 1px solid #F5D3CD;
              border-radius: .14in;
              padding: .08in .1in;
            }

            .label {
              margin: 0 0 .03in;
              color: #888;
              font-size: .075in;
              font-weight: 900;
              letter-spacing: .03em;
              text-transform: uppercase;
            }

            .value {
              margin: 0;
              color: #222;
              font-size: .13in;
              font-weight: 900;
              line-height: 1.15;
              overflow-wrap: anywhere;
            }

            .value.accent {
              color: #27B6C7;
            }

            .notes {
              grid-column: span 3;
              min-height: .42in;
            }

            .notes .value {
              font-size: .105in;
              font-weight: 700;
              max-height: .32in;
              overflow: hidden;
            }

            .products {
              margin-top: .12in;
              display: grid;
              gap: .055in;
            }

            .product-row {
              display: grid;
              grid-template-columns: .5in 1fr .9in;
              align-items: center;
              gap: .08in;
              background: white;
              border: 1px solid #F5D3CD;
              border-radius: .12in;
              padding: .055in .075in;
              min-height: .56in;
            }

            .product-image,
            .product-empty {
              width: .42in;
              height: .42in;
              border-radius: .08in;
            }

            .product-image {
              object-fit: cover;
            }

            .product-empty {
              display: flex;
              align-items: center;
              justify-content: center;
              background: #D9F5F8;
              color: #27B6C7;
              font-weight: 900;
              font-size: .13in;
            }

            .product-row h3 {
              margin: 0;
              color: #27B6C7;
              font-size: .12in;
              line-height: 1.12;
              font-weight: 900;
              overflow-wrap: anywhere;
            }

            .product-meta {
              margin: .025in 0 0;
              color: #666;
              font-size: .09in;
              font-weight: 700;
            }

            .product-price {
              text-align: right;
            }

            .product-price strong {
              display: block;
              color: #F08C8C;
              font-size: .13in;
              line-height: 1;
              font-weight: 900;
            }

            .product-price span {
              display: block;
              margin-top: .025in;
              color: #777;
              font-size: .075in;
              font-weight: 700;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: .14in;
              margin-top: .12in;
              padding: .12in .16in;
              border-radius: .16in;
              background: #27B6C7;
              color: white;
            }

            .total-row p {
              margin: 0;
              font-size: .1in;
              font-weight: 900;
              text-transform: uppercase;
            }

            .total-row h2 {
              margin: 0;
              font-size: .28in;
              line-height: 1;
              font-weight: 900;
            }

            .footer {
              margin-top: .08in;
              color: #888;
              text-align: center;
              font-size: .075in;
              font-weight: 700;
            }
          </style>
        </head>

        <body>
          <section class="sheet">
            <div class="scaler" id="pdf-content">
              <header class="header">
                <div class="logo-box">
                  <img
                    src="${logoUrl}"
                    alt="TUCHIS alcancías"
                  />
                </div>

                <div>
                  <h1>
                    Pedido
                  </h1>

                  <p>
                    TUCHIS alcancías
                  </p>
                </div>

                <div class="folio">
                  ${folio}
                </div>
              </header>

              <div class="info-grid">
                <div class="info-card">
                  <p class="label">
                    Cliente
                  </p>

                  <h2 class="value accent">
                    ${escaparHTML(pedido.cliente)}
                  </h2>
                </div>

                <div class="info-card">
                  <p class="label">
                    Teléfono
                  </p>

                  <h2 class="value">
                    ${escaparHTML(pedido.telefono)}
                  </h2>
                </div>

                <div class="info-card">
                  <p class="label">
                    Estado
                  </p>

                  <h2 class="value">
                    ${escaparHTML(pedido.estado || "pendiente")}
                  </h2>
                </div>

                <div class="info-card">
                  <p class="label">
                    Fecha de pedido
                  </p>

                  <h2 class="value">
                    ${escaparHTML(fechaPedido)}
                  </h2>
                </div>

                <div class="info-card">
                  <p class="label">
                    Fecha de entrega
                  </p>

                  <h2 class="value">
                    ${escaparHTML(fechaEntrega)}
                  </h2>
                </div>

                <div class="info-card">
                  <p class="label">
                    Productos
                  </p>

                  <h2 class="value">
                    ${productos.length}
                  </h2>
                </div>

                <div class="info-card notes">
                  <p class="label">
                    Notas
                  </p>

                  <h2 class="value">
                    ${escaparHTML(pedido.notas || "Sin notas")}
                  </h2>
                </div>
              </div>

              <div class="products">
              ${productosHTML}
              </div>

              <div class="total-row">
                <div>
                  <p>
                    Total
                  </p>

                  <h2>
                    $${numero(pedido.total)}
                  </h2>
                </div>

                <p>
                  Generado el ${escaparHTML(fechaActual)}
                </p>
              </div>

              <div class="footer">
                TUCHIS alcancías · Imagina, pinta y disfruta
              </div>
            </div>
          </section>

          <script>
            let pdfListo = false

            const ajustarAUnaHoja = () => {
              if (pdfListo) return

              const hoja =
                document.querySelector(".sheet")
              const contenido =
                document.querySelector("#pdf-content")

              if (!hoja || !contenido) return

              contenido.style.transform = "scale(1)"

              const escalaAncho =
                hoja.clientWidth / contenido.scrollWidth
              const escalaAlto =
                hoja.clientHeight / contenido.scrollHeight
              const escala =
                Math.min(
                  1,
                  escalaAncho,
                  escalaAlto
                )

              contenido.style.transform =
                "scale(" + escala + ")"

              pdfListo = true
              window.focus()
              setTimeout(() => window.print(), 120)
            }

            window.addEventListener(
              "load",
              () => setTimeout(ajustarAUnaHoja, 180)
            )

            setTimeout(ajustarAUnaHoja, 900)
          </script>
        </body>
      </html>
    `)

    ventana.document.close()
  }

  return (

    <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

  <div>
    <img
      src="/logo.png"
      alt="TUCHIS alcancías"
      className="brand-logo mb-6"
    />

    <h1 className="page-title">
      Pedidos
    </h1>
  </div>

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

          <div className="rounded-3xl border border-[#FFD9D4] bg-white p-5">
            <p className="text-sm font-black uppercase text-zinc-400">
              Fecha de pedido
            </p>

            <p className="text-xl font-black text-cyan-600 mt-1">
              {formatearFecha(obtenerFechaLocal())}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-500 mb-2">
              Fecha de entrega
            </label>

            <input
              type="date"
              value={fecha}
              onChange={(e) =>
                setFecha(e.target.value)
              }
              className="input-premium"
            />
          </div>

          <textarea
            placeholder="Notas del pedido"
            value={notas}
            onChange={(e) =>
              setNotas(e.target.value)
            }
            className="input-premium min-h-[120px]"
          />

        </div>

        {carritoConPrecios.length > 0 && (

          <div className="mt-8 space-y-4">

            {carritoConPrecios.map((item, index) => (

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

                {Number(item.minimo_mayoreo || 0) > 0 && (
                  <p className="text-xs font-black uppercase text-zinc-400 mt-2">
                    Mayoreo desde {item.minimo_mayoreo} piezas
                  </p>
                )}

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

                  <div className="mt-3 space-y-1 text-zinc-500">
                    <p>
                      Pedido: {formatearFecha(
                        obtenerFechaPedido(pedido)
                      ) || "Sin fecha"}
                    </p>

                    <p>
                      Entrega: {formatearFecha(
                        obtenerFechaEntrega(pedido)
                      ) || "Sin fecha"}
                    </p>
                  </div>

                  {pedido.notas && (
                    <p className="mt-4 text-zinc-600 whitespace-pre-wrap">
                      <span className="font-black text-cyan-600">
                        Notas:{" "}
                      </span>
                      {pedido.notas}
                    </p>
                  )}

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-[#FFD9D4] bg-[#FFF8F5] p-5">
            <p className="text-sm font-black uppercase text-zinc-400">
              Fecha de pedido
            </p>

            <p className="text-xl font-black text-cyan-600 mt-1">
              {formatearFecha(
                obtenerFechaPedido(pedidoEditando)
              ) || "Sin fecha"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-500 mb-2">
              Fecha de entrega
            </label>

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
          </div>
        </div>

        <textarea
          placeholder="Notas del pedido"
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

        <div className="rounded-3xl border border-[#FFD9D4] bg-white p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <h4 className="text-xl font-black text-cyan-600">
              Agregar producto
            </h4>

            <p className="text-zinc-500 mt-1">
              Abre el catálogo para buscar por nombre, categoría e imagen.
            </p>
          </div>

          <button
            onClick={() =>
              setCatalogoPedidoAbierto(true)
            }
            className="btn-primary"
          >
            Abrir catálogo
          </button>

        </div>

        {catalogoPedidoAbierto && (

          <div className="
            fixed inset-0 z-[70]
            bg-black/60
            backdrop-blur-sm
            flex items-center justify-center
            p-4
          ">

            <div className="
              bg-[#FFF8F5]
              w-full
              max-w-6xl
              rounded-[32px]
              shadow-2xl
              p-6
              md:p-8
              max-h-[92vh]
              overflow-y-auto
            ">

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                <div>
                  <img
                    src="/logo.png"
                    alt="TUCHIS alcancías"
                    className="brand-logo-sm mb-4"
                  />

                  <h3 className="text-4xl font-black text-cyan-600">
                    Catálogo
                  </h3>

                  <p className="text-zinc-500 mt-2">
                    Elige los productos que se agregarán al pedido.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setCatalogoPedidoAbierto(false)
                  }
                  className="text-4xl text-zinc-400 self-end md:self-start"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={busquedaCatalogoPedido}
                  onChange={(e) =>
                    setBusquedaCatalogoPedido(
                      e.target.value
                    )
                  }
                  className="input-premium"
                />

                <select
                  value={categoriaCatalogoPedido}
                  onChange={(e) =>
                    setCategoriaCatalogoPedido(
                      e.target.value
                    )
                  }
                  className="input-premium"
                >
                  <option value="Todas">
                    Todas las categorías
                  </option>

                  {categoriasCatalogoPedido.map(
                    (categoria) => (
                      <option
                        key={categoria}
                        value={categoria}
                      >
                        {categoria}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {productosCatalogoPedido.map(
                  (producto) => (
                    <div
                      key={producto.id}
                      className="bg-white border border-[#F8D6D0] rounded-[28px] overflow-hidden shadow-sm"
                    >
                      <img
                        src={
                          producto.imagenes?.[0] ||
                          "/logo.png"
                        }
                        alt={producto.nombre}
                        className="w-full h-56 object-cover bg-white"
                      />

                      <div className="p-5">
                        <p className="text-pink-400 font-black text-xs uppercase">
                          {producto.categoria}
                        </p>

                        <h4 className="text-2xl font-black text-cyan-600 mt-2">
                          {producto.nombre}
                        </h4>

                        <div className="mt-4 space-y-1">
                          <p className="text-2xl font-black text-rose-300">
                            Menudeo ${obtenerPrecioMenudeo(producto)}
                          </p>

                          <p className="text-lg font-black text-cyan-500">
                            Mayoreo ${obtenerPrecioMayoreo(producto)}
                          </p>

                          {obtenerMinimoMayoreo(producto) > 0 && (
                            <p className="text-xs font-black uppercase text-zinc-400">
                              Desde {obtenerMinimoMayoreo(producto)} piezas
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            agregarProductoPedido(producto)
                          }
                          className="btn-primary w-full mt-5"
                        >
                          Agregar al pedido
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              {productosCatalogoPedido.length === 0 && (
                <div className="bg-white border border-[#F8D6D0] rounded-3xl p-8 text-center text-zinc-500 font-bold">
                  No hay productos con esa búsqueda.
                </div>
              )}

            </div>

          </div>
        )}

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
            imagenes: producto.imagenes || [],
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
