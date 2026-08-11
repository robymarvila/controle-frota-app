import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import { supabase } from './supabaseClient';
import { QRCodeSVG } from 'qrcode.react';

import { 
  QrCode, FileBadge, ArrowRight,
  LayoutDashboard, CarFront, Wrench, History, Plus, CheckCircle2, AlertTriangle, XCircle, TrendingDown,

  Search, FileText, Clock, X, Check, Edit, PlayCircle, Filter, LayoutGrid, List as ListIcon, List,

  ArrowLeft, Save, User, UserCheck, AlertCircle, Award, Edit2, CalendarDays, ChevronRight, Users, UserPlus, ShieldCheck, Briefcase,

  Contact, PlusCircle, Trash2, FileCheck, Upload, Activity, Lock, Unlock, LogOut, CheckSquare,

  BarChart3, LineChart as LineChartIcon, Download, Eye, EyeOff, Smartphone, RefreshCcw, Truck, Tv,

  ClipboardCheck, Sun, Moon, Home, ChevronDown

, KeyRound, Loader, Shield, ShieldAlert, Globe, Zap, AlertOctagon, FileWarning, Info, FileSignature, Map as MapIcon, Camera, FileClock, Sparkles, Building2, Mail } from 'lucide-react';

import forcaData from './forcaData.json';

import { ComposedChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, LineChart, Line, AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import WelcomeReleaseModal, { checkShouldAutoShowReleaseModal } from './components/WelcomeReleaseModal';
import ModalConfirmacaoAbertura from './components/ModalConfirmacaoAbertura';

import * as XLSX from 'xlsx';

import FinanceiroView from './components/FinanceiroView';

import IndicadoresFinanceirosView from './components/IndicadoresFinanceirosView';
import MecanicoView from './components/MecanicoView';
import CalendarioOperacionalView from './components/calendario/CalendarioOperacionalView';
import ModalMotoristasDetalhe from './components/ModalMotoristasDetalhe';
import ModalPlacasDetalhe from './components/ModalPlacasDetalhe';
import TelaCheckin from './components/calendario/TelaCheckin';
import AutoFiscalizacaoView from './components/AutoFiscalizacaoView';
import WFMDespachoView from './components/WFMDespachoView';
import CadastroOficinasView from './components/CadastroOficinasView';
import ForcaTrabalhoModule from './components/ForcaTrabalhoModule';
import MobileShell from './components/mobile/MobileShell';
import { useDeviceDetect } from './hooks/useDeviceDetect';

import { DollarSign, PieChart as PieChartIcon, CalendarCheck } from 'lucide-react';
import CustomFeedbackModal from './components/CustomFeedbackModal';
import ModalTrocaSenhaObrigatoria from './components/ModalTrocaSenhaObrigatoria';
import ModalDefinirSenhaProvisoria from './components/ModalDefinirSenhaProvisoria';
import { normalizeKey, hashPassword, verifyPassword, validatePasswordStrength } from './utils/security';

// --- CONFIGURAÇÕES E DADOS INICIAIS ---

const VALOR_HORA_PESADO = 342.00; 

const VALOR_HORA_LEVE = 274.56;   

const VALOR_HORA_MOTO = 276.14;




const LAUDOS_OBRIGATORIOS = ['Acústico', 'Dielétrico Liner', 'Dielétrico Lança', 'CRLV'];
const LAUDOS_PRESET = ['Dielétrico Lança', 'Dielétrico Liner', 'Dielétrico Cesto', 'Acústico', 'Emissão de Gases', 'CRLV'];
export const LISTA_OFICINAS_PADRAO = [
  'UNION FLEX',
  'DANNIL',
  'HIDROCAM',
  'LOCALIZA RENT A CAR',
  'LOCALIZA FLEET',
  'HALVA REMOCOES E TRANSPORTE',
  'OFICINA AUTOCAR',
  'OFICINA APICE',
  'OFICINA BORRACHARIA VEMAG',
  'OFICINA CHAMPION',
  'OFICINA GENESIS AUTOVIDRO',
  'OFICINA PAULO NEVES',
  'OFICINA NOVA JUCAR AUTO ESTUFA',
  'OFICINA MOTORNORTE',
  'OFICINA SAMUEL AUTO CAR',
  'OFICINA POPEYES',
  'OFICINA VAMOS',
  'FROTA MANUTENÇÃO',
  'OFICINA MB',
  'DIBRACAM',
  'AEROBRASIL MECANICA',
  'DENIGRIS - MERCEDES',
  'O CARRO AUTO CENTER',
  'CHAVEIRO EDSON'
];
export const LISTA_OFICINAS = LISTA_OFICINAS_PADRAO;



// Mocks

const initialUsers = [

  { id: 1, nome: 'Administrador (Gerente)', login: 'admin', senha: '123', perfil: 'GERENTE', status: 'APROVADO' }

];







const initialVehicles = [

  { id: 1, placa: 'RCW0H81', turno: 'Manhã', tipo: 'Pesado', subTipo: 'Munk', tipoOp: 'Linha Viva', marca: 'Volks', situacao: 'RODANDO', status: 'MANUTENÇÃO', fidelizacao: 'SIM', equipes: [{ id: 1, codEquipe: 'ENL100', grupoFolga: 'A', tipoEquipe: 'Fixa', componentes: [1, 2], documentoAnexo: 'termo_assinatura.pdf' }], historicoModificacoes: [{ id: 1, dataHora: '2026-05-10T08:00', usuario: 'Sistema', descricao: 'Veículo cadastrado.' }] },

  { id: 2, placa: 'SKJ1F63', turno: 'Manhã', tipo: 'Pesado', subTipo: 'Munk', tipoOp: 'Linha Viva', marca: 'Volks', situacao: 'RODANDO', status: 'DISPONIVEL', fidelizacao: 'NÃO', equipes: [], historicoModificacoes: [] },

];



const initialChamados = [

  { id: 1, placa: 'RCW0H81', numero: 'SOL-079150', dataAbertura: '2026-05-02T08:15', dataHoraFechamento: null, situacaoVeiculo: 'RODANDO', oficinaExterna: 'NÃO', status: 'ABERTO', pendencia: '', historicoModificacoes: [] },

];







const calcularHorasParadas = (abertura, fechamento) => {

  const dataFechamento = fechamento ? new Date(fechamento) : new Date();

  const diffMs = dataFechamento - new Date(abertura);

  const horas = diffMs / (1000 * 60 * 60);

  return horas > 0 ? horas : 0;

};



const formatarDataBR = (dataString) => {

  if (!dataString) return '--';

  const data = new Date(dataString);

  const dia = String(data.getDate()).padStart(2, '0');

  const mes = String(data.getMonth() + 1).padStart(2, '0');

  const ano = data.getFullYear();

  const horas = String(data.getHours()).padStart(2, '0');

  const min = String(data.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${ano} ${horas}:${min}`;

};



const getEtapaWorkflow = (c) => {

  if (!c) return 'Análise Frota';

  const stage = c.etapaWorkflow || '';

  if (stage === 'Aguardando Manutenção' || !stage) {

    return 'Análise Frota';

  }

  return stage;

};



const formatToDatetimeLocal = (dataString) => {

  if (!dataString) return '';

  const data = new Date(dataString);

  if (isNaN(data.getTime())) return '';

  const ano = data.getFullYear();

  const mes = String(data.getMonth() + 1).padStart(2, '0');

  const dia = String(data.getDate()).padStart(2, '0');

  const horas = String(data.getHours()).padStart(2, '0');

  const min = String(data.getMinutes()).padStart(2, '0');

  return `${ano}-${mes}-${dia}T${horas}:${min}`;

};



const getValorHora = (veiculo) => {

  if (!veiculo) return VALOR_HORA_PESADO;

  if (veiculo.subTipo && veiculo.subTipo.toUpperCase() === 'MOTO') return VALOR_HORA_MOTO;

  return veiculo.tipo === 'Pesado' ? VALOR_HORA_PESADO : VALOR_HORA_LEVE;

};



const getPrejuizoChamado = (c, veiculo, refDate) => {

  if (c.situacaoVeiculo !== 'PARADO') return 0;

  const fechamento = c.dataHoraFechamento || refDate || new Date();

  const horasParadas = calcularHorasParadas(c.dataAbertura, fechamento);

  const diasParados = horasParadas / 24;

  return (getValorHora(veiculo) * 8) * diasParados;

};



// Função utilitária para gerar Log DE > PARA

const gerarLogDePara = (objAntigo, objNovo, mapeamentoNomes) => {

  const mudancas = [];

  Object.keys(mapeamentoNomes).forEach(key => {

    if (objAntigo[key] !== objNovo[key]) {

      const de = objAntigo[key] || '(Vazio)';

      const para = objNovo[key] || '(Vazio)';

      mudancas.push(`[${mapeamentoNomes[key]}] de '${de}' para '${para}'`);

    }

  });

  return mudancas.join(' | ');

};



const getTitleCaseBase = (name) => {

  if (!name) return '';

  if (name.startsWith('TOTAL')) return '';

  if (name === 'VILA MEDEIROS') return 'Vila Medeiros';

  if (name === 'FAGUNDES FILHO') return 'Fagundes Filho';

  if (name === 'SANTO ANDRÉ') return 'Santo André';

  if (name === 'MONTE SANTO') return 'Monte Santo';

  

  // also handle other lowercase/titlecase cases

  const upper = name.toUpperCase();

  if (upper === 'VILA MEDEIROS') return 'Vila Medeiros';

  if (upper === 'FAGUNDES FILHO') return 'Fagundes Filho';

  if (upper === 'SANTO ANDRÉ') return 'Santo André';

  if (upper === 'MONTE SANTO') return 'Monte Santo';

  if (upper === 'CAJATI') return 'Cajati';

  if (upper === 'CATUMBI') return 'Catumbi';

  if (upper === 'ARICANDUVA') return 'Aricanduva';

  

  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

};



const PREFIX_TO_BASE = {

  'ESL': { base: 'Santo André', region: 'leste' },

  'ENL': { base: 'Fagundes Filho', region: 'norte' },

  'EQL': { base: 'Aricanduva', region: 'leste' },

  'EVL': { base: 'Catumbi', region: 'leste' },

  'ECL': { base: 'Cajati', region: 'norte' },

  'EEL': { base: 'Vila Medeiros', region: 'norte' },

  'EML': { base: 'Monte Santo', region: 'leste' }

};



const NavItem = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className={`w-full flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-0 group-hover:px-4 py-3 group-hover:py-2.5 rounded-2xl transition-all duration-300 relative overflow-hidden active:scale-95 mb-1 ${
      isActive 
        ? 'bg-emerald-50 text-emerald-700 shadow-sm font-bold border border-emerald-100/50' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium border border-transparent'
    }`}
  >
    <div className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
      {icon}
    </div>
    <span className="w-0 group-hover:w-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap text-[13px] tracking-wide">
      {label}
    </span>
    {isActive && (
       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-emerald-500 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
    )}
  </button>
);




function TelaLaudosPublica({ placa }) {
  const [laudos, setLaudos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLaudos = async () => {
      const { data } = await supabase.from('veiculo_laudos').select('*').eq('veiculo_placa', placa.toUpperCase()).order('data_inclusao', { ascending: false });
      if (data) {
        // Group by category to find only active ones
        const ativos = [];
        const categoriasMap = {};
        const hoje = new Date();
        data.forEach(l => {
          if (!categoriasMap[l.categoria]) {
            categoriasMap[l.categoria] = true;
            const venc = new Date(l.data_vencimento);
            if (venc >= hoje) {
              ativos.push(l);
            }
          }
        });
        setLaudos(ativos);
      }
      setLoading(false);
    };
    fetchLaudos();
  }, [placa]);

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-6 sm:p-12 animate-in fade-in duration-500 font-sans text-slate-100">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 mb-6 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
          
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20 relative z-10">
            <FileBadge size={32} className="text-white" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-2 relative z-10">Documentação Oficial</h2>
          <h1 className="text-2xl font-black text-white relative z-10">Veículo <span className="text-emerald-400">{placa}</span></h1>
          <p className="text-slate-400 text-sm mt-2 relative z-10">Bem vindo aos Laudos e Documentos do Veículo.</p>
        </div>

        {/* Content */}
        {laudos.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-3xl p-8 text-center flex flex-col items-center">
            <ShieldAlert size={48} className="text-slate-600 mb-4" />
            <p className="text-slate-400 font-medium">Nenhum laudo ativo encontrado para este veículo no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 mb-2">Laudos Ativos</p>
            {laudos.map(laudo => (
              <div key={laudo.id} className="bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl p-5 flex items-center justify-between transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-700/50 group-hover:bg-emerald-500/10 rounded-xl flex items-center justify-center transition-colors">
                    <FileCheck size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{laudo.categoria}</h3>
                    <p className="text-xs text-slate-400 font-medium">Válido até: <span className="text-slate-300">{new Date(laudo.data_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={laudo.arquivo_url} target="_blank" rel="noreferrer" className="w-10 h-10 bg-slate-700 hover:bg-emerald-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all">
                    <Eye size={18} />
                  </a>
                  <a href={laudo.arquivo_url} download target="_blank" rel="noreferrer" className="w-10 h-10 bg-slate-700 hover:bg-blue-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all">
                    <Download size={18} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper de Normalização do Colaborador (46 Colunas da Base Unificada + Mapeamento Legado)
const normalizeColaborador = (c) => {
  if (!c) return c;
  const statusForca = c.status_forca || c.statusForca || 'Ativo';
  const regional = c.base_ut || c.regional || 'Norte';
  const grupoFolga = c.grupo_folga || c.grupoFolga || '--';
  return {
    ...c,
    // Standard 46 columns
    matricula: c.matricula || '',
    chave_primaria: c.chave_primaria || '',
    nome: c.nome || '',
    funcao: c.funcao || '',
    qtd_faltas_atual: c.qtd_faltas_atual ?? 0,
    status_falta: c.status_falta || '',
    base_ut: regional,
    status_forca: statusForca,
    acao_a_ser_feita: c.acao_a_ser_feita || '',
    grupo_folga: grupoFolga,
    commessa: c.commessa || '',
    horario: c.horario || '',
    equipe: c.equipe || 'Sobra',
    veiculo: c.veiculo || '',
    turno: c.turno || '',
    area_atuacao: c.area_atuacao || c.areaAtuacao || '',
    subgrupo: c.subgrupo || '',
    cnh: c.cnh || '',
    filial: c.filial || '',
    dt_admissao: c.dt_admissao || '',
    dt_demissao: c.dt_demissao || '',
    sit_folha: c.sit_folha || '',
    possui_periculosidade: c.possui_periculosidade || '',
    diretoria: c.diretoria || '',
    centro_custo: c.centro_custo || '',
    classe_custo: c.classe_custo || '',
    segmento: c.segmento || '',
    departamento: c.departamento || '',
    gestor: c.gestor || '',
    coordenador: c.coordenador || '',
    supervisor: c.supervisor || '',
    exp_1_periodo: c.exp_1_periodo || '',
    exp_2_periodo: c.exp_2_periodo || '',
    nro_cnh: c.nro_cnh || '',
    categoria_cnh: c.categoria_cnh || '',
    logradouro: c.logradouro || '',
    endereco: c.endereco || '',
    nro_endereco: c.nro_endereco || '',
    bairro: c.bairro || '',
    telefone: c.telefone || '',
    celular: c.celular || '',
    cpf: c.cpf || '',
    centro_custo_alpitel: c.centro_custo_alpitel || '',
    comessa_alpitel: c.comessa_alpitel || '',
    dt_retorno_ferias: c.dt_retorno_ferias || '',
    nro_cracha: c.nro_cracha || '',

    // Legacy mapped properties
    statusForca: statusForca,
    regional: regional,
    grupoFolga: grupoFolga,
    areaAtuacao: c.area_atuacao || c.areaAtuacao || '',
    loginEorder: c.login_eorder || c.loginEorder || '',
    senhaEorder: c.senha_eorder || c.senhaEorder || '',
    br0: c.br0 || '',
  };
};

// ==========================================
// MATRIZ PADRÃO DE FÁBRICA (FALLBACK SEGURO)
// ==========================================
const DEFAULT_CONFIG_ACESSOS = [
  // --- RH ---
  {
    setor: 'RH',
    perfil: 'VISUALIZADOR',
    modulos_visiveis: ['inicio', 'calendario', 'dashboard', 'entrega_equipes', 'forca', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: false, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'RH',
    perfil: 'ANALISTA',
    modulos_visiveis: ['inicio', 'calendario', 'dashboard', 'entrega_equipes', 'colaboradores', 'forca', 'historico', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: false, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: true,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: true, forca_editar_vagas: true,
      forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'RH',
    perfil: 'SUPERVISOR',
    modulos_visiveis: ['inicio', 'calendario', 'dashboard', 'entrega_equipes', 'colaboradores', 'forca', 'historico', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: false, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: true,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: true, forca_editar_vagas: true,
      forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: false
    }
  },
  {
    setor: 'RH',
    perfil: 'COORDENADOR',
    modulos_visiveis: ['inicio', 'calendario', 'dashboard', 'entrega_equipes', 'colaboradores', 'forca', 'historico', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: true,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: true, forca_editar_vagas: true,
      forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: true
    }
  },
  {
    setor: 'RH',
    perfil: 'GERENTE',
    modulos_visiveis: ['inicio', 'calendario', 'dashboard', 'entrega_equipes', 'colaboradores', 'forca', 'historico', 'meu_perfil', 'usuarios'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: true,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: true, pode_alterar_etapa_manual: false, forca_editar_colaborador: true, forca_editar_vagas: true,
      forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: true
    }
  },

  // --- OPERAÇÕES ---
  {
    setor: 'OPERACOES',
    perfil: 'VISUALIZADOR',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'entrega_equipes', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: false, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: false,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'OPERACOES',
    perfil: 'ANALISTA',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'entrega_equipes', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'forca', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: false,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'OPERACOES',
    perfil: 'SUPERVISOR',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'chamados', 'frota', 'entrega_equipes', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'colaboradores', 'forca', 'historico', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: true,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: false,
      pode_editar_acessos: false, pode_alterar_etapa_manual: true, forca_editar_colaborador: true, forca_editar_vagas: true,
      forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: true
    }
  },
  {
    setor: 'OPERACOES',
    perfil: 'COORDENADOR',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'chamados', 'frota', 'entrega_equipes', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'colaboradores', 'forca', 'historico', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: true,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: true, forca_editar_colaborador: true, forca_editar_vagas: true,
      forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: true
    }
  },
  {
    setor: 'OPERACOES',
    perfil: 'GERENTE',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'chamados', 'frota', 'entrega_equipes', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'colaboradores', 'forca', 'historico', 'meu_perfil', 'usuarios'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: true,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: true, pode_alterar_etapa_manual: true, forca_editar_colaborador: true, forca_editar_vagas: true,
      forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: true
    }
  },

  // --- FROTA ---
  {
    setor: 'FROTA',
    perfil: 'VISUALIZADOR',
    modulos_visiveis: ['inicio', 'dashboard', 'chamados', 'frota', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'historico', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: false, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: false, ver_indicadores_financeiros: false,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, pode_concluir_chamado_oficina: false, pode_movimentar_oficinas: false,
      forca_editar_colaborador: false, forca_editar_vagas: false, forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'FROTA',
    perfil: 'ANALISTA',
    modulos_visiveis: ['inicio', 'dashboard', 'chamados', 'frota', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'historico', 'meu_perfil', 'cadastro_oficinas'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: false, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: true, pode_concluir_chamado_oficina: true, pode_movimentar_oficinas: true,
      forca_editar_colaborador: false, forca_editar_vagas: false, forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'FROTA',
    perfil: 'SUPERVISOR',
    modulos_visiveis: ['inicio', 'dashboard', 'chamados', 'frota', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'historico', 'meu_perfil', 'cadastro_oficinas'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: false, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: true, pode_concluir_chamado_oficina: true, pode_movimentar_oficinas: true,
      forca_editar_colaborador: false, forca_editar_vagas: false, forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'FROTA',
    perfil: 'COORDENADOR',
    modulos_visiveis: ['inicio', 'dashboard', 'chamados', 'frota', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'historico', 'meu_perfil', 'cadastro_oficinas'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: false, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: true, pode_concluir_chamado_oficina: true, pode_movimentar_oficinas: true,
      forca_editar_colaborador: false, forca_editar_vagas: false, forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'FROTA',
    perfil: 'GERENTE',
    modulos_visiveis: ['inicio', 'dashboard', 'chamados', 'frota', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'historico', 'meu_perfil', 'usuarios', 'cadastro_oficinas'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: true,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: true, pode_alterar_etapa_manual: true, pode_concluir_chamado_oficina: true, pode_movimentar_oficinas: true,
      forca_editar_colaborador: true, forca_editar_vagas: true, forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: true
    }
  },

  // --- ADMINISTRADOR MASTER ---
  {
    setor: 'ADMINISTRACAO',
    perfil: 'ADMINISTRADOR',
    modulos_visiveis: ['inicio', 'calendario', 'dashboard', 'chamados', 'frota', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'entrega_equipes', 'colaboradores', 'forca', 'historico', 'meu_perfil', 'usuarios', 'autofiscalizacao', 'wfm_despacho', 'cadastro_oficinas'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: true,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: true, pode_alterar_etapa_manual: true, pode_concluir_chamado_oficina: true, pode_movimentar_oficinas: true,
      forca_editar_colaborador: true, forca_editar_vagas: true, forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: true
    }
  },

  // --- COMPRAS ---
  {
    setor: 'COMPRAS',
    perfil: 'VISUALIZADOR',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: false, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: false,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'COMPRAS',
    perfil: 'ANALISTA',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'chamados', 'frota', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'COMPRAS',
    perfil: 'SUPERVISOR',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'chamados', 'frota', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },
  {
    setor: 'COMPRAS',
    perfil: 'GERENTE',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'chamados', 'frota', 'meu_perfil', 'usuarios'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: true, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: true, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },

  // --- LOGÍSTICA ---
  {
    setor: 'LOGISTICA',
    perfil: 'SUPERVISOR',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'chamados', 'frota', 'ociosidade_frota', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: false,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: false,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },

  // --- FINANCEIRO ---
  {
    setor: 'FINANCEIRO',
    perfil: 'SUPERVISOR',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'chamados', 'frota', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: false, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: true, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  },

  // --- DIRETORIA ---
  {
    setor: 'DIRETORIA',
    perfil: 'GERENTE',
    modulos_visiveis: ['inicio', 'calendario', 'dashboard', 'chamados', 'frota', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'entrega_equipes', 'colaboradores', 'forca', 'historico', 'meu_perfil', 'usuarios'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: true,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: true, pode_alterar_etapa_manual: true, forca_editar_colaborador: true, forca_editar_vagas: true,
      forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: true
    }
  },

  // --- TI ---
  {
    setor: 'TI',
    perfil: 'SUPERVISOR',
    modulos_visiveis: ['inicio', 'calendario', 'dashboard', 'chamados', 'frota', 'ociosidade_frota', 'painel_tv', 'fidelizacao', 'entrega_equipes', 'colaboradores', 'forca', 'historico', 'meu_perfil', 'usuarios', 'cadastro_oficinas'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: true, pode_cadastrar_colaborador: true,
      pode_montar_equipe: true, ver_producao_operacional: true, ver_indicadores_financeiros: true,
      pode_editar_acessos: true, pode_alterar_etapa_manual: true, forca_editar_colaborador: true, forca_editar_vagas: true,
      forca_carregar_budget: true, forca_carregar_forca_op: true, forca_formar_equipe: true
    }
  },

  // --- FACILITY ---
  {
    setor: 'FACILITY',
    perfil: 'SUPERVISOR',
    modulos_visiveis: ['inicio', 'dashboard', 'calendario', 'frota', 'chamados', 'meu_perfil'],
    permissoes_edicao: {
      pode_abrir_chamado: true, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
      pode_montar_equipe: false, ver_producao_operacional: true, ver_indicadores_financeiros: false,
      pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
      forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
    }
  }
];

export default function App() {

  // Rotina Automática de Sobras de Campo (23:59) respeitando o calendário/escala do auditor
  useEffect(() => {
    const processSobrasAt2359 = async () => {
      try {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const { data: activeTasks } = await supabase
          .from('wfm_tarefas')
          .select('*')
          .not('auditor', 'is', null)
          .neq('auditor', '')
          .neq('status', 'completed')
          .neq('status', 'concluida');

        if (!activeTasks || activeTasks.length === 0) return;

        const { data: shifts } = await supabase.from('autofiscalizacao_shifts').select('*').eq('date', todayStr);
        const activeShiftsMap = new Map((shifts || []).map(s => [s.auditor, s]));

        for (const task of activeTasks) {
          const auditor = task.auditor;
          const shift = activeShiftsMap.get(auditor);
          let isOvernightActive = false;

          if (shift && shift.shift_start && shift.shift_end) {
            const startH = parseInt(shift.shift_start.split(':')[0], 10);
            const endH = parseInt(shift.shift_end.split(':')[0], 10);
            if (endH < startH && !shift.end_time) {
              isOvernightActive = true; // Turno noturno ativo
            }
          }

          if (!isOvernightActive) {
            const base = task.payload_dados?.base || task.base || 'Base de Origem';
            const nowIso = new Date().toISOString();

            await supabase.from('wfm_tarefas').update({
              auditor: null,
              assigned_date: null,
              planned_start: null,
              planned_end: null,
              status: 'pending',
              historico: [
                ...(task.historico || []),
                {
                  acao: 'SOBRA_CAMPO',
                  usuario: 'Sistema (23:59)',
                  timestamp: nowIso,
                  observacao: `Sobra de Campo: OS Devolvida para o Bucket da Base de Origem (${base}) na virada do dia`
                }
              ]
            }).eq('id', task.id);

            if (task.id_origem) {
              try {
                await supabase.from('autofiscalizacao_workflows').update({ auditor: null, status: 'pendente' }).eq('inspid', task.id_origem);
              } catch (e) {}
            }
            console.log(`[Sobras 23:59] OS ${task.payload_dados?.osid || task.id} devolvida para a ${base}`);
          }
        }
      } catch (err) {
        console.warn('[Sobras 23:59] Erro ao processar sobras:', err);
      }
    };

    // Executa a verificação a cada 5 minutos
    const intervalId = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 23 && now.getMinutes() >= 58) {
        processSobrasAt2359();
      }
    }, 300000);

    return () => clearInterval(intervalId);
  }, []);


  const urlParams = new URLSearchParams(window.location.search);
  const checkinId = urlParams.get('checkin');
  const laudosPlaca = urlParams.get('laudos');

  if (checkinId) {
    return <TelaCheckin atividadeId={checkinId} />;
  }
  if (laudosPlaca) {
    return <TelaLaudosPublica placa={laudosPlaca} />;
  }


  // STATE: Auth & Rate Limiting
  const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState({});
  const broadcastChannelRef = useRef(null);

  // STATE: Ultra-Premium Feedback Modal
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

  const showFeedback = useCallback((type, title, message, onConfirm = null, options = {}) => {
    setFeedbackModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText: options.confirmText || 'Entendido',
      cancelText: options.cancelText || null,
      onConfirm: () => {
        setFeedbackModal(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setFeedbackModal(prev => ({ ...prev, isOpen: false }));
        if (options.onCancel) options.onCancel();
      }
    });
  }, []);

  // STATE: Matriz Dinâmica de Acessos
  const [configAcessos, setConfigAcessos] = useState(() => {
    try {
      const cached = localStorage.getItem('fleet_config_acessos_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_CONFIG_ACESSOS;
  });

  // STATE: Oficinas Cadastradas Dinâmicas
  const [rawOficinas, setRawOficinas] = useState(() => {
    try {
      const cached = localStorage.getItem('fleet_oficinas_cadastradas_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Carregar e sincronizar config_acessos do Supabase em tempo real
  const refreshConfigAcessos = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('config_acessos').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        setConfigAcessos(data);
        localStorage.setItem('fleet_config_acessos_cache', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Usando matriz de acessos em cache/padrão:', err);
    }
  }, []);

  // Carregar e sincronizar cadastro_oficinas do Supabase em tempo real
  const refreshOficinas = useCallback(async (forcedList = null) => {
    if (Array.isArray(forcedList)) {
      setRawOficinas(forcedList);
      localStorage.setItem('fleet_oficinas_cadastradas_v1', JSON.stringify(forcedList));
      return;
    }
    try {
      const { data, error } = await supabase.from('cadastro_oficinas').select('*');
      if (!error && Array.isArray(data)) {
        setRawOficinas(data);
        localStorage.setItem('fleet_oficinas_cadastradas_v1', JSON.stringify(data));
      } else {
        const cached = localStorage.getItem('fleet_oficinas_cadastradas_v1');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) setRawOficinas(parsed);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar oficinas do Supabase:', err);
    }
  }, []);

  const listaOficinasNomes = useMemo(() => {
    if (Array.isArray(rawOficinas) && rawOficinas.length > 0) {
      const ativas = rawOficinas
        .filter(o => {
          const status = (o.status || '').trim().toUpperCase();
          return status === 'ATIVO' || status === 'ATIVA' || status === 'PRÉ-CADASTRO' || status === 'PRE-CADASTRO' || o.is_pre_cadastro || !status;
        })
        .map(o => String(o.nome_fantasia || o.razao_social || '').trim().toUpperCase())
        .filter(Boolean);
      return Array.from(new Set(ativas)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }

    const cached = localStorage.getItem('fleet_oficinas_cadastradas_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const ativas = parsed
            .filter(o => {
              const status = (o.status || '').trim().toUpperCase();
              return status === 'ATIVO' || status === 'ATIVA' || status === 'PRÉ-CADASTRO' || status === 'PRE-CADASTRO' || o.is_pre_cadastro || !status;
            })
            .map(o => String(o.nome_fantasia || o.razao_social || '').trim().toUpperCase())
            .filter(Boolean);
          return Array.from(new Set(ativas)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        }
      } catch (e) {}
    }

    return LISTA_OFICINAS_PADRAO;
  }, [rawOficinas]);

  useEffect(() => {
    refreshConfigAcessos();
    refreshOficinas();

    // Postgres Realtime para cadastro_oficinas
    const oficinasRealtime = supabase
      .channel('realtime-cadastro-oficinas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cadastro_oficinas' },
        () => {
          refreshOficinas();
        }
      )
      .subscribe();

    // Broadcast Channel Global para eventos instantâneos entre abas e usuários
    const bChannel = supabase.channel('fleet-realtime-sync', {
      config: { broadcast: { self: true } }
    });

    bChannel
      .on('broadcast', { event: 'CONFIG_ACESSOS_UPDATED' }, () => {
        console.log('[Realtime Broadcast] Matriz de Acessos atualizada!');
        refreshConfigAcessos();
      })
      .on('broadcast', { event: 'OFICINAS_UPDATED' }, (payload) => {
        console.log('[Realtime Broadcast] Oficinas atualizadas!', payload);
        if (payload?.payload?.updatedList && Array.isArray(payload.payload.updatedList)) {
          setRawOficinas(payload.payload.updatedList);
          localStorage.setItem('fleet_oficinas_cadastradas_v1', JSON.stringify(payload.payload.updatedList));
        } else {
          refreshOficinas();
        }
      })
      .on('broadcast', { event: 'USER_UPDATED' }, (payload) => {
        const updated = payload.payload;
        if (!updated) return;
        if (currentUser && (updated.userId === currentUser.id || updated.login === currentUser.login)) {
          if (updated.status === 'BLOQUEADO') {
            sessionStorage.removeItem('currentUser');
            setCurrentUser(null);
            showFeedback('blocked', 'Acesso Revogado', 'Seu acesso foi temporariamente suspenso pela administração.');
            return;
          }
          const refreshedUser = {
            ...currentUser,
            perfil: updated.perfil || currentUser.perfil,
            setor: updated.setor || currentUser.setor,
            regional: updated.regional || currentUser.regional,
            status: updated.status || currentUser.status,
            precisa_trocar_senha: updated.precisa_trocar_senha !== undefined ? updated.precisa_trocar_senha : currentUser.precisa_trocar_senha,
            precisaTrocarSenha: updated.precisa_trocar_senha !== undefined ? updated.precisa_trocar_senha : currentUser.precisaTrocarSenha
          };
          delete refreshedUser.senha;
          setCurrentUser(refreshedUser);
          sessionStorage.setItem('currentUser', JSON.stringify(refreshedUser));
        }
      })
      .subscribe();

    broadcastChannelRef.current = bChannel;

    // Resync silencioso ao desbloquear smartphone ou trocar de aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshConfigAcessos();
        refreshOficinas();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshConfigAcessos);
    window.addEventListener('focus', refreshOficinas);

    return () => {
      supabase.removeChannel(bChannel);
      supabase.removeChannel(oficinasRealtime);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshConfigAcessos);
      window.removeEventListener('focus', refreshOficinas);
    };
  }, [currentUser, refreshConfigAcessos, refreshOficinas, showFeedback]);

  const userPermissions = useMemo(() => {
    if (!currentUser) return null;
    
    const perfilNorm = (currentUser.perfil || '').trim().toUpperCase();
    const setorNorm = (currentUser.setor || '').trim().toUpperCase();
    const isMasterAdmin = perfilNorm === 'ADMINISTRADOR' || currentUser.isAdmin === true;

    // 1. Administrador Master: Acesso Total Irrestrito
    if (isMasterAdmin) {
      return {
        modulos_visiveis: [
          'inicio', 'calendario', 'dashboard', 'chamados', 'frota', 'ociosidade_frota',
          'painel_tv', 'fidelizacao', 'entrega_equipes', 'colaboradores', 'forca',
          'historico', 'meu_perfil', 'usuarios', 'autofiscalizacao', 'wfm_despacho', 'cadastro_oficinas'
        ],
        permissoes_edicao: {
          pode_abrir_chamado: true,
          pode_cadastrar_veiculo: true,
          pode_cadastrar_colaborador: true,
          pode_montar_equipe: true,
          ver_producao_operacional: true,
          ver_indicadores_financeiros: true,
          pode_editar_acessos: true,
          pode_alterar_etapa_manual: true,
          forca_editar_colaborador: true,
          forca_editar_vagas: true,
          forca_carregar_budget: true,
          forca_carregar_forca_op: true,
          forca_formar_equipe: true
        },
        temAcessoLiberado: true
      };
    }

    // 2. Perfis operacionais diretos fixos (Mecânico)
    if (perfilNorm === 'MECANICO') {
      return {
        modulos_visiveis: ['mecanico', 'meu_perfil'],
        permissoes_edicao: {
          pode_abrir_chamado: false, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
          pode_montar_equipe: false, ver_producao_operacional: false, ver_indicadores_financeiros: false,
          pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
          forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
        },
        temAcessoLiberado: true
      };
    }

    // 3. Perfis Auditores / Inspetores
    if (perfilNorm === 'AUDITOR' || perfilNorm === 'INSPETOR') {
      return {
        modulos_visiveis: ['autofiscalizacao', 'wfm_despacho', 'meu_perfil'],
        permissoes_edicao: {
          pode_abrir_chamado: false, pode_cadastrar_veiculo: false, pode_cadastrar_colaborador: false,
          pode_montar_equipe: false, ver_producao_operacional: false, ver_indicadores_financeiros: false,
          pode_editar_acessos: false, pode_alterar_etapa_manual: false, forca_editar_colaborador: false, forca_editar_vagas: false,
          forca_carregar_budget: false, forca_carregar_forca_op: false, forca_formar_equipe: false
        },
        temAcessoLiberado: true
      };
    }

    // 4. Buscar na Matriz de Acessos salva no Supabase (configAcessos)
    const matchBanco = Array.isArray(configAcessos) ? configAcessos.find(c =>
      normalizeKey(c.setor) === normalizeKey(currentUser.setor) &&
      normalizeKey(c.perfil) === normalizeKey(currentUser.perfil)
    ) : null;

    if (matchBanco) {
      const modulosBanco = Array.isArray(matchBanco.modulos_visiveis) ? matchBanco.modulos_visiveis : [];
      const modulosOperacionais = modulosBanco.filter(m => m !== 'meu_perfil');
      if (modulosOperacionais.length === 0) {
        return {
          modulos_visiveis: [],
          permissoes_edicao: matchBanco.permissoes_edicao || {},
          temAcessoLiberado: false
        };
      }
      return {
        modulos_visiveis: Array.from(new Set([...modulosBanco, 'meu_perfil'])),
        permissoes_edicao: { ...(matchBanco.permissoes_edicao || {}) },
        temAcessoLiberado: true
      };
    }

    // 5. Buscar na Matriz Padrão de Fábrica (DEFAULT_CONFIG_ACESSOS)
    const matchDefault = DEFAULT_CONFIG_ACESSOS.find(c =>
      normalizeKey(c.setor) === normalizeKey(currentUser.setor) &&
      normalizeKey(c.perfil) === normalizeKey(currentUser.perfil)
    );

    if (matchDefault) {
      const modulosDefault = Array.isArray(matchDefault.modulos_visiveis) ? matchDefault.modulos_visiveis : [];
      const modulosOperacionais = modulosDefault.filter(m => m !== 'meu_perfil');
      if (modulosOperacionais.length === 0) {
        return {
          modulos_visiveis: [],
          permissoes_edicao: matchDefault.permissoes_edicao || {},
          temAcessoLiberado: false
        };
      }
      return {
        modulos_visiveis: Array.from(new Set([...modulosDefault, 'meu_perfil'])),
        permissoes_edicao: { ...matchDefault.permissoes_edicao },
        temAcessoLiberado: true
      };
    }

    // 6. Caso não configurado na matriz, aguardar liberação
    return {
      modulos_visiveis: [],
      permissoes_edicao: {},
      temAcessoLiberado: false
    };
  }, [currentUser, configAcessos]);




  // STATE: Theme (Light / Dark)

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');



  useEffect(() => {

    if (theme === 'dark') {

      document.documentElement.classList.add('dark');

      localStorage.setItem('theme', 'dark');

    } else {

      document.documentElement.classList.remove('dark');

      localStorage.setItem('theme', 'light');

    }

  }, [theme]);



  // STATE: Welcome Release Modal
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

  // STATE: Data

  const [rawVehicles, setRawVehicles] = useState(initialVehicles);
  const [laudosGeral, setLaudosGeral] = useState([]);

  const [rawChamados, setRawChamados] = useState(initialChamados);

  const [rawColaboradores, setRawColaboradores] = useState(forcaData);

  

  // STATE: Multi-Regional

  const [activeRegional, setActiveRegional] = useState(

      (['Global'].includes(currentUser?.regional) || ['ADMINISTRADOR', 'GERENTE'].includes(currentUser?.perfil)) ? 'Todas' : (currentUser?.regional || 'Norte')

  );



  const vehicles = useMemo(() => {
     if (activeRegional === 'Todas') return rawVehicles;
     const targetRegion = (activeRegional || '').toLowerCase();
     return rawVehicles.filter(v => (v.regional || '').toLowerCase() === targetRegion);
  }, [rawVehicles, activeRegional]);

  const vehiclesMap = useMemo(() => new Map(vehicles.map(v => [v.placa, v])), [vehicles]);

  const chamados = useMemo(() => {
     if (activeRegional === 'Todas' || activeRegional === 'Global') return rawChamados;
     const targetRegion = (activeRegional || '').trim().toLowerCase();
     return rawChamados.filter(c => (c.regional || '').trim().toLowerCase() === targetRegion);
  }, [rawChamados, activeRegional]);

  const colaboradores = useMemo(() => {
     const normalized = (rawColaboradores || []).map(normalizeColaborador);
     if (activeRegional === 'Todas') return normalized;
     const targetRegion = (activeRegional || '').toLowerCase();
     return normalized.filter(c => 
       (c.regional || '').toLowerCase().includes(targetRegion) ||
       (c.base_ut || '').toLowerCase().includes(targetRegion)
     );
  }, [rawColaboradores, activeRegional]);

  const [vinculosEquipe, setVinculosEquipe] = useState({});

  const [loadingDb, setLoadingDb] = useState(true);

  // Sync with Supabase on mount
  useEffect(() => {
    async function fetchData() {
      setLoadingDb(true);

      const { data: usersData } = await supabase.from('usuarios').select('*');
      const { data: vehiclesData } = await supabase.from('veiculos').select('*');
      const { data: laudosData } = await supabase.from('veiculo_laudos').select('*').order('data_inclusao', { ascending: false });
      if (laudosData) setLaudosGeral(laudosData);

      // Busca otimizada de chamados (campos selecionados + ordenação JS para máxima performance)
      const fieldsChamados = 'id,placa,numero,dataAbertura,dataHoraFechamento,situacaoVeiculo,oficinaExterna,status,pendencia,defeitoEncontrado,motorista,defeitoPrincipal,etapaWorkflow,naoImpeditivo,prejuizoAcumulado,oficinaDestino,regional,codigoChamado,alertas';
      let cData = null;
      let cErr = null;

      try {
        const res = await supabase.from('chamados').select(fieldsChamados).limit(1000);
        cData = res.data;
        cErr = res.error;
      } catch (err) {
        cErr = err;
      }

      if (cErr) {
        console.warn('Aviso no carregamento de chamados:', cErr);
      }

      const chamadosData = (cData || []).sort((a, b) => (b.id || 0) - (a.id || 0));

      // Paginated fetch to bypass Supabase default 1000 rows limit
      let allBaseUni = [];
      let pageIndex = 0;
      let hasMoreUni = true;
      while (hasMoreUni) {
        const { data: pData, error: pErr } = await supabase
          .from('base_unificada')
          .select('*')
          .range(pageIndex * 1000, (pageIndex + 1) * 1000 - 1);
        if (pErr) break;
        if (pData && pData.length > 0) {
          allBaseUni = [...allBaseUni, ...pData];
          if (pData.length < 1000) hasMoreUni = false;
          else pageIndex++;
        } else {
          hasMoreUni = false;
        }
      }

      const { data: colabDataLegacy } = await supabase.from('colaboradores').select('*');
      const colabData = (allBaseUni && allBaseUni.length > 0) ? allBaseUni : colabDataLegacy;

      const { data: configData } = await supabase.from('config_acessos').select('*');

      if (usersData && usersData.length > 0) setUsers(usersData);
      if (vehiclesData && vehiclesData.length > 0) setRawVehicles(vehiclesData);
      if (colabData && colabData.length > 0) setRawColaboradores(colabData.map(normalizeColaborador));
      if (configData && configData.length > 0) setConfigAcessos(configData);

      if (chamadosData && chamadosData.length > 0) {

        const mappedChamados = chamadosData.map(c => {

          let etapa = c.etapaWorkflow;

          if (!etapa || etapa === 'Aguardando Manutenção') {

            etapa = c.status === 'RESOLVIDO' ? 'RESOLVIDO' : 'Análise Frota';

          }

          if (etapa === 'Aguardando Descarregamento' || etapa === 'Aguardando Descarrego') {

            etapa = 'Aguardando Desequipar';

          }

          return {

            ...c,

            etapaWorkflow: etapa,

            dadosWorkflow: c.dadosWorkflow || {}

          };

        });

        setRawChamados(mappedChamados);

      }

      if (colabData && colabData.length > 0) setRawColaboradores(colabData);

      

      setLoadingDb(false);

    }

    fetchData();



    // --- REALTIME SUBSCRIPTIONS ---

    const chamadosChannel = supabase

      .channel('realtime-chamados')

      .on(

        'postgres_changes',

        { event: '*', schema: 'public', table: 'chamados' },

        (payload) => {

          if (payload.eventType === 'INSERT') {

            let etapa = payload.new.etapaWorkflow;

            if (!etapa || etapa === 'Aguardando Manutenção') {

              etapa = 'Análise Frota';

            }

            if (etapa === 'Aguardando Descarregamento' || etapa === 'Aguardando Descarrego') {

              etapa = 'Aguardando Desequipar';

            }

            const newChamado = {

              ...payload.new,

              etapaWorkflow: etapa,

              dadosWorkflow: payload.new.dadosWorkflow || {}

            };

            setRawChamados(prev => {

              if (prev.some(c => c.id === newChamado.id)) return prev;

              return [newChamado, ...prev];

            });

          } else if (payload.eventType === 'UPDATE') {

            let etapa = payload.new.etapaWorkflow;

            if (!etapa || etapa === 'Aguardando Manutenção') {

              etapa = 'Análise Frota';

            }

            if (etapa === 'Aguardando Descarregamento' || etapa === 'Aguardando Descarrego') {

              etapa = 'Aguardando Desequipar';

            }

            setRawChamados(prev => prev.map(c => {
              if (c.id === payload.new.id) {
                return {
                  ...c,
                  ...payload.new,
                  etapaWorkflow: etapa,
                  dadosWorkflow: payload.new.dadosWorkflow || c.dadosWorkflow || {}
                };
              }
              return c;
            }));

          } else if (payload.eventType === 'DELETE') {

            setRawChamados(prev => prev.filter(c => c.id !== payload.old.id));

          }

        }

      )

      .subscribe();



    const veiculosChannel = supabase

      .channel('realtime-veiculos')

      .on(

        'postgres_changes',

        { event: '*', schema: 'public', table: 'veiculos' },

        (payload) => {

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {

            setRawVehicles(prev => {

              const exists = prev.some(v => v.id === payload.new.id);

              if (exists) {

                return prev.map(v => v.id === payload.new.id ? { ...v, ...payload.new } : v);

              } else {

                return [...prev, payload.new];

              }

            });

          } else if (payload.eventType === 'DELETE') {

            setRawVehicles(prev => prev.filter(v => v.id !== payload.old.id));

          }

        }

      )

      .subscribe();



    const colabChannel = supabase
      .channel('realtime-base-unificada-colaboradores')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'base_unificada' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setRawColaboradores(prev => {
              const keyNew = payload.new.matricula || payload.new.id;
              const exists = prev.some(c => (c.matricula && c.matricula === keyNew) || c.id === keyNew);
              if (exists) {
                return prev.map(c => ((c.matricula && c.matricula === keyNew) || c.id === keyNew) ? normalizeColaborador({ ...c, ...payload.new }) : c);
              } else {
                return [normalizeColaborador(payload.new), ...prev];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setRawColaboradores(prev => prev.filter(c => (c.matricula && c.matricula !== payload.old.matricula) && c.id !== payload.old.id));
          }
        }
      )
      .subscribe();



    const usuariosChannel = supabase
      .channel('realtime-usuarios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setUsers(prev => {
              const exists = prev.some(u => u.id === payload.new.id);
              if (exists) {
                return prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u);
              } else {
                return [...prev, payload.new];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setUsers(prev => prev.filter(u => u.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const configAcessosChannel = supabase
      .channel('realtime-config-acessos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'config_acessos' },
        async () => {
          const { data } = await supabase.from('config_acessos').select('*');
          if (data && Array.isArray(data)) {
            setConfigAcessos(data);
            try {
              localStorage.setItem('fleet_config_acessos_cache', JSON.stringify(data));
            } catch (e) {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chamadosChannel);
      supabase.removeChannel(veiculosChannel);
      supabase.removeChannel(colabChannel);
      supabase.removeChannel(usuariosChannel);
      supabase.removeChannel(configAcessosChannel);
    };

  }, []);



  // Helper for background Supabase updates

  const syncToSupabase = async (table, data) => {

    try {
      const payload = { ...data };
      delete payload.silentSave; // remove frontend-only flag

      if (table === 'chamados') {
        if (payload.dataAbertura && typeof payload.dataAbertura === 'string' && !payload.dataAbertura.includes('Z') && !payload.dataAbertura.includes('+')) {
          const d = new Date(payload.dataAbertura);
          if (!isNaN(d.getTime())) payload.dataAbertura = d.toISOString();
        }
        if (payload.dataHoraFechamento && typeof payload.dataHoraFechamento === 'string' && !payload.dataHoraFechamento.includes('Z') && !payload.dataHoraFechamento.includes('+')) {
          const d = new Date(payload.dataHoraFechamento);
          if (!isNaN(d.getTime())) payload.dataHoraFechamento = d.toISOString();
        }

        if (payload.hodometro !== undefined) {
          payload.dadosWorkflow = {
            ...(payload.dadosWorkflow || {}),
            hodometro: payload.hodometro
          };
          delete payload.hodometro;
        }
        if (payload.fotosChamado) {
          payload.dadosWorkflow = {
            ...(payload.dadosWorkflow || {}),
            fotosChamado: payload.fotosChamado
          };
          delete payload.fotosChamado;
        }
        delete payload.motoristaOutro;
      }

      if (table === 'colaboradores' || table === 'base_unificada') {
        const buPayload = { ...payload };
        delete buPayload.base_contrato;
        await supabase.from('base_unificada').upsert(buPayload, { onConflict: 'matricula' }).then(() => {}).catch(() => {});
        await supabase.from('colaboradores').upsert(payload).then(() => {}).catch(() => {});
        return;
      }

      if (table === 'usuarios') {
        const userPayload = { ...payload };
        if (userPayload.id) {
          const { error: updateErr } = await supabase.from('usuarios').update(userPayload).eq('id', userPayload.id);
          if (updateErr) {
            console.error(`Error updating usuarios:`, updateErr);
            alert(`Erro ao salvar no banco (usuarios): ` + updateErr.message);
          }
          return;
        } else if (userPayload.login) {
          const { error: updateErr } = await supabase.from('usuarios').update(userPayload).eq('login', userPayload.login);
          if (updateErr) {
            console.error(`Error updating usuarios:`, updateErr);
            alert(`Erro ao salvar no banco (usuarios): ` + updateErr.message);
          }
          return;
        }
      }

      const { error } = await supabase.from(table).upsert(payload);

      if (error) {
         console.error(`Error syncing ${table}:`, error);
         alert(`Erro ao salvar no banco (${table}): ` + error.message);
      }

    } catch (err) {

      console.error(err);
      alert('Erro inesperado de conexão com o banco.');

    }

  };



  const deleteFromSupabase = async (table, id) => {
    try {
      if (table === 'colaboradores' || table === 'base_unificada') {
        await supabase.from('base_unificada').delete().or(`id.eq.${id},matricula.eq.${id}`);
        await supabase.from('colaboradores').delete().or(`id.eq.${id},matricula.eq.${id}`);
        return;
      }
      await supabase.from(table).delete().eq('id', id);

    } catch (err) {

      console.error(err);

    }

  };

  

  // STATE: UI

  const [activeTab, setActiveTab] = useState('inicio');

  // Device detection for mobile/tablet PWA
  const { isMobile, isTablet } = useDeviceDetect();

  useEffect(() => {
    if (currentUser?.perfil?.toUpperCase() === 'MECANICO' && activeTab !== 'mecanico' && activeTab !== 'meu_perfil') {
      setActiveTab('mecanico');
    }
  }, [currentUser, activeTab]);

  const [isNovoChamadoModalOpen, setIsNovoChamadoModalOpen] = useState(false);

  const [isNovoVeiculoModalOpen, setIsNovoVeiculoModalOpen] = useState(false);

  const [isNovoColaboradorModalOpen, setIsNovoColaboradorModalOpen] = useState(false);

  const [chamadoEmEdicao, setChamadoEmEdicao] = useState(null);

  const [chamadoParaLiberar, setChamadoParaLiberar] = useState(null);

  const [chamadoRecemCriado, setChamadoRecemCriado] = useState(null);

  const [pendingLiberacaoImpeditiva, setPendingLiberacaoImpeditiva] = useState(null);

  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [selectedColaborador, setSelectedColaborador] = useState(null);



  const hoje = new Date();



  // Persistência local mínima

  useEffect(() => { 
    if (currentUser) {
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); 
    } else {
      sessionStorage.removeItem('currentUser');
    }
    if (currentUser?.id || currentUser?.login) {
      const uId = currentUser.id || currentUser.login;
      const shouldAutoShow = checkShouldAutoShowReleaseModal(uId);
      if (shouldAutoShow) {
        const sessionDismissed = sessionStorage.getItem('welcome_modal_dismissed_' + uId);
        if (!sessionDismissed) {
          setIsWelcomeModalOpen(true);
        }
      }
    }
  }, [currentUser]);



  // Redirecionamento e proteção de abas ativas
  useEffect(() => {
    if (!currentUser) return;
    const isMaster = (currentUser.perfil || '').toUpperCase() === 'ADMINISTRADOR' || currentUser.isAdmin === true;
    if (isMaster) return;

    if (currentUser?.perfil === 'FROTA' && ['dashboard', 'ociosidade_frota', 'fidelizacao', 'colaboradores', 'forca', 'usuarios'].includes(activeTab)) {
      setActiveTab('chamados');
      return;
    }

    if (['AUDITOR', 'INSPETOR'].includes(currentUser?.perfil?.toUpperCase()) && activeTab !== 'autofiscalizacao' && activeTab !== 'meu_perfil') {
      setActiveTab('autofiscalizacao');
      return;
    }

    if (userPermissions && Array.isArray(userPermissions.modulos_visiveis) && userPermissions.modulos_visiveis.length > 0) {
      if (!userPermissions.modulos_visiveis.includes(activeTab) && !['detalhes_veiculo', 'detalhes_colaborador'].includes(activeTab)) {
        const fallbackTab = userPermissions.modulos_visiveis[0] || 'meu_perfil';
        setActiveTab(fallbackTab);
      }
    }
  }, [currentUser, activeTab, userPermissions]);





  // Auth Handlers & Sync em Tempo Real de Permissões
  useEffect(() => {
    if (currentUser && users.length > 0 && !loadingDb) {
      const dbUser = users.find(u => u.id === currentUser.id);
      if (dbUser) {
        if (dbUser.status === 'BLOQUEADO') {
          sessionStorage.removeItem('currentUser');
          setCurrentUser(null);
          showFeedback('blocked', 'Acesso Revogado', 'Seu acesso foi temporariamente suspenso pela administração.');
        } else if (
          String(dbUser.perfil) !== String(currentUser.perfil) ||
          String(dbUser.regional) !== String(currentUser.regional) ||
          String(dbUser.setor) !== String(currentUser.setor) ||
          Boolean(dbUser.precisa_trocar_senha) !== Boolean(currentUser.precisa_trocar_senha)
        ) {
          // Atualiza em tempo real a sessão e estado do usuário logado SEM deslogar!
          const refreshed = {
            ...currentUser,
            perfil: dbUser.perfil,
            regional: dbUser.regional,
            setor: dbUser.setor,
            status: dbUser.status,
            precisa_trocar_senha: dbUser.precisa_trocar_senha,
            precisaTrocarSenha: dbUser.precisaTrocarSenha
          };
          delete refreshed.senha;
          setCurrentUser(refreshed);
          sessionStorage.setItem('currentUser', JSON.stringify(refreshed));
        }
      }
    }
  }, [users, currentUser, loadingDb, showFeedback]);

  const handleLogin = async (loginInput, senhaInput) => {
    if (isLoggingIn) return;
    const cleanLogin = (loginInput || '').trim().toLowerCase();
    const now = Date.now();

    // 1. Rate Limiting Check (5 falhas consecutivas -> 30s lock)
    const userAttempt = loginAttempts[cleanLogin] || { count: 0, lockedUntil: 0 };
    if (userAttempt.lockedUntil > now) {
      const remainingSec = Math.ceil((userAttempt.lockedUntil - now) / 1000);
      showFeedback(
        'warning',
        'Tentativas Excedidas',
        `Muitas tentativas incorretas. Por segurança, aguarde ${remainingSec} segundos para tentar novamente.`
      );
      return;
    }

    setIsLoggingIn(true);
    try {
      // 2. Consulta Direta e Assíncrona ao Supabase (Zero dependência de cache em memória!)
      const { data: dbUser, error } = await supabase
        .from('usuarios')
        .select('*')
        .ilike('login', cleanLogin)
        .maybeSingle();

      if (error) {
        console.error('Erro ao autenticar no Supabase:', error);
        showFeedback('error', 'Falha de Conexão', 'Não foi possível conectar ao servidor de autenticação. Verifique sua internet.');
        setIsLoggingIn(false);
        return;
      }

      if (!dbUser) {
        const newCount = userAttempt.count + 1;
        const isLocked = newCount >= 5;
        setLoginAttempts(prev => ({
          ...prev,
          [cleanLogin]: {
            count: newCount,
            lockedUntil: isLocked ? Date.now() + 30000 : 0
          }
        }));
        showFeedback('error', 'Credenciais Inválidas', 'Usuário ou senha incorretos. Verifique os dados digitados.');
        setIsLoggingIn(false);
        return;
      }

      // 3. Verificação Criptográfica com Lazy Migration
      const verification = await verifyPassword(senhaInput, dbUser.senha);
      if (!verification.isValid) {
        const newCount = userAttempt.count + 1;
        const isLocked = newCount >= 5;
        setLoginAttempts(prev => ({
          ...prev,
          [cleanLogin]: {
            count: newCount,
            lockedUntil: isLocked ? Date.now() + 30000 : 0
          }
        }));
        showFeedback('error', 'Credenciais Inválidas', 'Usuário ou senha incorretos. Verifique os dados digitados.');
        setIsLoggingIn(false);
        return;
      }

      // Reset login attempts
      setLoginAttempts(prev => ({ ...prev, [cleanLogin]: { count: 0, lockedUntil: 0 } }));

      // 4. Verificação de Status do Usuário
      if (dbUser.status === 'PENDENTE') {
        showFeedback(
          'pending',
          'Acesso Pendente de Liberação',
          'Sua solicitação de cadastro está em análise pela Gestão/Administração. Assim que aprovada, seu acesso estará disponível.'
        );
        setIsLoggingIn(false);
        return;
      }

      if (dbUser.status === 'BLOQUEADO') {
        showFeedback(
          'blocked',
          'Acesso Bloqueado',
          'Seu usuário foi temporariamente bloqueado. Contate o administrador ou gestor da sua área.'
        );
        setIsLoggingIn(false);
        return;
      }

      // 5. Lazy Migration: Atualiza senha legada em texto puro para SHA-256 no banco
      if (verification.isLegacy) {
        try {
          const newHash = await hashPassword(senhaInput);
          await supabase.from('usuarios').update({ senha: newHash }).eq('id', dbUser.id);
        } catch (e) {
          console.warn('Erro ao atualizar hash de senha legada:', e);
        }
      }

      // 6. Atualizar data de último login de forma dinâmica e segura
      const agoraIso = new Date().toISOString();
      const loginUpdatePayload = {};
      if ('ultimo_login' in dbUser) loginUpdatePayload.ultimo_login = agoraIso;
      if ('ultimoLogin' in dbUser) loginUpdatePayload.ultimoLogin = agoraIso;
      if ('ultimologin' in dbUser) loginUpdatePayload.ultimologin = agoraIso;
      if ('updated_at' in dbUser) loginUpdatePayload.updated_at = agoraIso;

      if (Object.keys(loginUpdatePayload).length > 0) {
        supabase.from('usuarios').update(loginUpdatePayload).eq('id', dbUser.id).then(() => {}).catch(() => {});
      }

      // 7. Sanitizar sessão (NUNCA salvar senha no estado/storage)
      const userSession = {
        ...dbUser,
        ultimoLogin: agoraIso,
        ultimo_login: agoraIso
      };
      delete userSession.senha;

      setCurrentUser(userSession);
      setActiveRegional((['Global'].includes(userSession.regional) || ['ADMINISTRADOR', 'GERENTE'].includes(userSession.perfil)) ? 'Todas' : (userSession.regional || 'Norte'));
      sessionStorage.setItem('currentUser', JSON.stringify(userSession));

      // Atualizar lista local de usuários
      setUsers(prev => {
        const exists = prev.some(u => u.id === dbUser.id);
        return exists ? prev.map(u => u.id === dbUser.id ? userSession : u) : [...prev, userSession];
      });

    } catch (err) {
      console.error('Erro inesperado no login:', err);
      showFeedback('error', 'Falha no Login', 'Ocorreu um erro inesperado ao realizar o login.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (novoUser) => {
    try {
      const cleanEmail = (novoUser.login || '').trim().toLowerCase();
      if (!cleanEmail.endsWith('@alpitelbrasil.com.br')) {
        showFeedback('warning', 'E-mail Corporativo Requerido', 'O e-mail deve pertencer ao domínio corporativo @alpitelbrasil.com.br');
        return;
      }

      const pwdValidation = validatePasswordStrength(novoUser.senha);
      if (!pwdValidation.isValid) {
        showFeedback('warning', 'Senha Frágil', pwdValidation.message);
        return;
      }

      // 1. Verificar se o e-mail já existe
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id, login')
        .ilike('login', cleanEmail)
        .maybeSingle();

      if (existingUser) {
        showFeedback('warning', 'Usuário já Cadastrado', 'Este e-mail corporativo já possui uma solicitação ou conta cadastrada no sistema.');
        return;
      }

      // 2. Criptografar a senha com SHA-256 + Salt
      const hashedPassword = await hashPassword(novoUser.senha);

      const newUserRecord = {
        id: Date.now(),
        nome: (novoUser.nome || '').trim().toUpperCase(),
        login: cleanEmail,
        senha: hashedPassword,
        perfil: 'SUPERVISOR',
        status: 'PENDENTE',
        regional: 'Norte',
        setor: 'Operações'
      };

      const { error } = await supabase.from('usuarios').upsert(newUserRecord);
      if (error) {
        console.error('Erro ao cadastrar usuário:', error);
        showFeedback('error', 'Erro no Cadastro', 'Não foi possível registrar seu acesso: ' + error.message);
        return;
      }

      // Notificar via Broadcast Real-Time para administradores conectados
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'USER_REGISTERED',
          payload: { userId: newUserRecord.id, login: newUserRecord.login, nome: newUserRecord.nome }
        });
      }

      showFeedback(
        'success',
        'Solicitação Enviada com Sucesso!',
        'Seu cadastro corporativo foi registrado com sucesso e encaminhado para validação do Administrador. Aguarde a liberação para acessar.'
      );
    } catch (err) {
      console.error('Erro inesperado no cadastro:', err);
      showFeedback('error', 'Falha no Cadastro', 'Ocorreu um erro inesperado ao solicitar o cadastro.');
    }
  };

  const handleExportExcel = () => {

    try {

      const dataToExport = vehicles.map(v => {

        const fidelizacao = v.equipes && v.equipes.length > 0 

          ? v.equipes.map(eq => String(eq.codEquipe).toUpperCase()).join(', ') 

          : 'NÃO FIDELIZADO';

        

        const smartAssociado = v.smart 

          ? `${v.smart.marca} ${v.smart.modelo} (${v.smart.telefone})` 

          : 'NÃO ASSOCIADO';

          

        const smartPulsus = v.smart ? v.smart.codPulsus : '';



        const chamadosDoVeiculo = chamados.filter(c => c.placa === v.placa);

        const prejuizoAcumuladoTotal = chamadosDoVeiculo.reduce((acc, c) => acc + getPrejuizoChamado(c, v, hoje), 0);




        const vLaudos = laudosGeral ? laudosGeral.filter(l => l.veiculo_placa === v.placa) : [];
        const getValidade = (categoria) => {
            const catLaudos = vLaudos.filter(l => l.categoria.includes(categoria));
            if (catLaudos.length === 0) return 'FALTANDO';
            catLaudos.sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento));
            return new Date(catLaudos[0].data_vencimento).toLocaleDateString('pt-BR');
        };
        
        let statusGeral = 'OK';
        let obrigatorios = ['CRLV'];
        const vTipoStr = String(v.tipo).toUpperCase();
        if (vTipoStr.includes('CESTO') || vTipoStr.includes('MUNK')) {
            obrigatorios = ['CRLV', 'Acústico', 'Liner', 'Lança'];
        }
        
        let minDias = Infinity;
        for (const req of obrigatorios) {
            const lds = vLaudos.filter(l => l.categoria.includes(req.replace('Acústico', 'Ac')));
            if (lds.length === 0) {
                statusGeral = 'S/ LAUDOS';
                break;
            }
            lds.sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento));
            const dias = Math.ceil((new Date(lds[0].data_vencimento) - new Date()) / (1000 * 60 * 60 * 24));
            if (dias < minDias) minDias = dias;
        }
        
        if (statusGeral !== 'S/ LAUDOS') {
            if (minDias < 0) statusGeral = 'VENCIDO';
            else if (minDias <= 15) statusGeral = 'PRA VENCER (<= 15d)';
            else statusGeral = 'OK';
        }

        return {

          'Regional': v.regional || 'Norte', 'Placa': v.placa,

          'Marca': v.marca || '',

          'Tipo de Contrato': v.tipoContrato || '',
          'Dt Início Contrato': v.dtInicioContrato || '',
          'Valor Contrato (R$)': v.valorContrato || '',

          'Status Laudos': statusGeral,
          'Validade CRLV': getValidade('CRLV'),
          'Validade Acústico': getValidade('Ac'),
          'Validade Liner': getValidade('Liner'),
          'Validade Cesto': getValidade('Cesto'),

          'Turno': v.turno || '',

          'Tipo': v.tipo || '',

          'Sub Tipo': v.subTipo || '',

          'Tipo OP': v.tipoOp || '',

          'Implemento': v.implemento || '',

          'Locadora': v.locadora || '',

          'Situação': v.situacao || '',

          'Status': v.status || '',

          'Fidelização (Equipes)': fidelizacao,

          'SMART Associado': smartAssociado,

          'SMART Código Pulsus': smartPulsus,

          'Prejuízo Acumulado Total (R$)': Number(prejuizoAcumuladoTotal.toFixed(2))

        };

      });



      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Veiculos");

      

      const maxLens = {};

      dataToExport.forEach(row => {

        Object.keys(row).forEach(key => {

          const valStr = String(row[key] || '');

          maxLens[key] = Math.max(maxLens[key] || 10, valStr.length, key.length);

        });

      });

      worksheet['!cols'] = Object.keys(maxLens).map(key => ({

        wch: maxLens[key] + 3

      }));



      XLSX.writeFile(workbook, `Base_de_Dados_Veiculos_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (err) {

      console.error("Erro ao exportar Excel:", err);

      alert("Erro ao exportar banco de dados para o Excel.");

    }

  };



  const handleLogout = () => {
    if (currentUser?.id || currentUser?.login) {
      const uId = currentUser.id || currentUser.login;
      sessionStorage.removeItem('welcome_modal_dismissed_' + uId);
    }
    sessionStorage.removeItem('currentUser');
    setCurrentUser(null);
    setIsWelcomeModalOpen(false);
  };

  // Idle Timeout Logic:
  // - Para Usuários Padrão: 1 hora de inatividade (3.600.000 ms)
  // - Para Auditores/Inspetores: Sem expiração ao longo do dia! Na virada do dia (00:00), se inativo, expira; se ativo, renova automaticamente!
  useEffect(() => {
    if (!currentUser) return;
    
    // Regra de Exceção: O painel de TV não deve deslogar nunca
    if (currentUser.login?.toLowerCase() === 'painel.tv@alpitelbrasil.com.br') return;

    const perfilNorm = (currentUser.perfil || '').trim().toUpperCase();
    const setorNorm = (currentUser.setor || '').trim().toUpperCase();
    const isAuditorUser = ['AUDITOR', 'INSPETOR', 'AUTOFISCALIZACAO', 'CAMPO'].includes(perfilNorm) || ['AUTOFISCALIZAÇÃO', 'AUTOFISCALIZACAO'].includes(setorNorm);

    let lastActivity = Date.now();
    let timeoutId;
    let midnightCheckInterval;
    let handleVis;

    const expireSession = (reason = '1 hora de inatividade') => {
      handleLogout();
      showFeedback(
        'warning',
        'Sessão Expirada',
        `Sua sessão foi encerrada (${reason}). Por segurança e para garantir a versão mais recente do sistema, realize o login novamente.`
      );
    };

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    // Eventos de atividade do usuário
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, updateActivity, { passive: true }));

    if (isAuditorUser) {
      // ═════════════════════════════════════════════════════════════════════
      // 🛡️ REGRA ESPECIAL PARA AUDITORES: Sem deslogar ao longo do dia!
      // ═════════════════════════════════════════════════════════════════════
      console.log('[Sessão Auditor] Modo de Sessão Contínua Ativo (Sem timeout de 1h)');
      let lastCheckedDay = new Date().getDate();

      midnightCheckInterval = setInterval(() => {
        const now = new Date();
        const currentDay = now.getDate();

        if (currentDay !== lastCheckedDay) {
          lastCheckedDay = currentDay;
          const inactiveMs = Date.now() - lastActivity;
          const IS_INACTIVE_LIMIT = 60 * 60 * 1000; // Inativo por mais de 1h antes da meia-noite

          if (inactiveMs >= IS_INACTIVE_LIMIT) {
            console.log('[Sessão Auditor] Virada do dia (00:00) - Auditor inativo. Encerrando sessão.');
            expireSession('na virada do dia (00:00) por inatividade');
          } else {
            console.log('[Sessão Auditor] Virada do dia (00:00) - Auditor ativo! Sessão renovada automaticamente.');
          }
        }
      }, 60000);

    } else {
      // ═════════════════════════════════════════════════════════════════════
      // 👤 REGRA PADRÃO PARA DEMAIS PERFIS: 1 hora de inatividade
      // ═════════════════════════════════════════════════════════════════════
      const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hora

      const checkAndResetTimer = () => {
        const now = Date.now();
        if (now - lastActivity >= INACTIVITY_LIMIT_MS) {
          expireSession('após 1 hora de inatividade');
          return;
        }
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          expireSession('após 1 hora de inatividade');
        }, INACTIVITY_LIMIT_MS);
      };

      handleVis = () => {
        if (document.visibilityState === 'visible') {
          const now = Date.now();
          if (now - lastActivity >= INACTIVITY_LIMIT_MS) {
            expireSession('após 1 hora de inatividade');
          }
        }
      };

      document.addEventListener('visibilitychange', handleVis);
      window.addEventListener('focus', handleVis);
      checkAndResetTimer();
    }

    return () => {
      events.forEach(ev => window.removeEventListener(ev, updateActivity));
      clearTimeout(timeoutId);
      if (midnightCheckInterval) clearInterval(midnightCheckInterval);
      if (handleVis) {
        document.removeEventListener('visibilitychange', handleVis);
        window.removeEventListener('focus', handleVis);
      }
    };
  }, [currentUser, showFeedback]);




  const isGerente = currentUser?.perfil === 'GERENTE';

  const isCoordenador = currentUser?.perfil === 'COORDENADOR';

  const isAdminOrCoord = isGerente || isCoordenador || currentUser?.perfil === 'ADMINISTRADOR';



  // Business Logic

  const handleWorkflowTransition = (chamadoId, novaEtapa, logDesc, extras = {}) => {

    const antigo = chamados.find(c => c.id === chamadoId);

    if (!antigo) return;



    const novoLog = {

      id: Date.now(),

      dataHora: hoje.toISOString(),

      usuario: currentUser?.nome || 'Sistema',

      descricao: logDesc

    };



    const { dadosWorkflow: extrasDadosWorkflow, ...outrosExtras } = extras;

    const chamadoFinal = {

      ...antigo,

      etapaWorkflow: novaEtapa,

      dadosWorkflow: {

        ...(antigo.dadosWorkflow || {}),

        ...(extrasDadosWorkflow || {}),

        timestamps: {

          ...(antigo.dadosWorkflow?.timestamps || {}),

          ...(extrasDadosWorkflow?.timestamps || {}),

          [novaEtapa]: hoje.toISOString()

        }

      },

      historicoModificacoes: [novoLog, ...(antigo.historicoModificacoes || [])],

      ...outrosExtras

    };



    if (chamadoFinal.dadosWorkflow.dadosWorkflow) {

      delete chamadoFinal.dadosWorkflow.dadosWorkflow;

    }



    if (novaEtapa === 'RESOLVIDO') {

      chamadoFinal.status = 'RESOLVIDO';

      chamadoFinal.dataHoraFechamento = hoje.toISOString();

    } else {

      chamadoFinal.status = 'ABERTO';

    }

    const vForPrejuizo = vehiclesMap.get(chamadoFinal.placa);

    chamadoFinal.prejuizoAcumulado = getPrejuizoChamado(chamadoFinal, vForPrejuizo, chamadoFinal.dataHoraFechamento || hoje);



    const novosChamados = chamados.map(c => c.id === chamadoId ? chamadoFinal : c);

    setRawChamados(novosChamados);

    syncToSupabase('chamados', chamadoFinal);



    // Atualiza status do veículo

    const vecAlterado = vehiclesMap.get(chamadoFinal.placa);

    if (vecAlterado) {

       let vecFinal;

       if (novaEtapa === 'RESOLVIDO') {

          vecFinal = { ...vecAlterado, situacao: 'RODANDO', status: 'DISPONIVEL' };

       } else if (novaEtapa === 'Liberado Operação') {

          vecFinal = { ...vecAlterado, situacao: 'RODANDO', status: 'MANUTENÇÃO' };

       } else if (novaEtapa === 'Análise Frota') {

          vecFinal = { ...vecAlterado, situacao: chamadoFinal.situacaoVeiculo || 'RODANDO', status: 'ANÁLISE FROTA' };

       } else if (novaEtapa === 'Oficina Interna') {

          vecFinal = { ...vecAlterado, situacao: chamadoFinal.situacaoVeiculo || 'RODANDO', status: 'OFICINA INTERNA' };

       } else {

          vecFinal = { ...vecAlterado, situacao: chamadoFinal.situacaoVeiculo || 'RODANDO', status: 'MANUTENÇÃO' };

       }

       setRawVehicles(rawVehicles.map(v => v.placa === chamadoFinal.placa ? vecFinal : v));

       syncToSupabase('veiculos', vecFinal);

    }



    setChamadoEmEdicao(null);

    setIsNovoChamadoModalOpen(false);

  };



  const handleSalvarChamado = (dadosChamado) => {

    let chamadoFinal;

    let chamadosAtuais = [...rawChamados];



    if (pendingLiberacaoImpeditiva && !chamadoEmEdicao?.id) {

       const oldId = pendingLiberacaoImpeditiva.chamadoId;

       const antigo = chamadosAtuais.find(c => c.id === oldId);

       if (antigo) {

          const logs = [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser?.nome || 'Sistema', descricao: `Veículo Manteve-se Parado. Novo Chamado: ${dadosChamado.numero}. Defeito: ${pendingLiberacaoImpeditiva.defeitoPrincipal}` }, ...(antigo.historicoModificacoes || [])];

          const vClosed = vehiclesMap.get(antigo.placa);

          const chamadoFechado = { 

            ...antigo, 

            status: 'RESOLVIDO', 

            dataHoraFechamento: pendingLiberacaoImpeditiva.dataHoraFechamento, 

            pendencia: pendingLiberacaoImpeditiva.pendencia, 

            historicoModificacoes: logs,

            prejuizoAcumulado: getPrejuizoChamado({ ...antigo, dataHoraFechamento: pendingLiberacaoImpeditiva.dataHoraFechamento }, vClosed, pendingLiberacaoImpeditiva.dataHoraFechamento)

          };

          chamadosAtuais = chamadosAtuais.map(c => c.id === oldId ? chamadoFechado : c);

          syncToSupabase('chamados', chamadoFechado);

       }

       setPendingLiberacaoImpeditiva(null);

    }



    const antigo = dadosChamado.id ? chamadosAtuais.find(c => c.id === dadosChamado.id) : null;
    if (antigo) {

      // Edição

      const mapeamento = { placa: 'Placa', numero: 'Nº Chamado', dataAbertura: 'Data Abertura', situacaoVeiculo: 'Situação (Parado/Rodando)', oficinaExterna: 'Oficina Externa' };

      const diffStr = gerarLogDePara(antigo, dadosChamado, mapeamento);

      

      let logs = antigo.historicoModificacoes || [];

      if (diffStr) logs = [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser?.nome || 'Sistema', descricao: `Edição: ${diffStr}` }, ...logs];

      

      const vEdit = vehiclesMap.get(dadosChamado.placa);

      chamadoFinal = { 

        ...antigo, 

        ...dadosChamado, 

        historicoModificacoes: logs,

        prejuizoAcumulado: getPrejuizoChamado(dadosChamado, vEdit, dadosChamado.dataHoraFechamento || hoje)

      };

      chamadosAtuais = chamadosAtuais.map(c => c.id === dadosChamado.id ? chamadoFinal : c);

    } else {

      // Criação

      const vCreate = rawVehicles.find(vec => vec.placa === dadosChamado.placa);

      const _chamadoId = Date.now();
      const _codigoChamado = 'ALP.M-' + String(_chamadoId).slice(-6);
      chamadoFinal = { 

        ...dadosChamado, id: _chamadoId, codigoChamado: _codigoChamado, status: 'ABERTO', dataHoraFechamento: null, pendencia: '', naoImpeditivo: false,
        // Retrocompatibilidade: campos legados do primeiro defeito
        numero: (dadosChamado.defeitos && dadosChamado.defeitos[0]?.numeroSolicitacao) || dadosChamado.numero || '',
        defeitoPrincipal: (dadosChamado.defeitos && dadosChamado.defeitos[0]?.categoria) || dadosChamado.defeitoPrincipal || '',
        defeitoEncontrado: (dadosChamado.defeitos && dadosChamado.defeitos[0]?.descricao) || dadosChamado.defeitoEncontrado || '',

        regional: vCreate ? vCreate.regional : 'Norte',

        etapaWorkflow: 'Análise Frota',

        dadosWorkflow: {
          ...(dadosChamado.dadosWorkflow || {}),
          criadoPor: currentUser?.nome || 'Sistema',
          timestamps: {
            'Análise Frota': hoje.toISOString(),
            ...(dadosChamado.dadosWorkflow?.timestamps || {})
          }
        },

        historicoModificacoes: [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser?.nome || 'Sistema', descricao: 'Chamado E-CAR registrado. Etapa inicial: Análise Frota.' }],

        prejuizoAcumulado: getPrejuizoChamado(dadosChamado, vCreate, hoje)

      };

      chamadosAtuais = [chamadoFinal, ...chamadosAtuais];

      if (!dadosChamado.silentSave) {
        setChamadoRecemCriado(chamadoFinal);
      }
    }

    setRawChamados(chamadosAtuais);

    const vecAlterado = vehiclesMap.get(dadosChamado.placa);

    if (vecAlterado) {

       const vecFinal = { ...vecAlterado, situacao: dadosChamado.situacaoVeiculo, status: 'ANÁLISE FROTA' };

       setRawVehicles(rawVehicles.map(v => v.placa === dadosChamado.placa ? vecFinal : v));

       syncToSupabase('veiculos', vecFinal);

    }

    syncToSupabase('chamados', chamadoFinal);

    if (!dadosChamado.silentSave) {
      setIsNovoChamadoModalOpen(false); setChamadoEmEdicao(null);
    }

  };



  const handleLiberarVeiculo = (dadosLiberacao) => {

    const { tipoAcao, motivoRecusa, chamadoId, dataLiberacao, horaLiberacao, temPendencia, pendencia, defeitoPrincipal, isImpeditivo, numeroNovoChamado } = dadosLiberacao;

    const chamadoOriginal = (rawChamados || []).find(c => c.id === chamadoId) || chamados.find(c => c.id === chamadoId);

    if (!chamadoOriginal) return;

    if (tipoAcao === 'RECUSAR') {
       handleWorkflowTransition(
          chamadoId,
          'Análise Frota',
          `Operação recusou o veículo liberado. Motivo: ${motivoRecusa}`,
          { dadosWorkflow: { ...(chamadoOriginal.dadosWorkflow || {}), aceitoOficina: false, motivoRecusa: motivoRecusa } }
       );
       setChamadoParaLiberar(null);
       return;
    }

    const dtObj = new Date(`${dataLiberacao}T${horaLiberacao}`);
    const dataHoraFechamento = !isNaN(dtObj.getTime()) ? dtObj.toISOString() : `${dataLiberacao}T${horaLiberacao}`;

    // ★ SMART CLOSING: Validar defeitos impeditivos pendentes
    if (chamadoOriginal?.defeitos && chamadoOriginal.defeitos.length > 0) {
      const impeditivosPendentes = chamadoOriginal.defeitos.filter(d => d.isImpeditivo && d.status === 'PENDENTE');
      if (impeditivosPendentes.length > 0) {
        alert(`Não é possível liberar o veículo. Existem ${impeditivosPendentes.length} defeito(s) impeditivo(s) pendente(s). Resolva-os primeiro no Checklist de Defeitos.`);
        return;
      }
    }



    if (temPendencia === 'SIM' && isImpeditivo === 'SIM') {

       setPendingLiberacaoImpeditiva({

          chamadoId, dataHoraFechamento, pendencia, defeitoPrincipal

       });

       setChamadoParaLiberar(null);

       const novoDefeito = {
         id: Date.now(),
         descricao: defeitoPrincipal || '',
         categoria: '', // Let the user choose in ModalChamado
         isImpeditivo: true,
         status: 'PENDENTE',
         numeroSolicitacao: '' // Let the user enter in ModalChamado
       };

       setChamadoEmEdicao({ 
         placa: chamadoOriginal.placa, 
         situacaoVeiculo: 'PARADO', 
         oficinaExterna: chamadoOriginal.oficinaExterna, 
         motorista: chamadoOriginal.motorista,
         defeitos: [novoDefeito],
         defeitoPrincipal: defeitoPrincipal || '',
         defeitoEncontrado: defeitoPrincipal || '',
         dataAbertura: new Date().toISOString()
       });

       setIsNovoChamadoModalOpen(true);

       return;

    }



    const logsDesc = temPendencia === 'NÃO' 

       ? `Veículo Liberado (Sem Pendências). Obs: ${pendencia || 'Nenhuma'}`

       : `Veículo Liberado (Não Impeditivo). Novo Chamado: ${numeroNovoChamado}. Defeito: ${defeitoPrincipal}`;



    const logs = [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser?.nome || 'Sistema', descricao: logsDesc }, ...(chamadoOriginal.historicoModificacoes || [])];



    const vForLib = vehiclesMap.get(chamadoOriginal.placa);

    const chamadoFinal = { 

      ...chamadoOriginal, 

      status: 'RESOLVIDO', 

      etapaWorkflow: 'RESOLVIDO',

      dadosWorkflow: {

        ...(chamadoOriginal.dadosWorkflow || {}),

        timestamps: {

          ...(chamadoOriginal.dadosWorkflow?.timestamps || {}),

          'RESOLVIDO': hoje.toISOString()

        }

      },

      dataHoraFechamento, 

      pendencia, 

      historicoModificacoes: logs,

      prejuizoAcumulado: getPrejuizoChamado({ ...chamadoOriginal, dataHoraFechamento }, vForLib, dataHoraFechamento)

    };

    let novosChamados = (rawChamados || []).map(c => c.id === chamadoId ? chamadoFinal : c);



    if (temPendencia === 'SIM' && isImpeditivo === 'NÃO') {

       const _naoImpId = Date.now() + 1;
       const novoDefeitoNaoImpeditivo = {
         id: Date.now(),
         descricao: pendencia || defeitoPrincipal || 'Defeito não impeditivo informado na liberação',
         categoria: 'Outros',
         isImpeditivo: false,
         status: 'PENDENTE',
         numeroSolicitacao: numeroNovoChamado
       };

       const chamadoNaoImpeditivo = {

         id: _naoImpId,

         codigoChamado: 'ALP.M-' + String(_naoImpId).slice(-6),

         numero: numeroNovoChamado,
         
         // Herdar defeitos não-impeditivos pendentes do chamado original e incluir o novo defeito
         defeitos: [
           novoDefeitoNaoImpeditivo,
           ...(chamadoOriginal.defeitos || []).filter(d => !d.isImpeditivo && d.status === 'PENDENTE').map(d => ({...d, id: Date.now() + Math.random()}))
         ],

         placa: chamadoOriginal.placa,

         dataAbertura: dataHoraFechamento,

         dataHoraFechamento: null,

         situacaoVeiculo: 'RODANDO',

         status: 'ABERTO',

         defeitoPrincipal: defeitoPrincipal,

         naoImpeditivo: true,

         oficinaExterna: chamadoOriginal.oficinaExterna,

         motorista: chamadoOriginal.motorista,

         etapaWorkflow: 'Análise Frota',

         dadosWorkflow: {

           timestamps: {

             'Análise Frota': hoje.toISOString()

           }

         },

         historicoModificacoes: [{ id: Date.now() + 2, dataHora: hoje.toISOString(), usuario: currentUser?.nome || 'Sistema', descricao: `Chamado de Restrição gerado pela liberação do chamado ${chamadoOriginal.numero}` }]

       };

       novosChamados = [chamadoNaoImpeditivo, ...novosChamados];

       syncToSupabase('chamados', chamadoNaoImpeditivo);

    }



    setRawChamados(novosChamados);

    syncToSupabase('chamados', chamadoFinal);



    const vecOriginal = (rawVehicles || []).find(v => v.placa === chamadoOriginal.placa);

    if (vecOriginal) {

      const isAindaManutencao = temPendencia === 'SIM';

      const vecFinal = { ...vecOriginal, situacao: 'RODANDO', status: isAindaManutencao ? 'ANÁLISE FROTA' : 'DISPONIVEL' };

      setRawVehicles(rawVehicles.map(v => v.placa === chamadoOriginal.placa ? vecFinal : v));

      syncToSupabase('veiculos', vecFinal);

    }

    setChamadoParaLiberar(null);

  };



  const handleCreateVeiculo = (novoVeiculo) => {

    const veiculoCompleto = { 

      ...novoVeiculo, id: Date.now(), situacao: 'RODANDO', status: 'DISPONIVEL', equipes: [],

      historicoModificacoes: [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser.nome, descricao: 'Veículo cadastrado.' }] 

    };

    setRawVehicles([veiculoCompleto, ...rawVehicles]); setIsNovoVeiculoModalOpen(false);

    syncToSupabase('veiculos', veiculoCompleto);

  };





  const handleUpdateVeiculo = (veiculoAtualizado) => {

    setRawVehicles(rawVehicles.map(v => v.id === veiculoAtualizado.id ? veiculoAtualizado : v));

    setSelectedVehicle(veiculoAtualizado);

    syncToSupabase('veiculos', veiculoAtualizado);

  };



  const handleDeleteVeiculo = (id) => {

    setRawVehicles(rawVehicles.filter(v => v.id !== id));

    setSelectedVehicle(null);

    setActiveTab('frota');

    deleteFromSupabase('veiculos', id);

  };



  const handleCreateColaborador = (novoColaborador) => {
    const normalized = normalizeColaborador({ ...novoColaborador, id: Date.now(), historicoModificacoes: [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser?.nome || 'Sistema', descricao: 'Colaborador cadastrado.' }] });
    setRawColaboradores([normalized, ...rawColaboradores]); 
    setIsNovoColaboradorModalOpen(false);
    syncToSupabase('base_unificada', normalized);
  };

  const handleUpdateColaborador = (colabAtualizado) => {
    const normalized = normalizeColaborador(colabAtualizado);
    setRawColaboradores(rawColaboradores.map(c => (c.matricula && c.matricula === normalized.matricula) || c.id === normalized.id ? normalized : c));
    setSelectedColaborador(normalized);
    syncToSupabase('base_unificada', normalized);
  };

  const handleDeleteColaborador = (id) => {
    setRawColaboradores(rawColaboradores.filter(c => c.id !== id && c.matricula !== id));
    setSelectedColaborador(null);
    setActiveTab('colaboradores');
    deleteFromSupabase('base_unificada', id);
  };



  const handleUpdateProfile = async (updatedUser) => {

    const exists = users.some(u => u.login === updatedUser.login && u.id !== updatedUser.id);

    if (exists) {

      alert('Este login já está sendo utilizado por outro usuário!');

      return false;

    }

    setCurrentUser(updatedUser);

    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));

    await syncToSupabase('usuarios', updatedUser);

    return true;

  };

  // 1. Intercept render for unauthenticated users
  if (!currentUser) {
    return (
      <>
        <AuthScreen 
          onLogin={handleLogin} 
          onRegister={handleRegister} 
          theme={theme} 
          setTheme={setTheme} 
          isLoggingIn={isLoggingIn}
        />
        <CustomFeedbackModal {...feedbackModal} />
      </>
    );
  }

  // 2. Intercept render if mandatory password reset is required
  if (currentUser.precisa_trocar_senha === true || currentUser.precisaTrocarSenha === true) {
    return (
      <>
        <ModalTrocaSenhaObrigatoria 
          currentUser={currentUser} 
          onPasswordUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            showFeedback('success', 'Senha Atualizada com Sucesso!', 'Sua nova senha foi salva e criptografada com sucesso. Seja bem-vindo ao sistema!');
          }} 
        />
        <CustomFeedbackModal {...feedbackModal} />
      </>
    );
  }

  // Intercept render for specialized profiles (Auditor, Inspetor, Mecânico)
  if (['AUDITOR', 'INSPETOR'].includes(currentUser?.perfil?.toUpperCase())) {
    return <AutoFiscalizacaoView currentUser={currentUser} activeRegional={activeRegional} isMobileAuditor={true} onLogout={handleLogout} />;
  }

  if (currentUser?.perfil?.toUpperCase() === 'MECANICO') {
    return <MecanicoView chamados={chamados} vehicles={vehicles} onWorkflowTransition={handleWorkflowTransition} onSubmit={handleSalvarChamado} currentUser={currentUser} listaOficinas={listaOficinasNomes} />;
  }

  if (activeTab === 'painel_tv') {

    return <PainelTVView vehicles={vehicles} chamados={chamados} activeRegional={activeRegional} setActiveRegional={setActiveRegional} currentUser={currentUser} onVoltar={() => setActiveTab('dashboard')} />;

  }



  
  // Intercept render if user has NO operational modules assigned
  const isMasterAdmin = (currentUser?.perfil || '').toUpperCase() === 'ADMINISTRADOR' || currentUser?.isAdmin === true;
  if (
    currentUser &&
    !isMasterAdmin &&
    userPermissions &&
    (userPermissions.temAcessoLiberado === false || (userPermissions.modulos_visiveis || []).filter(m => m !== 'meu_perfil').length === 0)
  ) {
    return <AguardandoAcessoView currentUser={currentUser} onLogout={handleLogout} />;
  }

  // ===== MOBILE / TABLET LAYOUT =====
  if (isMobile || isTablet) {
    // Render mobile content based on activeTab
    const mobileContent = (
      <>
        {(activeTab === 'inicio' || activeTab === 'home' || activeTab === 'boas_vindas') && <InicioView vehicles={vehicles} chamados={chamados} rawChamados={rawChamados} hoje={hoje} currentUser={currentUser} setActiveTab={setActiveTab} setChamadoEmEdicao={setChamadoEmEdicao} theme={theme} isWelcomeModalOpen={isWelcomeModalOpen} userPermissions={userPermissions} />}
        {activeTab === 'calendario' && <CalendarioOperacionalView currentUser={currentUser} activeRegional={activeRegional} />}
        {activeTab === 'dashboard' && <DashboardView vehicles={vehicles} chamados={chamados} rawChamados={rawChamados} hoje={hoje} currentUser={currentUser} isWelcomeModalOpen={isWelcomeModalOpen} />}
        {activeTab === 'chamados' && <ChamadosView chamados={chamados} vehicles={vehicles} hoje={hoje} onEditar={setChamadoEmEdicao} onLiberar={setChamadoParaLiberar} userPermissions={userPermissions} />}
        {activeTab === 'mecanico' && <MecanicoView chamados={chamados} vehicles={vehicles} onWorkflowTransition={handleWorkflowTransition} onSubmit={handleSalvarChamado} currentUser={currentUser} listaOficinas={listaOficinasNomes} />}
        {activeTab === 'frota' && <FrotaView vehicles={vehicles} laudosGeral={laudosGeral} onSelectVehicle={(v) => { setSelectedVehicle(v); setActiveTab('detalhes_veiculo'); }} userPermissions={userPermissions} />}
        {activeTab === 'ociosidade_frota' && <OciosidadeView vehicles={vehicles} chamados={chamados} hoje={hoje} />}
        {activeTab === 'meu_perfil' && <PerfilView currentUser={currentUser} chamados={chamados} vehicles={vehicles} onUpdateProfile={handleUpdateProfile} onEditar={setChamadoEmEdicao} onLiberar={setChamadoParaLiberar} />}
        {activeTab === 'fidelizacao' && <IndicadorFidelizacaoView vehicles={vehicles} forcaDeTrabalho={colaboradores} vinculosEquipe={vinculosEquipe} hoje={hoje} currentUser={currentUser} />}
        {activeTab === 'cadastro_oficinas' && <CadastroOficinasView onOficinasChange={refreshOficinas} showNotification={msg => showFeedback('info', 'Oficinas', msg)} />}
        {activeTab === 'entrega_equipes' && <EntregaEquipesView hoje={hoje} theme={theme} currentUser={currentUser} userPermissions={userPermissions} />}
        {activeTab === 'colaboradores' && <ColaboradoresView colaboradores={colaboradores} onSelectColaborador={(c) => { setSelectedColaborador(c); setActiveTab('detalhes_colaborador'); }} onNewColaborador={() => setIsNovoColaboradorModalOpen(true)} userPermissions={userPermissions} />}
        {activeTab === 'forca' && <ForcaTrabalhoModule currentUser={currentUser} userPermissions={userPermissions} vehicles={vehicles} />}
        {activeTab === 'historico' && <HistoricoView chamados={chamados} vehicles={vehicles} hoje={hoje} onEditar={setChamadoEmEdicao} onLiberar={setChamadoParaLiberar} />}
        {activeTab === 'usuarios' && isAdminOrCoord && <UsuariosView users={users} setUsers={setUsers} syncToSupabase={syncToSupabase} deleteFromSupabase={deleteFromSupabase} currentUser={currentUser} onUpdateConfigAcessos={(novos) => { setConfigAcessos(novos); try { localStorage.setItem('fleet_config_acessos_cache', JSON.stringify(novos)); } catch(e){} }} showFeedback={showFeedback} />}
        {activeTab === 'autofiscalizacao' && <AutoFiscalizacaoView currentUser={currentUser} activeRegional={activeRegional} isMobileAuditor={false} />}
        {activeTab === 'wfm_despacho' && <WFMDespachoView currentUser={currentUser} activeRegional={activeRegional} />}
        {activeTab === 'detalhes_veiculo' && selectedVehicle && (
          <DetalhesVeiculoView 
            veiculo={vehicles.find(v => v.id === selectedVehicle.id)} laudosGeral={laudosGeral} setLaudosGeral={setLaudosGeral}
            chamados={chamados} rawChamados={rawChamados} colaboradores={colaboradores} hoje={hoje} currentUser={currentUser}
            onVoltar={() => { setSelectedVehicle(null); setActiveTab('frota'); }}
            onUpdate={handleUpdateVeiculo}
            onDelete={handleDeleteVeiculo}
          />
        )}
        {activeTab === 'detalhes_colaborador' && selectedColaborador && (
          <DetalhesColaboradorView 
            colaborador={colaboradores.find(c => (c.matricula && c.matricula === selectedColaborador.matricula) || (c.id && c.id === selectedColaborador.id)) || selectedColaborador} 
            vehicles={vehicles} hoje={hoje} currentUser={currentUser}
            onVoltar={() => { setSelectedColaborador(null); setActiveTab('colaboradores'); }}
            onUpdate={handleUpdateColaborador}
            onDelete={handleDeleteColaborador}
          />
        )}
      </>
    );

    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <MobileShell
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          userPermissions={userPermissions}
          theme={theme}
          setTheme={setTheme}
          onLogout={handleLogout}
          setIsNovoChamadoModalOpen={setIsNovoChamadoModalOpen}
        >
          {mobileContent}
        </MobileShell>

        {/* Modais — same for mobile and desktop */}
        {(isNovoChamadoModalOpen || chamadoEmEdicao) && <ModalChamado vehicles={vehicles} colaboradores={colaboradores} chamadoEdicao={chamadoEmEdicao} currentUser={currentUser} onWorkflowTransition={handleWorkflowTransition} onClose={() => { setIsNovoChamadoModalOpen(false); setChamadoEmEdicao(null); }} onSubmit={handleSalvarChamado} onLiberar={(c) => { setChamadoParaLiberar(c); setChamadoEmEdicao(null); setIsNovoChamadoModalOpen(false); }} rawChamados={rawChamados} userPermissions={userPermissions} listaOficinas={listaOficinasNomes} />}
        {isNovoVeiculoModalOpen && <ModalNovoVeiculo onClose={() => setIsNovoVeiculoModalOpen(false)} onSubmit={handleCreateVeiculo} />}
        {chamadoParaLiberar && <ModalLiberarVeiculo chamado={chamadoParaLiberar} onClose={() => setChamadoParaLiberar(null)} onSubmit={handleLiberarVeiculo} />}
        {isNovoColaboradorModalOpen && <ModalNovoColaborador onClose={() => setIsNovoColaboradorModalOpen(false)} onSubmit={handleCreateColaborador} />}
        {chamadoRecemCriado && (
          <ModalConfirmacaoAbertura 
            chamado={chamadoRecemCriado} 
            onClose={() => setChamadoRecemCriado(null)} 
          />
        )}
        {isWelcomeModalOpen && (
          <WelcomeReleaseModal 
            currentUser={currentUser} 
            onClose={() => { 
              setIsWelcomeModalOpen(false); 
              if (currentUser) {
                sessionStorage.setItem('welcome_modal_dismissed_' + (currentUser.id || currentUser.login), 'true');
              }
            }} 
          />
        )}
        <CustomFeedbackModal {...feedbackModal} />
      </div>
    );
  }

  // ===== DESKTOP LAYOUT (unchanged) =====
  return (
    <div className="flex h-screen bg-[#F5F3FF] font-sans text-blue-950">

      {/* Sidebar */}
      {currentUser?.perfil?.toUpperCase() !== 'MECANICO' && (
      <aside className="w-[80px] hover:w-[280px] group transition-all duration-300 ease-in-out bg-white border-r border-emerald-100 flex flex-col p-2 group-hover:p-4 shrink-0 shadow-[4px_0_24px_rgba(139,92,246,0.05)] z-20 overflow-hidden relative">

        <div className="mb-8 px-1 py-4 flex items-center gap-3 overflow-hidden shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[18px] flex shrink-0 items-center justify-center shadow-lg shadow-emerald-200">
            <Zap size={24} className="text-white fill-white/20" />
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Sistema</span>
            <h1 className="text-base font-black text-blue-950 tracking-tight mt-1">Controle <span className="text-emerald-600">Operacional</span></h1>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-hidden group-hover:overflow-y-auto pr-1 no-scrollbar group-hover:custom-scrollbar pb-6">
          
          {/* GRUPO PRINCIPAL */}
          <div className="space-y-0.5">
            {userPermissions?.modulos_visiveis?.includes('inicio') && <NavItem icon={<Home size={22} />} label="Início" isActive={activeTab === 'inicio'} onClick={() => setActiveTab('inicio')} />}
            {userPermissions?.modulos_visiveis?.includes('dashboard') && <NavItem icon={<LayoutDashboard size={22} />} label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />}
            {userPermissions?.modulos_visiveis?.includes('calendario') && <NavItem icon={<CalendarCheck size={22} />} label="Calendário Operacional" isActive={activeTab === 'calendario'} onClick={() => setActiveTab('calendario')} />}
            {userPermissions?.modulos_visiveis?.includes('painel_tv') && <NavItem icon={<Tv size={22} />} label="Painel TV" isActive={activeTab === 'painel_tv'} onClick={() => setActiveTab('painel_tv')} />}
            {userPermissions?.modulos_visiveis?.includes('historico') && <NavItem icon={<History size={22} />} label="Histórico / Filtros" isActive={activeTab === 'historico'} onClick={() => setActiveTab('historico')} />}
          </div>

          {/* GRUPO MECÂNICO */}
          {userPermissions?.modulos_visiveis?.includes('mecanico') && (
            <div className="space-y-0.5">
              <div className="h-0 group-hover:h-8 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 px-4 flex items-center">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Mecânico</span>
              </div>
              <NavItem icon={<Wrench size={22} />} label="Painel Mecânico" isActive={activeTab === 'mecanico'} onClick={() => setActiveTab('mecanico')} />
            </div>
          )}

          {/* GRUPO FROTA */}
          {(userPermissions?.modulos_visiveis?.includes('chamados') || userPermissions?.modulos_visiveis?.includes('frota') || userPermissions?.modulos_visiveis?.includes('ociosidade_frota') || userPermissions?.modulos_visiveis?.includes('fidelizacao') || userPermissions?.modulos_visiveis?.includes('cadastro_oficinas')) && (
            <div className="space-y-0.5">
              <div className="h-0 group-hover:h-8 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 px-4 flex items-center">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Frota</span>
              </div>
              {userPermissions?.modulos_visiveis?.includes('chamados') && <NavItem icon={<Wrench size={22} />} label="Chamados (E-CAR)" isActive={activeTab === 'chamados'} onClick={() => setActiveTab('chamados')} />}
              {userPermissions?.modulos_visiveis?.includes('frota') && <NavItem icon={<CarFront size={22} />} label="Frota de Veículos" isActive={activeTab === 'frota'} onClick={() => setActiveTab('frota')} />}
              {userPermissions?.modulos_visiveis?.includes('ociosidade_frota') && <NavItem icon={<Activity size={22} />} label="Ociosidade Frota" isActive={activeTab === 'ociosidade_frota'} onClick={() => setActiveTab('ociosidade_frota')} />}
              {userPermissions?.modulos_visiveis?.includes('fidelizacao') && <NavItem icon={<ShieldCheck size={22} />} label="Fidelização" isActive={activeTab === 'fidelizacao'} onClick={() => setActiveTab('fidelizacao')} />}
              {userPermissions?.modulos_visiveis?.includes('cadastro_oficinas') && (
                <NavItem icon={<Building2 size={22} />} label="Cadastro de Oficinas" isActive={activeTab === 'cadastro_oficinas'} onClick={() => setActiveTab('cadastro_oficinas')} />
              )}
            </div>
          )}

          {/* GRUPO AUTOFISCALIZAÇÃO */}
          {(userPermissions?.modulos_visiveis?.includes('autofiscalizacao') || userPermissions?.modulos_visiveis?.includes('wfm_despacho')) && (
            <div className="space-y-0.5">
              <div className="h-0 group-hover:h-8 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 px-4 flex items-center">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">AutoFiscalização</span>
              </div>
              {userPermissions?.modulos_visiveis?.includes('autofiscalizacao') && (
                <NavItem icon={<FileSignature size={22} />} label="AutoFiscalização" isActive={activeTab === 'autofiscalizacao'} onClick={() => setActiveTab('autofiscalizacao')} />
              )}
              {userPermissions?.modulos_visiveis?.includes('wfm_despacho') && (
                <NavItem icon={<MapIcon size={22} />} label="WFM / Despacho" isActive={activeTab === 'wfm_despacho'} onClick={() => setActiveTab('wfm_despacho')} />
              )}
            </div>
          )}

          {/* GRUPO OPERAÇÃO */}
          {(userPermissions?.modulos_visiveis?.includes('entrega_equipes') || userPermissions?.modulos_visiveis?.includes('forca') || userPermissions?.modulos_visiveis?.includes('colaboradores')) && (
            <div className="space-y-0.5">
              <div className="h-0 group-hover:h-8 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 px-4 flex items-center">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Operação</span>
              </div>
              {userPermissions?.modulos_visiveis?.includes('entrega_equipes') && <NavItem icon={<ClipboardCheck size={22} />} label="Entrega Equipes" isActive={activeTab === 'entrega_equipes'} onClick={() => setActiveTab('entrega_equipes')} />}
              {userPermissions?.modulos_visiveis?.includes('forca') && <NavItem icon={<Briefcase size={22} />} label="Força de Trabalho" isActive={activeTab === 'forca'} onClick={() => setActiveTab('forca')} />}
              {userPermissions?.modulos_visiveis?.includes('colaboradores') && <NavItem icon={<Users size={22} />} label="Colaboradores" isActive={activeTab === 'colaboradores'} onClick={() => setActiveTab('colaboradores')} />}
            </div>
          )}
          
        </nav>

        <div className="mt-auto pt-4 border-t border-emerald-50/50 space-y-1">
           {userPermissions?.modulos_visiveis?.includes('usuarios') && <NavItem icon={<Lock size={22} className="text-amber-500" />} label="Usuários (Acessos)" isActive={activeTab === 'usuarios'} onClick={() => setActiveTab('usuarios')} />}
           
           <div 
             onClick={() => setActiveTab('meu_perfil')} 
             className="flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-1 group-hover:px-2 mt-2 mb-2 cursor-pointer hover:bg-slate-50 rounded-2xl transition-all p-1.5 border border-transparent hover:border-slate-100"
             title="Ver Meu Perfil"
           >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center font-black text-emerald-700 shrink-0 shadow-sm border border-emerald-200/50 uppercase">{currentUser.nome.charAt(0)}</div>
              <div className="w-0 group-hover:w-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                <p className="font-bold text-[13px] text-blue-950 truncate leading-tight">{currentUser.nome}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">{currentUser.perfil}</p>
              </div>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-2 group-hover:px-4 py-2.5 text-[13px] font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><LogOut size={20} className="shrink-0"/> <span className="w-0 group-hover:w-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap tracking-wide">Sair do Sistema</span></button>
        </div>
      </aside>
      )}

 {/* Main Content */}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-emerald-100/50 flex items-center justify-between px-10 shadow-sm z-10 shrink-0">

          <div>

             <h2 className="text-2xl font-black text-blue-950 tracking-tight">

               {activeTab === 'inicio' ? "Área de Trabalho" : activeTab === 'dashboard' ? `Olá ${currentUser.nome.split(' ')[0]}, Bem-Vindo!` : activeTab.replace('_', ' ').toUpperCase()}

             </h2>

          </div>

          <div className="flex gap-3 items-center">

            {/* Global Regional Selector */}

            {(['Global'].includes(currentUser?.regional) || ['ADMINISTRADOR', 'GERENTE'].includes(currentUser?.perfil)) ? (

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 shadow-sm">

                    <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wider flex items-center gap-1"><Globe size={14} className="text-blue-500" /> Visão:</span>

                    <select 

                        value={activeRegional} 

                        onChange={(e) => setActiveRegional(e.target.value)}

                        className="bg-transparent text-sm font-extrabold text-blue-900 dark:text-blue-300 outline-none cursor-pointer"

                    >

                        <option value="Todas">Global (Todas)</option>

                        <option value="Norte">Norte</option>

                        <option value="Leste">Leste</option>

                    </select>

                </div>

            ) : (

                <div className="flex items-center bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-2 shadow-sm">

                    <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wider flex items-center gap-1"><Globe size={14} className="text-blue-500" /> Visão:</span>

                    <span className="text-sm font-extrabold text-blue-900 dark:text-blue-300">{activeRegional}</span>

                </div>

            )}



            {/* Theme Toggle Button */}

            <button 

              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 

              className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full transition-all flex items-center justify-center shadow-md active:scale-95 border border-slate-250/30"

              title={theme === 'dark' ? "Ativar Modo Claro" : "Ativar Modo Escuro"}

            >

              {theme === 'dark' ? <Sun size={20} className="text-amber-500 animate-in spin-in-12 duration-500" /> : <Moon size={20} className="text-slate-600" />}

            </button>

            {/* Novidades v2.5 Release Modal Trigger */}
            <button 
              onClick={() => setIsWelcomeModalOpen(true)} 
              className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 hover:from-emerald-500/20 hover:to-indigo-500/20 text-emerald-700 dark:text-emerald-300 rounded-full transition-all border border-emerald-500/30 flex items-center gap-1.5 text-xs font-black shadow-sm active:scale-95 shrink-0"
              title="Ver novidades e guia da versão"
            >
              <Sparkles size={16} className="text-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Novidades v2.5</span>
            </button>



            {activeTab === 'chamados' && currentUser && (

              <>{userPermissions?.permissoes_edicao?.pode_abrir_chamado && (<button onClick={() => setIsNovoChamadoModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm font-bold transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 active:scale-95">
            <Plus size={20} /> Novo Chamado
          </button>)}</>

            )}

            {activeTab === 'frota' && (

              <>

                <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95">

                  <Download size={20} /> Exportar Excel

                </button>

                {userPermissions?.permissoes_edicao?.pode_cadastrar_veiculo && (<button onClick={() => setIsNovoVeiculoModalOpen(true)} className="bg-blue-950 hover:bg-blue-900 text-white px-6 py-3 rounded-full text-sm font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95">
            <CarFront size={20} /> Cadastrar Veículo</button>)}

              </>

            )}

            {activeTab === 'colaboradores' && userPermissions?.permissoes_edicao?.pode_cadastrar_colaborador && (<button onClick={() => setIsNovoColaboradorModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm font-bold transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 active:scale-95">
            <UserPlus size={20} /> Novo Colaborador</button>)}

          </div>

        </header>



        <div className="flex-1 overflow-y-auto p-8 lg:p-10 scroll-smooth">

          {activeTab === 'inicio' && <InicioView vehicles={vehicles} chamados={chamados} rawChamados={rawChamados} hoje={hoje} currentUser={currentUser} setActiveTab={setActiveTab} setChamadoEmEdicao={setChamadoEmEdicao} theme={theme} isWelcomeModalOpen={isWelcomeModalOpen} userPermissions={userPermissions} />}

          {activeTab === 'calendario' && <CalendarioOperacionalView currentUser={currentUser} activeRegional={activeRegional} />}

          {activeTab === 'dashboard' && <DashboardView vehicles={vehicles} chamados={chamados} rawChamados={rawChamados} hoje={hoje} currentUser={currentUser} isWelcomeModalOpen={isWelcomeModalOpen} />}

          {activeTab === 'chamados' && <ChamadosView chamados={chamados} vehicles={vehicles} hoje={hoje} onEditar={setChamadoEmEdicao} onLiberar={setChamadoParaLiberar} userPermissions={userPermissions} />}

          {activeTab === 'mecanico' && <MecanicoView chamados={chamados} vehicles={vehicles} onWorkflowTransition={handleWorkflowTransition} onSubmit={handleSalvarChamado} currentUser={currentUser} />}

          {activeTab === 'frota' && <FrotaView vehicles={vehicles} laudosGeral={laudosGeral} onSelectVehicle={(v) => { setSelectedVehicle(v); setActiveTab('detalhes_veiculo'); }} userPermissions={userPermissions} />}

          {activeTab === 'ociosidade_frota' && <OciosidadeView vehicles={vehicles} chamados={chamados} hoje={hoje} />}

          {activeTab === 'painel_tv' && <PainelTVView vehicles={vehicles} chamados={chamados} activeRegional={activeRegional} setActiveRegional={setActiveRegional} currentUser={currentUser} onVoltar={() => setActiveTab('dashboard')} />}

          {activeTab === 'meu_perfil' && <PerfilView currentUser={currentUser} chamados={chamados} vehicles={vehicles} onUpdateProfile={handleUpdateProfile} onEditar={setChamadoEmEdicao} onLiberar={setChamadoParaLiberar} />}

          {activeTab === 'fidelizacao' && <IndicadorFidelizacaoView vehicles={vehicles} forcaDeTrabalho={colaboradores} vinculosEquipe={vinculosEquipe} hoje={hoje} currentUser={currentUser} />}

          {activeTab === 'cadastro_oficinas' && <CadastroOficinasView onOficinasChange={refreshOficinas} showNotification={msg => showFeedback('info', 'Oficinas', msg)} />}

          {activeTab === 'entrega_equipes' && <EntregaEquipesView hoje={hoje} theme={theme} currentUser={currentUser} userPermissions={userPermissions} />}

          {activeTab === 'colaboradores' && <ColaboradoresView colaboradores={colaboradores} onSelectColaborador={(c) => { setSelectedColaborador(c); setActiveTab('detalhes_colaborador'); }} onNewColaborador={() => setIsNovoColaboradorModalOpen(true)} userPermissions={userPermissions} />}

          {activeTab === 'forca' && <ForcaTrabalhoModule currentUser={currentUser} userPermissions={userPermissions} vehicles={vehicles} />}

          {activeTab === 'historico' && <HistoricoView chamados={chamados} vehicles={vehicles} hoje={hoje} onEditar={setChamadoEmEdicao} onLiberar={setChamadoParaLiberar} />}

          {activeTab === 'usuarios' && isAdminOrCoord && <UsuariosView users={users} setUsers={setUsers} syncToSupabase={syncToSupabase} deleteFromSupabase={deleteFromSupabase} currentUser={currentUser} onUpdateConfigAcessos={(novos) => { setConfigAcessos(novos); try { localStorage.setItem('fleet_config_acessos_cache', JSON.stringify(novos)); } catch(e){} }} showFeedback={showFeedback} />}

          {activeTab === 'autofiscalizacao' && <AutoFiscalizacaoView currentUser={currentUser} activeRegional={activeRegional} isMobileAuditor={false} />}

          {activeTab === 'wfm_despacho' && <WFMDespachoView currentUser={currentUser} activeRegional={activeRegional} />}

          

          {activeTab === 'detalhes_veiculo' && selectedVehicle && (

            <DetalhesVeiculoView 

              veiculo={vehicles.find(v => v.id === selectedVehicle.id)} laudosGeral={laudosGeral} setLaudosGeral={setLaudosGeral}

              chamados={chamados} rawChamados={rawChamados} colaboradores={colaboradores} hoje={hoje} currentUser={currentUser}

              onVoltar={() => { setSelectedVehicle(null); setActiveTab('frota'); }}

              onUpdate={handleUpdateVeiculo}

              onDelete={handleDeleteVeiculo}

            />

          )}

          {activeTab === 'detalhes_colaborador' && selectedColaborador && (

            <DetalhesColaboradorView 

              colaborador={colaboradores.find(c => (c.matricula && c.matricula === selectedColaborador.matricula) || (c.id && c.id === selectedColaborador.id)) || selectedColaborador} 

              vehicles={vehicles} hoje={hoje} currentUser={currentUser}

              onVoltar={() => { setSelectedColaborador(null); setActiveTab('colaboradores'); }}

              onUpdate={handleUpdateColaborador}

              onDelete={handleDeleteColaborador}

            />

          )}

        </div>

      </main>



      {/* Modais */}

      {(isNovoChamadoModalOpen || chamadoEmEdicao) && <ModalChamado vehicles={vehicles} colaboradores={colaboradores} chamadoEdicao={chamadoEmEdicao} currentUser={currentUser} onWorkflowTransition={handleWorkflowTransition} onClose={() => { setIsNovoChamadoModalOpen(false); setChamadoEmEdicao(null); }} onSubmit={handleSalvarChamado} onLiberar={(c) => { setChamadoParaLiberar(c); setChamadoEmEdicao(null); setIsNovoChamadoModalOpen(false); }} rawChamados={rawChamados} userPermissions={userPermissions} listaOficinas={listaOficinasNomes} />}

      {isNovoVeiculoModalOpen && <ModalNovoVeiculo onClose={() => setIsNovoVeiculoModalOpen(false)} onSubmit={handleCreateVeiculo} />}

      {chamadoParaLiberar && <ModalLiberarVeiculo chamado={chamadoParaLiberar} onClose={() => setChamadoParaLiberar(null)} onSubmit={handleLiberarVeiculo} />}

      {isNovoColaboradorModalOpen && <ModalNovoColaborador onClose={() => setIsNovoColaboradorModalOpen(false)} onSubmit={handleCreateColaborador} />}

      {chamadoRecemCriado && (
        <ModalConfirmacaoAbertura 
          chamado={chamadoRecemCriado} 
          onClose={() => setChamadoRecemCriado(null)} 
        />
      )}

      {isWelcomeModalOpen && (
        <WelcomeReleaseModal 
          currentUser={currentUser} 
          onClose={() => { 
            setIsWelcomeModalOpen(false); 
            if (currentUser) {
              sessionStorage.setItem('welcome_modal_dismissed_' + (currentUser.id || currentUser.login), 'true');
            }
          }} 
        />
      )}

      <CustomFeedbackModal {...feedbackModal} />

    </div>

  );

}



// ==========================================

// ==========================================
// TELA DE AUTENTICAÇÃO ULTRA PREMIUM (LIGHT & CRISP)
// ==========================================

function AuthScreen({ onLogin, onRegister, theme, setTheme, isLoggingIn }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ nome: '', login: '', senha: '' });
  const [erro, setErro] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro('');
    if (isLogin) { 
      onLogin(formData.login, formData.senha); 
    } else {
      const email = (formData.login || '').trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email) || !email.endsWith('@alpitelbrasil.com.br')) {
        setErro('O e-mail informado deve pertencer ao domínio corporativo (@alpitelbrasil.com.br)!');
        return;
      }
      const nomeUpper = (formData.nome || '').trim().toUpperCase();
      if (!nomeUpper) {
        setErro('O Nome Completo é obrigatório!');
        return;
      }
      if (!formData.senha || formData.senha.length < 6) {
        setErro('A senha deve conter no mínimo 6 caracteres!');
        return;
      }
      onRegister({
        ...formData,
        nome: nomeUpper,
        login: email
      });
      setIsLogin(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Micro Dot Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Dynamic Ambient Glow Blobs (Cores Claras e Suaves) */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-gradient-to-tr from-emerald-200/50 via-teal-200/40 to-transparent rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '9s' }} />
      <div className="absolute -bottom-32 -right-32 w-[580px] h-[580px] bg-gradient-to-bl from-cyan-200/40 via-sky-200/35 to-transparent rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '11s', animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-emerald-100/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[460px] relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* Top Floating Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm text-[11px] font-bold text-slate-600 tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Sistema de Gestão Operacional</span>
          </div>
        </div>

        {/* Card Ultra Premium */}
        <div className="bg-white/90 backdrop-blur-2xl p-7 sm:p-10 rounded-[2.5rem] shadow-[0_30px_90px_-20px_rgba(16,185,129,0.18),0_10px_35px_-15px_rgba(15,23,42,0.05)] border border-white/90 ring-1 ring-slate-900/5">
          
          {/* Header Brand */}
          <div className="flex flex-col items-center mb-7 text-center">
            <div className="relative mb-4 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl blur-md opacity-40 group-hover:opacity-70 transition duration-500" />
              <div className="relative w-18 h-18 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-4 ring-white">
                <Zap size={36} className="text-white fill-white/20 drop-shadow-md" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              CONTROLE OPERACIONAL
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Plataforma de Gestão Operacional Integrada
            </p>
          </div>

          {/* Segmented Control (Tab Switcher) */}
          <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center mb-6 border border-slate-200/60 shadow-inner">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setErro(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isLogin
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock size={14} className={isLogin ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Acessar Conta</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setErro(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                !isLogin
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus size={14} className={!isLogin ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Solicitar Acesso</span>
            </button>
          </div>

          {/* Error Message */}
          {erro && (
            <div className="bg-rose-50 border border-rose-200/80 text-rose-700 p-3.5 rounded-2xl text-xs font-bold leading-relaxed mb-5 animate-in fade-in slide-in-from-top-2 duration-300 flex items-start gap-2.5 shadow-sm">
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div>{erro}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo Nome Completo (Apenas no Cadastro) */}
            {!isLogin && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    required 
                    placeholder="Nome e Sobrenome"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40 border border-slate-200/80 focus:border-emerald-500 transition-all uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-400 shadow-sm text-sm" 
                    value={formData.nome} 
                    onChange={e => setFormData({...formData, nome: e.target.value.toUpperCase()})} 
                  />
                </div>
              </div>
            )}

            {/* Campo E-mail / Login */}
            <div className="animate-in fade-in duration-400">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {isLogin ? 'E-mail / Login' : 'E-mail Corporativo'}
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  required 
                  placeholder="usuario@alpitelbrasil.com.br"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40 border border-slate-200/80 focus:border-emerald-500 transition-all placeholder:font-medium placeholder:text-slate-400 shadow-sm text-sm" 
                  value={formData.login} 
                  onChange={e => setFormData({...formData, login: isLogin ? e.target.value : e.target.value.toLowerCase()})} 
                />
              </div>
              {!isLogin && (
                <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                  <Sparkles size={12} className="text-emerald-600 shrink-0" />
                  <span className="text-[11px] text-emerald-700 font-semibold leading-tight">
                    Utilize seu e-mail corporativo institucional (@alpitelbrasil.com.br).
                  </span>
                </div>
              )}
            </div>

            {/* Campo Senha */}
            <div className="animate-in fade-in duration-400">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40 border border-slate-200/80 focus:border-emerald-500 transition-all shadow-sm tracking-widest placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 text-sm" 
                  value={formData.senha} 
                  onChange={e => setFormData({...formData, senha: e.target.value})} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white rounded-2xl font-black text-sm shadow-[0_12px_28px_-6px_rgba(16,185,129,0.35)] hover:shadow-[0_16px_32px_-6px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 mt-5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <Loader size={18} className="animate-spin text-white" />
                  <span>Validando Credenciais...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Entrar no Sistema' : 'Enviar Solicitação de Acesso'}</span>
                  <ArrowRight size={16} className="text-white/80" />
                </>
              )}
            </button>
          </form>

          {/* Governance Notice (Apenas no Cadastro) */}
          {!isLogin && (
            <div className="mt-4 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center">
              <p className="text-[11px] text-emerald-800 font-medium">
                🛡️ Nível de perfil, regional e setor serão parametrizados pela Gerência na aprovação da sua conta.
              </p>
            </div>
          )}

          {/* Security Footnote */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Ambiente Corporativo Seguro &bull; Criptografia ponto a ponto</span>
          </div>

        </div>
        
        {/* Footer Signature */}
        <div className="text-center mt-6 text-[11px] font-black text-slate-500 tracking-wider uppercase drop-shadow-sm animate-in fade-in duration-1000 delay-200">
          Powered by <span className="text-slate-700">CONTROLE OPERACIONAL</span> &bull; Energy Operations
        </div>
      </div>
    </div>
  );
}

// ==========================================

// VIEW: USUÁRIOS (Apenas Gerentes)

// ==========================================

function MatrizAcessosView({ currentUser, onUpdateConfigAcessos, showFeedback }) {
  const [acessos, setAcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [matrizFeedback, setMatrizFeedback] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const SETORES = ['Operações', 'Frota', 'Logística', 'Diretoria', 'Financeiro', 'T.I', 'Facility', 'Compras', 'RH'];
  const PERFIS = ['ADMINISTRADOR', 'GERENTE', 'COORDENADOR', 'SUPERVISOR', 'ANALISTA', 'FROTA', 'VISUALIZADOR', 'AUDITOR', 'INSPETOR'];
  const MODULOS = [
    { id: 'inicio', label: 'Início' },
    { id: 'calendario', label: 'Calendário' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'chamados', label: 'Chamados (E-CAR)' },
    { id: 'frota', label: 'Frota' },
    { id: 'ociosidade_frota', label: 'Ociosidade' },
    { id: 'painel_tv', label: 'Painel TV' },
    { id: 'fidelizacao', label: 'Fidelização' },
    { id: 'cadastro_oficinas', label: 'Cadastro de Oficinas' },
    { id: 'entrega_equipes', label: 'Entrega Equipes' },
    { id: 'colaboradores', label: 'Colaboradores' },
    { id: 'forca', label: 'Força de Trab' },
    { id: 'historico', label: 'Histórico' },
    { id: 'meu_perfil', label: 'Perfil' },
    { id: 'usuarios', label: 'Usuários & Acessos' },
    { id: 'autofiscalizacao', label: 'AutoFiscalização' },
    { id: 'wfm_despacho', label: 'WFM / Despacho' }
  ];

  const PERMISSOES_EXTRA_GERAL = [
    { id: 'pode_abrir_chamado', label: 'Abrir Chamados' },
    { id: 'pode_cadastrar_veiculo', label: 'Cadastrar Veículos' },
    { id: 'pode_cadastrar_colaborador', label: 'Cadastrar Colaborador (Geral)' },
    { id: 'pode_montar_equipe', label: 'Montar Equipes (Geral)' },
    { id: 'ver_producao_operacional', label: 'Ver Prod. Operacional' },
    { id: 'ver_indicadores_financeiros', label: 'Ver Ind. Financeiros' },
    { id: 'pode_editar_acessos', label: 'Gerir Acessos (Usuários e Matriz)' },
    { id: 'pode_alterar_etapa_manual', label: 'Alteração Manual de Etapa (Gestão)' },
    { id: 'pode_concluir_chamado_oficina', label: 'Concluir Manutenção Oficina (Interna / Externa)' },
    { id: 'pode_movimentar_oficinas', label: 'Movimentar Veículos entre Oficinas (Interna ⇄ Externa)' },
    { id: 'pode_configurar_buckets', label: 'WFM: Configurar / Gerenciar Buckets (Hierarquia, Inativação e Exclusão)' },
    { id: 'pode_editar_os_wfm', label: 'WFM: Editar OS / Atividades' }
  ];

  const PERMISSOES_EXTRA_FORCA = [
    { id: 'forca_editar_colaborador', label: 'Força: Editar Colaborador' },
    { id: 'forca_editar_vagas', label: 'Força: Editar Vagas / Protocolo RH' },
    { id: 'forca_carregar_budget', label: 'Força: Carregar Budget (Excel)' },
    { id: 'forca_carregar_forca_op', label: 'Força: Carregar Força OP (Excel)' },
    { id: 'forca_formar_equipe', label: 'Força: Formar Nova Equipe' }
  ];

  const fetchAcessos = async () => {
    setLoading(true);
    const { data } = await supabase.from('config_acessos').select('*');
    if (data) setAcessos(data);
    setLoading(false);
  };

  useEffect(() => { fetchAcessos(); }, []);

  const getAcesso = (setor, perfil) => {
    const match = acessos.find(a =>
      (a.setor || '').trim().toUpperCase() === (setor || '').trim().toUpperCase() &&
      (a.perfil || '').trim().toUpperCase() === (perfil || '').trim().toUpperCase()
    );
    if (match) return match;

    const defaultMatch = DEFAULT_CONFIG_ACESSOS.find(d =>
      (d.setor || '').trim().toUpperCase() === (setor || '').trim().toUpperCase() &&
      (d.perfil || '').trim().toUpperCase() === (perfil || '').trim().toUpperCase()
    );
    if (defaultMatch) {
      return {
        setor,
        perfil,
        modulos_visiveis: [...defaultMatch.modulos_visiveis],
        permissoes_edicao: { ...defaultMatch.permissoes_edicao }
      };
    }

    return { 
      setor, perfil, modulos_visiveis: [], permissoes_edicao: {} 
    };
  };

  const handleToggleModulo = (setor, perfil, moduloId) => {
    setAcessos(prev => {
      const matchIdx = prev.findIndex(a =>
        (a.setor || '').trim().toUpperCase() === (setor || '').trim().toUpperCase() &&
        (a.perfil || '').trim().toUpperCase() === (perfil || '').trim().toUpperCase()
      );
      let newItem = matchIdx >= 0 ? { ...prev[matchIdx] } : getAcesso(setor, perfil);
      
      const modulosList = newItem.modulos_visiveis || [];
      const hasModulo = modulosList.includes(moduloId);
      
      if (hasModulo) newItem.modulos_visiveis = modulosList.filter(m => m !== moduloId);
      else newItem.modulos_visiveis = [...modulosList, moduloId];

      if (matchIdx >= 0) {
        const copy = [...prev]; copy[matchIdx] = newItem; return copy;
      } else {
        return [...prev, newItem];
      }
    });
  };

  const handleToggleExtra = (setor, perfil, extraId) => {
    setAcessos(prev => {
      const matchIdx = prev.findIndex(a =>
        (a.setor || '').trim().toUpperCase() === (setor || '').trim().toUpperCase() &&
        (a.perfil || '').trim().toUpperCase() === (perfil || '').trim().toUpperCase()
      );
      let newItem = matchIdx >= 0 ? { ...prev[matchIdx] } : getAcesso(setor, perfil);
      
      const currentEdicao = newItem.permissoes_edicao || {};
      newItem.permissoes_edicao = { ...currentEdicao, [extraId]: !currentEdicao[extraId] };

      if (matchIdx >= 0) {
        const copy = [...prev]; copy[matchIdx] = newItem; return copy;
      } else {
        return [...prev, newItem];
      }
    });
  };

  const handleToggleAllModulos = (setor, moduloId) => {
    setAcessos(prev => {
      let copy = [...prev];
      let todosTem = true;
      for (const p of PERFIS) {
        const item = copy.find(a =>
          (a.setor || '').trim().toUpperCase() === (setor || '').trim().toUpperCase() &&
          (a.perfil || '').trim().toUpperCase() === (p || '').trim().toUpperCase()
        ) || getAcesso(setor, p);
        if (!(item.modulos_visiveis || []).includes(moduloId)) {
          todosTem = false; break;
        }
      }

      for (const p of PERFIS) {
        const matchIdx = copy.findIndex(a =>
          (a.setor || '').trim().toUpperCase() === (setor || '').trim().toUpperCase() &&
          (a.perfil || '').trim().toUpperCase() === (p || '').trim().toUpperCase()
        );
        let newItem = matchIdx >= 0 ? { ...copy[matchIdx] } : getAcesso(setor, p);
        const modulosList = newItem.modulos_visiveis || [];
        
        if (todosTem) {
           newItem.modulos_visiveis = modulosList.filter(m => m !== moduloId);
        } else {
           if (!modulosList.includes(moduloId)) newItem.modulos_visiveis = [...modulosList, moduloId];
        }

        if (matchIdx >= 0) copy[matchIdx] = newItem;
        else copy.push(newItem);
      }
      return copy;
    });
  };

  const handleToggleAllExtra = (setor, extraId) => {
    setAcessos(prev => {
      let copy = [...prev];
      let todosTem = true;
      for (const p of PERFIS) {
        const item = copy.find(a =>
          (a.setor || '').trim().toUpperCase() === (setor || '').trim().toUpperCase() &&
          (a.perfil || '').trim().toUpperCase() === (p || '').trim().toUpperCase()
        ) || getAcesso(setor, p);
        if (!(item.permissoes_edicao || {})[extraId]) {
          todosTem = false; break;
        }
      }

      for (const p of PERFIS) {
        const matchIdx = copy.findIndex(a =>
          (a.setor || '').trim().toUpperCase() === (setor || '').trim().toUpperCase() &&
          (a.perfil || '').trim().toUpperCase() === (p || '').trim().toUpperCase()
        );
        let newItem = matchIdx >= 0 ? { ...copy[matchIdx] } : getAcesso(setor, p);
        const currentEdicao = newItem.permissoes_edicao || {};
        newItem.permissoes_edicao = { ...currentEdicao, [extraId]: !todosTem };
        if (matchIdx >= 0) copy[matchIdx] = newItem;
        else copy.push(newItem);
      }
      return copy;
    });
  };

  const handleSalvar = async () => {
    setSalvando(true);
    let errorCount = 0;
    for (const a of acessos) {
       const { error } = await supabase.from('config_acessos').upsert({
         setor: a.setor, perfil: a.perfil, modulos_visiveis: a.modulos_visiveis, permissoes_edicao: a.permissoes_edicao
       }, { onConflict: 'setor,perfil' });
       
       if (error) {
         console.error('Erro ao salvar no banco:', error);
         errorCount++;
       }
    }
    setSalvando(false);
    if (onUpdateConfigAcessos) {
      onUpdateConfigAcessos(acessos);
    }
    
    // Broadcast em tempo real para todos os clientes conectados atualizarem suas permissões instantaneamente
    try {
      const bChannel = supabase.channel('fleet-realtime-sync');
      await bChannel.send({
        type: 'broadcast',
        event: 'CONFIG_ACESSOS_UPDATED',
        payload: { timestamp: Date.now() }
      });
    } catch (e) {
      console.warn('Erro ao disparar broadcast:', e);
    }

    if (errorCount > 0) {
      if (showFeedback) {
        showFeedback('error', 'Atenção ao Salvar', `Ocorreram erros ao salvar algumas permissões (${errorCount} falhas). Verifique o console.`);
      } else {
        setMatrizFeedback({
          isOpen: true,
          type: 'error',
          title: 'Atenção ao Salvar',
          message: `Ocorreram erros ao salvar algumas permissões (${errorCount} falhas). Verifique o console.`
        });
      }
    } else {
      if (showFeedback) {
        showFeedback('success', 'Matriz de Acessos Atualizada!', 'Matriz de Acessos atualizada com sucesso! Todos os usuários logados foram sincronizados em tempo real.');
      } else {
        setMatrizFeedback({
          isOpen: true,
          type: 'success',
          title: 'Matriz de Acessos Atualizada!',
          message: 'Matriz de Acessos atualizada com sucesso! Todos os usuários logados foram sincronizados em tempo real.'
        });
      }
    }
  };

  const [activeSetor, setActiveSetor] = useState('Operações');

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Matriz de Acessos Avançada</h2>
          <p className="text-sm text-slate-500 font-medium">Controle de visualização e privilégios especiais por Setor e Perfil</p>
        </div>
        <button onClick={handleSalvar} disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm font-bold transition-all shadow-lg flex items-center gap-2">
          {salvando ? <Loader className="animate-spin" size={18} /> : <Save size={18} />} Salvar Configurações
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 custom-scrollbar">
        {SETORES.map(s => (
          <button key={s} onClick={() => setActiveSetor(s)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeSetor === s ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-100">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="bg-slate-100">
              <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 z-10 bg-slate-100 border-r border-slate-200">Módulos & Permissões</th>
              {PERFIS.map(p => (
                <th key={p} className="py-4 px-6 text-xs font-black text-slate-700 uppercase tracking-wider text-center">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* SEÇÃO 1: MÓDULOS VISÍVEIS */}
            <tr>
              <td colSpan={PERFIS.length + 1} className="py-3 px-6 text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50/50">Módulos Visíveis (Menu Lateral)</td>
            </tr>
            {MODULOS.map(m => (
              <tr key={m.id} className="hover:bg-white transition-colors">
                <td className="py-3 px-6 text-sm font-bold text-slate-600 sticky left-0 z-10 bg-slate-50 border-r border-slate-100 flex items-center justify-between gap-4">
                  <span>{m.label}</span>
                  <button onClick={() => handleToggleAllModulos(activeSetor, m.id)} className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-md font-bold transition-all uppercase">Marcar Todos</button>
                </td>
                {PERFIS.map(p => {
                  const item = getAcesso(activeSetor, p);
                  const isChecked = (item.modulos_visiveis || []).includes(m.id);
                  return (
                    <td key={p} className="py-3 px-6 text-center">
                       <button onClick={() => handleToggleModulo(activeSetor, p, m.id)} className={`w-12 h-6 rounded-full relative transition-colors ${isChecked ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                         <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isChecked ? 'left-7' : 'left-1'}`}></div>
                       </button>
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* SEÇÃO 2: PRIVILÉGIOS GERAIS E FROTA */}
            <tr>
              <td colSpan={PERFIS.length + 1} className="py-3 px-6 text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50/50">Privilégios Especiais (Operações & Frota)</td>
            </tr>
            {PERMISSOES_EXTRA_GERAL.map(ext => (
              <tr key={ext.id} className="hover:bg-white transition-colors">
                <td className="py-3 px-6 text-sm font-bold text-slate-600 sticky left-0 z-10 bg-slate-50 border-r border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2"><KeyRound size={14} className="text-amber-500"/> {ext.label}</div>
                  <button onClick={() => handleToggleAllExtra(activeSetor, ext.id)} className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1 rounded-md font-bold transition-all uppercase">Marcar Todos</button>
                </td>
                {PERFIS.map(p => {
                  const item = getAcesso(activeSetor, p);
                  const isChecked = (item.permissoes_edicao || {})[ext.id] === true;
                  return (
                    <td key={p} className="py-3 px-6 text-center">
                       <button onClick={() => handleToggleExtra(activeSetor, p, ext.id)} className={`w-12 h-6 rounded-full relative transition-colors ${isChecked ? 'bg-amber-500' : 'bg-slate-300'}`}>
                         <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isChecked ? 'left-7' : 'left-1'}`}></div>
                       </button>
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* SEÇÃO 3: PRIVILÉGIOS ESPECIAIS FORÇA DE TRABALHO */}
            <tr>
              <td colSpan={PERFIS.length + 1} className="py-3 px-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50/50">Privilégios Especiais (Força de Trabalho & RH)</td>
            </tr>
            {PERMISSOES_EXTRA_FORCA.map(ext => (
              <tr key={ext.id} className="hover:bg-white transition-colors">
                <td className="py-3 px-6 text-sm font-bold text-slate-600 sticky left-0 z-10 bg-slate-50 border-r border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2"><KeyRound size={14} className="text-emerald-500"/> {ext.label}</div>
                  <button onClick={() => handleToggleAllExtra(activeSetor, ext.id)} className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded-md font-bold transition-all uppercase">Marcar Todos</button>
                </td>
                {PERFIS.map(p => {
                  const item = getAcesso(activeSetor, p);
                  const isChecked = (item.permissoes_edicao || {})[ext.id] === true;
                  return (
                    <td key={p} className="py-3 px-6 text-center">
                       <button onClick={() => handleToggleExtra(activeSetor, p, ext.id)} className={`w-12 h-6 rounded-full relative transition-colors ${isChecked ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                         <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isChecked ? 'left-7' : 'left-1'}`}></div>
                       </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CustomFeedbackModal 
        {...matrizFeedback} 
        onConfirm={() => setMatrizFeedback(prev => ({ ...prev, isOpen: false }))} 
        onCancel={() => setMatrizFeedback(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}

function UsuariosView({ users, setUsers, syncToSupabase, deleteFromSupabase, currentUser, onUpdateConfigAcessos, showFeedback }) {
  const [activeSubTab, setActiveSubTab] = useState('lista');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [usuarioSenhaProvisoria, setUsuarioSenhaProvisoria] = useState(null);

  const isGerenteLocal = currentUser?.perfil === 'GERENTE' || currentUser?.perfil === 'ADMINISTRADOR';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const { data } = await supabase.from('usuarios').select('*');
    if (data) setUsers(data);
    setIsRefreshing(false);
  };

  const broadcastUserUpdate = async (userRecord) => {
    try {
      const bChannel = supabase.channel('fleet-realtime-sync');
      await bChannel.send({
        type: 'broadcast',
        event: 'USER_UPDATED',
        payload: { user: userRecord }
      });
    } catch (e) {
      console.warn('Erro ao disparar broadcast:', e);
    }
  };

  const handleUpdateStatus = async (user, newStatus) => {
    const updated = { ...user, status: newStatus };
    setUsers(users.map(u => u.id === user.id ? updated : u));
    if (syncToSupabase) await syncToSupabase('usuarios', { id: user.id, status: newStatus });
    broadcastUserUpdate(updated);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Atenção! Deseja realmente excluir este usuário permanentemente?")) {
      setUsers(users.filter(u => u.id !== id));
      if (deleteFromSupabase) await deleteFromSupabase('usuarios', id);
    }
  };

  const handleSaveEdit = async (updatedUser) => {
    const payload = {
      id: updatedUser.id,
      nome: updatedUser.nome,
      login: updatedUser.login,
      setor: updatedUser.setor,
      regional: updatedUser.regional,
      perfil: updatedUser.perfil,
      status: updatedUser.status
    };
    setUsers(users.map(u => u.id === updatedUser.id ? { ...u, ...payload } : u));
    if (syncToSupabase) await syncToSupabase('usuarios', payload);
    broadcastUserUpdate(payload);
    setEditingUser(null);
  };

  const filteredUsers = (users || []).filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nome = (u.nome || '').toLowerCase();
    const login = (u.login || '').toLowerCase();
    const mat = (u.matricula || '').toLowerCase();
    return nome.includes(q) || login.includes(q) || mat.includes(q);
  });
  
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"><Lock className="text-emerald-500"/> Gestão de Acessos</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Aprovação de contas, senhas e matriz de permissões em tempo real</p>
        </div>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
           <button onClick={() => setActiveSubTab('lista')} className={"px-6 py-2.5 rounded-xl text-sm font-bold transition-all " + (activeSubTab === 'lista' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>Contas / Usuários</button>
           <button onClick={() => setActiveSubTab('matriz')} className={"px-6 py-2.5 rounded-xl text-sm font-bold transition-all " + (activeSubTab === 'matriz' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>Matriz de Acessos</button>
        </div>
      </div>
      
      {activeSubTab === 'matriz' ? (
        <MatrizAcessosView currentUser={currentUser} onUpdateConfigAcessos={onUpdateConfigAcessos} showFeedback={showFeedback} />
      ) : (
        <>
        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
            <div>
              <h3 className="text-xl font-black text-blue-950 mb-2 flex items-center gap-3">Contas de Usuários</h3>
              <p className="text-slate-500 font-medium text-sm">Aprove solicitações, redefina senhas com segurança Zero-Knowledge e defina níveis de acesso.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por nome, email ou mat..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-full text-sm font-medium outline-none transition-all"
                />
              </div>
              <button onClick={handleRefresh} disabled={isRefreshing} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 w-full md:w-auto shrink-0 whitespace-nowrap h-9">
                {isRefreshing ? <><Loader className="animate-spin" size={16}/> Atualizando...</> : <><RefreshCcw size={16}/> Atualizar Lista</>}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Nome / Login</th>
                  <th className="py-4 px-6">Status / Últ. Acesso</th>
                  <th className="py-4 px-6">Perfil</th>
                  <th className="py-4 px-6">Setor / Regional</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${u.status === 'PENDENTE' ? 'bg-amber-400' : u.status === 'APROVADO' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                          {u.nome ? u.nome.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-blue-950">{u.nome}</p>
                          <p className="text-xs text-slate-500">{u.login} | Mat: {u.matricula || '-'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${u.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' : u.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {u.status}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          Ult. Acesso: {(() => {
                            const t = u.ultimoLogin || u.ultimo_login || u.ultimologin;
                            if (!t) return 'Nunca';
                            const formatted = formatarDataBR(t);
                            return formatted === '--' ? 'Nunca' : formatted;
                          })()}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      {u.status === 'APROVADO' && !editingUser ? (
                         <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{u.perfil}</span>
                      ) : u.status === 'APROVADO' && editingUser?.id === u.id ? (
                         <select className="p-2 rounded-lg border border-slate-200 outline-none text-sm font-bold text-slate-700" value={editingUser.perfil} onChange={e => setEditingUser({...editingUser, perfil: e.target.value})}>
                            <option value="VISUALIZADOR">VISUALIZADOR</option>
                            <option value="ANALISTA">ANALISTA</option>
                            <option value="SUPERVISOR">SUPERVISOR</option>
                            <option value="COORDENADOR">COORDENADOR</option>
                            <option value="FROTA">FROTA</option>
                            <option value="MECANICO">MECÂNICO</option>
                            <option value="AUDITOR">AUDITOR</option>
                            <option value="INSPETOR">INSPETOR</option>
                            <option value="GERENTE">GERENTE</option>
                            {currentUser?.perfil === 'ADMINISTRADOR' && <option value="ADMINISTRADOR">ADMINISTRADOR</option>}
                         </select>
                      ) : (
                         <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      {u.status === 'APROVADO' && !editingUser ? (
                         <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{u.setor || 'Operações'} | {u.regional || 'Norte'}</span>
                      ) : u.status === 'APROVADO' && editingUser?.id === u.id ? (
                         <div className="flex gap-2">
                           <select className="p-2 rounded-lg border border-slate-200 outline-none text-sm font-bold text-slate-700" value={editingUser.setor || 'Operações'} onChange={e => setEditingUser({...editingUser, setor: e.target.value})}>
                              <option value="Operações">Operações</option>
                              <option value="Frota">Frota</option>
                              <option value="Logística">Logística</option>
                              <option value="Diretoria">Diretoria</option>
                              <option value="Financeiro">Financeiro</option>
                              <option value="T.I">T.I</option>
                              <option value="Facility">Facility</option>
                              <option value="Compras">Compras</option>
                              <option value="RH">RH</option>
                           </select>
                           <select className="p-2 rounded-lg border border-slate-200 outline-none text-sm font-bold text-slate-700" value={editingUser.regional || 'Norte'} onChange={e => setEditingUser({...editingUser, regional: e.target.value})}>
                              <option value="Norte">Norte</option>
                              <option value="Leste">Leste</option>
                              <option value="Global">Global</option>
                           </select>
                         </div>
                      ) : (
                         <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão de Definir Senha Provisória (Apenas Administrador e Gerente) */}
                        {isGerenteLocal && (
                          <button 
                            onClick={() => setUsuarioSenhaProvisoria(u)} 
                            className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold" 
                            title="Definir Senha Provisória"
                          >
                            <KeyRound size={16} />
                            <span className="hidden sm:inline">Senha Prov.</span>
                          </button>
                        )}

                        {u.status === 'PENDENTE' && isGerenteLocal && (
                          <>
                            <button onClick={() => setEditingUser({ ...u, status: 'APROVADO', perfil: 'VISUALIZADOR', setor: u.setor || 'Operações', regional: u.regional || 'Norte' })} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Aprovar Acesso"><Unlock size={18}/></button>
                            <button onClick={() => handleBloquear(u.id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="Recusar/Bloquear"><Lock size={18}/></button>
                          </>
                        )}

                        {u.status === 'APROVADO' && isGerenteLocal && (
                          <>
                            {editingUser?.id === u.id ? (
                              <button onClick={() => handleSaveEdit(editingUser)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Salvar"><Save size={18}/></button>
                            ) : (
                              <button onClick={() => setEditingUser(u)} className="p-2 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" title="Editar"><Edit size={18}/></button>
                            )}
                            <button onClick={() => handleBloquear(u.id)} className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors" title="Bloquear"><Lock size={18}/></button>
                          </>
                        )}

                        {u.status === 'BLOQUEADO' && isGerenteLocal && (
                          <button onClick={() => setEditingUser({ ...u, status: 'APROVADO', perfil: u.perfil || 'VISUALIZADOR', setor: u.setor || 'Operações', regional: u.regional || 'Norte' })} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Desbloquear"><Unlock size={18}/></button>
                        )}

                        {isGerenteLocal && (
                           <button onClick={() => handleDelete(u.id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors ml-1" title="Excluir"><Trash2 size={18}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 font-bold">Nenhum usuário encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingUser && (
          <ModalEditarUsuario 
            usuario={editingUser} 
            onClose={() => setEditingUser(null)} 
            onSave={handleSaveEdit} 
          />
        )}

        {usuarioSenhaProvisoria && (
          <ModalDefinirSenhaProvisoria
            usuario={usuarioSenhaProvisoria}
            onClose={() => setUsuarioSenhaProvisoria(null)}
            onSuccess={(updated) => {
              setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
              broadcastUserUpdate(updated);
            }}
          />
        )}
        </>
      )}
    </div>
  );
}

function ModalEditarUsuario({ usuario, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...usuario });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-blue-950/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors"><X size={20} /></button>

        <h3 className="text-2xl font-black text-blue-950 mb-2 flex items-center gap-3"><Edit className="text-emerald-500"/> Editar Acesso</h3>
        <p className="text-xs text-slate-500 font-medium mb-6">Ajuste os parâmetros de perfil, setor e permissões de acesso.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Nome Completo</label>
            <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500 uppercase text-sm" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value.toUpperCase()})} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Login / E-mail</label>
            <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.login} onChange={e => setFormData({...formData, login: e.target.value})} />
          </div>

          {/* Banner explicativo de Segurança */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
            <KeyRound size={18} className="text-purple-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Segurança a senha do usuário é criptografada e não pode ser visualizada. Para redefinir, utilize o botão "Senha Prov." na listagem de usuários.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2">Setor</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.setor || 'Operações'} onChange={e => setFormData({...formData, setor: e.target.value})}>
                <option value="Operações">Operações</option>
                <option value="Frota">Frota</option>
                <option value="Logística">Logística</option>
                <option value="Diretoria">Diretoria</option>
                <option value="Financeiro">Financeiro</option>
                <option value="T.I">T.I</option>
                <option value="Facility">Facility</option>
                <option value="Compras">Compras</option>
                <option value="RH">RH</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2">Regional</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.regional || 'Norte'} onChange={e => setFormData({...formData, regional: e.target.value})}>
                <option value="Norte">Norte</option>
                <option value="Leste">Leste</option>
                <option value="Global">Global</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2">Perfil</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.perfil} onChange={e => setFormData({...formData, perfil: e.target.value})}>
                <option value="VISUALIZADOR">VISUALIZADOR</option>
                <option value="ANALISTA">ANALISTA</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="COORDENADOR">COORDENADOR</option>
                <option value="FROTA">FROTA</option>
                <option value="MECANICO">MECÂNICO</option>
                <option value="AUDITOR">AUDITOR</option>
                <option value="INSPETOR">INSPETOR</option>
                <option value="GERENTE">GERENTE</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2">Status</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="APROVADO">APROVADO</option>
                <option value="PENDENTE">PENDENTE</option>
                <option value="BLOQUEADO">BLOQUEADO</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all mt-4">Salvar Alterações</button>
        </form>
      </div>
    </div>
  );
}

function AlertasDashboard({ chamados, currentUser, suppressPopup = false }) {
  const [showModal, setShowModal] = useState(true);
  const perfilUpper = String(currentUser?.perfil || '').toUpperCase().trim();
  if (!['FROTA', 'ADMINISTRADOR', 'ADMIN', 'COORDENADOR', 'GERENTE'].includes(perfilUpper)) {
    return null;
  }

  const activeAlerts = chamados.flatMap(c => {
    if (!c.alertas) return [];
    return c.alertas
      .filter(a => !a.acknowledgedBy?.includes(currentUser.login))
      .map(a => ({ ...a, chamadoId: c.id, placa: c.placa, codigo: c.codigoChamado || `ALP.M-${String(c.id).slice(-6)}` }));
  });

  if (activeAlerts.length === 0) return null;

  const handleAcknowledge = async (alerta) => {
    const chamado = chamados.find(c => c.id === alerta.chamadoId);
    if (!chamado) return;

    const updatedAlertas = chamado.alertas.map(a => 
      a.id === alerta.id 
        ? { ...a, acknowledgedBy: [...(a.acknowledgedBy || []), currentUser.login] } 
        : a
    );

    try {
      await supabase.from('chamados').update({ alertas: updatedAlertas }).eq('id', chamado.id);
    } catch (err) {
      console.error('Erro ao confirmar alerta:', err);
    }
  };

  const hasPopup = showModal && !suppressPopup && activeAlerts.length > 0;

  return (
    <>
      {hasPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-rose-500 p-8 flex flex-col items-center text-center relative">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
                <X size={20} />
              </button>
              <AlertTriangle size={56} className="text-white mb-4 animate-bounce" />
              <h2 className="text-2xl font-black text-white tracking-tight">ALERTA CRÍTICO</h2>
              <p className="text-rose-100 font-medium mt-2 text-sm">Você tem {activeAlerts.length} novo(s) registro(s) aguardando sua ciência imediata.</p>
            </div>
            
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950">
              {activeAlerts.map(alerta => (
                <div key={alerta.id} className={`p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm border bg-white dark:bg-slate-900 ${alerta.tipo === 'ESCALONAMENTO' ? 'border-rose-200 dark:border-rose-900/50' : 'border-amber-200 dark:border-amber-900/50'}`}>
                  <div className={`p-3 rounded-2xl shrink-0 ${alerta.tipo === 'ESCALONAMENTO' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                    <AlertTriangle size={28} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className={`font-black text-sm uppercase tracking-wide ${alerta.tipo === 'ESCALONAMENTO' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {alerta.tipo === 'ESCALONAMENTO' ? 'CHAMADO ESCALONADO' : 'NOVO DEFEITO'}
                      </h3>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                        {alerta.codigo} ({alerta.placa})
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{alerta.mensagem}</p>
                  </div>
                  <button onClick={() => handleAcknowledge(alerta)} className="w-full sm:w-auto shrink-0 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black rounded-xl transition-colors active:scale-95 shadow-md shadow-emerald-500/20">
                    CIENTE / OK
                  </button>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center bg-white dark:bg-slate-900">
              <button onClick={() => setShowModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                Lembrar depois (Deixar no mural)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Inline Card */}
      <div className="mb-6 space-y-3">
        {activeAlerts.map(alerta => (
          <div key={alerta.id} className={`p-4 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm border ${alerta.tipo === 'ESCALONAMENTO' ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30'}`}>
            <div className={`p-3 rounded-2xl shrink-0 ${alerta.tipo === 'ESCALONAMENTO' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-black text-sm uppercase tracking-wider ${alerta.tipo === 'ESCALONAMENTO' ? 'text-rose-900 dark:text-rose-300' : 'text-amber-900 dark:text-amber-300'}`}>
                  {alerta.tipo === 'ESCALONAMENTO' ? 'CHAMADO ESCALONADO' : 'NOVO DEFEITO'}
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm">
                  {alerta.codigo} ({alerta.placa})
                </span>
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-snug">{alerta.mensagem}</p>
            </div>
            <button onClick={() => handleAcknowledge(alerta)} className="w-full sm:w-auto shrink-0 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-black rounded-xl border border-slate-200 dark:border-slate-700 transition-colors active:scale-95 shadow-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-900/50">
              CIENTE / OK
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function InicioView({ vehicles, chamados, rawChamados, hoje, currentUser, setActiveTab, setChamadoEmEdicao, theme, isWelcomeModalOpen, userPermissions }) {
  const [isConfiguring, setIsConfiguring] = useState(false);

  

  const hour = new Date().getHours();

  let saudacao = 'Bom dia';

  if (hour >= 12 && hour < 18) saudacao = 'Boa tarde';

  else if (hour >= 18 || hour < 5) saudacao = 'Boa noite';



  const [expandedBases, setExpandedBases] = useState({});

  const [summaryData, setSummaryData] = useState({ norte: [], leste: [], dates: [] });

  const [loadingSummary, setLoadingSummary] = useState(true);



  useEffect(() => {

    let active = true;

    const fetchSummary = async () => {

      try {

        setLoadingSummary(true);

        const { data: plans, error: planErr } = await supabase

          .from('planejamento_equipes')

          .select('*');

        if (planErr) throw planErr;



        const { data: recentDatesData, error: dateErr } = await supabase

          .from('entregas_equipes')

          .select('dataRegistro')

          .order('dataRegistro', { ascending: false });

        if (dateErr) throw dateErr;



        if (!active) return;



        const uniqueDates = [...new Set(recentDatesData.map(d => d.dataRegistro))]

          .sort()

          .slice(-5);



        if (uniqueDates.length === 0) {

          setSummaryData({ norte: [], leste: [], dates: [] });

          setLoadingSummary(false);

          return;

        }



        const latestDate = uniqueDates[uniqueDates.length - 1];

        const currentMonthStr = latestDate.substring(0, 7);

        const monthStart = `${currentMonthStr}-01`;

        const monthEnd = `${currentMonthStr}-31`;



        let monthRegs = [];

        let page = 0;

        let hasMore = true;

        while (hasMore) {

          const { data: pageData, error: regErr } = await supabase

            .from('entregas_equipes')

            .select('*')

            .gte('dataRegistro', monthStart)

            .lte('dataRegistro', monthEnd)

            .range(page * 1000, (page + 1) * 1000 - 1);

          if (regErr) throw regErr;

          if (pageData && pageData.length > 0) {

            monthRegs = [...monthRegs, ...pageData];

            if (pageData.length < 1000) {

              hasMore = false;

            } else {

              page++;

            }

          } else {

            hasMore = false;

          }

        }



        if (!active) return;



        const basesNorte = ['Fagundes Filho', 'Cajati', 'Vila Medeiros'];

        const basesLeste = ['Monte Santo', 'Catumbi', 'Aricanduva', 'Santo André'];

        const vehiclesList = ['Cesto Aéreo', 'Veículo Leve', 'Moto', 'LV', 'Munk'];



        const getNormalBase = (b) => {

          if (!b) return '';

          const val = b.trim().toLowerCase();

          if (val.includes('santo andre') || val.includes('santo andré')) return 'Santo André';

          if (val.includes('monte santo')) return 'Monte Santo';

          if (val.includes('catumbi')) return 'Catumbi';

          if (val.includes('aricanduva')) return 'Aricanduva';

          if (val.includes('fagundes filho')) return 'Fagundes Filho';

          if (val.includes('cajati')) return 'Cajati';

          if (val.includes('vila medeiros')) return 'Vila Medeiros';

          return b.trim();

        };



        const uniqueMonthDates = [...new Set(monthRegs.map(d => d.dataRegistro))];

        const numDaysWithData = uniqueMonthDates.length || 1;



        const processRegion = (bases) => {

          return bases.map(baseName => {

            const vehicles = vehiclesList.map(vType => {

              const basePlan = plans

                .filter(p => getNormalBase(p.base) === baseName && p.veiculo === vType)

                .reduce((sum, p) => sum + p.quantidadePlan, 0);



              const dailyReal = uniqueDates.map(date => {

                return monthRegs.filter(r => {

                  if (r.dataRegistro !== date) return false;

                  if (r.veiculo !== vType) return false;

                  const actualTeam = r.nome || '';

                  const actualPrefix = actualTeam.substring(0, 3);

                  const actualMeta = PREFIX_TO_BASE[actualPrefix];

                  let rBase = r.base;

                  if (actualMeta) {

                    rBase = actualMeta.base;

                  }

                  return getNormalBase(rBase) === baseName;

                }).length;

              });



              const totalMonthReal = monthRegs.filter(r => {

                if (r.veiculo !== vType) return false;

                const actualTeam = r.nome || '';

                const actualPrefix = actualTeam.substring(0, 3);

                const actualMeta = PREFIX_TO_BASE[actualPrefix];

                let rBase = r.base;

                if (actualMeta) {

                  rBase = actualMeta.base;

                }

                return getNormalBase(rBase) === baseName;

              }).length;



              const avgReal = parseFloat((totalMonthReal / numDaysWithData).toFixed(1));



              return {

                type: vType,

                plan: basePlan,

                dailyReal,

                avgReal

              };

            });



            const totalRow = {

              type: 'Total',

              plan: vehicles.reduce((sum, v) => sum + v.plan, 0),

              dailyReal: uniqueDates.map((_, idx) => vehicles.reduce((sum, v) => sum + v.dailyReal[idx], 0)),

              avgReal: parseFloat(vehicles.reduce((sum, v) => sum + v.avgReal, 0).toFixed(1))

            };



            return {

              base: baseName,

              vehicles,

              total: totalRow

            };

          });

        };



        setSummaryData({

          norte: processRegion(basesNorte),

          leste: processRegion(basesLeste),

          dates: uniqueDates

        });

      } catch (err) {

        console.error('Erro ao buscar resumo de equipes:', err);

      } finally {

        if (active) setLoadingSummary(false);

      }

    };



    fetchSummary();

    return () => { active = false; };

  }, []);



  const dataFormatada = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(hoje);

  const setorNormDash = (currentUser?.setor || '').trim().toUpperCase();
  const perfilNormDash = (currentUser?.perfil || '').trim().toUpperCase();
  const isFrota = setorNormDash === 'FROTA' || perfilNormDash === 'FROTA' || perfilNormDash === 'MECANICO';



  const storageKey = `shortcuts_${currentUser?.login || 'default'}`;

  const [pinnedShortcuts, setPinnedShortcuts] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (userPermissions && Array.isArray(userPermissions.modulos_visiveis)) {
            return parsed.filter(id => userPermissions.modulos_visiveis.includes(id));
          }
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    const defaultList = isFrota ? ['chamados', 'frota', 'entrega_equipes', 'painel_tv', 'historico'] : ['dashboard', 'chamados', 'frota', 'entrega_equipes', 'calendario'];
    if (userPermissions && Array.isArray(userPermissions.modulos_visiveis)) {
      return defaultList.filter(id => userPermissions.modulos_visiveis.includes(id));
    }
    return defaultList;
  });

  const toggleShortcut = (id) => {
    let updated;
    if (pinnedShortcuts.includes(id)) {
      updated = pinnedShortcuts.filter(x => x !== id);
    } else {
      updated = [...pinnedShortcuts, id];
    }
    setPinnedShortcuts(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const allShortcuts = [
    { id: 'calendario', label: 'Calendário Operacional', icon: <CalendarCheck size={20} />, color: 'bg-blue-600 text-white', desc: 'Programação de DDS e Paradas de Segurança.', allowed: (u) => u?.perfil !== 'FROTA' },
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, color: 'bg-indigo-500 text-white', desc: 'Métricas gerais, ociosidade e andamento de chamados.', allowed: (u) => u?.perfil !== 'FROTA' },
    { id: 'chamados', label: 'Chamados (E-CAR)', icon: <Wrench size={20} />, color: 'bg-emerald-500 text-white', desc: 'Abertura, edição e controle do fluxo E-CAR.', allowed: () => true },
    { id: 'frota', label: 'Frota de Veículos', icon: <CarFront size={20} />, color: 'bg-blue-500 text-white', desc: 'Cadastro, status e histórico dos veículos cadastrados.', allowed: () => true },
    { id: 'ociosidade_frota', label: 'Ociosidade Frota', icon: <Activity size={20} />, color: 'bg-amber-500 text-white', desc: 'Relatório e gráficos de ociosidade de veículos.', allowed: (u) => u?.perfil !== 'FROTA' },
    { id: 'painel_tv', label: 'Painel TV', icon: <Tv size={20} />, color: 'bg-rose-500 text-white', desc: 'Modo quiosque/TV para monitoramento em tempo real.', allowed: () => true },
    { id: 'fidelizacao', label: 'Indicador Fidelização', icon: <ShieldCheck size={20} />, color: 'bg-teal-500 text-white', desc: 'Análise de fidelização das equipes nos veículos.', allowed: (u) => u?.perfil !== 'FROTA' },
    { id: 'cadastro_oficinas', label: 'Cadastro de Oficinas', icon: <Building2 size={20} />, color: 'bg-slate-600 text-white', desc: 'Gestão cadastral de oficinas credenciadas.', allowed: () => true },
    { id: 'entrega_equipes', label: 'Entrega Equipes', icon: <ClipboardCheck size={20} />, color: 'bg-purple-500 text-white', desc: 'Dashboard de evolução e planejamento de equipes.', allowed: () => true },
    { id: 'colaboradores', label: 'Colaboradores', icon: <Users size={20} />, color: 'bg-cyan-500 text-white', desc: 'Gestão cadastral de equipes e motoristas.', allowed: (u) => u?.perfil !== 'FROTA' },
    { id: 'forca', label: 'Força de Trabalho', icon: <Briefcase size={20} />, color: 'bg-pink-500 text-white', desc: 'Alocação de equipes e vínculos operacionais.', allowed: (u) => u?.perfil !== 'FROTA' },
    { id: 'historico', label: 'Histórico / Filtros', icon: <History size={20} />, color: 'bg-slate-500 text-white', desc: 'Histórico completo de chamados e filtros avançados.', allowed: () => true },
    { id: 'meu_perfil', label: 'Meu Perfil', icon: <User size={20} />, color: 'bg-orange-500 text-white', desc: 'Edição de dados cadastrais e visualização de chamados abertos.', allowed: () => true },
    { id: 'usuarios', label: 'Usuários (Acessos)', icon: <Lock size={20} />, color: 'bg-red-500 text-white', desc: 'Gestão de permissões de acesso ao sistema.', allowed: (u) => (u?.perfil === 'ADMINISTRADOR' || u?.perfil === 'COORDENADOR') && u?.perfil !== 'FROTA' },
  ];

  const allowedShortcuts = allShortcuts.filter(s => {
    if (!s.allowed(currentUser)) return false;
    if (userPermissions && Array.isArray(userPermissions.modulos_visiveis)) {
      return userPermissions.modulos_visiveis.includes(s.id);
    }
    return true;
  });

  const activeShortcuts = allowedShortcuts.filter(s => pinnedShortcuts.includes(s.id));



  const meusChamados = React.useMemo(() => {

    return chamados.filter(c => {

      if (c.dadosWorkflow?.criadoPor && String(c.dadosWorkflow.criadoPor).toUpperCase() === String(currentUser.nome).toUpperCase()) {

        return true;

      }

      if (c.historicoModificacoes && c.historicoModificacoes.length > 0) {

        const primeiroLog = c.historicoModificacoes[c.historicoModificacoes.length - 1];

        return primeiroLog && String(primeiroLog.usuario).toUpperCase() === String(currentUser.nome).toUpperCase();

      }

      return false;

    });

  }, [chamados, currentUser]);



  const atencaoChamados = React.useMemo(() => {

    return chamados.filter(c => {

      if (c.status !== 'ABERTO') return false;

      if (isFrota) {

        return ['Análise Frota', 'Aguardando Manutenção', 'Oficina Interna', 'Desequipado - Entrada Oficina', 'Oficina Externa'].includes(c.etapaWorkflow);

      } else {

        return ['Aguardando Desequipar', 'Liberado Operação'].includes(c.etapaWorkflow);

      }

    });

  }, [chamados, currentUser]);



  const getRoleBadgeColor = (role) => {

    switch (role) {

      case 'ADMINISTRADOR': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';

      case 'GERENTE': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';

      case 'COORDENADOR': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';

      case 'FROTA': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';

      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';

    }

  };



  const getEtapaBadgeColor = (etapa, c) => {

    switch (etapa) {

      case 'Aguardando Desequipar': return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50';

      case 'Liberado Operação': return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50';

      case 'Desequipado - Entrada Oficina': return 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50';

      case 'Oficina Externa': return 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50';

      case 'Análise Frota':

      case 'Aguardando Manutenção': return 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50';

      case 'Oficina Interna': 
        if (c?.dadosWorkflow?.subFluxoOficina?.status === 'COMPRAS') return 'bg-amber-100 text-amber-700 border-amber-200';
        if (c?.dadosWorkflow?.subFluxoOficina?.status === 'FINANCEIRO') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (c?.dadosWorkflow?.subFluxoOficina?.status === 'PAGO') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        return 'bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-900/50';

      default: return 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-800';

    }

  };



  const toggleBaseExpand = (baseName) => {

    setExpandedBases(prev => ({

      ...prev,

      [baseName]: !prev[baseName]

    }));

  };



  const formatHeaderDate = (dateStr) => {

    if (!dateStr) return '';

    const [, month, day] = dateStr.split('-');

    return `${day}/${month}`;

  };



  const renderCellContent = (plan, real) => {

    const reached = real >= plan;

    const colorClass = reached 

      ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' 

      : 'text-rose-600 dark:text-rose-400 font-extrabold';

    return (

      <div className="flex items-center justify-center gap-1 font-mono text-[11px]">

        <span className="text-slate-400 dark:text-slate-500 font-medium">{plan}</span>

        <span className="text-slate-300 dark:text-slate-700">/</span>

        <span className={colorClass}>{real}</span>

      </div>

    );

  };



  const renderAvgCellContent = (plan, avgReal) => {

    const reached = avgReal >= plan;

    const colorClass = reached 

      ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' 

      : 'text-rose-600 dark:text-rose-400 font-extrabold';

    return (

      <div className="flex items-center justify-center gap-1 font-mono text-[11px]">

        <span className="text-slate-400 dark:text-slate-500 font-medium">{plan}</span>

        <span className="text-slate-300 dark:text-slate-700">/</span>

        <span className={colorClass}>{avgReal.toFixed(1)}</span>

      </div>

    );

  };



  const renderRegionTable = (regionBases, dates) => {

    if (regionBases.length === 0) {

      return (

        <div className="py-12 text-center text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider">

          Sem dados de entregas disponíveis

        </div>

      );

    }



    const regionalPlan = regionBases.reduce((sum, b) => sum + b.total.plan, 0);

    const regionalDailyReal = dates.map((_, idx) => regionBases.reduce((sum, b) => sum + b.total.dailyReal[idx], 0));

    const regionalAvgReal = parseFloat(regionBases.reduce((sum, b) => sum + b.total.avgReal, 0).toFixed(1));



    return (

      <div className="overflow-x-auto">

        <table className="w-full border-collapse">

          <thead>

            <tr className="border-b border-slate-100 dark:border-slate-900 text-[10px] font-black uppercase text-slate-400 tracking-wider">

              <th className="pb-2 text-left min-w-[130px]">Base / Veículo</th>

              {dates.map(d => (

                <th key={d} className="pb-2 text-center font-mono">{formatHeaderDate(d)}</th>

              ))}

              <th className="pb-2 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-t-xl font-bold">Média Mês</th>

            </tr>

          </thead>

          <tbody className="divide-y divide-slate-50 dark:divide-slate-900 text-xs font-bold">

            {/* REGIONAL TOTAL ROW */}

            <tr className="bg-slate-100/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-150 border-b-2 border-slate-200 dark:border-slate-850">

              <td className="py-2.5 px-2 text-left uppercase font-black tracking-wider flex items-center gap-1.5">

                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></span>

                Total Região

              </td>

              {regionalDailyReal.map((real, idx) => (

                <td key={idx} className="py-2.5 text-center">

                  {renderCellContent(regionalPlan, real)}

                </td>

              ))}

              <td className="py-2.5 text-center font-extrabold bg-slate-100/80 dark:bg-slate-900/80">

                {renderAvgCellContent(regionalPlan, regionalAvgReal)}

              </td>

            </tr>



            {regionBases.map(bBlock => {

              const isExpanded = !!expandedBases[bBlock.base];

              return (

                <React.Fragment key={bBlock.base}>

                  {/* BASE ROW */}

                  <tr 

                    onClick={() => toggleBaseExpand(bBlock.base)}

                    className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors text-blue-950 dark:text-slate-200"

                  >

                    <td className="py-2.5 pr-2 flex items-center gap-1.5 uppercase font-black tracking-wide text-left">

                      <span className="text-slate-400">

                        {isExpanded ? <ChevronDown size={14} className="stroke-[3]" /> : <ChevronRight size={14} className="stroke-[3]" />}

                      </span>

                      {bBlock.base}

                    </td>

                    {bBlock.total.dailyReal.map((real, idx) => (

                      <td key={idx} className="py-2.5 text-center">

                        {renderCellContent(bBlock.total.plan, real)}

                      </td>

                    ))}

                    <td className="py-2.5 text-center font-extrabold bg-slate-50/50 dark:bg-slate-900/30">

                      {renderAvgCellContent(bBlock.total.plan, bBlock.total.avgReal)}

                    </td>

                  </tr>



                  {/* CHILD VEHICLE ROWS */}

                  {isExpanded && bBlock.vehicles.map(v => (

                    <tr 

                      key={v.type}

                      className="bg-slate-50/35 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"

                    >

                      <td className="py-2 pl-7 pr-2 font-medium text-[11px] text-left">

                        {v.type === 'Cesto Aéreo' ? 'Cesto' : v.type === 'Veículo Leve' ? 'Leve' : v.type}

                      </td>

                      {v.dailyReal.map((real, idx) => (

                        <td key={idx} className="py-2 text-center">

                          {renderCellContent(v.plan, real)}

                        </td>

                      ))}

                      <td className="py-2 text-center bg-slate-50/30 dark:bg-slate-900/20">

                        {renderAvgCellContent(v.plan, v.avgReal)}

                      </td>

                    </tr>

                  ))}

                </React.Fragment>

              );

            })}

          </tbody>

        </table>

      </div>

    );

  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 px-1 sm:px-0">
      {/* 1. HERO GREETING BANNER (ELEMENTO 1) */}
      <div className={`relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${theme === 'dark' ? 'bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white border-slate-800' : 'bg-gradient-to-r from-emerald-50 via-teal-100/70 to-emerald-50 text-blue-950 border-emerald-200/50'}`}>
        {/* Background glow effects */}
        <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-[-50px] left-[20%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="space-y-3 z-10 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className={`text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full border ${theme === 'dark' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-100/60 border-emerald-200/50'}`}>{saudacao}</span>
            <span className={`text-[10px] font-black tracking-wider uppercase border px-2.5 py-0.5 rounded-full ${getRoleBadgeColor(currentUser?.perfil)}`}>
              {currentUser?.perfil}
            </span>
          </div>

          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-blue-950'}`}>
            Olá, {currentUser?.nome || 'Colaborador'}!
          </h1>

          <p className={`text-xs font-medium tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {dataFormatada}
          </p>
        </div>

        {/* Mini stats widgets inside hero */}
        <div className="flex flex-row gap-3 sm:gap-4 z-10 w-full md:w-auto">
          <div className={`backdrop-blur-md border rounded-2xl p-4 flex-1 sm:flex-initial min-w-[120px] ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Fila de Ações</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${atencaoChamados.length > 0 ? 'text-amber-500' : (theme === 'dark' ? 'text-slate-300' : 'text-blue-950')}`}>
                {atencaoChamados.length}
              </span>
              {atencaoChamados.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>}
            </div>
          </div>

          <div className={`backdrop-blur-md border rounded-2xl p-4 flex-1 sm:flex-initial min-w-[120px] ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Meus Chamados</p>
            <span className={`text-2xl font-black ${theme === 'dark' ? 'text-slate-300' : 'text-blue-950'}`}>
              {meusChamados.length}
            </span>
          </div>
        </div>
      </div>

      {/* 1.5 ALERTAS CRÍTICOS (FROTA / LIDERANÇA) */}
      <AlertasDashboard chamados={rawChamados || chamados} currentUser={currentUser} suppressPopup={isWelcomeModalOpen} />

      {/* 2. CRITICAL ATTENTION ALERTS (ELEMENTO 2) */}
      {atencaoChamados.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-amber-900 dark:text-amber-300 text-sm uppercase tracking-wide">Ações de Atenção Pendentes</h3>
              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium mt-1">
                {isFrota 
                  ? `Existem ${atencaoChamados.length} chamados aguardando aceite ou diagnóstico da Frota.`
                  : `Existem ${atencaoChamados.length} chamados aguardando desequipar ou liberação de teste pela Operação.`}
              </p>
            </div>
          </div>

          <a
            href="#fila-trabalho"
            className="w-full sm:w-auto text-center bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-2xl transition-all shrink-0 active:scale-95 shadow-md shadow-amber-600/20"
          >
            Ver Fila
          </a>
        </div>
      )}



      {/* 2.5 WORKFORCE DELIVERY REGIONAL SUMMARY CARDS */}

      <div className="space-y-4">

        <div className="flex items-center gap-3">

          <ClipboardCheck size={22} className="text-blue-600 dark:text-blue-400" />

          <div>

            <h2 className="text-lg font-black text-blue-950 dark:text-slate-200 uppercase tracking-wide">Resumo de Entrega de Equipes</h2>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Acompanhamento diário e média mensal (Planejado / Realizado)</p>

          </div>

        </div>



        {loadingSummary ? (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">

            <div className="h-[280px] bg-slate-100 dark:bg-slate-900 rounded-[2.5rem]"></div>

            <div className="h-[280px] bg-slate-100 dark:bg-slate-900 rounded-[2.5rem]"></div>

          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* CARD REGIAO NORTE */}

            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">

                <h3 className="text-sm font-black text-blue-950 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">

                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Região Norte

                </h3>

                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Últimos 5 Dias com Dados</span>

              </div>

              {renderRegionTable(summaryData.norte, summaryData.dates)}

            </div>



            {/* CARD REGIAO LESTE */}

            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">

                <h3 className="text-sm font-black text-blue-950 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">

                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Região Leste

                </h3>

                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Últimos 5 Dias com Dados</span>

              </div>

              {renderRegionTable(summaryData.leste, summaryData.dates)}

            </div>

          </div>

        )}

      </div>



      {/* 3. QUICK ACCESS SECTION (SOMENTE DESKTOP) */}
      <div className="hidden md:block bg-white dark:bg-slate-950 rounded-[2.5rem] p-6 lg:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">

        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-900">

          <div className="flex items-center gap-3">

            <LayoutGrid size={22} className="text-blue-600 dark:text-blue-400" />

            <div>

              <h2 className="text-lg font-black text-blue-950 dark:text-slate-200 uppercase tracking-wide">Acessos Rápidos</h2>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Atalhos dinâmicos do seu perfil</p>

            </div>

          </div>

          <button

            onClick={() => setIsConfiguring(!isConfiguring)}

            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${

              isConfiguring 

                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md shadow-blue-500/20' 

                : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'

            }`}

          >

            {isConfiguring ? 'Concluir' : 'Configurar Atalhos'}

          </button>

        </div>



        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {isConfiguring ? (

            allowedShortcuts.map((s) => {

              const isPinned = pinnedShortcuts.includes(s.id);

              return (

                <button

                  key={s.id}

                  onClick={() => toggleShortcut(s.id)}

                  className={`p-5 rounded-3xl border text-left transition-all relative flex flex-col justify-between h-[130px] group active:scale-98 ${

                    isPinned 

                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/40 text-blue-900 dark:text-blue-300' 

                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'

                  }`}

                >

                  <div className="flex justify-between items-start w-full">

                    <div className={`p-2.5 rounded-2xl ${s.color}`}>

                      {s.icon}

                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${

                      isPinned 

                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 

                        : 'border-slate-300 dark:border-slate-700'

                    }`}>

                      {isPinned && <Check size={12} className="stroke-[3]" />}

                    </div>

                  </div>

                  <div>

                    <h4 className="font-black text-sm">{s.label}</h4>

                    <p className="text-[10px] text-slate-400 mt-1 truncate">{s.desc}</p>

                  </div>

                </button>

              );

            })

          ) : (

            activeShortcuts.length > 0 ? (

              activeShortcuts.map((s) => (

                <button

                  key={s.id}

                  onClick={() => setActiveTab(s.id)}

                  className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-900 hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:bg-white dark:hover:bg-slate-900 rounded-3xl p-5 text-left transition-all duration-300 flex flex-col justify-between h-[140px] group shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-98"

                >

                  <div className={`p-3 rounded-2xl ${s.color} w-fit shadow-md group-hover:scale-105 transition-transform`}>

                    {s.icon}

                  </div>

                  <div>

                    <h4 className="font-black text-sm text-blue-950 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">

                      {s.label} <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />

                    </h4>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 line-clamp-2 leading-normal">{s.desc}</p>

                  </div>

                </button>

              ))

            ) : (

              <div className="col-span-full py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">

                Nenhum atalho fixado. Clique em "Configurar Atalhos" para adicionar.

              </div>

            )

          )}

        </div>

      </div>



      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        

        {/* 4. MEUS CHAMADOS ABERTOS (LEFT SIDE - 7/12 WIDE) */}

        <div className="lg:col-span-7 bg-white dark:bg-slate-950 rounded-[2.5rem] p-6 lg:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">

          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-900">

            <div className="flex items-center gap-3">

              <FileCheck size={22} className="text-emerald-500" />

              <div>

                <h2 className="text-lg font-black text-blue-950 dark:text-slate-200 uppercase tracking-wide">Meus Chamados</h2>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Últimos abertos por você</p>

              </div>

            </div>

            {!isFrota && (

              <button 

                onClick={() => setActiveTab('chamados')} 

                className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline"

              >

                Ver Todos

              </button>

            )}

          </div>



          <div className="overflow-x-auto">

            {meusChamados.length > 0 ? (

              <table className="w-full text-left border-collapse">

                <thead>

                  <tr className="border-b border-slate-100 dark:border-slate-900 text-[10px] font-black uppercase text-slate-400 tracking-wider">

                    <th className="pb-3 pr-2">Chamado</th>

                    <th className="pb-3 pr-2">Placa</th>

                    <th className="pb-3 pr-2">Data</th>

                    <th className="pb-3 pr-2">Etapa</th>

                    <th className="pb-3 text-right">Ação</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-50 dark:divide-slate-900 text-xs font-bold text-slate-700 dark:text-slate-350">

                  {meusChamados.slice(0, 5).map((c) => (

                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">

                      <td className="py-3 pr-2 text-blue-600 dark:text-blue-400 font-black">{c.numero}</td>

                      <td className="py-3 pr-2">{c.placa}</td>

                      <td className="py-3 pr-2 text-slate-400 dark:text-slate-500 text-[11px]">

                        {c.dataAbertura ? new Date(c.dataAbertura).toLocaleDateString('pt-BR') : '-'}

                      </td>

                      <td className="py-3 pr-2">

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${getEtapaBadgeColor(c.etapaWorkflow, c)}`}>

                          {c.etapaWorkflow}

                        </span>

                      </td>

                      <td className="py-3 text-right">

                        <button

                          onClick={() => setChamadoEmEdicao(c)}

                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-900 dark:hover:text-slate-200 rounded-full transition-all active:scale-90"

                          title="Ver Detalhes do Chamado"

                        >

                          <Eye size={16} />

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            ) : (

              <div className="py-10 text-center flex flex-col items-center justify-center gap-3">

                <FileCheck size={32} className="text-slate-300 dark:text-slate-700" />

                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Nenhum chamado aberto recentemente</p>

              </div>

            )}

          </div>

        </div>



        {/* 5. FILA DE TRABALHO - SOB MINHA ATENÇÃO (RIGHT SIDE - 5/12 WIDE) */}

        <div id="fila-trabalho" className="lg:col-span-5 bg-white dark:bg-slate-950 rounded-[2.5rem] p-6 lg:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">

          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-900">

            <div className="flex items-center gap-3">

              <CheckSquare size={22} className="text-amber-500" />

              <div>

                <h2 className="text-lg font-black text-blue-950 dark:text-slate-200 uppercase tracking-wide">Fila de Trabalho</h2>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Aguardando Ação do seu grupo</p>

              </div>

            </div>

          </div>



          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">

            {atencaoChamados.length > 0 ? (

              atencaoChamados.map((c) => (

                <div 

                  key={c.id}

                  className="bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-900 hover:border-slate-200 dark:hover:border-slate-800 rounded-2xl p-4 transition-all flex justify-between items-center gap-4 group"

                >

                  <div className="space-y-1">

                    <div className="flex items-center gap-2">

                      <span className="text-blue-600 dark:text-blue-400 font-black text-xs">{c.numero}</span>

                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">| Placa: {c.placa}</span>

                    </div>

                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 truncate max-w-[200px]">

                      Defeito: {c.defeitoPrincipal || 'Não informado'}

                    </p>

                    <div className="pt-1.5">

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${getEtapaBadgeColor(c.etapaWorkflow, c)}`}>

                        {c.etapaWorkflow}

                      </span>

                    </div>

                  </div>

                  <button

                    onClick={() => setChamadoEmEdicao(c)}

                    className="bg-blue-950 hover:bg-blue-900 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all shadow-sm shrink-0 active:scale-95"

                  >

                    Agir

                  </button>

                </div>

              ))

            ) : (

              <div className="py-12 text-center flex flex-col items-center justify-center gap-3">

                <CheckSquare size={32} className="text-slate-300 dark:text-slate-700" />

                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Sua fila de trabalho está em dia!</p>

              </div>

            )}

          </div>

        </div>
      </div>
    </div>
  );
}



// ... Restante das Views (DashboardView, ChamadosView, etc) ...

// Abaixo os componentes originais integrados.

// Como não há modificações bruscas no HTML do Dashboard além das props, manterei como antes.



function DashboardView({ vehicles, chamados, rawChamados, hoje, currentUser, isWelcomeModalOpen }) {

  const [activeChart, setActiveChart] = useState(null);

  const [checklists, setChecklists] = useState([]);

  const [loadingChecklists, setLoadingChecklists] = useState(true);

  const [modalFugaOp, setModalFugaOp] = useState(false);

  // STATE: Indicadores de Frota
  const [dispPeriodo, setDispPeriodo] = useState('atual');
  const [dispViewMode, setDispViewMode] = useState('cards');
  const [dispModo, setDispModo] = useState('disponibilidade');
  const [dispFiltroTipo, setDispFiltroTipo] = useState('todos');
  const [dispFiltroContrato, setDispFiltroContrato] = useState('todos');
  const [dispFiltroTipoOp, setDispFiltroTipoOp] = useState('todos');

  // Local filters for Rank de Defeitos (60 Dias)
  const [defeitosFiltroTipo, setDefeitosFiltroTipo] = useState('todos');
  const [defeitosFiltroTipoOp, setDefeitosFiltroTipoOp] = useState('todos');

  // Local filters for Oficina Externa vs Interna (60 Dias)
  const [oficinaFiltroTipo, setOficinaFiltroTipo] = useState('todos');
  const [oficinaFiltroTipoOp, setOficinaFiltroTipoOp] = useState('todos');

  const vehiclesMap = useMemo(() => new Map((vehicles || []).map(v => [v.placa, v])), [vehicles]);



  useEffect(() => {

    const fetchChecklists = async () => {

      const trintaDiasAtras = new Date(hoje);

      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      

      let allChecklists = [];

      let page = 0;

      let hasMore = true;

      

      while (hasMore) {

        const { data, error } = await supabase

          .from('checklists')

          .select('placa, data_saida')

          .gte('data_saida', trintaDiasAtras.toISOString())

          .range(page * 1000, (page + 1) * 1000 - 1);

          

        if (error || !data) {

          hasMore = false;

        } else {

          allChecklists = [...allChecklists, ...data];

          if (data.length < 1000) hasMore = false;

          else page++;

        }

      }

      setChecklists(allChecklists);

      setLoadingChecklists(false);

    };

    fetchChecklists();

  }, [hoje]);



  const fugaOperacaoList = React.useMemo(() => {

     if (loadingChecklists) return [];

     return vehicles.map(v => {

       const temChamadoAberto = chamados.some(c => c.placa === v.placa && c.status === 'ABERTO');

       if (temChamadoAberto) return null; // Tem justificativa



       const chks = checklists.filter(c => c.placa === v.placa && c.data_saida);

       chks.sort((a,b) => new Date(b.data_saida) - new Date(a.data_saida));

       

       const latest = chks[0];

       let diffMs = 0;

       

       if (!latest) {

          diffMs = 30 * 24 * 60 * 60 * 1000;

       } else {

          diffMs = hoje.getTime() - new Date(latest.data_saida).getTime();

       }

       

       const horasParado = diffMs / (1000 * 60 * 60);

       

       if (horasParado > 24) {

          return {

             veiculo: v,

             ultimaSaida: latest ? latest.data_saida : null,

             diasParado: Math.floor(horasParado / 24),

             horasParado: Math.floor(horasParado)

          };

       }

       return null;

     }).filter(Boolean).sort((a, b) => b.horasParado - a.horasParado);

  }, [vehicles, chamados, checklists, loadingChecklists, hoje]);

  const [expandedTurno, setExpandedTurno] = useState(null);

  const [expandedParados, setExpandedParados] = useState(null);

  const [modalChamadoParado, setModalChamadoParado] = useState(null);

  const [modalHistoricoPlaca, setModalHistoricoPlaca] = useState(null);

  const [showMotoristasDetalhe, setShowMotoristasDetalhe] = useState(false);
  const [showPlacasDetalhe, setShowPlacasDetalhe] = useState(false);

  const getPlacasQuebradas = useMemo(() => {
    if (dispPeriodo === 'atual') {
      return new Set(chamados.filter(c => c.status === 'ABERTO').map(c => c.placa));
    }
    const dias = dispPeriodo === '30dias' ? 30 : 60;
    const corte = new Date(hoje); corte.setDate(corte.getDate() - dias);
    return new Set(chamados.filter(c => new Date(c.dataAbertura) >= corte).map(c => c.placa));
  }, [chamados, hoje, dispPeriodo]);

  // Veículos filtrados pelo tipo selecionado e tipo de contrato
  // "Cesto" filtra por subTipo "Cesto Aéreo" (dentro de tipo "Pesado")
  // "Leve" e "Moto" filtram diretamente pelo campo tipo
  const vehiclesFiltrados = useMemo(() => {
    let filtered = vehicles;
    // Filtro por tipo de contrato
    if (dispFiltroContrato !== 'todos') {
      filtered = filtered.filter(v => (v.tipoContrato || '') === dispFiltroContrato);
    }
    // Filtro por Tipo OP
    if (dispFiltroTipoOp !== 'todos') {
      filtered = filtered.filter(v => (v.tipoOp || '').toUpperCase() === dispFiltroTipoOp.toUpperCase());
    }
    // Filtro por tipo de veículo
    if (dispFiltroTipo === 'todos') return filtered;
    if (dispFiltroTipo === 'Cesto') return filtered.filter(v => (v.subTipo || '').toUpperCase().includes('CESTO'));
    return filtered.filter(v => (v.tipo || '').toUpperCase() === dispFiltroTipo.toUpperCase());
  }, [vehicles, dispFiltroTipo, dispFiltroContrato, dispFiltroTipoOp]);


  // KPIs (integrados com filtros do módulo Indicadores de Frota)

  const placasFiltradasSet = useMemo(() => new Set(vehiclesFiltrados.map(v => v.placa)), [vehiclesFiltrados]);

  const veiculosParados = vehiclesFiltrados.filter(v => v.situacao === 'PARADO').length;

  const taxaDisponibilidade = vehiclesFiltrados.length > 0 ? ((vehiclesFiltrados.length - veiculosParados) / vehiclesFiltrados.length) * 100 : 0;

  const veiculosComChamado = new Set(chamados.filter(c => c.status === 'ABERTO' && placasFiltradasSet.has(c.placa)).map(c => c.placa)).size;

  const chamadosAbertos = chamados.filter(c => c.status === 'ABERTO');

  // ★ Horas Parado — respeita dispPeriodo e vehiclesFiltrados, clampado ao intervalo
  const horasParadoData = useMemo(() => {
    let inicioPeriodo;
    if (dispPeriodo === 'atual') {
      inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    } else {
      const dias = dispPeriodo === '30dias' ? 30 : 60;
      inicioPeriodo = new Date(hoje);
      inicioPeriodo.setDate(inicioPeriodo.getDate() - dias);
    }

    let totalHoras = 0;
    chamados.forEach(c => {
      if (c.situacaoVeiculo !== 'PARADO') return;
      if (!placasFiltradasSet.has(c.placa)) return;

      const dAberta = new Date(c.dataAbertura);
      const dFechada = c.dataHoraFechamento ? new Date(c.dataHoraFechamento) : hoje;

      // Apenas chamados que se sobrepõem ao período
      if (dAberta > hoje || dFechada < inicioPeriodo) return;

      // Clampar ao intervalo do período
      const inicioEfetivo = dAberta < inicioPeriodo ? inicioPeriodo : dAberta;
      const fimEfetivo = dFechada > hoje ? hoje : dFechada;
      const horasNoPeríodo = Math.max(0, (fimEfetivo - inicioEfetivo) / (1000 * 60 * 60));
      totalHoras += horasNoPeríodo;
    });

    return { totalHoras, veiculosDia: Math.round(totalHoras / 24) };
  }, [chamados, hoje, dispPeriodo, placasFiltradasSet]);

  const tempoTotalParadoMes = horasParadoData.totalHoras;

  // ★ Prejuízo — deduplicado por placa, respeita filtros
  const prejuizoData = useMemo(() => {
    let total = 0;
    let placasContadas = 0;
    const placasContabilizadas = new Set();
    chamados.forEach(c => {
      if (c.status !== 'ABERTO' || c.situacaoVeiculo !== 'PARADO') return;
      if (!placasFiltradasSet.has(c.placa)) return;
      if (placasContabilizadas.has(c.placa)) return;
      placasContabilizadas.add(c.placa);
      const v = vehiclesFiltrados.find(vec => vec.placa === c.placa);
      total += getPrejuizoChamado(c, v, hoje);
      placasContadas++;
    });
    return { total, placas: placasContadas };
  }, [chamados, vehiclesFiltrados, placasFiltradasSet, hoje]);

  const prejuizoAtual = prejuizoData.total;

  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);



  const trintaDiasAtras = new Date(hoje); trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const chamadosUltimos30Dias = chamados.filter(c => new Date(c.dataAbertura) >= trintaDiasAtras);

  const chamadosPorPlaca = {};

  chamadosUltimos30Dias.forEach(c => { chamadosPorPlaca[c.placa] = (chamadosPorPlaca[c.placa] || 0) + 1; });

  const topVeiculosProblematicos = Object.entries(chamadosPorPlaca).sort((a,b) => b[1] - a[1]).slice(0, 5);



  // Lógica 60 Dias para novas visões

  const sessentaDiasAtras = new Date(hoje); sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);

  const chamadosUltimos60Dias = chamados.filter(c => new Date(c.dataAbertura) >= sessentaDiasAtras);

  

  // 1. Rank de quantidade de defeitos

  const defeitosCount = {};
  let totalChamadosFiltradosDefeitos = 0;

  chamadosUltimos60Dias.forEach(c => {
    const v = vehiclesMap.get(c.placa);
    if (!v) return;

    if (defeitosFiltroTipo !== 'todos') {
      if (defeitosFiltroTipo === 'Cesto') {
        if (!(v.subTipo || '').toUpperCase().includes('CESTO')) return;
      } else {
        if ((v.tipo || '').toUpperCase() !== defeitosFiltroTipo.toUpperCase()) return;
      }
    }

    if (defeitosFiltroTipoOp !== 'todos') {
      if ((v.tipoOp || '').toUpperCase() !== defeitosFiltroTipoOp.toUpperCase()) return;
    }

    totalChamadosFiltradosDefeitos++;

    if (c.defeitoPrincipal && c.defeitoPrincipal.trim() !== '') {

      defeitosCount[c.defeitoPrincipal] = (defeitosCount[c.defeitoPrincipal] || 0) + 1;

    }

  });

  const topDefeitos = Object.entries(defeitosCount).sort((a, b) => b[1] - a[1]).slice(0, 5);



  // 2. TOP Motoristas

  const topMotoristasChamados = chamadosUltimos60Dias.filter(c => {
    const v = vehiclesMap.get(c.placa);
    return !!v; // Respect regional view
  });

  const motoristasCount = {};

  topMotoristasChamados.forEach(c => {

    if (c.motorista && c.motorista.trim() !== '') {

      motoristasCount[c.motorista] = (motoristasCount[c.motorista] || 0) + 1;

    }

  });

  const topMotoristas = Object.entries(motoristasCount).sort((a, b) => b[1] - a[1]).slice(0, 5);



  // 3. % Oficina Externa x Interna

  let oficExternaCount = 0;

  let oficInternaCount = 0;

  chamadosUltimos60Dias.forEach(c => {
    const v = vehiclesMap.get(c.placa);
    if (!v) return;

    if (oficinaFiltroTipo !== 'todos') {
      if (oficinaFiltroTipo === 'Cesto') {
        if (!(v.subTipo || '').toUpperCase().includes('CESTO')) return;
      } else {
        if ((v.tipo || '').toUpperCase() !== oficinaFiltroTipo.toUpperCase()) return;
      }
    }

    if (oficinaFiltroTipoOp !== 'todos') {
      if ((v.tipoOp || '').toUpperCase() !== oficinaFiltroTipoOp.toUpperCase()) return;
    }

    if (c.oficinaExterna === 'SIM') oficExternaCount++;

    else oficInternaCount++;

  });

  const totalOfic = oficExternaCount + oficInternaCount;

  const percExterna = totalOfic > 0 ? ((oficExternaCount / totalOfic) * 100).toFixed(1) : 0;

  const percInterna = totalOfic > 0 ? ((oficInternaCount / totalOfic) * 100).toFixed(1) : 0;



  // ============================================================
  // MÓDULO: INDICADORES DE FROTA (por pilar e período)
  // ============================================================

  const calcDisp = (grupo) => {
    const total = grupo.length;
    const quebrados = grupo.filter(v => getPlacasQuebradas.has(v.placa)).length;
    const disponiveis = total - quebrados;
    const percDisp = total > 0 ? (disponiveis / total) * 100 : 100;
    const percIndisp = total > 0 ? (quebrados / total) * 100 : 0;
    return { total, quebrados, disponiveis, percentual: percDisp, percentualIndisp: percIndisp };
  };

  const dispGeral = useMemo(() => calcDisp(vehiclesFiltrados), [vehiclesFiltrados, getPlacasQuebradas]);

  const dispPorLocadora = useMemo(() => {
    const grupos = {};
    vehiclesFiltrados.forEach(v => { const k = v.locadora || 'Sem Locadora'; if (!grupos[k]) grupos[k] = []; grupos[k].push(v); });
    return Object.entries(grupos).map(([nome, veics]) => ({ nome, ...calcDisp(veics) })).sort((a, b) => a.percentual - b.percentual);
  }, [vehiclesFiltrados, getPlacasQuebradas]);

  const dispPorTurno = useMemo(() => {
    const grupos = {};
    vehiclesFiltrados.forEach(v => { const k = v.turno || 'Indefinido'; if (!grupos[k]) grupos[k] = []; grupos[k].push(v); });
    return Object.entries(grupos).map(([nome, veics]) => ({ nome, ...calcDisp(veics) })).sort((a, b) => a.percentual - b.percentual);
  }, [vehiclesFiltrados, getPlacasQuebradas]);

  const dispPorTipo = useMemo(() => {
    const grupos = {};
    vehiclesFiltrados.forEach(v => { const k = v.tipo || 'Outros'; if (!grupos[k]) grupos[k] = []; grupos[k].push(v); });
    return Object.entries(grupos).map(([nome, veics]) => ({ nome, ...calcDisp(veics) })).sort((a, b) => a.percentual - b.percentual);
  }, [vehiclesFiltrados, getPlacasQuebradas]);

  const dispPorImplemento = useMemo(() => {
    const grupos = {};
    vehiclesFiltrados.forEach(v => { const k = v.implemento || 'Sem Implemento'; if (!grupos[k]) grupos[k] = []; grupos[k].push(v); });
    return Object.entries(grupos).map(([nome, veics]) => ({ nome, ...calcDisp(veics) })).sort((a, b) => a.percentual - b.percentual);
  }, [vehiclesFiltrados, getPlacasQuebradas]);

  const getDispColor = (perc) => {
    const isIndisp = dispModo === 'indisponibilidade';
    const p = isIndisp ? (100 - perc) : perc;
    return p >= 95 ? { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' } : p >= 85 ? { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' } : { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-200', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]' };
  };

  const getDispBarColor = (perc) => {
    const isIndisp = dispModo === 'indisponibilidade';
    const p = isIndisp ? (100 - perc) : perc;
    return p >= 95 ? '#10b981' : p >= 85 ? '#f59e0b' : '#f43f5e';
  };

  // Helper: retorna o valor % a exibir conforme o modo
  const getDispVal = (item) => dispModo === 'indisponibilidade' ? item.percentualIndisp : item.percentual;

  // Lógica Fidelização (Turnos)

  const FidelizacaoTurnos = {

    'Manhã': { total: 0, fid: 0, subTipos: {} },

    'Tarde': { total: 0, fid: 0, subTipos: {} },

    'Noite': { total: 0, fid: 0, subTipos: {} },

    'Linha Viva': { total: 0, fid: 0, subTipos: {} }

  };

  let globalFidTotal = 0; let globalFidAtendidos = 0;



  vehiclesFiltrados.forEach(v => {

    const isLinhaViva = v.tipoOp?.toUpperCase() === 'LINHA VIVA';

    const cat = isLinhaViva ? 'Linha Viva' : (v.turno || 'Indefinido');

    

    if (FidelizacaoTurnos[cat]) {

      const isFid = (v.equipes && v.equipes.length > 0) ? 1 : 0;

      FidelizacaoTurnos[cat].total++;

      FidelizacaoTurnos[cat].fid += isFid;

      

      const st = v.subTipo || 'Outros';

      if (!FidelizacaoTurnos[cat].subTipos[st]) {

         FidelizacaoTurnos[cat].subTipos[st] = { total: 0, fid: 0 };

      }

      FidelizacaoTurnos[cat].subTipos[st].total++;

      FidelizacaoTurnos[cat].subTipos[st].fid += isFid;



      globalFidTotal++;

      globalFidAtendidos += isFid;

    }

  });

  const percFidGlobal = globalFidTotal > 0 ? ((globalFidAtendidos / globalFidTotal) * 100).toFixed(0) : 0;



  // Lógica Parados Agora

  const paradosAgoraTurnos = { 'Manhã': [], 'Tarde': [], 'Noite': [], 'Linha Viva': [] };

  chamadosAbertos.filter(c => c.situacaoVeiculo === 'PARADO').forEach(c => {

     const v = vehiclesFiltrados.find(vec => vec.placa === c.placa);

     if (!v) return;

     const isLinhaViva = v.tipoOp?.toUpperCase() === 'LINHA VIVA';

     const turno = isLinhaViva ? 'Linha Viva' : (v.turno || 'Indefinido');

     

     if (paradosAgoraTurnos[turno]) {

        paradosAgoraTurnos[turno].push({ chamado: c, veiculo: v });

     } else {

        paradosAgoraTurnos['Manhã'].push({ chamado: c, veiculo: v }); // Fallback

     }

  });



  return (

    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      <AlertasDashboard chamados={rawChamados || chamados} currentUser={currentUser} suppressPopup={isWelcomeModalOpen} />

      {/* ============================================================ */}
      {/* MÓDULO: DISPONIBILIDADE DE FROTA                             */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-br from-white via-slate-50/50 to-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-100/50 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-2xl shadow-sm">
              <Truck size={24} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-blue-950 tracking-tight flex items-center gap-3">
                Indicadores de Frota
                <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border animate-pulse ${dispModo === 'disponibilidade' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dispModo === 'disponibilidade' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  LIVE
                </span>
                {dispFiltroTipo !== 'todos' && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                    {dispFiltroTipo}
                  </span>
                )}
                {dispFiltroContrato !== 'todos' && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                    {dispFiltroContrato === 'Contrato Novo' ? 'Novo' : 'Antigo'}
                  </span>
                )}
                {dispFiltroTipoOp !== 'todos' && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                    {dispFiltroTipoOp}
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-500 font-medium mt-0.5">{dispModo === 'disponibilidade' ? 'Disponibilidade por pilar operacional' : 'Indisponibilidade por pilar operacional'}{dispFiltroTipo !== 'todos' || dispFiltroContrato !== 'todos' || dispFiltroTipoOp !== 'todos' ? ` — ${[dispFiltroTipo !== 'todos' ? dispFiltroTipo : '', dispFiltroContrato !== 'todos' ? dispFiltroContrato : '', dispFiltroTipoOp !== 'todos' ? dispFiltroTipoOp : ''].filter(Boolean).join(' · ')}` : ''}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Disponibilidade / Indisponibilidade Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setDispModo('disponibilidade')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  dispModo === 'disponibilidade'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Disponível
              </button>
              <button
                onClick={() => setDispModo('indisponibilidade')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  dispModo === 'indisponibilidade'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Indisponível
              </button>
            </div>

            {/* Filtro por Tipo */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'Cesto', label: 'Cesto' },
                { id: 'Leve', label: 'Leve' },
                { id: 'Moto', label: 'Moto' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDispFiltroTipo(t.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    dispFiltroTipo === t.id
                      ? 'bg-white text-blue-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filtro por Tipo de Contrato */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'Contrato Novo', label: 'Novo' },
                { id: 'Contrato Antigo', label: 'Antigo' },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => setDispFiltroContrato(c.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    dispFiltroContrato === c.id
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Filtro por Tipo OP */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'todos', label: 'Todos OP' },
                { id: 'TMA', label: 'TMA' },
                { id: 'Linha Viva', label: 'L. Viva' },
                { id: 'Linha Morta', label: 'L. Morta' },
                { id: 'SOC', label: 'SOC' },
              ].map(o => (
                <button
                  key={o.id}
                  onClick={() => setDispFiltroTipoOp(o.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    dispFiltroTipoOp === o.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Period Filter */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'atual', label: 'Atual' },
                { id: '30dias', label: '30 Dias' },
                { id: '60dias', label: '60 Dias' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setDispPeriodo(p.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    dispPeriodo === p.id
                      ? 'bg-white text-blue-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setDispViewMode('cards')}
                className={`px-3 py-2 rounded-lg transition-all duration-300 ${
                  dispViewMode === 'cards'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visualizar Cards"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setDispViewMode('graficos')}
                className={`px-3 py-2 rounded-lg transition-all duration-300 ${
                  dispViewMode === 'graficos'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visualizar Gráficos"
              >
                <BarChart3 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* HERO CARD: Disponibilidade Geral */}
        <div className={`mb-8 p-6 rounded-2xl border-2 ${getDispColor(getDispVal(dispGeral)).border} ${getDispColor(getDispVal(dispGeral)).light} relative overflow-hidden transition-all duration-500`}>
          <div className="absolute -right-8 -top-8 opacity-[0.04] pointer-events-none">
            <Truck size={120} />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            {/* Gauge Visual */}
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={getDispBarColor(getDispVal(dispGeral))}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${getDispVal(dispGeral) * 2.64} 264`}
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: `drop-shadow(0 0 6px ${getDispBarColor(getDispVal(dispGeral))}40)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black ${getDispColor(getDispVal(dispGeral)).text}`}>{getDispVal(dispGeral).toFixed(1)}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{dispModo === 'disponibilidade' ? 'Disponível' : 'Indisponível'}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-3 gap-6 text-center md:text-left">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Frota</p>
                <p className="text-3xl font-black text-blue-950">{dispGeral.total}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponíveis</p>
                <p className="text-3xl font-black text-emerald-600">{dispGeral.disponiveis}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{dispPeriodo === 'atual' ? 'C/ Chamado Aberto' : 'Afetados no Período'}</p>
                <p className="text-3xl font-black text-rose-500">{dispGeral.quebrados}</p>
              </div>
            </div>
          </div>

          {/* Full-width progress bar */}
          <div className="mt-5 w-full bg-slate-200/60 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full ${getDispColor(getDispVal(dispGeral)).bg} transition-all duration-1000 ease-out ${getDispColor(getDispVal(dispGeral)).glow}`}
              style={{ width: `${getDispVal(dispGeral)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
            <span>0%</span>
            <span>{dispModo === 'disponibilidade' ? 'Meta: 95%' : 'Meta: < 5%'}</span>
            <span>100%</span>
          </div>
        </div>

        {/* ★ KPI STRIP — Glassmorphism Premium */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {/* Ociosos */}
          <div className="group relative bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-amber-100/60 shadow-[0_4px_20px_rgba(245,158,11,0.06)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)] hover:scale-[1.02] transition-all duration-300 cursor-pointer" onClick={() => setModalFugaOp(true)}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-100/80"><AlertTriangle size={16} className="text-amber-500" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ociosos</p>
            </div>
            <p className="text-3xl font-black text-amber-500 tracking-tight leading-none">{loadingChecklists ? '...' : fugaOperacaoList.length}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">&gt; 24h sem saída ou ticket</p>
            <div className="absolute top-3 right-3 p-1.5 bg-slate-100/80 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><BarChart3 size={12}/></div>
          </div>

          {/* Veículos Parados */}
          <div className="group relative bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-orange-100/60 shadow-[0_4px_20px_rgba(255,138,101,0.06)] hover:shadow-[0_8px_30px_rgba(255,138,101,0.12)] hover:scale-[1.02] transition-all duration-300 cursor-pointer" onClick={() => setActiveChart('parados')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-50 rounded-xl border border-orange-100/80"><AlertTriangle size={16} className="text-[#FF8A65]" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parados</p>
            </div>
            <p className="text-3xl font-black text-[#FF8A65] tracking-tight leading-none">{veiculosParados}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">de {vehiclesFiltrados.length} na frota</p>
            <div className="absolute top-3 right-3 p-1.5 bg-slate-100/80 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><BarChart3 size={12}/></div>
          </div>

          {/* Horas Parado */}
          <div className="group relative bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-blue-100/60 shadow-[0_4px_20px_rgba(96,165,250,0.06)] hover:shadow-[0_8px_30px_rgba(96,165,250,0.12)] hover:scale-[1.02] transition-all duration-300 cursor-pointer" onClick={() => setActiveChart('horas')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-xl border border-blue-100/80"><Clock size={16} className="text-[#60A5FA]" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Parado</p>
            </div>
            <p className="text-3xl font-black text-[#60A5FA] tracking-tight leading-none">{tempoTotalParadoMes.toFixed(0)}<span className="text-lg">h</span></p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">{horasParadoData.veiculosDia} veíc×dia · {dispPeriodo === 'atual' ? 'mês atual' : dispPeriodo === '30dias' ? '30 dias' : '60 dias'}</p>
            <div className="absolute top-3 right-3 p-1.5 bg-slate-100/80 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><BarChart3 size={12}/></div>
          </div>

          {/* Prejuízo */}
          <div className="group relative bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-rose-100/60 shadow-[0_4px_20px_rgba(244,63,94,0.06)] hover:shadow-[0_8px_30px_rgba(244,63,94,0.12)] hover:scale-[1.02] transition-all duration-300 cursor-pointer" onClick={() => setActiveChart('prejuizo')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100/80"><TrendingDown size={16} className="text-[#F43F5E]" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prejuízo</p>
            </div>
            <p className="text-3xl font-black text-[#F43F5E] tracking-tight leading-none">R$ {prejuizoAtual.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">{prejuizoData.placas} veíc parados agora</p>
            <div className="absolute top-3 right-3 p-1.5 bg-slate-100/80 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><BarChart3 size={12}/></div>
          </div>
        </div>

        {/* ========== CARDS MODE ========== */}
        {dispViewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            {/* POR LOCADORA */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-blue-50 rounded-xl"><Briefcase size={16} className="text-blue-500" /></div>
                <h4 className="font-black text-blue-950 text-sm uppercase tracking-wider">Locadora</h4>
              </div>
              <div className="space-y-3">
                {dispPorLocadora.map(item => {
                  const cor = getDispColor(getDispVal(item));
                  return (
                    <div key={item.nome} className="group">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{item.nome}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">{dispModo === 'disponibilidade' ? item.disponiveis : item.quebrados}/{item.total}</span>
                          <span className={`text-xs font-black ${cor.text}`}>{getDispVal(item).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full ${cor.bg} transition-all duration-700`} style={{ width: `${getDispVal(item)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* POR TURNO */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-purple-50 rounded-xl"><Clock size={16} className="text-purple-500" /></div>
                <h4 className="font-black text-blue-950 text-sm uppercase tracking-wider">Turno</h4>
              </div>
              <div className="space-y-3">
                {dispPorTurno.map(item => {
                  const cor = getDispColor(getDispVal(item));
                  return (
                    <div key={item.nome}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-slate-600">{item.nome}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">{dispModo === 'disponibilidade' ? item.disponiveis : item.quebrados}/{item.total}</span>
                          <span className={`text-xs font-black ${cor.text}`}>{getDispVal(item).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full ${cor.bg} transition-all duration-700`} style={{ width: `${getDispVal(item)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* POR TIPO */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-amber-50 rounded-xl"><CarFront size={16} className="text-amber-500" /></div>
                <h4 className="font-black text-blue-950 text-sm uppercase tracking-wider">Tipo</h4>
              </div>
              <div className="space-y-3">
                {dispPorTipo.map(item => {
                  const cor = getDispColor(getDispVal(item));
                  return (
                    <div key={item.nome}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-slate-600">{item.nome}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">{dispModo === 'disponibilidade' ? item.disponiveis : item.quebrados}/{item.total}</span>
                          <span className={`text-xs font-black ${cor.text}`}>{getDispVal(item).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full ${cor.bg} transition-all duration-700`} style={{ width: `${getDispVal(item)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* POR IMPLEMENTO */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-teal-50 rounded-xl"><Wrench size={16} className="text-teal-500" /></div>
                <h4 className="font-black text-blue-950 text-sm uppercase tracking-wider">Implemento</h4>
              </div>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {dispPorImplemento.map(item => {
                  const cor = getDispColor(getDispVal(item));
                  return (
                    <div key={item.nome}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{item.nome}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">{dispModo === 'disponibilidade' ? item.disponiveis : item.quebrados}/{item.total}</span>
                          <span className={`text-xs font-black ${cor.text}`}>{getDispVal(item).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full ${cor.bg} transition-all duration-700`} style={{ width: `${getDispVal(item)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ========== GRAFICOS MODE ========== */}
        {dispViewMode === 'graficos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Gráfico Locadora */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h4 className="font-black text-blue-950 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-500" /> Por Locadora
              </h4>
              <ResponsiveContainer width="100%" height={dispPorLocadora.length * 48 + 20}>
                <BarChart data={dispPorLocadora.map(d => ({...d, percExibido: getDispVal(d)}))} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                  <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 11, fill: '#1e3a5f', fontWeight: 700 }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 700 }}
                    formatter={(v) => [`${v.toFixed(1)}%`, dispModo === 'disponibilidade' ? 'Disponibilidade' : 'Indisponibilidade']}
                    labelFormatter={(l) => `Locadora: ${l}`}
                  />
                  <Bar dataKey="percExibido" radius={[0, 8, 8, 0]} barSize={20}>
                    {dispPorLocadora.map((entry, idx) => (
                      <Cell key={idx} fill={getDispBarColor(entry.percExibido)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico Turno */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h4 className="font-black text-blue-950 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock size={16} className="text-purple-500" /> Por Turno
              </h4>
              <ResponsiveContainer width="100%" height={dispPorTurno.length * 60 + 20}>
                <BarChart data={dispPorTurno.map(d => ({...d, percExibido: getDispVal(d)}))} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                  <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 11, fill: '#1e3a5f', fontWeight: 700 }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 700 }}
                    formatter={(v) => [`${v.toFixed(1)}%`, dispModo === 'disponibilidade' ? 'Disponibilidade' : 'Indisponibilidade']}
                  />
                  <Bar dataKey="percExibido" radius={[0, 8, 8, 0]} barSize={28}>
                    {dispPorTurno.map((entry, idx) => (
                      <Cell key={idx} fill={getDispBarColor(entry.percExibido)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico Tipo */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h4 className="font-black text-blue-950 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <CarFront size={16} className="text-amber-500" /> Por Tipo
              </h4>
              <ResponsiveContainer width="100%" height={dispPorTipo.length * 60 + 20}>
                <BarChart data={dispPorTipo.map(d => ({...d, percExibido: getDispVal(d)}))} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                  <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 11, fill: '#1e3a5f', fontWeight: 700 }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 700 }}
                    formatter={(v) => [`${v.toFixed(1)}%`, dispModo === 'disponibilidade' ? 'Disponibilidade' : 'Indisponibilidade']}
                  />
                  <Bar dataKey="percExibido" radius={[0, 8, 8, 0]} barSize={28}>
                    {dispPorTipo.map((entry, idx) => (
                      <Cell key={idx} fill={getDispBarColor(entry.percExibido)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico Implemento */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h4 className="font-black text-blue-950 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Wrench size={16} className="text-teal-500" /> Por Implemento
              </h4>
              <ResponsiveContainer width="100%" height={dispPorImplemento.length * 42 + 20}>
                <BarChart data={dispPorImplemento.map(d => ({...d, percExibido: getDispVal(d)}))} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                  <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 10, fill: '#1e3a5f', fontWeight: 700 }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 700 }}
                    formatter={(v) => [`${v.toFixed(1)}%`, dispModo === 'disponibilidade' ? 'Disponibilidade' : 'Indisponibilidade']}
                  />
                  <Bar dataKey="percExibido" radius={[0, 8, 8, 0]} barSize={18}>
                    {dispPorImplemento.map((entry, idx) => (
                      <Cell key={idx} fill={getDispBarColor(entry.percExibido)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}

        {/* Period indicator */}
        <div className="mt-6 flex justify-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
            {dispPeriodo === 'atual' ? '\u{1F4CA} Exibindo chamados abertos agora' : dispPeriodo === '30dias' ? '\u{1F4CA} Exibindo chamados dos últimos 30 dias' : '\u{1F4CA} Exibindo chamados dos últimos 60 dias'}
          </span>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* PARADOS AGORA */}

        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 lg:col-span-2 flex flex-col">

          <h3 className="text-xl font-black text-blue-950 mb-2 flex items-center gap-3"><Clock size={24} className="text-orange-500" /> Parados Agora <span className="text-orange-600 bg-orange-100 px-3 py-1 rounded-full text-sm ml-auto">{veiculosParados} Total</span></h3>

          <p className="text-sm text-slate-500 mb-6 font-medium">Veículos parados agrupados por Turno. Clique no turno para visualizar os veículos detalhados por tipo.</p>

          <div className="space-y-4">

             {Object.values(paradosAgoraTurnos).every(arr => arr.length === 0) && <div className="text-center py-12"><CheckCircle2 size={48} className="text-emerald-200 mx-auto mb-4" /><p className="text-slate-400 font-bold">Nenhum veículo parado!</p></div>}

             {Object.entries(paradosAgoraTurnos).map(([turno, itens]) => {

                if (itens.length === 0) return null;

                const isExpanded = expandedParados === turno;

                

                // Agrupar itens do turno por Sub Tipo

                const porSubTipo = {};

                itens.forEach(item => {

                   const st = item.veiculo.subTipo || 'Outros';

                   if (!porSubTipo[st]) porSubTipo[st] = [];

                   porSubTipo[st].push(item);

                });



                return (

                  <div key={turno} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">

                    <button onClick={() => setExpandedParados(isExpanded ? null : turno)} className="w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 transition-colors">

                       <div className="flex items-center gap-4">

                         <span className="text-lg font-black text-slate-700 uppercase tracking-wide">{turno}</span>

                         <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold">{itens.length} VEÍCULOS</span>

                       </div>

                       <ChevronRight size={20} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />

                    </button>

                    {isExpanded && (

                       <div className="p-6 bg-white space-y-6">

                         {Object.entries(porSubTipo).map(([st, veiculosSub]) => (

                           <div key={st}>

                             <h5 className="font-bold text-slate-500 uppercase text-xs mb-3 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>{st} ({veiculosSub.length})</h5>

                             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                               {veiculosSub.map(item => {

                                  const horas = calcularHorasParadas(item.chamado.dataAbertura, hoje);

                                  const isOficExterna = item.chamado.oficinaExterna === 'SIM';

                                  

                                  return (

                                    <div key={item.chamado.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all group">

                                      <div className="flex-1 min-w-0 pr-4">

                                        <div className="flex items-center gap-2 mb-1">

                                          <span className="font-black text-blue-950 text-base">{item.veiculo.placa}</span>

                                          {isOficExterna ? <span className="text-[9px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded-md uppercase tracking-wider">OFIC. EXTERNA</span> : <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">OFIC. INTERNA</span>}

                                        </div>

                                        <div className="text-xs text-slate-500 truncate">{item.chamado.defeitoEncontrado || 'Sem descrição'}</div>

                                      </div>

                                      <div className="flex items-center gap-3">

                                        <span className={`px-2 py-1 rounded-lg text-xs font-black ${horas > 72 ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'}`}>{horas.toFixed(0)}h</span>

                                        <button onClick={() => setModalChamadoParado(item.chamado)} className="p-2 bg-slate-50 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors group-hover:bg-emerald-50" title="Ver Detalhes"><Search size={16}/></button>

                                      </div>

                                    </div>

                                  )

                               })}

                             </div>

                           </div>

                         ))}

                       </div>

                    )}

                  </div>

                );

             })}

          </div>

        </div>



        {/* CHAMADOS EM 30 DIAS */}

        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50">

          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-black text-blue-950 flex items-center gap-3"><Activity size={24} className="text-rose-500" /> Chamados em 30 Dias</h3>
            <button onClick={() => setShowPlacasDetalhe(true)} className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-500 px-3 py-2 rounded-xl transition-all duration-300 border border-rose-100 flex items-center gap-2 shadow-sm active:scale-95"><Search size={14}/> Detalhamento Avançado</button>
          </div>

          <p className="text-sm text-slate-500 mb-6 font-medium">Veículos com mais aberturas recentes. Clique para ver o histórico.</p>

          <div className="space-y-4">

            {topVeiculosProblematicos.map(([placa, qtd], idx) => {

               const vec = vehiclesMap.get(placa);

               return (

                <div key={placa} onClick={() => setModalHistoricoPlaca(placa)} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 cursor-pointer transition-colors group">

                  <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-rose-500 shadow-sm group-hover:scale-110 transition-transform">{idx + 1}º</div><div><h4 className="font-bold text-blue-950">{placa}</h4><p className="text-xs text-slate-500">{vec?.marca}</p></div></div>

                  <div className="text-right flex items-center gap-3"><span className="text-2xl font-black text-slate-700">{qtd}</span> <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500" /></div>

                </div>

               )

            })}

            {topVeiculosProblematicos.length === 0 && <p className="text-slate-400 text-sm">Nenhum chamado nos últimos 30 dias.</p>}

          </div>

        </div>



        {/* FIDELIZAÇÃO TURNOS */}

        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 relative group flex flex-col">

          <button onClick={() => setActiveChart('fidelizacao')} className="absolute top-8 right-8 p-2 bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100"><BarChart3 size={18}/></button>

          <h3 className="text-xl font-black text-blue-950 mb-2 flex items-center gap-3"><ShieldCheck size={24} className="text-emerald-500" /> Fidelização <span className="text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full text-sm ml-auto">{percFidGlobal}% Geral</span></h3>

          <p className="text-sm text-slate-500 mb-6 font-medium">Percentual de veículos vinculados. Clique para expandir.</p>

          <div className="space-y-4 flex-1 overflow-y-auto pr-2">

            {Object.entries(FidelizacaoTurnos).map(([turno, data]) => {

               const perc = data.total > 0 ? ((data.fid / data.total) * 100).toFixed(0) : 0;

               const isExpanded = expandedTurno === turno;

               return (

                 <div key={turno} className="border border-slate-100 rounded-2xl overflow-hidden">

                   <button onClick={() => setExpandedTurno(isExpanded ? null : turno)} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors">

                     <div><span className="font-bold text-slate-700 block text-left">{turno}</span><span className="text-xs text-slate-400 font-medium">{data.fid} de {data.total} veículos</span></div>

                     <div className="flex items-center gap-4">

                       <span className={`text-lg font-black ${perc >= 80 ? 'text-emerald-600' : perc >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{perc}%</span>

                       <ChevronRight size={18} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />

                     </div>

                   </button>

                   {isExpanded && (

                     <div className="p-4 bg-white space-y-3">

                       {Object.entries(data.subTipos).map(([st, stData]) => {

                         const stPerc = stData.total > 0 ? ((stData.fid / stData.total) * 100).toFixed(0) : 0;

                         return (

                           <div key={st}>

                             <div className="flex justify-between items-end mb-1"><span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{st}</span><span className="text-[10px] font-bold text-slate-400">{stData.fid}/{stData.total} ({stPerc}%)</span></div>

                             <div className="w-full bg-slate-100 rounded-full h-2"><div className={`h-2 rounded-full ${stPerc >= 80 ? 'bg-emerald-500' : stPerc >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${stPerc}%` }}></div></div>

                           </div>

                         );

                       })}

                       {Object.keys(data.subTipos).length === 0 && <p className="text-xs text-slate-400">Nenhum veículo nesta categoria.</p>}

                     </div>

                   )}

                 </div>

               );

            })}

          </div>

        </div>



        {/* RANK DE DEFEITOS */}

        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50">

          <h3 className="text-xl font-black text-blue-950 mb-4 flex items-center gap-3"><Wrench size={24} className="text-amber-500" /> Rank de Defeitos (60 Dias)</h3>

          {/* Filtros TIPO e TIPO OP */}
          <div className="flex flex-col gap-3 mb-6 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Veículo:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-xl">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'Cesto', label: 'Cesto' },
                  { id: 'Leve', label: 'Leve' },
                  { id: 'Moto', label: 'Moto' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDefeitosFiltroTipo(t.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${
                      defeitosFiltroTipo === t.id
                        ? 'bg-white text-blue-950 shadow-sm font-extrabold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo OP:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-xl">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'TMA', label: 'TMA' },
                  { id: 'Linha Viva', label: 'L. Viva' },
                  { id: 'Linha Morta', label: 'L. Morta' },
                  { id: 'SOC', label: 'SOC' },
                ].map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setDefeitosFiltroTipoOp(o.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${
                      defeitosFiltroTipoOp === o.id
                        ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">

            {topDefeitos.map(([defeito, qtd], idx) => {

               const perc = totalChamadosFiltradosDefeitos > 0 ? ((qtd / totalChamadosFiltradosDefeitos) * 100).toFixed(0) : 0;

               return (

                 <div key={defeito}>

                   <div className="flex justify-between items-end mb-1">
                     <span className="text-xs font-bold text-slate-600 uppercase tracking-wide truncate pr-2">{idx+1}º {defeito}</span>
                     <span className="text-[10px] font-black text-slate-400">{qtd} chamados ({perc}%)</span>
                   </div>

                   <div className="w-full bg-slate-100 rounded-full h-2">
                     <div className="h-2 rounded-full bg-amber-400" style={{ width: `${perc}%` }}></div>
                   </div>

                 </div>

               );

            })}

            {topDefeitos.length === 0 && <p className="text-slate-400 text-sm">Nenhum defeito registrado nos últimos 60 dias com estes filtros.</p>}

          </div>

        </div>



        {/* TOP MOTORISTAS */}

        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50">

          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-black text-blue-950 flex items-center gap-3"><User size={24} className="text-purple-500" /> TOP Motoristas c/ Quebra</h3>
            <button onClick={() => setShowMotoristasDetalhe(true)} className="text-[10px] font-black uppercase tracking-widest text-purple-600 hover:text-white bg-purple-50 hover:bg-purple-500 px-3 py-2 rounded-xl transition-all duration-300 border border-purple-100 flex items-center gap-2 shadow-sm active:scale-95"><Search size={14}/> Análise de Quebras</button>
          </div>

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">ÚLTIMOS 60 DIAS</p>

          <div className="space-y-3">

            {topMotoristas.map(([motorista, qtd], idx) => (

                <div key={motorista} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">

                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-purple-500 shadow-sm">{idx + 1}º</div><h4 className="font-bold text-slate-700 text-sm uppercase truncate max-w-[150px]">{motorista}</h4></div>

                  <div className="text-right flex items-center gap-2"><span className="text-lg font-black text-blue-950">{qtd}</span> <span className="text-[10px] font-bold text-slate-400 uppercase">quebras</span></div>

                </div>

            ))}

            {topMotoristas.length === 0 && <p className="text-slate-400 text-sm">Nenhum chamado atribuído a motoristas.</p>}

          </div>

        </div>



        {/* OFICINA EXTERNA X INTERNA */}

        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 lg:col-span-2">

          <h3 className="text-xl font-black text-blue-950 mb-4 flex items-center gap-3"><Wrench size={24} className="text-blue-500" /> Oficina Externa vs Interna (60 Dias)</h3>

          {/* Filtros TIPO e TIPO OP */}
          <div className="flex flex-col gap-3 mb-6 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Veículo:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-xl">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'Cesto', label: 'Cesto' },
                  { id: 'Leve', label: 'Leve' },
                  { id: 'Moto', label: 'Moto' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setOficinaFiltroTipo(t.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${
                      oficinaFiltroTipo === t.id
                        ? 'bg-white text-blue-950 shadow-sm font-extrabold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo OP:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-xl">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'TMA', label: 'TMA' },
                  { id: 'Linha Viva', label: 'L. Viva' },
                  { id: 'Linha Morta', label: 'L. Morta' },
                  { id: 'SOC', label: 'SOC' },
                ].map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOficinaFiltroTipoOp(o.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${
                      oficinaFiltroTipoOp === o.id
                        ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">

             <div className="flex-1 w-full">

                <div className="flex justify-between items-end mb-2">

                   <span className="font-black text-slate-700 uppercase tracking-wide">Externa</span>

                   <span className="text-lg font-black text-blue-600">{percExterna}% <span className="text-[10px] text-slate-400">({oficExternaCount} veíc)</span></span>

                </div>

                <div className="w-full bg-slate-200 rounded-full h-4"><div className="h-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all" style={{ width: `${percExterna}%` }}></div></div>

             </div>

             <div className="flex-1 w-full">

                <div className="flex justify-between items-end mb-2">

                   <span className="font-black text-slate-700 uppercase tracking-wide">Interna</span>

                   <span className="text-lg font-black text-emerald-600">{percInterna}% <span className="text-[10px] text-slate-400">({oficInternaCount} veíc)</span></span>

                </div>

                <div className="w-full bg-slate-200 rounded-full h-4"><div className="h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all" style={{ width: `${percInterna}%` }}></div></div>

             </div>

          </div>

        </div>

      </div>



      {activeChart && <ModalGraficosDashboard chartType={activeChart} vehicles={vehicles} chamados={chamados} hoje={hoje} onClose={() => setActiveChart(null)} />}

      

      {modalChamadoParado && (

        <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

           <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl relative">

             <button onClick={() => setModalChamadoParado(null)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500"><X size={24}/></button>

             <h3 className="text-2xl font-black text-blue-950 mb-2">Detalhes do Chamado</h3>

             <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-6 border-b border-slate-100 pb-4">Placa: {modalChamadoParado.placa}</p>

             <div className="space-y-4">

               <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº do Chamado</p><p className="font-bold text-slate-700">{modalChamadoParado.numero}</p></div>

               <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Abertura</p><p className="font-bold text-slate-700">{formatarDataBR(modalChamadoParado.dataAbertura)}</p></div>

               <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Defeito Registrado</p><p className="font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">{modalChamadoParado.defeitoEncontrado || 'Nenhum defeito detalhado.'}</p></div>

               <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Parado</p><p className="font-black text-rose-500 text-lg">{calcularHorasParadas(modalChamadoParado.dataAbertura, hoje).toFixed(0)} horas</p></div>

             </div>

             <div className="mt-8 text-center"><button onClick={() => setModalChamadoParado(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-8 py-3 rounded-full transition-colors">Fechar</button></div>

           </div>

        </div>

      )}



      {modalHistoricoPlaca && (() => {
        const targetPlaca = modalHistoricoPlaca.trim().toUpperCase();
        const chamadosVeiculo = (rawChamados || chamados || []).filter(c => (c.placa || '').trim().toUpperCase() === targetPlaca).sort((a,b) => new Date(b.dataAbertura) - new Date(a.dataAbertura));

        return (
          <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <div>
                   <h3 className="text-xl font-black text-blue-950">Histórico Completo de Chamados</h3>
                   <p className="text-xs text-slate-400 font-bold mt-0.5">{chamadosVeiculo.length} chamado(s) encontrado(s)</p>
                 </div>
                 <button onClick={() => setModalHistoricoPlaca(null)} className="p-2 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 transition-colors"><X size={20}/></button>
               </div>

               <div className="p-8 space-y-4 overflow-y-auto flex-1">
                 <h4 className="text-2xl font-black text-emerald-600 mb-6 text-center tracking-tight">{modalHistoricoPlaca}</h4>

                 {chamadosVeiculo.length === 0 ? (
                   <div className="text-center py-10 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                     Nenhum chamado registrado para este veículo.
                   </div>
                 ) : (
                   paginatedVehChamados.map(c => (
                     <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-2">
                           <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg text-sm">{c.numero || 'Sem Nº'}</span>
                           {c.regional && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{c.regional}</span>}
                         </div>
                         <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest ${c.status === 'ABERTO' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{c.status}</span>
                       </div>

                       <p className="text-sm text-slate-700 font-bold mb-1">{c.defeitoPrincipal || c.defeitoEncontrado || 'Sem descrição'}</p>
                       {c.defeitoEncontrado && c.defeitoPrincipal && c.defeitoEncontrado !== c.defeitoPrincipal && (
                         <p className="text-xs text-slate-500 font-medium mb-2">{c.defeitoEncontrado}</p>
                       )}

                       <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400 border-t border-slate-100 pt-3 mt-3">
                         <span>Abertura: {formatarDataBR(c.dataAbertura)}</span>
                         {c.dataHoraFechamento && <span>Fechamento: {formatarDataBR(c.dataHoraFechamento)}</span>}
                         {c.motorista && <span>Motorista: {c.motorista}</span>}
                       </div>
                     </div>
                   ))
                 )}
               </div>

               <div className="p-6 bg-slate-50 border-t border-slate-100 text-center"><button onClick={() => setModalHistoricoPlaca(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-8 py-3 rounded-full transition-colors">Voltar</button></div>
             </div>
          </div>
        );
      })()}

      {showMotoristasDetalhe && (
        <ModalMotoristasDetalhe 
          rawChamados={rawChamados} 
          vehicles={vehicles} 
          onClose={() => setShowMotoristasDetalhe(false)} 
          onPlacaClick={(placa) => { setShowMotoristasDetalhe(false); setModalHistoricoPlaca(placa); }} 
        />
      )}

      {showPlacasDetalhe && (
        <ModalPlacasDetalhe 
          rawChamados={rawChamados} 
          vehicles={vehicles} 
          onClose={() => setShowPlacasDetalhe(false)} 
          onHistoricoClick={(placa) => { setShowPlacasDetalhe(false); setModalHistoricoPlaca(placa); }} 
        />
      )}

    </div>

  );

}



function ChamadosView({ chamados, vehicles, hoje, onEditar, onLiberar, userPermissions }) {
  const vehiclesMap = useMemo(() => new Map((vehicles || []).map(v => [v.placa, v])), [vehicles]);

  const [filters, setFilters] = useState({ turno: '', tipoOp: '', subTipo: '', etapa: '', subFluxo: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showChamadosFiltersModal, setShowChamadosFiltersModal] = useState(false);

  const activeChamadosFiltersCount = Object.values(filters).filter(v => v !== '').length;
  const clearChamadosFilters = () => setFilters({ turno: '', tipoOp: '', subTipo: '', etapa: '', subFluxo: '' });



  const chamadosFiltrados = chamados.filter(c => {

     if (c.status !== 'ABERTO') return false;

     

     const matchesSearch = searchQuery 

       ? (c.placa || '').toLowerCase().includes(searchQuery.toLowerCase()) || 

         (c.numero || '').toLowerCase().includes(searchQuery.toLowerCase())

       : true;

       

     if (!matchesSearch) return false;



     const veiculo = vehiclesMap.get(c.placa);

     const matchTurno = veiculo ? (filters.turno ? String(veiculo.turno || '').toUpperCase() === String(filters.turno).toUpperCase() : true) : true;

     const matchTipoOp = veiculo ? (filters.tipoOp ? String(veiculo.tipoOp || '').toUpperCase() === String(filters.tipoOp).toUpperCase() : true) : true;

     const matchSubTipo = veiculo ? (filters.subTipo ? String(veiculo.subTipo || '').toUpperCase() === String(filters.subTipo).toUpperCase() : true) : true;

     const matchEtapa = filters.etapa ? getEtapaWorkflow(c) === filters.etapa : true;

     const matchSubFluxo = filters.subFluxo ? c.dadosWorkflow?.subFluxoOficina?.status === filters.subFluxo : true;

     return matchTurno && matchTipoOp && matchSubTipo && matchEtapa && matchSubFluxo;

  });



  const chamadosNormais = chamadosFiltrados.filter(c => (c.situacaoVeiculo || 'RODANDO') === 'PARADO' && !c.naoImpeditivo);

  const chamadosAtencao = chamadosFiltrados.filter(c => (c.situacaoVeiculo || 'RODANDO') === 'RODANDO' || c.naoImpeditivo);



  const renderWorkflowCardList = (list, isAttention = false) => {

    return (

      <div className="space-y-4 p-6 bg-slate-50/50">

        {list.map(c => {

          const veiculoObj = vehiclesMap.get(c.placa);

          const equipeCod = veiculoObj?.equipes?.[0]?.codEquipe || 'Sem Equipe';

          const horas = calcularHorasParadas(c.dataAbertura, hoje);



          const isInternal = c.dadosWorkflow?.tipoOficina === 'Interna' || c.etapaWorkflow === 'Oficina Interna';

          const steps = isInternal 

            ? [

                { id: 'Análise Frota', label: 'Análise', icon: Wrench },

                { id: 'Oficina Interna', label: 'Oficina Int', icon: Home },

                { id: 'Liberado Operação', label: 'Liberado', icon: PlayCircle },

                { id: 'RESOLVIDO', label: 'Concluído', icon: CheckCircle2 }

              ]

            : [

                { id: 'Análise Frota', label: 'Análise', icon: Wrench },

                { id: 'Aguardando Desequipar', label: 'Desequipar', icon: Clock },

                { id: 'Desequipado - Entrada Oficina', label: 'Desequipado', icon: ClipboardCheck },

                { id: 'Oficina Externa', label: 'Oficina Ext', icon: Truck },

                { id: 'Liberado Operação', label: 'Liberado', icon: PlayCircle },

                { id: 'RESOLVIDO', label: 'Concluído', icon: CheckCircle2 }

              ];



          const currentIdx = steps.findIndex(s => s.id === getEtapaWorkflow(c));

          const isRejeitado = c.dadosWorkflow?.motivoRecusa && (c.etapaWorkflow === 'Análise Frota' || c.etapaWorkflow === 'Aguardando Manutenção');



          const getStepTimeStr = (stepId) => {

            let t = c.dadosWorkflow?.timestamps?.[stepId];

            if (!t) {

              if (stepId === 'Análise Frota' || stepId === 'Aguardando Manutenção') t = c.dataAbertura;

              if (stepId === 'Desequipado - Entrada Oficina') {

                t = c.dadosWorkflow?.timestamps?.['Oficina Externa'];

              }

            }

            if (t) {

              const dateObj = new Date(t);

              return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

            }

            return null;

          };



          return (

            <div 

              key={c.id} 

              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col lg:flex-row items-center justify-between gap-6 transition-all duration-300 group hover:shadow-[0_8px_30px_rgba(16,185,129,0.04)]"

            >

              {/* Left Column: Ticket Identification */}

              <div className="flex flex-col gap-2 w-full lg:w-1/4 shrink-0">

                <div className="flex items-center gap-2 flex-wrap">

                  <span 

                    onClick={() => onEditar(c)} 

                    className="font-black text-blue-900 text-lg tracking-tight italic hover:text-emerald-600 transition-colors cursor-pointer select-none"

                  >

                    {c.placa}

                  </span>

                  {c.codigoChamado && <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 mr-1">{c.codigoChamado}</span>}
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isAttention ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>

                    {c.numero}

                  </span>

                </div>

                

                <div className="flex flex-col gap-1 text-slate-400 font-bold text-xs">

                  <span className="flex items-center gap-1.5" title="Data de Abertura">
                    <CalendarDays size={13} className="text-slate-400" />
                    {formatarDataBR(c.dataAbertura)}
                  </span>
                  {c.dataHoraFechamento && (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold" title="Data de Conclusão">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      {formatarDataBR(c.dataHoraFechamento)}
                    </span>
                  )}
                  {c.defeitos && c.defeitos.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ClipboardCheck size={12} className="text-slate-400"/>
                      <span className="text-emerald-600">{c.defeitos.filter(d => d.status === 'RESOLVIDO').length}</span>/<span>{c.defeitos.length}</span> defeitos
                    </span>
                  )}

                  <span className="flex items-center gap-1.5">

                    <Users size={13} className="text-slate-400" />

                    {equipeCod} {c.motorista ? `(${c.motorista.split(' ')[0]})` : ''}

                  </span>

                  <span className="text-[10px] text-rose-500 font-black flex items-center gap-1 mt-0.5">

                    <Clock size={11} className="text-rose-500" />

                    Parado: {horas.toFixed(1)}h

                  </span>

                </div>

              </div>



              {/* Center Column: Workflow Stepper Graphic */}
              
              {/* Mobile Compact 3-Step Stepper (Anterior > ATUAL > Próximo) */}
              {(() => {
                const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
                const currStep = steps[currentIdx] || steps[0];
                const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
                
                return (
                  <div className="flex md:hidden flex-col w-full bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 my-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-center">Etapa do Chamado</span>
                    <div className="flex items-center justify-between gap-1 text-center">
                      <div className="flex-1 flex flex-col items-center min-w-0 p-1.5 rounded-xl bg-white/60 border border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Anterior</span>
                        <span className="text-[11px] font-bold text-slate-500 truncate w-full">
                          {prevStep ? prevStep.label : '—'}
                        </span>
                      </div>

                      <ChevronRight size={14} className="text-slate-300 shrink-0" />

                      <div className="flex-1 flex flex-col items-center min-w-0 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xs">
                        <span className="text-[8px] font-black text-emerald-600 uppercase">Atual</span>
                        <span className="text-xs font-black text-emerald-900 truncate w-full">
                          {currStep ? currStep.label : 'Concluído'}
                        </span>
                      </div>

                      <ChevronRight size={14} className="text-slate-300 shrink-0" />

                      <div className="flex-1 flex flex-col items-center min-w-0 p-1.5 rounded-xl bg-white/60 border border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Próximo</span>
                        <span className="text-[11px] font-bold text-slate-500 truncate w-full">
                          {nextStep ? nextStep.label : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Desktop Full Graphic Stepper */}
              <div className="hidden md:flex flex-1 justify-between items-center relative w-full px-4 min-w-[320px] pb-16 overflow-visible">

                {/* Horizontal line segment */}

                <div className="absolute top-[16px] left-[30px] right-[30px] h-[3px] bg-slate-100 z-0 rounded-full"></div>

                {/* Active/Completed segment overlay */}

                <div 

                  className="absolute top-[16px] left-[30px] h-[3px] bg-emerald-500 z-0 transition-all duration-500 rounded-full"

                  style={{

                    width: isRejeitado ? '0%' : `${(Math.max(0, currentIdx)) / (steps.length - 1) * 88}%`

                  }}

                ></div>



                {steps.map((step, idx) => {

                  const stepIdx = steps.findIndex(s => s.id === step.id);

                  const isCompleted = stepIdx < currentIdx;

                  const isActive = step.id === getEtapaWorkflow(c);

                  

                  const timeStr = getStepTimeStr(step.id);



                  return (

                    <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">

                      {/* Stepper Dot */}

                      <div 

                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border ${

                          isRejeitado && idx === 0

                            ? 'bg-rose-500 text-white border-rose-500 scale-105'

                            : isCompleted

                              ? 'bg-emerald-500 text-white border-emerald-500'

                              : isActive

                                ? 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-100 animate-pulse'

                                : 'bg-white text-slate-400 border-slate-200'

                        }`}

                        title={step.label}

                      >

                        {isRejeitado && idx === 0 ? (

                          <X size={14} className="font-bold" />

                        ) : isCompleted ? (

                          <Check size={14} />

                        ) : isActive ? (

                          <Clock size={14} />

                        ) : (

                          React.createElement(step.icon, { size: 14 })

                        )}

                      </div>

                      

                      {/* Label Text */}

                      <span className={`text-[8px] font-black uppercase mt-1.5 tracking-wider ${

                        isRejeitado && idx === 0 ? 'text-rose-500' :

                        isCompleted ? 'text-emerald-600' :

                        isActive ? 'text-amber-600' : 'text-slate-400'

                      }`}>

                        {step.label}

                      </span>

                      

                      {/* Transition Time below */}

                      {timeStr && (

                        <span className="text-[8px] text-slate-400 font-bold mt-0.5 whitespace-nowrap font-mono">

                          {timeStr}

                        </span>

                      )}

                      {/* BOLINHAS DO SUB-FLUXO */}
                      {step.id === 'Oficina Interna' && c.dadosWorkflow?.subFluxoOficina && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col items-center z-50">
                          <div className="w-0.5 h-3 bg-slate-200 mb-1"></div>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 shadow-sm border ${c.dadosWorkflow.subFluxoOficina.status === 'COMPRAS' ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-100 animate-pulse' : 'bg-emerald-500 text-white border-emerald-500'}`}>
                            <Briefcase size={8} />
                          </div>
                          <span className={`text-[6px] font-black uppercase mb-1 ${c.dadosWorkflow.subFluxoOficina.status === 'COMPRAS' ? 'text-amber-600' : 'text-emerald-600'}`}>Compras</span>

                          {(c.dadosWorkflow.subFluxoOficina.status === 'FINANCEIRO' || c.dadosWorkflow.subFluxoOficina.status === 'PAGO') && (
                            <>
                              <div className="w-0.5 h-2 bg-slate-200 -mt-1 mb-1"></div>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 shadow-sm border ${c.dadosWorkflow.subFluxoOficina.status === 'FINANCEIRO' ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-100 animate-pulse' : 'bg-emerald-500 text-white border-emerald-500'}`}>
                                <DollarSign size={8} />
                              </div>
                              <span className={`text-[6px] font-black uppercase ${c.dadosWorkflow.subFluxoOficina.status === 'FINANCEIRO' ? 'text-blue-600' : 'text-emerald-600'}`}>Finan</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                  );

                })}

              </div>



              {/* Right Column: Actions */}

              <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">

                <button 

                  onClick={() => onEditar(c)}

                  className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-2xl transition-all shadow-sm active:scale-95 border border-slate-100 hover:border-emerald-100"

                  title="Visualizar Detalhes / Ações"

                >

                  <Eye size={18} />

                </button>

                

                {c.etapaWorkflow?.includes('Liberado Opera') ? (
                  isAttention ? (
                    <button 
                      onClick={() => onLiberar(c)}
                      className="px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-700 hover:text-white rounded-full text-xs font-black transition-all active:scale-95 shadow-sm border border-slate-200 flex items-center gap-1.5"
                      title="Concluir Sem Restrição"
                    >
                      <CheckCircle2 size={13} />
                      Concluir
                    </button>
                  ) : (
                    <button 
                      onClick={() => onLiberar(c)}
                      className="px-5 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-full text-xs font-black transition-all active:scale-95 shadow-sm border border-emerald-200 flex items-center gap-1.5"
                      title="Liberar Operação"
                    >
                      <PlayCircle size={13} />
                      Liberar
                    </button>
                  )
                ) : null}

              </div>



            </div>

          );

        })}

        {list.length === 0 && (

          <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200/80">

            Nenhum chamado listado nesta categoria.

          </div>

        )}

      </div>

    );

  };



  return (

    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">

      {/* Search & Filter Controls Bar */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 p-4 sm:p-6 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Fast Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar Placa ou Nº Chamado..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl outline-none font-bold text-sm text-slate-700 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder-slate-400"
            />
          </div>

          {/* Filter button */}
          <div className="flex items-center gap-3 justify-between sm:justify-end">
            <button
              onClick={() => setShowChamadosFiltersModal(true)}
              className={`px-4 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 border ${
                activeChamadosFiltersCount > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter size={18} className={activeChamadosFiltersCount > 0 ? 'text-emerald-600' : 'text-slate-500'} />
              <span>Filtros</span>
              {activeChamadosFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                  {activeChamadosFiltersCount}
                </span>
              )}
            </button>

            {activeChamadosFiltersCount > 0 && (
              <button
                onClick={clearChamadosFilters}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 underline px-1"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Filtros de Chamados */}
      {showChamadosFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-emerald-600" />
                <h3 className="text-lg font-black text-blue-950">Filtros de Chamados</h3>
              </div>
              <button onClick={() => setShowChamadosFiltersModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Turno</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.turno} onChange={e => setFilters({...filters, turno: e.target.value})}>
                  <option value="">Turno (Todos)</option><option>Manhã</option><option>Tarde</option><option>Noite</option><option>Linha Viva</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Tipo OP</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.tipoOp} onChange={e => setFilters({...filters, tipoOp: e.target.value})}>
                  <option value="">Tipo OP (Todos)</option><option>TMA</option><option>Linha Viva</option><option>Linha Morta</option><option>SOC</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Sub Tipo</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.subTipo} onChange={e => setFilters({...filters, subTipo: e.target.value})}>
                  <option value="">Sub Tipo (Todos)</option><option>Munk</option><option>Cesto Aéreo</option><option>Fiorino</option><option>Strada</option><option>Argo</option><option>Moto</option><option>Leve</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Sub Fluxo</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.subFluxo || ""} onChange={e => setFilters({...filters, subFluxo: e.target.value})}>
                  <option value="">Sub Fluxo (Todos)</option><option value="COMPRAS">Em Compras</option><option value="FINANCEIRO">Em Financeiro</option><option value="PAGO">Pago</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Etapa Workflow</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.etapa} onChange={e => setFilters({...filters, etapa: e.target.value})}>
                  <option value="">Etapa Workflow (Todas)</option>
                  <option value="Análise Frota">Análise Frota</option>
                  <option value="Aguardando Desequipar">Aguardando Desequipar</option>
                  <option value="Desequipado - Entrada Oficina">Desequipado (Entrada Oficina)</option>
                  <option value="Oficina Interna">Oficina Interna</option>
                  <option value="Oficina Externa">Oficina Externa</option>
                  <option value="Liberado Operação">Liberado Operação</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button onClick={clearChamadosFilters} className="flex-1 py-3 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-black text-sm transition-colors">
                Limpar Filtros
              </button>
              <button onClick={() => setShowChamadosFiltersModal(false)} className="flex-1 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-sm transition-colors shadow-md shadow-emerald-600/20">
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}



      <div className="grid grid-cols-1 gap-8">

        {/* Chamados Impeditivos */}

        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 overflow-hidden flex flex-col">

          <div className="p-6 border-b border-slate-100 flex items-center justify-between">

            <h3 className="text-xl font-black text-blue-950 flex items-center gap-2"><AlertTriangle size={24} className="text-rose-500"/> Chamados Impeditivos</h3>

            <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold">{chamadosNormais.length} Veículos</span>

          </div>

          {renderWorkflowCardList(chamadosNormais, false)}

        </div>



        {/* Atenção (Não Impeditivos) */}

        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 overflow-hidden flex flex-col">

          <div className="p-6 border-b border-slate-100 flex items-center justify-between">

            <h3 className="text-xl font-black text-blue-950 flex items-center gap-2"><Eye size={24} className="text-amber-500"/> Atenção (Não Impeditivos)</h3>

            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">{chamadosAtencao.length} Veículos</span>

          </div>

          {renderWorkflowCardList(chamadosAtencao, true)}

        </div>
      </div>
    </div>
  );
}



function FrotaView({ vehicles, onSelectVehicle, userPermissions, laudosGeral }) {

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    turno: '', laudoStatus: '', fidelizacao: '', tipo: '', tipoOp: '', subTipo: '', implemento: '', locadora: ''
  });
  const [showFrotaFiltersModal, setShowFrotaFiltersModal] = useState(false);

  const activeFrotaFiltersCount = Object.values(filters).filter(v => v !== '').length;
  const clearFrotaFilters = () => setFilters({ turno: '', laudoStatus: '', fidelizacao: '', tipo: '', tipoOp: '', subTipo: '', implemento: '', locadora: '' });



  
  const getLaudoStatus = (v) => {
    let obrigatorios = ['CRLV'];
    const vStr = String(v.tipo || '').toUpperCase() + String(v.subTipo || '').toUpperCase();
    if (vStr.includes('CESTO') || vStr.includes('MUNK')) {
      obrigatorios = ['CRLV', 'Acústico', 'Dielétrico Liner', 'Dielétrico Lança'];
    }
    const vLaudos = laudosGeral ? laudosGeral.filter(l => l.veiculo_placa === v.placa) : [];
    
    let faltantes = 0;
    let presentes = 0;
    let maxDiasVencimento = Infinity;

    for (const req of obrigatorios) {
      const norm = (s) => String(s).replace(/Dielétrico/gi, 'Diel').replace(/Acústico/gi, 'Ac').toLowerCase();
      const laudosDestaCat = vLaudos.filter(l => norm(l.categoria).includes(norm(req)));
      if (laudosDestaCat.length === 0) {
        faltantes++;
        continue;
      }
      presentes++;
      laudosDestaCat.sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento));
      const latest = laudosDestaCat[0];
      const diasRestantes = Math.ceil((new Date(latest.data_vencimento) - new Date()) / (1000 * 60 * 60 * 24));
      
      if (diasRestantes < maxDiasVencimento) {
        maxDiasVencimento = diasRestantes;
      }
    }

    let filterKey = 'ok';
    let label = 'LAUDOS OK';
    let color = 'bg-emerald-100 text-emerald-800';
    let border = 'border-emerald-50';

    if (maxDiasVencimento < 0) {
      label = 'VENCIDO';
      filterKey = 'missing';
      color = 'bg-rose-100 text-rose-800';
      border = 'border-rose-400 ring-2 ring-rose-200';
    } else if (presentes === 0) {
      label = 'S/ LAUDOS';
      filterKey = 'missing';
      color = 'bg-rose-100 text-rose-800';
      border = 'border-rose-400 ring-2 ring-rose-200';
    } else if (faltantes > 0) {
      label = `LAUDO PARCIAL (${presentes}/${obrigatorios.length})`;
      filterKey = 'parcial';
      color = 'bg-purple-100 text-purple-800';
      border = 'border-purple-300 ring-2 ring-purple-100';
    } else {
      if (maxDiasVencimento <= 5) {
        label = `VENCE EM ${maxDiasVencimento}D`;
        filterKey = 'v5';
        color = 'bg-rose-100 text-rose-800';
        border = 'border-rose-400 ring-2 ring-rose-200';
      } else if (maxDiasVencimento <= 15) {
        label = `VENCE EM ${maxDiasVencimento}D`;
        filterKey = 'v15';
        color = 'bg-orange-100 text-orange-800';
        border = 'border-orange-400 ring-2 ring-orange-200';
      } else if (maxDiasVencimento <= 30) {
        label = `VENCE EM ${maxDiasVencimento}D`;
        filterKey = 'v30';
        color = 'bg-amber-100 text-amber-800';
        border = 'border-amber-400 ring-2 ring-amber-100';
      } else if (maxDiasVencimento <= 60) {
        label = `VENCE EM ${maxDiasVencimento}D`;
        filterKey = 'v60';
        color = 'bg-blue-100 text-blue-800';
        border = 'border-blue-200';
      } else {
        label = 'LAUDOS OK';
        filterKey = 'ok';
        color = 'bg-emerald-100 text-emerald-800';
        border = 'border-emerald-50';
      }
    }

    const isTotalOk = faltantes === 0 && maxDiasVencimento >= 0;

    return { label, filterKey, isTotalOk, color, border, maxDiasVencimento, presentes, totalReq: obrigatorios.length };
  };

  const filteredVehicles = vehicles.filter(v => {

    const matchSearch = v.placa.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTurno = filters.turno ? v.turno === filters.turno : true;

    const matchFid = filters.fidelizacao ? (filters.fidelizacao === 'SIM' ? (v.equipes && v.equipes.length > 0) : (!v.equipes || v.equipes.length === 0)) : true;

    const matchTipo = filters.tipo ? String(v.tipo || '').toUpperCase() === String(filters.tipo).toUpperCase() : true;

    const matchTipoOp = filters.tipoOp ? v.tipoOp === filters.tipoOp : true;

    const matchSubTipo = filters.subTipo ? String(v.subTipo || '').toUpperCase() === String(filters.subTipo).toUpperCase() : true;

    const matchImplemento = filters.implemento ? v.implemento === filters.implemento : true;

    const matchLocadora = filters.locadora ? v.locadora === filters.locadora : true;
    const matchLaudos = filters.laudoStatus 
      ? (filters.laudoStatus === 'ok' 
          ? getLaudoStatus(v).isTotalOk 
          : getLaudoStatus(v).filterKey === filters.laudoStatus) 
      : true;

    return matchSearch && matchTurno && matchFid && matchTipo && matchTipoOp && matchSubTipo && matchImplemento && matchLocadora && matchLaudos;

  });




  const laudosDashboard = { missing: 0, parcial: 0, v5: 0, v15: 0, v30: 0, v60: 0, ok: 0, total: 0 };
  vehicles.forEach(v => {
     const st = getLaudoStatus(v);
     laudosDashboard.total++;
     if (st.isTotalOk) laudosDashboard.ok++;
     if (st.filterKey === 'parcial') laudosDashboard.parcial++;
     if (st.filterKey === 'missing') laudosDashboard.missing++;
     if (st.filterKey === 'v5') laudosDashboard.v5++;
     if (st.filterKey === 'v15') laudosDashboard.v15++;
     if (st.filterKey === 'v30') laudosDashboard.v30++;
     if (st.filterKey === 'v60') laudosDashboard.v60++;
  });
  const pctOk = laudosDashboard.total > 0 ? Math.round((laudosDashboard.ok / laudosDashboard.total) * 100) : 0;
  return (

    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">

      <div className="mb-8">
        <h3 className="text-xl font-black text-blue-950 mb-4 flex items-center gap-2"><ShieldAlert size={24} className="text-blue-500"/> Monitor de Compliance (Laudos)</h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <div onClick={() => setFilters({...filters, laudoStatus: filters.laudoStatus === 'ok' ? '' : 'ok'})} className={`p-4 rounded-2xl cursor-pointer transition-all border ${filters.laudoStatus === 'ok' ? 'ring-4 ring-emerald-200 border-emerald-400 bg-emerald-50 scale-105 shadow-lg' : 'bg-white border-slate-100 hover:shadow-md hover:-translate-y-1'}`}>
            <h4 className="text-[10px] font-black uppercase text-emerald-600 mb-1 tracking-wider">Com Laudo</h4>
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-black text-emerald-700">{laudosDashboard.ok}</span>
              <FileCheck size={20} className="text-emerald-500 mb-1" />
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pctOk}%` }}></div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 text-right">{pctOk}% concluído</p>
          </div>

          <div onClick={() => setFilters({...filters, laudoStatus: filters.laudoStatus === 'parcial' ? '' : 'parcial'})} className={`p-4 rounded-2xl cursor-pointer transition-all border ${filters.laudoStatus === 'parcial' ? 'ring-4 ring-purple-200 border-purple-400 bg-purple-50 scale-105 shadow-lg' : 'bg-white border-purple-100 hover:shadow-md hover:-translate-y-1'}`}>
            <h4 className="text-[10px] font-black uppercase text-purple-600 mb-1 tracking-wider">Laudo Parcial</h4>
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-black text-purple-700">{laudosDashboard.parcial}</span>
              <FileClock size={20} className="text-purple-500 mb-1" />
            </div>
            <p className="text-[9px] font-bold text-purple-400 text-right">Incompleto</p>
          </div>

          <div onClick={() => setFilters({...filters, laudoStatus: filters.laudoStatus === 'missing' ? '' : 'missing'})} className={`p-4 rounded-2xl cursor-pointer transition-all border ${filters.laudoStatus === 'missing' ? 'ring-4 ring-slate-200 border-slate-400 bg-slate-100 scale-105 shadow-lg' : 'bg-white border-slate-100 hover:shadow-md hover:-translate-y-1'}`}>
            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-wider">Faltando / Vencido</h4>
            <div className="flex justify-between items-end"><span className="text-2xl font-black text-slate-700">{laudosDashboard.missing}</span><FileWarning size={20} className="text-slate-400 mb-1" /></div>
          </div>

          <div onClick={() => setFilters({...filters, laudoStatus: filters.laudoStatus === 'v5' ? '' : 'v5'})} className={`p-4 rounded-2xl cursor-pointer transition-all border ${filters.laudoStatus === 'v5' ? 'ring-4 ring-rose-200 border-rose-400 bg-rose-50 scale-105 shadow-lg' : 'bg-white border-rose-100 hover:shadow-md hover:-translate-y-1'}`}>
            <h4 className="text-[10px] font-black uppercase text-rose-500 mb-1 tracking-wider">Vence em 5 dias</h4>
            <div className="flex justify-between items-end"><span className="text-2xl font-black text-rose-700">{laudosDashboard.v5}</span><AlertOctagon size={20} className="text-rose-400 mb-1" /></div>
          </div>
          <div onClick={() => setFilters({...filters, laudoStatus: filters.laudoStatus === 'v15' ? '' : 'v15'})} className={`p-4 rounded-2xl cursor-pointer transition-all border ${filters.laudoStatus === 'v15' ? 'ring-4 ring-orange-200 border-orange-400 bg-orange-50 scale-105 shadow-lg' : 'bg-white border-orange-100 hover:shadow-md hover:-translate-y-1'}`}>
            <h4 className="text-[10px] font-black uppercase text-orange-500 mb-1 tracking-wider">Vence em 15 dias</h4>
            <div className="flex justify-between items-end"><span className="text-2xl font-black text-orange-700">{laudosDashboard.v15}</span><AlertTriangle size={20} className="text-orange-400 mb-1" /></div>
          </div>
          <div onClick={() => setFilters({...filters, laudoStatus: filters.laudoStatus === 'v30' ? '' : 'v30'})} className={`p-4 rounded-2xl cursor-pointer transition-all border ${filters.laudoStatus === 'v30' ? 'ring-4 ring-amber-200 border-amber-400 bg-amber-50 scale-105 shadow-lg' : 'bg-white border-amber-100 hover:shadow-md hover:-translate-y-1'}`}>
            <h4 className="text-[10px] font-black uppercase text-amber-500 mb-1 tracking-wider">Vence em 30 dias</h4>
            <div className="flex justify-between items-end"><span className="text-2xl font-black text-amber-700">{laudosDashboard.v30}</span><Clock size={20} className="text-amber-400 mb-1" /></div>
          </div>
          <div onClick={() => setFilters({...filters, laudoStatus: filters.laudoStatus === 'v60' ? '' : 'v60'})} className={`p-4 rounded-2xl cursor-pointer transition-all border ${filters.laudoStatus === 'v60' ? 'ring-4 ring-blue-200 border-blue-400 bg-blue-50 scale-105 shadow-lg' : 'bg-white border-blue-100 hover:shadow-md hover:-translate-y-1'}`}>
            <h4 className="text-[10px] font-black uppercase text-blue-500 mb-1 tracking-wider">Vence em 60 dias</h4>
            <div className="flex justify-between items-end"><span className="text-2xl font-black text-blue-700">{laudosDashboard.v60}</span><Info size={20} className="text-blue-400 mb-1" /></div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Fast Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm placeholder:text-slate-400"
            />
          </div>

          {/* Right controls: Filter Button + View Mode Toggle */}
          <div className="flex items-center gap-3 justify-between sm:justify-end">
            <button
              onClick={() => setShowFrotaFiltersModal(true)}
              className={`px-4 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 border ${
                activeFrotaFiltersCount > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter size={18} className={activeFrotaFiltersCount > 0 ? 'text-emerald-600' : 'text-slate-500'} />
              <span>Filtros</span>
              {activeFrotaFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                  {activeFrotaFiltersCount}
                </span>
              )}
            </button>

            {activeFrotaFiltersCount > 0 && (
              <button
                onClick={clearFrotaFilters}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 underline px-1"
              >
                Limpar
              </button>
            )}

            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60 ml-auto sm:ml-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-emerald-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visão por Cards"
              >
                <LayoutGrid size={16} />
                <span className="hidden xs:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-emerald-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visão em Lista"
              >
                <ListIcon size={16} />
                <span className="hidden xs:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Filtros da Frota */}
      {showFrotaFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-emerald-600" />
                <h3 className="text-lg font-black text-blue-950">Filtros da Frota</h3>
              </div>
              <button onClick={() => setShowFrotaFiltersModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Turno</label>
                <select value={filters.turno} onChange={e => setFilters({...filters, turno: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none">
                  <option value="">Turno (Todos)</option><option>Manhã</option><option>Tarde</option><option>Noite</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Fidelização</label>
                <select value={filters.fidelizacao} onChange={e => setFilters({...filters, fidelizacao: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none">
                  <option value="">Fidelização (Todos)</option><option value="SIM">Sim</option><option value="NÃO">Não</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Tipo</label>
                <select value={filters.tipo} onChange={e => setFilters({...filters, tipo: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none">
                  <option value="">Tipo (Todos)</option><option>Pesado</option><option>Leve</option><option>Moto</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Sub Tipo</label>
                <select value={filters.subTipo} onChange={e => setFilters({...filters, subTipo: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none">
                  <option value="">Sub Tipo (Todos)</option><option>Munk</option><option>Cesto Aéreo</option><option>Fiorino</option><option>Strada</option><option>Argo</option><option>Moto</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Tipo OP</label>
                <select value={filters.tipoOp} onChange={e => setFilters({...filters, tipoOp: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none">
                  <option value="">Tipo OP (Todos)</option><option>TMA</option><option>Linha Viva</option><option>Linha Morta</option><option>SOC</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Implemento</label>
                <select value={filters.implemento} onChange={e => setFilters({...filters, implemento: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none">
                  <option value="">Implemento (Todos)</option><option>PHD</option><option>IMAP</option><option>SKYRITZ</option><option>SKYCITY</option><option>AXION</option><option>TECMARQUES</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Locadora</label>
                <select value={filters.locadora} onChange={e => setFilters({...filters, locadora: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none">
                  <option value="">Locadora (Todos)</option><option>LOCALIZA</option><option>VAMOS</option><option>TOPE</option><option>LM</option><option>PRÓPRIO</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button onClick={clearFrotaFilters} className="flex-1 py-3 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-black text-sm transition-colors">
                Limpar Filtros
              </button>
              <button onClick={() => setShowFrotaFiltersModal(false)} className="flex-1 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-sm transition-colors shadow-md shadow-emerald-600/20">
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      

      <div className="mb-6 flex items-center justify-between">

         <h3 className="text-xl font-black text-blue-950">Resultados</h3>

         <div className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full font-black text-sm">Exibindo {filteredVehicles.length} veículo(s)</div>

      </div>



      {viewMode === 'grid' ? (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {filteredVehicles.map(v => (

            <div key={v.id} onClick={() => onSelectVehicle(v)} className={`bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all group ${getLaudoStatus(v).border}`}>

              <div className="flex justify-between items-start mb-6"><div><div className="flex items-center gap-2"><h4 className="text-2xl font-black text-blue-950">{v.placa}</h4>{v.regional && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold uppercase">{v.regional}</span>}</div><p className="text-slate-400 text-sm">{v.marca}  -  {v.tipo}</p></div><div className="flex flex-col items-end gap-1"><StatusBadge status={v.situacao} /><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getLaudoStatus(v).color}`}>{getLaudoStatus(v).label}</span></div></div>

              <div className="grid grid-cols-2 gap-4 mt-2">

                 <div className="bg-slate-50 p-3 rounded-2xl"><span className="text-slate-400 text-[10px] font-black uppercase block mb-1">Fidelização</span>{v.equipes?.length > 0 ? <span className="text-emerald-600 font-bold text-sm">SIM</span> : <span className="text-slate-600 font-bold text-sm">NÃO</span>}</div>

                 <div className="bg-slate-50 p-3 rounded-2xl"><span className="text-slate-400 text-[10px] font-black uppercase block mb-1">Turno</span><span className="text-slate-700 font-bold text-sm">{v.turno}</span></div>

              </div>

            </div>

          ))}

        </div>

      ) : (

        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 overflow-hidden">

          <div className="overflow-x-auto p-2">

            <table className="w-full text-left whitespace-nowrap">

              <thead><tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100"><th className="py-4 px-6">Placa / Marca</th><th className="py-4 px-6">Tipo</th><th className="py-4 px-6">Turno</th><th className="py-4 px-6">Fidelização</th><th className="py-4 px-6">Situação</th><th className="py-4 px-6 text-right">Ação</th></tr></thead>

              <tbody className="divide-y divide-slate-100">

                {filteredVehicles.map(v => (

                  <tr key={v.id} onClick={() => onSelectVehicle(v)} className="hover:bg-emerald-50/50 cursor-pointer group transition-colors">

                    <td className="py-4 px-6"><div className="font-black text-blue-950 text-base flex items-center gap-2">{v.placa} {v.regional && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[9px] font-bold uppercase">{v.regional}</span>}</div><div className="text-xs font-bold text-slate-400">{v.marca}</div></td>

                    <td className="py-4 px-6"><span className="font-bold text-slate-600">{v.tipo}</span><div className="text-xs text-slate-400">{v.subTipo}  -  {v.tipoOp}</div></td>

                    <td className="py-4 px-6"><span className="font-bold text-slate-700">{v.turno}</span></td>

                    <td className="py-4 px-6">{v.equipes?.length > 0 ? <span className="text-emerald-600 font-bold text-sm">SIM</span> : <span className="text-slate-400 font-bold text-sm">NÃO</span>}</td>

                    <td className="py-4 px-6"><StatusBadge status={v.situacao} /></td>

                    <td className="py-4 px-6 text-right"><ChevronRight size={20} className="text-slate-400 inline"/></td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>

  );

}



function DetalhesVeiculoView({ veiculo, chamados, rawChamados, colaboradores, hoje, currentUser, onVoltar, onUpdate, onDelete, laudosGeral, setLaudosGeral }) {

  const [activeTab, setActiveTab] = useState('dados');

  const [formData, setFormData] = useState(veiculo);

  const [isEditing, setIsEditing] = useState(false);

  const [isModalEquipeOpen, setIsModalEquipeOpen] = useState(false);

  const isGerente = ['GERENTE', 'COORDENADOR', 'ADMINISTRADOR'].includes(currentUser.perfil);
  const canEditLaudo = isGerente || (currentUser?.setor === 'Operações' && currentUser?.perfil === 'FROTA');



  const handleSubmit = (e) => {

    e.preventDefault();

    if (!isGerente) return;

    const mapeamento = { regional: 'Regional', turno: 'Turno', tipo: 'Tipo', subTipo: 'Sub Tipo', tipoOp: 'Tipo OP', implemento: 'Implemento', locadora: 'Locadora', tipoContrato: 'Tipo de Contrato', dtInicioContrato: 'Data Início Contrato', valorContrato: 'Valor Contrato' };

    const diffStr = gerarLogDePara(veiculo, formData, mapeamento);

    let novosLogs = veiculo.historicoModificacoes || [];

    if (diffStr) novosLogs = [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser.nome, descricao: `Edição: ${diffStr}` }, ...novosLogs];

    onUpdate({ ...formData, historicoModificacoes: novosLogs });

  };



  const handleDelete = () => {

    if (window.confirm('Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.')) {

      onDelete(veiculo.id);

    }

  };



  
  // LAUDOS LOGIC
  const [modalLaudoOpen, setModalLaudoOpen] = useState(false);
  const [novoLaudo, setNovoLaudo] = useState({ categoriaSelect: '', categoriaOutros: '', data_inicio: '', data_vencimento: '', file: null });
  const [uploadingLaudo, setUploadingLaudo] = useState(false);
  const fileInputRef = useRef(null);

  // Edit state
  const [laudoEmEdicao, setLaudoEmEdicao] = useState(null);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editLaudoData, setEditLaudoData] = useState({ id: '', categoriaSelect: '', categoriaOutros: '', data_inicio: '', data_vencimento: '', file: null });
  const fileEditInputRef = useRef(null);

  const meusLaudos = (laudosGeral || []).filter(l => l.veiculo_placa === veiculo.placa);

  const handleSaveLaudo = async (e) => {
    e.preventDefault();
    const finalCategoria = novoLaudo.categoriaSelect === 'Outros' ? novoLaudo.categoriaOutros : novoLaudo.categoriaSelect;
    if (!finalCategoria || !novoLaudo.data_inicio || !novoLaudo.data_vencimento || !novoLaudo.file) {
      alert("Preencha todos os campos e selecione um arquivo.");
      return;
    }
    setUploadingLaudo(true);
    
    try {
      const fileExt = novoLaudo.file.name.split('.').pop();
      const fileName = `${veiculo.placa}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('laudos_veiculos')
        .upload(fileName, novoLaudo.file);
        
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage.from('laudos_veiculos').getPublicUrl(fileName);
      const fileUrl = publicUrlData.publicUrl;
      
      const { data: insertData, error: insertError } = await supabase
        .from('veiculo_laudos')
        .insert([{
          veiculo_placa: veiculo.placa,
          categoria: finalCategoria,
          data_inicio: novoLaudo.data_inicio,
          data_vencimento: novoLaudo.data_vencimento,
          arquivo_url: fileUrl,
          usuario: currentUser.nome
        }]).select();
        
      if (insertError) throw insertError;
      
      if (insertData) {
         setLaudosGeral(prev => [insertData[0], ...prev]);
      }
      setModalLaudoOpen(false);
      setNovoLaudo({ categoriaSelect: '', categoriaOutros: '', data_inicio: '', data_vencimento: '', file: null });
    } catch(err) {
      alert("Erro ao salvar laudo: " + err.message);
    }
    setUploadingLaudo(false);
  };

  const handleDeleteLaudo = async (laudo) => {
    if (!window.confirm("Deseja realmente excluir este laudo?")) return;
    try {
      const { error: dbError } = await supabase
        .from('veiculo_laudos')
        .delete()
        .eq('id', laudo.id);
      if (dbError) throw dbError;

      try {
        const fileParts = laudo.arquivo_url.split('/');
        const fileName = fileParts[fileParts.length - 1];
        await supabase.storage.from('laudos_veiculos').remove([fileName]);
      } catch (err) {
        console.error("Erro ao deletar arquivo do Storage:", err);
      }

      setLaudosGeral(prev => prev.filter(l => l.id !== laudo.id));
    } catch (err) {
      alert("Erro ao excluir laudo: " + err.message);
    }
  };

  const handleEditLaudoClick = (laudo) => {
    const isPreset = LAUDOS_PRESET.includes(laudo.categoria);
    setLaudoEmEdicao(laudo);
    setEditLaudoData({
      id: laudo.id,
      categoriaSelect: isPreset ? laudo.categoria : 'Outros',
      categoriaOutros: isPreset ? '' : laudo.categoria,
      data_inicio: laudo.data_inicio,
      data_vencimento: laudo.data_vencimento,
      file: null
    });
    setModalEditOpen(true);
  };

  const handleUpdateLaudo = async (e) => {
    e.preventDefault();
    const finalCategoria = editLaudoData.categoriaSelect === 'Outros' ? editLaudoData.categoriaOutros : editLaudoData.categoriaSelect;
    if (!finalCategoria || !editLaudoData.data_inicio || !editLaudoData.data_vencimento) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    setUploadingLaudo(true);
    
    try {
      let fileUrl = laudoEmEdicao.arquivo_url;

      if (editLaudoData.file) {
        const fileExt = editLaudoData.file.name.split('.').pop();
        const fileName = `${veiculo.placa}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('laudos_veiculos')
          .upload(fileName, editLaudoData.file);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('laudos_veiculos').getPublicUrl(fileName);
        fileUrl = publicUrlData.publicUrl;

        try {
          const oldParts = laudoEmEdicao.arquivo_url.split('/');
          const oldFileName = oldParts[oldParts.length - 1];
          await supabase.storage.from('laudos_veiculos').remove([oldFileName]);
        } catch (err) {
          console.error("Erro ao deletar arquivo antigo:", err);
        }
      }
      
      const { data: updateData, error: updateError } = await supabase
        .from('veiculo_laudos')
        .update({
          categoria: finalCategoria,
          data_inicio: editLaudoData.data_inicio,
          data_vencimento: editLaudoData.data_vencimento,
          arquivo_url: fileUrl,
          usuario: currentUser.nome
        })
        .eq('id', editLaudoData.id)
        .select();
        
      if (updateError) throw updateError;
      
      if (updateData) {
         setLaudosGeral(prev => prev.map(l => l.id === editLaudoData.id ? updateData[0] : l));
      }
      setModalEditOpen(false);
      setLaudoEmEdicao(null);
    } catch(err) {
      alert("Erro ao atualizar laudo: " + err.message);
    }
    setUploadingLaudo(false);
  };

  const handleAddEquipe = (novaEquipe) => {

    const atualizadas = [...(veiculo.equipes || []), { ...novaEquipe, id: Date.now() }];

    const novosLogs = [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser.nome, descricao: `Equipe adicionada: ${novaEquipe.codEquipe}` }, ...(veiculo.historicoModificacoes || [])];

    onUpdate({ ...veiculo, equipes: atualizadas, fidelizacao: 'SIM', historicoModificacoes: novosLogs });

    setIsModalEquipeOpen(false);

  };

  const handleRemoverEquipe = (eqId) => {

    const atualizadas = veiculo.equipes.filter(e => e.id !== eqId);

    const novosLogs = [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser.nome, descricao: 'Equipe removida.' }, ...(veiculo.historicoModificacoes || [])];

    onUpdate({ ...veiculo, equipes: atualizadas, fidelizacao: atualizadas.length > 0 ? 'SIM' : 'NÃO', historicoModificacoes: novosLogs });

  };



  

  

  const [histPortariaChks, setHistPortariaChks] = React.useState([]);

  const [histPortariaLoading, setHistPortariaLoading] = React.useState(false);



  React.useEffect(() => {

    if (activeTab === 'historico_portaria') {

      setHistPortariaLoading(true);

      supabase.from('checklists').select('*').eq('placa', veiculo.placa).order('data_saida', { ascending: false }).then(({data}) => {

        setHistPortariaChks(data || []);

        setHistPortariaLoading(false);

      });

    }

  }, [activeTab, veiculo.placa]);

const [ultimoChecklist, setUltimoChecklist] = React.useState(null);

  const [analiseFidelidade, setAnaliseFidelidade] = React.useState(null);



  React.useEffect(() => {

    if (activeTab === 'equipes') {

      const fetchUltimo = async () => {

        const { data } = await supabase.from('checklists').select('*').eq('placa', veiculo.placa).not('data_saida', 'is', null).order('data_saida', { ascending: false }).limit(1);

        if (data && data.length > 0) {

          const chk = data[0];

          setUltimoChecklist(chk);

          

          // Análise de fidelidade

          let colabsAutorizados = [];

          if (veiculo.equipes) {

            veiculo.equipes.forEach(eq => {

              eq.componentes.forEach(compId => {

                const colab = colaboradores.find(c => String(c.matricula) === String(compId) || String(c.id) === String(compId));

                if (colab) colabsAutorizados.push(colab.nome.toUpperCase().trim());

              });

            });

          }

          const executorName = (chk.executores || '').toUpperCase().trim();

          const isFidelizado = colabsAutorizados.some(nome => executorName.includes(nome) || nome.includes(executorName));

          setAnaliseFidelidade({ isFidelizado, executorName, dataSaida: chk.data_saida, dataEntrada: chk.data_entrada, autorizados: colabsAutorizados });

        }

      };

      fetchUltimo();

    }

  }, [activeTab, veiculo.placa, veiculo.equipes, colaboradores]);

return (

    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">

      <div className="flex items-center gap-6 mb-8"><button onClick={onVoltar} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-600 hover:bg-emerald-50 shadow-sm"><ArrowLeft size={24} /></button><div><h2 className="text-3xl font-black text-blue-950">Veículo {veiculo.placa}</h2></div></div>

      <div className="flex bg-white p-1.5 rounded-full w-fit mb-8 shadow-sm border border-slate-100 overflow-x-auto max-w-full">

        <button onClick={() => setActiveTab('dados')} className={`px-8 py-3 rounded-full text-sm font-bold transition-all shrink-0 ${activeTab === 'dados' ? 'bg-emerald-600 shadow-md text-white' : 'text-slate-500 hover:text-blue-950'}`}>Dados & Histórico</button>

        <button onClick={() => setActiveTab('equipes')} className={`px-8 py-3 rounded-full text-sm font-bold transition-all shrink-0 flex items-center gap-2 ${activeTab === 'equipes' ? 'bg-emerald-600 shadow-md text-white' : 'text-slate-500 hover:text-blue-950'}`}><ShieldCheck size={18} /> Fidelização</button>

        <button onClick={() => setActiveTab('smart')} className={`px-8 py-3 rounded-full text-sm font-bold transition-all shrink-0 flex items-center gap-2 ${activeTab === 'smart' ? 'bg-blue-600 shadow-md text-white' : 'text-slate-500 hover:text-blue-950'}`}><Smartphone size={18} /> SMART Associado</button>

        <button onClick={() => setActiveTab('laudos')} className={`px-8 py-3 rounded-full text-sm font-bold transition-all shrink-0 flex items-center gap-2 ${activeTab === 'laudos' ? 'bg-emerald-600 shadow-md text-white' : 'text-slate-500 hover:text-blue-950'}`}><FileBadge size={18} /> Laudos do Veículo</button>


        <button onClick={() => setActiveTab('historico_portaria')} className={`px-8 py-3 rounded-full text-sm font-bold transition-all shrink-0 flex items-center gap-2 ${activeTab === 'historico_portaria' ? 'bg-indigo-600 shadow-md text-white' : 'text-slate-500 hover:text-blue-950'}`}><FileText size={18} /> Histórico de Portaria</button>

        <button onClick={() => setActiveTab('historico_chamados')} className={`px-8 py-3 rounded-full text-sm font-bold transition-all shrink-0 flex items-center gap-2 ${activeTab === 'historico_chamados' ? 'bg-rose-600 shadow-md text-white' : 'text-slate-500 hover:text-blue-950'}`}><History size={18} /> Histórico de Chamados</button>

      </div>



      {activeTab === 'historico_chamados' && (() => {
        const targetPlaca = (veiculo.placa || '').trim().toUpperCase();
        const chamadosVeiculo = (rawChamados || chamados || []).filter(c => (c.placa || '').trim().toUpperCase() === targetPlaca).sort((a, b) => new Date(b.dataAbertura) - new Date(a.dataAbertura));

        return (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-emerald-50 min-h-[400px]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-6">
              <h3 className="text-2xl font-black text-blue-950 flex items-center gap-2"><History size={24} className="text-rose-500"/> Histórico de Chamados</h3>
              <span className="bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full font-bold text-sm">{chamadosVeiculo.length} Registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Abertura</th>
                    <th className="py-4 px-6">Nº Chamado</th>
                    <th className="py-4 px-6">Defeito Registrado</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6">Fechamento</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {chamadosVeiculo.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 font-bold text-sm">
                        Nenhum chamado histórico encontrado para este veículo.
                      </td>
                    </tr>
                  ) : (
                    chamadosVeiculo.map(c => (

                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">

                    <td className="py-4 px-6 text-sm font-bold text-slate-600">{formatarDataBR(c.dataAbertura)}</td>

                    <td className="py-4 px-6 text-sm font-black text-blue-950">{c.numero}</td>

                    <td className="py-4 px-6 text-xs font-medium text-slate-500 max-w-[250px] truncate" title={c.defeitoPrincipal}>{c.defeitoPrincipal || '-'}</td>

                    <td className="py-4 px-6 text-center">

                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${c.status === 'ABERTO' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.status}</span>

                    </td>

                    <td className="py-4 px-6 text-sm font-bold text-slate-600">{c.dataHoraFechamento ? formatarDataBR(c.dataHoraFechamento) : '-'}</td>

                  </tr>

                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}



      {activeTab === 'smart' && (

        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-emerald-50 min-h-[400px]">

          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">

            <h3 className="text-2xl font-black text-blue-950 flex items-center gap-2"><Smartphone size={24} className="text-blue-500"/> Aparelho SMART Associado</h3>

            {isGerente && veiculo.smart && (

              <button onClick={() => setIsModalEquipeOpen('smart')} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-6 py-3 rounded-full text-sm font-black flex items-center gap-2 transition-colors"><RefreshCcw size={18}/> Substituir Aparelho</button>

            )}

          </div>

          

          {veiculo.smart ? (

             <div className="bg-gradient-to-br from-blue-950 to-blue-900 rounded-[2rem] p-8 shadow-lg max-w-lg text-white relative overflow-hidden">

                <Smartphone size={120} className="absolute -right-4 -bottom-4 text-white/5" />

                <div className="mb-6"><span className="bg-blue-500/30 text-blue-100 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Aparelho Ativo</span></div>

                <h4 className="text-3xl font-black mb-1">{veiculo.smart.marca} {veiculo.smart.modelo}</h4>

                <p className="text-blue-200 font-bold mb-8">{veiculo.smart.telefone}</p>

                

                <div className="flex items-center gap-4 text-sm font-medium border-t border-blue-800/50 pt-4">

                   <div className="flex-1"><span className="block text-blue-400 text-[10px] uppercase font-black">Cód PULSUS</span><span className="font-bold">{veiculo.smart.codPulsus}</span></div>

                   <div className="flex-1"><span className="block text-blue-400 text-[10px] uppercase font-black">Status</span><span className="font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={14}/> Sincronizado</span></div>

                </div>

             </div>

          ) : (

             <div className="text-center py-16 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">

                <Smartphone size={48} className="mx-auto text-slate-300 mb-4" />

                <h4 className="text-lg font-black text-slate-600 mb-2">Nenhum SMART Vinculado</h4>

                <p className="text-slate-400 text-sm font-medium mb-6">Este veículo ainda não possui um aparelho celular associado em nosso sistema.</p>

                {isGerente && <button onClick={() => setIsModalEquipeOpen('smart')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full text-sm font-black inline-flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"><PlusCircle size={20}/> Adicionar SMART</button>}

             </div>

          )}

        </div>

      )}



      {activeTab === 'dados' && (

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-1 bg-white rounded-[2rem] p-8 shadow-sm border border-emerald-50">

            <div className="flex justify-between items-center mb-6">

              <h3 className="font-black text-xl text-blue-950 flex items-center gap-2"><CarFront size={22} className="text-emerald-500" /> Cadastro</h3>

              {isGerente && !isEditing && <button onClick={() => setIsEditing(true)} className="text-xs bg-slate-100 text-slate-600 px-4 py-2 rounded-full font-bold hover:bg-slate-200 transition-colors">Editar</button>}

            </div>

            

            {!isEditing ? (

              <div className="space-y-4">

                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Regional</span><span className="font-bold text-slate-700">{veiculo.regional || 'Norte'}</span></div>

                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Turno</span><span className="font-bold text-slate-700">{veiculo.turno}</span></div>

                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Tipo</span><span className="font-bold text-slate-700">{veiculo.tipo}</span></div>

                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Sub Tipo</span><span className="font-bold text-slate-700">{veiculo.subTipo || '-'}</span></div>

                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Tipo OP</span><span className="font-bold text-slate-700">{veiculo.tipoOp || '-'}</span></div>

                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Implemento</span><span className="font-bold text-slate-700">{veiculo.implemento || '-'}</span></div>

                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Locadora</span><span className="font-bold text-slate-700">{veiculo.locadora || '-'}</span></div>
                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Tipo de Contrato</span><span className="font-bold text-slate-700">{veiculo.tipoContrato || '-'}</span></div>
                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Dt Início Contrato</span><span className="font-bold text-slate-700">{veiculo.dtInicioContrato || '-'}</span></div>
                 <div><span className="block text-[10px] font-black text-slate-400 uppercase">Valor Contrato</span><span className="font-bold text-slate-700">{veiculo.valorContrato ? `R$ ${veiculo.valorContrato}` : '-'}</span></div>

                 

                 {isGerente && (

                   <div className="pt-4 border-t border-slate-100">

                     <button onClick={handleDelete} className="text-xs text-rose-500 font-bold hover:underline flex items-center gap-1"><Trash2 size={14}/> Excluir Veículo</button>

                   </div>

                 )}

              </div>

            ) : (

              <form onSubmit={(e) => { handleSubmit(e); setIsEditing(false); }} className="space-y-4">

                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Regional</label><select className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.regional || 'Norte'} onChange={(e) => setFormData({...formData, regional: e.target.value})}><option value="Norte">Norte</option><option value="Leste">Leste</option></select></div>

                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Turno</label><select className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.turno} onChange={(e) => setFormData({...formData, turno: e.target.value})}><option>Manhã</option><option>Tarde</option><option>Noite</option></select></div>

                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Tipo</label><select className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}><option>Pesado</option><option>Leve</option><option>Moto</option></select></div>

                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Sub Tipo</label><select className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.subTipo || ''} onChange={(e) => setFormData({...formData, subTipo: e.target.value})}><option value="">Selecione</option><option>Munk</option><option>Cesto Aéreo</option><option>Fiorino</option><option>Strada</option><option>Argo</option><option>Moto</option></select></div>

                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Tipo OP</label><select className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.tipoOp || ''} onChange={(e) => setFormData({...formData, tipoOp: e.target.value})}><option value="">Selecione</option><option>TMA</option><option>Linha Viva</option><option>Linha Morta</option><option>SOC</option></select></div>

                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Implemento</label><select className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.implemento || ''} onChange={(e) => setFormData({...formData, implemento: e.target.value})}><option value="">Selecione</option><option>PHD</option><option>IMAP</option><option>SKYRITZ</option><option>SKYCITY</option><option>AXION</option><option>TECMARQUES</option></select></div>

                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Locadora</label><select className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.locadora || ''} onChange={(e) => setFormData({...formData, locadora: e.target.value})}><option value="">Selecione</option><option>LOCALIZA</option><option>VAMOS</option><option>TOPE</option><option>LM</option><option>PRÓPRIO</option></select></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Tipo Contrato</label><select className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.tipoContrato || ''} onChange={(e) => setFormData({...formData, tipoContrato: e.target.value})}><option value="">Selecione</option><option>Contrato Novo</option><option>Contrato Antigo</option><option>Sem Contrato</option></select></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Dt Início</label><input type="text" className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.dtInicioContrato || ''} onChange={(e) => setFormData({...formData, dtInicioContrato: e.target.value})} placeholder="DD/MM/AAAA" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Valor</label><input type="text" className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.valorContrato || ''} onChange={(e) => setFormData({...formData, valorContrato: e.target.value})} placeholder="Ex: 1.590" /></div>

                

                <div className="flex gap-2 pt-2">

                  <button type="button" onClick={() => { setFormData(veiculo); setIsEditing(false); }} className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 flex items-center justify-center transition-all"><X size={20}/></button>

                  <button type="submit" className="flex-1 py-3.5 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all">Salvar</button>

                </div>

              </form>

            )}

          </div>

          <div className="lg:col-span-2 space-y-8">

            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-emerald-50">

               <h3 className="font-black text-xl text-blue-950 mb-6 flex items-center gap-2"><History size={22} className="text-blue-500" /> Log de Auditoria (DE &gt; PARA)</h3>

               <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">

                 {veiculo.historicoModificacoes?.map(log => (

                   <div key={log.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">

                     <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wide mb-2"><span>ð¤ {log.usuario}</span><span>ð {formatarDataBR(log.dataHora)}</span></div>

                     <p className="text-slate-700 font-medium">{log.descricao}</p>

                   </div>

                 ))}

                 {(!veiculo.historicoModificacoes || veiculo.historicoModificacoes.length === 0) && <p className="text-slate-400 text-center py-4">Sem registros.</p>}

               </div>

            </div>

          </div>

        </div>

      )}



      

      {activeTab === 'historico_portaria' && (

        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-emerald-50 min-h-[400px]">

          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-6">

            <h3 className="text-2xl font-black text-blue-950 flex items-center gap-2"><FileText size={24} className="text-indigo-500"/> Histórico de Portaria</h3>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left whitespace-nowrap">

              <thead>

                <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">

                  <th className="p-4 rounded-tl-xl">Checklist</th>

                  <th className="p-4">Executor (Real)</th>

                  <th className="p-4">Saída / Entrada</th>

                  <th className="p-4 rounded-tr-xl">Status</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {histPortariaLoading ? (

                   <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-bold">Carregando histórico...</td></tr>

                ) : histPortariaChks.length === 0 ? (

                   <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-bold">Nenhum checklist registrado para este veículo.</td></tr>

                ) : (

                   histPortariaChks.map(c => {

                      let colabsAutorizados = [];

                      if (veiculo.equipes) {

                        veiculo.equipes.forEach(eq => {

                          (eq.componentes || []).forEach(compId => {

                            const colab = colaboradores.find(c => String(c.matricula) === String(compId) || String(c.id) === String(compId));

                            if (colab && colab.nome) colabsAutorizados.push(colab.nome.toUpperCase().trim());

                          });

                        });

                      }

                      const executorName = (c.executores || '').toUpperCase().trim();

                      const isFidelizado = colabsAutorizados.some(nome => executorName.includes(nome) || nome.includes(executorName));

                      

                      return (

                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">

                          <td className="p-4 font-bold text-blue-950">{c.id}</td>

                          <td className="p-4 font-bold text-slate-600">{c.executores}</td>

                          <td className="p-4">

                            <div className="text-xs font-bold text-slate-600"><span className="text-slate-400">Saída:</span> {c.data_saida ? new Date(c.data_saida).toLocaleString('pt-BR') : '-'}</div>

                            <div className="text-xs font-bold text-slate-600"><span className="text-slate-400">Retorno:</span> {c.data_entrada ? new Date(c.data_entrada).toLocaleString('pt-BR') : '-'}</div>

                          </td>

                          <td className="p-4">

                            {isFidelizado ? 

                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-black text-xs uppercase"><Check size={14}/> Fiel / OK</span> :

                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full font-black text-xs uppercase"><AlertTriangle size={14}/> Fuga</span>

                            }

                          </td>

                        </tr>

                      );

                   })

                )}

              </tbody>

            </table>

          </div>

        </div>

      )}

{activeTab === 'equipes' && (

        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-emerald-50 min-h-[400px]">

          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">

            <h3 className="text-2xl font-black text-blue-950">Equipes Fidelizadas</h3>

            {isGerente && (veiculo.equipes?.length || 0) < 3 && <button onClick={() => setIsModalEquipeOpen('equipe')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm font-black flex items-center gap-2"><PlusCircle size={20}/> Adicionar Equipe</button>}

          </div>

  {analiseFidelidade && (

    <div className={`mt-4 p-4 rounded-xl border flex items-start gap-4 shadow-sm ${analiseFidelidade.isFidelizado ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>

      <div className={`p-2 rounded-full ${analiseFidelidade.isFidelizado ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>

        {analiseFidelidade.isFidelizado ? <CheckCircle2 size={24}/> : <AlertTriangle size={24}/>}

      </div>

      <div>

        <h4 className={`font-black text-lg ${analiseFidelidade.isFidelizado ? 'text-emerald-800' : 'text-rose-800'}`}>

          {analiseFidelidade.isFidelizado ? 'Fidelização Mantida no Último Uso' : 'Alerta Grave: Fuga de Fidelização'}

        </h4>

        <p className={`text-sm font-bold mt-1 ${analiseFidelidade.isFidelizado ? 'text-emerald-600' : 'text-rose-600'}`}>

          Último Checklist: {analiseFidelidade.executorName}

        </p>

        <p className="text-xs text-slate-500 mt-1">

          Saída: {analiseFidelidade.dataSaida ? new Date(analiseFidelidade.dataSaida).toLocaleString('pt-BR') : '-'} | Retorno: {analiseFidelidade.dataEntrada ? new Date(analiseFidelidade.dataEntrada).toLocaleString('pt-BR') : '-'}

        </p>

        {!analiseFidelidade.isFidelizado && (

          <p className="text-xs text-rose-500 font-bold mt-2">

            Atenção: O colaborador que retirou o veículo não consta nas equipes cadastradas abaixo.

          </p>

        )}

      </div>

    </div>

  )}



          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {veiculo.equipes?.map(eq => (

              <div key={eq.id} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm group">

                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-start">

                  <div><span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md mb-2 inline-block">Grupo {eq.grupoFolga}</span><h4 className="text-2xl font-black text-blue-950 mt-1">{String(eq.codEquipe).toUpperCase()}</h4><p className="text-xs font-bold text-slate-500 mt-1 uppercase">{eq.tipoEquipe || 'FIXA'}</p></div>

                  {isGerente && <button onClick={() => { if(window.confirm('Remover?')) handleRemoverEquipe(eq.id); }} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm"><Trash2 size={18}/></button>}

                </div>

                {eq.documentoAnexo && (<div className="px-6 pt-4"><a href={eq.documentoUrl || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"><FileCheck size={24} className="text-indigo-500 shrink-0" /><div className="overflow-hidden"><p className="text-xs font-bold text-slate-500 uppercase">Termo PDF (Clique para Abrir)</p><p className="text-sm font-bold text-indigo-700 truncate">{eq.documentoAnexo}</p></div></a></div>)}

                <div className="p-6 space-y-4">

                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Componentes</p>

                  {eq.componentes.map((compId, idx) => {

                    const colab = colaboradores.find(c => String(c.matricula) === String(compId) || String(c.id) === String(compId));

                    return (<div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={20}/></div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-blue-950 truncate">{colab ? colab.nome : 'Desconhecido'}</p></div></div>);

                  })}

                </div>

              </div>

            ))}

          </div>

        </div>

      )}

      {isModalEquipeOpen === 'equipe' && (

        <ModalNovaEquipe vehicle={veiculo} colaboradores={colaboradores} onClose={() => setIsModalEquipeOpen(false)} onSubmit={handleAddEquipe} />

      )}



      {isModalEquipeOpen === 'smart' && (

        <ModalSmart veiculo={veiculo} smartAtual={veiculo.smart} onClose={() => setIsModalEquipeOpen(false)} onSubmit={(smartData) => {

           const novosLogs = [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser.nome, descricao: veiculo.smart ? `SMART substituído. Novo: ${smartData.marca} ${smartData.modelo} (${smartData.telefone})` : `SMART adicionado: ${smartData.marca} ${smartData.modelo} (${smartData.telefone})` }, ...(veiculo.historicoModificacoes || [])];

           onUpdate({ ...veiculo, smart: smartData, historicoModificacoes: novosLogs });

           setIsModalEquipeOpen(false);

        }} />

      )}


      {activeTab === 'laudos' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-emerald-50 min-h-[400px]">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-6">
            <div>
              <h3 className="text-2xl font-black text-blue-950 flex items-center gap-2"><FileBadge size={24} className="text-emerald-500"/> Laudos do Veículo</h3>
              {(veiculo.tipo === 'Cesto Aéreo' || veiculo.tipo === 'Munk') && (
                <p className="text-sm font-bold text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={14}/> Tipo de veículo exige laudo obrigatório.</p>
              )}
            </div>
            {canEditLaudo && (
              <button onClick={() => setModalLaudoOpen(true)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-sm transition-colors flex items-center gap-2 shadow-sm">
                <Plus size={16} /> Adicionar Laudo
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Histórico de Arquivos</h4>
              {meusLaudos.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-medium">Nenhum laudo registrado para este veículo.</div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                     const ativos = new Set();
                     const categoriasMap = {};
                     const hoje = new Date();
                     meusLaudos.forEach(l => {
                       if (!categoriasMap[l.categoria]) {
                         categoriasMap[l.categoria] = true;
                         const venc = new Date(l.data_vencimento);
                         if (venc >= hoje) ativos.add(l.id);
                       }
                     });
                     
                     return meusLaudos.map(l => {
                       const isAtivo = ativos.has(l.id);
                       const isVencido = !isAtivo && (new Date(l.data_vencimento) < hoje);
                       
                       return (
                         <div key={l.id} className="border border-slate-200 bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-colors">
                           <div className="flex gap-4">
                             <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isAtivo ? 'bg-emerald-100 text-emerald-600' : isVencido ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                               <FileCheck size={20} />
                             </div>
                             <div>
                               <div className="flex items-center gap-2">
                                 <h5 className="font-bold text-slate-800 text-lg">{l.categoria}</h5>
                                 {isAtivo && <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Ativo</span>}
                                 {isVencido && <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Vencido</span>}
                                 {!isAtivo && !isVencido && <span className="bg-slate-300 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Histórico</span>}
                               </div>
                               <p className="text-xs text-slate-500 mt-1">Validade: <b>{new Date(l.data_inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</b> até <b>{new Date(l.data_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</b></p>
                               <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><User size={12}/> Anexado por {l.usuario} em {new Date(l.data_inclusao).toLocaleString('pt-BR')}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <a href={l.arquivo_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-colors border border-slate-200" title="Visualizar"><Eye size={18} /></a>
                             {canEditLaudo && (
                               <>
                                 <button onClick={() => handleEditLaudoClick(l)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors border border-slate-200" title="Editar"><Edit size={18} /></button>
                                 <button onClick={() => handleDeleteLaudo(l)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors border border-slate-200" title="Excluir"><Trash2 size={18} /></button>
                               </>
                             )}
                           </div>
                         </div>
                       );
                     });
                  })()}
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                <QrCode size={28} className="text-slate-700" />
              </div>
              <h4 className="font-black text-slate-800 text-lg mb-2">QR Code Público</h4>
              <p className="text-xs font-medium text-slate-500 mb-6">Escaneie para acessar a página pública de laudos deste veículo. Ideal para auditorias em campo.</p>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <QRCodeSVG value={`${window.location.origin}/?laudos=${veiculo.placa}`} size={160} />
              </div>
              <a href={`${window.location.origin}/?laudos=${veiculo.placa}`} target="_blank" rel="noreferrer" className="mt-4 text-emerald-600 text-xs font-bold hover:underline flex items-center gap-1">Acessar Link Direto <ArrowRight size={12}/></a>
            </div>
          </div>

          {/* Modal Adicionar Laudo */}
          {modalLaudoOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8">
                <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
                  <h3 className="font-bold text-lg flex items-center gap-2"><PlusCircle size={20}/> Adicionar Laudo</h3>
                  <button onClick={() => setModalLaudoOpen(false)} className="text-white/70 hover:text-white"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveLaudo} className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria do Laudo</label>
                    <select required value={novoLaudo.categoriaSelect} onChange={e => setNovoLaudo({...novoLaudo, categoriaSelect: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-emerald-500 font-medium">
                                            <option value="">Selecione a categoria</option>
                      {LAUDOS_PRESET.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      <option value="Outros">Outros</option>
                    </select>
                    {novoLaudo.categoriaSelect === 'Outros' && (
                      <input type="text" required value={novoLaudo.categoriaOutros} onChange={e => setNovoLaudo({...novoLaudo, categoriaOutros: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-2 focus:outline-none focus:border-emerald-500 font-medium" placeholder="Digite a categoria customizada..." />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Data de Início</label>
                      <input type="date" required value={novoLaudo.data_inicio} onChange={e => setNovoLaudo({...novoLaudo, data_inicio: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-emerald-500 font-medium" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Vencimento</label>
                      <input type="date" required value={novoLaudo.data_vencimento} onChange={e => setNovoLaudo({...novoLaudo, data_vencimento: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-emerald-500 font-medium" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Arquivo (PDF, Imagem)</label>
                    <div className="mt-1 border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-colors" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={24} className="text-slate-400 mb-2" />
                      <p className="text-sm font-bold text-slate-600">{novoLaudo.file ? novoLaudo.file.name : 'Clique para selecionar o arquivo'}</p>
                      <input type="file" required ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={e => setNovoLaudo({...novoLaudo, file: e.target.files[0]})} />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" onClick={() => setModalLaudoOpen(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                    <button type="submit" disabled={uploadingLaudo} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
                      {uploadingLaudo ? 'Enviando...' : <><Save size={18}/> Salvar Laudo</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Editar Laudo */}
          {modalEditOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Edit size={20}/> Editar Laudo</h3>
                  <button onClick={() => { setModalEditOpen(false); setLaudoEmEdicao(null); }} className="text-white/70 hover:text-white"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateLaudo} className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria do Laudo</label>
                    <select required value={editLaudoData.categoriaSelect} onChange={e => setEditLaudoData({...editLaudoData, categoriaSelect: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-blue-500 font-medium">
                                            <option value="">Selecione a categoria</option>
                      {LAUDOS_PRESET.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      <option value="Outros">Outros</option>
                    </select>
                    {editLaudoData.categoriaSelect === 'Outros' && (
                      <input type="text" required value={editLaudoData.categoriaOutros} onChange={e => setEditLaudoData({...editLaudoData, categoriaOutros: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-2 focus:outline-none focus:border-blue-500 font-medium" placeholder="Digite a categoria customizada..." />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Data de Início</label>
                      <input type="date" required value={editLaudoData.data_inicio} onChange={e => setEditLaudoData({...editLaudoData, data_inicio: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-blue-500 font-medium" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Vencimento</label>
                      <input type="date" required value={editLaudoData.data_vencimento} onChange={e => setEditLaudoData({...editLaudoData, data_vencimento: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-blue-500 font-medium" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Arquivo (PDF, Imagem - Opcional)</label>
                    <div className="mt-1 border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors" onClick={() => fileEditInputRef.current?.click()}>
                      <Upload size={24} className="text-slate-400 mb-2" />
                      <p className="text-sm font-bold text-slate-600">{editLaudoData.file ? editLaudoData.file.name : 'Selecione para substituir o arquivo atual'}</p>
                      <input type="file" ref={fileEditInputRef} className="hidden" accept=".pdf,image/*" onChange={e => setEditLaudoData({...editLaudoData, file: e.target.files[0]})} />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" onClick={() => { setModalEditOpen(false); setLaudoEmEdicao(null); }} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                    <button type="submit" disabled={uploadingLaudo} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
                      {uploadingLaudo ? 'Enviando...' : <><Save size={18}/> Atualizar Laudo</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 📱 COLABORADORES MODULE (ULTRA PREMIUM 46 COLUNAS)
// ==========================================

function ColaboradoresView({ colaboradores, onSelectColaborador, onNewColaborador, userPermissions }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [baseFilter, setBaseFilter] = useState('');

  // 4 KPI Stats
  const stats = useMemo(() => {
    const total = colaboradores.length;
    const ativos = colaboradores.filter(c => (c.status_forca || c.statusForca || '').toLowerCase().includes('ativo')).length;
    const afastados = colaboradores.filter(c => {
      const s = (c.status_forca || c.statusForca || '').toLowerCase();
      return s.includes('afastado') || s.includes('falta') || s.includes('abandono');
    }).length;
    const prontidaoPct = total > 0 ? Math.round((ativos / total) * 100) : 0;
    return { total, ativos, afastados, prontidaoPct };
  }, [colaboradores]);

  // Filtered colaboradores
  const filtered = useMemo(() => {
    return colaboradores.filter(c => {
      const matchSearch = !searchTerm ? true : (
        (c.nome && c.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.matricula && String(c.matricula).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.cpf && String(c.cpf).includes(searchTerm)) ||
        (c.equipe && c.equipe.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.funcao && String(c.funcao).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.base_ut && c.base_ut.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      const matchStatus = !statusFilter ? true : (
        (c.status_forca || c.statusForca || '').toUpperCase().includes(statusFilter.toUpperCase())
      );

      const matchBase = !baseFilter ? true : (
        (c.base_ut || c.regional || '').toUpperCase().includes(baseFilter.toUpperCase())
      );

      return matchSearch && matchStatus && matchBase;
    });
  }, [colaboradores, searchTerm, statusFilter, baseFilter]);

  // Export 46 Columns Excel
  const handleExportExcel46Cols = () => {
    if (!filtered || filtered.length === 0) return;
    const rows = filtered.map(emp => ({
      'Matrícula': emp.matricula || '',
      'Chave Primária': emp.chave_primaria || '',
      'Nome': emp.nome || '',
      'Função': emp.funcao || '',
      'Qtd. Faltas Atual': emp.qtd_faltas_atual ?? 0,
      'Status Falta': emp.status_falta || '',
      'Base UT': emp.base_ut || emp.regional || '',
      'Status Força': emp.status_forca || emp.statusForca || '',
      'Ação a ser Feita': emp.acao_a_ser_feita || '',
      'Grupo Folga': emp.grupo_folga || emp.grupoFolga || '',
      'Commessa': emp.commessa || '',
      'Horário': emp.horario || '',
      'Equipe': emp.equipe || '',
      'Veículo': emp.veiculo || '',
      'Turno': emp.turno || '',
      'Área Atuação': emp.area_atuacao || emp.areaAtuacao || '',
      'Subgrupo': emp.subgrupo || '',
      'CNH': emp.cnh || '',
      'Filial': emp.filial || '',
      'Dt. Admissão': emp.dt_admissao || '',
      'Dt. Demissão': emp.dt_demissao || '',
      'Sit. Folha': emp.sit_folha || '',
      'Possui Periculosidade': emp.possui_periculosidade || '',
      'Diretoria': emp.diretoria || '',
      'Centro de Custo': emp.centro_custo || '',
      'Classe Custo': emp.classe_custo || '',
      'Segmento': emp.segmento || '',
      'Departamento': emp.departamento || '',
      'Gestor': emp.gestor || '',
      'Coordenador': emp.coordenador || '',
      'Supervisor': emp.supervisor || '',
      'Exp. 1º Período': emp.exp_1_periodo || '',
      'Exp. 2º Período': emp.exp_2_periodo || '',
      'Nº CNH': emp.nro_cnh || '',
      'Categoria CNH': emp.categoria_cnh || '',
      'Logradouro': emp.logradouro || '',
      'Endereço': emp.endereco || '',
      'Nº Endereço': emp.nro_endereco || '',
      'Bairro': emp.bairro || '',
      'Telefone': emp.telefone || '',
      'Celular': emp.celular || '',
      'CPF': emp.cpf || '',
      'Centro Custo Alpitel': emp.centro_custo_alpitel || '',
      'Commessa Alpitel': emp.comessa_alpitel || '',
      'Dt. Retorno Férias': emp.dt_retorno_ferias || '',
      'Nº Crachá': emp.nro_cracha || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Colaboradores (46 Colunas)');
    XLSX.writeFile(workbook, `COLABORADORES_46_COLUNAS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const activeFiltersCount = (statusFilter ? 1 : 0) + (baseFilter ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* KPI Cards Top Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Efetivo RH</span>
            <h4 className="text-2xl font-black text-blue-950">{stats.total}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <UserCheck size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Ativos na Força</span>
            <h4 className="text-2xl font-black text-emerald-700">{stats.ativos}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Afastados / Faltas</span>
            <h4 className="text-2xl font-black text-amber-700">{stats.afastados}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Award size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">Prontidão RH</span>
            <h4 className="text-2xl font-black text-purple-700">{stats.prontidaoPct}%</h4>
          </div>
        </div>
      </div>

      {/* Main Control Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Title & Action */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-blue-950">Banco de Colaboradores</h2>
            <span className="bg-emerald-100 text-emerald-700 font-black text-xs px-3 py-1 rounded-full">
              {filtered.length} cadastro(s)
            </span>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar Nome, Matrícula, Função, Equipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl font-medium text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>

            {/* Filter Modal Trigger */}
            <button
              onClick={() => setShowFilterModal(true)}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all border active:scale-95 ${
                activeFiltersCount > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter size={16} />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Export 46 Cols */}
            <button
              onClick={handleExportExcel46Cols}
              className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-2xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 shadow-xs"
              title="Exportar Base Completa em Excel com 46 colunas"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exportar (46 Colunas)</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visão Tabela Executiva"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'cards' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visão em Cards Liquid Glass"
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            {/* + Novo Colaborador */}
            <button
              onClick={onNewColaborador}
              className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Plus size={18} />
              <span>Novo Colaborador</span>
            </button>
          </div>
        </div>

        {/* Active filters badges bar */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="font-black text-slate-400 uppercase text-[10px]">Filtros Ativos:</span>
            {statusFilter && (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Status: {statusFilter}
                <X size={12} className="cursor-pointer" onClick={() => setStatusFilter('')} />
              </span>
            )}
            {baseFilter && (
              <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Base: {baseFilter}
                <X size={12} className="cursor-pointer" onClick={() => setBaseFilter('')} />
              </span>
            )}
            <button
              onClick={() => { setStatusFilter(''); setBaseFilter(''); }}
              className="text-rose-500 font-bold hover:underline ml-auto"
            >
              Limpar Todos
            </button>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-blue-950 text-lg flex items-center gap-2">
                <Filter size={18} className="text-emerald-600" />
                Filtros do Banco RH
              </h3>
              <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Status Força (RH)</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-xs"
                >
                  <option value="">Todos os Status</option>
                  <option value="Ativo">Ativo na Força</option>
                  <option value="Afastado">Afastado Confirmado</option>
                  <option value="Abandono">Verificar Abandono</option>
                  <option value="Férias">Férias</option>
                  <option value="Desligado">Desligado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Base UT (Regional)</label>
                <select
                  value={baseFilter}
                  onChange={(e) => setBaseFilter(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-xs"
                >
                  <option value="">Todas as Bases</option>
                  <option value="Norte">Base Norte</option>
                  <option value="Leste">Base Leste</option>
                  <option value="Sul">Base Sul</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <button
                onClick={() => { setStatusFilter(''); setBaseFilter(''); setShowFilterModal(false); }}
                className="flex-1 py-3 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-black text-xs"
              >
                Limpar
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-xs shadow-md shadow-emerald-600/20"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content (Table / Cards View) */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Colaborador / Matrícula</th>
                  <th className="py-4 px-6">Cargo / Função</th>
                  <th className="py-4 px-6">Equipe / Veículo</th>
                  <th className="py-4 px-6">Base UT / Regional</th>
                  <th className="py-4 px-6">Status RH</th>
                  <th className="py-4 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {filtered.slice(0, 150).map((c, idx) => {
                  const isAtivo = (c.status_forca || c.statusForca || '').toLowerCase().includes('ativo');
                  const uniqueKey = `colab-tbl-${c.matricula || 'nomat'}-${c.id || 'noid'}-${idx}`;
                  return (
                    <tr
                      key={uniqueKey}
                      onClick={() => onSelectColaborador(c)}
                      className="hover:bg-emerald-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-blue-950 uppercase group-hover:text-emerald-700 transition-colors">
                          {c.nome}
                        </div>
                        <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                          <span>Mat: {c.matricula || 'N/A'}</span>
                          {c.cpf && <span>• CPF: {c.cpf}</span>}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-slate-600 text-xs font-bold block">{c.funcao || 'N/A'}</span>
                        {c.subgrupo && <span className="text-[9px] font-black text-slate-400 uppercase">{c.subgrupo}</span>}
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-slate-700 text-xs font-bold block">
                          {c.equipe && c.equipe !== '--' && c.equipe !== 'Sobra' ? c.equipe : 'Sobra (Sem Equipe)'}
                        </span>
                        {c.veiculo && <span className="text-[10px] font-mono text-emerald-600 font-bold">{c.veiculo}</span>}
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-slate-600 text-xs font-bold block">{c.base_ut || c.regional || 'Norte'}</span>
                        {c.commessa && <span className="text-[9px] font-mono text-slate-400">{c.commessa}</span>}
                      </td>

                      <td className="py-4 px-6">
                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${
                          isAtivo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status_forca || c.statusForca || 'Ativo'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span className="p-2 bg-slate-50 group-hover:bg-emerald-100 text-slate-400 group-hover:text-emerald-700 rounded-xl transition-all inline-flex items-center">
                          <ChevronRight size={18} />
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-bold text-sm">
                      Nenhum colaborador encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View (Liquid Glass) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.slice(0, 150).map((c, idx) => {
            const isAtivo = (c.status_forca || c.statusForca || '').toLowerCase().includes('ativo');
            const uniqueKey = `colab-crd-${c.matricula || 'nomat'}-${c.id || 'noid'}-${idx}`;
            return (
              <div
                key={uniqueKey}
                onClick={() => onSelectColaborador(c)}
                className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-base shrink-0 group-hover:scale-105 transition-transform">
                    {c.nome ? c.nome.slice(0, 2).toUpperCase() : 'RH'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-blue-950 text-base uppercase truncate group-hover:text-emerald-700 transition-colors">
                      {c.nome}
                    </h3>
                    <p className="text-xs font-bold text-slate-400">Matrícula: {c.matricula || '---'}</p>
                  </div>
                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase shrink-0 ${
                    isAtivo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.status_forca || c.statusForca || 'Ativo'}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100/80 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-semibold text-slate-400">Função:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[180px]">{c.funcao || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-semibold text-slate-400">Equipe:</span>
                    <span className="font-bold text-slate-700">{c.equipe || 'Sobra'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-semibold text-slate-400">Base UT:</span>
                    <span className="font-bold text-slate-700">{c.base_ut || c.regional || 'Norte'}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <span className="text-xs font-black text-emerald-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Ver Detalhes (46 Colunas) <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 📄 DETALHES DO COLABORADOR (360º PERFIL 46 COLUNAS)
// ==========================================

function DetalhesColaboradorView({ colaborador, vehicles, hoje, currentUser, onVoltar, onUpdate, onDelete, colaboradores }) {
  const [formData, setFormData] = useState(normalizeColaborador(colaborador));
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('pessoais'); // 'pessoais' | 'operacional' | 'equipe' | 'gestao' | 'contato' | 'sistemas' | 'historico'

  useEffect(() => {
    if (colaborador) {
      setFormData(normalizeColaborador(colaborador));
    }
  }, [colaborador]);

  const isGerente = ['GERENTE', 'COORDENADOR', 'ADMINISTRADOR'].includes(currentUser?.perfil);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isGerente) return;

    // Structural Impact Warning
    if (formData.funcao !== colaborador.funcao || formData.grupo_folga !== colaborador.grupo_folga || formData.status_forca !== colaborador.status_forca) {
      const inTeam = colaborador.equipe && colaborador.equipe !== 'Sobra' && colaborador.equipe !== '--';
      if (inTeam) {
        const confirm = window.confirm(`⚠️ AVISO DE IMPACTO ESTRUTURAL:\n\nEste colaborador faz parte da equipe '${colaborador.equipe}'. Alterar sua função, grupo de folga ou status pode INVALIDAR a escala existente.\n\nDeseja salvar mesmo assim?`);
        if (!confirm) return;
      }
    }

    const mapeamento = { 
      funcao: 'Função', status_forca: 'Status', cpf: 'CPF', cnh: 'CNH', grupo_folga: 'Grupo de Folga', 
      turno: 'Turno', area_atuacao: 'Área Atuação', matricula: 'Matrícula', nome: 'Nome', base_ut: 'Base UT' 
    };

    const diffStr = gerarLogDePara(colaborador, formData, mapeamento);
    let novosLogs = colaborador.historicoModificacoes || [];
    if (diffStr) {
      novosLogs = [{ id: Date.now(), dataHora: hoje.toISOString(), usuario: currentUser?.nome || 'Usuário', descricao: `Edição: ${diffStr}` }, ...novosLogs];
    }

    onUpdate({ ...formData, historicoModificacoes: novosLogs });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o cadastro de ${colaborador.nome}?`)) {
      onDelete(colaborador.id || colaborador.matricula);
    }
  };

  const renderFieldInput = (key, label, type = 'text', options = []) => {
    const val = formData[key] ?? '';
    return (
      <div key={key}>
        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">{label}</label>
        {isEditing ? (
          type === 'select' ? (
            <select
              value={val}
              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            >
              <option value="">Selecione...</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={type}
              value={val}
              onChange={(e) => setFormData({ ...formData, [key]: type === 'text' ? e.target.value.toUpperCase() : e.target.value })}
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          )
        ) : (
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-slate-700 font-bold text-xs truncate">
            {val || '—'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onVoltar} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xl shrink-0">
            {colaborador.nome ? colaborador.nome.slice(0, 2).toUpperCase() : 'RH'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-blue-950 uppercase">{colaborador.nome}</h2>
              <span className="bg-blue-50 text-blue-700 text-xs font-black px-2.5 py-0.5 rounded-md">
                Mat: {colaborador.matricula}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-1">
              {colaborador.funcao || 'Cargo não definido'} • Equipe: <span className="text-emerald-600 font-black">{colaborador.equipe || 'Sobra'}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isGerente && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Edit2 size={16} /> Editar Perfil (46 Colunas)
            </button>
          )}
          {isGerente && isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
              >
                Salvar Alterações
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 hide-scrollbar">
        {[
          { id: 'pessoais', label: '1. Dados Pessoais & CNH' },
          { id: 'operacional', label: '2. Operacional & RH' },
          { id: 'equipe', label: '3. Equipe & Veículo' },
          { id: 'gestao', label: '4. Gestão & Custo' },
          { id: 'contato', label: '5. Endereço & Contato' },
          { id: 'sistemas', label: '6. Sistemas & Contrato' },
          { id: 'historico', label: '📜 Histórico' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs shrink-0 transition-all ${
              activeTab === tab.id
                ? 'bg-blue-950 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100">
        {activeTab === 'pessoais' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {renderFieldInput('nome', 'Nome Completo')}
            {renderFieldInput('matricula', 'Matrícula')}
            {renderFieldInput('chave_primaria', 'Chave Primária')}
            {renderFieldInput('cpf', 'CPF')}
            {renderFieldInput('cnh', 'Status CNH')}
            {renderFieldInput('nro_cnh', 'Nº CNH')}
            {renderFieldInput('categoria_cnh', 'Categoria CNH')}
            {renderFieldInput('dt_admissao', 'Data Admissão', 'date')}
            {renderFieldInput('dt_demissao', 'Data Demissão', 'date')}
            {renderFieldInput('sit_folha', 'Situação Folha')}
          </div>
        )}

        {activeTab === 'operacional' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {renderFieldInput('base_ut', 'Base UT (Regional)', 'select', ['Norte', 'Leste', 'Sul', 'BASE GERAL'])}
            {renderFieldInput('commessa', 'Commessa')}
            {renderFieldInput('subgrupo', 'Subgrupo', 'select', ['TMA', 'SOT', 'SOC', 'OUTROS'])}
            {renderFieldInput('funcao', 'Função / Cargo')}
            {renderFieldInput('status_forca', 'Status Força (RH)', 'select', ['Ativo', 'Ativo na Força', 'Afastado Confirmado', 'Abandono', 'Férias', 'Desligado'])}
            {renderFieldInput('status_falta', 'Status Falta')}
            {renderFieldInput('qtd_faltas_atual', 'Qtd. Faltas Atual', 'number')}
            {renderFieldInput('acao_a_ser_feita', 'Ação a ser Feita')}
            {renderFieldInput('horario', 'Horário Saída')}
            {renderFieldInput('grupo_folga', 'Grupo de Folga')}
          </div>
        )}

        {activeTab === 'equipe' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {renderFieldInput('equipe', 'Equipe Alocada')}
            {renderFieldInput('veiculo', 'Veículo / Placa')}
            {renderFieldInput('turno', 'Turno')}
            {renderFieldInput('area_atuacao', 'Área de Atuação')}
            {renderFieldInput('possui_periculosidade', 'Possui Periculosidade', 'select', ['SIM', 'NÃO'])}
          </div>
        )}

        {activeTab === 'gestao' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {renderFieldInput('diretoria', 'Diretoria')}
            {renderFieldInput('departamento', 'Departamento')}
            {renderFieldInput('segmento', 'Segmento')}
            {renderFieldInput('gestor', 'Gestor Direto')}
            {renderFieldInput('coordenador', 'Coordenador')}
            {renderFieldInput('supervisor', 'Supervisor')}
            {renderFieldInput('centro_custo', 'Centro de Custo')}
            {renderFieldInput('classe_custo', 'Classe de Custo')}
          </div>
        )}

        {activeTab === 'contato' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {renderFieldInput('filial', 'Filial')}
            {renderFieldInput('logradouro', 'Logradouro')}
            {renderFieldInput('endereco', 'Endereço')}
            {renderFieldInput('nro_endereco', 'Nº Endereço')}
            {renderFieldInput('bairro', 'Bairro')}
            {renderFieldInput('telefone', 'Telefone')}
            {renderFieldInput('celular', 'Celular')}
          </div>
        )}

        {activeTab === 'sistemas' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {renderFieldInput('centro_custo_alpitel', 'Centro Custo Alpitel')}
            {renderFieldInput('comessa_alpitel', 'Commessa Alpitel')}
            {renderFieldInput('dt_retorno_ferias', 'Dt. Retorno Férias', 'date')}
            {renderFieldInput('nro_cracha', 'Nº Crachá')}
            {renderFieldInput('exp_1_periodo', 'Exp. 1º Período')}
            {renderFieldInput('exp_2_periodo', 'Exp. 2º Período')}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-blue-950">Histórico de Modificações</h3>
            {colaborador.historicoModificacoes?.length > 0 ? (
              <div className="space-y-3">
                {colaborador.historicoModificacoes.map((log, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                    <Clock size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{log.descricao}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400 mt-1">
                        {formatarDataBR(log.dataHora)} • por {log.usuario}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 italic">Nenhuma modificação registrada até o momento.</p>
            )}
          </div>
        )}

        {/* Danger Zone */}
        {isGerente && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleDelete}
              className="text-rose-600 font-bold hover:underline flex items-center gap-2 text-xs"
            >
              <Trash2 size={16} /> Excluir Colaborador da Base Unificada
            </button>
          </div>
        )}
      </div>
    </div>
  );
}



function HistoricoView({ chamados, vehicles, hoje, onEditar, onLiberar }) {
  const vehiclesMap = useMemo(() => new Map((vehicles || []).map(v => [v.placa, v])), [vehicles]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const filtered = chamados.filter(c => {

    const matchPlaca = (c.placa || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.numero || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = filterStatus ? c.status === filterStatus : true;

    return matchPlaca && matchStatus;

  });



  const handleExportExcelChamados = () => {

    try {

      const dataToExport = filtered.map(c => {

        const veiculoObj = vehiclesMap.get(c.placa);

        const prejuizoVal = getPrejuizoChamado(c, veiculoObj, hoje);

        const horas = calcularHorasParadas(c.dataAbertura, c.dataHoraFechamento || hoje);

        const getStepTime = (stepId) => {

          let t = c.dadosWorkflow?.timestamps?.[stepId];

          if (!t) {

            if (stepId === 'Análise Frota' || stepId === 'Aguardando Manutenção') t = c.dataAbertura;

            if (stepId === 'RESOLVIDO' && c.status === 'RESOLVIDO') t = c.dataHoraFechamento;

            if (stepId === 'Desequipado - Entrada Oficina') {

              t = c.dadosWorkflow?.timestamps?.['Oficina Externa'];

            }

          }

          return t ? formatarDataBR(t) : '-';

        };



        return {

          'ID': c.id, 'Regional': c.regional || 'Norte',

          'Nº Chamado': c.numero,

          'Placa': c.placa,

          'Motorista': c.motorista || '-',

          'Defeito Principal': c.defeitoPrincipal || '-',

          'Defeito Encontrado': (c.defeitoEncontrado || '').replace(/(\r\n|\n|\r)/gm, " "),

          'Marca': veiculoObj?.marca || '-',

          'Turno': veiculoObj?.turno || '-',

          'Tipo Veículo': veiculoObj?.tipo || '-',

          'Subtipo Veículo': veiculoObj?.subTipo || '-',

          'Tipo OP': veiculoObj?.tipoOp || '-',

          'Implemento': veiculoObj?.implemento || '-',

          'Locadora': veiculoObj?.locadora || '-',

          'Fidelização (Equipes)': veiculoObj?.equipes || '-',

          'Oficina de Destino': c.oficinaDestino || c.dadosWorkflow?.oficinaDestino || '-',

          'Abertura (Análise Frota)': getStepTime('Análise Frota'),

          'Data/Hora Oficina Interna': getStepTime('Oficina Interna'),

          'Fechamento': getStepTime('RESOLVIDO'),

          'Status': c.status,

          'Situação Veículo': c.situacaoVeiculo,

          'Oficina Externa': c.oficinaExterna,

          'Pendência': (c.pendencia || '').replace(/(\r\n|\n|\r)/gm, " "),

          'Horas Paradas': Number(horas.toFixed(2)),

          'Prejuízo Acumulado (R$)': Number(prejuizoVal.toFixed(2)),

          'Etapa Atual': getEtapaWorkflow(c),

          'Data/Hora Desequipar': getStepTime('Aguardando Desequipar'),

          'Data/Hora Desequipado (Entrada Oficina)': getStepTime('Desequipado - Entrada Oficina'),

          'Data/Hora Entrada Oficina': getStepTime('Oficina Externa'),

          'Data/Hora Liberado para Teste': getStepTime('Liberado Operação'),
          'Pedido de Compra': c.dadosWorkflow?.subFluxoOficina?.pedidoCompras || '-',
          'Data/Hora Envio Compras': c.dadosWorkflow?.subFluxoOficina?.dataEnvioCompras ? formatarDataBR(c.dadosWorkflow.subFluxoOficina.dataEnvioCompras) : '-',
          'Data/Hora Envio Financeiro': c.dadosWorkflow?.subFluxoOficina?.dataEnvioFinanceiro ? formatarDataBR(c.dadosWorkflow.subFluxoOficina.dataEnvioFinanceiro) : '-',
          'Data/Hora Pagamento': c.dadosWorkflow?.subFluxoOficina?.dataPagamento ? formatarDataBR(c.dadosWorkflow.subFluxoOficina.dataPagamento) : '-'

        };

      });



      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados");

      

      const maxLens = {};

      dataToExport.forEach(row => {

        Object.keys(row).forEach(key => {

          const valStr = String(row[key] || '');

          maxLens[key] = Math.max(maxLens[key] || 10, valStr.length, key.length);

        });

      });

      worksheet['!cols'] = Object.keys(maxLens).map(key => ({

        wch: maxLens[key] + 3

      }));



      XLSX.writeFile(workbook, `Base_de_Dados_Chamados_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (err) {

      console.error("Erro ao exportar Excel Chamados:", err);

      alert("Erro ao exportar chamados para o Excel.");

    }

  };



    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const renderPaginationBar = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold text-slate-600 gap-3 my-4">
      <span>
        Mostrando {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} chamados
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-black transition-all text-slate-700 active:scale-95 cursor-pointer"
        >
          Anterior
        </button>
        <span className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800">
          Página {currentPage} de {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-black transition-all text-slate-700 active:scale-95 cursor-pointer"
        >
          Próxima
        </button>
      </div>
    </div>
  );

  return (

    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">

      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-emerald-50 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">

        <h2 className="text-xl font-black text-blue-950">Histórico de Chamados ({filtered.length})</h2>

        <div className="flex gap-4 w-full md:w-2/3">

           <button onClick={handleExportExcelChamados} className="whitespace-nowrap px-6 py-3 rounded-xl bg-slate-800 text-white font-black hover:bg-slate-700 shadow-lg shadow-slate-200 transition-all flex items-center gap-2"><Download size={18}/> Exportar Excel</button>

           <input type="text" placeholder="Buscar Placa ou Número (SOL)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500" />

           <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500">

             <option value="">Todos os Status</option>

             <option value="ABERTO">Abertos</option>

             <option value="RESOLVIDO">Fechados</option>

           </select>

        </div>

      </div>



      <div className="space-y-4 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">

        {renderPaginationBar()}

        {paginatedData.map(c => {

          const veiculoObj = vehiclesMap.get(c.placa);

          const equipeCod = veiculoObj?.equipes?.[0]?.codEquipe || 'Sem Equipe';

          const horas = calcularHorasParadas(c.dataAbertura, c.dataHoraFechamento);

          const isAttention = c.naoImpeditivo;



          const isInternal = c.dadosWorkflow?.tipoOficina === 'Interna' || c.etapaWorkflow === 'Oficina Interna';

          const steps = isInternal 

            ? [

                { id: 'Análise Frota', label: 'Análise', icon: Wrench },

                { id: 'Oficina Interna', label: 'Oficina Int', icon: Home },

                { id: 'Liberado Operação', label: 'Liberado', icon: PlayCircle },

                { id: 'RESOLVIDO', label: 'Concluído', icon: CheckCircle2 }

              ]

            : [

                { id: 'Análise Frota', label: 'Análise', icon: Wrench },

                { id: 'Aguardando Desequipar', label: 'Desequipar', icon: Clock },

                { id: 'Desequipado - Entrada Oficina', label: 'Desequipado', icon: ClipboardCheck },

                { id: 'Oficina Externa', label: 'Oficina Ext', icon: Truck },

                { id: 'Liberado Operação', label: 'Liberado', icon: PlayCircle },

                { id: 'RESOLVIDO', label: 'Concluído', icon: CheckCircle2 }

              ];



          const currentIdx = steps.findIndex(s => s.id === getEtapaWorkflow(c));

          const isRejeitado = c.dadosWorkflow?.motivoRecusa && (c.etapaWorkflow === 'Análise Frota' || c.etapaWorkflow === 'Aguardando Manutenção');



          const getStepTimeStr = (stepId) => {

            let t = c.dadosWorkflow?.timestamps?.[stepId];

            if (!t) {

              if (stepId === 'Análise Frota' || stepId === 'Aguardando Manutenção') t = c.dataAbertura;

              if (stepId === 'RESOLVIDO' && c.status === 'RESOLVIDO') t = c.dataHoraFechamento;

              if (stepId === 'Desequipado - Entrada Oficina') {

                t = c.dadosWorkflow?.timestamps?.['Oficina Externa'];

              }

            }

            if (t) {

              const dateObj = new Date(t);

              return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

            }

            return null;

          };



          return (

            <div 

              key={c.id} 

              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col lg:flex-row items-center justify-between gap-6 transition-all duration-300 group hover:shadow-[0_8px_30px_rgba(16,185,129,0.04)] text-left"

            >

              {/* Left Column: Ticket Identification */}

              <div className="flex flex-col gap-2 w-full lg:w-1/4 shrink-0 text-left">

                <div className="flex items-center gap-2 flex-wrap">

                  <span 

                    onClick={() => onEditar && onEditar(c)} 

                    className="font-black text-blue-900 text-lg tracking-tight italic hover:text-emerald-600 transition-colors cursor-pointer select-none"

                  >

                    {c.placa}

                  </span>

                  {c.codigoChamado && <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 mr-1">{c.codigoChamado}</span>}
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isAttention ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>

                    {c.numero}

                  </span>

                  {c.status === 'RESOLVIDO' && (

                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">

                      Concluído

                    </span>

                  )}

                </div>

                

                <div className="flex flex-col gap-1 text-slate-400 font-bold text-xs">

                  <span className="flex items-center gap-1.5" title="Data de Abertura">
                    <CalendarDays size={13} className="text-slate-400" />
                    {formatarDataBR(c.dataAbertura)}
                  </span>
                  {c.dataHoraFechamento && (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold" title="Data de Conclusão">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      {formatarDataBR(c.dataHoraFechamento)}
                    </span>
                  )}

                  <span className="flex items-center gap-1.5">

                    <Users size={13} className="text-slate-400" />

                    {equipeCod} {c.motorista ? `(${c.motorista.split(' ')[0]})` : ''}

                  </span>

                  <span className="text-[10px] text-rose-500 font-black flex items-center gap-1 mt-0.5">

                    <Clock size={11} className="text-rose-500" />

                    Parado: {horas.toFixed(1)}h

                  </span>

                </div>

              </div>



              {/* Center Column: Workflow Stepper Graphic */}

              <div className="flex-1 flex justify-between items-center relative w-full px-4 overflow-x-auto min-w-[320px]">

                {/* Horizontal line segment */}

                <div className="absolute top-[16px] left-[30px] right-[30px] h-[3px] bg-slate-100 z-0 rounded-full"></div>

                {/* Active/Completed segment overlay */}

                <div 

                  className="absolute top-[16px] left-[30px] h-[3px] bg-emerald-500 z-0 transition-all duration-500 rounded-full"

                  style={{

                    width: isRejeitado ? '0%' : `${(Math.max(0, currentIdx)) / (steps.length - 1) * 88}%`

                  }}

                ></div>



                {steps.map((step, idx) => {

                  const stepIdx = steps.findIndex(s => s.id === step.id);

                  const isCompleted = stepIdx < currentIdx || (c.status === 'RESOLVIDO' && stepIdx <= currentIdx);

                  const isActive = step.id === getEtapaWorkflow(c) && c.status !== 'RESOLVIDO';

                  

                  const timeStr = getStepTimeStr(step.id);



                  return (

                    <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">

                      {/* Stepper Dot */}

                      <div 

                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border ${

                          isRejeitado && idx === 0

                            ? 'bg-rose-500 text-white border-rose-500 scale-105'

                            : isCompleted

                              ? 'bg-emerald-500 text-white border-emerald-500'

                              : isActive

                                ? 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-100 animate-pulse'

                                : 'bg-white text-slate-400 border-slate-200'

                        }`}

                        title={step.label}

                      >

                        {isRejeitado && idx === 0 ? (

                          <X size={14} className="font-bold" />

                        ) : isCompleted ? (

                          <Check size={14} />

                        ) : isActive ? (

                          <Clock size={14} />

                        ) : (

                          React.createElement(step.icon, { size: 14 })

                        )}

                      </div>

                      

                      {/* Label Text */}

                      <span className={`text-[8px] font-black uppercase mt-1.5 tracking-wider ${

                        isRejeitado && idx === 0 ? 'text-rose-500' :

                        isCompleted ? 'text-emerald-600' :

                        isActive ? 'text-amber-600' : 'text-slate-400'

                      }`}>

                        {step.label}

                      </span>

                      

                      {/* Transition Time below */}

                      {timeStr && (

                        <span className="text-[8px] text-slate-400 font-bold mt-0.5 whitespace-nowrap font-mono">

                          {timeStr}

                        </span>

                      )}

                      {/* BOLINHAS DO SUB-FLUXO */}
                      {step.id === 'Oficina Interna' && c.dadosWorkflow?.subFluxoOficina && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col items-center z-50">
                          <div className="w-0.5 h-3 bg-slate-200 mb-1"></div>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 shadow-sm border ${c.dadosWorkflow.subFluxoOficina.status === 'COMPRAS' ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-100 animate-pulse' : 'bg-emerald-500 text-white border-emerald-500'}`}>
                            <Briefcase size={8} />
                          </div>
                          <span className={`text-[6px] font-black uppercase mb-1 ${c.dadosWorkflow.subFluxoOficina.status === 'COMPRAS' ? 'text-amber-600' : 'text-emerald-600'}`}>Compras</span>

                          {(c.dadosWorkflow.subFluxoOficina.status === 'FINANCEIRO' || c.dadosWorkflow.subFluxoOficina.status === 'PAGO') && (
                            <>
                              <div className="w-0.5 h-2 bg-slate-200 -mt-1 mb-1"></div>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 shadow-sm border ${c.dadosWorkflow.subFluxoOficina.status === 'FINANCEIRO' ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-100 animate-pulse' : 'bg-emerald-500 text-white border-emerald-500'}`}>
                                <DollarSign size={8} />
                              </div>
                              <span className={`text-[6px] font-black uppercase ${c.dadosWorkflow.subFluxoOficina.status === 'FINANCEIRO' ? 'text-blue-600' : 'text-emerald-600'}`}>Finan</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                  );

                })}

              </div>



              {/* Right Column: Actions */}

              <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">

                <button 

                  onClick={() => onEditar && onEditar(c)}

                  className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-2xl transition-all shadow-sm active:scale-95 border border-slate-100 hover:border-emerald-100"

                  title="Visualizar Detalhes / Ações"

                >

                  <Eye size={18} />

                </button>

              </div>



            </div>

          );

        })}

        {filtered.length === 0 && (

          <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200/80">

            Nenhum chamado listado nesta categoria.

          </div>

        )}

      </div>

    </div>

  );

}



function ModalChamado({ vehicles, colaboradores, chamadoEdicao, currentUser, onWorkflowTransition, onClose, onSubmit, onLiberar, rawChamados, userPermissions, listaOficinas }) {

  const opcoesOficinas = useMemo(() => {
    if (Array.isArray(listaOficinas) && listaOficinas.length > 0) return listaOficinas;
    try {
      const cached = localStorage.getItem('fleet_oficinas_cadastradas_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const activeOrPre = parsed
            .filter(o => {
              const status = (o.status || '').trim().toUpperCase();
              return status === 'ATIVO' || status === 'ATIVA' || status === 'PRÉ-CADASTRO' || status === 'PRE-CADASTRO' || o.is_pre_cadastro || !status;
            })
            .map(o => String(o.nome_fantasia || o.razao_social || '').trim().toUpperCase())
            .filter(Boolean);
          if (activeOrPre.length > 0) {
            return Array.from(new Set(activeOrPre)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
          }
        }
      }
    } catch (e) {}
    return LISTA_OFICINAS_PADRAO;
  }, [listaOficinas]);

  const podeAlterarEtapaManual = userPermissions?.permissoes_edicao?.pode_alterar_etapa_manual === true || (currentUser?.perfil || '').toUpperCase() === 'ADMINISTRADOR' || currentUser?.isAdmin === true;

  // Buscador de 100% dos detalhes sob demanda (fotos, historico, comentarios, workflows) ao abrir o chamado
  useEffect(() => {
    if (chamadoEdicao && chamadoEdicao.id) {
      supabase
        .from('chamados')
        .select('*')
        .eq('id', chamadoEdicao.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (data && !error) {
            setFormData(prev => ({
              ...prev,
              ...data,
              hodometro: data.dadosWorkflow?.hodometro || data.hodometro || prev.hodometro || '',
              fotosChamado: data.dadosWorkflow?.fotosChamado || data.fotosChamado || prev.fotosChamado || {},
              dataAbertura: formatToDatetimeLocal(data.dataAbertura || prev.dataAbertura),
              dadosWorkflow: data.dadosWorkflow || prev.dadosWorkflow || {},
              historicoModificacoes: data.historicoModificacoes || prev.historicoModificacoes || []
            }));
          }
        });
    }
  }, [chamadoEdicao]);

  const [formData, setFormData] = useState(() => {

    if (chamadoEdicao) {
      let legacyDefeitos = chamadoEdicao.defeitos;
      if (!legacyDefeitos || legacyDefeitos.length === 0) {
        if (chamadoEdicao.defeitoPrincipal || chamadoEdicao.defeitoEncontrado) {
          legacyDefeitos = [{
            id: Date.now(),
            descricao: chamadoEdicao.defeitoEncontrado || 'Sem descrição',
            categoria: chamadoEdicao.defeitoPrincipal || 'Outros',
            isImpeditivo: true,
            status: 'PENDENTE',
            numeroSolicitacao: chamadoEdicao.numero || ''
          }];
        }
      }
      return {
        ...chamadoEdicao,
        hodometro: chamadoEdicao.dadosWorkflow?.hodometro || chamadoEdicao.hodometro || '',
        fotosChamado: chamadoEdicao.dadosWorkflow?.fotosChamado || chamadoEdicao.fotosChamado || {},
        defeitos: legacyDefeitos || [],
        dataAbertura: formatToDatetimeLocal(chamadoEdicao.dataAbertura)
      };
    }

    return { 
      placa: '', dataAbertura: formatToDatetimeLocal(new Date()), 
      situacaoVeiculo: 'RODANDO', oficinaExterna: 'NÃO', pendencia: '', motorista: '', 
      etapaWorkflow: 'Aguardando Manutenção', dadosWorkflow: {},
      defeitos: [{ id: Date.now(), descricao: '', categoria: '', isImpeditivo: true, status: 'PENDENTE', numeroSolicitacao: '' }]
    };

  });

  

  const [recusaMotivo, setRecusaMotivo] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [subModalResolveDefeitos, setSubModalResolveDefeitos] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);

  const [duplicidadeChamado, setDuplicidadeChamado] = useState(null);
  const [modalDuplicidadeStep, setModalDuplicidadeStep] = useState(1);
  const [escalonamentoMotivo, setEscalonamentoMotivo] = useState('');
  const [novoDefeitoDescricao, setNovoDefeitoDescricao] = useState('');
  const [novoDefeitoCategoria, setNovoDefeitoCategoria] = useState('');
  const [novoDefeitoECar, setNovoDefeitoECar] = useState('');
  const [novoDefeitoFoto, setNovoDefeitoFoto] = useState(null);

  const [comprasPedido, setComprasPedido] = useState('');
  const [financeiroPrevisao, setFinanceiroPrevisao] = useState('');
  const [comprasObservacao, setComprasObservacao] = useState('');
  const [financeiroObservacao, setFinanceiroObservacao] = useState('');

  const [modalRetornoInternaOpen, setModalRetornoInternaOpen] = useState(false);
  const [motivoRetornoInterna, setMotivoRetornoInterna] = useState('');

  const [modalTransferenciaExternaOpen, setModalTransferenciaExternaOpen] = useState(false);
  const [oficinaDestinoExterna, setOficinaDestinoExterna] = useState('');
  const [motivoTransferenciaExterna, setMotivoTransferenciaExterna] = useState('');
  const setorKey = normalizeKey(currentUser?.setor || '');
  const perfilKey = normalizeKey(currentUser?.perfil || '');
  const setorNorm = (currentUser?.setor || '').trim().toUpperCase();
  const perfilNorm = (currentUser?.perfil || '').trim().toUpperCase();
  const isCompras = setorKey === 'COMPRAS' || setorNorm === 'COMPRAS';
  const isFinanceiro = setorKey === 'FINANCEIRO' || setorNorm === 'FINANCEIRO';
  const isAdminOrGerente = ['ADMINISTRADOR', 'ADMIN', 'GERENTE', 'GERENCIA', 'DIRETOR', 'DIRETORIA'].some(p => perfilKey.includes(p)) || currentUser?.isAdmin === true;
  const isCoord = perfilKey.includes('COORDENAD') || perfilNorm === 'COORDENADOR';
  const subFluxo = formData.dadosWorkflow?.subFluxoOficina;

  const [transitionComment, setTransitionComment] = useState('');
  const [selectedOficina, setSelectedOficina] = useState(formData.oficinaDestino || formData.dadosWorkflow?.oficinaDestino || '');
  const [etapaManualTarget, setEtapaManualTarget] = useState(formData.etapaWorkflow || 'Análise Frota');
  const [oficinaManualTarget, setOficinaManualTarget] = useState(formData.oficinaDestino || formData.dadosWorkflow?.oficinaDestino || '');

  // Modal Ultra Premium de Confirmação e Feedback para ModalChamado
  const [feedbackModalLocal, setFeedbackModalLocal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Entendido',
    cancelText: null,
    onConfirm: null,
    onCancel: null
  });

  const showFeedbackLocal = (type, title, message, onConfirm = null, options = {}) => {
    setFeedbackModalLocal({
      isOpen: true,
      type,
      title,
      message,
      confirmText: options.confirmText || 'Entendido',
      cancelText: options.cancelText || null,
      onConfirm: () => {
        setFeedbackModalLocal(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setFeedbackModalLocal(prev => ({ ...prev, isOpen: false }));
        if (options.onCancel) options.onCancel();
      }
    });
  };

  const handleExecutarMudancaManual = () => {
    const newStage = etapaManualTarget;
    const currentStage = formData.etapaWorkflow || 'Análise Frota';

    if (newStage === currentStage && (newStage !== 'Oficina Externa' || (oficinaManualTarget && oficinaManualTarget === formData.oficinaDestino))) {
      showFeedbackLocal('info', 'Mesma Etapa', `O chamado já se encontra na etapa "${newStage}". Selecione uma etapa diferente para atualizar.`);
      return;
    }

    const isStageExterna = newStage === 'Oficina Externa';
    const oficinaAlvo = (oficinaManualTarget || selectedOficina || formData.oficinaDestino || formData.dadosWorkflow?.oficinaDestino || '').trim();

    if (isStageExterna && !oficinaAlvo) {
      showFeedbackLocal(
        'warning',
        'Oficina de Destino Obrigatória',
        'Para alterar manualmente a etapa do chamado para "Oficina Externa", é obrigatório selecionar uma oficina credenciada de destino.',
        null,
        { confirmText: 'Compreendi' }
      );
      return;
    }

    const placaText = formData.placa ? ` do veículo [${formData.placa}]` : '';
    const oficinaText = isStageExterna ? `\n\n🏢 Oficina de Destino: ${oficinaAlvo}` : '';
    const messageConfirm = `Deseja realmente alterar a etapa do chamado${placaText} de "${currentStage}" para "${newStage}"?${oficinaText}`;

    showFeedbackLocal(
      'warning',
      'Confirmar Alteração Manual de Etapa',
      messageConfirm,
      () => {
        const extraData = {};
        if (isStageExterna) {
          extraData.oficinaDestino = oficinaAlvo;
          extraData.oficinaExterna = 'SIM';
          extraData.dadosWorkflow = {
            ...formData.dadosWorkflow,
            tipoOficina: 'Externa',
            oficinaDestino: oficinaAlvo,
            aceitoOficina: true
          };
        } else if (newStage === 'Oficina Interna') {
          extraData.oficinaExterna = 'NÃO';
          extraData.dadosWorkflow = {
            ...formData.dadosWorkflow,
            tipoOficina: 'Interna'
          };
        }

        handleWorkflowAction(
          newStage,
          `Alteração manual de etapa pelo Gestor (${currentUser?.nome || 'Sistema'}) para: ${newStage}${isStageExterna ? ' (Destino: ' + oficinaAlvo + ')' : ''}`,
          extraData
        );
      },
      {
        confirmText: 'Confirmar Alteração',
        cancelText: 'Cancelar'
      }
    );
  };


  
  const handleStandaloneComment = () => {
    if (!transitionComment.trim()) return;
    handleWorkflowAction(formData.etapaWorkflow, 'Adicionou um comentrio ao chamado');
    setTransitionComment('');
  };

  const handleSubFluxoAction = (newStatus, extrasDesc = '', additionalData = {}) => {
    const atual = formData.dadosWorkflow?.subFluxoOficina || {};
    const novoSubFluxo = { ...atual, status: newStatus, ...additionalData };
    
    if (onWorkflowTransition && isEditing) {
      let finalDesc = `Sub-fluxo Oficina atualizado para: ${newStatus}. ${extrasDesc}`;
      if (transitionComment.trim()) {
        finalDesc += ` (Obs: ${transitionComment.trim()})`;
      }
      onWorkflowTransition(formData.id, formData.etapaWorkflow, finalDesc, { dadosWorkflow: { subFluxoOficina: novoSubFluxo } });
      setTransitionComment('');
    }
  };

  const handlePlacaChange = (val) => {
    if (!val) {
      setFormData({...formData, placa: val});
      return;
    }
    const openTicket = rawChamados?.find(c => c.placa === val && c.status !== 'RESOLVIDO' && c.status !== 'LIBERADO OPERAÇÃO');
    if (openTicket && !chamadoEdicao) {
      let legacyDefeitos = openTicket.defeitos;
      if (!legacyDefeitos || legacyDefeitos.length === 0) {
        if (openTicket.defeitoPrincipal || openTicket.defeitoEncontrado) {
          legacyDefeitos = [{
            id: Date.now(),
            descricao: openTicket.defeitoEncontrado || 'Sem descrição',
            categoria: openTicket.defeitoPrincipal || 'Outros',
            isImpeditivo: true,
            status: 'PENDENTE',
            numeroSolicitacao: openTicket.numero || ''
          }];
        }
      }
      
      setDuplicidadeChamado({ ...openTicket, defeitos: legacyDefeitos || [] });
      setModalDuplicidadeStep(1);
      setEscalonamentoMotivo('');
      setNovoDefeitoDescricao('');
      setNovoDefeitoCategoria('');
    } else {
      setFormData({...formData, placa: val});
    }
  };

  const addDefeito = () => {
    setFormData(prev => ({
      ...prev,
      defeitos: [...(prev.defeitos || []), { id: Date.now() + Math.random(), descricao: '', categoria: '', isImpeditivo: true, status: 'PENDENTE', numeroSolicitacao: '' }]
    }));
  };

  const removeDefeito = (defId) => {
    if ((formData.defeitos || []).length <= 1) return;
    setFormData(prev => ({
      ...prev,
      defeitos: (prev.defeitos || []).filter(d => d.id !== defId)
    }));
  };

  const updateDefeito = (defId, field, value) => {
    setFormData(prev => ({
      ...prev,
      defeitos: (prev.defeitos || []).map(d => d.id === defId ? { ...d, [field]: value } : d)
    }));
  };

  const toggleDefeitoStatus = (defId) => {
    const updated = (formData.defeitos || []).map(d => 
      d.id === defId ? { ...d, status: d.status === 'RESOLVIDO' ? 'PENDENTE' : 'RESOLVIDO', dataResolucao: d.status === 'RESOLVIDO' ? null : new Date().toISOString() } : d
    );
    setFormData(prev => ({ ...prev, defeitos: updated }));
    // Salva silenciosamente sem fechar o modal
    if (onSubmit && isEditing) {
      const saveData = {
        ...formData, 
        defeitos: updated,
        numero: (updated[0]?.numeroSolicitacao) || formData.numero || '',
        defeitoPrincipal: (updated[0]?.categoria) || formData.defeitoPrincipal || '',
        defeitoEncontrado: (updated[0]?.descricao) || formData.defeitoEncontrado || '',
        silentSave: true
      };
      onSubmit(saveData);
    }
  };

  const [isRecusando, setIsRecusando] = useState(false);



  const activeVehicles = vehicles.map(v => ({ value: v.placa, label: v.placa }));

  const activeColabs = colaboradores.filter(c => c.statusForca?.toUpperCase().includes('ATIVO')).map(c => ({ value: c.nome, label: `${c.nome} - ${c.matricula}` }));

  if (formData?.motorista && formData.motorista !== 'OUTRO' && !activeColabs.some(c => c.value === formData.motorista)) {
    activeColabs.push({ value: formData.motorista, label: `${formData.motorista} (Digitado)` });
  }

  activeColabs.push({ value: 'OUTRO', label: 'Outro (Digitar nome...)' });




  // Membro da Frota (Setor Frota, Perfil Frota/Mecânico, ou Administrador)
  const isFrota = setorKey === 'FROTA' || perfilKey === 'FROTA' || perfilKey === 'MECANICO' || isAdminOrGerente;

  // Permissões granulares de manutenção e movimentação
  const podeConcluirOficina = userPermissions?.permissoes_edicao?.pode_concluir_chamado_oficina === true || isFrota || isCoord;
  const podeMovimentarOficinas = userPermissions?.permissoes_edicao?.pode_movimentar_oficinas === true || isFrota || isCoord;

  // Compliance estrito: Apenas a OPERAÇÃO (Supervisor, Coordenador, Analista de Operação, Gerente, Administrador), Gerente ou Administrador pode desequipar e aceitar o veículo
  // Usuários do setor FROTA NÃO podem confirmar desequipagem nem aprovar/aceitar o veículo final
  const isSetorOperacao = setorKey.includes('OPERAC') || !currentUser?.setor;
  const isPerfilOperacao = ['SUPERVISOR', 'SUPERVISAO', 'COORDENADOR', 'COORDENACAO', 'GERENTE', 'GERENCIA', 'ADMINISTRADOR', 'ADMIN', 'ANALISTA', 'LIDER', 'ENCARREGADO', 'DIRETOR', 'DIRETORIA'].some(p => perfilKey.includes(p)) || currentUser?.isAdmin === true;
  const isOperacaoParaDesequipar = (isSetorOperacao && isPerfilOperacao && perfilKey !== 'FROTA' && perfilKey !== 'MECANICO')
    || (isAdminOrGerente || (isCoord && setorKey !== 'FROTA'));

  const isOperacaoParaAceite = isOperacaoParaDesequipar;

  const isFrotaParaEntradaOficina = isFrota || podeConcluirOficina || podeMovimentarOficinas;

  // Operação geral
  const isOperacao = isOperacaoParaDesequipar;

  const isEditing = !!chamadoEdicao?.id;

  const isAdminOrCoord = ['GERENTE', 'COORDENADOR', 'ADMINISTRADOR'].includes(currentUser?.perfil);



  const isInternal = formData.dadosWorkflow?.tipoOficina === 'Interna' || formData.etapaWorkflow === 'Oficina Interna';

  const steps = isInternal 

    ? [

        { id: 'Análise Frota', label: 'Análise', icon: Wrench },

        { id: 'Oficina Interna', label: 'Oficina Int', icon: Home },

        { id: 'Liberado Operação', label: 'Liberado', icon: PlayCircle },

        { id: 'RESOLVIDO', label: 'Concluído', icon: CheckCircle2 }

      ]

    : [

        { id: 'Análise Frota', label: 'Análise', icon: Wrench },

        { id: 'Aguardando Desequipar', label: 'Desequipar', icon: Clock },

        { id: 'Desequipado - Entrada Oficina', label: 'Desequipado', icon: ClipboardCheck },

        { id: 'Oficina Externa', label: 'Oficina Ext', icon: Truck },

        { id: 'Liberado Operação', label: 'Liberado', icon: PlayCircle },

        { id: 'RESOLVIDO', label: 'Concluído', icon: CheckCircle2 }

      ];



  const getStepTimestamp = (stepId) => {

    if (formData.dadosWorkflow?.timestamps?.[stepId]) {

      return formData.dadosWorkflow.timestamps[stepId];

    }

    if (formData.status === 'RESOLVIDO' || formData.etapaWorkflow === 'RESOLVIDO') {

      if (stepId === 'Análise Frota' || stepId === 'Aguardando Manutenção') return formData.dataAbertura;

      if (stepId === 'RESOLVIDO') return formData.dataHoraFechamento || new Date().toISOString();

    } else {

      if (stepId === 'Análise Frota' || stepId === 'Aguardando Manutenção') return formData.dataAbertura;

    }

    if (stepId === 'Desequipado - Entrada Oficina') {

      return formData.dadosWorkflow?.timestamps?.['Oficina Externa'];

    }

    return null;

  };



  const handleWorkflowAction = (novaEtapa, logDesc, extras = {}) => {
    if (novaEtapa === 'Liberado Operação') {
      const defeitosPendentes = (formData.defeitos || []).filter(d => d.status !== 'RESOLVIDO');
      if (defeitosPendentes.length > 0) {
        setSubModalResolveDefeitos({ novaEtapa, logDesc, extras });
        return;
      }
    }

    let finalDesc = logDesc;

    if (transitionComment.trim()) {

      finalDesc += ` (Obs: ${transitionComment.trim()})`;

    }

    if (onWorkflowTransition && isEditing) {

      onWorkflowTransition(formData.id, novaEtapa, finalDesc, extras);

    }

    setTransitionComment('');

  };



  const handleDuplicidadeAction = async (actionType) => {
    if (!duplicidadeChamado) return;
    
    let updatedChamado = { ...duplicidadeChamado };
    let newAlerta = null;
    let newLog = null;

    if (actionType === 'ADICIONAR') {
      const novoDef = {
        id: Date.now() + Math.random(),
        categoria: novoDefeitoCategoria,
        descricao: novoDefeitoDescricao,
        isImpeditivo: true,
        status: 'PENDENTE',
        numeroSolicitacao: novoDefeitoECar,
        fotoDefeito: novoDefeitoFoto
      };
      updatedChamado.defeitos = [...(updatedChamado.defeitos || []), novoDef];
      newLog = {
        acao: 'NOVO_DEFEITO_DUPLICIDADE',
        data: new Date().toISOString(),
        usuario: currentUser.login,
        detalhes: `Novo defeito adicionado (${novoDefeitoCategoria}): ${novoDefeitoDescricao}`
      };
      newAlerta = {
        id: Date.now().toString(),
        tipo: 'NOVO_DEFEITO',
        mensagem: `Novo defeito adicionado na placa ${updatedChamado.placa}: ${novoDefeitoDescricao}`,
        timestamp: new Date().toISOString(),
        acknowledgedBy: []
      };
    } else if (actionType === 'ESCALONAR') {
      newLog = {
        acao: 'ESCALONAMENTO',
        data: new Date().toISOString(),
        usuario: currentUser.login,
        detalhes: `Chamado escalonado. Motivo: ${escalonamentoMotivo}`
      };
      newAlerta = {
        id: Date.now().toString(),
        tipo: 'ESCALONAMENTO',
        mensagem: `Atenção: Chamado da placa ${updatedChamado.placa} foi escalonado! Motivo: ${escalonamentoMotivo}`,
        timestamp: new Date().toISOString(),
        acknowledgedBy: []
      };
    }

    if (newLog) {
      updatedChamado.historicoModificacoes = [...(updatedChamado.historicoModificacoes || []), newLog];
    }
    if (newAlerta) {
      updatedChamado.alertas = [...(updatedChamado.alertas || []), newAlerta];
    }

    if (formData.fotosChamado || formData.dadosWorkflow?.fotosChamado) {
      const fotosParaGravar = formData.fotosChamado || formData.dadosWorkflow?.fotosChamado || {};
      updatedChamado.dadosWorkflow = {
        ...(updatedChamado.dadosWorkflow || {}),
        fotosChamado: {
          ...(updatedChamado.dadosWorkflow?.fotosChamado || {}),
          ...fotosParaGravar
        }
      };
    }

    updatedChamado.silentSave = true; 
    if (onSubmit) {
      await onSubmit(updatedChamado);
    }
    
    setDuplicidadeChamado(null);
    onClose();
  };

  return (
    <>
    {duplicidadeChamado && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
           <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                 <AlertOctagon className="text-rose-600" size={24}/>
              </div>
              <div>
                 <h2 className="text-xl font-black text-rose-950">Chamado Aberto Detectado</h2>
                 <p className="text-sm font-bold text-rose-700/80 mt-1">A placa {duplicidadeChamado.placa} já possui um chamado ativo.</p>
                 <div className="inline-block bg-white px-3 py-1 rounded-full text-xs font-black text-rose-600 border border-rose-200 mt-2">
                    {duplicidadeChamado.codigoChamado || `ALP.M-${String(duplicidadeChamado.id).slice(-6)}`}
                 </div>
              </div>
           </div>
           
           <div className="p-6 flex-1 overflow-y-auto bg-slate-50">
              {modalDuplicidadeStep === 1 && (
                 <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-500">Defeitos já registrados neste chamado:</p>
                    <div className="space-y-2">
                      {(duplicidadeChamado.defeitos || []).map((def, idx) => (
                         <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                               <span className="text-xs font-black text-slate-400">DEFEITO #{idx+1}</span>
                               <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${def.status === 'RESOLVIDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{def.status}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-700">{def.descricao}</p>
                         </div>
                      ))}
                    </div>
                 </div>
              )}
              {modalDuplicidadeStep === 2 && (
                 <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <p className="text-sm font-bold text-slate-700">Descreva o novo defeito a ser adicionado neste chamado:</p>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Categoria</label>
                      <select className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 mt-1" value={novoDefeitoCategoria} onChange={e => setNovoDefeitoCategoria(e.target.value)}>
                        <option value="">Selecione...</option>
                        <option value="Mecânico">Mecânico</option>
                        <option value="Hidráulico">Hidráulico</option>
                        <option value="Elétrico">Elétrico</option>
                        <option value="Sinalização">Sinalização</option>
                        <option value="Lataria/carroceria">Lataria/carroceria</option>
                        <option value="Cabine">Cabine</option>
                        <option value="Pneus">Pneus</option>
                        <option value="Implemento">Implemento</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Nº SOL (E-CAR)</label>
                      <input className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 mt-1" placeholder="Número da solicitação E-CAR..." value={novoDefeitoECar} onChange={e => setNovoDefeitoECar(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Descrição do Defeito</label>
                      <textarea className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 mt-1 h-24 resize-none" placeholder="Detalhes do problema..." value={novoDefeitoDescricao} onChange={e => setNovoDefeitoDescricao(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Foto do Defeito (Inicialmente Opcional)</label>
                      {novoDefeitoFoto ? (
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <img src={novoDefeitoFoto} alt="Foto do Defeito" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                            <span className="text-xs font-bold text-emerald-700">Foto Anexada com Sucesso</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNovoDefeitoFoto(null)}
                            className="p-2 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="w-full p-3.5 bg-slate-50 hover:bg-blue-50/50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors text-slate-600 font-bold text-xs">
                          <Camera size={18} className="text-blue-500" /> Anexar Foto do Defeito
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setNovoDefeitoFoto(reader.result);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                 </div>
              )}
              {modalDuplicidadeStep === 3 && (
                 <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <p className="text-sm font-bold text-slate-700">Informe o motivo para escalonar este chamado:</p>
                    <textarea className="w-full p-4 bg-white rounded-xl border border-rose-200 font-bold text-rose-950 outline-none focus:ring-2 focus:ring-rose-500 h-32 resize-none" placeholder="Motivo do escalonamento (urgência, atraso, etc)..." value={escalonamentoMotivo} onChange={e => setEscalonamentoMotivo(e.target.value)} />
                 </div>
              )}
           </div>

           <div className="p-4 bg-white border-t border-slate-100">
              {modalDuplicidadeStep === 1 ? (
                 <div className="flex flex-col gap-2">
                    <button onClick={() => setModalDuplicidadeStep(2)} className="w-full py-3.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-black text-sm transition-colors">
                       Adicionar Novo Defeito
                    </button>
                    <button onClick={() => setModalDuplicidadeStep(3)} className="w-full py-3.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-black text-sm transition-colors shadow-md shadow-rose-600/20">
                       Escalonar Chamado
                    </button>
                    <button onClick={() => { setDuplicidadeChamado(null); setFormData({...formData, placa: ''}); }} className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors">
                       Escolher outra Placa
                    </button>
                 </div>
              ) : (
                 <div className="flex gap-2">
                    <button onClick={() => setModalDuplicidadeStep(1)} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors">
                       Voltar
                    </button>
                    {modalDuplicidadeStep === 2 ? (
                       <button onClick={() => handleDuplicidadeAction('ADICIONAR')} disabled={!novoDefeitoCategoria || !novoDefeitoDescricao || !novoDefeitoECar} className="flex-1 py-3 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black text-sm transition-colors shadow-md shadow-emerald-600/20">
                          Confirmar Defeito
                       </button>
                    ) : (
                       <button onClick={() => handleDuplicidadeAction('ESCALONAR')} disabled={!escalonamentoMotivo} className="flex-1 py-3 bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black text-sm transition-colors shadow-md shadow-rose-600/20">
                          Confirmar Escalonamento
                       </button>
                    )}
                 </div>
              )}
           </div>
        </div>
      </div>
    )}
    {showSuccess && successData ? (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Apple-style background blur */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl backdrop-saturate-150 animate-in fade-in duration-500"></div>
        
        <div className="relative bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20 dark:border-slate-800">
          
          {/* Confetti CSS Animation */}
          <style>{`
            @keyframes confettiDrop { 0% { transform: translateY(-100%) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
            @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
            @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
            .confetti-piece { position: absolute; width: 8px; height: 8px; border-radius: 2px; animation: confettiDrop 3s ease-in forwards; }
            .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.5); }
            .dark .glass-panel { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.05); }
          `}</style>

          {/* Header Section - Material 3 Expressive + Apple Glow */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 p-10 text-center">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" style={{ animation: 'shimmer 3s infinite' }}></div>
            
            {/* Confetti */}
            {[...Array(15)].map((_, i) => (
              <div key={i} className="confetti-piece z-10" style={{ left: `${5 + i * 6}%`, top: '-10px', backgroundColor: ['#ffffff','#a7f3d0','#fde68a','#fbcfe8'][i % 4], animationDelay: `${i * 0.1}s`, animationDuration: `${2 + Math.random() * 1.5}s` }}/>
            ))}
            
            <div className="relative z-20" style={{ animation: 'float 6s ease-in-out infinite' }}>
              <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-5 border border-white/40 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="text-emerald-500" size={36} strokeWidth={2.5}/>
                </div>
              </div>
            </div>
            
            <h2 className="relative z-20 text-3xl font-black text-white tracking-tight drop-shadow-md">Chamado Registrado!</h2>
            <p className="relative z-20 text-emerald-50 font-semibold text-sm mt-2 opacity-90">Veículo encaminhado para análise da Frota com sucesso.</p>
          </div>

          <div className="p-8 space-y-8 bg-slate-50 dark:bg-slate-900/50">
            
            {/* Ticket Card - Apple Wallet Style */}
            <div className="glass-panel rounded-[2rem] p-8 text-center shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400 opacity-50"></div>
              <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.25em] mb-3">Protocolo Oficial</p>
              <p className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-white font-mono tracking-tighter drop-shadow-sm group-hover:scale-105 transition-transform duration-300">{successData.codigoChamado}</p>
              
              <div className="flex items-center justify-center gap-3 mt-5">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-black text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">{successData.placa}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span className="text-xs font-bold text-slate-500">{formatarDataBR(successData.dataAbertura)}</span>
              </div>
            </div>

            {/* Sub-defects Section */}
            <div>
              <h4 className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-4 flex items-center gap-2">
                <Wrench size={14} className="text-slate-400" />
                Defeitos Relatados <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{successData.defeitos.length}</span>
              </h4>
              
              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                {successData.defeitos.map((def, idx) => (
                  <div key={def.id || idx} className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in slide-in-from-bottom-4 duration-500 hover:shadow-md transition-shadow" style={{animationDelay: `${0.2 + idx * 0.1}s`, animationFillMode: 'both'}}>
                    <div className={`mt-0.5 w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-inner ${def.isImpeditivo ? 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30' : 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">{def.descricao || 'Sem descrição'}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">{def.categoria || 'OUTROS'}</span>
                        {def.numeroSolicitacao && <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">SOL: {def.numeroSolicitacao}</span>}
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${def.isImpeditivo ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          {def.isImpeditivo ? 'IMPEDITIVO' : 'NÃO IMPEDITIVO'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Banner de Aviso Amigável sobre Fotos Futuras */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 shadow-md">
                <AlertTriangle size={20} />
              </div>
              <div className="text-left">
                <h5 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">Aviso Importante sobre Anexo de Fotos</h5>
                <p className="text-xs text-amber-800 dark:text-amber-400 font-bold mt-0.5 leading-relaxed">
                  Atenção: As fotos inicialmente não são obrigatórias, mas futuramente sim, então se prepare!
                </p>
              </div>
            </div>

            <button onClick={onClose} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] text-sm">
              Voltar para a Operação
            </button>
          </div>
        </div>
      </div>
    ) : (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">

      <div className="bg-white rounded-none sm:rounded-[2rem] shadow-2xl w-full sm:max-w-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh]">

        

        <div className="px-4 sm:px-8 py-4 sm:py-6 bg-blue-950 flex justify-between items-center text-white shrink-0">

          <div>

            <h2 className="text-xl font-black">{isEditing ? 'Detalhes do Chamado E-CAR' : 'Novo Chamado E-CAR'}</h2>

            {isEditing && (

              <p className="text-xs text-slate-300 font-bold mt-1">SOL: {formData.numero} | Placa: {formData.placa}</p>

            )}

          </div>

          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>

        </div>



        {isEditing && (

          <div className="bg-slate-50 border-b border-slate-100 p-6 pb-28 shrink-0 overflow-visible">

            <div className="flex justify-between items-center relative">

              <div className="absolute top-[20px] left-0 right-0 h-1 bg-slate-200 z-0 rounded-full"></div>

              <div 

                className="absolute top-[20px] left-0 h-1 bg-emerald-500 z-0 transition-all duration-500 rounded-full"

                style={{

                  width: `${(Math.max(0, steps.findIndex(s => s.id === getEtapaWorkflow(formData)))) / (steps.length - 1) * 100}%`

                }}

              ></div>



              {steps.map((step, idx) => {

                const stepIdx = steps.findIndex(s => s.id === step.id);

                const currentIdx = steps.findIndex(s => s.id === getEtapaWorkflow(formData));

                

                const isCompleted = stepIdx < currentIdx || formData.status === 'RESOLVIDO' || formData.etapaWorkflow === 'RESOLVIDO';

                const isActive = step.id === getEtapaWorkflow(formData) && formData.status !== 'RESOLVIDO' && formData.etapaWorkflow !== 'RESOLVIDO';



                const IconComponent = step.icon;

                const timestamp = getStepTimestamp(step.id);



                return (

                  <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">

                    <div 

                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${

                        isCompleted 

                          ? 'bg-emerald-500 text-white scale-105' 

                          : isActive 

                            ? 'bg-amber-500 text-white scale-105 ring-4 ring-amber-100 animate-pulse' 

                            : 'bg-white text-slate-400 border-2 border-slate-200'

                      }`}

                    >

                      {isCompleted ? <Check size={16} /> : <IconComponent size={16} />}

                    </div>

                    <span className={`text-[9px] font-black uppercase mt-2 tracking-wider ${isActive ? 'text-amber-600 font-black' : isCompleted ? 'text-emerald-600 font-bold' : 'text-slate-400 font-bold'}`}>

                      {step.label}

                    </span>

                    {timestamp && (

                      <span className="text-[8px] text-slate-400 font-bold mt-0.5 whitespace-nowrap">

                        {formatarDataBR(timestamp).split(' ')[0]}

                      </span>

                    )}

                    {/* BOLINHAS DO SUB-FLUXO */}
                    {step.id === 'Oficina Interna' && subFluxo && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 flex flex-col items-center">
                        <div className="w-0.5 h-4 bg-slate-200 -mt-3 mb-1"></div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center mb-1 shadow-sm ${subFluxo.status === 'COMPRAS' ? 'bg-amber-500 text-white animate-pulse ring-2 ring-amber-200' : 'bg-emerald-500 text-white'}`}>
                          <Briefcase size={10} />
                        </div>
                        <span className={`text-[7px] font-black uppercase mb-1 ${subFluxo.status === 'COMPRAS' ? 'text-amber-600' : 'text-emerald-600'}`}>Compras</span>

                        {(subFluxo.status === 'FINANCEIRO' || subFluxo.status === 'PAGO') && (
                          <>
                            <div className="w-0.5 h-3 bg-slate-200 -mt-1 mb-1"></div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center mb-1 shadow-sm ${subFluxo.status === 'FINANCEIRO' ? 'bg-blue-500 text-white animate-pulse ring-2 ring-blue-200' : 'bg-emerald-500 text-white'}`}>
                              <DollarSign size={10} />
                            </div>
                            <span className={`text-[7px] font-black uppercase ${subFluxo.status === 'FINANCEIRO' ? 'text-blue-600' : 'text-emerald-600'}`}>Financeiro</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                );

              })}

            </div>

          </div>

        )}



        <div className="p-8 space-y-6 overflow-y-auto flex-1">

          

          {isEditing && formData.dadosWorkflow?.motivoRecusa && (formData.etapaWorkflow === 'Análise Frota' || formData.etapaWorkflow === 'Aguardando Manutenção') && (

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 items-start animate-in fade-in duration-300">

              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />

              <div>

                <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider">Veículo Recusado pela Operação</h4>

                <p className="text-xs font-bold text-rose-700 mt-1">Motivo: {formData.dadosWorkflow.motivoRecusa}</p>

              </div>

            </div>

          )}



          <form id="chamadoForm" onSubmit={e => { e.preventDefault(); (() => {
                if (!formData.placa) return alert('A Placa do Veículo é obrigatória.');
                if (!formData.hodometro || !String(formData.hodometro).trim()) return alert('O Hodômetro (KM) é obrigatório para abertura ou edição do chamado.');
                if (!formData.motorista) return alert('O Motorista / Colaborador é obrigatório.');
                if (formData.motorista === 'OUTRO' && !formData.motoristaOutro?.trim()) return alert('Informe o nome do motorista.');
                
                const temDefeitoInvalido = formData.defeitos?.some(d => !d.categoria || !d.numeroSolicitacao);
                if (temDefeitoInvalido) return alert('A Categoria e o Nº SOL (E-CAR) são obrigatórios para todos os defeitos.');

                const finalMotorista = formData.motorista === 'OUTRO' ? formData.motoristaOutro : formData.motorista;
                
                const { motoristaOutro, fotosChamado, ...dadosSemCamposVirtuais } = formData;

                const submitData = {
                  ...dadosSemCamposVirtuais, 
                  dadosWorkflow: {
                    ...(formData.dadosWorkflow || {}),
                    ...(fotosChamado ? { fotosChamado } : {})
                  },
                  motorista: finalMotorista,
                  status: 'ABERTO',
                  numero: (formData.defeitos && formData.defeitos[0]?.numeroSolicitacao) || '',
                  defeitoPrincipal: (formData.defeitos && formData.defeitos[0]?.categoria) || '',
                  defeitoEncontrado: (formData.defeitos && formData.defeitos[0]?.descricao) || ''
                };
                onSubmit(submitData);
                if (!isEditing) {
                  const _id = Date.now();
                  setSuccessData({ codigoChamado: 'ALP.M-' + String(_id).slice(-6), placa: formData.placa, dataAbertura: formData.dataAbertura, defeitos: formData.defeitos || [] });
                  setShowSuccess(true);
                }
              })(); }} className="flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-4">

            {/* 1. PLACA DO VEÍCULO */}
            <div className="w-full sm:col-span-2">
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Placa do Veículo <span className="text-rose-500">*</span>
              </label>
              {isFrota && isEditing ? (
                <input disabled value={formData.placa} className="w-full min-h-[48px] p-3.5 bg-slate-100 rounded-2xl font-black text-slate-600 outline-none border border-slate-200 cursor-not-allowed text-sm" />
              ) : (
                <SearchableSelect options={activeVehicles} value={formData.placa} onChange={handlePlacaChange} className="w-full min-h-[48px] p-3.5 bg-slate-50 rounded-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-200 text-sm shadow-xs" placeholder="Buscar ou selecionar placa..." />
              )}
            </div>

            {/* 2. SITUAÇÃO DO VEÍCULO */}
            <div className="w-full">
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">
                Situação Veículo <span className="text-rose-500">*</span>
              </label>
              <select 
                disabled={isFrota && isEditing} 
                value={formData.situacaoVeiculo} 
                onChange={e => setFormData({...formData, situacaoVeiculo: e.target.value})} 
                className="w-full min-h-[48px] p-3.5 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed text-sm shadow-xs"
              >
                <option value="RODANDO">🟢 Rodando (Operacional)</option>
                <option value="PARADO">🔴 Parado (Imobilizado)</option>
              </select>
            </div>

            {/* 3. HODÔMETRO (KM) */}
            <div className="w-full">
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">
                Hodômetro (KM) <span className="text-rose-500">*</span>
              </label>
              <input 
                type="number" 
                required
                placeholder="Ex: 125000" 
                disabled={isFrota && isEditing} 
                value={formData.hodometro || ''} 
                onChange={e => setFormData({...formData, hodometro: e.target.value})} 
                className="w-full min-h-[48px] p-3.5 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed text-sm shadow-xs" 
              />
            </div>

            {/* 4. DATA/HORA ABERTURA */}
            <div className="w-full">
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">
                Data/Hora Abertura <span className="text-rose-500">*</span>
              </label>
              <input 
                required 
                disabled={isFrota && isEditing} 
                type="datetime-local" 
                value={formData.dataAbertura} 
                onChange={e => setFormData({...formData, dataAbertura: e.target.value})} 
                className="w-full min-h-[48px] p-3.5 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed text-sm shadow-xs" 
              />
            </div>

            {/* 5. MOTORISTA / COLABORADOR */}
            <div className="w-full sm:col-span-1">
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">
                Motorista / Colaborador <span className="text-rose-500">*</span>
              </label>
              {isFrota && isEditing ? (
                <input disabled value={formData.motorista || '-'} className="w-full min-h-[48px] p-3.5 bg-slate-100 rounded-2xl font-bold text-slate-600 outline-none border border-slate-200 cursor-not-allowed text-sm" />
              ) : (
                <div className="space-y-2">
                  <SearchableSelect options={activeColabs} value={formData.motorista || ''} onChange={val => setFormData({...formData, motorista: val})} className="w-full min-h-[48px] p-3.5 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm shadow-xs" placeholder="Selecione o motorista..." />
                  {formData.motorista === 'OUTRO' && (
                    <input type="text" required value={formData.motoristaOutro || ''} onChange={e => setFormData({...formData, motoristaOutro: e.target.value.toUpperCase()})} placeholder="Digite o nome do motorista..." className="w-full min-h-[48px] p-3.5 bg-white rounded-2xl font-bold text-slate-800 outline-none border border-emerald-400 focus:ring-2 focus:ring-emerald-500 text-sm shadow-xs" />
                  )}
                </div>
              )}
            </div>

            {/* ★ CLUSTER DE DEFEITOS */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[10px] font-black uppercase text-slate-400">Defeitos do Veículo</label>
                {!(isFrota && isEditing) && !isEditing && (
                  <button type="button" onClick={addDefeito} className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg">
                    <PlusCircle size={12}/> Adicionar Defeito
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {(formData.defeitos || []).map((defeito, idx) => (
                  <div key={defeito.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 relative group animate-in fade-in slide-in-from-top-2 duration-300" style={{animationDelay: `${idx * 80}ms`}}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Defeito #{idx + 1}</span>
                      <span className="text-[9px] font-mono font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">ID: {String(defeito.id).slice(-6)}</span>
                    </div>
                      {!(isFrota && isEditing) && !isEditing && (formData.defeitos || []).length > 1 && (
                        <button type="button" onClick={() => removeDefeito(defeito.id)} className="text-rose-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </div>
                    <textarea 
                      required 
                      disabled={isFrota && isEditing}
                      value={defeito.descricao || ''} 
                      onChange={e => updateDefeito(defeito.id, 'descricao', e.target.value.toUpperCase())} 
                      className="w-full p-3 bg-white rounded-xl font-bold text-slate-700 outline-none border border-slate-200 resize-none h-16 text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                      placeholder="Descreva o defeito encontrado..." 
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Categoria</label>
                        <select 
                          required
                          disabled={isFrota && isEditing}
                          value={defeito.categoria || ''} 
                          onChange={e => updateDefeito(defeito.id, 'categoria', e.target.value)} 
                          className="w-full p-2.5 bg-white rounded-lg font-bold text-xs text-slate-700 outline-none border border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        >
                          <option value="">Selecione</option>
                          <option value="Mecânico">Mecânico</option>
                          <option value="Hidráulico">Hidráulico</option>
                          <option value="Elétrico">Elétrico</option>
                          <option value="Sinalização">Sinalização</option>
                          <option value="Lataria/carroceria">Lataria/carroceria</option>
                          <option value="Cabine">Cabine</option>
                          <option value="Pneus">Pneus</option>
                          <option value="Implemento">Implemento</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Nº SOL (E-CAR)</label>
                        <input 
                          required
                          disabled={isFrota && isEditing}
                          type="text" 
                          value={defeito.numeroSolicitacao || ''} 
                          onChange={e => updateDefeito(defeito.id, 'numeroSolicitacao', e.target.value.toUpperCase())} 
                          className="w-full p-2.5 bg-white rounded-lg font-bold text-xs text-slate-700 outline-none border border-slate-200 uppercase disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                          placeholder="SOL-000000" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Impeditivo?</label>
                        <div className="flex gap-1">
                          <button 
                            type="button" 
                            disabled={isFrota && isEditing}
                            onClick={() => updateDefeito(defeito.id, 'isImpeditivo', true)} 
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${defeito.isImpeditivo ? 'bg-rose-100 border-rose-400 text-rose-700' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            SIM
                          </button>
                          <button 
                            type="button"
                            disabled={isFrota && isEditing} 
                            onClick={() => updateDefeito(defeito.id, 'isImpeditivo', false)} 
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${!defeito.isImpeditivo ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            NÃO
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Foto específica do Defeito #{idx + 1} */}
                    <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Camera size={16} className="text-blue-600" />
                        <span className="text-[10px] font-black text-slate-700 uppercase">Foto do Defeito #{idx + 1}</span>
                        <span className="text-[9px] font-bold text-slate-400">(Inicialmente Opcional)</span>
                      </div>
                      {defeito.fotoDefeito ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={defeito.fotoDefeito} 
                            alt={`Defeito #${idx+1}`} 
                            onClick={() => setSelectedImagePreview({ url: defeito.fotoDefeito, label: `Foto do Defeito #${idx+1} - ${defeito.categoria || 'Geral'}` })} 
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-90 transition-opacity" 
                            title="Clique para expandir foto"
                          />
                          <button
                            type="button"
                            onClick={() => updateDefeito(defeito.id, 'fotoDefeito', null)}
                            className="p-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded-lg transition-colors text-xs font-bold"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors">
                          <Camera size={14} /> Anexar Foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  updateDefeito(defeito.id, 'fotoDefeito', reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            

            {(formData.oficinaExterna === 'SIM' || formData.oficinaDestino) && (

              <div className="col-span-2">

                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Oficina de Destino</label>

                <select 

                  disabled={isEditing && !(isAdminOrCoord || isFrota)}

                  value={formData.oficinaDestino || ''} 

                  onChange={e => setFormData({...formData, oficinaDestino: e.target.value})} 

                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed focus:ring-2 focus:ring-emerald-500"

                >

                  <option value="">Selecione a Oficina de Destino...</option>

                  {opcoesOficinas.map(o => <option key={o} value={o}>{o}</option>)}

                </select>

              </div>

            )}

            {/* ★ BANNER INFORMATIVO SOBRE FOTOS (TRANSIÇÃO P/ OBRIGATÓRIO) */}
            <div className="col-span-2 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
              <div>
                <h5 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">Aviso de Transição de Evidências Fotográficas</h5>
                <p className="text-xs text-amber-800/90 dark:text-amber-300 font-medium mt-0.5 leading-relaxed">
                  No momento, o anexo de fotos no chamado é opcional. <strong>Em breve, o upload das evidências fotográficas (Fachada, Hodômetro e Defeitos) passará a ser 100% obrigatório</strong> para a abertura e liberação do chamado. Recomendamos realizar o anexo desde já.
                </p>
              </div>
            </div>

            {/* ★ ANEXO DE FOTOS GERAIS (3 SLOTS OPCIONAIS) */}
            <div className="col-span-2 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Camera size={14} className="text-blue-600" /> Registro Fotográfico Geral (3 Fotos Inicialmente Opcionais)
                </span>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  Preparo p/ Obrigatoriedade
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'fotoVeiculo', label: '1. Veículo (Fachada)' },
                  { key: 'fotoHodometro', label: '2. Hodômetro (KM)' },
                  { key: 'fotoAdicional', label: '3. Foto Adicional' }
                ].map((item) => {

                  const fotoUrl = formData.fotosChamado?.[item.key] || formData.dadosWorkflow?.fotosChamado?.[item.key];

                  return (

                    <div key={item.key} className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center relative group">

                      <span className="text-[9px] font-black text-slate-500 mb-2 truncate w-full">{item.label}</span>

                      {fotoUrl ? (

                        <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-100 group">

                          <img 
                            src={fotoUrl} 
                            alt={item.label} 
                            onClick={() => setSelectedImagePreview({ url: fotoUrl, label: item.label })} 
                            className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity" 
                            title="Clique para expandir foto"
                          />

                          <button

                            type="button"

                            onClick={() => {
                              const newFotos = { ...(formData.fotosChamado || formData.dadosWorkflow?.fotosChamado || {}), [item.key]: null };
                              setFormData({
                                ...formData,
                                fotosChamado: newFotos,
                                dadosWorkflow: {
                                  ...(formData.dadosWorkflow || {}),
                                  fotosChamado: newFotos
                                }
                              });
                            }}

                            className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"

                          >

                            <Trash2 size={12} />

                          </button>

                        </div>

                      ) : (

                        <label className="w-full h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/50 transition-all p-2">

                          <Camera size={20} className="text-slate-400 mb-1" />

                          <span className="text-[9px] font-bold text-slate-400">Anexar Foto</span>

                          <input

                            type="file"

                            accept="image/*"

                            className="hidden"

                            onChange={(e) => {

                              const file = e.target.files[0];

                              if (file) {

                                const reader = new FileReader();

                                reader.onloadend = () => {

                                  const newFotos = {
                                    ...(formData.fotosChamado || formData.dadosWorkflow?.fotosChamado || {}),
                                    [item.key]: reader.result
                                  };
                                  setFormData({
                                    ...formData,
                                    fotosChamado: newFotos,
                                    dadosWorkflow: {
                                      ...(formData.dadosWorkflow || {}),
                                      fotosChamado: newFotos
                                    }
                                  });

                                };

                                reader.readAsDataURL(file);

                              }

                            }}

                          />

                        </label>

                      )}

                    </div>

                  );

                })}

              </div>

            </div>



          </form>

          {/* ★ CHECKLIST DE DEFEITOS (Modo Edição) */}
          {isEditing && formData.defeitos && formData.defeitos.length > 0 && formData.status !== 'RESOLVIDO' && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200 mt-4">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-4 flex items-center gap-2">
                <ClipboardCheck size={14} className="text-emerald-500"/> Checklist de Defeitos — Resolução Individual
              </h4>
              <div className="space-y-2">
                {formData.defeitos.map((defeito, idx) => (
                  <div key={defeito.id || idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 ${defeito.status === 'RESOLVIDO' ? 'bg-emerald-500' : defeito.isImpeditivo ? 'bg-rose-500' : 'bg-amber-500'}`}>
                        {defeito.status === 'RESOLVIDO' ? <Check size={14}/> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${defeito.status === 'RESOLVIDO' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{defeito.descricao || 'Sem descrição'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-bold text-slate-400">{defeito.categoria}</span>
                          {defeito.numeroSolicitacao && <span className="text-[9px] font-bold text-blue-500">{defeito.numeroSolicitacao}</span>}
                          {defeito.isImpeditivo && <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">IMPEDITIVO</span>}
                        </div>
                      </div>
                    </div>
                    {isFrota && (
                      <button 
                        type="button"
                        onClick={() => toggleDefeitoStatus(defeito.id)} 
                        className={`w-12 h-6 rounded-full transition-all duration-300 relative shrink-0 ml-3 ${defeito.status === 'RESOLVIDO' ? 'bg-emerald-500 shadow-inner shadow-emerald-600' : 'bg-slate-300 shadow-inner shadow-slate-400'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5 transition-all duration-300 ${defeito.status === 'RESOLVIDO' ? 'left-[1.625rem]' : 'left-0.5'}`}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200">
                <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{width: `${((formData.defeitos || []).filter(d => d.status === 'RESOLVIDO').length / Math.max(1, (formData.defeitos || []).length)) * 100}%`}}/>
                </div>
                <span className="text-[10px] font-black text-slate-500">
                  {(formData.defeitos || []).filter(d => d.status === 'RESOLVIDO').length}/{(formData.defeitos || []).length}
                </span>
              </div>
            </div>
          )}




          {isRecusando && (

            <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 space-y-3 animate-in slide-in-from-bottom duration-300">

              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Descreva o motivo da recusa do veículo:</label>

              <textarea 

                required 

                value={recusaMotivo} 

                onChange={e => setRecusaMotivo(e.target.value.toUpperCase())}

                className="w-full p-3 bg-white rounded-xl font-bold text-slate-700 outline-none border border-slate-200 resize-none h-16"

                placeholder="Por que o veículo não foi aceito?..." 

              />

              <div className="flex justify-end gap-2">

                <button onClick={() => { setIsRecusando(false); setRecusaMotivo(''); }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-xs font-black transition-colors">Cancelar</button>

                <button 

                  onClick={() => {

                    if (!recusaMotivo.trim()) return alert('Informe o motivo da recusa!');

                    handleWorkflowAction(

                      'Análise Frota',

                      `Operação recusou o veículo liberado. Motivo: ${recusaMotivo}`,

                      { dadosWorkflow: { ...formData.dadosWorkflow, aceitoOficina: false, motivoRecusa: recusaMotivo } }

                    );

                  }}

                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black transition-all shadow-sm"

                >

                  Confirmar Recusa

                </button>

              </div>

            </div>

          )}



          {isEditing && (formData.historicoModificacoes?.length || 0) > 0 && (

            <div className="pt-4 border-t border-slate-100">

              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-1.5"><History size={12}/> Histórico do Fluxo</h4>

              <div className="space-y-3 max-h-[150px] overflow-y-auto pr-2">

                {formData.historicoModificacoes.map((log, index) => (

                  <div key={log.id || index} className="flex gap-3 text-xs">

                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1.5"></div>

                    <div>

                      <p className="font-bold text-slate-700">{log.descricao}</p>

                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{formatarDataBR(log.dataHora)} por {log.usuario}</p>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          )}



          {isEditing && formData.status !== 'RESOLVIDO' && !isRecusando && (

            <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 space-y-4">

              <h4 className="text-[10px] font-black uppercase text-blue-950 tracking-widest flex items-center gap-2">

                <ShieldCheck size={14} className="text-emerald-600" /> Ações do Workflow ({getEtapaWorkflow(formData)})

              </h4>

              

              <div className="space-y-4 w-full">

                {/* Comentrio / Observao para todas as transies */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Comentrio / Observao (Opcional)
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <textarea 
                      value={transitionComment}
                      onChange={e => setTransitionComment(e.target.value)}
                      placeholder="Digite um comentrio sobre esta mudana ou apenas adicione uma nota..."
                      className="flex-1 p-3 bg-white rounded-xl text-xs font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400 min-h-[50px] resize-none"
                    />
                    <button 
                      onClick={handleStandaloneComment}
                      disabled={!transitionComment.trim()}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl transition-colors flex items-center justify-center disabled:opacity-50"
                      title="Registrar apenas comentrio no histrico"
                    >
                      Enviar
                    </button>
                  </div>
                </div>




                {/* Seleção de Oficina se for Análise Frota e usuário for Frota */}

                {isFrota && (formData.etapaWorkflow === 'Análise Frota' || formData.etapaWorkflow === 'Aguardando Manutenção' || !formData.etapaWorkflow) && (

                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/70 space-y-2">

                    <label className="block text-[10px] font-black uppercase text-blue-900 tracking-wider">

                      Oficina de Destino (Obrigatório para Envio Externo) *

                    </label>

                    <select 

                      value={selectedOficina} 

                      onChange={e => {

                        setSelectedOficina(e.target.value);

                        setFormData(prev => ({ ...prev, oficinaDestino: e.target.value }));

                      }}

                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"

                    >

                      <option value="">Selecione a Oficina...</option>

                      {opcoesOficinas.map(o => <option key={o} value={o}>{o}</option>)}

                    </select>

                  </div>

                )}

              </div>



              <div className="flex flex-wrap gap-3 mt-4">

                {(formData.etapaWorkflow === 'Análise Frota' || formData.etapaWorkflow === 'Aguardando Manutenção' || !formData.etapaWorkflow) && (

                  <>

                    {(isFrota || podeMovimentarOficinas || podeAlterarEtapaManual) ? (

                      <>

                        <button 

                          onClick={() => {

                            if (!selectedOficina) {
                              return showFeedbackLocal(
                                'warning',
                                'Oficina de Destino Obrigatória',
                                'Por favor, selecione a Oficina de Destino para prosseguir com o envio externo!',
                                null,
                                { confirmText: 'Entendido' }
                              );
                            }

                            handleWorkflowAction(

                              'Aguardando Desequipar', 

                              `Frota enviou o veículo para Oficina Externa (${selectedOficina}).`, 

                              { 

                                oficinaDestino: selectedOficina,

                                oficinaExterna: 'SIM',

                                dadosWorkflow: { 

                                  ...formData.dadosWorkflow, 

                                  tipoOficina: 'Externa',

                                  oficinaDestino: selectedOficina 

                                } 

                              }

                            );

                          }}

                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-200 transition-all active:scale-95"

                        >

                          Enviar para Oficina Externa

                        </button>

                        <button 

                          onClick={() => handleWorkflowAction('Oficina Interna', 'Frota enviou o veículo para Oficina Interna.', { dadosWorkflow: { ...formData.dadosWorkflow, tipoOficina: 'Interna' } })}

                          className="px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl text-xs font-black shadow-lg shadow-fuchsia-200 transition-all active:scale-95"

                        >

                          Enviar para Oficina Interna

                        </button>

                        <button 

                          onClick={() => handleWorkflowAction('Liberado Operação', 'Frota liberou o veículo diretamente para testes da Operação.')}

                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-200 transition-all active:scale-95"

                        >

                          Liberar para Operação

                        </button>

                      </>

                    ) : (

                      <div className="text-xs font-bold text-slate-500 bg-slate-200/50 p-3 rounded-lg w-full flex items-center gap-2">

                        <Clock size={14}/> Aguardando diagnóstico e ações da Frota (Análise).

                      </div>

                    )}

                  </>

                )}



                {formData.etapaWorkflow === 'Oficina Interna' && (
                  <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                    <h5 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <Wrench size={16}/> Oficina Interna - Aes
                    </h5>
                    
                    {/* Botões de Ação da Frota */}
                    {(podeConcluirOficina || podeMovimentarOficinas) && (
                      <div className="space-y-2">
                        {podeConcluirOficina && (
                          <button 
                            onClick={() => handleWorkflowAction('Liberado Operação', 'Frota concluiu a manutenção interna e liberou o veículo para testes.')}
                            className="w-full px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-200 transition-all active:scale-95"
                          >
                            Manutenção Concluída (Liberar Operação)
                          </button>
                        )}
                        {podeMovimentarOficinas && (
                          <button 
                            type="button"
                            onClick={() => {
                              setOficinaDestinoExterna(formData.oficinaDestino || 'AEROBRASIL MECANICA');
                              setMotivoTransferenciaExterna('');
                              setModalTransferenciaExternaOpen(true);
                            }}
                            className="w-full px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Truck size={14} /> Redirecionar para Oficina Externa
                          </button>
                        )}
                      </div>
                    )}

                    {/* SUB FLUXO: COMPRAS / FINANCEIRO */}
                    <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Sub-Fluxo Financeiro/Compras</span>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${!subFluxo ? 'bg-slate-100 text-slate-500' : subFluxo.status === 'COMPRAS' ? 'bg-amber-100 text-amber-700' : subFluxo.status === 'FINANCEIRO' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {subFluxo?.status || 'NÃO INICIADO'}
                        </span>
                      </div>

                      {/* STEP 1: ENVIAR PARA COMPRAS (FROTA/ADMIN) */}
                      {(!subFluxo || subFluxo.status !== 'PAGO' || isAdminOrGerente) && (isFrota || isAdminOrGerente) && (!subFluxo || isAdminOrGerente) && (
                         <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                           {subFluxo?.pedidoCompras ? (
                             <div>
                               <label className="text-[10px] font-black text-amber-900 uppercase block mb-1">Nº do Pedido</label>
                               <div className="px-3 py-2 bg-amber-100/50 rounded-lg text-sm font-bold text-amber-900 border border-amber-200/50">{subFluxo.pedidoCompras}</div>
                               
                               {/* Edit mode for Admin/Gerente */}
                               {isAdminOrGerente && (
                                 <div className="mt-3 flex gap-2">
                                   <input type="text" value={comprasPedido} onChange={e=>setComprasPedido(e.target.value)} placeholder="Alterar pedido" className="flex-1 p-2 rounded-lg text-xs font-bold border border-amber-200 outline-none" />
                                   <button onClick={() => handleSubFluxoAction(subFluxo.status, `Pedido alterado para: ${comprasPedido}`, { pedidoCompras: comprasPedido })} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors">Atualizar</button>
                                 </div>
                               )}
                             </div>
                           ) : (
                             <div className="space-y-3">
                               <div>
                                 <label className="text-[10px] font-black text-amber-900 uppercase block mb-1">Nº do Pedido (Envio para Compras)</label>
                                 <input type="text" value={comprasPedido} onChange={e=>setComprasPedido(e.target.value)} placeholder="Ex: 987654" className="w-full p-2.5 rounded-lg text-sm font-bold border border-amber-200 outline-none focus:border-amber-500" />
                               </div>
                               <div>
                                 <label className="text-[10px] font-black text-amber-900 uppercase block mb-1">Observações para Compras</label>
                                 <textarea value={comprasObservacao} onChange={e=>setComprasObservacao(e.target.value)} placeholder="Comentários adicionais..." className="w-full p-2 rounded-lg text-xs border border-amber-200 outline-none resize-none h-16"></textarea>
                               </div>
                               <button 
                                 onClick={() => handleSubFluxoAction('COMPRAS', `Pedido: ${comprasPedido}${comprasObservacao ? ' | Obs: ' + comprasObservacao : ''}`, { dadosWorkflow: { subFluxoOficina: { ...subFluxo, status: 'COMPRAS', pedidoCompras: comprasPedido, dataEnvioCompras: new Date().toISOString(), observacaoCompras: comprasObservacao } } })}
                                 disabled={!comprasPedido}
                                 className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-lg disabled:opacity-50 transition-colors"
                               >
                                 Enviar Compras
                               </button>
                             </div>
                           )}
                         </div>
                      )}

                      {/* STEP 2: AVANÇAR PARA FINANCEIRO (COMPRAS/ADMIN) */}
                      {subFluxo?.status === 'COMPRAS' && (isCompras || isAdminOrGerente) && (
                         <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                           <p className="text-xs font-bold text-blue-900 mb-2">Pedido recebido: {subFluxo.pedidoCompras}</p>
                           {subFluxo.observacaoCompras && (
                             <div className="p-2 mb-3 bg-white/60 rounded-md text-xs text-amber-900 border border-amber-200/50 italic">
                               Obs: {subFluxo.observacaoCompras}
                             </div>
                           )}
                           <button 
                             onClick={() => handleSubFluxoAction('FINANCEIRO', 'Compras encaminhou para o Financeiro.', { dadosWorkflow: { subFluxoOficina: { ...subFluxo, status: 'FINANCEIRO', dataEnvioFinanceiro: new Date().toISOString() } } })}
                             className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
                           >
                             Avançar para Financeiro
                           </button>
                         </div>
                      )}

                      {/* STEP 3: INFORMAR PREVISÃO E PAGAMENTO (FINANCEIRO/ADMIN) */}
                      {(subFluxo?.status === 'FINANCEIRO' || subFluxo?.status === 'PAGO') && (isFinanceiro || isAdminOrGerente) && (
                         <div className="space-y-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                           {subFluxo.previsaoPagamento && subFluxo.status !== 'PAGO' && (
                             <p className="text-xs font-bold text-indigo-900">Previsão atual: {new Date(subFluxo.previsaoPagamento).toLocaleDateString('pt-BR')} (Aguardando Pgto)</p>
                           )}
                           
                           {subFluxo.status !== 'PAGO' ? (
                             <div className="space-y-3">
                               <div>
                                 <label className="text-[10px] font-black text-indigo-700 uppercase block mb-1">Previsão de Pagto</label>
                                 <input type="date" value={financeiroPrevisao} onChange={e=>setFinanceiroPrevisao(e.target.value)} className="w-full p-2.5 rounded-lg text-sm font-bold border border-indigo-200 outline-none" />
                               </div>
                               <div>
                                 <label className="text-[10px] font-black text-indigo-700 uppercase block mb-1">Comentário / Observação</label>
                                 <textarea value={financeiroObservacao} onChange={e=>setFinanceiroObservacao(e.target.value)} placeholder="Ex: Nota fiscal aguardando emissão..." className="w-full p-2 rounded-lg text-xs border border-indigo-200 outline-none resize-none h-12"></textarea>
                               </div>
                               <div className="flex gap-2">
                                 <button 
                                   onClick={() => handleSubFluxoAction(subFluxo.status, `Previsão programada: ${financeiroPrevisao}${financeiroObservacao ? ' | Obs: ' + financeiroObservacao : ''}`, { dadosWorkflow: { subFluxoOficina: { ...subFluxo, previsaoPagamento: financeiroPrevisao, observacaoFinanceiro: financeiroObservacao } } })}
                                   disabled={!financeiroPrevisao}
                                   className="flex-1 py-2 bg-indigo-200 hover:bg-indigo-300 text-indigo-900 font-bold text-xs rounded-lg disabled:opacity-50 transition-colors"
                                 >
                                   Programar Pagamento
                                 </button>
                                 <button 
                                   onClick={() => handleSubFluxoAction('PAGO', `Pagamento efetuado.${financeiroObservacao ? ' | Obs: ' + financeiroObservacao : ''}`, { dadosWorkflow: { subFluxoOficina: { ...subFluxo, status: 'PAGO', dataPagamento: new Date().toISOString(), observacaoFinanceiro: financeiroObservacao } } })}
                                   className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
                                 >
                                   <CheckCircle2 size={14} /> Informar Pago
                                 </button>
                               </div>
                             </div>
                           ) : (
                             <div className="text-center text-xs font-bold text-emerald-700 bg-emerald-100 p-2 rounded-lg">
                               Sub-Fluxo Concluído {subFluxo.dataPagamento ? `(Pago em ${new Date(subFluxo.dataPagamento).toLocaleDateString('pt-BR')})` : ''}
                             </div>
                           )}
                         </div>
                      )}
                    </div>
                  </div>
                )}

                {formData.etapaWorkflow === 'Aguardando Desequipar' && (

                  <>

                    {isOperacaoParaDesequipar ? (

                      <button 

                        onClick={() => handleWorkflowAction('Desequipado - Entrada Oficina', 'Operação confirmou a desequipagem do veículo.')}

                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-200 transition-all active:scale-95"

                      >

                        Confirmar Veículo Desequipado

                      </button>

                    ) : (

                      <div className="text-xs font-bold text-slate-500 bg-slate-200/50 p-3 rounded-lg w-full flex items-center gap-2">

                        <Clock size={14}/> Aguardando que a Operação desequipe o veículo para entrada na oficina externa.

                      </div>

                    )}

                  </>

                )}



                {(formData.etapaWorkflow === 'Desequipado - Entrada Oficina' || (formData.etapaWorkflow === 'Oficina Externa' && !formData.dadosWorkflow?.aceitoOficina)) && (

                  <>

                    {isFrotaParaEntradaOficina ? (

                      <button 

                        onClick={() => handleWorkflowAction(

                          'Oficina Externa',

                          'Frota confirmou a entrada do veículo na oficina e iniciou a manutenção.',

                          { dadosWorkflow: { ...formData.dadosWorkflow, aceitoOficina: true } }

                        )}

                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-200 transition-all active:scale-95"

                      >

                        Aceitar Veículo Desequipado (Entrada Oficina)

                      </button>

                    ) : (

                      <div className="text-xs font-bold text-slate-500 bg-slate-200/50 p-3 rounded-lg w-full flex items-center gap-2">

                        <Clock size={14}/> Aguardando que a Frota confirme a entrada do veículo na oficina externa.

                      </div>

                    )}

                  </>

                )}



                {formData.etapaWorkflow === 'Oficina Externa' && formData.dadosWorkflow?.aceitoOficina && (

                  <>

                    {(podeConcluirOficina || podeMovimentarOficinas) ? (
                      <div className="space-y-2">
                        {podeConcluirOficina && (
                          <button 
                            onClick={() => handleWorkflowAction('Liberado Operação', 'Frota concluiu a manutenção e liberou o veículo para testes.')}
                            className="w-full px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-200 transition-all active:scale-95"
                          >
                            Manutenção Concluída (Liberar Operação)
                          </button>
                        )}
                        {podeMovimentarOficinas && (
                          <button 
                            type="button"
                            onClick={() => {
                              setMotivoRetornoInterna('');
                              setModalRetornoInternaOpen(true);
                            }}
                            className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Home size={14} /> Retornar para Oficina Interna
                          </button>
                        )}
                      </div>
                    ) : (

                      <div className="text-xs font-bold text-slate-500 bg-slate-200/50 p-3 rounded-lg w-full flex items-center gap-2">

                        <Clock size={14}/> Veículo em manutenção na Oficina Externa. Aguardando conclusão da Frota.

                      </div>

                    )}

                  </>

                )}



                {formData.etapaWorkflow === 'Liberado Operação' && (

                  <>

                    {isOperacaoParaAceite ? (

                      <>

                        <button 

                          onClick={() => {

                            if (onLiberar) {

                              onLiberar(formData);

                            }

                          }}

                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-200 transition-all active:scale-95"

                        >

                          Testar e Aceitar Veículo

                        </button>

                        <button 

                          onClick={() => setIsRecusando(true)}

                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-200 transition-all active:scale-95"

                        >

                          Recusar Veículo

                        </button>

                      </>

                    ) : (

                      <div className="text-xs font-bold text-slate-500 bg-slate-200/50 p-3 rounded-lg w-full flex items-center gap-2">

                        <Clock size={14}/> Veículo liberado para testes. Aguardando validação final da Operação.

                      </div>

                    )}

                  </>

                )}

              </div>



              {podeAlterarEtapaManual && (

                <div className="pt-4 border-t border-slate-200 mt-4 w-full bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-amber-50/80 p-4 rounded-2xl border border-amber-200/80 shadow-sm space-y-3">

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                      <Shield size={14} className="text-amber-600" /> Alteração Manual de Etapa (Gestão)
                    </label>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-800 uppercase tracking-wider">
                      Privilégio Especial
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Selecionar Nova Etapa
                      </label>
                      <select 
                        value={etapaManualTarget} 
                        onChange={e => {
                          const nextStage = e.target.value;
                          setEtapaManualTarget(nextStage);
                          if (nextStage === 'Oficina Externa' && !oficinaManualTarget) {
                            setOficinaManualTarget(selectedOficina || formData.oficinaDestino || formData.dadosWorkflow?.oficinaDestino || '');
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-amber-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                      >
                        <option value="Análise Frota">Análise Frota</option>
                        <option value="Oficina Interna">Oficina Interna</option>
                        <option value="Aguardando Desequipar">Aguardando Desequipar</option>
                        <option value="Desequipado - Entrada Oficina">Desequipado (Entrada Oficina)</option>
                        <option value="Oficina Externa">Oficina Externa</option>
                        <option value="Liberado Operação">Liberado Operação</option>
                        <option value="RESOLVIDO">Aceito / Concluído</option>
                      </select>
                    </div>

                    {/* Condicional: Oficina de Destino SÓ aparece quando a etapa for OFICINA EXTERNA */}
                    {etapaManualTarget === 'Oficina Externa' && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200 p-3 bg-white/90 rounded-xl border border-amber-200/80 space-y-1">
                        <label className="block text-[9px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 size={12} className="text-amber-600" /> Oficina de Destino (Obrigatória para Oficina Externa) *
                        </label>
                        <select
                          value={oficinaManualTarget}
                          onChange={e => {
                            const val = e.target.value;
                            setOficinaManualTarget(val);
                            setSelectedOficina(val);
                          }}
                          className="w-full p-2 bg-white border border-amber-300 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                        >
                          <option value="">Selecione a Oficina de Destino...</option>
                          {opcoesOficinas.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleExecutarMudancaManual}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-200/60 hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles size={14} /> Aplicar Alteração Manual de Etapa
                    </button>
                  </div>

                </div>

              )}

            </div>

          )}



        </div>



        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">

          <button onClick={onClose} className="px-6 py-3 rounded-full font-bold hover:bg-slate-200 transition-colors text-slate-500">Fechar</button>

          {formData.status !== 'RESOLVIDO' && !isRecusando && (

            <button type="submit" form="chamadoForm" className="px-8 py-3 rounded-full font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all">Salvar Chamado</button>

          )}

        </div>
      </div>
    </div>
    )}
    {subModalResolveDefeitos && (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-rose-100 animate-in zoom-in-95 duration-300 flex flex-col">
          {/* Header */}
          <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
              <AlertTriangle className="text-rose-600" size={24}/>
            </div>
            <div>
              <h2 className="text-xl font-black text-rose-950">Defeitos Pendentes Detectados</h2>
              <p className="text-xs text-rose-700/80 mt-1 font-bold">O veículo não pode ser liberado com defeitos sem resolução informada.</p>
            </div>
          </div>

          {/* List of pending defects */}
          <div className="p-6 flex-1 overflow-y-auto bg-slate-50 space-y-4 max-h-[40vh]">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selecione/Marque os defeitos resolvidos abaixo:</p>
            
            <div className="space-y-3">
              {(formData.defeitos || []).map((defeito, idx) => (
                <div key={defeito.id || idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-black shrink-0 ${defeito.status === 'RESOLVIDO' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                      {defeito.status === 'RESOLVIDO' ? <Check size={14}/> : idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${defeito.status === 'RESOLVIDO' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{defeito.descricao || 'Sem descrição'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{defeito.categoria}</span>
                        {defeito.isImpeditivo && <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">IMPEDITIVO</span>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Resolve toggle */}
                  <button 
                    type="button"
                    onClick={() => toggleDefeitoStatus(defeito.id)} 
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative shrink-0 ml-3 ${defeito.status === 'RESOLVIDO' ? 'bg-emerald-500 shadow-inner shadow-emerald-600' : 'bg-slate-300 shadow-inner shadow-slate-400'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5 transition-all duration-300 ${defeito.status === 'RESOLVIDO' ? 'left-[1.625rem]' : 'left-0.5'}`}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
            <button 
              onClick={() => setSubModalResolveDefeitos(null)} 
              className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-colors"
            >
              Voltar
            </button>
            <button 
              onClick={() => {
                const pendentes = (formData.defeitos || []).some(d => d.status !== 'RESOLVIDO');
                if (pendentes) {
                  alert('Ainda existem defeitos pendentes. Por favor, marque todos como RESOLVIDOS.');
                  return;
                }
                const action = subModalResolveDefeitos;
                setSubModalResolveDefeitos(null);
                handleWorkflowAction(action.novaEtapa, action.logDesc, action.extras);
              }}
              disabled={(formData.defeitos || []).some(d => d.status !== 'RESOLVIDO')}
              className="flex-1 py-3.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-2xl font-black text-sm transition-all active:scale-[0.98] shadow-md shadow-emerald-600/10"
            >
              Concluir e Liberar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ★ MODAL SISTÊMICO: RETORNO PARA OFICINA INTERNA */}
    {modalRetornoInternaOpen && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <Home size={22} className="text-blue-200" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Retornar para Oficina Interna</h3>
                <p className="text-xs text-blue-200 font-medium mt-0.5">Transferência da OS de Oficina Externa para Oficina Interna</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => { setModalRetornoInternaOpen(false); setMotivoRetornoInterna(''); }} 
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4 flex-1">
            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 font-medium leading-relaxed">
                Informe abaixo o motivo ou justificativa para que a Frota retorne este veículo para a Oficina Interna (ex: <span className="font-bold">Peça localizada na base, Reparo resolvido internamente</span>).
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Motivo do Retorno para Oficina Interna
              </label>
              <textarea
                rows={3}
                value={motivoRetornoInterna}
                onChange={(e) => setMotivoRetornoInterna(e.target.value)}
                placeholder="Ex: Peça localizada no estoque da base, veículo será reparado internamente..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
              />
            </div>
          </div>

          <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => { setModalRetornoInternaOpen(false); setMotivoRetornoInterna(''); }}
              className="px-5 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const motivoFinal = motivoRetornoInterna.trim();
                handleWorkflowAction(
                  'Oficina Interna',
                  `Frota retornou o chamado de Oficina Externa para Oficina Interna.${motivoFinal ? ' Motivo: ' + motivoFinal : ''}`,
                  {
                    oficinaExterna: 'NÃO',
                    dadosWorkflow: {
                      ...formData.dadosWorkflow,
                      tipoOficina: 'Interna',
                      motivoRetornoInterna: motivoFinal
                    }
                  }
                );
                setModalRetornoInternaOpen(false);
                setMotivoRetornoInterna('');
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-2"
            >
              <Home size={14} /> Confirmar Retorno
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ★ MODAL SISTÊMICO: REDIRECIONAR PARA OFICINA EXTERNA */}
    {modalTransferenciaExternaOpen && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col">
          <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-6 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <Truck size={22} className="text-amber-200" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Redirecionar para Oficina Externa</h3>
                <p className="text-xs text-amber-100 font-medium mt-0.5">Encaminhamento para manutenção credenciada</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => { setModalTransferenciaExternaOpen(false); setMotivoTransferenciaExterna(''); }} 
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4 flex-1">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Oficina de Destino Externa <span className="text-rose-500">*</span>
              </label>
              <select
                value={oficinaDestinoExterna}
                onChange={(e) => setOficinaDestinoExterna(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              >
                <option value="">Selecione a Oficina Credenciada...</option>
                {opcoesOficinas.map((of) => (
                  <option key={of} value={of}>{of}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Justificativa / Motivo da Transferência (Opcional)
              </label>
              <textarea
                rows={3}
                value={motivoTransferenciaExterna}
                onChange={(e) => setMotivoTransferenciaExterna(e.target.value)}
                placeholder="Ex: Necessário serviço de tornearia especializada, falta de ferramenta na base..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all resize-none"
              />
            </div>
          </div>

          <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => { setModalTransferenciaExternaOpen(false); setMotivoTransferenciaExterna(''); }}
              className="px-5 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!oficinaDestinoExterna || !oficinaDestinoExterna.trim()) {
                  return showFeedbackLocal(
                    'warning',
                    'Oficina de Destino Obrigatória',
                    'É obrigatório selecionar a Oficina de Destino Externa!',
                    null,
                    { confirmText: 'Entendido' }
                  );
                }
                const motivoFinal = motivoTransferenciaExterna.trim();
                handleWorkflowAction(
                  'Oficina Externa',
                  `Frota transferiu o chamado de Oficina Interna para Oficina Externa (${oficinaDestinoExterna.trim()}).${motivoFinal ? ' Motivo: ' + motivoFinal : ''}`,
                  {
                    oficinaExterna: 'SIM',
                    oficinaDestino: oficinaDestinoExterna.trim(),
                    dadosWorkflow: {
                      ...formData.dadosWorkflow,
                      tipoOficina: 'Externa',
                      oficinaDestino: oficinaDestinoExterna.trim(),
                      aceitoOficina: true,
                      motivoTransferenciaExterna: motivoFinal
                    }
                  }
                );
                setModalTransferenciaExternaOpen(false);
                setMotivoTransferenciaExterna('');
              }}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-lg shadow-amber-200 active:scale-95 transition-all flex items-center gap-2"
            >
              <Truck size={14} /> Confirmar Transferência
            </button>
          </div>
        </div>
      </div>
    )}
    {/* ★ MODAL LIGHTBOX DE FOTOS EXPANDIDAS EM TELA CHEIA */}
    {selectedImagePreview && (
      <div 
        className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        onClick={() => setSelectedImagePreview(null)}
      >
        <div 
          className="relative max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl p-3 border border-slate-700 shadow-2xl overflow-hidden flex flex-col items-center justify-center group"
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <a 
              href={selectedImagePreview.url} 
              target="_blank" 
              rel="noreferrer" 
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-all shadow-md"
              title="Abrir imagem original em nova aba"
            >
              <Eye size={18} />
            </a>
            <button
              type="button"
              onClick={() => setSelectedImagePreview(null)}
              className="p-2.5 bg-slate-800/80 hover:bg-rose-600 text-white rounded-full transition-all shadow-md"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 text-white text-xs font-black uppercase tracking-wider">
            {selectedImagePreview.label || 'Visualização da Foto'}
          </div>

          <img 
            src={selectedImagePreview.url} 
            alt={selectedImagePreview.label || 'Foto expandida'} 
            className="max-w-full max-h-[82vh] object-contain rounded-2xl" 
          />
        </div>
      </div>
    )}

    {/* ★ MODAL ULTRA PREMIUM DE FEEDBACK & CONFIRMAÇÃO INTEGRADO AO MODAL DE CHAMADO */}
    <CustomFeedbackModal {...feedbackModalLocal} />
    </>
  );
}



function ModalNovoVeiculo({ onClose, onSubmit }) {

  const [formData, setFormData] = useState({ 
    regional: 'Norte', 
    placa: '', 
    turno: 'Manhã', 
    tipo: 'Pesado', 
    subTipo: 'Munk', 
    tipoOp: 'Linha Viva', 
    marca: '', 
    implemento: 'PHD', 
    locadora: 'LOCALIZA', 
    situacao: 'RODANDO', 
    status: 'DISPONIVEL', 
    dtInicioContrato: '', 
    valorContrato: '', 
    tipoContrato: 'Contrato Novo' 
  });

  const [customLocadora, setCustomLocadora] = useState('');
  const [customSubTipo, setCustomSubTipo] = useState('');
  const [customImplemento, setCustomImplemento] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalLocadora = formData.locadora === 'OUTROS' ? customLocadora.toUpperCase() : formData.locadora;
    const finalSubTipo = formData.subTipo === 'OUTROS' ? customSubTipo.toUpperCase() : formData.subTipo;
    const finalImplemento = formData.tipo === 'Pesado' ? (formData.implemento === 'OUTROS' ? customImplemento.toUpperCase() : formData.implemento) : '-';

    onSubmit({
      ...formData,
      locadora: finalLocadora,
      subTipo: finalSubTipo,
      implemento: finalImplemento,
      id: Date.now()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-[2rem] shadow-2xl w-full sm:max-w-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        <div className="px-4 sm:px-8 py-4 sm:py-6 bg-blue-950 flex justify-between items-center text-white shrink-0">
          <h2 className="text-lg sm:text-xl font-black">Cadastrar Novo Veículo</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-4 sm:p-8 space-y-6 overflow-y-auto flex-1">
          <form id="veiculoForm" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Regional</label>
              <select value={formData.regional} onChange={e => setFormData({...formData, regional: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200">
                <option value="Norte">Norte</option>
                <option value="Leste">Leste</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Placa</label>
              <input required type="text" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none uppercase border border-slate-200" placeholder="AAA0A00" />
            </div>
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Marca</label>
               <input required type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value.toUpperCase()})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none uppercase border border-slate-200" placeholder="Marca (Ex: Volks)" />
            </div>
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Turno</label>
               <select value={formData.turno} onChange={e => setFormData({...formData, turno: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200">
                 <option>Manhã</option>
                 <option>Tarde</option>
                 <option>Noite</option>
               </select>
            </div>
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Tipo</label>
               <select value={formData.tipo} onChange={e => {
                 const newTipo = e.target.value;
                 setFormData({...formData, tipo: newTipo, implemento: newTipo === 'Pesado' ? 'PHD' : '-' });
               }} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200">
                 <option>Pesado</option>
                 <option>Leve</option>
                 <option>Moto</option>
               </select>
            </div>
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Sub Tipo</label>
               <select value={formData.subTipo} onChange={e => setFormData({...formData, subTipo: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200">
                 <option value="Munk">Munk</option>
                 <option value="Cesto Aéreo">Cesto Aéreo</option>
                 <option value="Fiorino">Fiorino</option>
                 <option value="Strada">Strada</option>
                 <option value="Argo">Argo</option>
                 <option value="Moto">Moto</option>
                 <option value="OUTROS">Outros (Escrever...)</option>
               </select>
            </div>
            {formData.subTipo === 'OUTROS' && (
              <div className="col-span-2 animate-in fade-in duration-200">
                <label className="block text-[10px] font-black uppercase text-amber-600 mb-2">Nome do Outro Sub Tipo *</label>
                <input required type="text" value={customSubTipo} onChange={e => setCustomSubTipo(e.target.value.toUpperCase())} className="w-full p-3 bg-amber-50/50 rounded-xl font-bold text-slate-700 outline-none border border-amber-200 focus:ring-2 focus:ring-amber-500" placeholder="Escreva o sub tipo..." />
              </div>
            )}
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Tipo de OP</label>
               <select value={formData.tipoOp} onChange={e => setFormData({...formData, tipoOp: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200">
                 <option>Linha Viva</option>
                 <option>TMA</option>
                 <option>Linha Morta</option>
                 <option>SOC</option>
               </select>
            </div>
            {formData.tipo === 'Pesado' && (
              <>
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Implemento</label>
                   <select value={formData.implemento} onChange={e => setFormData({...formData, implemento: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200">
                     <option value="PHD">PHD</option>
                     <option value="IMAP">IMAP</option>
                     <option value="SKYRITZ">SKYRITZ</option>
                     <option value="SKYCITY">SKYCITY</option>
                     <option value="AXION">AXION</option>
                     <option value="TECMARQUES">TECMARQUES</option>
                     <option value="OUTROS">Outros (Escrever...)</option>
                   </select>
                </div>
                {formData.implemento === 'OUTROS' && (
                  <div className="col-span-2 animate-in fade-in duration-200">
                    <label className="block text-[10px] font-black uppercase text-amber-600 mb-2">Nome do Outro Implemento *</label>
                    <input required type="text" value={customImplemento} onChange={e => setCustomImplemento(e.target.value.toUpperCase())} className="w-full p-3 bg-amber-50/50 rounded-xl font-bold text-slate-700 outline-none border border-amber-200 focus:ring-2 focus:ring-amber-500" placeholder="Escreva o nome do implemento..." />
                  </div>
                )}
              </>
            )}
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Locadora</label>
               <select value={formData.locadora} onChange={e => setFormData({...formData, locadora: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200">
                 <option value="LOCALIZA">LOCALIZA</option>
                 <option value="VAMOS">VAMOS</option>
                 <option value="TOPE">TOPE</option>
                 <option value="LM">LM</option>
                 <option value="PRÓPRIO">PRÓPRIO</option>
                 <option value="OUTROS">Outros (Escrever...)</option>
               </select>
            </div>
            {formData.locadora === 'OUTROS' && (
              <div className="col-span-2 animate-in fade-in duration-200">
                <label className="block text-[10px] font-black uppercase text-amber-600 mb-2">Nome da Outra Locadora *</label>
                <input required type="text" value={customLocadora} onChange={e => setCustomLocadora(e.target.value.toUpperCase())} className="w-full p-3 bg-amber-50/50 rounded-xl font-bold text-slate-700 outline-none border border-amber-200 focus:ring-2 focus:ring-amber-500" placeholder="Escreva o nome da locadora..." />
              </div>
            )}
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Tipo de Contrato</label>
               <select value={formData.tipoContrato} onChange={e => setFormData({...formData, tipoContrato: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200">
                 <option value="Contrato Novo">Contrato Novo</option>
                 <option value="Contrato Antigo">Contrato Antigo</option>
                 <option value="Sem Contrato">Sem Contrato</option>
               </select>
            </div>
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Dt Início Contrato</label>
               <input type="text" value={formData.dtInicioContrato} onChange={e => setFormData({...formData, dtInicioContrato: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200" placeholder="DD/MM/AAAA" />
            </div>
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Valor Contrato</label>
               <input type="text" value={formData.valorContrato} onChange={e => setFormData({...formData, valorContrato: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200" placeholder="Ex: 1.590" />
            </div>
          </form>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-full font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>
          <button type="submit" form="veiculoForm" className="px-8 py-3 rounded-full font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all">Salvar Veículo</button>
        </div>
      </div>
    </div>
  );
}


function ModalLiberarVeiculo({ chamado, onClose, onSubmit }) {

  const [tipoAcao, setTipoAcao] = useState(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const [formData, setFormData] = useState(() => {
    const agora = new Date();
    const dataAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    return { 
      chamadoId: chamado.id, 
      dataLiberacao: dataAtual, 
      horaLiberacao: horaAtual, 
      temPendencia: null, 
      pendencia: '', 
      defeitoPrincipal: '', 
      isImpeditivo: null, 
      numeroNovoChamado: '' 
    };
  });



  const handleSubmit = (e) => {

    e.preventDefault();

    if (!tipoAcao) {
      alert('Selecione o resultado da inspeção.');
      return;
    }

    if (tipoAcao === 'RECUSAR') {
      if (!motivoRecusa.trim()) {
        alert('Informe o motivo da recusa!');
        return;
      }
      onSubmit({
        tipoAcao: 'RECUSAR',
        chamadoId: chamado.id,
        motivoRecusa: motivoRecusa.trim()
      });
      return;
    }

    if (formData.temPendencia === 'SIM' && !formData.isImpeditivo) {

       alert('Informe se a pendência é impeditiva para rodar.');

       return;

    }

    onSubmit({
      ...formData,
      tipoAcao: 'LIBERAR'
    });

  };



  return (

    <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">

      <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 border-t-8 border-emerald-500 shadow-2xl relative my-auto">

        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500"><X size={24}/></button>

        <h3 className="text-2xl font-black mb-2 text-emerald-600">Assistente de Liberação</h3>

        <p className="text-sm text-slate-500 font-medium mb-6 pb-4 border-b border-slate-100">Siga os passos para liberar a placa <span className="font-bold text-blue-950">{chamado.placa}</span></p>



        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-2 gap-4">

            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Data da Liberação</label><input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none text-slate-700" value={formData.dataLiberacao} onChange={e=>setFormData({...formData, dataLiberacao: e.target.value})} required /></div>

            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Hora</label><input type="time" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none text-slate-700" value={formData.horaLiberacao} onChange={e=>setFormData({...formData, horaLiberacao: e.target.value})} required /></div>

          </div>



          <div>

            <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Selecione o resultado da inspeção:</label>

            <div className="grid grid-cols-3 gap-2">

               <button 
                 type="button" 
                 onClick={() => {
                   setTipoAcao('LIBERADO');
                   setFormData({...formData, temPendencia: 'NÃO', isImpeditivo: null});
                 }} 
                 className={`p-3 rounded-2xl font-black border-2 transition-all flex flex-col items-center justify-center gap-2 ${tipoAcao === 'LIBERADO' ? 'bg-emerald-50 border-emerald-500 text-emerald-600 scale-[1.03] shadow-md shadow-emerald-100/55' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
               >
                 <CheckCircle2 size={22} className={tipoAcao === 'LIBERADO' ? 'text-emerald-500' : 'text-slate-300'} />
                 <span className="text-[10px] leading-tight text-center">Liberado (100% Ok)</span>
               </button>

               <button 
                 type="button" 
                 onClick={() => {
                   setTipoAcao('PENDENCIA');
                   setFormData({...formData, temPendencia: 'SIM'});
                 }} 
                 className={`p-3 rounded-2xl font-black border-2 transition-all flex flex-col items-center justify-center gap-2 ${tipoAcao === 'PENDENCIA' ? 'bg-amber-50 border-amber-500 text-amber-600 scale-[1.03] shadow-md shadow-amber-100/55' : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200'}`}
               >
                 <AlertTriangle size={22} className={tipoAcao === 'PENDENCIA' ? 'text-amber-500' : 'text-slate-300'} />
                 <span className="text-[10px] leading-tight text-center">Possui Pendência</span>
               </button>

               <button 
                 type="button" 
                 onClick={() => {
                   setTipoAcao('RECUSAR');
                   setFormData({...formData, temPendencia: null, isImpeditivo: null});
                 }} 
                 className={`p-3 rounded-2xl font-black border-2 transition-all flex flex-col items-center justify-center gap-2 ${tipoAcao === 'RECUSAR' ? 'bg-rose-50 border-rose-500 text-rose-600 scale-[1.03] shadow-md shadow-rose-100/55' : 'bg-white border-slate-100 text-slate-400 hover:border-rose-200'}`}
               >
                 <XCircle size={22} className={tipoAcao === 'RECUSAR' ? 'text-rose-500' : 'text-slate-300'} />
                 <span className="text-[10px] leading-tight text-center">Recusar Veículo</span>
               </button>

            </div>

          </div>

          {tipoAcao && (
            <div className={`p-4 rounded-2xl text-xs font-bold border transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
              tipoAcao === 'LIBERADO' 
                ? 'bg-emerald-50/80 border-emerald-100 text-emerald-800' 
                : tipoAcao === 'PENDENCIA' 
                  ? 'bg-amber-50/80 border-amber-100 text-amber-800' 
                  : 'bg-rose-50/80 border-rose-100 text-rose-800'
            }`}>
              {tipoAcao === 'LIBERADO' && "Liberado (100% OK) - Quando o veículo está 100% e pode rodar na operação."}
              {tipoAcao === 'PENDENCIA' && "Possui Pendência - Quando o veículo teve seu problema original resolvido mas tem algum outro problema."}
              {tipoAcao === 'RECUSAR' && "Recusar Veículo - Quando o problema original não foi resolvido ou há problemas graves que precisa resolver urgente."}
            </div>
          )}

          {tipoAcao === 'LIBERADO' && (

             <div className="animate-in fade-in slide-in-from-top-4">

               <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Observações Adicionais (opcional)</label>

               <textarea placeholder="Opcional: anotações sobre a liberação..." className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none resize-none h-24 text-slate-700 border border-transparent focus:border-emerald-200" value={formData.pendencia} onChange={e=>setFormData({...formData, pendencia: e.target.value})} />

             </div>

          )}



          {tipoAcao === 'PENDENCIA' && (

             <div className="animate-in fade-in slide-in-from-top-4 space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">

                <div>

                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Defeito Principal da Pendência *</label>

                   <input type="text" placeholder="Descreva brevemente o defeito" className="w-full p-4 bg-white rounded-xl font-bold outline-none text-slate-700 border border-slate-200 focus:border-amber-400" value={formData.defeitoPrincipal} onChange={e=>setFormData({...formData, defeitoPrincipal: e.target.value})} required />

                </div>

                <div>

                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-3">Essa pendência é IMPEDITIVA para o veículo rodar? *</label>

                   <div className="grid grid-cols-2 gap-3">

                      <button type="button" onClick={() => setFormData({...formData, isImpeditivo: 'SIM'})} className={`py-3 rounded-xl font-black border-2 transition-all ${formData.isImpeditivo === 'SIM' ? 'bg-rose-100 border-rose-500 text-rose-700' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-300'}`}>SIM (Para o veículo)</button>

                      <button type="button" onClick={() => setFormData({...formData, isImpeditivo: 'NÃO'})} className={`py-3 rounded-xl font-black border-2 transition-all ${formData.isImpeditivo === 'NÃO' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300'}`}>NÃO (Roda normal)</button>

                   </div>

                </div>



                {formData.isImpeditivo === 'NÃO' && (

                   <div className="animate-in fade-in slide-in-from-top-2 pt-4 border-t border-slate-200">

                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2"><CheckSquare size={14}/> Número do Novo Chamado E-CAR *</label>

                      <p className="text-xs text-slate-500 mb-3 font-medium">Abra o chamado no E-CAR e cole o número aqui para rastreio. O veículo será liberado para rodar com atenção.</p>

                      <input type="text" placeholder="Ex: SOL-123456" className="w-full p-4 bg-white rounded-xl font-bold outline-none text-blue-950 border border-emerald-200 focus:border-emerald-500" value={formData.numeroNovoChamado} onChange={e=>setFormData({...formData, numeroNovoChamado: e.target.value})} required />

                   </div>

                )}



                {formData.isImpeditivo === 'SIM' && (

                   <div className="animate-in fade-in slide-in-from-top-2 pt-4 border-t border-slate-200 bg-rose-50 p-4 rounded-xl">

                      <p className="text-xs text-rose-600 font-bold flex items-center gap-2"><AlertTriangle size={16}/> O veículo permanecerá PARADO.</p>

                      <p className="text-xs text-rose-500 mt-1">Ao continuar, o sistema solicitará a abertura do novo chamado e fechará este atual.</p>

                   </div>

                )}

             </div>

          )}



          {tipoAcao === 'RECUSAR' && (

             <div className="animate-in fade-in slide-in-from-top-4 space-y-3 bg-rose-50/50 p-6 rounded-2xl border border-rose-100">

                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descreva o motivo da recusa do veículo *</label>

                <p className="text-xs text-slate-500 mb-3 font-medium">O veículo será recusado e o chamado atual retornará para a etapa de Análise Frota.</p>

                <textarea 
                  required 
                  placeholder="Por que o veículo não foi aceito?..." 
                  value={motivoRecusa} 
                  onChange={e => setMotivoRecusa(e.target.value.toUpperCase())}
                  className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 outline-none border border-slate-200 resize-none h-24 focus:border-rose-400" 
                />

             </div>

          )}



          <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">

            <button type="button" onClick={onClose} className="font-bold text-slate-400 hover:text-slate-600 px-4 transition-colors">Cancelar</button>



            {tipoAcao && (

              <button 

                type="submit" 

                className={`px-8 py-3.5 rounded-full font-black text-white shadow-lg transition-all active:scale-95 ${

                  tipoAcao === 'RECUSAR' 

                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' 

                    : tipoAcao === 'PENDENCIA' 

                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' 

                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'

                }`}

              >

                {tipoAcao === 'RECUSAR' ? 'Confirmar Recusa' : (tipoAcao === 'PENDENCIA' && formData.isImpeditivo === 'SIM' ? 'Fechar e Abrir Novo' : 'Confirmar Liberação')}

              </button>

            )}

          </div>

        </form>

      </div>

    </div>

  );

}



function ModalSmart({ veiculo, smartAtual, onClose, onSubmit }) {

  const [formData, setFormData] = useState(smartAtual || { codPulsus: '', telefone: '', marca: '', modelo: '' });



  return (

    <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">

      <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative">

        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500"><X size={24}/></button>

        <h3 className="text-2xl font-black mb-6 text-blue-950">{smartAtual ? 'Substituir SMART' : 'Adicionar SMART'}</h3>

        

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">

          <div>

            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Cód PULSUS *</label>

            <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.codPulsus} onChange={e => setFormData({...formData, codPulsus: e.target.value})} required />

          </div>

          <div>

            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Número Telefone *</label>

            <input type="text" placeholder="(DD) 99999-9999" className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} required />

          </div>

          <div>

            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Marca *</label>

            <input type="text" placeholder="Ex: Samsung, Motorola" className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} required />

          </div>

          <div>

            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Modelo *</label>

            <input type="text" placeholder="Ex: Galaxy A14" className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} required />

          </div>



          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">

            <button type="button" onClick={onClose} className="font-bold text-slate-400 px-4">Cancelar</button>

            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-full font-black shadow-lg">Salvar SMART</button>

          </div>

        </form>

      </div>

    </div>

  );

}



function ModalNovaEquipe({ vehicle, colaboradores, onClose, onSubmit }) {

  const defaultSegmento = vehicle?.tipoOp ? String(vehicle.tipoOp).toUpperCase() : 'LINHA VIVA';

  const defaultVeiculo = vehicle?.subTipo ? String(vehicle.subTipo).toUpperCase() : 'CESTO';



  const [formData, setFormData] = useState({ codEquipe: '', grupoFolga: 'A', tipoEquipe: 'Fixa', segmento: defaultSegmento, veiculo: defaultVeiculo, componentes: [''], documentoAnexo: null, documentoUrl: null, isUploading: false });



  const handleAddComponente = () => { if (formData.componentes.length < 3) setFormData({ ...formData, componentes: [...formData.componentes, ''] }); };

  const updateComponente = (index, val) => { const newComp = [...formData.componentes]; newComp[index] = val; setFormData({ ...formData, componentes: newComp }); };

  const removeComponente = (index) => { const newComp = formData.componentes.filter((_, i) => i !== index); setFormData({ ...formData, componentes: newComp }); };

  

  const handleFileChange = async (e) => {

    if (e.target.files && e.target.files.length > 0) {

      const file = e.target.files[0];

      setFormData(f => ({ ...f, documentoAnexo: file.name, isUploading: true }));

      

      const fileExt = file.name.split('.').pop();

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      

      const { error } = await supabase.storage.from('documentos_termo_fidelizacao').upload(fileName, file);

      if (error) {

        console.error('Upload erro:', error);

        alert('Erro ao fazer upload do arquivo.');

        setFormData(f => ({ ...f, isUploading: false, documentoAnexo: null }));

        return;

      }

      

      const { data } = supabase.storage.from('documentos_termo_fidelizacao').getPublicUrl(fileName);

      setFormData(f => ({ ...f, documentoAnexo: file.name, documentoUrl: data.publicUrl, isUploading: false }));

    }

  };



  const handleSubmit = (e) => { e.preventDefault(); if(!formData.codEquipe) return; onSubmit({ ...formData, componentes: formData.componentes.filter(c => c !== '') }); };

  const ativos = colaboradores.filter(c => c.statusForca?.toUpperCase().includes('ATIVO'));

  const ativosOptions = ativos.sort((a,b) => a.nome.localeCompare(b.nome)).map(c => ({ value: String(c.matricula || c.id), label: `${c.nome} - ${c.funcao} (${c.matricula})` }));



  return (

    <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">

      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"><h3 className="text-xl font-black text-blue-950">Nova Equipe Fidelizada</h3><button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button></div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">

          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Código da Equipe</label><input type="text" placeholder="Ex: ENL100" className="w-full p-4 bg-slate-50 rounded-2xl outline-none uppercase font-black text-emerald-600" value={formData.codEquipe} onChange={e => setFormData({...formData, codEquipe: e.target.value})} required /></div>

          <div className="grid grid-cols-2 gap-4">

            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Grupo Folga</label><select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.grupoFolga} onChange={e => setFormData({...formData, grupoFolga: e.target.value})}><option>A</option><option>B</option><option>C</option></select></div>

            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Tipo</label><select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.tipoEquipe} onChange={e => setFormData({...formData, tipoEquipe: e.target.value})}><option>Fixa</option><option>Folguista</option></select></div>

            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Segmento (Automático)</label><input className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-slate-500 cursor-not-allowed uppercase" value={formData.segmento} disabled /></div>

            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Veículo (Automático)</label><input className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-slate-500 cursor-not-allowed uppercase" value={formData.veiculo} disabled /></div>

          </div>

          

          <div className="pt-4 border-t border-slate-100">

             <div className="flex justify-between items-center mb-3">

                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Componentes ({formData.componentes.length}/3)</label>

                {formData.componentes.length < 3 && <button type="button" onClick={handleAddComponente} className="text-xs text-emerald-600 font-bold hover:bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1"><Plus size={14}/> Adicionar</button>}

             </div>

             <div className="space-y-3">

               {formData.componentes.map((comp, idx) => (

                 <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">

                   <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">{idx + 1}</div>

                   <SearchableSelect

                     className="flex-1 w-full bg-transparent text-sm outline-none font-bold text-slate-700"

                     placeholder="Buscar colaborador (Nome, Matrícula)..."

                     options={ativosOptions}

                     value={String(comp)}

                     onChange={val => updateComponente(idx, val)}

                   />

                   {formData.componentes.length > 1 && <button type="button" onClick={() => removeComponente(idx)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={18}/></button>}

                 </div>

               ))}

             </div>

          </div>



          <div className="pt-4 border-t border-slate-100">

            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Termo de Assinatura (PDF)</label>

            <div className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-colors relative">

              <Upload size={24} className="text-slate-400 mb-2" />

              <span className="text-sm font-bold text-slate-500">{formData.isUploading ? 'Enviando arquivo...' : (formData.documentoAnexo ? formData.documentoAnexo : 'Clique ou arraste o PDF aqui')}</span>

              <input type="file" accept=".pdf" disabled={formData.isUploading} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" onChange={handleFileChange} />

            </div>

          </div>



          <div className="pt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-6 py-3 rounded-full text-slate-500 font-bold hover:bg-slate-50">Cancelar</button><button type="submit" disabled={formData.isUploading} className="px-8 py-3 rounded-full bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">Salvar Equipe</button></div>

        </form>

      </div>

    </div>

  );

}







// ==========================================

// COMPONENTES AUXILIARES E UI

// ==========================================

function KPICard({ title, value, subtitle, icon, colorClass, textColor, onClickChart }) {

  const smallerIcon = React.isValidElement(icon) ? React.cloneElement(icon, { size: 24 }) : icon;

  

  return (

    <div className={`rounded-[2rem] p-8 border ${colorClass} transition-all hover:-translate-y-1 hover:shadow-lg duration-300 relative overflow-hidden group flex flex-col justify-between min-h-[190px]`}>

      <div className="absolute -right-4 -top-4 opacity-[0.03] rotate-12 scale-150 text-slate-500 pointer-events-none">

        {icon}

      </div>

      

      <div className="flex justify-between items-start relative z-10 gap-4">

        <div className="min-w-0 flex-1">

          <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2 truncate">{title}</p>

          <h3 className={`text-3xl xl:text-4xl font-black ${textColor} tracking-tight break-words leading-none`}>

            {value}

          </h3>

        </div>

        <div className="flex flex-col gap-3 items-end shrink-0">

          <div className="p-3 bg-slate-50 rounded-xl shadow-sm border border-slate-100/80">

            {smallerIcon}

          </div>

          {onClickChart && (

            <button 

              onClick={onClickChart} 

              className="p-2.5 bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100" 

              title="Ver Gráfico Evolutivo"

            >

              <BarChart3 size={18}/>

            </button>

          )}

        </div>

      </div>

      

      <div className="border-t border-slate-100/60 pt-4 mt-auto relative z-10">

        <p className="text-sm text-slate-400 font-bold">{subtitle}</p>

      </div>

    </div>

  );

}

function StatusBadge({ status }) { return (<span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${status === 'RODANDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{status}</span>); }









function SearchableSelect({ value, onChange, options, placeholder, className }) {

  const [query, setQuery] = React.useState('');

  const [isOpen, setIsOpen] = React.useState(false);

  const wrapperRef = React.useRef(null);



  React.useEffect(() => {

    const selected = options.find(o => o.value === value);

    if (selected) setQuery(selected.label);

    else setQuery('');

  }, [value, options]);



  React.useEffect(() => {

    function handleClickOutside(event) {

      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);

    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, [wrapperRef]);



  const filteredOptions = (query === '' || options.find(o => o.value === value)?.label === query)

    ? options 

    : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || o.value.toLowerCase().includes(query.toLowerCase()));



  return (

    <div ref={wrapperRef} className="relative w-full">

      <input

        type="text"

        className={className}

        placeholder={placeholder}

        value={query}

        onClick={() => setIsOpen(true)}

        onChange={(e) => {

          setQuery(e.target.value);

          setIsOpen(true);

          if (e.target.value === '') onChange('');

        }}

      />

      {isOpen && (

        <ul className="absolute z-50 w-full bg-white mt-1 rounded-xl shadow-2xl border border-slate-200 max-h-48 overflow-y-auto">

          {filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => (

            <li 

              key={`${opt.value}-${idx}`} 

              className="p-3 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer border-b border-slate-50 last:border-0 break-words whitespace-normal"

              onClick={() => {

                onChange(opt.value);

                setQuery(opt.label);

                setIsOpen(false);

              }}

            >

              {opt.label}

            </li>

          )) : <li className="p-3 text-xs text-slate-400">Nenhum resultado...</li>}

        </ul>

      )}

    </div>

  );

}



function ModalConstrutorEquipe({ isOpen, onClose, forcaDeTrabalho, setForcaDeTrabalho, vinculosEquipe, setVinculosEquipe, equipeEmEdicao }) {

  if (!isOpen) return null;



  const [codigoEquipe, setCodigoEquipe] = React.useState('');

  const [segmento, setSegmento] = React.useState('TMA'); // TMA, LINHA VIVA

  const [subSegmento, setSubSegmento] = React.useState('CESTO'); // CESTO, LEVE, MOTO

  const [grupoFolga, setGrupoFolga] = React.useState('');

  const [componentes, setComponentes] = React.useState([{ matricula: '' }, { matricula: '' }]);

  const [erro, setErro] = React.useState('');



  // Auto load data if editing

  React.useEffect(() => {

    if (equipeEmEdicao && isOpen) {

      setCodigoEquipe(equipeEmEdicao);

      const membros = forcaDeTrabalho.filter(f => f.equipe === equipeEmEdicao);

      if (membros.length > 0) {

        setGrupoFolga(membros[0].grupoFolga);

        // Guess segment from components

        if (membros.some(m => m.funcao.includes('LINHA VIVA'))) setSegmento('LINHA VIVA');

        else setSegmento('TMA');

        

        if (membros.some(m => m.funcao.includes('MOTOCICLISTA'))) setSubSegmento('MOTO');

        else if (membros.length === 2 && membros.every(m => m.funcao.includes('CORTE E RELIGA'))) setSubSegmento('LEVE');

        else setSubSegmento('CESTO');

        

        const comps = membros.map(m => ({ matricula: m.matricula }));

        if (comps.length < 2) comps.push({ matricula: '' }); // Force min 2

        setComponentes(comps);

      }

    } else if (isOpen) {

      setCodigoEquipe(''); setSegmento('TMA'); setSubSegmento('CESTO'); setGrupoFolga('');

      setComponentes([{ matricula: '' }, { matricula: '' }]); setErro('');

    }

  }, [equipeEmEdicao, isOpen, forcaDeTrabalho]);



  // Adjust subSegmento based on Segmento

  React.useEffect(() => {

    if (segmento === 'LINHA VIVA' && subSegmento !== 'CESTO' && subSegmento !== 'MUNK') setSubSegmento('CESTO');

    if (segmento === 'TMA' && subSegmento === 'MUNK') setSubSegmento('CESTO');

  }, [segmento]);



  const numSlots = (segmento === 'TMA' && subSegmento === 'LEVE') || (segmento === 'TMA' && subSegmento === 'MOTO') ? 2 : 3;



  // Real-time Warning

  const codigoEmUso = codigoEquipe.trim() && forcaDeTrabalho.some(f => f.equipe === codigoEquipe && f.equipe !== 'Sobra' && f.equipe !== '--' && f.equipe !== equipeEmEdicao);



  const handleComponenteChange = (index, matricula) => {

    const newComps = [...componentes];

    newComps[index] = { matricula };

    setComponentes(newComps);

    

    // Auto-set grupoFolga or clear if all slots empty

    const ativos = newComps.map(c => c.matricula).filter(Boolean);

    if (ativos.length === 0) {

      setGrupoFolga('');

    } else if (matricula && !grupoFolga) {

      const colab = forcaDeTrabalho.find(f => f.matricula === matricula);

      if (colab) setGrupoFolga(colab.grupoFolga);

    }

  };



  const getColabsDisponiveis = (index) => {

    return forcaDeTrabalho.filter(c => {

      // Must not be in another team (unless we are editing and they are in our team)

      if (c.equipe && c.equipe !== 'Sobra' && c.equipe !== '--' && c.equipe !== equipeEmEdicao) return false;

      // Must not be already selected in another slot

      if (componentes.some((comp, idx) => idx !== index && comp.matricula === c.matricula)) return false;

      // If group is set, must match group

      if (grupoFolga && c.grupoFolga !== grupoFolga) return false;

      return true;

    }).map(c => ({ value: c.matricula, label: `${c.nome} - ${c.funcao} (CNH: ${c.cnh})` }));

  };



  const validarEquipe = () => {

    setErro('');

    if (!codigoEquipe.trim()) return 'Informe o código da equipe.';

    if (codigoEmUso) return 'O Código da equipe já está em uso.';



    const selectedComps = componentes.map(c => forcaDeTrabalho.find(f => f.matricula === c.matricula)).filter(Boolean);

    if (selectedComps.length < 2) return 'A equipe precisa ter no mínimo 2 componentes.';



    // Rule: Cesto ou Munk

    if (subSegmento === 'CESTO' || subSegmento === 'MUNK') {

      const temCNH = selectedComps.some(c => ['D', 'E', 'AD', 'AE', 'CATEG. D', 'CATEG. E', 'CATEG. AD', 'CATEG. AE'].includes(c.cnh));

      if (!temCNH) return 'Pelo menos um componente deve possuir CNH D, E, AD ou AE para dirigir o Cesto.';



      const temCorteReliga = selectedComps.some(c => c.funcao.includes('CORTE E RELIGA'));

      if (temCorteReliga) return 'Não é permitido montar equipe com colaboradores ELET CORTE E RELIGA no CESTO (Somente LEVE).';



      if (segmento === 'TMA') {

        const temTMAII = selectedComps.some(c => c.funcao === 'ELET TMA II');

        if (!temTMAII) return 'Equipes TMA Cesto exigem no mínimo um ELET TMA II.';

      } else if (segmento === 'LINHA VIVA') {

        const encarregado = selectedComps.some(c => c.funcao.includes('ENC LINHA VIVA'));

        const eletricista = selectedComps.some(c => c.funcao.includes('ELET LINHA VIVA'));

        const doisEletII = selectedComps.filter(c => c.funcao === 'ELET LINHA VIVA II').length >= 2;

        if (!(encarregado && eletricista) && !doisEletII) return 'Equipes Linha Viva exigem 1 Elet + 1 Enc, ou 2 Elet LV II.';

      }

    }



    // Rule: TMA Leve

    if (segmento === 'TMA' && subSegmento === 'LEVE') {

      if (selectedComps.length !== 2) return 'Equipes Leves exigem exatamente 2 componentes.';

      const ambosCorte = selectedComps.every(c => c.funcao.includes('CORTE E RELIGA'));

      const ambosTMA = selectedComps.every(c => c.funcao.includes('ELET TMA'));

      const umTMAII = selectedComps.some(c => c.funcao === 'ELET TMA II');

      if (!ambosCorte && !(ambosTMA && umTMAII)) return 'Equipe Leve exige 2 Corte/Religa ou 2 TMA (sendo 1 TMA II).';

    }



    // Rule: TMA Moto

    if (segmento === 'TMA' && subSegmento === 'MOTO') {

      if (selectedComps.length !== 2) return 'Equipes de Moto exigem exatamente 2 componentes.';

      const temMotoI = selectedComps.some(c => c.funcao === 'ELET MOTOCICLISTA I');

      const temMotoII = selectedComps.some(c => c.funcao === 'ELET MOTOCICLISTA II');

      if (!temMotoI || !temMotoII) return 'Equipe Moto exige 1 ELET MOTOCICLISTA I e 1 ELET MOTOCICLISTA II.';

      const cnhOk = selectedComps.every(c => c.cnh.includes('A'));

      if (!cnhOk) return 'Ambos componentes precisam de CNH A ou AB.';

    }



    return null;

  };



  const handleSalvar = async () => {

    const validationError = validarEquipe();

    if (validationError) {

      setErro(validationError);

      return;

    }



    const selectedMats = componentes.map(c => c.matricula).filter(Boolean);

    const modifiedColabs = [];

    const newData = forcaDeTrabalho.map(f => {

      if (f.equipe === equipeEmEdicao) {

        f.equipe = 'Sobra';

        modifiedColabs.push(f);

      }

      if (selectedMats.includes(f.matricula)) {

        f.equipe = codigoEquipe;

        modifiedColabs.push(f);

      }

      return f;

    });



    setForcaDeTrabalho([...newData]);

    // Gravar no Supabase a alteração da equipe nos colaboradores via UPDATE cirúrgico

    if (modifiedColabs.length > 0) {

      const updates = modifiedColabs.map(f => supabase.from('colaboradores').update({ equipe: f.equipe }).eq('id', f.id));

      Promise.all(updates).then(results => {

        const hasError = results.some(r => r.error);

        if (hasError) {

           console.error('Erro ao atualizar colabs no banco:', results);

           alert('Falha ao salvar no banco de dados! Por favor, atualize a página e tente novamente.');

        }

      });

    }

    

    // Configura vínculo se for novo ou mudou nome

    if (codigoEquipe !== equipeEmEdicao) {

       const oldVinc = vinculosEquipe[equipeEmEdicao] || { placa: '', telefone: '', placas: [] };

       const newVinculos = { ...vinculosEquipe };

       delete newVinculos[equipeEmEdicao];

       setVinculosEquipe({ ...newVinculos, [codigoEquipe]: oldVinc });

       

       if (equipeEmEdicao) supabase.from('vinculos_equipe').delete().eq('codEquipe', equipeEmEdicao);

       supabase.from('vinculos_equipe').upsert({ codEquipe: codigoEquipe, dados: oldVinc });



    } else if (!vinculosEquipe[codigoEquipe]) {

      const newVinc = { placa: '', telefone: '', placas: [] };

      setVinculosEquipe(prev => ({ ...prev, [codigoEquipe]: newVinc }));

      supabase.from('vinculos_equipe').upsert({ codEquipe: codigoEquipe, dados: newVinc });

    }



    onClose();

  };



  return (

    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">

      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="px-8 py-6 bg-blue-950 flex justify-between items-center text-white shrink-0">

          <h2 className="text-xl font-black">{equipeEmEdicao ? 'Editar Equipe' : 'Montar Nova Equipe'}</h2>

          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>

        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-6">

          {erro && <div className="bg-rose-100 text-rose-700 p-4 rounded-xl font-bold text-sm animate-in zoom-in-95">{erro}</div>}



          <div className="grid grid-cols-2 gap-4">

             <div>

                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">CÓDIGO DA EQUIPE (Ex: EML101)</label>

                <input type="text" value={codigoEquipe} onChange={e => setCodigoEquipe(e.target.value.toUpperCase())} className={`w-full p-3 bg-slate-100 rounded-xl font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 ${codigoEmUso ? 'border-2 border-rose-500 text-rose-600' : 'border border-slate-200'}`} placeholder="Código..." />

                {codigoEmUso && <p className="text-xs text-rose-500 font-bold mt-1">â ï¸ Código já em uso.</p>}

             </div>

             <div>

                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Segmento</label>

                <select value={segmento} onChange={e => setSegmento(e.target.value)} className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-200">

                  <option value="TMA">TMA</option>

                  <option value="LINHA VIVA">LINHA VIVA</option>

                </select>

             </div>

          </div>



          <div>

             <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tipo de Veículo</label>

             <div className="flex gap-4">

               {(segmento === 'LINHA VIVA' ? ['CESTO', 'MUNK'] : ['CESTO', 'LEVE', 'MOTO']).map(t => (

                 <button key={t} onClick={() => setSubSegmento(t)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-colors ${subSegmento === t ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'}`}>{t}</button>

               ))}

             </div>

          </div>



          <div className="space-y-4">

             <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">

               Componentes 

               {grupoFolga && <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">Trava de Folga: GRUPO {grupoFolga}</span>}

               {!grupoFolga && <span className="text-[10px] font-bold text-slate-400">Nenhum grupo definido</span>}

             </label>

             {[...Array(numSlots)].map((_, i) => (

                <div key={i} className="flex gap-3 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">

                  <div className="w-8 h-8 rounded-full bg-blue-950 text-white flex items-center justify-center font-black text-xs shrink-0">{i+1}</div>

                  <SearchableSelect

                     className="w-full p-2 bg-transparent text-sm font-bold text-blue-950 outline-none"

                     placeholder="Digite para buscar colaborador..."

                     options={getColabsDisponiveis(i)}

                     value={componentes[i]?.matricula || ''}

                     onChange={(val) => handleComponenteChange(i, val)}

                  />

                  {componentes[i]?.matricula && (

                    <button onClick={() => handleComponenteChange(i, '')} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><X size={16}/></button>

                  )}

                </div>

             ))}

          </div>

        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">

          <button onClick={onClose} className="px-6 py-3 rounded-full font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>

          <button onClick={handleSalvar} disabled={codigoEmUso} className="px-8 py-3 rounded-full font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Salvar Equipe</button>

        </div>
      </div>
    </div>
  );
}



function ForcaDeTrabalhoView({ forcaDeTrabalho, vehicles, vinculosEquipe, setVinculosEquipe, setForcaDeTrabalho, userPermissions }) {

  const [modalOpen, setModalOpen] = React.useState(false);

  const [equipeEdicao, setEquipeEdicao] = React.useState(null);



  // Filtros

  const [filterTurno, setFilterTurno] = React.useState('');

  const [filterTipo, setFilterTipo] = React.useState('');

  const [filterGrupo, setFilterGrupo] = React.useState('');

  const [searchTerm, setSearchTerm] = React.useState('');



  const equipesMap = {};

  forcaDeTrabalho.forEach(colab => {

    if (!colab.equipe || colab.equipe === 'Sobra' || colab.equipe === '--') return;

    if (!equipesMap[colab.equipe]) equipesMap[colab.equipe] = [];

    equipesMap[colab.equipe].push(colab);

  });

  

  let equipeEntries = Object.entries(equipesMap).sort((a,b) => a[0].localeCompare(b[0]));

  const totaisEquipes = equipeEntries.length;



  // Filtragem

  equipeEntries = equipeEntries.filter(([codEquipe, membros]) => {

    const vinculo = vinculosEquipe[codEquipe] || {};

    const veiculoPrincipal = vehicles.find(v => v.placa === vinculo.placas?.[0] || v.placa === vinculo.placa);

    

    if (filterTurno && !membros.some(m => m.turno.includes(filterTurno))) return false;

    if (filterGrupo && !membros.some(m => m.grupoFolga === filterGrupo)) return false;



    if (filterTipo) {

      if (!veiculoPrincipal) return false;

      const t = String(veiculoPrincipal.tipo).toUpperCase();

      const st = String(veiculoPrincipal.subTipo || '').toUpperCase();

      const f = String(filterTipo).toUpperCase();

      if (!t.includes(f) && !st.includes(f) && !(f === 'CESTO' && st.includes('CESTO'))) return false;

    }



    if (searchTerm) {

      const term = searchTerm.toLowerCase();

      const matchEquipe = codEquipe.toLowerCase().includes(term);

      const matchPlaca = vinculo.placas?.some(p => p.toLowerCase().includes(term)) || (vinculo.placa && vinculo.placa.toLowerCase().includes(term));

      const matchColab = membros.some(m => m.nome.toLowerCase().includes(term) || String(m.matricula).toLowerCase().includes(term));

      

      if (!matchEquipe && !matchPlaca && !matchColab) return false;

    }



    return true;

  });



  const totaisEquipesFiltradas = equipeEntries.length;

  let totaisPessoasFiltradas = 0;

  

  let cestoCount = 0; let leveCount = 0; let motoCount = 0;

  equipeEntries.forEach(([codEquipe, membros]) => {

    totaisPessoasFiltradas += membros.length;

    if (membros.some(m => m.funcao.includes('MOTOCICLISTA'))) motoCount++;

    else if (membros.length === 2 && membros.every(m => m.funcao.includes('CORTE E RELIGA'))) leveCount++;

    else cestoCount++; // Generalization for dashboard

  });



  const handleHorarioChange = (equipe, horario) => {

    const newVinc = { ...(vinculosEquipe[equipe] || {}), horario };

    setVinculosEquipe({ ...vinculosEquipe, [equipe]: newVinc });

    supabase.from('vinculos_equipe').upsert({ codEquipe: equipe, dados: newVinc }).then(({ error }) => { if(error) console.error(error) });

  };





  const handlePlacaChange = (equipe, placa, index = 0) => {

    const vinculo = vinculosEquipe[equipe] || { placas: [] };

    const novasPlacas = [...(vinculo.placas || [])];

    novasPlacas[index] = placa;

    const newVinc = { ...vinculo, placa: novasPlacas[0], placas: novasPlacas };

    setVinculosEquipe({ ...vinculosEquipe, [equipe]: newVinc });

    supabase.from('vinculos_equipe').upsert({ codEquipe: equipe, dados: newVinc });

  };



  const handleTelefoneChange = (equipe, telefone) => {

    const newVinc = { ...(vinculosEquipe[equipe] || {}), telefone };

    setVinculosEquipe({ ...vinculosEquipe, [equipe]: newVinc });

    supabase.from('vinculos_equipe').upsert({ codEquipe: equipe, dados: newVinc });

  };



  const handleRemoverEquipe = (equipeId) => {

    if(confirm('Tem certeza que deseja dissolver esta equipe? Os componentes voltarão para a Sobra.')) {

      setForcaDeTrabalho(forcaDeTrabalho.map(f => f.equipe === equipeId ? { ...f, equipe: 'Sobra' } : f));

      const novosVinc = {...vinculosEquipe}; delete novosVinc[equipeId];

      setVinculosEquipe(novosVinc);

      

      supabase.from('vinculos_equipe').delete().eq('codEquipe', equipeId).then();

      

      // Atualizar no Supabase

      const modifiedColabs = forcaDeTrabalho.filter(f => f.equipe === equipeId).map(f => ({ ...f, equipe: 'Sobra' }));

      if (modifiedColabs.length > 0) {

        supabase.from('colaboradores').upsert(modifiedColabs).then();

      }

    }

  };



  const vehicleOptions = vehicles.map(v => ({ value: v.placa, label: v.placa }));



  return (

    <div className="max-w-full mx-auto animate-in fade-in duration-300">

      

      {/* KPI DASHBOARD SUPERIOR */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

         <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">

            <div>

              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Efetivo Base</p>

              <h3 className="text-3xl font-black text-blue-950">{totaisPessoasFiltradas} <span className="text-sm text-emerald-500 font-bold">Na Escala</span></h3>

            </div>

            <div className="p-4 bg-blue-50 text-blue-950 rounded-2xl"><Users size={28}/></div>

         </div>

         <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">

            <div>

              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Equipes</p>

              <h3 className="text-3xl font-black text-emerald-600">{totaisEquipesFiltradas} <span className="text-sm text-slate-400 font-bold">filtradas</span></h3>

            </div>

            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Briefcase size={28}/></div>

         </div>

         <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center">

            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Composição por Tipo</p>

            <div className="flex gap-4">

              <div className="flex-1 text-center bg-slate-50 rounded-xl py-1"><span className="text-xs font-black text-slate-700">{cestoCount} Cesto</span></div>

              <div className="flex-1 text-center bg-slate-50 rounded-xl py-1"><span className="text-xs font-black text-slate-700">{leveCount} Leve</span></div>

              <div className="flex-1 text-center bg-slate-50 rounded-xl py-1"><span className="text-xs font-black text-slate-700">{motoCount} Moto</span></div>

            </div>

         </div>

         <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">

             <button onClick={() => { setEquipeEdicao(null); setModalOpen(true); }} className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-200">

               <Plus size={20} /> Montar Equipe

             </button>

         </div>

      </div>



      {/* FILTROS */}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center">

         <div className="text-slate-400 p-2"><Filter size={20}/></div>

         <select value={filterTurno} onChange={e => setFilterTurno(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 outline-none w-48 shrink-0">

           <option value="">Todos os Turnos</option>

           <option value="MANHÃ">Manhã</option>

           <option value="TARDE">Tarde</option>

           <option value="NOITE">Noite</option>

         </select>

         <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 outline-none w-48 shrink-0">

           <option value="">Todos os Veículos</option>

           <option value="Cesto">Cesto Aéreo</option>

           <option value="Munk">Munk</option>

           <option value="Leve">Leve</option>

           <option value="Moto">Moto</option>

         </select>

         <input type="text" placeholder="Filtrar por Grupo (Ex: A)" value={filterGrupo} onChange={e => setFilterGrupo(e.target.value.toUpperCase())} className="p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 outline-none w-48 shrink-0" />

         

         <div className="flex-1 min-w-[250px] relative">

            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

            <input type="text" placeholder="Buscar por colaborador, equipe, matrícula ou placa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" />

         </div>

      </div>



      <div className="bg-white shadow-xl rounded-[1.5rem] border border-emerald-50 overflow-hidden">

        <div className="overflow-x-auto w-full">

          <table className="w-full text-xs text-left border-collapse border border-slate-200 min-w-[1400px]">

            <thead>

              <tr className="bg-blue-950 text-white font-black text-[10px] uppercase tracking-wider text-center border-b-2 border-emerald-500">

                <th className="p-3 border-r border-slate-700 w-24">Ações</th>

                <th className="p-3 border-r border-slate-700 w-16">Turno</th><th className="p-3 border-r border-slate-700 w-24">Horário</th>

                <th className="p-3 border-r border-slate-700 w-24">Código</th>

                <th className="p-3 border-r border-slate-700 w-40">Placa(s)</th>

                <th className="p-3 border-r border-slate-700 w-32">Tipo Veículo</th>

                <th className="p-3 border-r border-slate-700 w-24">Câmera</th>

                <th className="p-3 border-r border-slate-700 w-32">Telefone</th>

                <th className="p-3 border-r border-slate-700 text-left min-w-[200px]">Componentes</th>

                <th className="p-3 border-r border-slate-700">Matrícula</th>

                <th className="p-3 border-r border-slate-700 text-left">Função</th>

                <th className="p-3 border-r border-slate-700">Cat. CNH</th>

                <th className="p-3 border-r border-slate-700">Grupo</th>

              </tr>

            </thead>

            <tbody className="bg-white">

              {equipeEntries.map(([codEquipe, membros], idx) => {

                const vinculo = vinculosEquipe[codEquipe] || { placas: [] };

                const isMoto = membros.some(m => m.funcao.includes('MOTOCICLISTA'));

                const veiculoPrincipal = vehicles.find(v => v.placa === vinculo.placas?.[0] || v.placa === vinculo.placa);

                

                const isEven = idx % 2 === 0;

                const bgClass = isEven ? 'bg-slate-50' : 'bg-white';

                

                return membros.map((membro, mIdx) => (

                  <tr key={membro.matricula} className={`${bgClass} border-b border-slate-200 hover:bg-emerald-50/50 transition-colors`}>

                    {mIdx === 0 && (

                      <>

                        <td rowSpan={membros.length} className="p-2 border-r border-slate-200 text-center align-middle">

                          <div className="flex gap-1 justify-center">

                            <button onClick={() => { setEquipeEdicao(codEquipe); setModalOpen(true); }} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg" title="Editar Equipe"><Edit size={16}/></button>

                            <button onClick={() => handleRemoverEquipe(codEquipe)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg" title="Dissolver Equipe"><Trash2 size={16}/></button>

                          </div>

                        </td>

                        <td rowSpan={membros.length} className="p-2 border-r border-slate-200 text-center font-black text-blue-950 align-middle">

      <div className="bg-blue-950 text-white rounded-lg py-1 px-2 text-[10px] whitespace-nowrap">{membro.turno.split(' - ')[1] || membro.turno}</div>

   </td>

   <td rowSpan={membros.length} className="p-2 border-r border-slate-200 align-middle">

      <input type="time" className="w-full p-2 bg-white rounded-lg text-xs font-bold text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" value={vinculo.horario || ''} onChange={e => handleHorarioChange(codEquipe, e.target.value)} />

   </td>

                        <td rowSpan={membros.length} className="p-2 border-r border-slate-200 text-center font-black text-slate-800 align-middle text-sm">{String(codEquipe).toUpperCase()}</td>

                        <td rowSpan={membros.length} className="p-2 border-r border-slate-200 align-middle space-y-2 relative overflow-visible">

                           <SearchableSelect 

                             options={vehicleOptions} 

                             value={vinculo.placas?.[0] || vinculo.placa || ''} 

                             onChange={val => handlePlacaChange(codEquipe, val, 0)} 

                             className="w-full p-2 bg-white rounded-lg text-xs font-bold text-blue-950 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"

                             placeholder="Placa 1..." 

                           />

                           {isMoto && (

                             <SearchableSelect 

                               options={vehicleOptions} 

                               value={vinculo.placas?.[1] || ''} 

                               onChange={val => handlePlacaChange(codEquipe, val, 1)} 

                               className="w-full p-2 bg-white rounded-lg text-xs font-bold text-blue-950 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm mt-2"

                               placeholder="Placa 2..." 

                             />

                           )}

                        </td>

                        <td rowSpan={membros.length} className="p-2 border-r border-slate-200 text-center font-bold text-slate-600 align-middle">

                           {veiculoPrincipal ? `${veiculoPrincipal.tipo} / ${veiculoPrincipal.subTipo}` : '-'}

                        </td>

                        <td rowSpan={membros.length} className="p-2 border-r border-slate-200 text-center align-middle">

                           <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">CAMERA FIXA</span>

                        </td>

                        <td rowSpan={membros.length} className="p-2 border-r border-slate-200 align-middle">

                           <input type="text" placeholder="(11) 90000-0000" className="w-full p-2 bg-white rounded-lg text-xs font-bold text-slate-700 border border-slate-200 outline-none" value={vinculo.telefone || ''} onChange={e => handleTelefoneChange(codEquipe, e.target.value)} />

                        </td>

                      </>

                    )}

                    <td className="p-2 border-r border-slate-200 font-bold text-blue-950 uppercase">{membro.nome}</td>

                    <td className="p-2 border-r border-slate-200 text-center text-slate-600 font-medium">{membro.matricula}</td>

                    <td className="p-2 border-r border-slate-200 font-bold text-slate-700 uppercase text-[9px]">{membro.funcao}</td>

                    <td className={`p-2 border-r border-slate-200 text-center font-black text-[10px] ${membro.cnh && membro.cnh !== 'NP' ? 'text-orange-600' : 'text-slate-400'}`}>{membro.cnh}</td>

                    <td className="p-2 border-r border-slate-200 text-center font-bold bg-orange-100/50 text-orange-800">{membro.grupoFolga}</td>

                  </tr>

                ))

              })}

            </tbody>

          </table>

        </div>

      </div>



      <ModalConstrutorEquipe isOpen={modalOpen} onClose={() => setModalOpen(false)} forcaDeTrabalho={forcaDeTrabalho} setForcaDeTrabalho={setForcaDeTrabalho} vinculosEquipe={vinculosEquipe} setVinculosEquipe={setVinculosEquipe} equipeEmEdicao={equipeEdicao} />

    </div>

  )

}

function ModalGraficosDashboard({ chartType, vehicles, chamados, hoje, onClose }) {



  const [filterDataInicio, setFilterDataInicio] = useState('');

  const [filterDataFim, setFilterDataFim] = useState('');

  const [filterTurno, setFilterTurno] = useState('');

  const [filterTipo, setFilterTipo] = useState('');



  const chamadosFiltrados = chamados.filter(c => {

    const v = vehiclesMap.get(c.placa);

    const dAberta = new Date(c.dataAbertura);

    const matchDataInicio = filterDataInicio ? dAberta >= new Date(filterDataInicio + 'T00:00:00') : true;

    const matchDataFim = filterDataFim ? dAberta <= new Date(filterDataFim + 'T23:59:59') : true;

    const matchTurno = filterTurno ? v?.turno === filterTurno : true;

    const matchTipo = filterTipo ? v?.tipo === filterTipo : true;

    return matchDataInicio && matchDataFim && matchTurno && matchTipo;

  });



  const getChartTitle = () => {

    if (chartType === 'parados') return 'Evolução de Veículos Parados vs Liberados';

    if (chartType === 'horas') return 'Evolução de Horas Paradas';

    if (chartType === 'prejuizo') return 'Evolução de Prejuízo (R$)';

    if (chartType === 'fidelizacao') return 'Evolução de Fidelização Diária';

    return 'Gráfico Evolutivo';

  };



  let chartData = [];

  if (chartType === 'parados') {

    const dataMap = {};

    chamadosFiltrados.forEach(c => {

      const dAberta = new Date(c.dataAbertura).toISOString().split('T')[0];

      if(!dataMap[dAberta]) dataMap[dAberta] = { date: dAberta, parados: 0, liberados: 0 };

      dataMap[dAberta].parados++;

      if (c.dataHoraFechamento) {

        const dFechada = new Date(c.dataHoraFechamento).toISOString().split('T')[0];

        if(!dataMap[dFechada]) dataMap[dFechada] = { date: dFechada, parados: 0, liberados: 0 };

        dataMap[dFechada].liberados++;

      }

    });

    chartData = Object.values(dataMap).sort((a,b) => a.date.localeCompare(b.date));

  } else if (chartType === 'horas' || chartType === 'prejuizo') {

    const dates = [];

    const end = filterDataFim ? new Date(filterDataFim + 'T23:59:59') : new Date(hoje);

    let start = filterDataInicio ? new Date(filterDataInicio + 'T00:00:00') : null;

    

    if (!start) {

      const aberturas = chamadosFiltrados.filter(c => c.situacaoVeiculo === 'PARADO').map(c => new Date(c.dataAbertura).getTime());

      if (aberturas.length > 0) {

        start = new Date(Math.min(...aberturas));

      } else {

        start = new Date(end);

        start.setDate(start.getDate() - 30);

      }

    }

    

    if ((end - start) / (1000 * 60 * 60 * 24) > 90) {

      start = new Date(end);

      start.setDate(start.getDate() - 90);

    }



    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {

       const dateStr = d.toISOString().split('T')[0];

       const dateEnd = new Date(dateStr + 'T23:59:59');

       

       let totalHoras = 0;

       let totalPrejuizo = 0;

       

       chamadosFiltrados.forEach(c => {

         const dAbert = new Date(c.dataAbertura);

         if (dAbert <= dateEnd && c.situacaoVeiculo === 'PARADO') {

            const v = vehiclesMap.get(c.placa);

            let dFechamento = c.dataHoraFechamento ? new Date(c.dataHoraFechamento) : dateEnd;

            if (dFechamento > dateEnd) dFechamento = dateEnd; 

            

            const horas = calcularHorasParadas(dAbert, dFechamento);

            totalHoras += horas;

            totalPrejuizo += (getValorHora(v) * 8) * (horas / 24);

         }

       });

       

       dates.push({ date: dateStr, horas: Number(totalHoras.toFixed(1)), prejuizo: Number(totalPrejuizo.toFixed(2)) });

    }

    chartData = dates;

  } else if (chartType === 'fidelizacao') {

    const veiculosFiltrados = vehicles.filter(v => {

      const matchTurno = filterTurno ? v.turno === filterTurno : true;

      const matchTipo = filterTipo ? v.tipo === filterTipo : true;

      return matchTurno && matchTipo;

    });

    const currentFidelizados = veiculosFiltrados.filter(v => v.equipes && v.equipes.length > 0).length;

    for (let i = 6; i >= 0; i--) {

       const d = new Date(hoje);

       d.setDate(d.getDate() - i);

       const mockVal = Math.max(0, currentFidelizados - Math.floor(Math.random() * 3));

       chartData.push({ date: d.toISOString().split('T')[0], fidelizados: i === 0 ? currentFidelizados : mockVal });

    }

  }



  const renderChart = () => {

    if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-slate-400 font-bold">Sem dados no período.</div>;

    if (chartType === 'parados') {

      return (

        <ResponsiveContainer width="100%" height={300}>

          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>

            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} />

            <YAxis tick={{fontSize: 12, fill: '#64748b'}} allowDecimals={false} />

            <RechartsTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} />

            <Legend wrapperStyle={{paddingTop: '20px'}} />

            <Bar dataKey="parados" name="Parados" fill="#f43f5e" radius={[4, 4, 0, 0]} />

            <Bar dataKey="liberados" name="Liberados" fill="#10b981" radius={[4, 4, 0, 0]} />

          </BarChart>

        </ResponsiveContainer>

      );

    }

    if (chartType === 'horas') {

      return (

        <ResponsiveContainer width="100%" height={300}>

          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>

            <defs>

              <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">

                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>

                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>

              </linearGradient>

            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>

            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} />

            <YAxis tick={{fontSize: 12, fill: '#64748b'}} />

            <RechartsTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} />

            <Area type="monotone" dataKey="horas" name="Horas Paradas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHoras)" />

          </AreaChart>

        </ResponsiveContainer>

      );

    }

    if (chartType === 'prejuizo') {

      return (

        <ResponsiveContainer width="100%" height={300}>

          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>

            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} />

            <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => `R$ ${v}`} />

            <RechartsTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} formatter={(v) => `R$ ${v}`} />

            <Line type="monotone" dataKey="prejuizo" name="Prejuízo" stroke="#f43f5e" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />

          </LineChart>

        </ResponsiveContainer>

      );

    }

    if (chartType === 'fidelizacao') {

      return (

        <ResponsiveContainer width="100%" height={300}>

          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>

            <defs>

              <linearGradient id="colorFid" x1="0" y1="0" x2="0" y2="1">

                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>

                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>

              </linearGradient>

            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>

            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} />

            <YAxis tick={{fontSize: 12, fill: '#64748b'}} allowDecimals={false} />

            <RechartsTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} />

            <Area type="monotone" dataKey="fidelizados" name="Fidelizados" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFid)" />

          </AreaChart>

        </ResponsiveContainer>

      );

    }

  };



  return (

    <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">

      <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">

        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 rounded-t-[2rem]">

           <h3 className="text-2xl font-black text-blue-950 flex items-center gap-3"><BarChart3 className="text-emerald-600"/> {getChartTitle()}</h3>

           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"><X size={24} /></button>

        </div>

        

        <div className="p-8 overflow-y-auto">

           <div className="flex flex-wrap gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">

             <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-xs mr-2"><Filter size={16}/> Filtros</div>

             <div className="flex-1 min-w-[150px]"><input type="date" className="w-full px-4 py-2 bg-white rounded-xl outline-none border border-slate-200 text-sm font-bold text-slate-600" value={filterDataInicio} onChange={e => setFilterDataInicio(e.target.value)} title="Data Início"/></div>

             <div className="flex-1 min-w-[150px]"><input type="date" className="w-full px-4 py-2 bg-white rounded-xl outline-none border border-slate-200 text-sm font-bold text-slate-600" value={filterDataFim} onChange={e => setFilterDataFim(e.target.value)} title="Data Fim"/></div>

             <select className="flex-1 min-w-[120px] px-4 py-2 bg-white rounded-xl outline-none border border-slate-200 text-sm font-bold text-slate-600" value={filterTurno} onChange={e => setFilterTurno(e.target.value)}><option value="">Turno (Todos)</option><option>Manhã</option><option>Tarde</option><option>Noite</option></select>

             <select className="flex-1 min-w-[120px] px-4 py-2 bg-white rounded-xl outline-none border border-slate-200 text-sm font-bold text-slate-600" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}><option value="">Tipo (Todos)</option><option>Pesado</option><option>Leve</option></select>

           </div>

           

           <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">

             {renderChart()}

           </div>

        </div>
      </div>
    </div>
  );
}



// ==========================================
// ➕ MODAL NOVO COLABORADOR (46 COLUNAS COMPLETO)
// ==========================================

function ModalNovoColaborador({ onClose, onSubmit }) {
  const [activeTab, setActiveTab] = useState('pessoais');
  const [formData, setFormData] = useState({
    nome: '', matricula: '', chave_primaria: '', cpf: '', cnh: '', nro_cnh: '', categoria_cnh: '', dt_admissao: '', dt_demissao: '', sit_folha: '',
    base_ut: 'Norte', commessa: '', subgrupo: 'TMA', funcao: '', status_forca: 'Ativo na Força', status_falta: '', qtd_faltas_atual: 0, acao_a_ser_feita: '', horario: '', grupo_folga: '',
    equipe: 'Sobra', veiculo: '', turno: 'A', area_atuacao: '', possui_periculosidade: 'NÃO',
    diretoria: '', departamento: '', segmento: '', gestor: '', coordenador: '', supervisor: '', centro_custo: '', classe_custo: '',
    filial: '', logradouro: '', endereco: '', nro_endereco: '', bairro: '', telefone: '', celular: '',
    centro_custo_alpitel: '', comessa_alpitel: '', dt_retorno_ferias: '', nro_cracha: '', exp_1_periodo: '', exp_2_periodo: ''
  });

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.matricula || !formData.funcao) {
      alert('Por favor preencha os campos obrigatórios: Nome, Matrícula e Função.');
      return;
    }
    onSubmit(normalizeColaborador(formData));
  };

  const renderField = (key, label, type = 'text', options = []) => (
    <div key={key}>
      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">{label}</label>
      {type === 'select' ? (
        <select
          value={formData[key] || ''}
          onChange={e => handleChange(key, e.target.value)}
          className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none text-xs"
        >
          <option value="">Selecione...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={formData[key] || ''}
          onChange={e => handleChange(key, type === 'text' ? e.target.value.toUpperCase() : e.target.value)}
          className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none text-xs"
          placeholder={label}
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full sm:max-w-3xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-blue-950 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-lg font-black">Cadastrar Novo Colaborador</h2>
            <p className="text-xs text-slate-300">Preenchimento de 46 colunas da base unificada</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 overflow-x-auto hide-scrollbar bg-slate-50/50">
          {[
            { id: 'pessoais', label: '1. Pessoais' },
            { id: 'operacional', label: '2. Operacional' },
            { id: 'equipe', label: '3. Equipe' },
            { id: 'gestao', label: '4. Gestão' },
            { id: 'contato', label: '5. Contato' },
            { id: 'sistemas', label: '6. Sistemas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-black text-xs shrink-0 transition-all mb-2 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Form */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <form id="novoColabForm" onSubmit={handleSubmitForm}>
            {activeTab === 'pessoais' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderField('nome', 'Nome Completo *')}
                {renderField('matricula', 'Matrícula *')}
                {renderField('chave_primaria', 'Chave Primária')}
                {renderField('cpf', 'CPF')}
                {renderField('cnh', 'Status CNH')}
                {renderField('nro_cnh', 'Nº CNH')}
                {renderField('categoria_cnh', 'Categoria CNH')}
                {renderField('dt_admissao', 'Data Admissão', 'date')}
                {renderField('dt_demissao', 'Data Demissão', 'date')}
                {renderField('sit_folha', 'Situação Folha')}
              </div>
            )}

            {activeTab === 'operacional' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderField('base_ut', 'Base UT (Regional)', 'select', ['Norte', 'Leste', 'Sul', 'BASE GERAL'])}
                {renderField('commessa', 'Commessa')}
                {renderField('subgrupo', 'Subgrupo', 'select', ['TMA', 'SOT', 'SOC', 'OUTROS'])}
                {renderField('funcao', 'Função / Cargo *')}
                {renderField('status_forca', 'Status Força (RH)', 'select', ['Ativo', 'Ativo na Força', 'Afastado Confirmado', 'Abandono', 'Férias', 'Desligado'])}
                {renderField('status_falta', 'Status Falta')}
                {renderField('qtd_faltas_atual', 'Qtd. Faltas Atual', 'number')}
                {renderField('acao_a_ser_feita', 'Ação a ser Feita')}
                {renderField('horario', 'Horário Saída')}
                {renderField('grupo_folga', 'Grupo de Folga')}
              </div>
            )}

            {activeTab === 'equipe' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderField('equipe', 'Equipe Alocada')}
                {renderField('veiculo', 'Veículo / Placa')}
                {renderField('turno', 'Turno')}
                {renderField('area_atuacao', 'Área de Atuação')}
                {renderField('possui_periculosidade', 'Possui Periculosidade', 'select', ['SIM', 'NÃO'])}
              </div>
            )}

            {activeTab === 'gestao' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderField('diretoria', 'Diretoria')}
                {renderField('departamento', 'Departamento')}
                {renderField('segmento', 'Segmento')}
                {renderField('gestor', 'Gestor Direto')}
                {renderField('coordenador', 'Coordenador')}
                {renderField('supervisor', 'Supervisor')}
                {renderField('centro_custo', 'Centro de Custo')}
                {renderField('classe_custo', 'Classe de Custo')}
              </div>
            )}

            {activeTab === 'contato' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderField('filial', 'Filial')}
                {renderField('logradouro', 'Logradouro')}
                {renderField('endereco', 'Endereço')}
                {renderField('nro_endereco', 'Nº Endereço')}
                {renderField('bairro', 'Bairro')}
                {renderField('telefone', 'Telefone')}
                {renderField('celular', 'Celular')}
              </div>
            )}

            {activeTab === 'sistemas' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderField('centro_custo_alpitel', 'Centro Custo Alpitel')}
                {renderField('comessa_alpitel', 'Commessa Alpitel')}
                {renderField('dt_retorno_ferias', 'Dt. Retorno Férias', 'date')}
                {renderField('nro_cracha', 'Nº Crachá')}
                {renderField('exp_1_periodo', 'Exp. 1º Período')}
                {renderField('exp_2_periodo', 'Exp. 2º Período')}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            form="novoColabForm"
            className="px-6 py-2.5 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 text-sm"
          >
            <Save size={18} /> Salvar Colaborador
          </button>
        </div>
      </div>
    </div>
  );
}











function ModalHistoricoFidelizacao({ vehicleObj, checklists, forcaDeTrabalho, onClose }) {

  // Encontra checklists da placa

  const chksVeiculo = checklists.filter(c => c.placa === vehicleObj.placa && c.data_saida);

  chksVeiculo.sort((a,b) => new Date(b.data_saida) - new Date(a.data_saida));



  let colabsAutorizados = [];

  if (vehicleObj.equipes) {

    vehicleObj.equipes.forEach(eq => {

      if(eq.componentes) {

        eq.componentes.forEach(compId => {

          const colab = forcaDeTrabalho.find(c => String(c.matricula) === String(compId) || String(c.id) === String(compId));

          if (colab && colab.nome) colabsAutorizados.push(colab.nome.toUpperCase().trim());

        });

      }

    });

  }



  return (

    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">

      <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">

          <div>

             <h3 className="text-2xl font-black text-blue-950 flex items-center gap-2"><History size={24} className="text-emerald-500"/> Histórico de Fidelização</h3>

             <p className="text-sm font-bold text-slate-500 mt-1">Placa: {vehicleObj.placa} | {vehicleObj.turno} | {vehicleObj.subTipo || vehicleObj.tipo}</p>

          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={24}/></button>

        </div>

        <div className="p-6 overflow-y-auto flex-1">

          {chksVeiculo.length === 0 ? (

            <div className="text-center p-10 text-slate-400 font-bold">Nenhum checklist registrado nos últimos 30 dias.</div>

          ) : (

            <div className="space-y-4">

              {chksVeiculo.map(c => {

                const executorName = (c.executores || '').toUpperCase().trim();

                const isFidelizado = colabsAutorizados.some(nome => executorName.includes(nome) || nome.includes(executorName));

                

                return (

                  <div key={c.id} className={`p-4 rounded-xl border flex items-center justify-between ${isFidelizado ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>

                    <div>

                       <p className="text-xs font-black text-slate-400 mb-1">{c.id}</p>

                       <p className="font-bold text-blue-950 flex items-center gap-2"><User size={16}/> {c.executores}</p>

                       <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1"><Clock size={14}/> Saída: {c.data_saida ? new Date(c.data_saida).toLocaleString('pt-BR') : '-'} | Retorno: {c.data_entrada ? new Date(c.data_entrada).toLocaleString('pt-BR') : '-'}</p>

                    </div>

                    <div>

                      {isFidelizado ? 

                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-black text-xs uppercase"><Check size={14}/> Fiel</span> :

                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full font-black text-xs uppercase"><AlertTriangle size={14}/> Fuga de Fidelização</span>

                      }

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>
      </div>
    </div>
  );
}



function IndicadorFidelizacaoView({ vehicles, forcaDeTrabalho, vinculosEquipe, hoje, currentUser }) {

  const [checklists, setChecklists] = React.useState([]);

  const [loading, setLoading] = React.useState(false);

  const [loadingDb, setLoadingDb] = React.useState(true);

  const [modalVeiculoId, setModalVeiculoId] = React.useState(null);

  

  // Filtros

  const [filtroPlaca, setFiltroPlaca] = React.useState('');

  const [filtroTurno, setFiltroTurno] = React.useState('');

  const [filtroTipo, setFiltroTipo] = React.useState('');

  const [filtroSubTipo, setFiltroSubTipo] = React.useState('');

  const [filtroTipoOp, setFiltroTipoOp] = React.useState('');



  React.useEffect(() => {

    const fetchChecklists = async () => {

      const trintaDiasAtras = new Date(hoje);

      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      

      let allChecklists = [];

      let page = 0;

      let hasMore = true;

      

      while (hasMore) {

        const { data, error } = await supabase

          .from('checklists')

          .select('*')

          .gte('data_saida', trintaDiasAtras.toISOString())

          .range(page * 1000, (page + 1) * 1000 - 1);

          

        if (error) {

          console.error(error);

          break;

        }

        

        if (data) {

          allChecklists = [...allChecklists, ...data];

          if (data.length < 1000) {

            hasMore = false;

          } else {

            page++;

          }

        } else {

          hasMore = false;

        }

      }

      

      setChecklists(allChecklists);

      setLoadingDb(false);

    };

    fetchChecklists();

  }, [hoje]);



  const handleFileUpload = (e) => {

    if (!['ADMINISTRADOR', 'GERENTE', 'COORDENADOR'].includes(currentUser?.perfil)) {

      alert('Acesso negado: Apenas administradores, gerentes ou coordenadores podem realizar importações de planilhas.');

      e.target.value = null;

      return;

    }

    const file = e.target.files[0];

    if (!file) return;

    setLoading(true);

    

    const reader = new FileReader();

    reader.onload = async (evt) => {

      try {

        const bstr = evt.target.result;

        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });

        const wsname = wb.SheetNames[0];

        const ws = wb.Sheets[wsname];

        const data = XLSX.utils.sheet_to_json(ws);

        

        const parseExcelDate = (val) => {

          if (!val) return null;

          if (typeof val === 'number') {

            return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString();

          }

          return new Date(val).toISOString();

        };

        

        const upsertData = data.map(row => {

           return {

             id: row['Nome'],

             colaborador: row['Colaborador'] || null,

             executores: row['Executores'] || '',

             placa: row['Veículo'] || '',

             situacao: row['Situação'] || '',

             modelo_checklist: row['Modelo de checklist'] || '',

             data_criacao: parseExcelDate(row[' Data de criação']),

             data_saida: parseExcelDate(row['Data de saída']),

             data_entrada: parseExcelDate(row['Data de entrada'])

           };

        }).filter(item => item.id && item.placa);



        const chunkSize = 500;

        for (let i = 0; i < upsertData.length; i += chunkSize) {

          const chunk = upsertData.slice(i, i + chunkSize);

          const { error } = await supabase.from('checklists').upsert(chunk, { onConflict: 'id' });

          if (error) throw error;

        }

        

        alert('Checklists importados e atualizados com sucesso!');

        

        const trintaDiasAtras = new Date(hoje); trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        let allNew = [];

        let p = 0;

        let more = true;

        while (more) {

          const { data } = await supabase.from('checklists').select('*').gte('data_saida', trintaDiasAtras.toISOString()).range(p * 1000, (p + 1) * 1000 - 1);

          if (data) {

            allNew = [...allNew, ...data];

            if (data.length < 1000) more = false;

            else p++;

          } else {

            more = false;

          }

        }

        setChecklists(allNew);

        

      } catch (err) {

        console.error('Falha na importação:', err);

        alert('Erro ao importar arquivo: ' + (err.message || 'Verifique o formato e permissões.'));

      } finally {

        setLoading(false);

        e.target.value = null; 

      }

    };

    reader.readAsBinaryString(file);

  };



  // Funcao para formatar diff

  const getTimeDiffString = (saidaStr) => {

    if (!saidaStr) return '-';

    const saida = new Date(saidaStr);

    const diffMs = hoje.getTime() - saida.getTime();

    if (diffMs < 0) return 'Futuro?';

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays > 0) {

      return `Há ${diffDays} dia(s)`;

    }

    return `Há ${diffHrs} hora(s)`;

  };



  const processedData = vehicles.map(v => {

    if (!v.equipes || v.equipes.length === 0) return null; // Apenas veículos com equipes



    let colabsAutorizados = [];

    let nomeFixas = [];

    let nomeFolguistas = [];

    

    v.equipes.forEach(eq => {

      let eqNames = [];

      if(eq.componentes) {

        eq.componentes.forEach(compId => {

          const colab = forcaDeTrabalho.find(c => String(c.matricula) === String(compId) || String(c.id) === String(compId));

          if (colab && colab.nome) {

            colabsAutorizados.push(colab);

            eqNames.push(colab.nome);

          }

        });

      }

      if (eq.tipoEquipe === 'FOLGUISTA') {

        nomeFolguistas.push(...eqNames);

      } else {

        nomeFixas.push(...eqNames);

      }

    });



    const chksVeiculo = checklists.filter(c => c.placa === v.placa && c.data_saida);

    

    if (chksVeiculo.length === 0) {

       // RETORNA MESMO SEM CHECKLIST, INDICANDO "SEM DADOS"

       return {

         id: 'NO_CHK_' + v.placa,

         placa: v.placa,

         executores: null,

         data_saida: null,

         data_entrada: null,

         veiculoObj: v,

         isFidelizado: null, // Null = Sem checklist

         tempoInativo: '-',

         nomeFixas,

         nomeFolguistas

       };

    }

    

    chksVeiculo.sort((a,b) => new Date(b.data_saida) - new Date(a.data_saida));

    const latestChk = chksVeiculo[0];

    

    const executorName = (latestChk.executores || '').toUpperCase().trim();

    const isFidelizado = colabsAutorizados.some(c => {

      const nomeBase = c.nome.toUpperCase().trim();

      return executorName.includes(nomeBase) || nomeBase.includes(executorName);

    });

    

    return { 

      id: latestChk.id,

      placa: v.placa,

      executores: latestChk.executores,

      data_saida: latestChk.data_saida,

      data_entrada: latestChk.data_entrada,

      veiculoObj: v,

      isFidelizado,

      tempoInativo: getTimeDiffString(latestChk.data_saida),

      nomeFixas,

      nomeFolguistas

    };

  }).filter(Boolean).sort((a,b) => {

    // Ordenar por data_saida decrescente, e os nulos no final

    if (!a.data_saida && !b.data_saida) return 0;

    if (!a.data_saida) return 1;

    if (!b.data_saida) return -1;

    return new Date(b.data_saida) - new Date(a.data_saida);

  });



  const filteredData = processedData.filter(item => {

    const v = item.veiculoObj;

    if (filtroPlaca && !item.placa.toUpperCase().includes(filtroPlaca.toUpperCase())) return false;

    if (filtroTurno && v.turno !== filtroTurno) return false;

    if (filtroTipo && v.tipo !== filtroTipo) return false;

    if (filtroSubTipo && v.subTipo !== filtroSubTipo) return false;

    if (filtroTipoOp && v.tipoOp !== filtroTipoOp) return false;

    return true;

  });



  const acertos = filteredData.filter(d => d.isFidelizado === true).length;

  const falhas = filteredData.filter(d => d.isFidelizado === false).length;

  const semChecklist = filteredData.filter(d => d.isFidelizado === null).length;

  const totalBase = acertos + falhas; // Percentual calculado em cima apenas dos que rodaram

  const percFidelidade = totalBase > 0 ? ((acertos / totalBase) * 100).toFixed(1) : 0;



  return (

    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">

      <div className="flex justify-between items-center mb-8">

         <div>

            <h2 className="text-3xl font-black text-blue-950 flex items-center gap-3">

              <ShieldCheck size={36} className="text-emerald-500" /> Indicador de Fidelização

            </h2>

            <p className="text-slate-500 mt-2">Auditoria de todas as frotas fidelizadas.</p>

         </div>

         {['ADMINISTRADOR', 'GERENTE', 'COORDENADOR'].includes(currentUser?.perfil) && (

           <div>

              <input type="file" id="upload-checklist" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={loading} />

              <label htmlFor="upload-checklist" className={`cursor-pointer px-6 py-3 rounded-full font-black flex items-center gap-2 shadow-lg transition-all ${loading ? 'bg-slate-300 text-slate-500' : 'bg-blue-950 text-white hover:bg-blue-900 shadow-blue-900/30 active:scale-95'}`}>

                <Upload size={20} />

                {loading ? 'Processando Arquivo...' : 'Importar Checklist'}

              </label>

           </div>

         )}

      </div>



      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">

          <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Aderência Global</p>

          <h3 className={`text-5xl font-black ${percFidelidade >= 80 ? 'text-emerald-500' : percFidelidade >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{percFidelidade}%</h3>

          <p className="text-sm font-bold text-slate-400 mt-2">Das frotas ativas com checklist.</p>

        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-center">

          <div className="flex items-center gap-4 mb-2">

             <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><CheckCircle2 size={24}/></div>

             <div>

               <p className="text-2xl font-black text-blue-950">{acertos}</p>

               <p className="text-xs font-bold text-slate-400 uppercase">Saídas Corretas</p>

             </div>

          </div>

        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-center">

          <div className="flex items-center gap-4 mb-2">

             <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><AlertTriangle size={24}/></div>

             <div>

               <p className="text-2xl font-black text-rose-600">{falhas}</p>

               <p className="text-xs font-bold text-slate-400 uppercase">Fugas / Alertas</p>

             </div>

          </div>

        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-center">

          <div className="flex items-center gap-4 mb-2">

             <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl"><Clock size={24}/></div>

             <div>

               <p className="text-2xl font-black text-slate-600">{semChecklist}</p>

               <p className="text-xs font-bold text-slate-400 uppercase">Ociosos / Sem Dados</p>

             </div>

          </div>

        </div>

      </div>



      <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-50 p-6 mb-8 space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div className="relative w-full md:w-[300px]">

            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />

            <input type="text" placeholder="Buscar placa..." value={filtroPlaca} onChange={(e) => setFiltroPlaca(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-[1.5rem] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" />

          </div>

        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">

           <select className="px-4 py-2 bg-slate-50 rounded-xl outline-none font-bold text-sm text-slate-600 border border-slate-200" value={filtroTurno} onChange={e => setFiltroTurno(e.target.value)}><option value="">Turno (Todos)</option><option>Manhã</option><option>Tarde</option><option>Noite</option></select>

           <select className="px-4 py-2 bg-slate-50 rounded-xl outline-none font-bold text-sm text-slate-600 border border-slate-200" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}><option value="">Tipo (Todos)</option><option>Pesado</option><option>Leve</option><option>Moto</option></select>

           <select className="px-4 py-2 bg-slate-50 rounded-xl outline-none font-bold text-sm text-slate-600 border border-slate-200" value={filtroSubTipo} onChange={e => setFiltroSubTipo(e.target.value)}><option value="">Sub Tipo (Todos)</option><option>Munk</option><option>Cesto Aéreo</option><option>Fiorino</option><option>Strada</option><option>Argo</option></select>

           <select className="px-4 py-2 bg-slate-50 rounded-xl outline-none font-bold text-sm text-slate-600 border border-slate-200" value={filtroTipoOp} onChange={e => setFiltroTipoOp(e.target.value)}><option value="">Tipo OP (Todos)</option><option>TMA</option><option>Linha Viva</option><option>Linha Morta</option><option>SOC</option></select>

        </div>

      </div>



      <div className="bg-white shadow-xl rounded-[1.5rem] border border-emerald-50 overflow-hidden">

        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">

           <h3 className="font-black text-blue-950 flex items-center gap-2"><CarFront size={20} className="text-indigo-500"/> Visão de Frotas Fidelizadas</h3>

           <span className="text-sm font-bold text-slate-400">{filteredData.length} frotas</span>

        </div>

        {loadingDb ? (

           <div className="p-10 text-center text-slate-500 font-bold">Carregando dados do banco...</div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm text-left border-collapse">

              <thead>

                <tr className="bg-blue-950 text-white font-black text-[10px] uppercase tracking-wider">

                  <th className="p-4 rounded-tl-lg">Veículo / Info</th>

                  <th className="p-4">Executor (Real)</th>

                  <th className="p-4">Saída / Retorno</th>

                  <th className="p-4">Tempo Inativo</th>

                  <th className="p-4">Status da Fidelização</th>

                  <th className="p-4">Equipe Fixa</th>

                  <th className="p-4">Equipe Folguista</th>

                  <th className="p-4 rounded-tr-lg">Detalhes</th>

                </tr>

              </thead>

              <tbody>

                {filteredData.map(chk => (

                  <tr key={chk.id} className="border-b border-slate-100 hover:bg-slate-50 group transition-colors">

                    <td className="p-4 min-w-[150px]">

                       <span className="font-black text-lg text-blue-950 block">{chk.placa}</span>

                       <span className="text-xs font-bold text-slate-400">{chk.veiculoObj.turno} | {chk.veiculoObj.subTipo || chk.veiculoObj.tipo}</span>

                    </td>

                    <td className="p-4 font-bold text-slate-700 min-w-[150px]">{chk.executores || '-'}</td>

                    <td className="p-4 min-w-[150px]">

                      <div className="text-xs font-bold text-slate-600"><span className="text-slate-400">Saída:</span> {chk.data_saida ? new Date(chk.data_saida).toLocaleString('pt-BR') : '-'}</div>

                      <div className="text-xs font-bold text-slate-600"><span className="text-slate-400">Retorno:</span> {chk.data_entrada ? new Date(chk.data_entrada).toLocaleString('pt-BR') : '-'}</div>

                    </td>

                    <td className="p-4 font-black text-blue-950">{chk.tempoInativo}</td>

                    <td className="p-4">

                      {chk.isFidelizado === true ? (

                         <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-black text-[10px] uppercase"><Check size={14}/> Fiel</span>

                      ) : chk.isFidelizado === false ? (

                         <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full font-black text-[10px] uppercase"><AlertTriangle size={14}/> Fuga</span>

                      ) : (

                         <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-500 rounded-full font-black text-[10px] uppercase"><Clock size={14}/> Sem Dados</span>

                      )}

                    </td>

                    <td className="p-4 min-w-[150px]">

                      <ul className="list-disc pl-4 text-xs font-medium text-slate-600">

                        {chk.nomeFixas.length > 0 ? chk.nomeFixas.map((nome, idx) => <li key={idx}>{nome}</li>) : <span className="text-slate-300">-</span>}

                      </ul>

                    </td>

                    <td className="p-4 min-w-[150px]">

                      <ul className="list-disc pl-4 text-xs font-medium text-slate-600">

                        {chk.nomeFolguistas.length > 0 ? chk.nomeFolguistas.map((nome, idx) => <li key={idx}>{nome}</li>) : <span className="text-slate-300">-</span>}

                      </ul>

                    </td>

                    <td className="p-4">

                      <button 

                        onClick={() => setModalVeiculoId(chk.veiculoObj)}

                        className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm"

                      >

                        Histórico

                      </button>

                    </td>

                  </tr>

                ))}

                {filteredData.length === 0 && (

                  <tr><td colSpan="8" className="p-10 text-center text-slate-400 font-bold">Nenhum veículo encontrado.</td></tr>

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      

      {modalVeiculoId && (

        <ModalHistoricoFidelizacao 

           vehicleObj={modalVeiculoId} 

           checklists={checklists} 

           forcaDeTrabalho={forcaDeTrabalho}

           onClose={() => setModalVeiculoId(null)}

        />

      )}

    </div>

  );

}



// ==========================================

// VIEW: OCIOSIDADE FROTA (Premium & Realtime)

// ==========================================

function OciosidadeView({ vehicles, chamados, hoje }) {

  const [checklists, setChecklists] = useState([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [filterSeverity, setFilterSeverity] = useState('');

  const [filterType, setFilterType] = useState('');



  useEffect(() => {

    const fetchChecklists = async () => {

      setLoading(true);

      try {

        const centoOitentaDiasAtras = new Date(hoje);

        centoOitentaDiasAtras.setDate(centoOitentaDiasAtras.getDate() - 180);

        

        let allChecklists = [];

        let page = 0;

        let hasMore = true;

        

        while (hasMore) {

          const { data, error } = await supabase

            .from('checklists')

            .select('placa, data_saida')

            .gte('data_saida', centoOitentaDiasAtras.toISOString())

            .range(page * 1000, (page + 1) * 1000 - 1);

            

          if (error || !data) {

            hasMore = false;

          } else {

            allChecklists = [...allChecklists, ...data];

            if (data.length < 1000) hasMore = false;

            else page++;

          }

        }

        setChecklists(allChecklists);

      } catch (err) {

        console.error('Erro ao buscar checklists ociosidade:', err);

      } finally {

        setLoading(false);

      }

    };

    

    fetchChecklists();

  }, [hoje]);



  const vehiclesProcessed = React.useMemo(() => {

    return vehicles.map(v => {

      const temChamadoAberto = chamados.some(c => c.placa === v.placa && c.status === 'ABERTO');

      const chamadoAtivo = chamados.find(c => c.placa === v.placa && c.status === 'ABERTO');

      

      const chks = checklists.filter(c => c.placa === v.placa && c.data_saida);

      chks.sort((a,b) => new Date(b.data_saida) - new Date(a.data_saida));

      const latestSaida = chks[0] ? new Date(chks[0].data_saida) : null;

      

      let horasParado = 0;

      let diasParados = 0;

      let horasRestantes = 0;

      let ociosidadeGrau = 'Normal'; // Normal, Justificado, Atenção, Crítico

      let statusLabel = 'Normal';

      

      if (!latestSaida) {

        if (temChamadoAberto) {

          ociosidadeGrau = 'Justificado';

          statusLabel = 'Justificado (Chamado Aberto)';

        } else {

          ociosidadeGrau = 'Crítico';

          statusLabel = 'Crítico (Sem saída recente)';

        }

        diasParados = 180; // Ociosidade máxima nos últimos 180 dias

        horasRestantes = 0;

        horasParado = 180 * 24;

      } else {

        const diffMs = hoje.getTime() - latestSaida.getTime();

        horasParado = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;

        diasParados = Math.floor(horasParado / 24);

        horasRestantes = Math.floor(horasParado % 24);

        

        if (temChamadoAberto) {

          ociosidadeGrau = 'Justificado';

          statusLabel = 'Justificado (Chamado Aberto)';

        } else if (horasParado > 72) {

          ociosidadeGrau = 'Crítico';

          statusLabel = 'Alerta Crítico';

        } else if (horasParado >= 48 && horasParado <= 72) {

          ociosidadeGrau = 'Atenção';

          statusLabel = 'Atenção';

        } else {

          ociosidadeGrau = 'Normal';

          statusLabel = 'Normal';

        }

      }



      return {

        veiculo: v,

        latestSaida,

        diasParados,

        horasRestantes,

        horasParado,

        temChamadoAberto,

        chamadoAtivo,

        ociosidadeGrau,

        statusLabel

      };

    });

  }, [vehicles, checklists, chamados, hoje]);



  const sortedVehicles = React.useMemo(() => {

    return [...vehiclesProcessed].sort((a, b) => {

      const severityWeight = { 'Crítico': 4, 'Atenção': 3, 'Justificado': 2, 'Normal': 1 };

      const weightA = severityWeight[a.ociosidadeGrau] || 0;

      const weightB = severityWeight[b.ociosidadeGrau] || 0;

      

      if (weightA !== weightB) {

        return weightB - weightA;

      }

      return b.horasParado - a.horasParado;

    });

  }, [vehiclesProcessed]);



  const filteredVehicles = React.useMemo(() => {

    return sortedVehicles.filter(item => {

      const matchPlaca = item.veiculo.placa.toUpperCase().includes(searchTerm.trim().toUpperCase());

      const matchSeverity = filterSeverity ? (

        filterSeverity === 'Critico' ? item.ociosidadeGrau === 'Crítico' :

        filterSeverity === 'Justificado' ? item.ociosidadeGrau === 'Justificado' :

        filterSeverity === 'Atencao' ? item.ociosidadeGrau === 'Atenção' :

        item.ociosidadeGrau === 'Normal'

      ) : true;

      const matchType = filterType ? item.veiculo.tipo === filterType : true;

      return matchPlaca && matchSeverity && matchType;

    });

  }, [sortedVehicles, searchTerm, filterSeverity, filterType]);



  const totalMonitored = vehicles.length;

  const criticalAlerts = vehiclesProcessed.filter(item => item.ociosidadeGrau === 'Crítico').length;

  const justifiedAlerts = vehiclesProcessed.filter(item => item.ociosidadeGrau === 'Justificado').length;

  const normalAlerts = vehiclesProcessed.filter(item => item.ociosidadeGrau === 'Normal' || item.ociosidadeGrau === 'Atenção').length;



  return (

    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">

      

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">

          <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Total Monitorados</p>

          <h3 className="text-4xl font-black text-blue-950">{totalMonitored}</h3>

          <p className="text-xs font-bold text-slate-400 mt-2">Veículos na base cadastrados.</p>

        </div>

        

        <div className={`bg-white p-6 rounded-[2rem] border-2 shadow-sm transition-all ${criticalAlerts > 0 ? 'border-rose-500/30 bg-rose-50/10' : 'border-slate-200'}`}>

          <p className="text-xs font-black uppercase text-rose-500 tracking-widest mb-1 flex items-center gap-1.5">

            {criticalAlerts > 0 && <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>}

            Alertas Críticos

          </p>

          <h3 className={`text-4xl font-black ${criticalAlerts > 0 ? 'text-rose-500 font-extrabold' : 'text-slate-500'}`}>{criticalAlerts}</h3>

          <p className="text-xs font-bold text-slate-400 mt-2">&gt; 3 dias parados e sem chamado aberto.</p>

        </div>



        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">

          <p className="text-xs font-black uppercase text-slate-500 tracking-widest mb-1">Justificados</p>

          <h3 className="text-4xl font-black text-indigo-600">{justifiedAlerts}</h3>

          <p className="text-xs font-bold text-slate-400 mt-2">Parados, mas com chamado aberto.</p>

        </div>



        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">

          <p className="text-xs font-black uppercase text-emerald-600 tracking-widest mb-1">Normal / Atenção</p>

          <h3 className="text-4xl font-black text-emerald-600">{normalAlerts}</h3>

          <p className="text-xs font-bold text-slate-400 mt-2">Saídas recentes nos parâmetros normais.</p>

        </div>

      </div>



      <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-50 p-6 space-y-4">

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          <div className="relative w-full md:w-[350px]">

            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />

            <input 

              type="text" 

              placeholder="Buscar placa..." 

              value={searchTerm} 

              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} 

              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-[1.5rem] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" 

            />

          </div>

          

          <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">

             <select className="px-4 py-2 bg-slate-50 rounded-xl outline-none font-bold text-sm text-slate-600 border border-slate-200" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>

               <option value="">Severidade (Todas)</option>

               <option value="Critico">Críticos (&gt; 3 dias)</option>

               <option value="Justificado">Justificados (C/ Chamado)</option>

               <option value="Atencao">Atenção (3 dias / 48h-72h)</option>

               <option value="Normal">Normais (&lt; 48h)</option>

             </select>

             

             <select className="px-4 py-2 bg-slate-50 rounded-xl outline-none font-bold text-sm text-slate-600 border border-slate-200" value={filterType} onChange={e => setFilterType(e.target.value)}>

               <option value="">Tipo (Todos)</option>

               <option value="Pesado">Pesados</option>

               <option value="Leve">Leves</option>

               <option value="Moto">Motos</option>

             </select>

          </div>

        </div>

      </div>



      <div className="bg-white shadow-xl rounded-[2rem] border border-emerald-50 overflow-hidden">

        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">

          <h3 className="font-black text-blue-950 flex items-center gap-2">

            <Activity size={20} className="text-emerald-500"/> Frotas por Tempo de Ociosidade

          </h3>

          <span className="text-sm font-bold text-slate-400">{filteredVehicles.length} frotas</span>

        </div>



        {loading ? (

          <div className="p-16 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-3">

            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>

            Carregando checklists do Supabase...

          </div>

        ) : (

          <div className="p-6 space-y-4">

            {filteredVehicles.map(item => {

              const isCritico = item.ociosidadeGrau === 'Crítico';

              const isAtencao = item.ociosidadeGrau === 'Atenção';

              const isJustificado = item.ociosidadeGrau === 'Justificado';

              const isNormal = item.ociosidadeGrau === 'Normal';



              let barColor = 'bg-slate-200';

              let severityBadgeColor = 'bg-slate-100 text-slate-600 border-slate-200';

              

              if (isCritico) {

                barColor = 'bg-rose-500 animate-pulse';

                severityBadgeColor = 'bg-rose-100 text-rose-700 border-rose-200';

              } else if (isAtencao) {

                barColor = 'bg-amber-500';

                severityBadgeColor = 'bg-amber-100 text-amber-700 border-amber-200';

              } else if (isJustificado) {

                barColor = 'bg-indigo-400';

                severityBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-100';

              } else if (isNormal) {

                barColor = 'bg-emerald-500';

                severityBadgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';

              }



              return (

                <div 

                  key={item.veiculo.placa} 

                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 hover:shadow-md hover:border-emerald-100"

                >

                  <div className="flex items-center gap-4 w-full md:w-1/4 shrink-0">

                    <span className="font-black text-xl italic tracking-tight text-blue-900 bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-2 font-mono shadow-sm">

                      {item.veiculo.placa}

                    </span>

                    <div>

                      <h4 className="font-bold text-slate-700 text-sm uppercase">{item.veiculo.subTipo || item.veiculo.tipo}  -  {item.veiculo.marca || 'Sem Marca'}</h4>

                      <p className="text-xs text-slate-400 font-bold mt-0.5">{item.veiculo.turno} | {item.veiculo.tipoOp || 'Operacional'}</p>

                    </div>

                  </div>



                  <div className="flex-1 w-full flex flex-col gap-2">

                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">

                      <span className="flex items-center gap-1.5">

                        {isJustificado ? 'Parada Justificada' : 'Ausência de Saída'}

                        {item.chamadoAtivo && (

                          <span className="bg-amber-100 border border-amber-200 text-amber-800 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wide flex items-center gap-1">

                            <Wrench size={10}/> {item.chamadoAtivo.numero}

                          </span>

                        )}

                      </span>

                      <span>{isCritico ? 'Crítico (Sem Chamado)' : isAtencao ? 'Atenção' : 'Operação Estável'}</span>

                    </div>

                    

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">

                      <div 

                        className={`h-full rounded-full transition-all duration-500 ${barColor}`} 

                        style={{ 

                          width: item.latestSaida 

                            ? `${Math.min(100, (item.horasParado / 120) * 100)}%` 

                            : '100%' 

                        }}

                      ></div>

                    </div>

                    

                    <p className="text-[10px] text-slate-400 font-bold">

                      Última Saída da Base: {item.latestSaida ? formatarDataBR(item.latestSaida) : 'Sem registros de saída recente nos últimos 180 dias'}

                    </p>

                  </div>



                  <div className="w-full md:w-auto shrink-0 flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">

                    <div className="text-left md:text-right">

                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Sem Saída</p>

                      <p className={`text-base font-black ${isCritico ? 'text-rose-600' : isAtencao ? 'text-amber-600' : 'text-slate-700'}`}>

                        {item.latestSaida ? (

                          item.diasParados > 0 

                            ? `${item.diasParados}d e ${item.horasRestantes}h` 

                            : `${Math.floor(item.horasParado)}h`

                        ) : (

                          'Sem Registros (>180d)'

                        )}

                      </p>

                    </div>



                    <span className={`inline-flex px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${severityBadgeColor}`}>

                      {item.statusLabel}

                    </span>

                  </div>



                </div>

              );

            })}

            

            {filteredVehicles.length === 0 && (

              <div className="text-center py-16 text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30">

                Nenhum veículo corresponde aos filtros selecionados.

              </div>

            )}

          </div>

        )}

      </div>



    </div>

  );

}



// ==========================================

// VIEW: MEU PERFIL (Personal Space & Analytics)

// ==========================================

function PerfilView({ currentUser, chamados, vehicles, onUpdateProfile, onEditar, onLiberar }) {

  const [nome, setNome] = useState(currentUser.nome);

  const [login, setLogin] = useState(currentUser.login);

  const [senha, setSenha] = useState(currentUser.senha);

  const [matricula, setMatricula] = useState(currentUser.matricula || '');

  const [telefone, setTelefone] = useState(currentUser.telefone || '');



  const formatPhone = (value) => {

    if (!value) return '';

    const cleanValue = value.replace(/\D/g, '');

    if (cleanValue.length <= 2) {

      return cleanValue;

    }

    if (cleanValue.length <= 7) {

      return `${cleanValue.slice(0, 2)} ${cleanValue.slice(2)}`;

    }

    return `${cleanValue.slice(0, 2)} ${cleanValue.slice(2, 7)}-${cleanValue.slice(7, 11)}`;

  };

  const [showSenha, setShowSenha] = useState(false);

  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const hoje = new Date();



  const meusChamados = React.useMemo(() => {

    return chamados.filter(c => {

      if (c.dadosWorkflow?.criadoPor && String(c.dadosWorkflow.criadoPor).toUpperCase() === String(currentUser.nome).toUpperCase()) {

        return true;

      }

      if (c.historicoModificacoes && c.historicoModificacoes.length > 0) {

        const primeiroLog = c.historicoModificacoes[c.historicoModificacoes.length - 1];

        return primeiroLog && String(primeiroLog.usuario).toUpperCase() === String(currentUser.nome).toUpperCase();

      }

      return false;

    });

  }, [chamados, currentUser]);



  const filteredChamados = React.useMemo(() => {

    return meusChamados.filter(c => {

      const matchSearch = c.placa.toUpperCase().includes(searchTerm.toUpperCase()) || 

                          c.numero.toUpperCase().includes(searchTerm.toUpperCase()) ||

                          (c.defeitoEncontrado || '').toUpperCase().includes(searchTerm.toUpperCase());

      return matchSearch;

    });

  }, [meusChamados, searchTerm]);



  const totalAbertos = meusChamados.length;

  const emAndamento = meusChamados.filter(c => c.status === 'ABERTO').length;

  const concluidos = meusChamados.filter(c => c.status === 'RESOLVIDO').length;



  const handleSave = async (e) => {

    e.preventDefault();

    if (!nome.trim() || !login.trim() || !senha.trim()) {

      alert('Preencha todos os campos obrigatórios!');

      return;

    }

    setSaving(true);

    const success = await onUpdateProfile({

      ...currentUser,

      nome: nome.toUpperCase(),

      login: login,

      senha: senha,

      matricula: matricula,

      telefone: telefone

    });

    setSaving(false);

    if (success) {

      alert('Perfil atualizado com sucesso!');

    }

  };



  const getPerfilBadge = (perfil) => {

    const p = String(perfil).toUpperCase();

    if (p === 'GERENTE' || p === 'ADMINISTRADOR') {

      return 'bg-emerald-100 text-emerald-800 border-emerald-200';

    }

    if (p === 'COORDENADOR') {

      return 'bg-blue-100 text-blue-800 border-blue-200';

    }

    if (p === 'FROTA') {

      return 'bg-amber-100 text-amber-800 border-amber-200';

    }

    return 'bg-indigo-100 text-indigo-800 border-indigo-200';

  };



  const getWorkflowBadge = (etapa) => {

    const e = etapa || 'Análise Frota';

    switch (e) {

      case 'Análise Frota':

      case 'Aguardando Manutenção':

        return 'bg-rose-100 text-rose-700 border-rose-200';

      case 'Oficina Interna':

        return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200';

      case 'Aguardando Desequipar':

        return 'bg-orange-100 text-orange-700 border-orange-200';

      case 'Desequipado - Entrada Oficina':

        return 'bg-indigo-100 text-indigo-700 border-indigo-200';

      case 'Oficina Externa':

        return 'bg-purple-100 text-purple-700 border-purple-200';

      case 'Liberado Operação':

        return 'bg-blue-100 text-blue-700 border-blue-200';

      case 'RESOLVIDO':

        return 'bg-emerald-100 text-emerald-700 border-emerald-200';

      default:

        return 'bg-slate-100 text-slate-700 border-slate-200';

    }

  };



  const formatarDataBR = (dataString) => {

    if (!dataString) return '--';

    const data = new Date(dataString);

    const dia = String(data.getDate()).padStart(2, '0');

    const mes = String(data.getMonth() + 1).padStart(2, '0');

    const ano = data.getFullYear();

    const horas = String(data.getHours()).padStart(2, '0');

    const min = String(data.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} ${horas}:${min}`;

  };



  return (

    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">

      

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center justify-between">

          <div>

            <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1 font-mono">Total Abertos Por Mim</p>

            <h3 className="text-3xl font-black text-blue-950">{totalAbertos}</h3>

            <p className="text-xs font-bold text-slate-400 mt-2 font-sans">Histórico completo de aberturas.</p>

          </div>

          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shrink-0"><FileText size={24}/></div>

        </div>



        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center justify-between">

          <div>

            <p className="text-xs font-black uppercase text-amber-600 tracking-widest mb-1 font-mono">Parados / Em Andamento</p>

            <h3 className="text-3xl font-black text-amber-600">{emAndamento}</h3>

            <p className="text-xs font-bold text-slate-400 mt-2 font-sans">Aguardando solução ou testes.</p>

          </div>

          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl shrink-0"><Clock size={24}/></div>

        </div>



        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center justify-between">

          <div>

            <p className="text-xs font-black uppercase text-emerald-600 tracking-widest mb-1 font-mono">Chamados Concluídos</p>

            <h3 className="text-3xl font-black text-emerald-600">{concluidos}</h3>

            <p className="text-xs font-bold text-slate-400 mt-2 font-sans">Veículos liberados e aceitos.</p>

          </div>

          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0"><CheckCircle2 size={24}/></div>

        </div>

      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        

        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 lg:col-span-1 h-fit space-y-6">

          <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">

            <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-emerald-100 mb-4">

              {currentUser.nome.charAt(0)}

            </div>

            <h4 className="text-lg font-black text-blue-950 uppercase tracking-tight">{currentUser.nome}</h4>

            <span className={`inline-flex px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider mt-2.5 ${getPerfilBadge(currentUser.perfil)}`}>

              {currentUser.perfil}

            </span>

          </div>



          <form onSubmit={handleSave} className="space-y-4">

            <div>

              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 font-mono">Nome Completo</label>

              <input 

                required 

                type="text" 

                value={nome} 

                onChange={e => setNome(e.target.value.toUpperCase())} 

                className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all uppercase"

                placeholder="SEU NOME COMPLETO"

              />

            </div>



            <div>

              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 font-mono">Login / Usuário</label>

              <input 

                required 

                type="text" 

                value={login} 

                onChange={e => setLogin(e.target.value.toLowerCase())} 

                className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all"

                placeholder="seu.login"

              />

            </div>



            <div>

              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 font-mono">Senha do Sistema</label>

              <div className="relative">

                <input 

                  required 

                  type={showSenha ? "text" : "password"} 

                  value={senha} 

                  onChange={e => setSenha(e.target.value)} 

                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all pr-12"

                  placeholder="Sua senha secreta"

                />

                <button 

                  type="button" 

                  onClick={() => setShowSenha(!showSenha)}

                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"

                >

                  {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}

                </button>

              </div>

            </div>



            <div>

              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 font-mono">Matrícula</label>

              <input 

                type="text" 

                value={matricula} 

                onChange={e => setMatricula(e.target.value.toUpperCase())} 

                className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all"

                placeholder="Ex: MAT-12345"

              />

            </div>



            <div>

              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 font-mono">Telefone Corporativo</label>

              <input 

                type="text" 

                value={telefone} 

                onChange={e => {

                  const formatted = formatPhone(e.target.value);

                  if (formatted.length <= 15) setTelefone(formatted);

                }} 

                className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all"

                placeholder="11 99999-9999"

              />

            </div>



            <button 

              type="submit" 

              disabled={saving}

              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-200 active:scale-95 transition-all mt-4"

            >

              {saving ? 'Gravando Alterações...' : 'Salvar Alterações'}

            </button>

          </form>

        </div>



        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-emerald-50 lg:col-span-2 flex flex-col">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-6">

            <div>

              <h3 className="text-xl font-black text-blue-950 flex items-center gap-2">

                <FileText size={24} className="text-emerald-500"/> Rastreamento de Chamados

              </h3>

              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider font-mono">Abertos sob minha autoria</p>

            </div>

            

            <div className="relative w-full md:w-[250px]">

              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />

              <input 

                type="text" 

                placeholder="Buscar placa ou SOL..." 

                value={searchTerm} 

                onChange={e => setSearchTerm(e.target.value)} 

                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" 

              />

            </div>

          </div>



          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 flex-1">

            {filteredChamados.map(c => {

              const diffMs = c.dataHoraFechamento 

                ? new Date(c.dataHoraFechamento).getTime() - new Date(c.dataAbertura).getTime()

                : hoje.getTime() - new Date(c.dataAbertura).getTime();

              const horas = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;

              const isFechado = c.status === 'RESOLVIDO';



              return (

                <div 

                  key={c.id} 

                  className="bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-md rounded-2xl p-5 transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-4 group"

                >

                  <div className="flex items-center gap-3 w-full md:w-1/3 shrink-0">

                    <span 

                      onClick={() => onEditar(c)}

                      className="font-black text-base italic tracking-tight text-blue-900 bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-1 font-mono cursor-pointer hover:bg-emerald-50 transition-colors"

                    >

                      {c.placa}

                    </span>

                    <div>

                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Número Chamado</span>

                      <span className="font-bold text-slate-700 text-xs">{c.numero}</span>

                    </div>

                  </div>



                  <div className="flex-1 w-full text-left md:pr-4">

                    <p className="text-xs text-slate-600 font-bold line-clamp-2">{c.defeitoEncontrado || 'Sem descrição'}</p>

                    <p className="text-[9px] text-slate-400 font-bold mt-1 flex items-center gap-1.5">

                      <Clock size={11}/>

                      Abertura: {formatarDataBR(c.dataAbertura)} 

                      <span className="text-rose-500 font-black ml-1">({horas.toFixed(0)}h)</span>

                    </p>

                  </div>



                  <div className="w-full md:w-auto shrink-0 flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">

                    <span className={`inline-flex px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${getWorkflowBadge(c.etapaWorkflow)}`}>

                      {c.etapaWorkflow || (isFechado ? 'RESOLVIDO' : 'Manutenção')}

                    </span>



                    <button 

                      onClick={() => onEditar(c)}

                      className="p-2.5 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all border border-slate-100 hover:border-emerald-100 shadow-sm"

                      title="Ver Detalhes do Chamado"

                    >

                      <Eye size={16} />

                    </button>

                  </div>

                </div>

              );

            })}



            {filteredChamados.length === 0 && (

              <div className="text-center py-16 text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/20">

                Nenhum chamado aberto por você foi localizado.

              </div>

            )}

          </div>

        </div>
      </div>
    </div>
  );
}



function AutoScrollingContainer({ children, className, listLength }) {

  const containerRef = React.useRef(null);

  const [isHovered, setIsHovered] = useState(false);



  useEffect(() => {

    const el = containerRef.current;

    if (!el || isHovered) return;



    let timer;

    let scrollDirection = 1; // 1 = down, -1 = up

    

    const startScroll = () => {

      timer = setInterval(() => {

        if (el.scrollHeight <= el.clientHeight) return;



        el.scrollTop += scrollDirection * 1;



        if (scrollDirection === 1 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {

          clearInterval(timer);

          timer = setTimeout(() => {

            scrollDirection = -1;

            startScroll();

          }, 3000); // pause for 3s at the bottom

        } else if (scrollDirection === -1 && el.scrollTop <= 0) {

          clearInterval(timer);

          timer = setTimeout(() => {

            scrollDirection = 1;

            startScroll();

          }, 3000); // pause for 3s at the top

        }

      }, 40);

    };



    const delayTimer = setTimeout(() => {

      startScroll();

    }, 2500);



    return () => {

      clearTimeout(delayTimer);

      clearInterval(timer);

      clearTimeout(timer);

    };

  }, [isHovered, listLength]);



  // Reset scroll if items count changes and now fits

  useEffect(() => {

    const el = containerRef.current;

    if (el && el.scrollHeight <= el.clientHeight) {

      el.scrollTop = 0;

    }

  }, [listLength]);



  return (

    <div 

      ref={containerRef} 

      className={className}

      onMouseEnter={() => setIsHovered(true)}

      onMouseLeave={() => setIsHovered(false)}

    >

      {children}

    </div>

  );

}



function PainelTVView({ vehicles, chamados, activeRegional, setActiveRegional, currentUser, onVoltar }) {
  const vehiclesMap = useMemo(() => new Map((vehicles || []).map(v => [v.placa, v])), [vehicles]);

  const [time, setTime] = useState(new Date());

  const [filterTipo, setFilterTipo] = useState(null); // 'PESADO', 'LEVE', 'MOTO'

  const [filterTurnoOp, setFilterTurnoOp] = useState(null); // 'MANHÃ', 'TARDE', 'LINHA VIVA'



  useEffect(() => {

    const timer = setInterval(() => setTime(new Date()), 1000);

    return () => clearInterval(timer);

  }, []);



  const formatClock = (date) => {

    return date.toLocaleTimeString('pt-BR', { hour12: false });

  };



  const formatCalendar = (date) => {

    return date.toLocaleDateString('pt-BR', { 

      weekday: 'long', 

      year: 'numeric', 

      month: 'long', 

      day: 'numeric' 

    }).toUpperCase();

  };



  const activeChamados = chamados.filter(c => {

    if (c.status !== 'ABERTO') return false;

    const veiculo = vehiclesMap.get(c.placa);

    if (!veiculo) return true;



    if (filterTipo) {

      const vTipo = String(veiculo.tipo || '').toUpperCase();

      const vSubTipo = String(veiculo.subTipo || '').toUpperCase();

      const target = filterTipo.toUpperCase();

      if (target === 'MOTO') {

        if (vTipo !== 'MOTO' && vSubTipo !== 'MOTO') return false;

      } else {

        if (vTipo !== target && vSubTipo !== target) return false;

      }

    }



    if (filterTurnoOp) {

      const vTurno = String(veiculo.turno || '').toUpperCase();

      const vTipoOp = String(veiculo.tipoOp || '').toUpperCase();

      const target = filterTurnoOp.toUpperCase();

      if (target === 'LINHA VIVA') {

        if (vTipoOp !== 'LINHA VIVA') return false;

      } else {

        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

        if (normalize(vTurno) !== normalize(target)) return false;

      }

    }



    return true;

  });



  const getTicketsForStage = (stage) => {

    return activeChamados.filter(c => getEtapaWorkflow(c) === stage);

  };



  const stages = [

    { 

      id: 'Análise Frota', 

      label: 'Análise Frota', 

      color: 'rose', 

      bg: 'bg-rose-500/10', 

      border: 'border-rose-500/20', 

      text: 'text-rose-400',

      glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',

      borderLeft: 'border-l-4 border-l-rose-500',

      icon: Wrench,

      pulseClass: 'bg-rose-500 animate-ping'

    },

    { 

      id: 'Oficina Interna', 

      label: 'Oficina Interna', 

      color: 'fuchsia', 

      bg: 'bg-fuchsia-500/10', 

      border: 'border-fuchsia-500/20', 

      text: 'text-fuchsia-400',

      glow: 'shadow-[0_0_15px_rgba(217,70,239,0.15)]',

      borderLeft: 'border-l-4 border-l-fuchsia-500',

      icon: Home,

      pulseClass: 'bg-fuchsia-500 animate-ping'

    },

    { 

      id: 'Aguardando Desequipar', 

      label: 'Desequipar', 

      color: 'amber', 

      bg: 'bg-amber-500/10', 

      border: 'border-amber-500/20', 

      text: 'text-amber-400',

      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse',

      borderLeft: 'border-l-4 border-l-amber-500',

      icon: Clock,

      pulseClass: 'bg-amber-500 animate-ping'

    },

    { 

      id: 'Desequipado - Entrada Oficina', 

      label: 'Desequipado (Entrada)', 

      color: 'indigo', 

      bg: 'bg-indigo-500/10', 

      border: 'border-indigo-500/20', 

      text: 'text-indigo-400',

      glow: 'shadow-[0_0_15px_rgba(99,102,241,0.2)] animate-pulse',

      borderLeft: 'border-l-4 border-l-indigo-500',

      icon: ClipboardCheck,

      pulseClass: 'bg-indigo-500 animate-ping'

    },

    { 

      id: 'Oficina Externa', 

      label: 'Oficina Externa', 

      color: 'purple', 

      bg: 'bg-purple-500/10', 

      border: 'border-purple-500/20', 

      text: 'text-purple-400',

      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',

      borderLeft: 'border-l-4 border-l-purple-500',

      icon: Truck,

      pulseClass: 'bg-purple-500 animate-ping'

    },

    { 

      id: 'Liberado Operação', 

      label: 'Liberados para Teste', 

      color: 'emerald', 

      bg: 'bg-emerald-500/10', 

      border: 'border-emerald-500/20', 

      text: 'text-emerald-400',

      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse',

      borderLeft: 'border-l-4 border-l-emerald-500',

      icon: PlayCircle,

      pulseClass: 'bg-emerald-500 animate-ping'

    }

  ];



  const getParadoTime = (c) => {

    const stage = getEtapaWorkflow(c);

    let ts = c.dadosWorkflow?.timestamps?.[stage];



    if (!ts && c.etapaWorkflow) {

      ts = c.dadosWorkflow?.timestamps?.[c.etapaWorkflow];

    }



    if (!ts && c.historicoModificacoes && c.historicoModificacoes.length > 0) {

      const transitionLog = c.historicoModificacoes.find(log => 

        log.descricao && 

        !log.descricao.startsWith('Edição:') && 

        !log.descricao.startsWith('Edição ') &&

        (log.descricao.toLowerCase().includes('enviou') || 

         log.descricao.toLowerCase().includes('confirmou') || 

         log.descricao.toLowerCase().includes('liberou') || 

         log.descricao.toLowerCase().includes('aceitou') ||

         log.descricao.toLowerCase().includes('alteração manual') || 

         log.descricao.toLowerCase().includes('alteração') || 

         log.descricao.toLowerCase().includes('registrado') || 

         log.descricao.toLowerCase().includes('inicial'))

      );

      if (transitionLog) {

        ts = transitionLog.dataHora;

      }

    }



    if (!ts) {

      ts = c.dataAbertura;

    }



    const diffMs = time - new Date(ts);

    const diffHrs = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

    const diffMins = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

    

    if (diffHrs >= 24) {

      const days = Math.floor(diffHrs / 24);

      const remainingHrs = diffHrs % 24;

      return `${days}d ${remainingHrs}h`;

    }

    return `${diffHrs}h ${diffMins}m`;

  };



  return (

    <div className="absolute inset-0 bg-[#0B0F19] z-30 flex flex-col p-6 overflow-hidden text-slate-100 font-sans">

      <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6 shrink-0 gap-4">

        <div className="flex items-center gap-3 shrink-0">

          {onVoltar && (

            <>

              <button 

                onClick={onVoltar} 

                className="px-4.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 active:scale-95 shadow-md shrink-0"

                title="Voltar para o Dashboard"

              >

                <ArrowLeft size={14} /> Voltar

              </button>

              <div className="h-6 w-px bg-slate-800 shrink-0"></div>

            </>

          )}

          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/5">

            <Tv size={20} className="text-indigo-400 animate-pulse" />

          </div>

          <div>

            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 leading-none">

              PAINEL OPERACIONAL DE ACOMPANHAMENTO <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 rounded-full px-2 py-0.5 animate-pulse shrink-0">SUPORT TV</span>

            </h1>

            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Controle em tempo real de chamados ativos</p>

          </div>

        </div>



        {/* FILTERS DECK */}

        <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-800/60 rounded-3xl p-3 shrink-0">

          {/* Group 0: Regional */}

          {(['Global'].includes(currentUser?.regional) || ['ADMINISTRADOR', 'GERENTE'].includes(currentUser?.perfil)) && (

            <div className="flex items-center gap-2 border-r border-slate-800/80 pr-4">

              <span className="text-[9px] font-black text-slate-500 tracking-wider uppercase shrink-0">REG:</span>

              <select 

                  value={activeRegional} 

                  onChange={(e) => setActiveRegional(e.target.value)}

                  className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/50 rounded-full px-3 py-1 text-[9px] font-black outline-none cursor-pointer uppercase"

              >

                  <option value="Todas">GLOBAL</option>

                  <option value="Norte">NORTE</option>

                  <option value="Leste">LESTE</option>

              </select>

            </div>

          )}

          {/* Group 1: Tipo */}

          <div className="flex items-center gap-2 border-r border-slate-800/80 pr-4">

            <span className="text-[9px] font-black text-slate-500 tracking-wider uppercase shrink-0">TIPO:</span>

            <div className="flex gap-1.5">

              {['PESADO', 'LEVE', 'MOTO'].map(t => {

                const active = filterTipo === t;

                return (

                  <button

                    key={t}

                    onClick={() => setFilterTipo(active ? null : t)}

                    className={`px-3 py-1 rounded-full text-[9px] font-black transition-all duration-200 border uppercase tracking-wider ${

                      active 

                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]' 

                        : 'bg-slate-950/60 text-slate-400 border-slate-850 hover:bg-slate-800 hover:text-white'

                    }`}

                  >

                    {t}

                  </button>

                );

              })}

            </div>

          </div>

          {/* Group 2: Turno / Op */}

          <div className="flex items-center gap-2">

            <span className="text-[9px] font-black text-slate-500 tracking-wider uppercase shrink-0">GRUPO:</span>

            <div className="flex gap-1.5">

              {['MANHÃ', 'TARDE', 'LINHA VIVA'].map(g => {

                const active = filterTurnoOp === g;

                return (

                  <button

                    key={g}

                    onClick={() => setFilterTurnoOp(active ? null : g)}

                    className={`px-3 py-1 rounded-full text-[9px] font-black transition-all duration-200 border uppercase tracking-wider ${

                      active 

                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 

                        : 'bg-slate-950/60 text-slate-400 border-slate-850 hover:bg-slate-800 hover:text-white'

                    }`}

                  >

                    {g}

                  </button>

                );

              })}

            </div>

          </div>

        </div>



        <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-1.5 shadow-inner shrink-0">

          <div className="text-right">

            <p className="text-[8px] font-black text-slate-500 tracking-wider leading-none">CALENDÁRIO</p>

            <p className="text-[9px] font-bold text-slate-300 mt-1 font-mono">{formatCalendar(time)}</p>

          </div>

          <div className="h-6 w-px bg-slate-800"></div>

          <div className="text-right">

            <p className="text-[8px] font-black text-indigo-400 tracking-wider leading-none">RELÓGIO</p>

            <p className="text-lg font-black text-white mt-0.5 font-mono drop-shadow-[0_0_4px_rgba(255,255,255,0.1)]">{formatClock(time)}</p>

          </div>

        </div>

      </div>



      <div className="flex-1 grid grid-cols-6 gap-3 overflow-hidden min-h-0">

        {stages.map(stg => {

          const list = getTicketsForStage(stg.id);

          const IconComp = stg.icon;

          

          return (

            <div key={stg.id} className="flex flex-col bg-slate-950/40 border border-slate-800/50 rounded-[2rem] overflow-hidden min-h-0">

              <div className="p-4 bg-slate-950/60 border-b border-slate-800/60 flex justify-between items-center shrink-0">

                <div className="flex items-center gap-2.5 min-w-0">

                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stg.bg} border ${stg.border}`}>

                    <IconComp size={16} className={stg.text} />

                  </div>

                  <div className="min-w-0">

                    <h2 className="text-xs font-black text-white tracking-wide uppercase truncate">{stg.label}</h2>

                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-0.5">Etapa Workflow</p>

                  </div>

                </div>

                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${stg.text} ${stg.bg} border ${stg.border} ${stg.glow} transition-all duration-500`}>

                  {list.length}

                </div>

              </div>



              <AutoScrollingContainer listLength={list.length} className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar no-scrollbar hover:custom-scrollbar pr-1">

                {list.length === 0 ? (

                  <div className="h-full flex flex-col items-center justify-center text-slate-600 py-10">

                    <CheckSquare size={32} className="opacity-15 mb-2" />

                    <p className="text-[10px] font-black uppercase tracking-wider">Sem veículos nesta etapa</p>

                  </div>

                ) : (

                  list.map(c => {

                    const veiculo = vehiclesMap.get(c.placa);

                    

                    return (

                      <div key={c.id} className={`bg-slate-900/50 border border-slate-850 hover:border-slate-800 rounded-3xl p-3.5 space-y-3 relative group transition-all duration-300 shadow-md ${stg.borderLeft}`}>

                        

                        {/* Live Ping Indicator */}

                        <div className="absolute top-4 right-4 flex items-center justify-center">

                          <span className="relative flex h-2 w-2 shrink-0">

                            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${stg.pulseClass}`}></span>

                            <span className={`relative inline-flex rounded-full h-2 w-2 ${stg.pulseClass.split(' ')[0]}`}></span>

                          </span>

                        </div>



                        {/* License Plate & Badges Stack Block */}

                        <div className="flex flex-col items-center gap-2 w-full">

                          {/* Premium Mercosul Plate Graphic */}

                          <div className="w-[135px] h-[46px] border-[1.5px] border-slate-950 rounded-[6px] overflow-hidden bg-white flex flex-col items-center justify-center shrink-0 shadow-md">

                            <div className="w-full bg-[#003399] h-[10px] flex items-center justify-between px-1.5 shrink-0">

                              <span className="text-[5px] text-white font-black tracking-widest leading-none">BRASIL</span>

                              <div className="w-3.5 h-2 bg-emerald-600 rounded-[0.5px] relative flex items-center justify-center overflow-hidden shrink-0 scale-90">

                                <div className="w-2.5 h-1.5 bg-yellow-400 rotate-45 flex items-center justify-center">

                                  <div className="w-[4px] h-[4px] bg-blue-700 rounded-full"></div>

                                </div>

                              </div>

                            </div>

                            <div className="w-full flex-1 flex items-center justify-center bg-white leading-none">

                              <span className="font-mono text-xl font-black tracking-wider text-slate-950 leading-none select-all uppercase">

                                {c.placa}

                              </span>

                            </div>

                          </div>



                          {/* Operational Badges (Placed below plate as a single line) */}

                          {veiculo ? (

                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex flex-wrap items-center justify-center gap-1.5 mt-0.5">

                              <span>{String(veiculo.tipo || '').toUpperCase()}</span>

                              <span className="text-slate-600">|</span>

                              <span>{String(veiculo.subTipo || 'LEVE').toUpperCase()}</span>

                              {veiculo.turno && (

                                <>

                                  <span className="text-slate-600">|</span>

                                  <span className="text-indigo-400">{String(veiculo.turno).toUpperCase()}</span>

                                </>

                              )}

                            </div>

                          ) : (

                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block text-center mt-0.5">FROTA NÃO VINCULADA</span>

                          )}

                        </div>



                        {/* Workflow Timer & Defect Details */}

                        <div className="border-t border-slate-800/80 pt-2.5 flex justify-between items-center gap-2">

                          <div className="shrink-0">

                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">TEMPO NA ETAPA</p>

                            <div className="flex items-center gap-2 mt-1">

                              <p className={`text-sm font-black ${stg.text} font-mono tracking-wider leading-none`}>

                                {getParadoTime(c)}

                              </p>

                              {c.situacaoVeiculo === 'PARADO' && (

                                <span className="px-1.5 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[8px] font-black tracking-widest uppercase rounded animate-pulse shrink-0">

                                  ð´ IMPEDITIVO

                                </span>

                              )}

                            </div>

                          </div>

                          

                          <div className="min-w-0 text-right flex-1">

                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">DEFEITO PRINCIPAL</p>

                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-wide truncate mt-1 leading-none">

                              {c.defeitoPrincipal || 'Outros'}

                            </p>

                          </div>
      </div>
    </div>
  );
})

                )}

              </AutoScrollingContainer>

            </div>

          );

        })}

      </div>

    </div>

  );

}



// ============================================================================

// VISTA: ENTREGA EQUIPES (MODELO RELATÓRIO)

// ============================================================================



const DATA_NORTE = {

  resumo: [

    {

      title: "Bases",

      items: [

        { name: "Fagundes Filho", plan: 42, real: 33 },

        { name: "Cajati", plan: 24, real: 22 },

        { name: "VL. Medeiros", plan: 28, real: 27 },

        { name: "LV", plan: 18, real: 0 },

        { name: "Munk", plan: 5, real: 0 }

      ],

      totais: [

        { name: "Total TMA", plan: 94, real: 82 },

        { name: "Total LV + TMA", plan: 117, real: 82 }

      ]

    },

    {

      title: "Turno",

      items: [

        { name: "Manhã", plan: 39, real: 32 },

        { name: "Tarde", plan: 42, real: 36 },

        { name: "Noite", plan: 13, real: 14 }

      ],

      totais: [

        { name: "Total TMA", plan: 94, real: 82 },

        { name: "Total LV + TMA", plan: 23, real: 0 }

      ]

    },

    {

      title: "Tipo Veículo",

      items: [

        { name: "Cesto Aéreo", plan: 68, real: 59 },

        { name: "Veículo Leve", plan: 13, real: 16 },

        { name: "Moto", plan: 13, real: 7 },

        { name: "LV", plan: 18, real: 0 },

        { name: "Munk", plan: 5, real: 0 }

      ],

      totais: [

        { name: "Total TMA", plan: 94, real: 82 },

        { name: "Total LV + TMA", plan: 23, real: 0 }

      ]

    }

  ],

  tempos: ["06:00", "07:00", "08:00", "10:00", "12:00", "14:00", "20:00", "22:00"],

  detalhes: [

    {

      base: "TOTAL NORTE",

      veiculos: [

        { tipo: "Cesto Aéreo", plan: [6, 0, 4, 10, 25, 13, 4, 6], real: [5, 0, 11, 3, 18, 10, 7, 5] },

        { tipo: "Veículo Leve", plan: [4, 0, 2, 0, 2, 2, 0, 3], real: [6, 0, 0, 0, 5, 3, 1, 1] },

        { tipo: "Moto", plan: [0, 0, 13, 0, 0, 0, 0, 0], real: [0, 0, 7, 0, 0, 0, 0, 0] },

        { tipo: "LV", plan: [0, 0, 18, 0, 0, 0, 0, 0], real: [0, 0, 0, 0, 0, 0, 0, 0] },

        { tipo: "Munk", plan: [0, 0, 3, 0, 0, 0, 2, 0], real: [0, 0, 0, 0, 0, 0, 0, 0] }

      ]

    },

    {

      base: "FAGUNDES FILHO",

      veiculos: [

        { tipo: "Cesto Aéreo", plan: [2, 0, 2, 6, 11, 7, 2, 2], real: [1, 0, 6, 1, 7, 5, 2, 3] },

        { tipo: "Veículo Leve", plan: [2, 0, 0, 0, 2, 0, 0, 1], real: [2, 0, 0, 0, 2, 1, 0, 1] },

        { tipo: "Moto", plan: [0, 0, 5, 0, 0, 0, 0, 0], real: [0, 0, 2, 0, 0, 0, 0, 0] },

        { tipo: "LV", plan: [0, 0, 6, 0, 0, 0, 0, 0], real: [0, 0, 0, 0, 0, 0, 0, 0] },

        { tipo: "Munk", plan: [0, 0, 1, 0, 0, 0, 1, 0], real: [0, 0, 0, 0, 0, 0, 0, 0] }

      ]

    },

    {

      base: "CAJATI",

      veiculos: [

        { tipo: "Cesto Aéreo", plan: [2, 0, 0, 2, 7, 2, 1, 2], real: [2, 0, 2, 0, 5, 2, 3, 1] },

        { tipo: "Veículo Leve", plan: [1, 0, 1, 0, 0, 1, 0, 1], real: [2, 0, 0, 0, 2, 1, 0, 0] },

        { tipo: "Moto", plan: [0, 0, 4, 0, 0, 0, 0, 0], real: [0, 0, 2, 0, 0, 0, 0, 0] },

        { tipo: "LV", plan: [0, 0, 6, 0, 0, 0, 0, 0], real: [0, 0, 0, 0, 0, 0, 0, 0] },

        { tipo: "Munk", plan: [0, 0, 1, 0, 0, 0, 1, 0], real: [0, 0, 0, 0, 0, 0, 0, 0] }

      ]

    },

    {

      base: "VILA MEDEIROS",

      veiculos: [

        { tipo: "Cesto Aéreo", plan: [2, 0, 2, 2, 7, 4, 1, 2], real: [2, 0, 3, 2, 6, 3, 2, 1] },

        { tipo: "Veículo Leve", plan: [1, 0, 1, 0, 0, 1, 0, 1], real: [2, 0, 0, 0, 1, 1, 1, 0] },

        { tipo: "Moto", plan: [0, 0, 4, 0, 0, 0, 0, 0], real: [0, 0, 3, 0, 0, 0, 0, 0] },

        { tipo: "LV", plan: [0, 0, 6, 0, 0, 0, 0, 0], real: [0, 0, 0, 0, 0, 0, 0, 0] },

        { tipo: "Munk", plan: [0, 0, 1, 0, 0, 0, 0, 0], real: [0, 0, 0, 0, 0, 0, 0, 0] }

      ]

    }

  ]

};



const DATA_LESTE = {

  resumo: [

    {

      title: "Bases",

      items: [

        { name: "Monte Santo", plan: 30, real: 30 },

        { name: "Catumbi", plan: 19, real: 18 },

        { name: "Aricanduva", plan: 30, real: 29 },

        { name: "Santo André", plan: 7, real: 5 },

        { name: "MUNK", plan: 0, real: 1 },

        { name: "LV", plan: 0, real: 0 }

      ],

      totais: [

        { name: "Total", plan: 86, real: 82 }

      ]

    },

    {

      title: "Turno",

      items: [

        { name: "Manhã", plan: 35, real: 35 },

        { name: "Tarde", plan: 34, real: 31 },

        { name: "Noite", plan: 25, real: 17 }

      ],

      totais: [

        { name: "Total", plan: 94, real: 83 }

      ]

    },

    {

      title: "Tipo Veículo",

      items: [

        { name: "Cesto Aéreo", plan: 66, real: 64 },

        { name: "Veículo Leve", plan: 15, real: 14 },

        { name: "Moto", plan: 5, real: 4 },

        { name: "MUNK", plan: 0, real: 1 },

        { name: "LV", plan: 0, real: 0 }

      ],

      totais: [

        { name: "Total", plan: 86, real: 83 }

      ]

    }

  ],

  tempos: ["06:00", "07:00", "08:00", "10:00", "12:00", "14:00", "16:00", "20:00", "22:00"],

  detalhes: [

    {

      base: "TOTAL LESTE",

      veiculos: [

        { tipo: "Cesto Aéreo", plan: [9, 0, 12, 0, 17, 11, 0, 15, 2], real: [8, 1, 17, 0, 12, 12, 0, 9, 5] },

        { tipo: "Veículo Leve", plan: [2, 0, 3, 0, 5, 1, 0, 3, 1], real: [0, 0, 4, 0, 7, 0, 0, 2, 1] },

        { tipo: "Moto", plan: [0, 0, 5, 0, 0, 0, 0, 0, 0], real: [0, 0, 4, 0, 0, 0, 0, 0, 0] },

        { tipo: "LV", plan: [0, 0, 0, 0, 0, 0, 0, 0, 0], real: [0, 0, 0, 0, 0, 0, 0, 0, 0] },

        { tipo: "Munk", plan: [0, 1, 4, 0, 0, 0, 0, 4, 0], real: [1, 0, 0, 0, 0, 0, 0, 0, 0] }

      ]

    },

    {

      base: "MONTE SANTO",

      veiculos: [

        { tipo: "Cesto Aéreo", plan: [3, 0, 4, 0, 6, 4, 0, 5, 1], real: [2, 0, 8, 0, 3, 5, 0, 2, 4] },

        { tipo: "Veículo Leve", plan: [1, 0, 1, 0, 2, 0, 0, 1, 1], real: [0, 0, 1, 0, 2, 0, 0, 1, 1] },

        { tipo: "Moto", plan: [0, 0, 1, 0, 0, 0, 0, 0, 0], real: [0, 0, 1, 0, 0, 0, 0, 0, 0] },

        { tipo: "LV", plan: [0, 0, 0, 0, 0, 0, 0, 0, 0], real: [0, 0, 0, 0, 0, 0, 0, 0, 0] },

        { tipo: "Munk", plan: [0, 0, 1, 0, 0, 0, 0, 1, 0], real: [0, 0, 0, 0, 0, 0, 0, 0, 0] }

      ]

    },

    {

      base: "CATUMBI",

      veiculos: [

        { tipo: "Cesto Aéreo", plan: [2, 0, 3, 0, 4, 3, 0, 4, 0], real: [2, 0, 1, 0, 3, 4, 0, 4, 0] },

        { tipo: "Veículo Leve", plan: [0, 0, 1, 0, 0, 0, 0, 1, 0], real: [0, 0, 1, 0, 2, 0, 0, 0, 0] },

        { tipo: "Moto", plan: [0, 0, 1, 0, 0, 0, 0, 0, 0], real: [0, 0, 1, 0, 0, 0, 0, 0, 0] },

        { tipo: "Munk", plan: [0, 0, 1, 0, 0, 0, 0, 1, 0], real: [0, 0, 0, 0, 0, 0, 0, 0, 0] }

      ]

    },

    {

      base: "ARICANDUVA",

      veiculos: [

        { tipo: "Cesto Aéreo", plan: [3, 0, 5, 0, 6, 4, 0, 5, 1], real: [3, 1, 8, 0, 5, 3, 0, 3, 1] },

        { tipo: "Veículo Leve", plan: [1, 0, 0, 0, 2, 1, 0, 1, 0], real: [0, 0, 1, 0, 2, 0, 0, 1, 0] },

        { tipo: "Moto", plan: [0, 0, 1, 0, 0, 0, 0, 0, 0], real: [0, 0, 1, 0, 0, 0, 0, 0, 0] },

        { tipo: "Munk", plan: [0, 0, 1, 0, 0, 0, 0, 1, 0], real: [0, 0, 0, 0, 0, 0, 0, 0, 0] }

      ]

    },

    {

      base: "SANTO ANDRÉ",

      veiculos: [

        { tipo: "Cesto Aéreo", plan: [1, 0, 0, 0, 1, 0, 0, 1, 0], real: [1, 0, 0, 0, 1, 0, 0, 0, 0] },

        { tipo: "Veículo Leve", plan: [0, 0, 1, 0, 1, 0, 0, 0, 0], real: [0, 0, 1, 0, 1, 0, 0, 0, 0] },

        { tipo: "Moto", plan: [0, 0, 2, 0, 0, 0, 0, 0, 0], real: [0, 0, 1, 0, 0, 0, 0, 0, 0] },

        { tipo: "Munk", plan: [0, 1, 1, 0, 0, 0, 0, 1, 0], real: [1, 0, 0, 0, 0, 0, 0, 0, 0] }

      ]

    }

  ]

};



function getEntregaCellClass(plan, real, type, isTotal = false) {

  if (type === 'plan') {

    return isTotal 

      ? 'bg-slate-100/80 text-slate-500 font-bold border-l border-slate-200' 

      : 'bg-slate-50/50 text-slate-400 font-medium border-l border-slate-100';

  }

  if (real >= plan) {

    return isTotal 

      ? 'bg-emerald-100/30 text-emerald-700 font-black border-l border-slate-200' 

      : 'bg-emerald-50/60 text-emerald-600 font-bold border-l border-slate-100';

  }

  return isTotal 

    ? 'bg-rose-100/30 text-rose-700 font-black border-l border-slate-200' 

    : 'bg-rose-50/60 text-rose-600 font-bold border-l border-slate-100';

}



function getEntregaGapClass(gap) {

  return gap >= 0 

    ? 'bg-emerald-50 text-emerald-700 font-bold' 

    : 'bg-rose-50 text-rose-700 font-bold';

}



function getTurnoFromHorario(horario) {

  if (['06:00', '07:00', '08:00', '10:00'].includes(horario)) return 'Manhã';

  if (['12:00', '14:00', '16:00'].includes(horario)) return 'Tarde';

  if (['20:00', '22:00'].includes(horario)) return 'Noite';

  return 'Outro';

}



function MultiSelectDropdown({ options, selected, onChange, label, placeholder = 'Selecione...' }) {

  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = React.useRef(null);



  useEffect(() => {

    function handleClickOutside(event) {

      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {

        setIsOpen(false);

      }

    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);



  const handleToggle = (value) => {

    if (value === 'todos') {

      onChange(['todos']);

    } else {

      let nextSelected = selected.filter(x => x !== 'todos');

      if (nextSelected.includes(value)) {

        nextSelected = nextSelected.filter(x => x !== value);

      } else {

        nextSelected = [...nextSelected, value];

      }

      if (nextSelected.length === 0 || nextSelected.length === options.length) {

        onChange(['todos']);

      } else {

        onChange(nextSelected);

      }

    }

  };



  const isSelected = (value) => {

    if (value === 'todos') {

      return selected.includes('todos') || selected.length === 0;

    }

    return selected.includes(value) && !selected.includes('todos');

  };



  const getDisplayText = () => {

    if (selected.includes('todos') || selected.length === 0) {

      return 'Todos';

    }

    if (selected.length === 1) {

      const opt = options.find(o => o.value === selected[0]);

      return opt ? opt.label : selected[0];

    }

    return `${selected.length} selecionados`;

  };



  return (

    <div className="relative flex flex-col gap-1 w-full sm:w-auto min-w-[160px]" ref={dropdownRef}>

      {label && <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</label>}

      <button

        type="button"

        onClick={() => setIsOpen(!isOpen)}

        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none w-full cursor-pointer flex justify-between items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-850 transition-all active:scale-98"

      >

        <span className="truncate">{getDisplayText()}</span>

        <ChevronRight size={14} className={`transform transition-transform text-slate-400 ${isOpen ? 'rotate-90' : ''}`} />

      </button>



      {isOpen && (

        <div className="absolute top-[calc(100%+4px)] left-0 w-full sm:min-w-[200px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 flex flex-col gap-1 max-h-[280px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">

          <button

            type="button"

            onClick={() => {

              onChange(['todos']);

              setIsOpen(false);

            }}

            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${

              selected.includes('todos') || selected.length === 0

                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'

                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'

            }`}

          >

            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${

              selected.includes('todos') || selected.length === 0

                ? 'bg-blue-600 border-blue-600 text-white'

                : 'border-slate-300 dark:border-slate-700'

            }`}>

              {(selected.includes('todos') || selected.length === 0) && <Check size={10} className="stroke-[3]" />}

            </div>

            Todos

          </button>

          

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />



          {options.map((opt) => {

            const checked = isSelected(opt.value);

            return (

              <button

                key={opt.value}

                type="button"

                onClick={() => handleToggle(opt.value)}

                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${

                  checked

                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'

                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'

                }`}

              >

                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${

                  checked

                    ? 'bg-blue-600 border-blue-600 text-white'

                    : 'border-slate-300 dark:border-slate-700'

                }`}>

                  {checked && <Check size={10} className="stroke-[3]" />}

                </div>

                {opt.label}

              </button>

            );

          })}

        </div>

      )}

    </div>

  );

}



function EntregaEquipesView({ hoje, theme, currentUser, userPermissions }) {

  const isAdminOrCoord = ['GERENTE', 'COORDENADOR', 'ADMINISTRADOR'].includes(currentUser?.perfil);

  const [activeRegionTab, setActiveRegionTab] = useState('norte');

  const [dataSelecionada, setDataSelecionada] = useState(() => {

    const d = new Date();

    const ano = d.getFullYear();

    const mes = String(d.getMonth() + 1).padStart(2, '0');

    const dia = String(d.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;

  });



  const [datasComDados, setDatasComDados] = useState([]);

  const [lastUpdate, setLastUpdate] = useState(null);

  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarRef = React.useRef(null);



  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();



  const prevMonth = () => {

    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  };



  const nextMonth = () => {

    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  };



  const fetchMetadata = async () => {

    try {

      let allDates = [];

      let page = 0;

      let hasMore = true;

      while (hasMore) {

        const { data, error } = await supabase

          .from('entregas_equipes')

          .select('dataRegistro')

          .range(page * 1000, (page + 1) * 1000 - 1);

        

        if (error) throw error;

        if (data && data.length > 0) {

          allDates = [...allDates, ...data];

          if (data.length < 1000) {

            hasMore = false;

          } else {

            page++;

          }

        } else {

          hasMore = false;

        }

      }

      

      const uniqueDates = [...new Set(allDates.map(d => d.dataRegistro))].sort();

      setDatasComDados(uniqueDates);



      const { data: lastUpData } = await supabase

        .from('entregas_equipes')

        .select('created_at')

        .order('created_at', { ascending: false })

        .limit(1);

      if (lastUpData && lastUpData.length > 0) {

        setLastUpdate(lastUpData[0].created_at);

      }

    } catch (err) {

      console.error('Erro ao buscar metadados:', err);

    }

  };



  useEffect(() => {

    fetchMetadata();

  }, []);



  useEffect(() => {

    function handleClickOutside(event) {

      if (calendarRef.current && !calendarRef.current.contains(event.target)) {

        setShowCalendarDropdown(false);

      }

    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {

      document.removeEventListener("mousedown", handleClickOutside);

    };

  }, []);



  const [registros, setRegistros] = useState([]);

  const [planejamentos, setPlanejamentos] = useState([]);

  const [loading, setLoading] = useState(false);

  const [importLoading, setImportLoading] = useState(false);

  const [importPlanLoading, setImportPlanLoading] = useState(false);

  const [saveLoading, setSaveLoading] = useState(false);



  const [isEditingPlan, setIsEditingPlan] = useState(false);

  const [editPlanState, setEditPlanState] = useState({});



  const [activeSubTab, setActiveSubTab] = useState('diario');

  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {

    const d = new Date();

    const ano = d.getFullYear();

    const mes = String(d.getMonth() + 1).padStart(2, '0');

    return `${ano}-${mes}`;

  });

  const [dashboardData, setDashboardData] = useState([]);

  const [dashLoading, setDashLoading] = useState(false);



  // Filtros Globais (Painel Principal de Evolução)

  const [globalRegion, setGlobalRegion] = useState(['todos']);

  const [globalBase, setGlobalBase] = useState(['todos']);

  const [globalTurno, setGlobalTurno] = useState(['todos']);

  const [globalVehicle, setGlobalVehicle] = useState(['todos']);



  // Filtros Locais dos Sub-dashboards

  const [cardATurno, setCardATurno] = useState(['todos']);

  const [cardAVehicle, setCardAVehicle] = useState(['todos']);



  const [cardBBase, setCardBBase] = useState(['todos']);

  const [cardBVehicle, setCardBVehicle] = useState(['todos']);



  const [cardCBase, setCardCBase] = useState(['todos']);

  const [cardCTurno, setCardCTurno] = useState(['todos']);



  const fetchDashboardMonthData = async () => {

    if (activeSubTab !== 'evolucao' || !selectedYearMonth) return;

    setDashLoading(true);

    try {

      const start = `${selectedYearMonth}-01`;

      const end = `${selectedYearMonth}-31`;

      

      let allMonthData = [];

      let page = 0;

      let hasMore = true;

      

      while (hasMore) {

        const { data, error } = await supabase

          .from('entregas_equipes')

          .select('*')

          .gte('dataRegistro', start)

          .lte('dataRegistro', end)

          .range(page * 1000, (page + 1) * 1000 - 1);

          

        if (error) throw error;

        if (data && data.length > 0) {

          allMonthData = [...allMonthData, ...data];

          if (data.length < 1000) {

            hasMore = false;

          } else {

            page++;

          }

        } else {

          hasMore = false;

        }

      }

      

      setDashboardData(allMonthData);

    } catch (err) {

      console.error('Erro ao buscar dados do dashboard:', err);

    } finally {

      setDashLoading(false);

    }

  };



  useEffect(() => {

    fetchDashboardMonthData();

  }, [selectedYearMonth, activeSubTab]);



  useEffect(() => {

    if (!globalRegion.includes('todos')) {

      const allowed = [];

      if (globalRegion.includes('norte')) {

        allowed.push('Fagundes Filho', 'Cajati', 'Vila Medeiros', 'LV', 'Munk');

      }

      if (globalRegion.includes('leste')) {

        allowed.push('Monte Santo', 'Catumbi', 'Aricanduva', 'Santo André', 'LV', 'Munk');

      }

      if (!globalBase.includes('todos')) {

        const nextBases = globalBase.filter(b => allowed.includes(b));

        if (nextBases.length === 0) {

          setGlobalBase(['todos']);

        } else if (nextBases.length !== globalBase.length) {

          setGlobalBase(nextBases);

        }

      }

    }

  }, [globalRegion]);



  const [collapsedStates, setCollapsedStates] = useState({

    norte: { 0: false, 1: false, 2: false, 3: false },

    leste: { 0: false, 1: false, 2: false, 3: false, 4: false }

  });



  const fetchData = async () => {

    setLoading(true);

    try {

      const { data: regData, error: regError } = await supabase

        .from('entregas_equipes')

        .select('*')

        .eq('dataRegistro', dataSelecionada);

      if (regError) throw regError;



      const { data: planData, error: planError } = await supabase

        .from('planejamento_equipes')

        .select('*');

      if (planError) throw planError;



      setRegistros(regData || []);

      setPlanejamentos(planData || []);

      if (activeSubTab === 'evolucao') {

        fetchDashboardMonthData();

      }

    } catch (err) {

      console.error('Erro ao buscar dados:', err);

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    fetchData();

    setIsEditingPlan(false);

    setEditPlanState({});

  }, [dataSelecionada]);



  const toggleCollapse = (region, bIdx) => {

    setCollapsedStates(prev => ({

      ...prev,

      [region]: {

        ...prev[region],

        [bIdx]: !prev[region][bIdx]

      }

    }));

  };



  const toggleAll = (region, collapse) => {

    setCollapsedStates(prev => {

      const regionStates = { ...prev[region] };

      Object.keys(regionStates).forEach(key => {

        regionStates[key] = collapse;

      });

      return {

        ...prev,

        [region]: regionStates

      };

    });

  };



  const handleBaseFileUpload = async (e) => {

    if (!['ADMINISTRADOR', 'GERENTE', 'COORDENADOR'].includes(currentUser?.perfil)) {

      alert('Acesso negado: Apenas administradores, gerentes ou coordenadores podem realizar importações de planilhas.');

      e.target.value = null;

      return;

    }

    const file = e.target.files[0];

    if (!file) return;

    setImportLoading(true);

    

    const reader = new FileReader();

    reader.onload = async (evt) => {

      try {

        const bstr = evt.target.result;

        const wb = XLSX.read(bstr, { type: 'binary' });

        const wsname = wb.SheetNames[0];

        const ws = wb.Sheets[wsname];

        const data = XLSX.utils.sheet_to_json(ws);

        

        if (data.length === 0) {

          throw new Error('O arquivo carregado está vazio.');

        }

        

        const firstRow = data[0];

        if (!firstRow['ChaveUnica'] || !firstRow['Nome'] || !firstRow['Base'] || !firstRow['Horário'] || !firstRow['Veículo']) {

          throw new Error('O arquivo não contém as colunas obrigatórias: ChaveUnica, Nome, Base, Horário, Veículo.');

        }

        

        const rowsToUpsert = data.map(row => {

          const key = String(row['ChaveUnica'] || '').trim();

          let dataRegistro = '';

          if (key.length >= 10) {

            const datePart = key.substring(0, 10);

            const parts = datePart.split('/');

            if (parts.length === 3) {

              dataRegistro = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD

            }

          }

          if (!dataRegistro) {

            dataRegistro = dataSelecionada;

          }

          

          return {

            chaveUnica: key,

            dataRegistro: dataRegistro,

            horario: row['Horário'] ? String(row['Horário']).trim() : '',

            ut: row['UT'] ? String(row['UT']).trim() : '',

            base: row['Base'] ? String(row['Base']).trim() : '',

            veiculo: row['Veículo'] ? String(row['Veículo']).trim() : '',

            nome: row['Nome'] ? String(row['Nome']).trim() : '',

            inicioTurno: row['Início do turno'] !== undefined ? parseFloat(row['Início do turno']) : null,

            fimTurno: row['Fim do turno'] !== undefined ? parseFloat(row['Fim do turno']) : null,

            tempoLogadoDecimal: row['Tempo Logado Decimal'] !== undefined ? parseFloat(row['Tempo Logado Decimal']) : null,

            tempoRealDecimal: row['Tempo Real Decimal'] !== undefined ? parseFloat(row['Tempo Real Decimal']) : null,

            gapHora: row['GAP hora'] !== undefined ? parseFloat(row['GAP hora']) : null,

            tempoTeto: row['Tempo Teto'] !== undefined ? parseFloat(row['Tempo Teto']) : null,

            producaoReal: row['Produção Real'] !== undefined ? parseFloat(row['Produção Real']) : null,

            producaoPlan: row['Produção Plan'] !== undefined ? parseFloat(row['Produção Plan']) : null,

            producaoPlanReal: row['Produção Plan x Real'] !== undefined ? parseFloat(row['Produção Plan x Real']) : null,

            qtsOs: row['Qts OS'] !== undefined ? parseInt(row['Qts OS'], 10) : null,

            qtsPontos: row['Qts Pontos'] !== undefined ? parseInt(row['Qts Pontos'], 10) : null

          };

        }).filter(r => r.chaveUnica);



        const chunkSize = 100;

        for (let i = 0; i < rowsToUpsert.length; i += chunkSize) {

          const chunk = rowsToUpsert.slice(i, i + chunkSize);

          const { error } = await supabase.from('entregas_equipes').upsert(chunk, { onConflict: 'chaveUnica' });

          if (error) throw error;

        }

        

        // Fetch existing plans to preserve customized ones

        const { data: existingPlans, error: planFetchErr } = await supabase

          .from('planejamento_equipes')

          .select('*');

        if (planFetchErr) throw planFetchErr;

        

        const existingPlanMap = {};

        (existingPlans || []).forEach(p => {

          const key = `${p.base}|${p.horario}|${p.veiculo}`;

          existingPlanMap[key] = p;

        });

        

        const planAggregates = {};

        const prefixToBaseMap = {

          'ESL': { base: 'Santo André', region: 'Leste' },

          'ENL': { base: 'Fagundes Filho', region: 'Norte' },

          'EQL': { base: 'Aricanduva', region: 'Leste' },

          'EVL': { base: 'Catumbi', region: 'Leste' },

          'ECL': { base: 'Cajati', region: 'Norte' },

          'EEL': { base: 'Vila Medeiros', region: 'Norte' },

          'EML': { base: 'Monte Santo', region: 'Leste' }

        };

        

        rowsToUpsert.forEach(r => {

          const planTeam = r.chaveUnica.substring(10);

          const planPrefix = planTeam.substring(0, 3);

          const planMeta = prefixToBaseMap[planPrefix];

          

          let planBase = r.base;

          if (planMeta) {

            planBase = planMeta.base;

          }

          planBase = getTitleCaseBase(planBase);

          

          const aggKey = `${planBase}|${r.horario}|${r.veiculo}`;

          planAggregates[aggKey] = (planAggregates[aggKey] || 0) + 1;

        });

        

        const planRowsToUpsert = Object.keys(planAggregates)

          .map(key => {

            const [base, hor, veic] = key.split('|');

            if (existingPlanMap[key] && existingPlanMap[key].customizado) {

              return null;

            }

            return {

              base: base,

              horario: hor,

              veiculo: veic,

              quantidadePlan: planAggregates[key],

              customizado: false

            };

          })

          .filter(Boolean);

        

        if (planRowsToUpsert.length > 0) {

          for (let i = 0; i < planRowsToUpsert.length; i += chunkSize) {

            const chunk = planRowsToUpsert.slice(i, i + chunkSize);

            const { error } = await supabase

              .from('planejamento_equipes')

              .upsert(chunk, { onConflict: 'base,horario,veiculo' });

            if (error) throw error;

          }

        }

        

        alert('Base de equipes importada e planejamento inicial atualizado com sucesso!');

        fetchData();

        fetchMetadata();

        

      } catch (err) {

        console.error('Erro na importação:', err);

        alert('Erro ao importar arquivo: ' + (err.message || 'Verifique o formato do arquivo.'));

      } finally {

        setImportLoading(false);

        e.target.value = null;

      }

    };

    reader.readAsBinaryString(file);

  };



  const handlePlanFileUpload = async (e) => {

    if (!['ADMINISTRADOR', 'GERENTE', 'COORDENADOR'].includes(currentUser?.perfil)) {

      alert('Acesso negado: Apenas administradores, gerentes ou coordenadores podem realizar importações de planilhas.');

      e.target.value = null;

      return;

    }

    const file = e.target.files[0];

    if (!file) return;

    setImportPlanLoading(true);

    

    const reader = new FileReader();

    reader.onload = async (evt) => {

      try {

        const bstr = evt.target.result;

        const wb = XLSX.read(bstr, { type: 'binary' });

        const wsname = wb.SheetNames[0];

        const ws = wb.Sheets[wsname];

        const data = XLSX.utils.sheet_to_json(ws);

        

        if (data.length === 0) {

          throw new Error('O arquivo de planejamento está vazio.');

        }

        

        // Mapeador de colunas de horários

        const hourHeaderMap = {

          '6:00:00 am': '06:00',

          '6:00 am': '06:00',

          '06:00': '06:00',

          '6:00': '06:00',

          '7:00:00 am': '07:00',

          '7:00 am': '07:00',

          '07:00': '07:00',

          '7:00': '07:00',

          '8:00:00 am': '08:00',

          '8:00 am': '08:00',

          '08:00': '08:00',

          '8:00': '08:00',

          '10:00:00 am': '10:00',

          '10:00 am': '10:00',

          '10:00': '10:00',

          '12:00:00 pm': '12:00',

          '12:00 pm': '12:00',

          '12:00': '12:00',

          '2:00:00 pm': '14:00',

          '2:00 pm': '14:00',

          '14:00': '14:00',

          '14:00:00': '14:00',

          '4:00:00 pm': '16:00',

          '4:00 pm': '16:00',

          '16:00': '16:00',

          '16:00:00': '16:00',

          '8:00:00 pm': '20:00',

          '8:00 pm': '20:00',

          '20:00': '20:00',

          '20:00:00': '20:00',

          '10:00:00 pm': '22:00',

          '10:00 pm': '22:00',

          '22:00': '22:00',

          '22:00:00': '22:00'

        };



        const firstRow = data[0];

        const keys = Object.keys(firstRow);

        const baseKey = keys.find(k => k.toUpperCase() === 'BASE');

        const veiculoKey = keys.find(k => k.toUpperCase() === 'TIPO VEÍCULO' || k.toUpperCase() === 'TIPO VEICULO' || k.toUpperCase() === 'VEÍCULO' || k.toUpperCase() === 'VEICULO');

        

        if (!baseKey || !veiculoKey) {

          throw new Error('O arquivo de planejamento deve conter as colunas "BASE" e "Tipo Veículo".');

        }



        const planAggregates = {};



        data.forEach(row => {

          const baseName = String(row[baseKey] || '').trim();

          const veicName = String(row[veiculoKey] || '').trim();

          if (!baseName || !veicName) return;



          const titleCaseBase = getTitleCaseBase(baseName);



          keys.forEach(k => {

            const normalizedKey = k.trim().toLowerCase();

            if (hourHeaderMap[normalizedKey]) {

              const targetHour = hourHeaderMap[normalizedKey];

              const val = row[k];

              const qty = typeof val === 'number' ? val : parseInt(val || 0, 10);

              const validQty = isNaN(qty) ? 0 : qty;



              const aggKey = `${titleCaseBase}|${targetHour}|${veicName}`;

              planAggregates[aggKey] = (planAggregates[aggKey] || 0) + validQty;

            }

          });

        });



        const upsertRows = Object.keys(planAggregates).map(key => {

          const [base, hor, veic] = key.split('|');

          return {

            base: base,

            horario: hor,

            veiculo: veic,

            quantidadePlan: planAggregates[key],

            customizado: true

          };

        });



        if (upsertRows.length === 0) {

          throw new Error('Nenhuma coluna de horário mapeada encontrada ou nenhum dado válido.');

        }



        const chunkSize = 100;

        for (let i = 0; i < upsertRows.length; i += chunkSize) {

          const chunk = upsertRows.slice(i, i + chunkSize);

          const { error } = await supabase

            .from('planejamento_equipes')

            .upsert(chunk, { onConflict: 'base,horario,veiculo' });

          if (error) throw error;

        }



        alert(`Sucesso! Importados ${upsertRows.length} registros de planejamento.`);

        fetchData();

      } catch (err) {

        console.error('Erro na importação de planejamento:', err);

        alert('Erro ao importar planejamento: ' + (err.message || 'Verifique o formato.'));

      } finally {

        setImportPlanLoading(false);

        e.target.value = null;

      }

    };

    reader.readAsBinaryString(file);

  };



  const handleSavePlan = async () => {

    setSaveLoading(true);

    try {

      const upsertRows = Object.keys(editPlanState).map(key => {

        const [base, hor, veic] = key.split('|');

        const val = editPlanState[key];

        return {

          base: base,

          horario: hor,

          veiculo: veic,

          quantidadePlan: val,

          customizado: true

        };

      });

      

      const chunkSize = 100;

      for (let i = 0; i < upsertRows.length; i += chunkSize) {

        const chunk = upsertRows.slice(i, i + chunkSize);

        const { error } = await supabase.from('planejamento_equipes').upsert(chunk, { onConflict: 'base,horario,veiculo' });

        if (error) throw error;

      }

      

      alert('Planejamento mensal atualizado com sucesso!');

      setIsEditingPlan(false);

      fetchData();

    } catch (err) {

      console.error('Erro ao salvar planejamento:', err);

      alert('Erro ao salvar planejamento: ' + (err.message || 'Erro desconhecido.'));

    } finally {

      setSaveLoading(false);

    }

  };





  // --- DYNAMIC CALCULATIONS ---



  // --- UTILITIES FOR EVOLUTION DASHBOARD ---

  const getRecordMetadata = (r) => {

    const actualTeam = r.nome || '';

    const actualPrefix = actualTeam.substring(0, 3);

    const actualMeta = prefixToBase[actualPrefix];

    

    let base = r.base;

    let region = String(r.ut || '').toLowerCase();

    

    if (r.veiculo === 'LV' || r.veiculo === 'Munk') {

      base = r.veiculo;

    } else if (actualMeta) {

      base = actualMeta.base;

      region = actualMeta.region;

    }

    

    const turno = getTurnoFromHorario(r.horario);

    

    return {

      base: getTitleCaseBase(base),

      region: region,

      turno: turno,

      veiculo: r.veiculo

    };

  };



  const getPlanRecordMetadata = (p) => {

    const dbBase = getTitleCaseBase(p.base);

    let region = '';

    if (['Fagundes Filho', 'Cajati', 'Vila Medeiros'].includes(dbBase)) {

      region = 'norte';

    } else if (['Monte Santo', 'Catumbi', 'Aricanduva', 'Santo André'].includes(dbBase)) {

      region = 'leste';

    }

    const turno = getTurnoFromHorario(p.horario);

    return {

      base: dbBase,

      region: region,

      turno: turno,

      veiculo: p.veiculo

    };

  };



  const getAvailableMonths = () => {

    const months = datasComDados.map(d => d.substring(0, 7));

    const unique = [...new Set(months)].sort().reverse();

    return unique;

  };



  const formatMonthPT = (ym) => {

    if (!ym) return '';

    const [year, month] = ym.split('-');

    const monthsPT = {

      '01': 'Janeiro',

      '02': 'Fevereiro',

      '03': 'Março',

      '04': 'Abril',

      '05': 'Maio',

      '06': 'Junho',

      '07': 'Julho',

      '08': 'Agosto',

      '09': 'Setembro',

      '10': 'Outubro',

      '11': 'Novembro',

      '12': 'Dezembro'

    };

    return `${monthsPT[month]} de ${year}`;

  };



  const getDaysArray = () => {

    if (!selectedYearMonth) return [];

    const [year, month] = selectedYearMonth.split('-').map(Number);

    const numDays = new Date(year, month, 0).getDate();

    const days = [];

    for (let d = 1; d <= numDays; d++) {

      const dayStr = String(d).padStart(2, '0');

      const monthStr = String(month).padStart(2, '0');

      days.push(`${year}-${monthStr}-${dayStr}`);

    }

    return days;

  };



  const getBasesForFilter = (regions) => {

    if (regions.includes('todos') || regions.length === 0 || (regions.includes('norte') && regions.includes('leste'))) {

      return ['Fagundes Filho', 'Cajati', 'Vila Medeiros', 'Monte Santo', 'Catumbi', 'Aricanduva', 'Santo André', 'LV', 'Munk'];

    }

    if (regions.includes('norte')) {

      return ['Fagundes Filho', 'Cajati', 'Vila Medeiros', 'LV', 'Munk'];

    }

    if (regions.includes('leste')) {

      return ['Monte Santo', 'Catumbi', 'Aricanduva', 'Santo André', 'LV', 'Munk'];

    }

    return [];

  };



  const matchFilter = (filterArray, val) => {

    if (!filterArray || filterArray.length === 0 || filterArray.includes('todos')) return true;

    return filterArray.includes(val);

  };



  const matchBaseFilter = (baseArray, metaBase, metaVeiculo) => {

    if (!baseArray || baseArray.length === 0 || baseArray.includes('todos')) return true;

    return baseArray.some(base => {

      if (base === 'LV' || base === 'Munk') {

        return metaVeiculo === base;

      } else {

        return metaBase === base;

      }

    });

  };



  const matchBasePlanFilter = (baseArray, metaBase, pVeiculo) => {

    if (!baseArray || baseArray.length === 0 || baseArray.includes('todos')) return true;

    return baseArray.some(base => {

      if (base === 'LV' || base === 'Munk') {

        return pVeiculo === base;

      } else {

        return metaBase === base && pVeiculo !== 'LV' && pVeiculo !== 'Munk';

      }

    });

  };



  const getFilteredDashboardRealData = () => {

    return dashboardData.filter(r => {

      const meta = getRecordMetadata(r);

      if (!matchFilter(globalRegion, meta.region)) return false;

      if (!matchBaseFilter(globalBase, meta.base, meta.veiculo)) return false;

      if (!matchFilter(globalTurno, meta.turno)) return false;

      if (!matchFilter(globalVehicle, meta.veiculo)) return false;

      return true;

    });

  };



  const getFilteredPlanData = () => {

    return planejamentos.filter(p => {

      const meta = getPlanRecordMetadata(p);

      if (!matchFilter(globalRegion, meta.region)) return false;

      if (!matchBasePlanFilter(globalBase, meta.base, p.veiculo)) return false;

      if (!matchFilter(globalTurno, meta.turno)) return false;

      if (!matchFilter(globalVehicle, meta.veiculo)) return false;

      return true;

    });

  };



  const getDailyPlanSum = (filteredPlans) => {

    return filteredPlans.reduce((sum, p) => sum + p.quantidadePlan, 0);

  };



  const buildEvolutionChartData = () => {

    const days = getDaysArray();

    const filteredReal = getFilteredDashboardRealData();

    const filteredPlans = getFilteredPlanData();

    const dailyPlanSum = getDailyPlanSum(filteredPlans);

    

    const realByDate = {};

    filteredReal.forEach(r => {

      realByDate[r.dataRegistro] = (realByDate[r.dataRegistro] || 0) + 1;

    });

    

    let totalRealForAvg = 0;

    let countDaysWithData = 0;

    

    const chartData = days.map(dayStr => {

      const dayLabel = dayStr.split('-').reverse().slice(0, 2).join('/'); // "DD/MM"

      const hasAnyData = datasComDados.includes(dayStr);

      const realVal = hasAnyData ? (realByDate[dayStr] || 0) : null;

      

      if (hasAnyData) {

        totalRealForAvg += (realByDate[dayStr] || 0);

        countDaysWithData++;

      }

      

      return {

        dateStr: dayStr,

        name: dayLabel,

        Real: realVal,

        Planejado: dailyPlanSum,

        hasData: hasAnyData

      };

    });

    

    const avgReal = countDaysWithData > 0 ? parseFloat((totalRealForAvg / countDaysWithData).toFixed(1)) : 0;

    

    chartData.forEach(item => {

      if (item.hasData) {

        item['Média Real'] = avgReal;

      }

    });

    

    let peakVal = 0;

    let peakDate = '';

    Object.keys(realByDate).forEach(d => {

      if (realByDate[d] > peakVal) {

        peakVal = realByDate[d];

        peakDate = d.split('-').reverse().join('/');

      }

    });

    

    return {

      chartData,

      avgReal,

      avgPlan: dailyPlanSum,

      totalRealMonth: totalRealForAvg,

      countDaysWithData,

      peakVal,

      peakDate

    };

  };



  // Sub-dashboard calculations

  const getCardAData = (countDaysWithData) => {

    const regionToUse = (globalRegion.includes('todos') || globalRegion.includes('norte')) ? 'norte' : 'leste';

    const bases = regionToUse === 'norte'

      ? ['Fagundes Filho', 'Cajati', 'Vila Medeiros', 'LV', 'Munk']

      : ['Monte Santo', 'Catumbi', 'Aricanduva', 'Santo André', 'LV', 'Munk'];

      

    return bases.map(baseName => {

      const filteredReal = dashboardData.filter(r => {

        const meta = getRecordMetadata(r);

        if (meta.region !== regionToUse) return false;

        if (meta.base !== baseName) return false;

        if (!matchFilter(cardATurno, meta.turno)) return false;

        if (!matchFilter(cardAVehicle, meta.veiculo)) return false;

        return true;

      });

      

      const realAvg = countDaysWithData > 0 ? parseFloat((filteredReal.length / countDaysWithData).toFixed(1)) : 0;

      

      const filteredPlans = planejamentos.filter(p => {

        const meta = getPlanRecordMetadata(p);

        if (meta.region !== regionToUse) return false;

        

        if (baseName === 'LV' || baseName === 'Munk') {

          if (p.veiculo !== baseName) return false;

        } else {

          if (meta.base !== baseName) return false;

          if (p.veiculo === 'LV' || p.veiculo === 'Munk') return false;

        }

        

        if (!matchFilter(cardATurno, meta.turno)) return false;

        if (!matchFilter(cardAVehicle, meta.veiculo)) return false;

        return true;

      });

      

      const planSum = filteredPlans.reduce((sum, p) => sum + p.quantidadePlan, 0);

      

      return {

        name: baseName,

        Real: realAvg,

        Planejado: planSum

      };

    });

  };



  const getCardBData = () => {

    const shifts = ['Manhã', 'Tarde', 'Noite'];

    

    return shifts.map(shiftName => {

      const filteredReal = dashboardData.filter(r => {

        const meta = getRecordMetadata(r);

        if (!matchFilter(globalRegion, meta.region)) return false;

        if (meta.turno !== shiftName) return false;

        

        if (!matchBaseFilter(cardBBase, meta.base, meta.veiculo)) return false;

        if (!matchFilter(cardBVehicle, meta.veiculo)) return false;

        return true;

      });

      

      return {

        name: shiftName,

        value: filteredReal.length

      };

    });

  };



  const getCardCData = (countDaysWithData) => {

    const vehiclesList = ['Cesto Aéreo', 'Veículo Leve', 'Moto', 'LV', 'Munk'];

    

    return vehiclesList.map(veicName => {

      const filteredReal = dashboardData.filter(r => {

        const meta = getRecordMetadata(r);

        if (!matchFilter(globalRegion, meta.region)) return false;

        if (meta.veiculo !== veicName) return false;

        

        if (!matchBaseFilter(cardCBase, meta.base, meta.veiculo)) return false;

        if (!matchFilter(cardCTurno, meta.turno)) return false;

        return true;

      });

      

      const realAvg = countDaysWithData > 0 ? parseFloat((filteredReal.length / countDaysWithData).toFixed(1)) : 0;

      

      const filteredPlans = planejamentos.filter(p => {

        const meta = getPlanRecordMetadata(p);

        if (!matchFilter(globalRegion, meta.region)) return false;

        if (p.veiculo !== veicName) return false;

        

        if (!matchBasePlanFilter(cardCBase, meta.base, p.veiculo)) return false;

        if (!matchFilter(cardCTurno, meta.turno)) return false;

        return true;

      });

      

      const planSum = filteredPlans.reduce((sum, p) => sum + p.quantidadePlan, 0);

      

      return {

        name: veicName,

        Real: realAvg,

        Planejado: planSum

      };

    });

  };

  const prefixToBase = {

    'ESL': { base: 'Santo André', region: 'leste' },

    'ENL': { base: 'Fagundes Filho', region: 'norte' },

    'EQL': { base: 'Aricanduva', region: 'leste' },

    'EVL': { base: 'Catumbi', region: 'leste' },

    'ECL': { base: 'Cajati', region: 'norte' },

    'EEL': { base: 'Vila Medeiros', region: 'norte' },

    'EML': { base: 'Monte Santo', region: 'leste' }

  };



  const baseList = activeRegionTab === 'norte'

    ? ['Fagundes Filho', 'Cajati', 'Vila Medeiros', 'LV', 'Munk']

    : ['Monte Santo', 'Catumbi', 'Aricanduva', 'Santo André', 'LV', 'Munk'];



  const vehicleList = ['Cesto Aéreo', 'Veículo Leve', 'Moto', 'LV', 'Munk'];



  const timeList = activeRegionTab === 'norte'

    ? ['06:00', '07:00', '08:00', '10:00', '12:00', '14:00', '20:00', '22:00']

    : ['06:00', '07:00', '08:00', '10:00', '12:00', '14:00', '16:00', '20:00', '22:00'];



  const realCounts = {};

  registros.forEach(r => {

    const actualTeam = r.nome || '';

    const actualPrefix = actualTeam.substring(0, 3);

    const actualMeta = prefixToBase[actualPrefix];

    

    let actualBase = r.base;

    let actualRegion = String(r.ut || '').toLowerCase();

    

    if (r.veiculo === 'LV' || r.veiculo === 'Munk') {

      actualBase = r.veiculo;

    } else if (actualMeta) {

      actualBase = actualMeta.base;

      actualRegion = actualMeta.region;

    }

    

    if (actualRegion === activeRegionTab) {

      const key = `${actualBase}|${r.horario}|${r.veiculo}`;

      realCounts[key] = (realCounts[key] || 0) + 1;

    }

  });



  const planCounts = {};

  if (isEditingPlan) {

    Object.keys(editPlanState).forEach(key => {

      planCounts[key] = editPlanState[key];

    });

  } else {

    const regionNormalBases = activeRegionTab === 'norte'

      ? ['Fagundes Filho', 'Cajati', 'Vila Medeiros']

      : ['Monte Santo', 'Catumbi', 'Aricanduva', 'Santo André'];



    planejamentos.forEach(p => {

      const dbBase = getTitleCaseBase(p.base);

      if (regionNormalBases.includes(dbBase)) {

        if (p.veiculo === 'LV' || p.veiculo === 'Munk') {

          const key = `${p.veiculo}|${p.horario}|${p.veiculo}`;

          planCounts[key] = (planCounts[key] || 0) + p.quantidadePlan;

        } else {

          const key = `${dbBase}|${p.horario}|${p.veiculo}`;

          planCounts[key] = p.quantidadePlan;

        }

      }

    });

  }



  const detalhes = [];

  const normalBases = activeRegionTab === 'norte'

    ? ['Fagundes Filho', 'Cajati', 'Vila Medeiros']

    : ['Monte Santo', 'Catumbi', 'Aricanduva', 'Santo André'];



  const individualBlocks = normalBases.map(base => {

    const veiculos = vehicleList.map(vehicle => {

      const plan = timeList.map(time => planCounts[`${base}|${time}|${vehicle}`] || 0);

      const real = timeList.map(time => realCounts[`${base}|${time}|${vehicle}`] || 0);

      return { tipo: vehicle, plan, real };

    });

    return { base: base.toUpperCase(), veiculos };

  });



  const totalBlockVeiculos = vehicleList.map(vehicle => {

    const plan = timeList.map(time => {

      let sum = 0;

      baseList.forEach(b => {

        sum += planCounts[`${b}|${time}|${vehicle}`] || 0;

      });

      return sum;

    });

    const real = timeList.map(time => {

      let sum = 0;

      baseList.forEach(b => {

        sum += realCounts[`${b}|${time}|${vehicle}`] || 0;

      });

      return sum;

    });

    return { tipo: vehicle, plan, real };

  });



  const totalBaseName = activeRegionTab === 'norte' ? 'TOTAL NORTE' : 'TOTAL LESTE';

  detalhes.push({ base: totalBaseName, veiculos: totalBlockVeiculos });

  detalhes.push(...individualBlocks);



  const basesItems = baseList.map(base => {

    let plan = 0;

    let real = 0;

    timeList.forEach(time => {

      vehicleList.forEach(vehicle => {

        plan += planCounts[`${base}|${time}|${vehicle}`] || 0;

        real += realCounts[`${base}|${time}|${vehicle}`] || 0;

      });

    });

    return { name: base === 'LV' ? 'LV' : base === 'Munk' ? 'Munk' : base, plan, real };

  });



  const totalTMAPlan = basesItems.filter(item => !['LV', 'Munk'].includes(item.name)).reduce((sum, item) => sum + item.plan, 0);

  const totalTMAReal = basesItems.filter(item => !['LV', 'Munk'].includes(item.name)).reduce((sum, item) => sum + item.real, 0);

  const totalGeralPlan = basesItems.reduce((sum, item) => sum + item.plan, 0);

  const totalGeralReal = basesItems.reduce((sum, item) => sum + item.real, 0);



  const basesTotais = activeRegionTab === 'norte'

    ? [

        { name: "Total TMA", plan: totalTMAPlan, real: totalTMAReal },

        { name: "Total LV + TMA", plan: totalGeralPlan, real: totalGeralReal }

      ]

    : [

        { name: "Total", plan: totalGeralPlan, real: totalGeralReal }

      ];



  const basesResumoBlock = {

    title: "Bases",

    items: basesItems,

    totais: basesTotais

  };



  const turnosList = ['Manhã', 'Tarde', 'Noite'];

  const turnosItems = turnosList.map(turno => {

    let plan = 0;

    let real = 0;

    timeList.forEach(time => {

      if (getTurnoFromHorario(time) === turno) {

        baseList.forEach(base => {

          vehicleList.forEach(vehicle => {

            plan += planCounts[`${base}|${time}|${vehicle}`] || 0;

            real += realCounts[`${base}|${time}|${vehicle}`] || 0;

          });

        });

      }

    });

    return { name: turno, plan, real };

  });



  const turnoTotais = activeRegionTab === 'norte'

    ? [

        { name: "Total TMA", plan: totalTMAPlan, real: totalTMAReal },

        { name: "Total LV + TMA", plan: totalGeralPlan, real: totalGeralReal }

      ]

    : [

        { name: "Total", plan: totalGeralPlan, real: totalGeralReal }

      ];



  const turnoResumoBlock = {

    title: "Turno",

    items: turnosItems,

    totais: turnoTotais

  };



  const vehicleItems = vehicleList.map(vehicle => {

    let plan = 0;

    let real = 0;

    baseList.forEach(base => {

      timeList.forEach(time => {

        plan += planCounts[`${base}|${time}|${vehicle}`] || 0;

        real += realCounts[`${base}|${time}|${vehicle}`] || 0;

      });

    });

    return { name: vehicle, plan, real };

  });



  const vehicleTotais = activeRegionTab === 'norte'

    ? [

        { name: "Total TMA", plan: totalTMAPlan, real: totalTMAReal },

        { name: "Total LV + TMA", plan: totalGeralPlan, real: totalGeralReal }

      ]

    : [

        { name: "Total", plan: totalGeralPlan, real: totalGeralReal }

      ];



  const vehicleResumoBlock = {

    title: "Tipo Veículo",

    items: vehicleItems,

    totais: vehicleTotais

  };



  const currentData = {

    resumo: [basesResumoBlock, turnoResumoBlock, vehicleResumoBlock],

    tempos: timeList,

    detalhes

  };



  const renderEvolutionDashboard = () => {

    const isDark = theme === 'dark';

    const { chartData, avgReal, avgPlan, totalRealMonth, countDaysWithData, peakVal, peakDate } = buildEvolutionChartData();

    const adherence = avgPlan > 0 ? Math.round((avgReal / avgPlan) * 100) : 0;

    

    const availableMonths = getAvailableMonths();

    const allowedBases = getBasesForFilter(globalRegion);



    const regionOptions = [

      { value: 'norte', label: 'Norte' },

      { value: 'leste', label: 'Leste' }

    ];

    const baseOptions = allowedBases.map(b => ({ value: b, label: b }));

    const shiftOptions = [

      { value: 'Manhã', label: 'Manhã' },

      { value: 'Tarde', label: 'Tarde' },

      { value: 'Noite', label: 'Noite' }

    ];

    const vehicleOptions = [

      { value: 'Cesto Aéreo', label: 'Cesto Aéreo' },

      { value: 'Veículo Leve', label: 'Veículo Leve' },

      { value: 'Moto', label: 'Moto' },

      { value: 'LV', label: 'LV' },

      { value: 'Munk', label: 'Munk' }

    ];



    // Sub-dashboard data

    const cardAData = getCardAData(countDaysWithData);

    const cardBData = getCardBData();

    const cardCData = getCardCData(countDaysWithData);

    

    // Pie Chart colors

    const COLORS = ['#10b981', '#0ea5e9', '#6366f1']; // Emerald, Sky, Indigo

    

    return (

      <div className="space-y-8 animate-in fade-in duration-300">

        {/* FILTROS GLOBAIS HEADER */}

        <div className="bg-white dark:bg-slate-950 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">

          <div className="flex items-center gap-3">

            <Filter size={20} className="text-blue-600 dark:text-blue-400" />

            <span className="font-black text-blue-950 dark:text-slate-200 text-sm uppercase tracking-wider">Filtros Gerais do Período</span>

          </div>

          

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">

            {/* Seletor de Mês */}

            <div className="flex flex-col gap-1 w-full sm:w-auto min-w-[150px]">

              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Selecionar Mês</label>

              <select

                value={selectedYearMonth}

                onChange={(e) => setSelectedYearMonth(e.target.value)}

                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none w-full cursor-pointer"

              >

                {availableMonths.length > 0 ? (

                  availableMonths.map(m => (

                    <option key={m} value={m}>{formatMonthPT(m)}</option>

                  ))

                ) : (

                  <option value={selectedYearMonth}>{formatMonthPT(selectedYearMonth)}</option>

                )}

              </select>

            </div>

            

            {/* Seletores Multi-Seleção */}

            <MultiSelectDropdown

              label="Região"

              options={regionOptions}

              selected={globalRegion}

              onChange={(nextRegions) => {

                setGlobalRegion(nextRegions);

              }}

            />



            <MultiSelectDropdown

              label="Base / UT"

              options={baseOptions}

              selected={globalBase}

              onChange={setGlobalBase}

            />



            <MultiSelectDropdown

              label="Turno"

              options={shiftOptions}

              selected={globalTurno}

              onChange={setGlobalTurno}

            />



            <MultiSelectDropdown

              label="Tipo Veículo"

              options={vehicleOptions}

              selected={globalVehicle}

              onChange={setGlobalVehicle}

            />

          </div>

        </div>



        {dashLoading ? (

          <div className="flex items-center justify-center p-24 bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">

            <div className="flex flex-col items-center gap-3">

              <RefreshCcw className="animate-spin text-blue-600 animate-duration-1000" size={36} />

              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Carregando dados mensais...</p>

            </div>

          </div>

        ) : (

          <>

            {/* KPI CARDS GRID */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Card 1: Média Real */}

              <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-all">

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shrink-0">

                  <ClipboardCheck size={24} />

                </div>

                <div className="space-y-1">

                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">MÉDIA DE EQUIPES</p>

                  <p className="text-2xl font-black text-blue-950 dark:text-slate-100">{avgReal} <span className="text-xs font-bold text-slate-400 dark:text-slate-500">equipes/dia</span></p>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Entrega real diária média</p>

                </div>

              </div>

              

              {/* Card 2: Adesão */}

              <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-all">

                <div className={`p-4 rounded-2xl shrink-0 ${

                  adherence >= 90 

                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 

                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'

                }`}>

                  <ShieldCheck size={24} />

                </div>

                <div className="space-y-1">

                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">ADESÃO DIÁRIA</p>

                  <p className="text-2xl font-black text-blue-950 dark:text-slate-100">{adherence}%</p>

                  <div className="flex items-center gap-1.5">

                    <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">

                      <div 

                        className={`h-full rounded-full ${adherence >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} 

                        style={{ width: `${Math.min(adherence, 100)}%` }}

                      ></div>

                    </div>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">vs Plan ({avgPlan} eq.)</span>

                  </div>

                </div>

              </div>



              {/* Card 3: Pico de Entrega */}

              <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-all">

                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">

                  <TrendingDown className="rotate-180" size={24} />

                </div>

                <div className="space-y-1">

                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">PICO DE ENTREGA</p>

                  <p className="text-2xl font-black text-blue-950 dark:text-slate-100">{peakVal} <span className="text-xs font-bold text-slate-400 dark:text-slate-500">equipes</span></p>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Dia {peakDate || '--/--'}</p>

                </div>

              </div>



              {/* Card 4: Total de Entregas */}

              <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-all">

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shrink-0">

                  <Activity size={24} />

                </div>

                <div className="space-y-1">

                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">TOTAL DE ENTREGAS</p>

                  <p className="text-2xl font-black text-blue-950 dark:text-slate-100">{totalRealMonth} <span className="text-xs font-bold text-slate-400 dark:text-slate-500">somas</span></p>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Registradas em {countDaysWithData} dias</p>

                </div>

              </div>

            </div>



            {/* GRÁFICO PRINCIPAL */}

            <div className="bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6">

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">

                <div>

                  <h4 className="text-lg font-black text-blue-950 dark:text-slate-200 flex items-center gap-2">

                    Evolução Diária da Força de Trabalho

                  </h4>

                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Entrega Real vs Planejado e Média Geral no Mês</p>

                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">

                  <div className="flex items-center gap-2">

                    <span className="w-3.5 h-3.5 rounded-full bg-blue-600"></span>

                    <span>Real</span>

                  </div>

                  <div className="flex items-center gap-2">

                    <span className="w-3.5 h-3.5 rounded bg-orange-400/20 border border-dashed border-orange-400"></span>

                    <span>Planejado ({avgPlan})</span>

                  </div>

                  <div className="flex items-center gap-2">

                    <span className="w-3.5 h-1 border-t border-dashed border-emerald-500"></span>

                    <span>Média Real ({avgReal})</span>

                  </div>

                </div>

              </div>

              

              <div className="h-[350px] w-full">

                <ResponsiveContainer width="100%" height="100%">

                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>

                    <defs>

                      <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">

                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>

                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01}/>

                      </linearGradient>

                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />

                    <XAxis 

                      dataKey="name" 

                      tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }} 

                      axisLine={false} 

                      tickLine={false} 

                      dy={10} 

                    />

                    <YAxis 

                      tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }} 

                      axisLine={false} 

                      tickLine={false} 

                    />

                    <RechartsTooltip 

                      content={({ active, payload, label }) => {

                        if (active && payload && payload.length) {

                          const dateObj = payload[0].payload.dateStr;

                          return (

                            <div className={`${isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-700'} border backdrop-blur-md p-4 rounded-2xl shadow-xl text-xs font-bold space-y-2`}>

                              <p className={`font-black text-center border-b pb-1 mb-1 ${isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-100'}`}>{dateObj.split('-').reverse().join('/')}</p>

                              {payload.map((pld, idx) => (

                                <p key={idx} className="flex justify-between items-center gap-6">

                                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-slate-400">

                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pld.color }}></span>

                                    {pld.name}:

                                  </span>

                                  <span className={`font-black text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{pld.value}</span>

                                </p>

                              ))}

                            </div>

                          );

                        }

                        return null;

                      }}

                    />

                    <Bar 

                      dataKey="Planejado" 

                      fill="#fb923c" 

                      fillOpacity={0.15} 

                      stroke="#fb923c" 

                      strokeWidth={1.5} 

                      strokeDasharray="3 3"

                      radius={[4, 4, 0, 0]} 

                      name="Planejado" 

                    />

                    <Area 

                      type="monotone" 

                      dataKey="Real" 

                      stroke="#2563eb" 

                      strokeWidth={3} 

                      fillOpacity={1} 

                      fill="url(#colorReal)" 

                      name="Real" 

                      dot={{ r: 3, strokeWidth: 1 }} 

                      activeDot={{ r: 6 }} 

                    />

                    <Line 

                      type="monotone" 

                      dataKey="Média Real" 

                      stroke="#10b981" 

                      strokeWidth={2.5} 

                      strokeDasharray="6 4" 

                      dot={false} 

                      name="Média Real" 

                    />

                  </ComposedChart>

                </ResponsiveContainer>

              </div>

            </div>



            {/* GRUPO DE SUB-DASHBOARDS */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* CARD A: Desempenho por Base */}

              <div className="bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6 flex flex-col justify-between">

                <div>

                  <div className="flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">

                    <h5 className="font-black text-blue-950 dark:text-slate-200 text-sm uppercase tracking-wider">Média por Base ({globalRegion.includes('todos') ? 'Todas' : globalRegion.map(r => r === 'norte' ? 'Norte' : 'Leste').join(', ')})</h5>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Filtros locais independentes</p>

                  </div>

                  

                  {/* Filtros Card A */}

                  <div className="grid grid-cols-2 gap-3 mb-6">

                    <MultiSelectDropdown

                      label="Turno"

                      options={shiftOptions}

                      selected={cardATurno}

                      onChange={setCardATurno}

                    />

                    <MultiSelectDropdown

                      label="Veículo"

                      options={vehicleOptions}

                      selected={cardAVehicle}

                      onChange={setCardAVehicle}

                    />

                  </div>

                  

                  <div className="h-[220px] w-full">

                    <ResponsiveContainer width="100%" height="100%">

                      <BarChart data={cardAData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>

                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />

                        <XAxis 

                          dataKey="name" 

                          tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 'bold' }} 

                          axisLine={false} 

                          tickLine={false} 

                        />

                        <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />

                        <RechartsTooltip 

                          contentStyle={isDark ? { backgroundColor: '#0b101d', borderColor: '#1e293b', color: '#cbd5e1' } : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#334155' }}

                        />

                        <Bar dataKey="Real" fill="#10b981" radius={[4, 4, 0, 0]} name="Média Real" />

                        <Bar dataKey="Planejado" fill="#fb923c" radius={[4, 4, 0, 0]} name="Metas Plan" />

                      </BarChart>

                    </ResponsiveContainer>

                  </div>

                </div>

              </div>



              {/* CARD B: Distribuição por Turno */}

              <div className="bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6 flex flex-col justify-between">

                <div>

                  <div className="flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">

                    <h5 className="font-black text-blue-950 dark:text-slate-200 text-sm uppercase tracking-wider">Entregas por Turno</h5>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Filtros locais independentes</p>

                  </div>

                  

                  {/* Filtros Card B */}

                  <div className="grid grid-cols-2 gap-3 mb-6">

                    <MultiSelectDropdown

                      label="Base / UT"

                      options={baseOptions}

                      selected={cardBBase}

                      onChange={setCardBBase}

                    />

                    <MultiSelectDropdown

                      label="Veículo"

                      options={vehicleOptions}

                      selected={cardBVehicle}

                      onChange={setCardBVehicle}

                    />

                  </div>

                  

                  <div className="h-[220px] w-full flex items-center justify-center">

                    <ResponsiveContainer width="100%" height="100%">

                      <PieChart>

                        <Pie

                          data={cardBData.filter(d => d.value > 0)}

                          cx="50%"

                          cy="50%"

                          innerRadius={60}

                          outerRadius={80}

                          paddingAngle={5}

                          dataKey="value"

                          nameKey="name"

                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}

                        >

                          {cardBData.filter(d => d.value > 0).map((entry, index) => (

                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />

                          ))}

                        </Pie>

                        <RechartsTooltip 

                          contentStyle={isDark ? { backgroundColor: '#0b101d', borderColor: '#1e293b', color: '#cbd5e1' } : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#334155' }}

                        />

                      </PieChart>

                    </ResponsiveContainer>

                  </div>

                </div>

              </div>



              {/* CARD C: Composição por Tipo de Veículo */}

              <div className="bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6 flex flex-col justify-between">

                <div>

                  <div className="flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">

                    <h5 className="font-black text-blue-950 dark:text-slate-200 text-sm uppercase tracking-wider">Desempenho por Veículo</h5>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Filtros locais independentes</p>

                  </div>

                  

                  {/* Filtros Card C */}

                  <div className="grid grid-cols-2 gap-3 mb-6">

                    <MultiSelectDropdown

                      label="Base / UT"

                      options={baseOptions}

                      selected={cardCBase}

                      onChange={setCardCBase}

                    />

                    <MultiSelectDropdown

                      label="Turno"

                      options={shiftOptions}

                      selected={cardCTurno}

                      onChange={setCardCTurno}

                    />

                  </div>

                  

                  <div className="h-[220px] w-full">

                    <ResponsiveContainer width="100%" height="100%">

                      <BarChart data={cardCData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>

                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />

                        <XAxis 

                          dataKey="name" 

                          tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 'bold' }} 

                          axisLine={false} 

                          tickLine={false} 

                        />

                        <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />

                        <RechartsTooltip 

                          contentStyle={isDark ? { backgroundColor: '#0b101d', borderColor: '#1e293b', color: '#cbd5e1' } : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#334155' }}

                        />

                        <Bar dataKey="Real" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Média Real" />

                        <Bar dataKey="Planejado" fill="#fb923c" radius={[4, 4, 0, 0]} name="Metas Plan" />

                      </BarChart>

                    </ResponsiveContainer>

                  </div>

                </div>
              </div>
            </div>
          </>
        )}
      </div>
  );
};



  const regionKey = activeRegionTab;



  return (

    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">

      <style>{`

        .slide-wrapper {

          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out, padding 0.3s ease-in-out;

          max-height: 100px;

          opacity: 1;

          overflow: hidden;

        }

        .slide-wrapper.collapsed {

          max-height: 0px;

          opacity: 0;

        }

        .tr-transition {

          transition: opacity 0.3s ease-in-out, height 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s;

        }

        .td-transition {

          transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-width 0.3s ease-in-out;

        }

      `}</style>



      {/* Sub-navegação interna com suporte a Tema Escuro */}

      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">

        <button 

          onClick={() => setActiveSubTab('diario')}

          className={`pb-3 text-sm font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${

            activeSubTab === 'diario' 

              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 

              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'

          }`}

        >

          <ClipboardCheck size={18} />

          Painel Diário

        </button>

        <button 

          onClick={() => setActiveSubTab('evolucao')}

          className={`pb-3 text-sm font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${

            activeSubTab === 'evolucao' 

              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 

              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'

          }`}

        >

          <Activity size={18} />

          Dashboard de Evolução

        </button>

        {isAdminOrCoord && (

          <>

            <button 

              onClick={() => setActiveSubTab('financeiro')}

              className={`pb-3 text-sm font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${

                activeSubTab === 'financeiro' 

                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 

                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'

              }`}

            >

              <DollarSign size={18} />

              Produção Operacional

            </button>

            <button 

              onClick={() => setActiveSubTab('indicadores')}

              className={`pb-3 text-sm font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${

                activeSubTab === 'indicadores' 

                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 

                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'

              }`}

            >

              <PieChartIcon size={18} />

              Indicadores Financeiros

            </button>

          </>

        )}

      </div>



      {(activeSubTab === 'financeiro' && isAdminOrCoord) ? (

        <FinanceiroView theme={theme} currentUser={currentUser} />

      ) : (activeSubTab === 'indicadores' && isAdminOrCoord) ? (

        <IndicadoresFinanceirosView theme={theme} />

      ) : activeSubTab === 'diario' ? (

        <>

          {/* Selector Região e Filtro de Data */}

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-emerald-50 flex flex-col md:flex-row justify-between items-center gap-6">

            <div>

              <h3 className="text-xl font-black text-blue-950 flex items-center gap-3">

                 <ClipboardCheck size={26} className="text-blue-600" /> Relatório de Entrega de Equipes

              </h3>

              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Acompanhamento e Comparativo de Metas de Produtividade</p>

              {lastUpdate ? (

                <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1.5 bg-emerald-50/50 px-3 py-1 rounded-full w-max">

                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>

                  Última atualização no banco: {formatarDataBR(lastUpdate)}

                </p>

              ) : (

                <p className="text-[11px] text-slate-400 font-bold mt-1.5 flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full w-max">

                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>

                  Última atualização no banco: Sem registros

                </p>

              )}

            </div>

            

            <div className="flex flex-col sm:flex-row gap-4 items-center shrink-0 w-full md:w-auto">

              {/* Botão Importar Base */}

              {['ADMINISTRADOR', 'GERENTE', 'COORDENADOR'].includes(currentUser?.perfil) && (

                <label className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black transition-all cursor-pointer border w-full sm:w-auto shrink-0 ${

                  importLoading 

                    ? 'bg-slate-100 text-slate-400 border-slate-200 pointer-events-none' 

                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-700 shadow-sm'

                }`}>

                  <Upload size={18} />

                  {importLoading ? 'Carregando...' : 'Carregar Base'}

                  <input 

                    type="file" 

                    accept=".xlsx, .xls" 

                    className="hidden" 

                    onChange={handleBaseFileUpload} 

                    disabled={importLoading} 

                  />

                </label>

              )}



              {/* Botão Importar Metas Planejamento */}

              {['ADMINISTRADOR', 'GERENTE', 'COORDENADOR'].includes(currentUser?.perfil) && (

                <label className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black transition-all cursor-pointer border w-full sm:w-auto shrink-0 ${

                  importPlanLoading 

                    ? 'bg-slate-100 text-slate-400 border-slate-200 pointer-events-none' 

                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 hover:border-indigo-700 shadow-sm dark:bg-indigo-750 dark:hover:bg-indigo-850'

                }`}>

                  <Upload size={18} />

                  {importPlanLoading ? 'Importando...' : 'Importar Metas'}

                  <input 

                    type="file" 

                    accept=".xlsx, .xls" 

                    className="hidden" 

                    onChange={handlePlanFileUpload} 

                    disabled={importPlanLoading} 

                  />

                </label>

              )}



              {/* Filtro de Data com popover customizado */}

              <div className="relative z-40" ref={calendarRef}>

                <button 

                  onClick={() => {

                    setShowCalendarDropdown(!showCalendarDropdown);

                    if (dataSelecionada) {

                      const parts = dataSelecionada.split('-');

                      if (parts.length === 3) {

                        setCurrentMonth(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));

                      }

                    }

                  }}

                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 p-2.5 rounded-2xl border border-slate-200/80 w-full sm:w-auto justify-center sm:justify-start text-slate-700 font-black text-sm transition-all"

                >

                  <CalendarDays size={18} className="text-slate-500" />

                  <span>

                    {dataSelecionada 

                      ? dataSelecionada.split('-').reverse().join('/')

                      : 'Selecionar Data'

                    }

                  </span>

                </button>



                {showCalendarDropdown && (

                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-[2rem] shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Header do calendário */}

                    <div className="flex justify-between items-center mb-3">

                      <button 

                        onClick={(e) => { e.stopPropagation(); prevMonth(); }}

                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"

                      >

                        <ChevronRight size={16} className="rotate-180" />

                      </button>

                      <span className="font-black text-blue-950 text-xs uppercase tracking-wider">

                        {currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}

                      </span>

                      <button 

                        onClick={(e) => { e.stopPropagation(); nextMonth(); }}

                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"

                      >

                        <ChevronRight size={16} />

                      </button>

                    </div>



                    {/* Dias da semana */}

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">

                      <div>D</div>

                      <div>S</div>

                      <div>T</div>

                      <div>Q</div>

                      <div>Q</div>

                      <div>S</div>

                      <div>S</div>

                    </div>



                    {/* Grid de dias */}

                    <div className="grid grid-cols-7 gap-1.5">

                      {/* Blanks */}

                      {Array(getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth()))

                        .fill(null)

                        .map((_, idx) => (

                          <div key={`blank-${idx}`} className="h-8 w-8"></div>

                        ))

                      }

                      

                      {/* Days */}

                      {Array.from({ length: getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()) }, (_, i) => i + 1)

                        .map(day => {

                          const y = currentMonth.getFullYear();

                          const m = String(currentMonth.getMonth() + 1).padStart(2, '0');

                          const d = String(day).padStart(2, '0');

                          const dayStr = `${y}-${m}-${d}`;

                          

                          const hasData = datasComDados.includes(dayStr);

                          const isSelected = dataSelecionada === dayStr;

                          const isToday = new Date().toISOString().split('T')[0] === dayStr;

                          

                          let cellClass = "h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all cursor-pointer relative ";

                          if (isSelected) {

                            cellClass += "bg-blue-950 text-white shadow-md shadow-blue-950/20";

                          } else if (hasData) {

                            cellClass += "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100";

                          } else {

                            cellClass += "text-slate-600 hover:bg-slate-100";

                          }



                          if (isToday && !isSelected) {

                            cellClass += " border border-dashed border-slate-400";

                          }



                          return (

                            <button

                              key={day}

                              onClick={(e) => {

                                e.stopPropagation();

                                setDataSelecionada(dayStr);

                                setShowCalendarDropdown(false);

                              }}

                              className={cellClass}

                              title={hasData ? "Contém dados no banco" : "Sem dados"}

                            >

                              {day}

                              {hasData && !isSelected && (

                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500"></span>

                              )}

                            </button>

                          );

                        })

                      }

                    </div>



                    {/* Legenda */}

                    <div className="border-t border-slate-100 mt-4 pt-3 flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest">

                      <div className="flex items-center gap-1.5">

                        <span className="w-2.5 h-2.5 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center">

                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>

                        </span>

                        <span>Com dados</span>

                      </div>

                      <div className="flex items-center gap-1.5">

                        <span className="w-2.5 h-2.5 rounded-md bg-blue-950"></span>

                        <span>Selecionado</span>

                      </div>

                      <div className="flex items-center gap-1.5">

                        <span className="w-2.5 h-2.5 rounded-md border border-dashed border-slate-400"></span>

                        <span>Hoje</span>

                      </div>

                    </div>

                  </div>

                )}

              </div>



              {/* Region Toggle */}

              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0 w-full sm:w-auto justify-center">

                <button 

                  onClick={() => setActiveRegionTab('norte')}

                  className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all w-1/2 sm:w-auto ${

                    activeRegionTab === 'norte' 

                      ? 'bg-blue-950 text-white shadow-md' 

                      : 'text-slate-500 hover:text-slate-800'

                  }`}

                >

                  Região Norte

                </button>

                <button 

                  onClick={() => setActiveRegionTab('leste')}

                  className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all w-1/2 sm:w-auto ${

                    activeRegionTab === 'leste' 

                      ? 'bg-blue-950 text-white shadow-md' 

                      : 'text-slate-500 hover:text-slate-800'

                  }`}

                >

                  Região Leste

                </button>

              </div>

            </div>

          </div>



          {loading && (

            <div className="flex items-center justify-center p-12 bg-white rounded-[2rem] border border-slate-100 shadow-sm">

              <div className="flex flex-col items-center gap-3">

                <RefreshCcw className="animate-spin text-blue-600" size={36} />

                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Carregando dados do banco...</p>

              </div>

            </div>

          )}



          {!loading && registros.length === 0 && planejamentos.length === 0 && (

            <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 text-amber-800 flex flex-col md:flex-row justify-between items-center gap-4">

              <div className="flex items-center gap-3">

                <AlertTriangle className="text-amber-600 shrink-0" size={24} />

                <div>

                  <p className="font-black text-sm">Nenhum dado importado ou planejamento cadastrado para este dia ({dataSelecionada.split('-').reverse().join('/')}).</p>

                  <p className="text-xs text-amber-700 font-bold mt-0.5">Use o botão "Carregar Base" acima para carregar o arquivo diário, ou clique em "Editar Planejamento" abaixo para definir as metas do dia.</p>

                </div>

              </div>

            </div>

          )}



          {/* Grid de Resumo (ONE PAGE) */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {currentData.resumo.map((bloco, idx) => (

              <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">

                <div className="bg-slate-50 py-4 px-6 border-b border-slate-100">

                  <h4 className="font-black text-blue-950 text-sm uppercase tracking-wider text-center">{bloco.title}</h4>

                </div>

                <div className="flex-grow">

                  <table className="w-full text-xs">

                    <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100">

                      <tr className="uppercase font-black tracking-widest text-[9px]">

                        <th className="py-3 px-4 text-left">Categoria</th>

                        <th className="py-3 px-3 text-center">Plan</th>

                        <th className="py-3 px-3 text-center">Real</th>

                        <th className="py-3 px-3 text-center">GAP</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100 font-bold text-slate-600">

                      {bloco.items.map((item, itemIdx) => {

                        const gap = item.real - item.plan;

                        return (

                          <tr key={itemIdx} className="hover:bg-slate-50/50 transition-colors">

                            <td className="py-3 px-4">{item.name}</td>

                            <td className="py-3 px-3 text-center bg-slate-50/20 text-slate-400 font-medium border-l border-slate-100/50">{item.plan}</td>

                            <td className={`py-3 px-3 text-center ${getEntregaCellClass(item.plan, item.real, 'real')} border-l border-slate-100/50`}>{item.real}</td>

                            <td className={`py-3 px-3 text-center ${getEntregaGapClass(gap)} border-l border-slate-100/50`}>

                              {gap > 0 ? `+${gap}` : gap}

                            </td>

                          </tr>

                        );

                      })}

                    </tbody>

                    <tfoot className="border-t-2 border-slate-200 bg-slate-50 divide-y divide-slate-100">

                      {bloco.totais.map((total, totIdx) => {

                        const gap = total.real - total.plan;

                        return (

                          <tr key={totIdx}>

                            <td className="py-3 px-4 font-black text-blue-950">{total.name}</td>

                            <td className="py-3 px-3 text-center font-black text-slate-500 border-l border-slate-200">{total.plan}</td>

                            <td className={`py-3 px-3 text-center font-black ${gap >= 0 ? 'text-emerald-700 bg-emerald-50/30' : 'text-rose-700 bg-rose-50/30'} border-l border-slate-200`}>{total.real}</td>

                            <td className={`py-3 px-3 text-center font-black ${getEntregaGapClass(gap)} border-l border-slate-200`}>

                              {gap > 0 ? `+${gap}` : gap}

                            </td>

                          </tr>

                        );

                      })}

                    </tfoot>

                  </table>

                </div>

              </div>

            ))}

          </div>



          {/* Detalhamento por Base */}

          <div className="space-y-6">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-200 pb-2 mt-4 gap-4">

              <h3 className="text-xl font-black text-blue-950 flex items-center gap-2">

                 Detalhamento por Base e Horário - {activeRegionTab === 'norte' ? 'Região Norte' : 'Região Leste'}

              </h3>

              

              <div className="flex flex-wrap gap-2">

                {isEditingPlan ? (

                  <div className="flex gap-2">

                    <button 

                      onClick={handleSavePlan}

                      disabled={saveLoading}

                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"

                    >

                      <Save size={14} /> {saveLoading ? 'Salvando...' : 'Salvar Planejamento'}

                    </button>

                    <button 

                      onClick={() => {

                        setIsEditingPlan(false);

                        setEditPlanState({});

                      }}

                      className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"

                    >

                      Cancelar

                    </button>

                  </div>

                ) : (

                  <button 

                    onClick={() => {

                      const initial = {};

                      baseList.forEach(base => {

                        vehicleList.forEach(vehicle => {

                          timeList.forEach(time => {

                            const key = `${base}|${time}|${vehicle}`;

                            initial[key] = planCounts[key] || 0;

                          });

                        });

                      });

                      setEditPlanState(initial);

                      setIsEditingPlan(true);

                    }}

                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 border border-blue-600 hover:border-blue-700"

                  >

                    <Edit size={14} /> Editar Planejamento

                  </button>

                )}



                <button 

                  onClick={() => toggleAll(regionKey, true)}

                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm border border-slate-200"

                >

                  Recolher Todos

                </button>

                <button 

                  onClick={() => toggleAll(regionKey, false)}

                  className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm border border-slate-200"

                >

                  Expandir Todos

                </button>

              </div>

            </div>



            {/* Tabela de Detalhes com transições suaves */}

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden">

              <div className="bg-blue-950 text-white p-4 font-black text-center uppercase tracking-widest text-xs">

                Acompanhamento Horário - {activeRegionTab === 'norte' ? 'Região Norte' : 'Região Leste'}

              </div>

              <div className="overflow-x-auto">

                <table className="w-full text-xs border-collapse min-w-[1000px]">

                  <thead>

                    <tr className="bg-slate-50 text-blue-950 font-black">

                      <th rowSpan="2" className="border-r border-b-2 border-slate-200 p-0 w-[120px] sticky left-0 z-30 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.02)]"></th>

                      <th rowSpan="2" className="border-r border-b-2 border-slate-200 p-3 w-[140px] sticky left-[120px] z-30 bg-slate-50 uppercase text-[10px] tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.03)] text-left align-middle">

                        Tipo Veículo

                      </th>

                      {currentData.tempos.map((t, idx) => (

                        <th key={idx} colSpan="2" className="border-r border-slate-200 p-2 text-center border-b-[3px] border-orange-400 bg-slate-50/50">

                          {t}

                        </th>

                      ))}

                      <th colSpan="2" className="p-2 text-center border-b-[3px] border-slate-400 bg-slate-100 text-slate-800">

                        TOTAL

                      </th>

                    </tr>

                    <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase tracking-widest font-black">

                      {currentData.tempos.map((_, idx) => (

                        <React.Fragment key={idx}>

                          <th className="border-r border-slate-200 p-1.5 text-center bg-slate-50/30 font-medium">Plan</th>

                          <th className="border-r border-slate-200 p-1.5 text-center bg-white font-medium">Real</th>

                        </React.Fragment>

                      ))}

                      <th className="border-r border-slate-200 p-1.5 text-center bg-slate-100 text-slate-600">Plan</th>

                      <th className="p-1.5 text-center bg-slate-100 text-slate-600">Real</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y-2 divide-slate-200">

                    {currentData.detalhes.map((bloco, bIdx) => {

                      const isCollapsed = collapsedStates[regionKey][bIdx] ?? false;

                      const rowCount = isCollapsed ? 1 : bloco.veiculos.length + 1;

                      const isTotalGeral = bloco.base.includes("TOTAL");



                      // Estilos para agrupador de Base

                      const baseBgClass = isTotalGeral ? "bg-blue-950 text-white" : "bg-slate-100 text-slate-800";

                      const btnClass = isTotalGeral 

                        ? "bg-white/10 hover:bg-white/20 border-white/20 text-white" 

                        : "bg-white hover:bg-slate-200 border-slate-300 text-slate-500 shadow-sm";



                      // Calcular Totais da Base

                      let totaisBase = { 

                        plan: Array(currentData.tempos.length).fill(0), 

                        real: Array(currentData.tempos.length).fill(0), 

                        totalPlan: 0, 

                        totalReal: 0 

                      };

                      bloco.veiculos.forEach(v => {

                        v.plan.forEach((p, i) => { totaisBase.plan[i] += p; totaisBase.totalPlan += p; });

                        v.real.forEach((r, i) => { totaisBase.real[i] += r; totaisBase.totalReal += r; });

                      });



                      // Célula lateral de Base

                      const baseTdHTML = (

                        <td 

                          rowSpan={rowCount} 

                          className={`border-r border-b ${baseBgClass} p-3 align-middle w-[120px] sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)]`}

                        >

                          <div className="flex flex-col items-center justify-center gap-2">

                            <button 

                              onClick={() => toggleCollapse(regionKey, bIdx)} 

                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors border ${btnClass}`}

                            >

                              <ChevronRight 

                                size={12} 

                                className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-90'}`} 

                              />

                            </button>

                            <span className="text-center font-black text-[10px] uppercase tracking-wider break-words w-full leading-tight">

                              {bloco.base}

                            </span>

                          </div>

                        </td>

                      );



                      return (

                        <React.Fragment key={bIdx}>

                          {/* Renderizar linhas de veículos */}

                          {bloco.veiculos.map((v, vIdx) => {

                            let totalPlanV = 0;

                            let totalRealV = 0;

                            return (

                              <tr 

                                key={vIdx} 

                                className={`tr-transition border-b border-slate-100 hover:bg-slate-50/50 ${

                                  isCollapsed ? 'opacity-0 invisible pointer-events-none' : 'opacity-100'

                                }`}

                                style={{

                                  height: isCollapsed ? '0px' : 'auto',

                                  display: isCollapsed ? 'none' : ''

                                }}

                              >

                                {vIdx === 0 && !isCollapsed && baseTdHTML}

                                <td className={`td-transition border-r border-slate-200 sticky left-[120px] z-10 bg-white font-bold text-slate-600 align-middle ${

                                  isCollapsed ? 'p-0 border-none' : 'p-3'

                                }`}>

                                  <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>

                                    {v.tipo}

                                  </div>

                                </td>

                                {v.plan.map((p, i) => {

                                  const r = v.real[i];

                                  totalPlanV += p;

                                  totalRealV += r;

                                  return (

                                    <React.Fragment key={i}>

                                      <td className={`td-transition text-center ${

                                        isCollapsed ? 'p-0 border-none' : 'p-2.5'

                                      } ${getEntregaCellClass(p, r, 'plan', false)}`}>

                                        <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>

                                          {isEditingPlan && !isTotalGeral ? (

                                            <input

                                              type="number"

                                              value={editPlanState[`${getTitleCaseBase(bloco.base)}|${currentData.tempos[i]}|${v.tipo}`] ?? p}

                                              onChange={(e) => {

                                                const val = parseInt(e.target.value, 10);

                                                const key = `${getTitleCaseBase(bloco.base)}|${currentData.tempos[i]}|${v.tipo}`;

                                                setEditPlanState(prev => ({

                                                  ...prev,

                                                  [key]: isNaN(val) ? 0 : val

                                                }));

                                              }}

                                              className="w-12 text-center bg-white border border-slate-300 rounded font-black text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-0.5 text-xs"

                                              min="0"

                                            />

                                          ) : (

                                            p

                                          )}

                                        </div>

                                      </td>

                                      <td className={`td-transition text-center ${

                                        isCollapsed ? 'p-0 border-none' : 'p-2.5'

                                      } ${getEntregaCellClass(p, r, 'real', false)}`}>

                                        <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>

                                          {r}

                                        </div>

                                      </td>

                                    </React.Fragment>

                                  );

                                })}

                                <td className={`td-transition text-center ${

                                  isCollapsed ? 'p-0 border-none border-l-0' : 'p-2.5'

                                } ${getEntregaCellClass(totalPlanV, totalRealV, 'plan', true)}`}>

                                  <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>

                                    {totalPlanV}

                                  </div>

                                </td>

                                <td className={`td-transition text-center ${

                                  isCollapsed ? 'p-0 border-none' : 'p-2.5'

                                } ${getEntregaCellClass(totalPlanV, totalRealV, 'real', true)}`}>

                                  <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>

                                    {totalRealV}

                                  </div>

                                </td>

                              </tr>

                            );

                          })}



                          {/* Linha de Total Geral da Base */}

                          <tr className={`${isTotalGeral ? "bg-slate-200/60" : "bg-slate-50/50"} font-bold border-t border-slate-300 tr-transition`}>

                            {isCollapsed && baseTdHTML}

                            <td className="p-3 border-r border-slate-200 font-black text-blue-950 sticky left-[120px] z-10 align-middle">

                              Total Geral

                            </td>

                            {totaisBase.plan.map((p, i) => {

                              const r = totaisBase.real[i];

                              return (

                                <React.Fragment key={i}>

                                  <td className={`p-2.5 text-center ${getEntregaCellClass(p, r, 'plan', true)}`}>{p}</td>

                                  <td className={`p-2.5 text-center ${getEntregaCellClass(p, r, 'real', true)}`}>{r}</td>

                                </React.Fragment>

                              );

                            })}

                            <td className={`p-2.5 text-center font-black ${getEntregaCellClass(totaisBase.totalPlan, totaisBase.totalReal, 'plan', true)}`}>

                              {totaisBase.totalPlan}

                            </td>

                            <td className={`p-2.5 text-center font-black ${getEntregaCellClass(totaisBase.totalPlan, totaisBase.totalReal, 'real', true)}`}>

                              {totaisBase.totalReal}

                            </td>

                          </tr>

                        </React.Fragment>

                      );

                    })}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        </>

      ) : (

        renderEvolutionDashboard()

      )}

    </div>

  );

}



function AguardandoAcessoView({ currentUser, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] bg-emerald-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 md:p-12 rounded-[2.5rem] max-w-lg w-full text-center relative z-10 shadow-2xl">
        <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.15)] relative">
           <div className="absolute inset-0 border-2 border-blue-400/30 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
           <ShieldAlert className="text-blue-400 w-10 h-10" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">Aguardando Liberação</h1>
        
        <p className="text-slate-400 mb-8 text-sm md:text-base leading-relaxed">
          Sua conta (<strong>{currentUser?.nome || currentUser?.email}</strong>) já foi aprovada, mas o seu perfil de <strong className="text-slate-200">{currentUser?.setor} / {currentUser?.perfil}</strong> ainda não possui módulos de acesso configurados no sistema.
        </p>

        <div className="bg-slate-900/50 rounded-2xl p-4 mb-8 border border-slate-700/50 flex flex-col gap-2 text-left">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Conta Ativa
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div> Aguardando Permissões na Matriz
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          Sair do Sistema
        </button>
      </div>
    </div>
  );
}
