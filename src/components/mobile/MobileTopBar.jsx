import React from 'react';
import { ArrowLeft, Sun, Moon, Bell } from 'lucide-react';

export default function MobileTopBar({
  title,
  subtitle,
  onBack,
  currentUser,
  theme,
  setTheme,
  showBackButton = false,
  rightActions,
}) {
  const isDark = theme === 'dark';

  return (
    <header
      className={`mobile-top-bar ${isDark ? 'glass dark' : 'glass'}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
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
            width: 40,
            height: 40,
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
            fontSize: 18,
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
              fontSize: 12,
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

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {rightActions}

        {/* Notification bell */}
        <button
          className="ripple touch-target"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <Bell size={20} style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              border: `2px solid ${isDark ? '#0b101d' : '#ffffff'}`,
            }}
          />
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="ripple touch-target"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {isDark ? (
            <Sun size={20} style={{ color: '#fbbf24' }} />
          ) : (
            <Moon size={20} style={{ color: '#64748b' }} />
          )}
        </button>

        {/* User avatar */}
        {currentUser && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: isDark
                ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(20,184,166,0.2))'
                : 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 14,
              color: isDark ? '#34d399' : '#059669',
              textTransform: 'uppercase',
              border: isDark
                ? '1px solid rgba(16,185,129,0.2)'
                : '1px solid rgba(16,185,129,0.15)',
              flexShrink: 0,
            }}
          >
            {currentUser.nome?.charAt(0) || 'U'}
          </div>
        )}
      </div>
    </header>
  );
}
