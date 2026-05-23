"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import {
  moneda,
  numero,
  obtenerPrecioDesde,
  type Escala,
} from "../lib/pricing"

type ProductoPreview = {
  id: number
  nombre: string
  categoria?: string
  imagenes?: string[]
  tamano_id?: number
  precio_menudeo?: number
  precio?: number
  nuevo?: boolean
  mas_vendido?: boolean
}

const BENEFICIOS = [
  {
    icon: "🎨",
    title: "Personaliza tu pedido",
    desc: "Escoge personajes, colores y modalidades a tu gusto.",
  },
  {
    icon: "📦",
    title: "Precios por volumen",
    desc: "Descuentos automáticos según la cantidad que pidas.",
  },
  {
    icon: "🎉",
    title: "Ideal para eventos",
    desc: "Fiestas, bautizos, bodas y mucho más con tu sello único.",
  },
]

export default function Home() {
  const [productos, setProductos] = useState<ProductoPreview[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [tamanos, setTamanos] = useState<{ id: number; nombre: string }[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargarDatos = async () => {
      const [productosRes, escalasRes, tamanosRes] = await Promise.all([
        supabase
          .from("productos")
          .select(
            "id,nombre,categoria,imagenes,tamano_id,precio_menudeo,precio,nuevo,mas_vendido"
          )
          .order("id", { ascending: false })
          .limit(8),
        supabase.from("escalas").select("*"),
        supabase.from("tamanos").select("id,nombre").order("nombre"),
      ])
      if (productosRes.data) setProductos(productosRes.data as ProductoPreview[])
      if (escalasRes.data) setEscalas(escalasRes.data as Escala[])
      if (tamanosRes.data) setTamanos(tamanosRes.data)
      setCargando(false)
    }
    void cargarDatos()
  }, [])

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="py-10 md:py-16">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

          <div className="flex-1 text-center lg:text-left">
            <p className="text-sm font-black uppercase tracking-widest text-[#F49B93] mb-3">
              Alcancías artesanales
            </p>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#20B8C9] leading-[1.05]">
              Imagina, pinta y disfruta con TUCHIS
            </h1>

            <p className="text-gray-500 text-lg md:text-xl mt-5 max-w-xl mx-auto lg:mx-0">
              Alcancías listas para fiestas, regalos y momentos creativos.
              Elige tus personajes favoritos y arma tu pedido en minutos.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center lg:justify-start">
              <Link
                href="/catalogo"
                className="bg-[#20B8C9] text-white px-8 py-4 rounded-2xl font-black
                           text-lg hover:bg-[#17A7B8] active:scale-[.97] transition-all
                           text-center shadow-lg shadow-cyan-200/60"
              >
                Ver catálogo
              </Link>

              <Link
                href="/mis-pedidos"
                className="bg-white text-[#20B8C9] border-2 border-[#20B8C9] px-8 py-4
                           rounded-2xl font-black text-lg hover:bg-[#D9F5F8] transition
                           text-center"
              >
                Consultar mis pedidos
              </Link>
            </div>
          </div>

          {/* Decorative pastel blocks (desktop only) */}
          <div className="hidden lg:flex gap-4 flex-shrink-0" aria-hidden>
            <div className="flex flex-col gap-4">
              <div className="w-[180px] h-[200px] bg-[#FFE0DD] rounded-[32px]" />
              <div className="w-[180px] h-[120px] bg-[#D9F5F8] rounded-[32px]" />
            </div>
            <div className="flex flex-col gap-4 mt-8">
              <div className="w-[180px] h-[120px] bg-[#FFF0B8] rounded-[32px]" />
              <div className="w-[180px] h-[200px] bg-[#E0D5FF] rounded-[32px]" />
            </div>
          </div>

        </div>
      </section>

      {/* ── Beneficios ── */}
      <section className="pb-12 md:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BENEFICIOS.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-[28px] border border-[#F4D4CF] p-6 flex flex-col gap-3"
            >
              <span className="text-3xl">{icon}</span>
              <h3 className="font-black text-lg text-[#20B8C9]">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Productos destacados ── */}
      <section className="pb-12 md:pb-16">
        <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
          <h2 className="text-3xl md:text-5xl font-black text-[#20B8C9]">
            Nuestras alcancías
          </h2>
          <Link
            href="/catalogo"
            className="text-sm font-black text-[#20B8C9] hover:underline whitespace-nowrap"
          >
            Ver todas →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {cargando
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-[22px] overflow-hidden border border-[#F8D6D0]"
                >
                  <div className="aspect-square skeleton-shimmer" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 skeleton-shimmer rounded-full w-1/3" />
                    <div className="h-5 skeleton-shimmer rounded-full w-3/4" />
                    <div className="h-8 skeleton-shimmer rounded-full w-1/2 mt-2" />
                    <div className="h-12 skeleton-shimmer rounded-2xl mt-3" />
                  </div>
                </div>
              ))
            : productos.map((producto) => {
                const tamanoId = Number(producto.tamano_id) || 0
                const precioDesde =
                  tamanoId > 0 && escalas.length > 0
                    ? obtenerPrecioDesde(escalas, tamanoId)
                    : numero(producto.precio_menudeo || producto.precio || 0)
                const tamanoNombre =
                  tamanoId > 0
                    ? (tamanos.find((t) => t.id === tamanoId)?.nombre ?? "")
                    : ""

                return (
                  <Link
                    key={producto.id}
                    href="/catalogo"
                    className="bg-white rounded-[22px] md:rounded-[26px] overflow-hidden
                               shadow-md border border-[#F8D6D0] product-card-hover block"
                  >
                    <div className="relative">
                      <img
                        src={producto.imagenes?.[0] || "/logo.png"}
                        alt={producto.nombre}
                        loading="lazy"
                        className="w-full aspect-square object-cover"
                      />
                      {(producto.nuevo || producto.mas_vendido) && (
                        <div className="absolute left-2 top-2 md:left-3 md:top-3 flex flex-wrap gap-1.5">
                          {producto.nuevo && (
                            <span className="bg-white/90 backdrop-blur px-2 md:px-3 py-0.5 md:py-1
                                             rounded-full text-[10px] md:text-xs font-black uppercase
                                             text-[#20B8C9] shadow">
                              Nuevo
                            </span>
                          )}
                          {producto.mas_vendido && (
                            <span className="bg-white/90 backdrop-blur px-2 md:px-3 py-0.5 md:py-1
                                             rounded-full text-[10px] md:text-xs font-black uppercase
                                             text-[#20B8C9] shadow">
                              Más vendido
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-3 sm:p-4 md:p-5">
                      <p className="text-pink-400 font-bold text-[10px] sm:text-xs uppercase">
                        {producto.categoria}
                      </p>

                      <h3 className="text-lg sm:text-xl md:text-2xl font-black text-[#20B8C9]
                                     mt-1.5 leading-tight break-words">
                        {producto.nombre}
                      </h3>

                      <div className="mt-3 md:mt-4 space-y-1">
                        <p className="text-[10px] sm:text-xs font-black uppercase text-gray-400">
                          Precio desde
                        </p>
                        <p className="text-2xl md:text-3xl font-black text-[#F49B93]">
                          {moneda(precioDesde)}
                        </p>
                        {tamanoNombre && (
                          <p className="text-xs sm:text-sm font-bold text-[#20B8C9] truncate">
                            {tamanoNombre}
                          </p>
                        )}
                      </div>

                      <div className="w-full mt-4 bg-[#20B8C9] text-white py-3 sm:py-4
                                      rounded-2xl font-black text-sm sm:text-base text-center">
                        Ver en catálogo
                      </div>
                    </div>
                  </Link>
                )
              })}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="pb-16 md:pb-24">
        <div className="bg-[#D9F5F8] rounded-[32px] p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-[#20B8C9]">
            ¿Lista para armar tu pedido?
          </h2>
          <p className="text-gray-600 mt-3 text-base md:text-lg max-w-lg mx-auto">
            Explora todo el catálogo, agrega al carrito y genera tu pedido en minutos.
          </p>
          <Link
            href="/catalogo"
            className="inline-block mt-8 bg-[#20B8C9] text-white px-10 py-4 rounded-2xl
                       font-black text-lg hover:bg-[#17A7B8] active:scale-[.97] transition-all
                       shadow-lg shadow-cyan-200/60"
          >
            Ver catálogo completo
          </Link>
        </div>
      </section>

    </div>
  )
}
