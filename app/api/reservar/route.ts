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

    // 1. Google Calendar
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      sendUpdates: 'all', 
      requestBody: {
        summary: `Cita: ${nombre} (Synapsa)`,
        description: `PACIENTE: ${nombre}\nTEL: ${telefono}\nEMAIL: ${email}`,
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

    // 2. Enviar correos con Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Synapsa Clínica <onboarding@resend.dev>',
        to: email,
        subject: 'Confirmación de tu cita - Synapsa',
        html: `<p>Hola ${nombre}, tu cita ha sido reservada para las ${new Date(inicio).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: true })}.</p>`
      });

      await resend.emails.send({
        from: 'Sistema Synapsa <onboarding@resend.dev>',
        to: 'synapsapsicologia@gmail.com',
        subject: `Nueva Cita: ${nombre}`,
        html: `<p>Nueva cita de ${nombre} (${telefono}) para las ${new Date(inicio).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: true })}.</p>`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}