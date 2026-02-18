'use client'
import React from 'react'
import Link from 'next/link'
import FormularioReserva from '@/components/FormularioReserva'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header con enlace al Perfil */}
        <header className="flex justify-between items-center py-6 bg-white px-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
            Synapsa<span className="text-blue-600">.</span>
          </div>
          
          <Link href="/perfil">
            <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg">
              Ver Perfil Profesional
            </button>
          </Link>
        </header>

        {/* Hero Section */}
        <section className="text-center space-y-6 py-16">
          <h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-slate-900 leading-[0.85]">
            Sanar es un <br /> <span className="text-blue-600">acto de valor.</span>
          </h2>
          <p className="max-w-xl mx-auto text-slate-500 font-medium italic text-lg">
            Reserva tu sesión hoy mismo y comienza tu proceso de transformación con acompañamiento profesional.
          </p>
        </section>

        {/* Sección del Formulario */}
        <section className="pb-20">
          <FormularioReserva />
        </section>

        {/* Footer */}
        <footer className="text-center py-12 border-t border-slate-200">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            © 2024 Synapsa Psicología • Clínica Especializada
          </p>
        </footer>
      </div>
    </div>
  )
}