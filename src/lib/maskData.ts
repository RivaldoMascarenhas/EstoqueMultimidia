/**
 * Utilitários de Mascaramento e Minimização de Dados Pessoais (LGPD - Art. 6º, III)
 */

/**
 * Mascara o CPF no formato ***.456.789-** ou ***.***.***-**
 */
export function maskCpf(cpf?: string | null): string {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return "***.***.***-**";
  return `***.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-**`;
}

/**
 * Mascara o e-mail no formato r****o@unifapce.edu.br
 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "";
  const [user, domain] = email.split("@");
  if (user.length <= 2) {
    return `*@${domain}`;
  }
  const maskedUser = `${user[0]}${"*".repeat(Math.min(user.length - 2, 5))}${user[user.length - 1]}`;
  return `${maskedUser}@${domain}`;
}

/**
 * Mascara o telefone no formato (88) 9****-1234
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return "(**) *****-****";
  const ddd = cleaned.substring(0, 2);
  const lastFour = cleaned.substring(cleaned.length - 4);
  return `(${ddd}) 9****-${lastFour}`;
}
