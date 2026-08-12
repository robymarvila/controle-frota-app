import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * NotificationService v2.0
 * 
 * Serviço de notificações para auditores de campo.
 * Suporta: Som nativo, vibração forte, banner na barra de status.
 * 
 * Eventos notificados:
 * - Nova OS atribuída ao auditor
 * - OS removida/reatribuída do auditor
 */
class NotificationService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Inicializa os canais de notificação nativos no Android
   */
  async init() {
    if (this.initialized) return;

    if (Capacitor.isNativePlatform()) {
      try {
        // Solicita permissão de notificação (Android 13+)
        const perm = await LocalNotifications.requestPermissions();
        console.log('[NotificationService] Permissão nativa de notificação:', perm);

        // Canal 1: Novas ordens de serviço (prioridade máxima)
        await LocalNotifications.createChannel({
          id: 'novas_ordens_servico',
          name: 'Novas Ordens de Serviço',
          description: 'Notificações de novas tarefas e OS atribuídas pelo WFM',
          importance: 5, // MAX importance / Heads-up banner
          visibility: 1, // Public on lockscreen
          vibration: true,
          sound: 'default', // Som padrão do sistema (funciona em background)
          lights: true,
          lightColor: '#2563EB',
        });

        // Canal 2: OS removidas (prioridade alta)
        await LocalNotifications.createChannel({
          id: 'os_removidas',
          name: 'OS Removidas ou Reatribuídas',
          description: 'Notificações quando uma OS é retirada do auditor',
          importance: 4, // HIGH
          visibility: 1,
          vibration: true,
          sound: 'default',
          lights: true,
          lightColor: '#DC2626',
        });
      } catch (err) {
        console.warn('[NotificationService] Erro ao inicializar canais nativos:', err);
      }
    }

    this.initialized = true;
  }

  /**
   * Toca um alerta sonoro via Web Audio sintetizado (funciona em foreground PWA e APK)
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
   * Dispara vibração forte nativa + Web Vibrate fallback
   */
  async triggerVibration(pattern = 'strong') {
    // 1. Vibração nativa do sistema via navigator.vibrate (funciona no Android WebView)
    if (navigator.vibrate) {
      if (pattern === 'urgent') {
        // Padrão urgente: vibra-pausa-vibra-pausa-vibra longa
        navigator.vibrate([400, 200, 400, 200, 800]);
      } else {
        // Padrão forte normal
        navigator.vibrate([300, 150, 500]);
      }
    }

    // 2. Haptics nativo do Capacitor (complementar)
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(async () => {
          try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
          } catch (e) {}
        }, 250);
        setTimeout(async () => {
          try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
          } catch (e) {}
        }, 500);
      } catch (e) {
        console.warn('[NotificationService] Erro no Haptics:', e);
      }
    }
  }

  /**
   * Notifica a chegada de uma nova Ordem de Serviço
   */
  async notifyNewTask({ id, title, description, osNumber, auditor }) {
    await this.init();

    // 1. Som de alerta (funciona em foreground)
    this.playBeep();

    // 2. Vibração forte
    await this.triggerVibration('urgent');

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
              sound: 'default', // Som nativo do sistema (funciona em background)
              ongoing: false,
              autoCancel: true,
              extra: { taskId: id, osNumber },
            },
          ],
        });
      } catch (err) {
        console.warn('[NotificationService] Erro ao agendar LocalNotification (nova OS):', err);
      }
    }
  }

  /**
   * Notifica a remoção/reatribuição de uma Ordem de Serviço
   */
  async notifyTaskRemoved({ id, osNumber, reason }) {
    await this.init();

    // 1. Som de alerta
    this.playBeep();

    // 2. Vibração padrão
    await this.triggerVibration('strong');

    // 3. Notificação nativa
    if (Capacitor.isNativePlatform()) {
      try {
        const notifId = Math.floor(Math.random() * 1000000);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title: `⚠️ OS REMOVIDA: #${osNumber || id || ''}`,
              body: reason || 'Uma ordem de serviço foi retirada da sua agenda. Verifique suas tarefas atuais.',
              channelId: 'os_removidas',
              sound: 'default',
              ongoing: false,
              autoCancel: true,
              extra: { taskId: id, osNumber, action: 'removed' },
            },
          ],
        });
      } catch (err) {
        console.warn('[NotificationService] Erro ao agendar LocalNotification (OS removida):', err);
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
