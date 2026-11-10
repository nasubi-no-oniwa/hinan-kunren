// 人数カウンターを、いまの記録から数えなおして書く（GitHub の上でだけ動く）。今日のランキングの ds も足す
import { token, api } from './fb.mjs';
const [ROOT, NODES, DSMUL, SKEY] = [process.env.ROOT, (process.env.NODES || '').split(',').filter(Boolean), +process.env.DSMUL || 0, process.env.SKEY || 's'];
const tk = await token();
const today = Math.floor((Date.now() + 32400000) / 86400000), d0 = today * 86400000 - 32400000;
for (const X of NODES) {
  const all = JSON.parse(await api('GET', `/${ROOT}/${X}.json?shallow=true`, undefined, tk)) || {};
  const td = JSON.parse(await api('GET', `/${ROOT}/${X}.json?orderBy=%22t%22&startAt=${d0}`, undefined, tk)) || {};
  const n = Object.keys(all).length, m = Object.keys(td).length;
  await api('PUT', `/${ROOT}/${X}c.json`, JSON.stringify(n), tk);
  await api('PUT', `/${ROOT}/${X}t.json`, JSON.stringify({ dk: today, n: m }), tk);
  console.log(X, '全期間', n, '人 / 今日', m, '人');
}
if (DSMUL) {
  const d = JSON.parse(await api('GET', `/${ROOT}/d/scores.json?orderBy=%22dk%22&equalTo=${today}`, undefined, tk)) || {};
  const up = {};
  for (const [id, v] of Object.entries(d)) if (v && typeof v[SKEY] === 'number' && v.ds !== today * DSMUL + v[SKEY]) up[id + '/ds'] = today * DSMUL + v[SKEY];
  const ks = Object.keys(up);
  for (let i = 0; i < ks.length; i += 500) { const part = {}; for (const k of ks.slice(i, i + 500)) part[k] = up[k]; await api('PATCH', `/${ROOT}/d/scores.json`, JSON.stringify(part), tk); }
  console.log('今日のランキングに ds を足した数', ks.length);
}
console.log('おわり');
