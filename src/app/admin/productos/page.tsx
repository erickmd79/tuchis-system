"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"

export default function ProductosPage() {

  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])

  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [categoria, setCategoria] = useState("")
  const [medidas, setMedidas] = useState("")
  const [imagenes, setImagenes] = useState<FileList | null>(null)

  const [sku, setSku] = useState("")
  const [stock, setStock] = useState(0)

  const [etiquetas, setEtiquetas] = useState("")
  const [badges, setBadges] = useState("")

  const [destacado, setDestacado] = useState(false)

  const [busqueda, setBusqueda] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")

  const [modalEditar, setModalEditar] = useState(false)
  const [productoEditando, setProductoEditando] = useState<any>(null)

  const [pagina, setPagina] = useState(1)

  const productosPorPagina = 6

  useEffect(() => {
    obtenerProductos()
    obtenerCategorias()
  }, [])

  const obtenerProductos = async () => {

    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false })

    if (data) setProductos(data)
  }

  const obtenerCategorias = async () => {

    const { data } = await supabase
      .from("categorias")
      .select("*")

    if (data) setCategorias(data)
  }

  const subirImagenes = async () => {

    let urls: string[] = []

    if (!imagenes) return urls

    for (const imagen of Array.from(imagenes)) {

      const nombreArchivo =
        `${Date.now()}-${imagen.name}`

      const { error } =
        await supabase.storage
          .from("productos")
          .upload(nombreArchivo, imagen)

      if (error) continue

      const { data } = supabase.storage
        .from("productos")
        .getPublicUrl(nombreArchivo)

      urls.push(data.publicUrl)
    }

    return urls
  }

  const guardarProducto = async () => {

    const urls = await subirImagenes()

    const { error } =
      await supabase
        .from("productos")
        .insert([
          {
            nombre,
            precio,
            categoria,
            medidas,
            imagenes: urls,
            sku,
            stock,
            destacado,
            etiquetas:
              etiquetas
                .split(",")
                .map((e) => e.trim()),

            badges:
              badges
                .split(",")
                .map((b) => b.trim()),

            variantes: [],
          }
        ])

    if (error) {
      alert("Error guardando")
      return
    }

    alert("Producto guardado")

    limpiarFormulario()

    obtenerProductos()
  }

  const limpiarFormulario = () => {

    setNombre("")
    setPrecio("")
    setCategoria("")
    setMedidas("")
    setSku("")
    setStock(0)
    setEtiquetas("")
    setBadges("")
    setDestacado(false)
  }

  const eliminarProducto = async (id: number) => {

    const confirmar =
      confirm("Eliminar producto?")

    if (!confirmar) return

    await supabase
      .from("productos")
      .delete()
      .eq("id", id)

    obtenerProductos()
  }

  const abrirEditar = (producto: any) => {

    setProductoEditando(producto)

    setNombre(producto.nombre)
    setPrecio(producto.precio)
    setCategoria(producto.categoria)
    setMedidas(producto.medidas)

    setSku(producto.sku || "")
    setStock(producto.stock || 0)

    setEtiquetas(
      producto.etiquetas?.join(", ") || ""
    )

    setBadges(
      producto.badges?.join(", ") || ""
    )

    setDestacado(producto.destacado)

    setModalEditar(true)
  }

  const actualizarProducto = async () => {

    let nuevasUrls: string[] = []

    if (imagenes) {
      nuevasUrls = await subirImagenes()
    }

    const imagenesFinales = [
      ...(productoEditando.imagenes || []),
      ...nuevasUrls,
    ]

    await supabase
      .from("productos")
      .update({
        nombre,
        precio,
        categoria,
        medidas,
        sku,
        stock,
        destacado,
        etiquetas:
          etiquetas
            .split(",")
            .map((e) => e.trim()),

        badges:
          badges
            .split(",")
            .map((b) => b.trim()),

        imagenes: imagenesFinales,
      })
      .eq("id", productoEditando.id)

    setModalEditar(false)

    obtenerProductos()
  }

  const eliminarImagen = async (
    index: number
  ) => {

    const nuevas =
      productoEditando.imagenes.filter(
        (_: any, i: number) => i !== index
      )

    setProductoEditando({
      ...productoEditando,
      imagenes: nuevas,
    })

    await supabase
      .from("productos")
      .update({
        imagenes: nuevas,
      })
      .eq("id", productoEditando.id)

    obtenerProductos()
  }

  const moverImagen = async (
    index: number,
    direccion: "arriba" | "abajo"
  ) => {

    let imgs = [...productoEditando.imagenes]

    if (
      direccion === "arriba" &&
      index > 0
    ) {

      ;[
        imgs[index - 1],
        imgs[index]
      ] = [
        imgs[index],
        imgs[index - 1]
      ]
    }

    if (
      direccion === "abajo" &&
      index < imgs.length - 1
    ) {

      ;[
        imgs[index + 1],
        imgs[index]
      ] = [
        imgs[index],
        imgs[index + 1]
      ]
    }

    setProductoEditando({
      ...productoEditando,
      imagenes: imgs,
    })

    await supabase
      .from("productos")
      .update({
        imagenes: imgs,
      })
      .eq("id", productoEditando.id)
  }

  const filtrados = productos.filter((p) => {

    const coincideBusqueda =
      p.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase())

    const coincideCategoria =
      filtroCategoria === "" ||
      p.categoria === filtroCategoria

    return (
      coincideBusqueda &&
      coincideCategoria
    )
  })

  const inicio =
    (pagina - 1) * productosPorPagina

  const visibles =
    filtrados.slice(
      inicio,
      inicio + productosPorPagina
    )

  return (

    <div className="min-h-screen bg-[#FFF9F7] p-4 md:p-10">

      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row gap-4 mb-6">

          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            className="flex-1 bg-white border border-[#F8D6D0] rounded-2xl p-4"
          />

          <select
            value={filtroCategoria}
            onChange={(e) =>
              setFiltroCategoria(e.target.value)
            }
            className="bg-white border border-[#F8D6D0] rounded-2xl p-4"
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

        <div className="bg-white rounded-3xl p-6 shadow-lg border border-[#F8D6D0] mb-10">

          <h1 className="text-4xl font-black text-[#20B8C9] mb-6">
            Crear producto
          </h1>

          <div className="grid md:grid-cols-2 gap-4">

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
                setStock(Number(e.target.value))
              }
              className="input-premium"
            />

            <input
              type="text"
              placeholder="Etiquetas separadas por coma"
              value={etiquetas}
              onChange={(e) =>
                setEtiquetas(e.target.value)
              }
              className="input-premium"
            />

            <input
              type="text"
              placeholder="Badges separadas por coma"
              value={badges}
              onChange={(e) =>
                setBadges(e.target.value)
              }
              className="input-premium"
            />

          </div>

          <div className="mt-6">

            <label className="flex items-center gap-3">

              <input
                type="checkbox"
                checked={destacado}
                onChange={(e) =>
                  setDestacado(e.target.checked)
                }
              />

              Producto destacado

            </label>

          </div>

          <div className="mt-6 border-2 border-dashed border-[#20B8C9] rounded-3xl p-10 bg-[#F7FFFF]">

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) =>
                setImagenes(e.target.files)
              }
            />

          </div>

          <button
            onClick={guardarProducto}
            className="mt-6 bg-[#20B8C9] hover:bg-[#18AFC4] text-white px-8 py-4 rounded-2xl font-bold"
          >
            Guardar producto
          </button>

        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {visibles.map((producto) => (

            <div
              key={producto.id}
              className="bg-white rounded-3xl overflow-hidden shadow-lg border border-[#F8D6D0]"
            >

              <div className="relative">

                <img
                  src={
                    producto.imagenes?.[0]
                  }
                  className="w-full h-64 object-cover hover:scale-105 transition"
                />

                {producto.destacado && (

                  <div className="absolute top-3 left-3 bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold">
                    DESTACADO
                  </div>

                )}

              </div>

              <div className="p-5">

                <h2 className="text-2xl font-black text-[#20B8C9]">
                  {producto.nombre}
                </h2>

                <p className="text-gray-500">
                  {producto.categoria}
                </p>

                <p className="text-3xl font-black mt-3">
                  ${producto.precio}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  {producto.badges?.map(
                    (badge: string, i: number) => (

                      <span
                        key={i}
                        className="bg-pink-200 text-pink-800 px-3 py-1 rounded-full text-xs"
                      >
                        {badge}
                      </span>

                    )
                  )}

                </div>

                <div className="flex gap-3 mt-6">

                  <button
                    onClick={() =>
                      abrirEditar(producto)
                    }
                    className="flex-1 bg-[#20B8C9] text-white py-3 rounded-2xl font-bold"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      eliminarProducto(producto.id)
                    }
                    className="flex-1 bg-red-400 text-white py-3 rounded-2xl font-bold"
                  >
                    Eliminar
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

        <div className="flex justify-center gap-3 mt-10">

          <button
            onClick={() =>
              setPagina(pagina - 1)
            }
            disabled={pagina === 1}
            className="px-5 py-3 rounded-2xl bg-white border"
          >
            ←
          </button>

          <button
            onClick={() =>
              setPagina(pagina + 1)
            }
            disabled={
              inicio + productosPorPagina >=
              filtrados.length
            }
            className="px-5 py-3 rounded-2xl bg-white border"
          >
            →
          </button>

        </div>

      </div>

      {modalEditar && (

        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-auto">

          <div className="bg-white rounded-3xl p-6 max-w-5xl w-full">

            <div className="flex justify-between mb-6">

              <h2 className="text-3xl font-black text-[#20B8C9]">
                Editar producto
              </h2>

              <button
                onClick={() =>
                  setModalEditar(false)
                }
              >
                ✕
              </button>

            </div>

            <div className="grid md:grid-cols-2 gap-6">

              {productoEditando?.imagenes?.map(
                (img: string, index: number) => (

                  <div
                    key={index}
                    className="relative"
                  >

                    <img
                      src={img}
                      className="w-full h-72 object-cover rounded-3xl"
                    />

                    <div className="absolute top-3 right-3 flex gap-2">

                      <button
                        onClick={() =>
                          moverImagen(
                            index,
                            "arriba"
                          )
                        }
                        className="bg-white rounded-full w-10 h-10"
                      >
                        ↑
                      </button>

                      <button
                        onClick={() =>
                          moverImagen(
                            index,
                            "abajo"
                          )
                        }
                        className="bg-white rounded-full w-10 h-10"
                      >
                        ↓
                      </button>

                      <button
                        onClick={() =>
                          eliminarImagen(index)
                        }
                        className="bg-red-500 text-white rounded-full w-10 h-10"
                      >
                        ✕
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

            <input
              type="file"
              multiple
              className="mt-6"
              onChange={(e) =>
                setImagenes(e.target.files)
              }
            />

            <button
              onClick={actualizarProducto}
              className="mt-6 bg-[#20B8C9] text-white px-8 py-4 rounded-2xl font-bold"
            >
              Guardar cambios
            </button>

          </div>

        </div>

      )}

    </div>
  )
}
