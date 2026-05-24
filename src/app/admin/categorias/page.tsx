"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../../lib/supabase"
import AdminLogoutBtn from "../../components/AdminLogoutBtn"

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
    if (!error && data) setCategorias(data)
  }

  const eliminarCategoria = async (id: number) => {
    const confirmar = confirm("¿Eliminar categoría?")
    if (!confirmar) return
    const { error } = await supabase
      .from("categorias")
      .delete()
      .eq("id", id)
    if (error) { alert("Error eliminando"); return }
    obtenerCategorias()
  }

  const editarCategoria = async (id: number, nombreActual: string) => {
    const nuevoNombre = prompt("Editar categoría", nombreActual)
    if (!nuevoNombre) return
    const { error } = await supabase
      .from("categorias")
      .update({ nombre: nuevoNombre })
      .eq("id", id)
    if (error) { alert("Error editando"); return }
    obtenerCategorias()
  }

  const guardarCategoria = async () => {
    if (!nombre) { alert("Escribe una categoría"); return }
    const { error } = await supabase
      .from("categorias")
      .insert([{ nombre }])
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
                  className="bg-[#FFE0DD] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Productos
                </Link>

                <Link
                  href="/admin/categorias"
                  className="bg-[#FFD56B] text-[#444] px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Categorías
                </Link>

                <Link
                  href="/admin/tamanos"
                  className="bg-[#E7D9FF] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Tamaños
                </Link>

                <Link
                  href="/admin/escalas"
                  className="bg-[#E0D5FF] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
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
                Categorías
              </h2>

              <p className="text-gray-500 text-base md:text-lg mt-4">
                Administra las categorías del catálogo.
              </p>
            </div>

            <div className="section-card mb-8">
              <h3 className="text-3xl font-black text-[#3F334A] mb-8">
                Nueva categoría
              </h3>

              <input
                type="text"
                placeholder="Nombre de la categoría"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="input-premium w-full mb-5"
              />

              <button
                onClick={guardarCategoria}
                className="btn-primary"
              >
                Guardar categoría
              </button>
            </div>

            <div className="section-card">
              <h3 className="text-3xl font-black text-[#3F334A] mb-8">
                Lista de categorías
              </h3>

              <div className="space-y-4">
                {categorias.map((cat) => (
                  <div
                    key={cat.id}
                    className="rounded-[28px] border border-[#F4D4CF] bg-white p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <span className="text-xl font-bold text-[#3F334A]">
                        {cat.nombre}
                      </span>

                      <div className="flex gap-3">
                        <button
                          onClick={() => editarCategoria(cat.id, cat.nombre)}
                          className="bg-[#BFF3DF] px-5 py-3 rounded-2xl font-bold"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => eliminarCategoria(cat.id)}
                          className="bg-[#FFD6D6] px-5 py-3 rounded-2xl font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>

        </div>
      </div>
    </div>
  )
}
