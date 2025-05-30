import { useState, useEffect } from "react";
import { translations } from "@/lib/translations";

export type Language = "es" | "en";

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("es");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && (savedLanguage === "es" || savedLanguage === "en")) {
      setLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem("language", newLanguage);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || key;
  };

  return {
    language,
    changeLanguage,
    t,
  };
}
