import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sun, Moon, Globe, User, LogOut, ChevronDown, Shield } from 'lucide-react';

export default function MobileTopBar({
  title,
  subtitle,
  onBack,
  currentUser,
  activeRegional = 'Todas',
  setActiveRegional,
  theme,
  setTheme,
  showBackButton = false,
  rightActions,
  onLogout,
  onNavigateProfile,
}) {
  const isDark = theme === 'dark';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const canChooseRegional = ['Global', 'Todas'].includes(currentUser?.regional) || 
                            ['ADMINISTRADOR', 'GERENTE', 'COORDENADOR', 'SUPERVISOR', 'ANALISTA', 'FROTA'].includes(currentUser?.perfil?.toUpperCase());

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const currentRegionDisplay = activeRegional || currentUser?.regional || 'Todas';

  return (
    <header
      className={`mobile-top-bar pt-safe relative z-40 ${isDark ? 'glass dark' : 'glass'}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 12px',
        borderBottom: isDark
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(0,0,0,0.04)',
        minHeight: 56,
      }}
    >
      {/* Back button */}
      {showBackButton && (
        <button
          onClick={onBack}
          className="ripple touch-target"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft
            size={22}
            style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
          />
        </button>
      )}

      {/* Title area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: isDark ? '#f8fafc' : '#0f172a',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: 0,
          }}
        >
          {title || 'Controle Operacional'}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isDark ? '#64748b' : '#94a3b8',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right actions: Regional Base Selector + Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Regional Base Selector Pill */}
        <div
          className={`flex items-center px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
            isDark 
              ? 'bg-slate-800/90 border-slate-700 text-blue-300' 
              : 'bg-white/95 border-slate-200 text-blue-950 shadow-xs'
          }`}
        >
          <Globe size={13} className="text-blue-500 mr-1.5 shrink-0" />
          {canChooseRegional && setActiveRegional ? (
            <select
              value={currentRegionDisplay}
              onChange={(e) => setActiveRegional(e.target.value)}
              className="bg-transparent text-xs font-black outline-none cursor-pointer pr-0.5"
              style={{ color: 'inherit' }}
            >
              <option value="Todas" className="text-slate-900 bg-white">Global</option>
              <option value="Norte" className="text-slate-900 bg-white">Norte</option>
              <option value="Leste" className="text-slate-900 bg-white">Leste</option>
            </select>
          ) : (
            <span className="text-xs font-black">{currentRegionDisplay === 'Todas' ? 'Global' : currentRegionDisplay}</span>
          )}
        </div>

        {rightActions}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="ripple touch-target"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          title={isDark ? 'Modo Claro' : 'Modo Escuro'}
        >
          {isDark ? (
            <Sun size={18} style={{ color: '#fbbf24' }} />
          ) : (
            <Moon size={18} style={{ color: '#64748b' }} />
          )}
        </button>

        {/* User avatar with interactive dropdown */}
        {currentUser && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="ripple touch-target flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: isDark
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(20,184,166,0.25))'
                  : 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                fontWeight: 900,
                fontSize: 13,
                color: isDark ? '#34d399' : '#059669',
                textTransform: 'uppercase',
                border: isDark
                  ? '1.5px solid rgba(16,185,129,0.4)'
                  : '1.5px solid rgba(16,185,129,0.3)',
                flexShrink: 0,
              }}
              title="Menu do Usuário"
            >
              {currentUser.nome?.charAt(0) || 'U'}
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div 
                className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* User Info Header */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-1.5 border border-slate-100 dark:border-slate-700/50">
                  <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                    {currentUser.nome || 'Usuário'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentUser.email || currentUser.login}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/50">
                      {currentUser.perfil || 'COLABORADOR'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 border border-slate-300/40">
                      {currentRegionDisplay === 'Todas' ? 'Global' : currentRegionDisplay}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onNavigateProfile) onNavigateProfile();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-all text-left active:bg-slate-200"
                >
                  <User size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>Meu Perfil</span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-all text-left active:bg-rose-100"
                >
                  <LogOut size={16} className="text-rose-500" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
