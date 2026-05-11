"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ProductosPage() {

  const [productos, setProductos] =
    useState<any[]>([])

  const [categorias, setCategorias] =
    useState<any[]>([])

  const [busqueda, setBusqueda] =
    useState("")

  const [filtroCategoria,
    setFiltroCategoria] =
    useState("")

  const [nombre, setNombre] =
    useState("")

  const [precio, setPrecio] =
    useState("")

  const [categoria, setCategoria] =
    useState("")

  const [medidas, setMedidas] =
    useState("")

  const [imagenes,
    setImagenes] =
    useState<FileList | null>(null)

  useEffect(() => {

    obtenerProductos()
    obtenerCategorias()

  }, [])

  const obtenerProductos = async () => {

    const { data } =
      await supabase
        .from("productos")
        .select("*")
        .order("id",
          { ascending: false })

    if (data) {
      setProductos(data)
    }
  }

  const obtenerCategorias = async () => {

    const { data } =
      await supabase
        .from("categorias")
        .select("*")
        .order("nombre")

    if (data) {
      setCategorias(data)
    }
  }

  const guardarProducto = async () => {

    if (
      !nombre ||
      !precio ||
      !categoria
    ) {
      alert("Completa los campos")
      return
    }

    let urls: string[] = []

    if (imagenes) {

      for (const imagen of Array.from(imagenes)) {

        const nombreArchivo =
          `${Date.now()}-${imagen.name}`

        const { error: uploadError } =
          await supabase.storage
            .from("productos")
            .upload(nombreArchivo, imagen)

        if (uploadError) {
          alert("Error subiendo imagen")
          return
        }

        const { data } =
          supabase.storage
            .from("productos")
            .getPublicUrl(nombreArchivo)

        urls.push(data.publicUrl)
      }
    }

    const { error } =
      await supabase
        .from("productos")
        .insert([
          {
            nombre,
            precio,
            categoria,
            medidas,
            imagenes: urls,
          }
        ])

    if (error) {
      alert("Error guardando")
      return
    }

    alert("Producto guardado")

    setNombre("")
    setPrecio("")
    setCategoria("")
    setMedidas("")
    setImagenes(null)

    obtenerProductos()
  }

  const eliminarProducto =
    async (id: number) => {

    const confirmar =
      confirm("Eliminar producto?")

    if (!confirmar) return

    await supabase
      .from("productos")
      .delete()
      .eq("id", id)

    obtenerProductos()
  }

  const productosFiltrados =
    productos.filter((producto) => {

      const coincideBusqueda =
        producto.nombre
          ?.toLowerCase()
          .includes(
            busqueda.toLowerCase()
          )

      const coincideCategoria =
        filtroCategoria === "" ||
        producto.categoria ===
        filtroCategoria

      return (
        coincideBusqueda &&
        coincideCategoria
      )
    })

  return (

    <div className="admin-layout">

      <main className="main-content">

        <div className="page-container">

          <div>

            <h1 className="title-xl">
              Productos
            </h1>

            <p className="subtitle">
              Administra tu catálogo
            </p>

          </div>

          <div
            className="section-spacing"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(250px,1fr))",
              gap: 18
            }}
          >

            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
            />

            <select
              value={filtroCategoria}
              onChange={(e) =>
                setFiltroCategoria(
                  e.target.value
                )
              }
            >

              <option value="">
                Todas las categorías
              </option>

              {categorias.map((cat) => (

                <option
                  key={cat.id}
                  value={cat.nombre}
                >
                  {cat.nombre}
                </option>

              ))}

            </select>

            <div
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                fontWeight: 800,
                color: "#20B8C9"
              }}
            >
              {productos.length} productos
            </div>

          </div>

          <div
            className="card section-spacing"
          >

            <h2
              className="title-lg"
              style={{
                color: "#20B8C9",
                marginBottom: 24
              }}
            >
              Nuevo producto
            </h2>

            <div
              style={{
                display: "grid",
                gap: 18
              }}
            >

              <input
                type="text"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) =>
                  setNombre(
                    e.target.value
                  )
                }
              />

              <input
                type="number"
                placeholder="Precio"
                value={precio}
                onChange={(e) =>
                  setPrecio(
                    e.target.value
                  )
                }
              />

              <select
                value={categoria}
                onChange={(e) =>
                  setCategoria(
                    e.target.value
                  )
                }
              >

                <option value="">
                  Selecciona categoría
                </option>

                {categorias.map((cat) => (

                  <option
                    key={cat.id}
                    value={cat.nombre}
                  >
                    {cat.nombre}
                  </option>

                ))}

              </select>

              <input
                type="text"
                placeholder="Medidas"
                value={medidas}
                onChange={(e) =>
                  setMedidas(
                    e.target.value
                  )
                }
              />

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) =>
                  setImagenes(
                    e.target.files
                  )
                }
              />

              {imagenes && (

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill,minmax(120px,1fr))",
                    gap: 16
                  }}
                >

                  {Array.from(imagenes)
                    .map((imagen, i) => (

                    <div
                      key={i}
                      style={{
                        position:
                          "relative"
                      }}
                    >

                      <img
                        src={URL.createObjectURL(imagen)}
                        alt=""
                        style={{
                          width: "100%",
                          aspectRatio: "1/1",
                          objectFit: "cover",
                          borderRadius: 24,
                          border:
                            "2px solid #F3D7D2"
                        }}
                      />

                    </div>

                  ))}

                </div>

              )}

              <button
                onClick={
                  guardarProducto
                }
                className="btn btn-primary"
              >
                Guardar producto
              </button>

            </div>

          </div>

          <div className="section-spacing">

            <h2
              className="title-lg"
              style={{
                color: "#20B8C9",
                marginBottom: 24
              }}
            >
              Lista de productos
            </h2>

            <div className="products-grid">

              {productosFiltrados.map(
                (producto) => (

                <div
                  key={producto.id}
                  className="product-card"
                >

                  <div
                    style={{
                      position:
                        "relative"
                    }}
                  >

                    <img
                      src={
                        producto.imagenes?.[0]
                      }
                      alt=""
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        objectFit: "cover"
                      }}
                    />

                    <div
                      style={{
                        position:
                          "absolute",
                        top: 14,
                        right: 14,
                        background:
                          "#20B8C9",
                        color: "white",
                        padding:
                          "8px 14px",
                        borderRadius: 999,
                        fontWeight: 700
                      }}
                    >
                      $
                      {producto.precio}
                    </div>

                  </div>

                  <div className="product-body">

                    <h3
                      className="product-title"
                    >
                      {producto.nombre}
                    </h3>

                    <p
                      style={{
                        color: "#666",
                        marginBottom: 8
                      }}
                    >
                      {producto.categoria}
                    </p>

                    <p
                      style={{
                        marginBottom: 18
                      }}
                    >
                      {producto.medidas}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: 12
                      }}
                    >

                      <button
                        className="btn btn-primary"
                        style={{
                          flex: 1
                        }}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          eliminarProducto(
                            producto.id
                          )
                        }
                        className="btn btn-pink"
                        style={{
                          flex: 1
                        }}
                      >
                        Eliminar
                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </div>

      </main>

    </div>
  )
}
