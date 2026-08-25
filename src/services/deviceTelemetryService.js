import { supabase } from '../supabaseClient';

/**
 * Serviço avançado de auditoria de dispositivo e telemetria para rastreabilidade de acessos e operações
 */
export const deviceTelemetryService = {
  /**
   * Obtém informações detalhadas do hardware, navegador, sistema e rede do usuário
   */
  async getDeviceInfo() {
    const info = {
      brand: 'Desconhecido',
      model: 'Dispositivo Padrão',
      osName: 'Web/Desconhecido',
      osVersion: 'N/A',
      appVersion: '1.1.0',
      screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      networkType: 'online',
      batteryLevel: null,
      isCharging: null,
      userAgent: navigator.userAgent || ''
    };

    // 1. Detecção de SO e Dispositivo via User-Agent & navigator
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) {
      info.osName = 'Android';
      const match = ua.match(/Android\s([0-9\.]+)/i);
      if (match) info.osVersion = match[1];

      // Tenta extrair modelo (ex: SM-A546E, moto g84, etc.)
      const modelMatch = ua.match(/;\s?([^;]+)\sBuild/i);
      if (modelMatch && modelMatch[1]) {
        const rawModel = modelMatch[1].trim();
        info.model = rawModel;
        if (/samsung|sm-/i.test(rawModel)) info.brand = 'Samsung';
        else if (/motorola|moto/i.test(rawModel)) info.brand = 'Motorola';
        else if (/xiaomi|redmi|poco/i.test(rawModel)) info.brand = 'Xiaomi';
        else if (/lg/i.test(rawModel)) info.brand = 'LG';
        else info.brand = 'Android Device';
      } else {
        info.brand = 'Smartphone Android';
      }
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      info.osName = 'iOS';
      info.brand = 'Apple';
      info.model = /ipad/i.test(ua) ? 'iPad' : 'iPhone';
      const match = ua.match(/OS\s([0-9\_]+)/i);
      if (match) info.osVersion = match[1].replace(/_/g, '.');
    } else if (/windows/i.test(ua)) {
      info.osName = 'Windows';
      info.brand = 'PC / Desktop';
      info.model = 'Estação Windows';
      if (/Windows NT 10.0/i.test(ua)) info.osVersion = '10 / 11';
    } else if (/macintosh|mac os x/i.test(ua)) {
      info.osName = 'macOS';
      info.brand = 'Apple';
      info.model = 'Macintosh';
    }

    // 2. Detecção com Client Hints (Chrome/Android modernos)
    if (navigator.userAgentData) {
      try {
        const uaData = await navigator.userAgentData.getHighEntropyValues?.(['model', 'platformVersion', 'architecture']) || {};
        if (uaData.model) info.model = uaData.model;
        if (uaData.platform) info.osName = uaData.platform;
        if (uaData.platformVersion) info.osVersion = uaData.platformVersion;
      } catch (e) {}
    }

    // 3. Conexão de Rede
    if (navigator.connection) {
      info.networkType = navigator.connection.effectiveType || navigator.connection.type || 'online';
    }

    // 4. Bateria
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        info.batteryLevel = Math.round((battery.level || 0) * 100);
        info.isCharging = !!battery.charging;
      } catch (e) {}
    }

    return info;
  },

  /**
   * Obtém fix de geolocalização rápido com timeout seguro de 4s
   */
  async getCurrentLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || null,
            speed: pos.coords.speed || null,
            heading: pos.coords.heading || null
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 }
      );
    });
  },

  /**
   * Registra um evento de auditoria de login, início de turno, refeição ou encerramento
   */
  async logAuditEvent({ auditor, tipoEvento, enderecoAproximado = '', rawDetails = {} }) {
    if (!auditor) return null;
    try {
      const [device, geo] = await Promise.all([
        this.getDeviceInfo(),
        this.getCurrentLocation()
      ]);

      const payload = {
        auditor: String(auditor).trim().toLowerCase(),
        tipo_evento: tipoEvento,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 10),
        lat: geo?.lat || null,
        lng: geo?.lng || null,
        accuracy: geo?.accuracy || null,
        endereco_aproximado: enderecoAproximado || null,
        device_brand: device.brand,
        device_model: device.model,
        os_name: device.osName,
        os_version: device.osVersion,
        app_version: device.appVersion,
        screen_resolution: device.screenResolution,
        network_type: device.networkType,
        battery_level: device.batteryLevel,
        battery_charging: device.isCharging,
        raw_telemetry: {
          ...device,
          ...geo,
          ...rawDetails,
          logged_at: new Date().toISOString()
        }
      };

      // Tenta gravar na tabela dedicada se existir
      try {
        const { error } = await supabase.from('autofiscalizacao_auditoria_logins').insert([payload]);
        if (!error) {
          return payload;
        }
      } catch (errDb) {}

      // Gravação em cache local de contingência
      try {
        const cacheKey = `fleet_audit_logs_${payload.auditor}`;
        const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        existing.unshift(payload);
        localStorage.setItem(cacheKey, JSON.stringify(existing.slice(0, 50)));
      } catch (e) {}

      return payload;
    } catch (err) {
      console.warn('[TelemetryService] Falha ao registrar evento de telemetria:', err);
      return null;
    }
  },

  /**
   * Recupera histórico de auditoria combinando tabela do Supabase com contingência local
   */
  async fetchAuditEvents(auditorLogin, dateStr) {
    if (!auditorLogin) return [];
    const cleanAuditor = String(auditorLogin).trim().toLowerCase();
    try {
      let query = supabase
        .from('autofiscalizacao_auditoria_logins')
        .select('*')
        .ilike('auditor', cleanAuditor)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (dateStr) {
        query = query.eq('date', dateStr);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {}

    // Fallback para cache local
    try {
      const cacheKey = `fleet_audit_logs_${cleanAuditor}`;
      const local = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      if (dateStr) {
        return local.filter(l => l.date === dateStr);
      }
      return local;
    } catch {
      return [];
    }
  }
};

export default deviceTelemetryService;
