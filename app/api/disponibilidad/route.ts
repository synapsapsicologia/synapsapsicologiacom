import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha');

  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
    const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    
    // Limpieza profunda de la llave
    const privateKey = rawKey
      .replace(/^["']|["']$/g, '') 
      .replace(/\\n/g, '\n')       
      .trim();

    // LOG DE VERIFICACIÓN (Míralo en tu terminal de VS Code)
    console.log("¿Email cargado?:", !!clientEmail);
    console.log("¿Key cargada?:", privateKey.includes("BEGIN PRIVATE KEY"));

    if (!clientEmail || !privateKey) {
      return NextResponse.json({ error: "Credenciales faltantes en .env.local" }, { status: 500 });
    }

    // CAMBIO AQUÍ: Usamos el objeto de configuración explícito
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

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
    // Si Google responde con error, aquí veremos la razón real
    console.error("ERROR DETALLADO:", error.response?.data || error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}