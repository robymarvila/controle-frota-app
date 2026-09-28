import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';

/**
 * Componente SearchableSelect para seleção com busca dinâmica e auto-sugestões.
 * Totalmente compatível com mobile (Android, iOS Safari) e desktop.
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Buscar ou selecionar...',
  className = '',
  disabled = false,
  autoFocus = false,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sincronizar query com o valor atual
  useEffect(() => {
    const selected = options.find(o => String(o.value || '').toUpperCase() === String(value || '').toUpperCase());
    if (selected) {
      setQuery(selected.label || selected.value);
    } else {
      setQuery(value ? String(value) : '');
    }
  }, [value, options]);

  // Fechar ao clicar fora (com suporte a touchstart para iOS Safari)
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Restaura query para o label selecionado se usuário não escolheu
        const selected = options.find(o => String(o.value || '').toUpperCase() === String(value || '').toUpperCase());
        setQuery(selected ? (selected.label || selected.value) : '');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [value, options]);

  // Filtragem de opções pelo termo digitado
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const currentLabel = (options.find(o => String(o.value || '').toUpperCase() === String(value || '').toUpperCase())?.label || '').toLowerCase();

    // Se estiver exatamente igual ao selecionado ou vazio, mostra todas as opções (limitado a 80)
    if (!q || q === currentLabel) {
      return options.slice(0, 80);
    }

    return options.filter(opt => {
      const valStr = String(opt.value || '').toLowerCase();
      const labelStr = String(opt.label || '').toLowerCase();
      const subStr = String(opt.subLabel || '').toLowerCase();
      return valStr.includes(q) || labelStr.includes(q) || subStr.includes(q);
    }).slice(0, 80);
  }, [options, query, value]);

  // Reseta índice destacado quando a lista muda
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  const handleSelectOption = (opt) => {
    onChange(opt.value);
    setQuery(opt.label || opt.value);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setIsOpen(true);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
      // Scroll automático para item visível
      if (listRef.current) {
        const item = listRef.current.children[highlightedIndex + 1];
        if (item) item.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
      if (listRef.current) {
        const item = listRef.current.children[highlightedIndex - 1];
        if (item) item.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          autoFocus={autoFocus}
          className={`${className} pr-16 text-base sm:text-sm`}
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (e.target.value === '') {
              onChange('');
            }
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck="false"
        />

        {/* Botão de Limpar e Chevron */}
        <div className="absolute right-3 flex items-center gap-1.5 text-slate-400">
          {query && !disabled && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleClear(e); }}
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              title="Limpar seleção"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); !disabled && setIsOpen(!isOpen); }}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            tabIndex={-1}
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista Flutuante de Sugestões */}
      {isOpen && !disabled && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-56 overflow-y-auto overflow-x-hidden p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.value || '').toUpperCase() === String(value || '').toUpperCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={`${opt.value}-${idx}`}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    // Impede o blur do input antes da seleção ser processada
                    e.preventDefault();
                    handleSelectOption(opt);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleSelectOption(opt);
                  }}
                  onClick={() => handleSelectOption(opt)}
                  className={`p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-between gap-2 select-none ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : isHighlighted
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-mono font-black text-sm tracking-wide">
                      {opt.label || opt.value}
                    </span>
                    {opt.subLabel && (
                      <span className={`text-[10px] font-medium truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {opt.subLabel}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check size={16} className="shrink-0 text-white" />
                  )}
                </li>
              );
            })
          ) : (
            <li className="p-3 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
              Nenhuma placa correspondente encontrada
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
