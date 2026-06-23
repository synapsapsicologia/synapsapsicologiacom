import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

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
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ Error: REDIS_URL not found in environment variables or .env.local/.env files.');
    process.exit(1);
  }
  
  // Safe mask for logging
  const maskedUrl = redisUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`🔌 Connecting to Redis using URL: ${maskedUrl}`);
  
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
  });
  
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
  
  console.log('\n👥 --- Migrating Patients ---');
  for (const paciente of pacientes) {
    console.log(`   [Patient] ID: ${paciente.id} | Name: ${paciente.nombreCompleto} | Phone: ${paciente.telefono || 'N/A'}`);
  }
  
  console.log('\n📅 --- Migrating Appointments ---');
  for (const cita of citas) {
    console.log(`   [Appointment] ID: ${cita.id} | Date: ${cita.fecha} | Time: ${cita.horaInicio}-${cita.horaFin} | Patient ID: ${cita.pacienteId}`);
  }
  
  console.log('\n💾 Writing keys to cloud Redis...');
  await Promise.all([
    redis.set('synapsa:pacientes', JSON.stringify(pacientes)),
    redis.set('synapsa:citas', JSON.stringify(citas)),
    redis.set('synapsa:disponibilidad', JSON.stringify(disponibilidad)),
    redis.set('synapsa:diasNoLaborables', JSON.stringify(diasNoLaborables)),
    redis.set('synapsa:fechasBloqueadas', JSON.stringify(fechasBloqueadas))
  ]);
  
  console.log('\n🔍 Verifying write...');
  const [pCount, cCount, dCount, nlCount, fbCount] = await Promise.all([
    redis.get('synapsa:pacientes').then(res => JSON.parse(res || '[]').length),
    redis.get('synapsa:citas').then(res => JSON.parse(res || '[]').length),
    redis.get('synapsa:disponibilidad').then(res => JSON.parse(res || '[]').length),
    redis.get('synapsa:diasNoLaborables').then(res => JSON.parse(res || '[]').length),
    redis.get('synapsa:fechasBloqueadas').then(res => JSON.parse(res || '[]').length)
  ]);
  
  console.log(`\n✅ Verification:`);
  console.log(`- Patients in Redis: ${pCount} / Expected: ${pacientes.length}`);
  console.log(`- Appointments in Redis: ${cCount} / Expected: ${citas.length}`);
  console.log(`- Availability in Redis: ${dCount} / Expected: ${disponibilidad.length}`);
  console.log(`- Non-working days in Redis: ${nlCount} / Expected: ${diasNoLaborables.length}`);
  console.log(`- Blocked dates in Redis: ${fbCount} / Expected: ${fechasBloqueadas.length}`);
  
  if (pCount === pacientes.length && cCount === citas.length) {
    console.log('\n🎉 Database successfully migrated to Redis cloud!');
  } else {
    console.warn('\n⚠️ Warning: Mismatch between local data and Redis cloud data!');
  }
  
  redis.disconnect();
}

main().catch(err => {
  console.error('❌ Error during seed execution:', err);
  process.exit(1);
});
