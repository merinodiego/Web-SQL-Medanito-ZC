// Stub for the pages not yet built (Inyección / Equipos / Gestión).
export default function Placeholder({ titulo, detalle }) {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold text-white">{titulo}</h1>
      <p className="mt-2 text-sm text-gray-400">{detalle}</p>
      <span className="mt-4 rounded-full border border-line bg-panel-2 px-3 py-1 text-xs text-amber-300">
        Próximamente
      </span>
    </div>
  );
}
