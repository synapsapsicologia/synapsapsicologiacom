'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getCalendarioConfigAccion, 
  actualizarDiaBloqueoAccion, 
  agregarDiaNoLaborableAccion, 
  eliminarDiaNoLaborableAccion,
  actualizarDiasNoLaborablesLoteAccion
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
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function DisponibilidadPage() {
  const router = useRouter();
  const [disponibilidad, setDisponibilidad] = useState<any[]>([]);
  const [diasNoLaborables, setDiasNoLaborables] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  // Fechas seleccionadas localmente para bloquear
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState<string[]>([]);
  const [cargandoLote, setCargandoLote] = useState(false);

  // Navegación de mes del mini-calendario
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());

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
      setFechasSeleccionadas(res.diasNoLaborables || []);
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

  // Navegación de mes del mini-calendario
  const irMesAnterior = () => {
    if (mesActual === 0) {
      setMesActual(11);
      setAnioActual(prev => prev - 1);
    } else {
      setMesActual(prev => prev - 1);
    }
  };

  const irMesSiguiente = () => {
    if (mesActual === 11) {
      setMesActual(0);
      setAnioActual(prev => prev + 1);
    } else {
      setMesActual(prev => prev + 1);
    }
  };

  const obtenerDiasEnMes = (mes: number, anio: number) => {
    return new Date(anio, mes + 1, 0).getDate();
  };

  const obtenerPrimerDiaMes = (mes: number, anio: number) => {
    return new Date(anio, mes, 1).getDay();
  };

  const diasEnMes = obtenerDiasEnMes(mesActual, anioActual);
  const primerDiaSemana = obtenerPrimerDiaMes(mesActual, anioActual);
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Alternar fecha seleccionada localmente
  const toggleFechaSeleccionada = (fechaStr: string) => {
    setFechasSeleccionadas(prev => 
      prev.includes(fechaStr)
        ? prev.filter(f => f !== fechaStr)
        : [...prev, fechaStr]
    );
  };

  // Guardar todas las fechas en lote
  const handleGuardarFechasLote = async () => {
    setCargandoLote(true);
    try {
      // Asegurar formato de strings YYYY-MM-DD explícitamente
      const fechasFormateadas = fechasSeleccionadas.map(f => {
        if (!f) return '';
        if ((f as any) instanceof Date) {
          const year = (f as any).getFullYear();
          const month = String((f as any).getMonth() + 1).padStart(2, '0');
          const day = String((f as any).getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        if (typeof f === 'string') {
          const trimmed = f.trim();
          if (trimmed.includes('T')) {
            return trimmed.split('T')[0];
          }
          return trimmed;
        }
        try {
          const d = new Date(f as any);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        } catch (_) {}
        return String(f);
      }).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f));

      const res = await actualizarDiasNoLaborablesLoteAccion(fechasFormateadas);
      if (res.success) {
        router.refresh();
        setDiasNoLaborables(res.diasNoLaborables || []);
        setFechasSeleccionadas(res.diasNoLaborables || []);
        alert('Fechas bloqueadas actualizadas correctamente en lote');
      } else {
        alert(res.error || 'Error al guardar las fechas.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al guardar las fechas.');
    } finally {
      setCargandoLote(false);
    }
  };

  // Eliminar día no laborable desde el listado inferior
  const handleEliminarFeriado = async (fecha: string) => {
    if (confirm(`¿Estás seguro de que deseas habilitar nuevamente las reservas para el día ${fecha}?`)) {
      // Garantizar formato string ISO plano
      const fechaNormalizada = typeof fecha === 'string' && fecha.includes('T') ? fecha.split('T')[0] : String(fecha);
       const res = await eliminarDiaNoLaborableAccion(fechaNormalizada);
      if (res.success) {
        router.refresh();
        setDiasNoLaborables(res.diasNoLaborables || []);
        setFechasSeleccionadas(res.diasNoLaborables || []);
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
        <div className="w-12 h-12 border-4 border-sage-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-charcoal-800 font-semibold text-sm">Cargando disponibilidad...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-charcoal-900 tracking-tight">Gestión de Disponibilidad</h2>
        <p className="text-charcoal-700 text-sm">Configura tus horarios de atención de reservas y bloquea fechas especiales como vacaciones o feriados.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* PANEL IZQUIERDO: HORARIOS SEMANALES (7 columnas) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xs border border-cream-200 p-6 space-y-6">
          <h3 className="font-extrabold text-charcoal-900 text-lg flex items-center space-x-2 border-b border-cream-50 pb-3">
            <Clock className="w-5 h-5 text-sage-600" />
            <span>Horario de Atención Semanal</span>
          </h3>

          <div className="bg-cream-150 text-charcoal-900 rounded-xl p-4 flex items-start space-x-3 border border-cream-200 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-sage-600" />
            <div>
              <strong className="font-bold">Regla de Negocio Establecida:</strong>
              <p className="mt-1">
                Lunes a Jueves se permite reservar en el bloque nocturno de **7:00 PM a 10:00 PM** (citas estándar de 1 hora: bloques **7:00 PM, 8:00 PM y 9:00 PM**). Viernes a Domingo está bloqueado por defecto, recomendando contacto a WhatsApp.
              </p>
            </div>
          </div>

          <div className="divide-y divide-cream-100">
            {disponibilidad.map((dia) => {
              const nombreDia = nombresDias[dia.diaSemana];
              const esFinSem = dia.diaSemana === 5 || dia.diaSemana === 6 || dia.diaSemana === 0;

              return (
                <div key={dia.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-bold text-sm text-charcoal-800 flex items-center space-x-2">
                      <span>{nombreDia}</span>
                      {esFinSem && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-cream-200 text-charcoal-800 border border-cream-300">
                          Fin de Semana
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-charcoal-700 block">
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
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        dia.bloqueado 
                          ? 'bg-red-550/10 hover:bg-red-100 text-red-700 border-red-200' 
                          : 'bg-sage-100 hover:bg-sage-200 text-sage-800 border-sage-250'
                      }`}
                    >
                      {dia.bloqueado ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-red-500" />
                          <span>Bloqueado</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-sage-600" />
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
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-xs border border-cream-200 p-6 space-y-6">
          <h3 className="font-extrabold text-charcoal-900 text-lg flex items-center space-x-2 border-b border-cream-50 pb-3">
            <CalendarDays className="w-5 h-5 text-sage-600" />
            <span>Fechas Bloqueadas (Vacaciones)</span>
          </h3>

          <p className="text-xs text-charcoal-700 leading-relaxed">
            Bloquea fechas específicas (vacaciones, feriados, días no laborables) seleccionando directamente los días en el calendario interactivo.
          </p>

          {/* Mini-Calendario Interactivo Múltiple */}
          <div className="border border-cream-150 rounded-2xl p-4 bg-cream-50/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-800 uppercase tracking-wide">
                Selecciona en el Calendario
              </span>
              
              {/* Controles de mes */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={irMesAnterior}
                  className="p-1.5 rounded-lg border border-cream-200 hover:bg-cream-50 text-charcoal-700 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-charcoal-800 min-w-[95px] text-center capitalize">
                  {nombresMeses[mesActual]} {anioActual}
                </span>
                <button
                  type="button"
                  onClick={irMesSiguiente}
                  className="p-1.5 rounded-lg border border-cream-200 hover:bg-cream-50 text-charcoal-700 transition cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Días de la Semana */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-charcoal-700 uppercase tracking-wider">
              {diasSemana.map(d => (
                <div key={d} className="py-0.5">{d}</div>
              ))}
            </div>

            {/* Celdas del mes */}
            <div className="grid grid-cols-7 gap-1">
              {/* Espacios vacíos */}
              {Array.from({ length: primerDiaSemana }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-transparent rounded-lg"></div>
              ))}

              {/* Días activos */}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                const dia = i + 1;
                const mesFormateado = String(mesActual + 1).padStart(2, '0');
                const diaFormateado = String(dia).padStart(2, '0');
                const celdaFechaStr = `${anioActual}-${mesFormateado}-${diaFormateado}`;
                
                const esSeleccionado = fechasSeleccionadas.includes(celdaFechaStr);
                const esOriginal = diasNoLaborables.includes(celdaFechaStr);
                const esHoy = new Date().toISOString().split('T')[0] === celdaFechaStr;

                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleFechaSeleccionada(celdaFechaStr)}
                    className={`aspect-square w-full rounded-lg flex items-center justify-center text-xs font-bold transition relative cursor-pointer border ${
                      esSeleccionado
                        ? 'bg-sage-600 hover:bg-sage-700 text-white border-sage-700 shadow-xs'
                        : esHoy
                          ? 'bg-white border-sage-400 text-sage-650 hover:bg-cream-50/50 font-extrabold'
                          : 'bg-white border-cream-200 hover:border-sage-350 hover:bg-cream-50/30 text-charcoal-750'
                    }`}
                  >
                    <span>{dia}</span>
                    {/* Indicador de cambio no guardado */}
                    {esSeleccionado && !esOriginal && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                    )}
                    {!esSeleccionado && esOriginal && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Botón de Confirmación en Lote */}
            <button
              type="button"
              onClick={handleGuardarFechasLote}
              disabled={cargandoLote}
              className="w-full bg-gradient-to-r from-sage-600 to-olive-700 hover:from-sage-700 hover:to-olive-800 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-sage-100 transition duration-200 flex items-center justify-center space-x-2 text-xs cursor-pointer"
            >
              <span>{cargandoLote ? 'Guardando...' : 'Confirmar Bloqueo de Fechas'}</span>
            </button>
          </div>

          {/* Listado de Días Bloqueados */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            <span className="block text-[10px] font-bold text-charcoal-400 uppercase tracking-wider mb-2">
              Días bloqueados ({diasNoLaborables.length})
            </span>
            
            {diasNoLaborables.length === 0 ? (
              <div className="text-center py-6 text-charcoal-700 text-xs border border-dashed border-cream-200 rounded-xl">
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
                    className="flex items-center justify-between p-3 rounded-xl border border-cream-150 bg-cream-50/20 hover:bg-cream-100 transition"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-charcoal-900 block">{fecha}</span>
                      <span className="text-[10px] text-charcoal-700 capitalize truncate block">{descFechaStr}</span>
                    </div>
                    
                    <button
                      onClick={() => handleEliminarFeriado(fecha)}
                      className="text-charcoal-400 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
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
