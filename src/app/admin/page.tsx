'use client';

import React, { useState, useEffect } from 'react';
import { 
  getDashboardStatsAccion, 
  getCitasAccion, 
  confirmarCitaAccion, 
  cancelarCitaAccion, 
  completarCitaAccion,
  eliminarCitaAccion
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
  Trash2
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  citasHoy: number;
  pacientesTotales: number;
  citasCanceladasEsteMes: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    citasHoy: 0,
    pacientesTotales: 0,
    citasCanceladasEsteMes: 0
  });
  const [proximasCitas, setProximasCitas] = useState<any[]>([]);
  const [todasCitas, setTodasCitas] = useState<any[]>([]);
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
      
      setStats(resStats.stats);
      setProximasCitas(resStats.proximasCitas);
      setTodasCitas(resCitas);
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
        
        {/* CALENDARIO INTERACTIVO (8 columnas) */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-xs border border-cream-200 p-6">
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

          {/* Celdas del mes REDISEÑADAS para inyectar citas compactas */}
          <div className="grid grid-cols-7 gap-2">
            {/* Espacios vacíos */}
            {Array.from({ length: primerDiaSemana }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[140px] bg-cream-50/20 rounded-xl border border-cream-100"></div>
            ))}

            {/* Días activos */}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const dia = i + 1;
              const mesFormateado = String(mesActual + 1).padStart(2, '0');
              const diaFormateado = String(dia).padStart(2, '0');
              const celdaFechaStr = `${anioActual}-${mesFormateado}-${diaFormateado}`;
              
              const esSeleccionado = fechaSeleccionada === celdaFechaStr;
              const esHoy = hoyStr === celdaFechaStr;

              // Obtener citas del día
              const citasDia = todasCitas.filter(c => c.fecha === celdaFechaStr && c.estado !== 'cancelada');

              return (
                <div
                  key={dia}
                  onClick={() => setFechaSeleccionada(celdaFechaStr)}
                  className={`min-h-[140px] w-full p-2 text-left rounded-xl flex flex-col items-stretch border transition relative cursor-pointer ${
                    esSeleccionado 
                      ? 'bg-cream-150 border-sage-500 shadow-sm' 
                      : esHoy
                        ? 'bg-white border-sage-400 text-sage-650'
                        : 'bg-white border-cream-200 hover:border-sage-350 hover:bg-cream-50/30'
                  }`}
                >
                  {/* Encabezado del día */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                      esHoy ? 'bg-sage-600 text-white' : 'text-charcoal-700'
                    }`}>{dia}</span>
                    {citasDia.length > 0 && (
                      <span className="text-[9px] font-bold text-sage-800 bg-sage-50 border border-sage-200 px-1 rounded-md">
                        {citasDia.length}
                      </span>
                    )}
                  </div>

                  {/* Lista de citas inyectada directamente en el recuadro con scroll interno */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[100px] pr-0.5 scrollbar-thin">
                    {citasDia.map((cita) => {
                      const esPend = cita.estado === 'pendiente';
                      const esComp = cita.estado === 'completada';

                      return (
                        <div
                          key={cita.id}
                          className={`rounded-lg p-2 border text-[11px] leading-tight hover:shadow-md transition duration-150 flex flex-col gap-1 ${
                            esComp 
                              ? 'bg-charcoal-100 border-charcoal-300 text-charcoal-900' 
                              : esPend 
                                ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold' 
                                : 'bg-sage-100 border-sage-300 text-sage-950 font-bold'
                          }`}
                          title={`${cita.paciente?.nombreCompleto || 'Paciente'}\nTel: ${cita.paciente?.telefono || ''}\nEmail: ${cita.paciente?.email || ''}`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] uppercase font-black tracking-wide text-charcoal-800 bg-white/60 px-1.5 py-0.5 rounded-sm w-max">
                              {a12Horas(cita.horaInicio)}
                            </span>
                            <span className="font-extrabold text-charcoal-900 text-[11px] block truncate">{cita.paciente?.nombreCompleto}</span>
                          </div>
                          <div className="text-[9px] border-t border-black/10 pt-1 text-charcoal-800 space-y-0.5 font-medium">
                            <span className="block truncate">📞 {cita.paciente?.telefono}</span>
                            <span className="block truncate">✉️ {cita.paciente?.email}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* DETALLE DEL DÍA SELECCIONADO (4 columnas) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-cream-200 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-extrabold text-charcoal-900 text-md border-b border-cream-150 pb-3 mb-4">
            Citas del {fechaSeleccionada === hoyStr ? 'Hoy' : 'Día'}
          </h3>
          
          <p className="text-xs font-bold text-charcoal-700 mb-4 uppercase tracking-wider">
            {formatearFechaEsp(fechaSeleccionada)}
          </p>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[350px] pr-1">
            {citasDelDiaSeleccionado.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-charcoal-700 space-y-2">
                <CalendarIcon className="w-8 h-8 text-cream-400" />
                <p className="text-xs text-charcoal-700">No hay citas programadas para este día.</p>
              </div>
            ) : (
              citasDelDiaSeleccionado.map((cita) => {
                const esPendiente = cita.estado === 'pendiente';
                const esConfirmada = cita.estado === 'confirmada';
                const esCompletada = cita.estado === 'completada';
                const esCancelada = cita.estado === 'cancelada';

                return (
                  <div
                    key={cita.id}
                    className={`rounded-xl border p-4 space-y-3 transition ${
                      esCancelada 
                        ? 'border-cream-150 bg-cream-50/20 opacity-60' 
                        : esPendiente 
                          ? 'border-amber-100 bg-amber-50/20' 
                          : 'border-cream-200 bg-white shadow-xs'
                    }`}
                  >
                    {/* Fila Superior */}
                    <div className="flex items-start justify-between">
                      <div>
                        <Link 
                          href={`/admin/pacientes?id=${cita.pacienteId}`}
                          className="font-bold text-charcoal-900 hover:text-sage-650 text-sm block"
                        >
                          {cita.paciente?.nombreCompleto || 'Paciente Desconocido'}
                        </Link>
                        <div className="flex items-center space-x-1.5 text-[11px] text-charcoal-700 mt-1">
                          <Clock className="w-3.5 h-3.5 text-sage-500" />
                          <span>{a12Horas(cita.horaInicio)} - {a12Horas(cita.horaFin)}</span>
                        </div>
                      </div>

                      {/* Badge de estado */}
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        esPendiente 
                          ? 'bg-amber-100 text-amber-800' 
                          : esConfirmada 
                            ? 'bg-sage-100 text-sage-800'
                            : esCompletada 
                              ? 'bg-charcoal-100 text-charcoal-900'
                              : 'bg-red-50 text-red-800'
                      }`}>
                        {cita.estado}
                      </span>
                    </div>

                    {/* Fila de Detalles */}
                    <div className="text-[11px] text-charcoal-700 flex items-center gap-4 border-t border-cream-150 pt-2">
                      <div className="flex items-center space-x-1">
                        <Video className="w-3.5 h-3.5 text-sage-500" />
                        <span>Online</span>
                      </div>
                      
                      {cita.linkReunion && (
                        <a 
                          href={cita.linkReunion} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sage-650 hover:underline flex items-center space-x-0.5 font-bold"
                        >
                          <span>Meet</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {/* Acciones Rápidas */}
                    {!esCancelada && !esCompletada && (
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-cream-150">
                        {esPendiente && (
                          <button
                            onClick={() => handleConfirmar(cita.id)}
                            className="bg-sage-50 hover:bg-sage-100 text-sage-800 p-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 border border-sage-100"
                            title="Confirmar Cita"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirmar</span>
                          </button>
                        )}
                        {esConfirmada && (
                          <button
                            onClick={() => handleCompletar(cita.id)}
                            className="bg-cream-150 hover:bg-cream-200 text-charcoal-900 p-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 border border-cream-300"
                            title="Completar Turno"
                          >
                            <Play className="w-3.5 h-3.5 text-sage-600" />
                            <span>Completar</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelar(cita.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 p-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                          title="Cancelar Cita"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                        <button
                          onClick={() => abrirModalEliminar(cita.id)}
                          className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 border border-stone-300"
                          title="Eliminar Cita de la BD"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-650" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    )}
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
