import { NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import { 
  enviarEmailRecordatorioPaciente, 
  enviarEmailRecordatorioAdmin 
} from '@/lib/services/resendEmail';

// Forzar la evaluación dinámica para evitar que Next.js almacene en caché las respuestas
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const citas = await db.getCitas();
    const now = new Date();
    
    // Ventana de 3 horas en milisegundos (180 minutos)
    const TRES_HORAS_MS = 180 * 60 * 1000;
    const recordatoriosEnviados: any[] = [];
    
    for (const cita of citas) {
      // Ignorar si el recordatorio ya fue enviado o si la cita está cancelada
      if (cita.recordatorioEnviado || cita.estado === 'cancelada') {
        continue;
      }
      
      // Parsear la fecha y hora de inicio de la cita explícitamente en la zona horaria de El Salvador (GMT-6)
      const citaDate = new Date(`${cita.fecha}T${cita.horaInicio}:00-06:00`);
      const diffMs = citaDate.getTime() - now.getTime();
      
      // Si la cita está en el futuro y se encuentra dentro de la ventana de 3 horas
      if (diffMs > 0 && diffMs <= TRES_HORAS_MS) {
        const paciente = await db.getPacienteById(cita.pacienteId);
        
        if (paciente) {
          const linkReunion = cita.linkReunion || 'https://meet.google.com/synapsa-demo';
          
          try {
            // 1. Enviar correo de recordatorio al paciente
            await enviarEmailRecordatorioPaciente({
              pacienteNombre: paciente.nombreCompleto,
              pacienteEmail: paciente.email,
              fecha: cita.fecha,
              horaInicio: cita.horaInicio,
              linkReunion
            });
            
            // 2. Enviar correo de recordatorio al administrador/psicóloga
            await enviarEmailRecordatorioAdmin({
              pacienteNombre: paciente.nombreCompleto,
              fecha: cita.fecha,
              horaInicio: cita.horaInicio,
              linkReunion
            });
          } catch (emailError) {
            console.error('[Reminders API] Error al despachar correos de recordatorio (puede deberse a restricciones de dominio no verificado):', emailError);
          }
          
          // 3. Registrar en base de datos local que el recordatorio fue despachado
          await db.updateCita(cita.id, { recordatorioEnviado: true });
          
          recordatoriosEnviados.push({
            citaId: cita.id,
            paciente: paciente.nombreCompleto,
            fecha: cita.fecha,
            horaInicio: cita.horaInicio,
            minutosFaltantes: Math.round(diffMs / 60000)
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      mensaje: `Proceso completado. Recordatorios enviados: ${recordatoriosEnviados.length}`,
      enviados: recordatoriosEnviados
    });
  } catch (error: any) {
    console.error('[Reminders API] Error al procesar recordatorios:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno al procesar recordatorios de citas.'
    }, { status: 500 });
  }
}
