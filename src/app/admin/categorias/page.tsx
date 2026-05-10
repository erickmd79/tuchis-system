"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"

export default function CategoriasPage() {

  const [nombre, setNombre] = useState("")
  const [categorias, setCategorias] = useState<any[]>([])

  async function cargarCategorias() {

    const { data } = await supabase
      .from("categorias")
      .select("*")
      .order("id", { ascending: false })

    if (data) {
      setCategorias(data)
    }
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  async function guardarCategoria() {

    if (!nombre) {
      alert("Escribe nombre")
      return
    }

    const { error } = await supabase
      .from("categorias")
      .insert([
        {
          nombre
        }
      ])

    if (error) {
      alert("Error guardando")
      return
    }

    setNombre("")
    cargarCategorias()
  }

  return (
    <div className="flex gap-4 mb-8">

  <a
    href="/admin"
    className="bg-[#20B8C9] text-white px-6 py-3 rounded-2xl font-bold"
  >
    Pedidos
  </a>

  <a
    href="/admin/productos"
    className="bg-[#F7AFAF] text-white px-6 py-3 rounded-2xl font-bold"
  >
    Productos
  </a>

  <a
    href="/admin/categorias"
    className="bg-[#F6D36B] text-white px-6 py-3 rounded-2xl font-bold"
  >
    Categorías
  </a>

</div>
    <div className="p-10">

      <h1 className="text-5xl font-bold mb-10 text-cyan-700">
        Categorías
      </h1>

      <div className="bg-white p-6 rounded-3xl shadow-xl mb-10">

        <input
          type="text"
          placeholder="Nombre categoría"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border p-4 rounded-2xl mb-4"
        />

        <button
          onClick={guardarCategoria}
          className="bg-pink-400 hover:bg-pink-500 text-white px-6 py-3 rounded-2xl font-bold"
        >
          Guardar categoría
        </button>

      </div>

      <div className="space-y-4">

        {categorias.map((cat) => (

          <div
            key={cat.id}
            className="bg-white p-5 rounded-2xl shadow"
          >
            {cat.nombre}
          </div>

        ))}

      </div>

    </div>
  )
}
