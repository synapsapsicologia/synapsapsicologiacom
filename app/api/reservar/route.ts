import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

export async function POST(request: Request) {
  try {
    const { nombre, email, telefono, inicio } = await request.json();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Forzamos el offset de El Salvador (-06:00) para evitar que Google lo mueva a UTC
    const fechaInicioStr = `${inicio}:00-06:00`; 
    const fechaFinBase = new Date(new Date(inicio).getTime() + 60 * 60 * 1000);
    const fechaFinStr = `${fechaFinBase.toISOString().split('.')[0]}-06:00`;

    // 1. Inserción en Google Calendar
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: `Cita: ${nombre}`,
        description: `PACIENTE: ${nombre}\nTEL: ${telefono}\nEMAIL: ${email}`,
        start: { dateTime: fechaInicioStr, timeZone: 'America/El_Salvador' },
        end: { dateTime: fechaFinStr, timeZone: 'America/El_Salvador' },
      },
    });

    // 2. Envío de correos vía Resend
    if (process.env.RESEND_API_KEY) {
      const telLimpio = telefono.replace(/\D/g, '');
      const [fechaSolo, horaSolo] = inicio.split('T');

      const mensajeHtml = `
        <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 20px; max-width: 500px;">
          <h2 style="color: #1e293b;">Nueva Cita Agendada</h2>
          <p><strong>Paciente:</strong> ${nombre}</p>
          <p><strong>Fecha:</strong> ${fechaSolo}</p>
          <p><strong>Hora:</strong> ${horaSolo}</p>
          <p><strong>Teléfono:</strong> ${telefono}</p>
          <div style="margin-top: 25px;">
            <a href="https://wa.me/${telLimpio}" 
               style="background-color: #25D366; color: white; padding: 15px 25px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
               CHATEAR CON PACIENTE
            </a>
          </div>
        </div>
      `;

      // Enviar a la clínica
      await resend.emails.send({
        from: 'Citas Synapsa <onboarding@resend.dev>',
        to: 'synapsapsicologia@gmail.com',
        subject: `Nueva Cita: ${nombre} (${horaSolo})`,
        html: mensajeHtml
      });

      // Enviar al paciente (Nota: Solo funcionará si el dominio está verificado en Resend)
      try {
        await resend.emails.send({
          from: 'Citas Synapsa <onboarding@resend.dev>',
          to: email,
          subject: 'Confirmación de tu cita - Synapsa',
          html: `<p>Hola ${nombre}, tu cita para el ${fechaSolo} a las ${horaSolo} ha sido reservada con éxito.</p>`
        });
      } catch (e) {
        console.log("Error enviando al paciente (posiblemente falta verificar dominio)");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error detallado:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}