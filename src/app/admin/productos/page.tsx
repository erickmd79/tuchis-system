"use client"

import { useState } from "react"
import { supabase } from "../../../lib/supabase"

export default function ProductosAdmin() {

  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [categoria, setCategoria] = useState("")
  const [medidas, setMedidas] = useState("")
  const [imagenes, setImagenes] = useState<FileList | null>(null)

  const guardarProducto = async () => {

    if (!nombre || !precio) {
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
          alert("Error subiendo imagen")
          return
        }

        const { data } = supabase.storage
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
      alert("Error guardando producto")
      console.log(error)
      return
    }

    alert("Producto guardado")

    setNombre("")
    setPrecio("")
    setCategoria("")
    setMedidas("")
  }

  return (
    <div className="min-h-screen p-10 bg-[#FFFDF8]">

      <h1 className="text-5xl font-bold text-[#20B8C9] mb-10">
        Productos
      </h1>

      <div className="bg-white p-8 rounded-3xl shadow-lg space-y-5 border border-[#F8D6D0]">

        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-4 rounded-2xl border"
        />

        <input
          type="number"
          placeholder="Precio"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          className="w-full p-4 rounded-2xl border"
        />

        <input
          type="text"
          placeholder="Categoría"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full p-4 rounded-2xl border"
        />

        <input
          type="text"
          placeholder="Medidas"
          value={medidas}
          onChange={(e) => setMedidas(e.target.value)}
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
          className="bg-[#20B8C9] hover:bg-[#17A7B8]
          text-white px-8 py-4 rounded-2xl font-bold"
        >
          Guardar producto
        </button>

      </div>

    </div>
  )
}
