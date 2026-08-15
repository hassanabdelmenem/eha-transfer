const fs = require('fs');
const { SourceMapConsumer } = require('source-map');
const map = JSON.parse(fs.readFileSync('dist/assets/ReferralDetailPage-CrW05OXw.js.map', 'utf8'));

SourceMapConsumer.with(map, null, consumer => {
  // We need to look up around line 15, column 17152
  // But wait, the file name might be slightly different now.
  // We can just find all .map calls in the generated file and see where they map.
  const code = fs.readFileSync('dist/assets/ReferralDetailPage-CrW05OXw.js', 'utf8');
  const lines = code.split('\n');
  const line = 15; // assuming it's line 15
  let match;
  const regex = /\.map\(/g;
  while ((match = regex.exec(lines[line - 1])) !== null) {
    const pos = consumer.originalPositionFor({
      line: line,
      column: match.index
    });
    console.log(`Found .map at col ${match.index} -> ${pos.source}:${pos.line}:${pos.column}`);
  }
});
