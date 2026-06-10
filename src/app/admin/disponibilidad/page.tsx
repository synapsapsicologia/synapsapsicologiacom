'use client';

import React, { useState, useEffect } from 'react';
import { 
  getCalendarioConfigAccion, 
  actualizarDiaBloqueoAccion, 
  agregarDiaNoLaborableAccion, 
  eliminarDiaNoLaborableAccion 
} from '@/app/actions';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Plus, 
  ShieldAlert, 
  CalendarDays, 
  Lock, 
  Unlock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function DisponibilidadPage() {
  const [disponibilidad, setDisponibilidad] = useState<any[]>([]);
  const [diasNoLaborables, setDiasNoLaborables] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  // Nueva fecha feriada a agregar
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [errorFecha, setErrorFecha] = useState('');

  const nombresDias = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  // Cargar datos del servidor
  const cargarConfig = async () => {
    try {
      const res = await getCalendarioConfigAccion();
      // Ordenar disponibilidad por día de la semana (1 a 6, luego 0)
      const ordenados = [...res.disponibilidad].sort((a, b) => {
        const da = a.diaSemana === 0 ? 7 : a.diaSemana;
        const db = b.diaSemana === 0 ? 7 : b.diaSemana;
        return da - db;
      });
      setDisponibilidad(ordenados);
      setDiasNoLaborables(res.diasNoLaborables || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarConfig();
  }, []);

  // Alternar bloqueo de un día de la semana
  const handleToggleDia = async (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    const msg = nuevoEstado 
      ? '¿Deseas bloquear las reservas automáticas para este día de la semana?'
      : '¿Deseas activar las reservas automáticas para este día de la semana?';
      
    if (confirm(msg)) {
      const res = await actualizarDiaBloqueoAccion(id, nuevoEstado);
      if (res.success) {
        setDisponibilidad(prev => prev.map(d => d.id === id ? { ...d, bloqueado: nuevoEstado } : d));
      } else {
        alert(res.error || 'Error al actualizar disponibilidad');
      }
    }
  };

  // Agregar día no laborable
  const handleAgregarFeriado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFecha) return;
    setErrorFecha('');

    const res = await agregarDiaNoLaborableAccion(nuevaFecha);
    if (res.success) {
      setDiasNoLaborables(res.diasNoLaborables || []);
      setNuevaFecha('');
    } else {
      setErrorFecha(res.error || 'Error al agregar fecha.');
    }
  };

  // Eliminar día no laborable
  const handleEliminarFeriado = async (fecha: string) => {
    if (confirm(`¿Estás seguro de que deseas habilitar nuevamente las reservas para el día ${fecha}?`)) {
      const res = await eliminarDiaNoLaborableAccion(fecha);
      if (res.success) {
        setDiasNoLaborables(res.diasNoLaborables || []);
      } else {
        alert(res.error || 'Error al eliminar fecha.');
      }
    }
  };

  // Convertir hora 24h a 12h
  const a12Horas = (hora24: string) => {
    if (!hora24) return '';
    const [h, m] = hora24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  if (cargando) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-800 font-light text-sm">Cargando disponibilidad...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      <div>
        <h2 className="text-2xl md:text-3xl font-light text-zinc-900 tracking-tight">Gestión de Disponibilidad</h2>
        <p className="text-zinc-500 text-sm font-light mt-1">Configura tus horarios de atención de reservas y bloquea fechas especiales como vacaciones o feriados.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* PANEL IZQUIERDO: HORARIOS SEMANALES (7 columnas) */}
        <div className="lg:col-span-7 bg-zinc-50/30 rounded-2xl border border-zinc-300/80 p-6 space-y-6">
          <h3 className="font-normal text-zinc-900 text-lg flex items-center space-x-2 border-b border-zinc-300/50 pb-3">
            <Clock className="w-5 h-5 text-zinc-500" />
            <span>Horario de Atención Semanal</span>
          </h3>

          <div className="bg-zinc-50/20 text-zinc-950 rounded-xl p-4 flex items-start space-x-3 border border-zinc-300/80 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-zinc-500" />
            <div>
              <strong className="font-medium text-zinc-900">Regla de Negocio Establecida:</strong>
              <p className="mt-1 font-light text-zinc-600">
                Lunes a Jueves se permite reservar en el bloque nocturno de **7:00 PM a 10:00 PM** (citas estándar de 1 hora: bloques **7:00 PM, 8:00 PM y 9:00 PM**). Viernes a Domingo está bloqueado por defecto, recomendando contacto a WhatsApp.
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-300/30">
            {disponibilidad.map((dia) => {
              const nombreDia = nombresDias[dia.diaSemana];
              const esFinSem = dia.diaSemana === 5 || dia.diaSemana === 6 || dia.diaSemana === 0;

              return (
                <div key={dia.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-normal text-sm text-zinc-900 flex items-center space-x-2">
                      <span>{nombreDia}</span>
                      {esFinSem && (
                        <span className="text-[9px] font-normal uppercase px-1.5 py-0.5 rounded-md bg-zinc-200/50 text-zinc-800 border border-zinc-300/60">
                          Fin de Semana
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-500 font-light block">
                      {dia.bloqueado 
                        ? 'Cerrado para reservas automáticas' 
                        : `Disponible: ${a12Horas(dia.horaInicio)} - ${a12Horas(dia.horaFin)}`
                      }
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Botón de alternar bloqueo */}
                    <button
                      onClick={() => handleToggleDia(dia.id, dia.bloqueado)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-light border transition-colors duration-300 cursor-pointer ${
                        dia.bloqueado 
                          ? 'bg-[#f3dedb] text-[#8c3d3a] border-[#e5c5c0] hover:bg-[#ecd5d2]' 
                          : 'bg-[#e6ebe7] text-[#3b5349] border-[#cedbd1] hover:bg-[#d8e2da]'
                      }`}
                    >
                      {dia.bloqueado ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-[#8c3d3a]" />
                          <span>Bloqueado</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-[#3b5349]" />
                          <span>Activo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* PANEL DERECHO: DÍAS NO LABORABLES / FERIADOS (5 columnas) */}
        <div className="lg:col-span-5 bg-zinc-50/30 rounded-2xl border border-zinc-300/80 p-6 space-y-6">
          <h3 className="font-normal text-zinc-900 text-lg flex items-center space-x-2 border-b border-zinc-300/50 pb-3">
            <CalendarDays className="w-5 h-5 text-zinc-500" />
            <span>Fechas Bloqueadas (Vacaciones)</span>
          </h3>

          <p className="text-xs text-zinc-500 font-light leading-relaxed">
            Agrega fechas específicas del año (feriados, asuetos, congresos, vacaciones) para bloquear el agendamiento del portal público por completo.
          </p>

          {/* Formulario de Agregar Día Feriado */}
          <form onSubmit={handleAgregarFeriado} className="space-y-3">
            <div>
              <label className="block text-xs font-light text-zinc-400 uppercase tracking-wide mb-1.5">
                Selecciona Fecha a Bloquear
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  required
                  className="flex-1 bg-transparent border border-zinc-300 rounded-xl py-2.5 px-3.5 text-xs text-zinc-900 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-100 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-center transition-colors duration-300 cursor-pointer animate-none"
                  title="Bloquear fecha"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {errorFecha && (
                <p className="text-[10px] text-red-650 font-light mt-1">{errorFecha}</p>
              )}
            </div>
          </form>

          {/* Listado de Días Bloqueados */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            <span className="block text-[10px] font-light text-zinc-400 uppercase tracking-wider mb-2">
              Días bloqueados ({diasNoLaborables.length})
            </span>
            
            {diasNoLaborables.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 font-light text-xs border border-dashed border-zinc-300 rounded-xl">
                No hay días bloqueados configurados.
              </div>
            ) : (
              diasNoLaborables.map((fecha) => {
                const [a, m, d] = fecha.split('-').map(Number);
                const descFechaStr = new Date(a, m - 1, d).toLocaleDateString('es-ES', { 
                  weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' 
                });

                return (
                  <div 
                    key={fecha} 
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-300 bg-transparent hover:bg-zinc-100/40 transition-colors duration-300"
                  >
                    <div className="min-w-0">
                      <span className="font-normal text-xs text-zinc-900 block">{fecha}</span>
                      <span className="text-[10px] text-zinc-500 font-light capitalize truncate block">{descFechaStr}</span>
                    </div>
                    
                    <button
                      onClick={() => handleEliminarFeriado(fecha)}
                      className="text-zinc-400 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors duration-300 cursor-pointer"
                      title="Eliminar de la lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
