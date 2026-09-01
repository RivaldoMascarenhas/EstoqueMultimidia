/**
 * Verifica se um CPF é matematicamente válido segundo as regras da Receita Federal.
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  const cleanCpf = cpf.replace(/[^\d]+/g, "");
  
  // Verifica comprimento e sequências repetidas (ex: 111.111.111-11)
  if (cleanCpf.length !== 11 || /^(\d)\1+$/.test(cleanCpf)) {
    return false;
  }

  // Validação do Primeiro Dígito Verificador
  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;

  // Validação do Segundo Dígito Verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;

  return true;
}

/**
 * Verifica se o telefone é um formato brasileiro válido (Fixo ou Celular).
 * Aceita DDD + 8 dígitos (Fixo) ou DDD + 9 dígitos (Celular).
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/[^\d]+/g, "");
  
  // Telefone Fixo (10 dígitos) ou Celular (11 dígitos)
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}
