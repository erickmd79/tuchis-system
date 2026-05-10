"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../../lib/supabase"

export default function CategoriasAdmin() {

  const [nombre, setNombre] = useState("")
  const [categorias, setCategorias] = useState<any[]>([])

  useEffect(() => {
    obtenerCategorias()
  }, [])

  const obtenerCategorias = async () => {

    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre")

    if (!error && data) {
      setCategorias(data)
    }
  }

  const eliminarCategoria = async (id: number) => {

  const confirmar =
    confirm("¿Eliminar categoría?")

  if (!confirmar) return

  const { error } = await supabase
    .from("categorias")
    .delete()
    .eq("id", id)

  if (error) {
    alert("Error eliminando")
    return
  }

  obtenerCategorias()
}

const editarCategoria = async (
  id: number,
  nombreActual: string
) => {

  const nuevoNombre =
    prompt(
      "Editar categoría",
      nombreActual
    )

  if (!nuevoNombre) return

  const { error } = await supabase
    .from("categorias")
    .update({
      nombre: nuevoNombre
    })
    .eq("id", id)

  if (error) {
    alert("Error editando")
    return
  }

  obtenerCategorias()
}
  const guardarCategoria = async () => {

    if (!nombre) {
      alert("Escribe una categoría")
      return
    }

    const { error } = await supabase
      .from("categorias")
      .insert([
        {
          nombre,
        },
      ])

    if (error) {
      console.log(error)
      alert("Error guardando categoría")
      return
    }

    alert("Categoría guardada")

    setNombre("")

    obtenerCategorias()
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] p-8">

      <div className="flex gap-4 mb-8">

        <Link
          href="/admin"
          className="bg-[#20B8C9] text-white px-5 py-3 rounded-2xl font-bold"
        >
          Dashboard
        </Link>

        <Link
          href="/admin/productos"
          className="bg-[#F49B93] text-white px-5 py-3 rounded-2xl font-bold"
        >
          Productos
        </Link>

        <Link
          href="/admin/categorias"
          className="bg-[#FFD56B] text-[#444] px-5 py-3 rounded-2xl font-bold"
        >
          Categorías
        </Link>

      </div>

      <h1 className="text-5xl font-bold text-[#20B8C9] mb-10">
        Categorías
      </h1>

      <div className="bg-white p-8 rounded-3xl shadow-lg border border-[#F8D6D0] mb-10">

        <input
          type="text"
          placeholder="Nombre de la categoría"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-4 rounded-2xl border mb-5"
        />

        <button
          onClick={guardarCategoria}
          className="bg-[#20B8C9] hover:bg-[#17A7B8]
          text-white px-8 py-4 rounded-2xl font-bold"
        >
          Guardar categoría
        </button>

      </div>

      <div className="bg-white rounded-3xl p-8 shadow-lg border border-[#F8D6D0]">

        <h2 className="text-3xl font-bold text-[#20B8C9] mb-6">
          Lista de categorías
        </h2>

        <div className="space-y-4">

          {categorias.map((cat) => (

            <div
              key={cat.id}
              className="p-4 rounded-2xl bg-[#FFF8F5] border border-[#F8D6D0]"
            >
              <div className="flex justify-between items-center">

  <span>
    {cat.nombre}
  </span>

  <div className="flex gap-2">

    <button
      onClick={() =>
        editarCategoria(
          cat.id,
          cat.nombre
        )
      }
      className="bg-[#BEE9E8]
      px-4 py-2 rounded-xl"
    >
      Editar
    </button>

    <button
      onClick={() =>
        eliminarCategoria(cat.id)
      }
      className="bg-[#FFD6D6]
      px-4 py-2 rounded-xl"
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
