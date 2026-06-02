"use client"

import { moneda, numero } from "../../lib/pricing"

// ─── helpers ───────────────────────────────────────────────────────────────

const esc = (valor: unknown): string =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

const formatFecha = (valor?: string): string => {
  if (!valor) return ""
  const soloFecha = String(valor).split("T")[0]
  const [anio, mes, dia] = soloFecha.split("-").map(Number)
  if (!anio || !mes || !dia) return String(valor)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// Pastel badge colors
const colorPago = (estado: string) => {
  if (estado === "pagado")
    return { bg: "#DDF5EA", color: "#238657", border: "#BFEAD8" }
  if (estado === "anticipo")
    return { bg: "#FFE0DD", color: "#C65E67", border: "#FFC8C2" }
  return { bg: "#FFF0B8", color: "#8A6A00", border: "#FFE28A" }
}

const colorEntrega = (estado: string) => {
  if (estado === "entregado")
    return { bg: "#E7D9FF", color: "#6D4AA8", border: "#D7C3FF" }
  return { bg: "#FFF0B8", color: "#8A6A00", border: "#FFE28A" }
}

// ─── template ──────────────────────────────────────────────────────────────

function buildHTML(pedido: any, origen: string): string {
  const folio = `TCH-${pedido.id}`
  const hoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const fechaPedido =
    formatFecha(
      pedido.fecha_pedido ||
      pedido.created_at ||
      pedido.fecha_creacion
    ) || "—"
  const fechaEntrega =
    formatFecha(pedido.fecha || pedido.fecha_entrega) || "—"

  const estadoEntrega =
    pedido.estado === "entregado" ? "entregado" : "pendiente"
  const estadoPago: string = (() => {
    if (pedido.estado_pago === "pagado") return "pagado"
    return numero(pedido.anticipo) > 0 ? "anticipo" : "pendiente"
  })()
  const anticipoVal = Math.max(0, numero(pedido.anticipo))
  const abono1Val = Math.max(0, numero(pedido.abono_1 ?? pedido.abono))
  const abono2Val = Math.max(0, numero(pedido.abono_2))
  const saldoVal =
    estadoPago === "pagado"
      ? 0
      : Math.max(numero(pedido.total) - anticipoVal - abono1Val - abono2Val, 0)

  const cpago = colorPago(estadoPago)
  const centrega = colorEntrega(estadoEntrega)

  const productos: any[] = Array.isArray(pedido.productos)
    ? pedido.productos
    : []

  // ── product table ──
  const thCell = (align: string) =>
    `text-align:${align};padding:8px 10px;font-weight:900;font-size:11px;` +
    `text-transform:uppercase;letter-spacing:.06em;color:#3F334A;` +
    `border-bottom:2px solid #FFD0DC;white-space:nowrap;`

  const productosHTML = (() => {
    if (productos.length === 0) return ""

    const filas = productos
      .map((p: any, i: number) => {
        const tamanoLabel = esc(p.tamano_nombre || p.tamano || "—")
        const modalidad = esc(p.modalidad || "—")
        const precioUnitario = numero(p.precio_unitario || p.precio)
        const subtotal = precioUnitario * numero(p.cantidad)
        const rowBg = i % 2 === 0 ? "#FFFFFF" : "#FFF5F7"
        const td = (align: string, extra = "") =>
          `text-align:${align};padding:7px 10px;font-size:13px;` +
          `color:#3F334A;border-bottom:1px solid #FFE8ED;vertical-align:middle;${extra}`

        return `
          <tr style="background:${rowBg};">
            <td style="${td("center", "font-weight:900;")}">${numero(p.cantidad)}</td>
            <td style="${td("left", "font-weight:900;word-break:break-word;")}">${esc(p.nombre)}</td>
            <td style="${td("left", "color:#999;font-size:12px;")}">${tamanoLabel}</td>
            <td style="${td("left", "color:#999;font-size:12px;")}">${modalidad}</td>
            <td style="${td("right", "white-space:nowrap;font-size:12px;color:#666;")}">${moneda(precioUnitario)}</td>
            <td style="${td("right", "font-weight:900;color:#F49B93;white-space:nowrap;")}">${moneda(subtotal)}</td>
          </tr>`
      })
      .join("")

    return `
      <div style="border:1px solid #FFD0DC;border-radius:14px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#FFE4EC;">
              <th style="${thCell("center")}">Pzas.</th>
              <th style="${thCell("left")}">Producto</th>
              <th style="${thCell("left")}">Tamaño</th>
              <th style="${thCell("left")}">Modalidad</th>
              <th style="${thCell("right")}">Precio c/u</th>
              <th style="${thCell("right")}">Subtotal</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`
  })()

  // ── info card helper ──
  const card = (label: string, value: string) => `
    <div style="
      background:white;
      border:1px solid #F5D3CD;
      border-radius:14px;
      padding:10px 14px;
    ">
      <div style="
        font-size:10px;
        font-weight:900;
        text-transform:uppercase;
        letter-spacing:.06em;
        color:#bbb;
        margin-bottom:4px;
      ">${label}</div>
      <div style="
        font-size:15px;
        font-weight:900;
        color:#2B2B2B;
        word-break:break-word;
        line-height:1.2;
      ">${value}</div>
    </div>
  `

  const badge = (text: string, c: {bg:string;color:string;border:string}) => `
    <span style="
      display:inline-block;
      background:${c.bg};
      color:${c.color};
      border:1.5px solid ${c.border};
      border-radius:999px;
      padding:3px 12px;
      font-size:11px;
      font-weight:900;
      text-transform:uppercase;
      letter-spacing:.04em;
    ">${text}</span>
  `

  return /* html */ `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{
      width:800px;
      background:#FFF8F5;
      font-family:Arial,Helvetica,sans-serif;
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
    }
    @media print {
      @page { size: letter portrait; margin: 10mm 12mm; }
      body { width: 100% !important; background: #FFF8F5 !important; }
    }
  </style>
</head>
<body>

<!-- ─ HEADER ─────────────────────────────────────────────────────── -->
<div style="
  background:linear-gradient(135deg,#20B8C9 0%,#F8B4C0 100%);
  padding:22px 32px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
  border-radius:0 0 28px 28px;
">
  <!-- Logo -->
  <div style="
    background:white;
    border-radius:14px;
    padding:8px 18px;
    flex-shrink:0;
  ">
    <img
      src="${origen}/logo.png"
      style="height:44px;width:auto;display:block;"
      alt="TUCHIS"
    />
  </div>

  <!-- Title -->
  <div style="text-align:center;color:white;flex:1;">
    <div style="font-size:34px;font-weight:900;line-height:1;">Pedido</div>
    <div style="font-size:13px;font-weight:700;opacity:.82;margin-top:3px;">
      TUCHIS alcancías
    </div>
  </div>

  <!-- Folio -->
  <div style="text-align:right;color:white;flex-shrink:0;">
    <div style="
      font-size:10px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:.08em;
      opacity:.75;
    ">Folio</div>
    <div style="font-size:26px;font-weight:900;line-height:1.15;">${esc(folio)}</div>
    <div style="font-size:11px;opacity:.75;margin-top:3px;">${hoy}</div>
  </div>
</div>

<!-- ─ CONTENT ────────────────────────────────────────────────────── -->
<div style="padding:22px 28px;">

  <!-- Info grid -->
  <div style="
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:10px;
    margin-bottom:18px;
  ">

    <!-- Cliente -->
    <div style="
      background:white;
      border:1px solid #F5D3CD;
      border-radius:14px;
      padding:10px 14px;
    ">
      <div style="
        font-size:10px;font-weight:900;
        text-transform:uppercase;letter-spacing:.06em;color:#bbb;margin-bottom:4px;
      ">Cliente</div>
      <div style="
        font-size:19px;font-weight:900;color:#20B8C9;
        word-break:break-word;line-height:1.15;
      ">${esc(pedido.cliente)}</div>
    </div>

    ${card("Teléfono", esc(pedido.telefono))}

    ${pedido.email ? card("Email", esc(pedido.email)) : ""}

    <!-- Entrega -->
    <div style="
      background:white;
      border:1px solid #F5D3CD;
      border-radius:14px;
      padding:10px 14px;
    ">
      <div style="
        font-size:10px;font-weight:900;
        text-transform:uppercase;letter-spacing:.06em;color:#bbb;margin-bottom:6px;
      ">Entrega</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${badge("PENDIENTE", estadoEntrega !== "entregado"
          ? { bg: "#FFF0B8", color: "#8A6A00", border: "#FFE28A" }
          : { bg: "#F5F5F5", color: "#BBBBBB", border: "#E8E8E8" })}
        ${badge("ENTREGADO", estadoEntrega === "entregado"
          ? centrega
          : { bg: "#F5F5F5", color: "#BBBBBB", border: "#E8E8E8" })}
      </div>
    </div>

    <!-- Pago -->
    <div style="
      background:white;
      border:1px solid #F5D3CD;
      border-radius:14px;
      padding:10px 14px;
    ">
      <div style="
        font-size:10px;font-weight:900;
        text-transform:uppercase;letter-spacing:.06em;color:#bbb;margin-bottom:6px;
      ">Pago</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${badge("PENDIENTE", saldoVal > 0
          ? { bg: "#FFF0B8", color: "#8A6A00", border: "#FFE28A" }
          : { bg: "#F5F5F5", color: "#BBBBBB", border: "#E8E8E8" })}
        ${badge("PAGADO", saldoVal <= 0
          ? { bg: "#DDF5EA", color: "#238657", border: "#BFEAD8" }
          : { bg: "#F5F5F5", color: "#BBBBBB", border: "#E8E8E8" })}
      </div>
    </div>

    ${card("Fecha de pedido", fechaPedido)}
    ${card("Fecha de entrega", fechaEntrega)}

    ${pedido.lugar_entrega ? card("Lugar de entrega", esc(pedido.lugar_entrega)) : ""}

    ${pedido.municipio ? card("Municipio", esc(pedido.municipio)) : ""}

  </div>

  ${
    pedido.notas
      ? `<div style="
            background:white;
            border:1px solid #F5D3CD;
            border-radius:14px;
            padding:12px 16px;
            margin-bottom:18px;
          ">
            <div style="
              font-size:10px;font-weight:900;
              text-transform:uppercase;letter-spacing:.06em;color:#bbb;margin-bottom:6px;
            ">Notas</div>
            <div style="
              font-size:13px;font-weight:700;color:#666;
              line-height:1.5;word-break:break-word;
            ">${esc(pedido.notas)}</div>
          </div>`
      : ""
  }

  <!-- Products -->
  <div style="margin-bottom:18px;">
    <div style="
      font-size:10px;
      font-weight:900;
      text-transform:uppercase;
      letter-spacing:.08em;
      color:#bbb;
      margin-bottom:10px;
    ">
      Productos &middot;
      ${productos.length} artículo${productos.length !== 1 ? "s" : ""}
    </div>
    ${productosHTML}
  </div>

  <!-- Totals bar -->
  <div style="
    background:linear-gradient(135deg,#20B8C9 0%,#1AA8B8 100%);
    border-radius:20px;
    padding:20px 28px;
    color:white;
    display:flex;
    justify-content:space-around;
    align-items:center;
    margin-bottom:20px;
  ">
    <div style="text-align:center;">
      <div style="
        font-size:10px;font-weight:700;
        text-transform:uppercase;opacity:.8;letter-spacing:.05em;margin-bottom:4px;
      ">Total</div>
      <div style="font-size:30px;font-weight:900;line-height:1;">${moneda(pedido.total)}</div>
    </div>
    <div style="width:1px;height:44px;background:rgba(255,255,255,.3);"></div>
    <div style="text-align:center;">
      <div style="
        font-size:10px;font-weight:700;
        text-transform:uppercase;opacity:.8;letter-spacing:.05em;margin-bottom:4px;
      ">Anticipo</div>
      <div style="font-size:22px;font-weight:900;line-height:1;">${moneda(anticipoVal)}</div>
    </div>
    <div style="width:1px;height:44px;background:rgba(255,255,255,.3);"></div>
    <div style="text-align:center;">
      <div style="
        font-size:10px;font-weight:700;
        text-transform:uppercase;opacity:.8;letter-spacing:.05em;margin-bottom:4px;
      ">Saldo</div>
      <div style="font-size:22px;font-weight:900;line-height:1;">${moneda(saldoVal)}</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="
    text-align:center;
    padding:14px 0 8px;
    border-top:1px solid #F5D3CD;
  ">
    <div style="
      font-size:17px;
      font-weight:900;
      color:#20B8C9;
      margin-bottom:5px;
    ">¡Gracias por tu pedido! 🎀</div>
    <div style="font-size:12px;color:#bbb;margin-bottom:2px;">
      TUCHIS alcancías · Imagina, pinta y disfruta
    </div>
    ${
      pedido.telefono
        ? `<div style="font-size:12px;color:#bbb;margin-bottom:2px;">
            WhatsApp: ${esc(pedido.telefono)}
           </div>`
        : ""
    }
    <div style="font-size:11px;color:#ddd;margin-top:6px;">
      Generado el ${hoy}
    </div>
  </div>

</div>
</body>
</html>
`
}

// ─── main export ───────────────────────────────────────────────────────────

export async function generarPDF(
  pedido: any,
  onEstado?: (estado: "generando" | "listo" | "error") => void
): Promise<void> {
  onEstado?.("generando")
  try {
    const origen = window.location.origin
    const html = buildHTML(pedido, origen)
    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const ventana = window.open(url, "_blank")
    if (!ventana) {
      // fallback: navegador bloqueó popup, descarga directa
      const a = document.createElement("a")
      const folio = `TCH-${pedido.id}`
      a.href = url
      a.download = `TUCHIS-${folio}.html`
      a.click()
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    onEstado?.("listo")
  } catch (err) {
    console.error("[generarPDF]", err)
    onEstado?.("error")
    throw err
  }
}
