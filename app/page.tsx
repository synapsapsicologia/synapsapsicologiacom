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
      {/* NAVBAR ESTÁTICO (Se queda al inicio de la página) */}
      <nav className="w-full p-6 bg-white border-b border-slate-100 flex justify-between items-center">
        <div className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
          Synapsa<span className="text-blue-600">.</span>
        </div>
        <button 
          onClick={irAPerfil} 
          className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
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
    </div>
  )
}