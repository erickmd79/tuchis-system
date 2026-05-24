"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import {
  MODALIDADES,
  numero,
  moneda,
  type Escala,
  obtenerPrecioPorEscala,
  obtenerModalidadesDisponibles,
  calcularTotalProductos,
} from "../../../lib/pricing"

const obtenerFechaLocal = () => {
  const fecha = new Date()
  const offset = fecha.getTimezoneOffset()
  const local = new Date(fecha.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

const formatearFecha = (valor?: string) => {
  if (!valor) return ""
  const soloFecha = String(valor).split("T")[0]
  const [anio, mes, dia] = soloFecha.split("-").map(Number)
  if (!anio || !mes || !dia) return String(valor)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// Returns "pagado" when anticipo covers total; otherwise "anticipo".
// Never returns "pendiente" for new orders.
const calcularEstadoPago = (anticipo: number, total: number): string => {
  if (total > 0 && anticipo >= total) return "pagado"
  return "anticipo"
}

export default function NuevoPedidoPage() {
  const router = useRouter()
  const [cargando, setCargando] = useState(true)
  const [carrito, setCarrito] = useState<any[]>([])
  const [productosDisponibles, setProductosDisponibles] = useState<any[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [lugarEntrega, setLugarEntrega] = useState("")
  const [municipio, setMunicipio] = useState("")
  const [anticipo, setAnticipo] = useState("")
  const [estadoPagoPedido, setEstadoPagoPedido] = useState("anticipo")
  const [fecha, setFecha] = useState("")
  const [notas, setNotas] = useState("")
  const [errorPedido, setErrorPedido] = useState("")
  const [exitoPedido, setExitoPedido] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("carrito") || "[]")
    setCarrito(data)
    setCargando(false)
    supabase
      .from("productos")
      .select("*")
      .order("nombre")
      .then(({ data: productos }) => {
        if (productos) setProductosDisponibles(productos)
      })
    supabase.from("escalas").select("*").then(({ data }) => {
      if (data) setEscalas(data as Escala[])
    })
  }, [])

  const prepararProductoPedido = (
    item: any,
    cantidad = numero(item.cantidad) || 1
  ) => {
    const productoBase =
      productosDisponibles.find(
        (p) => String(p.id) === String(item.producto_id ?? item.id)
      ) || {}

    const piezas = Math.max(1, numero(cantidad) || 1)
    const tamanoId = Number(item.tamano_id || productoBase.tamano_id) || 0
    const modalidad = item.modalidad || ""

    let precio = 0
    const tamanoNombre = item.tamano_nombre || item.tamano || ""

    if (tamanoId > 0 && escalas.length > 0 && modalidad) {
      precio = obtenerPrecioPorEscala(escalas, tamanoId, modalidad, piezas)
    } else {
      precio = numero(item.precio || item.precio_unitario || 0)
    }

    return {
      ...productoBase,
      ...item,
      producto_id: item.producto_id ?? item.id ?? productoBase.id,
      nombre: item.nombre ?? productoBase.nombre,
      tamano_id: tamanoId || undefined,
      tamano_nombre: tamanoNombre,
      tamano: tamanoNombre,
      modalidad,
      cantidad: piezas,
      precio,
      precio_unitario: precio,
      subtotal: precio * piezas,
      imagen: item.imagen ?? item.imagenes?.[0] ?? productoBase.imagenes?.[0] ?? "",
      imagenes: item.imagenes ?? productoBase.imagenes ?? [],
    }
  }

  const carritoConPrecios = carrito.map((item) => prepararProductoPedido(item))
  const total = calcularTotalProductos(carritoConPrecios)
  const anticipoCapturado = Math.max(0, numero(anticipo))
  const anticipoPedido = Math.min(anticipoCapturado, total)
  const saldoPedido = Math.max(total - anticipoPedido, 0)
  const estadoPagoFinal = calcularEstadoPago(anticipoPedido, total)

  const actualizarModalidadCarrito = (index: number, modalidad: string) => {
    const actualizado = carrito.map((item, i) =>
      i === index ? prepararProductoPedido({ ...item, modalidad }) : item
    )
    setCarrito(actualizado)
    localStorage.setItem("carrito", JSON.stringify(actualizado))
  }

  const guardarPedido = async (pedido: any) => {
    const pedidoBase = {
      cliente: pedido.cliente,
      telefono: pedido.telefono,
      email: pedido.email || null,
      lugar_entrega: pedido.lugar_entrega || null,
      municipio: pedido.municipio || null,
      fecha: pedido.fecha,
      notas: pedido.notas,
      productos: pedido.productos.map((p: any) => ({
        producto_id: p.producto_id ?? p.id,
        nombre: p.nombre,
        precio: numero(p.precio),
        cantidad: numero(p.cantidad),
        tamano: p.tamano,
        tamano_id: p.tamano_id,
        modalidad: p.modalidad,
        precio_menudeo: p.precio_menudeo,
        precio_mayoreo: p.precio_mayoreo,
        precio_blanca_menudeo: p.precio_blanca_menudeo,
        precio_blanca_mayoreo: p.precio_blanca_mayoreo,
        precio_pintada_menudeo: p.precio_pintada_menudeo,
        precio_pintada_mayoreo: p.precio_pintada_mayoreo,
        precio_kit_menudeo: p.precio_kit_menudeo,
        precio_kit_mayoreo: p.precio_kit_mayoreo,
        minimo_mayoreo: p.minimo_mayoreo,
        imagenes: p.imagenes || [],
      })),
      total: pedido.total,
      anticipo: numero(pedido.anticipo),
      estado_pago: pedido.estado_pago,
      estado: "pendiente",
    }
    const { error } = await supabase.from("pedidos").insert([pedidoBase])
    if (error) {
      // Fallback: retry without new columns in case SQL hasn't been applied yet
      const {
        email: _e,
        lugar_entrega: _l,
        municipio: _m,
        ...base
      } = pedidoBase
      const { error: e2 } = await supabase.from("pedidos").insert([base])
      if (!e2) return true
      setErrorPedido("Error al guardar pedido. Intenta de nuevo.")
      return false
    }
    return true
  }

  const generarPedido = async () => {
    setErrorPedido("")
    setExitoPedido(false)

    if (!nombre.trim()) {
      setErrorPedido("El nombre del cliente es obligatorio")
      return
    }
    if (!telefono.trim()) {
      setErrorPedido("El teléfono es obligatorio")
      return
    }
    if (!lugarEntrega.trim()) {
      setErrorPedido("El lugar de entrega es obligatorio")
      return
    }
    if (!municipio.trim()) {
      setErrorPedido("El municipio es obligatorio")
      return
    }
    if (!fecha) {
      setErrorPedido("La fecha de entrega es obligatoria")
      return
    }

    const productosParaPedido = carritoConPrecios
    if (productosParaPedido.length === 0) {
      setErrorPedido("El carrito está vacío")
      return
    }
    if (productosParaPedido.some((item) => !item.modalidad)) {
      setErrorPedido("Selecciona la modalidad de todos los productos")
      return
    }
    if (productosParaPedido.some((item) => numero(item.precio) === 0)) {
      setErrorPedido("Algunos productos no tienen precio configurado. Verifica las escalas.")
      return
    }
    if (anticipoCapturado > total) {
      setErrorPedido("El anticipo no puede ser mayor al total del pedido")
      return
    }
    if (total > 0 && anticipoCapturado < total * 0.5) {
      setErrorPedido("El anticipo mínimo es del 50% del total del pedido.")
      return
    }

    setEnviando(true)
    const ok = await guardarPedido({
      cliente: nombre,
      telefono,
      email,
      lugar_entrega: lugarEntrega,
      municipio,
      fecha,
      notas,
      productos: productosParaPedido,
      anticipo: anticipoPedido,
      estado_pago: estadoPagoFinal,
      total: calcularTotalProductos(productosParaPedido),
    })
    setEnviando(false)
    if (!ok) return

    localStorage.removeItem("carrito")
    window.dispatchEvent(new Event("tuchis:cart-updated"))
    setExitoPedido(true)
    setTimeout(() => router.push("/pedido"), 1800)
  }

  if (cargando) return null

  if (carrito.length === 0 && !exitoPedido) {
    return (
      <div className="app-wrapper">
        <div className="section-card flex flex-col items-center gap-6 py-16 text-center max-w-md mx-auto">
          <span className="text-6xl">🛒</span>
          <div>
            <p className="text-2xl font-black text-zinc-700">
              Tu carrito está vacío
            </p>
            <p className="text-zinc-500 mt-2">
              Agrega productos desde el catálogo para generar un pedido.
            </p>
          </div>
          <a href="/catalogo" className="btn-primary">
            Ir al catálogo
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="app-wrapper">
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="page-title">
            Nuevo pedido
          </h1>
          <a
            href="/pedido"
            className="text-cyan-600 font-bold text-sm"
          >
            ← Ver pedidos guardados
          </a>
        </div>

        {exitoPedido ? (
          <div className="section-card flex flex-col items-center gap-6 py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-[#DDF5EA] flex items-center justify-center">
              <span className="text-4xl text-[#238657]">✓</span>
            </div>
            <div>
              <p className="text-2xl font-black text-[#238657]">
                ¡Pedido guardado!
              </p>
              <p className="text-zinc-500 mt-2 text-sm">
                Redirigiendo a tus pedidos...
              </p>
            </div>
          </div>
        ) : (
          <div className="section-card space-y-8">

            {/* Cart items */}
            <div>
              <p className="text-xs font-black uppercase text-zinc-400 mb-4 tracking-wide">
                Carrito
              </p>
              <div className="space-y-3">
                {carritoConPrecios.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-[#FFD9D4] p-4"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-black text-cyan-600">
                          {item.nombre}
                        </h3>
                        {(item.tamano || item.tamano_nombre) && (
                          <p className="text-xs font-bold text-zinc-400 mt-0.5">
                            {item.tamano || item.tamano_nombre}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-zinc-600 whitespace-nowrap">
                          {item.cantidad} × {moneda(item.precio)}
                        </span>
                        {item.precio > 0 && (
                          <p className="text-xs font-black text-cyan-600 mt-0.5">
                            = {moneda(item.subtotal ?? item.precio * item.cantidad)}
                          </p>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const tamanoId = Number(item.tamano_id) || 0
                      const desdeEscalas =
                        tamanoId > 0 && escalas.length > 0
                          ? obtenerModalidadesDisponibles(escalas, tamanoId)
                          : []
                      const opciones =
                        desdeEscalas.length > 0 ? desdeEscalas : [...MODALIDADES]
                      return (
                        <select
                          value={item.modalidad || ""}
                          onChange={(e) =>
                            actualizarModalidadCarrito(index, e.target.value)
                          }
                          className="input-premium mt-3"
                        >
                          <option value="">— Selecciona modalidad —</option>
                          {opciones.map((opcion) => (
                            <option key={opcion} value={opcion}>
                              {opcion}
                            </option>
                          ))}
                        </select>
                      )
                    })()}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-3xl bg-[#D9F5F8] p-5">
                <p className="text-sm font-black uppercase text-zinc-500">
                  Total pedido
                </p>
                <p className="text-2xl font-black text-cyan-600">
                  {moneda(total)}
                </p>
              </div>
              <div className="rounded-3xl bg-[#FFF0B8] p-5">
                <p className="text-sm font-black uppercase text-zinc-500">
                  Anticipo
                </p>
                <p className="text-2xl font-black text-zinc-700">
                  {moneda(anticipoPedido)}
                </p>
              </div>
              <div className="rounded-3xl bg-[#FFE0DD] p-5">
                <p className="text-sm font-black uppercase text-zinc-500">
                  Saldo
                </p>
                <p className="text-2xl font-black text-rose-400">
                  {moneda(saldoPedido)}
                </p>
              </div>
            </div>

            {/* Customer data */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase text-zinc-400 tracking-wide">
                Datos del cliente
              </p>
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="input-premium input-cliente-grande"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="input-premium"
              />
              <input
                type="email"
                placeholder="Email (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-premium"
              />
              <select
                value={lugarEntrega}
                onChange={(e) => setLugarEntrega(e.target.value)}
                className="input-premium"
              >
                <option value="">— Lugar de entrega —</option>
                <option value="Orizaba">Orizaba</option>
                <option value="Río Blanco">Río Blanco</option>
                <option value="Cd. Mendoza">Cd. Mendoza</option>
              </select>
              <input
                type="text"
                placeholder="¿Desde qué municipio nos visitas?"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="input-premium"
              />
            </div>

            {/* Dates and notes */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase text-zinc-400 tracking-wide">
                Fecha y notas
              </p>
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
                  ¿Para cuándo las necesitas?
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="input-premium"
                />
              </div>
              <textarea
                placeholder="Notas del pedido"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="input-premium min-h-[120px]"
              />
            </div>

            {/* Payment */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase text-zinc-400 tracking-wide">
                Pago
              </p>
              <div>
                <label className="block text-sm font-semibold text-zinc-500 mb-2">
                  Anticipo
                </label>
                <input
                  type="number"
                  min="0"
                  value={anticipo}
                  onChange={(e) => {
                    const valor = e.target.value
                    setAnticipo(valor)
                    const ant = Math.min(
                      Math.max(0, numero(valor)),
                      total
                    )
                    setEstadoPagoPedido(
                      calcularEstadoPago(ant, total)
                    )
                  }}
                  className="input-premium"
                  placeholder="Monto del anticipo"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-500 mb-2">
                  Estado de pago
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEstadoPagoPedido("anticipo")}
                    className={`badge-action ${
                      estadoPagoFinal === "anticipo"
                        ? "badge-anticipo"
                        : "badge-neutral"
                    }`}
                  >
                    Anticipo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstadoPagoPedido("pagado")}
                    className={`badge-action ${
                      estadoPagoFinal === "pagado"
                        ? "badge-pagado"
                        : "badge-neutral"
                    }`}
                  >
                    Pagado
                  </button>
                </div>
              </div>
            </div>

            {errorPedido && (
              <div className="rounded-2xl bg-[#FFE0DD] border border-[#F8C4BE] px-5 py-4 text-[#C95F67] font-bold text-sm">
                {errorPedido}
              </div>
            )}

            <button
              onClick={generarPedido}
              disabled={enviando}
              className={`btn-primary w-full transition-opacity ${
                enviando ? "opacity-60" : ""
              }`}
            >
              {enviando ? "Guardando..." : "Generar pedido"}
            </button>

          </div>
        )}
      </div>
    </div>
  )
}
