'use client'
import React, { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import daygridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'

export default function FormularioReserva() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState('')
  const [esFinDeSemana, setEsFinDeSemana] = useState(false)
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([])
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const horariosBase = ["19:00", "20:00", "21:00"]

  useEffect(() => {
    if (fechaSeleccionada && !esFinDeSemana) {
      const consultar = async () => {
        try {
          const res = await fetch(`/api/disponibilidad?fecha=${fechaSeleccionada}`)
          const data = await res.json()
          setHorasOcupadas(data.ocupados || [])
        } catch { setHorasOcupadas([]) }
      }
      consultar()
    }
  }, [fechaSeleccionada, esFinDeSemana])

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    try {
      const res = await fetch('/api/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, telefono, inicio: `${fechaSeleccionada}T${horaSeleccionada}` })
      })
      if (res.ok) setEnviado(true)
      else alert("Error de permiso (403). Revisa la configuración del dominio.")
    } catch (err) { alert("Error de conexión") }
    finally { setCargando(false) }
  }

  return (
    <div className="flex flex-col lg:flex-row bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 max-w-6xl mx-auto my-10">
      
      {/* CALENDARIO */}
      <div className="w-full lg:w-2/3 p-4 md:p-8">
        <div className="calendar-container">
          <FullCalendar
            plugins={[daygridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            // ESTA ES LA MEJOR FORMA PARA QUE NO DESAPAREZCAN LOS NÚMEROS
            dayCellDidMount={(info) => {
              const d = info.date.getDay();
              const hoy = new Date(); hoy.setHours(0,0,0,0);
              
              if (info.date >= hoy) {
                const label = document.createElement('div');
                if (d === 0 || d === 6) {
                  label.innerText = 'FIN DE SEMANA';
                  label.className = 'custom-label weekend';
                } else {
                  label.innerText = 'DISPONIBLE';
                  label.className = 'custom-label available';
                }
                info.el.querySelector('.fc-daygrid-day-frame')?.appendChild(label);
              }
            }}
            dateClick={(info) => {
              const d = new Date(info.dateStr + "T00:00:00").getDay()
              setFechaSeleccionada(info.dateStr)
              setEsFinDeSemana(d === 0 || d === 6)
              setHoraSeleccionada('')
            }}
          />
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="w-full lg:w-1/3 p-8 bg-slate-50 flex flex-col justify-center">
        <h3 className="text-xl font-black italic text-slate-900 mb-6 uppercase">Tus Datos</h3>
        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className={`p-4 rounded-xl text-center font-bold text-sm ${fechaSeleccionada ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
            {fechaSeleccionada ? `DÍA: ${fechaSeleccionada}` : 'SELECCIONA UN DÍA'}
          </div>

          {fechaSeleccionada && !esFinDeSemana && (
            <div className="grid grid-cols-1 gap-2">
              {horariosBase.map(h => (
                <button key={h} type="button" onClick={() => setHoraSeleccionada(h)}
                  className={`py-3 rounded-xl font-bold text-xs border-2 transition-all ${horaSeleccionada === h ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-100'}`}>
                  {h} PM
                </button>
              ))}
            </div>
          )}

          <input required placeholder="NOMBRE COMPLETO" className="w-full p-4 rounded-xl border border-slate-200 text-sm font-bold" value={nombre} onChange={e=>setNombre(e.target.value)} />
          <input required placeholder="WHATSAPP" className="w-full p-4 rounded-xl border border-slate-200 text-sm font-bold" value={telefono} onChange={e=>setTelefono(e.target.value)} />
          <input required type="email" placeholder="CORREO" className="w-full p-4 rounded-xl border border-slate-200 text-sm font-bold" value={email} onChange={e=>setEmail(e.target.value)} />

          <button type="submit" className="w-full py-4 bg-[#7aeeb2] text-white rounded-xl font-black uppercase shadow-lg hover:bg-green-400 transition-colors">
            Confirmar Reserva
          </button>
        </form>
      </div>

      <style jsx global>{`
        .fc .fc-daygrid-day-number { 
          font-weight: 800 !important; 
          color: #64748b !important; 
          padding: 10px !important;
          font-size: 14px !important;
        }
        .fc-daygrid-day-frame { min-height: 100px !important; position: relative; }
        .custom-label {
          position: absolute;
          bottom: 8px;
          left: 5px;
          right: 5px;
          text-align: center;
          font-size: 8px;
          font-weight: 900;
          padding: 4px 2px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .available { background: #22c55e; color: white; box-shadow: 0 2px 4px rgba(34,197,94,0.3); }
        .weekend { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
        .fc-day-today { background: #f8fafc !important; }
        .fc-toolbar-title { font-weight: 900 !important; text-transform: uppercase; italic; }
      `}</style>
    </div>
  )
}