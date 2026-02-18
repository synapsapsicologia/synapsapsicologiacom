import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

export async function POST(request: Request) {
  try {
    const { nombre, email, telefono, inicio } = await request.json();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      sendUpdates: 'all',
      requestBody: {
        summary: `Cita: ${nombre}`,
        // Guardamos los datos estructurados en la descripción
        description: `PACIENTE: ${nombre}\nTEL: ${telefono}\nEMAIL: ${email}\nPAGO: PENDIENTE\nESTADO: PENDIENTE`,
        start: { dateTime: new Date(inicio).toISOString(), timeZone: 'America/El_Salvador' },
        end: { dateTime: new Date(new Date(inicio).getTime() + 3600000).toISOString(), timeZone: 'America/El_Salvador' },
        attendees: [{ email }],
      },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}