const dpu = require('./DPU.js');
const fc = require('./FC.js');

async function runScripts() {
  console.log('Starting DPU script...');
  await dpu.postImagesToInstagramDPU_Supabase();

  console.log('Starting FC script...');
  await fc.postImagesToInstagramFC_Supabase();

  console.log('All scripts completed.');
}

// Run the scripts
runScripts().catch(console.error);
