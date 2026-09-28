import React from 'react';
import { AlertTriangle, RefreshCcw, Home, ChevronDown } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Erro capturado na árvore de componentes:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      localStorage.removeItem('fleet_chamados_view_mode');
    } catch (e) {}
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      const errorMessage = String(this.state.error?.message || this.state.error || 'Erro desconhecido');

      return (
        <div className="min-h-[50vh] p-4 sm:p-8 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-rose-200 dark:border-rose-900/60 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-200 dark:border-rose-800">
              <AlertTriangle size={32} />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Instabilidade ao Carregar o Módulo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Identificamos uma inconsistência momentânea na exibição desta tela. Você pode tentar recarregar ou retornar ao início.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <RefreshCcw size={16} />
                <span>Tentar Novamente</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Home size={16} />
                <span>Voltar ao Início</span>
              </button>
            </div>

            {/* Detalhes Técnicos Expansíveis para Diagnóstico */}
            <div className="pt-2 text-left">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mx-auto"
              >
                <span>{this.state.showDetails ? 'Ocultar Detalhes Técnicos' : 'Ver Detalhes Técnicos'}</span>
                <ChevronDown size={12} className={`transition-transform ${this.state.showDetails ? 'rotate-180' : ''}`} />
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-rose-600 dark:text-rose-400 break-words whitespace-pre-wrap max-h-40 overflow-y-auto">
                  <strong>Erro:</strong> {errorMessage}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 text-slate-500 dark:text-slate-400">
                      <strong>Stack:</strong>
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
