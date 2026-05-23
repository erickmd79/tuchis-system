"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)

  const iniciarSesion = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Ingresa tu correo y contraseña.")
      return
    }
    setCargando(true)
    setError("")
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setCargando(false)
    if (authError) {
      setError("Correo o contraseña incorrectos.")
      return
    }
    router.replace("/admin")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") iniciarSesion()
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center px-4">
      <div className="bg-white rounded-[32px] shadow-xl border border-[#F8D6D0] w-full max-w-[420px] p-8 md:p-10">

        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="TUCHIS alcancías"
            width={140}
            height={66}
            priority
          />
        </div>

        <h1 className="text-2xl font-black text-[#20B8C9] text-center mb-1">
          Panel de administración
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          Ingresa tus credenciales para continuar
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError("") }}
              onKeyDown={handleKeyDown}
              placeholder="admin@tuchis.mx"
              autoComplete="email"
              autoFocus
              className="w-full px-4 py-3.5 rounded-2xl border border-[#F8D6D0] bg-[#FFF8F5] focus:outline-none focus:border-[#20B8C9] text-[#2B2B2B] font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError("") }}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-2xl border border-[#F8D6D0] bg-[#FFF8F5] focus:outline-none focus:border-[#20B8C9] text-[#2B2B2B] font-medium"
            />
          </div>

          {error && (
            <p className="text-sm font-bold text-red-500 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={iniciarSesion}
            disabled={cargando}
            className="w-full bg-[#20B8C9] hover:bg-[#17A7B8] active:scale-[.98] disabled:opacity-60 text-white py-4 rounded-2xl font-black text-base transition-all mt-2 shadow-md shadow-cyan-100"
          >
            {cargando ? "Verificando…" : "Entrar"}
          </button>
        </div>

      </div>
    </div>
  )
}
