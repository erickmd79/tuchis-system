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

// Cycling pastel backgrounds for product image areas
const CARD_BG = [
  "#FFE4EC",
  "#BFF3DF",
  "#EFE9FF",
  "#FFD8C2",
  "#FFECA8",
  "#FFE4EC",
  "#EFE9FF",
  "#BFF3DF",
]

const BENEFICIOS = [
  {
    icon: "✏️",
    bg: "#BFF3DF",
    title: "Personaliza tu pedido",
    desc: "Elige, combina y crea alcancías únicas.",
  },
  {
    icon: "🪙",
    bg: "#FFD8C2",
    title: "Precios por volumen",
    desc: "Más cantidad, mejor precio para ti.",
  },
  {
    icon: "🎈",
    bg: "#EFE9FF",
    title: "Ideal para eventos",
    desc: "Perfectas para fiestas, talleres y regalos.",
  },
]

export default function Home() {
  const [productos, setProductos] = useState<ProductoPreview[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [tamanos, setTamanos] = useState<{ id: number; nombre: string }[]>([])
  const [cargando, setCargando] = useState(true)
  const [heroError, setHeroError] = useState(false)

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
    <div className="min-h-screen bg-[#FFF7F4]">

      {/* ── Hero ── */}
      <section
        className="rounded-[28px] md:rounded-[36px] mb-5 md:mb-8 overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #FFE4EC 0%, #FFF0F4 55%, #FFF7F4 100%)",
        }}
      >
        {/* Soft decorative blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 w-96 h-96 rounded-full opacity-40"
          style={{
            background: "#FFD8C2",
            filter: "blur(80px)",
            transform: "translate(30%, -30%)",
          }}
        />

        {/* Content grid: text | image */}
        <div className="grid grid-cols-2 lg:grid-cols-[1fr_460px] items-end gap-2 lg:gap-0 px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12">

          {/* Left: text + desktop CTAs */}
          <div className="flex flex-col pb-6 lg:pb-12">
            <h1
              className="font-black leading-[1.05] text-[1.6rem] sm:text-4xl md:text-5xl lg:text-6xl"
              style={{ color: "#3F334A" }}
            >
              Imagina, pinta y disfruta con{" "}
              <span style={{ color: "#FF5C8A" }}>TUCHIS</span>
            </h1>

            <p
              className="mt-3 lg:mt-4 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed max-w-[30ch] sm:max-w-[36ch]"
              style={{ color: "#7D7288" }}
            >
              Alcancías listas para fiestas, regalos y momentos creativos.
              Elige tus personajes favoritos y arma tu pedido en minutos.
            </p>

            {/* Desktop CTAs */}
            <div className="hidden sm:flex flex-wrap gap-3 mt-6 lg:mt-8">
              <Link
                href="/catalogo"
                className="flex items-center gap-2 text-white font-black px-6 py-3 lg:px-8 lg:py-4 rounded-2xl text-sm lg:text-base transition-all active:scale-[.97] shadow-lg"
                style={{ background: "#FF5C8A", boxShadow: "0 8px 24px #FF5C8A44" }}
              >
                ✦ Ver catálogo
              </Link>
              <Link
                href="/mis-pedidos"
                className="flex items-center gap-2 font-black px-6 py-3 lg:px-8 lg:py-4 rounded-2xl border-2 text-sm lg:text-base transition hover:bg-white bg-white/60"
                style={{ color: "#3F334A", borderColor: "#E0D0D6" }}
              >
                📋 Consultar mis pedidos
              </Link>
            </div>
          </div>

          {/* Right: hero image */}
          <div className="flex items-end justify-center">
            {!heroError ? (
              <img
                src="/images/hero-tuchis.png"
                alt="Alcancías TUCHIS — personajes para fiestas y regalos"
                onError={() => setHeroError(true)}
                className="w-full object-contain object-bottom drop-shadow-xl"
                style={{ maxWidth: "460px", maxHeight: "400px" }}
              />
            ) : (
              /* Placeholder until hero-tuchis.png is uploaded to public/images/ */
              <div
                className="w-full max-w-[220px] lg:max-w-[360px] aspect-square rounded-[28px]
                           flex flex-col items-center justify-center gap-3 mb-6"
                style={{ background: "#FFE4EC" }}
              >
                <span className="text-5xl">🪆</span>
                <p
                  className="text-[10px] sm:text-xs font-bold text-center px-4"
                  style={{ color: "#7D7288" }}
                >
                  Coloca la imagen en<br />
                  <code className="font-mono">public/images/hero-tuchis.png</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile CTAs (below image) */}
        <div className="flex flex-col gap-3 px-5 pt-3 pb-6 sm:hidden">
          <Link
            href="/catalogo"
            className="flex items-center justify-center gap-2 text-white font-black px-6 py-4 rounded-2xl text-base transition-all active:scale-[.97]"
            style={{ background: "#FF5C8A", boxShadow: "0 6px 20px #FF5C8A44" }}
          >
            ✦ Ver catálogo
          </Link>
          <Link
            href="/mis-pedidos"
            className="flex items-center justify-center gap-2 font-black px-6 py-4 rounded-2xl border-2 text-base bg-white"
            style={{ color: "#3F334A", borderColor: "#E0D0D6" }}
          >
            📋 Consultar mis pedidos
          </Link>
        </div>
      </section>

      {/* ── Beneficios ── */}
      <section className="grid grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-8">
        {BENEFICIOS.map(({ icon, bg, title, desc }) => (
          <div
            key={title}
            className="bg-white rounded-[18px] md:rounded-[24px] border p-3 sm:p-4 md:p-5
                       flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4"
            style={{ borderColor: "#F0E6E6" }}
          >
            <div
              className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full flex-shrink-0
                         flex items-center justify-center text-base sm:text-lg md:text-xl"
              style={{ background: bg }}
            >
              {icon}
            </div>
            <div>
              <h3
                className="font-black text-[10px] sm:text-xs md:text-sm lg:text-base leading-tight"
                style={{ color: "#3F334A" }}
              >
                {title}
              </h3>
              <p
                className="hidden sm:block text-[10px] sm:text-xs md:text-sm mt-0.5 leading-relaxed"
                style={{ color: "#7D7288" }}
              >
                {desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Productos destacados ── */}
      <section className="mb-5 md:mb-8">
        <div className="flex items-center justify-between gap-4 mb-4 md:mb-6">
          <h2
            className="text-xl sm:text-2xl md:text-4xl font-black"
            style={{ color: "#3F334A" }}
          >
            Nuestras alcancías ✨
          </h2>
          <Link
            href="/catalogo"
            className="text-xs sm:text-sm font-black whitespace-nowrap hover:underline"
            style={{ color: "#FF5C8A" }}
          >
            Ver todas →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cargando
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-[16px] border p-3 flex gap-3 items-center"
                  style={{ borderColor: "#F0E6E6" }}
                >
                  <div className="w-[72px] h-[72px] lg:w-[96px] lg:h-[96px] rounded-[12px] skeleton-shimmer flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton-shimmer rounded-full w-3/4" />
                    <div className="h-3 skeleton-shimmer rounded-full w-1/2" />
                    <div className="h-6 skeleton-shimmer rounded-full w-2/3" />
                  </div>
                </div>
              ))
            : productos.map((producto, i) => {
                const tamanoId = Number(producto.tamano_id) || 0
                const precioDesde =
                  tamanoId > 0 && escalas.length > 0
                    ? obtenerPrecioDesde(escalas, tamanoId)
                    : numero(producto.precio_menudeo || producto.precio || 0)

                return (
                  <Link
                    key={producto.id}
                    href="/catalogo"
                    className="bg-white rounded-[16px] border p-3 flex items-center gap-3
                               transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{ borderColor: "#F0E6E6" }}
                  >
                    {/* Image with pastel background */}
                    <div
                      className="w-[72px] h-[72px] lg:w-[96px] lg:h-[96px] rounded-[12px]
                                 overflow-hidden flex-shrink-0"
                      style={{ background: CARD_BG[i % CARD_BG.length] }}
                    >
                      <img
                        src={producto.imagenes?.[0] || "/logo.png"}
                        alt={producto.nombre}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-black text-xs sm:text-sm lg:text-base leading-tight line-clamp-2"
                        style={{ color: "#3F334A" }}
                      >
                        {producto.nombre}
                      </h3>
                      <p className="text-[10px] sm:text-xs mt-1" style={{ color: "#7D7288" }}>
                        Desde {moneda(precioDesde)}
                      </p>
                      <div
                        className="mt-2 inline-block border rounded-full px-2 sm:px-3 py-0.5 sm:py-1
                                   text-[10px] sm:text-xs font-bold"
                        style={{ borderColor: "#FF5C8A", color: "#FF5C8A" }}
                      >
                        Ver más
                      </div>
                    </div>
                  </Link>
                )
              })}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="mb-8 md:mb-12">
        <div
          className="rounded-[28px] p-6 md:p-10 flex flex-col md:flex-row items-center
                     justify-between gap-5 md:gap-8 relative overflow-hidden"
          style={{ background: "#FFE4EC" }}
        >
          {/* Decorative blob */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 bottom-0 w-48 h-48 rounded-full opacity-30"
            style={{ background: "#FF5C8A", filter: "blur(60px)", transform: "translate(40%, 40%)" }}
          />

          <div className="flex items-center gap-4 relative">
            <span className="text-4xl hidden sm:block" aria-hidden>🎨</span>
            <div>
              <h2
                className="text-lg sm:text-xl md:text-3xl font-black text-center md:text-left"
                style={{ color: "#3F334A" }}
              >
                Crea momentos inolvidables con TUCHIS
              </h2>
              <p
                className="text-sm md:text-base mt-1 text-center md:text-left"
                style={{ color: "#7D7288" }}
              >
                Arma tu pedido en minutos y recibe alcancías listas para pintar, regalar y disfrutar.
              </p>
            </div>
          </div>

          <Link
            href="/catalogo"
            className="relative flex-shrink-0 flex items-center gap-2 text-white font-black
                       px-8 py-4 rounded-2xl text-base transition-all active:scale-[.97] whitespace-nowrap"
            style={{ background: "#FF5C8A", boxShadow: "0 8px 24px #FF5C8A44" }}
          >
            ✦ Ver catálogo completo
          </Link>
        </div>
      </section>

    </div>
  )
}
