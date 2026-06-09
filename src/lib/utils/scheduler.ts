import { getDisponibilidad, getDiasNoLaborables, getCitas } from '../db/client';

/**
 * Convierte una hora en formato de 24 horas (HH:MM) a 12 horas (h:MM AM/PM)
 */
export function to12Hour(time24: string): string {
  if (!time24) return '';
  const [hourStr, minStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const minutes = minStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  
  hour = hour % 12;
  hour = hour ? hour : 12; // La hora '0' debe ser '12'
  
  return `${hour}:${minutes} ${ampm}`;
}

/**
 * Convierte una hora en formato de 12 horas (h:MM AM/PM) a 24 horas (HH:MM)
 */
export function to24Hour(time12: string): string {
  if (!time12) return '';
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12; // Retornar tal cual si no coincide
  
  let hour = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hour < 12) {
    hour += 12;
  }
  if (ampm === 'AM' && hour === 12) {
    hour = 0;
  }
  
  const hourStr = hour.toString().padStart(2, '0');
  return `${hourStr}:${minutes}`;
}

/**
 * Convierte una hora en formato HH:MM a minutos totales desde la medianoche
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convierte minutos totales desde la medianoche a formato HH:MM
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export interface Slot {
  horaInicio24: string;
  horaFin24: string;
  horaInicio12: string;
  horaFin12: string;
  disponible: boolean;
  motivoBloqueo?: 'no_laborable' | 'fin_de_semana' | 'ocupado' | 'fuera_rango';
}

/**
 * Retorna los slots disponibles para una fecha específica (YYYY-MM-DD)
 */
export function obtenerSlotsParaFecha(fechaString: string): {
  esFinDeSemana: boolean;
  esDiaNoLaborable: boolean;
  slots: Slot[];
} {
  const diasNoLaborables = getDiasNoLaborables();
  
  // 1. Validar si es un Día No Laborable configurado
  if (diasNoLaborables.includes(fechaString)) {
    return {
      esFinDeSemana: false,
      esDiaNoLaborable: true,
      slots: []
    };
  }

  // Obtener el día de la semana (0 = Domingo, 1 = Lunes, etc.)
  // Usamos "T12:00:00" para evitar problemas de zona horaria al parsear la fecha local
  const fecha = new Date(`${fechaString}T12:00:00`);
  const diaSemana = fecha.getDay();

  // 2. Regla para Fines de Semana (Viernes, Sábado, Domingo)
  // En JS, 5 = Viernes, 6 = Sábado, 0 = Domingo
  const esFinDeSemana = diaSemana === 5 || diaSemana === 6 || diaSemana === 0;
  if (esFinDeSemana) {
    return {
      esFinDeSemana: true,
      esDiaNoLaborable: false,
      slots: []
    };
  }

  // 3. Obtener la disponibilidad de la base de datos para ese día de la semana
  const disponibilidadLista = getDisponibilidad();
  const dispDia = disponibilidadLista.find(d => d.diaSemana === diaSemana);

  // Si no hay configuración o está bloqueado, no hay slots
  if (!dispDia || dispDia.bloqueado) {
    return {
      esFinDeSemana: false,
      esDiaNoLaborable: false,
      slots: []
    };
  }

  // 4. Generar slots de 1 hora entre la hora de inicio y fin configurada
  const slots: Slot[] = [];
  const minInicio = timeToMinutes(dispDia.horaInicio);
  const minFin = timeToMinutes(dispDia.horaFin);
  const duracionSlot = 60; // 1 hora estándar en minutos

  // Obtener citas existentes para esa fecha que estén activas (no canceladas)
  const citasDelDia = getCitas().filter(
    c => c.fecha === fechaString && c.estado !== 'cancelada'
  );

  for (let min = minInicio; min + duracionSlot <= minFin; min += duracionSlot) {
    const horaSlotInicio = minutesToTime(min);
    const horaSlotFin = minutesToTime(min + duracionSlot);
    
    // Validar si el slot está ocupado por alguna cita existente
    const ocupado = citasDelDia.some(cita => {
      const citaInicio = timeToMinutes(cita.horaInicio);
      const citaFin = timeToMinutes(cita.horaFin);
      const slotInicio = min;
      const slotFin = min + duracionSlot;
      
      // Hay solapamiento si el inicio del slot es menor que el fin de la cita
      // Y el fin del slot es mayor que el inicio de la cita.
      return slotInicio < citaFin && slotFin > citaInicio;
    });

    slots.push({
      horaInicio24: horaSlotInicio,
      horaFin24: horaSlotFin,
      horaInicio12: to12Hour(horaSlotInicio),
      horaFin12: to12Hour(horaSlotFin),
      disponible: !ocupado,
      motivoBloqueo: ocupado ? 'ocupado' : undefined
    });
  }

  return {
    esFinDeSemana: false,
    esDiaNoLaborable: false,
    slots
  };
}

/**
 * Valida si es posible crear una cita en una fecha y hora determinadas
 */
export function validarDisponibilidadCita(
  fechaString: string,
  horaInicio24: string,
  duracionHoras: number = 1
): { esValido: boolean; motivo?: string } {
  // 1. Validar feriado / día no laborable
  const diasNoLaborables = getDiasNoLaborables();
  if (diasNoLaborables.includes(fechaString)) {
    return { esValido: false, motivo: 'La fecha seleccionada es un día no laborable.' };
  }

  // 2. Validar fin de semana
  const fecha = new Date(`${fechaString}T12:00:00`);
  const diaSemana = fecha.getDay();
  if (diaSemana === 5 || diaSemana === 6 || diaSemana === 0) {
    return { esValido: false, motivo: 'No se permiten citas en fin de semana de forma automatizada.' };
  }

  // 3. Validar disponibilidad configurada
  const disponibilidadLista = getDisponibilidad();
  const dispDia = disponibilidadLista.find(d => d.diaSemana === diaSemana);
  if (!dispDia || dispDia.bloqueado) {
    return { esValido: false, motivo: 'El profesional no tiene disponibilidad configurada para este día.' };
  }

  const minInicioCita = timeToMinutes(horaInicio24);
  const minFinCita = minInicioCita + (duracionHoras * 60);

  const minInicioDisp = timeToMinutes(dispDia.horaInicio);
  const minFinDisp = timeToMinutes(dispDia.horaFin);

  if (minInicioCita < minInicioDisp || minFinCita > minFinDisp) {
    return { esValido: false, motivo: 'La hora seleccionada está fuera del horario de disponibilidad del profesional.' };
  }

  // 4. Validar solapamiento con citas existentes
  const citasDelDia = getCitas().filter(
    c => c.fecha === fechaString && c.estado !== 'cancelada'
  );

  const tieneSolapamiento = citasDelDia.some(cita => {
    const citaInicio = timeToMinutes(cita.horaInicio);
    const citaFin = timeToMinutes(cita.horaFin);
    
    return minInicioCita < citaFin && minFinCita > citaInicio;
  });

  if (tieneSolapamiento) {
    return { esValido: false, motivo: 'El horario ya está ocupado por otra cita.' };
  }

  return { esValido: true };
}
