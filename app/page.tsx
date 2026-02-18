'use client'
import React from 'react'
import FormularioReserva from '@/components/FormularioReserva'

export default function Home() {
  const WHATSAPP_CLINICA = "50375386551";
  const estudios = [
    { titulo: "Licenciatura en Psicología", institucion: "Universidad de El Salvador", año: "2020" },
    { titulo: "Maestría en Talento Humano", institucion: "Universidad Tecnológica", año: "2024" },
    { titulo: "Postgrado en Criminalística y Psicología Forense", institucion: "Universidad Tecnológica", año: "2025" }
  ];

  const irAPerfil = () => document.getElementById('seccion-perfil')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* NAVBAR CON EFECTO VIDRIO */}
      <nav className="sticky top-0 z-50 w-full p-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center">
        <div className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
          Synapsa<span className="text-blue-600">.</span>
        </div>
        <button 
          onClick={irAPerfil} 
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
        >
          Perfil Profesional
        </button>
      </nav>

      <main className="max-w-6xl mx-auto p-6 space-y-24 py-12">
        
        {/* 1. SECCIÓN DE AGENDA */}
        <section id="seccion-reserva" className="space-y-10">
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
              Sanar es un <br /> <span className="text-blue-600">acto de valor.</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              Agenda tu sesión psicológica hoy mismo
            </p>
          </div>
          
          <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
            <FormularioReserva />
          </div>
        </section>

        <hr className="border-slate-200 w-1/4 mx-auto" />

        {/* 2. SECCIÓN PERFIL PROFESIONAL */}
        <section id="seccion-perfil" className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start pt-10">
          
          <div className="space-y-6">
            <div className="aspect-[4/5] bg-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl border-8 border-white relative">
              <img 
                src="/foto-selena.jpg" 
                alt="Licda. Selena Karina Portillo Galvez" 
                className="w-full h-full object-cover"
              />
            </div>
            <button 
              onClick={() => window.open(`https://wa.me/${WHATSAPP_CLINICA}`, '_blank')} 
              className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all"
            >
              WhatsApp Clínico
            </button>
          </div>

          <div className="md:col-span-2 space-y-8">
            <header>
              <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] bg-blue-50 px-3 py-1.5 rounded-full">
                Psicóloga Clínica y Forense
              </span>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 mt-4 leading-tight">
                Licda. Selena Karina <br /> Portillo Galvez
              </h2>
              <p className="mt-6 text-slate-500 text-base leading-relaxed font-medium italic">
                "Brindando un espacio de atención ética y profesional para tu bienestar emocional."
              </p>
            </header>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
                Trayectoria Académica <div className="h-[1px] bg-slate-200 flex-1"></div>
              </h3>
              <div className="grid gap-3">
                {estudios.map((est, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-100 transition-all">
                    <div>
                      <h4 className="font-black text-slate-800 text-xs uppercase italic">{est.titulo}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{est.institucion}</p>
                    </div>
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                      {est.año}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-12 border-t border-slate-100">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
          © 2026 Synapsa Psicología • San Salvador, El Salvador
        </p>
      </footer>

      {/* BOTÓN FLOTANTE WHATSAPP */}
      <a 
        href={`https://wa.me/${WHATSAPP_CLINICA}`} 
        target="_blank" 
        className="fixed bottom-8 right-8 z-50 bg-[#25D366] p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-90 flex items-center justify-center group"
      >
        <span className="absolute right-full mr-4 bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-100">
          ¿Necesitas ayuda?
        </span>
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.556 5.332-11.888 11.888-11.888 3.176 0 6.161 1.237 8.404 3.48s3.481 5.229 3.481 8.406c0 6.556-5.332 11.888-11.888 11.888-2.003 0-3.963-.505-5.7-1.467l-6.305 1.702zm6.39-4.043c1.511.897 3.278 1.371 5.081 1.371 5.433 0 9.851-4.417 9.851-9.851 0-2.631-1.024-5.105-2.884-6.965s-4.333-2.884-6.966-2.884c-5.433 0-9.851 4.418-9.851 9.851 0 1.935.567 3.824 1.639 5.454l-1.074 3.921 4.022-1.087z"/>
        </svg>
      </a>
    </div>
  )
}