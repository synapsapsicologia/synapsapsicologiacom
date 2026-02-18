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
  const fecha = searchParams.get('fecha');

  if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: `${fecha}T00:00:00-06:00`,
      timeMax: `${fecha}T23:59:59-06:00`,
      singleEvents: true,
      timeZone: 'America/El_Salvador'
    });

    const ocupados = response.data.items?.map(event => {
      const inicio = new Date(event.start?.dateTime || event.start?.date || '');
      return inicio.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'America/El_Salvador' 
      });
    }) || [];

    return NextResponse.json({ ocupados });
  } catch (error: any) {
    return NextResponse.json({ ocupados: [] });
  }
}