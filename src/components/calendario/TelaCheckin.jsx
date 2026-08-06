import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, ArrowRight, User, Users, Hash, CalendarCheck, ShieldCheck, AlertTriangle, Fingerprint, Wifi, MapPin, Shield } from 'lucide-react';
import { supabase } from '../../supabaseClient';

// ============================================================
// FINGERPRINT: Gera hash SHA-256 único do dispositivo
// ============================================================
async function generateFingerprint() {
  const components = [];

  // Screen
  components.push(`scr:${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(`avail:${screen.availWidth}x${screen.availHeight}`);

  // Navigator
  components.push(`lang:${navigator.language}`);
  components.push(`plat:${navigator.platform}`);
  components.push(`cores:${navigator.hardwareConcurrency || 'n/a'}`);
  components.push(`mem:${navigator.deviceMemory || 'n/a'}`);
  components.push(`touch:${navigator.maxTouchPoints || 0}`);
  components.push(`ua:${navigator.userAgent}`);

  // Timezone
  try {
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  } catch { components.push('tz:unknown'); }

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('Auditoria Fleet 2026', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('Check-in Operacional', 4, 35);
    components.push(`canvas:${canvas.toDataURL()}`);
  } catch { components.push('canvas:error'); }

  // WebGL renderer
  try {
    const glCanvas = document.createElement('canvas');
    const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(`gpu:${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`);
      }
    }
  } catch { components.push('gpu:error'); }

  // Generate SHA-256 hash
  const raw = components.join('|||');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// IP: Coleta IP público via API gratuita
// ============================================================
async function fetchPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

// ============================================================
// GEOLOCATION: Solicita posição GPS
// ============================================================
function requestGeolocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lng: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export default function TelaCheckin({ atividadeId }) {
  const [atividade, setAtividade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    equipe: '',
    matricula: '',
    cpf: ''
  });

  const handleCpfChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    }
    
    setFormData({ ...formData, cpf: value });
  };

  // Audit data (collected silently)
  const [auditData, setAuditData] = useState({
    fingerprint_hash: null,
    ip_address: null,
    user_agent: navigator.userAgent,
    geo_lat: null,
    geo_lng: null,
    session_uuid: crypto.randomUUID(),
    collectingStatus: 'collecting' // 'collecting' | 'ready' | 'error'
  });

  // Collect audit data on mount
  useEffect(() => {
    const collectAuditData = async () => {
      try {
        const [fingerprint, ip, geo] = await Promise.all([
          generateFingerprint(),
          fetchPublicIP(),
          requestGeolocation()
        ]);
        setAuditData(prev => ({
          ...prev,
          fingerprint_hash: fingerprint,
          ip_address: ip,
          geo_lat: geo.lat,
          geo_lng: geo.lng,
          collectingStatus: 'ready'
        }));
      } catch (err) {
        console.error('Audit collection error:', err);
        setAuditData(prev => ({ ...prev, collectingStatus: 'error' }));
      }
    };
    collectAuditData();
  }, []);

  useEffect(() => {
    const fetchAtividade = async () => {
      if (!atividadeId) return;
      const { data, error } = await supabase
        .from('calendario_atividades')
        .select('assunto, tipo, status')
        .eq('id', atividadeId)
        .single();
      
      if (!error && data) {
        setAtividade(data);
      }
      setLoading(false);
    };
    fetchAtividade();
  }, [atividadeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.equipe || !formData.matricula || !formData.cpf) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }
    
    const equipeRegex = /^[A-Za-z]{3}\d{3}$/;
    if (!equipeRegex.test(formData.equipe)) {
        setErrorMsg('O código da equipe deve conter exatamente 3 letras seguidas de 3 números (ex: ENL100).');
        return;
    }

    const matriculaRegex = /^BR0\d{9}$/i;
    if (!matriculaRegex.test(formData.matricula)) {
        setErrorMsg('A matrícula deve iniciar com BR0 seguido dos 9 primeiros dígitos do seu CPF.');
        return;
    }
    
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(formData.cpf)) {
        setErrorMsg('Por favor, preencha o CPF no formato correto (123.456.789-00).');
        return;
    }
    
    setSubmitting(true);
    setErrorMsg('');
    setWarningMsg('');

    const matriculaUpper = formData.matricula.toUpperCase();
    const equipeUpper = formData.equipe.toUpperCase();
    
    // ---- DUPLICATA CHECK 1: Matrícula ou CPF já registrados ----
    const { data: existingRecords } = await supabase
      .from('calendario_presencas')
      .select('matricula_br0, cpf')
      .eq('atividade_id', atividadeId)
      .or(`matricula_br0.eq.${matriculaUpper},cpf.eq.${formData.cpf}`);

    if (existingRecords && existingRecords.length > 0) {
      setSubmitting(false);
      const isMatricula = existingRecords.some(r => r.matricula_br0 === matriculaUpper);
      if (isMatricula) {
        setErrorMsg(`A matrícula ${matriculaUpper} já foi registrada para este evento.`);
      } else {
        setErrorMsg(`O CPF ${formData.cpf} já foi registrado para este evento.`);
      }
      return;
    }

    // ---- DUPLICATA CHECK 2: Fingerprint já visto (mesmo dispositivo) ----
    let flagSuspeita = false;
    let nomeAnterior = null;

    if (auditData.fingerprint_hash) {
      const { data: existingByFingerprint } = await supabase
        .from('calendario_presencas')
        .select('id, nome_completo')
        .eq('atividade_id', atividadeId)
        .eq('fingerprint_hash', auditData.fingerprint_hash)
        .limit(1);

      if (existingByFingerprint && existingByFingerprint.length > 0) {
        flagSuspeita = true;
        nomeAnterior = existingByFingerprint[0].nome_completo;
        setWarningMsg(`Este aparelho já foi utilizado para registrar a presença de ${nomeAnterior}. O registro será sinalizado para auditoria.`);
      }
    }
    
    // ---- INSERT with all audit data ----
    const { error } = await supabase
      .from('calendario_presencas')
      .insert([{
        atividade_id: atividadeId,
        nome_completo: formData.nome.toUpperCase(),
        codigo_equipe: equipeUpper,
        matricula_br0: matriculaUpper,
        cpf: formData.cpf,
        // Audit fields
        fingerprint_hash: auditData.fingerprint_hash,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
        geo_lat: auditData.geo_lat,
        geo_lng: auditData.geo_lng,
        session_uuid: auditData.session_uuid,
        flag_duplicata: false,
        flag_suspeita_fingerprint: flagSuspeita,
        fingerprint_nome_anterior: nomeAnterior
      }]);
      
    setSubmitting(false);
    
    if (error) {
      setErrorMsg('Ocorreu um erro ao registrar presença. Tente novamente.');
      console.error(error);
    } else {
      setSuccess(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (atividade && atividade.status === 'EXECUTADO') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-3xl shadow-xl max-w-sm border border-slate-200 animate-in fade-in zoom-in duration-300">
           <AlertTriangle size={64} className="text-rose-500 mx-auto mb-4" />
           <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Evento Encerrado</h2>
           <p className="text-slate-500 font-medium">Não é mais possível registrar presença pois esta atividade já foi finalizada.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`min-h-screen ${warningMsg ? 'bg-amber-500' : 'bg-emerald-500'} text-white flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500`}>
        <div className={`${warningMsg ? 'bg-white/20' : 'bg-white/20'} p-6 rounded-full mb-6 shadow-inner`}>
          <ShieldCheck size={80} className="text-white" />
        </div>
        <h1 className="text-4xl font-black mb-2 text-center drop-shadow-sm tracking-tight">Presença Confirmada!</h1>
        <p className={`${warningMsg ? 'text-amber-100' : 'text-emerald-100'} text-center font-medium text-lg`}>Sua participação foi registrada com sucesso.</p>
        
        {warningMsg && (
          <div className="mt-4 bg-amber-600/50 rounded-2xl p-4 w-full max-w-sm border border-amber-400/30 text-center">
            <p className="text-amber-100 text-sm font-bold flex items-center justify-center gap-2">
              <AlertTriangle size={16} /> {warningMsg}
            </p>
          </div>
        )}

        <div className={`mt-8 ${warningMsg ? 'bg-amber-600/50 border-amber-400/30' : 'bg-emerald-600/50 border-emerald-400/30'} rounded-3xl p-6 w-full max-w-sm border backdrop-blur-sm`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${warningMsg ? 'text-amber-200' : 'text-emerald-200'} mb-1`}>Dados Registrados</p>
          <p className="font-bold text-white text-lg truncate uppercase">{formData.nome}</p>
          <p className={`font-medium ${warningMsg ? 'text-amber-100' : 'text-emerald-100'} text-sm mt-1`}>{formData.matricula} • {formData.equipe}</p>
        </div>

        {/* Audit confirmation badge */}
        <div className="mt-6 flex items-center gap-2 text-white/70 text-[10px] font-bold uppercase tracking-widest">
          <Shield size={12} />
          <span>Sessão {auditData.session_uuid.substring(0, 8)}... • {auditData.ip_address || 'IP não coletado'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 sm:justify-center">
      
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 fade-in duration-500">
        
        {/* HEADER */}
        <div className="bg-blue-950 px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-900 rounded-full blur-2xl opacity-50"></div>
          <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-indigo-600 rounded-full blur-2xl opacity-30"></div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-inner">
              <CalendarCheck size={24} className="text-blue-300" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 mb-2">Check-in Operacional</h2>
            <h1 className="text-2xl font-black tracking-tight leading-tight mb-2">
              {atividade ? atividade.assunto : 'Evento não encontrado'}
            </h1>
            {atividade && (
              <span className="inline-block px-3 py-1 bg-white/10 text-blue-100 rounded-lg text-xs font-bold border border-white/10">
                {atividade.tipo}
              </span>
            )}
          </div>
        </div>

        {/* AUDIT STATUS BAR */}
        <div className="bg-slate-50 px-8 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${
              auditData.collectingStatus === 'ready' ? 'text-emerald-600' : 
              auditData.collectingStatus === 'collecting' ? 'text-amber-600' : 'text-slate-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                auditData.collectingStatus === 'ready' ? 'bg-emerald-500' : 
                auditData.collectingStatus === 'collecting' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
              }`}></div>
              {auditData.collectingStatus === 'ready' ? 'Sessão segura' : 
               auditData.collectingStatus === 'collecting' ? 'Preparando...' : 'Sessão padrão'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {auditData.geo_lat && <MapPin size={11} className="text-emerald-500" />}
            {auditData.ip_address && <Wifi size={11} className="text-blue-500" />}
            {auditData.fingerprint_hash && <Fingerprint size={11} className="text-violet-500" />}
          </div>
        </div>

        {/* FORM */}
        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in shake duration-300">
              <AlertTriangle size={18} /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  required
                  placeholder="Digite seu nome..."
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Código da Equipe</label>
              <div className="relative group">
                <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  required
                  placeholder="Ex: ENL100"
                  value={formData.equipe}
                  onChange={e => setFormData({...formData, equipe: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 uppercase"
                />
              </div>
              <p className="text-[10px] text-slate-500 ml-1">Padrão: 3 letras e 3 números (ex: ENL100, EQL200)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">CPF</label>
              <div className="relative group">
                <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  required
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleCpfChange}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Matrícula (BR0...)</label>
              <div className="relative group">
                <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  required
                  placeholder="BR0 + 9 primeiros dígitos do CPF"
                  value={formData.matricula}
                  onChange={e => setFormData({...formData, matricula: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 uppercase"
                />
              </div>
              <p className="text-[10px] text-slate-500 ml-1">Padrão: BR0 seguido dos 9 primeiros dígitos do seu CPF.<br/>Exemplo: Se o seu CPF for <b>144.636.617</b>-06, a matrícula é <b>BR0144636617</b></p>
            </div>

            <button 
              type="submit" 
              disabled={submitting || !atividade}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 group"
            >
              {submitting ? 'Verificando e registrando...' : 'Registrar Presença'}
              {!submitting && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
            
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema de Operação de Frota • Sessão Auditável</p>
        </div>

      </div>

    </div>
  );
}
