"use client"

import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

interface Props {
  className?: string
  label?: string
}

export default function AdminLogoutBtn({
  className,
  label = "Cerrar sesión",
}: Props) {
  const router = useRouter()

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <button
      type="button"
      onClick={cerrarSesion}
      className={
        className ??
        "w-full px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition bg-[#FFD6D6] text-red-700"
      }
    >
      {label}
    </button>
  )
}
