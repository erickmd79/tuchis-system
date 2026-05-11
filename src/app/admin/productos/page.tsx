"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../../lib/supabase"

type Producto = {
  id: number
  nombre: string
  precio: number
  categoria: string
  medidas: string
  imagenes: string[]
  stock?: number
  sku?: string
  etiquetas?: string[]
}

export default function ProductosPage() {

  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<any[]>([])

  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [categoria, setCategoria] = useState("")
  const [medidas, setMedidas] = useState("")
  const [sku, setSku] = useState("")
  const [stock, setStock] = useState("")
  const [etiquetas, setEtiquetas] = useState("")
  const [imagenes, setImagenes] = useState<File[]>([])

  const [busqueda, setBusqueda] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")

  const [editando, setEditando] = useState<Producto | null>(null)

  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    obtenerProductos()
    obtenerCategorias()
  }, [])

  const obtenerProductos = async () => {

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      console.log(error)
      return
    }

    if (data) {
      setProductos(data)
    }
  }

  const obtenerCategorias = async () => {

    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre")

    if (error) {
      console.log(error)
      return
    }

    if (data) {
      setCategorias(data)
    }
  }

  const subirImagenes = async () => {

    const urls: string[] = []

    for (const imagen of imagenes) {

      const nombreArchivo =
        `${Date.now()}-${imagen.name}`

      const { error: uploadError } =
        await supabase.storage
          .from("productos")
          .upload(nombreArchivo, imagen)

      if (uploadError) {

        console.log(uploadError)

        alert(
          JSON.stringify(uploadError)
        )

        return null
      }

      const { data } = supabase.storage
        .from("productos")
        .getPublicUrl(nombreArchivo)

      urls.push(data.publicUrl)
    }

    return urls
  }

  const guardarProducto = async () => {

    if (!nombre || !precio || !categoria) {
      alert("Completa los datos")
      return
    }

    setGuardando(true)

    const urls = await subirImagenes()

    if (!urls) {
      setGuardando(false)
      return
    }

    const { error } = await supabase
      .from("productos")
      .insert([
        {
          nombre,
          precio: Number(precio),
          categoria,
          medidas,
          sku,
          stock: Number(stock),
          etiquetas:
            etiquetas
              .split(",")
              .map((e) => e.trim()),
          imagenes: urls,
        },
      ])

    if (error) {

      console.log(error)

      alert(
        JSON.stringify(error)
      )

      setGuardando(false)

      return
    }

    alert("Producto guardado")

    limpiarFormulario()

    obtenerProductos()

    setGuardando(false)
  }

  const eliminarProducto = async (id: number) => {

    const confirmar = confirm(
      "¿Eliminar producto?"
    )

    if (!confirmar) return

    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", id)

    if (error) {

      console.log(error)

      alert(
        JSON.stringify(error)
      )

      return
    }

    obtenerProductos()
  }

  const guardarEdicion = async () => {

    if (!editando) return

    const { error } = await supabase
      .from("productos")
      .update({
        nombre: editando.nombre,
        precio: editando.precio,
        categoria: editando.categoria,
        medidas: editando.medidas,
        sku: editando.sku,
        stock: editando.stock,
        etiquetas: editando.etiquetas,
      })
      .eq("id", editando.id)

    if (error) {

      console.log(error)

      alert(
        JSON.stringify(error)
      )

      return
    }

    alert("Producto actualizado")

    setEditando(null)

    obtenerProductos()
  }

  const limpiarFormulario = () => {

    setNombre("")
    setPrecio("")
    setCategoria("")
    setMedidas("")
    setSku("")
    setStock("")
    setEtiquetas("")
    setImagenes([])
  }

  const productosFiltrados = useMemo(() => {

    return productos.filter((producto) => {

      const coincideBusqueda =
        producto.nombre
          .toLowerCase()
          .includes(busqueda.toLowerCase())

      const coincideCategoria =
        filtroCategoria === ""
          ? true
          : producto.categoria === filtroCategoria

      return coincideBusqueda && coincideCategoria
    })

  }, [productos, busqueda, filtroCategoria])

  return (

    <div className="w-full">

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-10">

        <div className="space-y-8">

          {/* HEADER */}

          <div>

            <h1 className="text-5xl md:text-7xl font-black text-cyan-500">
              Productos
            </h1>

            <p className="text-gray-500 text-lg mt-3">
              Administra tu catálogo
            </p>

          </div>

          {/* FILTROS */}

          <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-5 md:p-6 shadow-sm">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                className="w-full h-[64px] px-6 rounded-2xl border border-[#F4D4CF] outline-none text-lg"
              />

              <select
                value={filtroCategoria}
                onChange={(e) =>
                  setFiltroCategoria(e.target.value)
                }
                className="w-full h-[64px] px-6 rounded-2xl border border-[#F4D4CF] outline-none text-lg bg-white"
              >

                <option value="">
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

          </div>

          {/* FORMULARIO */}

          <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-6 md:p-8 shadow-sm">

            <h2 className="text-3xl md:text-4xl font-black text-cyan-500 mb-8">
              Crear producto
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <input
                type="text"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) =>
                  setNombre(e.target.value)
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF] outline-none text-lg"
              />

              <input
                type="number"
                placeholder="Precio"
                value={precio}
                onChange={(e) =>
                  setPrecio(e.target.value)
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF] outline-none text-lg"
              />

              <select
                value={categoria}
                onChange={(e) =>
                  setCategoria(e.target.value)
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF] outline-none text-lg bg-white"
              >

                <option value="">
                  Selecciona categoría
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

              <input
                type="text"
                placeholder="Medidas"
                value={medidas}
                onChange={(e) =>
                  setMedidas(e.target.value)
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF] outline-none text-lg"
              />

              <input
                type="text"
                placeholder="SKU"
                value={sku}
                onChange={(e) =>
                  setSku(e.target.value)
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF] outline-none text-lg"
              />

              <input
                type="number"
                placeholder="Stock"
                value={stock}
                onChange={(e) =>
                  setStock(e.target.value)
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF] outline-none text-lg"
              />

            </div>

            <textarea
              placeholder="Etiquetas separadas por coma"
              value={etiquetas}
              onChange={(e) =>
                setEtiquetas(e.target.value)
              }
              className="w-full mt-5 min-h-[140px] p-6 rounded-2xl border border-[#F4D4CF] outline-none text-lg resize-none"
            />

            <div className="mt-5 border-2 border-dashed border-cyan-300 rounded-[28px] p-10 text-center bg-[#F9FEFF]">

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) =>
                  setImagenes(
                    Array.from(
                      e.target.files || []
                    )
                  )
                }
                className="hidden"
                id="imagenes"
              />

              <label
                htmlFor="imagenes"
                className="cursor-pointer"
              >

                <p className="text-3xl font-black text-cyan-500">
                  Arrastra imágenes aquí
                </p>

                <p className="text-gray-500 mt-2 text-lg">
                  o haz click para subir
                </p>

              </label>

            </div>

            {/* PREVIEW */}

            {imagenes.length > 0 && (

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">

                {imagenes.map((img, index) => (

                  <div
                    key={index}
                    className="aspect-square rounded-2xl overflow-hidden border border-[#F4D4CF]"
                  >

                    <img
                      src={URL.createObjectURL(img)}
                      className="w-full h-full object-cover"
                    />

                  </div>

                ))}

              </div>

            )}

            <button
              onClick={guardarProducto}
              disabled={guardando}
              className="mt-6 bg-cyan-500 hover:bg-cyan-600 transition text-white px-8 py-5 rounded-2xl font-black text-lg disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : "Guardar producto"}
            </button>

          </div>

          {/* GRID PRODUCTOS */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

            {productosFiltrados.map((producto) => (

              <div
                key={producto.id}
                className="bg-white rounded-[32px] overflow-hidden border border-[#F4D4CF] shadow-sm"
              >

                <div className="aspect-square bg-[#FFF7F5] overflow-hidden">

                  <img
                    src={
                      producto.imagenes?.[0] ||
                      "/placeholder.png"
                    }
                    alt={producto.nombre}
                    className="w-full h-full object-cover"
                  />

                </div>

                {producto.imagenes?.length > 1 && (

                  <div className="flex gap-2 px-4 pt-4 overflow-x-auto">

                    {producto.imagenes.map((img, i) => (

                      <img
                        key={i}
                        src={img}
                        className="w-16 h-16 rounded-xl object-cover border border-[#F4D4CF]"
                      />

                    ))}

                  </div>

                )}

                <div className="p-5">

                  <p className="text-sm font-bold text-pink-400 uppercase">
                    {producto.categoria}
                  </p>

                  <h2 className="text-3xl font-black text-cyan-500 mt-2 break-words">
                    {producto.nombre}
                  </h2>

                  <p className="text-gray-500 mt-2">
                    {producto.medidas}
                  </p>

                  <p className="text-5xl font-black text-[#F08C8C] mt-5">
                    ${producto.precio}
                  </p>

                  <div className="flex items-center justify-between mt-4">

                    <span className="bg-[#FFF0B8] px-4 py-2 rounded-full text-sm font-bold">
                      Stock: {producto.stock || 0}
                    </span>

                    <span className="bg-[#D9F5F8] px-4 py-2 rounded-full text-sm font-bold">
                      {producto.sku || "SIN SKU"}
                    </span>

                  </div>

                  {producto.etiquetas?.length > 0 && (

                    <div className="flex flex-wrap gap-2 mt-5">

                      {producto.etiquetas.map((tag, i) => (

                        <span
                          key={i}
                          className="bg-[#FFE0DD] px-3 py-2 rounded-full text-sm font-bold"
                        >
                          #{tag}
                        </span>

                      ))}

                    </div>

                  )}

                  <div className="grid grid-cols-2 gap-3 mt-6">

                    <button
                      onClick={() =>
                        setEditando(producto)
                      }
                      className="bg-cyan-500 hover:bg-cyan-600 transition text-white py-4 rounded-2xl font-black"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        eliminarProducto(producto.id)
                      }
                      className="bg-red-400 hover:bg-red-500 transition text-white py-4 rounded-2xl font-black"
                    >
                      Eliminar
                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

      {/* MODAL EDITAR */}

      {editando && (

        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-3xl bg-white rounded-[32px] p-8 overflow-y-auto max-h-[90vh]">

            <div className="flex items-center justify-between mb-8">

              <h2 className="text-4xl font-black text-cyan-500">
                Editar producto
              </h2>

              <button
                onClick={() =>
                  setEditando(null)
                }
                className="text-4xl"
              >
                ×
              </button>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <input
                type="text"
                value={editando.nombre}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    nombre: e.target.value,
                  })
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF]"
              />

              <input
                type="number"
                value={editando.precio}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    precio: Number(
                      e.target.value
                    ),
                  })
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF]"
              />

              <input
                type="text"
                value={editando.medidas}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    medidas: e.target.value,
                  })
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF]"
              />

              <input
                type="number"
                value={editando.stock || 0}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    stock: Number(
                      e.target.value
                    ),
                  })
                }
                className="h-[64px] px-6 rounded-2xl border border-[#F4D4CF]"
              />

            </div>

            <button
              onClick={guardarEdicion}
              className="mt-8 bg-cyan-500 hover:bg-cyan-600 transition text-white px-8 py-5 rounded-2xl font-black text-lg"
            >
              Guardar cambios
            </button>

          </div>

        </div>

      )}

    </div>
  )
}
