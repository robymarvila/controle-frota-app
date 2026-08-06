import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Home, LayoutGrid, CarFront, FileSignature, Briefcase, Menu } from 'lucide-react';

const tabs = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'inicio', icon: LayoutGrid, label: 'Início' },
  { id: 'frota', icon: CarFront, label: 'Frota' },
  { id: 'fiscalizacao', icon: FileSignature, label: 'Fiscalização' },
  { id: 'operacao', icon: Briefcase, label: 'Operação' },
  { id: 'mais', icon: Menu, label: 'Mais' },
];

export default function BottomNavBar({ activeCategory, onChangeCategory, theme }) {
  const isDark = theme === 'dark';
  const navRef = useRef(null);
  const tabRefs = useRef([]);
  const [glassPos, setGlassPos] = useState({ left: 0, width: 0, ready: false });

  // Posicionamento 100% responsivo e preciso via medição de elemento real
  const updateGlassPosition = useCallback(() => {
    if (!navRef.current) return;
    const tabIndex = tabs.findIndex((t) => t.id === activeCategory);
    const activeIdx = tabIndex >= 0 ? tabIndex : 0;
    const activeBtn = tabRefs.current[activeIdx];

    if (activeBtn) {
      const btnRect = activeBtn.getBoundingClientRect();
      const navRect = navRef.current.getBoundingClientRect();

      const btnLeftRelative = btnRect.left - navRect.left;
      const btnWidth = btnRect.width;

      // Largura da gota ajustada perfeitamente ao botão ativo com margem harmônica
      const margin = Math.max(3, Math.min(8, (btnWidth - 44) / 2));
      const dropWidth = Math.max(38, btnWidth - margin * 2);
      const dropLeft = btnLeftRelative + (btnWidth - dropWidth) / 2;

      setGlassPos({
        left: dropLeft,
        width: dropWidth,
        ready: true,
      });
    }
  }, [activeCategory]);

  useEffect(() => {
    updateGlassPosition();

    // Ouvinte para redimensionamento e rotação de tela em smartphones/tablets
    window.addEventListener('resize', updateGlassPosition);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && navRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateGlassPosition();
      });
      resizeObserver.observe(navRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateGlassPosition);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateGlassPosition]);

  return (
    <nav
      ref={navRef}
      className={`bottom-nav relative flex items-center justify-around z-40 select-none ${
        isDark ? 'bg-slate-950/90 border-slate-800/80 text-white' : 'bg-white/90 border-slate-200/80 text-slate-900'
      }`}
      style={{
        height: 74,
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTopWidth: 1,
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        boxShadow: isDark
          ? '0 -8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255,255,255,0.06)'
          : '0 -8px 32px rgba(15, 23, 42, 0.08), inset 0 1px 1px rgba(255,255,255,0.9)',
      }}
    >
      {/* 💧 LIQUID GLASS DROP INDICATOR - 100% RESPONSIVO PARA QUALQUER SMARTPHONE */}
      {glassPos.ready && (
        <div
          className="absolute top-2 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none rounded-2xl flex items-center justify-center overflow-hidden"
          style={{
            transform: `translateX(${glassPos.left}px)`,
            left: 0,
            width: glassPos.width,
            height: 48,
            background: isDark
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.32), rgba(5, 150, 105, 0.22))'
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(20, 184, 166, 0.16))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: isDark
              ? '1.5px solid rgba(52, 211, 153, 0.55)'
              : '1.5px solid rgba(16, 185, 129, 0.5)',
            boxShadow: isDark
              ? '0 6px 24px rgba(16, 185, 129, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.35)'
              : '0 6px 20px rgba(16, 185, 129, 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
          }}
        >
          {/* Reflexo de brilho Liquid Sheen */}
          <div className="absolute -top-4 -left-4 w-9 h-9 bg-white/40 rounded-full blur-xs pointer-events-none" />
        </div>
      )}

      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = activeCategory === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[idx] = el)}
            onClick={() => onChangeCategory(tab.id)}
            className="relative z-10 flex flex-col items-center justify-center gap-1 w-full h-full py-1 transition-all duration-300 active:scale-90"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="relative flex items-center justify-center h-6">
              <Icon
                size={20}
                className={`transition-all duration-300 ${
                  isActive
                    ? isDark
                      ? 'text-emerald-400 scale-110'
                      : 'text-emerald-600 scale-110'
                    : isDark
                    ? 'text-slate-400'
                    : 'text-slate-500'
                }`}
              />
            </div>
            <span
              className={`text-[9px] tracking-tight transition-all duration-300 truncate max-w-full px-0.5 ${
                isActive
                  ? isDark
                    ? 'font-black text-emerald-400'
                    : 'font-black text-emerald-600'
                  : isDark
                  ? 'font-semibold text-slate-400'
                  : 'font-semibold text-slate-500'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
