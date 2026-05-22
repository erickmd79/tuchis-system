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

const imagenProducto = (p: any): string =>
  p.imagen || p.imagenes?.[0] || ""

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
  const abonoVal = Math.max(0, numero(pedido.abono))
  const saldoVal =
    estadoPago === "pagado"
      ? 0
      : Math.max(numero(pedido.total) - anticipoVal - abonoVal, 0)

  const cpago = colorPago(estadoPago)
  const centrega = colorEntrega(estadoEntrega)

  const productos: any[] = Array.isArray(pedido.productos)
    ? pedido.productos
    : []

  // ── product rows ──
  const productosHTML = productos
    .map((p: any, i: number) => {
      const img = imagenProducto(p)
      const tamanoLabel = p.tamano_nombre || p.tamano || ""
      const detalles =
        [tamanoLabel, p.modalidad].filter(Boolean).join(" · ") ||
        "Sin especificar"
      const precioUnitario = numero(p.precio_unitario || p.precio)
      const subtotal = precioUnitario * numero(p.cantidad)

      return `
        <div style="
          display:flex;
          align-items:center;
          gap:14px;
          background:white;
          border:1px solid #F5D3CD;
          border-radius:14px;
          padding:12px 16px;
          margin-bottom:8px;
        ">
          ${
            img
              ? `<img
                  src="${esc(img)}"
                  crossorigin="anonymous"
                  style="
                    width:60px;
                    height:60px;
                    border-radius:10px;
                    object-fit:cover;
                    flex-shrink:0;
                    background:#F5EEEC;
                  "
                  onerror="this.style.display='none';document.getElementById('ph-${i}').style.display='flex';"
                />`
              : ""
          }
          <div id="ph-${i}" style="
            width:60px;
            height:60px;
            border-radius:10px;
            background:#D9F5F8;
            display:${img ? "none" : "flex"};
            align-items:center;
            justify-content:center;
            font-size:20px;
            font-weight:900;
            color:#20B8C9;
            flex-shrink:0;
            line-height:1;
          ">${i + 1}</div>
          <div style="flex:1;min-width:0;">
            <div style="
              font-size:15px;
              font-weight:900;
              color:#20B8C9;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
            ">${esc(p.nombre)}</div>
            <div style="font-size:12px;color:#888;margin-top:3px;">
              ${esc(detalles)} · ${numero(p.cantidad)} pza.
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:18px;font-weight:900;color:#F49B93;">${moneda(subtotal)}</div>
            <div style="font-size:11px;color:#bbb;margin-top:2px;">${moneda(precioUnitario)} c/u</div>
          </div>
        </div>
      `
    })
    .join("")

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

    <!-- Estados -->
    <div style="
      background:white;
      border:1px solid #F5D3CD;
      border-radius:14px;
      padding:10px 14px;
    ">
      <div style="
        font-size:10px;font-weight:900;
        text-transform:uppercase;letter-spacing:.06em;color:#bbb;margin-bottom:6px;
      ">Estado</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${badge(estadoEntrega, centrega)}
        ${badge(estadoPago, cpago)}
      </div>
    </div>

    ${card("Fecha de pedido", fechaPedido)}
    ${card("Fecha de entrega", fechaEntrega)}

    ${pedido.lugar_entrega ? card("Lugar de entrega", esc(pedido.lugar_entrega)) : ""}

    ${pedido.municipio ? card("Municipio", esc(pedido.municipio)) : ""}

    ${
      pedido.notas
        ? `<div style="
            background:white;
            border:1px solid #F5D3CD;
            border-radius:14px;
            padding:10px 14px;
          ">
            <div style="
              font-size:10px;font-weight:900;
              text-transform:uppercase;letter-spacing:.06em;color:#bbb;margin-bottom:4px;
            ">Notas</div>
            <div style="
              font-size:13px;font-weight:700;color:#666;
              overflow:hidden;max-height:42px;line-height:1.4;
            ">${esc(pedido.notas)}</div>
          </div>`
        : `<div></div>`
    }

  </div>

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
    ${abonoVal > 0 ? `
    <div style="width:1px;height:44px;background:rgba(255,255,255,.3);"></div>
    <div style="text-align:center;">
      <div style="
        font-size:10px;font-weight:700;
        text-transform:uppercase;opacity:.8;letter-spacing:.05em;margin-bottom:4px;
      ">Abono</div>
      <div style="font-size:22px;font-weight:900;line-height:1;">${moneda(abonoVal)}</div>
    </div>
    ` : ""}
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
    const { jsPDF } = await import("jspdf")
    const origen = window.location.origin
    const folio = `TCH-${pedido.id}`
    const nombreArchivo = `TUCHIS-${folio}-${String(pedido.cliente ?? "pedido").replace(/\s+/g, "_")}.pdf`

    const html = buildHTML(pedido, origen)

    // Off-screen container — fixed + far left so it's rendered but invisible
    const container = document.createElement("div")
    container.style.cssText =
      "position:fixed;left:-10000px;top:0;width:800px;z-index:-9999;pointer-events:none;"
    container.innerHTML = html
    document.body.appendChild(container)

    // Give the browser one frame to render before capture
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter", // 215.9 × 279.4 mm
    })

    await new Promise<void>((resolve, reject) => {
      doc.html(container, {
        callback: (d) => {
          try {
            d.save(nombreArchivo)
            resolve()
          } catch (e) {
            reject(e)
          }
        },
        x: 0,
        y: 0,
        width: 216,       // matches letter width in mm
        windowWidth: 800, // div width in px
        margin: [0, 0, 0, 0],
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#FFF8F5",
          logging: false,
          imageTimeout: 8000,
        },
      })
    })

    onEstado?.("listo")
  } catch (err) {
    console.error("[generarPDF]", err)
    onEstado?.("error")
    throw err
  } finally {
    // Clean up any leftover container
    document
      .querySelectorAll<HTMLElement>(
        "div[style*='-10000px']"
      )
      .forEach((el) => el.parentNode?.removeChild(el))
  }
}
