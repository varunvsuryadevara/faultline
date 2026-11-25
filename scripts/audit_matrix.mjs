import * as vocab from '../shared/regulations/vocab.js';
import * as data from '../shared/regulations/data.js';

const cats = vocab.MASTER_LEGAL_CATEGORIES;
const countries = Object.keys(vocab.COUNTRY_METADATA);

const matrix = {};
for (const c of countries) {
  matrix[c] = {};
  for (const cat of cats) {
    matrix[c][cat.id] = 0;
  }
}

for (const r of data.REGULATIONS) {
  const master = vocab.resolveMasterCategory(r.categoryId);
  const masterId = master ? master.id : r.categoryId;
  if (matrix[r.country] && matrix[r.country][masterId] !== undefined) {
    matrix[r.country][masterId]++;
  }
}

console.log('\n--- COVERAGE PER COUNTRY ---');
for (const c of countries) {
  const covered = cats.filter(cat => matrix[c][cat.id] > 0);
  const totalRegs = data.REGULATIONS.filter(r => r.country === c).length;
  console.log(`${c} (${vocab.COUNTRY_METADATA[c].name}): ${covered.length}/${cats.length} Master Categories covered (${totalRegs} regs)`);
}

console.log('\n--- COVERAGE PER MASTER CATEGORY (A-P) ---');
for (const cat of cats) {
  const countriesWithCat = countries.filter(c => matrix[c][cat.id] > 0);
  console.log(`${cat.code}. ${cat.label}: ${countriesWithCat.length}/20 countries covered`);
}
