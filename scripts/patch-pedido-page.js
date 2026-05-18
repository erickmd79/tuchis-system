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
