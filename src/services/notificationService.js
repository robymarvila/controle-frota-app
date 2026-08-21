import { Capacitor, registerPlugin } from '@capacitor/core';

const FleetLocation = registerPlugin('FleetLocation');

/**
 * NotificationService v3.1 (Material 3 Expressive & Native Android Integrated)
 * 
 * Serviço de notificações oficial de campo:
 * - 🚨 Nova OS Despachada: Som de chamado + Vibração dupla forte + Banner com número da OS, tipo e endereço.
 * - ⚠️ OS Retirada da Carga: Som de alerta + Vibração de aviso informando a remoção da tarefa.
 * - ⏸️ OS Suspensa: Vibração e banner informando a suspensão e o motivo.
 * - 🔄 Reordenação de Rota: Notificação avisando que o controlador alterou a ordem de atendimento das tarefas.
 * - 🛑 Turno Encerrado pelo Operador: Alerta avisando que o controlador finalizou o turno.
 */
class NotificationService {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Dispara notificação nativa no Android via FleetLocation Plugin
   */
  async sendNative({ title, message, type = 'dispatch', osNumber = '' }) {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await FleetLocation.sendNativeNotification({
          title,
          message,
          type,
          osNumber: String(osNumber || '')
        });
        console.log('[NotificationService] Notificação Nativa Android enviada:', res);
        return true;
      } catch (err) {
        console.warn('[NotificationService] Falha ao enviar notificação nativa:', err);
      }
    }

    // Fallback Web Audio + Vibração Web para testes no navegador desktop
    this.playWebAlertSound(type);
    this.triggerWebVibration(type);
    return false;
  }

  /**
   * 1. 🚨 Nova OS Despachada
   */
  async notifyNewTask({ osNumber, endereco, tipoAtividade, horario, auditor }) {
    const title = `🚨 Nova OS Despachada: #${osNumber || 'NOVA'}`;
    const activityDesc = tipoAtividade ? `${tipoAtividade} • ` : '';
    const timeDesc = horario ? `[${horario}] ` : '';
    const locDesc = endereco ? `${endereco}` : 'Verifique os detalhes no aplicativo.';
    const message = `${timeDesc}${activityDesc}${locDesc}`;

    await this.sendNative({
      title,
      message,
      type: 'dispatch',
      osNumber
    });
  }

  /**
   * 2. ⚠️ OS Retirada da Carga
   */
  async notifyTaskRemoved({ osNumber, reason }) {
    const title = `⚠️ OS Retirada da Carga: #${osNumber || ''}`;
    const message = reason || 'A ordem de serviço foi retirada da sua carga pelo controlador.';

    await this.sendNative({
      title,
      message,
      type: 'removal',
      osNumber
    });
  }

  /**
   * 3. ⏸️ OS Suspensa
   */
  async notifyTaskSuspended({ osNumber, reason }) {
    const title = `⏸️ OS Suspensa: #${osNumber || ''}`;
    const message = reason ? `Motivo: ${reason}` : 'A OS foi suspensa temporariamente pelo controlador.';

    await this.sendNative({
      title,
      message,
      type: 'suspend',
      osNumber
    });
  }

  /**
   * 4. 🔄 Reordenação de Rota
   */
  async notifyRouteReordered({ totalTasks = 0 }) {
    const title = `🔄 Reordenação de Rota`;
    const message = `O controlador alterou a ordem de atendimento das tarefas da sua rota.`;

    await this.sendNative({
      title,
      message,
      type: 'route'
    });
  }

  /**
   * 5. 🛑 Turno Encerrado pelo Operador
   */
  async notifyShiftClosedByController() {
    const title = `🛑 Turno Encerrado pelo Operador`;
    const message = `Seu turno operacional foi finalizado pelo controlador.`;

    await this.sendNative({
      title,
      message,
      type: 'shift_end'
    });
  }

  /**
   * Fallback de som Web sintetizado para testes no navegador
   */
  playWebAlertSound(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'dispatch' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(type === 'dispatch' ? 980 : 650, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  /**
   * Fallback de vibração Web
   */
  triggerWebVibration(type) {
    if (navigator.vibrate) {
      if (type === 'dispatch') {
        navigator.vibrate([350, 150, 350, 150, 600]);
      } else {
        navigator.vibrate([400, 200, 400]);
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
