import { supabase } from '../supabaseClient';

export const BUCKET_DEFAULTS = [
  { id: 'op_tma', nome: 'Operação TMA', operacao: 'TMA', status: 'ATIVO', parent_id: null, ordem: 1 },
  { id: 'bases_norte', nome: 'Bases Norte', operacao: 'TMA', status: 'ATIVO', parent_id: 'op_tma', ordem: 1 },
  { id: 'cajati', nome: 'Cajati', operacao: 'TMA', regiao: 'Bases Norte', status: 'ATIVO', parent_id: 'bases_norte', ordem: 1 },
  { id: 'fagundes_filho', nome: 'Fagundes Filho', operacao: 'TMA', regiao: 'Bases Norte', status: 'ATIVO', parent_id: 'bases_norte', ordem: 2 },
  { id: 'vila_medeiros', nome: 'Vila Medeiros', operacao: 'TMA', regiao: 'Bases Norte', status: 'ATIVO', parent_id: 'bases_norte', ordem: 3 },
  { id: 'bases_leste', nome: 'Bases Leste', operacao: 'TMA', status: 'ATIVO', parent_id: 'op_tma', ordem: 2 },
  { id: 'monte_santo', nome: 'Monte Santo', operacao: 'TMA', regiao: 'Bases Leste', status: 'ATIVO', parent_id: 'bases_leste', ordem: 1 },
  { id: 'aricanduva', nome: 'Aricanduva', operacao: 'TMA', regiao: 'Bases Leste', status: 'ATIVO', parent_id: 'bases_leste', ordem: 2 },
  { id: 'catumbi', nome: 'Catumbi', operacao: 'TMA', regiao: 'Bases Leste', status: 'ATIVO', parent_id: 'bases_leste', ordem: 3 },
  { id: 'santo_andre', nome: 'Santo André', operacao: 'TMA', regiao: 'Bases Leste', status: 'ATIVO', parent_id: 'bases_leste', ordem: 4 },
  { id: 'op_soc', nome: 'Operação SOC', operacao: 'SOC', status: 'ATIVO', parent_id: null, ordem: 2 },
  { id: 'soc_leste', nome: 'SOC Leste', operacao: 'SOC', status: 'ATIVO', parent_id: 'op_soc', ordem: 1 },
  { id: 'base_soc_leste_1', nome: 'Base SOC Leste 1', operacao: 'SOC', regiao: 'SOC Leste', status: 'ATIVO', parent_id: 'soc_leste', ordem: 1 },
  { id: 'base_soc_leste_2', nome: 'Base SOC Leste 2', operacao: 'SOC', regiao: 'SOC Leste', status: 'ATIVO', parent_id: 'soc_leste', ordem: 2 },
  { id: 'op_sot', nome: 'Operação SOT', operacao: 'SOT', status: 'ATIVO', parent_id: null, ordem: 3 },
  { id: 'sot_sul', nome: 'SOT Sul', operacao: 'SOT', status: 'ATIVO', parent_id: 'op_sot', ordem: 1 },
  { id: 'sot_sul_1', nome: 'SOT Sul 1', operacao: 'SOT', regiao: 'SOT Sul', status: 'ATIVO', parent_id: 'sot_sul', ordem: 1 },
  { id: 'sot_leste', nome: 'SOT Leste', operacao: 'SOT', status: 'ATIVO', parent_id: 'op_sot', ordem: 2 },
  { id: 'sot_leste_1', nome: 'SOT Leste 1', operacao: 'SOT', regiao: 'SOT Leste', status: 'ATIVO', parent_id: 'sot_leste', ordem: 1 },
  { id: 'sot_norte', nome: 'SOT Norte', operacao: 'SOT', status: 'ATIVO', parent_id: 'op_sot', ordem: 3 },
  { id: 'sot_norte_1', nome: 'SOT Norte 1', operacao: 'SOT', regiao: 'SOT Norte', status: 'ATIVO', parent_id: 'sot_norte', ordem: 1 }
];

export async function getBucketsFromStorage() {
  try {
    const { data, error } = await supabase.from('wfm_buckets').select('*').order('ordem', { ascending: true });
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.warn('[bucketService] Tabela wfm_buckets nao disponivel, usando localStorage fallback:', e);
  }

  try {
    const cached = localStorage.getItem('fleet_wfm_buckets_custom');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return BUCKET_DEFAULTS;
}

export async function saveBucketToStorage(bucketObj, userLogin) {
  const payload = {
    ...bucketObj,
    updated_at: new Date().toISOString(),
    updated_by: userLogin || 'Operador'
  };

  try {
    await supabase.from('wfm_buckets').upsert(payload);
  } catch (e) {}

  try {
    const current = await getBucketsFromStorage();
    const idx = current.findIndex(b => b.nome === bucketObj.nome || b.id === bucketObj.id);
    let updated;
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...payload };
    } else {
      updated = [...current, payload];
    }
    localStorage.setItem('fleet_wfm_buckets_custom', JSON.stringify(updated));
  } catch (e) {}
}

export async function logBucketAction(bucketNome, acao, detalhes, userLogin) {
  const logObj = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    bucket_nome: bucketNome,
    acao,
    detalhes,
    usuario: userLogin || 'Operador',
    created_at: new Date().toISOString()
  };

  try {
    await supabase.from('wfm_buckets_audit_log').insert(logObj);
  } catch (e) {}

  try {
    const cachedLogs = JSON.parse(localStorage.getItem('fleet_wfm_bucket_history_logs') || '[]');
    const newLogs = [logObj, ...cachedLogs];
    localStorage.setItem('fleet_wfm_bucket_history_logs', JSON.stringify(newLogs));
  } catch (e) {}

  return logObj;
}
