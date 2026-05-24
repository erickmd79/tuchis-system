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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#FFF7F4" }}>
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <div className="text-6xl mb-3">🐷</div>
          <h1 className="text-4xl font-bold" style={{ color: "#FF5C8A" }}>
            TUCHIS
          </h1>
          <p className="mt-1 font-medium" style={{ color: "#7D7288" }}>
            Panel administrativo
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border p-8 space-y-5" style={{ borderColor: "#FFE4EC" }}>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "#3F334A" }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="admin@tuchis.com"
              className="w-full p-4 rounded-2xl border bg-white focus:outline-none transition"
              style={{ borderColor: "#FFD0DC" }}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "#3F334A" }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              className="w-full p-4 rounded-2xl border bg-white focus:outline-none transition"
              style={{ borderColor: "#FFD0DC" }}
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
            className="w-full disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-lg transition hover:opacity-90"
            style={{ background: "#FF5C8A" }}
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
