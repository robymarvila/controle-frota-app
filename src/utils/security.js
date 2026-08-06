// ============================================================================
// MÓDULO DE SEGURANÇA ENTERPRISE & CRIPTOGRAFIA (Zero-Knowledge)
// ============================================================================

/**
 * Normaliza qualquer string para comparação insensível a acentos, maiúsculas e espaços.
 * Ex: 'Operações' -> 'OPERACOES', 'Compras' -> 'COMPRAS', 'T.I' -> 'TI'
 */
export const normalizeKey = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim()
    .toUpperCase();
};

/**
 * Criptografa uma senha em texto puro utilizando SHA-256 nativo da Web Crypto API com Salt.
 * Retorna uma string segura prefixada com 'sha256:'.
 */
export const hashPassword = async (plainText, salt = 'alpitel_fleet_salt_2026') => {
  if (!plainText) return '';
  try {
    const msgBuffer = new TextEncoder().encode(String(plainText) + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Erro ao gerar hash de senha:', err);
    throw err;
  }
};

/**
 * Valida se uma senha digitada corresponde ao hash gravado ou senha legada.
 * Retorna { isValid: boolean, isLegacy: boolean } para suporte a Lazy Migration.
 */
export const verifyPassword = async (plainInput, storedHashOrPlain) => {
  if (!plainInput || !storedHashOrPlain) return { isValid: false, isLegacy: false };

  const storedStr = String(storedHashOrPlain).trim();
  const inputStr = String(plainInput).trim();

  // 1. Caso a senha no banco já seja um hash SHA-256
  if (storedStr.startsWith('sha256:')) {
    const computedHash = await hashPassword(inputStr);
    return {
      isValid: computedHash === storedStr,
      isLegacy: false
    };
  }

  // 2. Retrocompatibilidade: Senha legada em texto puro
  const isMatchLegacy = inputStr === storedStr;
  return {
    isValid: isMatchLegacy,
    isLegacy: isMatchLegacy // indica que precisa ser atualizada para hash no banco
  };
};

/**
 * Validação de robustez mínima da senha (pelo menos 6 caracteres).
 */
export const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'A senha não pode estar em branco.' };
  }
  if (password.length < 6) {
    return { isValid: false, message: 'A senha deve conter no mínimo 6 caracteres.' };
  }
  return { isValid: true, message: 'Senha válida.' };
};
