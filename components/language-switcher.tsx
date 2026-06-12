"use client";

import { LANGS, LANG_LABEL, useLang } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex overflow-hidden rounded-full border border-white/15 text-xs">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-label={`idioma ${LANG_LABEL[l]}`}
          className={[
            "px-2.5 py-1 transition-colors",
            lang === l
              ? "bg-mango font-semibold text-night"
              : "text-hueso/50 hover:text-hueso",
          ].join(" ")}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
