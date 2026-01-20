/**
 * Utilitário para obter data/hora no fuso horário de Brasília (America/Sao_Paulo)
 * UTC-3 (horário padrão) ou UTC-2 (horário de verão, quando aplicável)
 */

/**
 * Retorna a data/hora atual no fuso horário de Brasília
 */
export const getBrasiliaDate = (): Date => {
  const now = new Date();
  // Cria uma string no formato de Brasília e converte de volta para Date
  const brasiliaString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  return new Date(brasiliaString);
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
