export const supportedLocales = ["pt-BR"] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = "pt-BR";

export async function getMessages(locale: Locale) {
  return (await import(`./messages/${locale}.json`)).default as Record<string, string>;
}
