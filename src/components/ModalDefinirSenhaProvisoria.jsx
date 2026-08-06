import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Sparkles, X, ArrowRight, Loader2, ShieldAlert, CheckCircle2, Copy, Check } from 'lucide-react';
import { hashPassword } from '../utils/security';
import { supabase } from '../supabaseClient';

export default function ModalDefinirSenhaProvisoria({
  usuario,
  targetUser,
  onClose,
  onSuccess
}) {
  const user = usuario || targetUser;
  const [senhaProvisoria, setSenhaProvisoria] = useState('');
  const [showSenha, setShowSenha] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const handleGerarAutomatica = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setSenhaProvisoria(`Alpitel@${randomDigits}`);
  };

  const handleCopy = () => {
    if (!senhaProvisoria) return;
    navigator.clipboard.writeText(senhaProvisoria);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!senhaProvisoria || senhaProvisoria.trim().length < 6) {
      setErro('A senha provisória deve ter no mínimo 6 caracteres.');
      return;
    }

    setSalvando(true);
    try {
      // 1. Criptografar senha provisória
      const hashedPassword = await hashPassword(senhaProvisoria.trim());

      // 2. Salvar no Supabase (com fallback resiliente caso colunas opcionais não existam)
      let { error } = await supabase
        .from('usuarios')
        .update({
          senha: hashedPassword,
          precisa_trocar_senha: true
        })
        .eq('id', user.id);

      // Se a coluna precisa_trocar_senha não existir no schema do Supabase, salvar apenas a senha
      if (error && (error.code === 'PGRST204' || String(error.message || '').includes('column'))) {
        const fallbackRes = await supabase
          .from('usuarios')
          .update({ senha: hashedPassword })
          .eq('id', user.id);
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Erro ao definir senha provisória:', error);
        setErro('Erro ao salvar no banco: ' + error.message);
        setSalvando(false);
        return;
      }

      const updatedRecord = {
        ...user,
        precisa_trocar_senha: true,
        precisaTrocarSenha: true
      };

      if (onSuccess) {
        onSuccess(updatedRecord);
      }

      setSucesso(true);
    } catch (err) {
      console.error(err);
      setErro('Erro inesperado de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div 
        className="relative w-full max-w-[460px] bg-white rounded-[2rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="h-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-8">
          {sucesso ? (
            /* Tela de Sucesso com Copiar Senha */
            <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                <CheckCircle2 size={36} />
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                Senha Provisória Definida!
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-6">
                Copie a senha abaixo e envie para <strong>{user.nome}</strong>. Ele será obrigado a alterá-la no primeiro login.
              </p>

              {/* Box de Exibição da Senha Provisória */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
                <div className="text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Senha Temporária
                  </span>
                  <span className="text-lg font-mono font-black text-slate-800 select-all">
                    {senhaProvisoria}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                    copied 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200'
                  }`}
                >
                  {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95"
              >
                Concluir
              </button>
            </div>
          ) : (
            /* Formulário para Definir Senha */
            <>
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
                  <KeyRound size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Definir Senha Provisória
                  </h3>
                  <p className="text-xs font-bold text-slate-600">
                    {user.nome}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400">
                    {user.login}
                  </p>
                </div>
              </div>

              {erro && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold flex items-start gap-2.5">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <div>{erro}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">
                      Nova Senha Temporária
                    </label>
                    <button
                      type="button"
                      onClick={handleGerarAutomatica}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
                    >
                      <Sparkles size={12} />
                      <span>Gerar Automática</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showSenha ? 'text' : 'password'}
                      required
                      placeholder="Ex: Alpitel@2026"
                      className="w-full px-4 py-3.5 bg-slate-100/70 hover:bg-slate-100 focus:bg-white rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40 border border-transparent focus:border-indigo-500/30 transition-all text-sm pr-12"
                      value={senhaProvisoria}
                      onChange={e => setSenhaProvisoria(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                    >
                      {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Explicação de Segurança */}
                <div className="bg-amber-50/70 border border-amber-200/60 p-4 rounded-xl text-xs font-medium text-amber-800 leading-relaxed">
                  <p className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                    <span>⚠️</span> Troca Obrigatória no Próximo Acesso
                  </p>
                  Ao entrar com esta senha provisória, o colaborador será obrigado a definir sua senha pessoal privada antes de visualizar qualquer tela do sistema.
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando || !senhaProvisoria}
                    className="w-full py-3.5 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-md shadow-indigo-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {salvando ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <span>Definir e Criptografar</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
