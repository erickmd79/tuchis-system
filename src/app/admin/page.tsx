"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import AdminSidebar from "../components/AdminSidebar"

type Lapso = "hoy" | "7d" | "15d" | "30d" | "mes" | "personalizado" | "todos"

type ProductoPedido = {
  producto_id?: string | number
  id?: string | number
  nombre?: string
  cantidad?: number | string
  precio?: number | string
  modalidad?: string
  categoria?: string
}

type Pedido = {
  id: number
  cliente?: string
  telefono?: string
  fecha?: string
  fecha_pedido?: string
  fecha_creacion?: string
  created_at?: string
  estado?: string
  estado_pago?: string
  anticipo?: number | string
  abono?: number | string
  total?: number | string
  productos?: ProductoPedido[]
}

type ProductoCatalogo = {
  id: string | number
  nombre?: string
  categoria?: string
}

const numero = (valor: unknown) => Number(valor || 0)

const moneda = (valor: number) =>
  valor.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  })

// Compact version for KPI cards: abbreviates ≥ 1M to avoid overflow.
// Amounts below 1M are shown in full (e.g. $120,000).
const monedaCard = (valor: number): string => {
  if (valor >= 1_000_000)
    return `$${(valor / 1_000_000).toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })}M`
  return moneda(valor)
}

// All date operations use America/Mexico_City explicitly so that UTC
// timestamps stored by Supabase (e.g. created_at = "2026-07-09T04:43:00Z")
// are correctly mapped to their local date in Mexico
// ("2026-07-08" at 22:43 local time) before any filtering is applied.
const TZ = "America/Mexico_City"

const fechaMX = (d: Date): string => {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")}`
}

const obtenerFechaLocal = (): string => fechaMX(new Date())

const diasAtras = (n: number): string => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return fechaMX(d)
}

const primerDiaMes = (): string => {
  const hoy = obtenerFechaLocal()       // "YYYY-MM-DD" in Mexico City
  return `${hoy.slice(0, 7)}-01`        // replace day with "01"
}

const obtenerDiasEnRango = (inicio: string, fin: string, max = 30): string[] => {
  const resultado: string[] = []
  const [ai, mi, di] = inicio.split("-").map(Number)
  const [af, mf, df] = fin.split("-").map(Number)
  let cur = new Date(ai, mi - 1, di)
  const last = new Date(af, mf - 1, df)
  while (cur <= last && resultado.length < max) {
    resultado.push(fechaMX(cur))
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1)
  }
  return resultado
}

// Reads created_at first (Supabase creation timestamp) as the order date,
// falling back to other date columns only if created_at is absent.
const obtenerFechaPedido = (pedido: Pedido): string =>
  pedido.created_at ||
  pedido.fecha_pedido ||
  pedido.fecha_creacion ||
  pedido.fecha ||
  ""

// Converts any value to a YYYY-MM-DD string in America/Mexico_City.
// Pure date strings are returned as-is; ISO timestamps are parsed and
// converted so that e.g. "2026-07-09T04:43:00Z" → "2026-07-08".
const obtenerClaveFecha = (valor?: string): string => {
  if (!valor) return ""
  const s = String(valor).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s.slice(0, 10)
  return fechaMX(d)
}

const formatearDia = (valor: string): string => {
  const [anio, mes, dia] = valor.split("-").map(Number)
  if (!anio || !mes || !dia) return valor
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  })
}

const obtenerEstadoEntrega = (pedido: Pedido) =>
  pedido.estado === "entregado" ? "entregado" : "pendiente"

const obtenerEstadoPago = (pedido: Pedido) =>
  pedido.estado_pago || (pedido.estado === "pagado" ? "pagado" : "anticipo")

const porcentaje = (valor: number, maximo: number) =>
  maximo > 0 ? Math.max(6, Math.round((valor / maximo) * 100)) : 0

const LAPSOS: { id: Lapso; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "hoy", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "15d", label: "15 días" },
  { id: "30d", label: "30 días" },
  { id: "mes", label: "Este mes" },
]

type Notificacion = {
  uid: string
  nombre: string
  telefono: string
  total: number
  hora: string
}

export default function AdminPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [productos, setProductos] = useState<ProductoCatalogo[]>([])
  const [cargando, setCargando] = useState(true)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noVistas, setNoVistas] = useState(0)
  const [panelNotif, setPanelNotif] = useState(false)

  const [lapso, setLapso] = useState<Lapso>("todos")
  const [fechaInicio, setFechaInicio] = useState<string>("")
  const [fechaFin, setFechaFin] = useState<string>("")
  const [fechaInicioInput, setFechaInicioInput] = useState<string>(() => diasAtras(29))
  const [fechaFinInput, setFechaFinInput] = useState<string>(() => obtenerFechaLocal())

  const obtenerDatos = async () => {
    const [pedidosRes, productosRes] = await Promise.all([
      supabase.from("pedidos").select("*").order("id", { ascending: false }),
      supabase.from("productos").select("id,nombre,categoria"),
    ])
    if (pedidosRes.data) setPedidos(pedidosRes.data as Pedido[])
    if (productosRes.data) setProductos(productosRes.data as ProductoCatalogo[])
    setCargando(false)
  }

  const beep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.55)
    } catch (_) {}
  }

  useEffect(() => {
    void obtenerDatos()
    const refrescar = () => { void obtenerDatos() }
    const refrescarSiVisible = () => { if (!document.hidden) void obtenerDatos() }

    const canal = supabase
      .channel("dashboard-pedidos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedidos" },
        (payload) => {
          const nuevo = payload.new as any
          const hora = new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          })
          beep()
          setNotificaciones((prev) => [
            {
              uid: `${nuevo.id ?? ""}-${hora}`,
              nombre: nuevo.nombre || nuevo.cliente || "Cliente nuevo",
              telefono: nuevo.telefono || "—",
              total: Number(nuevo.total || 0),
              hora,
            },
            ...prev.slice(0, 19),
          ])
          setNoVistas((prev) => prev + 1)
          void obtenerDatos()
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos" },
        refrescar
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "pedidos" },
        refrescar
      )
      .subscribe()

    window.addEventListener("focus", refrescar)
    document.addEventListener("visibilitychange", refrescarSiVisible)
    return () => {
      void supabase.removeChannel(canal)
      window.removeEventListener("focus", refrescar)
      document.removeEventListener("visibilitychange", refrescarSiVisible)
    }
  }, [])

  const aplicarLapso = (nuevoLapso: Lapso) => {
    const hoy = obtenerFechaLocal()
    setLapso(nuevoLapso)
    if (nuevoLapso === "todos") {
      setFechaInicio("")
      setFechaFin("")
      return
    }
    let ini = hoy
    if (nuevoLapso === "7d") ini = diasAtras(6)
    else if (nuevoLapso === "15d") ini = diasAtras(14)
    else if (nuevoLapso === "30d") ini = diasAtras(29)
    else if (nuevoLapso === "mes") ini = primerDiaMes()
    setFechaInicio(ini)
    setFechaFin(hoy)
    setFechaInicioInput(ini)
    setFechaFinInput(hoy)
  }

  const aplicarPersonalizado = () => {
    if (fechaInicioInput && fechaFinInput && fechaInicioInput <= fechaFinInput) {
      setFechaInicio(fechaInicioInput)
      setFechaFin(fechaFinInput)
      setLapso("personalizado")
    }
  }

  const resumen = useMemo(() => {
    const hoy = obtenerFechaLocal()
    const catalogoPorId = new Map(productos.map((p) => [String(p.id), p]))

    const pedidosFiltrados =
      fechaInicio && fechaFin
        ? pedidos.filter((p) => {
            const fecha = obtenerClaveFecha(obtenerFechaPedido(p))
            return fecha >= fechaInicio && fecha <= fechaFin
          })
        : pedidos

    const totalVentas = pedidosFiltrados.reduce((acc, p) => acc + numero(p.total), 0)
    const totalAnticipos = pedidosFiltrados.reduce((acc, p) => acc + numero(p.anticipo), 0)
    const pedidosEnRango = pedidosFiltrados.length
    const pedidosHoy = pedidos.filter(
      (p) => obtenerClaveFecha(obtenerFechaPedido(p)) === hoy
    ).length

    const estados = pedidosFiltrados.reduce<Record<string, number>>((acc, p) => {
      const e = obtenerEstadoEntrega(p)
      acc[e] = (acc[e] || 0) + 1
      return acc
    }, {})

    const pagos = pedidosFiltrados.reduce<Record<string, number>>((acc, p) => {
      const ep = obtenerEstadoPago(p)
      acc[ep] = (acc[ep] || 0) + 1
      return acc
    }, {})

    const productosVendidos = new Map<string, number>()
    const modalidades = new Map<string, number>()
    const categorias = new Map<string, number>()

    pedidosFiltrados.forEach((pedido) => {
      ;(pedido.productos || []).forEach((producto) => {
        const cantidad = numero(producto.cantidad) || 1
        const nombre = producto.nombre || "Sin nombre"
        productosVendidos.set(nombre, (productosVendidos.get(nombre) || 0) + cantidad)
        const mod = producto.modalidad || "Sin modalidad"
        modalidades.set(mod, (modalidades.get(mod) || 0) + cantidad)
        const pc = catalogoPorId.get(String(producto.producto_id ?? producto.id ?? ""))
        const cat = producto.categoria || pc?.categoria || "Sin categoría"
        categorias.set(cat, (categorias.get(cat) || 0) + cantidad)
      })
    })

    const productosTop = Array.from(productosVendidos.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    const modalidadesTop = Array.from(modalidades.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    const categoriasTop = Array.from(categorias.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    const diasChart =
      fechaInicio && fechaFin
        ? obtenerDiasEnRango(fechaInicio, fechaFin, 30)
        : obtenerDiasEnRango(diasAtras(29), hoy, 30)

    const ventasPorDia = diasChart.map((dia) => ({
      dia,
      total: pedidos
        .filter((p) => obtenerClaveFecha(obtenerFechaPedido(p)) === dia)
        .reduce((acc, p) => acc + numero(p.total), 0),
    }))

    return {
      totalVentas,
      totalAnticipos,
      pedidosEnRango,
      pedidosHoy,
      totalPedidos: pedidos.length,
      estados,
      pagos,
      productosTop,
      modalidadesTop,
      categoriasTop,
      ventasPorDia,
      recientes: pedidosFiltrados.slice(0, 6),
    }
  }, [pedidos, productos, fechaInicio, fechaFin])

  const maxVentasDia = Math.max(1, ...resumen.ventasPorDia.map((d) => d.total))
  const maxProductos = Math.max(1, ...resumen.productosTop.map((p) => p.cantidad))
  const maxModalidades = Math.max(1, ...resumen.modalidadesTop.map((m) => m.cantidad))
  const maxCategorias = Math.max(1, ...resumen.categoriasTop.map((c) => c.cantidad))
  const totalEstados = Math.max(1, resumen.pedidosEnRango)

  const barsCount = resumen.ventasPorDia.length
  const barGap = barsCount > 20 ? "gap-0.5" : barsCount > 12 ? "gap-1" : "gap-2 md:gap-3"
  const showBarLabels = barsCount <= 14

  const labelPedidos =
    lapso === "todos"
      ? "Total pedidos"
      : lapso === "hoy"
        ? "Pedidos hoy"
        : lapso === "7d"
          ? "Pedidos 7 días"
          : lapso === "15d"
            ? "Pedidos 15 días"
            : lapso === "30d"
              ? "Pedidos 30 días"
              : lapso === "mes"
                ? "Pedidos este mes"
                : "Pedidos en rango"

  const chartTitle =
    lapso === "todos"
      ? "Ventas últimos 30 días"
      : lapso === "hoy"
        ? "Ventas hoy"
        : lapso === "7d"
          ? "Ventas últimos 7 días"
          : lapso === "15d"
            ? "Ventas últimos 15 días"
            : lapso === "30d"
              ? "Ventas últimos 30 días"
              : lapso === "mes"
                ? "Ventas este mes"
                : "Ventas por día"

  return (
    <div className="w-full">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">

        <div className="flex flex-col lg:flex-row gap-8">

          <AdminSidebar />

          <main className="flex-1 min-w-0">

            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-5xl md:text-7xl font-black text-[#FF5C8A] leading-none break-words">
                  Dashboard
                </h2>
                <p className="text-gray-500 text-base md:text-lg mt-4">
                  Estadísticas reales del historial de pedidos.
                </p>
              </div>

              {/* ── Notification bell ── */}
              <div className="relative self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPanelNotif((p) => !p)
                    setNoVistas(0)
                  }}
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition hover:scale-105"
                  style={{ background: "#FFE4EC", border: "1px solid #FFD0DC" }}
                  aria-label="Notificaciones"
                >
                  🔔
                  {noVistas > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full text-white text-xs font-black flex items-center justify-center border-2 border-white"
                      style={{ background: "#FF5C8A" }}
                    >
                      {noVistas > 99 ? "99+" : noVistas}
                    </span>
                  )}
                </button>

                {panelNotif && (
                  <>
                    {/* click-outside trap */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setPanelNotif(false)}
                    />
                    <div
                      className="absolute top-16 right-0 w-[340px] max-w-[calc(100vw-32px)] rounded-3xl shadow-2xl z-50 overflow-hidden"
                      style={{ background: "white", border: "1px solid #F4D4CF" }}
                    >
                      {/* Panel header */}
                      <div
                        className="flex items-center justify-between px-5 py-4"
                        style={{ background: "#FF5C8A" }}
                      >
                        <span className="text-white font-black text-base">
                          Notificaciones
                        </span>
                        <button
                          type="button"
                          onClick={() => setPanelNotif(false)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xl font-black"
                          style={{ background: "rgba(255,255,255,.22)", color: "white" }}
                        >
                          ×
                        </button>
                      </div>

                      {notificaciones.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                          <p className="text-3xl mb-3">🔕</p>
                          <p className="text-gray-500 font-bold text-sm">
                            Sin notificaciones aún.
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            Aquí aparecerán los pedidos nuevos en tiempo real.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#F4D4CF]">
                            {notificaciones.map((n) => (
                              <div
                                key={n.uid}
                                className="px-5 py-4 transition"
                                style={{ background: "white" }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = "#FFF7F4")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "white")
                                }
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-black text-[#3F334A] text-sm leading-tight truncate">
                                      {n.nombre}
                                    </p>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                      {n.telefono}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-black text-[#FF5C8A] text-sm">
                                      {moneda(n.total)}
                                    </p>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                      {n.hora}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="px-5 py-3 border-t border-[#F4D4CF]">
                            <button
                              type="button"
                              onClick={() => {
                                setNotificaciones([])
                                setNoVistas(0)
                                setPanelNotif(false)
                              }}
                              className="w-full py-2.5 rounded-2xl text-sm font-bold text-gray-400 hover:text-red-400 transition"
                            >
                              Limpiar historial
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {cargando && (
              <div className="section-card mb-8 text-zinc-500 font-bold">
                Cargando historial...
              </div>
            )}

            {/* ── Date filter bar ── */}
            <div className="bg-white rounded-[28px] border border-[#F4D4CF] p-4 md:p-6 mb-8 shadow-sm">
              {/* Quick lapso buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {LAPSOS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => aplicarLapso(id)}
                    className={`px-4 py-2 rounded-2xl font-bold text-sm transition ${
                      lapso === id
                        ? "bg-[#FF5C8A] text-white shadow-sm"
                        : "bg-[#FFF7F4] text-[#3F334A] hover:bg-[#FFE4EC]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Custom date range */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={fechaInicioInput}
                    max={fechaFinInput}
                    onChange={(e) => {
                      setFechaInicioInput(e.target.value)
                      setLapso("personalizado")
                    }}
                    className="border border-[#F4D4CF] rounded-2xl px-3 py-2 text-sm font-bold bg-white text-gray-700 focus:outline-none focus:border-[#FF5C8A]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={fechaFinInput}
                    min={fechaInicioInput}
                    max={obtenerFechaLocal()}
                    onChange={(e) => {
                      setFechaFinInput(e.target.value)
                      setLapso("personalizado")
                    }}
                    className="border border-[#F4D4CF] rounded-2xl px-3 py-2 text-sm font-bold bg-white text-gray-700 focus:outline-none focus:border-[#FF5C8A]"
                  />
                </div>
                <button
                  type="button"
                  onClick={aplicarPersonalizado}
                  className="px-5 py-2 rounded-2xl bg-[#FFE0DD] text-gray-700 font-bold text-sm hover:bg-[#F8C9C3] transition"
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  onClick={() => { void obtenerDatos() }}
                  className="px-5 py-2 rounded-2xl bg-[#FFE4EC] text-[#3F334A] font-bold text-sm hover:bg-[#FFD0DC] transition"
                >
                  ↻ Actualizar
                </button>
              </div>

              {/* Range summary */}
              <p className="text-xs text-gray-400 font-bold mt-3">
                {lapso === "todos"
                  ? "Todos los pedidos"
                  : `${formatearDia(fechaInicio)} → ${formatearDia(fechaFin)}`}
                {" · "}
                {resumen.pedidosEnRango} pedido{resumen.pedidosEnRango !== 1 ? "s" : ""}
                {" · "}
                {resumen.pedidosHoy} hoy
              </p>
            </div>

            {/* ── KPI cards ── */}
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 md:gap-6 mb-8 md:mb-10">

              <div className="rounded-[24px] md:rounded-[32px] p-4 md:p-6 xl:p-8 bg-[#BFF3DF] flex flex-col justify-between min-h-[130px] md:min-h-[180px]">
                <h3 className="text-gray-700 text-sm md:text-lg font-semibold">Total ventas</h3>
                <p className="text-xl md:text-3xl xl:text-4xl font-black mt-auto whitespace-nowrap">
                  {monedaCard(resumen.totalVentas)}
                </p>
              </div>

              <div className="rounded-[24px] md:rounded-[32px] p-4 md:p-6 xl:p-8 bg-[#FFF0B8] flex flex-col justify-between min-h-[130px] md:min-h-[180px]">
                <h3 className="text-gray-700 text-sm md:text-lg font-semibold">Anticipos</h3>
                <p className="text-xl md:text-3xl xl:text-4xl font-black mt-auto whitespace-nowrap">
                  {monedaCard(resumen.totalAnticipos)}
                </p>
              </div>

              <div className="rounded-[24px] md:rounded-[32px] p-4 md:p-6 xl:p-8 bg-[#FFE0E0] flex flex-col justify-between min-h-[130px] md:min-h-[180px]">
                <h3 className="text-gray-700 text-sm md:text-lg font-semibold">{labelPedidos}</h3>
                <p className="text-2xl md:text-4xl xl:text-5xl font-black mt-3 md:mt-6">
                  {resumen.pedidosEnRango}
                </p>
              </div>

              <div className="rounded-[24px] md:rounded-[32px] p-4 md:p-6 xl:p-8 bg-[#FFF0B8] flex flex-col justify-between min-h-[130px] md:min-h-[180px]">
                <h3 className="text-gray-700 text-sm md:text-lg font-semibold">Pendientes</h3>
                <p className="text-2xl md:text-4xl xl:text-5xl font-black mt-3 md:mt-6">
                  {resumen.estados.pendiente || 0}
                </p>
              </div>

              <div className="rounded-[24px] md:rounded-[32px] p-4 md:p-6 xl:p-8 bg-[#DDF5EA] flex flex-col justify-between min-h-[130px] md:min-h-[180px] col-span-2 xl:col-span-1">
                <h3 className="text-gray-700 text-sm md:text-lg font-semibold">Pagados</h3>
                <p className="text-2xl md:text-4xl xl:text-5xl font-black mt-3 md:mt-6">
                  {resumen.pagos.pagado || 0}
                </p>
              </div>

            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">

              {/* Bar chart */}
              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-5 md:p-8 shadow-sm">
                <h3 className="text-2xl md:text-4xl font-black text-[#FF5C8A] mb-6 md:mb-8">
                  {chartTitle}
                </h3>
                <div className={`h-[200px] md:h-[260px] flex items-end ${barGap}`}>
                  {resumen.ventasPorDia.map((dia) => (
                    <div
                      key={dia.dia}
                      className="flex-1 flex flex-col items-center justify-end gap-1 md:gap-3 min-w-0"
                    >
                      <div className="text-[9px] md:text-xs font-black text-zinc-500 truncate w-full text-center">
                        {dia.total > 0 ? moneda(dia.total) : ""}
                      </div>
                      <div className="w-full h-[150px] md:h-[190px] bg-[#FFF0B8] rounded-t-xl md:rounded-t-2xl flex items-end overflow-hidden">
                        <div
                          className="w-full bg-[#FF5C8A] rounded-t-xl md:rounded-t-2xl transition-all"
                          style={{ height: `${porcentaje(dia.total, maxVentasDia)}%` }}
                        />
                      </div>
                      {showBarLabels && (
                        <div className="text-[9px] md:text-xs font-bold text-zinc-500 truncate w-full text-center">
                          {formatearDia(dia.dia)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order states */}
              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-5 md:p-8 shadow-sm">
                <h3 className="text-2xl md:text-4xl font-black text-[#F08C8C] mb-6 md:mb-8">
                  Estado de pedidos
                </h3>
                <div className="space-y-5 md:space-y-6">
                  {([
                    ["pendiente", "Pendientes", "bg-yellow-300"],
                    ["entregado", "Entregados", "bg-[#CDB4DB]"],
                  ] as const).map(([estado, etiqueta, color]) => {
                    const cantidad = resumen.estados[estado] || 0
                    return (
                      <div key={estado}>
                        <div className="flex items-center justify-between gap-4 mb-2 md:mb-3 font-bold text-sm md:text-base">
                          <span>{etiqueta}</span>
                          <span>{cantidad}</span>
                        </div>
                        <div className="h-5 md:h-6 rounded-full bg-[#F8EFEA] overflow-hidden">
                          <div
                            className={`${color} h-full rounded-full`}
                            style={{ width: `${porcentaje(cantidad, totalEstados)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}

                  <div className="mt-6 md:mt-8 pt-5 border-t border-[#F4D4CF] grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "Pagados", val: resumen.pagos.pagado || 0, color: "text-green-600" },
                      { label: "Anticipo", val: resumen.pagos.anticipo || 0, color: "text-amber-600" },
                      { label: "Sin pago", val: resumen.pagos.pendiente || 0, color: "text-gray-500" },
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <p className={`text-2xl md:text-3xl font-black ${color}`}>{val}</p>
                        <p className="text-xs font-bold text-gray-400 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top products */}
              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-5 md:p-8 shadow-sm">
                <h3 className="text-2xl md:text-4xl font-black text-[#FF5C8A] mb-6 md:mb-8">
                  Productos más vendidos
                </h3>
                <div className="space-y-4 md:space-y-6">
                  {resumen.productosTop.length === 0 && (
                    <p className="text-zinc-500 font-bold text-sm">
                      Sin productos en este período.
                    </p>
                  )}
                  {resumen.productosTop.map((p) => (
                    <div key={p.nombre}>
                      <div className="flex items-center justify-between gap-4 mb-2 font-bold text-sm md:text-base">
                        <span className="truncate">{p.nombre}</span>
                        <span className="flex-shrink-0">{p.cantidad}</span>
                      </div>
                      <div className="h-4 md:h-5 rounded-full bg-[#FFE0DD] overflow-hidden">
                        <div
                          className="bg-[#FF5C8A] h-full rounded-full"
                          style={{ width: `${porcentaje(p.cantidad, maxProductos)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modalities */}
              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-5 md:p-8 shadow-sm">
                <h3 className="text-2xl md:text-4xl font-black text-[#F08C8C] mb-6 md:mb-8">
                  Modalidades
                </h3>
                <div className="space-y-4 md:space-y-6">
                  {resumen.modalidadesTop.length === 0 && (
                    <p className="text-zinc-500 font-bold text-sm">
                      Sin modalidades en este período.
                    </p>
                  )}
                  {resumen.modalidadesTop.map((m) => (
                    <div key={m.nombre}>
                      <div className="flex items-center justify-between gap-4 mb-2 font-bold text-sm md:text-base">
                        <span className="truncate">{m.nombre}</span>
                        <span className="flex-shrink-0">{m.cantidad}</span>
                      </div>
                      <div className="h-4 md:h-5 rounded-full bg-[#FFF0B8] overflow-hidden">
                        <div
                          className="bg-[#F08C8C] h-full rounded-full"
                          style={{ width: `${porcentaje(m.cantidad, maxModalidades)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── Bottom row ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">

              {/* Categories */}
              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-5 md:p-8 shadow-sm">
                <h3 className="text-2xl md:text-4xl font-black text-[#FF5C8A] mb-6 md:mb-8">
                  Categorías
                </h3>
                <div className="space-y-4 md:space-y-6">
                  {resumen.categoriasTop.length === 0 && (
                    <p className="text-zinc-500 font-bold text-sm">
                      Sin categorías en este período.
                    </p>
                  )}
                  {resumen.categoriasTop.map((c) => (
                    <div key={c.nombre}>
                      <div className="flex items-center justify-between gap-4 mb-2 font-bold text-sm md:text-base">
                        <span className="truncate">{c.nombre}</span>
                        <span className="flex-shrink-0">{c.cantidad}</span>
                      </div>
                      <div className="h-4 md:h-5 rounded-full bg-[#FFE4EC] overflow-hidden">
                        <div
                          className="bg-[#FF5C8A] h-full rounded-full"
                          style={{ width: `${porcentaje(c.cantidad, maxCategorias)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent activity */}
              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-5 md:p-8 shadow-sm">
                <h3 className="text-2xl md:text-4xl font-black text-[#FF5C8A] mb-6 md:mb-8">
                  Actividad reciente
                </h3>
                <div className="space-y-4 md:space-y-5">
                  {resumen.recientes.length === 0 && (
                    <p className="text-zinc-500 font-bold text-sm">
                      Sin pedidos en este período.
                    </p>
                  )}
                  {resumen.recientes.map((pedido) => (
                    <div
                      key={pedido.id}
                      className="border-b border-[#F4D4CF] pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-base md:text-lg leading-tight">
                          {pedido.cliente || "Sin cliente"}
                        </p>
                        <span className="font-black text-[#3F334A] flex-shrink-0 text-sm md:text-base">
                          {moneda(numero(pedido.total))}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs md:text-sm mt-1">
                        {obtenerEstadoEntrega(pedido)}
                        {" · "}
                        {obtenerEstadoPago(pedido)}
                        {" · "}
                        {formatearDia(obtenerClaveFecha(obtenerFechaPedido(pedido)))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </main>
        </div>
      </div>
    </div>
  )
}
