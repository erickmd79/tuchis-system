import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
const ADMIN_EMAIL = "tuchis.alcancias@gmail.com"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret")
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const pedido = body?.record ?? body
  const nombre = pedido?.nombre ?? "Sin nombre"
  const telefono = pedido?.telefono ?? "—"
  const total = pedido?.total ? `$${Number(pedido.total).toLocaleString("es-MX")}` : "—"
  const anticipo = pedido?.anticipo ? `$${Number(pedido.anticipo).toLocaleString("es-MX")}` : "$0"
  const fecha = pedido?.fecha ?? "—"
  const notas = pedido?.notas ?? "—"
  const modalidad = pedido?.modalidad ?? "—"

  try {
    await resend.emails.send({
      from: "Tuchis Alcancias <notificaciones@tuchisalcancias.com>",
      to: ADMIN_EMAIL,
      subject: `🛎️ Nuevo pedido: ${nombre}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h1 style="color:#FF5C8A;font-size:28px;margin-bottom:4px">Nuevo pedido</h1>
          <p style="color:#7D7288;margin-top:0">Tuchis Alcancias · Sistema de pedidos</p>
          <table style="width:100%;border-collapse:collapse;margin-top:20px">
            <tr><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;color:#7D7288;width:140px">Cliente</td><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;font-weight:700;color:#3F334A">${nombre}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;color:#7D7288">Teléfono</td><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;font-weight:700;color:#3F334A">${telefono}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;color:#7D7288">Modalidad</td><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;font-weight:700;color:#3F334A">${modalidad}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;color:#7D7288">Fecha entrega</td><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;font-weight:700;color:#3F334A">${fecha}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;color:#7D7288">Total</td><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;font-weight:700;color:#3F334A">${total}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;color:#7D7288">Anticipo</td><td style="padding:10px 0;border-bottom:1px solid #FFE4EC;font-weight:700;color:#3F334A">${anticipo}</td></tr>
            <tr><td style="padding:10px 0;color:#7D7288">Notas</td><td style="padding:10px 0;font-weight:700;color:#3F334A">${notas}</td></tr>
          </table>
          <p style="margin-top:28px;font-size:13px;color:#B9A7F5">Este mensaje fue generado automáticamente por el sistema de pedidos de Tuchis Alcancias.</p>
        </div>
      `,
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("Error enviando email:", err)
    return NextResponse.json({ error: err?.message ?? "Email error" }, { status: 500 })
  }
}
