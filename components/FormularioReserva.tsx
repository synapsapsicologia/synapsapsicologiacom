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
  const [diasLlenos, setDiasLlenos] = useState<string[]>([]) 
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const horariosBase = ["19:00", "20:00", "21:00"]

  // 1. EFECTO PARA CARGAR DISPONIBILIDAD GENERAL (Días agotados)
  useEffect(() => {
    const cargarDiasOcupados = async () => {
      try {
        const res = await fetch('/api/disponibilidad-mensual')
        if (res.ok) {
          const data = await res.json()
          setDiasLlenos(data.fechasLlenas || [])
        }
      } catch (error) {
        console.error("Todavía no hay datos mensuales:", error)
      }
    }
    cargarDiasOcupados()
  }, [])

  // 2. EFECTO PARA HORAS ESPECÍFICAS (Sincronizado con tu API de Google)
  useEffect(() => {
    if (fechaSeleccionada && !esFinDeSemana) {
      const consultar = async () => {
        try {
          const fechaLimpia = fechaSeleccionada.split('T')[0];
          const res = await fetch(`/api/disponibilidad?fecha=${fechaLimpia}`);
          
          if (!res.ok) throw new Error("Error en la respuesta de la API");
          
          const data = await res.json();
          // Guardamos las horas ocupadas (ej: ["19:00", "20:00"])
          setHorasOcupadas(data.ocupados || []);
        } catch (error) {
          console.error("Error al consultar disponibilidad:", error);
          setHorasOcupadas([]);
        }
      }
      consultar();
    }
  }, [fechaSeleccionada, esFinDeSemana])

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    try {
      const res = await fetch('/api/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre, 
          email, 
          telefono, 
          inicio: `${fechaSeleccionada}T${horaSeleccionada}:00` 
        })
      })
      if (res.ok) setEnviado(true)
    } catch (err) { 
      alert("Error al reservar") 
    } finally { 
      setCargando(false) 
    }
  }

  if (enviado) {
    return (
      <div className="max-w-xl mx-auto my-20 p-10 bg-white rounded-3xl shadow-2xl text-center border-t-8 border-green-400">
        <h2 className="text-3xl font-black text-slate-900 mb-4">¡RESERVA RECIBIDA!</h2>
        <p className="text-slate-600 font-medium">Te contactaremos pronto por WhatsApp para confirmar los detalles.</p>
        <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs">Volver</button>
      </div>
    )
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
            dayCellDidMount={(info) => {
              const d = info.date.getDay();
              const hoy = new Date(); hoy.setHours(0,0,0,0);
              const fechaStr = info.date.toISOString().split('T')[0];
              const estaLleno = diasLlenos.includes(fechaStr);
              
              if (info.date >= hoy) {
                const label = document.createElement('div');
                if (estaLleno) {
                  label.innerText = 'AGOTADO';
                  label.className = 'custom-label busy';
                } else if (d === 0 || d === 6) {
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
              const localDate = new Date(info.dateStr + "T00:00:00")
              const d = localDate.getDay()
              setFechaSeleccionada(info.dateStr)
              setEsFinDeSemana(d === 0 || d === 6)
              setHoraSeleccionada('')
            }}
          />
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="w-full lg:w-1/3 p-8 bg-slate-50 flex flex-col justify-center border-l border-slate-100">
        <h3 className="text-xl font-black italic text-slate-900 mb-6 uppercase tracking-tight">Tus Datos</h3>
        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className={`p-4 rounded-xl text-center font-bold text-xs transition-all ${fechaSeleccionada ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border border-slate-200'}`}>
            {fechaSeleccionada ? `DÍA: ${fechaSeleccionada}` : 'SELECCIONA UN DÍA EN EL CALENDARIO'}
          </div>

          {fechaSeleccionada && !esFinDeSemana && (
            <div className="grid grid-cols-1 gap-2 animate-in fade-in duration-300">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Horarios en El Salvador:</p>
              {horariosBase.map(h => {
                // Comparamos si la hora base (ej "19:00") está en el array de ocupados
                const ocupado = horasOcupadas.includes(h);
                return (
                  <button key={h} type="button" disabled={ocupado} onClick={() => setHoraSeleccionada(h)}
                    className={`py-3 rounded-xl font-bold text-xs border-2 transition-all ${ocupado ? 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed line-through' : horaSeleccionada === h ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-100 hover:border-blue-300'}`}>
                    {ocupado ? 'OCUPADO' : `${h} PM`}
                  </button>
                )
              })}
            </div>
          )}

          {esFinDeSemana && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-[10px] font-bold text-center">
              NO HAY CITAS DISPONIBLES EN FIN DE SEMANA
            </div>
          )}

          <div className="space-y-3">
            <input required placeholder="NOMBRE COMPLETO" className="w-full p-4 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-blue-500 transition-all" value={nombre} onChange={e=>setNombre(e.target.value)} />
            <input required placeholder="WHATSAPP (SIN GUIONES)" className="w-full p-4 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-blue-500 transition-all" value={telefono} onChange={e=>setTelefono(e.target.value)} />
            <input required type="email" placeholder="CORREO ELECTRÓNICO" className="w-full p-4 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-blue-500 transition-all" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>

          <button type="submit" disabled={!horaSeleccionada || cargando}
            className="w-full py-5 bg-[#7aeeb2] hover:bg-[#5cd697] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50">
            {cargando ? 'PROCESANDO...' : 'CONFIRMAR RESERVA'}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .fc .fc-daygrid-day-number { font-weight: 800 !important; color: #475569 !important; padding: 12px !important; font-size: 14px !important; text-decoration: none !important; }
        .fc-daygrid-day-frame { min-height: 110px !important; position: relative; }
        .custom-label { position: absolute; bottom: 10px; left: 6px; right: 6px; text-align: center; font-size: 8px; font-weight: 900; padding: 5px 2px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .available { background: #22c55e; color: white; box-shadow: 0 4px 6px -1px rgba(34,197,94,0.2); }
        .weekend { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
        .busy { background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; }
        .fc-day-today { background: #f0f9ff !important; }
        .fc-toolbar-title { font-weight: 900 !important; text-transform: uppercase; font-style: italic; color: #1e293b; }
        .fc .fc-button-primary { background: #1e293b !important; border: none !important; border-radius: 10px !important; font-weight: 800 !important; text-transform: uppercase !important; font-size: 10px !important; }
      `}</style>
    </div>
  )
}