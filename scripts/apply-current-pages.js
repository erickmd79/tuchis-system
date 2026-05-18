const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")

const requiredFiles = [
  "src/app/admin/page.tsx",
  "src/app/admin/productos/page.tsx",
  "src/app/admin/tamanos/page.tsx",
  "src/app/catalogo/page.tsx",
  "src/app/pedido/PedidoPageClient.tsx",
  "src/app/pedido/page.tsx",
]

const readPage = (file) => {
  const target = path.join(root, file)

  if (!fs.existsSync(target)) {
    throw new Error(`Missing required page: ${file}`)
  }

  return {
    target,
    content: fs.readFileSync(target, "utf8"),
  }
}

const savePage = (page) => {
  fs.writeFileSync(page.target, page.content)
}

const replaceOnce = (content, search, replacement, label) => {
  if (!content.includes(search)) {
    throw new Error(`Could not patch ${label}`)
  }

  return content.replace(search, replacement)
}

const patchAdminSidebar = () => {
  const page = readPage("src/app/admin/page.tsx")

  if (page.content.includes('href="/admin/tamanos"')) {
    return
  }

  const categoriasLink = `                <Link
                  href="/admin/categorias"
                  className="bg-[#FFE9A8] text-gray-800 px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Categorías
                </Link>
`

  const tamanosLink = `${categoriasLink}
                <Link
                  href="/admin/tamanos"
                  className="bg-cyan-500 text-white px-5 py-4 rounded-2xl font-bold text-center hover:opacity-90 transition"
                >
                  Tamaños
                </Link>
`

  page.content = replaceOnce(
    page.content,
    categoriasLink,
    tamanosLink,
    "admin sidebar tamanos"
  )
  savePage(page)
}

const patchProductosTamanos = () => {
  const page = readPage("src/app/admin/productos/page.tsx")

  if (page.content.includes("tamanoSeleccionado")) {
    return
  }

  page.content = replaceOnce(
    page.content,
    `const mostrarMedidas = (valor?: string) => {
  const medidas = limpiarMedidas(String(valor || ""))

  return medidas ? \`${"${medidas}"} cm\` : ""
}
`,
    `const mostrarMedidas = (valor?: string) => {
  const medidas = limpiarMedidas(String(valor || ""))

  return medidas ? \`${"${medidas}"} cm\` : ""
}

const numero = (valor: any) =>
  Number(valor || 0)

const obtenerNombreTamano = (tamano: any) =>
  String(
    tamano?.nombre ??
    tamano?.tamano ??
    ""
  ).trim()

const prepararTamanoProducto = (tamano: any) => ({
  id: tamano.id,
  tamano_id:
    tamano.tamano_id ??
    tamano.id,
  nombre: obtenerNombreTamano(tamano),
  modalidad: tamano.modalidad || "",
  precio_menudeo: numero(tamano.precio_menudeo),
  precio_mayoreo: numero(tamano.precio_mayoreo),
})
`,
    "productos helpers tamanos"
  )

  page.content = replaceOnce(
    page.content,
    `  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
`,
    `  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [tamanos, setTamanos] = useState<any[]>([])
`,
    "productos tamanos state"
  )

  page.content = replaceOnce(
    page.content,
    `  const [etiquetas, setEtiquetas] = useState("")
  const [imagenes, setImagenes] = useState<File[]>([])
`,
    `  const [etiquetas, setEtiquetas] = useState("")
  const [imagenes, setImagenes] = useState<File[]>([])
  const [tamanoSeleccionado, setTamanoSeleccionado] =
    useState("")
  const [tamanosSeleccionados, setTamanosSeleccionados] =
    useState<any[]>([])
`,
    "productos selected tamanos state"
  )

  page.content = replaceOnce(
    page.content,
    `  useEffect(() => {
    obtenerProductos()
    obtenerCategorias()
  }, [])
`,
    `  useEffect(() => {
    obtenerProductos()
    obtenerCategorias()
    obtenerTamanos()
  }, [])
`,
    "productos obtener tamanos effect"
  )

  page.content = replaceOnce(
    page.content,
    `  const obtenerCategorias = async () => {

    const { data } =
      await supabase
        .from("categorias")
        .select("*")
        .order("nombre")

    if (data) setCategorias(data)
  }
`,
    `  const obtenerCategorias = async () => {

    const { data } =
      await supabase
        .from("categorias")
        .select("*")
        .order("nombre")

    if (data) setCategorias(data)
  }

  const obtenerTamanos = async () => {

    const { data } =
      await supabase
        .from("tamanos")
        .select("*")
        .order("nombre")
        .order("modalidad")

    if (data) setTamanos(data)
  }

  const agregarTamanoSeleccionado = () => {
    const tamano =
      tamanos.find(
        (item) =>
          String(item.id) ===
          String(tamanoSeleccionado)
      )

    if (!tamano) return

    const existe =
      tamanosSeleccionados.some(
        (item) =>
          String(item.tamano_id ?? item.id) ===
          String(tamano.id)
      )

    if (existe) {
      setTamanoSeleccionado("")
      return
    }

    setTamanosSeleccionados([
      ...tamanosSeleccionados,
      prepararTamanoProducto(tamano),
    ])
    setTamanoSeleccionado("")
  }

  const quitarTamanoSeleccionado = (
    id: string | number
  ) => {
    setTamanosSeleccionados(
      tamanosSeleccionados.filter(
        (tamano) =>
          String(tamano.tamano_id ?? tamano.id) !==
          String(id)
      )
    )
  }
`,
    "productos obtener tamanos function"
  )

  page.content = replaceOnce(
    page.content,
    `              precio_mayoreo: Number(precioMayoreo),
              minimo_mayoreo: Number(minimoMayoreo),
              categoria,
`,
    `              precio_mayoreo: Number(precioMayoreo),
              minimo_mayoreo: Number(minimoMayoreo),
              tamanos:
                tamanosSeleccionados.map(
                  prepararTamanoProducto
                ),
              categoria,
`,
    "productos insert tamanos"
  )

  page.content = replaceOnce(
    page.content,
    `      setStock(0)
      setEtiquetas("")
      setImagenes([])
`,
    `      setStock(0)
      setEtiquetas("")
      setImagenes([])
      setTamanoSeleccionado("")
      setTamanosSeleccionados([])
`,
    "productos reset tamanos"
  )

  page.content = replaceOnce(
    page.content,
    `        </div>

        <textarea
`,
    `        </div>

        <div className="mt-6 rounded-[28px] border border-[#F4D4CF] bg-[#FFF8F5] p-5">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-black uppercase text-zinc-400 mb-2">
                Tamaños del producto
              </label>

              <select
                value={tamanoSeleccionado}
                onChange={(e) =>
                  setTamanoSeleccionado(e.target.value)
                }
                className="input-premium"
              >
                <option value="">
                  Selecciona un tamaño creado
                </option>

                {tamanos.map((tamano: any) => (
                  <option
                    key={tamano.id}
                    value={tamano.id}
                  >
                    {tamano.nombre} / {tamano.modalidad} · Menudeo ${"${numero(tamano.precio_menudeo)}"} · Mayoreo ${"${numero(tamano.precio_mayoreo)}"}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={agregarTamanoSeleccionado}
              className="btn-primary md:w-auto"
            >
              Agregar tamaño
            </button>
          </div>

          {tamanosSeleccionados.length > 0 && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {tamanosSeleccionados.map((tamano) => (
                <div
                  key={\`${"${tamano.tamano_id ?? tamano.id}"}-${"${tamano.modalidad}"}\`}
                  className="rounded-2xl border border-[#F8D6D0] bg-white p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-xs font-black uppercase text-zinc-400">
                      {tamano.modalidad}
                    </p>
                    <h3 className="text-xl font-black text-cyan-600">
                      {tamano.nombre}
                    </h3>
                    <p className="text-sm font-black text-rose-300 mt-1">
                      Menudeo ${"${numero(tamano.precio_menudeo)}"}
                    </p>
                    <p className="text-sm font-black text-cyan-500">
                      Mayoreo ${"${numero(tamano.precio_mayoreo)}"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      quitarTamanoSeleccionado(
                        tamano.tamano_id ?? tamano.id
                      )
                    }
                    className="bg-[#FFD6D6] text-zinc-700 px-4 py-2 rounded-2xl font-black"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {tamanos.length === 0 && (
            <p className="mt-4 text-sm font-bold text-zinc-500">
              Primero crea tamaños en Admin &gt; Tamaños.
            </p>
          )}
        </div>

        <textarea
`,
    "productos tamanos UI"
  )

  page.content = replaceOnce(
    page.content,
    `              </div>

              {(producto.etiquetas?.length ?? 0) > 0 && (
`,
    `              </div>

              {Array.isArray(producto.tamanos) &&
                producto.tamanos.length > 0 && (
                  <div className="mt-5 grid grid-cols-1 gap-2">
                    {producto.tamanos.map(
                      (tamano: any, index: number) => (
                        <div
                          key={\`${"${tamano.tamano_id ?? tamano.id ?? index}"}-${"${tamano.modalidad}"}\`}
                          className="rounded-2xl border border-[#F8D6D0] bg-[#FFF8F5] p-3"
                        >
                          <p className="text-xs font-black uppercase text-zinc-400">
                            {tamano.nombre} / {tamano.modalidad}
                          </p>
                          <p className="text-sm font-black text-rose-300">
                            Menudeo ${"${numero(tamano.precio_menudeo)}"}
                          </p>
                          <p className="text-sm font-black text-cyan-500">
                            Mayoreo ${"${numero(tamano.precio_mayoreo)}"}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

              {(producto.etiquetas?.length ?? 0) > 0 && (
`,
    "productos tamanos list"
  )

  savePage(page)
}

for (const file of requiredFiles) {
  readPage(file)
}

patchAdminSidebar()
patchProductosTamanos()
