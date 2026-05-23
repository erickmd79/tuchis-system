"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminLogoutBtn from "../../components/AdminLogoutBtn"

type Tamano = {
  id: number
  nombre: string
}

const estadoInicial = {
  nombre: "",
}

export default function TamanosPage() {

  const [tamanos, setTamanos] =
    useState<Tamano[]>([])
  const [formulario, setFormulario] =
    useState(estadoInicial)
  const [editando, setEditando] =
    useState<Tamano | null>(null)
  const [cargando, setCargando] =
    useState(true)

  const obtenerTamanos = async () => {
    const { data, error } = await supabase
      .from("tamanos")
      .select("*")
      .order("nombre")

    if (!error && data) {
      setTamanos(data as Tamano[])
    }

    setCargando(false)
  }

  useEffect(() => {
    obtenerTamanos()
  }, [])

  const limpiarFormulario = () => {
    setFormulario(estadoInicial)
    setEditando(null)
  }

  const guardarTamano = async () => {
    if (!formulario.nombre) {
      alert("Completa el nombre del tamaño")
      return
    }

    const payload = {
      nombre: formulario.nombre.trim(),
    }

    const respuesta = editando
      ? await supabase
          .from("tamanos")
          .update(payload)
          .eq("id", editando.id)
      : await supabase
          .from("tamanos")
          .insert([payload])

    if (respuesta.error) {
      console.log(respuesta.error)
      alert(
        `Error guardando tamaño: ${respuesta.error.message}`
      )
      return
    }

    limpiarFormulario()
    obtenerTamanos()
  }

  const editarTamano = (tamano: Tamano) => {
    setEditando(tamano)
    setFormulario({
      nombre: tamano.nombre || "",
    })
  }

  const eliminarTamano = async (id: number) => {
    const confirmar =
      confirm("¿Eliminar tamaño?")

    if (!confirmar) return

    const { error } = await supabase
      .from("tamanos")
      .delete()
      .eq("id", id)

    if (error) {
      console.log(error)
      alert("Error eliminando tamaño")
      return
    }

    obtenerTamanos()
  }

  return (
    <div className="w-full">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-full lg:w-[280px] lg:flex-shrink-0">
            <div className="bg-white rounded-[32px] border border-[#F4D4CF] shadow-sm p-6 lg:sticky lg:top-28">
              <h1 className="text-4xl md:text-5xl font-black text-cyan-500">
                TUCHIS
              </h1>

              <p className="text-gray-500 mt-2 text-base">
                Admin Panel
              </p>

              <div className="mt-8 flex flex-col gap-4">
                <Link
                  href="/admin"
                  className="bg-[#D9F5F8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
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
                  className="bg-[#FFE9A8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Categorías
                </Link>

                <Link
                  href="/admin/tamanos"
                  className="bg-cyan-500 text-white px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
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
              <h2 className="text-5xl md:text-7xl font-black text-cyan-500 leading-none break-words">
                Tamaños
              </h2>

              <p className="text-gray-500 text-base md:text-lg mt-4">
                Configura los tamaños disponibles. Los precios se establecen en Escalas.
              </p>
            </div>

            <div className="section-card mb-8">
              <h3 className="text-3xl font-black text-cyan-600 mb-8">
                {editando
                  ? "Editar tamaño"
                  : "Crear tamaño"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <input
                  type="text"
                  placeholder="Nombre del tamaño"
                  value={formulario.nombre}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      nombre: e.target.value,
                    })
                  }
                  className="input-premium"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4 mt-8">
                <button
                  onClick={guardarTamano}
                  className="btn-primary"
                >
                  {editando
                    ? "Guardar cambios"
                    : "Guardar tamaño"}
                </button>

                {editando && (
                  <button
                    onClick={limpiarFormulario}
                    className="bg-[#FFE0DD] text-gray-800 px-6 py-4 rounded-2xl font-black"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <div className="section-card">
              <h3 className="text-3xl font-black text-cyan-600 mb-8">
                Lista de tamaños
              </h3>

              {cargando && (
                <p className="text-zinc-500 font-bold">
                  Cargando tamaños...
                </p>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {tamanos.map((tamano) => (
                  <div
                    key={tamano.id}
                    className="rounded-[28px] border border-[#F4D4CF] bg-[#FFF8F5] p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <h4 className="text-3xl font-black text-cyan-600">
                        {tamano.nombre}
                      </h4>

                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            editarTamano(tamano)
                          }
                          className="bg-[#BEE9E8] px-5 py-3 rounded-2xl font-bold"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() =>
                            eliminarTamano(tamano.id)
                          }
                          className="bg-[#FFD6D6] px-5 py-3 rounded-2xl font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!cargando && tamanos.length === 0 && (
                <div className="rounded-3xl border border-[#F8D6D0] bg-[#FFF8F5] p-8 text-center text-zinc-500 font-bold">
                  Aún no hay tamaños configurados.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
