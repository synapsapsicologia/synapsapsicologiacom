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
        <div className="w-12 h-12 border-4 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-600 font-light text-sm">Cargando panel de administración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Saludo y Botón rápido */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-light text-zinc-900 tracking-tight">Hola, Selena</h2>
          <p className="text-zinc-550 text-sm font-light">Aquí tienes un resumen de tu agenda y actividad clínica de hoy.</p>
        </div>
        <div>
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center space-x-2 border border-zinc-400 hover:border-zinc-800 text-zinc-800 hover:text-zinc-950 font-normal py-2.5 px-5 rounded-xl text-xs transition-colors duration-300 bg-transparent"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cita (Cliente)</span>
          </Link>
        </div>
      </div>

      {/* METRICAS (Tarjetas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Citas de hoy */}
        <div className="bg-zinc-50/30 rounded-2xl border border-zinc-300/80 p-6 flex items-center justify-between transition-colors duration-300">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-550 uppercase tracking-wider">Citas de Hoy</span>
            <h3 className="text-3xl font-light text-zinc-900">{stats.citasHoy}</h3>
            <p className="text-zinc-400 text-[10px] font-mono">SESIONES PROGRAMADAS</p>
          </div>
          <div className="w-12 h-12 rounded-xl border border-zinc-300/50 flex items-center justify-center text-zinc-700">
            <CalendarIcon className="w-5 h-5 font-light" />
          </div>
        </div>

        {/* Pacientes Totales */}
        <div className="bg-zinc-50/30 rounded-2xl border border-zinc-300/80 p-6 flex items-center justify-between transition-colors duration-300">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-550 uppercase tracking-wider">Pacientes Totales</span>
            <h3 className="text-3xl font-light text-zinc-900">{stats.pacientesTotales}</h3>
            <p className="text-zinc-400 text-[10px] font-mono">EN BASE DE DATOS</p>
          </div>
          <div className="w-12 h-12 rounded-xl border border-zinc-300/50 flex items-center justify-center text-zinc-700">
            <Users className="w-5 h-5 font-light" />
          </div>
        </div>

        {/* Citas canceladas */}
        <div className="bg-zinc-50/30 rounded-2xl border border-zinc-300/80 p-6 flex items-center justify-between transition-colors duration-300">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-550 uppercase tracking-wider">Canceladas Este Mes</span>
            <h3 className="text-3xl font-light text-zinc-900">{stats.citasCanceladasEsteMes}</h3>
            <p className="text-zinc-400 text-[10px] font-mono">TASA DE CANCELACIÓN MENSUAL</p>
          </div>
          <div className="w-12 h-12 rounded-xl border border-zinc-300/50 flex items-center justify-center text-zinc-700">
            <CalendarX className="w-5 h-5 font-light" />
          </div>
        </div>

      </div>

      {/* DASHBOARD PRINCIPAL - CALENDARIO & DETALLES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CALENDARIO INTERACTIVO (8 columnas) */}
        <div className="lg:col-span-8 bg-zinc-50/30 rounded-2xl border border-zinc-300/80 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-normal text-zinc-900 text-lg flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-zinc-700" />
              <span>Calendario de Citas</span>
            </h3>
            
            {/* Controles de mes */}
            <div className="flex items-center space-x-2">
              <button
                onClick={irMesAnterior}
                className="p-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-200/50 text-zinc-800 transition-colors duration-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-light text-zinc-800 min-w-[110px] text-center">
                {nombresMeses[mesActual]} {anioActual}
              </span>
              <button
                onClick={irMesSiguiente}
                className="p-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-200/50 text-zinc-800 transition-colors duration-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Días de la Semana */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">
            {diasSemana.map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Celdas del mes REDISEÑADAS para inyectar citas compactas */}
          <div className="grid grid-cols-7 gap-2">
            {/* Espacios vacíos */}
            {Array.from({ length: primerDiaSemana }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[140px] bg-transparent rounded-xl border border-zinc-300/40"></div>
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
                      ? 'bg-zinc-200/60 border-zinc-500' 
                      : esHoy
                        ? 'bg-zinc-50/50 border-zinc-400 text-zinc-900'
                        : 'bg-transparent border-zinc-300/70 hover:border-zinc-500 hover:bg-zinc-100/40'
                  }`}
                >
                  {/* Encabezado del día */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-normal w-5 h-5 rounded-full flex items-center justify-center ${
                      esHoy ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-800'
                    }`}>{dia}</span>
                    {citasDia.length > 0 && (
                      <span className="text-[9px] font-normal text-zinc-800 bg-zinc-200/50 border border-zinc-300 px-1.5 rounded-md">
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
                          className={`rounded-lg p-2 border text-[11px] leading-tight transition-colors duration-300 flex flex-col gap-1.5 ${
                            esComp 
                              ? 'bg-zinc-200/30 border-zinc-300 text-zinc-900 font-light' 
                              : esPend 
                                ? 'bg-amber-50/40 border-amber-300/40 text-zinc-900 font-light' 
                                : 'bg-emerald-50/40 border-emerald-300/40 text-zinc-900 font-light'
                          }`}
                          title={`${cita.paciente?.nombreCompleto || 'Paciente'}\nTel: ${cita.paciente?.telefono || ''}\nEmail: ${cita.paciente?.email || ''}`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] tracking-wider font-mono text-zinc-500 uppercase">
                              {a12Horas(cita.horaInicio)}
                            </span>
                            <span className="font-normal text-zinc-900 text-xs leading-none truncate">{cita.paciente?.nombreCompleto}</span>
                          </div>
                          <div className="text-[9px] border-t border-zinc-300/50 pt-1.5 text-zinc-655 space-y-0.5 font-light">
                            <span className="block truncate">Telf: {cita.paciente?.telefono}</span>
                            <span className="block truncate">Mail: {cita.paciente?.email}</span>
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
        <div className="lg:col-span-4 bg-zinc-50/30 rounded-2xl border border-zinc-300/80 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-normal text-zinc-900 text-md border-b border-zinc-350 pb-3 mb-4">
            Citas del {fechaSeleccionada === hoyStr ? 'Hoy' : 'Día'}
          </h3>
          
          <p className="text-xs font-light text-zinc-500 mb-4 uppercase tracking-widest font-mono">
            {formatearFechaEsp(fechaSeleccionada)}
          </p>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[350px] pr-1">
            {citasDelDiaSeleccionado.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                <CalendarIcon className="w-8 h-8 text-zinc-300" />
                <p className="text-xs font-light">No hay citas programadas para este día.</p>
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
                    className={`rounded-xl border p-4 space-y-3 transition-colors duration-300 ${
                      esCancelada 
                        ? 'border-zinc-300/40 bg-transparent opacity-60' 
                        : esPendiente 
                          ? 'border-amber-300/50 bg-amber-50/20' 
                          : 'border-zinc-300 bg-transparent'
                    }`}
                  >
                    {/* Fila Superior */}
                    <div className="flex items-start justify-between">
                      <div>
                        <Link 
                          href={`/admin/pacientes?id=${cita.pacienteId}`}
                          className="font-normal text-zinc-900 hover:text-zinc-950 text-sm block"
                        >
                          {cita.paciente?.nombreCompleto || 'Paciente Desconocido'}
                        </Link>
                        <div className="flex items-center space-x-1.5 text-[11px] text-zinc-550 mt-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{a12Horas(cita.horaInicio)} - {a12Horas(cita.horaFin)}</span>
                        </div>
                      </div>

                      {/* Badge de estado */}
                      <span className={`text-[10px] font-normal uppercase px-2 py-0.5 rounded-full border ${
                        esPendiente 
                          ? 'bg-amber-100/40 text-amber-850 border-amber-250' 
                          : esConfirmada 
                            ? 'bg-emerald-100/45 text-emerald-900 border-emerald-250'
                            : esCompletada 
                              ? 'bg-zinc-200/50 text-zinc-900 border-zinc-300'
                              : 'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        {cita.estado}
                      </span>
                    </div>

                    {/* Fila de Detalles */}
                    <div className="text-[11px] text-zinc-500 flex items-center gap-4 border-t border-zinc-300/60 pt-2 font-light">
                      <div className="flex items-center space-x-1">
                        <Video className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Online</span>
                      </div>
                      
                      {cita.linkReunion && (
                        <a 
                          href={cita.linkReunion} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-zinc-800 hover:text-zinc-950 hover:underline flex items-center space-x-0.5 font-normal"
                        >
                          <span>Meet</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {/* Acciones Rápidas */}
                    {!esCancelada && !esCompletada && (
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-300/60">
                        {esPendiente && (
                          <button
                            onClick={() => handleConfirmar(cita.id)}
                            className="border border-zinc-350 hover:bg-zinc-100 text-zinc-800 p-1.5 rounded-lg text-xs font-light transition flex items-center space-x-1"
                            title="Confirmar Cita"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirmar</span>
                          </button>
                        )}
                        {esConfirmada && (
                          <button
                            onClick={() => handleCompletar(cita.id)}
                            className="border border-zinc-350 hover:bg-zinc-100 text-zinc-800 p-1.5 rounded-lg text-xs font-light transition flex items-center space-x-1"
                            title="Completar Turno"
                          >
                            <Play className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Completar</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelar(cita.id)}
                          className="border border-red-300/60 hover:bg-red-50 text-red-800 p-1.5 rounded-lg text-xs font-light transition flex items-center space-x-1"
                          title="Cancelar Cita"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                        <button
                          onClick={() => abrirModalEliminar(cita.id)}
                          className="border border-zinc-350 hover:bg-zinc-100 text-zinc-800 p-1.5 rounded-lg text-xs font-light transition flex items-center space-x-1"
                          title="Eliminar Cita de la BD"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-700" />
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
      <div className="bg-zinc-50/30 rounded-2xl border border-zinc-300/80 p-6">
        <h3 className="font-normal text-zinc-900 text-lg mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-zinc-750" />
          <span>Próximas Sesiones Programadas</span>
        </h3>

        <div className="overflow-x-auto">
          {proximasCitas.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs font-light">
              No hay próximas citas registradas.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-300 text-xs text-zinc-500 uppercase font-light font-mono">
                  <th className="pb-3 font-semibold">Paciente</th>
                  <th className="pb-3 font-semibold">Fecha y Hora</th>
                  <th className="pb-3 font-semibold">Modalidad</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-300/65 text-sm">
                {proximasCitas.map((cita) => {
                  const pacienteObj = todasCitas.find(c => c.id === cita.id)?.paciente;
                  return (
                    <tr key={cita.id} className="hover:bg-zinc-100/40 transition-colors">
                      <td className="py-4">
                        <Link 
                          href={`/admin/pacientes?id=${cita.pacienteId}`}
                          className="font-normal text-zinc-900 hover:text-zinc-950"
                        >
                          {pacienteObj?.nombreCompleto || 'Paciente'}
                        </Link>
                        <span className="block text-[11px] text-zinc-400 font-light">{pacienteObj?.email}</span>
                      </td>
                      <td className="py-4 font-normal text-zinc-900">
                        <div>{cita.fecha}</div>
                        <div className="text-xs text-zinc-500 font-light">{a12Horas(cita.horaInicio)}</div>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center space-x-1 text-xs text-zinc-500 font-light">
                          <Video className="w-3.5 h-3.5 text-zinc-450" />
                          <span>Online</span>
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`text-[10px] font-normal uppercase px-2 py-0.5 rounded-full border ${
                          cita.estado === 'pendiente' 
                            ? 'bg-amber-100/40 text-amber-850 border-amber-250' 
                            : 'bg-emerald-100/40 text-emerald-900 border-emerald-250'
                        }`}>
                          {cita.estado}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {cita.estado === 'pendiente' && (
                            <button
                              onClick={() => handleConfirmar(cita.id)}
                              className="border border-zinc-300 hover:bg-zinc-100 text-zinc-800 p-1.5 rounded-lg transition-colors"
                              title="Confirmar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelar(cita.id)}
                            className="border border-red-300/60 hover:bg-red-50 text-red-800 p-1.5 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirModalEliminar(cita.id)}
                            className="border border-zinc-300 hover:bg-zinc-100 text-zinc-800 p-1.5 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300 animate-in fade-in">
          <div className="bg-zinc-50 max-w-md w-full border border-zinc-355 p-6 space-y-6 animate-in zoom-in-95 duration-200 text-zinc-900 rounded-3xl">
            <div className="flex items-center space-x-3 text-red-800">
              <Trash2 className="w-5 h-5" />
              <h4 className="text-lg font-light uppercase tracking-wider">Eliminar Cita</h4>
            </div>
            
            <p className="text-xs text-zinc-505 leading-relaxed font-light">
              ¿Estás seguro de que deseas eliminar permanentemente esta cita? Esta acción removerá por completo el registro de la base de datos local y no podrá deshacerse.
            </p>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => confirmarEliminarCita(true)}
                className="w-full border border-red-300 bg-transparent hover:bg-red-50 text-red-800 font-normal py-3 px-4 rounded-xl text-xs transition-colors duration-300"
              >
                Opción A: Eliminar y Notificar al Paciente por Correo
              </button>
              <button
                onClick={() => confirmarEliminarCita(false)}
                className="w-full border border-zinc-350 bg-transparent hover:bg-zinc-100 text-zinc-800 font-normal py-3 px-4 rounded-xl text-xs transition-colors duration-300"
              >
                Opción B: Eliminar de forma silenciosa (Solo borrar de BD)
              </button>
              <button
                onClick={() => setModalEliminarAbierto(false)}
                className="w-full border border-zinc-400 hover:border-zinc-850 text-zinc-800 hover:text-zinc-950 font-normal py-2.5 px-4 rounded-xl text-xs transition-colors duration-300 bg-transparent"
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
