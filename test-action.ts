import { actualizarDiasNoLaborablesLoteAccion } from './src/app/actions';
import * as db from './src/lib/db/client';

async function run() {
  console.log('Before:', db.getDiasNoLaborables());
  const res = await actualizarDiasNoLaborablesLoteAccion(['2026-06-17', '2026-06-18']);
  console.log('Result:', res);
  console.log('After:', db.getDiasNoLaborables());
}

run().catch(console.error);
