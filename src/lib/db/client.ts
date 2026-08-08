import { Redis } from '@upstash/redis';
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

// --- CONFIGURACIÓN DE CONEXIÓN HTTP REST (100% SERVERLESS) ---

let redisInstance: Redis | null = null;

// Envoltorio para operaciones de base de datos
async function executeDb<T>(operation: (client: Redis) => Promise<T>): Promise<T> {
  if (!redisInstance) {
    const restUrl = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
    const restToken = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
    
    if (!restUrl || !restToken) {
      throw new Error('Variables de entorno UPSTASH_REDIS_REST_URL y TOKEN faltantes.');
    }
    
    redisInstance = new Redis({ url: restUrl, token: restToken });
  }
  
  return await operation(redisInstance);
}

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

function parseData<T>(data: any): T {
  // @upstash/redis auto-parsea JSON, pero si fue guardado por ioredis podría ser string
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }
  return data as T;
}

// --- PACIENTES CRUD ---

export async function getPacientes(): Promise<Paciente[]> {
  try {
    return await executeDb(async (client) => {
      const ids = await client.smembers('synapsa:pacientes:ids');
      if (!ids || ids.length === 0) return [];
      
      const keys = ids.map(id => `synapsa:paciente:${id}`);
      const rawPacientes = await client.mget(...keys);
      
      return rawPacientes
        .filter((p): p is object | string => !!p)
        .map(p => parseData<Paciente>(p));
    });
  } catch (error) {
    console.error("ERROR EN HTTP REDIS (getPacientes), cayendo a db.json:", error);
    return readLocalDb().pacientes;
  }
}

export async function getPacienteById(id: string): Promise<Paciente | undefined> {
  try {
    return await executeDb(async (client) => {
      const raw = await client.get(`synapsa:paciente:${id}`);
      if (!raw) return undefined;
      return parseData<Paciente>(raw);
    });
  } catch (error) {
    console.error(`ERROR EN HTTP REDIS (getPacienteById ${id}), cayendo a db.json:`, error);
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

    return await executeDb(async (client) => {
      const pipeline = client.pipeline();
      pipeline.set(`synapsa:paciente:${nuevoId}`, JSON.stringify(nuevoPaciente));
      pipeline.sadd('synapsa:pacientes:ids', nuevoId);
      await pipeline.exec();
      return nuevoPaciente;
    });
  } catch (error) {
    console.error("ERROR EN HTTP REDIS (createPaciente):", error);
    throw new Error("No se pudo guardar el paciente porque la base de datos está inaccesible.");
  }
}

export async function updatePaciente(id: string, data: Partial<Paciente>): Promise<Paciente> {
  try {
    const existente = await getPacienteById(id);
    if (!existente) {
      throw new Error(`Paciente con ID ${id} no encontrado`);
    }

    const actualizado = { ...existente, ...data };
    return await executeDb(async (client) => {
      await client.set(`synapsa:paciente:${id}`, JSON.stringify(actualizado));
      return actualizado;
    });
  } catch (error) {
    console.error(`ERROR EN HTTP REDIS (updatePaciente ${id}):`, error);
    throw new Error(`Error BD (updatePaciente): ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deletePaciente(id: string): Promise<boolean> {
  try {
    const existente = await getPacienteById(id);
    if (!existente) return false;

    const citas = await getCitas();
    const citasAEliminar = citas.filter(c => c.pacienteId === id);
    
    return await executeDb(async (client) => {
      const pipeline = client.pipeline();
      
      for (const cita of citasAEliminar) {
        pipeline.del(`synapsa:cita:${cita.id}`);
        pipeline.srem('synapsa:citas:ids', cita.id);
        pipeline.srem(`synapsa:citas:fecha:${cita.fecha}`, cita.id);
      }
      
      pipeline.del(`synapsa:paciente:${id}`);
      pipeline.srem('synapsa:pacientes:ids', id);
      
      await pipeline.exec();
      return true;
    });
  } catch (error) {
    console.error(`ERROR EN HTTP REDIS (deletePaciente ${id}):`, error);
    throw new Error("No se pudo eliminar el paciente porque la base de datos está inaccesible.");
  }
}

// --- CITAS CRUD ---

export async function getCitas(): Promise<(Cita & { paciente?: Paciente })[]> {
  try {
    return await executeDb(async (client) => {
      const ids = await client.smembers('synapsa:citas:ids');
      if (!ids || ids.length === 0) return [];
      
      const keys = ids.map(id => `synapsa:cita:${id}`);
      const rawCitas = await client.mget(...keys);
      
      const citas: Cita[] = rawCitas
        .filter((c): c is object | string => !!c)
        .map(c => parseData<Cita>(c));

      const pacIds = await client.smembers('synapsa:pacientes:ids');
      let pacientes: Paciente[] = [];
      if (pacIds && pacIds.length > 0) {
        const pkeys = pacIds.map(id => `synapsa:paciente:${id}`);
        const pRaws = await client.mget(...pkeys);
        pacientes = pRaws.filter((p): p is object | string => !!p).map(p => parseData<Paciente>(p));
      }
      
      const pacienteMap = new Map(pacientes.map(p => [p.id, p]));
      
      return citas.map(cita => ({
        ...cita,
        paciente: pacienteMap.get(cita.pacienteId)
      }));
    });
  } catch (error) {
    console.error("ERROR EN HTTP REDIS (getCitas), cayendo a db.json:", error);
    const local = readLocalDb();
    const pacienteMap = new Map(local.pacientes.map(p => [p.id, p]));
    return local.citas.map(cita => ({
      ...cita,
      paciente: pacienteMap.get(cita.pacienteId)
    }));
  }
}

export async function getCitaById(id: string): Promise<Cita | undefined> {
  try {
    return await executeDb(async (client) => {
      const raw = await client.get(`synapsa:cita:${id}`);
      if (!raw) return undefined;
      return parseData<Cita>(raw);
    });
  } catch (error) {
    console.error(`ERROR EN HTTP REDIS (getCitaById ${id}), cayendo a db.json:`, error);
    return readLocalDb().citas.find(c => c.id === id);
  }
}

export async function createCita(data: Omit<Cita, 'id'>): Promise<Cita> {
  try {
    const nuevoId = `cit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const nuevaCita: Cita = {
      ...data,
      id: nuevoId
    };

    return await executeDb(async (client) => {
      const pipeline = client.pipeline();
      pipeline.set(`synapsa:cita:${nuevoId}`, JSON.stringify(nuevaCita));
      pipeline.sadd('synapsa:citas:ids', nuevoId);
      pipeline.sadd(`synapsa:citas:fecha:${nuevaCita.fecha}`, nuevoId);
      await pipeline.exec();
      return nuevaCita;
    });
  } catch (error) {
    console.error("ERROR EN HTTP REDIS (createCita):", error);
    throw new Error("No se pudo guardar la cita porque la base de datos está inaccesible.");
  }
}

export async function updateCita(id: string, data: Partial<Cita>): Promise<Cita> {
  try {
    const existente = await getCitaById(id);
    if (!existente) {
      throw new Error(`Cita con ID ${id} no encontrada`);
    }

    const actualizada = { ...existente, ...data };
    
    return await executeDb(async (client) => {
      const pipeline = client.pipeline();
      
      if (data.fecha && data.fecha !== existente.fecha) {
        pipeline.srem(`synapsa:citas:fecha:${existente.fecha}`, id);
        pipeline.sadd(`synapsa:citas:fecha:${data.fecha}`, id);
      }
      
      pipeline.set(`synapsa:cita:${id}`, JSON.stringify(actualizada));
      await pipeline.exec();
      
      return actualizada;
    });
  } catch (error) {
    console.error(`ERROR EN HTTP REDIS (updateCita ${id}):`, error);
    throw new Error("No se pudo actualizar la cita porque la base de datos está inaccesible.");
  }
}

export async function deleteCita(id: string): Promise<boolean> {
  try {
    const existente = await getCitaById(id);
    if (!existente) return false;

    return await executeDb(async (client) => {
      const pipeline = client.pipeline();
      pipeline.del(`synapsa:cita:${id}`);
      pipeline.srem('synapsa:citas:ids', id);
      pipeline.srem(`synapsa:citas:fecha:${existente.fecha}`, id);
      await pipeline.exec();
      return true;
    });
  } catch (error) {
    console.error(`ERROR EN HTTP REDIS (deleteCita ${id}):`, error);
    throw new Error("No se pudo eliminar la cita porque la base de datos está inaccesible.");
  }
}

// --- DISPONIBILIDAD ---

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

  try {
    return await executeDb(async (client) => {
      const raw = await client.get('synapsa:disponibilidad');
      if (!raw) return defaultDisp;
      return parseData<Disponibilidad[]>(raw);
    });
  } catch (error) {
    console.error("ERROR EN HTTP REDIS (getDisponibilidad), cayendo a db.json:", error);
    const local = readLocalDb();
    return local.disponibilidad && local.disponibilidad.length > 0 ? local.disponibilidad : defaultDisp;
  }
}

export async function updateDisponibilidad(id: string, data: Partial<Disponibilidad>): Promise<Disponibilidad> {
  try {
    const lista = await getDisponibilidad();
    const index = lista.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error(`Disponibilidad con ID ${id} no encontrada`);
    }

    const actualizada = { ...lista[index], ...data };
    lista[index] = actualizada;
    
    return await executeDb(async (client) => {
      await client.set('synapsa:disponibilidad', JSON.stringify(lista));
      return actualizada;
    });
  } catch (error) {
    console.error(`ERROR EN HTTP REDIS (updateDisponibilidad ${id}):`, error);
    throw new Error(`Error BD (updateDisponibilidad): ${error instanceof Error ? error.message : String(error)}`);
  }
}

// --- DIAS NO LABORABLES / FECHAS BLOQUEADAS ---

export async function getDiasNoLaborables(): Promise<string[]> {
  try {
    return await executeDb(async (client) => {
      const dates = await client.smembers('synapsa:diasNoLaborables');
      if (!dates) return [];
      return dates.sort();
    });
  } catch (error) {
    console.error("ERROR EN HTTP REDIS (getDiasNoLaborables), cayendo a db.json:", error);
    const local = readLocalDb();
    const dias = local.diasNoLaborables || local.fechasBloqueadas || [];
    return dias.sort();
  }
}

export async function addDiaNoLaborable(fecha: string): Promise<void> {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) {
    throw new Error('Formato de fecha inválido. Utilice YYYY-MM-DD.');
  }

  try {
    await executeDb(async (client) => {
      const pipeline = client.pipeline();
      pipeline.sadd('synapsa:diasNoLaborables', fecha);
      pipeline.sadd('synapsa:fechasBloqueadas', fecha);
      await pipeline.exec();
    });
  } catch (error) {
    console.error(`ERROR EN HTTP REDIS (addDiaNoLaborable ${fecha}):`, error);
    throw new Error("No se pudo bloquear la fecha porque la base de datos está inaccesible.");
  }
}

export async function removeDiaNoLaborable(fecha: string): Promise<void> {
  try {
    await executeDb(async (client) => {
      const pipeline = client.pipeline();
      pipeline.srem('synapsa:diasNoLaborables', fecha);
      pipeline.srem('synapsa:fechasBloqueadas', fecha);
      await pipeline.exec();
    });
  } catch (error) {
    console.error(`ERROR EN HTTP REDIS (removeDiaNoLaborable ${fecha}):`, error);
    throw new Error("No se pudo desbloquear la fecha porque la base de datos está inaccesible.");
  }
}

export async function setDiasNoLaborables(fechas: string[]): Promise<void> {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  const fechasValidas = fechas
    .map(f => f.trim())
    .filter(f => regex.test(f));

  const fechasUnicas = [...new Set(fechasValidas)].sort();

  try {
    await executeDb(async (client) => {
      await client.del('synapsa:diasNoLaborables');
      await client.del('synapsa:fechasBloqueadas');

      if (fechasUnicas.length > 0) {
        const pipeline = client.pipeline();
        for (const fecha of fechasUnicas) {
          pipeline.sadd('synapsa:diasNoLaborables', fecha);
          pipeline.sadd('synapsa:fechasBloqueadas', fecha);
        }
        await pipeline.exec();
      }
    });
  } catch (error) {
    console.error("ERROR EN HTTP REDIS (setDiasNoLaborables):", error);
    throw new Error(`Error BD (setDiasNoLaborables): ${error instanceof Error ? error.message : String(error)}`);
  }
}

