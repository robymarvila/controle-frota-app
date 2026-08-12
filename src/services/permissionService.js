import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * PermissionService — Gerenciamento centralizado de permissões nativas Android
 * 
 * Verifica e solicita:
 * - Localização Foreground (ACCESS_FINE_LOCATION)
 * - Localização Background (ACCESS_BACKGROUND_LOCATION) → "Permitir o tempo todo"
 * - Exclusão de Otimização de Bateria (Doze Mode)
 * - Notificações (POST_NOTIFICATIONS, Android 13+)
 */
class PermissionService {
  constructor() {
    this._listeners = [];
    this._resumeListenerActive = false;
  }

  isNative() {
    return Capacitor.isNativePlatform();
  }

  /**
   * Verifica todas as permissões necessárias de uma vez.
   * Retorna um objeto com o estado de cada permissão.
   */
  async checkAllPermissions() {
    if (!this.isNative()) {
      return {
        locationForeground: true,
        locationBackground: true,
        batteryOptimized: false, // false = não otimizado = bom
        notifications: true,
        allGranted: true,
      };
    }

    const [locationFg, locationBg, notifs] = await Promise.all([
      this.checkForegroundLocation(),
      this.checkBackgroundLocation(),
      this.checkNotifications(),
    ]);

    return {
      locationForeground: locationFg,
      locationBackground: locationBg,
      batteryOptimized: false, // Heurística otimista — plugin gerencia via foreground service
      notifications: notifs,
      allGranted: locationFg && locationBg && notifs,
    };
  }

  /**
   * Verifica se a localização foreground está concedida.
   */
  async checkForegroundLocation() {
    if (!this.isNative()) return true;
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.checkPermissions();
      return perm.location === 'granted';
    } catch (e) {
      console.warn('[PermissionService] Erro ao checar localização foreground:', e);
      return false;
    }
  }

  /**
   * Verifica se a localização em background ("O tempo todo") está concedida.
   * 
   * O plugin @capacitor/geolocation reporta location='granted' tanto para
   * "Apenas enquanto usa" quanto para "Permitir o tempo todo".
   * Usamos a verificação dupla de location + coarseLocation como heurística.
   */
  async checkBackgroundLocation() {
    if (!this.isNative()) return true;
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') return false;
      // Verificação extra: coarseLocation granted indica maior confiança
      if (perm.coarseLocation && perm.coarseLocation !== 'granted') return false;
      return true;
    } catch (e) {
      console.warn('[PermissionService] Erro ao checar localização background:', e);
      return false;
    }
  }

  /**
   * Verifica se as notificações estão permitidas (Android 13+).
   */
  async checkNotifications() {
    if (!this.isNative()) return true;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const perm = await LocalNotifications.checkPermissions();
      return perm.display === 'granted';
    } catch (e) {
      console.warn('[PermissionService] Erro ao checar notificações:', e);
      return true; // Assume permitido se falhar
    }
  }

  /**
   * Solicita permissão de localização foreground.
   */
  async requestForegroundLocation() {
    if (!this.isNative()) return true;
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.requestPermissions();
      return perm.location === 'granted';
    } catch (e) {
      console.warn('[PermissionService] Erro ao solicitar localização:', e);
      return false;
    }
  }

  /**
   * Solicita permissão de notificações (Android 13+).
   */
  async requestNotifications() {
    if (!this.isNative()) return true;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    } catch (e) {
      console.warn('[PermissionService] Erro ao solicitar notificações:', e);
      return true;
    }
  }

  /**
   * Abre as configurações do app no Android para que o usuário possa:
   * - Alterar permissão de localização para "Permitir o tempo todo"
   * - Alterar otimização de bateria para "Sem restrições"
   */
  async openAppSettings() {
    if (!this.isNative()) return;
    try {
      const { registerPlugin } = await import('@capacitor/core');
      const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');
      await BackgroundGeolocation.openSettings();
    } catch (e) {
      console.warn('[PermissionService] Erro ao abrir configurações:', e);
    }
  }

  /**
   * Registra um callback que é chamado toda vez que o app retorna ao foreground.
   * Usado para re-verificar permissões após o usuário voltar das configurações.
   * Retorna função de cleanup para remover o listener.
   */
  onResume(callback) {
    if (!this.isNative()) return () => {};

    const listener = App.addListener('appStateChange', async (state) => {
      if (state.isActive) {
        try {
          await callback();
        } catch (e) {
          console.warn('[PermissionService] Erro no callback de resume:', e);
        }
      }
    });

    this._listeners.push(listener);

    return () => {
      if (listener && listener.remove) {
        listener.remove();
      }
    };
  }

  /**
   * Remove todos os listeners registrados.
   */
  cleanup() {
    this._listeners.forEach(l => {
      if (l && l.remove) l.remove();
    });
    this._listeners = [];
  }
}

export const permissionService = new PermissionService();
export default permissionService;
