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
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sage-50/50 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-olive-50/50 blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-cream-200 overflow-hidden relative z-10 transition-all duration-300 hover:shadow-2xl">
        
        {/* Cabecera del Formulario */}
        <div className="bg-gradient-to-br from-sage-600 to-sage-700 p-8 text-center text-white relative">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg animate-in zoom-in-95 duration-500">
            <Brain className="w-8 h-8 text-cream-100 fill-white/10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Synapsa Admin</h2>
          <p className="text-sage-100 text-xs mt-1.5 uppercase font-bold tracking-widest">
            Control de Consultorio y Reservas
          </p>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl p-4 flex items-center space-x-2 animate-in fade-in duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-650 flex-shrink-0 animate-ping"></span>
                <span>{error}</span>
              </div>
            )}

            {/* Input de Usuario */}
            <div className="space-y-2">
              <label htmlFor="usuario" className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="usuario"
                  type="text"
                  required
                  placeholder="admin"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-cream-250 bg-cream-50/20 text-charcoal-900 text-sm font-semibold placeholder-charcoal-400 focus:outline-hidden focus:border-sage-500 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* Input de Contraseña */}
            <div className="space-y-2">
              <label htmlFor="contrasenia" className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="contrasenia"
                  type={mostrarContrasenia ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={contrasenia}
                  onChange={(e) => setContrasenia(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-cream-250 bg-cream-50/20 text-charcoal-900 text-sm font-semibold placeholder-charcoal-400 focus:outline-hidden focus:border-sage-500 focus:bg-white transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasenia(!mostrarContrasenia)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-charcoal-400 hover:text-sage-600 transition"
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
              className="w-full bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <span>Iniciar Sesión</span>
              )}
            </button>

          </form>
          
          <div className="mt-8 pt-6 border-t border-cream-200 text-center">
            <Link
              href="/"
              className="text-xs text-charcoal-700 hover:text-sage-700 font-semibold transition"
            >
              ← Volver al Portal de Reservas
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
