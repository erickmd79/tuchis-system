// Shared pricing, size, and product helpers.
//
// WHY THE EARLY-RETURN IN obtenerPrecioMenudeo / obtenerPrecioMayoreo:
// Cart items stored in localStorage already carry resolved price fields
// (precio_menudeo, precio_mayoreo) and a tamano string. The early return
// short-circuits the lookup for those items without re-running the full
// tamanos array search. Catalog products arriving from Supabase never
// trigger this branch because their root-level `.tamano` is undefined.

export const MODALIDADES = [
  "Blancas",
  "Pintadas",
  "Kit",
] as const

export const MODALIDADES_PRECIO = [
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
] as const

export const numero = (valor: unknown): number =>
  Number(valor || 0)

export const moneda = (valor: unknown): string =>
  `$${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numero(valor))}`

// Uses NFD normalization (superset of pedido's simple toLowerCase).
// Outcome is identical for the strings in use ("Blancas", "Pintadas", "Kit").
export const obtenerClaveModalidad = (
  modalidad?: string
): "blanca" | "pintada" | "kit" => {
  const valor = String(modalidad || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()

  if (valor.includes("pintad")) return "pintada"
  if (valor.includes("kit")) return "kit"
  return "blanca"
}

export const obtenerConfigModalidad = (modalidad?: string) =>
  MODALIDADES_PRECIO.find(
    (item) => item.clave === obtenerClaveModalidad(modalidad)
  ) ?? MODALIDADES_PRECIO[0]

export const obtenerNombreTamano = (tamano: unknown): string =>
  String(
    (tamano as any)?.nombre ??
    (tamano as any)?.tamano ??
    ""
  ).trim()

export const prepararTamanoProducto = (tamano: any) => ({
  id: tamano.id,
  tamano_id: tamano.tamano_id ?? tamano.id,
  nombre: obtenerNombreTamano(tamano),
  modalidad: tamano.modalidad || "",
  precio_menudeo: numero(tamano.precio_menudeo),
  precio_mayoreo: numero(tamano.precio_mayoreo),
})

export const obtenerTamanosProducto = (producto: any) =>
  Array.isArray(producto?.tamanos)
    ? producto.tamanos
        .map(prepararTamanoProducto)
        .filter((t: any) => t.nombre)
    : []

export const obtenerNombresTamanos = (producto: any): string[] =>
  Array.from(
    new Set(
      obtenerTamanosProducto(producto).map((t: any) => t.nombre)
    )
  ) as string[]

export const obtenerModalidadesTamano = (
  producto: any,
  tamanoNombre?: string
): string[] =>
  obtenerTamanosProducto(producto)
    .filter(
      (t: any) => !tamanoNombre || t.nombre === tamanoNombre
    )
    .map((t: any) => t.modalidad)

export const obtenerConfigTamano = (
  producto: any,
  tamanoNombre?: string,
  modalidad?: string
) =>
  obtenerTamanosProducto(producto).find(
    (t: any) =>
      t.nombre === tamanoNombre &&
      obtenerClaveModalidad(t.modalidad) ===
        obtenerClaveModalidad(modalidad)
  )

export const obtenerMinimoMayoreo = (producto: any): number =>
  numero(producto.minimo_mayoreo)

// Returns retail price. Superset of catalogo's version: the early-return
// handles pre-resolved cart items (tamano set + precio_menudeo defined).
// Catalog products never match that branch (root .tamano is undefined).
export const obtenerPrecioMenudeo = (
  producto: any,
  modalidad?: string,
  tamano?: string
): number => {
  if (
    producto.tamano &&
    producto.precio_menudeo !== undefined
  ) {
    return numero(producto.precio_menudeo)
  }

  const configTamano = obtenerConfigTamano(producto, tamano, modalidad)

  if (configTamano) {
    return numero(configTamano.precio_menudeo)
  }

  const config = obtenerConfigModalidad(modalidad)

  return numero(
    producto[config.menudeo] ??
    producto.precio_menudeo ??
    producto.precio
  )
}

// Returns wholesale price. Same superset rationale as obtenerPrecioMenudeo.
export const obtenerPrecioMayoreo = (
  producto: any,
  modalidad?: string,
  tamano?: string
): number => {
  if (
    producto.tamano &&
    producto.precio_mayoreo !== undefined
  ) {
    return numero(producto.precio_mayoreo)
  }

  const configTamano = obtenerConfigTamano(producto, tamano, modalidad)

  if (configTamano) {
    return numero(configTamano.precio_mayoreo)
  }

  const config = obtenerConfigModalidad(modalidad)

  return numero(
    producto[config.mayoreo] ??
    producto.precio_mayoreo ??
    producto.precio
  )
}

// Used by catalogo: user explicitly selects "mayoreo" type;
// quantity must also meet the minimum threshold.
export const resolverTipoPrecio = (
  producto: any,
  cantidad: number,
  tipoPrecio?: string,
  modalidad?: string,
  tamano?: string
): "menudeo" | "mayoreo" => {
  const minimoMayoreo = obtenerMinimoMayoreo(producto)
  const precioMayoreo = obtenerPrecioMayoreo(
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

// Used by catalogo: returns the unit price for the currently selected type.
export const obtenerPrecioSeleccionado = (
  producto: any,
  cantidad: number,
  tipoPrecio?: string,
  modalidad?: string,
  tamano?: string
): number =>
  resolverTipoPrecio(
    producto,
    cantidad,
    tipoPrecio,
    modalidad,
    tamano
  ) === "mayoreo"
    ? obtenerPrecioMayoreo(producto, modalidad, tamano)
    : obtenerPrecioMenudeo(producto, modalidad, tamano)

// Used by PedidoPageClient: automatically applies wholesale when the
// quantity threshold is met (no explicit tipoPrecio selection required).
export const obtenerPrecioPorCantidad = (
  producto: any,
  cantidad: number,
  modalidad?: string,
  tamano?: string
): number => {
  const minimoMayoreo = obtenerMinimoMayoreo(producto)
  const precioMayoreo = obtenerPrecioMayoreo(
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

  return obtenerPrecioMenudeo(producto, modalidad, tamano)
}

// Used by PedidoPageClient: sum of precio * cantidad for all line items.
export const calcularTotalProductos = (
  productos: any[] = []
): number =>
  productos.reduce(
    (acc: number, item: any) =>
      acc + numero(item.precio) * numero(item.cantidad),
    0
  )
