'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import * as db from '../lib/db/client';
import { validarDisponibilidadCita, obtenerSlotsParaFecha } from '../lib/utils/scheduler';
import { 
  enviarEmailConfirmacionPaciente, 
  enviarEmailNotificacionAdmin, 
  enviarEmailActualizacionCita 
} from '../lib/services/resendEmail';

// --- ACCIONES PÚBLICAS DE RESERVA ---

/**
 * Obtiene el estado de disponibilidad y slots para una fecha específica
 */
export async function getSlotsAccion(fechaString: string) {
  try {
    return obtenerSlotsParaFecha(fechaString);
  } catch (error) {
    console.error('Error al obtener slots:', error);
    return { esFinDeSemana: false, esDiaNoLaborable: false, slots: [] };
  }
}

/**
 * Reserva una cita de cara al paciente público
 */
export async function reservarCitaAccion(data: {
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  modalidad: 'virtual' | 'presencial';
  motivoConsulta: string;
}) {
  try {
    // 1. Validar solapamientos (Scheduler)
    const validacion = validarDisponibilidadCita(data.fecha, data.horaInicio);
    if (!validacion.esValido) {
      return { success: false, error: validacion.motivo || 'Horario no disponible.' };
    }

    // 2. Guardar registro en db.json
    // Buscar si el paciente ya existe por correo electrónico o por teléfono (normalizado)
    const pacientesExistentes = db.getPacientes();
    const normalizarTelefono = (t: string) => t.replace(/[^\d]/g, '');
    const telefonoBuscado = normalizarTelefono(data.telefono);

    let paciente = pacientesExistentes.find(p => 
      p.email.toLowerCase() === data.email.toLowerCase() || 
      normalizarTelefono(p.telefono) === telefonoBuscado
    );

    if (paciente) {
      // El paciente ya existe: concatenar/actualizar la información del nuevo triage en su historial
      const nuevaNota = `[Nueva cita reservada para ${data.fecha} a las ${data.horaInicio}]: Motivo: ${data.motivoConsulta}`;
      const notasActualizadas = paciente.notasHistorial
        ? `${paciente.notasHistorial}\n\n${nuevaNota}`
        : nuevaNota;
      
      paciente = db.updatePaciente(paciente.id, {
        notasHistorial: notasActualizadas
      });
    } else {
      // El paciente no existe: registrar nuevo paciente normalmente
      paciente = db.createPaciente({
        nombreCompleto: data.nombreCompleto,
        email: data.email,
        telefono: data.telefono,
        fechaNacimiento: data.fechaNacimiento,
        notasHistorial: `Paciente registrado desde el portal público de reserva. Motivo inicial: ${data.motivoConsulta}`
      });
    }

    // Calcular hora de fin (1 hora estándar)
    const [h, m] = data.horaInicio.split(':').map(Number);
    const horaFin = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    // Crear cita en db.json con link de reunión virtual autogenerado
    const linkReunion = data.modalidad === 'virtual' ? `https://meet.google.com/synapsa-${Date.now()}` : '';
    const nuevaCita = db.createCita({
      pacienteId: paciente.id,
      fecha: data.fecha,
      horaInicio: data.horaInicio,
      horaFin: horaFin,
      estado: 'pendiente', // Por defecto pendiente de confirmación administrativa
      modalidad: data.modalidad,
      linkReunion: linkReunion,
      notasSesion: `Motivo de consulta: ${data.motivoConsulta}`,
      googleCalendarId: ''
    });

    // 3. Desplegar los correos confirmatorios de Resend
    try {
      // Confirmación al paciente
      await enviarEmailConfirmacionPaciente({
        pacienteNombre: paciente.nombreCompleto,
        pacienteEmail: paciente.email,
        fecha: nuevaCita.fecha,
        horaInicio: nuevaCita.horaInicio,
        modalidad: nuevaCita.modalidad,
        linkReunion: linkReunion
      });

      // Notificación al administrador
      await enviarEmailNotificacionAdmin({
        pacienteNombre: paciente.nombreCompleto,
        pacienteEmail: paciente.email,
        pacienteTelefono: paciente.telefono,
        fecha: nuevaCita.fecha,
        horaInicio: nuevaCita.horaInicio,
        modalidad: nuevaCita.modalidad,
        motivoConsulta: data.motivoConsulta
      });
    } catch (emailError) {
      console.error('[Resend] Error al enviar correos de confirmación (puede deberse a restricciones de dominio no verificado en sandbox):', emailError);
    }

    // 4. Preparar la lógica de links de WhatsApp Web (Paciente y Clínico)
    const cleanPhone = paciente.telefono.replace(/[^\d]/g, '');
    const finalPhone = cleanPhone.startsWith('503') ? cleanPhone : `503${cleanPhone}`;
    
    const [a, mes, d] = data.fecha.split('-');
    const formattedDate = `${d}/${mes}/${a}`; // Formato DD/MM/YYYY
    
    // Alerta al Paciente: Mensaje empático
    const patientMsg = encodeURIComponent(
      `¡Hola ${paciente.nombreCompleto}! Te confirmamos que tu espacio en Synapsa ha sido reservado con éxito para el día ${formattedDate} de ${data.horaInicio} a ${horaFin} (modalidad 100% en línea). ¡Nos vemos pronto!`
    );
    const whatsappPacienteLink = `https://wa.me/${finalPhone}?text=${patientMsg}`;

    // Alerta Interna a Synapsa (Número de la clínica: 50375386551)
    const adminMsg = encodeURIComponent(
      `¡Nueva cita agendada!\nPaciente: ${paciente.nombreCompleto}\nTeléfono: ${paciente.telefono}\nCorreo: ${paciente.email}\nMotivo: ${data.motivoConsulta}`
    );
    const whatsappAdminLink = `https://wa.me/50375386551?text=${adminMsg}`;

    return { 
      success: true, 
      cita: nuevaCita, 
      paciente,
      whatsappPacienteLink,
      whatsappAdminLink
    };
  } catch (error: any) {
    console.error('Error al reservar cita:', error);
    return { success: false, error: error.message || 'Error interno al procesar la reserva.' };
  }
}

// --- ACCIONES ADMINISTRATIVAS ---

/**
 * Obtiene métricas de rendimiento para el dashboard
 */
export async function getDashboardStatsAccion() {
  try {
    const citas = db.getCitas();
    const pacientes = db.getPacientes();
    
    // Obtener fecha de hoy en huso horario local del servidor o El Salvador (YYYY-MM-DD)
    const hoyDate = new Date();
    // Ajustar zona horaria de El Salvador (GMT-6)
    const hoySalvador = new Date(hoyDate.toLocaleString("en-US", { timeZone: "America/El_Salvador" }));
    const hoyString = hoySalvador.toISOString().split('T')[0];

    const mesActual = hoySalvador.getMonth(); // 0-11
    const anioActual = hoySalvador.getFullYear();

    // 1. Citas de hoy (cualquier estado excepto cancelada)
    const citasHoy = citas.filter(c => c.fecha === hoyString && c.estado !== 'cancelada');

    // 2. Pacientes totales
    const totalPacientes = pacientes.length;

    // 3. Citas canceladas este mes
    const citasCanceladasMes = citas.filter(c => {
      if (c.estado !== 'cancelada') return false;
      const cDate = new Date(`${c.fecha}T12:00:00`);
      return cDate.getMonth() === mesActual && cDate.getFullYear() === anioActual;
    });

    // Citas próximas para el listado del panel (hoy en adelante, ordenadas)
    const proximasCitas = citas
      .filter(c => c.fecha >= hoyString && c.estado !== 'cancelada')
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
        return a.horaInicio.localeCompare(b.horaInicio);
      })
      .slice(0, 5); // Tomar las 5 siguientes

    return {
      stats: {
        citasHoy: citasHoy.length,
        pacientesTotales: totalPacientes,
        citasCanceladasEsteMes: citasCanceladasMes.length
      },
      proximasCitas
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      stats: { citasHoy: 0, pacientesTotales: 0, citasCanceladasEsteMes: 0 },
      proximasCitas: []
    };
  }
}

/**
 * Obtiene todas las citas con datos del paciente
 */
export async function getCitasAccion() {
  try {
    return db.getCitas();
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return [];
  }
}

/**
 * Obtiene todos los pacientes registrados
 */
export async function getPacientesAccion() {
  try {
    return db.getPacientes();
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    return [];
  }
}

/**
 * Obtiene un paciente específico con su historial de citas
 */
export async function getPacienteDetalleAccion(pacienteId: string) {
  try {
    const paciente = db.getPacienteById(pacienteId);
    if (!paciente) return null;

    const citas = db.getCitas()
      .filter(c => c.pacienteId === pacienteId)
      .sort((a, b) => {
        // Ordenar de más reciente a más antigua
        if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
        return b.horaInicio.localeCompare(a.horaInicio);
      });

    return {
      paciente,
      citas
    };
  } catch (error) {
    console.error('Error al obtener detalle del paciente:', error);
    return null;
  }
}

/**
 * Confirma una cita pendiente
 */
export async function confirmarCitaAccion(citaId: string) {
  try {
    const cita = db.getCitaById(citaId);
    if (!cita) return { success: false, error: 'Cita no encontrada.' };

    const actualizado = db.updateCita(citaId, { estado: 'confirmada' });
    const paciente = db.getPacienteById(cita.pacienteId);

    if (paciente) {
      // Enviar correo de confirmación de cita (si pasa de pendiente a confirmada, reafirmamos)
      await enviarEmailConfirmacionPaciente({
        pacienteNombre: paciente.nombreCompleto,
        pacienteEmail: paciente.email,
        fecha: cita.fecha,
        horaInicio: cita.horaInicio,
        modalidad: cita.modalidad,
        linkReunion: cita.linkReunion
      });
    }

    return { success: true, cita: actualizado };
  } catch (error: any) {
    console.error('Error al confirmar cita:', error);
    return { success: false, error: error.message || 'Error interno.' };
  }
}

/**
 * Cancela una cita
 */
export async function cancelarCitaAccion(citaId: string) {
  try {
    const cita = db.getCitaById(citaId);
    if (!cita) return { success: false, error: 'Cita no encontrada.' };

    // 1. Cambiar estado a cancelada
    const actualizado = db.updateCita(citaId, { estado: 'cancelada' });
    const paciente = db.getPacienteById(cita.pacienteId);

    // 2. Enviar correo de cancelación (Disparador 2)
    if (paciente) {
      await enviarEmailActualizacionCita({
        pacienteNombre: paciente.nombreCompleto,
        pacienteEmail: paciente.email,
        fecha: cita.fecha,
        horaInicio: cita.horaInicio,
        tipoCambio: 'cancelada'
      });
    }

    return { success: true, cita: actualizado };
  } catch (error: any) {
    console.error('Error al cancelar cita:', error);
    return { success: false, error: error.message || 'Error interno.' };
  }
}

/**
 * Elimina una cita de db.json con opción de notificar al paciente
 */
export async function eliminarCitaAccion(citaId: string, notificarPaciente: boolean) {
  try {
    const cita = db.getCitaById(citaId);
    if (!cita) return { success: false, error: 'Cita no encontrada.' };

    const paciente = db.getPacienteById(cita.pacienteId);

    // 1. Si se requiere notificar y existe el paciente, enviar correo de cancelación
    if (notificarPaciente && paciente) {
      try {
        await enviarEmailActualizacionCita({
          pacienteNombre: paciente.nombreCompleto,
          pacienteEmail: paciente.email,
          fecha: cita.fecha,
          horaInicio: cita.horaInicio,
          tipoCambio: 'cancelada'
        });
      } catch (emailError) {
        console.error('[Resend] Error al enviar notificación de eliminación:', emailError);
      }
    }

    // 2. Eliminar físicamente del db.json
    const eliminado = db.deleteCita(citaId);
    return { success: eliminado };
  } catch (error: any) {
    console.error('Error al eliminar cita:', error);
    return { success: false, error: error.message || 'Error interno al eliminar la cita.' };
  }
}

/**
 * Completa una cita (sesión terminada)
 */
export async function completarCitaAccion(citaId: string) {
  try {
    const actualizado = db.updateCita(citaId, { estado: 'completada' });
    return { success: true, cita: actualizado };
  } catch (error: any) {
    console.error('Error al completar cita:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Guarda notas de evolución clínica de una sesión
 */
export async function guardarNotasSesionAccion(citaId: string, notas: string) {
  try {
    const actualizado = db.updateCita(citaId, { notasSesion: notas });
    return { success: true, cita: actualizado };
  } catch (error: any) {
    console.error('Error al guardar notas de sesión:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualiza los datos generales de un paciente
 */
export async function actualizarPacienteAccion(pacienteId: string, data: {
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  notasHistorial: string;
}) {
  try {
    const actualizado = db.updatePaciente(pacienteId, data);
    return { success: true, paciente: actualizado };
  } catch (error: any) {
    console.error('Error al actualizar paciente:', error);
    return { success: false, error: error.message };
  }
}

export async function getCalendarioConfigAccion() {
  try {
    const citas = db.getCitas().filter(c => c.estado !== 'cancelada');
    const citasPorFecha: Record<string, number> = {};
    for (const c of citas) {
      citasPorFecha[c.fecha] = (citasPorFecha[c.fecha] || 0) + 1;
    }
    return {
      disponibilidad: db.getDisponibilidad(),
      diasNoLaborables: db.getDiasNoLaborables(),
      citasPorFecha
    };
  } catch (error) {
    console.error('Error al obtener configuración de calendario:', error);
    return { disponibilidad: [], diasNoLaborables: [], citasPorFecha: {} };
  }
}

/**
 * Modifica el bloqueo de disponibilidad de un día de la semana
 */
export async function actualizarDiaBloqueoAccion(id: string, bloqueado: boolean) {
  try {
    const actualizado = db.updateDisponibilidad(id, { bloqueado });
    revalidatePath("/admin");
    revalidatePath("/admin/disponibilidad");
    revalidatePath("/");
    return { success: true, disponibilidad: actualizado };
  } catch (error: any) {
    console.error('Error al actualizar bloqueo de día:', error);
    return { success: false, error: error.message };
  }
}

// Helper para normalizar la fecha a formato YYYY-MM-DD
function normalizarFecha(fecha: string): string {
  if (!fecha) return '';
  const trimmed = fecha.trim();
  // Formato DD/MM/YYYY -> YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${y}-${m}-${d}`;
  }
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // En cualquier otro caso, intentar usar Date
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // ignorar
  }
  return trimmed;
}

/**
 * Agrega un día festivo o no laborable (vacaciones)
 */
export async function agregarDiaNoLaborableAccion(fecha: string) {
  try {
    const fechaNormalizada = normalizarFecha(fecha);
    db.addDiaNoLaborable(fechaNormalizada);
    revalidatePath("/admin");
    revalidatePath("/admin/disponibilidad");
    revalidatePath("/");
    return { success: true, diasNoLaborables: db.getDiasNoLaborables() };
  } catch (error: any) {
    console.error('Error al agregar día no laborable:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Elimina un día festivo o no laborable de la lista
 */
export async function eliminarDiaNoLaborableAccion(fecha: string) {
  try {
    const fechaNormalizada = normalizarFecha(fecha);
    db.removeDiaNoLaborable(fechaNormalizada);
    revalidatePath("/admin");
    revalidatePath("/admin/disponibilidad");
    revalidatePath("/");
    return { success: true, diasNoLaborables: db.getDiasNoLaborables() };
  } catch (error: any) {
    console.error('Error al eliminar día no laborable:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Inicia sesión para el administrador
 */
export async function loginAdminAccion(usuario: string, contrasenia: string) {
  try {
    if (usuario === 'admin' && contrasenia === '!SeleyEdu2804@') {
      const cookieStore = await cookies();
      cookieStore.set('admin_session', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 día de sesión
        path: '/'
      });
      return { success: true };
    }
    return { success: false, error: 'Usuario o contraseña incorrectos.' };
  } catch (error: any) {
    console.error('Error en loginAdminAccion:', error);
    return { success: false, error: 'Error al procesar la autenticación.' };
  }
}

/**
 * Cierra la sesión del administrador
 */
export async function logoutAdminAccion() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    return { success: true };
  } catch (error: any) {
    console.error('Error en logoutAdminAccion:', error);
    return { success: false, error: 'Error al cerrar la sesión.' };
  }
}
