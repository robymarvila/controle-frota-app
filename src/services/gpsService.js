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
    this.webWatchId = null;
    this.webIntervalId = null;
    this.lastRecordedTime = 0;
    this.lastLat = null;
    this.lastLng = null;
  }

  isNative() {
    return Capacitor.isNativePlatform();
  }

  /**
   * Grava a coordenada recebida tanto na tabela de turno quanto no histórico de logs
   */
  async recordLocation({ shiftId, auditor, date, lat, lng, accuracy, speed, heading }) {
    if (!lat || !lng || !shiftId) return;

    const now = new Date().toISOString();
    const speedKmh = speed !== null && !isNaN(speed) ? Number(speed) : null;

    // 1. Atualiza a posição em tempo real no turno ativo
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
      console.warn('[GPS Service] Erro ao atualizar turno:', err);
    }

    // 2. Insere ponto no histórico detalhado da rota
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
        is_moving: (speedKmh || 0) > 3,
        created_at: now,
      });
    } catch (err) {
      console.warn('[GPS Service] Erro ao inserir log de GPS:', err);
    }
  }

  /**
   * Inicia o rastreamento (Nativo Android Foreground Service ou PWA Web Watcher)
   */
  async startTracking(shift, onLocationCallback) {
    if (!shift || !shift.id) return;
    this.stopTracking();

    const isNative = this.isNative();
    console.log(`[GPS Service] Iniciando rastreamento (${isNative ? 'NATIVO ANDROID' : 'WEB PWA CONTINGÊNCIA'})...`);

    if (isNative) {
      // ═════════════════════════════════════════════════════════════════════
      // 📱 MODO NATIVO ANDROID (CAPACITOR FOREGROUND SERVICE)
      // ═════════════════════════════════════════════════════════════════════
      try {
        this.activeWatcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Rastreamento de telemetria operacional em andamento.',
            backgroundTitle: 'Controle Operacional — Turno Ativo',
            requestPermissions: true,
            stale: false,
            distanceFilter: 10, // A cada 10 metros de deslocamento
          },
          async (location, error) => {
            if (error) {
              if (error.code === 'NOT_AUTHORIZED') {
                if (
                  window.confirm(
                    'O aplicativo precisa da permissão de localização "Permitir o tempo todo" para registrar o deslocamento em segundo plano. Deseja abrir as configurações?'
                  )
                ) {
                  BackgroundGeolocation.openSettings();
                }
              }
              console.warn('[GPS Native] Erro no watcher nativo:', error);
              return;
            }

            if (location) {
              const nowMs = Date.now();
              // Throttling inteligente: grava se passou >= 50 segundos OU se moveu > 30 metros
              const timeDiff = nowMs - this.lastRecordedTime;
              const hasMovedSignificantly =
                this.lastLat === null ||
                Math.abs(location.latitude - this.lastLat) > 0.0003 ||
                Math.abs(location.longitude - this.lastLng) > 0.0003;

              if (timeDiff >= 50000 || hasMovedSignificantly) {
                this.lastRecordedTime = nowMs;
                this.lastLat = location.latitude;
                this.lastLng = location.longitude;

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
                });

                if (onLocationCallback) onLocationCallback(location);
              }
            }
          }
        );
      } catch (err) {
        console.error('[GPS Native] Falha ao iniciar watcher nativo:', err);
      }
    } else {
      // ═════════════════════════════════════════════════════════════════════
      // 🌐 MODO WEB / PWA CONTINGÊNCIA (WATCHPOSITION + KEEP-ALIVE)
      // ═════════════════════════════════════════════════════════════════════
      webAudioKeepAlive.start();

      if (navigator.geolocation) {
        const handlePosition = async (pos) => {
          const nowMs = Date.now();
          const timeDiff = nowMs - this.lastRecordedTime;
          const hasMovedSignificantly =
            this.lastLat === null ||
            Math.abs(pos.coords.latitude - this.lastLat) > 0.0003 ||
            Math.abs(pos.coords.longitude - this.lastLng) > 0.0003;

          if (timeDiff >= 60000 || hasMovedSignificantly) {
            this.lastRecordedTime = nowMs;
            this.lastLat = pos.coords.latitude;
            this.lastLng = pos.coords.longitude;

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
            });

            if (onLocationCallback) onLocationCallback(pos.coords);
          }
        };

        this.webWatchId = navigator.geolocation.watchPosition(
          handlePosition,
          (err) => console.warn('[GPS Web] Aviso watchPosition:', err),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );

        // Polling de garantia no PWA
        this.webIntervalId = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            handlePosition,
            (err) => console.warn('[GPS Web] Aviso getCurrentPosition:', err),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
          );
        }, 75000);
      }
    }
  }

  /**
   * Para o rastreamento
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

    if (this.webIntervalId) {
      clearInterval(this.webIntervalId);
      this.webIntervalId = null;
    }

    webAudioKeepAlive.stop();
    console.log('[GPS Service] Rastreamento finalizado.');
  }
}

export const gpsService = new GpsService();
export default gpsService;
