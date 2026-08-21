import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
  LayersControl,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { Navigation, Route, Eye, EyeOff, Users, Layers, CheckSquare, Square } from 'lucide-react';

// Fix for default leaflet icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
});

const redIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const homeIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const carIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center w-8 h-8 bg-emerald-500 rounded-full border-2 border-white shadow-lg text-white transform transition-transform hover:scale-110 active:scale-95 animate-bounce">
      <span class="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
      <span class="text-xs">🚗</span>
    </div>
  `,
  className: 'custom-car-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Helper to extract coordinates from standard and Google Maps fields
const extractCoords = (fa) => {
  if (!fa) return null;
  if (fa.os_data?.latitude && fa.os_data?.longitude) {
    return {
      lat: parseFloat(fa.os_data.latitude),
      lng: parseFloat(fa.os_data.longitude),
    };
  }
  if (fa.latitude && fa.longitude) {
    return { lat: parseFloat(fa.latitude), lng: parseFloat(fa.longitude) };
  }
  if (fa.payload_dados?.latitude && fa.payload_dados?.longitude) {
    return {
      lat: parseFloat(fa.payload_dados.latitude),
      lng: parseFloat(fa.payload_dados.longitude),
    };
  }
  return null;
};

// Custom HTML DivIcon to render sequential sequence labels (A, B, C, etc.)
const createRouteIcon = (label, color) => {
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-md text-white font-black text-[11px] transform transition-transform hover:scale-110 active:scale-95" style="background-color: ${color};">${label}</div>`,
    className: 'custom-route-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

// MapController component to automatically pan and zoom Leaflet map to bounds of visible points
function MapController({ points, dateStr, selectedBucketName }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);
  const lastFilterRef = useRef('');

  useEffect(() => {
    const key = `${dateStr}_${selectedBucketName || ''}`;
    if (lastFilterRef.current !== key) {
      lastFilterRef.current = key;
      hasCenteredRef.current = false;
    }
  }, [dateStr, selectedBucketName]);

  useEffect(() => {
    if (!hasCenteredRef.current && points && points.length > 0 && map) {
      const runFit = () => {
        try {
          const bounds = L.latLngBounds(points);
          if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            hasCenteredRef.current = true;
          }
        } catch (err) {
          console.warn('[MapController] fitBounds warning:', err);
        }
      };
      if (typeof map.whenReady === 'function') {
        map.whenReady(runFit);
      } else {
        runFit();
      }
    }
  }, [points, map]);

  return null;
}

export default function WFMMapView({
  fieldAudits = [],
  auditors = [],
  dateStr,
  prefs = [],
  unallocatedOs = [],
  onAssignAudit,
  selectedBucketName = '',
  shifts = [],
  escalas = [],
}) {
  const center = [-23.5505, -46.6333];
  const [telemetryLogs, setTelemetryLogs] = useState([]);
  const [showGpsBreadcrumbs, setShowGpsBreadcrumbs] = useState(false);
  const [selectedAuditorLogins, setSelectedAuditorLogins] = useState(null);
  const [showInspectorLayerBox, setShowInspectorLayerBox] = useState(false);

  // Initialize selected logins when auditors load
  useEffect(() => {
    if (auditors && auditors.length > 0 && selectedAuditorLogins === null) {
      setSelectedAuditorLogins(new Set(auditors.map(a => a.login)));
    }
  }, [auditors, selectedAuditorLogins]);

  const toggleAuditorLayer = (login) => {
    setSelectedAuditorLogins(prev => {
      const current = prev ? new Set(prev) : new Set(auditors.map(a => a.login));
      if (current.has(login)) current.delete(login);
      else current.add(login);
      return current;
    });
  };

  const selectAllAuditors = () => {
    setSelectedAuditorLogins(new Set(auditors.map(a => a.login)));
  };

  const clearAllAuditors = () => {
    setSelectedAuditorLogins(new Set());
  };

  // Busca o histórico de telemetria GPS gravado pelos auditores para a data selecionada
  useEffect(() => {
    if (!dateStr) return;
    let isMounted = true;

    const fetchGpsLogs = async () => {
      try {
        let allLogs = [];
        let page = 0;
        let hasMore = true;
        while (hasMore && isMounted) {
          const { data, error } = await supabase
            .from('autofiscalizacao_gps_logs')
            .select('*')
            .eq('date', dateStr)
            .order('created_at', { ascending: true })
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (error || !data) break;
          allLogs = allLogs.concat(data);
          if (data.length < 1000) {
            hasMore = false;
          } else {
            page++;
          }
        }

        if (isMounted) {
          setTelemetryLogs(allLogs);
        }
      } catch (err) {
        console.warn('[WFMMapView] Aviso ao buscar telemetria de GPS:', err);
      }
    };

    fetchGpsLogs();
    const interval = setInterval(fetchGpsLogs, 45000); // Atualiza periodicamente a cada 45s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dateStr]);

  // Determine selected auditor to isolate view
  const selectedAuditor = useMemo(() => {
    return auditors.find(
      (a) => a.login === selectedBucketName || a.nome === selectedBucketName
    );
  }, [selectedBucketName, auditors]);

  const auditorsToShow = useMemo(() => {
    return selectedAuditor ? [selectedAuditor] : auditors;
  }, [selectedAuditor, auditors]);

  // Filter auditors who have active shift scale in dateStr
  const availableAuditors = useMemo(() => {
    if (!escalas || escalas.length === 0) return [];
    return auditors.filter((a) =>
      escalas.some(
        (e) =>
          e.auditor &&
          a.login &&
          e.auditor.trim().toLowerCase() === a.login.trim().toLowerCase()
      )
    );
  }, [auditors, escalas]);

  // Gather all active points on the map for auto-bounds calculation
  const allActivePoints = useMemo(() => {
    const pts = [];

    // Add auditor homes
    auditorsToShow.forEach((auditor) => {
      const pref = prefs.find((p) => p.auditor === auditor.login) || {};
      if (pref.start_lat && pref.start_lng) {
        pts.push([pref.start_lat, pref.start_lng]);
      }
    });

    // Add auditor live GPS points
    auditorsToShow.forEach((auditor) => {
      const shift = shifts.find((s) => s.auditor === auditor.login);
      if (shift && shift.gps_lat && shift.gps_lng) {
        pts.push([parseFloat(shift.gps_lat), parseFloat(shift.gps_lng)]);
      }
    });

    // Add telemetry breadcrumbs points
    if (showGpsBreadcrumbs) {
      telemetryLogs.forEach((log) => {
        if (log.lat && log.lng) pts.push([log.lat, log.lng]);
      });
    }

    // Add auditor task points
    auditorsToShow.forEach((auditor) => {
      const myOs = fieldAudits.filter(
        (fa) =>
          fa.auditor === auditor.login &&
          (fa.assigned_date === dateStr || !fa.planned_start)
      );
      myOs.forEach((fa) => {
        const coords = extractCoords(fa);
        if (coords) pts.push([coords.lat, coords.lng]);
      });
    });

    // Add unassigned OS points
    unallocatedOs.forEach((fa) => {
      const coords = extractCoords(fa);
      if (coords) pts.push([coords.lat, coords.lng]);
    });

    return pts;
  }, [auditorsToShow, fieldAudits, unallocatedOs, prefs, dateStr, telemetryLogs, showGpsBreadcrumbs, shifts]);

  const routeColors = [
    '#2563eb',
    '#16a34a',
    '#d97706',
    '#7c3aed',
    '#db2777',
    '#0891b2',
    '#475569',
  ];

  return (
    <div className="w-full h-full flex flex-col relative z-0">
      {/* 🛰️ PAINEL FLUTUANTE ULTRA PREMIUM DE CONTROLE DE ROTA GPS */}
      <div className="absolute top-3 left-12 z-[1000] flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
            <Navigation size={15} />
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Trilha GPS Real</span>
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-mono px-1.5 py-0.2 rounded-md">
                {telemetryLogs.length} pts
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold">
              Coleta contínua de 1-2 min
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => setShowGpsBreadcrumbs(!showGpsBreadcrumbs)}
          className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ${
            showGpsBreadcrumbs
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          {showGpsBreadcrumbs ? <Eye size={13} /> : <EyeOff size={13} />}
          <span>{showGpsBreadcrumbs ? 'Visível' : 'Oculto'}</span>
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => setShowInspectorLayerBox(!showInspectorLayerBox)}
          className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ${
            showInspectorLayerBox
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
          }`}
        >
          <Layers size={13} />
          <span>Camadas por Inspetor ({selectedAuditorLogins ? selectedAuditorLogins.size : auditorsToShow.length})</span>
        </button>

        {/* Dropdown Box of Inspector Checkboxes */}
        {showInspectorLayerBox && (
          <div className="absolute top-12 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 w-64 space-y-2 z-[1100]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1">
                <Users size={13} className="text-blue-500" /> Inspetores
              </span>
              <div className="flex items-center gap-1 text-[9px] font-bold">
                <button onClick={selectAllAuditors} className="text-blue-600 hover:underline uppercase">Todos</button>
                <span className="text-slate-300">•</span>
                <button onClick={clearAllAuditors} className="text-slate-400 hover:underline uppercase">Nenhum</button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {auditorsToShow.map((auditor, idx) => {
                const isChecked = !selectedAuditorLogins || selectedAuditorLogins.has(auditor.login);
                const color = routeColors[idx % routeColors.length];
                const count = telemetryLogs.filter(l => l.auditor === auditor.login || l.auditor?.toLowerCase() === auditor.login?.toLowerCase() || l.auditor === auditor.nome).length;

                return (
                  <div
                    key={auditor.login}
                    onClick={() => toggleAuditorLayer(auditor.login)}
                    className={`flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-colors text-xs ${
                      isChecked ? 'bg-blue-50/60 dark:bg-blue-950/40 text-slate-800 dark:text-slate-100' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                      <span className="font-bold truncate">{auditor.nome || auditor.login}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded shrink-0">
                      {count} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Google Trânsito ao Vivo">
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}"
              attribution="Google Maps"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite com Trânsito">
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=y,traffic&x={x}&y={y}&z={z}"
              attribution="Google Maps"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Mapa Padrão (CARTO)">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite Puro (Esri)">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Esri"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Modo Noturno (Dark)">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapController points={allActivePoints} dateStr={dateStr} selectedBucketName={selectedBucketName} />

        {/* Auditor Homes */}
        {auditorsToShow.map((auditor) => {
          const pref = prefs.find((p) => p.auditor === auditor.login) || {};
          if (!pref.start_lat || !pref.start_lng) return null;
          return (
            <Marker
              key={`home-${auditor.login}`}
              position={[pref.start_lat, pref.start_lng]}
              icon={homeIcon}
            >
              <Popup>
                <div className="p-1 text-xs font-sans">
                  <strong className="text-slate-800">
                    🏠 Ponto de Partida: {auditor.nome || auditor.login}
                  </strong>
                  <div className="mt-1 text-slate-500">
                    {pref.start_address || 'Endereço de partida'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Auditor Live GPS Markers */}
        {auditorsToShow.map((auditor) => {
          const shift = shifts.find((s) => s.auditor === auditor.login);
          if (!shift || !shift.gps_lat || !shift.gps_lng) return null;
          return (
            <Marker
              key={`gps-${auditor.login}`}
              position={[parseFloat(shift.gps_lat), parseFloat(shift.gps_lng)]}
              icon={carIcon}
            >
              <Popup>
                <div className="p-1 text-xs font-sans">
                  <div className="font-black text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse"></span>
                    <span>{auditor.nome || auditor.login} (ONLINE)</span>
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <div>
                      <strong>Veículo:</strong> {shift.placa_veiculo || 'Não Informado'}
                    </div>
                    <div>
                      <strong>Último GPS:</strong>{' '}
                      {shift.gps_last_update
                        ? new Date(shift.gps_last_update).toLocaleTimeString('pt-BR')
                        : 'Não disponível'}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 🗺️ TRILHA HISTÓRICA REAL DE GPS (MICRO-PONTOS DELICADOS + POLYLINES SUAVES) */}
        {showGpsBreadcrumbs &&
          auditorsToShow.filter(auditor => !selectedAuditorLogins || selectedAuditorLogins.has(auditor.login)).map((auditor, i) => {
            const routeColor = routeColors[i % routeColors.length];
            const logsForAuditor = telemetryLogs.filter(
              (l) =>
                l.auditor === auditor.login ||
                l.auditor?.toLowerCase() === auditor.login?.toLowerCase() ||
                l.auditor === auditor.nome
            );

            if (logsForAuditor.length === 0) return null;

            const trailCoords = logsForAuditor.map((l) => [l.lat, l.lng]);

            return (
              <React.Fragment key={`gps-trail-${auditor.login}`}>
                {/* Linha da trajetória real percorrida */}
                {trailCoords.length > 1 && (
                  <Polyline
                    positions={trailCoords}
                    pathOptions={{
                      color: routeColor,
                      weight: 3.5,
                      opacity: 0.85,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                )}

                {/* Micro-pontos delicados de cada registro */}
                {logsForAuditor.map((log, pIdx) => {
                  const timeFormatted = new Date(log.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const speedText =
                    log.speed !== null && !isNaN(log.speed)
                      ? ` • ${Math.round(log.speed)} km/h`
                      : '';
                  const isLatest = pIdx === logsForAuditor.length - 1;

                  return (
                    <CircleMarker
                      key={`gps-pt-${log.id || pIdx}`}
                      center={[log.lat, log.lng]}
                      radius={isLatest ? 5.5 : 3.5}
                      pathOptions={{
                        color: isLatest ? '#10b981' : '#ffffff',
                        weight: isLatest ? 2 : 1,
                        fillColor: routeColor,
                        fillOpacity: 0.95,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                        <div className="p-1 font-sans text-left">
                          <div className="font-black text-slate-800 text-xs flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: routeColor }}
                            />
                            <span>{auditor.nome || auditor.login}</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                            🕒 {timeFormatted}
                            {speedText}
                          </div>
                          {log.accuracy && (
                            <div className="text-[9px] text-slate-400">
                              Precisão: ±{Math.round(log.accuracy)}m
                            </div>
                          )}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </React.Fragment>
            );
          })}

        {/* OS Markers & Planned Routes for showing auditors */}
        {auditorsToShow.map((auditor, i) => {
          const myOs = fieldAudits.filter(
            (fa) =>
              fa.auditor === auditor.login &&
              (fa.assigned_date === dateStr || !fa.planned_start)
          );

          // Sort OS by planned_start time sequence
          myOs.sort((a, b) => new Date(a.planned_start || 0) - new Date(b.planned_start || 0));

          const pref = prefs.find((p) => p.auditor === auditor.login) || {};
          const routePoints = [];

          if (pref.start_lat && pref.start_lng) {
            routePoints.push([pref.start_lat, pref.start_lng]);
          }

          const routeColor = routeColors[i % routeColors.length];

          const markers = myOs.map((fa, idx) => {
            const osId = fa.os_data?.osid || fa.id_origem;
            const coords = extractCoords(fa);
            if (!coords) return null;

            routePoints.push([coords.lat, coords.lng]);
            const formattedTime = fa.planned_start
              ? new Date(fa.planned_start).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'NÃO PROG';

            const label = String.fromCharCode(65 + idx); // Sequence A, B, C, D...

            return (
              <Marker
                key={fa.inspid}
                position={[coords.lat, coords.lng]}
                icon={createRouteIcon(label, routeColor)}
              >
                <Popup>
                  <div className="p-1 min-w-[200px] font-sans">
                    <div className="font-black text-slate-800 border-b border-slate-100 pb-1 mb-2 flex items-center justify-between">
                      <span>OS: {osId}</span>
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded text-white uppercase tracking-wider"
                        style={{ backgroundColor: routeColor }}
                      >
                        Parada {label}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-650">
                      <div>
                        <strong>Auditor:</strong> {auditor.nome || auditor.login}
                      </div>
                      <div>
                        <strong>Base:</strong> {fa.os_data?.base_contrato}
                      </div>
                      <div>
                        <strong>Horário Planejado:</strong> {formattedTime}
                      </div>
                      <div className="line-clamp-2">
                        <strong>Endereço:</strong>{' '}
                        {fa.os_data?.endereco_completo || fa.os_data?.endereco}
                      </div>
                      <div>
                        <strong>Status:</strong>{' '}
                        <span className="uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full text-[10px]">
                          {fa.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          });

          return (
            <React.Fragment key={`route-${auditor.login}`}>
              {markers}
              {routePoints.length > 1 && (
                <Polyline
                  positions={routePoints}
                  pathOptions={{
                    color: routeColor,
                    weight: 3,
                    opacity: 0.6,
                    dashArray: '5, 8',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Unassigned OS markers */}
        {unallocatedOs
          .filter((fa) => !fa.auditor)
          .map((fa) => {
            const osId = fa.os_data?.osid || fa.id_origem;
            const coords = extractCoords(fa);
            if (!coords) return null;

            return (
              <Marker key={fa.inspid} position={[coords.lat, coords.lng]} icon={redIcon}>
                <Popup>
                  <div className="p-1 min-w-[220px] font-sans">
                    <div className="font-black text-slate-800 text-sm border-b border-slate-100 pb-1 mb-2 flex justify-between items-center">
                      <span>OS: {osId}</span>
                      <span className="text-[9px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                        Pendente
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                      <div>
                        <strong>Base:</strong> {fa.os_data?.base_contrato}
                      </div>
                      <div className="line-clamp-2">
                        <strong>Endereço:</strong>{' '}
                        {fa.os_data?.endereco_completo ||
                          fa.os_data?.endereco ||
                          'Sem endereço'}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Designar Auditor
                      </label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && onAssignAudit) {
                            onAssignAudit(fa, val, null, null);
                          }
                        }}
                        className="w-full text-xs font-bold text-slate-700 p-1.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Escolha o Auditor...
                        </option>
                        {availableAuditors.length === 0 && (
                          <option value="" disabled>
                            Sem auditores com escala hoje
                          </option>
                        )}
                        {availableAuditors.map((a) => (
                          <option key={a.login} value={a.login}>
                            {a.nome || a.login}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
