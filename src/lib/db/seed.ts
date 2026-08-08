import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

// Helper to load env variables from .env.local or .env
function loadEnv() {
  const files = ['.env.local', '.env'];
  for (const file of files) {
    const envPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

async function main() {
  loadEnv();
  
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !restToken) {
    console.error('❌ Error: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not found in environment variables or .env.local/.env files.');
    process.exit(1);
  }
  
  console.log(`🔌 Connecting to Upstash Redis REST API...`);
  const redis = new Redis({ url: restUrl, token: restToken });
  
  const dbPath = path.resolve(process.cwd(), 'src/lib/db/db.json');
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Error: Local database file not found at: ${dbPath}`);
    process.exit(1);
  }
  
  console.log('📖 Reading local db.json...');
  const dbDataRaw = fs.readFileSync(dbPath, 'utf-8');
  const db = JSON.parse(dbDataRaw);
  
  const pacientes = db.pacientes || [];
  const citas = db.citas || [];
  const disponibilidad = db.disponibilidad || [];
  const diasNoLaborables = db.diasNoLaborables || [];
  const fechasBloqueadas = db.fechasBloqueadas || [];
  
  console.log(`\n📊 Data Stats to Migrate:`);
  console.log(`- Patients (pacientes): ${pacientes.length}`);
  console.log(`- Appointments (citas): ${citas.length}`);
  console.log(`- Availability items (disponibilidad): ${disponibilidad.length}`);
  console.log(`- Non-working days (diasNoLaborables): ${diasNoLaborables.length}`);
  console.log(`- Blocked dates (fechasBloqueadas): ${fechasBloqueadas.length}`);
  
  // --- MIGRATION STEPS ---
  console.log('\n🧹 Clearing old Redis lists & sets...');
  await redis.del(
    'synapsa:pacientes:ids',
    'synapsa:citas:ids',
    'synapsa:disponibilidad',
    'synapsa:diasNoLaborables',
    'synapsa:fechasBloqueadas'
  );
  
  console.log('\n👥 --- Migrating Patients (Granular) ---');
  const pipeline = redis.pipeline();
  for (const paciente of pacientes) {
    console.log(`   [Patient] ID: ${paciente.id} | Name: ${paciente.nombreCompleto}`);
    pipeline.set(`synapsa:paciente:${paciente.id}`, JSON.stringify(paciente));
    pipeline.sadd('synapsa:pacientes:ids', paciente.id);
  }
  
  console.log('\n📅 --- Migrating Appointments (Granular) ---');
  for (const cita of citas) {
    console.log(`   [Appointment] ID: ${cita.id} | Date: ${cita.fecha} | Patient ID: ${cita.pacienteId}`);
    pipeline.set(`synapsa:cita:${cita.id}`, JSON.stringify(cita));
    pipeline.sadd('synapsa:citas:ids', cita.id);
    pipeline.sadd(`synapsa:citas:fecha:${cita.fecha}`, cita.id);
  }
  
  console.log('\n⚙️ --- Migrating Availability & Date Blocks ---');
  pipeline.set('synapsa:disponibilidad', JSON.stringify(disponibilidad));
  if (diasNoLaborables.length > 0) {
    for (const d of diasNoLaborables) pipeline.sadd('synapsa:diasNoLaborables', d);
  }
  if (fechasBloqueadas.length > 0) {
    for (const f of fechasBloqueadas) pipeline.sadd('synapsa:fechasBloqueadas', f);
  }
  
  console.log('\n💾 Executing pipeline write...');
  await pipeline.exec();
  
  console.log('\n🔍 Verifying write...');
  const [pCount, cCount, dCount, nlCount, fbCount] = await Promise.all([
    redis.smembers('synapsa:pacientes:ids').then(res => res.length),
    redis.smembers('synapsa:citas:ids').then(res => res.length),
    redis.get<any[]>('synapsa:disponibilidad').then(res => (res || []).length),
    redis.smembers('synapsa:diasNoLaborables').then(res => res.length),
    redis.smembers('synapsa:fechasBloqueadas').then(res => res.length)
  ]);
  
  console.log(`\n✅ Verification:`);
  console.log(`- Patients in Redis: ${pCount} / Expected: ${pacientes.length}`);
  console.log(`- Appointments in Redis: ${cCount} / Expected: ${citas.length}`);
  console.log(`- Availability in Redis: ${dCount} / Expected: ${disponibilidad.length}`);
  console.log(`- Non-working days in Redis: ${nlCount} / Expected: ${diasNoLaborables.length}`);
  console.log(`- Blocked dates in Redis: ${fbCount} / Expected: ${fechasBloqueadas.length}`);
  
  if (pCount === pacientes.length && cCount === citas.length) {
    console.log('\n🎉 Database successfully migrated to granular Redis!');
  } else {
    console.warn('\n⚠️ Warning: Mismatch between local data and Redis cloud data!');
  }
  
}

main().catch(err => {
  console.error('❌ Error during seed execution:', err);
  process.exit(1);
});
