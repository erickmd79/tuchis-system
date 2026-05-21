"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../../lib/supabase"

const limpiarMedidas = (valor: string) =>
  valor.replace(/\s*cm\s*$/i, "").trim()

const mostrarMedidas = (valor?: string) => {
  const medidas = limpiarMedidas(String(valor || ""))

  return medidas ? `${medidas} cm` : ""
}

const numero = (valor: any) =>
  Number(valor || 0)

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

export default function ProductosPage() {

  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [tamanos, setTamanos] = useState<any[]>([])

  const [nombre, setNombre] = useState("")
  const [precioMenudeo, setPrecioMenudeo] = useState("")
  const [precioMayoreo, setPrecioMayoreo] = useState("")
  const [minimoMayoreo, setMinimoMayoreo] = useState("")
  const [categoria, setCategoria] = useState("")
  const [medidas, setMedidas] = useState("")
  const [sku, setSku] = useState("")
  const [stock, setStock] = useState(0)
  const [etiquetas, setEtiquetas] = useState("")
  const [imagenes, setImagenes] = useState<File[]>([])
  const [tamanoSeleccionado, setTamanoSeleccionado] =
    useState("")
  const [tamanosSeleccionados, setTamanosSeleccionados] =
    useState<any[]>([])

  const [productoEditando, setProductoEditando] =
    useState<any>(null)

  useEffect(() => {
    obtenerProductos()
    obtenerCategorias()
    obtenerTamanos()
  }, [])

  const obtenerProductos = async () => {

    const { data } =
      await supabase
        .from("productos")
        .select("*")
        .order("id", { ascending: false })

    if (data) setProductos(data)
  }

  const obtenerCategorias = async () => {

    const { data } =
      await supabase
        .from("categorias")
        .select("*")
        .order("nombre")

    if (data) setCategorias(data)
  }

  const obtenerTamanos = async () => {

    const { data } =
      await supabase
        .from("tamanos")
        .select("*")
        .order("nombre")
        .order("modalidad")

    if (data) setTamanos(data)
  }

  const agregarTamanoSeleccionado = () => {
    const tamano =
      tamanos.find(
        (item) =>
          String(item.id) ===
          String(tamanoSeleccionado)
      )

    if (!tamano) return

    const existe =
      tamanosSeleccionados.some(
        (item) =>
          String(item.tamano_id ?? item.id) ===
          String(tamano.id)
      )

    if (existe) {
      setTamanoSeleccionado("")
      return
    }

    setTamanosSeleccionados([
      ...tamanosSeleccionados,
      prepararTamanoProducto(tamano),
    ])
    setTamanoSeleccionado("")
  }

  const quitarTamanoSeleccionado = (
    id: string | number
  ) => {
    setTamanosSeleccionados(
      tamanosSeleccionados.filter(
        (tamano) =>
          String(tamano.tamano_id ?? tamano.id) !==
          String(id)
      )
    )
  }

  const guardarProducto = async () => {

    try {

      let urls: string[] = []

      for (const imagen of imagenes) {

        const nombreArchivo =
          `${Date.now()}-${imagen.name}`

        const { error: uploadError } =
          await supabase.storage
            .from("productos")
            .upload(nombreArchivo, imagen)

        if (uploadError) {
          console.log(uploadError)
          alert("Error subiendo imagen")
          return
        }

        const { data } =
          supabase.storage
            .from("productos")
            .getPublicUrl(nombreArchivo)

        urls.push(data.publicUrl)
      }

      const { error } =
        await supabase
          .from("productos")
          .insert([
            {
              nombre,
              precio: Number(precioMenudeo),
              precio_menudeo: Number(precioMenudeo),
              precio_mayoreo: Number(precioMayoreo),
              minimo_mayoreo: Number(minimoMayoreo),
              tamanos:
                tamanosSeleccionados.map(
                  prepararTamanoProducto
                ),
              categoria,
              medidas: limpiarMedidas(medidas),
              sku,
              stock,
              etiquetas:
                etiquetas.length > 0
                  ? etiquetas
                      .split(",")
                      .map((e) => e.trim())
                  : [],
              imagenes: urls,
            },
          ])

      if (error) {
        console.log(error)
        alert(error.message)
        return
      }

      alert("Producto guardado")

      setNombre("")
      setPrecioMenudeo("")
      setPrecioMayoreo("")
      setMinimoMayoreo("")
      setCategoria("")
      setMedidas("")
      setSku("")
      setStock(0)
      setEtiquetas("")
      setImagenes([])
      setTamanoSeleccionado("")
      setTamanosSeleccionados([])

      obtenerProductos()

    } catch (error) {
      console.log(error)
      alert("Error guardando producto")
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

  const productosMemo = useMemo(() => {
    return productos
  }, [productos])

  return (

    <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">

      <h1 className="page-title">
        Productos
      </h1>

      <div className="section-card">

        <h2 className="text-3xl font-black text-cyan-700 mb-8">
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
            placeholder="Precio menudeo"
            value={precioMenudeo}
            onChange={(e) =>
              setPrecioMenudeo(e.target.value)
            }
            className="input-premium"
          />

          <input
            type="number"
            placeholder="Precio mayoreo"
            value={precioMayoreo}
            onChange={(e) =>
              setPrecioMayoreo(e.target.value)
            }
            className="input-premium"
          />

          <input
            type="number"
            placeholder="Mínimo mayoreo (piezas)"
            value={minimoMayoreo}
            onChange={(e) =>
              setMinimoMayoreo(e.target.value)
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

            {categorias.map((cat: any) => (
              <option
                key={cat.id}
                value={cat.nombre}
              >
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
                setMedidas(
                  limpiarMedidas(e.target.value)
                )
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

        </div>

        <div className="mt-6 rounded-[28px] border border-[#F4D4CF] bg-[#FFF8F5] p-5">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-black uppercase text-zinc-400 mb-2">
                Tamaños del producto
              </label>

              <select
                value={tamanoSeleccionado}
                onChange={(e) =>
                  setTamanoSeleccionado(e.target.value)
                }
                className="input-premium"
              >
                <option value="">
                  Selecciona un tamaño creado
                </option>

                {tamanos.map((tamano: any) => (
                  <option
                    key={tamano.id}
                    value={tamano.id}
                  >
                    {tamano.nombre} / {tamano.modalidad} · Menudeo ${numero(tamano.precio_menudeo)} · Mayoreo ${numero(tamano.precio_mayoreo)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={agregarTamanoSeleccionado}
              className="btn-primary md:w-auto"
            >
              Agregar tamaño
            </button>
          </div>

          {tamanosSeleccionados.length > 0 && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {tamanosSeleccionados.map((tamano) => (
                <div
                  key={`${tamano.tamano_id ?? tamano.id}-${tamano.modalidad}`}
                  className="rounded-2xl border border-[#F8D6D0] bg-white p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-xs font-black uppercase text-zinc-400">
                      {tamano.modalidad}
                    </p>
                    <h3 className="text-xl font-black text-cyan-600">
                      {tamano.nombre}
                    </h3>
                    <p className="text-sm font-black text-rose-300 mt-1">
                      Menudeo ${numero(tamano.precio_menudeo)}
                    </p>
                    <p className="text-sm font-black text-cyan-500">
                      Mayoreo ${numero(tamano.precio_mayoreo)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      quitarTamanoSeleccionado(
                        tamano.tamano_id ?? tamano.id
                      )
                    }
                    className="bg-[#FFD6D6] text-zinc-700 px-4 py-2 rounded-2xl font-black"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {tamanos.length === 0 && (
            <p className="mt-4 text-sm font-bold text-zinc-500">
              Primero crea tamaños en Admin &gt; Tamaños.
            </p>
          )}
        </div>

        <textarea
          placeholder="Etiquetas separadas por coma"
          value={etiquetas}
          onChange={(e) =>
            setEtiquetas(e.target.value)
          }
          className="input-premium min-h-[120px] mt-5"
        />

        <label className="mt-6 border-2 border-dashed border-cyan-300 rounded-[28px] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-cyan-50 transition">

          <span className="text-3xl font-black text-cyan-600">
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

              setImagenes(
                Array.from(e.target.files)
              )
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

        {productosMemo.map((producto: any) => (

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

              <h3 className="text-4xl font-black text-cyan-600 mt-2">
                {producto.nombre}
              </h3>

              <p className="text-zinc-500 mt-2">
                {mostrarMedidas(producto.medidas)}
              </p>

              <div className="mt-5 space-y-2">

                <p className="text-4xl font-black text-rose-300">
                  Menudeo ${producto.precio_menudeo ?? producto.precio}
                </p>

                <p className="text-2xl font-black text-cyan-500">
                  Mayoreo ${producto.precio_mayoreo ?? producto.precio}
                </p>

                {Number(producto.minimo_mayoreo || 0) > 0 && (
                  <p className="text-sm font-black uppercase text-zinc-500">
                    Desde {producto.minimo_mayoreo} piezas
                  </p>
                )}

              </div>

              {Array.isArray(producto.tamanos) &&
                producto.tamanos.length > 0 && (
                  <div className="mt-5 grid grid-cols-1 gap-2">
                    {producto.tamanos.map(
                      (tamano: any, index: number) => (
                        <div
                          key={`${tamano.tamano_id ?? tamano.id ?? index}-${tamano.modalidad}`}
                          className="rounded-2xl border border-[#F8D6D0] bg-[#FFF8F5] p-3"
                        >
                          <p className="text-xs font-black uppercase text-zinc-400">
                            {tamano.nombre} / {tamano.modalidad}
                          </p>
                          <p className="text-sm font-black text-rose-300">
                            Menudeo ${numero(tamano.precio_menudeo)}
                          </p>
                          <p className="text-sm font-black text-cyan-500">
                            Mayoreo ${numero(tamano.precio_mayoreo)}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

              {(producto.etiquetas?.length ?? 0) > 0 && (

                <div className="flex flex-wrap gap-2 mt-5">

                  {producto.etiquetas.map(
                    (tag: string, index: number) => (

                      <span
                        key={index}
                        className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-semibold"
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
                      precio_menudeo:
                        producto.precio_menudeo ??
                        producto.precio ??
                        "",
                      precio_mayoreo:
                        producto.precio_mayoreo ?? "",
                      minimo_mayoreo:
                        producto.minimo_mayoreo ?? "",
                      medidas: limpiarMedidas(
                        String(producto.medidas || "")
                      ),
                    })
                  }
                  className="bg-cyan-500 hover:bg-cyan-600 text-white py-4 rounded-2xl font-black transition"
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
        ))}

      </div>

      {productoEditando && (

        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-6xl rounded-[32px] shadow-2xl p-8 md:p-10 max-h-[95vh] overflow-y-auto relative">

            <button
              onClick={() =>
                setProductoEditando(null)
              }
              className="absolute top-6 right-6 text-5xl font-light text-zinc-400 hover:text-red-500 transition"
            >
              ×
            </button>

            <h2 className="text-4xl md:text-5xl font-black text-cyan-500 mb-10">
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
      Precio menudeo
    </label>

    <input
      type="number"
      value={
        productoEditando.precio_menudeo ??
        productoEditando.precio ??
        ""
      }
      onChange={(e) =>
        setProductoEditando({
          ...productoEditando,
          precio_menudeo: e.target.value,
        })
      }
      className="input-premium"
    />
  </div>

  <div>
    <label className="block text-sm font-semibold text-zinc-500 mb-2">
      Precio mayoreo
    </label>

    <input
      type="number"
      value={productoEditando.precio_mayoreo ?? ""}
      onChange={(e) =>
        setProductoEditando({
          ...productoEditando,
          precio_mayoreo: e.target.value,
        })
      }
      className="input-premium"
    />
  </div>

  <div>
    <label className="block text-sm font-semibold text-zinc-500 mb-2">
      Mínimo mayoreo (piezas)
    </label>

    <input
      type="number"
      value={productoEditando.minimo_mayoreo ?? ""}
      onChange={(e) =>
        setProductoEditando({
          ...productoEditando,
          minimo_mayoreo: e.target.value,
        })
      }
      className="input-premium"
    />
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

      <option value="">
        Selecciona categoría
      </option>

      {categorias.map((cat: any) => (
        <option
          key={cat.id}
          value={cat.nombre}
        >
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
                              (_: string, i: number) =>
                                i !== index
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

              <label className="border-2 border-dashed border-cyan-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-cyan-50 transition">

                <span className="text-2xl font-bold text-cyan-600">
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

                  const { data, error } =
  await supabase
    .from("productos")
    .update({
      nombre: String(
        productoEditando.nombre || ""
      ),

      precio: Number(
        productoEditando.precio_menudeo ??
        productoEditando.precio ??
        0
      ),

      precio_menudeo: Number(
        productoEditando.precio_menudeo ??
        productoEditando.precio ??
        0
      ),

      precio_mayoreo: Number(
        productoEditando.precio_mayoreo || 0
      ),

      minimo_mayoreo: Number(
        productoEditando.minimo_mayoreo || 0
      ),

      categoria: String(
        productoEditando.categoria || ""
      ),

      medidas: String(
        limpiarMedidas(
          String(productoEditando.medidas || "")
        )
      ),

      sku: String(
        productoEditando.sku || ""
      ),

      stock: Number(
        productoEditando.stock || 0
      ),

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
    .select()

                  if (error) {
                    console.log(error)
                    alert("Error actualizando")
                    return
                  }

                  console.log(data)
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
