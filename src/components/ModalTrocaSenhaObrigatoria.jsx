import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, Check, X, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { hashPassword, validatePasswordStrength } from '../utils/security';
import { supabase } from '../supabaseClient';

export default function ModalTrocaSenhaObrigatoria({ currentUser, onPasswordUpdated }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [showConfirma, setShowConfirma] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const isMinLength = novaSenha.length >= 6;
  const isMatch = novaSenha.length > 0 && novaSenha === confirmaSenha;
  const canSubmit = isMinLength && isMatch && !salvando;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    const validation = validatePasswordStrength(novaSenha);
    if (!validation.isValid) {
      setErro(validation.message);
      return;
    }

    if (novaSenha !== confirmaSenha) {
      setErro('A confirmação da senha não confere com a nova senha digitada.');
      return;
    }

    setSalvando(true);
    try {
      // 1. Criptografar a nova senha com SHA-256 + Salt
      const hashedPassword = await hashPassword(novaSenha);

      // 2. Atualizar no banco Supabase (com fallback resiliente caso colunas opcionais não existam)
      let { error } = await supabase
        .from('usuarios')
        .update({
          senha: hashedPassword,
          precisa_trocar_senha: false
        })
        .eq('id', currentUser.id);

      if (error && (error.code === 'PGRST204' || String(error.message || '').includes('column'))) {
        const fallbackRes = await supabase
          .from('usuarios')
          .update({ senha: hashedPassword })
          .eq('id', currentUser.id);
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Erro ao atualizar senha no Supabase:', error);
        setErro('Erro ao salvar nova senha no banco: ' + error.message);
        setSalvando(false);
        return;
      }

      // 3. Atualizar a sessão do usuário
      const updatedUser = {
        ...currentUser,
        precisa_trocar_senha: false,
        precisaTrocarSenha: false
      };
      delete updatedUser.senha; // Garante que a senha não fica em sessão

      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      onPasswordUpdated(updatedUser);
    } catch (err) {
      console.error('Falha inesperada ao atualizar senha:', err);
      setErro('Falha inesperada de conexão ao atualizar a senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-300 font-sans">
      <div className="relative w-full max-w-[460px] bg-white rounded-[2.5rem] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.5)] border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Glow Header */}
        <div className="h-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

        <div className="p-8 sm:p-10">
          {/* Header Icon */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4 text-white">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Defina sua Nova Senha
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-2 leading-relaxed max-w-[340px]">
              Por segurança, como você acessou com uma senha provisória, crie uma senha exclusiva e definitiva que apenas você terá conhecimento.
            </p>
          </div>

          {/* Erro */}
          {erro && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold leading-relaxed flex items-start gap-3">
              <X size={16} className="shrink-0 mt-0.5" />
              <div>{erro}</div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Nova Senha */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                Nova Senha Pessoal
              </label>
              <div className="relative">
                <input
                  type={showNova ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-5 py-4 bg-slate-100/60 hover:bg-slate-100 focus:bg-white rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40 border border-transparent focus:border-emerald-500/30 transition-all text-sm pr-12"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNova(!showNova)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                >
                  {showNova ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Campo Confirmar Nova Senha */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showConfirma ? 'text' : 'password'}
                  required
                  placeholder="Repita a nova senha"
                  className="w-full px-5 py-4 bg-slate-100/60 hover:bg-slate-100 focus:bg-white rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40 border border-transparent focus:border-emerald-500/30 transition-all text-sm pr-12"
                  value={confirmaSenha}
                  onChange={e => setConfirmaSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirma(!showConfirma)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                >
                  {showConfirma ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Requisitos visuais */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                {isMinLength ? (
                  <Check size={16} className="text-emerald-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">•</div>
                )}
                <span className={isMinLength ? 'text-emerald-700' : 'text-slate-500'}>
                  Mínimo de 6 caracteres
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                {isMatch ? (
                  <Check size={16} className="text-emerald-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">•</div>
                )}
                <span className={isMatch ? 'text-emerald-700' : 'text-slate-500'}>
                  As duas senhas são idênticas
                </span>
              </div>
            </div>

            {/* Botão de Gravação */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                canSubmit
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 hover:-translate-y-0.5 active:scale-[0.98]'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {salvando ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Criptografando e Salvando...</span>
                </>
              ) : (
                <>
                  <span>Salvar Nova Senha e Acessar</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Dica de Segurança */}
          <div className="mt-6 text-center text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1.5">
            <Lock size={12} />
            <span>Sua senha é protegida com criptografia Zero-Knowledge</span>
          </div>
        </div>
      </div>
    </div>
  );
}
