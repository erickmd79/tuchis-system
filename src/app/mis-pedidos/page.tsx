"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { generarPDF } from "../pedido/generarPDF"
import { moneda, numero } from "../../lib/pricing"
import { ADMIN_WHATSAPP } from "../../lib/constants"

// ─── Types ────────────────────────────────────────────────────────────────────

type Pedido = {
  id: number
  cliente: string
  telefono: string
  email: string | null
  lugar_entrega: string | null
  municipio: string | null
  fecha: string
  created_at: string
  total: number
  anticipo: number
  abono: number | null
  estado: string
  estado_pago: string
  notas: string | null
  productos: any[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizarTelefono = (tel: string): string =>
  tel.replace(/\D/g, "")

const formatearFecha = (valor?: string): string => {
  if (!valor) return "—"
  const soloFecha = String(valor).split("T")[0]
  const [anio, mes, dia] = soloFecha.split("-").map(Number)
  if (!anio || !mes || !dia) return String(valor)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const calcularSaldo = (p: Pedido): number => {
  if (p.estado_pago === "pagado") return 0
  return Math.max(
    numero(p.total) - numero(p.anticipo) - numero(p.abono ?? 0),
    0
  )
}

const badgePago = (
  p: Pedido
): { label: string; clase: string } => {
  const saldo = calcularSaldo(p)
  if (saldo <= 0)
    return { label: "Pagado", clase: "badge-pagado" }
  if (numero(p.anticipo) > 0)
    return { label: "Anticipo", clase: "badge-anticipo" }
  return { label: "Pendiente", clase: "badge-pendiente" }
}

const badgeEntrega = (
  p: Pedido
): { label: string; clase: string } => {
  if (p.estado === "entregado")
    return { label: "Entregado", clase: "badge-entregado" }
  return { label: "Pendiente", clase: "badge-pendiente" }
}

const armarMensajeWhatsApp = (pedido: Pedido): string => {
  const folio = `TCH-${pedido.id}`
  const total = numero(pedido.total)
  const anticipo = numero(pedido.anticipo)
  const abono = numero(pedido.abono ?? 0)
  const saldo = calcularSaldo(pedido)

  const prods = (
    Array.isArray(pedido.productos) ? pedido.productos : []
  )
    .map((p: any) => {
      const tamano = p.tamano_nombre || p.tamano || ""
      const detalle = [tamano, p.modalidad].filter(Boolean).join(", ")
      const sub = numero(p.precio_unitario || p.precio) * numero(p.cantidad)
      return `• ${p.nombre} x${p.cantidad}${detalle ? ` (${detalle})` : ""} — ${moneda(sub)}`
    })
    .join("\n")

  const estadoEntrega =
    pedido.estado === "entregado" ? "✅ Entregado" : "⏳ Pendiente"
  const estadoPago =
    saldo <= 0
      ? "✅ Pagado"
      : anticipo > 0
      ? "🔄 Con anticipo"
      : "⏳ Pendiente"

  return [
    `🎀 *TUCHIS alcancías — ${folio}*`,
    ``,
    `👤 *Cliente:* ${pedido.cliente}`,
    `📱 *Teléfono:* ${pedido.telefono}`,
    pedido.email ? `📧 *Email:* ${pedido.email}` : null,
    pedido.municipio ? `📍 *Municipio:* ${pedido.municipio}` : null,
    pedido.lugar_entrega
      ? `🏠 *Lugar de entrega:* ${pedido.lugar_entrega}`
      : null,
    `📅 *Fecha de entrega:* ${formatearFecha(pedido.fecha)}`,
    ``,
    `📦 *Productos:*`,
    prods,
    ``,
    `💰 *Total:* ${moneda(total)}`,
    `🤝 *Anticipo:* ${moneda(anticipo)}`,
    abono > 0 ? `➕ *Abono:* ${moneda(abono)}` : null,
    `📊 *Saldo:* ${moneda(saldo)}`,
    ``,
    `🚚 *Entrega:* ${estadoEntrega}`,
    `💳 *Pago:* ${estadoPago}`,
    pedido.notas ? `\n📝 *Notas:* ${pedido.notas}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n")
}

// ─── Component ────────────────────────────────────────────────────────────────

type Paso = 1 | 2 | 3

export default function MisPedidosPage() {
  const [paso, setPaso] = useState<Paso>(1)
  const [telefonoInput, setTelefonoInput] = useState("")
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [error, setError] = useState("")

  // ── Step 1: search ──────────────────────────────────────────────────────────

  const buscarPedidos = async () => {
    const telNorm = normalizarTelefono(telefonoInput)
    const telOrig = telefonoInput.trim()

    if (telNorm.length < 8) {
      setError("Ingresa un teléfono válido (mínimo 8 dígitos).")
      return
    }

    setBuscando(true)
    setError("")

    const candidatos = [...new Set([telNorm, telOrig])].filter(Boolean)

    const { data, error: dbError } = await supabase
      .from("pedidos")
      .select(
        "id, cliente, telefono, email, lugar_entrega, municipio, fecha, created_at, total, anticipo, abono, estado, estado_pago, notas, productos"
      )
      .in("telefono", candidatos)
      .order("id", { ascending: false })
      .limit(20)

    setBuscando(false)

    if (dbError) {
      setError("Ocurrió un error al buscar. Intenta de nuevo.")
      return
    }

    if (!data || data.length === 0) {
      setError(
        "No encontramos pedidos con ese teléfono. Verifica el número e intenta de nuevo."
      )
      return
    }

    setPedidos(data as Pedido[])
    setPaso(2)
  }

  const volverABuscar = () => {
    setPaso(1)
    setPedidos([])
    setPedidoActivo(null)
    setError("")
  }

  // ── Step 2: select pedido ───────────────────────────────────────────────────

  const abrirDetalle = (pedido: Pedido) => {
    setPedidoActivo(pedido)
    setPaso(3)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const volverALista = () => {
    setPedidoActivo(null)
    setPaso(2)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── Step 3: actions ─────────────────────────────────────────────────────────

  const descargarPDF = async () => {
    if (!pedidoActivo) return
    setGenerandoPDF(true)
    try {
      await generarPDF(pedidoActivo)
    } finally {
      setGenerandoPDF(false)
    }
  }

  const enviarWhatsApp = () => {
    if (!pedidoActivo) return
    const msg = armarMensajeWhatsApp(pedidoActivo)
    window.open(
      `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`,
      "_blank"
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-[70vh]">
      <div className="max-w-[720px] mx-auto px-4 py-8 md:py-12">

        {/* ── Paso 1: Buscar ── */}
        {paso === 1 && (
          <div>
            <h1 className="text-5xl md:text-7xl font-black text-cyan-500 leading-none mb-3">
              Mis pedidos
            </h1>
            <p className="text-gray-500 text-base md:text-lg mb-10">
              Consulta el estado de tus pedidos ingresando tu número de teléfono.
            </p>

            <div className="section-card">
              <h2 className="text-2xl font-black text-cyan-600 mb-6">
                Buscar mis pedidos
              </h2>

              <label className="block text-sm font-bold text-gray-600 mb-2">
                Número de teléfono
              </label>
              <input
                type="tel"
                value={telefonoInput}
                onChange={(e) => {
                  setTelefonoInput(e.target.value)
                  setError("")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") buscarPedidos()
                }}
                placeholder="Ej: 2721234567"
                className="input-premium mb-2"
                autoFocus
              />

              {error && (
                <p className="text-sm font-bold text-red-500 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                  {error}
                </p>
              )}

              <button
                onClick={buscarPedidos}
                disabled={buscando}
                className="btn-primary w-full mt-4 disabled:opacity-60"
              >
                {buscando ? "Buscando…" : "Buscar mis pedidos"}
              </button>
            </div>

            <p className="text-center text-sm text-gray-400 mt-8">
              ¿Quieres hacer un nuevo pedido?{" "}
              <Link
                href="/catalogo"
                className="font-bold text-cyan-500 underline"
              >
                Ver catálogo
              </Link>
            </p>
          </div>
        )}

        {/* ── Paso 2: Lista ── */}
        {paso === 2 && (
          <div>
            <button
              onClick={volverABuscar}
              className="inline-flex items-center gap-2 text-cyan-600 font-bold text-sm mb-8 hover:opacity-70 transition"
            >
              ← Buscar de nuevo
            </button>

            <h1 className="text-4xl md:text-6xl font-black text-cyan-500 leading-none mb-2">
              Tus pedidos
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              {pedidos.length}{" "}
              {pedidos.length === 1 ? "pedido encontrado" : "pedidos encontrados"}{" "}
              · {normalizarTelefono(telefonoInput)}
            </p>

            <div className="flex flex-col gap-4">
              {pedidos.map((pedido) => {
                const bp = badgePago(pedido)
                const be = badgeEntrega(pedido)
                return (
                  <button
                    key={pedido.id}
                    onClick={() => abrirDetalle(pedido)}
                    className="section-card text-left hover:shadow-md transition-shadow w-full"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Folio + cliente */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl font-black text-cyan-600">
                            #{pedido.id}
                          </span>
                          <span className="text-base font-bold text-gray-800 truncate">
                            {pedido.cliente}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Entrega:{" "}
                          <span className="font-bold">
                            {formatearFecha(pedido.fecha)}
                          </span>
                        </div>
                      </div>

                      {/* Monto + badges */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-shrink-0">
                        <span className="text-xl font-black text-[#F49B93]">
                          {moneda(pedido.total)}
                        </span>
                        <div className="flex gap-2 flex-wrap sm:justify-end">
                          <span
                            className={`badge-pedido ${be.clase}`}
                            style={{ fontSize: 11, padding: "4px 10px" }}
                          >
                            {be.label}
                          </span>
                          <span
                            className={`badge-pedido ${bp.clase}`}
                            style={{ fontSize: 11, padding: "4px 10px" }}
                          >
                            {bp.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-center text-sm text-gray-400 mt-10">
              ¿Quieres hacer un nuevo pedido?{" "}
              <Link
                href="/catalogo"
                className="font-bold text-cyan-500 underline"
              >
                Ver catálogo
              </Link>
            </p>
          </div>
        )}

        {/* ── Paso 3: Detalle ── */}
        {paso === 3 && pedidoActivo && (() => {
          const p = pedidoActivo
          const bp = badgePago(p)
          const be = badgeEntrega(p)
          const total = numero(p.total)
          const anticipo = numero(p.anticipo)
          const abono = numero(p.abono ?? 0)
          const saldo = calcularSaldo(p)
          const productos: any[] = Array.isArray(p.productos) ? p.productos : []

          return (
            <div>
              <button
                onClick={volverALista}
                className="inline-flex items-center gap-2 text-cyan-600 font-bold text-sm mb-8 hover:opacity-70 transition"
              >
                ← Mis pedidos
              </button>

              {/* Header folio + cliente */}
              <div className="mb-8">
                <div className="flex flex-wrap items-baseline gap-3 mb-1">
                  <span className="text-2xl font-black text-gray-400">
                    TCH-{p.id}
                  </span>
                  <h1 className="text-4xl md:text-6xl font-black text-cyan-500 leading-none">
                    {p.cliente}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`badge-pedido ${be.clase}`}>
                    {be.label}
                  </span>
                  <span className={`badge-pedido ${bp.clase}`}>
                    {bp.label}
                  </span>
                </div>
              </div>

              {/* Info cards grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <InfoCard label="Teléfono" value={p.telefono} />
                {p.email && <InfoCard label="Email" value={p.email} />}
                {p.municipio && (
                  <InfoCard label="Municipio" value={p.municipio} />
                )}
                {p.lugar_entrega && (
                  <InfoCard label="Lugar de entrega" value={p.lugar_entrega} />
                )}
                <InfoCard
                  label="Fecha de entrega"
                  value={formatearFecha(p.fecha)}
                />
                <InfoCard
                  label="Fecha de pedido"
                  value={formatearFecha(p.created_at)}
                />
              </div>

              {/* Notas */}
              {p.notas && (
                <div className="section-card mb-6">
                  <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                    Notas
                  </div>
                  <p className="text-sm font-bold text-gray-600 leading-relaxed">
                    {p.notas}
                  </p>
                </div>
              )}

              {/* Productos */}
              <div className="section-card mb-6">
                <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
                  Productos · {productos.length}{" "}
                  {productos.length === 1 ? "artículo" : "artículos"}
                </div>

                <div className="flex flex-col gap-3">
                  {productos.map((prod: any, i: number) => {
                    const tamano = prod.tamano_nombre || prod.tamano || ""
                    const detalles = [tamano, prod.modalidad]
                      .filter(Boolean)
                      .join(" · ")
                    const precioUnit = numero(
                      prod.precio_unitario || prod.precio
                    )
                    const sub = precioUnit * numero(prod.cantidad)

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-[#FFF8F5] rounded-2xl p-3"
                      >
                        {/* Imagen o número */}
                        {prod.imagenes?.[0] || prod.imagen ? (
                          <img
                            src={prod.imagenes?.[0] || prod.imagen}
                            alt={prod.nombre}
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-[#D9F5F8] flex items-center justify-center flex-shrink-0 text-cyan-500 font-black text-lg">
                            {i + 1}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-black text-cyan-600 truncate">
                            {prod.nombre}
                          </div>
                          {detalles && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {detalles} · {numero(prod.cantidad)} pza.
                            </div>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-black text-[#F49B93]">
                            {moneda(sub)}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {moneda(precioUnit)} c/u
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Totales */}
              <div
                className="rounded-[24px] p-5 mb-8 text-white"
                style={{
                  background:
                    "linear-gradient(135deg,#20B8C9 0%,#1AA8B8 100%)",
                }}
              >
                <div
                  className={`grid gap-4 ${
                    abono > 0
                      ? "grid-cols-2 md:grid-cols-4"
                      : "grid-cols-3"
                  }`}
                >
                  <TotalItem label="Total" value={moneda(total)} grande />
                  <TotalItem label="Anticipo" value={moneda(anticipo)} />
                  {abono > 0 && (
                    <TotalItem label="Abono" value={moneda(abono)} />
                  )}
                  <TotalItem label="Saldo" value={moneda(saldo)} />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={descargarPDF}
                  disabled={generandoPDF}
                  className="btn-primary flex-1 disabled:opacity-60"
                >
                  {generandoPDF ? "Generando PDF…" : "Ver / Descargar PDF"}
                </button>

                <button
                  onClick={enviarWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 font-black text-white rounded-[18px] px-6 py-4"
                  style={{ background: "#25D366" }}
                >
                  <WhatsAppIcon />
                  Enviar a TUCHIS
                </button>
              </div>

              <p className="text-center text-sm text-gray-400 mt-8">
                ¿Quieres hacer un nuevo pedido?{" "}
                <Link
                  href="/catalogo"
                  className="font-bold text-cyan-500 underline"
                >
                  Ver catálogo
                </Link>
              </p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="bg-white border border-[#F5D3CD] rounded-2xl p-3 md:p-4">
      <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
        {label}
      </div>
      <div className="font-black text-gray-800 text-sm md:text-base leading-snug break-words">
        {value}
      </div>
    </div>
  )
}

function TotalItem({
  label,
  value,
  grande,
}: {
  label: string
  value: string
  grande?: boolean
}) {
  return (
    <div className="text-center">
      <div className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
        {label}
      </div>
      <div
        className={`font-black leading-none ${
          grande ? "text-3xl" : "text-xl"
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={20}
      height={20}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}
