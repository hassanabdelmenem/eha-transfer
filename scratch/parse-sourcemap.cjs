const fs = require('fs');
const sourceMap = require('source-map');

async function parse() {
  const rawSourceMap = JSON.parse(fs.readFileSync('dist/assets/ReferralDetailPage-CrW05OXw.js.map', 'utf8'));
  const consumer = await new sourceMap.SourceMapConsumer(rawSourceMap);
  
  let closest = null;
  let minDiff = Infinity;
  
  consumer.eachMapping(function (m) {
    if (m.generatedLine === 15) {
      const diff = Math.abs(m.generatedColumn - 17152);
      if (diff < minDiff) {
        minDiff = diff;
        closest = m;
      }
    }
  });
  console.log(closest);
}
parse().catch(console.error);
