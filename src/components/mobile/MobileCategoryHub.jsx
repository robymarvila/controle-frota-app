import React from 'react';
import {
  Home, LayoutDashboard, CalendarCheck, History,
  Wrench, CarFront, Activity, ShieldCheck,
  FileSignature, MapPin,
  ClipboardCheck, Briefcase, Users,
  Lock, User, LogOut, Sparkles, Sun, Moon,
  ChevronRight
} from 'lucide-react';

// Category → module mappings
const categoryModules = {
  inicio: [
    { id: 'dashboard', icon: LayoutDashboard, title: 'Dashboard', subtitle: 'Indicadores e gráficos', gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#2563eb', permKey: 'dashboard' },
    { id: 'calendario', icon: CalendarCheck, title: 'Calendário Operacional', subtitle: 'Agenda de operações', gradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', color: '#7c3aed', permKey: 'calendario' },
    { id: 'historico', icon: History, title: 'Histórico / Filtros', subtitle: 'Consulta de chamados', gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706', permKey: 'historico' },
  ],
  frota: [
    { id: 'chamados', icon: Wrench, title: 'Chamados (E-CAR)', subtitle: 'Abrir e gerenciar chamados', gradient: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669', permKey: 'chamados' },
    { id: 'frota', icon: CarFront, title: 'Frota de Veículos', subtitle: 'Gerenciar todos os veículos', gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#2563eb', permKey: 'frota' },
    { id: 'ociosidade_frota', icon: Activity, title: 'Ociosidade Frota', subtitle: 'Veículos ociosos e alertas', gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706', permKey: 'ociosidade_frota' },
    { id: 'fidelizacao', icon: ShieldCheck, title: 'Fidelização', subtitle: 'Conformidade da frota', gradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', color: '#7c3aed', permKey: 'fidelizacao' },
  ],
  fiscalizacao: [
    { id: 'autofiscalizacao', icon: FileSignature, title: 'AutoFiscalização', subtitle: 'Fiscalização em campo', gradient: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669', permKey: 'autofiscalizacao' },
    { id: 'wfm_despacho', icon: MapPin, title: 'WFM / Despacho', subtitle: 'Gestão de equipes em campo', gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#2563eb', permKey: 'wfm_despacho' },
  ],
  operacao: [
    { id: 'entrega_equipes', icon: ClipboardCheck, title: 'Entrega Equipes', subtitle: 'Controle de entrega', gradient: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669', permKey: 'entrega_equipes' },
    { id: 'forca', icon: Briefcase, title: 'Força de Trabalho', subtitle: 'Gestão de pessoal', gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#2563eb', permKey: 'forca' },
    { id: 'colaboradores', icon: Users, title: 'Colaboradores', subtitle: 'Cadastro de colaboradores', gradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', color: '#7c3aed', permKey: 'colaboradores' },
  ],
  mais: [
    { id: 'meu_perfil', icon: User, title: 'Meu Perfil', subtitle: 'Dados pessoais e atividade', gradient: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669', permKey: null },
    { id: 'usuarios', icon: Lock, title: 'Usuários (Acessos)', subtitle: 'Gerenciar permissões', gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706', permKey: 'usuarios' },
  ],
};

const categoryTitles = {
  inicio: { emoji: '🏠', title: 'Início' },
  frota: { emoji: '🚗', title: 'Frota' },
  fiscalizacao: { emoji: '📋', title: 'Fiscalização' },
  operacao: { emoji: '👷', title: 'Operação' },
  mais: { emoji: '⚙️', title: 'Mais' },
};

export default function MobileCategoryHub({
  category,
  onSelectModule,
  userPermissions,
  theme,
  currentUser,
  onLogout,
}) {
  const isDark = theme === 'dark';
  const modules = categoryModules[category] || [];
  const catInfo = categoryTitles[category] || { emoji: '', title: '' };

  // Filter by permission
  const visibleModules = modules.filter(mod => {
    if (mod.permKey === null) return true; // always visible (e.g. Meu Perfil)
    return userPermissions?.modulos_visiveis?.includes(mod.permKey);
  });

  return (
    <div
      className="mobile-page-enter mobile-scroll"
      style={{
        padding: '24px 16px',
        paddingBottom: 120,
        minHeight: '100%',
      }}
    >
      {/* Category header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 32 }}>{catInfo.emoji}</span>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: isDark ? '#f8fafc' : '#0f172a',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {catInfo.title}
          </h2>
        </div>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: isDark ? '#475569' : '#94a3b8',
            margin: 0,
            paddingLeft: 42,
          }}
        >
          {visibleModules.length} módulo{visibleModules.length !== 1 ? 's' : ''} disponíve{visibleModules.length !== 1 ? 'is' : 'l'}
        </p>
      </div>

      {/* Module cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibleModules.map(mod => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => onSelectModule(mod.id)}
              className="glass-card mobile-card-press ripple"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 18,
                borderRadius: 20,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Icon container */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: isDark
                    ? `linear-gradient(135deg, ${mod.color}15, ${mod.color}25)`
                    : mod.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={26} style={{ color: mod.color }} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: isDark ? '#f8fafc' : '#0f172a',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {mod.title}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isDark ? '#475569' : '#94a3b8',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {mod.subtitle}
                </p>
              </div>

              {/* Chevron */}
              <ChevronRight
                size={20}
                style={{
                  color: isDark ? '#334155' : '#cbd5e1',
                  flexShrink: 0,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Logout button in "Mais" */}
      {category === 'mais' && (
        <button
          onClick={onLogout}
          className="ripple"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            marginTop: 32,
            padding: 16,
            borderRadius: 16,
            background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)',
            border: isDark ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(239,68,68,0.1)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <LogOut size={20} style={{ color: '#ef4444' }} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#ef4444',
            }}
          >
            Sair do Sistema
          </span>
        </button>
      )}
    </div>
  );
}
