'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginAdminAccion } from '../../actions';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [mostrarContrasenia, setMostrarContrasenia] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !contrasenia.trim()) {
      setError('Por favor, ingresa tanto el usuario como la contraseña.');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const result = await loginAdminAccion(usuario, contrasenia);
      if (result.success) {
        router.push('/admin');
        // Forzar actualización de rutas para que el middleware detecte la cookie de inmediato
        router.refresh();
      } else {
        setError(result.error || 'Credenciales incorrectas.');
        setCargando(false);
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error inesperado al intentar iniciar sesión.');
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Círculos decorativos abstractos de fondo para estética premium */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-50/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-50/20 blur-3xl"></div>

      <div className="w-full max-w-md bg-zinc-50/30 rounded-3xl border border-zinc-300/80 overflow-hidden relative z-10 transition-all duration-300 backdrop-blur-md">
        
        {/* Cabecera del Formulario */}
        <div className="border-b border-zinc-300/50 p-8 text-center relative bg-transparent">
          <div className="w-16 h-16 bg-zinc-50/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-300/85 animate-in zoom-in-95 duration-500">
            <Brain className="w-8 h-8 text-zinc-900" />
          </div>
          <h2 className="text-2xl font-light text-zinc-900 tracking-tight">Synapsa Admin</h2>
          <p className="text-zinc-500 text-[10px] mt-1.5 uppercase font-light tracking-widest">
            Control de Consultorio y Reservas
          </p>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="bg-red-50 border border-red-200/60 text-red-800 text-xs font-light rounded-xl p-4 flex items-center space-x-2 animate-in fade-in duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0 animate-ping"></span>
                <span>{error}</span>
              </div>
            )}

            {/* Input de Usuario */}
            <div className="space-y-2">
              <label htmlFor="usuario" className="block text-xs font-light text-zinc-400 uppercase tracking-wider">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="usuario"
                  type="text"
                  required
                  placeholder="admin"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-300 bg-transparent text-zinc-900 text-sm font-light placeholder-zinc-400 focus:outline-hidden focus:border-zinc-800 focus:bg-zinc-100/30 transition-all duration-300"
                />
              </div>
            </div>

            {/* Input de Contraseña */}
            <div className="space-y-2">
              <label htmlFor="contrasenia" className="block text-xs font-light text-zinc-400 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="contrasenia"
                  type={mostrarContrasenia ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={contrasenia}
                  onChange={(e) => setContrasenia(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-zinc-300 bg-transparent text-zinc-900 text-sm font-light placeholder-zinc-400 focus:outline-hidden focus:border-zinc-800 focus:bg-zinc-100/30 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasenia(!mostrarContrasenia)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-850 transition-colors duration-300 cursor-pointer"
                  title={mostrarContrasenia ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarContrasenia ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Botón de Submit */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-light py-3.5 px-6 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 flex items-center justify-center space-x-2 text-sm disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <span>Iniciar Sesión</span>
              )}
            </button>

          </form>
          
          <div className="mt-8 pt-6 border-t border-zinc-300/50 text-center">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-900 font-light transition-colors duration-300"
            >
              ← Volver al Portal de Reservas
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
