"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import {
  MODALIDADES,
  numero,
  moneda,
  obtenerTamanosProducto,
  obtenerNombresTamanos,
  obtenerModalidadesTamano,
  obtenerConfigTamano,
  obtenerPrecioMenudeo,
  obtenerPrecioMayoreo,
  obtenerPrecioPorCantidad,
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

const resolverEstadoPago = (
estadoPago: string | undefined,
anticipo: any
) => {
if (estadoPago === "pagado") return "pagado"
return numero(anticipo) > 0 ? "anticipo" : "pendiente"
}

export default function NuevoPedidoPage() {
const router = useRouter()
const [cargando, setCargando] = useState(true)
const [carrito, setCarrito] = useState<any[]>([])
const [productosDisponibles, setProductosDisponibles] = useState<any[]>([])
const [nombre, setNombre] = useState("")
const [telefono, setTelefono] = useState("")
const [email, setEmail] = useState("")
const [lugarEntrega, setLugarEntrega] = useState("")
const [modalidadPedido, setModalidadPedido] = useState("")
const [anticipo, setAnticipo] = useState("")
const [estadoPagoPedido, setEstadoPagoPedido] = useState("pendiente")
const [fecha, setFecha] = useState("")
const [notas, setNotas] = useState("")
const [errorPedido, setErrorPedido] = useState("")
const [exitoPedido, setExitoPedido] = useState(false)
const [enviando, setEnviando] = useState(false)

useEffect(() => {
const data = JSON.parse(localStorage.getItem("carrito") || "[]")
setCarrito(data)
setModalidadPedido(
data.length > 0 &&
data.every(
(item: any) => item.modalidad === data[0].modalidad
)
? data[0].modalidad || ""
: ""
)
setCargando(false)
supabase
.from("productos")
.select("*")
.order("nombre")
.then(({ data: productos }) => {
if (productos) setProductosDisponibles(productos)
})
}, [])

const prepararProductoPedido = (
producto: any,
cantidad = numero(producto.cantidad) || 1
) => {
const productoActual =
productosDisponibles.find(
(item) =>
String(item.id) ===
String(producto.producto_id ?? producto.id)
) || {}
const piezas = Math.max(1, numero(cantidad) || 1)
const productoMezclado = { ...productoActual, ...producto }
const configTamano = obtenerConfigTamano(
productoMezclado,
producto.tamano,
producto.modalidad
)
const productoConPrecios = {
...productoActual,
...producto,
producto_id:
producto.producto_id ?? producto.id ?? productoActual.id,
nombre: producto.nombre ?? productoActual.nombre,
tamano: configTamano?.nombre ?? producto.tamano ?? "",
tamano_id: configTamano?.tamano_id ?? producto.tamano_id ?? "",
cantidad: piezas,
modalidad: (configTamano?.modalidad ?? producto.modalidad) || "",
precio_menudeo: configTamano
? numero(configTamano.precio_menudeo)
: obtenerPrecioMenudeo(
productoMezclado,
producto.modalidad,
producto.tamano
),
precio_mayoreo: configTamano
? numero(configTamano.precio_mayoreo)
: obtenerPrecioMayoreo(
productoMezclado,
producto.modalidad,
producto.tamano
),
minimo_mayoreo:
productoActual.minimo_mayoreo ?? producto.minimo_mayoreo ?? 0,
}
return {
...productoConPrecios,
precio: obtenerPrecioPorCantidad(
productoConPrecios,
piezas,
productoConPrecios.modalidad,
productoConPrecios.tamano
),
}
}

const carritoConPrecios = carrito.map((item) =>
prepararProductoPedido(item)
)
const total = calcularTotalProductos(carritoConPrecios)
const anticipoCapturado = Math.max(0, numero(anticipo))
const anticipoPedido = Math.min(anticipoCapturado, total)
const saldoPedido =
estadoPagoPedido === "pagado"
? 0
: Math.max(total - anticipoPedido, 0)
const estadoPagoCalculado = resolverEstadoPago(
estadoPagoPedido,
anticipoPedido
)

const actualizarTamanoCarrito = (
index: number,
tamano: string
) => {
const itemActual = carrito[index]
const modalidades = obtenerModalidadesTamano(itemActual, tamano)
const modalidad =
modalidades[0] || itemActual?.modalidad || ""
const actualizado = carrito.map((item, itemIndex) =>
itemIndex === index
? prepararProductoPedido({ ...item, tamano, modalidad })
: item
)
setCarrito(actualizado)
localStorage.setItem("carrito", JSON.stringify(actualizado))
}

const actualizarModalidadCarrito = (
index: number,
modalidad: string
) => {
const actualizado = carrito.map((item, itemIndex) =>
itemIndex === index
? prepararProductoPedido({ ...item, modalidad })
: item
)
setCarrito(actualizado)
setModalidadPedido(
actualizado.length > 0 &&
actualizado.every(
(item) => item.modalidad === actualizado[0].modalidad
)
? actualizado[0].modalidad || ""
: ""
)
localStorage.setItem("carrito", JSON.stringify(actualizado))
}

const actualizarModalidadPedido = (modalidad: string) => {
setModalidadPedido(modalidad)
const actualizado = carrito.map((item) =>
prepararProductoPedido({ ...item, modalidad })
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
// fallback: retry without new columns in case SQL wasn't applied yet
const {
email: _e,
lugar_entrega: _l,
...base
} = pedidoBase
const { error: e2 } = await supabase
.from("pedidos")
.insert([base])
if (!e2) return true
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
const productosParaPedido = carritoConPrecios.map((item) => ({
...item,
modalidad: item.modalidad || modalidadPedido,
}))
if (productosParaPedido.length === 0) {
setErrorPedido("El carrito está vacío")
return
}
if (productosParaPedido.some((item) => !item.modalidad)) {
setErrorPedido("Selecciona la modalidad de todos los productos")
return
}
if (
productosParaPedido.some(
(item) =>
obtenerTamanosProducto(item).length > 0 && !item.tamano
)
) {
setErrorPedido("Selecciona el tamaño de todos los productos")
return
}
if (anticipoCapturado > total) {
setErrorPedido(
"El anticipo no puede ser mayor al total del pedido"
)
return
}
setEnviando(true)
const ok = await guardarPedido({
cliente: nombre,
telefono,
email,
lugar_entrega: lugarEntrega,
fecha,
notas,
productos: productosParaPedido,
anticipo: anticipoPedido,
estado_pago: estadoPagoCalculado,
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
<h3 className="font-black text-cyan-600">
{item.nombre}
</h3>
<span className="text-sm font-bold text-zinc-600 whitespace-nowrap">
{item.cantidad} × {moneda(item.precio)}
</span>
</div>
{Number(item.minimo_mayoreo || 0) > 0 && (
<p className="text-xs font-bold text-zinc-400 mt-1">
Mayoreo desde {item.minimo_mayoreo} piezas
</p>
)}
{obtenerTamanosProducto(item).length > 0 && (
<select
value={item.tamano || ""}
onChange={(e) =>
actualizarTamanoCarrito(
index,
e.target.value
)
}
className="input-premium mt-3"
>
{obtenerNombresTamanos(item).map(
(tamano) => (
<option key={tamano} value={tamano}>
{tamano}
</option>
)
)}
</select>
)}
<select
value={item.modalidad || ""}
onChange={(e) =>
actualizarModalidadCarrito(
index,
e.target.value
)
}
className="input-premium mt-3"
>
<option value="">
Selecciona modalidad
</option>
{(obtenerTamanosProducto(item).length > 0
? obtenerModalidadesTamano(
item,
item.tamano
)
: MODALIDADES
).map((opcion: string) => (
<option key={opcion} value={opcion}>
{opcion}
</option>
))}
</select>
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
<input
type="text"
placeholder="Lugar de entrega (opcional)"
value={lugarEntrega}
onChange={(e) => setLugarEntrega(e.target.value)}
className="input-premium"
/>
<div>
<label className="block text-sm font-semibold text-zinc-500 mb-2">
Modalidad
</label>
<select
value={modalidadPedido}
onChange={(e) =>
actualizarModalidadPedido(e.target.value)
}
className="input-premium"
>
<option value="">
Selecciona modalidad
</option>
{MODALIDADES.map((opcion) => (
<option key={opcion} value={opcion}>
{opcion}
</option>
))}
</select>
</div>
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
Fecha de entrega
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
if (estadoPagoPedido !== "pagado") {
setEstadoPagoPedido(
numero(valor) > 0
? "anticipo"
: "pendiente"
)
}
}}
className="input-premium"
placeholder="Monto del anticipo"
/>
</div>
<div>
<label className="block text-sm font-semibold text-zinc-500 mb-2">
Estado de pago
</label>
<div className="grid grid-cols-3 gap-3">
<button
type="button"
onClick={() =>
setEstadoPagoPedido("pendiente")
}
className={`badge-action ${
estadoPagoCalculado === "pendiente"
? "badge-pendiente"
: "badge-neutral"
}`}
>
Pendiente
</button>
<button
type="button"
onClick={() =>
setEstadoPagoPedido("anticipo")
}
className={`badge-action ${
estadoPagoCalculado === "anticipo"
? "badge-anticipo"
: "badge-neutral"
}`}
>
Anticipo
</button>
<button
type="button"
onClick={() =>
setEstadoPagoPedido("pagado")
}
className={`badge-action ${
estadoPagoCalculado === "pagado"
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
