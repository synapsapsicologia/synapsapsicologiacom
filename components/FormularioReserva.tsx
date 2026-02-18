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
      // 1. Intentar proceso en el servidor (Google Calendar + Resend)
      if (!esFinDeSemana) {
        const response = await fetch('/api/reservar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            nombre, 
            email, 
            telefono, 
            inicio: `${fechaSeleccionada}T${horaSeleccionada}:00` 
          })
        })

        // Si la API falla (Error 500), lanzamos el error para ir al catch
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || "Error al procesar la reserva en el servidor.")
        }
      }

      // 2. Si el servidor respondió OK, procedemos con WhatsApp y éxito visual
      setEnviado(true)
      const hora12h = horaSeleccionada === "19:00" ? "7:00 PM" : horaSeleccionada === "20:00" ? "8:00 PM" : "9:00 PM";
      const msg = esFinDeSemana 
        ? `Hola Licda. Portillo, deseo solicitar una cita en FIN DE SEMANA para el día ${fechaSeleccionada}. Mi nombre es ${nombre}.`
        : `Hola Licda. Portillo, mi nombre es ${nombre}. He reservado para el día ${fechaSeleccionada} a las ${hora12h}.`;
      
      window.open(`https://wa.me/${WHATSAPP_CLINICA}?text=${encodeURIComponent(msg)}`, '_blank')
      
    } catch (error: any) {
      console.error("Error en reserva:", error)
      alert("⚠️ Hubo un problema: " + error.message)
    } finally { 
      setCargando(false) 
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[3rem] text-center space-y-6 animate-in fade-in zoom-in duration-500 border border-slate-100 shadow-xl">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl animate-bounce">✅</div>
        <h2 className="text-2xl font-black italic uppercase text-slate-900 leading-tight">¡Cita Confirmada!</h2>
        <p className="text-slate-500 italic">Tu espacio para el <span className="text-blue-600 font-bold">{fechaSeleccionada}</span> ha sido registrado y se enviaron los correos de confirmación.</p>
        <button onClick={() => window.open(`https://wa.me/${WHATSAPP_CLINICA}`, '_blank')} className="px-8 py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-transform hover:scale-105">Ir al WhatsApp</button>
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
              info.el.style.opacity = '0.2';
              info.el.style.pointerEvents = 'none';
              return;
            }

            if (d === 0 || d === 6) {
              info.el.style.backgroundColor = '#f0f9ff';
              info.el.innerHTML += '<div style="font-size:8px; color:#0369a1; font-weight:bold; margin-top:5px; text-align:center">FIN DE SEMANA</div>';
            } else {
              const res = await fetch(`/api/disponibilidad?fecha=${info.date.toISOString().split('T')[0]}`);
              const data = await res.json();
              const ocupados = data.ocupados?.length || 0;
              const disponibles = horariosBase.length - ocupados;

              if (disponibles === 3) { 
                info.el.style.backgroundColor = '#f0fdf4';
                info.el.style.borderTop = '4px solid #22c55e';
              } else if (disponibles > 0) { 
                info.el.style.backgroundColor = '#fffbeb';
                info.el.style.borderTop = '4px solid #f59e0b';
              } else { 
                info.el.style.backgroundColor = '#fef2f2';
                info.el.style.borderTop = '4px solid #ef4444';
              }
            }
          }}
        />
      </div>

      <div className="p-10 bg-slate-50/50 flex flex-col justify-center space-y-6">
        <h3 className="text-xl font-black uppercase italic tracking-tighter">Detalles de cita</h3>
        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-blue-100 text-center font-bold text-blue-600 italic">
            {fechaSeleccionada || 'Toca un día en el calendario'}
          </div>

          {!esFinDeSemana && fechaSeleccionada && (
            <div className="grid grid-cols-1 gap-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selecciona una hora:</label>
              {horariosBase.map((hora) => {
                const estaOcupado = horasOcupadas.some(o => o.startsWith(hora.split(':')[0]));
                const formato12h = hora === "19:00" ? "7:00 PM" : hora === "20:00" ? "8:00 PM" : "9:00 PM";
                return (
                  <button key={hora} type="button" disabled={estaOcupado} onClick={() => setHoraSeleccionada(hora)}
                    className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${estaOcupado ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : horaSeleccionada === hora ? 'bg-blue-600 text-white border-blue-600 scale-105 shadow-md' : 'bg-white text-blue-600 border-blue-100 hover:border-blue-400'}`}>
                    {estaOcupado ? 'HORARIO OCUPADO' : formato12h}
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-3 pt-4">
            <input required placeholder="Nombre completo" className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 transition-colors" value={nombre} onChange={e=>setNombre(e.target.value)} />
            <input required placeholder="Número de WhatsApp" className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 transition-colors" value={telefono} onChange={e=>setTelefono(e.target.value)} />
            <input required type="email" placeholder="Correo electrónico" className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 transition-colors" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>

          <button type="submit" disabled={(!esFinDeSemana && !horaSeleccionada) || !nombre || !fechaSeleccionada}
            className="w-full py-5 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 disabled:grayscale transition-all">
            {cargando ? 'Procesando...' : 'Confirmar Reserva'}
          </button>
        </form>
      </div>
    </div>
  )
}