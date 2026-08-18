/**
 * Política de Segurança Institucional de Senhas - UniFAP
 * 
 * Regras:
 * 1. Mínimo de 6 caracteres
 * 2. Conter pelo menos uma letra (a-z ou A-Z)
 * 3. Conter pelo menos um número (0-9)
 */

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  error?: string;
}

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      hasMinLength: false,
      hasLetter: false,
      hasNumber: false,
      error: "A senha não pode ser vazia.",
    };
  }

  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasMinLength) {
    return {
      isValid: false,
      hasMinLength,
      hasLetter,
      hasNumber,
      error: "A senha deve possuir no mínimo 6 caracteres.",
    };
  }

  if (!hasLetter) {
    return {
      isValid: false,
      hasMinLength,
      hasLetter,
      hasNumber,
      error: "A senha deve conter pelo menos uma letra.",
    };
  }

  if (!hasNumber) {
    return {
      isValid: false,
      hasMinLength,
      hasLetter,
      hasNumber,
      error: "A senha deve conter pelo menos um número.",
    };
  }

  return {
    isValid: true,
    hasMinLength: true,
    hasLetter: true,
    hasNumber: true,
  };
}
