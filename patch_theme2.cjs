const fs = require('fs');
let content = fs.readFileSync('src/contexts/ThemeContext.tsx', 'utf8');

const regex = /  useEffect\(\(\) => \{\n    const root = window\.document\.documentElement;\n    if \(nightShift\) \{[\s\S]*?  \}, \[theme\]\);/;

const replacement = `  useEffect(() => {
    const root = window.document.documentElement;
    
    // Handle night shift
    if (nightShift) {
      root.classList.add('night-shift-mode');
    } else {
      root.classList.remove('night-shift-mode');
    }

    // Handle theme
    root.classList.remove('light', 'dark');
    if (nightShift) {
      root.classList.add('dark'); // Force dark mode for night shift
    } else if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, nightShift]);`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/contexts/ThemeContext.tsx', content);
