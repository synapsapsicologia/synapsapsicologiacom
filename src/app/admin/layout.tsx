'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Brain, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ExternalLink, 
  Menu, 
  X,
  UserCircle,
  LogOut
} from 'lucide-react';
import { logoutAdminAccion } from '../actions';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logoutAdminAccion();
    router.push('/admin/login');
    router.refresh();
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Pacientes', href: '/admin/pacientes', icon: Users },
    { name: 'Disponibilidad', href: '/admin/disponibilidad', icon: Calendar },
  ];

  // Si es la página de login, renderizar sin barra lateral
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 bg-cream-100 min-h-screen flex flex-col md:flex-row">
      
      {/* HEADER DE MÓVIL */}
      <header className="bg-zinc-50/80 backdrop-blur-md border-b border-zinc-300 py-4 px-4 flex items-center justify-between md:hidden sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sage-600 to-olive-700 flex items-center justify-center text-white">
            <Brain className="w-4.5 h-4.5" />
          </div>
          <span className="font-light text-zinc-900 tracking-tight">Synapsa Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-200/50 text-zinc-800 transition-colors duration-300"
          title="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* OVERLAY DE SIDEBAR PARA MÓVIL */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-charcoal-900/30 backdrop-blur-xs" onClick={() => setSidebarOpen(false)}></div>
          
          <div className="relative flex w-full max-w-[280px] flex-1 flex-col bg-zinc-50 border-r border-zinc-300 p-6 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sage-600 to-olive-700 flex items-center justify-center text-white">
                  <Brain className="w-4.5 h-4.5" />
                </div>
                <span className="font-light text-zinc-900 tracking-tight">Synapsa Admin</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-200/50 text-zinc-850 transition-colors duration-300"
                title="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-light transition-colors duration-300 ${
                      isActive
                        ? 'bg-zinc-200/60 text-zinc-900 border border-zinc-300/40'
                        : 'text-zinc-550 hover:bg-zinc-200/30 hover:text-zinc-900'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-zinc-700' : 'text-zinc-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-zinc-300 pt-4 mt-auto space-y-1">
              <Link
                href="/"
                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-light text-zinc-550 hover:bg-zinc-200/30 hover:text-zinc-900 transition-colors duration-300"
              >
                <ExternalLink className="w-5 h-5 text-zinc-400" />
                <span>Ver Portal Público</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50 hover:text-red-950 transition text-left cursor-pointer"
              >
                <LogOut className="w-5 h-5 text-red-500" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR PARA ESCRITORIO */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-zinc-50/50 backdrop-blur-md border-r border-zinc-300 p-6 z-30">
        <div className="flex items-center space-x-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sage-600 to-olive-700 flex items-center justify-center text-white border border-zinc-300/40">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-light text-zinc-900 tracking-tight text-md">Synapsa Admin</h1>
            <p className="text-[9px] text-zinc-500 font-light tracking-widest uppercase">Selena Gálvez</p>
          </div>
        </div>

        {/* Info del Terapeuta */}
        <div className="bg-zinc-100/50 border border-zinc-300 rounded-xl p-3.5 flex items-center space-x-2.5 mb-6">
          <div className="text-zinc-600">
            <UserCircle className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-normal text-zinc-900 truncate">Selena Gálvez</p>
            <p className="text-[10px] text-zinc-500 font-light truncate">Psicóloga Clínica</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-light transition-colors duration-300 ${
                  isActive
                    ? 'bg-zinc-200/60 text-zinc-900 border border-zinc-300/40'
                    : 'text-zinc-550 hover:bg-zinc-200/30 hover:text-zinc-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-zinc-750' : 'text-zinc-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-300 pt-4 mt-auto space-y-1">
          <Link
            href="/"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-light text-zinc-550 hover:bg-zinc-200/30 hover:text-zinc-900 transition-colors duration-300"
          >
            <ExternalLink className="w-4.5 h-4.5 text-zinc-400" />
            <span>Portal de Reserva</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50 hover:text-red-950 transition text-left cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5 text-red-500" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        
        {/* Encabezado superior de escritorio */}
        <header className="hidden md:flex h-16 bg-zinc-50/50 backdrop-blur-md border-b border-zinc-300 items-center justify-end px-8 sticky top-0 z-20">
          <div className="flex items-center space-x-4">
            <span className="h-5 w-px bg-zinc-300"></span>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sage-500 animate-pulse"></span>
              <span className="text-xs font-light text-zinc-650">Consultorio Activo</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
