"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { generarPDF } from "./generarPDF"
import AdminSidebar from "../components/AdminSidebar"
import {
  MODALIDADES,
  numero,
  moneda,
  type Escala,
  obtenerPrecioPorEscala,
  calcularTotalProductos,
} from "../../lib/pricing"
import { formatearFechaMX, obtenerFechaHoyMX } from "../../lib/dates"

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
const obtenerEstadoEntrega = (pedido: any) =>
pedido.estado === "entregado"
? "entregado"
: "pendiente"
const resolverEstadoPago = (
estadoPago: string | undefined,
anticipo: any
) => {
if (estadoPago === "pagado") return "pagado"
return numero(anticipo) > 0
? "anticipo"
: "pendiente"
}
const obtenerEstadoPago = (pedido: any) =>
resolverEstadoPago(
pedido.estado_pago ||
(pedido.estado === "pagado" ? "pagado" : ""),
pedido.anticipo
)
const obtenerAnticipo = (pedido: any) =>
Math.max(0, numero(pedido.anticipo))
const obtenerAbono1 = (pedido: any) =>
Math.max(0, numero(pedido.abono_1 ?? pedido.abono))
const obtenerAbono2 = (pedido: any) =>
Math.max(0, numero(pedido.abono_2))
const obtenerSaldo = (pedido: any) =>
obtenerEstadoPago(pedido) === "pagado"
? 0
: Math.max(
numero(pedido.total) - obtenerAnticipo(pedido) - obtenerAbono1(pedido) - obtenerAbono2(pedido),
0
)
const esErrorColumnasPedido = (error: any) =>
error?.code === "PGRST204" &&
/(anticipo|estado_pago|municipio|abono)/i.test(error?.message || "")
const sinColumnasPago = (payload: any) => {
const {
anticipo: _anticipo,
estado_pago: _estadoPago,
municipio: _municipio,
abono: _abono,
abono_1: _abono1,
abono_2: _abono2,
...pedidoCompatible
} = payload
return pedidoCompatible
}
export default function Page() {
const [carrito, setCarrito] = useState<any[]>([])
const [pedidos, setPedidos] = useState<any[]>([])
const [productosDisponibles, setProductosDisponibles] =
useState<any[]>([])
const [escalas, setEscalas] = useState<Escala[]>([])
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
const [modalidadPedido, setModalidadPedido] = useState("")
const [anticipo, setAnticipo] = useState("")
const [estadoPagoPedido, setEstadoPagoPedido] =
useState("pendiente")
const [fecha, setFecha] = useState("")
const [notas, setNotas] = useState("")
const [errorPedido, setErrorPedido] = useState("")
const [exitoPedido, setExitoPedido] = useState(false)
const [enviando, setEnviando] = useState(false)
const [pedidoAEliminar, setPedidoAEliminar] = useState<number | null>(null)
const [errorEdicion, setErrorEdicion] = useState("")
const [generandoPDF, setGenerandoPDF] = useState<number | null>(null)
const [alertaNuevoPedido, setAlertaNuevoPedido] = useState<any>(null)
useEffect(() => {
const data =
JSON.parse(
localStorage.getItem("carrito") || "[]"
)
setCarrito(data)
setModalidadPedido(
data.length > 0 &&
data.every(
(item: any) =>
item.modalidad === data[0].modalidad
)
? data[0].modalidad || ""
: ""
)
obtenerPedidos()
obtenerProductos()
supabase.from("escalas").select("*").then(({ data }) => {
if (data) setEscalas(data as Escala[])
})
}, [])
useEffect(() => {
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
const canal = supabase
.channel("pedidos-admin")
.on(
"postgres_changes",
{ event: "INSERT", schema: "public", table: "pedidos" },
(payload) => {
beep()
setAlertaNuevoPedido(payload.new)
obtenerPedidos()
}
)
.subscribe()
return () => { supabase.removeChannel(canal) }
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
const productoBase =
productosDisponibles.find(
(item) =>
String(item.id) ===
String(producto.producto_id ?? producto.id)
) || {}
const piezas = Math.max(1, numero(cantidad) || 1)
const tamanoId = Number(producto.tamano_id || productoBase.tamano_id) || 0
const modalidad = producto.modalidad || ""
let precio = 0
const tamanoNombre = producto.tamano_nombre || producto.tamano || ""
if (tamanoId > 0 && escalas.length > 0 && modalidad) {
precio = obtenerPrecioPorEscala(escalas, tamanoId, modalidad, piezas)
} else {
precio = numero(producto.precio || producto.precio_unitario || 0)
}
return {
...productoBase,
...producto,
producto_id: producto.producto_id ?? producto.id ?? productoBase.id,
nombre: producto.nombre ?? productoBase.nombre,
tamano_id: tamanoId || undefined,
tamano_nombre: tamanoNombre,
tamano: tamanoNombre,
modalidad,
cantidad: piezas,
precio,
precio_unitario: precio,
imagen:
producto.imagen ??
producto.imagenes?.[0] ??
productoBase.imagenes?.[0] ??
"",
imagenes: producto.imagenes ?? productoBase.imagenes ?? [],
}
}
const carritoConPrecios =
carrito.map((item) =>
prepararProductoPedido(item)
)
const total =
calcularTotalProductos(carritoConPrecios)
const anticipoCapturado =
Math.max(0, numero(anticipo))
const anticipoPedido =
Math.min(anticipoCapturado, total)
const saldoPedido =
estadoPagoPedido === "pagado"
? 0
: Math.max(total - anticipoPedido, 0)
const estadoPagoCalculado =
resolverEstadoPago(
estadoPagoPedido,
anticipoPedido
)
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
setModalidadPedido(
actualizado.length > 0 &&
actualizado.every(
(item) =>
item.modalidad ===
actualizado[0].modalidad
)
? actualizado[0].modalidad || ""
: ""
)
localStorage.setItem(
"carrito",
JSON.stringify(actualizado)
)
}
const actualizarTamanoCarrito = (
index: number,
tamano: string
) => {
const itemActual = carrito[index]
const modalidad = itemActual?.modalidad || ""
const actualizado =
carrito.map((item, itemIndex) =>
itemIndex === index
? prepararProductoPedido({ ...item, tamano, modalidad })
: item
)
setCarrito(actualizado)
localStorage.setItem("carrito", JSON.stringify(actualizado))
}
const actualizarModalidadPedido = (
modalidad: string
) => {
setModalidadPedido(modalidad)
const actualizado =
carrito.map((item) =>
prepararProductoPedido({
...item,
modalidad,
})
)
setCarrito(actualizado)
localStorage.setItem(
"carrito",
JSON.stringify(actualizado)
)
}
const guardarPedido = async (pedido: any) => {
const pedidoBase = {
cliente: pedido.cliente,
telefono: pedido.telefono,
email: pedido.email || null,
lugar_entrega: pedido.lugar_entrega || null,
municipio: pedido.municipio || null,
fecha: pedido.fecha,
fecha_pedido: obtenerFechaHoyMX(),
notas: pedido.notas,
productos:
pedido.productos.map((p: any) => ({
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
const { error } =
await supabase
.from("pedidos")
.insert([pedidoBase])
if (error && esErrorColumnasPedido(error)) {
const { error: errorCompatible } =
await supabase
.from("pedidos")
.insert([sinColumnasPago(pedidoBase)])
if (!errorCompatible) {
return true
}
setErrorPedido("Error al guardar pedido. Intenta de nuevo.")
return false
}
if (error) {
setErrorPedido("Error al guardar pedido. Intenta de nuevo.")
return false
}
return true
}
const generarPedido = async () => {
setErrorPedido("")
setExitoPedido(false)
if (!nombre || !telefono || !fecha) {
setErrorPedido("Completa nombre, teléfono y fecha de entrega")
return
}
const productosParaPedido =
carritoConPrecios.map((item) => ({
...item,
modalidad:
item.modalidad ||
modalidadPedido,
}))
if (productosParaPedido.length === 0) {
setErrorPedido("Agrega al menos un producto al pedido")
return
}
const faltaModalidad =
productosParaPedido.some(
(item) => !item.modalidad
)
if (faltaModalidad) {
setErrorPedido("Selecciona la modalidad de todos los productos")
return
}
const faltaTamano =
productosParaPedido.some(
(item) =>
Number(item.tamano_id) > 0 &&
!item.tamano && !item.tamano_nombre
)
if (faltaTamano) {
setErrorPedido("Selecciona el tamaño de todos los productos")
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
const pedido = {
cliente: nombre,
telefono,
fecha,
notas,
productos: productosParaPedido,
anticipo: anticipoPedido,
estado_pago: estadoPagoCalculado,
total:
calcularTotalProductos(
productosParaPedido
),
}
setEnviando(true)
const ok =
await guardarPedido(pedido)
setEnviando(false)
if (!ok) return
localStorage.removeItem("carrito")
setCarrito([])
setNombre("")
setTelefono("")
setModalidadPedido("")
setAnticipo("")
setEstadoPagoPedido("pendiente")
setFecha("")
setNotas("")
setExitoPedido(true)
obtenerPedidos()
}
const eliminarPedido = async (id: number) => {
await supabase
.from("pedidos")
.delete()
.eq("id", id)
setPedidoAEliminar(null)
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
console.error("Error actualizando estado")
return
}
await obtenerPedidos()
}
const cambiarEstadoEntrega = async (
pedido: any,
estado: string
) => {
const { error } = await supabase
.from("pedidos")
.update({
estado,
})
.eq("id", pedido.id)
if (error) {
console.log(error)
console.error("Error actualizando estado")
return
}
await obtenerPedidos()
}
const cambiarEstadoPago = async (
pedido: any,
estado_pago: string
) => {
const { error } = await supabase
.from("pedidos")
.update({
estado_pago,
})
.eq("id", pedido.id)
if (error) {
console.log(error)
if (esErrorColumnasPedido(error)) {
const { error: errorCompatible } =
await supabase
.from("pedidos")
.update({
estado:
estado_pago === "pagado"
? "pagado"
: "pendiente",
})
.eq("id", pedido.id)
if (errorCompatible) {
console.log(errorCompatible)
console.error("Error actualizando pago")
return
}
setPedidos(
pedidos.map((item) =>
item.id === pedido.id
? {
...item,
estado_pago,
estado:
estado_pago === "pagado"
? "pagado"
: "pendiente",
}
: item
)
)
return
}
console.error("Error actualizando pago")
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
estado: obtenerEstadoEntrega(pedido),
estado_pago: obtenerEstadoPago(pedido),
anticipo: obtenerAnticipo(pedido),
abono_1: obtenerAbono1(pedido),
abono_2: obtenerAbono2(pedido),
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
const tid = Number(actualizado.tamano_id) || 0
const mod = actualizado.modalidad || ""
const qty = numero(actualizado.cantidad)
if (tid > 0 && escalas.length > 0 && mod) {
actualizado.precio = obtenerPrecioPorEscala(escalas, tid, mod, qty)
}
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
const tamanoId = Number(producto.tamano_id) || 0
const modalidadDefault = (() => {
if (tamanoId > 0 && escalas.length > 0) {
const mods = Array.from(new Set(
escalas.filter((e) => e.tamano_id === tamanoId).map((e) => e.modalidad)
))
return mods[0] || MODALIDADES[0]
}
return MODALIDADES[0]
})()
const productos = [
...(pedidoEditando.productos || []),
prepararProductoPedido({
...producto,
modalidad: modalidadDefault,
}),
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
`• ${p.nombre} (${[
p.tamano,
p.modalidad,
].filter(Boolean).join(" / ") || "Sin tamaño"}) x${p.cantidad}`
)
.join("\n")
const fechaPedido =
formatearFechaMX(
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
const emailLinea =
pedido.email
? `\nEmail: ${pedido.email}`
: ""
const lugarLinea =
pedido.lugar_entrega
? `\nLugar de entrega: ${pedido.lugar_entrega}`
: ""
const municipioLinea =
pedido.municipio
? `\nMunicipio: ${pedido.municipio}`
: ""
const estadoEntrega =
obtenerEstadoEntrega(pedido)
const estadoPago =
obtenerEstadoPago(pedido)
const anticipoPedidoGuardado =
obtenerAnticipo(pedido)
const abono1Guardado = obtenerAbono1(pedido)
const abono2Guardado = obtenerAbono2(pedido)
const saldoPedidoGuardado =
obtenerSaldo(pedido)
const mensaje =
`Hola ${pedido.cliente}\n\n` +
`Fecha de pedido: ${fechaPedido}\n` +
`Fecha de entrega: ${fechaEntrega}\n` +
`Estado: ${estadoEntrega}\n` +
`Pago: ${estadoPago}\n` +
`Tu pedido:\n${productos}\n\n` +
`Total: $${pedido.total}\n` +
`Anticipo: $${anticipoPedidoGuardado}\n` +
(abono1Guardado > 0 ? `Abono 1: $${abono1Guardado}\n` : "") +
(abono2Guardado > 0 ? `Abono 2: $${abono2Guardado}\n` : "") +
`Saldo: $${saldoPedidoGuardado}${emailLinea}${lugarLinea}${municipioLinea}${notas}`
window.open(
`https://wa.me/52${pedido.telefono}?text=${encodeURIComponent(mensaje)}`,
"_blank"
)
}
const pasoActivo = exitoPedido ? 3 : carritoConPrecios.length > 0 ? 2 : 1
return (
<div className="w-full">
<div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">
<div className="flex flex-col lg:flex-row gap-8">
<AdminSidebar />
<main className="flex-1 min-w-0">
{alertaNuevoPedido && (
<div
className="mb-6 flex items-center justify-between gap-4 rounded-2xl px-5 py-4 text-white font-black shadow-lg"
style={{ background: "#FF5C8A", animation: "modal-in .22s cubic-bezier(.34,1.2,.64,1) forwards" }}
>
<span className="text-base md:text-lg">
🛎️ Nuevo pedido de <strong>{alertaNuevoPedido.nombre || "cliente"}</strong>
{alertaNuevoPedido.telefono ? ` · ${alertaNuevoPedido.telefono}` : ""}
</span>
<button
onClick={() => setAlertaNuevoPedido(null)}
className="ml-auto flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xl font-black"
style={{ background: "rgba(255,255,255,.22)" }}
aria-label="Cerrar alerta"
>×</button>
</div>
)}
<div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
<h2 className="text-5xl md:text-7xl font-black text-[#FF5C8A] leading-none break-words">
Pedidos
</h2>
<a
href="/pedido/nuevo"
className="inline-flex items-center gap-2 bg-[#FF5C8A] hover:opacity-90 text-white px-6 py-4 rounded-2xl font-black text-base shadow-lg transition"
>
+ Nuevo pedido
</a>
</div>
<div id="pedidos-guardados" className="section-card">
<h2 className="text-3xl font-black text-[#3F334A] mb-8">
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
<h3 className="text-3xl font-black text-[#3F334A]">
{pedido.cliente}
</h3>
<p className="text-zinc-500 mt-2">
{pedido.telefono}
</p>
{pedido.email && (
<p className="text-zinc-500 text-sm">
{pedido.email}
</p>
)}
{pedido.lugar_entrega && (
<p className="text-zinc-500 text-sm">
📍 {pedido.lugar_entrega}
</p>
)}
{pedido.municipio && (
<p className="text-zinc-500 text-sm">
🏙️ {pedido.municipio}
</p>
)}
<div className="mt-3 space-y-1 text-zinc-500">
<p>
Pedido: {formatearFechaMX(
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
<span className="font-black text-[#3F334A]">
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
{p.tamano && (
<>
{" - "}
{p.tamano}
</>
)}
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
<div className="mt-3 flex flex-wrap gap-3 text-sm font-black uppercase">
<div className="rounded-2xl bg-[#FFE4EC] p-3 text-[#3F334A] flex-1 min-w-[80px]">
Total {moneda(pedido.total)}
</div>
<div className="rounded-2xl bg-[#FFF0B8] p-3 text-zinc-700 flex-1 min-w-[80px]">
Anticipo {moneda(obtenerAnticipo(pedido))}
</div>
{(obtenerAbono1(pedido) + obtenerAbono2(pedido)) > 0 && (
<div className="rounded-2xl bg-[#E7D9FF] p-3 text-purple-700 flex-1 min-w-[80px]">
Abonos {moneda(obtenerAbono1(pedido) + obtenerAbono2(pedido))}
</div>
)}
<div className="rounded-2xl bg-[#FFE0DD] p-3 text-rose-500 flex-1 min-w-[80px]">
Saldo {moneda(obtenerSaldo(pedido))}
</div>
</div>
</div>
<div className="flex flex-col gap-3 min-w-[220px]">
{/* Entrega */}
<p className="text-xs font-black uppercase text-zinc-400 tracking-wide">
Entrega
</p>
<button
onClick={() => cambiarEstadoEntrega(pedido, "pendiente")}
className={`badge-action ${
obtenerEstadoEntrega(pedido) === "pendiente"
? "badge-pendiente"
: "badge-neutral"
}`}
>
Pendiente
</button>
<button
onClick={() => cambiarEstadoEntrega(pedido, "entregado")}
className={`badge-action ${
obtenerEstadoEntrega(pedido) === "entregado"
? "badge-entregado"
: "badge-neutral"
}`}
>
Entregado
</button>
{/* Pago */}
<p className="text-xs font-black uppercase text-zinc-400 tracking-wide mt-2">
Pago
</p>
<button
onClick={() => cambiarEstadoPago(pedido, "anticipo")}
className={`badge-action ${
obtenerSaldo(pedido) > 0
? "badge-pendiente"
: "badge-neutral"
}`}
>
Pendiente
</button>
<button
onClick={() => cambiarEstadoPago(pedido, "pagado")}
className={`badge-action ${
obtenerSaldo(pedido) <= 0
? "badge-pagado"
: "badge-neutral"
}`}
>
Pagado
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
onClick={() => {
setGenerandoPDF(pedido.id)
generarPDF(pedido, (estado) => {
if (estado !== "generando") setGenerandoPDF(null)
}).catch(() => setGenerandoPDF(null))
}}
disabled={generandoPDF === pedido.id}
className={`bg-rose-400 hover:bg-rose-500 text-white py-3 rounded-2xl font-bold transition ${generandoPDF === pedido.id ? "opacity-60" : ""}`}
>
{generandoPDF === pedido.id ? "Generando..." : "PDF"}
</button>
<button
onClick={() =>
abrirEditorPedido(pedido)
}
className="
bg-[#FF5C8A]
hover:opacity-90
text-white
py-3
rounded-2xl
font-bold
transition
"
>
Editar
</button>
{pedidoAEliminar === pedido.id ? (
<div className="flex gap-2">
<button
onClick={() => eliminarPedido(pedido.id)}
className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-bold transition text-sm"
>
Confirmar
</button>
<button
onClick={() => setPedidoAEliminar(null)}
className="flex-1 bg-white border border-[#F8D6D0] text-zinc-500 py-3 rounded-2xl font-bold transition text-sm"
>
Cancelar
</button>
</div>
) : (
<button
onClick={() => setPedidoAEliminar(pedido.id)}
className="bg-white border border-red-200 text-red-400 hover:bg-red-50 py-3 rounded-2xl font-bold transition"
>
Eliminar
</button>
)}
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
text-[#3F334A]
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
type="text"
placeholder="Municipio"
value={pedidoEditando.municipio || ""}
onChange={(e) =>
setPedidoEditando({
...pedidoEditando,
municipio: e.target.value,
})
}
className="input-premium"
/>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="rounded-3xl border border-[#FFD9D4] bg-white p-5">
<p className="text-sm font-black uppercase text-zinc-400">
Fecha de pedido
</p>
<p className="text-xl font-black text-[#3F334A] mt-1">
{formatearFechaMX(
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
<div>
<label className="block text-sm font-semibold text-zinc-500 mb-2">
Anticipo
</label>
<input
type="number"
min="0"
value={pedidoEditando.anticipo || 0}
onChange={(e) => {
const anticipo = Number(e.target.value) || 0
const abono1 = Math.max(0, numero(pedidoEditando.abono_1))
const abono2 = Math.max(0, numero(pedidoEditando.abono_2))
const totalEdit = calcularTotalProductos(pedidoEditando.productos || [])
const totalPagado = anticipo + abono1 + abono2
setPedidoEditando({
...pedidoEditando,
anticipo,
estado_pago:
totalEdit > 0 && totalPagado >= totalEdit ? "pagado" : "anticipo",
})
}}
className="input-premium"
/>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
<label className="block text-sm font-semibold text-zinc-500 mb-2">
Abono 1
</label>
<input
type="number"
min="0"
value={pedidoEditando.abono_1 || 0}
onChange={(e) => {
const abono1 = Math.max(0, Number(e.target.value) || 0)
const abono2 = Math.max(0, numero(pedidoEditando.abono_2))
const anticipo = numero(pedidoEditando.anticipo)
const totalEdit = calcularTotalProductos(pedidoEditando.productos || [])
const totalPagado = anticipo + abono1 + abono2
setPedidoEditando({
...pedidoEditando,
abono_1: abono1,
estado_pago:
totalEdit > 0 && totalPagado >= totalEdit ? "pagado" : "anticipo",
})
}}
className="input-premium"
/>
</div>
<div>
<label className="block text-sm font-semibold text-zinc-500 mb-2">
Abono 2
</label>
<input
type="number"
min="0"
value={pedidoEditando.abono_2 || 0}
onChange={(e) => {
const abono2 = Math.max(0, Number(e.target.value) || 0)
const abono1 = Math.max(0, numero(pedidoEditando.abono_1))
const anticipo = numero(pedidoEditando.anticipo)
const totalEdit = calcularTotalProductos(pedidoEditando.productos || [])
const totalPagado = anticipo + abono1 + abono2
setPedidoEditando({
...pedidoEditando,
abono_2: abono2,
estado_pago:
totalEdit > 0 && totalPagado >= totalEdit ? "pagado" : "anticipo",
})
}}
className="input-premium"
/>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
<p className="text-sm font-semibold text-zinc-500 mb-2">
Estado del pedido
</p>
<div className="grid grid-cols-2 gap-3">
<button
type="button"
onClick={() =>
setPedidoEditando({
...pedidoEditando,
estado: "pendiente",
})
}
className={`badge-action ${
pedidoEditando.estado === "pendiente"
? "badge-pendiente"
: "badge-neutral"
}`}
>
Pendiente
</button>
<button
type="button"
onClick={() =>
setPedidoEditando({
...pedidoEditando,
estado: "entregado",
})
}
className={`badge-action ${
pedidoEditando.estado === "entregado"
? "badge-entregado"
: "badge-neutral"
}`}
>
Entregado
</button>
</div>
</div>
<div>
<p className="text-sm font-semibold text-zinc-500 mb-2">
Estado de pago
</p>
<div className="grid grid-cols-2 gap-3">
<button
type="button"
onClick={() =>
setPedidoEditando({
...pedidoEditando,
estado_pago: "anticipo",
})
}
className={`badge-action ${
pedidoEditando.estado_pago === "anticipo"
? "badge-anticipo"
: "badge-neutral"
}`}
>
Anticipo
</button>
<button
type="button"
onClick={() =>
setPedidoEditando({
...pedidoEditando,
estado_pago: "pagado",
})
}
className={`badge-action ${
pedidoEditando.estado_pago === "pagado"
? "badge-pagado"
: "badge-neutral"
}`}
>
Pagado
</button>
</div>
</div>
</div>
</div>
<div className="mt-8 space-y-5">
<h3 className="text-2xl font-black text-[#3F334A]">
Productos del pedido
</h3>
{(pedidoEditando.productos || []).map(
(producto: any, index: number) => (
<div
key={index}
className="rounded-3xl border border-[#FFD9D4] p-5 bg-white space-y-4"
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
<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
{ modalidad: e.target.value },
true
)
}
className="input-premium"
>
<option value="">Modalidad</option>
{(() => {
const tid = Number(producto.tamano_id) || 0
const opciones = tid > 0 && escalas.length > 0
? Array.from(new Set(escalas.filter((e) => e.tamano_id === tid).map((e) => e.modalidad)))
: [...MODALIDADES]
return opciones.map((opcion: string) => (
<option key={opcion} value={opcion}>{opcion}</option>
))
})()}
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
{[producto.tamano || producto.tamano_nombre, producto.modalidad].filter(Boolean).join(" · ")}
{" · "}
Subtotal: {moneda(numero(producto.precio) * numero(producto.cantidad))}
</p>
</div>
)
)}
<div className="rounded-3xl border border-[#FFD9D4] bg-white p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
<div>
<h4 className="text-xl font-black text-[#3F334A]">
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
bg-white
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
<h3 className="text-4xl font-black text-[#3F334A]">
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
<div className="sticky top-0 z-10 mb-6 rounded-3xl border border-[#F8D6D0] bg-white/95 p-4 shadow-sm backdrop-blur">
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
<div>
<p className="text-xs font-black uppercase text-zinc-400">
Productos agregados
</p>
<h4 className="text-2xl font-black text-[#3F334A] mt-1">
{(pedidoEditando.productos || []).length} en el pedido
</h4>
</div>
<div className="text-2xl font-black text-rose-300">
Total {moneda(calcularTotalProductos(
pedidoEditando.productos || []
))}
</div>
</div>
{(pedidoEditando.productos || []).length > 0 && (
<div className="mt-4 flex gap-3 overflow-x-auto pb-1">
{(pedidoEditando.productos || []).map(
(producto: any, index: number) => (
<div
key={`${producto.producto_id || producto.id || index}-${index}`}
className="min-w-[220px] rounded-2xl bg-white border border-[#F8D6D0] p-3"
>
<p className="font-black text-[#3F334A] truncate">
{producto.nombre}
</p>
<p className="text-sm font-bold text-zinc-500">
{[
producto.tamano,
producto.modalidad,
].filter(Boolean).join(" / ") || "Sin tamaño"}
</p>
<p className="text-sm font-black text-rose-300 mt-1">
{numero(producto.cantidad)} pza. · {moneda(producto.precio)} c/u
</p>
</div>
)
)}
</div>
)}
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
<h4 className="text-2xl font-black text-[#3F334A] mt-2">
{producto.nombre}
</h4>
<div className="mt-4 space-y-2">
{(() => {
const tid = Number(producto.tamano_id) || 0
const mods = tid > 0 && escalas.length > 0
? Array.from(new Set(escalas.filter((e) => e.tamano_id === tid).map((e) => e.modalidad)))
: [...MODALIDADES]
return mods.map((mod: string) => (
<div
key={mod}
className="rounded-2xl bg-white border border-[#F8D6D0] p-3"
>
<p className="text-xs font-black uppercase text-zinc-400">
{mod}
</p>
{tid > 0 && escalas.length > 0 && (
<p className="text-sm font-bold text-zinc-500 mt-1">
Precio dinámico por cantidad
</p>
)}
</div>
))
})()}
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
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
<div className="rounded-3xl bg-[#FFE4EC] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Total pedido
</p>
<p className="text-xl font-black text-[#3F334A] whitespace-nowrap">
{moneda(calcularTotalProductos(pedidoEditando.productos || []))}
</p>
</div>
<div className="rounded-3xl bg-[#FFF0B8] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Anticipo
</p>
<p className="text-xl font-black text-zinc-700 whitespace-nowrap">
{moneda(Math.min(
numero(pedidoEditando.anticipo),
calcularTotalProductos(pedidoEditando.productos || [])
))}
</p>
</div>
<div className="rounded-3xl bg-[#E7D9FF] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Abonos
</p>
<p className="text-xl font-black text-purple-700 whitespace-nowrap">
{moneda(
Math.max(0, numero(pedidoEditando.abono_1)) +
Math.max(0, numero(pedidoEditando.abono_2))
)}
</p>
</div>
<div className="rounded-3xl bg-[#FFE0DD] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Saldo pendiente
</p>
<p className="text-xl font-black text-rose-400 whitespace-nowrap">
{moneda(pedidoEditando.estado_pago === "pagado"
? 0
: Math.max(
calcularTotalProductos(pedidoEditando.productos || []) -
numero(pedidoEditando.anticipo) -
Math.max(0, numero(pedidoEditando.abono_1)) -
Math.max(0, numero(pedidoEditando.abono_2)),
0
))}
</p>
</div>
</div>
</div>
{errorEdicion && (
<div className="rounded-2xl bg-[#FFE0DD] border border-[#F8C4BE] px-5 py-4 text-[#C95F67] font-bold text-sm">
{errorEdicion}
</div>
)}
<button
onClick={async () => {
setErrorEdicion("")
const productos =
pedidoEditando.productos || []
if (productos.length === 0) {
setErrorEdicion("El pedido necesita al menos un producto")
return
}
const faltaModalidad =
productos.some(
(producto: any) => !producto.modalidad
)
if (faltaModalidad) {
setErrorEdicion("Selecciona la modalidad de todos los productos")
return
}
const faltaTamano =
productos.some(
(producto: any) =>
Number(producto.tamano_id) > 0 &&
!producto.tamano
)
if (faltaTamano) {
setErrorEdicion("Selecciona el tamaño de todos los productos")
return
}
const totalActualizado =
calcularTotalProductos(productos)
const anticipoActualizado =
Math.min(
numero(pedidoEditando.anticipo),
totalActualizado
)
if (numero(pedidoEditando.anticipo) > totalActualizado) {
setErrorEdicion("El anticipo no puede ser mayor al total del pedido")
return
}
const abono1Actualizado = Math.max(0, numero(pedidoEditando.abono_1))
const abono2Actualizado = Math.max(0, numero(pedidoEditando.abono_2))
const totalPagado = anticipoActualizado + abono1Actualizado + abono2Actualizado
const estadoPagoActualizado =
totalActualizado > 0 && totalPagado >= totalActualizado
? "pagado"
: "anticipo"
const pedidoActualizado = {
cliente: pedidoEditando.cliente,
telefono: pedidoEditando.telefono,
email: pedidoEditando.email || null,
lugar_entrega: pedidoEditando.lugar_entrega || null,
municipio: pedidoEditando.municipio || null,
fecha: pedidoEditando.fecha,
notas: pedidoEditando.notas,
estado: pedidoEditando.estado,
estado_pago: estadoPagoActualizado,
anticipo: anticipoActualizado,
abono_1: abono1Actualizado,
abono_2: abono2Actualizado,
productos:
productos.map((producto: any) => ({
producto_id: producto.producto_id,
nombre: producto.nombre,
precio: numero(producto.precio),
cantidad: numero(producto.cantidad),
tamano: producto.tamano,
tamano_id: producto.tamano_id,
modalidad: producto.modalidad,
precio_menudeo: producto.precio_menudeo,
precio_mayoreo: producto.precio_mayoreo,
precio_blanca_menudeo: producto.precio_blanca_menudeo,
precio_blanca_mayoreo: producto.precio_blanca_mayoreo,
precio_pintada_menudeo: producto.precio_pintada_menudeo,
precio_pintada_mayoreo: producto.precio_pintada_mayoreo,
precio_kit_menudeo: producto.precio_kit_menudeo,
precio_kit_mayoreo: producto.precio_kit_mayoreo,
minimo_mayoreo: producto.minimo_mayoreo,
imagenes: producto.imagenes || [],
})),
total: totalActualizado,
}
const { error } = await supabase
.from("pedidos")
.update(pedidoActualizado)
.eq("id", pedidoEditando.id)
if (error && esErrorColumnasPedido(error)) {
const { error: errorCompatible } =
await supabase
.from("pedidos")
.update(sinColumnasPago(pedidoActualizado))
.eq("id", pedidoEditando.id)
if (!errorCompatible) {
setPedidoEditando(null)
await obtenerPedidos()
return
}
console.log(errorCompatible)
setErrorEdicion("Error al actualizar. Intenta de nuevo.")
return
}
if (error) {
console.log(error)
setErrorEdicion("Error al actualizar. Intenta de nuevo.")
return
}
setPedidoEditando(null)
await obtenerPedidos()
}}
className="btn-primary mt-8"
>
Guardar cambios
</button>
</div>
</div>
)}
</main>
</div>
</div>
</div>
)
}
