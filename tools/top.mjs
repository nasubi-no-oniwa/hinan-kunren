// ランキングの上位100人の表（名前と秒数だけ）を hk/top に書く（GitHub の上で1時間ごとに動く）。遊ぶ人は記録300人分ではなくこれだけ読む
import { token, api } from './fb.mjs';
const tk = await token();
const hidden = JSON.parse(await api('GET', '/hk/hidden.json', undefined, tk)) || {};
for (const b of ['all', 'sp', 'pc']) {
  const d = JSON.parse(await api('GET', `/hk/${b}/scores.json?orderBy=%22s%22&limitToLast=150`, undefined, tk)) || {};
  const rows = Object.entries(d).filter(([id, v]) => !hidden[id] && v && typeof v.s === 'number').map(([id, v]) => ({ id, n: v.n, s: v.s, t: v.t })).sort((a, b) => b.s - a.s || a.t - b.t).slice(0, 100);
  await api('PUT', `/hk/top/${b}.json`, JSON.stringify({ t: Date.now(), rows }), tk);
  console.log(b, rows.length, '人');
}
