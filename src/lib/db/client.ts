import fs from 'fs';
import path from 'path';

export interface Paciente {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  notasHistorial: string;
  fechaRegistro: string;
}

export interface Cita {
  id: string;
  pacienteId: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
  modalidad: 'virtual' | 'presencial';
  linkReunion: string;
  notasSesion: string;
  googleCalendarId: string;
  recordatorioEnviado?: boolean;
}

export interface Disponibilidad {
  id: string;
  diaSemana: number; // 0: Domingo, 1: Lunes, etc.
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM
  bloqueado: boolean;
}

export interface Database {
  pacientes: Paciente[];
  citas: Cita[];
  disponibilidad: Disponibilidad[];
  diasNoLaborables: string[];
}

const getDbPath = () => {
  return path.join(process.cwd(), 'src', 'lib', 'db', 'db.json');
};

// Lectura síncrona para evitar problemas de concurrencia
export function readDB(): Database {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      // Si el archivo no existe por alguna razón, inicializarlo vacío con estructura
      const initialDb: Database = {
        pacientes: [],
        citas: [],
        disponibilidad: [
          { id: 'disp-1', diaSemana: 1, horaInicio: '19:00', horaFin: '22:00', bloqueado: false },
          { id: 'disp-2', diaSemana: 2, horaInicio: '19:00', horaFin: '22:00', bloqueado: false },
          { id: 'disp-3', diaSemana: 3, horaInicio: '19:00', horaFin: '22:00', bloqueado: false },
          { id: 'disp-4', diaSemana: 4, horaInicio: '19:00', horaFin: '22:00', bloqueado: false },
          { id: 'disp-5', diaSemana: 5, horaInicio: '19:00', horaFin: '21:00', bloqueado: true },
          { id: 'disp-6', diaSemana: 6, horaInicio: '19:00', horaFin: '21:00', bloqueado: true },
          { id: 'disp-0', diaSemana: 0, horaInicio: '19:00', horaFin: '21:00', bloqueado: true }
        ],
        diasNoLaborables: []
      };
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error leyendo la base de datos:', error);
    return { pacientes: [], citas: [], disponibilidad: [], diasNoLaborables: [] };
  }
}

// Escritura síncrona para bloquear y evitar colisiones
export function writeDB(db: Database): void {
  try {
    const dbPath = getDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error escribiendo en la base de datos:', error);
  }
}

// --- PACIENTES CRUD ---

export function getPacientes(): Paciente[] {
  return readDB().pacientes;
}

export function getPacienteById(id: string): Paciente | undefined {
  return readDB().pacientes.find(p => p.id === id);
}

export function createPaciente(data: Omit<Paciente, 'id' | 'fechaRegistro'>): Paciente {
  const db = readDB();
  // Verificar si ya existe un paciente con el mismo email o teléfono
  const existente = db.pacientes.find(p => p.email.toLowerCase() === data.email.toLowerCase());
  if (existente) {
    return existente; // Retorna el existente para no duplicar en flujo de reserva
  }

  const nuevoPaciente: Paciente = {
    ...data,
    id: `pac-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fechaRegistro: new Date().toISOString()
  };
  db.pacientes.push(nuevoPaciente);
  writeDB(db);
  return nuevoPaciente;
}

export function updatePaciente(id: string, data: Partial<Paciente>): Paciente {
  const db = readDB();
  const index = db.pacientes.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error(`Paciente con ID ${id} no encontrado`);
  }
  const actualizado = { ...db.pacientes[index], ...data };
  db.pacientes[index] = actualizado;
  writeDB(db);
  return actualizado;
}

export function deletePaciente(id: string): boolean {
  const db = readDB();
  const index = db.pacientes.findIndex(p => p.id === id);
  if (index === -1) return false;
  db.pacientes.splice(index, 1);
  // También podríamos cancelar o eliminar sus citas relacionadas
  db.citas = db.citas.filter(c => c.pacienteId !== id);
  writeDB(db);
  return true;
}

// --- CITAS CRUD ---

export function getCitas(): (Cita & { paciente?: Paciente })[] {
  const db = readDB();
  return db.citas.map(cita => ({
    ...cita,
    paciente: db.pacientes.find(p => p.id === cita.pacienteId)
  }));
}

export function getCitaById(id: string): Cita | undefined {
  return readDB().citas.find(c => c.id === id);
}

export function createCita(data: Omit<Cita, 'id'>): Cita {
  const db = readDB();
  const nuevaCita: Cita = {
    ...data,
    id: `cit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
  };
  db.citas.push(nuevaCita);
  writeDB(db);
  return nuevaCita;
}

export function updateCita(id: string, data: Partial<Cita>): Cita {
  const db = readDB();
  const index = db.citas.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error(`Cita con ID ${id} no encontrada`);
  }
  const actualizada = { ...db.citas[index], ...data };
  db.citas[index] = actualizada;
  writeDB(db);
  return actualizada;
}

export function deleteCita(id: string): boolean {
  const db = readDB();
  const index = db.citas.findIndex(c => c.id === id);
  if (index === -1) return false;
  db.citas.splice(index, 1);
  writeDB(db);
  return true;
}

// --- DISPONIBILIDAD ---

export function getDisponibilidad(): Disponibilidad[] {
  return readDB().disponibilidad;
}

export function updateDisponibilidad(id: string, data: Partial<Disponibilidad>): Disponibilidad {
  const db = readDB();
  const index = db.disponibilidad.findIndex(d => d.id === id);
  if (index === -1) {
    throw new Error(`Disponibilidad con ID ${id} no encontrada`);
  }
  const actualizada = { ...db.disponibilidad[index], ...data };
  db.disponibilidad[index] = actualizada;
  writeDB(db);
  return actualizada;
}

// --- DIAS NO LABORABLES ---

export function getDiasNoLaborables(): string[] {
  return readDB().diasNoLaborables || [];
}

export function addDiaNoLaborable(fecha: string): void {
  const db = readDB();
  if (!db.diasNoLaborables) {
    db.diasNoLaborables = [];
  }
  // Validar formato YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) {
    throw new Error('Formato de fecha inválido. Utilice YYYY-MM-DD.');
  }
  if (!db.diasNoLaborables.includes(fecha)) {
    db.diasNoLaborables.push(fecha);
    db.diasNoLaborables.sort(); // Mantener ordenado
    writeDB(db);
  }
}

export function removeDiaNoLaborable(fecha: string): void {
  const db = readDB();
  if (!db.diasNoLaborables) return;
  const index = db.diasNoLaborables.indexOf(fecha);
  if (index !== -1) {
    db.diasNoLaborables.splice(index, 1);
    writeDB(db);
  }
}
