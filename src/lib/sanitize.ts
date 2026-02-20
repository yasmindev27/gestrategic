/**
 * Utilitários de Sanitização e Validação de Inputs
 * Proteção contra XSS, Injection e dados malformados.
 *
 * NOTA: SQL Injection é prevenido pelo Supabase via queries parametrizadas.
 * Este módulo foca em XSS e dados inválidos no frontend.
 */

/**
 * Remove tags HTML e caracteres perigosos de uma string.
 * Uso: sanitizar inputs de texto livre antes de renderizar.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";

  return input
    .replace(/<[^>]*>/g, "") // Remove tags HTML
    .replace(/javascript:/gi, "") // Remove javascript: URIs
    .replace(/on\w+=/gi, "") // Remove event handlers (onclick=, etc.)
    .replace(/[<>"'`]/g, (char) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;",
      };
      return entities[char] || char;
    })
    .trim();
}

/**
 * Sanitiza e limita o comprimento de um campo de texto.
 * @param input Texto do input
 * @param maxLength Comprimento máximo (padrão: 500)
 */
export function sanitizeAndLimit(input: string, maxLength = 500): string {
  return sanitizeText(input).slice(0, maxLength);
}

/**
 * Valida formato de matrícula (somente dígitos, 4-10 chars).
 */
export function validateMatricula(value: string): { valid: boolean; error?: string } {
  if (!value) return { valid: true }; // opcional
  if (!/^\d+$/.test(value)) return { valid: false, error: "Matrícula deve conter apenas números" };
  if (value.length < 3) return { valid: false, error: "Matrícula muito curta (mín. 3 dígitos)" };
  if (value.length > 12) return { valid: false, error: "Matrícula muito longa (máx. 12 dígitos)" };
  return { valid: true };
}

/**
 * Valida formato de CPF (11 dígitos, com algoritmo de verificação).
 */
export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false; // todos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(digits[10]);
}

/**
 * Sanitiza um nome completo — remove caracteres não permitidos.
 * Permite: letras, espaços, hífens, apóstrofos (nomes como D'Ávila).
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-ZÀ-ÿ\s\-']/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
}

/**
 * Sanitiza um campo de busca — previne injeção de padrões SQL/regex perigosos.
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[;'"\\%_]/g, " ") // remove chars de SQL injection
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 100);
}

/**
 * Escapa HTML para uso em templates de string (PDF, emails).
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}
