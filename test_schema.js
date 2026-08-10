import { supabase } from './src/supabaseClient.js';

async function checkSchema() {
  const { data, error } = await supabase
    .from('autofiscalizacao_shifts')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching:', error);
  } else {
    if (data.length > 0) {
      console.log('Columns in autofiscalizacao_shifts:', Object.keys(data[0]));
    } else {
      console.log('No rows found, cannot infer schema this way.');
    }
  }
  process.exit();
}

checkSchema();
