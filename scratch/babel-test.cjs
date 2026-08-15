const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('src/components/referrals/PrintableSummary.tsx', 'utf8');
const result = babel.transformSync(code, {
  presets: ['@babel/preset-react', '@babel/preset-typescript']
});
console.log(result.code);
