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
    const res = await actualizarPacienteAccion(pacienteSeleccionado.id, {
      nombreCompleto: editNombre,
      email: editEmail,
      telefono: editTelefono,
      fechaNacimiento: editFechaNac,
      notasHistorial: editNotas
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
        <h2 className="text-2xl md:text-3xl font-light text-zinc-900 tracking-tight">Expedientes de Pacientes</h2>
        <p className="text-zinc-550 text-sm font-light">Gestiona la información personal, historial de citas y notas clínicas de evolución de tus pacientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL IZQUIERDO: BUSCADOR Y LISTADO DE PACIENTES (4 columnas) */}
        <div className="lg:col-span-4 bg-zinc-50/30 rounded-2xl border border-zinc-300/80 p-4 flex flex-col h-[650px] transition-all">
          
          {/* Buscador */}
          <div className="relative mb-4">
            <input
              type="text"
              className="w-full bg-transparent border border-zinc-300 rounded-xl py-2.5 pl-9 pr-4 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
              placeholder="Buscar por nombre, email o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          </div>

          {/* Listado de Pacientes */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {cargandoLista ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-2">
                <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 text-xs font-light">Cargando lista...</p>
              </div>
            ) : pacientesFiltrados.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs font-light">
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
                    className={`w-full text-left p-3.5 rounded-xl border transition-colors duration-300 flex items-center space-x-3 ${
                      esSelecc
                        ? 'bg-zinc-200/60 border-zinc-350 text-zinc-900 shadow-xs'
                        : 'bg-transparent border-zinc-300 hover:bg-zinc-100/50 hover:border-zinc-350 text-zinc-800 font-light'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                      esSelecc ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-200/60 text-zinc-650'
                    }`}>
                      {p.nombreCompleto.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <h4 className="font-normal text-xs truncate">{p.nombreCompleto}</h4>
                      <p className={`text-[10px] truncate mt-0.5 ${esSelecc ? 'text-zinc-600' : 'text-zinc-400'}`}>
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
        <div className="lg:col-span-8 bg-zinc-50/30 rounded-2xl border border-zinc-300/80 flex flex-col h-[650px] transition-all">
          
          {!pacienteSeleccionado ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-3">
              <User className="w-12 h-12 text-zinc-300" />
              <div>
                <h3 className="font-normal text-zinc-900 text-sm">Selecciona un Paciente</h3>
                <p className="text-xs max-w-sm mt-1 font-light">Elige un paciente del listado izquierdo para visualizar su perfil completo, datos personales y línea de tiempo clínica.</p>
              </div>
            </div>
          ) : cargandoDetalle ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
              <div className="w-10 h-10 border-4 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-zinc-600 text-xs font-light">Cargando expediente...</p>
            </div>
          ) : (
            <>
              {/* Cabecera del expediente */}
              <div className="p-6 border-b border-zinc-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-200/30 flex items-center justify-center text-zinc-700 border border-zinc-300">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-normal text-zinc-900 text-lg">{pacienteSeleccionado.nombreCompleto}</h3>
                    <p className="text-[10px] text-zinc-500 font-light tracking-wider uppercase">ID: {pacienteSeleccionado.id}</p>
                  </div>
                </div>

                {/* Toggles de Pestañas */}
                <div className="bg-zinc-200/50 p-1 rounded-xl flex self-start sm:self-center border border-zinc-300">
                  <button
                    onClick={() => setPestanaActiva('personales')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-light transition-colors duration-300 ${
                      pestanaActiva === 'personales'
                        ? 'bg-zinc-50 text-zinc-900 border border-zinc-300/40 shadow-xs'
                        : 'text-zinc-650 hover:text-zinc-900'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Datos Personales</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setPestanaActiva('clinico')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-light transition-colors duration-300 ${
                      pestanaActiva === 'clinico'
                        ? 'bg-zinc-50 text-zinc-900 border border-zinc-300/40 shadow-xs'
                        : 'text-zinc-655 hover:text-zinc-900'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <History className="w-3.5 h-3.5 text-zinc-500" />
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
                        <label className="block text-xs font-light text-zinc-600 uppercase tracking-wider mb-1.5">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full bg-transparent border border-zinc-300 rounded-xl py-3 px-4 text-xs text-zinc-900 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-light text-zinc-600 uppercase tracking-wider mb-1.5">
                          Correo Electrónico
                        </label>
                        <input
                          type="email"
                          required
                          className="w-full bg-transparent border border-zinc-300 rounded-xl py-3 px-4 text-xs text-zinc-900 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-light text-zinc-600 uppercase tracking-wider mb-1.5">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          required
                          className="w-full bg-transparent border border-zinc-300 rounded-xl py-3 px-4 text-xs text-zinc-900 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
                          value={editTelefono}
                          onChange={(e) => setEditTelefono(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-light text-zinc-600 uppercase tracking-wider mb-1.5">
                          Fecha de Nacimiento
                        </label>
                        <input
                          type="date"
                          required
                          className="w-full bg-transparent border border-zinc-300 rounded-xl py-3 px-4 text-xs text-zinc-900 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light"
                          value={editFechaNac}
                          onChange={(e) => setEditFechaNac(e.target.value)}
                        />
                      </div>

                    </div>

                    <div>
                      <label className="block text-xs font-light text-zinc-600 uppercase tracking-wider mb-1.5">
                        Notas Generales / Historial Clínico Básico
                      </label>
                      <textarea
                        rows={6}
                        className="w-full bg-transparent border border-zinc-300 rounded-xl py-3 px-4 text-xs text-zinc-900 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light resize-none leading-relaxed"
                        placeholder="Escribe notas clínicas generales de antecedentes, historia familiar, etc."
                        value={editNotas}
                        onChange={(e) => setEditNotas(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-300 pt-5">
                      <span className="text-[10px] text-zinc-450 font-light">
                        Fecha de registro: {new Date(pacienteSeleccionado.fechaRegistro).toLocaleDateString('es-ES')}
                      </span>
                      <button
                        type="submit"
                        disabled={guardandoPac}
                        className="border border-zinc-400 hover:border-zinc-800 text-zinc-850 hover:text-zinc-955 font-normal py-2.5 px-5 rounded-xl text-xs flex items-center space-x-2 transition-colors duration-300 bg-transparent cursor-pointer"
                      >
                        {guardandoPac ? (
                          <div className="w-4 h-4 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin"></div>
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
                    <h4 className="font-light text-zinc-900 text-sm flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-zinc-500" />
                      <span>Evolución en Sesiones</span>
                    </h4>

                    {citasPaciente.length === 0 ? (
                      <div className="text-center py-12 text-zinc-500 text-xs font-light">
                        Este paciente no cuenta con citas previas o programadas.
                      </div>
                    ) : (
                      /* Línea de Tiempo */
                      <div className="relative border-l border-zinc-300 pl-6 ml-3 space-y-8">
                        {citasPaciente.map((cita) => {
                          const esPend = cita.estado === 'pendiente';
                          const esConf = cita.estado === 'confirmada';
                          const esComp = cita.estado === 'completada';
                          const esCanc = cita.estado === 'cancelada';

                          const citaNota = notasCitaTemp[cita.id] ?? '';

                          return (
                            <div key={cita.id} className="relative">
                              
                              {/* Círculo indicador de la línea de tiempo */}
                              <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-zinc-50 flex items-center justify-center ${
                                esCanc 
                                  ? 'border-zinc-300' 
                                  : esPend 
                                    ? 'border-amber-400' 
                                    : esConf 
                                      ? 'border-sage-500' 
                                      : 'border-zinc-850'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  esCanc 
                                    ? 'bg-zinc-300' 
                                    : esPend 
                                      ? 'bg-amber-400' 
                                      : esConf 
                                        ? 'bg-sage-500' 
                                        : 'bg-zinc-850'
                                }`}></span>
                              </span>

                              {/* Caja de la cita */}
                              <div className="bg-zinc-100/40 border border-zinc-300 rounded-2xl p-4 space-y-3">
                                
                                {/* Info Sesión */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div>
                                    <span className="font-light text-zinc-900 text-xs">{cita.fecha}</span>
                                    <span className="text-[10px] text-zinc-500 font-light block sm:inline sm:ml-2">
                                      {a12Horas(cita.horaInicio)} - {a12Horas(cita.horaFin)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    <span className="inline-flex items-center space-x-1 text-[10px] text-zinc-500 font-light">
                                      <Video className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>Online</span>
                                    </span>

                                    <span className={`text-[9px] font-normal uppercase px-2 py-0.5 rounded-full border ${
                                      esPend 
                                        ? 'bg-amber-100/40 text-amber-850 border-amber-250' 
                                        : esConf 
                                          ? 'bg-emerald-100/40 text-emerald-900 border-emerald-250'
                                          : esComp 
                                            ? 'bg-zinc-200/60 text-zinc-900 border-zinc-300'
                                            : 'bg-zinc-200 text-zinc-700 border-zinc-300'
                                    }`}>
                                      {cita.estado}
                                    </span>
                                  </div>
                                </div>

                                {/* Notas de la Sesión */}
                                {!esCanc && (
                                  <div className="space-y-1.5 border-t border-zinc-300 pt-3">
                                    <label className="text-[10px] font-light text-zinc-400 uppercase tracking-wider block">
                                      Notas de la Sesión / Evolución Clínica
                                    </label>
                                    <textarea
                                      rows={2}
                                      className="w-full bg-transparent border border-zinc-300 rounded-xl py-2 px-3 text-xs text-zinc-900 focus:bg-zinc-100/30 focus:border-zinc-800 outline-none transition-colors duration-300 font-light resize-none"
                                      placeholder="Anota observaciones clínicas, progresos del paciente o tareas..."
                                      value={citaNota}
                                      onChange={(e) => setNotasCitaTemp(prev => ({ ...prev, [cita.id]: e.target.value }))}
                                    />
                                    <div className="flex items-center justify-end space-x-2">
                                      {esConf && (
                                        <button
                                          onClick={() => handleCompletarCita(cita.id)}
                                          className="border border-zinc-350 hover:bg-zinc-100 text-zinc-800 font-light text-[10px] py-1 px-3 rounded-lg transition-colors duration-300 bg-transparent"
                                        >
                                          Marcar Completada
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleGuardarNotasCita(cita.id)}
                                        disabled={guardandoNotaId === cita.id}
                                        className="border border-zinc-350 hover:bg-zinc-100 text-zinc-800 font-light text-[10px] py-1 px-3 rounded-lg flex items-center space-x-1 transition-colors duration-300 bg-transparent"
                                      >
                                        {guardandoNotaId === cita.id ? (
                                          <div className="w-3 h-3 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin"></div>
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
