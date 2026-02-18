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
  const WHATSAPP_CLINICA = "50375386551"

  useEffect(() => {
    if (fechaSeleccionada && !esFinDeSemana) {
      const consultar = async () => {
        setCargando(true);
        try {
          const res = await fetch(`/api/disponibilidad?fecha=${fechaSeleccionada}`)
          const data = await res.json()
          setHorasOcupadas(data.ocupados || [])
        } catch { setHorasOcupadas([]) }
        finally { setCargando(false) }
      }
      consultar()
    }
  }, [fechaSeleccionada, esFinDeSemana])

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    try {
      const inicioIso = `${fechaSeleccionada}T${horaSeleccionada}`;
      const res = await fetch('/api/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, telefono, inicio: inicioIso })
      })
      if (res.ok) setEnviado(true)
      else throw new Error("Error en el servidor")
    } catch (err) {
      alert("No se pudo completar la reserva")
    } finally { setCargando(false) }
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[3rem] text-center space-y-8 animate-in fade-in zoom-in duration-500 shadow-2xl">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl">✅</div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">¡Cita Registrada!</h2>
          <p className="text-slate-500 font-medium">Te esperamos el <span className="text-blue-600 font-bold">{fechaSeleccionada}</span>.</p>
        </div>
        <div className="flex flex-col w-full gap-3 max-w-xs">
          <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg">Volver al Inicio</button>
          <button onClick={() => {
            const msg = `Hola Licda. Portillo, soy ${nombre}, agendé para el ${fechaSeleccionada}.`;
            window.open(`https://wa.me/${WHATSAPP_CLINICA}?text=${encodeURIComponent(msg)}`, '_blank');
          }} className="w-full py-4 border-2 border-[#25D366] text-[#128C7E] rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-green-50">Escribir por WhatsApp</button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 relative">
      {cargando && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="lg:col-span-2 p-6 md:p-10 border-r border-slate-50">
        <FullCalendar
          plugins={[daygridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          height="auto"
          dateClick={(info) => {
            const d = new Date(info.dateStr + "T00:00:00").getDay()
            setFechaSeleccionada(info.dateStr)
            setEsFinDeSemana(d === 0 || d === 6)
            setHoraSeleccionada('')
          }}
          dayCellDidMount={(info) => {
            const hoy = new Date(); hoy.setHours(0,0,0,0);
            const d = info.date.getDay();
            if (info.date < hoy) {
              info.el.style.opacity = '0.3';
              info.el.style.backgroundColor = '#f8fafc';
            } else if (d === 0 || d === 6) {
              info.el.style.backgroundColor = '#f0f9ff'; // Azul fin de semana
            }
          }}
        />
      </div>

      <div className="p-10 bg-slate-50/50 flex flex-col justify-center space-y-6">
        <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Tus Datos</h3>
        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-blue-100 text-center font-bold text-blue-600 italic shadow-sm">
            {fechaSeleccionada || 'Selecciona un día'}
          </div>

          {!esFinDeSemana && fechaSeleccionada && (
            <div className="flex flex-col gap-2">
              {horariosBase.map(h => {
                const ocupado = horasOcupadas.some(o => o.startsWith(h.split(':')[0]));
                const formato12h = h === "19:00" ? "7:00 PM" : h === "20:00" ? "8:00 PM" : "9:00 PM";
                return (
                  <button key={h} type="button" disabled={ocupado} onClick={() => setHoraSeleccionada(h)}
                    className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${ocupado ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : horaSeleccionada === h ? 'bg-blue-600 text-white border-blue-600 scale-105 shadow-md' : 'bg-white text-blue-600 border-blue-100 hover:border-blue-400'}`}>
                    {ocupado ? 'HORARIO OCUPADO' : formato12h}
                  </button>
                )
              })}
            </div>
          )}

          <div className="space-y-3">
            <input required placeholder="Nombre" className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400" value={nombre} onChange={e=>setNombre(e.target.value)} />
            <input required placeholder="WhatsApp" className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400" value={telefono} onChange={e=>setTelefono(e.target.value)} />
            <input required type="email" placeholder="Correo" className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>

          <button type="submit" disabled={(!esFinDeSemana && !horaSeleccionada) || !nombre || !fechaSeleccionada || cargando}
            className="w-full py-5 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all">
            {cargando ? 'Procesando...' : 'Confirmar Reserva'}
          </button>
        </form>
      </div>
    </div>
  )
}