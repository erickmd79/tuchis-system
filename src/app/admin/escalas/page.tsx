"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { moneda } from "../../../lib/pricing"

type Tamano = {
  id: number
  nombre: string
}

type Escala = {
  id: number
  tamano_id: number
  modalidad: string
  cantidad_min: number
  cantidad_max: number | null
  precio: number
}

const MODALIDADES = ["Blancas", "Pintadas", "Kit"]

const estadoInicial = {
  tamano_id: "",
  modalidad: "",
  cantidad_min: "1",
  cantidad_max: "",
  precio: "",
}

export default function EscalasPage() {

  const [tamanos, setTamanos] = useState<Tamano[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [formulario, setFormulario] = useState(estadoInicial)
  const [editando, setEditando] = useState<Escala | null>(null)
  const [cargando, setCargando] = useState(true)

  const obtenerTamanos = async () => {
    const { data, error } = await supabase
      .from("tamanos")
      .select("*")
      .order("nombre")

    if (!error && data) {
      setTamanos(data as Tamano[])
    }
  }

  const obtenerEscalas = async () => {
    const { data, error } = await supabase
      .from("escalas")
      .select("*")
      .order("tamano_id")
      .order("modalidad")
      .order("cantidad_min")

    if (!error && data) {
      setEscalas(data as Escala[])
    }

    setCargando(false)
  }

  useEffect(() => {
    obtenerTamanos()
    obtenerEscalas()
  }, [])

  const limpiarFormulario = () => {
    setFormulario(estadoInicial)
    setEditando(null)
  }

  const guardarEscala = async () => {
    if (
      !formulario.tamano_id ||
      !formulario.modalidad ||
      !formulario.cantidad_min ||
      !formulario.precio
    ) {
      alert("Completa tamaño, modalidad, cantidad mínima y precio")
      return
    }

    const payload = {
      tamano_id: Number(formulario.tamano_id),
      modalidad: formulario.modalidad,
      cantidad_min: Number(formulario.cantidad_min),
      cantidad_max: formulario.cantidad_max
        ? Number(formulario.cantidad_max)
        : null,
      precio: Number(formulario.precio),
    }

    const respuesta = editando
      ? await supabase
          .from("escalas")
          .update(payload)
          .eq("id", editando.id)
      : await supabase
          .from("escalas")
          .insert([payload])

    if (respuesta.error) {
      console.log(respuesta.error)
      alert(
        `Error guardando escala: ${respuesta.error.message}`
      )
      return
    }

    limpiarFormulario()
    obtenerEscalas()
  }

  const editarEscala = (escala: Escala) => {
    setEditando(escala)
    setFormulario({
      tamano_id: String(escala.tamano_id),
      modalidad: escala.modalidad,
      cantidad_min: String(escala.cantidad_min),
      cantidad_max: escala.cantidad_max
        ? String(escala.cantidad_max)
        : "",
      precio: String(escala.precio),
    })
  }

  const eliminarEscala = async (id: number) => {
    const confirmar = confirm("¿Eliminar escala?")

    if (!confirmar) return

    const { error } = await supabase
      .from("escalas")
      .delete()
      .eq("id", id)

    if (error) {
      console.log(error)
      alert("Error eliminando escala")
      return
    }

    obtenerEscalas()
  }

  const obtenerNombreTamano = (tamanoId: number) => {
    const tamano = tamanos.find((t) => t.id === tamanoId)
    return tamano?.nombre || `Tamaño ${tamanoId}`
  }

  return (
    <div className="w-full">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-[280px] lg:flex-shrink-0">
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
                  className="bg-[#D9F5F8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Tamaños
                </Link>

                <Link
                  href="/admin/escalas"
                  className="bg-[#E0D5FF] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Escalas
                </Link>

                <Link
                  href="/catalogo"
                  className="bg-[#D9F5F8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Ver catálogo
                </Link>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="mb-10">
              <h2 className="text-5xl md:text-7xl font-black text-cyan-500 leading-none break-words">
                Escalas de Precio
              </h2>

              <p className="text-gray-500 text-base md:text-lg mt-4">
                Configura precios por rango de cantidad para cada tamaño y modalidad.
              </p>
            </div>

            <div className="section-card mb-8">
              <h3 className="text-3xl font-black text-cyan-600 mb-8">
                {editando
                  ? "Editar escala"
                  : "Crear escala"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <select
                  value={formulario.tamano_id}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      tamano_id: e.target.value,
                    })
                  }
                  className="input-premium"
                >
                  <option value="">
                    Selecciona un tamaño
                  </option>

                  {tamanos.map((tamano) => (
                    <option
                      key={tamano.id}
                      value={String(tamano.id)}
                    >
                      {tamano.nombre}
                    </option>
                  ))}
                </select>

                <select
                  value={formulario.modalidad}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      modalidad: e.target.value,
                    })
                  }
                  className="input-premium"
                >
                  <option value="">
                    Selecciona modalidad
                  </option>

                  {MODALIDADES.map((modalidad) => (
                    <option
                      key={modalidad}
                      value={modalidad}
                    >
                      {modalidad}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Cantidad mínima"
                  value={formulario.cantidad_min}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      cantidad_min: e.target.value,
                    })
                  }
                  className="input-premium"
                />

                <input
                  type="number"
                  placeholder="Cantidad máxima (opcional)"
                  value={formulario.cantidad_max}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      cantidad_max: e.target.value,
                    })
                  }
                  className="input-premium"
                />

                <input
                  type="number"
                  placeholder="Precio"
                  value={formulario.precio}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      precio: e.target.value,
                    })
                  }
                  className="input-premium"
                  step="0.01"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4 mt-8">
                <button
                  onClick={guardarEscala}
                  className="btn-primary"
                >
                  {editando
                    ? "Guardar cambios"
                    : "Guardar escala"}
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
                Lista de escalas
              </h3>

              {cargando && (
                <p className="text-zinc-500 font-bold">
                  Cargando escalas...
                </p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#F4D4CF]">
                      <th className="text-left p-4 font-black text-cyan-600">
                        Tamaño
                      </th>
                      <th className="text-left p-4 font-black text-cyan-600">
                        Modalidad
                      </th>
                      <th className="text-left p-4 font-black text-cyan-600">
                        Cantidad
                      </th>
                      <th className="text-left p-4 font-black text-cyan-600">
                        Precio
                      </th>
                      <th className="text-left p-4 font-black text-cyan-600">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {escalas.map((escala) => (
                      <tr
                        key={escala.id}
                        className="border-b border-[#F5D3CD] hover:bg-[#FFF8F5]"
                      >
                        <td className="p-4 font-bold text-cyan-600">
                          {obtenerNombreTamano(escala.tamano_id)}
                        </td>
                        <td className="p-4 text-gray-700">
                          {escala.modalidad}
                        </td>
                        <td className="p-4 text-gray-700">
                          {escala.cantidad_min}
                          {escala.cantidad_max
                            ? ` - ${escala.cantidad_max}`
                            : "+"}
                        </td>
                        <td className="p-4 font-black text-[#F49B93]">
                          {moneda(escala.precio)}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                editarEscala(escala)
                              }
                              className="bg-[#BEE9E8] px-3 py-2 rounded-xl font-bold text-sm"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() =>
                                eliminarEscala(escala.id)
                              }
                              className="bg-[#FFD6D6] px-3 py-2 rounded-xl font-bold text-sm"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!cargando && escalas.length === 0 && (
                <div className="rounded-3xl border border-[#F8D6D0] bg-[#FFF8F5] p-8 text-center text-zinc-500 font-bold">
                  Aún no hay escalas configuradas.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
