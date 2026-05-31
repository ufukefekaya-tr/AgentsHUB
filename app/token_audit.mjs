import fs from 'fs';
const coreDir = 'c:/AgentsHUB/app/Agents/TestAjani/Mind-Set_Core';

const analyze = (label, content) => {
  const chars = content?.length || 0;
  const tokens = Math.round(chars / 3.5);
  return { label, chars, tokens };
};

const files = ['DNA.md','RULES.md','USER.md','EVALUATION.md','SKILLS.md'];
let grand = 0;
const results = [];
for (const f of files) {
  try { 
    const c = fs.readFileSync(coreDir+'/'+f, 'utf8'); 
    const r = analyze(f, c);
    results.push(r); 
    grand += r.tokens; 
  } catch(e) { 
    results.push({label:f, chars:0, tokens:0}); 
  }
}

try { 
  const m = fs.readFileSync('c:/AgentsHUB/app/src/bridge/config/models.json','utf8'); 
  const r = analyze('models.json', m);
  results.push(r); 
  grand += r.tokens; 
} catch(e){}

// Fixed costs from parser.js
results.push({label:'HardcodedSection10 (parser rules block)', chars:4800, tokens:1371}); grand += 1371;
results.push({label:'RecentLogs (logger.getRecentLogs)', chars:700, tokens:200}); grand += 200;
results.push({label:'SkillListText (_loadIsolatedSkills)', chars:500, tokens:143}); grand += 143;

console.log('\n=== SYSTEM PROMPT TOKEN ANATOMISI ===');
results.forEach(r => { 
  const pct = (r.tokens / grand * 100).toFixed(1); 
  console.log(`${r.label.padEnd(45)} ${String(r.tokens).padStart(6)} tok  (${pct}%)`); 
});
console.log(`\n${'>>> SYSTEM_PROMPT_TOTAL'.padEnd(45)} ${String(grand).padStart(6)} tok`);
console.log('');
console.log(`${'CHAT_HISTORY (UMI load cap: 20K tok)'.padEnd(45)} ${String(5715).padStart(6)} tok  (worst: full history)`);
console.log(`${'USER_MESSAGE (average)'.padEnd(45)} ${String(200).padStart(6)} tok`);
console.log('');
console.log(`${'>>> GRAND TOTAL (worst case)'.padEnd(45)} ${String(grand+5715+200).padStart(6)} tok`);
console.log(`${'>>> GRAND TOTAL (avg, half history)'.padEnd(45)} ${String(grand+2800+200).padStart(6)} tok`);
console.log('');
console.log('=== FIRSATLAR (50K → 20K için) ===');
console.log(`DNA.md ~${results.find(r=>r.label==='DNA.md')?.tokens} tok — Max hedef: ~1500-2000 tok. Tasarruf potansiyeli: ~2000 tok`);
console.log(`EVALUATION.md ~${results.find(r=>r.label==='EVALUATION.md')?.tokens} tok — Lazy inject edilebilir. Tasarruf: ~1500 tok`);
console.log(`HardcodedSection10 ~1371 tok — Skill/araç kullanım kuralları daha compact yazılabilir. Tasarruf: ~600 tok`);
console.log(`SKILLS.md ~${results.find(r=>r.label==='SKILLS.md')?.tokens} tok — Sadece aktif olanlar, kısa format. Tasarruf: ~200 tok`);
console.log(`L2 Memory Injection (şu an 0) — Context-aware inject ile +etkin. Tarih baskısı azalır.`);
