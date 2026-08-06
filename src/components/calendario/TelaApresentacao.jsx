import React, { useState, useEffect, useRef } from 'react';
import { Users, AlertTriangle, Square, CheckCircle, Clock, Maximize, Minimize, X, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../supabaseClient';

export default function TelaApresentacao({ atividade, catConfig, onEncerrar, onClose }) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isNegative, setIsNegative] = useState(false);
  const [presencas, setPresencas] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef(null);

  const getStartTime = () => {
    if (!atividade.hora_inicio_execucao) return new Date();
    const [h, m, s] = atividade.hora_inicio_execucao.split(':');
    const start = new Date();
    start.setHours(parseInt(h, 10));
    start.setMinutes(parseInt(m, 10));
    start.setSeconds(parseInt(s || 0, 10));
    if (start.getTime() > Date.now() + 60000) start.setDate(start.getDate() - 1);
    return start;
  };
  
  const [startTime] = useState(getStartTime());
  const cfg = catConfig[atividade.tipo] || { duration: '15 min' };

  useEffect(() => {
    let dur = 15 * 60;
    if (cfg.duration.includes('min')) dur = parseInt(cfg.duration) * 60;
    else if (cfg.duration.includes('hora')) dur = parseInt(cfg.duration) * 3600;
    
    const tick = () => setTimeRemaining(dur - Math.floor((Date.now() - startTime.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cfg.duration, startTime]);

  useEffect(() => { setIsNegative(timeRemaining < 0); }, [timeRemaining]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('calendario_presencas').select('*')
        .eq('atividade_id', atividade.id).order('data_hora', { ascending: false });
      if (data) setPresencas(data);
    };
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [atividade.id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const el = modalRef.current?.parentElement || document.documentElement;
      el.requestFullscreen().catch(err => {
        console.log(`Erro ao tentar modo tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (seconds) => {
    const isNeg = seconds < 0;
    const absSecs = Math.abs(seconds);
    const m = Math.floor(absSecs / 60).toString().padStart(2, '0');
    const s = (absSecs % 60).toString().padStart(2, '0');
    return `${isNeg ? '-' : ''}${m}:${s}`;
  };

  // State colors based on user's HTML template
  let currentStateColor = '#146c43'; // Normal
  let currentBgOverlay = 'rgba(255, 255, 255, 0.7)';
  let alertText = '';
  let alertVisible = false;
  let statusText = 'EM CURSO';
  let isExpired = false;

  if (timeRemaining > 120) {
    currentStateColor = '#146c43';
    currentBgOverlay = 'rgba(255, 255, 255, 0.9)';
    alertVisible = false;
  } else if (timeRemaining <= 120 && timeRemaining > 60) {
    currentStateColor = '#ffb300';
    currentBgOverlay = 'rgba(255, 213, 79, 0.15)';
    alertText = 'Faltam 2 minutos';
    alertVisible = true;
  } else if (timeRemaining <= 60 && timeRemaining > 30) {
    currentStateColor = '#f57c00';
    currentBgOverlay = 'rgba(255, 152, 0, 0.2)';
    alertText = 'Falta 1 minuto';
    alertVisible = true;
  } else if (timeRemaining <= 30 && timeRemaining > 0) {
    currentStateColor = '#d32f2f';
    currentBgOverlay = 'rgba(244, 67, 54, 0.25)';
    alertText = 'Encerramento iminente!';
    alertVisible = true;
  } else if (timeRemaining <= 0) {
    currentStateColor = '#b71c1c';
    currentBgOverlay = 'rgba(211, 47, 47, 0.15)';
    alertText = `Tempo planejado (${cfg.duration}) excedido.`;
    statusText = 'TEMPO EXCEDIDO';
    alertVisible = true;
    isExpired = true;
  }

  const checkinUrl = `${window.location.origin}/?checkin=${atividade.id}`;
  const handleEncerrar = () => onEncerrar(startTime, new Date());

  return (
    <>
      <style>{`
        /* Import Font from user code */
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&display=swap');

        .presentation-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: linear-gradient(135deg, #e0e5ec 0%, #f4f6f8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
        }

        .glass-modal {
          width: 98vw;
          max-width: 1800px;
          height: 92vh;
          background: ${currentBgOverlay};
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 32px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.6s cubic-bezier(0.2, 0, 0, 1);
          position: relative;
        }

        .glass-modal.is-fullscreen {
          width: 100vw;
          max-width: 100vw;
          height: 100vh;
          border-radius: 0;
          border: none;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          background: rgba(255, 255, 255, 0.5);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .header-title h1 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1A1C1C;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
        }

        .header-title p {
          font-size: 0.9rem;
          color: #555;
          font-weight: 600;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .badge-status {
          background: ${currentStateColor};
          color: white;
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.5s ease;
        }

        .icon-btn {
          background: rgba(255, 255, 255, 0.8);
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #1A1C1C;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .icon-btn:hover {
          background: #ffffff;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .modal-body {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1.2fr;
          flex: 1;
          overflow: hidden;
        }

        .grid-column {
          padding: 24px;
          display: flex;
          flex-direction: column;
          position: relative;
          min-width: 0;
          overflow: hidden;
        }

        .grid-column:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 10%;
          height: 80%;
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.08), transparent);
        }

        .timer-col {
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        .timer-label {
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: ${currentStateColor};
          margin-bottom: -10px;
          transition: color 0.5s ease;
        }

        .timer-display {
          font-size: clamp(3.5rem, 5vw, 7rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -4px;
          color: ${currentStateColor};
          text-shadow: 0 10px 20px rgba(0,0,0,0.1);
          margin-bottom: 24px;
          overflow: hidden;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          transition: color 0.5s ease;
        }

        .alert-box {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid ${currentStateColor};
          color: ${currentStateColor};
          padding: 12px 24px;
          border-radius: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: ${alertVisible ? 1 : 0};
          transform: translateY(${alertVisible ? 0 : '10px'});
          transition: all 0.3s ease;
        }

        .btn-encerrar {
          margin-top: auto;
          background: ${isExpired ? currentStateColor : 'white'};
          color: ${isExpired ? 'white' : currentStateColor};
          border: none;
          padding: 20px 40px;
          border-radius: 32px;
          font-size: 1.2rem;
          font-weight: 800;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 8px 16px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }

        .btn-encerrar:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
          background: ${isExpired ? '#991b1b' : '#f8f9fa'};
        }

        .qr-col {
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.3);
        }

        .qr-card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 28px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 16px 32px rgba(0,0,0,0.05);
          border: 1px solid rgba(255,255,255,1);
          width: 100%;
          max-width: 360px;
        }

        .qr-icon {
          background: #e3f2fd;
          color: #1976d2;
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
        }

        .qr-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 8px;
          margin-top: 0;
        }

        .qr-card p {
          color: #666;
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .qr-image-placeholder {
          width: 100%;
          aspect-ratio: 1;
          background: white;
          border-radius: 16px;
          padding: 16px;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .attendance-col {
          background: rgba(255,255,255,0.4);
          overflow-y: auto !important;
        }

        .attendance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .attendance-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 1rem;
          color: #1a1a1a;
        }

        .attendance-count {
          background: #3f51b5;
          color: white;
          padding: 4px 14px;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 900;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #888;
          text-align: center;
        }

        .empty-state svg {
          opacity: 0.3;
          margin-bottom: 16px;
        }

        .presenca-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 8px;
        }

        .presenca-list::-webkit-scrollbar { width: 6px; }
        .presenca-list::-webkit-scrollbar-track { background: transparent; }
        .presenca-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }

        .presenca-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.8);
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }

        .presenca-num {
          width: 28px; height: 28px; border-radius: 50%;
          background: #e3f2fd; color: #1976d2;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 11px;
          flex-shrink: 0;
        }

        @keyframes pulse-critical {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes bg-pulse-expired {
          0% { background: rgba(211, 47, 47, 0.15); }
          50% { background: rgba(211, 47, 47, 0.3); }
          100% { background: rgba(211, 47, 47, 0.15); }
        }

        .state-expired {
          animation: bg-pulse-expired 2s infinite;
        }
        
        .state-expired .timer-display {
          animation: pulse-critical 1s infinite;
        }

      `}</style>

      <div className="presentation-overlay">
        <div 
          ref={modalRef} 
          className={`glass-modal ${isFullscreen ? 'is-fullscreen' : ''} ${isExpired ? 'state-expired' : ''}`}
        >
          
          {/* HEADER */}
          <div className="modal-header">
            <div className="header-title">
              <h1>{atividade.assunto}</h1>
              <p>Duração planejada: {cfg.duration} • {atividade.tipo}</p>
            </div>
            <div className="header-actions">
              <div className="badge-status">
                <Clock size={18} />
                <span>{statusText}</span>
              </div>
              <button className="icon-btn" onClick={toggleFullscreen} title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}>
                {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
              </button>
              {/* Note: O botão fechar não existia com função nas versões anteriores de tela de apresentação, 
                  pois o evento deve ser encerrado. Mas se for necessário apenas sair sem encerrar, pode chamar onClose() se quiser.
                  Aqui deixaremos sem função igual o modelo HTML anterior, ou com onClose, se houver suporte. */}
              {onClose && (
                <button className="icon-btn" onClick={onClose} title="Sair da apresentação">
                  <X size={22} />
                </button>
              )}
            </div>
          </div>

          {/* CORPO */}
          <div className="modal-body">
            
            {/* Coluna 1: Temporizador */}
            <div className="grid-column timer-col">
              <div className="timer-label">
                {isExpired ? 'TEMPO ESTOURADO' : 'Tempo Restante'}
              </div>
              <div className="timer-display">
                {formatTime(timeRemaining)}
              </div>
              
              <div className="alert-box">
                <AlertTriangle size={20} />
                <span>{alertText}</span>
              </div>

              <button className="btn-encerrar" onClick={handleEncerrar}>
                <Square size={20} fill="currentColor"/>
                Encerrar Evento
              </button>
            </div>

            {/* Coluna 2: QR Code */}
            <div className="grid-column qr-col">
              <div className="qr-card">
                <div className="qr-icon">
                  <QrCode size={32} />
                </div>
                <h2>Check-in Digital</h2>
                <p>Aponte a câmera do celular para confirmar presença.</p>
                <div className="qr-image-placeholder">
                  <QRCodeSVG
                    value={checkinUrl}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin={false}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#aaa', marginTop: '12px', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{checkinUrl}</p>
              </div>
            </div>

            {/* Coluna 3: Presenças */}
            <div className="grid-column attendance-col">
              <div className="attendance-header">
                <div className="attendance-title">
                  <Users size={18} color="#1a1a1a" />
                  Presenças
                </div>
                <div className="attendance-count">{presencas.length}</div>
              </div>
              
              {presencas.length === 0 ? (
                <div className="empty-state">
                  <Clock size={48} />
                  <h3>Aguardando Equipe</h3>
                  <p style={{ fontSize: '0.9rem', marginTop: '8px', opacity: 0.8 }}>Nenhum check-in realizado até o momento.</p>
                </div>
              ) : (
                <div className="presenca-list">
                  {presencas.map((p, idx) => (
                    <div key={p.id} className="presenca-item">
                      <div className="presenca-num">{idx + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#1a1a1a', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.nome_completo}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#1976d2', background: '#e3f2fd', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                            {p.codigo_equipe}
                          </span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#888' }}>
                            {p.matricula_br0}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#146c43', background: '#d1e7dd', padding: '3px 6px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        <CheckCircle size={10} />
                        {new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
