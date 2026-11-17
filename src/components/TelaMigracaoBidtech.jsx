import React, { useEffect } from 'react';
import { 
  Building2, ArrowRight, ShieldAlert, Users, 
  CheckCircle2, Info, Lock, Layers, HelpCircle
} from 'lucide-react';

/**
 * TelaMigracaoBidtech
 * Tela exibida para todos os usuários comunicando a incorporação
 * do Controle Operacional ao sistema unificado BIDTECH e bloqueando
 * novos acessos e logins de forma definitiva e atômica.
 */
export default function TelaMigracaoBidtech({ theme = 'light' }) {
  // Limpa quaisquer resíduos de sessão ativa para garantir bloqueio total
  useEffect(() => {
    try {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
      localStorage.removeItem('fleet_config_acessos_cache');
    } catch (e) {
      // Ignora erro em caso de bloqueio de storage no navegador
    }
  }, []);

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/40 text-slate-800'
    }`}>
      {/* Elementos Decorativos de Fundo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center">
        
        {/* Card Principal */}
        <div className={`w-full rounded-3xl border shadow-2xl p-6 sm:p-10 backdrop-blur-xl transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-slate-900/90 border-slate-800 shadow-emerald-950/20' 
            : 'bg-white/95 border-slate-200/80 shadow-slate-300/50'
        }`}>
          
          {/* Header com Ícone e Badge */}
          <div className="flex flex-col items-center text-center">
            
            {/* Ícones de Integração com Glow */}
            <div className="relative mb-5 flex items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <Building2 size={30} strokeWidth={2.2} />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-xs">
                <ArrowRight size={16} strokeWidth={2.5} />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Layers size={30} strokeWidth={2.2} />
              </div>
            </div>

            {/* Badge de Status da Plataforma */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              <Lock size={13} className="shrink-0" />
              <span>Sistema Temporariamente Desativado</span>
            </div>

            {/* Título Principal */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              O Controle Operacional agora faz parte da <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-300">BIDTECH</span>
            </h1>

            {/* Subtítulo / Contexto */}
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl font-medium">
              Informamos que as operações deste sistema foram incorporadas à plataforma unificada da <strong>BIDTECH</strong> para modernizar e centralizar a gestão de todas as nossas atividades.
            </p>
          </div>

          {/* Divisor */}
          <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

          {/* Instruções e Pontos Chave */}
          <div className="space-y-3.5">
            
            {/* Ponto 1: Plataforma BIDTECH */}
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Novo Canal de Atividades
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  A partir de agora, a abertura de chamados, controle de frota, ordens de serviço e demais rotinas operacionais devem ser realizadas <strong>exclusivamente através do sistema BIDTECH</strong>.
                </p>
              </div>
            </div>

            {/* Ponto 2: Acesso Desativado */}
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Acesso ao Portal Anterior Bloqueado
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  O acesso e a tela de login deste aplicativo foram temporariamente desativados para evitar duplicidade de dados e assegurar a transição ordenada para o novo ambiente.
                </p>
              </div>
            </div>

            {/* Ponto 3: Acionamento da Liderança */}
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-blue-950 dark:text-blue-200 uppercase tracking-wide">
                  Dúvidas ou Orientações de Acesso
                </h2>
                <p className="text-xs sm:text-sm text-blue-900/90 dark:text-blue-300/90 mt-0.5 leading-relaxed font-semibold">
                  Em caso de dúvidas sobre credenciais, links do novo sistema ou procedimento da sua equipe, <strong>acione imediatamente a sua liderança</strong>.
                </p>
              </div>
            </div>

          </div>

          {/* Alerta Institucional de Rodapé */}
          <div className="mt-6 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center flex items-center justify-center gap-2">
            <Info size={14} className="text-slate-400 shrink-0" />
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              Transição Operacional • Todos os dados históricos estão preservados e seguros.
            </p>
          </div>

        </div>

        {/* Rodapé Informativo */}
        <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wide">
          Controle Operacional • Integração BIDTECH • 2026
        </p>

      </div>
    </div>
  );
}

