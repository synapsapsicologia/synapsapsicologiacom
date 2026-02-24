import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha');

  try {
    // Limpieza profunda de variables
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
    const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
    
    // Esta línea elimina comillas accidentales y arregla los saltos de línea
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const privateKey = rawKey
      .replace(/^"|"$/g, '') // Quita comillas al inicio y final
      .replace(/\\n/g, '\n') // Convierte \n en saltos reales
      .trim();

    if (!clientEmail || !privateKey) {
      throw new Error("Credenciales incompletas en .env.local");
    }

    const auth = new google.auth.JWT(
      clientEmail,
      undefined,
      privateKey,
      ['https://www.googleapis.com/auth/calendar.readonly']
    );

    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: `${fecha}T00:00:00Z`,
      timeMax: `${fecha}T23:59:59Z`,
      singleEvents: true,
      timeZone: 'America/El_Salvador'
    });

    const ocupados = (response.data.items || []).map((event: any) => {
      const start = event.start.dateTime || event.start.date;
      return new Date(start).toLocaleTimeString('es-SV', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/El_Salvador'
      });
    });

    return NextResponse.json({ ocupados });
  } catch (error: any) {
    console.error("Error detectado:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}