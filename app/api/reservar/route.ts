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
    const body = await request.json();
    const { nombre, email, telefono, inicio } = body;

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

    // 2. Correos con Resend
    if (process.env.RESEND_API_KEY) {
      // Al paciente
      await resend.emails.send({
        from: 'Synapsa <onboarding@resend.dev>',
        to: email,
        subject: 'Confirmación de tu cita - Synapsa',
        html: `<p>Hola <strong>${nombre}</strong>, tu cita ha sido reservada con éxito.</p>`
      });

      // A ti (Synapsa)
      await resend.emails.send({
        from: 'Sistema <onboarding@resend.dev>',
        to: 'synapsapsicologia@gmail.com',
        subject: `Nueva Cita: ${nombre}`,
        html: `<p>Nueva cita de ${nombre} para el ${new Date(inicio).toLocaleString('es-SV')}</p>`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error completo:", error);
    return NextResponse.json({ error: error.message || "Error desconocido" }, { status: 500 });
 
  }
  } catch (error: any) {
    // Esto imprimirá el error real en los logs de Netlify para que podamos leerlo
    console.error("DETALLE DEL ERROR:", error.response?.data || error.message);
    return NextResponse.json(
      { error: "Error interno", details: error.message }, 
      { status: 500 }
    );
}


// Actualización forzada