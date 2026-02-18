import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({ 
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, telefono, inicio } = body;

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calculamos el fin de la cita (1 hora después)
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fechaInicio.getTime() + 60 * 60 * 1000);

    // 1. Insertar en Google Calendar con Zona Horaria fija
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: `Cita: ${nombre}`,
        description: `PACIENTE: ${nombre}\nTEL: ${telefono}\nEMAIL: ${email}`,
        start: { 
          dateTime: fechaInicio.toISOString(), 
          timeZone: 'America/El_Salvador' 
        },
        end: { 
          dateTime: fechaFin.toISOString(), 
          timeZone: 'America/El_Salvador' 
        },
        attendees: [{ email }],
      },
    });

    // 2. Enviar correos de confirmación vía Resend
    if (process.env.RESEND_API_KEY) {
      // Correo al paciente
      await resend.emails.send({
        from: 'Synapsa <onboarding@resend.dev>',
        to: email,
        subject: 'Confirmación de tu cita - Synapsa',
        html: `<p>Hola <strong>${nombre}</strong>, tu cita ha sido reservada con éxito para la fecha y hora seleccionada.</p>`
      });

      // Correo a la clínica
      await resend.emails.send({
        from: 'Sistema Synapsa <onboarding@resend.dev>',
        to: 'synapsapsicologia@gmail.com',
        subject: `Nueva Cita Agendada: ${nombre}`,
        html: `<p>Se ha registrado una nueva cita:</p>
               <ul>
                 <li><strong>Nombre:</strong> ${nombre}</li>
                 <li><strong>WhatsApp:</strong> ${telefono}</li>
                 <li><strong>Email:</strong> ${email}</li>
                 <li><strong>Horario:</strong> ${inicio}</li>
               </ul>`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en el servidor:", error.message);
    return NextResponse.json({ 
      error: "Error en la reserva", 
      details: error.message 
    }, { status: 500 });
  }
}