"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
const MODALIDADES = [
"Blancas",
"Pintadas",
"Kit",
]
const MODALIDADES_PRECIO = [
{
clave: "blanca",
label: "Blanca",
menudeo: "precio_blanca_menudeo",
mayoreo: "precio_blanca_mayoreo",
},
{
clave: "pintada",
label: "Pintada",
menudeo: "precio_pintada_menudeo",
mayoreo: "precio_pintada_mayoreo",
},
{
clave: "kit",
label: "Kit",
menudeo: "precio_kit_menudeo",
mayoreo: "precio_kit_mayoreo",
},
]
const obtenerNombreTamano = (tamano: any) =>
String(
tamano?.nombre ??
tamano?.tamano ??
""
).trim()
const prepararTamanoProducto = (tamano: any) => ({
id: tamano.id,
tamano_id:
tamano.tamano_id ??
tamano.id,
nombre: obtenerNombreTamano(tamano),
modalidad:
tamano.modalidad || "",
precio_menudeo: numero(tamano.precio_menudeo),
precio_mayoreo: numero(tamano.precio_mayoreo),
})
const obtenerTamanosProducto = (producto: any) =>
Array.isArray(producto?.tamanos)
? producto.tamanos
.map(prepararTamanoProducto)
.filter((tamano: any) => tamano.nombre)
: []
const obtenerNombresTamanos = (producto: any): string[] =>
Array.from(
new Set(
obtenerTamanosProducto(producto)
.map((tamano: any) => tamano.nombre)
)
) as string[]
const obtenerModalidadesTamano = (
producto: any,
tamanoNombre?: string
) =>
obtenerTamanosProducto(producto)
.filter(
(tamano: any) =>
!tamanoNombre ||
tamano.nombre === tamanoNombre
)
.map((tamano: any) => tamano.modalidad)
const obtenerConfigTamano = (
producto: any,
tamanoNombre?: string,
modalidad?: string
) =>
obtenerTamanosProducto(producto).find(
(tamano: any) =>
tamano.nombre === tamanoNombre &&
obtenerClaveModalidad(tamano.modalidad) ===
obtenerClaveModalidad(modalidad)
)
const numero = (valor: any) =>
Number(valor || 0)
const obtenerClaveModalidad = (modalidad?: string) => {
const valor =
String(modalidad || "")
.toLowerCase()
.trim()
if (valor.includes("pintad")) return "pintada"
if (valor.includes("kit")) return "kit"
return "blanca"
}
const obtenerConfigModalidad = (modalidad?: string) =>
MODALIDADES_PRECIO.find(
(item) =>
item.clave === obtenerClaveModalidad(modalidad)
) || MODALIDADES_PRECIO[0]
const obtenerPrecioMenudeo = (
producto: any,
modalidad?: string,
tamano?: string
) => {
if (
producto.tamano &&
producto.precio_menudeo !== undefined
) {
return numero(producto.precio_menudeo)
}
const configTamano =
obtenerConfigTamano(
producto,
tamano,
modalidad
)
if (configTamano) {
return numero(configTamano.precio_menudeo)
}
const config =
obtenerConfigModalidad(modalidad)
return numero(
producto[config.menudeo] ??
producto.precio_menudeo ??
producto.precio
)
}
const obtenerPrecioMayoreo = (
producto: any,
modalidad?: string,
tamano?: string
) => {
if (
producto.tamano &&
producto.precio_mayoreo !== undefined
) {
return numero(producto.precio_mayoreo)
}
const configTamano =
obtenerConfigTamano(
producto,
tamano,
modalidad
)
if (configTamano) {
return numero(configTamano.precio_mayoreo)
}
const config =
obtenerConfigModalidad(modalidad)
return numero(
producto[config.mayoreo] ??
producto.precio_mayoreo ??
producto.precio
)
}
const obtenerMinimoMayoreo = (producto: any) =>
numero(producto.minimo_mayoreo)
const obtenerPrecioPorCantidad = (
producto: any,
cantidad: number,
modalidad?: string,
tamano?: string
) => {
const minimoMayoreo =
obtenerMinimoMayoreo(producto)
const precioMayoreo =
obtenerPrecioMayoreo(
producto,
modalidad,
tamano
)
if (
minimoMayoreo > 0 &&
cantidad >= minimoMayoreo &&
precioMayoreo > 0
) {
return precioMayoreo
}
return obtenerPrecioMenudeo(
producto,
modalidad,
tamano
)
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
const obtenerSaldo = (pedido: any) =>
obtenerEstadoPago(pedido) === "pagado"
? 0
: Math.max(
numero(pedido.total) - obtenerAnticipo(pedido),
0
)
const esErrorColumnasPedido = (error: any) =>
error?.code === "PGRST204" &&
/(anticipo|estado_pago)/i.test(error?.message || "")
const sinColumnasPago = (payload: any) => {
const {
anticipo: _anticipo,
estado_pago: _estadoPago,
...pedidoCompatible
} = payload
return pedidoCompatible
}
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
const [modalidadPedido, setModalidadPedido] = useState("")
const [anticipo, setAnticipo] = useState("")
const [estadoPagoPedido, setEstadoPagoPedido] =
useState("pendiente")
const [fecha, setFecha] = useState("")
const [notas, setNotas] = useState("")
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
const productoMezclado = {
...productoActual,
...producto,
}
const configTamano =
obtenerConfigTamano(
productoMezclado,
producto.tamano,
producto.modalidad
)
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
tamano:
configTamano?.nombre ??
producto.tamano ??
"",
tamano_id:
configTamano?.tamano_id ??
producto.tamano_id ??
"",
cantidad: piezas,
modalidad:
(configTamano?.modalidad ??
producto.modalidad) ||
"",
precio_menudeo:
configTamano
? numero(configTamano.precio_menudeo)
: obtenerPrecioMenudeo(
productoMezclado,
producto.modalidad,
producto.tamano
),
precio_mayoreo:
configTamano
? numero(configTamano.precio_mayoreo)
: obtenerPrecioMayoreo(
productoMezclado,
producto.modalidad,
producto.tamano
),
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
piezas,
productoConPrecios.modalidad,
productoConPrecios.tamano
),
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
const itemActual =
carrito[index]
const modalidades =
obtenerModalidadesTamano(
itemActual,
tamano
)
const modalidad =
modalidades[0] ||
itemActual?.modalidad ||
""
const actualizado =
carrito.map((item, itemIndex) =>
itemIndex === index
? prepararProductoPedido({
...item,
tamano,
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
fecha: pedido.fecha,
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
alert(JSON.stringify(errorCompatible))
alert("Error al guardar pedido")
return false
}
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
const productosParaPedido =
carritoConPrecios.map((item) => ({
...item,
modalidad:
item.modalidad ||
modalidadPedido,
}))
if (productosParaPedido.length === 0) {
alert("Agrega productos al pedido")
return
}
const faltaModalidad =
productosParaPedido.some(
(item) => !item.modalidad
)
if (faltaModalidad) {
alert("Selecciona la modalidad de todos los productos")
return
}
const faltaTamano =
productosParaPedido.some(
(item) =>
obtenerTamanosProducto(item).length > 0 &&
!item.tamano
)
if (faltaTamano) {
alert("Selecciona el tamaño de todos los productos")
return
}
if (anticipoCapturado > total) {
alert("El anticipo no puede ser mayor al total del pedido")
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
const ok =
await guardarPedido(pedido)
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
alert("Error actualizando estado")
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
alert("Error actualizando pago")
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
alert("Error actualizando pago")
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
numero(actualizado.cantidad),
actualizado.modalidad,
actualizado.tamano
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
const tamanosProducto =
obtenerTamanosProducto(producto)
const tamanoDefault =
tamanosProducto[0]?.nombre || ""
const modalidadDefault =
tamanosProducto[0]?.modalidad || ""
const productos = [
...(pedidoEditando.productos || []),
prepararProductoPedido({
...producto,
tamano: tamanoDefault,
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
const estadoEntrega =
obtenerEstadoEntrega(pedido)
const estadoPago =
obtenerEstadoPago(pedido)
const anticipoPedidoGuardado =
obtenerAnticipo(pedido)
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
`Saldo: $${saldoPedidoGuardado}${notas}`
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
const estadoEntrega =
obtenerEstadoEntrega(pedido)
const estadoPago =
obtenerEstadoPago(pedido)
const anticipoPedidoGuardado =
obtenerAnticipo(pedido)
const saldoPedidoGuardado =
obtenerSaldo(pedido)
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
${escaparHTML(
[
p.tamano,
p.modalidad,
].filter(Boolean).join(" / ") ||
"Sin tamaño"
)}
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
${escaparHTML(estadoEntrega)}
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
Pago
</p>
<h2 class="value">
${escaparHTML(estadoPago)}
</h2>
</div>
<div class="info-card">
<p class="label">
Anticipo
</p>
<h2 class="value">
$${anticipoPedidoGuardado}
</h2>
</div>
<div class="info-card">
<p class="label">
Saldo
</p>
<h2 class="value">
$${saldoPedidoGuardado}
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
<div>
<p>
Anticipo
</p>
<h2>
$${anticipoPedidoGuardado}
</h2>
</div>
<div>
<p>
Saldo
</p>
<h2>
$${saldoPedidoGuardado}
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
className="input-premium input-cliente-grande"
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
<div>
<label className="block text-sm font-semibold text-zinc-500 mb-2">
Modalidad
</label>
<select
value={modalidadPedido}
onChange={(e) =>
actualizarModalidadPedido(
e.target.value
)
}
className="input-premium"
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
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
<label className="block text-sm font-semibold text-zinc-500 mb-2">
Anticipo
</label>
<input
type="number"
min="0"
value={anticipo}
onChange={(e) => {
const valor =
e.target.value
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
{obtenerTamanosProducto(item).length > 0 && (
<select
value={item.tamano || ""}
onChange={(e) =>
actualizarTamanoCarrito(
index,
e.target.value
)
}
className="input-premium mt-4"
>
{obtenerNombresTamanos(item).map((tamano) => (
<option
key={tamano}
value={tamano}
>
{tamano}
</option>
))}
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
className="input-premium mt-4"
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
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<div className="rounded-3xl bg-[#D9F5F8] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Total pedido
</p>
<p className="text-2xl font-black text-cyan-600">
${total}
</p>
</div>
<div className="rounded-3xl bg-[#FFF0B8] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Anticipo
</p>
<p className="text-2xl font-black text-zinc-700">
${anticipoPedido}
</p>
</div>
<div className="rounded-3xl bg-[#FFE0DD] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Saldo
</p>
<p className="text-2xl font-black text-rose-400">
${saldoPedido}
</p>
</div>
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
<div className="mt-4 flex flex-wrap gap-3">
<span className={`badge-pedido ${
obtenerEstadoEntrega(pedido) === "entregado"
? "badge-entregado"
: "badge-pendiente"
}`}>
{obtenerEstadoEntrega(pedido) === "entregado"
? "Entregado"
: "Pendiente"}
</span>
<span className={`badge-pedido ${
obtenerEstadoPago(pedido) === "pagado"
? "badge-pagado"
 : obtenerEstadoPago(pedido) === "anticipo"
 ? "badge-anticipo"
: "badge-pendiente"
}`}>
{obtenerEstadoPago(pedido) === "pagado"
? "Pagado"
: obtenerEstadoPago(pedido) === "anticipo"
? "Anticipo"
: "Pendiente"}
</span>
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
<div className="text-4xl font-black text-rose-300 mt-6">
${pedido.total}
</div>
<div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm font-black uppercase">
<div className="rounded-2xl bg-[#D9F5F8] p-3 text-cyan-700">
Total ${numero(pedido.total)}
</div>
<div className="rounded-2xl bg-[#FFF0B8] p-3 text-zinc-700">
Anticipo ${obtenerAnticipo(pedido)}
</div>
<div className="rounded-2xl bg-[#FFE0DD] p-3 text-rose-500">
Saldo ${obtenerSaldo(pedido)}
</div>
</div>
</div>
<div className="flex flex-col gap-3 min-w-[220px]">
<button
onClick={() =>
cambiarEstadoEntrega(
pedido,
"pendiente"
)
}
className={`badge-action ${
obtenerEstadoEntrega(pedido) === "pendiente"
? "badge-pendiente"
: "badge-neutral"
}`}
>
Pendiente
</button>
<button
onClick={() =>
cambiarEstadoEntrega(
pedido,
"entregado"
)
}
className={`badge-action ${
obtenerEstadoEntrega(pedido) === "entregado"
? "badge-entregado"
: "badge-neutral"
}`}
>
Entregado
</button>
<button
onClick={() =>
cambiarEstadoPago(
pedido,
"pendiente"
)
}
className={`badge-action ${
obtenerEstadoPago(pedido) === "pendiente"
? "badge-pendiente"
: "badge-neutral"
}`}
>
Pendiente
</button>
<button
onClick={() =>
cambiarEstadoPago(
pedido,
"anticipo"
)
}
className={`badge-action ${
obtenerEstadoPago(pedido) === "anticipo"
? "badge-anticipo"
: "badge-neutral"
}`}
>
Anticipo
</button>
<button
onClick={() =>
cambiarEstadoPago(
pedido,
"pagado"
)
}
className={`badge-action ${
obtenerEstadoPago(pedido) === "pagado"
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
<div>
<label className="block text-sm font-semibold text-zinc-500 mb-2">
Anticipo
</label>
<input
type="number"
min="0"
value={pedidoEditando.anticipo || 0}
onChange={(e) => {
const valor =
Number(e.target.value) || 0
setPedidoEditando({
...pedidoEditando,
anticipo: valor,
estado_pago:
pedidoEditando.estado_pago === "pagado"
? "pagado"
: resolverEstadoPago(
pedidoEditando.estado_pago,
valor
),
})
}}
className="input-premium"
/>
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
<div className="grid grid-cols-3 gap-3">
<button
type="button"
onClick={() =>
setPedidoEditando({
...pedidoEditando,
estado_pago: "pendiente",
})
}
className={`badge-action ${
resolverEstadoPago(
pedidoEditando.estado_pago,
pedidoEditando.anticipo
) === "pendiente"
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
estado_pago: "anticipo",
})
}
className={`badge-action ${
resolverEstadoPago(
pedidoEditando.estado_pago,
pedidoEditando.anticipo
) === "anticipo"
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
resolverEstadoPago(
pedidoEditando.estado_pago,
pedidoEditando.anticipo
) === "pagado"
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
{obtenerTamanosProducto(producto).length > 0 && (
<select
value={producto.tamano || ""}
onChange={(e) => {
const modalidades =
obtenerModalidadesTamano(
producto,
e.target.value
)
actualizarProductoPedido(
index,
{
tamano: e.target.value,
modalidad:
modalidades[0] ||
producto.modalidad ||
"",
},
true
)
}}
className="input-premium"
>
{obtenerNombresTamanos(producto).map((tamano) => (
<option
key={tamano}
value={tamano}
>
{tamano}
</option>
))}
</select>
)}
<select
value={producto.modalidad || ""}
onChange={(e) =>
actualizarProductoPedido(
index,
{
modalidad: e.target.value,
},
true
)
}
className="input-premium"
>
<option value="">
Modalidad
</option>
{(obtenerTamanosProducto(producto).length > 0
? obtenerModalidadesTamano(
producto,
producto.tamano
)
: MODALIDADES
).map((opcion: string) => (
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
<div className="sticky top-0 z-10 mb-6 rounded-3xl border border-[#F8D6D0] bg-white/95 p-4 shadow-sm backdrop-blur">
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
<div>
<p className="text-xs font-black uppercase text-zinc-400">
Productos agregados
</p>
<h4 className="text-2xl font-black text-cyan-600 mt-1">
{(pedidoEditando.productos || []).length} en el pedido
</h4>
</div>
<div className="text-2xl font-black text-rose-300">
Total ${calcularTotalProductos(
pedidoEditando.productos || []
)}
</div>
</div>
{(pedidoEditando.productos || []).length > 0 && (
<div className="mt-4 flex gap-3 overflow-x-auto pb-1">
{(pedidoEditando.productos || []).map(
(producto: any, index: number) => (
<div
key={`${producto.producto_id || producto.id || index}-${index}`}
className="min-w-[220px] rounded-2xl bg-[#FFF8F5] border border-[#F8D6D0] p-3"
>
<p className="font-black text-cyan-600 truncate">
{producto.nombre}
</p>
<p className="text-sm font-bold text-zinc-500">
{[
producto.tamano,
producto.modalidad,
].filter(Boolean).join(" / ") || "Sin tamaño"}
</p>
<p className="text-sm font-black text-rose-300 mt-1">
{numero(producto.cantidad)} pza. · ${numero(producto.precio)} c/u
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
<h4 className="text-2xl font-black text-cyan-600 mt-2">
{producto.nombre}
</h4>
<div className="mt-4 space-y-2">
{obtenerTamanosProducto(producto).length > 0 ? (
obtenerTamanosProducto(producto).map((tamano: any) => (
<div
key={`${tamano.tamano_id}-${tamano.modalidad}`}
className="rounded-2xl bg-[#FFF8F5] border border-[#F8D6D0] p-3"
>
<p className="text-xs font-black uppercase text-zinc-400">
{tamano.nombre} / {tamano.modalidad}
</p>
<p className="text-lg font-black text-rose-300">
Menudeo ${numero(tamano.precio_menudeo)}
</p>
<p className="text-base font-black text-cyan-500">
Mayoreo ${numero(tamano.precio_mayoreo)}
</p>
</div>
))
) : (
MODALIDADES_PRECIO.map((modalidad) => (
<div
key={modalidad.clave}
className="rounded-2xl bg-[#FFF8F5] border border-[#F8D6D0] p-3"
>
<p className="text-xs font-black uppercase text-zinc-400">
{modalidad.label}
</p>
<p className="text-lg font-black text-rose-300">
Menudeo ${obtenerPrecioMenudeo(
producto,
modalidad.clave
)}
</p>
<p className="text-base font-black text-cyan-500">
Mayoreo ${obtenerPrecioMayoreo(
producto,
modalidad.clave
)}
</p>
</div>
))
)}
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
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<div className="rounded-3xl bg-[#D9F5F8] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Total pedido
</p>
<p className="text-2xl font-black text-cyan-600">
${calcularTotalProductos(pedidoEditando.productos || [])}
</p>
</div>
<div className="rounded-3xl bg-[#FFF0B8] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Anticipo
</p>
<p className="text-2xl font-black text-zinc-700">
${Math.min(
numero(pedidoEditando.anticipo),
calcularTotalProductos(pedidoEditando.productos || [])
)}
</p>
</div>
<div className="rounded-3xl bg-[#FFE0DD] p-5">
<p className="text-sm font-black uppercase text-zinc-500">
Saldo
</p>
<p className="text-2xl font-black text-rose-400">
${resolverEstadoPago(
pedidoEditando.estado_pago,
pedidoEditando.anticipo
) === "pagado"
? 0
: Math.max(
calcularTotalProductos(pedidoEditando.productos || []) -
numero(pedidoEditando.anticipo),
0
)}
</p>
</div>
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
const faltaTamano =
productos.some(
(producto: any) =>
obtenerTamanosProducto(producto).length > 0 &&
!producto.tamano
)
if (faltaTamano) {
alert("Selecciona el tamaño de todos los productos")
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
alert("El anticipo no puede ser mayor al total del pedido")
return
}
const pedidoActualizado = {
cliente: pedidoEditando.cliente,
telefono: pedidoEditando.telefono,
fecha: pedidoEditando.fecha,
notas: pedidoEditando.notas,
estado: pedidoEditando.estado,
estado_pago:
resolverEstadoPago(
pedidoEditando.estado_pago,
anticipoActualizado
),
anticipo: anticipoActualizado,
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
alert("Error actualizando")
return
}
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
