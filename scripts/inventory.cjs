const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else results.push(full.replace(/\\/g, '/'));
  });
  return results;
}

console.log('=== INVENTORY ===');
['src', 'server', 'shared', 'tests', 'data'].forEach(d => {
  console.log(`\n--- ${d.toUpperCase()} ---`);
  walk(d).forEach(f => console.log(f));
});
