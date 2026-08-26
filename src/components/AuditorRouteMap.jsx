import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  MapPin, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Utensils, 
  Car, 
  Zap, 
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

// Fix dos ícones padrão do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícones Customizados em SVG / DivIcon para o Mapa Claro
const createCustomMarker = (color, text, iconEmoji = '') => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background: ${color};
        color: white;
        border: 2.5px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        border-radius: 9999px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 11px;
        font-family: sans-serif;
      ">
        ${iconEmoji || text}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

// Componente para auto-ajuste de zoom nos limites dos pontos (FitBounds) e InvalidateSize
function MapController({ bounds, center }) {
  const map = useMap();
  useEffect(() => {
    // Forçar recálculo das dimensões do Leaflet
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (center) {
      map.setView(center, 13);
    }
    return () => clearTimeout(timer);
  }, [map, bounds, center]);
  return null;
}

// Extrator universal de coordenadas
function extractCoords(rawItem) {
  if (!rawItem) return null;
  if (typeof rawItem.lat === 'number' && typeof rawItem.lng === 'number' && rawItem.lat !== 0) {
    return { lat: rawItem.lat, lng: rawItem.lng };
  }
  if (typeof rawItem.latitude === 'number' && typeof rawItem.longitude === 'number' && rawItem.latitude !== 0) {
    return { lat: rawItem.latitude, lng: rawItem.longitude };
  }

  // Tentar parsear de strings com URL do Google Maps
  const str = rawItem.endereco_completo || rawItem.endereco || rawItem.link || '';
  if (typeof str === 'string' && (str.includes('maps/dir/') || str.includes('google.com.br/maps') || str.includes('google.com/maps'))) {
    const matches = [...str.matchAll(/(-?\d+\.\d+)/g)].map(m => parseFloat(m[0]));
    if (matches.length >= 4) {
      return { lat: matches[matches.length - 2], lng: matches[matches.length - 1] };
    } else if (matches.length >= 2) {
      return { lat: matches[0], lng: matches[1] };
    }
  }

  // Fallback para coordenadas em texto {-23.43055 -46.59377}
  if (typeof str === 'string') {
    const rawMatch = str.match(/(-?\d+\.\d+)\s+(-?\d+\.\d+)/);
    if (rawMatch) {
      return { lat: parseFloat(rawMatch[1]), lng: parseFloat(rawMatch[2]) };
    }
  }

  return null;
}

export default function AuditorRouteMap({
  auditor,
  dateStr,
  shift,
  gpsLogs = [],
  tasks = [],
  height = '420px'
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const animationRef = useRef(null);

  // 1. Processar e unificar todos os pontos do trajeto
  const { routePoints, keyMilestones } = useMemo(() => {
    const points = [];
    const milestones = [];

    // 1.1 Início de Turno (Ponto de Partida)
    if (shift?.gps_lat && shift?.gps_lng) {
      const p = { lat: shift.gps_lat, lng: shift.gps_lng, label: 'Início de Turno', type: 'start', time: shift.start_time };
      points.push(p);
      milestones.push(p);
    }

    // 1.2 GPS Breadcrumbs (Pings Contínuos)
    if (Array.isArray(gpsLogs) && gpsLogs.length > 0) {
      gpsLogs.forEach((log, idx) => {
        if (log.lat && log.lng) {
          points.push({
            lat: log.lat,
            lng: log.lng,
            time: log.created_at || log.timestamp,
            accuracy: log.accuracy,
            speed: log.speed,
            type: 'breadcrumb',
            label: `Ping #${idx + 1}`
          });
        }
      });
    }

    // 1.3 Atividades / OSs Realizadas
    if (Array.isArray(tasks) && tasks.length > 0) {
      tasks.forEach((t, i) => {
        const coords = extractCoords(t);
        if (coords) {
          const isSusp = t.status === 'suspended' || t.status === 'suspensa';
          const isComp = t.status === 'completed' || t.status === 'concluido';
          const p = {
            ...coords,
            type: isSusp ? 'suspended_task' : isComp ? 'completed_task' : 'task',
            label: `OS ${t.osid || t.id_origem || i + 1}`,
            time: t.start_time || t.assigned_date,
            taskData: t
          };
          points.push(p);
          milestones.push(p);
        }
      });
    }

    // 1.4 Refeição (se houver parada registrada)
    if (shift?.meal_start) {
      const midPoint = points.length > 1 ? points[Math.floor(points.length / 2)] : null;
      if (midPoint) {
        milestones.push({
          lat: midPoint.lat,
          lng: midPoint.lng,
          type: 'meal',
          label: 'Pausa Refeição',
          time: shift.meal_start,
          endTime: shift.meal_end
        });
      }
    }

    // 1.5 Fim de Turno
    if (shift?.end_time && points.length > 0) {
      const last = points[points.length - 1];
      milestones.push({
        lat: last.lat,
        lng: last.lng,
        type: 'end',
        label: 'Encerramento de Turno',
        time: shift.end_time
      });
    }

    return { routePoints: points, keyMilestones: milestones };
  }, [shift, gpsLogs, tasks]);

  // Coordenadas formatadas para a Polyline do Leaflet
  const polylineCoords = useMemo(() => {
    return routePoints.map(p => [p.lat, p.lng]);
  }, [routePoints]);

  // Ponto central padrão caso não existam coordenadas
  const defaultCenter = useMemo(() => {
    if (polylineCoords.length > 0) {
      return polylineCoords[0];
    }
    return [-23.55052, -46.633308]; // São Paulo Centro
  }, [polylineCoords]);

  // Distância total estimada em KM
  const totalDistanceKm = useMemo(() => {
    if (polylineCoords.length < 2) return 0;
    let distMeters = 0;
    for (let i = 0; i < polylineCoords.length - 1; i++) {
      const p1 = L.latLng(polylineCoords[i][0], polylineCoords[i][1]);
      const p2 = L.latLng(polylineCoords[i + 1][0], polylineCoords[i + 1][1]);
      distMeters += p1.distanceTo(p2);
    }
    return (distMeters / 1000).toFixed(1);
  }, [polylineCoords]);

  // Controle de Playback da Rota
  useEffect(() => {
    if (isPlaying && polylineCoords.length > 1) {
      animationRef.current = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev >= polylineCoords.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 500);
    } else {
      if (animationRef.current) clearInterval(animationRef.current);
    }
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [isPlaying, polylineCoords]);

    const isDarkMode = typeof document !== 'undefined' && (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || document.querySelector('.dark') !== null);

    return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col select-text">
      {/* Header do Mapa */}
      <div className="p-4 bg-slate-50/90 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
            <Navigation size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
              Trajeto Percorrido pelo Auditor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Rastreamento contínuo e geolocalização dos atendimentos de campo
            </p>
          </div>
        </div>

        {/* Badges de Telemetria */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-xs">
            Distância: <strong className="text-blue-600 dark:text-blue-400 font-mono">{totalDistanceKm} km</strong>
          </span>
          <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-xs">
            Pontos Registrados: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{routePoints.length}</strong>
          </span>
          {shift?.placa_veiculo && (
            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 rounded-xl font-mono shadow-xs">
              Veículo: {shift.placa_veiculo}
            </span>
          )}
        </div>
      </div>

      {/* Container do Mapa Leaflet */}
      <div className="relative w-full" style={{ height: height, minHeight: '380px' }}>
        {polylineCoords.length === 0 ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 p-6 text-center">
            <MapPin size={40} className="text-slate-300 dark:text-slate-700 mb-2 animate-bounce" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum trajeto de GPS registrado para esta data.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md">
              O auditor não registrou início de turno ou realizou atendimentos sem envio de coordenadas no dia selecionado.
            </p>
          </div>
        ) : null}

        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', minHeight: '380px' }}
        >
          {/* Tiles Dinâmicos (Dark Matter no modo escuro / Voyager no modo claro) */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url={isDarkMode 
              ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            }
          />

          <MapController 
            bounds={polylineCoords.length > 0 ? polylineCoords : null} 
            center={defaultCenter} 
          />

          {/* Polilinha do Trajeto Contínuo */}
          {polylineCoords.length > 1 && (
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: isDarkMode ? '#38bdf8' : '#2563eb',
                weight: 4,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: '1, 6'
              }}
            />
          )}

          {/* Marcadores Principais (Milestones) */}
          {keyMilestones.map((m, idx) => {
            let pinColor = '#2563eb';
            let emoji = '';
            if (m.type === 'start') {
              pinColor = '#10b981';
              emoji = '🏁';
            } else if (m.type === 'end') {
              pinColor = '#475569';
              emoji = '🛑';
            } else if (m.type === 'meal') {
              pinColor = '#f59e0b';
              emoji = '🍽️';
            } else if (m.type === 'suspended_task') {
              pinColor = '#e11d48';
              emoji = '🔴';
            } else {
              pinColor = '#3b82f6';
              emoji = `${idx + 1}`;
            }

            return (
              <Marker
                key={idx}
                position={[m.lat, m.lng]}
                icon={createCustomMarker(pinColor, idx + 1, emoji)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 font-sans select-text">
                    <h4 className="font-bold text-xs text-slate-900 border-b border-slate-200 pb-1 mb-1">
                      {m.label}
                    </h4>
                    {m.time && (
                      <p className="text-[11px] font-mono text-slate-600 mb-1">
                        Horário: <strong>{new Date(m.time).toLocaleTimeString('pt-BR')}</strong>
                      </p>
                    )}
                    {m.taskData && (
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <p>Endereço: {m.taskData.endereco_completo || 'N/A'}</p>
                        <p>Status: <strong className="uppercase">{m.taskData.status}</strong></p>
                        {m.taskData.suspend_reason && (
                          <p className="text-rose-600 font-bold">Motivo: {m.taskData.suspend_reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Marcador do Playback em Execução */}
          {isPlaying && activePlaybackPoint && (
            <Marker
              position={activePlaybackPoint}
              icon={createCustomMarker('#8b5cf6', '🚗', '🚗')}
            />
          )}
        </MapContainer>

        {/* Barra Flutuante de Controles de Playback */}
        {polylineCoords.length > 1 && (
          <div className="absolute bottom-4 left-4 right-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm ${
                  isPlaying 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                {isPlaying ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Reproduzir Trajeto</>}
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackIndex(0);
                }}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
                title="Reiniciar Percurso"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            <div className="flex-1 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={Math.max(0, polylineCoords.length - 1)}
                value={playbackIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setPlaybackIndex(Number(e.target.value));
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
                Ponto {playbackIndex + 1}/{polylineCoords.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legenda de Ícones do Mapa */}
      <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs"></span>
          <span>Início de Turno</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow-xs"></span>
          <span>OS Concluída</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-xs"></span>
          <span>OS Suspensa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-xs"></span>
          <span>Pausa Refeição</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-600 inline-block shadow-xs"></span>
          <span>Fim de Turno</span>
        </div>
      </div>
    </div>
  );
}
