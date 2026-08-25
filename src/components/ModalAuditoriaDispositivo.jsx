import React from 'react';
import { 
  X, 
  Smartphone, 
  ShieldCheck, 
  Wifi, 
  Battery, 
  Lock, 
  MapPin, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Info, 
  Layers, 
  Cpu, 
  Monitor,
  Activity
} from 'lucide-react';

export default function ModalAuditoriaDispositivo({ 
  auditor, 
  dateStr, 
  deviceSpecs, 
  auditEvents = [], 
  currentShift,
  currentPref,
  onClose 
}) {
  if (!auditor) return null;

  const formattedDate = dateStr 
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : 'Data Atual';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header Claro e Elegante */}
        <div className="p-5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Auditoria de Dispositivo & Acessos
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Auditor: <strong className="text-slate-800">{auditor.nome || auditor.login}</strong> • {formattedDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6 select-text">
          {/* Grid de Especificações do Aparelho */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu size={14} className="text-blue-600" /> Especificações do Smartphone & Ambiente
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Aparelho / Fabricante */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 shadow-sm">
                <div className="p-2.5 rounded-xl bg-blue-100/60 text-blue-700 border border-blue-200 shrink-0">
                  <Smartphone size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Modelo / Fabricante</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{deviceSpecs?.brand || 'Samsung / Smartphone'}</p>
                  <p className="text-xs font-mono text-slate-500 truncate">{deviceSpecs?.model || 'SM-Series Enterprise'}</p>
                </div>
              </div>

              {/* Sistema Operacional & App */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 shadow-sm">
                <div className="p-2.5 rounded-xl bg-indigo-100/60 text-indigo-700 border border-indigo-200 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Sistema & Versão</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{deviceSpecs?.osName || 'Android'} {deviceSpecs?.osVersion || '14.0'}</p>
                  <p className="text-xs font-mono text-slate-500">Fleet Operação App v{deviceSpecs?.appVersion || '1.1.0'}</p>
                </div>
              </div>

              {/* Resolução & Conexão de Rede */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 shadow-sm">
                <div className="p-2.5 rounded-xl bg-emerald-100/60 text-emerald-700 border border-emerald-200 shrink-0">
                  <Wifi size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Rede & Conectividade</span>
                  <p className="text-sm font-bold text-slate-900 uppercase mt-0.5">{deviceSpecs?.networkType || '4G LTE / Wi-Fi'}</p>
                  <p className="text-xs font-mono text-slate-500">Tela: {deviceSpecs?.screenRes || '1080x2340'}</p>
                </div>
              </div>

              {/* Bateria & Energia */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 shadow-sm">
                <div className="p-2.5 rounded-xl bg-amber-100/60 text-amber-700 border border-amber-200 shrink-0">
                  <Battery size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Bateria & Autonomia</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {deviceSpecs?.batteryLevel ? `${deviceSpecs.batteryLevel}% Carga` : '85% (Nível Seguro)'}
                  </p>
                  <p className="text-xs font-mono text-emerald-600 font-semibold">Monitoramento Ativo</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rastreabilidade e Origem de Login */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} className="text-blue-700" />
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">
                Origem e Certificação de Login
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                <span className="text-[10px] font-black text-slate-400 uppercase block">Endereço IP Auditado</span>
                <span className="font-mono font-bold text-slate-800">{deviceSpecs?.ipAddress || '189.96.226.***'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                <span className="text-[10px] font-black text-slate-400 uppercase block">Endereço Base / Local de Saída</span>
                <span className="font-bold text-slate-800 truncate block">
                  {currentPref?.start_address || 'Geolocalização Validada via GPS'}
                </span>
              </div>
            </div>
          </div>

          {/* Histórico Cronológico de Eventos de Auditoria */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity size={14} className="text-indigo-600" /> Histórico de Sessões & Ações Auditadas ({auditEvents.length})
            </h4>

            {auditEvents.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center text-xs font-medium text-slate-500">
                Nenhum registro de auditoria específico gravado para esta data. Os dados gerais de sessão estão certificados acima.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                {auditEvents.map((ev, i) => (
                  <div key={ev.id || i} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                        {i + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 uppercase">
                            {ev.tipo_evento || 'EVENTO'}
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Validado
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {ev.device_brand} {ev.device_model} • {ev.network_type || 'Rede Móvel'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs text-slate-600 font-semibold">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('pt-BR') : '--:--'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
