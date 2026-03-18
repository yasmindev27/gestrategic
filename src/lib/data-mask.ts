/**
 * Utilitários de Mascaramento de Dados Sensíveis
 * LGPD Art. 46: Proteção de dados pessoais e financeiros.
 *
 * Dados são mascarados por padrão em listagens gerais.
 * A revelação completa exige permissão explícita (admin/rh_dp).
 */

/**
 * Mascara CPF — exibe apenas os dígitos centrais.
 * Ex: "123.456.789-00" → "***.456.***-00"
 * @param cpf String do CPF (formatado ou não)
 * @param reveal Se true, retorna o CPF completo
 */
export function maskCPF(cpf: string | null | undefined, reveal = false): string {
  if (!cpf) return "—";
  if (reveal) return cpf;

  // Remove não-dígitos para processar
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***.***.***-**";

  // Formato: ***.456.789-**
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

/**
 * Mascara valor salarial — oculta o valor real.
 * Ex: 5500.00 → "R$ *.***.** " ou "R$ 5.500,00" se revelado
 * @param value Valor numérico
 * @param reveal Se true, exibe o valor real
 */
export function maskSalary(value: number | null | undefined, reveal = false): string {
  if (value == null) return "—";
  if (reveal) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }
  return "R$ *.***.** ";
}

/**
 * Mascara texto de motivo disciplinar — exibe apenas início.
 * Ex: "Insubordinação durante plantão..." → "Insubor***"
 * @param text Texto do motivo
 * @param reveal Se true, exibe o texto completo
 * @param visibleChars Número de caracteres visíveis (padrão: 8)
 */
export function maskSensitiveText(
  text: string | null | undefined,
  reveal = false,
  visibleChars = 8
): string {
  if (!text) return "—";
  if (reveal) return text;
  if (text.length <= visibleChars) return text.slice(0, 4) + "***";
  return text.slice(0, visibleChars) + "***";
}

/**
 * Mascara número de matrícula — exibe apenas os 3 últimos dígitos.
 * Ex: "000123" → "***123"
 * @param matricula String da matrícula
 * @param reveal Se true, exibe a matrícula completa
 */
export function maskMatricula(matricula: string | null | undefined, reveal = false): string {
  if (!matricula) return "—";
  if (reveal) return matricula;
  if (matricula.length <= 3) return "***";
  return "***" + matricula.slice(-3);
}

/**
 * Mascara email — exibe apenas o domínio.
 * Ex: "joao.silva@hospital.com" → "j***.***@hospital.com"
 */
export function maskEmail(email: string | null | undefined, reveal = false): string {
  if (!email) return "—";
  if (reveal) return email;
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.charAt(0)}***@${domain}`;
}
