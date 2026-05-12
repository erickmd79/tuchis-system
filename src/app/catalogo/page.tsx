"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

const limpiarMedidas = (valor: string) =>
  valor.replace(/\s*cm\s*$/i, "").trim()

const mostrarMedidas = (valor?: string) => {
  const medidas = limpiarMedidas(String(valor || ""))

  return medidas ? `${medidas} cm` : ""
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

  useEffect(() => {

    obtenerProductos()
    obtenerCategorias()

    const carritoGuardado =
      JSON.parse(
        localStorage.getItem("carrito") || "[]"
      )

    setCarrito(carritoGuardado)

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

    setCarrito(nuevoCarrito)

    localStorage.setItem(
      "carrito",
      JSON.stringify(nuevoCarrito)
    )
  }

  const agregarAlCarrito = (
    producto: any
  ) => {

    const existe =
      carrito.find(
        (item) =>
          item.id === producto.id
      )

    if (existe) {

      const actualizado =
        carrito.map((item) =>

          item.id === producto.id
            ? {
                ...item,
                cantidad:
                  item.cantidad + 1,
              }
            : item
        )

      guardarCarrito(actualizado)

    } else {

      guardarCarrito([
        ...carrito,
        {
          ...producto,
          precio:
            producto.precio_menudeo ??
            producto.precio,
          cantidad: 1,
        },
      ])
    }
  }

  const aumentarCantidad = (
    id: number
  ) => {

    const actualizado =
      carrito.map((item) =>

        item.id === id
          ? {
              ...item,
              cantidad:
                item.cantidad + 1,
            }
          : item
      )

    guardarCarrito(actualizado)
  }

  const disminuirCantidad = (
    id: number
  ) => {

    const actualizado =
      carrito
        .map((item) =>

          item.id === id
            ? {
                ...item,
                cantidad:
                  item.cantidad - 1,
              }
            : item
        )
        .filter(
          (item) =>
            item.cantidad > 0
        )

    guardarCarrito(actualizado)
  }

  const eliminarProducto = (
    id: number
  ) => {

    const actualizado =
      carrito.filter(
        (item) => item.id !== id
      )

    guardarCarrito(actualizado)
  }

  const totalProductos =
    carrito.reduce(
      (acc, item) =>
        acc + item.cantidad,
      0
    )

  const subtotal =
    carrito.reduce(
      (acc, item) =>
        acc +
        item.precio *
          item.cantidad,
      0
    )

  const productosFiltrados =
    productos.filter((producto) => {

      const coincideBusqueda =
        producto.nombre
          ?.toLowerCase()
          .includes(
            busqueda.toLowerCase()
          )

      const coincideCategoria =
        categoria === "Todas" ||
        producto.categoria ===
          categoria

      return (
        coincideBusqueda &&
        coincideCategoria
      )
    })

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

            const precioMenudeo =
              producto.precio_menudeo ??
              producto.precio

            const precioMayoreo =
              producto.precio_mayoreo ??
              producto.precio

            const itemCarrito =
              carrito.find(
                (item) =>
                  item.id ===
                  producto.id
              )

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
                      "/placeholder.png"
                    }
                    className="w-full h-[320px] object-cover"
                  />

                </div>

                <div className="flex gap-2 px-3 pt-3 overflow-x-auto">

                  {producto.imagenes?.map(
                    (
                      imagen: string,
                      index: number
                    ) => (

                      <img
                        key={index}
                        src={imagen}
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

                    <p className="text-3xl md:text-4xl font-black text-[#F49B93]">
                      Menudeo ${precioMenudeo}
                    </p>

                    <p className="text-xl md:text-2xl font-black text-[#20B8C9]">
                      Mayoreo ${precioMayoreo}
                    </p>

                    {producto.modalidad && (
                      <p className="inline-flex mt-2 rounded-full bg-[#FFE1EC] px-3 py-1 text-xs font-black uppercase text-pink-500">
                        {producto.modalidad}
                      </p>
                    )}

                  </div>

                  {itemCarrito ? (

                    <div className="flex items-center justify-center gap-4 mt-6">

                      <button
                        onClick={() =>
                          disminuirCantidad(
                            producto.id
                          )
                        }
                        className="bg-[#FFD6D6]
                        w-12 h-12 rounded-full
                        text-2xl font-bold"
                      >
                        -
                      </button>

                      <span className="text-2xl font-black">

                        {
                          itemCarrito.cantidad
                        }

                      </span>

                      <button
                        onClick={() =>
                          aumentarCantidad(
                            producto.id
                          )
                        }
                        className="bg-[#BEE9E8]
                        w-12 h-12 rounded-full
                        text-2xl font-bold"
                      >
                        +
                      </button>

                    </div>

                  ) : (

                    <button
                      onClick={() =>
                        agregarAlCarrito(
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
                      Agregar al carrito
                    </button>

                  )}

                </div>

              </div>
            )
          }
        )}

      </div>

      {carrito.length > 0 && (

        <div
          className="fixed bottom-3 left-1/2
          -translate-x-1/2
          bg-white/95 backdrop-blur-xl
          border border-[#F8D6D0]
          shadow-2xl rounded-[32px]
          w-[95%] max-w-[900px]
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
              href="/pedido"
              className="bg-[#20B8C9]
              text-white px-8 py-5
              rounded-2xl font-black
              text-center text-lg"
            >
              Ver pedido
            </a>

          </div>

          <div className="max-h-[280px] overflow-auto space-y-3">

            {carrito.map((item) => (

              <div
                key={item.id}
                className="bg-[#FFF8F5]
                rounded-3xl p-4
                flex flex-col md:flex-row
                md:justify-between
                md:items-center gap-4"
              >

                <div>

                  <p className="font-black text-lg">
                    {item.nombre}
                  </p>

                  <p className="text-[#F49B93] font-black text-xl mt-1">
                    ${item.precio}
                  </p>

                </div>

                <div className="flex items-center gap-3 flex-wrap">

                  <button
                    onClick={() =>
                      disminuirCantidad(
                        item.id
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
                        item.id
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
                        item.id
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
