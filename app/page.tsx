export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">Reserva tu Cita Psicológica</h1>
        <p className="text-gray-600 mb-6">Selecciona un horario disponible (7:00 PM - 10:00 PM)</p>
        
        {/* Aquí irá nuestro calendario pronto */}
        <div className="grid grid-cols-1 gap-4">
          <button className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700">
            Ver disponibilidad
          </button>
        </div>
      </div>
    </main>
  );
}