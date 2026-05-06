"use client"

const productos = [
  {
    id: 1,
    nombre: "Alcancía Unicornio",
    precio: 50,
    imagen: "https://via.placeholder.com/300"
  },
  {
    id: 2,
    nombre: "Alcancía Dinosaurio",
    precio: 60,
    imagen: "https://via.placeholder.com/300"
  },
  {
    id: 3,
    nombre: "Alcancía Princesa",
    precio: 55,
    imagen: "https://via.placeholder.com/300"
  }
]

const agregarAlCarrito = (producto: any) => {
  const carrito = JSON.parse(localStorage.getItem("carrito") || "[]")

  const index = carrito.findIndex((item: any) => item.id === producto.id)

  if (index !== -1) {
    carrito[index].cantidad += 1
  } else {
    carrito.push({ ...producto, cantidad: 1 })
  }

  localStorage.setItem("carrito", JSON.stringify(carrito))

  alert("Producto agregado")
}

export default function Page() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Catálogo</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {productos.map((producto) => (
          <div key={producto.id} className="border rounded-xl p-4 shadow">
            <img
              src={producto.imagen}
              alt={producto.nombre}
              className="w-full h-48 object-cover rounded"
            />

            <h2 className="text-xl font-semibold mt-3">
              {producto.nombre}
            </h2>

            <p className="text-lg mt-2">
              ${producto.precio}
            </p>

            <button
  onClick={() => agregarAlCarrito(producto)}
  className="mt-4 bg-black text-white px-4 py-2 rounded"
>
  Agregar
</button>
          </div>
        ))}
      </div>
    </div>
  )
}