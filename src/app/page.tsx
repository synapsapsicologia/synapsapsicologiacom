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
  const [config, setConfig] = useState<{
    disponibilidad: any[];
    diasNoLaborables: string[];
    citasPorFecha?: Record<string, number>;
  }>({
    disponibilidad: [],
    diasNoLaborables: [],
    citasPorFecha: {}
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
  const [mostrarTriage, setMostrarTriage] = useState<boolean>(false);
  const [pasoTriage, setPasoTriage] = useState<number>(1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };
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

  // Si no se ha completado la reserva y no se ha activado el triage, mostrar la pantalla de bienvenida (Hero Premium)
  if (!reservaExitosa && !mostrarTriage) {
    return (
      <div 
        onMouseMove={handleMouseMove}
        className="min-h-screen bg-cream-100 text-zinc-900 relative flex flex-col items-center justify-between overflow-hidden font-sans select-none p-8"
      >
        {/* Aura de luz natural que sigue al cursor */}
        <div 
          className="absolute w-[450px] h-[450px] bg-gradient-to-r from-emerald-400/60 via-amber-300/50 to-teal-400/40 rounded-full blur-[90px] opacity-70 pointer-events-none transition-transform duration-300 ease-out z-0"
          style={{
            position: 'absolute',
            left: `${mousePos.x - 225}px`,
            top: `${mousePos.y - 225}px`,
            transform: 'translate3d(0, 0, 0)'
          }}
        ></div>

        {/* Textos Editorial Periféricos */}
        <div className="absolute top-8 left-8 text-[10px] tracking-widest text-zinc-500 uppercase font-mono">
          Synapsa &reg; / Clinica
        </div>
        
        <div className="absolute top-8 right-8 text-[10px] tracking-widest text-zinc-500 uppercase font-mono text-right">
          San Salvador, SV
        </div>

        <div className="absolute bottom-8 left-8 text-[10px] tracking-widest text-zinc-500 uppercase font-mono">
          Portfolio / 2026
        </div>

        <div className="absolute bottom-8 right-8 text-[10px] tracking-widest text-zinc-500 uppercase font-mono text-right">
          Consulta 100% Online
        </div>

        {/* CONTENIDO PRINCIPAL CENTRADO */}
        <main className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto z-10 space-y-12">
          
          {/* Cabecera / Identidad */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-light tracking-tight text-zinc-900 select-text italic">
              Selena Gálvez
            </h1>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] font-sans">
              Psicóloga Clínica
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <p className="text-zinc-500 text-sm md:text-base leading-relaxed font-normal">
              Un enfoque terapéutico enfocado en la serenidad, la salud mental y el bienestar emocional del paciente recurrente y nuevo.
            </p>
          </div>

          {/* Botones estilo pill minimalistas */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            <button
              onClick={() => {
                setMostrarTriage(true);
                setPasoTriage(1);
              }}
              type="button"
              className="w-full sm:w-auto border border-zinc-400 hover:border-zinc-800 text-zinc-800 hover:text-zinc-950 font-semibold px-8 py-3 rounded-full text-xs tracking-widest transition-all duration-300 bg-transparent flex items-center justify-center space-x-2 group cursor-pointer"
            >
              <span>AGENDAR CITA</span>
              <span className="font-mono text-[10px] opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
            
            <button
              onClick={() => {
                setTriageParaQuien('Paciente Recurrente');
                setTriageTipoProceso('Sesión de Seguimiento');
                setTriageMotivo('Seguimiento');
                setMotivoConsultaDetalle('Paciente Recurrente - Agenda Directa');
                setMostrarTriage(true);
                setPasoTriage(4);
              }}
              type="button"
              className="w-full sm:w-auto border border-zinc-400 hover:border-zinc-800 text-zinc-800 hover:text-zinc-950 font-semibold px-8 py-3 rounded-full text-xs tracking-widest transition-all duration-300 bg-transparent flex items-center justify-center space-x-2 group cursor-pointer"
            >
              <span>YA SOY PACIENTE</span>
              <span className="font-mono text-[10px] opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>
          
        </main>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 bg-cream-100 flex flex-col relative min-h-screen text-zinc-900 overflow-hidden font-sans"
    >
      {/* Tres parches de degradado fijos y estáticos (Mesh Gradient estático) */}
      <div className="fixed top-[20vh] left-[-15vw] w-[45vw] h-[45vh] rounded-full bg-[#0B71B3] blur-[120px] pointer-events-none z-[-1] opacity-30"></div>
      <div className="fixed top-[40vh] left-[30vw] w-[40vw] h-[40vh] rounded-full bg-[#215E7F] blur-[120px] pointer-events-none z-[-1] opacity-35"></div>
      <div className="fixed bottom-[-10vh] right-[-10vw] w-[50vw] h-[50vh] rounded-full bg-[#222D33] blur-[120px] pointer-events-none z-[-1] opacity-30"></div>
      
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
      <header className="bg-zinc-50/80 backdrop-blur-md border-b border-zinc-300 py-4 px-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sage-600 to-olive-700 flex items-center justify-center text-white border border-zinc-300/40">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-light text-zinc-900 tracking-tight">Selena Gálvez</h1>
              <p className="text-[10px] text-zinc-500 font-light tracking-widest uppercase">Psicoterapia Online</p>
            </div>
          </div>
          <div className="text-xs font-light text-zinc-800 bg-zinc-200/50 py-1 px-3.5 rounded-full border border-zinc-300">
            Reserva de Citas
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-[90vw] w-full mx-auto p-4 md:p-8 flex flex-col justify-center items-center relative z-10 min-h-[90vh]">
        
        {reservaExitosa ? (
          /* PANTALLA DE ÉXITO */
          <div className="bg-white/30 backdrop-blur-md rounded-2xl p-8 max-w-3xl w-full text-center border border-white/40 shadow-sm transition-all duration-500 animate-in fade-in zoom-in-95 my-8">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-xs rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-700 border border-zinc-300/50">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-light text-zinc-900 mb-2">¡Tu sesión ha sido agendada!</h2>
            <p className="text-zinc-500 text-sm font-light mb-6">
              Tu cita está <strong className="font-normal text-zinc-900">pendiente de confirmación</strong>. Te hemos enviado un correo con todos los detalles de la videollamada.
            </p>
            
            <div className="bg-white/20 backdrop-blur-xs border border-white/30 rounded-xl p-6 text-left mb-6">
              <h3 className="font-medium text-zinc-900 text-xs mb-3 uppercase tracking-widest">Resumen de la Sesión</h3>
              <div className="space-y-3 text-sm text-zinc-700 font-light">
                <p><strong className="font-normal text-zinc-900">Paciente:</strong> {nombreCompleto}</p>
                <p><strong className="font-normal text-zinc-900">Fecha:</strong> {formatearFechaEsp(fechaSeleccionada)}</p>
                <p><strong className="font-normal text-zinc-900">Horario:</strong> {slotSeleccionado?.horaInicio12} a {slotSeleccionado?.horaFin12}</p>
                <p>
                  <strong className="font-normal text-zinc-900">Modalidad:</strong> Consulta 100% en Línea
                </p>
                {reservaExitosa.cita.linkReunion && (
                  <div className="mt-4 p-3 bg-white/10 backdrop-blur-xs text-zinc-800 rounded-lg flex items-center space-x-2 text-xs font-light border border-white/20">
                    <Video className="w-4 h-4 flex-shrink-0 text-zinc-650" />
                    <span className="truncate">Videollamada: <a href={reservaExitosa.cita.linkReunion} target="_blank" rel="noopener noreferrer" className="underline font-normal text-zinc-950">{reservaExitosa.cita.linkReunion}</a></span>
                  </div>
                )}
              </div>
            </div>

            {reservaExitosa.whatsappPacienteLink && (
              <div className="mt-6 mb-6 space-y-3 bg-white/20 backdrop-blur-xs border border-white/30 rounded-xl p-5 text-left transition animate-in fade-in duration-300">
                <span className="font-medium text-zinc-900 block uppercase tracking-wider text-[9px] mb-1">Notificaciones de WhatsApp</span>
                <p className="text-xs text-zinc-500 font-light">
                  Envía las alertas correspondientes a través de WhatsApp:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={reservaExitosa.whatsappPacienteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 border border-zinc-350 hover:bg-zinc-100 text-zinc-800 font-normal py-2.5 px-4 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors duration-300"
                  >
                    <span>Enviar Alerta Paciente</span>
                  </a>
                  <a
                    href={reservaExitosa.whatsappAdminLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 border border-zinc-350 hover:bg-zinc-100 text-zinc-850 font-normal py-2.5 px-4 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors duration-300"
                  >
                    <span>Notificar a Synapsa</span>
                  </a>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setReservaExitosa(null);
                setMostrarTriage(false);
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
              className="w-full border border-zinc-400 hover:border-zinc-850 text-zinc-800 hover:text-zinc-950 font-normal py-3 px-6 rounded-xl transition-colors duration-300 bg-transparent cursor-pointer"
            >
              Reservar Otra Cita
            </button>
          </div>
        ) : (
          /* FORMULARIO DE RESERVA / CUESTIONARIO COMPLETO */
          <div className="w-full relative z-10 animate-in fade-in duration-500">
            
            {/* NUEVO HEADLINE DE IMPACTO */}
            <div className="text-center max-w-3xl mx-auto mb-10 mt-4">
              <span className="text-[11px] font-normal text-zinc-650 bg-white/20 backdrop-blur-xs py-1.5 px-4 rounded-full uppercase tracking-widest border border-white/30">
                Psicología Clínica
              </span>
              
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-light text-zinc-800 mt-5 mb-3 tracking-wider italic uppercase">
                &quot;SANAR ES UN ACTO DE VALOR.&quot;
              </h2>
              
              <p className="text-zinc-500 tracking-[0.2em] text-xs font-light uppercase mt-2">
                AGENDA TU SESIÓN PSICOLÓGICA HOY MISMO
              </p>
            </div>

            {/* FLUJO DE CUESTIONARIO INTERACTIVO (PASOS 1, 2 Y 3) */}
            {pasoTriage === 1 && (
              <div className="max-w-3xl mx-auto w-full space-y-6">
                {/* Banner de acceso rápido para pacientes recurrentes */}
                <div className="bg-white/30 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-6 text-center animate-in fade-in duration-300">
                  <h4 className="text-sm font-light text-zinc-900 mb-1">¿Ya eres paciente de Selena Gálvez?</h4>
                  <p className="text-xs text-zinc-500 mb-4 font-light">Agenda tu cita de seguimiento directamente sin volver a completar el cuestionario.</p>
                  <button
                    onClick={() => {
                      setTriageParaQuien('Paciente Recurrente');
                      setTriageTipoProceso('Sesión de Seguimiento');
                      setTriageMotivo('Seguimiento');
                      setMotivoConsultaDetalle('Paciente Recurrente - Agenda Directa');
                      setPasoTriage(4);
                    }}
                    type="button"
                    className="inline-flex items-center justify-center border border-zinc-400 hover:border-zinc-800 text-zinc-800 hover:text-zinc-950 font-normal py-2.5 px-6 rounded-xl text-xs transition-colors duration-300 bg-transparent cursor-pointer"
                  >
                    ¿Ya eres paciente? Agenda tu cita aquí
                  </button>
                </div>

                <div className="bg-white/30 backdrop-blur-md rounded-2xl p-8 border border-white/40 shadow-sm animate-in fade-in duration-300 transition-all">
                  <div className="flex items-center space-x-2 text-zinc-500 mb-2">
                    <Heart className="w-4 h-4" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Cuestionario Previo - Paso 1 de 3</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-medium text-zinc-900 mb-6">¿Para quién es la sesión de terapia?</h3>
                  
                  <div className="space-y-4">
                    <button
                      onClick={() => { setTriageParaQuien('Para mí'); setPasoTriage(2); }}
                      type="button"
                      className="w-full text-left py-8 px-6 rounded-2xl border border-zinc-350/40 bg-white/20 hover:bg-white/50 backdrop-blur-xs hover:border-zinc-800 transition-all duration-300 flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <span className="font-normal text-zinc-900 block text-lg md:text-xl">Para mí</span>
                        <span className="text-sm text-zinc-500 mt-2 block font-light">La sesión es para mi propio proceso de desarrollo personal.</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors duration-300" />
                    </button>
                    <button
                      onClick={() => { setTriageParaQuien('Para otra persona'); setPasoTriage(2); }}
                      type="button"
                      className="w-full text-left py-8 px-6 rounded-2xl border border-zinc-350/40 bg-white/20 hover:bg-white/50 backdrop-blur-xs hover:border-zinc-800 transition-all duration-300 flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <span className="font-normal text-zinc-900 block text-lg md:text-xl">Para otra persona</span>
                        <span className="text-sm text-zinc-500 mt-2 block font-light">Deseo agendar la cita para mi hijo/a, pareja, familiar o amigo.</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors duration-300" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pasoTriage === 2 && (
              <div className="max-w-3xl mx-auto w-full bg-white/30 backdrop-blur-md rounded-2xl p-8 border border-white/40 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 transition-all">
                <button
                  onClick={() => setPasoTriage(1)}
                  type="button"
                  className="inline-flex items-center space-x-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-light mb-4 transition-colors duration-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
                <div className="flex items-center space-x-2 text-zinc-500 mb-2">
                  <Smile className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Cuestionario Previo - Paso 2 de 3</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-medium text-zinc-900 mb-6">¿Qué tipo de proceso psicoterapéutico buscas?</h3>
                
                <div className="space-y-4">
                  <button
                    onClick={() => { setTriageTipoProceso('Terapia Individual'); setPasoTriage(3); }}
                    type="button"
                    className="w-full text-left py-8 px-6 rounded-2xl border border-zinc-350/40 bg-white/20 hover:bg-white/50 backdrop-blur-xs hover:border-zinc-800 transition-all duration-300 flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="font-normal text-zinc-900 block text-lg md:text-xl">Terapia Individual</span>
                      <span className="text-sm text-zinc-500 mt-2 block font-light">Sesiones enfocadas uno a uno para tu evolución clínica y bienestar.</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors duration-300" />
                  </button>
                  <button
                    onClick={() => { setTriageTipoProceso('Terapia de Pareja'); setPasoTriage(3); }}
                    type="button"
                    className="w-full text-left py-8 px-6 rounded-2xl border border-zinc-350/40 bg-white/20 hover:bg-white/50 backdrop-blur-xs hover:border-zinc-800 transition-all duration-300 flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="font-normal text-zinc-900 block text-lg md:text-xl">Terapia de Pareja</span>
                      <span className="text-sm text-zinc-500 mt-2 block font-light">Orientación conjunta para mejorar comunicación, vínculos y dinámicas.</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors duration-300" />
                  </button>
                </div>
              </div>
            )}

            {pasoTriage === 3 && (
              <div className="max-w-3xl mx-auto w-full bg-white/30 backdrop-blur-md rounded-2xl p-8 border border-white/40 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 transition-all">
                <button
                  onClick={() => setPasoTriage(2)}
                  type="button"
                  className="inline-flex items-center space-x-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-light mb-4 transition-colors duration-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
                <div className="flex items-center space-x-2 text-zinc-500 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Cuestionario Previo - Paso 3 de 3</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-medium text-zinc-900 mb-6">¿Qué motivo o síntoma te trae por aquí?</h3>
                
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
                      className="w-full text-left py-8 px-6 rounded-2xl border border-zinc-350/40 bg-white/20 hover:bg-white/50 backdrop-blur-xs hover:border-zinc-800 transition-all duration-300 flex items-center justify-between group cursor-pointer"
                    >
                      <span className="font-normal text-zinc-900 text-lg md:text-xl">{motivo}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors duration-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO 4: CALENDARIO Y REGISTRO DE DATOS (DESPUÉS DEL TRIAGE) */}
            {pasoTriage === 4 && (
              <div className="max-w-[90vw] mx-auto w-full px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* COLUMNA CALENDARIO / SLOT SELECTOR (7 columnas en LG) */}
                <div className="lg:col-span-7 bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/40 shadow-sm transition-all">
                  
                  {/* Botón para regresar al triage */}
                  <button
                    onClick={() => {
                      if (triageParaQuien === 'Paciente Recurrente') {
                        setPasoTriage(1);
                      } else {
                        setPasoTriage(3);
                      }
                    }}
                    type="button"
                    className="inline-flex items-center space-x-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-light mb-4 transition-colors duration-300"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Modificar respuestas del cuestionario</span>
                  </button>

                  {/* 1. SELECCIÓN DE FECHA */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-normal text-zinc-900 flex items-center space-x-2">
                        <CalendarIcon className="w-5 h-5 text-zinc-700" />
                        <span>1. Selecciona una Fecha</span>
                      </h3>
                      
                      {/* Controles del mes */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={irMesAnterior}
                          className="p-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-zinc-800 transition-colors duration-300"
                          title="Mes anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-light text-zinc-850 min-w-[100px] text-center">
                          {nombresMeses[mesActual]} {anioActual}
                        </span>
                        <button
                          onClick={irMesSiguiente}
                          className="p-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-zinc-800 transition-colors duration-300"
                          title="Mes siguiente"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Grid del Calendario */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs md:text-sm font-mono uppercase tracking-widest text-zinc-500 mb-2">
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

                        // Estilos condicionales CORREGIDOS para mayor contraste y tonos pastel/mate
                        let botonClase = "aspect-square w-full rounded-xl flex items-center justify-center text-base md:text-lg transition-all duration-300 ";
                        let disabled = false;

                        const citasTomadas = config.citasPorFecha?.[celdaFechaStr] || 0;

                        if (esPasado || esNoLaborable) {
                          // Pasados/No laborables: Gris apagado con línea divisoria fina
                          botonClase += "bg-zinc-200/40 text-zinc-400 line-through cursor-not-allowed border border-zinc-300/40 opacity-55";
                          disabled = true;
                        } else if (citasTomadas >= 3) {
                          // TODOS los horarios tomados (Día lleno) ➡️ El día se pinta de ROJO mate y se deshabilita
                          botonClase += "bg-[#f3dedb] text-[#8c3d3a] border border-[#e5c5c0] cursor-not-allowed opacity-80";
                          disabled = true;
                        } else if (esSeleccionado) {
                          // Seleccionado: Verde Sage vivo, texto blanco bold perfectamente legible
                          botonClase += "bg-sage-600 text-white font-normal border border-sage-700 hover:bg-sage-700";
                        } else if (esFinSem) {
                          // Fin de semana (WhatsApp): Ocre/arena tenue
                          botonClase += "bg-[#f0eae1] text-zinc-850 border border-zinc-300 hover:bg-[#e4dccf]";
                        } else {
                          // Día hábil disponible normal con semáforo dinámico (Colores Mate/Pastel Orgánicos)
                          if (citasTomadas === 0) {
                            botonClase += "bg-[#e6ebe7] text-[#3b5349] border border-[#cedbd1] hover:bg-[#d5e0d7]";
                          } else if (citasTomadas === 1) {
                            botonClase += "bg-[#f0eae1] text-[#705a3e] border border-[#e0d6c5] hover:bg-[#e4dccf]";
                          } else if (citasTomadas === 2) {
                            botonClase += "bg-[#eae7ee] text-[#5b4e70] border border-[#d6d0e0] hover:bg-[#dedae6]";
                          }
                        }

                        let tooltipText = undefined;
                        if (esNoLaborable) {
                          tooltipText = "Día No Laborable (Vacaciones)";
                        } else if (citasTomadas >= 3) {
                          tooltipText = "Día lleno (Sin horarios disponibles)";
                        } else if (!esPasado && !esFinSem) {
                          if (citasTomadas === 0) {
                            tooltipText = "Todos los horarios disponibles";
                          } else {
                            tooltipText = `${citasTomadas} hora${citasTomadas > 1 ? 's' : ''} tomada${citasTomadas > 1 ? 's' : ''}`;
                          }
                        }

                        return (
                          <button
                            key={dia}
                            onClick={() => !disabled && seleccionarFecha(dia)}
                            disabled={disabled}
                            type="button"
                            className={botonClase}
                            title={tooltipText}
                          >
                            {dia}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. SELECCIÓN DE HORARIOS */}
                  <div className="border-t border-zinc-300 pt-6">
                    <h3 className="font-normal text-zinc-900 flex items-center space-x-2 mb-4">
                      <Clock className="w-5 h-5 text-zinc-700" />
                      <span>2. Elige la Hora (Tres Bloques Disponibles)</span>
                    </h3>

                    {!fechaSeleccionada ? (
                      <div className="bg-transparent rounded-xl p-6 text-center text-zinc-400 text-xs border border-dashed border-zinc-300 font-light">
                        Por favor, selecciona una fecha en el calendario para ver los horarios disponibles.
                      </div>
                    ) : cargandoSlots ? (
                      <div className="flex flex-col items-center justify-center p-6 space-y-2">
                        <div className="w-8 h-8 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-zinc-650 text-xs font-light">Cargando horarios disponibles...</p>
                      </div>
                    ) : citasSlots.esDiaNoLaborable ? (
                      /* DÍA FESTIVO / VACACIONES */
                      <div className="bg-red-50/40 text-red-800 rounded-xl p-4 flex items-start space-x-3 border border-red-200/60 text-xs font-light">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                        <div>
                          <strong className="font-normal text-red-955">Día No Laborable:</strong>
                          <p className="mt-1">Esta fecha se encuentra bloqueada por vacaciones o día feriado. Por favor, selecciona otro día hábil en el calendario.</p>
                        </div>
                      </div>
                    ) : citasSlots.esFinDeSemana ? (
                      /* REGLA ESPECIAL FIN DE SEMANA */
                      <div className="bg-white/20 backdrop-blur-xs text-zinc-900 rounded-xl p-6 border border-white/30 text-xs transition-all duration-300 animate-in fade-in font-light">
                        <div className="flex items-start space-x-3">
                          <div className="bg-white/10 p-2 rounded-lg mt-0.5 border border-white/20">
                            <Brain className="w-5 h-5 text-zinc-700" />
                          </div>
                          <div>
                            <strong className="font-normal text-base text-zinc-900 block mb-1">Horario Especial de Fin de Semana</strong>
                            <p className="text-zinc-550 leading-relaxed">
                              Para agendar citas de viernes a domingo, por favor contáctame directamente por WhatsApp para coordinar un horario especial.
                            </p>
                            
                            <a
                              href={obtenerWhatsAppLink(fechaSeleccionada)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 border border-zinc-400 hover:border-zinc-800 text-zinc-800 hover:text-zinc-950 font-light py-2.5 px-5 rounded-xl mt-4 transition-colors duration-300 bg-white/10 hover:bg-white/40 backdrop-blur-xs text-xs"
                            >
                              <svg className="w-4 h-4 fill-current text-zinc-800" viewBox="0 0 24 24">
                                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.333 4.982L2 22l5.202-1.362a9.924 9.924 0 004.81 1.248h.003c5.502 0 9.99-4.479 9.99-9.986 0-2.67-1.037-5.18-2.92-7.061C17.2 3.03 14.685 2 12.012 2zM12 20.357c-1.6 0-3.162-.419-4.536-1.21l-.325-.192-3.375.885.9-3.29-.21-.335A8.307 8.307 0 013.228 12c0-4.582 3.73-8.31 8.31-8.31 2.22 0 4.308.865 5.877 2.434a8.261 8.261 0 012.43 5.883c-.002 4.58-3.732 8.31-8.31 8.31h-.005zm4.553-6.22c-.25-.124-1.477-.727-1.707-.81-.23-.085-.397-.128-.563.125-.167.25-.647.81-.792.975-.146.165-.29.185-.54.062a6.8 6.8 0 01-1.998-1.233c-.776-.69-1.298-1.545-1.45-1.805-.152-.26-.016-.4.108-.523.11-.112.25-.29.375-.436.125-.145.166-.25.25-.415.083-.167.042-.312-.02-.437-.063-.125-.563-1.356-.77-1.855-.203-.49-.41-.424-.563-.432l-.48-.008c-.166 0-.437.062-.667.312-.23.25-.875.855-.875 2.083 0 1.23.896 2.417.996 2.56.1.144 1.766 2.7 4.277 3.784.597.258 1.064.412 1.428.527.6.19 1.15.163 1.58.099.48-.07 1.478-.604 1.685-1.163.208-.56.208-1.04.146-1.14-.06-.1-.23-.163-.48-.287z" />
                              </svg>
                              <span>Coordinar por WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : citasSlots.slots.length === 0 ? (
                      <div className="bg-white/10 backdrop-blur-xs text-zinc-500 rounded-xl p-4 text-center text-xs border border-white/20 font-light">
                        No hay horarios configurados para este día de la semana.
                      </div>
                    ) : (
                      /* SLOTS NORMALES */
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in">
                        {citasSlots.slots.map((slot) => {
                          const esSelecc = slotSeleccionado?.horaInicio24 === slot.horaInicio24;
                          
                          let slotBotonClase = "py-5 px-4 rounded-xl border text-base md:text-lg flex flex-col items-center justify-center transition-all duration-300 ";
                          
                          if (!slot.disponible) {
                            slotBotonClase += "bg-white/10 border-zinc-350/30 text-zinc-400 cursor-not-allowed line-through opacity-60";
                          } else if (esSelecc) {
                            slotBotonClase += "bg-sage-600 border-sage-700 text-white";
                          } else {
                            slotBotonClase += "bg-white/20 border border-zinc-300/40 text-zinc-900 hover:border-zinc-800 hover:bg-white/50 backdrop-blur-xs transition-all duration-300 font-light";
                          }

                          return (
                            <button
                              key={slot.horaInicio24}
                              onClick={() => slot.disponible && setSlotSeleccionado(slot)}
                              disabled={!slot.disponible}
                              type="button"
                              className={slotBotonClase}
                            >
                              <span className="text-lg md:text-xl">{slot.horaInicio12}</span>
                              <span className={`text-xs md:text-sm uppercase font-bold mt-1 ${esSelecc ? 'text-zinc-100' : 'text-zinc-400'}`}>
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
                <form onSubmit={handleReservar} className="lg:col-span-5 bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/40 shadow-sm transition-all">
                  <h3 className="font-normal text-zinc-900 flex items-center space-x-2 mb-6">
                    <User className="w-5 h-5 text-zinc-700" />
                    <span>3. Información del Paciente</span>
                  </h3>

                  {/* Resumen de Triage */}
                  <div className="bg-white/20 backdrop-blur-xs border border-white/30 rounded-xl p-4 mb-5 text-xs text-zinc-700 space-y-1 font-light">
                    <span className="font-medium text-zinc-650 block uppercase tracking-wider text-[9px] mb-1">Pre-Consulta</span>
                    <p><strong>Paciente:</strong> {triageParaQuien}</p>
                    <p><strong>Proceso:</strong> {triageTipoProceso}</p>
                    <p><strong>Enfoque principal:</strong> {triageMotivo}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Nombre Completo */}
                    <div>
                      <label className="block text-xs font-light text-zinc-650 uppercase tracking-wide mb-1.5" htmlFor="nombre">
                        Nombre Completo
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="nombre"
                          required
                          className="w-full bg-transparent border border-zinc-300 rounded-xl py-4 pl-12 pr-4 text-base text-zinc-900 placeholder-zinc-400 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
                          placeholder="Ej. Juan Pérez"
                          value={nombreCompleto}
                          onChange={(e) => setNombreCompleto(e.target.value)}
                        />
                        <User className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    {/* Correo Electrónico */}
                    <div>
                      <label className="block text-xs font-light text-zinc-650 uppercase tracking-wide mb-1.5" htmlFor="email">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          id="email"
                          required
                          className="w-full bg-transparent border border-zinc-300 rounded-xl py-4 pl-12 pr-4 text-base text-zinc-900 placeholder-zinc-400 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
                          placeholder="juan.perez@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <Mail className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    {/* Teléfono y Fecha Nacimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-light text-zinc-650 uppercase tracking-wide mb-1.5" htmlFor="telefono">
                          Teléfono
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            id="telefono"
                            required
                            className="w-full bg-transparent border border-zinc-300 rounded-xl py-4 pl-12 pr-3 text-base text-zinc-900 placeholder-zinc-400 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
                            placeholder="+503 7123 4567"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                          />
                          <Phone className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-light text-zinc-650 uppercase tracking-wide mb-1.5" htmlFor="nacimiento">
                          Nacimiento
                        </label>
                        <input
                          type="date"
                          id="nacimiento"
                          required
                          className="w-full bg-transparent border border-zinc-300 rounded-xl py-4 px-4 text-base text-zinc-900 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
                          value={fechaNacimiento}
                          onChange={(e) => setFechaNacimiento(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Modalidad Fija Online (Aviso estético) */}
                    <div className="border border-zinc-300 bg-zinc-100/40 rounded-xl p-3.5 flex items-center space-x-3 text-xs font-light text-zinc-750">
                      <Video className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                      <div>
                        <span>Consulta 100% en Línea</span>
                        <span className="block text-[10px] text-zinc-500 font-light mt-0.5">La cita se realizará virtualmente por Google Meet.</span>
                      </div>
                    </div>

                    {/* Motivo de Consulta Adicional */}
                    <div>
                      <label className="block text-xs font-light text-zinc-650 uppercase tracking-wide mb-1.5" htmlFor="motivo">
                        ¿Quieres añadir algún detalle adicional? (Opcional)
                      </label>
                      <div className="relative">
                        <textarea
                          id="motivo"
                          rows={2}
                          className="w-full bg-transparent border border-zinc-300 rounded-xl py-4 pl-12 pr-4 text-base text-zinc-900 placeholder-zinc-400 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light resize-none"
                          placeholder="Describe brevemente si lo deseas..."
                          value={motivoConsultaDetalle}
                          onChange={(e) => setMotivoConsultaDetalle(e.target.value)}
                        />
                        <MessageSquare className="w-5 h-5 text-zinc-400 absolute left-4 top-5" />
                      </div>
                    </div>
                  </div>

                  {errorEnvio && (
                    <div className="mt-4 p-3 bg-red-50/40 text-red-800 rounded-lg text-xs font-light flex items-center space-x-2 border border-red-200/50">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-650" />
                      <span>{errorEnvio}</span>
                    </div>
                  )}

                  {/* Mostrar resumen del espacio seleccionado antes del botón */}
                  {fechaSeleccionada && slotSeleccionado && (
                    <div className="mt-6 p-4 bg-zinc-100/50 rounded-xl border border-zinc-300 text-xs text-zinc-900 font-light space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Horario Elegido:</span>
                        <span className="text-zinc-600 uppercase font-mono text-[10px] tracking-widest">Disponible</span>
                      </div>
                      <p className="text-zinc-655 text-[11px] font-light mt-1">
                        {formatearFechaEsp(fechaSeleccionada)} a las {slotSeleccionado.horaInicio12}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={enviando || !fechaSeleccionada || !slotSeleccionado}
                    className={`w-full mt-6 py-3.5 px-6 rounded-xl border transition-colors duration-300 flex items-center justify-center space-x-2 ${
                      enviando || !fechaSeleccionada || !slotSeleccionado
                        ? 'bg-zinc-200/50 border-zinc-300 text-zinc-400 cursor-not-allowed font-light'
                        : 'border-zinc-450 hover:border-zinc-900 text-zinc-850 hover:text-zinc-950 font-normal bg-transparent'
                    }`}
                  >
                    {enviando ? (
                      <>
                        <div className="w-5 h-5 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin"></div>
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
            <section className="w-full bg-zinc-50/20 border border-zinc-300/80 rounded-3xl p-8 md:p-12 my-12 max-w-4xl mx-auto transition-all">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                
                {/* Bloque Identidad */}
                <div className="md:col-span-1 text-center md:text-left space-y-4">
                  <div className="w-24 h-24 rounded-full bg-zinc-200/50 border border-zinc-350 flex items-center justify-center mx-auto md:mx-0 text-zinc-700">
                    <Brain className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-lg font-light text-zinc-900 tracking-tight leading-tight uppercase">
                      Licda. Selena Gálvez
                    </h3>
                    <p className="text-xs text-zinc-500 font-light uppercase tracking-widest mt-1.5">
                      Psicóloga Clínica
                    </p>
                  </div>
                  <div className="h-px bg-zinc-300/60 w-2/3 mx-auto md:mx-0"></div>
                </div>

                {/* Bloque Trayectoria y Cita */}
                <div className="md:col-span-2 space-y-6">
                  {/* Cita profesional destacada */}
                  <div className="relative bg-zinc-100/40 border-l-2 border-zinc-800 p-4 rounded-r-xl">
                    <Quote className="w-6 h-6 text-zinc-300 absolute -top-3 -right-2 transform rotate-180" />
                    <p className="text-zinc-800 italic text-sm font-light leading-relaxed">
                      &quot;Brindando un espacio de atención ética y profesional para tu bienestar emocional.&quot;
                    </p>
                  </div>

                  {/* Trayectoria Académica */}
                  <div>
                    <h4 className="text-xs font-light text-zinc-500 uppercase tracking-widest mb-4 flex items-center space-x-2">
                      <Award className="w-4 h-4 text-zinc-600" />
                      <span>Trayectoria Académica</span>
                    </h4>
                    
                    <div className="space-y-4">
                      
                      {/* Item 1 */}
                      <div className="flex items-start space-x-3.5 group">
                        <div className="bg-zinc-200/50 text-zinc-700 p-2 rounded-xl mt-0.5 border border-zinc-300 group-hover:bg-zinc-200 transition-colors duration-300">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-normal text-xs text-zinc-900 leading-tight">
                            Licenciatura en Psicología
                          </h5>
                          <p className="text-[11px] text-zinc-500 mt-1 font-light">
                            Universidad de El Salvador — <span className="font-normal text-zinc-800">Año 2020</span>
                          </p>
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="flex items-start space-x-3.5 group">
                        <div className="bg-zinc-200/50 text-zinc-700 p-2 rounded-xl mt-0.5 border border-zinc-300 group-hover:bg-zinc-200 transition-colors duration-300">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-normal text-xs text-zinc-900 leading-tight">
                            Maestría en Talento Humano
                          </h5>
                          <p className="text-[11px] text-zinc-500 mt-1 font-light">
                            Universidad Tecnológica — <span className="font-normal text-zinc-800">Año 2024</span>
                          </p>
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="flex items-start space-x-3.5 group">
                        <div className="bg-zinc-200/50 text-zinc-700 p-2 rounded-xl mt-0.5 border border-zinc-300 group-hover:bg-zinc-200 transition-colors duration-300">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-normal text-xs text-zinc-900 leading-tight">
                            Postgrado en Criminalística y Psicología Forense
                          </h5>
                          <p className="text-[11px] text-zinc-500 mt-1 font-light">
                            Universidad Tecnológica — <span className="font-normal text-zinc-800">Año 2025</span>
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
      <footer className="bg-zinc-50/50 border-t border-zinc-300/80 py-6 px-6 text-center text-xs text-zinc-500 font-light">
        <p>Synapsa &copy; 2026. Consultorio en línea de la Psicóloga Selena Gálvez.</p>
        <p className="mt-1 font-normal text-zinc-700">Soporte directo vía WhatsApp al +503 75386551</p>
      </footer>

    </div>
  );
}
