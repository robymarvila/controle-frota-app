import React, { useState, useEffect } from 'react';
import { X, Edit3, Save, MapPin, Clock, ShieldCheck, UserCheck, AlertCircle, Building2, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const BASES_LIST = [
  'Fagundes Filho', 'Cajati', 'Vila Medeiros',
  'Monte Santo', 'Aricanduva', 'Catumbi', 'Santo André',
  'Base SOC Leste 1', 'Base SOC Leste 2',
  'SOT Sul 1', 'SOT Leste 1', 'SOT Norte 1'
];

export default function ModalEditarOS({ os, auditors = [], onClose, onSaveSuccess }) {
  if (!os) return null;

  const isWfmTask = !!os.payload_dados;
  const rawData = isWfmTask ? os.payload_dados : os;

  const [nrOrdem, setNrOrdem] = useState(rawData.osid || rawData.nr_ordem || os.os_numero || os.id_origem || '');
  const [equipe, setEquipe] = useState(rawData.equipe || '');
  const [base, setBase] = useState(rawData.base_contrato || rawData.base || 'Fagundes Filho');
  const [atuacao, setAtuacao] = useState(rawData.atuacao || 'TMA');
  const [periodo, setPeriodo] = useState(rawData.periodo || 'Manhã');
  const [tipoVeiculo, setTipoVeiculo] = useState(rawData.tipo_veiculo || 'Cesto Aéreo');
  const [tipoEquipe, setTipoEquipe] = useState(rawData.tipo_equipe || 'TMA');
  const [classe, setClasse] = useState(rawData.classe || '');
  const [causa, setCausa] = useState(rawData.descricao_causa || rawData.causa || '');
  const [minutos, setMinutos] = useState(rawData.minutos || 60);

  // Address fields
  const [cep, setCep] = useState(rawData.cep || '');
  const [rua, setRua] = useState(rawData.rua || '');
  const [bairro, setBairro] = useState(rawData.bairro || '');
  const [cidade, setCidade] = useState(rawData.cidade || 'São Paulo');
  const [estado, setEstado] = useState(rawData.estado || 'SP');
  const [numero, setNumero] = useState(rawData.numero || '');
  const [complemento, setComplemento] = useState(rawData.complemento || '');

  // Stage Timestamps
  const [despachada, setDespachada] = useState(rawData.despachada || '');
  const [aCaminho, setACaminho] = useState(rawData.a_caminho || '');
  const [noLocal, setNoLocal] = useState(rawData.no_local || '');
  const [liberada, setLiberada] = useState(rawData.liberada || '');

  // Auditor Assignment
  const [selectedAuditor, setSelectedAuditor] = useState(os.auditor || rawData.auditor || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Filter auditors strictly by Auditor or Inspetor
  const filteredAuditors = (auditors || []).filter(a => {
    const cargo = String(a.cargo || a.perfil || '').toLowerCase();
    return cargo.includes('auditor') || cargo.includes('inspetor');
  });

  const handleCepSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return alert('Digite um CEP válido com 8 dígitos.');
    setIsGeocoding(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await resp.json();
      if (data.erro) {
        alert('CEP não encontrado.');
      } else {
        setRua(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
      }
    } catch (e) {
      alert('Erro ao buscar CEP.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nrOrdem || !equipe) return alert('Número da OS e Equipe são obrigatórios.');

    setIsSaving(true);
    try {
      // 1. Geocode address with complement sanitization
      let lat = rawData.latitude || os.latitude || null;
      let lng = rawData.longitude || os.longitude || null;

      const rawSearch = `${rua || ''} ${numero || ''}, ${bairro || ''}, ${cidade || ''} - ${estado || ''}, ${cep || ''}`;
      const cleanSearch = rawSearch.replace(/Apt\/Comp:\s*[^-\n,]+/gi, '').replace(/\s+/g, ' ').trim();

      if (cleanSearch.length > 5) {
        try {
          const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanSearch + ', Brazil')}`;
          const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'FleetOperacaoApp/1.0' } });
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (Array.isArray(geoData) && geoData.length > 0) {
              lat = parseFloat(geoData[0].lat);
              lng = parseFloat(geoData[0].lon);
            }
          }
        } catch (err) {
          console.warn('[ModalEditarOS] Geocoding warning:', err);
        }
      }

      const endComp = `${rua}, ${numero}${complemento ? ' Apt/Comp: ' + complemento : ''} - ${bairro} - ${cidade}/${estado} - CEP: ${cep}`;

      const updatedPayload = {
        ...(rawData || {}),
        osid: nrOrdem,
        equipe,
        base_contrato: base,
        atuacao,
        periodo,
        tipo_veiculo: tipoVeiculo,
        tipo_equipe: tipoEquipe,
        classe,
        causa,
        minutos: parseInt(minutos) || 60,
        cep,
        rua,
        bairro,
        cidade,
        estado,
        numero,
        complemento,
        endereco_completo: endComp,
        despachada,
        a_caminho: aCaminho,
        no_local: noLocal,
        liberada,
        latitude: lat,
        longitude: lng,
        lat,
        lng,
        auditor: selectedAuditor,
        titulo: `OS ${nrOrdem} - Fiscalização de OS`
      };

      // Update in Supabase
      if (os.id) {
        await supabase
          .from('wfm_tarefas')
          .update({
            // os_numero: nrOrdem,
            equipe,
            base_contrato: base,
            auditor: selectedAuditor || null,
            latitude: lat,
            longitude: lng,
            payload_dados: updatedPayload,
            updated_at: new Date().toISOString()
          })
          .eq('id', os.id);

        try {
          await supabase
            .from('autofiscalizacao_workflows')
            .update({
              osid: nrOrdem,
              equipe,
              base: base,
              auditor: selectedAuditor || null,
              latitude: lat,
              longitude: lng,
              payload_dados: updatedPayload
            })
            .or(`osid.eq.${nrOrdem},inspid.eq.${os.id_origem || ''}`);
        } catch (err) {}
      }

      alert(`OS ${nrOrdem} atualizada com sucesso! Coordenadas gravadas: Lat ${lat || 'N/A'}, Lng ${lng || 'N/A'}`);
      if (onSaveSuccess) onSaveSuccess(updatedPayload);
      onClose();
      if (window.location) window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar edições da OS: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header Ultra Premium */}
        <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Edit3 size={20} className="text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-lg leading-none tracking-tight flex items-center gap-2">
                Editar Atendimento — OS: {nrOrdem}
              </h3>
              <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider mt-1">Formulário de Edição e Atualização de Coordenadas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/15 rounded-2xl text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {/* Section 1: Identificação & Equipe */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block flex items-center gap-1.5">
              <ShieldCheck size={14} /> Identificação e Equipe
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Número da OS *</label>
                <input type="text" required value={nrOrdem} onChange={e => setNrOrdem(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Equipe *</label>
                <input type="text" required value={equipe} onChange={e => setEquipe(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs" />
              </div>
            </div>
          </div>

          {/* Section 2: Dados Operacionais */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block flex items-center gap-1.5">
              <Building2 size={14} /> Dados Operacionais
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Base de Contrato</label>
                <select value={base} onChange={e => setBase(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-700 text-xs">
                  {BASES_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Atuação</label>
                <select value={atuacao} onChange={e => setAtuacao(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-700 text-xs">
                  <option>TMA</option>
                  <option>P2</option>
                  <option>Outros</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Período</label>
                <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-700 text-xs">
                  <option>Manhã</option>
                  <option>Tarde</option>
                  <option>Noite</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tipo de Veículo</label>
                <select value={tipoVeiculo} onChange={e => setTipoVeiculo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-700 text-xs">
                  <option>Cesto Aéreo</option>
                  <option>Leve</option>
                  <option>Moto</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tipo de Equipe</label>
                <select value={tipoEquipe} onChange={e => setTipoEquipe(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-700 text-xs">
                  <option>TMA</option>
                  <option>SOC</option>
                  <option>Linha Vida</option>
                  <option>Linha Morta</option>
                  <option>Outros</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Duração (Minutos)</label>
                <input type="number" value={minutos} onChange={e => setMinutos(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 text-xs" />
              </div>
            </div>
          </div>

          {/* Section 3: Endereço & Geocodificação */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block flex items-center gap-1.5">
              <MapPin size={14} /> Endereço & Geocodificação no Mapa
            </span>
            <div className="flex gap-2">
              <input type="text" value={cep} onChange={e => setCep(e.target.value)} placeholder="CEP (Ex: 03614000)" className="p-2.5 border border-slate-200 rounded-xl flex-1 text-xs font-bold bg-white" />
              <button type="button" onClick={handleCepSearch} disabled={isGeocoding} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors">
                <Search size={13} /> {isGeocoding ? 'Buscando...' : 'Buscar CEP'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <input type="text" value={rua} onChange={e => setRua(e.target.value)} placeholder="Rua / Logradouro" className="p-2.5 border border-slate-200 rounded-xl bg-white font-medium" />
              <input type="text" value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" className="p-2.5 border border-slate-200 rounded-xl bg-white font-medium" />
              <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" className="p-2.5 border border-slate-200 rounded-xl bg-white font-medium" />
              <input type="text" value={estado} onChange={e => setEstado(e.target.value)} placeholder="Estado (UF)" className="p-2.5 border border-slate-200 rounded-xl bg-white font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <input type="text" value={numero} onChange={e => setNumero(e.target.value)} placeholder="Número" className="p-2.5 border border-slate-200 rounded-xl bg-white font-bold" />
              <input type="text" value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Complemento / Apt / Casa" className="p-2.5 border border-slate-200 rounded-xl bg-white font-medium" />
            </div>
          </div>

          {/* Section 4: Alocação de Auditor */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block flex items-center gap-1.5">
              <UserCheck size={14} /> Alocação de Auditor
            </span>
            <select value={selectedAuditor} onChange={e => setSelectedAuditor(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-800 bg-white text-xs">
              <option value="">-- Sem Auditor Designado (Na Base de Origem) --</option>
              {filteredAuditors.map((a, idx) => (
                <option key={a.login || idx} value={a.login}>{a.nome || a.login} ({a.cargo || 'Auditor'})</option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0 border-t border-slate-200/60">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 transition-all">
              <Save size={15} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
