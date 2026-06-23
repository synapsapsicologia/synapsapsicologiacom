import Redis from 'ioredis';

export interface Paciente {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  notasHistorial: string;
  fechaRegistro: string;
  dui?: string;
  direccionCompleta?: string;
}

export interface Cita {
  id: string;
  pacienteId: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | string;
  modalidad: 'virtual' | 'presencial';
  linkReunion: string;
  notasSesion: string;
  googleCalendarId: string;
  recordatorioEnviado?: boolean;
  pagado?: boolean;
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
  fechasBloqueadas: string[];
}

let redisInstance: Redis | null = null;

function getRedis(): Redis {
  if (redisInstance) return redisInstance;
  
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL environment variable is not defined.');
  }
  
  const redisOptions = {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy(times: number) {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      return Math.min(times * 100, 2000);
    }
  };

  if (process.env.NODE_ENV === 'production') {
    redisInstance = new Redis(url, redisOptions);
  } else {
    if (!(global as any).redis) {
      (global as any).redis = new Redis(url, redisOptions);
    }
    redisInstance = (global as any).redis;
  }
  return redisInstance!;
}


// Lectura asíncrona de Redis para evitar problemas de concurrencia
export async function readDB(): Promise<Database> {
  try {
    const r = getRedis();
    const [pacientesStr, citasStr, disponibilidadStr, diasNoLaborablesStr, fechasBloqueadasStr] = await Promise.all([
      r.get('synapsa:pacientes'),
      r.get('synapsa:citas'),
      r.get('synapsa:disponibilidad'),
      r.get('synapsa:diasNoLaborables'),
      r.get('synapsa:fechasBloqueadas')
    ]);

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
      diasNoLaborables: [],
      fechasBloqueadas: []
    };

    return {
      pacientes: pacientesStr ? JSON.parse(pacientesStr) : initialDb.pacientes,
      citas: citasStr ? JSON.parse(citasStr) : initialDb.citas,
      disponibilidad: disponibilidadStr ? JSON.parse(disponibilidadStr) : initialDb.disponibilidad,
      diasNoLaborables: diasNoLaborablesStr ? JSON.parse(diasNoLaborablesStr) : initialDb.diasNoLaborables,
      fechasBloqueadas: fechasBloqueadasStr ? JSON.parse(fechasBloqueadasStr) : initialDb.fechasBloqueadas
    };
  } catch (error) {
    console.error('Error leyendo la base de datos Redis:', error);
    return { pacientes: [], citas: [], disponibilidad: [], diasNoLaborables: [], fechasBloqueadas: [] };
  }
}

// Escritura asíncrona en Redis
export async function writeDB(db: Database): Promise<void> {
  try {
    const r = getRedis();
    await Promise.all([
      r.set('synapsa:pacientes', JSON.stringify(db.pacientes)),
      r.set('synapsa:citas', JSON.stringify(db.citas)),
      r.set('synapsa:disponibilidad', JSON.stringify(db.disponibilidad)),
      r.set('synapsa:diasNoLaborables', JSON.stringify(db.diasNoLaborables)),
      r.set('synapsa:fechasBloqueadas', JSON.stringify(db.fechasBloqueadas))
    ]);
  } catch (error) {
    console.error('Error escribiendo en la base de datos Redis:', error);
  }
}

// --- PACIENTES CRUD ---

export async function getPacientes(): Promise<Paciente[]> {
  const db = await readDB();
  return db.pacientes;
}

export async function getPacienteById(id: string): Promise<Paciente | undefined> {
  const db = await readDB();
  return db.pacientes.find(p => p.id === id);
}

export async function createPaciente(data: Omit<Paciente, 'id' | 'fechaRegistro'>): Promise<Paciente> {
  const db = await readDB();
  
  const normalizarTelefono = (t: string) => {
    if (!t) return '';
    const clean = t.replace(/[^\d]/g, '');
    if (clean.length === 8) {
      return `503${clean}`;
    }
    return clean;
  };
  
  const telefonoBuscado = normalizarTelefono(data.telefono);
  // Verificar si ya existe un paciente con el mismo email o teléfono
  const existente = db.pacientes.find(p => 
    (p.email && p.email.toLowerCase() === data.email.toLowerCase()) ||
    (p.telefono && normalizarTelefono(p.telefono) === telefonoBuscado)
  );
  
  if (existente) {
    return existente; // Retorna el existente para no duplicar en flujo de reserva
  }

  const nuevoPaciente: Paciente = {
    ...data,
    id: `pac-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fechaRegistro: new Date().toISOString()
  };
  db.pacientes.push(nuevoPaciente);
  await writeDB(db);
  return nuevoPaciente;
}

export async function updatePaciente(id: string, data: Partial<Paciente>): Promise<Paciente> {
  const db = await readDB();
  const index = db.pacientes.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error(`Paciente con ID ${id} no encontrado`);
  }
  const actualizado = { ...db.pacientes[index], ...data };
  db.pacientes[index] = actualizado;
  await writeDB(db);
  return actualizado;
}

export async function deletePaciente(id: string): Promise<boolean> {
  const db = await readDB();
  const index = db.pacientes.findIndex(p => p.id === id);
  if (index === -1) return false;
  db.pacientes.splice(index, 1);
  // También cancelamos o eliminamos sus citas relacionadas
  db.citas = db.citas.filter(c => c.pacienteId !== id);
  await writeDB(db);
  return true;
}

// --- CITAS CRUD ---

export async function getCitas(): Promise<(Cita & { paciente?: Paciente })[]> {
  const db = await readDB();
  return db.citas.map(cita => ({
    ...cita,
    paciente: db.pacientes.find(p => p.id === cita.pacienteId)
  }));
}

export async function getCitaById(id: string): Promise<Cita | undefined> {
  const db = await readDB();
  return db.citas.find(c => c.id === id);
}

export async function createCita(data: Omit<Cita, 'id'>): Promise<Cita> {
  const db = await readDB();
  const nuevaCita: Cita = {
    ...data,
    id: `cit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
  };
  db.citas.push(nuevaCita);
  await writeDB(db);
  return nuevaCita;
}

export async function updateCita(id: string, data: Partial<Cita>): Promise<Cita> {
  const db = await readDB();
  const index = db.citas.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error(`Cita con ID ${id} no encontrada`);
  }
  const actualizada = { ...db.citas[index], ...data };
  db.citas[index] = actualizada;
  await writeDB(db);
  return actualizada;
}

export async function deleteCita(id: string): Promise<boolean> {
  const db = await readDB();
  const index = db.citas.findIndex(c => c.id === id);
  if (index === -1) return false;
  db.citas.splice(index, 1);
  await writeDB(db);
  return true;
}

// --- DISPONIBILIDAD ---

export async function getDisponibilidad(): Promise<Disponibilidad[]> {
  const db = await readDB();
  return db.disponibilidad;
}

export async function updateDisponibilidad(id: string, data: Partial<Disponibilidad>): Promise<Disponibilidad> {
  const db = await readDB();
  const index = db.disponibilidad.findIndex(d => d.id === id);
  if (index === -1) {
    throw new Error(`Disponibilidad con ID ${id} no encontrada`);
  }
  const actualizada = { ...db.disponibilidad[index], ...data };
  db.disponibilidad[index] = actualizada;
  await writeDB(db);
  return actualizada;
}

// --- DIAS NO LABORABLES ---

export async function getDiasNoLaborables(): Promise<string[]> {
  const db = await readDB();
  return db.diasNoLaborables || db.fechasBloqueadas || [];
}

export async function addDiaNoLaborable(fecha: string): Promise<void> {
  const db = await readDB();
  if (!db.diasNoLaborables) {
    db.diasNoLaborables = [];
  }
  if (!db.fechasBloqueadas) {
    db.fechasBloqueadas = [];
  }
  // Validar formato YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) {
    throw new Error('Formato de fecha inválido. Utilice YYYY-MM-DD.');
  }
  let changed = false;
  if (!db.diasNoLaborables.includes(fecha)) {
    db.diasNoLaborables.push(fecha);
    db.diasNoLaborables.sort(); // Mantener ordenado
    changed = true;
  }
  if (!db.fechasBloqueadas.includes(fecha)) {
    db.fechasBloqueadas.push(fecha);
    db.fechasBloqueadas.sort(); // Mantener ordenado
    changed = true;
  }
  if (changed) {
    await writeDB(db);
  }
}

export async function removeDiaNoLaborable(fecha: string): Promise<void> {
  const db = await readDB();
  let changed = false;
  if (db.diasNoLaborables) {
    const index = db.diasNoLaborables.indexOf(fecha);
    if (index !== -1) {
      db.diasNoLaborables.splice(index, 1);
      changed = true;
    }
  }
  if (db.fechasBloqueadas) {
    const index = db.fechasBloqueadas.indexOf(fecha);
    if (index !== -1) {
      db.fechasBloqueadas.splice(index, 1);
      changed = true;
    }
  }
  if (changed) {
    await writeDB(db);
  }
}

export async function setDiasNoLaborables(fechas: string[]): Promise<void> {
  const db = await readDB();
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  const fechasValidas = fechas
    .map(f => f.trim())
    .filter(f => regex.test(f));
  
  db.diasNoLaborables = [...new Set(fechasValidas)].sort();
  db.fechasBloqueadas = [...db.diasNoLaborables];
  
  await writeDB(db);
}
