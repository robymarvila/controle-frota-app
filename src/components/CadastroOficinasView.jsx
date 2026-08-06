import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2, Search, Filter, Plus, Edit2, Trash2, ShieldAlert,
  CheckCircle2, AlertTriangle, XCircle, Phone, Mail, MapPin,
  FileText, Wrench, Shield, Check, X, RefreshCw, LayoutGrid, List,
  Sparkles, ExternalLink, Tag, UserCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import CustomFeedbackModal from './CustomFeedbackModal';

export const CATEGORIAS_SERVICOS_PADRAO = [
  { id: 'Mecânico', label: 'Mecânico', icon: '🔧' },
  { id: 'Hidráulico', label: 'Hidráulico', icon: '💧' },
  { id: 'Elétrico', label: 'Elétrico', icon: '⚡' },
  { id: 'Sinalização (Direcional e GiroLed)', label: 'Sinalização (Direcional e GiroLed)', icon: '🚨' },
  { id: 'Lataria/Carroceria', label: 'Lataria / Carroceria', icon: '🔨' },
  { id: 'Cabine', label: 'Cabine', icon: '🚚' },
  { id: 'Pneus', label: 'Pneus', icon: '🛞' },
  { id: 'Implemento', label: 'Implemento', icon: '🏗️' },
  { id: 'Câmeras', label: 'Câmeras', icon: '📷' }
];

export const LISTA_OFICINAS_LEGADO = [
  'HALVA REMOCOES E TRANSPORTE', 'OFICINA AUTOCAR', 'OFICINA APICE',
  'OFICINA BORRACHARIA VEMAG', 'OFICINA CHAMPION', 'OFICINA GENESIS AUTOVIDRO',
  'OFICINA PAULO NEVES', 'OFICINA NOVA JUCAR AUTO ESTUFA', 'OFICINA MOTORNORTE',
  'OFICINA SAMUEL AUTO CAR', 'OFICINA POPEYES', 'OFICINA VAMOS', 'FROTA MANUTENÇÃO',
  'OFICINA MB', 'DIBRACAM', 'AEROBRASIL MECANICA', 'DENIGRIS - MERCEDES', 'O CARRO AUTO CENTER'
];

const STORAGE_KEY_OFICINAS = 'fleet_oficinas_cadastradas_v1';

export default function CadastroOficinasView({ showNotification, onOficinasChange }) {
  const [oficinas, setOficinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('TODOS');
  const [selectedServicoFilter, setSelectedServicoFilter] = useState('TODOS');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'table'

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOficina, setEditingOficina] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);

  // Ultra-Premium Feedback / Confirmation Modal
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Entendido',
    cancelText: null,
    onConfirm: null,
    onCancel: null
  });

  const showConfirmModal = (title, message, onConfirm, type = 'warning', confirmText = 'Confirmar', cancelText = 'Cancelar') => {
    setFeedbackModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setFeedbackModal(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setFeedbackModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const notifyOficinasUpdated = async (updatedList) => {
    if (onOficinasChange) {
      onOficinasChange(updatedList);
    }
    try {
      const bChannel = supabase.channel('fleet-realtime-sync');
      await bChannel.send({
        type: 'broadcast',
        event: 'OFICINAS_UPDATED',
        payload: { timestamp: Date.now(), updatedList }
      });
    } catch (e) {
      console.warn('Erro ao disparar broadcast de oficinas:', e);
    }
  };

  // Form Fields State
  const [formData, setFormData] = useState({
    status: 'Ativo',
    tipo_documento: 'CNPJ',
    documento: '',
    razao_social: '',
    nome_fantasia: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    contato_nome: '',
    contato_telefone: '',
    contato_email: '',
    servicos_prestados: [],
    outros_servicos: ''
  });

  const [novoServicoCustom, setNovoServicoCustom] = useState('');

  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(true);

  // --------------------------------------------------------------------------
  // CARREGAR OFICINAS DO SUPABASE / LOCALSTORAGE COM AUTO-MIGRAÇÃO DE LEGADO
  // --------------------------------------------------------------------------
  const loadOficinas = async () => {
    setLoading(true);
    let tableExists = true;
    try {
      let dataOficinas = [];
      const { data, error } = await supabase
        .from('cadastro_oficinas')
        .select('*')
        .order('nome_fantasia', { ascending: true });

      if (error) {
        // Tabela não existe no Supabase (404 / 42P01)
        tableExists = false;
        setIsSupabaseAvailable(false);
      } else if (data && data.length > 0) {
        dataOficinas = data;
        setIsSupabaseAvailable(true);
      }

      if (!tableExists || dataOficinas.length === 0) {
        const cached = localStorage.getItem(STORAGE_KEY_OFICINAS);
        if (cached) {
          dataOficinas = JSON.parse(cached);
        }
      }

      // Auto-Migração / Retrocompatibilidade de Oficinas Legadas
      const existingNamesUpper = new Set(dataOficinas.map(o => String(o.nome_fantasia || '').trim().toUpperCase()));
      const legacyToMigrate = [];

      LISTA_OFICINAS_LEGADO.forEach((legacyName, idx) => {
        const nameUpper = legacyName.trim().toUpperCase();
        if (!existingNamesUpper.has(nameUpper)) {
          const preCadastro = {
            id: `LEGACY_${idx + 1}_${Date.now()}`,
            status: 'Pré-Cadastro',
            tipo_documento: 'CNPJ',
            documento: '',
            razao_social: legacyName,
            nome_fantasia: legacyName,
            cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '',
            contato_nome: '', contato_telefone: '', contato_email: '',
            servicos_prestados: ['Mecânico'],
            outros_servicos: '',
            is_pre_cadastro: true,
            criado_em: new Date().toISOString()
          };
          legacyToMigrate.push(preCadastro);
          existingNamesUpper.add(nameUpper);
        }
      });

      if (legacyToMigrate.length > 0) {
        dataOficinas = [...dataOficinas, ...legacyToMigrate];
        if (tableExists) {
          try {
            const payloadSupabase = legacyToMigrate.map(item => ({
              status: item.status,
              tipo_documento: item.tipo_documento,
              razao_social: item.razao_social,
              nome_fantasia: item.nome_fantasia,
              servicos_prestados: item.servicos_prestados,
              is_pre_cadastro: true
            }));
            await supabase.from('cadastro_oficinas').insert(payloadSupabase);
          } catch (e) {
            console.warn('Persistência Supabase das oficinas legadas ignorada:', e);
          }
        }
      }

      setOficinas(dataOficinas);
      localStorage.setItem(STORAGE_KEY_OFICINAS, JSON.stringify(dataOficinas));
    } catch (err) {
      console.warn('Erro ao carregar cadastro de oficinas, usando LocalStorage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOficinas();
  }, []);

  // --------------------------------------------------------------------------
  // BUSCA AUTOMÁTICA DE CEP VIA VIACEP
  // --------------------------------------------------------------------------
  const handleCepChange = async (cepRaw) => {
    const cleanCep = cepRaw.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep: cepRaw }));

    if (cleanCep.length === 8) {
      setSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf
          }));
          if (showNotification) showNotification('Endereço localizado com sucesso!');
        }
      } catch (e) {
        console.warn('Erro ao consultar ViaCEP:', e);
      } finally {
        setSearchingCep(false);
      }
    }
  };

  // --------------------------------------------------------------------------
  // ABRIR FORMULÁRIO DE CRIAÇÃO / EDIÇÃO
  // --------------------------------------------------------------------------
  const handleOpenForm = (oficina = null) => {
    if (oficina) {
      setEditingOficina(oficina);
      setFormData({
        status: oficina.status || 'Ativo',
        tipo_documento: oficina.tipo_documento || 'CNPJ',
        documento: oficina.documento || '',
        razao_social: oficina.razao_social || '',
        nome_fantasia: oficina.nome_fantasia || '',
        cep: oficina.cep || '',
        logradouro: oficina.logradouro || '',
        numero: oficina.numero || '',
        bairro: oficina.bairro || '',
        cidade: oficina.cidade || '',
        uf: oficina.uf || '',
        contato_nome: oficina.contato_nome || '',
        contato_telefone: oficina.contato_telefone || '',
        contato_email: oficina.contato_email || '',
        servicos_prestados: Array.isArray(oficina.servicos_prestados) ? oficina.servicos_prestados : [],
        outros_servicos: oficina.outros_servicos || ''
      });
    } else {
      setEditingOficina(null);
      setFormData({
        status: 'Ativo',
        tipo_documento: 'CNPJ',
        documento: '',
        razao_social: '',
        nome_fantasia: '',
        cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '',
        contato_nome: '', contato_telefone: '', contato_email: '',
        servicos_prestados: ['Mecânico'],
        outros_servicos: ''
      });
    }
    setNovoServicoCustom('');
    setIsFormOpen(true);
  };

  // --------------------------------------------------------------------------
  // TOGGLE CATEGORIA DE SERVIÇO
  // --------------------------------------------------------------------------
  const toggleServico = (servicoId) => {
    setFormData(prev => {
      const exists = prev.servicos_prestados.includes(servicoId);
      const updated = exists
        ? prev.servicos_prestados.filter(s => s !== servicoId)
        : [...prev.servicos_prestados, servicoId];
      return { ...prev, servicos_prestados: updated };
    });
  };

  const handleAddServicoCustom = () => {
    if (!novoServicoCustom.trim()) return;
    const item = novoServicoCustom.trim();
    if (!formData.servicos_prestados.includes(item)) {
      setFormData(prev => ({
        ...prev,
        servicos_prestados: [...prev.servicos_prestados, item]
      }));
    }
    setNovoServicoCustom('');
  };

  // --------------------------------------------------------------------------
  // SALVAR / ATUALIZAR OFICINA COM REGRAS CNPJ x CPF
  // --------------------------------------------------------------------------
  const handleSaveOficina = async () => {
    if (!formData.nome_fantasia.trim()) {
      alert('Por favor, informe o Nome ou Nome Fantasia da oficina.');
      return;
    }

    if (formData.tipo_documento === 'CNPJ' && !formData.razao_social.trim()) {
      alert('Para cadastros com CNPJ, o preenchimento da Razão Social é obrigatório.');
      return;
    }

    if (!formData.documento.trim() && formData.status !== 'Pré-Cadastro') {
      alert('Por favor, informe o CNPJ ou CPF da oficina.');
      return;
    }

    setIsSaving(true);
    const nowIso = new Date().toISOString();

    const payload = {
      status: formData.status,
      tipo_documento: formData.tipo_documento,
      documento: formData.documento.trim(),
      razao_social: formData.razao_social.trim(),
      nome_fantasia: formData.nome_fantasia.trim(),
      cep: formData.cep.trim(),
      logradouro: formData.logradouro.trim(),
      numero: formData.numero.trim(),
      bairro: formData.bairro.trim(),
      cidade: formData.cidade.trim(),
      uf: formData.uf.trim().toUpperCase(),
      contato_nome: formData.contato_nome.trim(),
      contato_telefone: formData.contato_telefone.trim(),
      contato_email: formData.contato_email.trim(),
      servicos_prestados: formData.servicos_prestados,
      outros_servicos: formData.outros_servicos.trim(),
      is_pre_cadastro: formData.status === 'Pré-Cadastro',
      atualizado_em: nowIso
    };

    try {
      let savedRecord = null;
      if (isSupabaseAvailable) {
        if (editingOficina && editingOficina.id && !String(editingOficina.id).startsWith('LEGACY_')) {
          const { data, error } = await supabase
            .from('cadastro_oficinas')
            .update(payload)
            .eq('id', editingOficina.id)
            .select()
            .single();

          if (!error && data) savedRecord = data;
        } else {
          const { data, error } = await supabase
            .from('cadastro_oficinas')
            .insert([{ ...payload, criado_em: nowIso }])
            .select()
            .single();

          if (!error && data) savedRecord = data;
        }
      }

      const recordToKeep = savedRecord || {
        id: editingOficina?.id || `OFICINA_${Date.now()}`,
        ...payload,
        criado_em: editingOficina?.criado_em || nowIso
      };

      let updatedList = [];
      if (editingOficina) {
        updatedList = oficinas.map(o => o.id === editingOficina.id ? recordToKeep : o);
      } else {
        updatedList = [recordToKeep, ...oficinas];
      }

      setOficinas(updatedList);
      localStorage.setItem(STORAGE_KEY_OFICINAS, JSON.stringify(updatedList));
      notifyOficinasUpdated(updatedList);

      setIsFormOpen(false);
      if (showNotification) {
        showNotification(`Oficina "${recordToKeep.nome_fantasia}" salva com sucesso!`);
      }
    } catch (err) {
      console.error('Erro ao salvar oficina:', err);
      alert('Erro ao salvar oficina. As informações foram gravadas no cache local.');
    } finally {
      setIsSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // ALTERAR STATUS RÁPIDO OU EXCLUIR
  // --------------------------------------------------------------------------
  const handleQuickStatusChange = async (oficinaObj, newStatus) => {
    const updated = oficinas.map(o => o.id === oficinaObj.id ? { ...o, status: newStatus } : o);
    setOficinas(updated);
    localStorage.setItem(STORAGE_KEY_OFICINAS, JSON.stringify(updated));
    notifyOficinasUpdated(updated);

    if (oficinaObj.id && !String(oficinaObj.id).startsWith('LEGACY_')) {
      try {
        await supabase.from('cadastro_oficinas').update({ status: newStatus }).eq('id', oficinaObj.id);
      } catch (e) {
        console.warn('Erro ao atualizar status no Supabase:', e);
      }
    }
    if (showNotification) showNotification(`Status da oficina ${oficinaObj.nome_fantasia} alterado para "${newStatus}".`);
  };

  const handleDeleteOficina = (oficinaObj) => {
    showConfirmModal(
      'Excluir Oficina Credenciada',
      `Tem certeza que deseja excluir permanentemente a oficina "${oficinaObj.nome_fantasia}"? Esta ação removerá a oficina imediatamente de todas as listas de direcionamento.`,
      async () => {
        const updated = oficinas.filter(o => o.id !== oficinaObj.id);
        setOficinas(updated);
        localStorage.setItem(STORAGE_KEY_OFICINAS, JSON.stringify(updated));

        if (oficinaObj.id && !String(oficinaObj.id).startsWith('LEGACY_')) {
          try {
            await supabase.from('cadastro_oficinas').delete().eq('id', oficinaObj.id);
          } catch (e) {
            console.warn('Erro ao deletar oficina do Supabase:', e);
          }
        }

        notifyOficinasUpdated(updated);
        if (showNotification) showNotification(`Oficina "${oficinaObj.nome_fantasia}" removida com sucesso.`);
      },
      'error',
      'Excluir Oficina',
      'Cancelar'
    );
  };

  // --------------------------------------------------------------------------
  // ESTATÍSTICAS / KPIS DA BARRA SUPERIOR
  // --------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const total = oficinas.length;
    const ativas = oficinas.filter(o => o.status === 'Ativo').length;
    const preCadastros = oficinas.filter(o => o.status === 'Pré-Cadastro' || o.is_pre_cadastro).length;
    const inativasBloqueadas = oficinas.filter(o => o.status === 'Inativo' || o.status === 'Bloqueado').length;
    return { total, ativas, preCadastros, inativasBloqueadas };
  }, [oficinas]);

  // --------------------------------------------------------------------------
  // LISTA FILTRADA
  // --------------------------------------------------------------------------
  const oficinasFiltradas = useMemo(() => {
    return oficinas.filter(o => {
      // Filtro por Texto
      const text = searchTerm.toLowerCase().trim();
      const matchSearch = !text ||
        (o.nome_fantasia || '').toLowerCase().includes(text) ||
        (o.razao_social || '').toLowerCase().includes(text) ||
        (o.documento || '').toLowerCase().includes(text) ||
        (o.cidade || '').toLowerCase().includes(text);

      // Filtro por Status
      let matchStatus = true;
      if (selectedStatusFilter === 'ATIVO') matchStatus = o.status === 'Ativo';
      if (selectedStatusFilter === 'PRE_CADASTRO') matchStatus = o.status === 'Pré-Cadastro' || o.is_pre_cadastro;
      if (selectedStatusFilter === 'BLOQUEADO') matchStatus = o.status === 'Bloqueado';
      if (selectedStatusFilter === 'INATIVO') matchStatus = o.status === 'Inativo';

      // Filtro por Serviço
      let matchServico = true;
      if (selectedServicoFilter !== 'TODOS') {
        const servs = Array.isArray(o.servicos_prestados) ? o.servicos_prestados : [];
        matchServico = servs.includes(selectedServicoFilter);
      }

      return matchSearch && matchStatus && matchServico;
    });
  }, [oficinas, searchTerm, selectedStatusFilter, selectedServicoFilter]);

  // Helper para cor do badge de status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Ativo':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5"><CheckCircle2 size={13} /> Ativo</span>;
      case 'Pré-Cadastro':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1.5"><AlertTriangle size={13} /> Pré-Cadastro</span>;
      case 'Bloqueado':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1.5"><ShieldAlert size={13} /> Bloqueado</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 inline-flex items-center gap-1.5"><XCircle size={13} /> Inativo</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* -------------------------------------------------------------------- */}
      {/* CABEÇALHO ULTRA PREMIUM & KPIS */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={13} /> Módulo Frota Operacional
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
            <Building2 className="text-emerald-400" size={36} /> Cadastro de Oficinas de Destino
          </h2>
          <p className="text-sm text-slate-300 max-w-xl font-medium">
            Gerenciamento completo das oficinas credenciadas, parceiros terceirizados e oficinas internas com perfil de especialidade de serviços.
          </p>
        </div>

        <div className="flex items-center gap-4 relative z-10 flex-wrap">
          <button
            onClick={() => handleOpenForm()}
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2.5 transition-all cursor-pointer border border-emerald-300/30"
          >
            <Plus size={18} /> Cadastrar Nova Oficina
          </button>

          <button
            onClick={loadOficinas}
            className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
            title="Atualizar Oficinas"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!isSupabaseAvailable && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <span>
              <strong>Modo Local (Offline):</strong> A tabela <code>cadastro_oficinas</code> ainda não foi criada no Supabase. Os dados estão sendo salvos localmente no navegador. Execute o script <code>schema_cadastro_oficinas.sql</code> no SQL Editor do Supabase para habilitar a nuvem.
            </span>
          </div>
          <button
            onClick={loadOficinas}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black hover:bg-amber-400 shrink-0 transition-all cursor-pointer"
          >
            Testar Conexão Supabase
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* CARDS DE KPIS */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Cadastradas</span>
            <Building2 size={20} className="text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {kpis.total} <span className="text-xs text-slate-400 font-normal">oficinas</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Oficinas Ativas</span>
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {kpis.ativas}
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Pré-Cadastros (Legado)</span>
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
            {kpis.preCadastros}
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Inativas / Bloqueadas</span>
            <ShieldAlert size={20} className="text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
            {kpis.inativasBloqueadas}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* BARRA DE FILTROS E PESQUISA */}
      {/* -------------------------------------------------------------------- */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Campo de Pesquisa */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por Nome Fantasia, Razão Social, CNPJ/CPF ou Cidade..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtro por Categoria de Serviço */}
          <div className="w-full lg:w-64">
            <select
              value={selectedServicoFilter}
              onChange={e => setSelectedServicoFilter(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="TODOS">🔧 Todos os Serviços</option>
              {CATEGORIAS_SERVICOS_PADRAO.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
              ))}
            </select>
          </div>

          {/* Botões Modo de Visualização */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'}`}
              title="Modo Cards"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'}`}
              title="Modo Tabela"
            >
              <List size={18} />
            </button>
          </div>

        </div>

        {/* Pílulas de Filtro por Status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1 shrink-0">
            <Filter size={13} /> Status:
          </span>
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'ATIVO', label: 'Ativos' },
            { id: 'PRE_CADASTRO', label: 'Pré-Cadastros' },
            { id: 'BLOQUEADO', label: 'Bloqueados' },
            { id: 'INATIVO', label: 'Inativos' }
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setSelectedStatusFilter(st.id)}
              className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                selectedStatusFilter === st.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-md font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* CONTEÚDO: CARDS OU TABELA */}
      {/* -------------------------------------------------------------------- */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="mx-auto mb-3 animate-spin text-emerald-500" size={32} />
          <p>Carregando oficinas de destino...</p>
        </div>
      ) : oficinasFiltradas.length === 0 ? (
        <div className="p-16 text-center text-slate-400 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <Building2 className="mx-auto text-slate-400 opacity-40" size={48} />
          <p className="text-base text-slate-700 dark:text-slate-300">Nenhuma oficina encontrada com os filtros selecionados.</p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedStatusFilter('TODOS'); setSelectedServicoFilter('TODOS'); }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            Limpar Filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISUALIZAÇÃO EM CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {oficinasFiltradas.map(of => (
            <div
              key={of.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all space-y-5 flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {getStatusBadge(of.status)}
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenForm(of)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                      title="Editar Cadastro"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteOficina(of)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                      title="Excluir Oficina"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors leading-tight">
                    {of.nome_fantasia}
                  </h3>
                  {of.razao_social && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {of.razao_social}
                    </p>
                  )}
                  {of.documento && (
                    <span className="inline-block mt-1 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      {of.tipo_documento || 'DOC'}: {of.documento}
                    </span>
                  )}
                </div>

                {/* Localização & Contato */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-slate-800">
                  {(of.cidade || of.logradouro) && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="line-clamp-1">
                        {[of.logradouro, of.numero, of.bairro, of.cidade, of.uf].filter(Boolean).join(', ') || 'Endereço não informado'}
                      </span>
                    </div>
                  )}
                  {of.contato_nome && (
                    <div className="flex items-center gap-2">
                      <UserCheck size={14} className="text-slate-400 shrink-0" />
                      <span>Contato: <strong className="text-slate-800 dark:text-slate-200">{of.contato_nome}</strong></span>
                    </div>
                  )}
                  {of.contato_telefone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span>{of.contato_telefone}</span>
                    </div>
                  )}
                </div>

                {/* Tags de Serviços Prestados */}
                <div className="pt-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                    Serviços Prestados:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.isArray(of.servicos_prestados) && of.servicos_prestados.length > 0 ? (
                      of.servicos_prestados.map(serv => (
                        <span key={serv} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] border border-slate-200 dark:border-slate-700">
                          {serv}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Mecânico Geral</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações Rápidas de Status no Rodapé do Card */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-slate-400">Alterar Status:</span>
                <div className="flex items-center gap-1">
                  {of.status !== 'Ativo' && (
                    <button
                      onClick={() => handleQuickStatusChange(of, 'Ativo')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 font-bold text-[11px] transition-colors"
                    >
                      Ativar
                    </button>
                  )}
                  {of.status !== 'Bloqueado' && (
                    <button
                      onClick={() => handleQuickStatusChange(of, 'Bloqueado')}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 font-bold text-[11px] transition-colors"
                    >
                      Bloquear
                    </button>
                  )}
                  {of.status !== 'Inativo' && (
                    <button
                      onClick={() => handleQuickStatusChange(of, 'Inativo')}
                      className="px-2.5 py-1 rounded-lg bg-slate-500/10 hover:bg-slate-500 hover:text-white text-slate-600 font-bold text-[11px] transition-colors"
                    >
                      Inativar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA */
        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6">Oficina / Razão Social</th>
                <th className="py-4 px-6">Documento</th>
                <th className="py-4 px-6">Localização</th>
                <th className="py-4 px-6">Contato</th>
                <th className="py-4 px-6">Serviços Prestados</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
              {oficinasFiltradas.map(of => (
                <tr key={of.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-black text-slate-900 dark:text-white text-sm">
                      {of.nome_fantasia}
                    </div>
                    {of.razao_social && (
                      <div className="text-[11px] font-semibold text-slate-400">
                        {of.razao_social}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {of.documento ? `${of.tipo_documento || 'DOC'}: ${of.documento}` : '-'}
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                    {[of.cidade, of.uf].filter(Boolean).join(' - ') || 'Não informado'}
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                    <div>{of.contato_nome || '-'}</div>
                    {of.contato_telefone && <div className="text-[11px] text-slate-400 font-bold">{of.contato_telefone}</div>}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1 flex-wrap">
                      {Array.isArray(of.servicos_prestados) && of.servicos_prestados.slice(0, 3).map(s => (
                        <span key={s} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                          {s}
                        </span>
                      ))}
                      {Array.isArray(of.servicos_prestados) && of.servicos_prestados.length > 3 && (
                        <span className="text-[10px] font-bold text-slate-400">+{of.servicos_prestados.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {getStatusBadge(of.status)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenForm(of)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteOficina(of)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL / DRAWER DE FORMULÁRIO DE CADASTRO & EDIÇÃO DE OFICINA */}
      {/* -------------------------------------------------------------------- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto relative">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="text-emerald-500" />
                  {editingOficina ? `Editar Oficina: "${editingOficina.nome_fantasia}"` : 'Cadastrar Nova Oficina de Destino'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Preencha os dados cadastrais da oficina e marque as categorias de serviços oferecidos.
                </p>
              </div>

              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <div className="space-y-6">
              
              {/* Bloco Status & Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status do Cadastro *</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs outline-none"
                  >
                    <option value="Ativo">🟢 Ativo</option>
                    <option value="Pré-Cadastro">🟡 Pré-Cadastro</option>
                    <option value="Bloqueado">🔴 Bloqueado</option>
                    <option value="Inativo">⚪ Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Documento *</label>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_documento: 'CNPJ' })}
                      className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${formData.tipo_documento === 'CNPJ' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                    >
                      CNPJ (Pessoa Jurídica)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_documento: 'CPF' })}
                      className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${formData.tipo_documento === 'CPF' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                    >
                      CPF (Pessoa Física)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nº do {formData.tipo_documento} {formData.status !== 'Pré-Cadastro' && '*'}
                  </label>
                  <input
                    type="text"
                    value={formData.documento}
                    onChange={e => setFormData({ ...formData, documento: e.target.value })}
                    placeholder={formData.tipo_documento === 'CNPJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs outline-none"
                  />
                </div>
              </div>

              {/* Bloco Nomes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Fantasia / Nome Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome_fantasia}
                    onChange={e => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    placeholder="Ex: Auto Center Popeyes, Chaveiro Edson..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Razão Social {formData.tipo_documento === 'CNPJ' ? <span className="text-rose-500 font-bold">* (Obrigatório p/ CNPJ)</span> : <span className="text-slate-400 font-normal">(Opcional p/ CPF)</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.razao_social}
                    onChange={e => setFormData({ ...formData, razao_social: e.target.value })}
                    placeholder="Ex: Popeyes Manutenção Automotiva LTDA"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs outline-none"
                  />
                </div>
              </div>

              {/* Bloco Endereço */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} /> Endereço da Oficina
                  </h4>
                  {searchingCep && <span className="text-xs text-emerald-500 font-bold animate-pulse">Buscando CEP...</span>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">CEP</label>
                    <input
                      type="text"
                      maxLength={9}
                      value={formData.cep}
                      onChange={e => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Logradouro / Rua</label>
                    <input
                      type="text"
                      value={formData.logradouro}
                      onChange={e => setFormData({ ...formData, logradouro: e.target.value })}
                      placeholder="Ex: Av. Brasil"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Número</label>
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={e => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="Ex: 1500"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={formData.bairro}
                      onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                      placeholder="Ex: Centro"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="Ex: São Paulo"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">UF (Estado)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formData.uf}
                      onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      placeholder="SP"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco Contato (Opcional) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <UserCheck size={14} /> Contato Principal <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Nome do Contato</label>
                    <input
                      type="text"
                      value={formData.contato_nome}
                      onChange={e => setFormData({ ...formData, contato_nome: e.target.value })}
                      placeholder="Ex: Roberto Gerente"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.contato_telefone}
                      onChange={e => setFormData({ ...formData, contato_telefone: e.target.value })}
                      placeholder="(11) 98765-4321"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.contato_email}
                      onChange={e => setFormData({ ...formData, contato_email: e.target.value })}
                      placeholder="contato@oficina.com.br"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco Tipos de Serviços Prestados */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Wrench size={14} className="text-emerald-500" /> Tipos de Serviços Prestados *
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {CATEGORIAS_SERVICOS_PADRAO.map(cat => {
                    const isSelected = formData.servicos_prestados.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => toggleServico(cat.id)}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-xs leading-tight flex-1">{cat.label}</span>
                        {isSelected && <Check size={16} className="text-emerald-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Adicionar Categoria Customizada "Outros" */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Outros Serviços / Categorias Customizadas
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={novoServicoCustom}
                      onChange={e => setNovoServicoCustom(e.target.value)}
                      placeholder="Ex: Tapeçaria, Vidraçaria, Alinhamento 3D..."
                      className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddServicoCustom}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                    >
                      Adicionar
                    </button>
                  </div>

                  {/* Exibir serviços prestados selecionados */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                    {formData.servicos_prestados.map(serv => (
                      <span key={serv} className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1 border border-indigo-500/20">
                        {serv}
                        <button type="button" onClick={() => toggleServico(serv)} className="hover:text-rose-500">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveOficina}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer transition-all"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                <span>{editingOficina ? 'Salvar Alterações' : 'Confirmar Cadastro'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ★ MODAL ULTRA PREMIUM DE CONFIRMAÇÃO & FEEDBACK */}
      <CustomFeedbackModal {...feedbackModal} />

    </div>
  );
}
