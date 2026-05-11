"use client"

import Link from "next/link"

export default function AdminPage() {

  return (

    <div className="admin-layout">

      <aside className="sidebar">

        <div>

          <h1 className="title-lg text-[#20B8C9]">
            TUCHIS
          </h1>

          <p className="subtitle">
            Admin Panel
          </p>

        </div>

        <div className="sidebar-nav">

          <Link
            href="/admin"
            className="sidebar-link bg-[#20B8C9] text-white"
          >
            📊 Dashboard
          </Link>

          <Link
            href="/admin/productos"
            className="sidebar-link bg-[#F9D6D2]"
          >
            🧸 Productos
          </Link>

          <Link
            href="/admin/categorias"
            className="sidebar-link bg-[#FFF0B8]"
          >
            🏷️ Categorías
          </Link>

          <Link
            href="/catalogo"
            className="sidebar-link bg-[#BEE9E8]"
          >
            🛒 Catálogo
          </Link>

        </div>

      </aside>

      <main className="main-content">

        <div className="page-container">

          <div className="mobile-topbar">

            <h2 className="text-3xl font-black text-[#20B8C9]">
              TUCHIS
            </h2>

            <button className="btn btn-primary">
              ☰
            </button>

          </div>

          <div>

            <h1 className="title-xl">
              Dashboard
            </h1>

            <p className="subtitle">
              Bienvenido al panel administrativo TUCHIS
            </p>

          </div>

          <div className="grid-cards section-spacing">

            <div
              className="stat-card"
              style={{
                background: "#BEE9E8"
              }}
            >

              <p>Total ventas</p>

              <h2>$12,450</h2>

            </div>

            <div
              className="stat-card"
              style={{
                background: "#FFD6D6"
              }}
            >

              <p>Pedidos hoy</p>

              <h2>24</h2>

            </div>

            <div
              className="stat-card"
              style={{
                background: "#FFF0B8"
              }}
            >

              <p>Pendientes</p>

              <h2>8</h2>

            </div>

            <div
              className="stat-card"
              style={{
                background: "#D7F5E8"
              }}
            >

              <p>Pagados</p>

              <h2>16</h2>

            </div>

          </div>

          <div
            className="section-spacing"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(340px,1fr))",
              gap: "24px"
            }}
          >

            <div className="card">

              <h2
                className="title-lg"
                style={{
                  color: "#20B8C9"
                }}
              >
                Productos más vendidos
              </h2>

              <div className="section-spacing">

                <div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: 10
                    }}
                  >

                    <strong>Unicornio</strong>

                    <strong>42</strong>

                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 18,
                      background: "#F9D6D2",
                      borderRadius: 999
                    }}
                  >

                    <div
                      style={{
                        width: "80%",
                        height: "100%",
                        background: "#20B8C9",
                        borderRadius: 999
                      }}
                    />

                  </div>

                </div>

                <div
                  style={{
                    marginTop: 24
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: 10
                    }}
                  >

                    <strong>Labubu</strong>

                    <strong>30</strong>

                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 18,
                      background: "#F9D6D2",
                      borderRadius: 999
                    }}
                  >

                    <div
                      style={{
                        width: "60%",
                        height: "100%",
                        background: "#20B8C9",
                        borderRadius: 999
                      }}
                    />

                  </div>

                </div>

              </div>

            </div>

            <div className="card">

              <h2
                className="title-lg"
                style={{
                  color: "#F49B93"
                }}
              >
                Categorías más usadas
              </h2>

              <div className="section-spacing">

                <div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: 10
                    }}
                  >

                    <strong>Animales</strong>

                    <strong>60%</strong>

                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 18,
                      background: "#FFF0B8",
                      borderRadius: 999
                    }}
                  >

                    <div
                      style={{
                        width: "60%",
                        height: "100%",
                        background: "#F49B93",
                        borderRadius: 999
                      }}
                    />

                  </div>

                </div>

                <div
                  style={{
                    marginTop: 24
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: 10
                    }}
                  >

                    <strong>Disney</strong>

                    <strong>35%</strong>

                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 18,
                      background: "#FFF0B8",
                      borderRadius: 999
                    }}
                  >

                    <div
                      style={{
                        width: "35%",
                        height: "100%",
                        background: "#F49B93",
                        borderRadius: 999
                      }}
                    />

                  </div>

                </div>

              </div>

            </div>

          </div>

          <div className="card section-spacing">

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: 24
              }}
            >

              <h2
                className="title-lg"
                style={{
                  color: "#20B8C9"
                }}
              >
                Actividad reciente
              </h2>

              <button className="btn btn-primary">
                Ver todo
              </button>

            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18
              }}
            >

              <div
                style={{
                  padding: 20,
                  borderRadius: 24,
                  background: "#FFF8F5",
                  border:
                    "2px solid #F3D7D2"
                }}
              >

                <strong>
                  Pedido nuevo recibido
                </strong>

                <p className="subtitle">
                  Hace unos minutos
                </p>

              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 24,
                  background: "#FFF8F5",
                  border:
                    "2px solid #F3D7D2"
                }}
              >

                <strong>
                  Producto actualizado
                </strong>

                <p className="subtitle">
                  Hace 1 hora
                </p>

              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 24,
                  background: "#FFF8F5",
                  border:
                    "2px solid #F3D7D2"
                }}
              >

                <strong>
                  Categoría agregada
                </strong>

                <p className="subtitle">
                  Hace 3 horas
                </p>

              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  )
}
