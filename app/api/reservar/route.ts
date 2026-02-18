import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inicializa Resend con la variable que agregaste en Netlify
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

    // 1. Crear el evento en Google Calendar
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      sendUpdates: 'all', 
      requestBody: {
        summary: `Cita: ${nombre} (Synapsa)`,
        description: `PACIENTE: ${nombre}\nTEL: ${telefono}\nEMAIL: ${email}\nESTADO: PENDIENTE`,
        start: { 
          dateTime: new Date(inicio).toISOString(), 
          timeZone: 'America/El_Salvador' 
        },
        end: { 
          dateTime: new Date(new Date(inicio).getTime() + 3600000).toISOString(), 
          timeZone: 'America/El_Salvador' 
        },
        attendees: [{ email }],
      },
    });

    // 2. Enviar correos si la API Key de Resend existe
    if (process.env.RESEND_API_KEY) {
      // Correo para el Paciente
      await resend.emails.send({
        from: 'Synapsa Clínica <onboarding@resend.dev>',
        to: email,
        subject: 'Confirmación de tu cita - Synapsa',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb; text-transform: uppercase;">¡Hola ${nombre}!</h2>
            <p>Tu cita ha sido reservada con éxito en <strong>Synapsa</strong>.</p>
            <p><strong>Fecha y Hora:</strong> ${new Date(inicio).toLocaleString('es-SV', { hour12: true })}</p>
            <p>La Licenciada Selena Portillo se comunicará contigo pronto vía WhatsApp.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">Synapsa Psicología - San Salvador</p>
          </div>
        `
      });

      // Notificación para la Licenciada (Synapsa)
      await resend.emails.send({
        from: 'Sistema Synapsa <onboarding@resend.dev>',
        to: 'synapsapsicologia@gmail.com',
        subject: `Nueva Cita: ${nombre}`,
        html: `
          <h3>Nueva reservación desde la web</h3>
          <p><strong>Paciente:</strong> ${nombre}</p>
          <p><strong>WhatsApp:</strong> ${telefono}</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Horario:</strong> ${new Date(inicio).toLocaleString('es-SV', { hour12: true })}</p>
        `
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en el servidor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}