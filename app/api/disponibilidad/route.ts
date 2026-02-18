import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({ 
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN 
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha'); // Recibe "YYYY-MM-DD"

  if (!fecha) {
    return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Definimos el inicio y fin del día en la zona horaria de El Salvador
    const timeMin = `${fecha}T00:00:00-06:00`;
    const timeMax = `${fecha}T23:59:59-06:00`;

    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: 'America/El_Salvador'
    });

    const eventos = response.data.items || [];

    // Extraemos solo las horas (HH:mm) de los eventos encontrados
    const ocupados = eventos.map(evento => {
      const inicio = evento.start?.dateTime || evento.start?.date;
      if (!inicio) return null;
      
      // Convertimos la fecha de Google a un objeto Date y extraemos la hora local
      const date = new Date(inicio);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/El_Salvador' 
      });
    }).filter(Boolean);

    return NextResponse.json({ ocupados });
  } catch (error: any) {
    console.error("Error consultando disponibilidad:", error.message);
    return NextResponse.json({ ocupados: [] });
  }
}