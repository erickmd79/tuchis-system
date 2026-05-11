"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

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

    <div className="min-h-screen bg-[#FFF8F5] p-8 pb-52">

      <div className="mb-10">

        <h1 className="text-5xl font-bold text-[#20B8C9]">
          Catálogo TUCHIS
        </h1>

        <p className="text-gray-500 mt-3">
          Elige tus alcancías favoritas
        </p>

      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-10">

        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) =>
            setBusqueda(
              e.target.value
            )
          }
          className="w-full p-4 rounded-2xl border"
        />

        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(
              e.target.value
            )
          }
          className="w-full p-4 rounded-2xl border"
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

      <div className="grid md:grid-cols-4 gap-6">

        {productosFiltrados.map(
          (producto) => {

            const itemCarrito =
              carrito.find(
                (item) =>
                  item.id ===
                  producto.id
              )

            return (

              <div
                key={producto.id}
                className="bg-white rounded-3xl overflow-hidden shadow-lg border border-[#F8D6D0]"
              >

                <div className="relative">

                  <img
                    src={
                      imagenesActivas[
                        producto.id
                      ] ||
                      "/placeholder.png"
                    }
                    className="w-full h-72 object-cover"
                  />

                </div>

                <div className="flex gap-2 p-3 overflow-auto">

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
                        className={`w-16 h-16 object-cover rounded-xl cursor-pointer border-2
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

                <div className="p-5">

                  <p className="text-pink-400 font-bold text-sm">
                    {
                      producto.categoria
                    }
                  </p>

                  <h2 className="text-2xl font-bold text-[#20B8C9] mt-2">
                    {producto.nombre}
                  </h2>

                  <p className="text-gray-500 mt-2">
                    {producto.medidas}
                  </p>

                  <p className="text-3xl font-bold text-[#F49B93] mt-4">
                    ${producto.precio}
                  </p>

                  {itemCarrito ? (

                    <div className="flex items-center gap-3 mt-5">

                      <button
                        onClick={() =>
                          disminuirCantidad(
                            producto.id
                          )
                        }
                        className="bg-[#FFD6D6]
                        w-10 h-10 rounded-full
                        text-xl font-bold"
                      >
                        -
                      </button>

                      <span className="text-xl font-bold">

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
                        w-10 h-10 rounded-full
                        text-xl font-bold"
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
                      className="w-full mt-5
                      bg-[#20B8C9]
                      hover:bg-[#17A7B8]
                      text-white py-4
                      rounded-2xl font-bold"
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
          className="fixed bottom-5 left-1/2
          -translate-x-1/2
          bg-white border border-[#F8D6D0]
          shadow-2xl rounded-3xl
          w-[95%] md:w-[850px]
          p-6 z-50"
        >

          <div className="flex justify-between items-center mb-5">

            <div>

              <p className="font-bold text-[#20B8C9] text-xl">
                🛒 {totalProductos} productos
              </p>

              <p className="text-[#F49B93] text-3xl font-bold mt-1">
                ${subtotal}
              </p>

            </div>

            <a
              href="/pedido"
              className="bg-[#20B8C9]
              text-white px-6 py-4
              rounded-2xl font-bold"
            >
              Ver pedido
            </a>

          </div>

          <div className="max-h-56 overflow-auto space-y-3">

            {carrito.map((item) => (

              <div
                key={item.id}
                className="bg-[#FFF8F5]
                rounded-2xl p-4
                flex justify-between
                items-center"
              >

                <div>

                  <p className="font-bold">
                    {item.nombre}
                  </p>

                  <p className="text-[#F49B93] font-bold">
                    ${item.precio}
                  </p>

                </div>

                <div className="flex items-center gap-3">

                  <button
                    onClick={() =>
                      disminuirCantidad(
                        item.id
                      )
                    }
                    className="bg-[#FFD6D6]
                    w-9 h-9 rounded-full"
                  >
                    -
                  </button>

                  <span className="font-bold text-lg">
                    {item.cantidad}
                  </span>

                  <button
                    onClick={() =>
                      aumentarCantidad(
                        item.id
                      )
                    }
                    className="bg-[#BEE9E8]
                    w-9 h-9 rounded-full"
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
                    text-white px-4 py-2
                    rounded-xl"
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
