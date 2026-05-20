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

const limpiarMedidas = (valor: string) =>
  valor.replace(/\s*cm\s*$/i, "").trim()

const mostrarMedidas = (valor?: string) => {
  const medidas = limpiarMedidas(String(valor || ""))

  return medidas ? `${medidas} cm` : ""
}

const numero = (valor: any) =>
  Number(valor || 0)

const normalizar = (valor: any) =>
  String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

const obtenerClaveModalidad = (modalidad?: string) => {
  const valor = normalizar(modalidad)

  if (valor.includes("pintad")) return "pintada"
  if (valor.includes("kit")) return "kit"
  return "blanca"
}

const obtenerConfigModalidad = (modalidad?: string) =>
  MODALIDADES_PRECIO.find(
    (item) =>
      item.clave === obtenerClaveModalidad(modalidad)
  ) || MODALIDADES_PRECIO[0]

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
  modalidad: tamano.modalidad || "",
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

const obtenerPrecioMenudeo = (
  producto: any,
  modalidad?: string,
  tamano?: string
) => {
  const configTamano =
    obtenerConfigTamano(
      producto,
      tamano,
      modalidad
    )

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

const obtenerPrecioMayoreo = (
  producto: any,
  modalidad?: string,
  tamano?: string
) => {
  const configTamano =
    obtenerConfigTamano(
      producto,
      tamano,
      modalidad
    )

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

const obtenerMinimoMayoreo = (producto: any) =>
  numero(producto.minimo_mayoreo)

const resolverTipoPrecio = (
  producto: any,
  cantidad: number,
  tipoPrecio?: string,
  modalidad?: string,
  tamano?: string
) => {
  const minimoMayoreo = obtenerMinimoMayoreo(producto)
  const precioMayoreo =
    obtenerPrecioMayoreo(producto, modalidad, tamano)

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
    ? obtenerPrecioMayoreo(producto, modalidad, tamano)
    : obtenerPrecioMenudeo(producto, modalidad, tamano)

const obtenerPrecioDesde = (producto: any) => {
  const preciosTamanos =
    obtenerTamanosProducto(producto)
      .flatMap((tamano: any) => [
        numero(tamano.precio_menudeo),
        numero(tamano.precio_mayoreo),
      ])
      .filter((precio: number) => precio > 0)

  if (preciosTamanos.length > 0) {
    return Math.min(...preciosTamanos)
  }

  const preciosBase = [
    obtenerPrecioMenudeo(producto, "Blancas"),
    obtenerPrecioMayoreo(producto, "Blancas"),
  ].filter((precio: number) => precio > 0)

  return preciosBase.length > 0
    ? Math.min(...preciosBase)
    : 0
}

const crearIdCarrito = (item: any) =>
  [
    item.producto_id ?? item.id,
    item.tamano || "sin-tamano",
    obtenerClaveModalidad(item.modalidad),
    item.tipo_precio || "menudeo",
  ].join("-")

const prepararItemCarrito = (
  item: any,
  productos: any[] = []
) => {
  const productoActual =
    productos.find(
      (producto) =>
        String(producto.id) ===
        String(item.producto_id ?? item.id)
    ) || {}

  const cantidad =
    Math.max(1, numero(item.cantidad) || 1)

  const productoMezclado = {
    ...productoActual,
    ...item,
  }

  const configTamano =
    obtenerConfigTamano(
      productoMezclado,
      item.tamano,
      item.modalidad
    )

  const modalidad =
    (configTamano?.modalidad ?? item.modalidad) || ""

  const tipoPrecio =
    resolverTipoPrecio(
      productoMezclado,
      cantidad,
      item.tipo_precio,
      modalidad,
      configTamano?.nombre ?? item.tamano
    )

  const precio =
    obtenerPrecioSeleccionado(
      productoMezclado,
      cantidad,
      tipoPrecio,
      modalidad,
      configTamano?.nombre ?? item.tamano
    )

  const itemConPrecios = {
    ...productoActual,
    ...item,
    producto_id:
      item.producto_id ??
      item.id ??
      productoActual.id,
    nombre:
      item.nombre ??
      productoActual.nombre,
    tamano:
      configTamano?.nombre ??
      item.tamano ??
      "",
    tamano_id:
      configTamano?.tamano_id ??
      item.tamano_id ??
      "",
    modalidad,
    cantidad,
    tipo_precio: tipoPrecio,
    precio,
    precio_unitario: precio,
    precio_menudeo:
      configTamano
        ? numero(configTamano.precio_menudeo)
        : obtenerPrecioMenudeo(
            productoMezclado,
            modalidad,
            item.tamano
          ),
    precio_mayoreo:
      configTamano
        ? numero(configTamano.precio_mayoreo)
        : obtenerPrecioMayoreo(
            productoMezclado,
            modalidad,
            item.tamano
          ),
    minimo_mayoreo:
      productoActual.minimo_mayoreo ??
      item.minimo_mayoreo ??
      0,
    imagen:
      item.imagen ??
      item.imagenes?.[0] ??
      productoActual.imagenes?.[0] ??
      "",
    imagenes:
      item.imagenes ??
      productoActual.imagenes ??
      [],
    tamanos:
      productoActual.tamanos ??
      item.tamanos ??
      [],
  }

  return {
    ...itemConPrecios,
    carrito_id:
      item.carrito_id ||
      crearIdCarrito(itemConPrecios),
    subtotal:
      precio * cantidad,
  }
}

const obtenerBadgesProducto = (producto: any) => {
  const etiquetas = Array.isArray(producto.etiquetas)
    ? producto.etiquetas
    : []

  const posibles = [
    producto.nuevo && "Nuevo",
    producto.mas_vendido && "Más vendido",
    producto.evento && "Evento",
    producto.premium && "Premium",
    ...etiquetas,
  ].filter(Boolean)

  return posibles
    .map((badge: any) => String(badge).trim())
    .filter(Boolean)
    .filter((badge, index, lista) =>
      lista.findIndex(
        (item) =>
          normalizar(item) === normalizar(badge)
      ) === index
    )
}

export default function CatalogoPage() {

  const [productos, setProductos] = useState<any[]>([])
  const [carrito, setCarrito] = useState<any[]>([])

  const [busqueda, setBusqueda] = useState("")
  const [categoria, setCategoria] =
    useState("Todas")

  const [categorias, setCategorias] =
    useState<any[]>([])

  const [imagenesActivas, setImagenesActivas] =
    useState<any>({})

  const [productoSeleccionado, setProductoSeleccionado] =
    useState<any>(null)

  const [seleccion, setSeleccion] =
    useState({
      tamano: "",
      modalidad: "Blancas",
      tipo_precio: "menudeo",
      cantidad: 1,
    })

  useEffect(() => {

    obtenerProductos()
    obtenerCategorias()

    const carritoGuardado =
      JSON.parse(
        localStorage.getItem("carrito") || "[]"
      )

    setCarrito(
      carritoGuardado.map((item: any) =>
        prepararItemCarrito(item)
      )
    )

  }, [])

  const obtenerProductos = async () => {

    const { data, error } =
      await supabase
        .from("productos")
        .select("*")
        .order("id", {
          ascending: false
        })

    if (!error && data) {

      setProductos(data)

      const carritoGuardado =
        JSON.parse(
          localStorage.getItem("carrito") || "[]"
        )

      if (carritoGuardado.length > 0) {
        guardarCarrito(
          carritoGuardado.map((item: any) =>
            prepararItemCarrito(item, data)
          )
        )
      }

      let iniciales: any = {}

      data.forEach((producto) => {

        iniciales[producto.id] =
          producto.imagenes?.[0]
      })

      setImagenesActivas(iniciales)
    }
  }

  const obtenerCategorias = async () => {

    const { data, error } =
      await supabase
        .from("categorias")
        .select("*")
        .order("nombre")

    if (!error && data) {
      setCategorias(data)
    }
  }

  const guardarCarrito = (
    nuevoCarrito: any[]
  ) => {

    const carritoNormalizado =
      nuevoCarrito.map((item) =>
        prepararItemCarrito(item, productos)
      )

    setCarrito(carritoNormalizado)

    localStorage.setItem(
      "carrito",
      JSON.stringify(carritoNormalizado)
    )
  }

  const abrirSelectorProducto = (
    producto: any
  ) => {
    const tamanos = obtenerTamanosProducto(producto)
    const tamanoDefault = tamanos[0]?.nombre || ""
    const modalidadDefault =
      tamanos[0]?.modalidad ||
      MODALIDADES[0]

    setProductoSeleccionado(producto)
    setSeleccion({
      tamano: tamanoDefault,
      modalidad: modalidadDefault,
      tipo_precio: "menudeo",
      cantidad: 1,
    })
  }

  const actualizarTamanoSeleccionado = (
    tamano: string
  ) => {
    if (!productoSeleccionado) return

    const modalidades =
      obtenerModalidadesTamano(
        productoSeleccionado,
        tamano
      )

    setSeleccion({
      ...seleccion,
      tamano,
      modalidad:
        modalidades[0] ||
        seleccion.modalidad,
    })
  }

  const confirmarSeleccionProducto = () => {
    if (!productoSeleccionado) return

    const item =
      prepararItemCarrito(
        {
          ...productoSeleccionado,
          producto_id: productoSeleccionado.id,
          tamano: seleccion.tamano,
          modalidad: seleccion.modalidad,
          tipo_precio: seleccion.tipo_precio,
          cantidad: seleccion.cantidad,
        },
        productos
      )

    const existe =
      carrito.find(
        (producto) =>
          producto.carrito_id === item.carrito_id
      )

    if (existe) {
      guardarCarrito(
        carrito.map((producto) =>
          producto.carrito_id === item.carrito_id
            ? prepararItemCarrito(
                {
                  ...producto,
                  cantidad:
                    numero(producto.cantidad) +
                    numero(item.cantidad),
                },
                productos
              )
            : producto
        )
      )
    } else {
      guardarCarrito([
        ...carrito,
        item,
      ])
    }

    setProductoSeleccionado(null)
  }

  const aumentarCantidad = (
    carritoId: string
  ) => {

    const actualizado =
      carrito.map((item) =>

        item.carrito_id === carritoId
          ? prepararItemCarrito(
              {
                ...item,
                cantidad:
                  numero(item.cantidad) + 1,
              },
              productos
            )
          : item
      )

    guardarCarrito(actualizado)
  }

  const disminuirCantidad = (
    carritoId: string
  ) => {

    const actualizado =
      carrito
        .map((item) =>

          item.carrito_id === carritoId
            ? prepararItemCarrito(
                {
                  ...item,
                  cantidad:
                    numero(item.cantidad) - 1,
                },
                productos
              )
            : item
        )
        .filter(
          (item) =>
            item.cantidad > 0
        )

    guardarCarrito(actualizado)
  }

  const eliminarProducto = (
    carritoId: string
  ) => {

    const actualizado =
      carrito.filter(
        (item) => item.carrito_id !== carritoId
      )

    guardarCarrito(actualizado)
  }

  const totalProductos =
    carrito.reduce(
      (acc, item) =>
        acc + numero(item.cantidad),
      0
    )

  const subtotal =
    carrito.reduce(
      (acc, item) =>
        acc + numero(item.subtotal),
      0
    )

  const productosFiltrados =
    productos.filter((producto) => {

      const coincideBusqueda =
        normalizar(producto.nombre)
          .includes(normalizar(busqueda))

      const coincideCategoria =
        categoria === "Todas" ||
        producto.categoria ===
          categoria

      return (
        coincideBusqueda &&
        coincideCategoria
      )
    })

  const precioSeleccion =
    productoSeleccionado
      ? obtenerPrecioSeleccionado(
          productoSeleccionado,
          seleccion.cantidad,
          seleccion.tipo_precio,
          seleccion.modalidad,
          seleccion.tamano
        )
      : 0

  const tipoPrecioAplicado =
    productoSeleccionado
      ? resolverTipoPrecio(
          productoSeleccionado,
          seleccion.cantidad,
          seleccion.tipo_precio,
          seleccion.modalidad,
          seleccion.tamano
        )
      : "menudeo"

  const minimoSeleccion =
    productoSeleccionado
      ? obtenerMinimoMayoreo(productoSeleccionado)
      : 0

  const puedeUsarMayoreo =
    productoSeleccionado &&
    obtenerPrecioMayoreo(
      productoSeleccionado,
      seleccion.modalidad,
      seleccion.tamano
    ) > 0 &&
    (
      minimoSeleccion === 0 ||
      seleccion.cantidad >= minimoSeleccion
    )

  return (

    <div className="min-h-screen bg-[#FFF8F5] px-4 md:px-8 py-6 pb-72">

      <div className="mb-8 md:mb-10">

        <h1 className="text-4xl md:text-6xl font-black text-[#20B8C9] leading-none">
          Catálogo TUCHIS
        </h1>

        <p className="text-gray-500 mt-3 text-sm md:text-base">
          Elige tus alcancías favoritas
        </p>

      </div>

      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 mb-8 md:mb-10">

        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) =>
            setBusqueda(
              e.target.value
            )
          }
          className="w-full p-4 rounded-2xl border bg-white"
        />

        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(
              e.target.value
            )
          }
          className="w-full p-4 rounded-2xl border bg-white"
        >

          <option value="Todas">
            Todas las categorías
          </option>

          {categorias.map((cat) => (

            <option
              key={cat.id}
              value={cat.nombre}
            >
              {cat.nombre}
            </option>

          ))}

        </select>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

        {productosFiltrados.map(
          (producto) => {

            const precioDesde =
              obtenerPrecioDesde(producto)

            const minimoMayoreo =
              obtenerMinimoMayoreo(producto)

            const cantidadEnCarrito =
              carrito
                .filter(
                  (item) =>
                    String(item.producto_id ?? item.id) ===
                    String(producto.id)
                )
                .reduce(
                  (acc, item) =>
                    acc + numero(item.cantidad),
                  0
                )

            const badges =
              obtenerBadgesProducto(producto)

            const tamanosProducto =
              obtenerTamanosProducto(producto)

            return (

              <div
                key={producto.id}
                className="bg-white rounded-[32px] overflow-hidden shadow-lg border border-[#F8D6D0]"
              >

                <div className="relative">

                  <img
                    src={
                      imagenesActivas[
                        producto.id
                      ] ||
                      producto.imagenes?.[0] ||
                      "/logo.png"
                    }
                    alt={producto.nombre}
                    className="w-full h-[320px] object-cover"
                  />

                  {badges.length > 0 && (
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2 max-w-[85%]">
                      {badges.slice(0, 3).map((badge) => (
                        <span
                          key={badge}
                          className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-black uppercase text-[#20B8C9] shadow"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                </div>

                {producto.imagenes?.length > 1 && (
                  <div className="flex gap-2 px-3 pt-3 overflow-x-auto">

                    {producto.imagenes?.map(
                      (
                        imagen: string,
                        index: number
                      ) => (

                        <img
                          key={index}
                          src={imagen}
                          alt=""
                          onClick={() =>
                            setImagenesActivas({
                              ...imagenesActivas,
                              [producto.id]:
                                imagen,
                            })
                          }
                          className={`min-w-[70px] w-[70px] h-[70px]
                          object-cover rounded-2xl
                          cursor-pointer border-4
                          ${
                            imagenesActivas[
                              producto.id
                            ] === imagen
                              ? "border-[#20B8C9]"
                              : "border-transparent"
                          }`}
                        />

                      )
                    )}

                  </div>
                )}

                <div className="p-5 md:p-6">

                  <p className="text-pink-400 font-bold text-xs md:text-sm uppercase tracking-wider">
                    {
                      producto.categoria
                    }
                  </p>

                  <h2 className="text-2xl md:text-3xl font-black text-[#20B8C9] mt-2 leading-tight">
                    {producto.nombre}
                  </h2>

                  <p className="text-gray-500 mt-3 text-sm md:text-base">
                    {mostrarMedidas(producto.medidas)}
                  </p>

                  <div className="mt-5 space-y-1">

                    <p className="text-sm font-black uppercase text-gray-400">
                      Precio desde
                    </p>

                    <p className="text-3xl md:text-4xl font-black text-[#F49B93]">
                      ${precioDesde}
                    </p>

                    {tamanosProducto.length > 0 && (
                      <p className="text-sm font-bold text-[#20B8C9]">
                        {obtenerNombresTamanos(producto).join(", ")}
                      </p>
                    )}

                    {minimoMayoreo > 0 && (
                      <p className="text-xs md:text-sm font-black uppercase text-gray-400">
                        Mayoreo desde {minimoMayoreo} piezas
                      </p>
                    )}

                  </div>

                  {cantidadEnCarrito > 0 && (
                    <p className="mt-5 rounded-2xl bg-[#D9F5F8] px-4 py-3 text-sm font-black text-[#0D8EA0]">
                      {cantidadEnCarrito} en carrito
                    </p>
                  )}

                  <button
                    onClick={() =>
                      abrirSelectorProducto(
                        producto
                      )
                    }
                    className="w-full mt-6
                    bg-[#20B8C9]
                    hover:bg-[#17A7B8]
                    text-white py-5
                    rounded-2xl font-black
                    text-lg transition-all"
                  >
                    Seleccionar producto
                  </button>

                </div>

              </div>
            )
          }
        )}

      </div>

      {productoSeleccionado && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl border border-[#F8D6D0] w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-pink-400 font-black uppercase text-sm">
                  Cotizar producto
                </p>
                <h3 className="text-3xl md:text-5xl font-black text-[#20B8C9] mt-2">
                  {productoSeleccionado.nombre}
                </h3>
              </div>

              <button
                onClick={() =>
                  setProductoSeleccionado(null)
                }
                className="text-4xl text-gray-400 font-light"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 mt-6">
              <img
                src={
                  imagenesActivas[productoSeleccionado.id] ||
                  productoSeleccionado.imagenes?.[0] ||
                  "/logo.png"
                }
                alt={productoSeleccionado.nombre}
                className="w-full aspect-square object-cover rounded-[28px] border border-[#F8D6D0]"
              />

              <div className="space-y-5">
                {obtenerTamanosProducto(productoSeleccionado).length > 0 && (
                  <div>
                    <label className="block text-sm font-black uppercase text-gray-400 mb-2">
                      Tamaño
                    </label>
                    <select
                      value={seleccion.tamano}
                      onChange={(e) =>
                        actualizarTamanoSeleccionado(e.target.value)
                      }
                      className="w-full p-4 rounded-2xl border border-[#F8D6D0] bg-white font-bold"
                    >
                      {obtenerNombresTamanos(productoSeleccionado).map((tamano) => (
                        <option
                          key={tamano}
                          value={tamano}
                        >
                          {tamano}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-black uppercase text-gray-400 mb-2">
                    Modalidad
                  </label>
                  <select
                    value={seleccion.modalidad}
                    onChange={(e) =>
                      setSeleccion({
                        ...seleccion,
                        modalidad: e.target.value,
                      })
                    }
                    className="w-full p-4 rounded-2xl border border-[#F8D6D0] bg-white font-bold"
                  >
                    {(obtenerTamanosProducto(productoSeleccionado).length > 0
                      ? obtenerModalidadesTamano(
                          productoSeleccionado,
                          seleccion.tamano
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

                <div>
                  <label className="block text-sm font-black uppercase text-gray-400 mb-2">
                    Tipo de precio
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSeleccion({
                          ...seleccion,
                          tipo_precio: "menudeo",
                        })
                      }
                      className={`rounded-2xl px-4 py-4 font-black border transition ${
                        tipoPrecioAplicado === "menudeo"
                          ? "bg-[#FFE0DD] border-[#F49B93] text-[#C95F67]"
                          : "bg-[#FFF8F5] border-[#F8D6D0] text-gray-500"
                      }`}
                    >
                      Menudeo
                    </button>
                    <button
                      type="button"
                      disabled={!puedeUsarMayoreo}
                      onClick={() =>
                        setSeleccion({
                          ...seleccion,
                          tipo_precio: "mayoreo",
                        })
                      }
                      className={`rounded-2xl px-4 py-4 font-black border transition ${
                        tipoPrecioAplicado === "mayoreo"
                          ? "bg-[#D9F5F8] border-[#20B8C9] text-[#0D8EA0]"
                          : "bg-[#FFF8F5] border-[#F8D6D0] text-gray-500"
                      } ${!puedeUsarMayoreo ? "opacity-50" : ""}`}
                    >
                      Mayoreo
                    </button>
                  </div>
                  {minimoSeleccion > 0 && (
                    <p className="text-xs font-black uppercase text-gray-400 mt-2">
                      Mayoreo disponible desde {minimoSeleccion} piezas
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-black uppercase text-gray-400 mb-2">
                    Cantidad
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setSeleccion({
                          ...seleccion,
                          cantidad: Math.max(
                            1,
                            seleccion.cantidad - 1
                          ),
                          tipo_precio:
                            seleccion.cantidad - 1 < minimoSeleccion
                              ? "menudeo"
                              : seleccion.tipo_precio,
                        })
                      }
                      className="bg-[#FFD6D6] w-12 h-12 rounded-full text-2xl font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={seleccion.cantidad}
                      onChange={(e) => {
                        const cantidad =
                          Math.max(1, Number(e.target.value) || 1)

                        setSeleccion({
                          ...seleccion,
                          cantidad,
                          tipo_precio:
                            cantidad < minimoSeleccion
                              ? "menudeo"
                              : seleccion.tipo_precio,
                        })
                      }}
                      className="w-28 text-center p-4 rounded-2xl border border-[#F8D6D0] font-black text-xl"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSeleccion({
                          ...seleccion,
                          cantidad: seleccion.cantidad + 1,
                        })
                      }
                      className="bg-[#BEE9E8] w-12 h-12 rounded-full text-2xl font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-3xl bg-[#FFF8F5] border border-[#F8D6D0] p-4">
                    <p className="text-xs font-black uppercase text-gray-400">
                      Precio unitario
                    </p>
                    <p className="text-2xl font-black text-[#F49B93]">
                      ${precioSeleccion}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#D9F5F8] p-4">
                    <p className="text-xs font-black uppercase text-gray-500">
                      Tipo aplicado
                    </p>
                    <p className="text-xl font-black text-[#0D8EA0] capitalize">
                      {tipoPrecioAplicado}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#FFE0DD] p-4">
                    <p className="text-xs font-black uppercase text-gray-500">
                      Subtotal
                    </p>
                    <p className="text-2xl font-black text-[#C95F67]">
                      ${precioSeleccion * seleccion.cantidad}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={confirmarSeleccionProducto}
                  className="w-full bg-[#20B8C9] hover:bg-[#17A7B8] text-white py-5 rounded-2xl font-black text-lg transition-all"
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {carrito.length > 0 && (

        <div
          className="fixed bottom-3 left-1/2
          -translate-x-1/2
          bg-white/95 backdrop-blur-xl
          border border-[#F8D6D0]
          shadow-2xl rounded-[32px]
          w-[95%] max-w-[980px]
          p-5 md:p-6 z-50"
        >

          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-5 mb-5">

            <div>

              <p className="font-black text-[#20B8C9] text-xl md:text-2xl">
                🛒 {totalProductos} productos
              </p>

              <p className="text-[#F49B93] text-3xl md:text-4xl font-black mt-1">
                ${subtotal}
              </p>

            </div>

            <a
              href="/pedido?carrito=1"
              className="bg-[#20B8C9]
              text-white px-8 py-5
              rounded-2xl font-black
              text-center text-lg"
            >
              Ver carrito
            </a>

          </div>

          <div className="max-h-[280px] overflow-auto space-y-3">

            {carrito.map((item) => (

              <div
                key={item.carrito_id}
                className="bg-[#FFF8F5]
                rounded-3xl p-4
                flex flex-col md:flex-row
                md:justify-between
                md:items-center gap-4"
              >

                <div className="flex items-center gap-3">
                  {item.imagen && (
                    <img
                      src={item.imagen}
                      alt=""
                      className="w-16 h-16 rounded-2xl object-cover border border-[#F8D6D0]"
                    />
                  )}

                  <div>

                    <p className="font-black text-lg">
                      {item.nombre}
                    </p>

                    <p className="text-sm font-bold text-gray-500">
                      {[
                        item.tamano,
                        item.modalidad,
                        item.tipo_precio,
                      ].filter(Boolean).join(" · ")}
                    </p>

                    <p className="text-[#F49B93] font-black text-xl mt-1">
                      ${item.precio_unitario} c/u · Subtotal ${item.subtotal}
                    </p>

                    {obtenerMinimoMayoreo(item) > 0 && (
                      <p className="text-xs font-black uppercase text-gray-400 mt-1">
                        Mayoreo desde {item.minimo_mayoreo} piezas
                      </p>
                    )}

                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">

                  <button
                    onClick={() =>
                      disminuirCantidad(
                        item.carrito_id
                      )
                    }
                    className="bg-[#FFD6D6]
                    w-11 h-11 rounded-full
                    text-xl font-bold"
                  >
                    -
                  </button>

                  <span className="font-black text-xl">
                    {item.cantidad}
                  </span>

                  <button
                    onClick={() =>
                      aumentarCantidad(
                        item.carrito_id
                      )
                    }
                    className="bg-[#BEE9E8]
                    w-11 h-11 rounded-full
                    text-xl font-bold"
                  >
                    +
                  </button>

                  <button
                    onClick={() =>
                      eliminarProducto(
                        item.carrito_id
                      )
                    }
                    className="bg-red-500
                    text-white px-5 py-3
                    rounded-2xl font-bold"
                  >
                    Eliminar
                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>

      )}

    </div>
  )
}
