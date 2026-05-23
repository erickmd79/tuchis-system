"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useToast, ToastContainer } from "../components/Toast"
import {
  MODALIDADES,
  numero,
  moneda,
  obtenerClaveModalidad,
  type Escala,
  obtenerPrecioPorEscala,
  obtenerPrecioDesde,
  obtenerModalidadesDisponibles,
} from "../../lib/pricing"
import { DRAFT_KEY } from "../../lib/constants"


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
    .replace(/[̀-ͯ]/g, "")
    .trim()


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
      modalidad: "",
      cantidad: 1,
    })

  const [escalas, setEscalas] = useState<Escala[]>([])
  const [tamanos, setTamanos] = useState<any[]>([])
  const [filtroTamano, setFiltroTamano] = useState("")
  const [modoVolver, setModoVolver] = useState(false)

  const crearIdCarrito = (item: any) =>
    [
      item.producto_id ?? item.id,
      item.tamano_id ? `t${item.tamano_id}` : (item.tamano || "sin-tamano"),
      obtenerClaveModalidad(item.modalidad),
    ].join("-")

  const prepararItemCarrito = (
    item: any,
    productosRef: any[] = productos
  ) => {
    const productoBase = productosRef.find(
      (p) => String(p.id) === String(item.producto_id ?? item.id)
    ) || {}

    const cantidad = Math.max(1, numero(item.cantidad) || 1)
    const tamanoId = Number(item.tamano_id || productoBase.tamano_id) || 0
    const modalidad = item.modalidad || ""

    let precio = 0
    let tamanoNombre = item.tamano_nombre || item.tamano || ""

    if (tamanoId > 0 && escalas.length > 0) {
      precio = modalidad
        ? obtenerPrecioPorEscala(escalas, tamanoId, modalidad, cantidad)
        : 0
      tamanoNombre = tamanos.find((t) => t.id === tamanoId)?.nombre || tamanoNombre
    } else {
      precio = numero(item.precio || item.precio_unitario || 0)
    }

    const itemCompleto = {
      ...productoBase,
      ...item,
      producto_id: item.producto_id ?? item.id ?? productoBase.id,
      nombre: item.nombre ?? productoBase.nombre,
      tamano_id: tamanoId || undefined,
      tamano_nombre: tamanoNombre,
      tamano: tamanoNombre,
      modalidad,
      cantidad,
      precio,
      precio_unitario: precio,
      imagen:
        item.imagen ??
        item.imagenes?.[0] ??
        productoBase.imagenes?.[0] ??
        "",
      imagenes: item.imagenes ?? productoBase.imagenes ?? [],
    }

    return {
      ...itemCompleto,
      carrito_id: item.carrito_id || crearIdCarrito(itemCompleto),
      subtotal: precio * cantidad,
    }
  }

  useEffect(() => {

    obtenerProductos()
    obtenerCategorias()
    obtenerEscalas()
    obtenerTamanos()

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

    if (parametros.get("modo") === "volver-a-pedir") {
      setModoVolver(true)
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

  const obtenerEscalas = async () => {
    const { data } = await supabase.from("escalas").select("*")
    if (data) setEscalas(data as Escala[])
  }

  const obtenerTamanos = async () => {
    const { data } = await supabase.from("tamanos").select("*").order("nombre")
    if (data) setTamanos(data)
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
    const tamanoId = Number(producto.tamano_id) || 0

    if (tamanoId > 0 && escalas.length > 0) {
      const mods = obtenerModalidadesDisponibles(escalas, tamanoId)
      if (mods.length === 0) {
        addToast("Este producto no tiene escalas de precio configuradas", "error")
        return
      }
    }

    setProductoSeleccionado(producto)
    setSeleccion({ modalidad: "", cantidad: 1 })
  }

  const confirmarSeleccionProducto = () => {
    if (!productoSeleccionado) return

    const tamanoId = Number(productoSeleccionado.tamano_id) || 0
    const { modalidad, cantidad } = seleccion

    if (!modalidad) {
      addToast("Selecciona una modalidad", "error")
      return
    }

    let precio = 0
    let tamanoNombre = tamanos.find((t) => t.id === tamanoId)?.nombre || ""

    if (tamanoId > 0 && escalas.length > 0) {
      precio = obtenerPrecioPorEscala(escalas, tamanoId, modalidad, cantidad)
      if (precio === 0) {
        addToast("No hay precio configurado para esta combinación", "error")
        return
      }
    } else {
      precio = numero(productoSeleccionado.precio_menudeo || productoSeleccionado.precio || 0)
    }

    // ── Modo "volver a pedir": escribe en el borrador, NO en el carrito ───────
    if (modoVolver) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) {
          addToast(
            "Tu borrador ya no está disponible. Vuelve a Mis pedidos e inicia de nuevo.",
            "error"
          )
          return
        }
        const draft = JSON.parse(raw)
        draft.productos = [
          ...(draft.productos || []),
          {
            uid: `cat-${Date.now()}`,
            producto_id: productoSeleccionado.id,
            nombre: productoSeleccionado.nombre,
            tamano: tamanoNombre,
            tamano_id: tamanoId,
            modalidad,
            cantidad,
            precio_original: 0,
            precio_actual: precio,
            imagenes: productoSeleccionado.imagenes || [],
          },
        ]
        draft.autoOpen = true
        draft.expiresAt = Date.now() + 24 * 60 * 60 * 1000
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      } catch {
        addToast("Error al guardar el producto. Inténtalo de nuevo.", "error")
        return
      }
      setProductoSeleccionado(null)
      window.location.href = "/mis-pedidos"
      return
    }

    // ── Flujo normal: agrega al carrito ───────────────────────────────────────
    const item = {
      producto_id: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      tamano_id: tamanoId || undefined,
      tamano_nombre: tamanoNombre,
      tamano: tamanoNombre,
      modalidad,
      cantidad,
      precio,
      precio_unitario: precio,
      subtotal: precio * cantidad,
      imagen: productoSeleccionado.imagenes?.[0] || "",
      imagenes: productoSeleccionado.imagenes || [],
    }

    const carritoId = crearIdCarrito(item)
    const itemCompleto = { ...item, carrito_id: carritoId }

    const existe = carrito.find((c) => c.carrito_id === carritoId)

    if (existe) {
      guardarCarrito(
        carrito.map((c) =>
          c.carrito_id === carritoId
            ? prepararItemCarrito({ ...c, cantidad: numero(c.cantidad) + cantidad })
            : c
        )
      )
    } else {
      guardarCarrito([...carrito, itemCompleto])
    }

    setProductoSeleccionado(null)
    setCarritoAbierto(true)
    addToast(`${productoSeleccionado.nombre} agregado al carrito`, "success")
  }

  const aumentarCantidad = (
    carritoId: string
  ) => {
    guardarCarrito(
      carrito.map((item) =>
        item.carrito_id === carritoId
          ? prepararItemCarrito({ ...item, cantidad: numero(item.cantidad) + 1 })
          : item
      )
    )
  }

  const disminuirCantidad = (
    carritoId: string
  ) => {
    guardarCarrito(
      carrito
        .map((item) =>
          item.carrito_id === carritoId
            ? prepararItemCarrito({ ...item, cantidad: numero(item.cantidad) - 1 })
            : item
        )
        .filter((item) => item.cantidad > 0)
    )
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
        producto.categoria === categoria

      const coincideTamano =
        !filtroTamano ||
        Number(producto.tamano_id) === Number(filtroTamano)

      return (
        coincideBusqueda &&
        coincideCategoria &&
        coincideTamano
      )
    })

  const tamanoIdSeleccion = Number(productoSeleccionado?.tamano_id) || 0
  const modalidadesSelector = tamanoIdSeleccion > 0 && escalas.length > 0
    ? obtenerModalidadesDisponibles(escalas, tamanoIdSeleccion)
    : [...MODALIDADES]
  const precioSeleccion = tamanoIdSeleccion > 0 && escalas.length > 0 && seleccion.modalidad
    ? obtenerPrecioPorEscala(escalas, tamanoIdSeleccion, seleccion.modalidad, seleccion.cantidad)
    : numero(productoSeleccionado?.precio_menudeo || productoSeleccionado?.precio || 0)

  return (

    <div className={`min-h-screen bg-[#FFF8F5] px-3 sm:px-4 md:px-8 ${modoVolver ? "pt-[132px] pb-7" : "py-5 md:py-7"}`}>

      {/* Banner: modo "volver a pedir" */}
      {modoVolver && (
        <div className="fixed top-[82px] left-0 right-0 z-[999] bg-[#E0D5FF] border-b border-[#D7C3FF] px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
          <span className="text-sm font-bold text-[#6B3FA0]">
            🛒 Estás agregando productos a tu nuevo pedido
          </span>
          <button
            type="button"
            onClick={() => { window.location.href = "/mis-pedidos" }}
            className="shrink-0 text-xs font-black text-[#6B3FA0] border border-[#C4A8F0] px-3 py-1.5 rounded-full hover:bg-[#D7C3FF] transition whitespace-nowrap"
          >
            Volver al pedido
          </button>
        </div>
      )}

      <div className="mb-6 md:mb-8 max-w-[1280px] mx-auto">

        <h1 className="text-3xl md:text-5xl font-black text-[#20B8C9] leading-none">
          Catálogo TUCHIS
        </h1>

        <p className="text-gray-500 mt-3 text-sm md:text-base">
          Elige tus alcancías favoritas
        </p>

      </div>

      <div className="flex flex-col md:grid md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8 max-w-[960px] mx-auto">

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

        <select
          value={filtroTamano}
          onChange={(e) => setFiltroTamano(e.target.value)}
          className="w-full p-3 md:p-4 rounded-2xl border bg-white"
        >
          <option value="">Todos los tamaños</option>
          {tamanos.map((t) => (
            <option key={t.id} value={String(t.id)}>{t.nombre}</option>
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

            const precioDesde = (() => {
              const tamanoId = Number(producto.tamano_id) || 0
              if (tamanoId > 0 && escalas.length > 0) {
                return obtenerPrecioDesde(escalas, tamanoId)
              }
              const precioBase = numero(producto.precio_menudeo || producto.precio || 0)
              return precioBase
            })()

            const tamanoNombreProducto = (() => {
              const tamanoId = Number(producto.tamano_id) || 0
              return tamanoId > 0 ? (tamanos.find((t) => t.id === tamanoId)?.nombre || "") : ""
            })()

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

                    {tamanoNombreProducto && (
                      <p className="text-xs sm:text-sm font-bold text-[#20B8C9] truncate">
                        {tamanoNombreProducto}
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

                {/* Modalidad visual selector (pill buttons) */}
                <div>
                  <label className="block text-sm font-black uppercase text-gray-400 mb-2">
                    Modalidad
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {modalidadesSelector.map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => setSeleccion({ ...seleccion, modalidad: opcion })}
                        className={`rounded-2xl px-5 py-3 font-black border transition ${
                          seleccion.modalidad === opcion
                            ? "bg-[#20B8C9] border-[#20B8C9] text-white"
                            : "bg-[#FFF8F5] border-[#F8D6D0] text-gray-600"
                        }`}
                      >
                        {opcion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="block text-sm font-black uppercase text-gray-400 mb-2">
                    Cantidad
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setSeleccion({ ...seleccion, cantidad: Math.max(1, seleccion.cantidad - 1) })}
                      className="bg-[#FFD6D6] w-12 h-12 rounded-full text-2xl font-bold"
                    >-</button>
                    <input
                      type="number"
                      min="1"
                      value={seleccion.cantidad}
                      onChange={(e) => setSeleccion({ ...seleccion, cantidad: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-28 text-center p-4 rounded-2xl border border-[#F8D6D0] font-black text-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setSeleccion({ ...seleccion, cantidad: seleccion.cantidad + 1 })}
                      className="bg-[#BEE9E8] w-12 h-12 rounded-full text-2xl font-bold"
                    >+</button>
                  </div>
                </div>

                {/* Precio display */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl bg-[#FFF8F5] border border-[#F8D6D0] p-4">
                    <p className="text-xs font-black uppercase text-gray-400">Precio unitario</p>
                    {seleccion.modalidad && precioSeleccion > 0 ? (
                      <p className="text-2xl font-black text-[#F49B93]">{moneda(precioSeleccion)}</p>
                    ) : seleccion.modalidad && precioSeleccion === 0 ? (
                      <p className="text-sm font-bold text-red-400">Sin escala configurada</p>
                    ) : (
                      <p className="text-sm font-bold text-gray-400">Elige modalidad</p>
                    )}
                  </div>
                  <div className="rounded-3xl bg-[#FFE0DD] p-4">
                    <p className="text-xs font-black uppercase text-gray-500">Subtotal</p>
                    {seleccion.modalidad && precioSeleccion > 0 ? (
                      <p className="text-2xl font-black text-[#C95F67]">{moneda(precioSeleccion * seleccion.cantidad)}</p>
                    ) : (
                      <p className="text-sm font-bold text-gray-400">—</p>
                    )}
                  </div>
                </div>

                {/* Agregar al carrito / pedido button */}
                <button
                  type="button"
                  onClick={confirmarSeleccionProducto}
                  className="w-full bg-[#20B8C9] hover:bg-[#17A7B8] active:scale-[.97] text-white py-5 rounded-2xl font-black text-lg transition-all shadow-lg shadow-cyan-200/60"
                >
                  {modoVolver ? "Agregar al pedido" : "Agregar al carrito"}
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
                          item.tamano || item.tamano_nombre,
                          item.modalidad,
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
                href="/pedido/nuevo"
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
