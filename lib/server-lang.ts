import { cookies } from "next/headers";
import { translations, type T, type Lang } from "./translations";

/** Use in Server Components to get the active translations. */
export function getServerTranslations(): T {
  const lang = cookies().get("lang")?.value;
  return lang === "de" ? translations.de as unknown as T : translations.en;
}

/** Use in Server Components to get the active language code. */
export function getServerLang(): Lang {
  const lang = cookies().get("lang")?.value;
  return lang === "de" ? "de" : "en";
}
