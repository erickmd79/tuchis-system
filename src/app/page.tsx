export default function Home() {
  return (
    <div className="min-h-[calc(100vh-146px)] flex items-center justify-center px-4 py-10">
      <main className="w-full max-w-5xl bg-white border border-[#F5D3CD] rounded-[32px] shadow-sm p-8 md:p-12">
        <h1 className="page-title">
          Sistema TUCHIS
        </h1>

        <p className="text-zinc-500 text-lg md:text-xl max-w-2xl">
          Administra catálogo, pedidos y entregas desde un solo lugar.
        </p>
      </main>
    </div>
  )
}
