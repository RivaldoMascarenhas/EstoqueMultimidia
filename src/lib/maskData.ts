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

/**
 * Mascara o nome para exibição pública ou telões (ex: "Maria Santos" -> "Maria S.")
 */
export function maskName(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || "";
  return `${firstName} ${lastInitial}.`;
}

/**
 * Sanitiza objeto de empréstimo para perfil CONSULTA (somente leitura sem PII desnecessário)
 */
export function sanitizeLoanForRole(loan: any, userRole?: string): any {
  if (!loan) return loan;
  if (userRole === "ADMIN" || userRole === "GESTOR" || userRole === "OPERADOR") {
    return loan;
  }

  // CONSULTA / Outros papéis restritos
  return {
    ...loan,
    borrowerEmail: loan.borrowerEmail ? maskEmail(loan.borrowerEmail) : null,
    borrowerPhone: loan.borrowerPhone ? maskPhone(loan.borrowerPhone) : null,
    borrowerWhatsapp: loan.borrowerWhatsapp ? maskPhone(loan.borrowerWhatsapp) : null,
    borrowerDocument: loan.borrowerDocument ? maskCpf(loan.borrowerDocument) : null,
    notes: loan.notes ? "Informações restritas ao operador" : null,
  };
}
