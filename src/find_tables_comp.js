const fs = require('fs');
const js = fs.readFileSync('C:/Users/DELL/.gemini/antigravity-cli/brain/c3825b4a-a5a2-4b3a-b5ff-8a27234d654e/scratch/web-qr-order.js', 'utf8');

const idx = js.indexOf('I3e=()=>{');
if (idx !== -1) {
  console.log(js.substring(idx, idx + 4000));
} else {
  console.log('I3e not found, searching for tables component...');
  const m = js.match(/tables['"]\s*,\s*element:\s*_\.jsx\(([a-zA-Z0-9_$]+)/);
  console.log('Match:', m);
}
