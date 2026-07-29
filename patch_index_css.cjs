const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

// replace .night-shift-mode { ... } block
content = content.replace(/\.night-shift-mode \{[\s\S]*?body \{[\s\S]*?\}/, '');

content += `
.night-shift-mode {
  filter: sepia(0.4) hue-rotate(-10deg) contrast(1.05) brightness(0.85);
  background-color: #0f172a;
}
`;

fs.writeFileSync('src/index.css', content);
