import React, { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff, User, MapPin, Briefcase, Key, Calendar, Phone, AlertCircle, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

export default function EmployeeProfileModal({ isOpen, onClose, employee, onSave, onDelete, logAudit, currentUser }) {
  const [formData, setFormData] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canEditDirectly = React.useMemo(() => {
    const perfilUpper = String(currentUser?.perfil || '').trim().toUpperCase();
    const cargoUpper = String(currentUser?.cargo || '').trim().toUpperCase();
    const allowed = ['COORDENADOR', 'GERENTE', 'ADMINISTRADOR', 'ADMIN'];
    return (
      allowed.includes(perfilUpper) ||
      allowed.includes(cargoUpper) ||
      currentUser?.isAdmin === true
    );
  }, [currentUser]);

  useEffect(() => {
    if (employee) {
      setFormData({ ...employee });
      setShowPassword(false);
      setShowDeleteConfirm(false);
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMaskedChange = (e, maskFunc) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: maskFunc(value) }));
  };

  const maskCPF = (val) => {
    let v = val.replace(/\D/g, '');
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return v;
  };

  const maskPhone = (val) => {
    let v = val.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 2) return v;
    if (v.length <= 7) return `${v.slice(0, 2)}-${v.slice(2)}`;
    return `${v.slice(0, 2)}-${v.slice(2, 7)}-${v.slice(7)}`;
  };

  const maskDate = (val) => {
    let v = val.replace(/\D/g, '').slice(0, 8);
    if (v.length >= 5) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    } else if (v.length >= 3) {
      return `${v.slice(0, 2)}/${v.slice(2)}`;
    }
    return v;
  };

  const handleShowPassword = () => {
    if (!showPassword) {
      logAudit({
        tipo_acao: 'VISUALIZAR_SENHA',
        detalhes: `Visualizou a senha E-order de ${employee.nome} (${employee.matricula})`
      });
    }
    setShowPassword(!showPassword);
  };



  const handleSave = () => {
    if (!canEditDirectly) {
      alert('Apenas Coordenadores, Gerentes e Administradores podem salvar edições de colaboradores.');
      return;
    }
    // Generate audit log for changes
    const changes = [];
    Object.keys(formData).forEach(key => {
      if (formData[key] !== employee[key]) {
        changes.push(`${key}: de '${employee[key] || ''}' para '${formData[key] || ''}'`);
      }
    });

    if (changes.length > 0) {
      logAudit({
        tipo_acao: 'EDITAR_COLABORADOR',
        detalhes: `Editou perfil de ${employee.nome} (${employee.matricula}). Alterações: ${changes.join(', ')}`
      });
    }

    onSave(formData);
    onClose();
  };

  const inputClasses = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium placeholder:text-slate-400";
  const selectClasses = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium cursor-pointer";
  const labelClasses = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header Premium - Light Theme adapted */}
        <div className="relative bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-black shadow-sm border border-indigo-100 dark:border-indigo-800">
              {getInitials(employee.nome)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{employee.nome || 'Sem Nome'}</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold">
                  MAT: {employee.matricula || '---'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${
                  String(employee.status_forca).toUpperCase().includes('ATIVO') 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' 
                    : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'
                }`}>
                  {employee.status_forca || 'Status Desconhecido'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 rounded-full transition-all border border-slate-200 dark:border-slate-700 shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar bg-slate-50/50 dark:bg-transparent">
          
          {/* Dados Pessoais */}
          <section className="bg-white dark:bg-slate-800/20 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/30 relative shadow-sm">
            <div className="absolute -top-3 left-4 bg-white dark:bg-slate-900 px-2 flex items-center gap-2 text-indigo-500 font-black text-[10px] tracking-widest uppercase">
              <User size={12} /> Dados Pessoais
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
              <div className="md:col-span-2">
                <label className={labelClasses}>Nome Completo</label>
                <input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>CPF</label>
                <input type="text" name="cpf" value={formData.cpf || ''} onChange={(e) => handleMaskedChange(e, maskCPF)} className={inputClasses} placeholder="000.000.000-00" />
              </div>
              <div>
                <label className={labelClasses}>Data Admissão</label>
                <div className="relative">
                  <input type="text" name="dt_admissao" value={formData.dt_admissao || ''} onChange={(e) => handleMaskedChange(e, maskDate)} className={`${inputClasses} pl-9`} placeholder="DD/MM/AAAA" />
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <label className={labelClasses}>CNH</label>
                <input type="text" name="cnh" value={formData.cnh || ''} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Telefone</label>
                <div className="relative">
                  <input type="text" name="telefone" value={formData.telefone || ''} onChange={(e) => handleMaskedChange(e, maskPhone)} className={`${inputClasses} pl-9`} placeholder="11-90000-0000" />
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </section>

          {/* Dados Operacionais */}
          <section className="bg-white dark:bg-slate-800/20 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/30 relative shadow-sm">
            <div className="absolute -top-3 left-4 bg-white dark:bg-slate-900 px-2 flex items-center gap-2 text-emerald-500 font-black text-[10px] tracking-widest uppercase">
              <Briefcase size={12} /> Operacional
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
              <div className="md:col-span-2">
                <label className={labelClasses}>Função</label>
                <input type="text" name="funcao" value={formData.funcao || ''} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Cód Equipe</label>
                <input type="text" name="cod_equipe" value={formData.cod_equipe || ''} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Equipe Atual</label>
                <input type="text" name="equipe" value={formData.equipe || ''} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Turno</label>
                <select name="turno" value={formData.turno || ''} onChange={handleChange} className={selectClasses}>
                  <option value="">Selecione...</option>
                  <option value="1 - MANHÃ">1 - MANHÃ</option>
                  <option value="2 - TARDE">2 - TARDE</option>
                  <option value="3 - NOITE">3 - NOITE</option>
                  <option value="SEM TURNO">SEM TURNO</option>
                </select>
              </div>
              <div>
                <label className={labelClasses}>Horário</label>
                <input type="text" name="horario" value={formData.horario || ''} onChange={handleChange} className={inputClasses} placeholder="Ex: 06:00 as 15:48" />
              </div>
              <div>
                <label className={labelClasses}>Área de Atuação</label>
                <select name="area_atuacao" value={String(formData.area_atuacao || '').toUpperCase()} onChange={handleChange} className={selectClasses}>
                  <option value="">Selecione...</option>
                  <option value="FAGUNDES FILHO">Fagundes Filho</option>
                  <option value="CAJATI">Cajati</option>
                  <option value="VILA MEDEIROS">Vila Medeiros</option>
                  <option value="MONTE SANTO">Monte Santo</option>
                  <option value="ARICANDUVA">Aricanduva</option>
                  <option value="CATUMBI">Catumbi</option>
                  <option value="SANTO ANDRE">Santo Andre</option>
                  <option value="SUL">Sul</option>
                  <option value="APOIO LV">APOIO LV</option>
                  <option value="APOIO TMA">APOIO TMA</option>
                  <option value="QUALIDADE">QUALIDADE</option>
                  <option value="RECOLHA PODA">RECOLHA PODA</option>
                  <option value="SEM BASE">SEM BASE</option>
                </select>
              </div>
              <div>
                <label className={labelClasses}>Base UT</label>
                <select name="base_ut" value={formData.base_ut || ''} onChange={handleChange} className={selectClasses}>
                  <option value="">Selecione...</option>
                  <option value="Base Norte">Base Norte</option>
                  <option value="Base Leste">Base Leste</option>
                  <option value="Base Sul">Base Sul</option>
                </select>
              </div>
              <div>
                <label className={labelClasses}>Subgrupo</label>
                <select name="subgrupo" value={String(formData.subgrupo || '').toUpperCase()} onChange={handleChange} className={selectClasses}>
                  <option value="">Selecione...</option>
                  <option value="TMA">TMA</option>
                  <option value="LINHA VIVA">Linha Viva</option>
                  <option value="LINHA MORTA">Linha Morta</option>
                  <option value="SOC">SOC</option>
                </select>
              </div>
              <div>
                <label className={labelClasses}>Commessa</label>
                <input type="text" name="commessa" value={formData.commessa || ''} onChange={handleChange} className={inputClasses} />
              </div>
            </div>
          </section>

          {/* Gestão & Sistemas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-slate-800/20 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/30 relative shadow-sm">
              <div className="absolute -top-3 left-4 bg-white dark:bg-slate-900 px-2 flex items-center gap-2 text-rose-500 font-black text-[10px] tracking-widest uppercase">
                <AlertCircle size={12} /> Gestão e Ponto
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className={labelClasses}>Status Força</label>
                  <input type="text" name="status_forca" value={formData.status_forca || ''} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Grupo Folga</label>
                  <input type="text" name="grupo_folga" value={formData.grupo_folga || ''} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Status Falta</label>
                  <input type="text" name="status_falta" value={formData.status_falta || ''} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Qtd Faltas Atual</label>
                  <input type="number" name="qtd_faltas_atual" value={formData.qtd_faltas_atual || ''} onChange={handleChange} className={inputClasses} />
                </div>
                <div className="col-span-2">
                  <label className={labelClasses}>Ação a ser Feita</label>
                  <input type="text" name="acao_a_ser_feita" value={formData.acao_a_ser_feita || ''} onChange={handleChange} className={inputClasses} />
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800/20 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/30 relative shadow-sm">
              <div className="absolute -top-3 left-4 bg-white dark:bg-slate-900 px-2 flex items-center gap-2 text-amber-500 font-black text-[10px] tracking-widest uppercase">
                <Key size={12} /> Sistemas (E-order)
              </div>
              <div className="grid grid-cols-1 gap-4 mt-2">
                <div>
                  <label className={labelClasses}>BR0</label>
                  <input type="text" name="br0" value={formData.br0 || ''} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Login E-order</label>
                  <input type="text" name="login_eorder" value={formData.login_eorder || ''} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Senha E-order</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="senha_eorder" 
                      value={formData.senha_eorder || ''} 
                      onChange={handleChange} 
                      className={`${inputClasses} pr-10`} 
                    />
                    <button 
                      type="button"
                      onClick={handleShowPassword}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                      title={showPassword ? "Ocultar senha" : "Ver senha (será registrado no log)"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Chave Primária</label>
                  <input type="text" name="chave_primaria" value={formData.chave_primaria || ''} onChange={handleChange} className={inputClasses} />
                </div>
              </div>
            </section>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-900 p-5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-3 shrink-0">
          <div>
            {canEditDirectly && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center gap-2 text-sm"
              >
                <X size={16} /> Excluir
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Fechar
            </button>
            {canEditDirectly && (
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                <Save size={18} />
                Salvar Alterações
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Customizado de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-slate-400 font-medium">Ação irreversível de cadastro</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-900 dark:text-rose-200 leading-relaxed">
              Tem certeza que deseja EXCLUIR o cadastro de <strong>{employee.nome}</strong>? Essa ação não pode ser desfeita.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(employee);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
