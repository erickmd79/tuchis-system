"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

type ProductoPedido = {
  producto_id?: string | number
  id?: string | number
  nombre?: string
  cantidad?: number | string
  precio?: number | string
  modalidad?: string
  categoria?: string
}

type Pedido = {
  id: number
  cliente?: string
  telefono?: string
  fecha?: string
  fecha_pedido?: string
  fecha_creacion?: string
  created_at?: string
  estado?: string
  estado_pago?: string
  anticipo?: number | string
  total?: number | string
  productos?: ProductoPedido[]
}

type ProductoCatalogo = {
  id: string | number
  nombre?: string
  categoria?: string
}

const numero = (valor: unknown) =>
  Number(valor || 0)

const moneda = (valor: number) =>
  valor.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  })

const obtenerFechaLocal = () => {
  const fecha = new Date()
  const offset = fecha.getTimezoneOffset()
  const local =
    new Date(fecha.getTime() - offset * 60000)

  return local.toISOString().slice(0, 10)
}

const obtenerFechaPedido = (pedido: Pedido) =>
  pedido.fecha_pedido ||
  pedido.created_at ||
  pedido.fecha_creacion ||
  pedido.fecha ||
  ""

const obtenerClaveFecha = (valor?: string) => {
  if (!valor) return ""

  const soloFecha =
    String(valor).split("T")[0]

  if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
    return soloFecha
  }

  const fecha = new Date(valor)

  if (Number.isNaN(fecha.getTime())) {
    return ""
  }

  const offset = fecha.getTimezoneOffset()
  const local =
    new Date(fecha.getTime() - offset * 60000)

  return local.toISOString().slice(0, 10)
}

const formatearDia = (valor: string) => {
  const [anio, mes, dia] =
    valor.split("-").map(Number)

  if (!anio || !mes || !dia) return valor

  return new Date(
    anio,
    mes - 1,
    dia
  ).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  })
}

const normalizarEstado = (estado?: string) =>
  String(estado || "pendiente").toLowerCase()

const obtenerEstadoEntrega = (pedido: Pedido) =>
  pedido.estado === "entregado"
    ? "entregado"
    : "pendiente"

const obtenerEstadoPago = (pedido: Pedido) =>
  pedido.estado_pago ||
  (pedido.estado === "pagado" ? "pagado" : "anticipo")

const obtenerUltimosDias = (total = 7) =>
  Array.from({ length: total }, (_, index) => {
    const fecha = new Date()
    fecha.setDate(
      fecha.getDate() - (total - 1 - index)
    )

    const offset = fecha.getTimezoneOffset()
    const local =
      new Date(fecha.getTime() - offset * 60000)

    return local.toISOString().slice(0, 10)
  })

const porcentaje = (
  valor: number,
  maximo: number
) =>
  maximo > 0
    ? Math.max(6, Math.round((valor / maximo) * 100))
    : 0

export default function AdminPage() {

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [productos, setProductos] =
    useState<ProductoCatalogo[]>([])
  const [cargando, setCargando] = useState(true)

  const obtenerDatos = async () => {
    const [
      pedidosRespuesta,
      productosRespuesta,
    ] = await Promise.all([
      supabase
        .from("pedidos")
        .select("*")
        .order("id", { ascending: false }),
      supabase
        .from("productos")
        .select("id,nombre,categoria"),
    ])

    if (pedidosRespuesta.data) {
      setPedidos(
        pedidosRespuesta.data as Pedido[]
      )
    }

    if (productosRespuesta.data) {
      setProductos(
        productosRespuesta.data as ProductoCatalogo[]
      )
    }

    setCargando(false)
  }

  useEffect(() => {
    obtenerDatos()

    const refrescar = () => {
      obtenerDatos()
    }

    const refrescarSiVisible = () => {
      if (!document.hidden) {
        obtenerDatos()
      }
    }

    const canal = supabase
      .channel("dashboard-pedidos")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
        },
        refrescar
      )
      .subscribe()

    window.addEventListener(
      "focus",
      refrescar
    )
    document.addEventListener(
      "visibilitychange",
      refrescarSiVisible
    )

    return () => {
      void supabase.removeChannel(canal)
      window.removeEventListener(
        "focus",
        refrescar
      )
      document.removeEventListener(
        "visibilitychange",
        refrescarSiVisible
      )
    }
  }, [])

  const resumen = useMemo(() => {
    const hoy = obtenerFechaLocal()

    const catalogoPorId =
      new Map(
        productos.map((producto) => [
          String(producto.id),
          producto,
        ])
      )

    const totalVentas =
      pedidos.reduce(
        (acc, pedido) =>
          acc + numero(pedido.total),
        0
      )

    const totalAnticipos =
      pedidos.reduce(
        (acc, pedido) =>
          acc + numero(pedido.anticipo),
        0
      )

    const pedidosHoy =
      pedidos.filter(
        (pedido) =>
          obtenerClaveFecha(
            obtenerFechaPedido(pedido)
          ) === hoy
      ).length

    const estados =
      pedidos.reduce<Record<string, number>>(
        (acc, pedido) => {
          const estado =
            obtenerEstadoEntrega(pedido)

          acc[estado] =
            (acc[estado] || 0) + 1

          return acc
        },
        {}
      )

    const pagos =
      pedidos.reduce<Record<string, number>>(
        (acc, pedido) => {
          const estadoPago =
            obtenerEstadoPago(pedido)

          acc[estadoPago] =
            (acc[estadoPago] || 0) + 1

          return acc
        },
        {}
      )

    const productosVendidos =
      new Map<string, number>()

    const modalidades =
      new Map<string, number>()

    const categorias =
      new Map<string, number>()

    pedidos.forEach((pedido) => {
      ;(pedido.productos || []).forEach(
        (producto) => {
          const cantidad =
            numero(producto.cantidad) || 1
          const nombreProducto =
            producto.nombre || "Sin nombre"

          productosVendidos.set(
            nombreProducto,
            (productosVendidos.get(nombreProducto) || 0) +
              cantidad
          )

          const modalidad =
            producto.modalidad || "Sin modalidad"

          modalidades.set(
            modalidad,
            (modalidades.get(modalidad) || 0) +
              cantidad
          )

          const productoCatalogo =
            catalogoPorId.get(
              String(
                producto.producto_id ??
                producto.id ??
                ""
              )
            )

          const categoria =
            producto.categoria ||
            productoCatalogo?.categoria ||
            "Sin categoría"

          categorias.set(
            categoria,
            (categorias.get(categoria) || 0) +
              cantidad
          )
        }
      )
    })

    const productosTop =
      Array.from(productosVendidos.entries())
        .map(([nombre, cantidad]) => ({
          nombre,
          cantidad,
        }))
        .sort(
          (a, b) =>
            b.cantidad - a.cantidad
        )
        .slice(0, 5)

    const modalidadesTop =
      Array.from(modalidades.entries())
        .map(([nombre, cantidad]) => ({
          nombre,
          cantidad,
        }))
        .sort(
          (a, b) =>
            b.cantidad - a.cantidad
        )

    const categoriasTop =
      Array.from(categorias.entries())
        .map(([nombre, cantidad]) => ({
          nombre,
          cantidad,
        }))
        .sort(
          (a, b) =>
            b.cantidad - a.cantidad
        )
        .slice(0, 5)

    const dias =
      obtenerUltimosDias(7)

    const ventasPorDia =
      dias.map((dia) => {
        const total =
          pedidos
            .filter(
              (pedido) =>
                obtenerClaveFecha(
                  obtenerFechaPedido(pedido)
                ) === dia
            )
            .reduce(
              (acc, pedido) =>
                acc + numero(pedido.total),
              0
            )

        return {
          dia,
          total,
        }
      })

    return {
      totalVentas,
      totalAnticipos,
      pedidosHoy,
      totalPedidos: pedidos.length,
      estados,
      pagos,
      productosTop,
      modalidadesTop,
      categoriasTop,
      ventasPorDia,
      recientes: pedidos.slice(0, 6),
    }
  }, [pedidos, productos])

  const maxVentasDia =
    Math.max(
      1,
      ...resumen.ventasPorDia.map(
        (dia) => dia.total
      )
    )

  const maxProductos =
    Math.max(
      1,
      ...resumen.productosTop.map(
        (producto) => producto.cantidad
      )
    )

  const maxModalidades =
    Math.max(
      1,
      ...resumen.modalidadesTop.map(
        (modalidad) => modalidad.cantidad
      )
    )

  const maxCategorias =
    Math.max(
      1,
      ...resumen.categoriasTop.map(
        (categoria) => categoria.cantidad
      )
    )

  const totalEstados =
    Math.max(1, resumen.totalPedidos)

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
                  className="bg-cyan-500 text-white px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
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
                  href="/catalogo"
                  className="bg-[#D9F5F8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Ver catálogo
                </Link>

              </div>

            </div>

          </aside>

          <main className="flex-1 min-w-0">

            <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">

              <div>
                <h2 className="text-5xl md:text-7xl font-black text-cyan-500 leading-none break-words">
                  Dashboard
                </h2>

                <p className="text-gray-500 text-base md:text-lg mt-4">
                  Estadísticas reales del historial de pedidos.
                </p>
              </div>

              <button
                onClick={obtenerDatos}
                className="btn-primary"
              >
                Actualizar
              </button>

            </div>

            {cargando && (
              <div className="section-card mb-8 text-zinc-500 font-bold">
                Cargando historial...
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">

              <div className="rounded-[32px] p-6 md:p-8 bg-[#D9F5F8] min-h-[180px] flex flex-col justify-between">
                <h3 className="text-gray-700 text-lg md:text-xl font-semibold">
                  Total ventas
                </h3>

                <p className="text-4xl md:text-5xl font-black mt-6">
                  {moneda(resumen.totalVentas)}
                </p>
              </div>

              <div className="rounded-[32px] p-6 md:p-8 bg-[#FFF0B8] min-h-[180px] flex flex-col justify-between">
                <h3 className="text-gray-700 text-lg md:text-xl font-semibold">
                  Anticipos
                </h3>

                <p className="text-4xl md:text-5xl font-black mt-6">
                  {moneda(resumen.totalAnticipos)}
                </p>
              </div>

              <div className="rounded-[32px] p-6 md:p-8 bg-[#FFE0E0] min-h-[180px] flex flex-col justify-between">
                <h3 className="text-gray-700 text-lg md:text-xl font-semibold">
                  Pedidos hoy
                </h3>

                <p className="text-4xl md:text-5xl font-black mt-6">
                  {resumen.pedidosHoy}
                </p>
              </div>

              <div className="rounded-[32px] p-6 md:p-8 bg-[#FFF0B8] min-h-[180px] flex flex-col justify-between">
                <h3 className="text-gray-700 text-lg md:text-xl font-semibold">
                  Pendientes
                </h3>

                <p className="text-4xl md:text-5xl font-black mt-6">
                  {resumen.estados.pendiente || 0}
                </p>
              </div>

              <div className="rounded-[32px] p-6 md:p-8 bg-[#DDF5EA] min-h-[180px] flex flex-col justify-between">
                <h3 className="text-gray-700 text-lg md:text-xl font-semibold">
                  Pagados
                </h3>

                <p className="text-4xl md:text-5xl font-black mt-6">
                  {resumen.pagos.pagado || 0}
                </p>
              </div>

            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-10">

              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-6 md:p-8 shadow-sm">
                <h3 className="text-3xl md:text-4xl font-black text-cyan-500 mb-8">
                  Ventas últimos 7 días
                </h3>

                <div className="h-[260px] flex items-end gap-3">
                  {resumen.ventasPorDia.map((dia) => (
                    <div
                      key={dia.dia}
                      className="flex-1 flex flex-col items-center justify-end gap-3 min-w-0"
                    >
                      <div className="text-xs font-black text-zinc-500">
                        {dia.total > 0
                          ? moneda(dia.total)
                          : "$0"}
                      </div>

                      <div className="w-full h-[190px] bg-[#FFF0B8] rounded-t-2xl flex items-end overflow-hidden">
                        <div
                          className="w-full bg-cyan-500 rounded-t-2xl transition-all"
                          style={{
                            height: `${porcentaje(
                              dia.total,
                              maxVentasDia
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="text-xs font-bold text-zinc-500 truncate">
                        {formatearDia(dia.dia)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-6 md:p-8 shadow-sm">
                <h3 className="text-3xl md:text-4xl font-black text-[#F08C8C] mb-8">
                  Estado de pedidos
                </h3>

                <div className="space-y-6">
                  {[
                    ["pendiente", "Pendientes", "bg-yellow-300"],
                    ["entregado", "Entregados", "bg-[#CDB4DB]"],
                  ].map(([estado, etiqueta, color]) => {
                    const cantidad =
                      resumen.estados[estado] || 0

                    return (
                      <div key={estado}>
                        <div className="flex items-center justify-between gap-4 mb-3 font-bold">
                          <span>{etiqueta}</span>
                          <span>{cantidad}</span>
                        </div>

                        <div className="h-6 rounded-full bg-[#F8EFEA] overflow-hidden">
                          <div
                            className={`${color} h-full rounded-full`}
                            style={{
                              width: `${porcentaje(
                                cantidad,
                                totalEstados
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-6 md:p-8 shadow-sm">
                <h3 className="text-3xl md:text-4xl font-black text-cyan-500 mb-8">
                  Productos más vendidos
                </h3>

                <div className="space-y-6">
                  {resumen.productosTop.length === 0 && (
                    <p className="text-zinc-500 font-bold">
                      Aún no hay productos vendidos.
                    </p>
                  )}

                  {resumen.productosTop.map((producto) => (
                    <div key={producto.nombre}>
                      <div className="flex items-center justify-between gap-4 mb-3 font-bold">
                        <span className="truncate">
                          {producto.nombre}
                        </span>
                        <span>{producto.cantidad}</span>
                      </div>

                      <div className="h-5 rounded-full bg-[#FFE0DD] overflow-hidden">
                        <div
                          className="bg-cyan-500 h-full rounded-full"
                          style={{
                            width: `${porcentaje(
                              producto.cantidad,
                              maxProductos
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-6 md:p-8 shadow-sm">
                <h3 className="text-3xl md:text-4xl font-black text-[#F08C8C] mb-8">
                  Modalidades
                </h3>

                <div className="space-y-6">
                  {resumen.modalidadesTop.length === 0 && (
                    <p className="text-zinc-500 font-bold">
                      Aún no hay modalidades registradas.
                    </p>
                  )}

                  {resumen.modalidadesTop.map((modalidad) => (
                    <div key={modalidad.nombre}>
                      <div className="flex items-center justify-between gap-4 mb-3 font-bold">
                        <span className="truncate">
                          {modalidad.nombre}
                        </span>
                        <span>{modalidad.cantidad}</span>
                      </div>

                      <div className="h-5 rounded-full bg-[#FFF0B8] overflow-hidden">
                        <div
                          className="bg-[#F08C8C] h-full rounded-full"
                          style={{
                            width: `${porcentaje(
                              modalidad.cantidad,
                              maxModalidades
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">

              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-6 md:p-8 shadow-sm">
                <h3 className="text-3xl md:text-4xl font-black text-cyan-500 mb-8">
                  Categorías
                </h3>

                <div className="space-y-6">
                  {resumen.categoriasTop.length === 0 && (
                    <p className="text-zinc-500 font-bold">
                      Aún no hay categorías en pedidos.
                    </p>
                  )}

                  {resumen.categoriasTop.map((categoria) => (
                    <div key={categoria.nombre}>
                      <div className="flex items-center justify-between gap-4 mb-3 font-bold">
                        <span className="truncate">
                          {categoria.nombre}
                        </span>
                        <span>{categoria.cantidad}</span>
                      </div>

                      <div className="h-5 rounded-full bg-[#D9F5F8] overflow-hidden">
                        <div
                          className="bg-[#20B8C9] h-full rounded-full"
                          style={{
                            width: `${porcentaje(
                              categoria.cantidad,
                              maxCategorias
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-[#F4D4CF] p-6 md:p-8 shadow-sm">
                <h3 className="text-3xl md:text-4xl font-black text-cyan-500 mb-8">
                  Actividad reciente
                </h3>

                <div className="space-y-5">
                  {resumen.recientes.length === 0 && (
                    <p className="text-zinc-500 font-bold">
                      Aún no hay pedidos guardados.
                    </p>
                  )}

                  {resumen.recientes.map((pedido) => (
                    <div
                      key={pedido.id}
                      className="border-b border-[#F4D4CF] pb-5 last:border-b-0"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <p className="font-bold text-lg">
                          {pedido.cliente || "Sin cliente"}
                        </p>

                        <span className="font-black text-cyan-600">
                          {moneda(numero(pedido.total))}
                        </span>
                      </div>

                      <p className="text-gray-500 mt-2">
                        {obtenerEstadoEntrega(pedido)}
                        {" · "}
                        {obtenerEstadoPago(pedido)}
                        {" · "}
                        {formatearDia(
                          obtenerClaveFecha(
                            obtenerFechaPedido(pedido)
                          )
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </main>

        </div>

      </div>

    </div>

  )
}
