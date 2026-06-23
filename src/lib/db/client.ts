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

const redis = new Redis(process.env.REDIS_URL!, {
  tls: { rejectUnauthorized: false },
  connectTimeout: 10000, // Aumentar timeout
  maxRetriesPerRequest: 3, // Reducir reintentos para fallar rápido y liberar
  keepAlive: 100, // Mantener viva la conexión brevemente
});
redis.on('error', (err) => {
  console.error('Redis Connection Error:', err.message);
});
export { redis };

// Lectura asíncrona de Redis para evitar problemas de concurrencia
export async function readDB(): Promise<Database> {
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

  try {
    const [pacientesStr, citasStr, disponibilidadStr, diasNoLaborablesStr, fechasBloqueadasStr] = await Promise.all([
      redis.get('synapsa:pacientes'),
      redis.get('synapsa:citas'),
      redis.get('synapsa:disponibilidad'),
      redis.get('synapsa:diasNoLaborables'),
      redis.get('synapsa:fechasBloqueadas')
    ]);

    const parseValue = (val: any, fallback: any) => {
      if (val === null || val === undefined) return fallback;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return fallback;
        }
      }
      return val;
    };

    return {
      pacientes: parseValue(pacientesStr, initialDb.pacientes),
      citas: parseValue(citasStr, initialDb.citas),
      disponibilidad: parseValue(disponibilidadStr, initialDb.disponibilidad),
      diasNoLaborables: parseValue(diasNoLaborablesStr, initialDb.diasNoLaborables),
      fechasBloqueadas: parseValue(fechasBloqueadasStr, initialDb.fechasBloqueadas)
    };
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (readDB):", error);
    return initialDb; // Devuelve valores vacíos/por defecto en lugar de colapsar
  }
}

// Escritura asíncrona en Redis
export async function writeDB(db: Database): Promise<void> {
  try {
    await Promise.all([
      redis.set('synapsa:pacientes', JSON.stringify(db.pacientes)),
      redis.set('synapsa:citas', JSON.stringify(db.citas)),
      redis.set('synapsa:disponibilidad', JSON.stringify(db.disponibilidad)),
      redis.set('synapsa:diasNoLaborables', JSON.stringify(db.diasNoLaborables)),
      redis.set('synapsa:fechasBloqueadas', JSON.stringify(db.fechasBloqueadas))
    ]);
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (writeDB):", error);
    throw error;
  }
}

// --- PACIENTES CRUD ---

export async function getPacientes(): Promise<Paciente[]> {
  try {
    const db = await readDB();
    return db.pacientes;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getPacientes):", error);
    return [];
  }
}

export async function getPacienteById(id: string): Promise<Paciente | undefined> {
  try {
    const db = await readDB();
    return db.pacientes.find(p => p.id === id);
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getPacienteById):", error);
    return undefined;
  }
}

export async function createPaciente(data: Omit<Paciente, 'id' | 'fechaRegistro'>): Promise<Paciente> {
  try {
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
    const existente = db.pacientes.find(p => 
      (p.email && p.email.toLowerCase() === data.email.toLowerCase()) ||
      (p.telefono && normalizarTelefono(p.telefono) === telefonoBuscado)
    );
    
    if (existente) {
      return existente;
    }

    const nuevoPaciente: Paciente = {
      ...data,
      id: `pac-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      fechaRegistro: new Date().toISOString()
    };
    db.pacientes.push(nuevoPaciente);
    await writeDB(db);
    return nuevoPaciente;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (createPaciente):", error);
    throw error;
  }
}

export async function updatePaciente(id: string, data: Partial<Paciente>): Promise<Paciente> {
  try {
    const db = await readDB();
    const index = db.pacientes.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Paciente con ID ${id} no encontrado`);
    }
    const actualizado = { ...db.pacientes[index], ...data };
    db.pacientes[index] = actualizado;
    await writeDB(db);
    return actualizado;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (updatePaciente):", error);
    throw error;
  }
}

export async function deletePaciente(id: string): Promise<boolean> {
  try {
    const db = await readDB();
    const index = db.pacientes.findIndex(p => p.id === id);
    if (index === -1) return false;
    db.pacientes.splice(index, 1);
    db.citas = db.citas.filter(c => c.pacienteId !== id);
    await writeDB(db);
    return true;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (deletePaciente):", error);
    return false;
  }
}

// --- CITAS CRUD ---

export async function getCitas(): Promise<(Cita & { paciente?: Paciente })[]> {
  try {
    const db = await readDB();
    return db.citas.map(cita => ({
      ...cita,
      paciente: db.pacientes.find(p => p.id === cita.pacienteId)
    }));
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getCitas):", error);
    return [];
  }
}

export async function getCitaById(id: string): Promise<Cita | undefined> {
  try {
    const db = await readDB();
    return db.citas.find(c => c.id === id);
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getCitaById):", error);
    return undefined;
  }
}

export async function createCita(data: Omit<Cita, 'id'>): Promise<Cita> {
  try {
    const db = await readDB();
    const nuevaCita: Cita = {
      ...data,
      id: `cit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    db.citas.push(nuevaCita);
    await writeDB(db);
    return nuevaCita;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (createCita):", error);
    throw error;
  }
}

export async function updateCita(id: string, data: Partial<Cita>): Promise<Cita> {
  try {
    const db = await readDB();
    const index = db.citas.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Cita con ID ${id} no encontrada`);
    }
    const actualizada = { ...db.citas[index], ...data };
    db.citas[index] = actualizada;
    await writeDB(db);
    return actualizada;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (updateCita):", error);
    throw error;
  }
}

export async function deleteCita(id: string): Promise<boolean> {
  try {
    const db = await readDB();
    const index = db.citas.findIndex(c => c.id === id);
    if (index === -1) return false;
    db.citas.splice(index, 1);
    await writeDB(db);
    return true;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (deleteCita):", error);
    return false;
  }
}

// --- DISPONIBILIDAD ---

export async function getDisponibilidad(): Promise<Disponibilidad[]> {
  try {
    const db = await readDB();
    return db.disponibilidad;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getDisponibilidad):", error);
    return [];
  }
}

export async function updateDisponibilidad(id: string, data: Partial<Disponibilidad>): Promise<Disponibilidad> {
  try {
    const db = await readDB();
    const index = db.disponibilidad.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error(`Disponibilidad con ID ${id} no encontrada`);
    }
    const actualizada = { ...db.disponibilidad[index], ...data };
    db.disponibilidad[index] = actualizada;
    await writeDB(db);
    return actualizada;
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (updateDisponibilidad):", error);
    throw error;
  }
}

// --- DIAS NO LABORABLES ---

export async function getDiasNoLaborables(): Promise<string[]> {
  try {
    const db = await readDB();
    return db.diasNoLaborables || db.fechasBloqueadas || [];
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (getDiasNoLaborables):", error);
    return [];
  }
}

export async function addDiaNoLaborable(fecha: string): Promise<void> {
  try {
    const db = await readDB();
    if (!db.diasNoLaborables) {
      db.diasNoLaborables = [];
    }
    if (!db.fechasBloqueadas) {
      db.fechasBloqueadas = [];
    }
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) {
      throw new Error('Formato de fecha inválido. Utilice YYYY-MM-DD.');
    }
    let changed = false;
    if (!db.diasNoLaborables.includes(fecha)) {
      db.diasNoLaborables.push(fecha);
      db.diasNoLaborables.sort();
      changed = true;
    }
    if (!db.fechasBloqueadas.includes(fecha)) {
      db.fechasBloqueadas.push(fecha);
      db.fechasBloqueadas.sort();
      changed = true;
    }
    if (changed) {
      await writeDB(db);
    }
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (addDiaNoLaborable):", error);
    throw error;
  }
}

export async function removeDiaNoLaborable(fecha: string): Promise<void> {
  try {
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
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (removeDiaNoLaborable):", error);
    throw error;
  }
}

export async function setDiasNoLaborables(fechas: string[]): Promise<void> {
  try {
    const db = await readDB();
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    const fechasValidas = fechas
      .map(f => f.trim())
      .filter(f => regex.test(f));
    
    db.diasNoLaborables = [...new Set(fechasValidas)].sort();
    db.fechasBloqueadas = [...db.diasNoLaborables];
    
    await writeDB(db);
  } catch (error) {
    console.error("ERROR CRÍTICO EN REDIS (setDiasNoLaborables):", error);
    throw error;
  }
}
