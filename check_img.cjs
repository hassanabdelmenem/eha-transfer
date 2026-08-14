const fs = require('fs');
const buffer = fs.readFileSync('playwright_state_error.png');
// Very naive check: if file size is very small, it's mostly uniform.
console.log("File size:", buffer.length);
