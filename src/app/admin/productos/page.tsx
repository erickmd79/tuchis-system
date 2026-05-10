"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../../lib/supabase"

export default function ProductosAdmin() {

  const [productos, setProductos] = useState<any[]>([])

  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [categoria, setCategoria] = useState("")
  const [categorias, setCategorias] = useState<any[]>([])
  const [medidas, setMedidas] = useState("")
  const [imagenes, setImagenes] = useState<FileList | null>(null)

  useEffect(() => {
    obtenerProductos()
    obtenerCategorias()
  }, [])

  const obtenerProductos = async () => {

    const { data, error } =
      await supabase
        .from("productos")
        .select("*")
        .order("id", { ascending: false })

    if (!error && data) {
      setProductos(data)
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

  const guardarProducto = async () => {

    if (!nombre || !precio || !categoria) {
      alert("Faltan datos")
      return
    }

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
          alert("Error subiendo imagen")
          return
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
            imagenes: urls,
          },
        ])

    if (error) {
      console.log(error)
      alert(JSON.stringify(error))
      return
    }

    alert("Producto guardado")

    setNombre("")
    setPrecio("")
    setCategoria("")
    setMedidas("")
    setImagenes(null)

    obtenerProductos()
  }

  const eliminarProducto = async (
    id: number
  ) => {

    const confirmar =
      confirm("¿Eliminar producto?")

    if (!confirmar) return

    const { error } =
      await supabase
        .from("productos")
        .delete()
        .eq("id", id)

    if (error) {
      alert("Error eliminando")
      return
    }

    obtenerProductos()
  }

  const editarProducto = async (
    producto: any
  ) => {

    const nuevoNombre =
      prompt(
        "Nombre",
        producto.nombre
      )

    if (!nuevoNombre) return

    const nuevoPrecio =
      prompt(
        "Precio",
        producto.precio
      )

    const nuevasMedidas =
      prompt(
        "Medidas",
        producto.medidas
      )

    const nuevaCategoria =
      prompt(
        "Categoría",
        producto.categoria
      )

    const { error } =
      await supabase
        .from("productos")
        .update({
          nombre: nuevoNombre,
          precio: nuevoPrecio,
          medidas: nuevasMedidas,
          categoria: nuevaCategoria,
        })
        .eq("id", producto.id)

    if (error) {
      alert("Error editando")
      return
    }

    obtenerProductos()
  }

  const eliminarImagen = async (
    producto: any,
    imagenUrl: string
  ) => {

    const confirmar =
      confirm("¿Eliminar imagen?")

    if (!confirmar) return

    const nuevasImagenes =
      producto.imagenes.filter(
        (img: string) =>
          img !== imagenUrl
      )

    const { error } =
      await supabase
        .from("productos")
        .update({
          imagenes: nuevasImagenes
        })
        .eq("id", producto.id)

    if (error) {
      alert("Error eliminando imagen")
      return
    }

    obtenerProductos()
  }

  const agregarImagenes = async (
    producto: any,
    files: FileList | null
  ) => {

    if (!files) return

    let nuevasUrls = [
      ...(producto.imagenes || [])
    ]

    for (const imagen of Array.from(files)) {

      const nombreArchivo =
        `${Date.now()}-${imagen.name}`

      const { error: uploadError } =
        await supabase.storage
          .from("productos")
          .upload(nombreArchivo, imagen)

      if (uploadError) {
        alert("Error subiendo")
        return
      }

      const { data } =
        supabase.storage
          .from("productos")
          .getPublicUrl(nombreArchivo)

      nuevasUrls.push(
        data.publicUrl
      )
    }

    const { error } =
      await supabase
        .from("productos")
        .update({
          imagenes: nuevasUrls
        })
        .eq("id", producto.id)

    if (error) {
      alert("Error actualizando")
      return
    }

    obtenerProductos()
  }

  return (

    <div className="min-h-screen bg-[#FFF8F5] p-8">

      <div className="flex gap-4 mb-8 flex-wrap">

        <Link
          href="/admin"
          className="bg-[#20B8C9]
          text-white px-5 py-3
          rounded-2xl font-bold"
        >
          Dashboard
        </Link>

        <Link
          href="/admin/productos"
          className="bg-[#F49B93]
          text-white px-5 py-3
          rounded-2xl font-bold"
        >
          Productos
        </Link>

        <Link
          href="/admin/categorias"
          className="bg-[#FFD56B]
          text-[#444] px-5 py-3
          rounded-2xl font-bold"
        >
          Categorías
        </Link>

      </div>

      <h1 className="text-5xl font-bold text-[#20B8C9] mb-10">
        Productos
      </h1>

      <div className="bg-white p-8 rounded-3xl shadow-lg space-y-5 border border-[#F8D6D0]">

        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) =>
            setNombre(e.target.value)
          }
          className="w-full p-4 rounded-2xl border"
        />

        <input
          type="number"
          placeholder="Precio"
          value={precio}
          onChange={(e) =>
            setPrecio(e.target.value)
          }
          className="w-full p-4 rounded-2xl border"
        />

        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(e.target.value)
          }
          className="w-full border p-4 rounded-2xl"
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
          className="w-full p-4 rounded-2xl border"
        />

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) =>
            setImagenes(e.target.files)
          }
          className="w-full p-4 rounded-2xl border bg-white"
        />

        <button
          onClick={guardarProducto}
          className="bg-[#20B8C9]
          hover:bg-[#17A7B8]
          text-white px-8 py-4
          rounded-2xl font-bold"
        >
          Guardar producto
        </button>

      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-6">

        {productos.map((producto) => (

          <div
            key={producto.id}
            className="bg-white rounded-3xl p-5 border border-[#F8D6D0]"
          >

            <div className="grid grid-cols-2 gap-3">

              {producto.imagenes?.map(
                (
                  imagen: string,
                  index: number
                ) => (

                  <div
                    key={index}
                    className="relative"
                  >

                    <img
                      src={imagen}
                      className="w-full h-40 object-cover rounded-2xl"
                    />

                    <button
                      onClick={() =>
                        eliminarImagen(
                          producto,
                          imagen
                        )
                      }
                      className="absolute top-2 right-2
                      bg-red-500 text-white
                      w-8 h-8 rounded-full"
                    >
                      ×
                    </button>

                  </div>

                )
              )}

            </div>

            <div className="mt-5">

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) =>
                  agregarImagenes(
                    producto,
                    e.target.files
                  )
                }
                className="w-full p-3 border rounded-2xl"
              />

            </div>

            <h2 className="text-2xl font-bold mt-4 text-[#20B8C9]">
              {producto.nombre}
            </h2>

            <p className="mt-2 text-gray-500">
              {producto.medidas}
            </p>

            <p className="text-lg mt-2">
              {producto.categoria}
            </p>

            <p className="text-3xl font-bold text-[#F49B93] mt-3">
              ${producto.precio}
            </p>

            <div className="flex gap-3 mt-5">

              <button
                onClick={() =>
                  editarProducto(producto)
                }
                className="bg-[#BEE9E8]
                px-5 py-3 rounded-2xl"
              >
                Editar
              </button>

              <button
                onClick={() =>
                  eliminarProducto(
                    producto.id
                  )
                }
                className="bg-[#FFD6D6]
                px-5 py-3 rounded-2xl"
              >
                Eliminar
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}
