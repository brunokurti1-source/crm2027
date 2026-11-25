"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("crm2027_theme", theme);
}

function applyFontScale(scale: number) {
  document.documentElement.style.setProperty("--font-scale", String(scale));
  localStorage.setItem("crm2027_font_scale", String(scale));
}

export function ThemeInitScript() {
  const code = `(function(){try{var t=localStorage.getItem('crm2027_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);var f=localStorage.getItem('crm2027_font_scale');if(f)document.documentElement.style.setProperty('--font-scale',f);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeControls() {
  const [theme, setTheme] = useState<Theme>("light");
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const t = (localStorage.getItem("crm2027_theme") as Theme) || "light";
    const f = Number(localStorage.getItem("crm2027_font_scale") || "1");
    setTheme(t);
    setScale(Number.isFinite(f) ? f : 1);
  }, []);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="btn btn-ghost"
        aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
        title={theme === "dark" ? "Mënyra e ndriçuar" : "Mënyra e errët"}
        onClick={() => {
          const next = theme === "dark" ? "light" : "dark";
          setTheme(next);
          applyTheme(next);
        }}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        aria-label="Shrink text"
        title="Zvogëlo tekstin"
        onClick={() => {
          const next = Math.max(0.9, Math.round((scale - 0.05) * 100) / 100);
          setScale(next);
          applyFontScale(next);
        }}
      >
        A−
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        aria-label="Grow text"
        title="Zmadho tekstin"
        onClick={() => {
          const next = Math.min(1.2, Math.round((scale + 0.05) * 100) / 100);
          setScale(next);
          applyFontScale(next);
        }}
      >
        A+
      </button>
    </div>
  );
}
