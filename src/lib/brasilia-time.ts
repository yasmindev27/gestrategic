/**
 * Utilitário para obter data/hora no fuso horário de Brasília (America/Sao_Paulo)
 * UTC-3 (horário padrão) ou UTC-2 (horário de verão, quando aplicável)
 */

/**
 * Retorna a data/hora atual no fuso horário de Brasília
 * Usa Intl.DateTimeFormat para extrair partes individuais de forma confiável
 */
export const getBrasiliaDate = (): Date => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "0";
  
  return new Date(
    parseInt(get("year")),
    parseInt(get("month")) - 1,
    parseInt(get("day")),
    parseInt(get("hour")) % 24, // hour12:false pode retornar "24" para meia-noite
    parseInt(get("minute")),
    parseInt(get("second"))
  );
};

/**
 * Retorna as horas atuais no fuso horário de Brasília
 */
export const getBrasiliaHours = (): number => {
  return getBrasiliaDate().getHours();
};

/**
 * Retorna os minutos atuais no fuso horário de Brasília
 */
export const getBrasiliaMinutes = (): number => {
  return getBrasiliaDate().getMinutes();
};

/**
 * Retorna a hora formatada no fuso horário de Brasília (HH:mm)
 */
export const getBrasiliaTimeString = (): string => {
  const date = getBrasiliaDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

/**
 * Retorna a data formatada no fuso horário de Brasília (yyyy-MM-dd)
 */
export const getBrasiliaDateString = (): string => {
  const date = getBrasiliaDate();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Formata uma data com hora no fuso de Brasília
 */
export const formatBrasiliaDateTime = (formatStr: "dd/MM/yyyy HH:mm" | "HH:mm" = "dd/MM/yyyy HH:mm"): string => {
  const date = getBrasiliaDate();
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (formatStr === "HH:mm") {
    return `${hours}:${minutes}`;
  }
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Formata uma data de forma defensiva, retornando fallback se inválida
 */
export const safeFormatDate = (
  dateString: string | null | undefined,
  formatPattern: string = "dd/MM/yyyy",
  fallback: string = "-"
): string => {
  if (!dateString) return fallback;
  
  try {
    // Valida o formato da string
    const dateRegex = /^\d{4}-\d{2}-\d{2}/;
    if (!dateRegex.test(dateString)) return fallback;
    
    // Adiciona horário para evitar problemas de fuso
    const dateWithTime = dateString.includes("T") ? dateString : `${dateString}T12:00:00`;
    const date = new Date(dateWithTime);
    
    // Verifica se a data é válida
    if (isNaN(date.getTime())) return fallback;
    
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    
    const seconds = date.getSeconds().toString().padStart(2, "0");
    
    switch (formatPattern) {
      case "dd/MM/yyyy":
        return `${day}/${month}/${year}`;
      case "dd/MM/yy":
        return `${day}/${month}/${year.toString().slice(-2)}`;
      case "dd/MM/yyyy HH:mm":
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      case "dd/MM/yy HH:mm":
        return `${day}/${month}/${year.toString().slice(-2)} ${hours}:${minutes}`;
      case "dd/MM HH:mm":
        return `${day}/${month} ${hours}:${minutes}`;
      case "dd/MM/yyyy HH:mm:ss":
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      default:
        return `${day}/${month}/${year}`;
    }
  } catch {
    return fallback;
  }
};
