"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/admin"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Completa todos los campos")
      return
    }
    setLoading(true)
    setError("")

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError("Credenciales incorrectas")
      setLoading(false)
      return
    }

    router.replace(next)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <div className="text-6xl mb-3">🐷</div>
          <h1 className="text-4xl font-bold text-[#20B8C9]">
            TUCHIS
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Panel administrativo
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-[#F8D6D0] p-8 space-y-5">

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="admin@tuchis.com"
              className="w-full p-4 rounded-2xl border border-[#F8D6D0] bg-[#FFF8F5] focus:outline-none focus:border-[#20B8C9]"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              className="w-full p-4 rounded-2xl border border-[#F8D6D0] bg-[#FFF8F5] focus:outline-none focus:border-[#20B8C9]"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium text-center">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#20B8C9] hover:bg-[#17A7B8] disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-lg transition"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>

        </div>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
