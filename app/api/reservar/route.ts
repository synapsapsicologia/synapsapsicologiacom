import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Forzamos la lectura de la variable corregida
const resend = new Resend(process.env.RESEND_API_KEY || '');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, telefono, inicio } = body;

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 1. Intentar insertar en Calendario
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      sendUpdates: 'all',
      requestBody: {
        summary: `Cita: ${nombre}`,
        description: `PACIENTE: ${nombre}\nTEL: ${telefono}\nEMAIL: ${email}`,
        start: { dateTime: new Date(inicio).toISOString(), timeZone: 'America/El_Salvador' },
        end: { dateTime: new Date(new Date(inicio).getTime() + 3600000).toISOString(), timeZone: 'America/El_Salvador' },
        attendees: [{ email }],
      },
    });

    // 2. Intentar enviar correos (solo si la KEY existe)
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Synapsa <onboarding@resend.dev>',
        to: email,
        subject: 'Cita Confirmada - Synapsa',
        html: `<p>Hola ${nombre}, tu cita ha sido reservada con éxito.</p>`
      });

      await resend.emails.send({
        from: 'Sistema <onboarding@resend.dev>',
        to: 'synapsapsicologia@gmail.com',
        subject: `Nueva Cita: ${nombre}`,
        html: `<p>Nueva cita agendada por ${nombre} (${telefono})</p>`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Esto es lo que nos dirá la verdad en los logs de Netlify
    console.error("ERROR DETECTADO:", error.message);
    return NextResponse.json({ 
      error: "Error en el servidor", 
      details: error.message 
    }, { status: 500 });
  }
}