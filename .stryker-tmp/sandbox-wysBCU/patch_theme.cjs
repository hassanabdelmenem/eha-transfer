// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/contexts/ThemeContext.tsx', 'utf8');

content = content.replace(
  "interface ThemeProviderState {\n  theme: Theme;\n  setTheme: (theme: Theme) => void;\n}",
  "interface ThemeProviderState {\n  theme: Theme;\n  setTheme: (theme: Theme) => void;\n  nightShift: boolean;\n  setNightShift: (enabled: boolean) => void;\n}"
);

content = content.replace(
  "const initialState: ThemeProviderState = {\n  theme: 'system',\n  setTheme: () => null,\n};",
  "const initialState: ThemeProviderState = {\n  theme: 'system',\n  setTheme: () => null,\n  nightShift: false,\n  setNightShift: () => null,\n};"
);

content = content.replace(
  "const [theme, setTheme] = useState<Theme>(\n    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme\n  );",
  "const [theme, setTheme] = useState<Theme>(\n    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme\n  );\n  const [nightShift, setNightShift] = useState<boolean>(\n    () => localStorage.getItem('app-night-shift') === 'true'\n  );"
);

content = content.replace(
  "  useEffect(() => {\n    const root = window.document.documentElement;",
  "  useEffect(() => {\n    const root = window.document.documentElement;\n    if (nightShift) {\n      root.classList.add('night-shift-mode');\n    } else {\n      root.classList.remove('night-shift-mode');\n    }\n  }, [nightShift]);\n\n  useEffect(() => {\n    const root = window.document.documentElement;"
);

content = content.replace(
  "    setTheme: (theme: Theme) => {\n      localStorage.setItem(storageKey, theme);\n      setTheme(theme);\n    },\n  };",
  "    setTheme: (theme: Theme) => {\n      localStorage.setItem(storageKey, theme);\n      setTheme(theme);\n    },\n    nightShift,\n    setNightShift: (enabled: boolean) => {\n      localStorage.setItem('app-night-shift', enabled.toString());\n      setNightShift(enabled);\n    }\n  };"
);

fs.writeFileSync('src/contexts/ThemeContext.tsx', content);
