"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminLogoutBtn from "../../components/AdminLogoutBtn"
import { type Escala, moneda, obtenerPrecioDesde } from "../../../lib/pricing"

const limpiarMedidas = (valor: string) =>
  valor.replace(/\s*cm\s*$/i, "").trim()

const mostrarMedidas = (valor?: string) => {
  const medidas = limpiarMedidas(String(valor || ""))
  return medidas ? `${medidas} cm` : ""
}

export default function ProductosPage() {

  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [tamanos, setTamanos] = useState<any[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])

  const [nombre, setNombre] = useState("")
  const [tamanoId, setTamanoId] = useState("")
  const [categoria, setCategoria] = useState("")
  const [medidas, setMedidas] = useState("")
  const [sku, setSku] = useState("")
  const [stock, setStock] = useState(0)
  const [etiquetas, setEtiquetas] = useState("")
  const [imagenes, setImagenes] = useState<File[]>([])

  const [productoEditando, setProductoEditando] =
    useState<any>(null)

  useEffect(() => {
    obtenerProductos()
    obtenerCategorias()
    obtenerTamanos()
    obtenerEscalas()
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
      .order("nombre")
    if (data) setCategorias(data)
  }

  const obtenerTamanos = async () => {
    const { data } = await supabase
      .from("tamanos")
      .select("*")
      .order("nombre")
    if (data) setTamanos(data)
  }

  const obtenerEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*")
    if (data) setEscalas(data as Escala[])
  }

  const guardarProducto = async () => {
    try {
      let urls: string[] = []

      for (const imagen of imagenes) {
        const nombreArchivo = `${Date.now()}-${imagen.name}`
        const { error: uploadError } = await supabase.storage
          .from("productos")
          .upload(nombreArchivo, imagen)

        if (uploadError) {
          console.log(uploadError)
          alert("Error subiendo imagen")
          return
        }

        const { data } = supabase.storage
          .from("productos")
          .getPublicUrl(nombreArchivo)

        urls.push(data.publicUrl)
      }

      const { error } = await supabase
        .from("productos")
        .insert([{
          nombre,
          tamano_id: Number(tamanoId) || null,
          categoria,
          medidas: limpiarMedidas(medidas),
          sku,
          stock,
          etiquetas: etiquetas.length > 0
            ? etiquetas.split(",").map((e) => e.trim())
            : [],
          imagenes: urls,
        }])

      if (error) {
        console.log(error)
        alert(error.message)
        return
      }

      alert("Producto guardado")

      setNombre("")
      setTamanoId("")
      setCategoria("")
      setMedidas("")
      setSku("")
      setStock(0)
      setEtiquetas("")
      setImagenes([])

      obtenerProductos()
    } catch (error) {
      console.log(error)
      alert("Error guardando producto")
    }
  }

  const eliminarProducto = async (id: number) => {
    const confirmar = confirm("¿Eliminar producto?")
    if (!confirmar) return

    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", id)

    if (error) {
      console.log(error)
      alert(`Error eliminando producto: ${error.message}`)
      return
    }

    obtenerProductos()
  }

  const productosMemo = useMemo(() => productos, [productos])

  return (
    <div className="w-full">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          <aside className="hidden lg:block w-full lg:w-[280px] lg:flex-shrink-0">
            <div className="bg-white rounded-[32px] border border-[#F4D4CF] shadow-sm p-6 lg:sticky lg:top-28">
              <h1 className="text-4xl md:text-5xl font-black text-[#FF5C8A]">
                TUCHIS
              </h1>

              <p className="text-gray-500 mt-2 text-base">
                Admin Panel
              </p>

              <div className="mt-8 flex flex-col gap-4">
                <Link
                  href="/admin"
                  className="bg-[#FFE4EC] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Dashboard
                </Link>

                <Link
                  href="/pedido"
                  className="bg-[#FFD6A8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Pedidos
                </Link>

                <Link
                  href="/admin/productos"
                  className="bg-[#F49B93] text-white px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Productos
                </Link>

                <Link
                  href="/admin/categorias"
                  className="bg-[#FFE9A8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Categorías
                </Link>

                <Link
                  href="/admin/tamanos"
                  className="bg-[#FFE4EC] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Tamaños
                </Link>

                <Link
                  href="/admin/escalas"
                  className="bg-[#E7D9FF] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Escalas
                </Link>

                <AdminLogoutBtn />
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">

            <div className="mb-10">
              <h2 className="text-5xl md:text-7xl font-black text-[#FF5C8A] leading-none break-words">
                Productos
              </h2>

              <p className="text-gray-500 text-base md:text-lg mt-4">
                Administra el catálogo de productos.
              </p>
            </div>

            <div className="section-card mb-8">
              <h3 className="text-3xl font-black text-[#3F334A] mb-8">
                Crear producto
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <input
                  type="text"
                  placeholder="Nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="input-premium"
                />

                <select
                  value={tamanoId}
                  onChange={(e) => setTamanoId(e.target.value)}
                  className="input-premium"
                >
                  <option value="">Tamaño principal</option>
                  {tamanos.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>

                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="input-premium"
                >
                  <option value="">Selecciona categoría</option>
                  {categorias.map((cat: any) => (
                    <option key={cat.id} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Medidas"
                    value={medidas}
                    onChange={(e) =>
                      setMedidas(limpiarMedidas(e.target.value))
                    }
                    className="input-premium pr-14"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold pointer-events-none">
                    cm
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="SKU"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="input-premium"
                />

                <div>
                  <label className="block text-sm font-semibold text-zinc-500 mb-2">
                    Stock
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={stock}
                    onChange={(e) =>
                      setStock(Number(e.target.value))
                    }
                    className="input-premium"
                  />
                </div>

              </div>

              <textarea
                placeholder="Etiquetas separadas por coma"
                value={etiquetas}
                onChange={(e) => setEtiquetas(e.target.value)}
                className="input-premium min-h-[120px] mt-5"
              />

              <label className="mt-6 border-2 border-dashed border-[#FFD0DC] rounded-[28px] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FFF7F4] transition">
                <span className="text-3xl font-black text-[#3F334A]">
                  Arrastra imágenes aquí
                </span>
                <span className="text-zinc-500 mt-2">
                  o haz click para subir
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (!e.target.files) return
                    setImagenes(Array.from(e.target.files))
                  }}
                />
              </label>

              {imagenes.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
                  {imagenes.map((img, index) => (
                    <div
                      key={index}
                      className="relative rounded-[24px] overflow-hidden shadow-lg"
                    >
                      <img
                        src={URL.createObjectURL(img)}
                        className="w-full h-56 object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={guardarProducto}
                className="btn-primary mt-8"
              >
                Guardar producto
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {productosMemo.map((producto: any) => {
                const tamano = tamanos.find(
                  (t) => t.id === producto.tamano_id
                )
                const precioDesde = producto.tamano_id
                  ? obtenerPrecioDesde(escalas, producto.tamano_id)
                  : 0

                return (
                  <div
                    key={producto.id}
                    className="product-card"
                  >
                    <div className="relative">
                      <img
                        src={
                          producto.imagenes?.[0] ||
                          "/placeholder.jpg"
                        }
                        className="w-full h-[320px] object-cover"
                      />
                    </div>

                    {producto.imagenes?.length > 1 && (
                      <div className="flex gap-2 p-3 overflow-x-auto">
                        {producto.imagenes.map(
                          (img: string, index: number) => (
                            <img
                              key={index}
                              src={img}
                              className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow"
                            />
                          )
                        )}
                      </div>
                    )}

                    <div className="p-5">
                      <p className="text-pink-400 font-bold uppercase text-sm">
                        {producto.categoria}
                      </p>

                      <h3 className="text-4xl font-black text-[#3F334A] mt-2">
                        {producto.nombre}
                      </h3>

                      <p className="text-zinc-500 mt-2">
                        {mostrarMedidas(producto.medidas)}
                      </p>

                      {tamano && (
                        <p className="text-sm font-black uppercase text-zinc-400 mt-3">
                          {tamano.nombre}
                        </p>
                      )}

                      {precioDesde > 0 && (
                        <p className="text-4xl font-black text-rose-300 mt-2">
                          Desde {moneda(precioDesde)}
                        </p>
                      )}

                      {(producto.etiquetas?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2 mt-5">
                          {producto.etiquetas.map(
                            (tag: string, index: number) => (
                              <span
                                key={index}
                                className="bg-[#FFE4EC] text-[#3F334A] px-3 py-1 rounded-full text-sm font-semibold"
                              >
                                {tag}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <button
                          onClick={() =>
                            setProductoEditando({
                              ...producto,
                              medidas: limpiarMedidas(
                                String(producto.medidas || "")
                              ),
                            })
                          }
                          className="bg-[#FF5C8A] hover:opacity-90 text-white py-4 rounded-2xl font-black transition"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() =>
                            eliminarProducto(producto.id)
                          }
                          className="bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

          </main>
        </div>
      </div>

      {productoEditando && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded-[32px] shadow-2xl p-8 md:p-10 max-h-[95vh] overflow-y-auto relative">

            <button
              onClick={() => setProductoEditando(null)}
              className="absolute top-6 right-6 text-5xl font-light text-zinc-400 hover:text-red-500 transition"
            >
              ×
            </button>

            <h2 className="text-4xl md:text-5xl font-black text-[#FF5C8A] mb-10">
              Editar producto
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label className="block text-sm font-semibold text-zinc-500 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={productoEditando.nombre}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      nombre: e.target.value,
                    })
                  }
                  className="input-premium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-500 mb-2">
                  Tamaño principal
                </label>
                <select
                  value={productoEditando.tamano_id ?? ""}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      tamano_id: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="input-premium"
                >
                  <option value="">Sin tamaño</option>
                  {tamanos.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-500 mb-2">
                  Categoría
                </label>
                <select
                  value={productoEditando.categoria}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      categoria: e.target.value,
                    })
                  }
                  className="input-premium"
                >
                  <option value="">Selecciona categoría</option>
                  {categorias.map((cat: any) => (
                    <option key={cat.id} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-500 mb-2">
                  Medidas
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={limpiarMedidas(
                      String(productoEditando.medidas || "")
                    )}
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        medidas: limpiarMedidas(e.target.value),
                      })
                    }
                    className="input-premium pr-14"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold pointer-events-none">
                    cm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-500 mb-2">
                  SKU
                </label>
                <input
                  type="text"
                  value={productoEditando.sku || ""}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      sku: e.target.value,
                    })
                  }
                  className="input-premium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-500 mb-2">
                  Stock
                </label>
                <input
                  type="number"
                  value={productoEditando.stock || 0}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      stock: Number(e.target.value),
                    })
                  }
                  className="input-premium"
                />
              </div>

            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-zinc-500 mb-2">
                Etiquetas
              </label>
              <textarea
                value={
                  productoEditando.etiquetas
                    ? productoEditando.etiquetas.join(", ")
                    : ""
                }
                onChange={(e) =>
                  setProductoEditando({
                    ...productoEditando,
                    etiquetas: e.target.value
                      .split(",")
                      .map((t) => t.trim()),
                  })
                }
                className="input-premium min-h-[120px]"
              />
            </div>

            <div className="mt-8">
              <h3 className="text-2xl font-bold mb-5">
                Fotografías
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {productoEditando.imagenes?.map(
                  (img: string, index: number) => (
                    <div
                      key={index}
                      className="relative rounded-3xl overflow-hidden border border-zinc-200"
                    >
                      <img
                        src={img}
                        className="w-full h-52 object-cover"
                      />
                      <button
                        onClick={() => {
                          const nuevas =
                            productoEditando.imagenes.filter(
                              (_: string, i: number) => i !== index
                            )
                          setProductoEditando({
                            ...productoEditando,
                            imagenes: nuevas,
                          })
                        }}
                        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-red-500 text-white font-bold"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="mt-8">
              <label className="border-2 border-dashed border-[#FFD0DC] rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FFF7F4] transition">
                <span className="text-2xl font-bold text-[#3F334A]">
                  Agregar fotografías
                </span>
                <span className="text-zinc-500 mt-2">
                  Click para subir imágenes
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    if (!e.target.files) return
                    const nuevasUrls: string[] = []
                    for (const imagen of Array.from(e.target.files)) {
                      const nombreArchivo =
                        `${Date.now()}-${imagen.name}`
                      const { error: uploadError } =
                        await supabase.storage
                          .from("productos")
                          .upload(nombreArchivo, imagen)
                      if (uploadError) {
                        alert("Error subiendo imagen")
                        return
                      }
                      const { data } = supabase.storage
                        .from("productos")
                        .getPublicUrl(nombreArchivo)
                      nuevasUrls.push(data.publicUrl)
                    }
                    setProductoEditando({
                      ...productoEditando,
                      imagenes: [
                        ...(productoEditando.imagenes || []),
                        ...nuevasUrls,
                      ],
                    })
                  }}
                />
              </label>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-10">
              <button
                onClick={async () => {
                  const { error } = await supabase
                    .from("productos")
                    .update({
                      nombre: String(productoEditando.nombre || ""),
                      tamano_id: productoEditando.tamano_id
                        ? Number(productoEditando.tamano_id)
                        : null,
                      categoria: String(
                        productoEditando.categoria || ""
                      ),
                      medidas: limpiarMedidas(
                        String(productoEditando.medidas || "")
                      ),
                      sku: String(productoEditando.sku || ""),
                      stock: Number(productoEditando.stock || 0),
                      etiquetas: Array.isArray(
                        productoEditando.etiquetas
                      )
                        ? productoEditando.etiquetas
                        : [],
                      imagenes: Array.isArray(
                        productoEditando.imagenes
                      )
                        ? productoEditando.imagenes
                        : [],
                    })
                    .eq("id", productoEditando.id)

                  if (error) {
                    console.log(error)
                    alert("Error actualizando")
                    return
                  }

                  alert("Producto actualizado")
                  setProductoEditando(null)
                  obtenerProductos()
                }}
                className="btn-primary"
              >
                Guardar cambios
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
