'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  getPacientesAccion, 
  getPacienteDetalleAccion, 
  actualizarPacienteAccion, 
  guardarNotasSesionAccion,
  completarCitaAccion
} from '@/app/actions';
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  Calendar as CalendarIcon, 
  FileText, 
  History, 
  Save, 
  Check,
  Video,
  MapPin,
  Clock,
  Edit,
  Activity
} from 'lucide-react';

// Componente principal que envuelve con Suspense
export default function PacientesPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-sage-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-charcoal-700 font-semibold text-sm mt-3">Cargando módulo de pacientes...</p>
      </div>
    }>
      <PacientesContent />
    </Suspense>
  );
}

function PacientesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pacienteUrlId = searchParams.get('id');

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any | null>(null);
  const [citasPaciente, setCitasPaciente] = useState<any[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  
  // Pestaña activa en detalle
  const [pestanaActiva, setPestanaActiva] = useState<'personales' | 'clinico'>('personales');

  // Formulario de edición
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editFechaNac, setEditFechaNac] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [editDui, setEditDui] = useState('');
  const [editDireccionCompleta, setEditDireccionCompleta] = useState('');
  const [guardandoPac, setGuardandoPac] = useState(false);

  // Edición de notas de cita
  const [notasCitaTemp, setNotasCitaTemp] = useState<{ [citaId: string]: string }>({});
  const [guardandoNotaId, setGuardandoNotaId] = useState<string | null>(null);

  // Cargar lista de pacientes
  const cargarPacientes = async () => {
    try {
      const res = await getPacientesAccion();
      setPacientes(res);
      
      // Auto-seleccionar paciente de la URL
      if (pacienteUrlId) {
        seleccionarPaciente(pacienteUrlId);
      } else if (res.length > 0 && !pacienteSeleccionado) {
        seleccionarPaciente(res[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoLista(false);
    }
  };

  useEffect(() => {
    cargarPacientes();
  }, [pacienteUrlId]);

  // Seleccionar paciente y cargar su historial
  const seleccionarPaciente = async (id: string) => {
    setCargandoDetalle(true);
    try {
      const res = await getPacienteDetalleAccion(id);
      if (res) {
        setPacienteSeleccionado(res.paciente);
        setCitasPaciente(res.citas);
        
        // Inicializar formulario
        setEditNombre(res.paciente.nombreCompleto);
        setEditEmail(res.paciente.email);
        setEditTelefono(res.paciente.telefono);
        setEditFechaNac(res.paciente.fechaNacimiento);
        setEditNotas(res.paciente.notasHistorial);
        setEditDui(res.paciente.dui || '');
        setEditDireccionCompleta(res.paciente.direccionCompleta || '');

        // Inicializar notas temporales de citas
        const notasTemp: { [citaId: string]: string } = {};
        res.citas.forEach((cita: any) => {
          notasTemp[cita.id] = cita.notesSesion || cita.notasSesion || '';
        });
        setNotasCitaTemp(notasTemp);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // Guardar datos del paciente
  const handleGuardarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteSeleccionado) return;

    setGuardandoPac(true);
    // Validar DUI salvadoreño (8 dígitos - 1 dígito)
    const duiRegex = /^\d{8}-\d$/;
    if (!duiRegex.test(editDui)) {
      alert('El DUI ingresado no tiene un formato válido (00000000-0).');
      setGuardandoPac(false);
      return;
    }

    const res = await actualizarPacienteAccion(pacienteSeleccionado.id, {
      nombreCompleto: editNombre,
      email: editEmail,
      telefono: editTelefono,
      fechaNacimiento: editFechaNac,
      notasHistorial: editNotas,
      dui: editDui,
      direccionCompleta: editDireccionCompleta
    });
    setGuardandoPac(false);

    if (res.success) {
      alert('Datos del paciente actualizados con éxito.');
      setPacienteSeleccionado(res.paciente);
      // Recargar lista
      const resList = await getPacientesAccion();
      setPacientes(resList);
    } else {
      alert(res.error || 'Ocurrió un error al guardar los cambios.');
    }
  };

  // Guardar notas clínicas de una cita
  const handleGuardarNotasCita = async (citaId: string) => {
    setGuardandoNotaId(citaId);
    const nota = notasCitaTemp[citaId] || '';
    const res = await guardarNotasSesionAccion(citaId, nota);
    setGuardandoNotaId(null);

    if (res.success) {
      alert('Notas de evolución clínica guardadas correctamente.');
      // Actualizar localmente
      setCitasPaciente(prev => prev.map(c => c.id === citaId ? { ...c, notasSesion: nota } : c));
    } else {
      alert(res.error || 'Error al guardar notas de sesión.');
    }
  };

  // Completar cita
  const handleCompletarCita = async (citaId: string) => {
    if (confirm('¿Desea marcar esta sesión como completada?')) {
      const res = await completarCitaAccion(citaId);
      if (res.success) {
        setCitasPaciente(prev => prev.map(c => c.id === citaId ? { ...c, estado: 'completada' } : c));
        alert('Cita marcada como completada.');
      } else {
        alert(res.error || 'Error al completar cita.');
      }
    }
  };

  // Filtrar pacientes
  const pacientesFiltrados = pacientes.filter(p => 
    p.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.telefono.includes(busqueda)
  );

  const a12Horas = (hora24: string) => {
    if (!hora24) return '';
    const [h, m] = hora24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-charcoal-900 tracking-tight">Expedientes de Pacientes</h2>
        <p className="text-charcoal-700 text-sm">Gestiona la información personal, historial de citas y notas clínicas de evolución de tus pacientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL IZQUIERDO: BUSCADOR Y LISTADO DE PACIENTES (4 columnas) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-cream-200 p-4 flex flex-col h-[650px]">
          
          {/* Buscador */}
          <div className="relative mb-4">
            <input
              type="text"
              className="w-full bg-cream-50 border border-cream-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-charcoal-850 placeholder-charcoal-400 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
              placeholder="Buscar por nombre, email o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
          </div>

          {/* Listado de Pacientes */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {cargandoLista ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-2">
                <div className="w-6 h-6 border-2 border-sage-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-charcoal-400 text-xs font-semibold">Cargando lista...</p>
              </div>
            ) : pacientesFiltrados.length === 0 ? (
              <div className="text-center py-10 text-charcoal-750 text-xs">
                No se encontraron pacientes.
              </div>
            ) : (
              pacientesFiltrados.map((p) => {
                const esSelecc = pacienteSeleccionado?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      router.push(`/admin/pacientes?id=${p.id}`);
                      seleccionarPaciente(p.id);
                    }}
                    type="button"
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-center space-x-3 ${
                      esSelecc
                        ? 'bg-sage-100 border-sage-200 text-sage-900 shadow-xs'
                        : 'bg-white border-cream-200 hover:bg-cream-50 hover:border-cream-300 text-charcoal-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                      esSelecc ? 'bg-sage-600 text-white shadow-xs' : 'bg-cream-150 text-charcoal-700'
                    }`}>
                      {p.nombreCompleto.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs truncate">{p.nombreCompleto}</h4>
                      <p className={`text-[10px] truncate mt-0.5 ${esSelecc ? 'text-sage-700' : 'text-charcoal-400'}`}>
                        {p.email}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL DERECHO: VISTA DE DETALLE / EXPEDIENTE (8 columnas) */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-xs border border-cream-200 flex flex-col h-[650px]">
          
          {!pacienteSeleccionado ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-charcoal-700 space-y-3">
              <User className="w-12 h-12 text-cream-300" />
              <div>
                <h3 className="font-bold text-charcoal-900 text-sm">Selecciona un Paciente</h3>
                <p className="text-xs max-w-sm mt-1">Elige un paciente del listado izquierdo para visualizar su perfil completo, datos personales y línea de tiempo clínica.</p>
              </div>
            </div>
          ) : cargandoDetalle ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
              <div className="w-10 h-10 border-4 border-sage-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-charcoal-700 text-xs font-semibold">Cargando expediente...</p>
            </div>
          ) : (
            <>
              {/* Cabecera del expediente */}
              <div className="p-6 border-b border-cream-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-sage-50 flex items-center justify-center text-sage-600 border border-sage-100">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-charcoal-900 text-lg">{pacienteSeleccionado.nombreCompleto}</h3>
                    <p className="text-[10px] text-charcoal-400 font-bold tracking-wider uppercase">ID: {pacienteSeleccionado.id}</p>
                  </div>
                </div>

                {/* Toggles de Pestañas */}
                <div className="bg-cream-150 p-1 rounded-xl flex self-start sm:self-center border border-cream-200">
                  <button
                    onClick={() => setPestanaActiva('personales')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pestanaActiva === 'personales'
                        ? 'bg-white text-charcoal-900 shadow-xs'
                        : 'text-charcoal-700 hover:text-charcoal-900'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-sage-500" />
                      <span>Datos Personales</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setPestanaActiva('clinico')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pestanaActiva === 'clinico'
                        ? 'bg-white text-charcoal-900 shadow-xs'
                        : 'text-charcoal-700 hover:text-charcoal-900'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <History className="w-3.5 h-3.5 text-sage-500" />
                      <span>Historial Clínico</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Cuerpo de Expediente con scroll independiente */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* PESTAÑA 1: DATOS PERSONALES */}
                {pestanaActiva === 'personales' && (
                  <form onSubmit={handleGuardarPaciente} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      <div>
                        <label className="block text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-1.5">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 px-4 text-xs text-charcoal-900 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-1.5">
                          Correo Electrónico
                        </label>
                        <input
                          type="email"
                          required
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 px-4 text-xs text-charcoal-900 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-1.5">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          required
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 px-4 text-xs text-charcoal-900 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                          value={editTelefono}
                          onChange={(e) => setEditTelefono(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-1.5">
                          Fecha de Nacimiento
                        </label>
                        <input
                          type="date"
                          required
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 px-4 text-xs text-charcoal-900 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                          value={editFechaNac}
                          onChange={(e) => setEditFechaNac(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-1.5">
                          DUI (Consumidor Final)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="00000000-0"
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 px-4 text-xs text-charcoal-900 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                          value={editDui}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 9);
                            if (clean.length > 8) {
                              setEditDui(`${clean.slice(0, 8)}-${clean.slice(8)}`);
                            } else {
                              setEditDui(clean);
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-1.5">
                          Dirección Completa
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Dirección Completa"
                          className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 px-4 text-xs text-charcoal-900 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition"
                          value={editDireccionCompleta}
                          onChange={(e) => setEditDireccionCompleta(e.target.value)}
                        />
                      </div>

                    </div>

                    <div>
                      <label className="block text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-1.5">
                        Notas Generales / Historial Clínico Básico
                      </label>
                      <textarea
                        rows={6}
                        className="w-full bg-cream-50 border border-cream-200 rounded-xl py-3 px-4 text-xs text-charcoal-900 focus:bg-white focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none transition resize-none leading-relaxed"
                        placeholder="Escribe notas clínicas generales de antecedentes, historia familiar, etc."
                        value={editNotas}
                        onChange={(e) => setEditNotas(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-cream-200 pt-5">
                      <span className="text-[10px] text-charcoal-450 font-semibold">
                        Fecha de registro: {new Date(pacienteSeleccionado.fechaRegistro).toLocaleDateString('es-ES')}
                      </span>
                      <button
                        type="submit"
                        disabled={guardandoPac}
                        className="bg-sage-650 hover:bg-sage-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md shadow-sage-100 text-xs flex items-center space-x-2 transition"
                      >
                        {guardandoPac ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>Guardar Cambios</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* PESTAÑA 2: HISTORIAL CLINICO / NOTAS DE CITA */}
                {pestanaActiva === 'clinico' && (
                  <div className="space-y-6">
                    <h4 className="font-bold text-charcoal-900 text-sm flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-sage-500" />
                      <span>Evolución en Sesiones</span>
                    </h4>

                    {citasPaciente.length === 0 ? (
                      <div className="text-center py-12 text-charcoal-700 text-xs">
                        Este paciente no cuenta con citas previas o programadas.
                      </div>
                    ) : (
                      /* Línea de Tiempo */
                      <div className="relative border-l-2 border-cream-200 pl-6 ml-3 space-y-8">
                        {citasPaciente.map((cita) => {
                          const esPend = cita.estado === 'pendiente';
                          const esConf = cita.estado === 'confirmada';
                          const esComp = cita.estado === 'completada';
                          const esCanc = cita.estado === 'cancelada';

                          const citaNota = notasCitaTemp[cita.id] ?? '';

                          return (
                            <div key={cita.id} className="relative">
                              
                              {/* Círculo indicador de la línea de tiempo */}
                              <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                                esCanc 
                                  ? 'border-cream-300' 
                                  : esPend 
                                    ? 'border-amber-400' 
                                    : esConf 
                                      ? 'border-sage-500' 
                                      : 'border-charcoal-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  esCanc 
                                    ? 'bg-cream-300' 
                                    : esPend 
                                      ? 'bg-amber-400' 
                                      : esConf 
                                        ? 'bg-sage-500' 
                                        : 'bg-charcoal-800'
                                }`}></span>
                              </span>

                              {/* Caja de la cita */}
                              <div className="bg-cream-50/20 border border-cream-200 rounded-2xl p-4 space-y-3">
                                
                                {/* Info Sesión */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div>
                                    <span className="font-bold text-charcoal-900 text-xs">{cita.fecha}</span>
                                    <span className="text-[10px] text-charcoal-700 font-semibold block sm:inline sm:ml-2">
                                      {a12Horas(cita.horaInicio)} - {a12Horas(cita.horaFin)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    <span className="inline-flex items-center space-x-1 text-[10px] text-charcoal-700 font-semibold">
                                      <Video className="w-3.5 h-3.5 text-sage-500" />
                                      <span>Online</span>
                                    </span>

                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                      esPend 
                                        ? 'bg-amber-100 text-amber-800' 
                                        : esConf 
                                          ? 'bg-sage-100 text-sage-800'
                                          : esComp 
                                            ? 'bg-charcoal-100 text-charcoal-900'
                                            : 'bg-cream-200 text-charcoal-700'
                                    }`}>
                                      {cita.estado}
                                    </span>
                                  </div>
                                </div>

                                {/* Notas de la Sesión */}
                                {!esCanc && (
                                  <div className="space-y-1.5 border-t border-cream-200 pt-3">
                                    <label className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
                                      Notas de la Sesión / Evolución Clínica
                                    </label>
                                    <textarea
                                      rows={2}
                                      className="w-full bg-white border border-cream-200 rounded-xl py-2 px-3 text-xs text-charcoal-800 focus:ring-2 focus:ring-sage-500/10 focus:border-sage-500 outline-none transition resize-none"
                                      placeholder="Anota observaciones clínicas, progresos del paciente o tareas..."
                                      value={citaNota}
                                      onChange={(e) => setNotasCitaTemp(prev => ({ ...prev, [cita.id]: e.target.value }))}
                                    />
                                    <div className="flex items-center justify-end space-x-2">
                                      {esConf && (
                                        <button
                                          onClick={() => handleCompletarCita(cita.id)}
                                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[10px] py-1 px-3 rounded-lg border border-emerald-100 transition"
                                        >
                                          Marcar Completada
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleGuardarNotasCita(cita.id)}
                                        disabled={guardandoNotaId === cita.id}
                                        className="bg-sage-50 hover:bg-sage-100 text-sage-800 font-semibold text-[10px] py-1 px-3 rounded-lg border border-sage-200 flex items-center space-x-1 transition"
                                      >
                                        {guardandoNotaId === cita.id ? (
                                          <div className="w-3 h-3 border-2 border-sage-700 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                        <span>Guardar Nota</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                )}

              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
}
