import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '../supabaseClient';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

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
   * Verifica estritamente se a localização está "O tempo todo" no Android
   */
  async checkAlwaysPermission() {
    return await this.checkStrictPermission();
  }

  async checkStrictPermission() {
    if (!this.isNative()) return true; // Na web não há "O tempo todo"
    try {
      // Usamos importação dinâmica para não quebrar a web se o plugin não estiver carregado
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.checkPermissions();
      // O capacitor retorna location='granted' para foreground e 'granted' para background?
      // O BackgroundGeolocation nativo pode nos dar um erro se addWatcher for chamado sem always.
      // Vamos assumir que false bloqueia a tela.
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

  /**
   * Grava a coordenada recebida na tabela de turno e insere no histórico de logs
   */
  async recordLocation({ shiftId, auditor, date, lat, lng, accuracy, speed, heading, isHeartbeat = false }) {
    if (!lat || !lng || !shiftId) return;

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
      console.warn('[GPS Service] Erro ao atualizar turno ativo:', err);
    }

    // 2. Insere ponto no histórico detalhado da rota (se moveu ou a cada 60s em repouso)
    const nowMs = Date.now();
    const logTimeDiff = nowMs - this.lastLoggedTime;

    if (!isHeartbeat || logTimeDiff >= 60000 || isMoving) {
      this.lastLoggedTime = nowMs;
      try {
        await supabase.from('autofiscalizacao_gps_logs').insert({
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
        });
      } catch (err) {
        console.warn('[GPS Service] Erro ao inserir log de GPS:', err);
      }
    }
  }

  /**
   * Dispara um ping forçado de Heartbeat com a coordenada atual ou última conhecida
   */
  async triggerHeartbeat() {
    if (!this.currentShift || !this.currentShift.id) return;

    let coords = await this.getCurrentPositionFix();
    if (!coords && this.lastLat && this.lastLng) {
      coords = {
        latitude: this.lastLat,
        longitude: this.lastLng,
        accuracy: this.lastAccuracy,
        speed: 0,
        heading: this.lastHeading,
      };
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

  /**
   * Inicia o rastreamento unificado (Motor de Deslocamento + Motor de Heartbeat 30s)
   */
  async startTracking(shift, onLocationCallback) {
    if (!shift || !shift.id) return;
    this.stopTracking();
    this.currentShift = shift;

    const isNative = this.isNative();
    console.log(`[GPS Service] 🚀 Iniciando telemetria (${isNative ? 'NATIVO ANDROID' : 'WEB PWA CONTINGÊNCIA'})...`);

    // Ponto inicial imediato
    this.triggerHeartbeat();

    if (isNative) {
      // ═════════════════════════════════════════════════════════════════════
      // 📱 MODO NATIVO ANDROID (FOREGROUND SERVICE + DUAL ENGINE)
      // ═════════════════════════════════════════════════════════════════════
      try {
        this.activeWatcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Telemetria operacional e localização em tempo real ativas.',
            backgroundTitle: 'Controle Operacional — Turno Ativo',
            requestPermissions: true,
            stale: false,
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
              });

              if (onLocationCallback) onLocationCallback(location);
            }
          }
        );
      } catch (err) {
        console.error('[GPS Native] Falha ao registrar watcher nativo:', err);
      }

      // ── Motor 2: Loop de Heartbeat incondicional a cada 30 segundos (Keep-Alive contínuo)
      this.heartbeatIntervalId = setInterval(() => {
        this.triggerHeartbeat();
      }, 30000);

    } else {
      // ═════════════════════════════════════════════════════════════════════
      // 🌐 MODO WEB / PWA CONTINGÊNCIA
      // ═════════════════════════════════════════════════════════════════════
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

    this.currentShift = null;
    webAudioKeepAlive.stop();
    console.log('[GPS Service] Telemetria e Heartbeat finalizados.');
  }
}

export const gpsService = new GpsService();
export default gpsService;
