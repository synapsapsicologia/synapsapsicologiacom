'use client'
import React, { useState, useEffect } from 'react'

interface Cita {
  id: string;
  paciente: string;
  email: string;
  telefono: string;
  fecha: string;
  pago: string;
  estadoConsulta: string;
}

// Componente de Fila para evitar error de Hooks
const FilaCita = ({ cita, contactarWhatsApp }: { cita: Cita, contactarWhatsApp: any }) => {
  const [pagoEstado, setPagoEstado] = useState(cita.pago);
  const [consultaEstado, setConsultaEstado] = useState(cita.estadoConsulta);

  return (
    <tr className="hover:bg-slate-50 transition-all">
      <td className="p-6">
        <div className="font-black text-slate-800 uppercase text-xs tracking-tight">{cita.paciente}</div>
        <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{cita.email}</div>
      </td>
      <td className="p-6">
        <div className="text-xs font-black text-slate-600 italic bg-slate-100 px-3 py-1 rounded-full inline-block">
          {cita.fecha}
        </div>
      </td>
      <td className="p-6">
        <select 
          value={pagoEstado}
          onChange={(e) => setPagoEstado(e.target.value)}
          className={`text-[10px] font-black px-4 py-2 rounded-xl border-none shadow-md cursor-pointer transition-all duration-300 outline-none ${
            pagoEstado === 'PAGADO' 
              ? 'bg-green-500 text-white ring-2 ring-green-200' 
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          <option value="PENDIENTE" className="bg-white text-slate-800">PENDIENTE</option>
          <option value="PAGADO" className="bg-white text-slate-800">PAGADO</option>
        </select>
      </td>
      <td className="p-6">
        <select 
          value={consultaEstado}
          onChange={(e) => setConsultaEstado(e.target.value)}
          className={`text-[10px] font-black px-4 py-2 rounded-xl border-none shadow-sm outline-none w-full cursor-pointer transition-all ${
            consultaEstado === 'RECIBIDA' ? 'bg-blue-50 text-blue-700' :
            consultaEstado === 'CANCELADA' ? 'bg-red-50 text-red-700' :
            'bg-slate-100 text-slate-600'
          }`}
        >
          <option value="PENDIENTE">🕒 PENDIENTE</option>
          <option value="RECIBIDA">✅ RECIBIDA</option>
          <option value="POSPUESTA">🔁 POSPUESTA</option>
          <option value="CANCELADA">❌ CANCELADA</option>
        </select>
      </td>
      <td className="p-6 text-right">
        <button 
          onClick={() => contactarWhatsApp(cita.telefono, cita.paciente)}
          className="bg-[#25D366] text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          WhatsApp
        </button>
      </td>
    </tr>
  );
};

export default function AdminPanel() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const WHATSAPP_CLINICA = "50375386551";

  useEffect(() => {
    fetch('/admin/citas') 
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCitas(data);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  const contactarWhatsApp = (num: string, nombre: string) => {
    const limpio = num.replace(/\D/g, '');
    const numFinal = limpio.length === 8 ? `503${limpio}` : limpio;
    window.open(`https://wa.me/${numFinal}?text=Hola%20${nombre}`, '_blank');
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
            Gestión de Consultas
          </h1>
          <button 
            onClick={() => window.open(`https://wa.me/${WHATSAPP_CLINICA}`, '_blank')}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
          >
            Clínica WhatsApp: <span className="text-green-600 font-black">7538-6551</span>
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-[#0f172a] text-white text-[10px] uppercase tracking-[0.2em]">
              <tr>
                <th className="p-6">Paciente</th>
                <th className="p-6">Fecha y Hora</th>
                <th className="p-6">Pago</th>
                <th className="p-6">Estado Consulta</th>
                <th className="p-6 text-right">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cargando ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold italic animate-pulse">Cargando citas...</td></tr>
              ) : citas.map((cita) => (
                <FilaCita key={cita.id} cita={cita} contactarWhatsApp={contactarWhatsApp} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}