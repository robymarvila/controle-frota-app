import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

class NotificationService {
  constructor() {
    this.initialized = false;
    this.audioAlert = null;
  }

  /**
   * Inicializa o canal de notificação nativo no Android com som de alerta e vibração
   */
  async init() {
    if (this.initialized) return;

    if (Capacitor.isNativePlatform()) {
      try {
        // Solicita permissão de notificação (Android 13+)
        const perm = await LocalNotifications.requestPermissions();
        console.log('[NotificationService] Permissão nativa de notificação:', perm);

        // Cria o canal de alta prioridade para novas ordens de serviço
        await LocalNotifications.createChannel({
          id: 'novas_ordens_servico',
          name: 'Novas Ordens de Serviço',
          description: 'Notificações de novas tarefas e OS atribuídas pelo WFM',
          importance: 5, // MAX importance / Heads-up banner
          visibility: 1, // Public on lockscreen
          vibration: true,
          sound: 'res_custom_notification.mp3', // Som nativo do sistema fallback
          lights: true,
          lightColor: '#2563EB',
        });
      } catch (err) {
        console.warn('[NotificationService] Erro ao inicializar canal nativo:', err);
      }
    }

    this.initialized = true;
  }

  /**
   * Toca um alerta sonoro via Web Audio sintetizado (funciona em PWA e APK)
   */
  playBeep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Primeiro tom de alerta
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      // Segundo tom de alerta mais agudo (som clássico de despacho de rádio)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.15); // E6
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('[NotificationService] Erro ao sintetizar áudio de alerta:', e);
    }
  }

  /**
   * Dispara vibração nativa ou Web Vibrate
   */
  async triggerVibration() {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(async () => {
          try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
          } catch (e) {}
        }, 200);
      } catch (e) {
        console.warn('[NotificationService] Erro no Haptics:', e);
      }
    } else if (navigator.vibrate) {
      navigator.vibrate([200, 100, 300, 100, 400]);
    }
  }

  /**
   * Notifica a chegada de uma nova Ordem de Serviço
   */
  async notifyNewTask({ id, title, description, osNumber, auditor }) {
    await this.init();

    // 1. Som de alerta
    this.playBeep();

    // 2. Vibração forte
    await this.triggerVibration();

    // 3. Notificação nativa no banner e barra de status do Android
    if (Capacitor.isNativePlatform()) {
      try {
        const notifId = Math.floor(Math.random() * 1000000);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title: `🚨 NOVA OS ATRIBUÍDA: #${osNumber || id || 'NOVA'}`,
              body: description || title || 'Uma nova ordem de serviço foi atribuída a você no WFM.',
              channelId: 'novas_ordens_servico',
              ongoing: false,
              autoCancel: true,
              extra: { taskId: id, osNumber },
            },
          ],
        });
      } catch (err) {
        console.warn('[NotificationService] Erro ao agendar LocalNotification:', err);
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
