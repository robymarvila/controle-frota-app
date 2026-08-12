import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '../supabaseClient';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

// ════════════════════════════════════════════════════════════════════════════
// GPS SERVICE v2.0 — Telemetria Real-Time com Background Robusto
// ════════════════════════════════════════════════════════════════════════════
//
// Mudanças vs v1.0:
// - Elimina setInterval (morto pelo Android em suspensão)
// - Usa stale:true no watcher nativo (garante callbacks mesmo parado)
// - Fila offline para pontos GPS sem conexão (flush ao retomar)
// - App.stateChange listener para heartbeat imediato ao voltar ao foreground
// - Validação anti-spoofing (accuracy, speed, isMock)
// - Não depende de navigator.geolocation no modo nativo
// ════════════════════════════════════════════════════════════════════════════

// Gerenciador de Áudio Silencioso para Keep-Alive no PWA Web (Contingência)
class WebAudioKeepAlive {
  constructor() {
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
  }

  start() {
    if (this.isPlaying) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();

      // Frequência inaudível e ganho virtualmente zero (silêncio total)
      this.oscillator.frequency.value = 25;
      this.gainNode.gain.value = 0.0001;

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      this.oscillator.start();
      this.isPlaying = true;
      console.log('[GPS Web] Keep-Alive de áudio silencioso ativado.');
    } catch (e) {
      console.warn('[GPS Web] Não foi possível iniciar AudioContext:', e);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    try {
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
      }
      if (this.audioContext) {
        this.audioContext.close();
      }
    } catch (e) {}
    this.isPlaying = false;
  }
}

const webAudioKeepAlive = new WebAudioKeepAlive();

// ── Constantes de validação anti-spoofing ──
const MAX_ACCURACY_METERS = 150;    // Rejeita coordenadas com precisão > 150m
const MAX_SPEED_KMH = 200;         // Rejeita velocidades impossíveis para auditor de campo
const MIN_LOG_INTERVAL_MS = 10000;  // Mínimo 10s entre logs de repouso
const HEARTBEAT_LOG_INTERVAL_MS = 60000; // Log de heartbeat a cada 60s em repouso

class GpsService {
  constructor() {
    this.activeWatcherId = null;
    this.heartbeatIntervalId = null;
    this.webWatchId = null;
    this.lastRecordedTime = 0;
    this.lastLoggedTime = 0;
    this.lastLat = null;
    this.lastLng = null;
    this.lastSpeed = null;
    this.lastHeading = null;
    this.lastAccuracy = null;
    this.currentShift = null;
    this._appStateListener = null;

    // ── Fila Offline ──
    this._offlineQueue = [];
    this._isFlushing = false;
    this._maxQueueSize = 500; // Limite de pontos armazenados offline
  }

  isNative() {
    return Capacitor.isNativePlatform();
  }

  /**
   * Abre a tela de configurações do aplicativo no Android
   */
  async openSettings() {
    if (this.isNative()) {
      try {
        await BackgroundGeolocation.openSettings();
      } catch (e) {
        console.warn('[GPS Service] Erro ao abrir configurações:', e);
      }
    }
  }

  /**
   * Solicita exclusão de otimização de bateria (Doze Mode)
   */
  async requestBatteryExclusion() {
    if (!this.isNative()) return;
    try {
      // O plugin BackgroundGeolocation já expõe openSettings() que leva 
      // o usuário para a tela onde ele pode desativar a otimização de bateria.
      await BackgroundGeolocation.openSettings();
    } catch (e) {
      console.warn('[GPS Service] Erro ao solicitar exclusão de bateria:', e);
    }
  }

  /**
   * Verifica estritamente se a localização está concedida.
   * Para verificação detalhada (foreground vs background), usar permissionService.
   */
  async checkAlwaysPermission() {
    return await this.checkStrictPermission();
  }

  async checkStrictPermission() {
    if (!this.isNative()) return true; // Na web não há "O tempo todo"
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[GPS Service] Erro ao checar permissão:', e);
      return false; // Bloqueia por precaução se falhar nativamente
    }
  }

  /**
   * Obtém a coordenada de alta precisão atual imediatamente
   */
  async getCurrentPositionFix() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // VALIDAÇÃO ANTI-SPOOFING
  // ════════════════════════════════════════════════════════════════════

  /**
   * Valida se uma coordenada é legítima antes de gravar.
   * Retorna { isValid, reason } 
   */
  validateLocation({ lat, lng, accuracy, speed, simulated }) {
    // Rejeitar coordenadas nulas
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      return { isValid: false, reason: 'Coordenadas nulas' };
    }

    // Rejeitar coordenadas fora do range válido
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { isValid: false, reason: 'Coordenadas fora do range válido' };
    }

    // Rejeitar mock location (Android reporta simulated=true)
    if (simulated === true) {
      console.warn('[GPS Service] ⚠️ Localização SIMULADA detectada (mock GPS)');
      return { isValid: false, reason: 'Localização simulada (mock GPS)' };
    }

    // Rejeitar precisão muito baixa (possível spoofing ou GPS degradado)
    if (accuracy !== null && accuracy !== undefined && accuracy > MAX_ACCURACY_METERS) {
      console.warn(`[GPS Service] ⚠️ Precisão muito baixa: ${accuracy}m (max: ${MAX_ACCURACY_METERS}m)`);
      return { isValid: false, reason: `Precisão muito baixa: ${accuracy}m` };
    }

    // Rejeitar velocidade impossível
    if (speed !== null && speed !== undefined && speed > MAX_SPEED_KMH) {
      console.warn(`[GPS Service] ⚠️ Velocidade impossível: ${speed} km/h`);
      return { isValid: false, reason: `Velocidade impossível: ${speed} km/h` };
    }

    return { isValid: true, reason: null };
  }

  // ════════════════════════════════════════════════════════════════════
  // FILA OFFLINE — Armazena pontos quando sem rede
  // ════════════════════════════════════════════════════════════════════

  /**
   * Adiciona um ponto à fila offline para envio posterior.
   */
  _enqueueOffline(entry) {
    if (this._offlineQueue.length >= this._maxQueueSize) {
      // Remove o ponto mais antigo para não estourar memória
      this._offlineQueue.shift();
    }
    this._offlineQueue.push(entry);
    console.log(`[GPS Offline] Ponto enfileirado (${this._offlineQueue.length} na fila)`);
  }

  /**
   * Tenta enviar todos os pontos acumulados na fila offline.
   */
  async _flushOfflineQueue() {
    if (this._isFlushing || this._offlineQueue.length === 0) return;
    this._isFlushing = true;

    console.log(`[GPS Offline] Flushing ${this._offlineQueue.length} pontos...`);

    const toFlush = [...this._offlineQueue];
    let successCount = 0;

    for (const entry of toFlush) {
      try {
        if (entry.type === 'shift_update') {
          await supabase
            .from('autofiscalizacao_shifts')
            .update({
              gps_lat: entry.lat,
              gps_lng: entry.lng,
              gps_last_update: entry.timestamp,
            })
            .eq('id', entry.shiftId);
        } else if (entry.type === 'gps_log') {
          await supabase.from('autofiscalizacao_gps_logs').insert(entry.payload);
        }
        successCount++;
        // Remove da fila após envio bem-sucedido
        const idx = this._offlineQueue.indexOf(entry);
        if (idx > -1) this._offlineQueue.splice(idx, 1);
      } catch (err) {
        console.warn('[GPS Offline] Falha ao enviar ponto da fila:', err);
        break; // Para de tentar se um falhar (possivelmente sem rede ainda)
      }
    }

    if (successCount > 0) {
      console.log(`[GPS Offline] ✅ ${successCount}/${toFlush.length} pontos enviados com sucesso`);
    }

    this._isFlushing = false;
  }

  // ════════════════════════════════════════════════════════════════════
  // GRAVAÇÃO DE LOCALIZAÇÃO
  // ════════════════════════════════════════════════════════════════════

  /**
   * Grava a coordenada recebida na tabela de turno e insere no histórico de logs
   */
  async recordLocation({ shiftId, auditor, date, lat, lng, accuracy, speed, heading, isHeartbeat = false, simulated = false }) {
    if (!lat || !lng || !shiftId) return;

    // Validação anti-spoofing
    const validation = this.validateLocation({ lat, lng, accuracy, speed, simulated });
    if (!validation.isValid) {
      console.warn(`[GPS Service] Coordenada rejeitada: ${validation.reason}`);
      return;
    }

    const now = new Date().toISOString();
    const speedKmh = speed !== null && !isNaN(speed) ? Number(speed) : 0;
    const isMoving = speedKmh > 3;

    this.lastLat = lat;
    this.lastLng = lng;
    this.lastSpeed = speedKmh;
    this.lastHeading = heading || null;
    this.lastAccuracy = accuracy || null;
    this.lastRecordedTime = Date.now();

    // 1. Atualiza o status em tempo real do turno ativo (sempre a cada sinal)
    try {
      await supabase
        .from('autofiscalizacao_shifts')
        .update({
          gps_lat: lat,
          gps_lng: lng,
          gps_last_update: now,
        })
        .eq('id', shiftId);
    } catch (err) {
      console.warn('[GPS Service] Erro ao atualizar turno ativo (tentando offline):', err);
      this._enqueueOffline({
        type: 'shift_update',
        shiftId,
        lat,
        lng,
        timestamp: now,
      });
    }

    // 2. Insere ponto no histórico detalhado da rota (se moveu ou a cada 60s em repouso)
    const nowMs = Date.now();
    const logTimeDiff = nowMs - this.lastLoggedTime;

    if (!isHeartbeat || logTimeDiff >= HEARTBEAT_LOG_INTERVAL_MS || isMoving) {
      this.lastLoggedTime = nowMs;
      const logPayload = {
        shift_id: shiftId,
        auditor: auditor,
        date: date,
        lat: lat,
        lng: lng,
        accuracy: accuracy || null,
        speed: speedKmh,
        heading: heading || null,
        is_moving: isMoving,
        created_at: now,
      };

      try {
        await supabase.from('autofiscalizacao_gps_logs').insert(logPayload);
      } catch (err) {
        console.warn('[GPS Service] Erro ao inserir log de GPS (tentando offline):', err);
        this._enqueueOffline({
          type: 'gps_log',
          payload: logPayload,
        });
      }
    }
  }

  /**
   * Dispara um ping forçado de Heartbeat com a coordenada atual ou última conhecida
   */
  async triggerHeartbeat() {
    if (!this.currentShift || !this.currentShift.id) return;

    let coords = null;
    
    // No modo nativo, usar o último ponto conhecido (não depender de navigator.geolocation)
    if (this.isNative()) {
      if (this.lastLat && this.lastLng) {
        coords = {
          latitude: this.lastLat,
          longitude: this.lastLng,
          accuracy: this.lastAccuracy,
          speed: 0,
          heading: this.lastHeading,
        };
      }
    } else {
      // No modo web, tentar getCurrentPosition
      const webCoords = await this.getCurrentPositionFix();
      if (webCoords) {
        coords = webCoords;
      } else if (this.lastLat && this.lastLng) {
        coords = {
          latitude: this.lastLat,
          longitude: this.lastLng,
          accuracy: this.lastAccuracy,
          speed: 0,
          heading: this.lastHeading,
        };
      }
    }

    if (coords) {
      const speedKmh = coords.speed !== null && !isNaN(coords.speed) ? coords.speed * 3.6 : 0;
      await this.recordLocation({
        shiftId: this.currentShift.id,
        auditor: this.currentShift.auditor,
        date: this.currentShift.date,
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        speed: speedKmh,
        heading: coords.heading,
        isHeartbeat: true,
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // TRACKING — Motor Principal
  // ════════════════════════════════════════════════════════════════════

  /**
   * Inicia o rastreamento unificado.
   * 
   * NATIVO ANDROID:
   * - Motor único: BackgroundGeolocation.addWatcher() com stale:true
   * - Foreground Service mantém o processo vivo (gerenciado pelo plugin)
   * - App.stateChange listener para heartbeat + flush ao retornar ao foreground
   * - SEM setInterval (morto pelo Android em suspensão)
   * 
   * WEB/PWA (Contingência):
   * - watchPosition + setInterval 30s (funciona apenas em foreground)
   * - Audio keep-alive para evitar suspensão parcial
   */
  async startTracking(shift, onLocationCallback) {
    if (!shift || !shift.id) return;
    this.stopTracking();
    this.currentShift = shift;

    const isNative = this.isNative();
    console.log(`[GPS Service] 🚀 Iniciando telemetria v2.0 (${isNative ? 'NATIVO ANDROID — Background Robusto' : 'WEB PWA CONTINGÊNCIA'})...`);

    // Ponto inicial imediato
    this.triggerHeartbeat();

    // Tentar flush de pontos offline acumulados
    this._flushOfflineQueue();

    if (isNative) {
      // ═══════════════════════════════════════════════════════════════
      // 📱 MODO NATIVO ANDROID (FOREGROUND SERVICE + STALE)
      // ═══════════════════════════════════════════════════════════════
      try {
        this.activeWatcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Telemetria operacional e localização em tempo real ativas.',
            backgroundTitle: 'Controle Operacional — Turno Ativo',
            requestPermissions: true,
            stale: true,       // ← CRÍTICO: Recebe callbacks mesmo quando parado
            distanceFilter: 5, // A cada 5 metros de deslocamento em movimento
          },
          async (location, error) => {
            if (error) {
              console.warn('[GPS Native] Erro no watcher nativo:', error);
              return;
            }

            if (location) {
              const speedKmh =
                location.speed !== null && !isNaN(location.speed)
                  ? location.speed * 3.6
                  : null;

              await this.recordLocation({
                shiftId: shift.id,
                auditor: shift.auditor,
                date: shift.date,
                lat: location.latitude,
                lng: location.longitude,
                accuracy: location.accuracy,
                speed: speedKmh,
                heading: location.bearing,
                isHeartbeat: false,
                simulated: location.simulated || false,
              });

              if (onLocationCallback) onLocationCallback(location);
            }
          }
        );
        console.log('[GPS Native] ✅ Watcher nativo registrado com sucesso (stale:true, foreground service ativo)');
      } catch (err) {
        console.error('[GPS Native] ❌ Falha ao registrar watcher nativo:', err);
      }

      // ── App.stateChange Listener: Heartbeat + Flush ao retornar ao foreground ──
      try {
        this._appStateListener = await App.addListener('appStateChange', async (state) => {
          if (state.isActive && this.currentShift) {
            console.log('[GPS Native] App retornou ao foreground — heartbeat imediato + flush offline');
            await this.triggerHeartbeat();
            await this._flushOfflineQueue();
          }
        });
      } catch (e) {
        console.warn('[GPS Native] Erro ao registrar listener de appStateChange:', e);
      }

      // ── NÃO usar setInterval no modo nativo! ──
      // O watcher com stale:true + foreground service já garante
      // callbacks periódicos mesmo com a tela suspensa.
      // O App.stateChange garante heartbeat ao voltar ao foreground.

    } else {
      // ═══════════════════════════════════════════════════════════════
      // 🌐 MODO WEB / PWA CONTINGÊNCIA
      // ═══════════════════════════════════════════════════════════════
      webAudioKeepAlive.start();

      if (navigator.geolocation) {
        this.webWatchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const speedKmh =
              pos.coords.speed !== null && !isNaN(pos.coords.speed)
                ? pos.coords.speed * 3.6
                : null;

            await this.recordLocation({
              shiftId: shift.id,
              auditor: shift.auditor,
              date: shift.date,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: speedKmh,
              heading: pos.coords.heading,
              isHeartbeat: false,
            });

            if (onLocationCallback) onLocationCallback(pos.coords);
          },
          (err) => console.warn('[GPS Web] Aviso watchPosition:', err),
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );

        // No modo web, setInterval é aceitável pois o PWA roda em foreground
        this.heartbeatIntervalId = setInterval(() => {
          this.triggerHeartbeat();
        }, 30000);
      }
    }
  }

  /**
   * Encerra o rastreamento e limpa todos os watchers e timers
   */
  async stopTracking() {
    if (this.activeWatcherId) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: this.activeWatcherId });
      } catch (e) {}
      this.activeWatcherId = null;
    }

    if (this.webWatchId !== null && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(this.webWatchId);
      } catch (e) {}
      this.webWatchId = null;
    }

    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }

    // Remover listener de appStateChange
    if (this._appStateListener) {
      try {
        this._appStateListener.remove();
      } catch (e) {}
      this._appStateListener = null;
    }

    // Flush final de pontos offline antes de parar
    await this._flushOfflineQueue();

    this.currentShift = null;
    webAudioKeepAlive.stop();
    console.log('[GPS Service] Telemetria v2.0 finalizada.');
  }

  /**
   * Retorna o timestamp do último ponto GPS gravado.
   * Usado pelo idle timeout para considerar GPS tracking como "atividade".
   */
  getLastRecordedTime() {
    return this.lastRecordedTime;
  }

  /**
   * Verifica se o GPS está ativamente rastreando (turno ativo).
   */
  isTracking() {
    return this.currentShift !== null && (this.activeWatcherId !== null || this.webWatchId !== null);
  }
}

export const gpsService = new GpsService();
export default gpsService;
