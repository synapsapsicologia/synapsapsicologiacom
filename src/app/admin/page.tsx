'use client';

import React, { useState, useEffect } from 'react';
import { 
  getDashboardStatsAccion, 
  getCitasAccion, 
  confirmarCitaAccion, 
  cancelarCitaAccion, 
  completarCitaAccion,
  eliminarCitaAccion,
  getCalendarioConfigAccion
} from '@/app/actions';
import { 
  Calendar as CalendarIcon, 
  Users, 
  CalendarX, 
  Video, 
  MapPin, 
  Check, 
  X, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  ExternalLink,
  Trash2,
  Phone,
  Mail,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  citasHoy: number;
  pacientesTotales: number;
  citasCanceladasEsteMes: number;
}

// Helper para limpiar el teléfono y generar el link de WhatsApp
const obtenerLinkWhatsApp = (telefono: string | undefined | null, nombre: string, hora: string) => {
  if (!telefono) return '';
  const numbersOnly = telefono.replace(/\D/g, '');
  let finalPhone = numbersOnly;
  if (numbersOnly.length === 8) {
    finalPhone = `503${numbersOnly}`;
  }
  const mensaje = `Hola ${nombre}, te saluda la Licda. Selena Gálvez. Te escribo para confirmar nuestra sesión programada para hoy a las ${hora}. ¡Nos vemos pronto!`;
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(mensaje)}`;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    citasHoy: 0,
    pacientesTotales: 0,
    citasCanceladasEsteMes: 0
  });
  const [proximasCitas, setProximasCitas] = useState<any[]>([]);
  const [todasCitas, setTodasCitas] = useState<any[]>([]);
  const [diasNoLaborables, setDiasNoLaborables] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  // Fecha seleccionada para el detalle diario
  const hoyStr = new Date().toISOString().split('T')[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyStr);

  // Navegación de mes del calendario
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());

  // --- ESTADOS DE ELIMINACIÓN ---
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [citaIdAEliminar, setCitaIdAEliminar] = useState<string | null>(null);

  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Cargar datos
  const cargarDatos = async () => {
    try {
      const resStats = await getDashboardStatsAccion();
      const resCitas = await getCitasAccion();
      const resConfig = await getCalendarioConfigAccion();
      
      setStats(resStats.stats);
      setProximasCitas(resStats.proximasCitas);
      setTodasCitas(resCitas);
      setDiasNoLaborables(resConfig.diasNoLaborables || []);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- ACCIONES RÁPIDAS ---
  const abrirModalEliminar = (citaId: string) => {
    setCitaIdAEliminar(citaId);
    setModalEliminarAbierto(true);
  };

  const confirmarEliminarCita = async (notificar: boolean) => {
    if (!citaIdAEliminar) return;
    
    const res = await eliminarCitaAccion(citaIdAEliminar, notificar);
    if (res.success) {
      alert('Cita eliminada con éxito.');
      setModalEliminarAbierto(false);
      setCitaIdAEliminar(null);
      await cargarDatos();
    } else {
      alert(res.error || 'Error al eliminar la cita.');
    }
  };

  const handleConfirmar = async (citaId: string) => {
    if (confirm('¿Desea confirmar esta cita? El paciente recibirá un correo de confirmación.')) {
      const res = await confirmarCitaAccion(citaId);
      if (res.success) {
        alert('Cita confirmada con éxito.');
        await cargarDatos();
      } else {
        alert(res.error || 'Error al confirmar cita');
      }
    }
  };

  const handleCancelar = async (citaId: string) => {
    if (confirm('¿Desea cancelar esta cita? Se liberará el horario y se enviará una notificación por correo al paciente.')) {
      const res = await cancelarCitaAccion(citaId);
      if (res.success) {
        alert('Cita cancelada con éxito.');
        await cargarDatos();
      } else {
        alert(res.error || 'Error al cancelar cita');
      }
    }
  };

  const handleCompletar = async (citaId: string) => {
    if (confirm('¿Desea marcar esta cita como completada?')) {
      const res = await completarCitaAccion(citaId);
      if (res.success) {
        alert('Cita completada.');
        await cargarDatos();
      } else {
        alert(res.error || 'Error al completar cita');
      }
    }
  };

  // --- NAVEGACIÓN CALENDARIO ---
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

  // Citas del día seleccionado
  const citasDelDiaSeleccionado = todasCitas.filter(c => c.fecha === fechaSeleccionada);

  // Formatear fecha para detalle
  const formatearFechaEsp = (fechaStr: string) => {
    if (!fechaStr) return '';
    const [a, m, d] = fechaStr.split('-').map(Number);
    const date = new Date(a, m - 1, d);
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Convertir hora a 12 horas para visualización
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
        <p className="text-charcoal-800 font-semibold text-sm">Cargando panel de administración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Saludo y Botón rápido */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-charcoal-900 tracking-tight">Hola, Selena</h2>
          <p className="text-charcoal-700 text-sm">Aquí tienes un resumen de tu agenda y actividad clínica de hoy.</p>
        </div>
        <div>
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-sage-600 to-olive-700 hover:from-sage-700 hover:to-olive-800 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md shadow-sage-100 transition duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cita (Cliente)</span>
          </Link>
        </div>
      </div>

      {/* METRICAS (Tarjetas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Citas de hoy */}
        <div className="bg-white rounded-2xl shadow-xs border border-cream-200 p-6 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-bold text-sage-650 uppercase tracking-wide">Citas de Hoy</span>
            <h3 className="text-3xl font-extrabold text-charcoal-900">{stats.citasHoy}</h3>
            <p className="text-charcoal-400 text-[10px] font-semibold">Sesiones programadas</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center text-sage-600">
            <CalendarIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Pacientes Totales */}
        <div className="bg-white rounded-2xl shadow-xs border border-cream-200 p-6 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-bold text-olive-600 uppercase tracking-wide">Pacientes Totales</span>
            <h3 className="text-3xl font-extrabold text-charcoal-900">{stats.pacientesTotales}</h3>
            <p className="text-charcoal-400 text-[10px] font-semibold">En base de datos</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-olive-50 flex items-center justify-center text-olive-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Citas canceladas */}
        <div className="bg-white rounded-2xl shadow-xs border border-cream-200 p-6 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-bold text-red-650 uppercase tracking-wide">Canceladas Este Mes</span>
            <h3 className="text-3xl font-extrabold text-charcoal-900">{stats.citasCanceladasEsteMes}</h3>
            <p className="text-charcoal-400 text-[10px] font-semibold">Tasa de cancelación mensual</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50/50 flex items-center justify-center text-red-700">
            <CalendarX className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* DASHBOARD PRINCIPAL - CALENDARIO & DETALLES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CALENDARIO INTERACTIVO (5 columnas) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-xs border border-cream-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-extrabold text-charcoal-900 text-lg flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-sage-600" />
              <span>Calendario de Citas</span>
            </h3>
            
            {/* Controles de mes */}
            <div className="flex items-center space-x-2">
              <button
                onClick={irMesAnterior}
                className="p-1.5 rounded-lg border border-cream-200 hover:bg-cream-50 text-charcoal-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-charcoal-800 min-w-[110px] text-center">
                {nombresMeses[mesActual]} {anioActual}
              </span>
              <button
                onClick={irMesSiguiente}
                className="p-1.5 rounded-lg border border-cream-200 hover:bg-cream-50 text-charcoal-700 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Días de la Semana */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-charcoal-700 mb-2 uppercase tracking-wide">
            {diasSemana.map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Celdas del mes con puntos sutiles */}
          <div className="grid grid-cols-7 gap-2">
            {/* Espacios vacíos */}
            {Array.from({ length: primerDiaSemana }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[70px] bg-cream-50/20 rounded-xl border border-cream-100"></div>
            ))}

            {/* Días activos */}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const dia = i + 1;
              const mesFormateado = String(mesActual + 1).padStart(2, '0');
              const diaFormateado = String(dia).padStart(2, '0');
              const celdaFechaStr = `${anioActual}-${mesFormateado}-${diaFormateado}`;
              
              const esSeleccionado = fechaSeleccionada === celdaFechaStr;
              const esHoy = hoyStr === celdaFechaStr;
              const esBloqueado = diasNoLaborables.includes(celdaFechaStr);

              // Obtener citas del día
              const citasDia = todasCitas.filter(c => c.fecha === celdaFechaStr && c.estado !== 'cancelada');

              return (
                <div
                  key={dia}
                  onClick={() => setFechaSeleccionada(celdaFechaStr)}
                  className={`min-h-[70px] w-full p-2 text-left rounded-xl flex flex-col items-center justify-between border transition relative cursor-pointer ${
                    esBloqueado
                      ? 'bg-zinc-100/80 border-zinc-250 text-zinc-450 opacity-60'
                      : esSeleccionado 
                        ? 'bg-cream-150 border-sage-500 shadow-sm' 
                        : esHoy
                          ? 'bg-white border-sage-400 text-sage-650'
                          : 'bg-white border-cream-200 hover:border-sage-350 hover:bg-cream-50/30'
                  }`}
                >
                  {/* Linea diagonal sutil si está bloqueado */}
                  {esBloqueado && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden rounded-xl">
                      <div className="w-[150%] h-[1px] bg-zinc-300/80 rotate-45 transform"></div>
                    </div>
                  )}

                  {/* Encabezado del día */}
                  <div className="flex items-center justify-center w-full">
                    <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      esHoy 
                        ? 'bg-sage-600 text-white' 
                        : esBloqueado
                          ? 'text-zinc-400 line-through'
                          : 'text-charcoal-700'
                    }`}>{dia}</span>
                  </div>

                  {/* Punto sutil del color del semáforo */}
                  <div className="flex justify-center items-center h-4 space-x-1">
                    {citasDia.length > 0 && (() => {
                      let dotColor = 'bg-zinc-400';
                      if (citasDia.some(c => c.estado === 'pendiente')) {
                        dotColor = 'bg-amber-400'; // Amarillo
                      } else if (citasDia.some(c => c.estado === 'confirmada')) {
                        dotColor = 'bg-emerald-500'; // Verde
                      } else if (citasDia.some(c => c.estado === 'completada')) {
                        dotColor = 'bg-purple-500'; // Morado
                      }
                      return <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* DETALLE DEL DÍA SELECCIONADO (7 columnas) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xs border border-cream-200 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-extrabold text-charcoal-900 text-md border-b border-cream-150 pb-3 mb-4 flex items-center justify-between">
            <span>Agenda Diaria</span>
            <span className="text-xs font-normal text-zinc-500 lowercase">
              {citasDelDiaSeleccionado.length} {citasDelDiaSeleccionado.length === 1 ? 'cita' : 'citas'}
            </span>
          </h3>
          
          <p className="text-xs font-bold text-charcoal-700 mb-4 uppercase tracking-wider">
            {formatearFechaEsp(fechaSeleccionada)}
          </p>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[550px] pr-1">
            {citasDelDiaSeleccionado.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 text-charcoal-700 space-y-2 border border-dashed border-zinc-200 rounded-2xl">
                <CalendarIcon className="w-8 h-8 text-zinc-350" />
                <p className="text-xs text-zinc-500">No hay citas programadas para este día.</p>
              </div>
            ) : (
              citasDelDiaSeleccionado.map((cita) => {
                const esPendiente = cita.estado === 'pendiente';
                const esConfirmada = cita.estado === 'confirmada';
                const esCompletada = cita.estado === 'completada';
                const esCancelada = cita.estado === 'cancelada';

                // Helper para parsear tipo de sesión
                const obtenerTipoSesion = (notas: any) => {
                  const n = (notas || '').toUpperCase();
                  if (n.includes('TRATAMIENTO')) return 'Tratamiento';
                  if (n.includes('DIAGNOSTICO') || n.includes('DIAGNÓSTICO')) return 'Diagnóstico';
                  return 'Consulta';
                };
                const tipoSesion = obtenerTipoSesion(cita.notasSesion || cita.notasHistorial);

                return (
                  <div
                    key={cita.id}
                    className={`bg-white/40 backdrop-blur-md border border-zinc-200/50 p-6 rounded-2xl mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs hover:shadow-md transition duration-305 ${
                      esCancelada ? 'opacity-60 border-zinc-200' : ''
                    }`}
                  >
                    {/* Fila/Detalles del Paciente */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      {/* Hora Destacada */}
                      <div className="flex-shrink-0 bg-zinc-100/50 px-4 py-3 rounded-xl border border-zinc-200 text-center min-w-[110px]">
                        <span className="text-2xl font-semibold text-zinc-900 block leading-none">{a12Horas(cita.horaInicio)}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1.5 block font-mono">Fin: {a12Horas(cita.horaFin)}</span>
                      </div>
                      
                      {/* Nombre, Badge y Contactos */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link 
                            href={`/admin/pacientes?id=${cita.pacienteId}`}
                            className="text-lg font-bold text-zinc-800 hover:text-zinc-950 transition-colors"
                          >
                            {cita.paciente?.nombreCompleto || 'Paciente Desconocido'}
                          </Link>
                          <span className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                            tipoSesion === 'Tratamiento' 
                              ? 'bg-teal-50 text-teal-800 border-teal-200' 
                              : tipoSesion === 'Diagnóstico'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                          }`}>
                            {tipoSesion}
                          </span>
                        </div>
                        
                        {/* Datos de contacto */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-zinc-650 font-light">
                          <span className="flex items-center space-x-1.5">
                            <Phone className="w-3.5 h-3.5 text-zinc-450" />
                            <span className="select-all">{cita.paciente?.telefono || 'Sin teléfono'}</span>
                          </span>
                          <span className="flex items-center space-x-1.5">
                            <Mail className="w-3.5 h-3.5 text-zinc-450" />
                            <span className="select-all">{cita.paciente?.email || 'Sin correo'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones y estado */}
                    <div className="flex flex-col items-end justify-between gap-3 min-w-[150px] border-t md:border-t-0 pt-4 md:pt-0 border-zinc-200/60">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          esPendiente 
                            ? 'bg-amber-50 text-amber-800 border-amber-250' 
                            : esConfirmada 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                              : esCompletada 
                                ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                                : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          {cita.estado}
                        </span>
                        {cita.linkReunion && (
                          <a 
                            href={cita.linkReunion} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-500 hover:text-zinc-950 font-normal underline flex items-center space-x-1"
                          >
                            <span>Meet</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {cita.paciente?.telefono && (() => {
                          const wsLink = obtenerLinkWhatsApp(
                            cita.paciente.telefono,
                            cita.paciente.nombreCompleto || 'Paciente',
                            a12Horas(cita.horaInicio)
                          );
                          if (!wsLink) return null;
                          return (
                            <a 
                              href={wsLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center space-x-1 transition-colors"
                              title="Enviar recordatorio por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-emerald-100/50" />
                              <span>WhatsApp</span>
                            </a>
                          );
                        })()}
                      </div>

                      {/* Botones de acción rápida */}
                      {!esCancelada && !esCompletada && (
                        <div className="flex items-center space-x-1.5">
                          {esPendiente && (
                            <button
                              onClick={() => handleConfirmar(cita.id)}
                              className="border border-emerald-300 hover:bg-emerald-50 text-emerald-800 p-1.5 rounded-lg text-xs font-normal transition flex items-center space-x-1 bg-transparent cursor-pointer"
                              title="Confirmar Cita"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirmar</span>
                            </button>
                          )}
                          {esConfirmada && (
                            <button
                              onClick={() => handleCompletar(cita.id)}
                              className="border border-zinc-350 hover:bg-zinc-100 text-zinc-800 p-1.5 rounded-lg text-xs font-normal transition flex items-center space-x-1 bg-transparent cursor-pointer"
                              title="Completar Turno"
                            >
                              <Play className="w-3.5 h-3.5 text-zinc-600" />
                              <span>Completar</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelar(cita.id)}
                            className="border border-red-300 hover:bg-red-50 text-red-700 p-1.5 rounded-lg text-xs font-normal transition flex items-center space-x-1 bg-transparent cursor-pointer"
                            title="Cancelar Cita"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancelar</span>
                          </button>
                          <button
                            onClick={() => abrirModalEliminar(cita.id)}
                            className="border border-zinc-300 hover:bg-zinc-100 text-zinc-800 p-1.5 rounded-lg text-xs font-normal transition flex items-center space-x-1 bg-transparent cursor-pointer"
                            title="Eliminar Cita de la BD"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* LISTADO DE PROXIMAS CITAS GENERALES */}
      <div className="bg-white rounded-2xl shadow-xs border border-cream-200 p-6">
        <h3 className="font-extrabold text-charcoal-900 text-lg mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-sage-600" />
          <span>Próximas Sesiones Programadas</span>
        </h3>

        <div className="overflow-x-auto">
          {proximasCitas.length === 0 ? (
            <div className="text-center py-8 text-charcoal-700 text-sm">
              No hay próximas citas registradas.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cream-150 text-xs text-charcoal-700 uppercase font-bold">
                  <th className="pb-3 font-semibold">Paciente</th>
                  <th className="pb-3 font-semibold">Fecha y Hora</th>
                  <th className="pb-3 font-semibold">Modalidad</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-sm">
                {proximasCitas.map((cita) => {
                  const pacienteObj = todasCitas.find(c => c.id === cita.id)?.paciente;
                  return (
                    <tr key={cita.id} className="hover:bg-cream-50/30 transition-colors">
                      <td className="py-4">
                        <Link 
                          href={`/admin/pacientes?id=${cita.pacienteId}`}
                          className="font-bold text-charcoal-900 hover:text-sage-650"
                        >
                          {pacienteObj?.nombreCompleto || 'Paciente'}
                        </Link>
                        <span className="block text-[11px] text-charcoal-400">{pacienteObj?.email}</span>
                      </td>
                      <td className="py-4 font-medium text-charcoal-900">
                        <div>{cita.fecha}</div>
                        <div className="text-xs text-charcoal-700">{a12Horas(cita.horaInicio)}</div>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center space-x-1 text-xs text-charcoal-700">
                          <Video className="w-3.5 h-3.5 text-sage-500" />
                          <span>Online</span>
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          cita.estado === 'pendiente' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-sage-100 text-sage-800'
                        }`}>
                          {cita.estado}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {cita.estado === 'pendiente' && (
                            <button
                              onClick={() => handleConfirmar(cita.id)}
                              className="bg-sage-650 hover:bg-sage-750 text-white p-1 rounded-lg transition"
                              title="Confirmar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelar(cita.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-650 p-1.5 rounded-lg transition"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirModalEliminar(cita.id)}
                            className="bg-stone-50 hover:bg-stone-150 text-stone-600 p-1.5 rounded-lg border border-stone-200 transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL DE ELIMINACIÓN DE CITA */}
      {modalEliminarAbierto && (
        <div className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-cream-250 p-6 space-y-6 animate-in zoom-in-95 duration-200 text-charcoal-900">
            <div className="flex items-center space-x-3 text-red-600">
              <Trash2 className="w-6 h-6" />
              <h4 className="text-lg font-bold">Eliminar Cita</h4>
            </div>
            
            <p className="text-sm text-charcoal-700 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente esta cita? Esta acción removerá por completo el registro de la base de datos local y no podrá deshacerse.
            </p>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => confirmarEliminarCita(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-md shadow-red-100 hover:scale-[1.01] active:scale-[0.99]"
              >
                Opción A: Eliminar y Notificar al Paciente por Correo
              </button>
              <button
                onClick={() => confirmarEliminarCita(false)}
                className="w-full bg-stone-600 hover:bg-stone-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-md hover:scale-[1.01] active:scale-[0.99]"
              >
                Opción B: Eliminar de forma silenciosa (Solo borrar de BD)
              </button>
              <button
                onClick={() => setModalEliminarAbierto(false)}
                className="w-full bg-cream-150 hover:bg-cream-200 text-charcoal-850 font-bold py-2.5 px-4 rounded-xl text-xs border border-cream-350 transition hover:scale-[1.01] active:scale-[0.99]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
