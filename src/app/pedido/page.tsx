"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import PedidoPageClient from "./PedidoPageClient"

export default function PedidoPage() {
  const router = useRouter()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/login")
      else setOk(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ok) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <p className="text-gray-400 font-bold text-lg">
          Verificando sesión…
        </p>
      </div>
    )
  }

  return <PedidoPageClient />
}
