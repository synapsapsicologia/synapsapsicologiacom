'use client'
import React from 'react'
import Link from 'next/link'

export default function PerfilPsicologa() {
  const WHATSAPP_CLINICA = "50375386551";

  const estudios = [
    { titulo: "Licenciatura en Psicología", institucion: "Universidad de El Salvador", año: "2016" },
    { titulo: "Postgrado en Clínica de Adultos", institucion: "UCA", año: "2018" },
    { titulo: "Especialista en Terapia Cognitivo Conductual", institucion: "Certificación Internacional", año: "2021" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navegación Superior */}
      <nav className="p-6 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-50">
        <Link href="/" className="text-xl font-black italic uppercase tracking-tighter text-slate-900">
          Synapsa<span className="text-blue-600">.</span>
        </Link>
        <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors border-2 border-slate-100 px-4 py-2 rounded-xl">
          Volver al Inicio
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto p-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          
          {/* LADO IZQUIERDO: IMAGEN Y ACCIÓN */}
          <div className="space-y-8">
            <div className="aspect-[3/4] bg-slate-200 rounded-[3rem] overflow-hidden shadow-2xl border-[12px] border-white relative group">
               <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-black italic uppercase text-xs text-center p-8">
                 Tu Foto Profesional Aquí
               </div>
            </div>
            
            <button 
              onClick={() => window.open(`https://wa.me/${WHATSAPP_CLINICA}`, '_blank')}
              className="w-full py-6 bg-[#25D366] text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-green-100 hover:scale-105 transition-all active:scale-95"
            >
              Contactar por WhatsApp
            </button>
          </div>

          {/* LADO DERECHO: INFO */}
          <div className="md:col-span-2 space-y-12">
            <header>
              <span className="text-blue-600 font-black uppercase tracking-[0.4em] text-[10px] bg-blue-50 px-4 py-2 rounded-full">
                Psicóloga Clínica
              </span>
              <h1 className="text-6xl font-black italic uppercase tracking-tighter text-slate-900 mt-6 leading-[0.9]">
                Licda. Elena Rodríguez
              </h1>
              <p className="mt-8 text-slate-500 text-lg leading-relaxed font-medium italic">
                "Mi objetivo es brindarte las herramientas necesarias para que puedas retomar el control de tu bienestar emocional en un entorno de total confianza y profesionalismo."
              </p>
            </header>

            {/* FORMACIÓN */}
            <section className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-4">
                Trayectoria Académica <div className="h-[1px] bg-slate-200 flex-1"></div>
              </h2>
              <div className="grid gap-4">
                {estudios.map((est, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-slate-800 text-sm uppercase italic">{est.titulo}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{est.institucion}</p>
                    </div>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
                      {est.año}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}