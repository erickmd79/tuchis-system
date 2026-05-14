const fs = require("fs")
const path = require("path")

const pedidoDir =
  path.join(__dirname, "..", "src", "app", "pedido")
const pagePath = path.join(pedidoDir, "page.tsx")
const clientPath =
  path.join(pedidoDir, "PedidoPageClient.tsx")
const wrapper =
  'export { default } from "./PedidoPageClient"\n'

require("./apply-pedido-page.js")

const pageContent = fs.existsSync(pagePath)
  ? fs.readFileSync(pagePath, "utf8")
  : ""
const clientContent = fs.existsSync(clientPath)
  ? fs.readFileSync(clientPath, "utf8")
  : ""
const generatedContent =
  pageContent && pageContent !== wrapper
    ? pageContent
    : clientContent

if (!generatedContent || generatedContent === wrapper) {
  throw new Error("No se pudo generar PedidoPageClient.tsx")
}

if (clientContent !== generatedContent) {
  fs.writeFileSync(clientPath, generatedContent)
}

if (pageContent !== wrapper) {
  fs.writeFileSync(pagePath, wrapper)
}
