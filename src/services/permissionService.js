import { Capacitor } from '@capacitor/core';

/**
 * PermissionService v2.0
 * 
 * Serviço centralizado de verificação e solicitação de permissões Android.
 * Verifica: Localização (foreground + background), Otimização de Bateria (Doze), Notificações.
 * 
 * Integrado com a tela de onboarding do AutoFiscalizacaoView para
 * guiar o auditor pelas permissões necessárias.
 */
class PermissionService {
  constructor() {
    this._cachedStatus = null;
    this._listeners = [];
  }

  isNative() {
    return Capacitor.isNativePlatform();
  }

  /**
   * Verifica TODAS as permissões críticas e retorna um objeto de status.
   * Retorna: { location, backgroundLocation, batteryOptimized, notifications, allGranted }
   */
  async checkAll() {
    if (!this.isNative()) {
      // No modo web, simular tudo como concedido
      return {
        location: true,
        backgroundLocation: true,
        batteryOptimized: false, // false = SEM otimização = bom
        notifications: true,
        allGranted: true,
      };
    }

    const status = {
      location: false,
      backgroundLocation: false,
      batteryOptimized: true, // true = COM otimização = ruim para background
      notifications: false,
      allGranted: false,
    };

    try {
      // 1. Verificar permissão de localização foreground
      const { Geolocation } = await import('@capacitor/geolocation');
      const locPerm = await Geolocation.checkPermissions();
      status.location = locPerm.location === 'granted' || locPerm.coarseLocation === 'granted';
      
      // Background location — Android separa foreground de background
      // Se coarseLocation ou location está granted, verificamos se background também
      // No Android, 'granted' para background é retornado separadamente
      // O plugin @capacitor/geolocation não diferencia bem — usamos o plugin BackgroundGeolocation
      try {
        const { registerPlugin } = await import('@capacitor/core');
        const BGGeo = registerPlugin('BackgroundGeolocation');
        // Se conseguimos chamar addWatcher com requestPermissions:false sem erro,
        // a permissão background está concedida. Mas não queremos iniciar um watcher.
        // Heurística: se location está granted e o plugin não rejeita, consideramos background OK
        status.backgroundLocation = status.location; // Simplificação — o plugin solicita em runtime
      } catch (e) {
        status.backgroundLocation = status.location;
      }
    } catch (e) {
      console.warn('[PermissionService] Erro ao verificar localização:', e);
    }

    try {
      // 2. Verificar otimização de bateria (Doze mode)
      // Android: PowerManager.isIgnoringBatteryOptimizations()
      // Capacitor não expõe isso diretamente — usamos um workaround via plugin
      // Se REQUEST_IGNORE_BATTERY_OPTIMIZATIONS está no manifest, podemos solicitar
      // Mas verificar requer código nativo. Usamos heurística:
      // Se o plugin BGGeo funciona em background, Doze pode não ser problema.
      // Para detecção real, precisaríamos de um plugin Capacitor customizado.
      // Por ora, marcamos como 'desconhecido' e orientamos o usuário a verificar manualmente
      status.batteryOptimized = 'unknown'; // Orientar usuário a desativar manualmente
    } catch (e) {
      console.warn('[PermissionService] Erro ao verificar bateria:', e);
    }

    try {
      // 3. Verificar permissão de notificações (Android 13+)
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const notifPerm = await LocalNotifications.checkPermissions();
      status.notifications = notifPerm.display === 'granted';
    } catch (e) {
      console.warn('[PermissionService] Erro ao verificar notificações:', e);
    }

    // allGranted = tudo OK
    status.allGranted = status.location && status.notifications;

    this._cachedStatus = status;
    return status;
  }

  /**
   * Solicita permissão de localização foreground
   */
  async requestLocation() {
    if (!this.isNative()) return true;
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const result = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
      return result.location === 'granted' || result.coarseLocation === 'granted';
    } catch (e) {
      console.warn('[PermissionService] Erro ao solicitar localização:', e);
      return false;
    }
  }

  /**
   * Solicita permissão de notificações (Android 13+)
   */
  async requestNotifications() {
    if (!this.isNative()) return true;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (e) {
      console.warn('[PermissionService] Erro ao solicitar notificações:', e);
      return false;
    }
  }

  /**
   * Abre as configurações do app no Android (para o usuário conceder permissões manualmente)
   */
  async openAppSettings() {
    if (!this.isNative()) return;
    try {
      const { registerPlugin } = await import('@capacitor/core');
      const BGGeo = registerPlugin('BackgroundGeolocation');
      await BGGeo.openSettings();
    } catch (e) {
      console.warn('[PermissionService] Erro ao abrir configurações:', e);
    }
  }

  /**
   * Abre as configurações de bateria do app no Android.
   * Em Android 6+, envia intent ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
   * via abertura das configurações do app (já que Capacitor não expõe isso diretamente).
   */
  async openBatterySettings() {
    if (!this.isNative()) return;
    try {
      // Usa o mesmo openSettings do plugin que abre a tela de detalhes do app
      // onde o usuário pode ver e alterar a otimização de bateria
      const { registerPlugin } = await import('@capacitor/core');
      const BGGeo = registerPlugin('BackgroundGeolocation');
      await BGGeo.openSettings();
    } catch (e) {
      console.warn('[PermissionService] Erro ao abrir configurações de bateria:', e);
    }
  }

  /**
   * Chamado quando o app retorna ao foreground (resume).
   * Re-verifica permissões e notifica listeners.
   */
  async onResume() {
    const status = await this.checkAll();
    this._listeners.forEach(fn => {
      try { fn(status); } catch (e) {}
    });
    return status;
  }

  /**
   * Registra um listener para mudanças de permissão
   */
  addListener(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  /**
   * Retorna o último status verificado sem fazer nova consulta
   */
  getCachedStatus() {
    return this._cachedStatus;
  }
}

export const permissionService = new PermissionService();
export default permissionService;
