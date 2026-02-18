import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

export async function GET() {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const citas = response.data.items?.map(event => {
      const desc = event.description || "";
      const tel = desc.match(/TEL: (.*)/)?.[1] || "No registrado";
      const pago = desc.includes("PAGO: PAGADO") ? "PAGADO" : "PENDIENTE";
      const estado = desc.match(/ESTADO: (.*)/)?.[1] || "PENDIENTE";

      return {
        id: event.id,
        paciente: event.summary?.replace("Cita: ", "") || "Sin nombre",
        email: event.attendees?.[0]?.email || "Sin email",
        telefono: tel,
        fecha: new Date(event.start?.dateTime || "").toLocaleString('es-SV', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
        }),
        pago: pago,
        estadoConsulta: estado
      };
    }) || [];

    return NextResponse.json(citas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}