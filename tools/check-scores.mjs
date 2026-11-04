// ランキングの記録を、ゲームと同じ計算でやり直して確かめる。合わない記録と hk-remove.txt のIDの記録を消す
import fs from 'fs';
import { createRequire } from 'module';
import { token, api } from './fb.mjs';
const HK = createRequire(import.meta.url)('../sim.js');
const tk = await token();
const ban = new Set((fs.existsSync('hk-remove.txt') ? fs.readFileSync('hk-remove.txt', 'utf8') : '').split(/\s+/).filter(x => /^[A-Za-z0-9]{20,40}$/.test(x)));
let n = 0, rm = 0;
for (const b of ['sp', 'pc']) {
  const d = JSON.parse(await api('GET', '/hk/' + b + '/scores.json', undefined, tk)) || {};
  for (const [k, v] of Object.entries(d)) {
    n++; let why = '';
    if (ban.has(k)) why = '手で指定';
    else if (!HK.check(v)) why = '計算が合わない';
    if (why) { rm++; console.log('消す:', b, k, JSON.stringify(v.n), v.s, why); await api('DELETE', '/hk/' + b + '/scores/' + k + '.json', undefined, tk); }
  }
}
console.log('確かめた', n, '件 / 消した', rm, '件');
