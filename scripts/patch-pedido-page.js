const fs = require("fs")
const path = require("path")

const target = path.join(
  __dirname,
  "..",
  "src/app/pedido/PedidoPageClient.tsx"
)

if (!fs.existsSync(target)) {
  throw new Error("Missing required page: src/app/pedido/PedidoPageClient.tsx")
}

let content = fs.readFileSync(target, "utf8")

const replaceOptional = (search, replacement) => {
  if (content.includes(search)) {
    content = content.replace(search, replacement)
  }
}

const replaceRegexOptional = (pattern, replacement) => {
  if (pattern.test(content)) {
    content = content.replace(pattern, replacement)
  }
}

replaceOptional(
  `const productosParaPedido =
carritoConPrecios.map((item) => ({
...item,
modalidad:
item.modalidad ||
modalidadPedido,
}))
`,
  `const productosParaPedido =
carritoConPrecios.map((item) => ({
...item,
modalidad: item.modalidad,
}))
`
)

replaceOptional(
  `<div>
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
`,
  ""
)

replaceOptional(
  `if (error && esErrorColumnasPedido(error)) {
const { error: errorCompatible } =
await supabase
.from("pedidos")
.insert([sinColumnasPago(pedidoBase)])
`,
  `if (error && esErrorColumnasPedido(error)) {
if (
numero(pedidoBase.anticipo) > 0 ||
pedidoBase.estado_pago !== "pendiente"
) {
alert(
"Ejecuta el SQL de anticipos en Supabase para guardar anticipo y estado de pago."
)
return false
}
const { error: errorCompatible } =
await supabase
.from("pedidos")
.insert([sinColumnasPago(pedidoBase)])
`
)

replaceOptional(
  `value={pedidoEditando.anticipo || 0}`,
  `value={pedidoEditando.anticipo ?? ""}`
)

replaceOptional(
  `const calcularTotalProductos = (
productos: any[] = []
) =>
productos.reduce(
(acc, item) =>
acc +
numero(item.precio) *
numero(item.cantidad),
0
)`,
  `const resolverTipoPrecio = (
producto: any,
cantidad: number,
tipoPrecio?: string,
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
tipoPrecio === "mayoreo" &&
precioMayoreo > 0 &&
(minimoMayoreo === 0 || cantidad >= minimoMayoreo)
) {
return "mayoreo"
}
return "menudeo"
}
const obtenerPrecioSeleccionado = (
producto: any,
cantidad: number,
tipoPrecio?: string,
modalidad?: string,
tamano?: string
) =>
resolverTipoPrecio(
producto,
cantidad,
tipoPrecio,
modalidad,
tamano
) === "mayoreo"
? obtenerPrecioMayoreo(
producto,
modalidad,
tamano
)
: obtenerPrecioMenudeo(
producto,
modalidad,
tamano
)
const calcularTotalProductos = (
productos: any[] = []
) =>
productos.reduce(
(acc, item) =>
acc +
numero(
item.subtotal ??
numero(item.precio_unitario ?? item.precio) *
numero(item.cantidad)
),
0
)`
)

replaceOptional(
  `const obtenerEstadoEntrega = (pedido: any) =>
pedido.estado === "entregado"
? "entregado"
: "pendiente"`,
  `const obtenerEstadoEntrega = (pedido: any) =>
pedido.estado === "entregado"
? "entregado"
: pedido.estado === "en_produccion" ||
pedido.estado === "en producción"
? "en_produccion"
: pedido.estado === "pagado"
? "pagado"
: "pendiente"`
)

replaceOptional(
  `minimo_mayoreo:
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
}`,
  `minimo_mayoreo:
productoActual.minimo_mayoreo ??
producto.minimo_mayoreo ??
0,
imagen:
producto.imagen ??
producto.imagenes?.[0] ??
productoActual.imagenes?.[0] ??
"",
imagenes:
producto.imagenes ??
productoActual.imagenes ??
[],
tamanos:
productoActual.tamanos ??
producto.tamanos ??
[],
}
const tipoPrecio =
resolverTipoPrecio(
productoConPrecios,
piezas,
producto.tipo_precio,
productoConPrecios.modalidad,
productoConPrecios.tamano
)
const precioUnitario =
obtenerPrecioSeleccionado(
productoConPrecios,
piezas,
tipoPrecio,
productoConPrecios.modalidad,
productoConPrecios.tamano
)
return {
...productoConPrecios,
tipo_precio: tipoPrecio,
precio: precioUnitario,
precio_unitario: precioUnitario,
subtotal:
precioUnitario * piezas,
}`
)

replaceOptional(
  `nombre: p.nombre,
precio: numero(p.precio),
cantidad: numero(p.cantidad),`,
  `nombre: p.nombre,
precio: numero(p.precio),
precio_unitario: numero(p.precio_unitario ?? p.precio),
tipo_precio: p.tipo_precio || "menudeo",
cantidad: numero(p.cantidad),
subtotal:
numero(
p.subtotal ??
numero(p.precio_unitario ?? p.precio) *
numero(p.cantidad)
),`
)

replaceOptional(
  `minimo_mayoreo: p.minimo_mayoreo,
imagenes: p.imagenes || [],`,
  `minimo_mayoreo: p.minimo_mayoreo,
imagen: p.imagen || p.imagenes?.[0] || "",
imagenes: p.imagenes || [],`
)

replaceOptional(
  `if (recalcularPrecio) {
actualizado.precio =
obtenerPrecioPorCantidad(
actualizado,
numero(actualizado.cantidad),
actualizado.modalidad,
actualizado.tamano
)
}`,
  `if (recalcularPrecio) {
const tipoPrecio =
resolverTipoPrecio(
actualizado,
numero(actualizado.cantidad),
actualizado.tipo_precio,
actualizado.modalidad,
actualizado.tamano
)
const precioUnitario =
obtenerPrecioSeleccionado(
actualizado,
numero(actualizado.cantidad),
tipoPrecio,
actualizado.modalidad,
actualizado.tamano
)
actualizado.tipo_precio = tipoPrecio
actualizado.precio = precioUnitario
actualizado.precio_unitario = precioUnitario
actualizado.subtotal =
precioUnitario * numero(actualizado.cantidad)
}`
)

replaceRegexOptional(
  /const enviarWhatsApp = \(pedido: any\) => \{[\s\S]*?\n\}\nconst generarPDF = \(pedido: any\) => \{/,
  `const enviarWhatsApp = (pedido: any) => {
const folio =
\`TCH-\${pedido.id}\`
const productos =
pedido.productos
.map(
(p: any) =>
\`• \${p.nombre} (\${[
p.tamano,
p.modalidad,
p.tipo_precio,
].filter(Boolean).join(" / ") || "Sin tamaño"}) x\${p.cantidad} · $\${numero(
p.subtotal ??
numero(p.precio_unitario ?? p.precio) *
numero(p.cantidad)
)}\`
)
.join("\\n")
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
? \`\\nNotas: \${pedido.notas}\`
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
\`Hola \${pedido.cliente}\\n\\n\` +
\`Gracias por cotizar con TUCHIS alcancías.\\n\` +
\`Folio: \${folio}\\n\\n\` +
\`Fecha de pedido: \${fechaPedido}\\n\` +
\`Fecha de entrega: \${fechaEntrega}\\n\` +
\`Estado: \${estadoEntrega}\\n\` +
\`Pago: \${estadoPago}\\n\` +
\`Productos:\\n\${productos}\\n\\n\` +
\`Total: $\${pedido.total}\\n\` +
\`Anticipo: $\${anticipoPedidoGuardado}\\n\` +
\`Saldo: $\${saldoPedidoGuardado}\${notas}\\n\\n\` +
\`Quedamos atentos para ayudarte a imaginar, pintar y disfrutar.\`
window.open(
\`https://wa.me/52\${pedido.telefono}?text=\${encodeURIComponent(mensaje)}\`,
"_blank"
)
}
const generarPDF = (pedido: any) => {`
)

replaceOptional(
  `const subtotal =
numero(p.precio) *
numero(p.cantidad)
return \``,
  `const subtotal =
numero(
p.subtotal ??
numero(p.precio_unitario ?? p.precio) *
numero(p.cantidad)
)
const precioUnitario =
numero(p.precio_unitario ?? p.precio)
return \``
)

replaceOptional(
  `p.tamano,
p.modalidad,
].filter(Boolean).join(" / ") ||
"Sin tamaño"`,
  `p.tamano,
p.modalidad,
p.tipo_precio,
].filter(Boolean).join(" / ") ||
"Sin tamaño"`
)

replaceOptional(
  '$${numero(p.precio)} c/u',
  '$${precioUnitario} c/u'
)

replaceOptional(
  `const [fecha, setFecha] = useState("")
const [notas, setNotas] = useState("")
useEffect(() => {
const data =
JSON.parse(
localStorage.getItem("carrito") || "[]"
)
setCarrito(data)
`,
  `const [fecha, setFecha] = useState("")
const [notas, setNotas] = useState("")
const [mostrarFormularioPedido, setMostrarFormularioPedido] =
useState(false)
useEffect(() => {
const data =
JSON.parse(
localStorage.getItem("carrito") || "[]"
)
setCarrito(data)
const parametros =
new URLSearchParams(window.location.search)
setMostrarFormularioPedido(
parametros.get("carrito") === "1" &&
data.length > 0
)
`
)

if (!content.includes("{mostrarFormularioPedido && (")) {
  replaceOptional(
    `<div className="section-card">
<h2 className="text-3xl font-black text-cyan-600 mb-8">
Nuevo pedido
`,
    `{mostrarFormularioPedido && (
<div className="section-card">
<h2 className="text-3xl font-black text-cyan-600 mb-8">
Nuevo pedido
`
  )

  replaceOptional(
    `</button>
</div>
)}
</div>
<div className="section-card">
<h2 className="text-3xl font-black text-cyan-600 mb-8">
Pedidos guardados
`,
    `</button>
</div>
)}
</div>
)}
<div className="section-card">
<h2 className="text-3xl font-black text-cyan-600 mb-8">
Pedidos guardados
`
  )
}

replaceOptional(
  `const { error } = await supabase
.from("pedidos")
.update(pedidoActualizado)
.eq("id", pedidoEditando.id)
`,
  `const { data: pedidoGuardado, error } = await supabase
.from("pedidos")
.update(pedidoActualizado)
.eq("id", pedidoEditando.id)
.select("id, anticipo, estado_pago")
.maybeSingle()
`
)

replaceOptional(
  `if (error && esErrorColumnasPedido(error)) {
const { error: errorCompatible } =
await supabase
.from("pedidos")
.update(sinColumnasPago(pedidoActualizado))
`,
  `if (error && esErrorColumnasPedido(error)) {
if (
anticipoActualizado > 0 ||
pedidoActualizado.estado_pago !== "pendiente"
) {
alert(
"Ejecuta el SQL de anticipos en Supabase para guardar anticipo y estado de pago."
)
return
}
const { error: errorCompatible } =
await supabase
.from("pedidos")
.update(sinColumnasPago(pedidoActualizado))
`
)

replaceOptional(
  `if (error) {
console.log(error)
alert("Error actualizando")
return
}
alert("Pedido actualizado")
`,
  `if (error) {
console.log(error)
alert("Error actualizando")
return
}
if (!pedidoGuardado) {
alert(
"No se pudo actualizar el pedido. Ejecuta el SQL de anticipos en Supabase para permitir cambios."
)
return
}
alert("Pedido actualizado")
`
)

fs.writeFileSync(target, content)
