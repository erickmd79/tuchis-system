const fs = require("fs")
const path = require("path")

const target = path.join(
  __dirname,
  "..",
  "src/app/catalogo/page.tsx"
)

if (!fs.existsSync(target)) {
  throw new Error("Missing required page: src/app/catalogo/page.tsx")
}

let content = fs.readFileSync(target, "utf8")

content = content
  .replace('href="/pedido"', 'href="/pedido?carrito=1"')
  .replace(">Ver pedidos</a>", ">Ver carrito</a>")
  .replace(`>
              Ver pedidos
            </a>`, `>
              Ver carrito
            </a>`)

fs.writeFileSync(target, content)
