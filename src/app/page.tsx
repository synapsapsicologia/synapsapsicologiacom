'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Brain, 
  AlertCircle,
  Video,
  ArrowLeft,
  Heart,
  Smile,
  ShieldCheck,
  Award,
  BookOpen,
  Quote
} from 'lucide-react';
import { getSlotsAccion, reservarCitaAccion, getCalendarioConfigAccion } from '@/app/actions';
import { Slot } from '../lib/utils/scheduler';

export default function BookingPage() {
  // Configuración de Calendario desde la base de datos
  const [config, setConfig] = useState<{ disponibilidad: any[]; diasNoLaborables: string[] }>({
    disponibilidad: [],
    diasNoLaborables: []
  });

  // Cargar configuración de feriados y días bloqueados al iniciar
  useEffect(() => {
    async function cargarConfig() {
      const res = await getCalendarioConfigAccion();
      setConfig(res);
    }
    cargarConfig();
  }, []);

  // --- ESTADO DEL CUESTIONARIO (TRIAGE) ---
  const [pasoTriage, setPasoTriage] = useState<number>(1);
  const [triageParaQuien, setTriageParaQuien] = useState<string>('');
  const [triageTipoProceso, setTriageTipoProceso] = useState<string>('');
  const [triageMotivo, setTriageMotivo] = useState<string>('');

  // --- ESTADOS DE LA UI DE RESERVA ---
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('');
  const [slotSeleccionado, setSlotSeleccionado] = useState<Slot | null>(null);
  
  // Datos del formulario de contacto
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [motivoConsultaDetalle, setMotivoConsultaDetalle] = useState('');

  // Estados de carga e información de respuesta
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [citasSlots, setCitasSlots] = useState<{
    esFinDeSemana: boolean;
    esDiaNoLaborable: boolean;
    slots: Slot[];
  }>({ esFinDeSemana: false, esDiaNoLaborable: false, slots: [] });
  
  const [reservaExitosa, setReservaExitosa] = useState<any | null>(null);

  // --- NAVEGACIÓN DEL CALENDARIO CUSTOM ---
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());

  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Obtener días del mes actual
  const obtenerDiasEnMes = (mes: number, anio: number) => {
    return new Date(anio, mes + 1, 0).getDate();
  };

  // Obtener el día de la semana del día 1 del mes
  const obtenerPrimerDiaMes = (mes: number, anio: number) => {
    return new Date(anio, mes, 1).getDay();
  };

  const diasEnMes = obtenerDiasEnMes(mesActual, anioActual);
  const primerDiaSemana = obtenerPrimerDiaMes(mesActual, anioActual);

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

  // Al seleccionar una fecha
  const seleccionarFecha = async (dia: number) => {
    const mesFormateado = String(mesActual + 1).padStart(2, '0');
    const diaFormateado = String(dia).padStart(2, '0');
    const fechaStr = `${anioActual}-${mesFormateado}-${diaFormateado}`;
    
    setFechaSeleccionada(fechaStr);
    setSlotSeleccionado(null);
    setCargandoSlots(true);
    
    try {
      const res = await getSlotsAccion(fechaStr);
      setCitasSlots(res);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoSlots(false);
    }
  };

  // Enviar formulario de reserva
  const handleReservar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaSeleccionada || !slotSeleccionado) {
      setErrorEnvio('Por favor selecciona una fecha y una hora para tu cita.');
      return;
    }

    setEnviando(true);
    setErrorEnvio('');

    // Consolidar el triage en el motivo de la consulta
    const motivoConsolidado = `[Triage] Sesión para: ${triageParaQuien} | Proceso: ${triageTipoProceso} | Enfoque: ${triageMotivo}. Detalle: ${motivoConsultaDetalle}`;

    const res = await reservarCitaAccion({
      nombreCompleto,
      email,
      telefono,
      fechaNacimiento,
      fecha: fechaSeleccionada,
      horaInicio: slotSeleccionado.horaInicio24,
      modalidad: 'virtual', // Exclusivo online
      motivoConsulta: motivoConsolidado
    });

    setEnviando(false);

    if (res.success) {
      setReservaExitosa(res);
    } else {
      setErrorEnvio(res.error || 'Ocurrió un error inesperado al procesar la cita.');
    }
  };

  // Generar link de WhatsApp con mensaje personalizado
  const obtenerWhatsAppLink = (fechaStr: string) => {
    const telf = '50375386551';
    const msg = encodeURIComponent(`Hola Selena, me gustaría coordinar una cita para el día ${fechaStr}`);
    return `https://wa.me/${telf}?text=${msg}`;
  };

  // Formatear la fecha seleccionada en un formato amigable para mostrar en español
  const formatearFechaEsp = (fechaStr: string) => {
    if (!fechaStr) return '';
    const [a, m, d] = fechaStr.split('-').map(Number);
    const date = new Date(a, m - 1, d);
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="flex-1 bg-cream-100 flex flex-col relative min-h-screen text-charcoal-900">
      
      {/* Botón Flotante de WhatsApp Global */}
      <a
        href="https://wa.me/50375386551?text=Hola%20Selena%2C%20necesito%20soporte%20con%20mi%20cita."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 group"
        id="whatsapp-floating-btn"
        title="Contactar Soporte"
      >
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap font-medium text-sm pr-0 group-hover:pr-2">
          ¿Necesitas ayuda?
        </span>
        <svg
          className="w-6 h-6 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.333 4.982L2 22l5.202-1.362a9.924 9.924 0 004.81 1.248h.003c5.502 0 9.99-4.479 9.99-9.986 0-2.67-1.037-5.18-2.92-7.061C17.2 3.03 14.685 2 12.012 2zM12 20.357c-1.6 0-3.162-.419-4.536-1.21l-.325-.192-3.375.885.9-3.29-.21-.335A8.307 8.307 0 013.228 12c0-4.582 3.73-8.31 8.31-8.31 2.22 0 4.308.865 5.877 2.434a8.261 8.261 0 012.43 5.883c-.002 4.58-3.732 8.31-8.31 8.31h-.005zm4.553-6.22c-.25-.124-1.477-.727-1.707-.81-.23-.085-.397-.128-.563.125-.167.25-.647.81-.792.975-.146.165-.29.185-.54.062a6.8 6.8 0 01-1.998-1.233c-.776-.69-1.298-1.545-1.45-1.805-.152-.26-.016-.4.108-.523.11-.112.25-.29.375-.436.125-.145.166-.25.25-.415.083-.167.042-.312-.02-.437-.063-.125-.563-1.356-.77-1.855-.203-.49-.41-.424-.563-.432l-.48-.008c-.166 0-.437.062-.667.312-.23.25-.875.855-.875 2.083 0 1.23.896 2.417.996 2.56.1.144 1.766 2.7 4.277 3.784.597.258 1.064.412 1.428.527.6.19 1.15.163 1.58.099.48-.07 1.478-.604 1.685-1.163.208-.56.208-1.04.146-1.14-.06-.1-.23-.163-.48-.287z" />
        </svg>
      </a>

      {/* Cabecera / Navegación */}
      <header className="bg-white border-b border-cream-200 py-4 px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sage-600 to-olive-700 flex items-center justify-center text-white shadow-md shadow-sage-100">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-charcoal-900 tracking-tight">Selena Portillo Gálvez</h1>
              <p className="text-[10px] text-sage-600 font-semibold tracking-wider uppercase">Psicoterapia Online</p>
            </div>
          </div>
          <div className="text-xs font-semibold text-charcoal-700 bg-cream-150 py-1 px-3 rounded-full border border-cream-250">
            Reserva de Citas
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center items-center">
        
        {reservaExitosa ? (
          /* PANTALLA DE ÉXITO */
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl w-full text-center border border-cream-200 transition-all duration-500 animate-in fade-in zoom-in-95 my-8">
            <div className="w-20 h-20 bg-sage-50 rounded-full flex items-center justify-center mx-auto mb-6 text-sage-600 border border-sage-100 shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-charcoal-900 mb-2">¡Tu sesión ha sido agendada!</h2>
            <p className="text-charcoal-700 text-sm mb-6">
              Tu cita está **pendiente de confirmación**. Te hemos enviado un correo con todos los detalles de la videollamada.
            </p>
            
            <div className="bg-cream-100 border border-cream-200 rounded-xl p-6 text-left mb-6">
              <h3 className="font-bold text-charcoal-900 text-sm mb-3 uppercase tracking-wider">Resumen de la Sesión</h3>
              <div className="space-y-3 text-sm text-charcoal-700">
                <p><strong className="text-charcoal-900">Paciente:</strong> {nombreCompleto}</p>
                <p><strong className="text-charcoal-900">Fecha:</strong> {formatearFechaEsp(fechaSeleccionada)}</p>
                <p><strong className="text-charcoal-900">Horario:</strong> {slotSeleccionado?.horaInicio12} a {slotSeleccionado?.horaFin12}</p>
                <p>
                  <strong className="text-charcoal-900">Modalidad:</strong> Consulta 100% en Línea
                </p>
                {reservaExitosa.cita.linkReunion && (
                  <div className="mt-4 p-3 bg-sage-100/50 text-sage-800 rounded-lg flex items-center space-x-2 text-xs font-semibold border border-sage-200">
                    <Video className="w-4 h-4 flex-shrink-0 text-sage-600" />
                    <span className="truncate">Videollamada: <a href={reservaExitosa.cita.linkReunion} target="_blank" rel="noopener noreferrer" className="underline font-bold text-sage-900">{reservaExitosa.cita.linkReunion}</a></span>
                  </div>
                )}
              </div>
            </div>

            {reservaExitosa.whatsappPacienteLink && (
              <div className="mt-6 mb-6 space-y-3 bg-green-50/40 border border-green-200 rounded-xl p-5 text-left transition animate-in fade-in duration-300">
                <span className="font-bold text-green-700 block uppercase tracking-wider text-[9px] mb-1">Notificaciones de WhatsApp</span>
                <p className="text-xs text-charcoal-700">
                  Envía las alertas correspondientes a través de WhatsApp:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={reservaExitosa.whatsappPacienteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition shadow-md shadow-green-100 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Enviar Alerta Paciente</span>
                  </a>
                  <a
                    href={reservaExitosa.whatsappAdminLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-sage-600 hover:bg-sage-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition shadow-md shadow-sage-100 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Notificar a Synapsa</span>
                  </a>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setReservaExitosa(null);
                setPasoTriage(1);
                setTriageParaQuien('');
                setTriageTipoProceso('');
                setTriageMotivo('');
                setFechaSeleccionada('');
                setSlotSeleccionado(null);
                setNombreCompleto('');
                setEmail('');
                setTelefono('');
                setFechaNacimiento('');
                setMotivoConsultaDetalle('');
              }}
              className="w-full bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition duration-200"
            >
              Reservar Otra Cita
            </button>
          </div>
        ) : (
          /* FORMULARIO DE RESERVA / CUESTIONARIO COMPLETO */
          <div className="w-full">
            
            {/* NUEVO HEADLINE DE IMPACTO */}
            <div className="text-center max-w-3xl mx-auto mb-10 mt-4">
              <span className="text-[11px] font-bold text-sage-700 bg-sage-100 py-1 px-3.5 rounded-full uppercase tracking-widest border border-sage-200">
                Psicología Clínica y Forense
              </span>
              
              <h2 className="text-4xl md:text-5xl font-black text-sage-700 mt-5 mb-3 tracking-tight italic uppercase">
                &quot;SANAR ES UN ACTO DE VALOR.&quot;
              </h2>
              
              <p className="text-charcoal-700 tracking-[0.2em] text-xs font-bold uppercase mt-2">
                AGENDA TU SESIÓN PSICOLÓGICA HOY MISMO
              </p>
            </div>

            {/* FLUJO DE CUESTIONARIO INTERACTIVO (PASOS 1, 2 Y 3) */}
            {pasoTriage === 1 && (
              <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-cream-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center space-x-2 text-sage-600 mb-2">
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="text-xs font-bold uppercase tracking-wider">Cuestionario Previo - Paso 1 de 3</span>
                </div>
                <h3 className="text-xl font-bold text-charcoal-900 mb-6">¿Para quién es la sesión de terapia?</h3>
                
                <div className="space-y-4">
                  <button
                    onClick={() => { setTriageParaQuien('Para mí'); setPasoTriage(2); }}
                    type="button"
                    className="w-full text-left p-5 rounded-xl border border-cream-250 bg-cream-50/20 hover:border-sage-500 hover:bg-sage-50/10 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold text-charcoal-900 block text-sm">Para mí</span>
                      <span className="text-xs text-charcoal-700 mt-1 block">La sesión es para mi propio proceso de desarrollo personal.</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-charcoal-400 group-hover:text-sage-600 transition" />
                  </button>
                  <button
                    onClick={() => { setTriageParaQuien('Para otra persona'); setPasoTriage(2); }}
                    type="button"
                    className="w-full text-left p-5 rounded-xl border border-cream-250 bg-cream-50/20 hover:border-sage-500 hover:bg-sage-50/10 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold text-charcoal-900 block text-sm">Para otra persona</span>
                      <span className="text-xs text-charcoal-700 mt-1 block">Deseo agendar la cita para mi hijo/a, pareja, familiar o amigo.</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-charcoal-400 group-hover:text-sage-600 transition" />
                  </button>
                </div>
              </div>
            )}

            {pasoTriage === 2 && (
              <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-cream-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                  onClick={() => setPasoTriage(1)}
                  type="button"
                  className="inline-flex items-center space-x-1.5 text-xs text-charcoal-700 hover:text-sage-700 font-semibold mb-4 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
                <div className="flex items-center space-x-2 text-sage-600 mb-2">
                  <Smile className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Cuestionario Previo - Paso 2 de 3</span>
                </div>
                <h3 className="text-xl font-bold text-charcoal-900 mb-6">¿Qué tipo de proceso psicoterapéutico buscas?</h3>
                
                <div className="space-y-4">
                  <button
                    onClick={() => { setTriageTipoProceso('Terapia Individual'); setPasoTriage(3); }}
                    type="button"
                    className="w-full text-left p-5 rounded-xl border border-cream-250 bg-cream-50/20 hover:border-sage-500 hover:bg-sage-50/10 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold text-charcoal-900 block text-sm">Terapia Individual</span>
                      <span className="text-xs text-charcoal-700 mt-1 block">Sesiones enfocadas uno a uno para tu evolución clínica y bienestar.</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-charcoal-400 group-hover:text-sage-600 transition" />
                  </button>
                  <button
                    onClick={() => { setTriageTipoProceso('Terapia de Pareja'); setPasoTriage(3); }}
                    type="button"
                    className="w-full text-left p-5 rounded-xl border border-cream-250 bg-cream-50/20 hover:border-sage-500 hover:bg-sage-50/10 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold text-charcoal-900 block text-sm">Terapia de Pareja</span>
                      <span className="text-xs text-charcoal-700 mt-1 block">Orientación conjunta para mejorar comunicación, vínculos y dinámicas.</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-charcoal-400 group-hover:text-sage-600 transition" />
                  </button>
                </div>
              </div>
            )}

            {pasoTriage === 3 && (
              <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-cream-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                  onClick={() => setPasoTriage(2)}
                  type="button"
                  className="inline-flex items-center space-x-1.5 text-xs text-charcoal-700 hover:text-sage-700 font-semibold mb-4 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
                <div className="flex items-center space-x-2 text-sage-600 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Cuestionario Previo - Paso 3 de 3</span>
                </div>
                <h3 className="text-xl font-bold text-charcoal-900 mb-6">¿Qué motivo o síntoma te trae por aquí?</h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'Ansiedad / Estrés',
                    'Proceso Emocional',
                    'Relaciones',
                    'Autoestima',
                    'Otro'
                  ].map((motivo) => (
                    <button
                      key={motivo}
                      onClick={() => { setTriageMotivo(motivo); setPasoTriage(4); }}
                      type="button"
                      className="w-full text-left p-4 rounded-xl border border-cream-250 bg-cream-50/20 hover:border-sage-500 hover:bg-sage-50/10 transition-all duration-200 flex items-center justify-between group"
                    >
                      <span className="font-bold text-charcoal-900 text-sm">{motivo}</span>
                      <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:text-sage-600 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO 4: CALENDARIO Y REGISTRO DE DATOS (DESPUÉS DEL TRIAGE) */}
            {pasoTriage === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
                
                {/* COLUMNA CALENDARIO / SLOT SELECTOR (7 columnas en LG) */}
                <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl p-6 border border-cream-200">
                  
                  {/* Botón para regresar al triage */}
                  <button
                    onClick={() => setPasoTriage(3)}
                    type="button"
                    className="inline-flex items-center space-x-1 text-xs text-charcoal-700 hover:text-sage-700 font-semibold mb-4 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Modificar respuestas del cuestionario</span>
                  </button>

                  {/* 1. SELECCIÓN DE FECHA */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-charcoal-900 flex items-center space-x-2">
                        <CalendarIcon className="w-5 h-5 text-sage-600" />
                        <span>1. Selecciona una Fecha</span>
                      </h3>
                      
                      {/* Controles del mes */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={irMesAnterior}
                          className="p-1.5 rounded-lg border border-cream-200 hover:bg-cream-150 text-charcoal-700 transition"
                          title="Mes anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-charcoal-800 min-w-[100px] text-center">
                          {nombresMeses[mesActual]} {anioActual}
                        </span>
                        <button
                          onClick={irMesSiguiente}
                          className="p-1.5 rounded-lg border border-cream-200 hover:bg-cream-150 text-charcoal-700 transition"
                          title="Mes siguiente"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Grid del Calendario */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-charcoal-700 mb-2">
                      {diasSemana.map(d => (
                        <div key={d} className="py-1">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {/* Celdas vacías al inicio */}
                      {Array.from({ length: primerDiaSemana }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square"></div>
                      ))}

                      {/* Días activos */}
                      {Array.from({ length: diasEnMes }).map((_, i) => {
                        const dia = i + 1;
                        const mesFormateado = String(mesActual + 1).padStart(2, '0');
                        const diaFormateado = String(dia).padStart(2, '0');
                        const celdaFechaStr = `${anioActual}-${mesFormateado}-${diaFormateado}`;
                        
                        // Validar si es una fecha pasada
                        const celdaFecha = new Date(`${celdaFechaStr}T00:00:00`);
                        const hoy = new Date();
                        hoy.setHours(0, 0, 0, 0);
                        const esPasado = celdaFecha < hoy;

                        // Validar si es feriado / no laborable
                        const esNoLaborable = config.diasNoLaborables.includes(celdaFechaStr);
                        
                        // Validar si es fin de semana
                        const diaSemanaCelda = celdaFecha.getDay();
                        const esFinSem = diaSemanaCelda === 5 || diaSemanaCelda === 6 || diaSemanaCelda === 0;

                        const esSeleccionado = fechaSeleccionada === celdaFechaStr;

                        // Estilos condicionales CORREGIDOS para mayor contraste
                        let botonClase = "aspect-square w-full rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-200 ";
                        let disabled = false;

                        if (esPasado || esNoLaborable) {
                          // Días Sin Disponibilidad Automática o Pasados: bg-stone-200 sólido claro, texto gris oscuro line-through
                          botonClase += "bg-stone-200 text-stone-500 line-through cursor-not-allowed border border-stone-300";
                          disabled = true;
                        } else if (esSeleccionado) {
                          // Seleccionado: Verde Sage vivo, texto blanco bold perfectamente legible
                          botonClase += "bg-sage-600 text-white font-extrabold shadow-md shadow-sage-100 hover:bg-sage-700 border border-sage-700";
                        } else if (esFinSem) {
                          // Fin de semana (WhatsApp): Tono arena/ámbar sutil, con un borde fino contrastante
                          botonClase += "bg-amber-50/70 text-amber-800 border border-amber-300 hover:bg-amber-100/50";
                        } else {
                          // Día hábil disponible normal
                          botonClase += "bg-cream-50 text-charcoal-800 border border-cream-300 hover:border-sage-400 hover:bg-sage-50/20";
                        }

                        return (
                          <button
                            key={dia}
                            onClick={() => !disabled && seleccionarFecha(dia)}
                            disabled={disabled}
                            type="button"
                            className={botonClase}
                            title={esNoLaborable ? "Día No Laborable (Vacaciones)" : undefined}
                          >
                            {dia}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. SELECCIÓN DE HORARIOS */}
                  <div className="border-t border-cream-200 pt-6">
                    <h3 className="font-bold text-charcoal-900 flex items-center space-x-2 mb-4">
                      <Clock className="w-5 h-5 text-sage-600" />
                      <span>2. Elige la Hora (Tres Bloques Disponibles)</span>
                    </h3>

                    {!fechaSeleccionada ? (
                      <div className="bg-cream-50 rounded-xl p-6 text-center text-charcoal-400 text-sm border border-dashed border-cream-300">
                        Por favor, selecciona una fecha en el calendario para ver los horarios disponibles.
                      </div>
                    ) : cargandoSlots ? (
                      <div className="flex flex-col items-center justify-center p-6 space-y-2">
                        <div className="w-8 h-8 border-4 border-sage-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-charcoal-700 text-xs font-semibold">Cargando horarios disponibles...</p>
                      </div>
                    ) : citasSlots.esDiaNoLaborable ? (
                      /* DÍA FESTIVO / VACACIONES */
                      <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-start space-x-3 border border-red-100 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                        <div>
                          <strong className="font-bold">Día No Laborable:</strong>
                          <p className="mt-1">Esta fecha se encuentra bloqueada por vacaciones o día feriado. Por favor, selecciona otro día hábil en el calendario.</p>
                        </div>
                      </div>
                    ) : citasSlots.esFinDeSemana ? (
                      /* REGLA ESPECIAL FIN DE SEMANA */
                      <div className="bg-cream-150 text-charcoal-900 rounded-xl p-6 border border-cream-200 text-sm transition-all duration-300 animate-in fade-in">
                        <div className="flex items-start space-x-3">
                          <div className="bg-sage-100 text-sage-750 p-2 rounded-lg mt-0.5">
                            <Brain className="w-5 h-5 text-sage-600" />
                          </div>
                          <div>
                            <strong className="font-bold text-base text-charcoal-900 block mb-1">Horario Especial de Fin de Semana</strong>
                            <p className="text-charcoal-700 leading-relaxed">
                              Para agendar citas de viernes a domingo, por favor contáctame directamente por WhatsApp para coordinar un horario especial.
                            </p>
                            
                            <a
                              href={obtenerWhatsAppLink(fechaSeleccionada)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md mt-4 transition duration-200"
                            >
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.333 4.982L2 22l5.202-1.362a9.924 9.924 0 004.81 1.248h.003c5.502 0 9.99-4.479 9.99-9.986 0-2.67-1.037-5.18-2.92-7.061C17.2 3.03 14.685 2 12.012 2zM12 20.357c-1.6 0-3.162-.419-4.536-1.21l-.325-.192-3.375.885.9-3.29-.21-.335A8.307 8.307 0 013.228 12c0-4.582 3.73-8.31 8.31-8.31 2.22 0 4.308.865 5.877 2.434a8.261 8.261 0 012.43 5.883c-.002 4.58-3.732 8.31-8.31 8.31h-.005zm4.553-6.22c-.25-.124-1.477-.727-1.707-.81-.23-.085-.397-.128-.563.125-.167.25-.647.81-.792.975-.146.165-.29.185-.54.062a6.8 6.8 0 01-1.998-1.233c-.776-.69-1.298-1.545-1.45-1.805-.152-.26-.016-.4.108-.523.11-.112.25-.29.375-.436.125-.145.166-.25.25-.415.083-.167.042-.312-.02-.437-.063-.125-.563-1.356-.77-1.855-.203-.49-.41-.424-.563-.432l-.48-.008c-.166 0-.437.062-.667.312-.23.25-.875.855-.875 2.083 0 1.23.896 2.417.996 2.56.1.144 1.766 2.7 4.277 3.784.597.258 1.064.412 1.428.527.6.19 1.15.163 1.58.099.48-.07 1.478-.604 1.685-1.163.208-.56.208-1.04.146-1.14-.06-.1-.23-.163-.48-.287z" />
                              </svg>
                              <span>Coordinar por WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : citasSlots.slots.length === 0 ? (
                      <div className="bg-cream-50 text-charcoal-700 rounded-xl p-4 text-center text-sm border border-cream-200">
                        No hay horarios configurados para este día de la semana.
                      </div>
                    ) : (
                      /* SLOTS NORMALES */
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in">
                        {citasSlots.slots.map((slot) => {
                          const esSelecc = slotSeleccionado?.horaInicio24 === slot.horaInicio24;
                          
                          let slotBotonClase = "p-3 rounded-xl border text-sm font-semibold flex flex-col items-center justify-center transition-all duration-200 ";
                          
                          if (!slot.disponible) {
                            slotBotonClase += "bg-cream-50/50 border-cream-200 text-cream-450 cursor-not-allowed";
                          } else if (esSelecc) {
                            slotBotonClase += "bg-sage-600 border-sage-600 text-white shadow-md shadow-sage-100 scale-102";
                          } else {
                            slotBotonClase += "bg-white border-cream-300 text-charcoal-800 hover:border-sage-400 hover:bg-sage-50/20";
                          }

                          return (
                            <button
                              key={slot.horaInicio24}
                              onClick={() => slot.disponible && setSlotSeleccionado(slot)}
                              disabled={!slot.disponible}
                              type="button"
                              className={slotBotonClase}
                            >
                              <span className="text-base">{slot.horaInicio12}</span>
                              <span className={`text-[10px] uppercase font-bold mt-1 ${esSelecc ? 'text-sage-100' : 'text-charcoal-400'}`}>
                                {slot.disponible ? 'Disponible' : 'Ocupado'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* COLUMNA FORMULARIO DE PACIENTE (5 columnas en LG) */}
                <form onSubmit={handleReservar} className="lg:col-span-5 bg-white rounded-2xl shadow-xl p-6 border border-cream-200">
                  <h3 className="font-bold text-charcoal-900 flex items-center space-x-2 mb-6">
                    <User className="w-5 h-5 text-sage-600" />
                    <span>3. Información del Paciente</span>
                  </h3>

                  {/* Resumen de Triage */}
                  <div className="bg-cream-150 border border-cream-200 rounded-xl p-4 mb-5 text-xs text-charcoal-700 space-y-1">
                    <span className="font-bold text-sage-700 block uppercase tracking-wider text-[9px] mb-1">Pre-Consulta</span>
                    <p><strong>Paciente:</strong> {triageParaQuien}</p>
                    <p><strong>Proceso:</strong> {triageTipoProceso}</p>
                    <p><strong>Enfoque principal:</strong> {triageMotivo}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Nombre Completo */}
                    <div>
                      <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wide mb-1.5" htmlFor="nombre">
                        Nombre Completo
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="nombre"
                          required
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 pl-10 pr-4 text-sm text-charcoal-900 placeholder-charcoal-400 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                          placeholder="Ej. Juan Pérez"
                          value={nombreCompleto}
                          onChange={(e) => setNombreCompleto(e.target.value)}
                        />
                        <User className="w-4 h-4 text-charcoal-400 absolute left-3 top-3.5" />
                      </div>
                    </div>

                    {/* Correo Electrónico */}
                    <div>
                      <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wide mb-1.5" htmlFor="email">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          id="email"
                          required
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 pl-10 pr-4 text-sm text-charcoal-900 placeholder-charcoal-450 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                          placeholder="juan.perez@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-3.5" />
                      </div>
                    </div>

                    {/* Teléfono y Fecha Nacimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wide mb-1.5" htmlFor="telefono">
                          Teléfono
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            id="telefono"
                            required
                            className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 pl-10 pr-3 text-sm text-charcoal-900 placeholder-charcoal-450 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                            placeholder="+503 7123 4567"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                          />
                          <Phone className="w-4 h-4 text-charcoal-400 absolute left-3 top-3.5" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wide mb-1.5" htmlFor="nacimiento">
                          Nacimiento
                        </label>
                        <input
                          type="date"
                          id="nacimiento"
                          required
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 px-3 text-sm text-charcoal-900 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                          value={fechaNacimiento}
                          onChange={(e) => setFechaNacimiento(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Modalidad Fija Online (Aviso estético) */}
                    <div className="border border-sage-200 bg-sage-50/20 rounded-xl p-3.5 flex items-center space-x-3 text-xs font-semibold text-sage-800">
                      <Video className="w-5 h-5 text-sage-600 flex-shrink-0" />
                      <div>
                        <span>Consulta 100% en Línea</span>
                        <span className="block text-[10px] text-sage-700 font-normal mt-0.5">La cita se realizará virtualmente por Google Meet.</span>
                      </div>
                    </div>

                    {/* Motivo de Consulta Adicional */}
                    <div>
                      <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wide mb-1.5" htmlFor="motivo">
                        ¿Quieres añadir algún detalle adicional? (Opcional)
                      </label>
                      <div className="relative">
                        <textarea
                          id="motivo"
                          rows={2}
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 pl-10 pr-4 text-sm text-charcoal-900 placeholder-charcoal-450 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition resize-none"
                          placeholder="Describe brevemente si lo deseas..."
                          value={motivoConsultaDetalle}
                          onChange={(e) => setMotivoConsultaDetalle(e.target.value)}
                        />
                        <MessageSquare className="w-4 h-4 text-charcoal-400 absolute left-3 top-3.5" />
                      </div>
                    </div>
                  </div>

                  {errorEnvio && (
                    <div className="mt-4 p-3 bg-red-50 text-red-650 rounded-lg text-xs font-semibold flex items-center space-x-2 border border-red-100">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                      <span>{errorEnvio}</span>
                    </div>
                  )}

                  {/* Mostrar resumen del espacio seleccionado antes del botón */}
                  {fechaSeleccionada && slotSeleccionado && (
                    <div className="mt-6 p-4 bg-sage-50/20 rounded-xl border border-sage-200 text-xs text-sage-900 font-semibold space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Horario Elegido:</span>
                        <span className="text-sage-750 uppercase font-extrabold text-[10px] tracking-wide">Disponible</span>
                      </div>
                      <p className="text-charcoal-700 text-[11px] font-normal mt-1">
                        {formatearFechaEsp(fechaSeleccionada)} a las {slotSeleccionado.horaInicio12}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={enviando || !fechaSeleccionada || !slotSeleccionado}
                    className={`w-full mt-6 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg transition duration-200 flex items-center justify-center space-x-2 ${
                      enviando || !fechaSeleccionada || !slotSeleccionado
                        ? 'bg-cream-300 shadow-none cursor-not-allowed text-charcoal-400'
                        : 'bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-sage-100 hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                  >
                    {enviando ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Procesando Turno...</span>
                      </>
                    ) : (
                      <span>Agendar Cita de Terapia</span>
                    )}
                  </button>
                </form>

              </div>
            )}

            {/* SECCIÓN DETALLADA: PERFIL PROFESIONAL DE LA PSICÓLOGA */}
            <section className="w-full bg-white border border-cream-200 rounded-3xl p-8 md:p-12 my-12 shadow-xs max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                
                {/* Bloque Identidad */}
                <div className="md:col-span-1 text-center md:text-left space-y-4">
                  <div className="w-24 h-24 rounded-full bg-sage-50 border-2 border-sage-200 flex items-center justify-center mx-auto md:mx-0 text-sage-600 shadow-inner">
                    <Brain className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-charcoal-900 tracking-tight leading-tight uppercase">
                      Licda. Selena Karina Portillo Gálvez
                    </h3>
                    <p className="text-xs text-sage-700 font-bold uppercase tracking-wider mt-1.5">
                      Psicóloga Clínica y Forense
                    </p>
                  </div>
                  <div className="h-px bg-cream-200 w-2/3 mx-auto md:mx-0"></div>
                </div>

                {/* Bloque Trayectoria y Cita */}
                <div className="md:col-span-2 space-y-6">
                  {/* Cita profesional destacada */}
                  <div className="relative bg-cream-50/50 border-l-4 border-sage-500 p-4 rounded-r-xl">
                    <Quote className="w-6 h-6 text-sage-200 absolute -top-3 -right-2 transform rotate-180" />
                    <p className="text-charcoal-800 italic text-sm font-medium leading-relaxed">
                      &quot;Brindando un espacio de atención ética y profesional para tu bienestar emocional.&quot;
                    </p>
                  </div>

                  {/* Trayectoria Académica */}
                  <div>
                    <h4 className="text-xs font-black text-charcoal-400 uppercase tracking-widest mb-4 flex items-center space-x-2">
                      <Award className="w-4 h-4 text-sage-600" />
                      <span>Trayectoria Académica</span>
                    </h4>
                    
                    <div className="space-y-4">
                      
                      {/* Item 1 */}
                      <div className="flex items-start space-x-3.5 group">
                        <div className="bg-sage-50 text-sage-600 p-2 rounded-xl mt-0.5 border border-sage-100 group-hover:bg-sage-100 transition">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-charcoal-900 leading-tight">
                            Licenciatura en Psicología
                          </h5>
                          <p className="text-[11px] text-charcoal-700 mt-1">
                            Universidad de El Salvador — <span className="font-bold text-sage-750">Año 2020</span>
                          </p>
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="flex items-start space-x-3.5 group">
                        <div className="bg-sage-50 text-sage-600 p-2 rounded-xl mt-0.5 border border-sage-100 group-hover:bg-sage-100 transition">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-charcoal-900 leading-tight">
                            Maestría en Talento Humano
                          </h5>
                          <p className="text-[11px] text-charcoal-700 mt-1">
                            Universidad Tecnológica — <span className="font-bold text-sage-750">Año 2024</span>
                          </p>
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="flex items-start space-x-3.5 group">
                        <div className="bg-sage-50 text-sage-600 p-2 rounded-xl mt-0.5 border border-sage-100 group-hover:bg-sage-100 transition">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-charcoal-900 leading-tight">
                            Postgrado en Criminalística y Psicología Forense
                          </h5>
                          <p className="text-[11px] text-charcoal-700 mt-1">
                            Universidad Tecnológica — <span className="font-bold text-sage-750">Año 2025</span>
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            </section>

          </div>
        )}

      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-cream-200 py-6 px-6 text-center text-xs text-charcoal-700">
        <p>Synapsa &copy; 2026. Consultorio en línea de la Psicóloga Selena Gálvez.</p>
        <p className="mt-1 font-semibold">Soporte directo vía WhatsApp al +503 75386551</p>
      </footer>

    </div>
  );
}
