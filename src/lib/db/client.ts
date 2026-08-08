import Redis from 'ioredis';
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

// --- CONFIGURACIÓN DE CONEXIÓN CON ESCUDO DE FALLBACK ---

let redisUrl = (process.env.REDIS_URL || '').trim();
let isRedisOffline = false;

if (!redisUrl) {
  redisUrl = 'redis://127.0.0.1:6379';
  isRedisOffline = true; // Forzar fallback inmediato si no hay variable de entorno
} else {
  // Si no empieza con redis:// ni rediss://, le agregamos rediss://
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    redisUrl = 'rediss://' + redisUrl.replace(/^\/+/, '');
  }
}

const isSecure = redisUrl.startsWith('rediss://');
const redisOptions: any = {
  connectTimeout: 3000, // Tiempo de espera corto para fallar rápido
  maxRetriesPerRequest: 1, // Reducir reintentos para no bloquear las lambdas
  keepAlive: 100
};

if (isSecure) {
  redisOptions.tls = { rejectUnauthorized: false };
}

const redis = new Redis(redisUrl, redisOptions);

redis.on('error', (err) => {
  console.error('Redis Connection Error (falling back to db.json):', err.message);
  isRedisOffline = true;
});

redis.on('connect', () => {
  isRedisOffline = false;
  console.log('Redis connected successfully! Switched to cloud database.');
});

export { redis };

// --- FILE PATH DE RESPALDO LOCAL ---

const localDbPath = path.resolve(process.cwd(), 'src/lib/db/db.json');

function readLocalDb(): Database {
  const defaultDb: Database = {
    pacientes: [],
    citas: [],
    disponibilidad: [],
    diasNoLaborables: [],
    fechasBloqueadas: []
  };

  try {
    if (fs.existsSync(localDbPath)) {
      const content = fs.readFileSync(localDbPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local db.json fallback:', err);
  }
  return defaultDb;
}

function writeLocalDb(database: Database) {
  try {
    fs.writeFileSync(localDbPath, JSON.stringify(database, null, 2));
  } catch (err) {
    // Normal en producción si el filesystem es de solo lectura (como Vercel/Netlify)
  }
}

// --- PACIENTES CRUD (Estructura Granular + Fallback) ---

export async function getPacientes(): Promise<Paciente[]> {
  if (isRedisOffline) {
    return readLocalDb().pacientes;
  }
  try {
    const ids = await redis.smembers('synapsa:pacientes:ids');
    if (!ids || ids.length === 0) return [];
    
    const keys = ids.map(id => `synapsa:paciente:${id}`);
    const rawPacientes = await redis.mget(...keys);
    
    return rawPacientes
      .filter((p): p is string => !!p)
      .map(p => JSON.parse(p));
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getPacientes), cayendo a db.json:", error);
    isRedisOffline = true;
    return readLocalDb().pacientes;
  }
}

export async function getPacienteById(id: string): Promise<Paciente | undefined> {
  if (isRedisOffline) {
    return readLocalDb().pacientes.find(p => p.id === id);
  }
  try {
    const raw = await redis.get(`synapsa:paciente:${id}`);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`ERROR CRÍTICO EN REDIS (getPacienteById ${id}), cayendo a db.json:`, error);
    isRedisOffline = true;
    return readLocalDb().pacientes.find(p => p.id === id);
  }
}

export async function createPaciente(data: Omit<Paciente, 'id' | 'fechaRegistro'>): Promise<Paciente> {
  const normalizarTelefono = (t: string) => {
    if (!t) return '';
    const clean = t.replace(/[^\d]/g, '');
    if (clean.length === 8) {
      return `503${clean}`;
    }
    return clean;
  };

  if (isRedisOffline) {
    const local = readLocalDb();
    const telefonoBuscado = normalizarTelefono(data.telefono);
    const existente = local.pacientes.find(p => 
      (p.email && p.email.toLowerCase() === data.email.toLowerCase()) ||
      (p.telefono && normalizarTelefono(p.telefono) === telefonoBuscado)
    );
    
    if (existente) return existente;

    const nuevoId = `pac-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const nuevoPaciente: Paciente = {
      ...data,
      id: nuevoId,
      fechaRegistro: new Date().toISOString()
    };

    local.pacientes.push(nuevoPaciente);
    writeLocalDb(local);
    return nuevoPaciente;
  }

  try {
    const pacientes = await getPacientes();
    const telefonoBuscado = normalizarTelefono(data.telefono);
    const existente = pacientes.find(p => 
      (p.email && p.email.toLowerCase() === data.email.toLowerCase()) ||
      (p.telefono && normalizarTelefono(p.telefono) === telefonoBuscado)
    );
    
    if (existente) {
      return existente;
    }

    const nuevoId = `pac-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const nuevoPaciente: Paciente = {
      ...data,
      id: nuevoId,
      fechaRegistro: new Date().toISOString()
    };

    await redis.multi()
      .set(`synapsa:paciente:${nuevoId}`, JSON.stringify(nuevoPaciente))
      .sadd('synapsa:pacientes:ids', nuevoId)
      .exec();

    return nuevoPaciente;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (createPaciente), cayendo a db.json:", error);
    isRedisOffline = true;
    return createPaciente(data);
  }
}

export async function updatePaciente(id: string, data: Partial<Paciente>): Promise<Paciente> {
  if (isRedisOffline) {
    const local = readLocalDb();
    const index = local.pacientes.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Paciente con ID ${id} no encontrado`);
    }
    const actualizado = { ...local.pacientes[index], ...data };
    local.pacientes[index] = actualizado;
    writeLocalDb(local);
    return actualizado;
  }

  try {
    const existente = await getPacienteById(id);
    if (!existente) {
      throw new Error(`Paciente con ID ${id} no encontrado`);
    }

    const actualizado = { ...existente, ...data };
    await redis.set(`synapsa:paciente:${id}`, JSON.stringify(actualizado));
    return actualizado;
  } catch (error) {
    console.error(`ERROR CRÍTICO EN REDIS (updatePaciente ${id}), cayendo a db.json:`, error);
    isRedisOffline = true;
    return updatePaciente(id, data);
  }
}

export async function deletePaciente(id: string): Promise<boolean> {
  if (isRedisOffline) {
    const local = readLocalDb();
    const existente = local.pacientes.find(p => p.id === id);
    if (!existente) return false;

    local.pacientes = local.pacientes.filter(p => p.id !== id);
    local.citas = local.citas.filter(c => c.pacienteId !== id);
    writeLocalDb(local);
    return true;
  }

  try {
    const existente = await getPacienteById(id);
    if (!existente) return false;

    const citas = await getCitas();
    const citasAEliminar = citas.filter(c => c.pacienteId === id);
    
    const pipeline = redis.multi();
    
    for (const cita of citasAEliminar) {
      pipeline.del(`synapsa:cita:${cita.id}`);
      pipeline.srem('synapsa:citas:ids', cita.id);
      pipeline.srem(`synapsa:citas:fecha:${cita.fecha}`, cita.id);
    }
    
    pipeline.del(`synapsa:paciente:${id}`);
    pipeline.srem('synapsa:pacientes:ids', id);
    
    await pipeline.exec();
    return true;
  } catch (error) {
    console.error(`ERROR CRÍTICO EN REDIS (deletePaciente ${id}), cayendo a db.json:`, error);
    isRedisOffline = true;
    return deletePaciente(id);
  }
}

// --- CITAS CRUD (Estructura Granular + Fallback) ---

export async function getCitas(): Promise<(Cita & { paciente?: Paciente })[]> {
  if (isRedisOffline) {
    const local = readLocalDb();
    const pacienteMap = new Map(local.pacientes.map(p => [p.id, p]));
    return local.citas.map(cita => ({
      ...cita,
      paciente: pacienteMap.get(cita.pacienteId)
    }));
  }

  try {
    const ids = await redis.smembers('synapsa:citas:ids');
    if (!ids || ids.length === 0) return [];
    
    const keys = ids.map(id => `synapsa:cita:${id}`);
    const rawCitas = await redis.mget(...keys);
    
    const citas: Cita[] = rawCitas
      .filter((c): c is string => !!c)
      .map(c => JSON.parse(c));

    const pacientes = await getPacientes();
    const pacienteMap = new Map(pacientes.map(p => [p.id, p]));
    
    return citas.map(cita => ({
      ...cita,
      paciente: pacienteMap.get(cita.pacienteId)
    }));
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getCitas), cayendo a db.json:", error);
    isRedisOffline = true;
    return getCitas();
  }
}

export async function getCitaById(id: string): Promise<Cita | undefined> {
  if (isRedisOffline) {
    return readLocalDb().citas.find(c => c.id === id);
  }

  try {
    const raw = await redis.get(`synapsa:cita:${id}`);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`ERROR CRÍTICO EN REDIS (getCitaById ${id}), cayendo a db.json:`, error);
    isRedisOffline = true;
    return readLocalDb().citas.find(c => c.id === id);
  }
}

export async function createCita(data: Omit<Cita, 'id'>): Promise<Cita> {
  if (isRedisOffline) {
    const local = readLocalDb();
    const nuevoId = `cit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const nuevaCita: Cita = {
      ...data,
      id: nuevoId
    };
    local.citas.push(nuevaCita);
    writeLocalDb(local);
    return nuevaCita;
  }

  try {
    const nuevoId = `cit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const nuevaCita: Cita = {
      ...data,
      id: nuevoId
    };

    await redis.multi()
      .set(`synapsa:cita:${nuevoId}`, JSON.stringify(nuevaCita))
      .sadd('synapsa:citas:ids', nuevoId)
      .sadd(`synapsa:citas:fecha:${nuevaCita.fecha}`, nuevoId)
      .exec();

    return nuevaCita;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (createCita), cayendo a db.json:", error);
    isRedisOffline = true;
    return createCita(data);
  }
}

export async function updateCita(id: string, data: Partial<Cita>): Promise<Cita> {
  if (isRedisOffline) {
    const local = readLocalDb();
    const index = local.citas.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Cita con ID ${id} no encontrada`);
    }
    const actualizada = { ...local.citas[index], ...data };
    local.citas[index] = actualizada;
    writeLocalDb(local);
    return actualizada;
  }

  try {
    const existente = await getCitaById(id);
    if (!existente) {
      throw new Error(`Cita con ID ${id} no encontrada`);
    }

    const actualizada = { ...existente, ...data };
    
    const pipeline = redis.multi();
    
    if (data.fecha && data.fecha !== existente.fecha) {
      pipeline.srem(`synapsa:citas:fecha:${existente.fecha}`, id);
      pipeline.sadd(`synapsa:citas:fecha:${data.fecha}`, id);
    }
    
    pipeline.set(`synapsa:cita:${id}`, JSON.stringify(actualizada));
    await pipeline.exec();
    
    return actualizada;
  } catch (error) {
    console.error(`ERROR CRÍTICO EN REDIS (updateCita ${id}), cayendo a db.json:`, error);
    isRedisOffline = true;
    return updateCita(id, data);
  }
}

export async function deleteCita(id: string): Promise<boolean> {
  if (isRedisOffline) {
    const local = readLocalDb();
    const existente = local.citas.find(c => c.id === id);
    if (!existente) return false;

    local.citas = local.citas.filter(c => c.id !== id);
    writeLocalDb(local);
    return true;
  }

  try {
    const existente = await getCitaById(id);
    if (!existente) return false;

    await redis.multi()
      .del(`synapsa:cita:${id}`)
      .srem('synapsa:citas:ids', id)
      .srem(`synapsa:citas:fecha:${existente.fecha}`, id)
      .exec();

    return true;
  } catch (error) {
    console.error(`ERROR CRÍTICO EN REDIS (deleteCita ${id}), cayendo a db.json:`, error);
    isRedisOffline = true;
    return deleteCita(id);
  }
}

// --- DISPONIBILIDAD (Configuración Semanal + Fallback) ---

export async function getDisponibilidad(): Promise<Disponibilidad[]> {
  const defaultDisp: Disponibilidad[] = [
    { id: 'disp-1', diaSemana: 1, horaInicio: '19:00', horaFin: '22:00', bloqueado: false },
    { id: 'disp-2', diaSemana: 2, horaInicio: '19:00', horaFin: '22:00', bloqueado: false },
    { id: 'disp-3', diaSemana: 3, horaInicio: '19:00', horaFin: '22:00', bloqueado: false },
    { id: 'disp-4', diaSemana: 4, horaInicio: '19:00', horaFin: '22:00', bloqueado: false },
    { id: 'disp-5', diaSemana: 5, horaInicio: '19:00', horaFin: '21:00', bloqueado: true },
    { id: 'disp-6', diaSemana: 6, horaInicio: '19:00', horaFin: '21:00', bloqueado: true },
    { id: 'disp-0', diaSemana: 0, horaInicio: '19:00', horaFin: '21:00', bloqueado: true }
  ];

  if (isRedisOffline) {
    const local = readLocalDb();
    return local.disponibilidad && local.disponibilidad.length > 0 ? local.disponibilidad : defaultDisp;
  }

  try {
    const raw = await redis.get('synapsa:disponibilidad');
    if (!raw) return defaultDisp;
    return JSON.parse(raw);
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getDisponibilidad), cayendo a db.json:", error);
    isRedisOffline = true;
    return getDisponibilidad();
  }
}

export async function updateDisponibilidad(id: string, data: Partial<Disponibilidad>): Promise<Disponibilidad> {
  if (isRedisOffline) {
    const local = readLocalDb();
    const index = local.disponibilidad.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error(`Disponibilidad con ID ${id} no encontrada`);
    }
    const actualizada = { ...local.disponibilidad[index], ...data };
    local.disponibilidad[index] = actualizada;
    writeLocalDb(local);
    return actualizada;
  }

  try {
    const lista = await getDisponibilidad();
    const index = lista.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error(`Disponibilidad con ID ${id} no encontrada`);
    }

    const actualizada = { ...lista[index], ...data };
    lista[index] = actualizada;
    
    await redis.set('synapsa:disponibilidad', JSON.stringify(lista));
    return actualizada;
  } catch (error) {
    console.error(`ERROR CRÍTICO EN REDIS (updateDisponibilidad ${id}), cayendo a db.json:`, error);
    isRedisOffline = true;
    return updateDisponibilidad(id, data);
  }
}

// --- DIAS NO LABORABLES / FECHAS BLOQUEADAS (Sets + Fallback) ---

export async function getDiasNoLaborables(): Promise<string[]> {
  if (isRedisOffline) {
    const local = readLocalDb();
    const dias = local.diasNoLaborables || local.fechasBloqueadas || [];
    return dias.sort();
  }

  try {
    const dates = await redis.smembers('synapsa:diasNoLaborables');
    if (!dates) return [];
    return dates.sort();
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getDiasNoLaborables), cayendo a db.json:", error);
    isRedisOffline = true;
    return getDiasNoLaborables();
  }
}

export async function addDiaNoLaborable(fecha: string): Promise<void> {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) {
    throw new Error('Formato de fecha inválido. Utilice YYYY-MM-DD.');
  }

  if (isRedisOffline) {
    const local = readLocalDb();
    if (!local.diasNoLaborables) local.diasNoLaborables = [];
    if (!local.fechasBloqueadas) local.fechasBloqueadas = [];
    if (!local.diasNoLaborables.includes(fecha)) local.diasNoLaborables.push(fecha);
    if (!local.fechasBloqueadas.includes(fecha)) local.fechasBloqueadas.push(fecha);
    writeLocalDb(local);
    return;
  }

  try {
    await redis.multi()
      .sadd('synapsa:diasNoLaborables', fecha)
      .sadd('synapsa:fechasBloqueadas', fecha)
      .exec();
  } catch (error) {
    console.error(`ERROR CRÍTICO EN REDIS (addDiaNoLaborable ${fecha}), cayendo a db.json:`, error);
    isRedisOffline = true;
    return addDiaNoLaborable(fecha);
  }
}

export async function removeDiaNoLaborable(fecha: string): Promise<void> {
  if (isRedisOffline) {
    const local = readLocalDb();
    if (local.diasNoLaborables) {
      local.diasNoLaborables = local.diasNoLaborables.filter(f => f !== fecha);
    }
    if (local.fechasBloqueadas) {
      local.fechasBloqueadas = local.fechasBloqueadas.filter(f => f !== fecha);
    }
    writeLocalDb(local);
    return;
  }

  try {
    await redis.multi()
      .srem('synapsa:diasNoLaborables', fecha)
      .srem('synapsa:fechasBloqueadas', fecha)
      .exec();
  } catch (error) {
    console.error(`ERROR CRÍTICO EN REDIS (removeDiaNoLaborable ${fecha}), cayendo a db.json:`, error);
    isRedisOffline = true;
    return removeDiaNoLaborable(fecha);
  }
}

export async function setDiasNoLaborables(fechas: string[]): Promise<void> {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  const fechasValidas = fechas
    .map(f => f.trim())
    .filter(f => regex.test(f));

  const fechasUnicas = [...new Set(fechasValidas)].sort();

  if (isRedisOffline) {
    const local = readLocalDb();
    local.diasNoLaborables = fechasUnicas;
    local.fechasBloqueadas = fechasUnicas;
    writeLocalDb(local);
    return;
  }

  try {
    await redis.del('synapsa:diasNoLaborables');
    await redis.del('synapsa:fechasBloqueadas');

    if (fechasUnicas.length > 0) {
      await redis.multi()
        .sadd('synapsa:diasNoLaborables', ...fechasUnicas)
        .sadd('synapsa:fechasBloqueadas', ...fechasUnicas)
        .exec();
    }
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (setDiasNoLaborables), cayendo a db.json:", error);
    isRedisOffline = true;
    return setDiasNoLaborables(fechas);
  }
}
