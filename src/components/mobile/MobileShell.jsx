import React, { useState, useCallback } from 'react';
import BottomNavBar from './BottomNavBar';
import MobileTopBar from './MobileTopBar';
import MobileCategoryHub from './MobileCategoryHub';
import { ArrowLeft, Plus } from 'lucide-react';

// Maps tab → module IDs that belong to it
const tabModuleMap = {
  inicio: ['inicio', 'dashboard', 'calendario', 'historico', 'painel_tv'],
  frota: ['chamados', 'frota', 'ociosidade_frota', 'fidelizacao', 'detalhes_veiculo', 'mecanico'],
  fiscalizacao: ['autofiscalizacao', 'wfm_despacho', 'status_auditores'],
  operacao: ['entrega_equipes', 'forca', 'colaboradores', 'detalhes_colaborador'],
  mais: ['meu_perfil', 'usuarios'],
};

// Module titles for the top bar
const moduleTitles = {
  inicio: 'Início',
  dashboard: 'Dashboard',
  calendario: 'Calendário Operacional',
  historico: 'Histórico / Filtros',
  chamados: 'Chamados (E-CAR)',
  frota: 'Frota de Veículos',
  ociosidade_frota: 'Ociosidade Frota',
  fidelizacao: 'Fidelização',
  autofiscalizacao: 'AutoFiscalização',
  wfm_despacho: 'WFM / Despacho',
  status_auditores: 'Status Auditores',
  entrega_equipes: 'Entrega Equipes',
  forca: 'Força de Trabalho',
  colaboradores: 'Colaboradores',
  meu_perfil: 'Meu Perfil',
  usuarios: 'Usuários (Acessos)',
  detalhes_veiculo: 'Detalhes do Veículo',
  detalhes_colaborador: 'Detalhes do Colaborador',
  mecanico: 'Painel Mecânico',
};

export default function MobileShell({
  // State from App
  activeTab,
  setActiveTab,
  activeRegional,
  setActiveRegional,
  currentUser,
  userPermissions,
  theme,
  setTheme,
  onLogout,
  // Handlers from App
  setIsNovoChamadoModalOpen,
  // Children = the rendered module content
  children,
}) {
  const isDark = theme === 'dark';

  // Mobile navigation state
  const [activeCategory, setActiveCategory] = useState('home');
  const [activeModule, setActiveModule] = useState('home'); // Initial screen: Home (Boas-Vindas)

  // Navigate to a module
  const handleSelectModule = useCallback((moduleId) => {
    setActiveModule(moduleId);
    setActiveTab(moduleId);
  }, [setActiveTab]);

  // Navigate back to category hub
  const handleBack = useCallback(() => {
    setActiveModule(null);
  }, []);

  // Change bottom tab category
  const handleChangeCategory = useCallback((catId) => {
    setActiveCategory(catId);
    if (catId === 'home') {
      setActiveModule('home');
      setActiveTab('inicio');
    } else if (catId === 'inicio') {
      setActiveModule(null); // Show Inicio hub cards: Dashboard, Calendário, Histórico
    } else {
      setActiveModule(null); // Reset to hub view for other categories
    }
  }, [setActiveTab]);

  // Determine if we're inside a module or viewing the hub
  const isInsideModule = activeModule !== null;
  const moduleTitle = (activeModule === 'home' || activeModule === 'boas_vindas') ? 'Home (Boas-Vindas)' : (moduleTitles[activeModule] || '');

  // Determine if current view should show FAB (Floating Action Button)
  const showFAB = activeModule === 'chamados';

  return (
    <div
      className={`${isDark ? 'dark' : ''} h-dvh min-h-dvh`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: isDark ? '#020813' : '#F5F3FF',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: isDark ? '#f8fafc' : '#0f172a',
      }}
    >
      {/* Top Bar */}
      <MobileTopBar
        title={isInsideModule ? moduleTitle : 'Controle Operacional'}
        subtitle={isInsideModule ? null : `Olá, ${currentUser?.nome?.split(' ')[0] || 'Usuário'}`}
        showBackButton={isInsideModule}
        onBack={handleBack}
        currentUser={currentUser}
        activeRegional={activeRegional}
        setActiveRegional={setActiveRegional}
        theme={theme}
        setTheme={setTheme}
        onLogout={onLogout}
        onNavigateProfile={() => {
          setActiveCategory('mais');
          handleSelectModule('meu_perfil');
        }}
      />

      {/* Main Content Area */}
      <div
        className="mobile-scroll mobile-no-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: isInsideModule ? 0 : undefined,
        }}
      >
        {isInsideModule ? (
          // Render the actual module content (passed as children from App.jsx)
          <div
            className="mobile-page-enter"
            style={{
              minHeight: '100%',
              paddingBottom: 90, // space for bottom nav
            }}
          >
            {children}
          </div>
        ) : (
          // Render the category hub
          <MobileCategoryHub
            category={activeCategory}
            onSelectModule={handleSelectModule}
            userPermissions={userPermissions}
            theme={theme}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        )}
      </div>

      {/* Floating Action Button (e.g., "Novo Chamado" on Chamados view) */}
      {showFAB && userPermissions?.permissoes_edicao?.pode_abrir_chamado && (
        <button
          className="mobile-fab ripple"
          onClick={() => setIsNovoChamadoModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #059669, #14b8a6)',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeCategory={activeCategory}
        onChangeCategory={handleChangeCategory}
        theme={theme}
      />
    </div>
  );
}
