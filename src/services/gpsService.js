import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '../supabaseClient';

const FleetLocation = registerPlugin('FleetLocation');
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

const SUPABASE_URL = 'https://dbamnuezlbmmxhxpxtiu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NArb5o1nWAQcPcen4pwzJQ_KG7Vb6hd';

// ════════════════════════════════════════════════════════════════════════════
// GPS SERVICE v3.0 — Motor 100% Nativo em Segundo Plano (Bypass de WebView)
// ════════════════════════════════════════════════════════════════════════════
//
// Arquitetura Nativa:
// - Android: FleetLocationService (Java Foreground Service + WakeLock + OkHttp)
//   Transmite direto para o Supabase em background contínuo com tela apagada.
// - Web / PWA: Fallback gracioso com watchPosition + Audio Keep-Alive.
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
const MAX_ACCURACY_METERS = 150;
const MAX_SPEED_KMH = 200;
const HEARTBEAT_LOG_INTERVAL_MS = 60000;

class GpsService {
  constructor() {
    this.nativeTrackingActive = false;
    this.nativeLocationListener = null;
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

    // ── Fila Offline Web ──
    this._offlineQueue = [];
    this._isFlushing = false;
    this._maxQueueSize = 500;
  }

  isNative() {
    return Capacitor.isNativePlatform();
  }

  /**
   * Abre a tela de configurações ou solicita isenção nativa de bateria
   */
  async openSettings() {
    if (this.isNative()) {
      try {
        await FleetLocation.requestBatteryExemption();
      } catch (e) {
        try {
          await BackgroundGeolocation.openSettings();
        } catch (err) {
          console.warn('[GPS Service] Erro ao abrir configurações:', err);
        }
      }
    }
  }

  /**
   * Solicita exclusão de otimização de bateria (Doze Mode) diretamente via pop-up do Android
   */
  async requestBatteryExclusion() {
    if (!this.isNative()) return;
    try {
      await FleetLocation.requestBatteryExemption();
    } catch (e) {
      console.warn('[GPS Service] Erro ao solicitar isenção de bateria:', e);
    }
  }

  /**
   * Verifica se a isenção de bateria está ativa
   */
  async isBatteryOptimizationIgnored() {
    if (!this.isNative()) return true;
    try {
      const res = await FleetLocation.isIgnoringBatteryOptimizations();
      return !!res?.isIgnoring;
    } catch (e) {
      return false;
    }
  }

  async checkAlwaysPermission() {
    return await this.checkStrictPermission();
  }

  async checkStrictPermission() {
    if (!this.isNative()) return true;
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.checkPermissions();
      return perm.location === 'granted' || perm.coarseLocation === 'granted';
    } catch (e) {
      console.warn('[GPS Service] Erro ao checar permissão:', e);
      return false;
    }
  }

  /**
   * Obtém status detalhado do motor nativo em tempo real
   */
  async getNativeStatus() {
    if (!this.isNative()) return null;
    try {
      return await FleetLocation.getStatus();
    } catch (e) {
      return null;
    }
  }

  /**
   * Obtém a coordenada atual imediatamente
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

  validateLocation({ lat, lng, accuracy, speed, simulated }) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      return { isValid: false, reason: 'Coordenadas nulas' };
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { isValid: false, reason: 'Coordenadas fora do range válido' };
    }
    if (simulated === true) {
      return { isValid: false, reason: 'Localização simulada (mock GPS)' };
    }
    if (accuracy !== null && accuracy !== undefined && accuracy > MAX_ACCURACY_METERS) {
      return { isValid: false, reason: `Precisão muito baixa: ${accuracy}m` };
    }
    if (speed !== null && speed !== undefined && speed > MAX_SPEED_KMH) {
      return { isValid: false, reason: `Velocidade impossível: ${speed} km/h` };
    }
    return { isValid: true, reason: null };
  }

  // ════════════════════════════════════════════════════════════════════
  // GRAVAÇÃO DE LOCALIZAÇÃO (Modo Web Fallback)
  // ════════════════════════════════════════════════════════════════════
  async recordLocation({ shiftId, auditor, date, lat, lng, accuracy, speed, heading, isHeartbeat = false, simulated = false }) {
    if (!lat || !lng || !shiftId) return;

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
      console.warn('[GPS Service Web] Erro ao atualizar turno:', err);
    }

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
        console.warn('[GPS Service Web] Erro ao inserir log de GPS:', err);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // TRACKING — Motor Principal
  // ════════════════════════════════════════════════════════════════════
  async startTracking(shift, onLocationCallback) {
    if (!shift || !shift.id) return;
    if (this.currentShift?.id === shift.id && (this.nativeTrackingActive || this.webWatchId)) {
      // Já está ativamente rastreando este turno, não reinicia
      return;
    }
    await this.stopTracking();
    this.currentShift = shift;

    const isNative = this.isNative();
    console.log(`[GPS Service] 🚀 Iniciando telemetria v3.0 (${isNative ? '100% NATIVO ANDROID (Bypass de WebView)' : 'WEB PWA CONTINGÊNCIA'})...`);

    if (isNative) {
      // ═══════════════════════════════════════════════════════════════
      // 📱 MODO NATIVO PURO (Android Foreground Service + WakeLock + OkHttp)
      // ═══════════════════════════════════════════════════════════════
      try {
        // 1. Iniciar serviço nativo Android
        await FleetLocation.startTracking({
          shiftId: String(shift.id),
          auditor: shift.auditor || '',
          date: shift.date || '',
          supabaseUrl: SUPABASE_URL,
          anonKey: SUPABASE_ANON_KEY,
        });
        this.nativeTrackingActive = true;
        console.log('[GPS Native] ✅ FleetLocationService ativo em Foreground (transmissão direta no Java).');

        // 2. Ouvir atualizações para refletir no mapa da UI quando a tela estiver acesa
        this.nativeLocationListener = await FleetLocation.addListener('locationUpdate', (data) => {
          if (data) {
            this.lastLat = data.latitude;
            this.lastLng = data.longitude;
            this.lastSpeed = data.speed;
            this.lastHeading = data.heading;
            this.lastAccuracy = data.accuracy;
            this.lastRecordedTime = Date.now();

            if (onLocationCallback) {
              onLocationCallback({
                latitude: data.latitude,
                longitude: data.longitude,
                accuracy: data.accuracy,
                speed: data.speed != null ? data.speed / 3.6 : 0,
                bearing: data.heading,
              });
            }
          }
        });
      } catch (err) {
        console.error('[GPS Native] ❌ Falha ao iniciar FleetLocationService nativo:', err);
      }
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

        this.heartbeatIntervalId = setInterval(() => {
          this.getCurrentPositionFix().then((coords) => {
            if (coords) {
              this.recordLocation({
                shiftId: shift.id,
                auditor: shift.auditor,
                date: shift.date,
                lat: coords.latitude,
                lng: coords.longitude,
                accuracy: coords.accuracy,
                speed: coords.speed != null ? coords.speed * 3.6 : 0,
                heading: coords.heading,
                isHeartbeat: true,
              });
            }
          });
        }, 30000);
      }
    }
  }

  async stopTracking() {
    if (this.isNative() && this.nativeTrackingActive) {
      try {
        await FleetLocation.stopTracking();
      } catch (e) {}
      this.nativeTrackingActive = false;
    }

    if (this.nativeLocationListener) {
      try {
        await this.nativeLocationListener.remove();
      } catch (e) {}
      this.nativeLocationListener = null;
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

    this.currentShift = null;
    webAudioKeepAlive.stop();
    console.log('[GPS Service] Telemetria finalizada.');
  }

  getLastRecordedTime() {
    return this.lastRecordedTime;
  }

  isTracking() {
    return this.currentShift !== null && (this.nativeTrackingActive || this.webWatchId !== null);
  }
}

export const gpsService = new GpsService();
export default gpsService;
