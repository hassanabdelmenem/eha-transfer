const fs = require('fs');
const sourceMap = require('source-map');

async function parse() {
  const rawSourceMap = JSON.parse(fs.readFileSync('dist/assets/ReferralDetailPage-CrW05OXw.js.map', 'utf8'));
  const consumer = await new sourceMap.SourceMapConsumer(rawSourceMap);
  
  // Looking for line 15, column 17152 (from the user's stack trace)
  // Wait, the stack trace from the user is from ReferralDetailPage-B6r3HpF7.js.
  // My local build produced ReferralDetailPage-CrW05OXw.js.
  // I should find all calls to .map in the source map!
  
  consumer.eachMapping(function (m) {
    if (m.name === 'map') {
      console.log(`${m.source}:${m.originalLine}:${m.originalColumn} -> ${m.generatedLine}:${m.generatedColumn}`);
    }
  });
}
parse().catch(console.error);
