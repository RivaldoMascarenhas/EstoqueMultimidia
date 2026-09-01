/**
 * Política de Segurança Institucional de Senhas - UniFAP
 * 
 * Regras:
 * 1. Mínimo de 10 caracteres
 * 2. Conter pelo menos uma letra (a-z ou A-Z)
 * 3. Conter pelo menos um número (0-9)
 * 4. Conter pelo menos um caractere especial (!@#$%^&*...)
 * 5. Rejeitar senhas triviais e padrões comuns conhecidos
 */

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecialChar?: boolean;
  isNotCommon?: boolean;
  error?: string;
}

const TRIVIAL_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password123",
  "admin12345",
  "unifap1234",
  "unifap2026",
  "qwerty1234",
  "mudar12345",
  "trocar1234",
]);

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      hasMinLength: false,
      hasLetter: false,
      hasNumber: false,
      isNotCommon: false,
      error: "A senha não pode ser vazia.",
    };
  }

  const hasMinLength = password.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isNotCommon = !TRIVIAL_PASSWORDS.has(password.toLowerCase().trim());

  if (!hasMinLength) {
    return {
      isValid: false,
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecialChar,
      isNotCommon,
      error: "A senha deve possuir no mínimo 10 caracteres.",
    };
  }

  if (!hasLetter) {
    return {
      isValid: false,
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecialChar,
      isNotCommon,
      error: "A senha deve conter pelo menos uma letra.",
    };
  }

  if (!hasNumber) {
    return {
      isValid: false,
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecialChar,
      isNotCommon,
      error: "A senha deve conter pelo menos um número.",
    };
  }

  if (!hasSpecialChar) {
    return {
      isValid: false,
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecialChar,
      isNotCommon,
      error: "A senha deve conter pelo menos um caractere especial (ex: @, #, $, %, !, &).",
    };
  }

  if (!isNotCommon) {
    return {
      isValid: false,
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecialChar,
      isNotCommon,
      error: "Esta senha é muito comum e insegura. Escolha uma senha mais complexa.",
    };
  }

  return {
    isValid: true,
    hasMinLength: true,
    hasLetter: true,
    hasNumber: true,
    hasSpecialChar: true,
    isNotCommon: true,
  };
}
