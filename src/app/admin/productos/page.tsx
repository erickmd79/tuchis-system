"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../../../lib/supabase"

export default function ProductosPage() {

  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])

  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [categoria, setCategoria] = useState("")
  const [medidas, setMedidas] = useState("")
  const [sku, setSku] = useState("")
  const [stock, setStock] = useState("")
  const [etiquetas, setEtiquetas] = useState("")
  const [imagenes, setImagenes] = useState<FileList | null>(null)

  const [busqueda, setBusqueda] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    obtenerProductos()
    obtenerCategorias()
  }, [])

  const obtenerProductos = async () => {

    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false })

    if (data) {
      setProductos(data)
    }
  }

  const obtenerCategorias = async () => {

    const { data } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre")

    if (data) {
      setCategorias(data)
    }
  }

  const guardarProducto = async () => {

    if (!nombre || !precio || !categoria) {
      alert("Completa los campos")
      return
    }

    setLoading(true)

    try {

      let urls: string[] = []

      if (imagenes) {

        for (const imagen of Array.from(imagenes)) {

          const nombreArchivo =
            `${Date.now()}-${imagen.name}`

          const { error: uploadError } =
            await supabase.storage
              .from("productos")
              .upload(nombreArchivo, imagen)

          if (uploadError) {
            console.log(uploadError)
            continue
          }

          const { data } =
            supabase.storage
              .from("productos")
              .getPublicUrl(nombreArchivo)

          urls.push(data.publicUrl)
        }
      }

      const { error } =
        await supabase
          .from("productos")
          .insert([
            {
              nombre,
              precio,
              categoria,
              medidas,
              sku,
              stock,
              etiquetas,
              imagenes: urls,
            },
          ])

      if (error) {
        console.log(error)
        alert("Error guardando producto")
        return
      }

      alert("Producto guardado")

      setNombre("")
      setPrecio("")
      setCategoria("")
      setMedidas("")
      setSku("")
      setStock("")
      setEtiquetas("")
      setImagenes(null)

      obtenerProductos()

    } finally {

      setLoading(false)
    }
  }

  const eliminarProducto = async (id: number) => {

    const confirmar =
      confirm("¿Eliminar producto?")

    if (!confirmar) return

    await supabase
      .from("productos")
      .delete()
      .eq("id", id)

    obtenerProductos()
  }

  const productosFiltrados = useMemo(() => {

    return productos.filter((producto) => {

      const coincideBusqueda =
        producto.nombre
          ?.toLowerCase()
          .includes(busqueda.toLowerCase())

      const coincideCategoria =
        filtroCategoria === "" ||
        producto.categoria === filtroCategoria

      return (
        coincideBusqueda &&
        coincideCategoria
      )
    })

  }, [
    productos,
    busqueda,
    filtroCategoria,
  ])

  return (

    <div className="min-h-screen bg-[#FFF9F7]">

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

        {/* HEADER */}

        <div className="mb-10">

          <h1 className="text-5xl md:text-7xl font-black text-cyan-500">
            Productos
          </h1>

          <p className="text-gray-500 text-lg mt-3">
            Administra tu catálogo premium
          </p>

        </div>

        {/* FILTROS */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            className="bg-white border border-[#F4D4CF]
            rounded-2xl px-5 py-4 outline-none"
          />

          <select
            value={filtroCategoria}
            onChange={(e) =>
              setFiltroCategoria(e.target.value)
            }
            className="bg-white border border-[#F4D4CF]
            rounded-2xl px-5 py-4 outline-none"
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

          <div className="bg-white border border-[#F4D4CF]
          rounded-2xl px-5 py-4 flex items-center justify-center
          font-bold text-cyan-500">

            {productosFiltrados.length} productos

          </div>

        </div>

        {/* FORM */}

        <div className="bg-white rounded-[32px]
        border border-[#F4D4CF]
        shadow-sm p-6 md:p-8 mb-10">

          <h2 className="text-3xl font-black text-cyan-500 mb-8">
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
              className="input-premium"
            />

            <input
              type="number"
              placeholder="Precio"
              value={precio}
              onChange={(e) =>
                setPrecio(e.target.value)
              }
              className="input-premium"
            />

            <select
              value={categoria}
              onChange={(e) =>
                setCategoria(e.target.value)
              }
              className="input-premium"
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
              className="input-premium"
            />

            <input
              type="text"
              placeholder="SKU"
              value={sku}
              onChange={(e) =>
                setSku(e.target.value)
              }
              className="input-premium"
            />

            <input
              type="number"
              placeholder="Stock"
              value={stock}
              onChange={(e) =>
                setStock(e.target.value)
              }
              className="input-premium"
            />

          </div>

          <textarea
            placeholder="Etiquetas separadas por coma"
            value={etiquetas}
            onChange={(e) =>
              setEtiquetas(e.target.value)
            }
            className="input-premium mt-5 min-h-[120px]"
          />

          {/* DROPZONE */}

          <label
            className="mt-6 border-2 border-dashed
            border-cyan-300 rounded-[28px]
            p-10 flex flex-col items-center justify-center
            text-center cursor-pointer hover:bg-cyan-50
            transition block"
          >

            <p className="text-2xl font-bold text-cyan-500">
              Arrastra imágenes aquí
            </p>

            <p className="text-gray-500 mt-2">
              o haz click para subir
            </p>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) =>
                setImagenes(e.target.files)
              }
              className="hidden"
            />

          </label>

          {/* PREVIEW */}

          {imagenes && (

            <div className="grid
            grid-cols-2 md:grid-cols-4
            gap-4 mt-6">

              {Array.from(imagenes).map((img, i) => (

                <div
                  key={i}
                  className="aspect-square rounded-3xl overflow-hidden bg-[#F7F7F7]"
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
            disabled={loading}
            className="mt-8 bg-cyan-500 hover:bg-cyan-600
            text-white px-8 py-5 rounded-2xl
            font-bold text-lg transition"
          >

            {loading
              ? "Guardando..."
              : "Guardar producto"}

          </button>

        </div>

        {/* GRID PRODUCTOS */}

        <div className="grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
        gap-8">

          {productosFiltrados.map((producto) => (

            <div
              key={producto.id}
              className="bg-white rounded-[32px]
              overflow-hidden border border-[#F4D4CF]
              shadow-sm hover:shadow-xl
              transition"
            >

              {/* IMAGEN */}

              <div className="aspect-square bg-[#F8F8F8]">

                <img
                  src={
                    producto.imagenes?.[0] ||
                    "/placeholder.jpg"
                  }
                  className="w-full h-full object-cover"
                />

              </div>

              {/* THUMBS */}

              {producto.imagenes?.length > 1 && (

                <div className="flex gap-2 p-3 overflow-x-auto">

                  {producto.imagenes.map(
                    (img: string, i: number) => (

                    <img
                      key={i}
                      src={img}
                      className="w-16 h-16 rounded-xl object-cover border"
                    />

                  ))}

                </div>

              )}

              {/* INFO */}

              <div className="p-6">

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <p className="text-sm text-pink-400 font-bold uppercase">
                      {producto.categoria}
                    </p>

                    <h3 className="text-3xl font-black text-cyan-500 mt-2">
                      {producto.nombre}
                    </h3>

                  </div>

                  {producto.stock <= 5 && (

                    <span className="bg-red-100 text-red-500
                    px-3 py-1 rounded-full text-xs font-bold">
                      STOCK BAJO
                    </span>

                  )}

                </div>

                <p className="text-gray-500 mt-3">
                  {producto.medidas}
                </p>

                <p className="text-4xl font-black text-[#F08C8C] mt-5">
                  ${producto.precio}
                </p>

                {/* TAGS */}

                {producto.etiquetas && (

                  <div className="flex flex-wrap gap-2 mt-5">

                    {producto.etiquetas
                      .split(",")
                      .map((tag: string, i: number) => (

                      <span
                        key={i}
                        className="bg-[#FFF0B8]
                        text-gray-700 px-3 py-1
                        rounded-full text-sm"
                      >
                        #{tag.trim()}
                      </span>

                    ))}

                  </div>

                )}

                {/* BOTONES */}

                <div className="grid grid-cols-2 gap-3 mt-8">

                  <button
                    className="bg-cyan-500 hover:bg-cyan-600
                    text-white rounded-2xl py-4 font-bold"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      eliminarProducto(producto.id)
                    }
                    className="bg-red-400 hover:bg-red-500
                    text-white rounded-2xl py-4 font-bold"
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
  )
}
