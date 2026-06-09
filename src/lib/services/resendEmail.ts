import { to12Hour } from '../utils/scheduler';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envía un correo electrónico de producción real utilizando la API de Resend
 */
async function enviarEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('[Resend] La API Key (RESEND_API_KEY) no está configurada.');
  }
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Synapsa Psicología <consultas@synapsapsicologia.com>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[Resend] Error de API devuelto al enviar correo: ${errorText}`);
  }
  
  const data = await response.json();
  console.log(`[Resend] Correo enviado exitosamente. ID: ${data.id}`);
  return true;
}

// --- PLANTILLAS DE CORREOS CON DISEÑO EXCLUSIVO SAGE GREEN / CREMA / CHARCOAL ---

/**
 * Plantilla HTML común
 */
function plantillaHTMLBase(titulo: string, contenidoHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #FAF9F6;
            margin: 0;
            padding: 20px;
            color: #292524;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #E4E2DD;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          }
          .header {
            background-color: #5F8575;
            padding: 30px 20px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .content {
            padding: 30px 20px;
            line-height: 1.6;
          }
          .card {
            background-color: #F5F2EB;
            border-left: 4px solid #5F8575;
            padding: 16px;
            border-radius: 0 8px 8px 0;
            margin: 20px 0;
          }
          .card-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: #4A6B5D;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 0.5px;
          }
          .details-list {
            margin: 0;
            padding-left: 20px;
            color: #44403C;
          }
          .details-list li {
            margin-bottom: 6px;
          }
          .btn {
            display: inline-block;
            background-color: #5F8575;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            margin-top: 15px;
            text-align: center;
            transition: background-color 0.2s ease;
          }
          .btn:hover {
            background-color: #4A6B5D;
          }
          .footer {
            background-color: #F5F2EB;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #78716C;
            border-top: 1px solid #E4E2DD;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Synapsa Admin</h1>
          </div>
          <div class="content">
            <h2 style="margin-top: 0; color: #1C1917; font-weight: 600;">${titulo}</h2>
            ${contenidoHtml}
          </div>
          <div class="footer">
            <p>Este es un correo automático de Synapsa Admin.</p>
            <p>&copy; 2026 Synapsa. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Correo de Confirmación para el Paciente
 */
export async function enviarEmailConfirmacionPaciente(params: {
  pacienteNombre: string;
  pacienteEmail: string;
  fecha: string;
  horaInicio: string;
  modalidad: 'virtual' | 'presencial';
  linkReunion?: string;
}): Promise<boolean> {
  const hora12 = to12Hour(params.horaInicio);
  const linkText = params.linkReunion 
    ? `<a href="${params.linkReunion}" class="btn" target="_blank">Unirse a la videollamada</a>` 
    : '';

  const modalDesc = 'Consulta 100% en Línea (Vía Google Meet)';

  const contenido = `
    <p>Hola, <strong>${params.pacienteNombre}</strong>:</p>
    <p>Tu cita con la especialista ha sido agendada con éxito. A continuación, te compartimos los detalles de la sesión:</p>
    
    <div class="card">
      <div class="card-title">Detalles de la Cita</div>
      <ul class="details-list">
        <li><strong>Fecha:</strong> ${params.fecha}</li>
        <li><strong>Hora:</strong> ${hora12}</li>
        <li><strong>Modalidad:</strong> ${modalDesc}</li>
        ${params.linkReunion ? `<li><strong>Enlace de Reunión:</strong> <a href="${params.linkReunion}" style="color: #4A6B5D;">${params.linkReunion}</a></li>` : ''}
      </ul>
    </div>

    ${params.linkReunion ? `<div style="text-align: center; margin-top: 20px;">${linkText}</div>` : ''}
    
    <p>Si necesitas modificar o cancelar esta cita, te solicitamos hacerlo con al menos 24 horas de anticipación comunicándote al +503 75386551.</p>
    <p>¡Gracias por confiar en nosotros!</p>
  `;

  const html = plantillaHTMLBase('¡Tu cita ha sido agendada!', contenido);

  return enviarEmail({
    to: params.pacienteEmail,
    subject: `Confirmación de Cita - Synapsa (Día ${params.fecha} a las ${hora12})`,
    html
  });
}

/**
 * Correo de Notificación para el Admin (Psicóloga)
 */
export async function enviarEmailNotificacionAdmin(params: {
  pacienteNombre: string;
  pacienteEmail: string;
  pacienteTelefono: string;
  fecha: string;
  horaInicio: string;
  modalidad: 'virtual' | 'presencial';
  motivoConsulta: string;
}): Promise<boolean> {
  const hora12 = to12Hour(params.horaInicio);
  const modalDesc = 'Virtual (Google Meet)';

  // Parsear el motivoConsulta para extraer los campos del triage en el correo interno
  let paraQuien = 'No especificado';
  let tipoProceso = 'No especificado';
  let motivoDetail = params.motivoConsulta || 'No especificado';

  const motivo = params.motivoConsulta || '';
  if (motivo.includes('[Triage]')) {
    const paraMatch = motivo.match(/Sesión para:\s*([^|]+)/i);
    const procesoMatch = motivo.match(/Proceso:\s*([^|]+)/i);
    const enfoqueMatch = motivo.match(/Enfoque:\s*([^.]+)/i);
    const detalleMatch = motivo.match(/Detalle:\s*(.*)/i);

    if (paraMatch) paraQuien = paraMatch[1].trim();
    if (procesoMatch) tipoProceso = procesoMatch[1].trim();

    const enfoque = enfoqueMatch ? enfoqueMatch[1].trim() : '';
    const detalle = detalleMatch ? detalleMatch[1].trim() : '';
    motivoDetail = [enfoque, detalle].filter(Boolean).join(' - ') || 'No especificado';
  }

  const contenido = `
    <p>Hola, <strong>Licda. Selena</strong>:</p>
    <p>Un nuevo paciente ha agendado una cita a través del portal público de reserva. Aquí están los detalles del triage y contacto:</p>
    
    <div class="card">
      <div class="card-title">Datos del Paciente</div>
      <ul class="details-list">
        <li><strong>Paciente:</strong> ${params.pacienteNombre}</li>
        <li><strong>Email:</strong> ${params.pacienteEmail}</li>
        <li><strong>Teléfono:</strong> ${params.pacienteTelefono}</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">Resumen Clínico del Triage</div>
      <ul class="details-list">
        <li><strong>¿Para quién?:</strong> ${paraQuien}</li>
        <li><strong>Tipo de proceso:</strong> ${tipoProceso}</li>
        <li><strong>Motivo de consulta:</strong> ${motivoDetail}</li>
        <li><strong>Fecha de cita:</strong> ${params.fecha}</li>
        <li><strong>Hora:</strong> ${hora12}</li>
        <li><strong>Modalidad:</strong> ${modalDesc}</li>
      </ul>
    </div>
    
    <p>Puedes gestionar esta cita y añadir notas clínicas de evolución desde el panel administrativo.</p>
    <p><a href="http://localhost:3000/admin" class="btn">Ir al Dashboard</a></p>
  `;

  const html = plantillaHTMLBase('Nueva Cita Reservada', contenido);

  // Utilizar el correo de administración real provisto
  const adminEmail = process.env.SYNAPSA_ADMIN_EMAIL || 'synapsapsicologia@gmail.com';

  return enviarEmail({
    to: adminEmail,
    subject: `Nueva cita de ${params.pacienteNombre} (${params.fecha} ${hora12})`,
    html
  });
}

/**
 * Correo de Actualización/Cancelación para el Paciente
 */
export async function enviarEmailActualizacionCita(params: {
  pacienteNombre: string;
  pacienteEmail: string;
  fecha: string;
  horaInicio: string;
  tipoCambio: 'modificada' | 'cancelada';
  nuevaHoraInicio?: string;
  nuevaFecha?: string;
}): Promise<boolean> {
  const hora12 = to12Hour(params.horaInicio);
  
  let titulo = '';
  let contenido = '';
  let subject = '';

  if (params.tipoCambio === 'cancelada') {
    titulo = 'Tu cita ha sido cancelada';
    subject = `Cancelación de Cita - Synapsa (${params.fecha} ${hora12})`;
    contenido = `
      <p>Hola, <strong>${params.pacienteNombre}</strong>:</p>
      <p>Te informamos que tu cita agendada para el día <strong>${params.fecha}</strong> a las <strong>${hora12}</strong> ha sido cancelada.</p>
      <p>Si consideras que esto fue un error o deseas reagendar tu espacio, por favor ponte en contacto directo con nosotros vía WhatsApp al +503 75386551.</p>
      <p>Lamentamos los inconvenientes que esto pueda ocasionar.</p>
    `;
  } else {
    const nuevaHora12 = params.nuevaHoraInicio ? to12Hour(params.nuevaHoraInicio) : hora12;
    const nuevaFecha = params.nuevaFecha || params.fecha;
    titulo = 'Tu cita ha sido modificada';
    subject = `Actualización de Cita - Synapsa (Nueva Fecha: ${nuevaFecha})`;
    contenido = `
      <p>Hola, <strong>${params.pacienteNombre}</strong>:</p>
      <p>Te informamos que se han realizado modificaciones en tu cita original. A continuación se muestran los nuevos detalles de tu sesión:</p>
      
      <div class="card">
        <div class="card-title">Nuevos Detalles de la Cita</div>
        <ul class="details-list">
          <li><strong>Fecha:</strong> ${nuevaFecha}</li>
          <li><strong>Hora:</strong> ${nuevaHora12}</li>
        </ul>
      </div>
      
      <p>Si no puedes asistir en este nuevo horario, por favor contáctanos lo antes posible al +503 75386551 para reajustarlo.</p>
      <p>¡Gracias por tu comprensión!</p>
    `;
  }

  const html = plantillaHTMLBase(titulo, contenido);

  return enviarEmail({
    to: params.pacienteEmail,
    subject,
    html
  });
}

/**
 * Correo de Recordatorio para el Paciente (3 Horas Antes)
 */
export async function enviarEmailRecordatorioPaciente(params: {
  pacienteNombre: string;
  pacienteEmail: string;
  fecha: string;
  horaInicio: string;
  linkReunion: string;
}): Promise<boolean> {
  const hora12 = to12Hour(params.horaInicio);
  
  const contenido = `
    <p>Hola, <strong>${params.pacienteNombre}</strong>:</p>
    <p>Te recordamos que tu sesión de psicoterapia virtual está programada para hoy dentro de aproximadamente 3 horas. Te compartimos los detalles de conexión:</p>
    
    <div class="card">
      <div class="card-title">Detalles de la Cita</div>
      <ul class="details-list">
        <li><strong>Fecha:</strong> ${params.fecha}</li>
        <li><strong>Hora:</strong> ${hora12} (Hora de El Salvador)</li>
        <li><strong>Modalidad:</strong> Consulta 100% en Línea (Google Meet)</li>
      </ul>
    </div>

    <p style="margin-bottom: 20px;">Por favor, conéctate puntualmente haciendo clic en el siguiente botón:</p>
    <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
      <a href="${params.linkReunion}" class="btn" target="_blank">Conectarse a Google Meet</a>
    </div>
    
    <p>Si tienes alguna dificultad técnica para ingresar, por favor comunícate a través de WhatsApp al +503 75386551.</p>
    <p>¡Nos vemos pronto!</p>
  `;

  const html = plantillaHTMLBase('Recordatorio de tu Cita - 3 Horas', contenido);

  return enviarEmail({
    to: params.pacienteEmail,
    subject: `Recordatorio de Cita - Synapsa (Hoy a las ${hora12})`,
    html
  });
}

/**
 * Correo de Recordatorio para la Psicóloga (3 Horas Antes)
 */
export async function enviarEmailRecordatorioAdmin(params: {
  pacienteNombre: string;
  fecha: string;
  horaInicio: string;
  linkReunion: string;
}): Promise<boolean> {
  const hora12 = to12Hour(params.horaInicio);
  const adminEmail = process.env.SYNAPSA_ADMIN_EMAIL || 'synapsapsicologia@gmail.com';

  const contenido = `
    <p>Hola, <strong>Licda. Selena</strong>:</p>
    <p>Te recordamos que tienes una sesión programada hoy dentro de 3 horas con el/la paciente <strong>${params.pacienteNombre}</strong>. A continuación, los detalles para tu conexión:</p>
    
    <div class="card">
      <div class="card-title">Datos de la Cita</div>
      <ul class="details-list">
        <li><strong>Paciente:</strong> ${params.pacienteNombre}</li>
        <li><strong>Hora:</strong> ${hora12}</li>
        <li><strong>Modalidad:</strong> Virtual (Google Meet)</li>
      </ul>
    </div>

    <p style="margin-bottom: 20px;">Puedes unirte de forma directa mediante este botón:</p>
    <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
      <a href="${params.linkReunion}" class="btn" target="_blank">Entrar a la sesión (Meet)</a>
    </div>

    <p>Puedes revisar el expediente clínico del paciente en el panel administrativo.</p>
    <p><a href="http://localhost:3000/admin" class="btn" style="background-color: #4A6B5D;">Ir al Dashboard</a></p>
  `;

  const html = plantillaHTMLBase('Recordatorio de Cita - 3 Horas para Sesión', contenido);

  return enviarEmail({
    to: adminEmail,
    subject: `Recordatorio: Sesión con ${params.pacienteNombre} hoy a las ${hora12}`,
    html
  });
}
