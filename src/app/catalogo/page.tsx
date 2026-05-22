"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useToast, ToastContainer } from "../components/Toast"
import {
  MODALIDADES,
  MODALIDADES_PRECIO,
  numero,
  moneda,
  obtenerClaveModalidad,
  obtenerConfigModalidad,
  prepararTamanoProducto,
  obtenerTamanosProducto,
  obtenerNombresTamanos,
  obtenerModalidadesTamano,
  obtenerConfigTamano,
  obtenerMinimoMayoreo,
  obtenerPrecioMenudeo,
  obtenerPrecioMayoreo,
  resolverTipoPrecio,
  obtenerPrecioSeleccionado,
} from "../../lib/pricing"


const limpiarMedidas = (valor: string) =>
  valor.replace(/\s*cm\s*$/i, "").trim()

const mostrarMedidas = (valor?: string) => {
  const medidas = limpiarMedidas(String(valor || ""))

  return medidas ? `${medidas} cm` : ""
}


const normalizar = (valor: any) =>
  String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()


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

  const { toasts, addToast, removeToast } = useToast()

  const [productos, setProductos] = useState<any[]>([])
  const [carrito, setCarrito] = useState<any[]>([])

  const [busqueda, setBusqueda] = useState("")
  const [categoria, setCategoria] =
    useState("Todas")

  const [categorias, setCategorias] =
    useState<any[]>([])

  const [cargando, setCargando] = useState(true)

  const [imagenesActivas, setImagenesActivas] =
    useState<any>({})

  const [productoSeleccionado, setProductoSeleccionado] =
    useState<any>(null)

  const [carritoAbierto, setCarritoAbierto] =
    useState(false)

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

    const parametros =
      new URLSearchParams(window.location.search)

    if (
      parametros.get("abrirCarrito") === "1" &&
      carritoGuardado.length > 0
    ) {
      setCarritoAbierto(true)
    }

  }, [])

  useEffect(() => {
    const abrirCarritoDesdeMenu = () =>
      setCarritoAbierto(true)

    window.addEventListener(
      "tuchis:open-cart",
      abrirCarritoDesdeMenu
    )

    return () =>
      window.removeEventListener(
        "tuchis:open-cart",
        abrirCarritoDesdeMenu
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

    setCargando(false)

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

    window.dispatchEvent(
      new Event("tuchis:cart-updated")
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
    setCarritoAbierto(true)
    addToast(`${productoSeleccionado.nombre} agregado al carrito`, "success")
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

  const productosAgregados =
    carrito.length

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

    <div className="min-h-screen bg-[#FFF8F5] px-3 sm:px-4 md:px-8 py-5 md:py-7">

      <div className="mb-6 md:mb-8 max-w-[1280px] mx-auto">

        <h1 className="text-3xl md:text-5xl font-black text-[#20B8C9] leading-none">
          Catálogo TUCHIS
        </h1>

        <p className="text-gray-500 mt-3 text-sm md:text-base">
          Elige tus alcancías favoritas
        </p>

      </div>

      <div className="flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8 max-w-[960px] mx-auto">

        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) =>
            setBusqueda(
              e.target.value
            )
          }
          className="w-full p-3 md:p-4 rounded-2xl border bg-white"
        />

        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(
              e.target.value
            )
          }
          className="w-full p-3 md:p-4 rounded-2xl border bg-white"
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 max-w-[1280px] mx-auto">

        {cargando
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-[22px] overflow-hidden border border-[#F8D6D0]"
              >
                <div className="aspect-square skeleton-shimmer" />
                <div className="p-4 space-y-3">
                  <div className="h-3 skeleton-shimmer rounded-full w-1/3" />
                  <div className="h-5 skeleton-shimmer rounded-full w-3/4" />
                  <div className="h-8 skeleton-shimmer rounded-full w-1/2 mt-2" />
                  <div className="h-12 skeleton-shimmer rounded-2xl mt-3" />
                </div>
              </div>
            ))
          : productosFiltrados.map(
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
                className="bg-white rounded-[22px] md:rounded-[26px] overflow-hidden shadow-md border border-[#F8D6D0] product-card-hover"
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
                    loading="lazy"
                    className="w-full aspect-square object-cover"
                  />

                  {badges.length > 0 && (
                    <div className="absolute left-2 top-2 md:left-3 md:top-3 flex flex-wrap gap-1.5 max-w-[88%]">
                      {badges.slice(0, 3).map((badge) => (
                        <span
                          key={badge}
                          className="bg-white/90 backdrop-blur px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-black uppercase text-[#20B8C9] shadow"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                </div>

                {producto.imagenes?.length > 1 && (
                  <div className="flex gap-1.5 md:gap-2 px-2 md:px-3 pt-2 md:pt-3 overflow-x-auto">

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
                          className={`min-w-[44px] w-[44px] h-[44px]
                          sm:min-w-[58px] sm:w-[58px] sm:h-[58px]
                          object-cover rounded-xl md:rounded-2xl
                          cursor-pointer border-2 md:border-4
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

                <div className="p-3 sm:p-4 md:p-5">

                  <p className="text-pink-400 font-bold text-[10px] sm:text-xs uppercase">
                    {
                      producto.categoria
                    }
                  </p>

                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-[#20B8C9] mt-1.5 leading-tight break-words">
                    {producto.nombre}
                  </h2>

                  <p className="text-gray-500 mt-1.5 text-xs sm:text-sm">
                    {mostrarMedidas(producto.medidas)}
                  </p>

                  <div className="mt-3 md:mt-4 space-y-1">

                    <p className="text-[10px] sm:text-xs font-black uppercase text-gray-400">
                      Precio desde
                    </p>

                    <p className="text-2xl md:text-3xl font-black text-[#F49B93]">
                      {moneda(precioDesde)}
                    </p>

                    {tamanosProducto.length > 0 && (
                      <p className="text-xs sm:text-sm font-bold text-[#20B8C9] truncate">
                        {obtenerNombresTamanos(producto).join(", ")}
                      </p>
                    )}

                    {minimoMayoreo > 0 && (
                      <p className="text-[10px] sm:text-xs font-black uppercase text-gray-400">
                        Mayoreo desde {minimoMayoreo} piezas
                      </p>
                    )}

                  </div>

                  {cantidadEnCarrito > 0 && (
                    <p className="mt-3 rounded-2xl bg-[#D9F5F8] px-3 py-2 text-xs sm:text-sm font-black text-[#0D8EA0]">
                      {cantidadEnCarrito} en carrito
                    </p>
                  )}

                  <button
                    onClick={() =>
                      abrirSelectorProducto(
                        producto
                      )
                    }
                    className="w-full mt-4
                    bg-[#20B8C9]
                    hover:bg-[#17A7B8]
                    active:scale-[.97]
                    text-white py-3 sm:py-4
                    rounded-2xl font-black
                    text-sm sm:text-base transition-all"
                  >
                    {cantidadEnCarrito > 0 ? "Agregar más" : "Seleccionar"}
                  </button>

                </div>

              </div>
            )
          }
        )}

      </div>

      {productoSeleccionado && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl border border-[#F8D6D0] w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 md:p-8 modal-enter">
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
                      {moneda(precioSeleccion)}
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
                      {moneda(precioSeleccion * seleccion.cantidad)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={confirmarSeleccionProducto}
                  className="w-full bg-[#20B8C9] hover:bg-[#17A7B8] active:scale-[.97] text-white py-5 rounded-2xl font-black text-lg transition-all shadow-lg shadow-cyan-200/60"
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {carritoAbierto && (
        <div
          className="cart-overlay"
          onClick={() =>
            setCarritoAbierto(false)
          }
        >
          <aside
            className="cart-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-drawer-header">
              <div>
                <h2 className="text-2xl font-black">
                  Tu carrito
                </h2>
                <p className="text-sm font-bold text-white/80">
                  {productosAgregados} productos · {totalProductos} piezas
                </p>
              </div>

              <button
                type="button"
                className="cart-drawer-close"
                aria-label="Cerrar carrito"
                onClick={() =>
                  setCarritoAbierto(false)
                }
              >
                ×
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
              {carrito.length === 0 && (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center">
                  <p className="text-5xl mb-4">
                    🛒
                  </p>
                  <p className="text-2xl font-black text-[#20B8C9]">
                    Tu carrito está vacío
                  </p>
                  <p className="text-gray-500 mt-2">
                    Selecciona productos del catálogo para generar un pedido.
                  </p>
                </div>
              )}

              {carrito.map((item) => (
                <div
                  key={item.carrito_id}
                  className="rounded-[28px] border border-[#F8D6D0] bg-[#FFF8F5] p-4"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.imagen || "/logo.png"}
                      alt={item.nombre || "Producto"}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-[#F8D6D0] bg-white"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-base sm:text-lg text-[#2B2B2B] leading-tight">
                        {item.nombre}
                      </h3>

                      <p className="text-sm font-bold text-gray-500 mt-1">
                        {[
                          item.tamano,
                          item.modalidad,
                          item.tipo_precio,
                        ].filter(Boolean).join(" · ")}
                      </p>

                      <p className="text-[#F49B93] font-black mt-2">
                        {moneda(item.precio_unitario)} c/u
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        eliminarProducto(
                          item.carrito_id
                        )
                      }
                      className="w-10 h-10 rounded-2xl bg-white border border-[#F8D6D0] text-red-500 font-black"
                      aria-label="Eliminar producto"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 rounded-full bg-white border border-[#F8D6D0] px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          disminuirCantidad(
                            item.carrito_id
                          )
                        }
                        className="w-9 h-9 rounded-full bg-[#FFD6D6] font-black text-lg"
                      >
                        -
                      </button>

                      <span className="min-w-8 text-center font-black">
                        {item.cantidad}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          aumentarCantidad(
                            item.carrito_id
                          )
                        }
                        className="w-9 h-9 rounded-full bg-[#BEE9E8] font-black text-lg"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black uppercase text-gray-400">
                        Subtotal
                      </p>
                      <p className="text-xl font-black text-[#2B2B2B]">
                        {moneda(item.subtotal)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#F8D6D0] bg-white px-4 sm:px-6 py-5 space-y-4 shadow-[0_-18px_32px_rgba(0,0,0,.06)]">
              <div className="flex items-center justify-between text-2xl">
                <span className="font-black text-[#20B8C9]">
                  Total
                </span>
                <span className="font-black text-[#F49B93]">
                  {moneda(subtotal)}
                </span>
              </div>

              <a
                href="/pedido?carrito=1"
                className={`block w-full text-center rounded-2xl py-4 font-black text-white transition ${
                  carrito.length > 0
                    ? "bg-[#20B8C9] hover:bg-[#17A7B8]"
                    : "bg-gray-300 pointer-events-none"
                }`}
              >
                Generar pedido
              </a>

              <button
                type="button"
                onClick={() =>
                  setCarritoAbierto(false)
                }
                className="w-full rounded-2xl py-4 font-black border border-[#20B8C9] text-[#20B8C9] bg-white"
              >
                Continuar comprando
              </button>
            </div>
          </aside>
        </div>
      )}

    </div>
  )
}
