"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { generarPDF } from "../pedido/generarPDF"
import {
  moneda,
  numero,
  obtenerModalidadesDisponibles,
  obtenerPrecioPorEscala,
  type Escala,
} from "../../lib/pricing"
import { ADMIN_WHATSAPP, DRAFT_KEY } from "../../lib/constants"

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

type ProductoModal = {
  uid: string
  producto_id: number
  nombre: string
  tamano: string
  tamano_id: number
  modalidad: string
  cantidad: number
  precio_original: number
  precio_actual: number
  imagenes: string[]
  precio_menudeo?: number
  precio_mayoreo?: number
  precio_blanca_menudeo?: number
  precio_blanca_mayoreo?: number
  precio_pintada_menudeo?: number
  precio_pintada_mayoreo?: number
  precio_kit_menudeo?: number
  precio_kit_mayoreo?: number
  minimo_mayoreo?: number
}

type ReorderDraft = {
  pedidoOriginal: Pedido
  form: {
    nombre: string
    telefono: string
    email: string
    municipio: string
    lugarEntrega: string
    fecha: string
    notas: string
    anticipo: string
  }
  productos: ProductoModal[]
  expiresAt: number
  autoOpen?: boolean
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizarTelefono = (tel: string): string => tel.replace(/\D/g, "")

const obtenerFechaHoy = (): string => {
  const f = new Date()
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

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

const badgePago = (p: Pedido): { label: string; clase: string } => {
  const saldo = calcularSaldo(p)
  if (saldo <= 0) return { label: "Pagado", clase: "badge-pagado" }
  if (numero(p.anticipo) > 0)
    return { label: "Anticipo", clase: "badge-anticipo" }
  return { label: "Pendiente", clase: "badge-pendiente" }
}

const badgeEntrega = (p: Pedido): { label: string; clase: string } => {
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

  const prods = (Array.isArray(pedido.productos) ? pedido.productos : [])
    .map((p: any) => {
      const tamano = p.tamano_nombre || p.tamano || ""
      const detalle = [tamano, p.modalidad].filter(Boolean).join(", ")
      const sub =
        numero(p.precio_unitario || p.precio) * numero(p.cantidad)
      return `• ${p.nombre} x${p.cantidad}${
        detalle ? ` (${detalle})` : ""
      } — ${moneda(sub)}`
    })
    .join("\n")

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
    `🚚 *Entrega:* ${
      pedido.estado === "entregado" ? "✅ Entregado" : "⏳ Pendiente"
    }`,
    `💳 *Pago:* ${
      saldo <= 0
        ? "✅ Pagado"
        : anticipo > 0
        ? "🔄 Con anticipo"
        : "⏳ Pendiente"
    }`,
    pedido.notas ? `\n📝 *Notas:* ${pedido.notas}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n")
}

const leerDraft = (): ReorderDraft | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft: ReorderDraft = JSON.parse(raw)
    if (Date.now() > draft.expiresAt) {
      localStorage.removeItem(DRAFT_KEY)
      return null
    }
    return draft
  } catch {
    localStorage.removeItem(DRAFT_KEY)
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Paso = 1 | 2 | 3

export default function MisPedidosPage() {
  // ── Base state ──────────────────────────────────────────────────────────────
  const [paso, setPaso] = useState<Paso>(1)
  const [telefonoInput, setTelefonoInput] = useState("")
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [error, setError] = useState("")

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toastMsg, setToastMsg] = useState("")
  const [toastOn, setToastOn] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrarToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg)
    setToastOn(true)
    toastTimer.current = setTimeout(() => setToastOn(false), 5500)
  }

  // ── Draft (borrador "Volver a pedir") ───────────────────────────────────────
  const [draftGuardado, setDraftGuardado] = useState<ReorderDraft | null>(null)
  const [recuperandoDraft, setRecuperandoDraft] = useState(false)

  useEffect(() => {
    const draft = leerDraft()
    if (!draft) return
    if (draft.autoOpen) {
      // Came back from catalog after adding a product — open modal directly
      recuperarBorrador(draft)
    } else {
      setDraftGuardado(draft)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Modal "Volver a pedir" ───────────────────────────────────────────────────
  const [modalVolverAbierto, setModalVolverAbierto] = useState(false)
  const [cargandoModal, setCargandoModal] = useState(false)
  const [escalasModal, setEscalasModal] = useState<Escala[]>([])

  // Form
  const [vNombre, setVNombre] = useState("")
  const [vTelefono, setVTelefono] = useState("")
  const [vEmail, setVEmail] = useState("")
  const [vMunicipio, setVMunicipio] = useState("")
  const [vLugarEntrega, setVLugarEntrega] = useState("")
  const [vFecha, setVFecha] = useState("")
  const [vNotas, setVNotas] = useState("")
  const [vAnticipo, setVAnticipo] = useState("")
  const [vProductos, setVProductos] = useState<ProductoModal[]>([])

  // Save
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)
  const [errorModal, setErrorModal] = useState("")

  // Computed modal values
  const totalModal = useMemo(
    () => vProductos.reduce((a, p) => a + p.precio_actual * p.cantidad, 0),
    [vProductos]
  )
  const anticipoNum = Math.min(Math.max(0, numero(vAnticipo)), totalModal)
  const saldoModal = Math.max(totalModal - anticipoNum, 0)

  // ── Data helpers ─────────────────────────────────────────────────────────────

  const fetchPedidos = async (): Promise<Pedido[]> => {
    const telNorm = normalizarTelefono(telefonoInput)
    const telOrig = telefonoInput.trim()
    const candidatos = [...new Set([telNorm, telOrig])].filter(Boolean)
    const { data } = await supabase
      .from("pedidos")
      .select(
        "id,cliente,telefono,email,lugar_entrega,municipio,fecha,created_at,total,anticipo,abono,estado,estado_pago,notas,productos"
      )
      .in("telefono", candidatos)
      .order("id", { ascending: false })
      .limit(20)
    return (data || []) as Pedido[]
  }

  const convertirItemCarrito = (
    item: any,
    index: number,
    escalas: Escala[]
  ): ProductoModal => {
    const tamanoId = Number(item.tamano_id) || 0
    const modalidad = item.modalidad ?? ""
    const cantidad = Math.max(1, numero(item.cantidad))
    let precioActual = numero(item.precio_unitario ?? item.precio)
    if (tamanoId > 0 && modalidad && escalas.length > 0) {
      const desdeEscala = obtenerPrecioPorEscala(
        escalas,
        tamanoId,
        modalidad,
        cantidad
      )
      if (desdeEscala > 0) precioActual = desdeEscala
    }
    return {
      uid: `cart-${Date.now()}-${index}`,
      producto_id: item.producto_id ?? item.id,
      nombre: item.nombre ?? "Producto",
      tamano: item.tamano_nombre ?? item.tamano ?? "",
      tamano_id: tamanoId,
      modalidad,
      cantidad,
      precio_original: 0,
      precio_actual: precioActual,
      imagenes: item.imagenes ?? [],
      precio_menudeo: item.precio_menudeo,
      precio_mayoreo: item.precio_mayoreo,
      precio_blanca_menudeo: item.precio_blanca_menudeo,
      precio_blanca_mayoreo: item.precio_blanca_mayoreo,
      precio_pintada_menudeo: item.precio_pintada_menudeo,
      precio_pintada_mayoreo: item.precio_pintada_mayoreo,
      precio_kit_menudeo: item.precio_kit_menudeo,
      precio_kit_mayoreo: item.precio_kit_mayoreo,
      minimo_mayoreo: item.minimo_mayoreo,
    }
  }

  // ── Step 1: search ───────────────────────────────────────────────────────────

  const buscarPedidos = async () => {
    const telNorm = normalizarTelefono(telefonoInput)
    if (telNorm.length < 8) {
      setError("Ingresa un teléfono válido (mínimo 8 dígitos).")
      return
    }
    setBuscando(true)
    setError("")
    const data = await fetchPedidos()
    setBuscando(false)
    if (data.length === 0) {
      setError(
        "No encontramos pedidos con ese teléfono. Verifica el número e intenta de nuevo."
      )
      return
    }
    setPedidos(data)
    setPaso(2)
  }

  const volverABuscar = () => {
    setPaso(1)
    setPedidos([])
    setPedidoActivo(null)
    setError("")
  }

  // ── Step 2 ───────────────────────────────────────────────────────────────────

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

  // ── Step 3: actions ──────────────────────────────────────────────────────────

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

  // ── Modal: open ──────────────────────────────────────────────────────────────

  const poblarModal = (
    pedido: Pedido,
    escalas: Escala[],
    productosIniciales: ProductoModal[]
  ) => {
    setVNombre(pedido.cliente)
    setVTelefono(pedido.telefono)
    setVEmail(pedido.email ?? "")
    setVMunicipio(pedido.municipio ?? "")
    setVLugarEntrega(pedido.lugar_entrega ?? "")
    setVFecha("")
    setVNotas(pedido.notas ?? "")
    setVProductos(productosIniciales)
    const totalInicial = productosIniciales.reduce(
      (a, p) => a + p.precio_actual * p.cantidad,
      0
    )
    setVAnticipo(String(Math.round(totalInicial * 0.5)))
    setEscalasModal(escalas)
    setErrorModal("")
  }

  const abrirModalVolver = async () => {
    if (!pedidoActivo) return
    setModalVolverAbierto(true)
    setCargandoModal(true)

    const { data: escData } = await supabase.from("escalas").select("*")
    const escalas = (escData ?? []) as Escala[]

    const productosPreparados: ProductoModal[] = (
      pedidoActivo.productos ?? []
    ).map((p: any, i: number) => {
      const tamanoId = Number(p.tamano_id) || 0
      const modalidad = p.modalidad ?? ""
      const cantidad = Math.max(1, numero(p.cantidad))
      const precioOriginal = numero(p.precio_unitario ?? p.precio)
      let precioActual = precioOriginal
      if (tamanoId > 0 && modalidad && escalas.length > 0) {
        const desdeEscala = obtenerPrecioPorEscala(
          escalas,
          tamanoId,
          modalidad,
          cantidad
        )
        if (desdeEscala > 0) precioActual = desdeEscala
      }
      return {
        uid: `orig-${i}-${p.producto_id ?? i}`,
        producto_id: p.producto_id ?? p.id,
        nombre: p.nombre ?? "Producto",
        tamano: p.tamano_nombre ?? p.tamano ?? "",
        tamano_id: tamanoId,
        modalidad,
        cantidad,
        precio_original: precioOriginal,
        precio_actual: precioActual,
        imagenes: p.imagenes ?? [],
        precio_menudeo: p.precio_menudeo,
        precio_mayoreo: p.precio_mayoreo,
        precio_blanca_menudeo: p.precio_blanca_menudeo,
        precio_blanca_mayoreo: p.precio_blanca_mayoreo,
        precio_pintada_menudeo: p.precio_pintada_menudeo,
        precio_pintada_mayoreo: p.precio_pintada_mayoreo,
        precio_kit_menudeo: p.precio_kit_menudeo,
        precio_kit_mayoreo: p.precio_kit_mayoreo,
        minimo_mayoreo: p.minimo_mayoreo,
      }
    })

    poblarModal(pedidoActivo, escalas, productosPreparados)
    setCargandoModal(false)
  }

  const cerrarModalVolver = () => {
    setModalVolverAbierto(false)
    setErrorModal("")
  }

  // ── Draft: save & go to catalog ──────────────────────────────────────────────

  const guardarBorrador = () => {
    if (!pedidoActivo) return
    const draft: ReorderDraft = {
      pedidoOriginal: pedidoActivo,
      form: {
        nombre: vNombre,
        telefono: vTelefono,
        email: vEmail,
        municipio: vMunicipio,
        lugarEntrega: vLugarEntrega,
        fecha: vFecha,
        notas: vNotas,
        anticipo: vAnticipo,
      },
      productos: vProductos,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  const irAlCatalogo = () => {
    guardarBorrador()
    cerrarModalVolver()
    window.location.href = "/catalogo?modo=volver-a-pedir"
  }

  // ── Draft: discard ───────────────────────────────────────────────────────────

  const descartarBorrador = () => {
    localStorage.removeItem(DRAFT_KEY)
    setDraftGuardado(null)
  }

  // ── Draft: recover ───────────────────────────────────────────────────────────

  const recuperarBorrador = async (draftOverride?: ReorderDraft) => {
    const draft = draftOverride ?? draftGuardado
    if (!draft) return
    setRecuperandoDraft(true)

    const { data: escData } = await supabase.from("escalas").select("*")
    const escalas = (escData ?? []) as Escala[]

    // When autoOpen (back from catalog), products are already in draft.productos.
    // When manual recovery, merge any normal cart items too.
    let itemsCarrito: ProductoModal[] = []
    if (!draft.autoOpen) {
      try {
        const carritoBruto: any[] = JSON.parse(
          localStorage.getItem("carrito") || "[]"
        )
        itemsCarrito = carritoBruto.map((item, i) =>
          convertirItemCarrito(item, i, escalas)
        )
      } catch {
        // malformed cart — ignore
      }
    }

    const productosFusionados = [...draft.productos, ...itemsCarrito]

    const f = draft.form
    setVNombre(f.nombre)
    setVTelefono(f.telefono)
    setVEmail(f.email)
    setVMunicipio(f.municipio)
    setVLugarEntrega(f.lugarEntrega)
    setVFecha(f.fecha)
    setVNotas(f.notas)
    setVAnticipo(f.anticipo)
    setVProductos(productosFusionados)
    setEscalasModal(escalas)
    setErrorModal("")

    const totalFusionado = productosFusionados.reduce(
      (a, p) => a + p.precio_actual * p.cantidad,
      0
    )
    if (!f.anticipo || f.anticipo === "0") {
      setVAnticipo(String(Math.round(totalFusionado * 0.5)))
    }

    setPedidoActivo(draft.pedidoOriginal)

    localStorage.removeItem(DRAFT_KEY)
    setDraftGuardado(null)
    setRecuperandoDraft(false)

    setModalVolverAbierto(true)

    if (itemsCarrito.length > 0) {
      mostrarToast(
        `${itemsCarrito.length} producto${
          itemsCarrito.length > 1 ? "s" : ""
        } del carrito agregado${
          itemsCarrito.length > 1 ? "s" : ""
        } al pedido.`
      )
    }
  }

  // ── Modal: product edits ─────────────────────────────────────────────────────

  const actualizarProducto = (
    uid: string,
    campo: "modalidad" | "cantidad",
    valor: string
  ) => {
    setVProductos((prev) =>
      prev.map((p) => {
        if (p.uid !== uid) return p
        const nuevaCantidad =
          campo === "cantidad"
            ? Math.max(1, numero(valor) || 1)
            : p.cantidad
        const nuevaModalidad =
          campo === "modalidad" ? valor : p.modalidad
        let precioActual = p.precio_original

        if (p.tamano_id > 0 && nuevaModalidad && escalasModal.length > 0) {
          const desdeEscala = obtenerPrecioPorEscala(
            escalasModal,
            p.tamano_id,
            nuevaModalidad,
            nuevaCantidad
          )
          precioActual = desdeEscala > 0 ? desdeEscala : 0
        }

        return {
          ...p,
          cantidad: nuevaCantidad,
          modalidad: nuevaModalidad,
          precio_actual: precioActual,
        }
      })
    )
  }

  const quitarProducto = (uid: string) => {
    setVProductos((prev) => prev.filter((p) => p.uid !== uid))
  }

  // ── Modal: save new order ────────────────────────────────────────────────────

  const guardarNuevoPedido = async () => {
    setErrorModal("")

    if (!vNombre.trim()) {
      setErrorModal("El nombre del cliente es obligatorio.")
      return
    }
    if (!vTelefono.trim()) {
      setErrorModal("El teléfono es obligatorio.")
      return
    }
    if (!vLugarEntrega.trim()) {
      setErrorModal("El lugar de entrega es obligatorio.")
      return
    }
    if (!vMunicipio.trim()) {
      setErrorModal("El municipio es obligatorio.")
      return
    }
    if (!vFecha) {
      setErrorModal("La fecha de entrega es obligatoria.")
      return
    }
    if (vProductos.length === 0) {
      setErrorModal("Agrega al menos un producto.")
      return
    }
    if (vProductos.some((p) => !p.modalidad)) {
      setErrorModal("Selecciona la modalidad de todos los productos.")
      return
    }
    if (vProductos.some((p) => p.precio_actual === 0)) {
      setErrorModal(
        "Algunos productos no tienen precio en escalas. Cambia la modalidad o contacta a TUCHIS."
      )
      return
    }
    if (anticipoNum > totalModal) {
      setErrorModal("El anticipo no puede ser mayor al total.")
      return
    }

    setGuardandoNuevo(true)

    const estadoPagoFinal =
      totalModal > 0 && anticipoNum >= totalModal ? "pagado" : "anticipo"

    const { error: dbError } = await supabase.from("pedidos").insert([
      {
        cliente: vNombre.trim(),
        telefono: vTelefono.trim(),
        email: vEmail.trim() || null,
        lugar_entrega: vLugarEntrega.trim() || null,
        municipio: vMunicipio.trim() || null,
        fecha: vFecha,
        notas: vNotas.trim(),
        productos: vProductos.map((p) => ({
          producto_id: p.producto_id,
          nombre: p.nombre,
          precio: p.precio_actual,
          precio_unitario: p.precio_actual,
          cantidad: p.cantidad,
          tamano: p.tamano,
          tamano_id: p.tamano_id || undefined,
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
          imagenes: p.imagenes ?? [],
        })),
        total: totalModal,
        anticipo: anticipoNum,
        estado_pago: estadoPagoFinal,
        estado: "pendiente",
      },
    ])

    setGuardandoNuevo(false)

    if (dbError) {
      setErrorModal(`Error al guardar: ${dbError.message}`)
      return
    }

    // Success: close modal, refresh list, go to step 2
    setModalVolverAbierto(false)
    setPedidoActivo(null)

    const listActualizada = await fetchPedidos()
    setPedidos(listActualizada)
    setPaso(2)
    window.scrollTo({ top: 0, behavior: "smooth" })

    mostrarToast(
      "¡Pedido generado correctamente! Ya puedes descargar tu PDF o enviarlo por WhatsApp."
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-[70vh]">

      {/* Toast */}
      {toastOn && (
        <div
          className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[400px] z-[9999] bg-[#DDF5EA] border border-[#BFEAD8] text-[#238657] rounded-2xl px-5 py-4 flex items-start gap-3 shadow-xl"
          style={{ animation: "toast-in .28s ease-out forwards" }}
        >
          <span className="text-2xl mt-0.5">✓</span>
          <p className="font-bold text-sm flex-1 leading-snug">{toastMsg}</p>
          <button
            onClick={() => setToastOn(false)}
            className="font-black text-lg leading-none opacity-50 hover:opacity-100 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-[720px] mx-auto px-4 py-8 md:py-12">

        {/* Draft recovery banner */}
        {draftGuardado && (
          <div className="bg-[#E0D5FF] border border-[#D7C3FF] rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-black text-[#6D4AA8] text-base">
                🔁 Tienes un pedido en borrador
              </p>
              <p className="text-sm text-[#6D4AA8] opacity-75 mt-0.5">
                Basado en TCH-{draftGuardado.pedidoOriginal.id} ·{" "}
                {draftGuardado.productos.length} producto
                {draftGuardado.productos.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
              <button
                onClick={() => recuperarBorrador()}
                disabled={recuperandoDraft}
                className="flex-1 sm:flex-none bg-[#6D4AA8] text-white font-black rounded-2xl px-4 py-2.5 text-sm hover:opacity-90 transition disabled:opacity-60"
              >
                {recuperandoDraft ? "Cargando…" : "Continuar pedido"}
              </button>
              <button
                onClick={descartarBorrador}
                className="bg-white text-[#6D4AA8] font-black rounded-2xl px-4 py-2.5 text-sm hover:opacity-80 transition border border-[#D7C3FF]"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

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
              {pedidos.length === 1
                ? "pedido encontrado"
                : "pedidos encontrados"}{" "}
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
        {paso === 3 &&
          pedidoActivo &&
          (() => {
            const p = pedidoActivo
            const bp = badgePago(p)
            const be = badgeEntrega(p)
            const total = numero(p.total)
            const anticipo = numero(p.anticipo)
            const abono = numero(p.abono ?? 0)
            const saldo = calcularSaldo(p)
            const productos: any[] = Array.isArray(p.productos)
              ? p.productos
              : []

            return (
              <div>
                <button
                  onClick={volverALista}
                  className="inline-flex items-center gap-2 text-cyan-600 font-bold text-sm mb-8 hover:opacity-70 transition"
                >
                  ← Mis pedidos
                </button>

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

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  <InfoCard label="Teléfono" value={p.telefono} />
                  {p.email && (
                    <InfoCard label="Email" value={p.email} />
                  )}
                  {p.municipio && (
                    <InfoCard label="Municipio" value={p.municipio} />
                  )}
                  {p.lugar_entrega && (
                    <InfoCard
                      label="Lugar de entrega"
                      value={p.lugar_entrega}
                    />
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

                <div className="section-card mb-6">
                  <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
                    Productos · {productos.length}{" "}
                    {productos.length === 1 ? "artículo" : "artículos"}
                  </div>

                  <div className="flex flex-col gap-3">
                    {productos.map((prod: any, i: number) => {
                      const tamano =
                        prod.tamano_nombre || prod.tamano || ""
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
                    <TotalItem
                      label="Total"
                      value={moneda(total)}
                      grande
                    />
                    <TotalItem label="Anticipo" value={moneda(anticipo)} />
                    {abono > 0 && (
                      <TotalItem label="Abono" value={moneda(abono)} />
                    )}
                    <TotalItem label="Saldo" value={moneda(saldo)} />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <button
                    onClick={descargarPDF}
                    disabled={generandoPDF}
                    className="btn-primary flex-1 disabled:opacity-60"
                  >
                    {generandoPDF
                      ? "Generando PDF…"
                      : "Ver / Descargar PDF"}
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

                <button
                  onClick={abrirModalVolver}
                  className="w-full bg-[#E0D5FF] text-[#6D4AA8] font-black rounded-[18px] px-6 py-4 hover:opacity-90 transition"
                >
                  🔁 Volver a pedir
                </button>

                <p className="text-center text-sm text-gray-400 mt-8">
                  ¿Quieres explorar más productos?{" "}
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

      {/* ── Modal Volver a pedir ── */}
      {modalVolverAbierto && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModalVolver()
          }}
        >
          <div className="modal-content modal-enter max-w-2xl w-full">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-black text-cyan-600">
                  Volver a pedir
                </h2>
                {pedidoActivo && (
                  <p className="text-sm text-gray-400 font-bold mt-1">
                    Basado en pedido TCH-{pedidoActivo.id}
                  </p>
                )}
              </div>
              <button
                onClick={cerrarModalVolver}
                className="w-11 h-11 rounded-2xl bg-[#FFE0DD] text-gray-700 font-black text-xl flex items-center justify-center hover:opacity-80 transition flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {cargandoModal ? (
              <div className="flex flex-col items-center gap-4 py-16 text-gray-400">
                <div className="w-10 h-10 rounded-full border-4 border-[#D9F5F8] border-t-cyan-500 animate-spin" />
                <p className="font-bold text-sm">
                  Cargando datos del pedido…
                </p>
              </div>
            ) : (
              <div className="space-y-8">

                {/* ── Datos del cliente ── */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
                    Datos del cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={vNombre}
                        onChange={(e) => setVNombre(e.target.value)}
                        placeholder="Nombre completo"
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        value={vTelefono}
                        onChange={(e) => setVTelefono(e.target.value)}
                        placeholder="Teléfono"
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">
                        Email
                      </label>
                      <input
                        type="email"
                        value={vEmail}
                        onChange={(e) => setVEmail(e.target.value)}
                        placeholder="Email (opcional)"
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">
                        Municipio *
                      </label>
                      <input
                        type="text"
                        value={vMunicipio}
                        onChange={(e) => setVMunicipio(e.target.value)}
                        placeholder="Municipio"
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">
                        Lugar de entrega *
                      </label>
                      <input
                        type="text"
                        value={vLugarEntrega}
                        onChange={(e) => setVLugarEntrega(e.target.value)}
                        placeholder="Domicilio, colonia…"
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">
                        Fecha de entrega *
                      </label>
                      <input
                        type="date"
                        value={vFecha}
                        min={obtenerFechaHoy()}
                        onChange={(e) => setVFecha(e.target.value)}
                        className="input-premium"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">
                        Notas
                      </label>
                      <textarea
                        value={vNotas}
                        onChange={(e) => setVNotas(e.target.value)}
                        placeholder="Indicaciones adicionales…"
                        rows={2}
                        className="textarea"
                      />
                    </div>
                  </div>
                </section>

                {/* ── Productos ── */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
                    Productos
                  </h3>

                  {vProductos.length === 0 ? (
                    <p className="text-sm text-gray-400 font-bold text-center py-6">
                      Sin productos. Agrégalos desde el catálogo.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3 mb-5">
                      {vProductos.map((prod) => {
                        const preciosCambiaron =
                          prod.precio_original > 0 &&
                          Math.abs(
                            prod.precio_actual - prod.precio_original
                          ) > 0.01
                        const sinPrecio =
                          prod.precio_actual === 0 &&
                          prod.tamano_id > 0

                        return (
                          <div
                            key={prod.uid}
                            className="bg-[#FFF8F5] border border-[#F5D3CD] rounded-2xl p-4"
                          >
                            <div className="flex items-start gap-3">
                              {prod.imagenes[0] ? (
                                <img
                                  src={prod.imagenes[0]}
                                  alt={prod.nombre}
                                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-[#D9F5F8] flex items-center justify-center flex-shrink-0 text-cyan-500 font-black">
                                  {prod.nombre.charAt(0)}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-black text-cyan-600 truncate text-sm">
                                      {prod.nombre}
                                    </p>
                                    {prod.tamano && (
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {prod.tamano}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() =>
                                      quitarProducto(prod.uid)
                                    }
                                    className="text-xs font-black text-red-400 bg-red-50 px-2 py-1 rounded-lg hover:opacity-80 flex-shrink-0"
                                  >
                                    Quitar
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  <div>
                                    <label className="text-xs text-gray-400 font-bold block mb-1">
                                      Modalidad
                                    </label>
                                    {prod.tamano_id > 0 &&
                                    obtenerModalidadesDisponibles(
                                      escalasModal,
                                      prod.tamano_id
                                    ).length > 0 ? (
                                      <select
                                        value={prod.modalidad}
                                        onChange={(e) =>
                                          actualizarProducto(
                                            prod.uid,
                                            "modalidad",
                                            e.target.value
                                          )
                                        }
                                        className="input-premium"
                                        style={{
                                          minHeight: 44,
                                          fontSize: 14,
                                        }}
                                      >
                                        <option value="">— Elige —</option>
                                        {obtenerModalidadesDisponibles(
                                          escalasModal,
                                          prod.tamano_id
                                        ).map((m) => (
                                          <option key={m} value={m}>
                                            {m}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <p className="text-sm font-bold text-gray-600 py-2">
                                        {prod.modalidad || "—"}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400 font-bold block mb-1">
                                      Cantidad
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={prod.cantidad}
                                      onChange={(e) =>
                                        actualizarProducto(
                                          prod.uid,
                                          "cantidad",
                                          e.target.value
                                        )
                                      }
                                      className="input-premium"
                                      style={{
                                        minHeight: 44,
                                        fontSize: 14,
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-3">
                                  <div>
                                    <span className="text-xs text-gray-400">
                                      Precio actual:{" "}
                                    </span>
                                    <span className="font-black text-[#F49B93]">
                                      {sinPrecio
                                        ? "Sin precio"
                                        : moneda(prod.precio_actual)}
                                    </span>
                                    {preciosCambiaron && !sinPrecio && (
                                      <span className="text-xs text-gray-400 line-through ml-2">
                                        {moneda(prod.precio_original)}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    Subtotal:{" "}
                                    <span className="font-black text-gray-700">
                                      {moneda(
                                        prod.precio_actual * prod.cantidad
                                      )}
                                    </span>
                                  </span>
                                </div>

                                {sinPrecio && (
                                  <p className="text-xs font-bold text-red-500 bg-red-50 rounded-xl px-3 py-2 mt-2">
                                    Sin precio en escalas. Cambia la
                                    modalidad o contacta a TUCHIS.
                                  </p>
                                )}
                                {preciosCambiaron && !sinPrecio && (
                                  <p className="text-xs font-bold text-[#8A6A00] bg-[#FFF0B8] border border-[#FFE28A] rounded-xl px-3 py-2 mt-2">
                                    Precio actualizado respecto al pedido
                                    original.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Agregar productos → catalog */}
                  <button
                    onClick={irAlCatalogo}
                    className="btn-primary w-full flex items-center justify-center gap-3 text-base"
                  >
                    <span className="text-xl">🛒</span>
                    Agregar productos desde el catálogo
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Tu progreso se guarda automáticamente al salir.
                  </p>
                </section>

                {/* ── Totales + Anticipo ── */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
                    Pago
                  </h3>

                  <div
                    className="rounded-2xl p-4 text-white mb-4"
                    style={{
                      background:
                        "linear-gradient(135deg,#20B8C9 0%,#1AA8B8 100%)",
                    }}
                  >
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs font-bold uppercase opacity-75 mb-1">
                          Total
                        </div>
                        <div className="text-2xl font-black">
                          {moneda(totalModal)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase opacity-75 mb-1">
                          Anticipo
                        </div>
                        <div className="text-2xl font-black">
                          {moneda(anticipoNum)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase opacity-75 mb-1">
                          Saldo
                        </div>
                        <div className="text-2xl font-black">
                          {moneda(saldoModal)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">
                      Anticipo
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={vAnticipo}
                      onChange={(e) => setVAnticipo(e.target.value)}
                      placeholder="0"
                      className="input-premium"
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-400">
                        Sugerido (50%): {moneda(totalModal * 0.5)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setVAnticipo(
                            String(Math.round(totalModal * 0.5))
                          )
                        }
                        className="text-xs font-black text-cyan-600 hover:opacity-70 transition"
                      >
                        Usar 50%
                      </button>
                    </div>
                  </div>
                </section>

                {/* Error */}
                {errorModal && (
                  <p className="text-sm font-bold text-red-500 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    {errorModal}
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button
                    onClick={guardarNuevoPedido}
                    disabled={guardandoNuevo}
                    className="btn-primary flex-1 disabled:opacity-60"
                  >
                    {guardandoNuevo
                      ? "Guardando…"
                      : "Guardar nuevo pedido"}
                  </button>
                  <button
                    onClick={cerrarModalVolver}
                    className="bg-[#F5EEEC] text-gray-700 px-6 py-4 rounded-2xl font-black hover:opacity-80 transition"
                  >
                    Cancelar
                  </button>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Se creará un pedido nuevo. El pedido original no se
                  modifica.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: string }) {
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
