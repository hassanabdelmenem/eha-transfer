const fs = require('fs');
let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

content = content.replace(
  "const { theme, setTheme } = useTheme();",
  "const { theme, setTheme, nightShift, setNightShift } = useTheme();"
);

content = content.replace(
  "import { Bell, LogOut, Activity, Users, PlusCircle, LayoutDashboard, BookOpen, Settings, Moon, Sun, Bed, Cloud, Database } from 'lucide-react';",
  "import { Bell, LogOut, Activity, Users, PlusCircle, LayoutDashboard, BookOpen, Settings, Moon, Sun, Bed, Cloud, Database, Eye } from 'lucide-react';"
);

content = content.replace(
  `          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-blue-200 hover:text-white transition-colors"`,
  `          <div className="flex items-center gap-4">
            <button
              onClick={() => setNightShift(!nightShift)}
              className={\`\${nightShift ? 'text-amber-400' : 'text-blue-200'} hover:text-white transition-colors\`}
              title="Toggle Night Shift Mode"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-blue-200 hover:text-white transition-colors"`
);

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
