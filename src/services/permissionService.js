import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';

const FleetLocation = registerPlugin('FleetLocation');

/**
 * PermissionService v4.0 (100% Nativo via FleetLocation)
 * 
 * Gerencia o ciclo completo e verificação estrita de permissões:
 * 1. Localização em Primeiro Plano (GPS Preciso)
 * 2. Localização em Segundo Plano ("Permitir o tempo todo")
 * 3. Notificações de Foreground Service (Android 13+)
 * 4. Isenção de Economia de Bateria (Doze Mode / Sem Restrições)
 */
class PermissionService {
  constructor() {
    this._cachedStatus = null;
    this._listeners = [];
    this._initAppListener();
  }

  isNative() {
    return Capacitor.isNativePlatform();
  }

  _initAppListener() {
    if (this.isNative()) {
      try {
        App.addListener('appStateChange', async (state) => {
          if (state.isActive) {
            console.log('[PermissionService] App retornou ao foreground — revalidando permissões...');
            await this.onResume();
          }
        });
      } catch (e) {
        console.warn('[PermissionService] Falha ao registrar appStateChange:', e);
      }
    }
  }

  /**
   * Verifica TODAS as permissões críticas via chamada nativa Java no Android.
   */
  async checkAll() {
    if (!this.isNative()) {
      return {
        locationForeground: true,
        locationBackground: true,
        location: true,
        notifications: true,
        batteryOptimized: false, // false = sem restrição = bom
        batteryIgnored: true,
        allGranted: true,
      };
    }

    try {
      const res = await FleetLocation.checkAllPermissions();
      const status = {
        locationForeground: !!res.locationForeground,
        locationBackground: !!res.locationBackground,
        location: !!(res.locationForeground && res.locationBackground),
        notifications: !!res.notifications,
        batteryOptimized: !!res.batteryOptimized, // true = restrito (ruim)
        batteryIgnored: !!res.batteryIgnored,     // true = sem restrição (bom)
        allGranted: !!res.allGranted,
      };

      this._cachedStatus = status;
      return status;
    } catch (e) {
      console.warn('[PermissionService] Erro ao checar permissões nativas:', e);
      return {
        locationForeground: false,
        locationBackground: false,
        location: false,
        notifications: false,
        batteryOptimized: true,
        batteryIgnored: false,
        allGranted: false,
      };
    }
  }

  /**
   * Solicita localização passo-a-passo (Primeiro Plano -> Segundo Plano / "O tempo todo")
   */
  async requestLocation() {
    if (!this.isNative()) return true;
    try {
      const status = await this.checkAll();
      if (!status.locationForeground) {
        const res1 = await FleetLocation.requestLocationForeground();
        if (!res1?.granted) return false;
      }

      // Se já tem foreground, pede background ("Permitir o tempo todo")
      const res2 = await FleetLocation.requestLocationBackground();
      return !!(res2?.granted || res2?.openedSettings);
    } catch (e) {
      console.warn('[PermissionService] Erro ao solicitar localização:', e);
      return false;
    }
  }

  /**
   * Solicita permissão nativa de notificações (Android 13+)
   */
  async requestNotifications() {
    if (!this.isNative()) return true;
    try {
      const res = await FleetLocation.requestNotificationPermission();
      return !!res?.granted;
    } catch (e) {
      console.warn('[PermissionService] Erro ao solicitar notificações:', e);
      return false;
    }
  }

  /**
   * Solicita isenção de economia de bateria (Doze Mode)
   */
  async requestBatteryExemption() {
    if (!this.isNative()) return true;
    try {
      const res = await FleetLocation.requestBatteryExemption();
      return !!res?.isIgnoring;
    } catch (e) {
      console.warn('[PermissionService] Erro ao solicitar isenção de bateria:', e);
      return false;
    }
  }

  /**
   * Abre as configurações gerais do aplicativo
   */
  async openAppSettings() {
    if (!this.isNative()) return;
    try {
      await FleetLocation.openAppSettings();
    } catch (e) {
      console.warn('[PermissionService] Erro ao abrir configurações:', e);
    }
  }

  async openBatterySettings() {
    return await this.requestBatteryExemption();
  }

  /**
   * Revalida todas as permissões e avisa listeners
   */
  async onResume() {
    const status = await this.checkAll();
    this._listeners.forEach(fn => {
      try { fn(status); } catch (e) {}
    });
    return status;
  }

  addListener(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  getCachedStatus() {
    return this._cachedStatus;
  }
}

export const permissionService = new PermissionService();
export default permissionService;
