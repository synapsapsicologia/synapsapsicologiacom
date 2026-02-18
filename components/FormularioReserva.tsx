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

  const horariosBase = ["19:00", "20:00", "21:00", "22:00"]
  const WHATSAPP_CLINICA = "50375386551"

  useEffect(() => {
    if (fechaSeleccionada && !esFinDeSemana) {
      const consultarDia = async () => {
        setCargando(true);
        try {
          const res = await fetch(`/api/disponibilidad?fecha=${fechaSeleccionada}`)
          const data = await res.json()
          setHorasOcupadas(data.ocupados || [])
        } catch { setHorasOcupadas([]) }
        finally { setCargando(false) }
      }
      consultarDia()
    }
  }, [fechaSeleccionada, esFinDeSemana])

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    try {
      if (!esFinDeSemana) {
        await fetch('/api/reservar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, email, telefono, inicio: `${fechaSeleccionada}T${horaSeleccionada}:00` })
        })
      }
      setEnviado(true)
      const msg = esFinDeSemana 
        ? `Hola Licda. Portillo, deseo solicitar una cita en FIN DE SEMANA para el día ${fechaSeleccionada}. Mi nombre es ${nombre}.`
        : `Hola Licda. Portillo, mi nombre es ${nombre}. He reservado para el día ${fechaSeleccionada} a las ${horaSeleccionada} PM.`;
      
      window.open(`https://wa.me/${WHATSAPP_CLINICA}?text=${encodeURIComponent(msg)}`, '_blank')
    } catch (error) {
      alert("Error al procesar la reserva.")
    } finally { setCargando(false) }
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[3rem] text-center space-y-6 animate-in fade-in zoom-in duration-500 border border-slate-100 shadow-xl">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl animate-bounce">✅</div>
        <h2 className="text-2xl font-black italic uppercase text-slate-900 leading-tight">¡Cita Confirmada!</h2>
        <p className="text-slate-500 italic">Tu espacio para el <span className="text-blue-600 font-bold">{fechaSeleccionada}</span> ha sido registrado. Cualquier duda puedes consultar por WhatsApp.</p>
        <button onClick={() => window.open(`https://wa.me/${WHATSAPP_CLINICA}`, '_blank')} className="px-8 py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-transform hover:scale-105">WhatsApp de la Clínica</button>
        <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-widest text-slate-400 underline pt-4">Agendar otra cita</button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px] bg-white relative">
      {cargando && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="lg:col-span-2 p-4 md:p-8 border-r border-slate-50">
        <FullCalendar
          plugins={[daygridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          height="auto"
          dateClick={(info) => {
            const d = new Date(info.dateStr + "T00:00:00").getDay()
            setFechaSeleccionada(info.dateStr)
            setEsFinDeSemana(d === 0 || d === 6)
          }}
          dayCellDidMount={async (info) => {
            const d = info.date.getDay();
            const hoy = new Date(); hoy.setHours(0,0,0,0);
            if (info.date < hoy) {
              info.el.style.opacity = '0.3';
              info.el.style.pointerEvents = 'none';
              return;
            }
            if (d === 0 || d === 6) {
              info.el.style.backgroundColor = '#eff6ff';
            } else {
              const res = await fetch(`/api/disponibilidad?fecha=${info.date.toISOString().split('T')[0]}`);
              const data = await res.json();
              const ocupados = data.ocupados?.length || 0;
              if (ocupados === 0) { info.el.style.backgroundColor = '#dcfce7'; info.el.style.borderLeft = '4px solid #22c55e'; }
              else if (ocupados < horariosBase.length) { info.el.style.backgroundColor = '#f1f5f9'; info.el.style.borderLeft = '4px solid #94a3b8'; }
              else { info.el.style.backgroundColor = '#fee2e2'; info.el.style.borderLeft = '4px solid #ef4444'; }
            }
          }}
        />
      </div>

      <div className="p-10 bg-slate-50/50 flex flex-col justify-center space-y-6">
        <h3 className="text-xl font-black uppercase italic tracking-tighter">Detalles</h3>
        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-blue-100 text-center font-bold text-blue-600 italic">{fechaSeleccionada || 'Selecciona un día'}</div>
          {esFinDeSemana && fechaSeleccionada && (
            <div className="p-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold shadow-lg">⚠️ Citas en fin de semana se coordinan por WhatsApp.</div>
          )}
          {!esFinDeSemana && fechaSeleccionada && (
            <div className="grid grid-cols-2 gap-2">
              {horariosBase.map((hora) => {
                const estaOcupado = horasOcupadas.some(o => o.startsWith(hora.split(':')[0]));
                return (
                  <button key={hora} type="button" disabled={estaOcupado} onClick={() => setHoraSeleccionada(hora)}
                    className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${estaOcupado ? 'bg-red-50 text-red-300 border-red-100' : horaSeleccionada === hora ? 'bg-blue-600 text-white border-blue-600' : 'bg-green-500 text-white border-green-400'}`}>
                    {estaOcupado ? 'LLENO' : `${hora} PM`}
                  </button>
                );
              })}
            </div>
          )}
          <input required placeholder="Tu nombre" className="w-full p-4 rounded-2xl border bg-white text-sm outline-none" value={nombre} onChange={e=>setNombre(e.target.value)} />
          <input required placeholder="WhatsApp" className="w-full p-4 rounded-2xl border bg-white text-sm outline-none" value={telefono} onChange={e=>setTelefono(e.target.value)} />
          <input required type="email" placeholder="Email" className="w-full p-4 rounded-2xl border bg-white text-sm outline-none" value={email} onChange={e=>setEmail(e.target.value)} />
          <button type="submit" disabled={(!esFinDeSemana && !horaSeleccionada) || !nombre || !fechaSeleccionada}
            className="w-full py-5 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
            Confirmar Reserva
          </button>
        </form>
      </div>
    </div>
  )
}