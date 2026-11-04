// 避難の訓練ですぞ：動きと爆撃の計算（ゲームと記録の確認で同じものを使う）
// 1秒 = 60コマ。同じ「始めた時刻」と同じ操作なら、どの端末でも必ず同じ結果になる
(function (root) {
  const TICK = 60;
  const AW = 5, AH = 7;          // 訓練場の半分の幅（横10m × 縦14m）
  const PR = 0.22;               // 人の当たりの大きさ
  const WALK = 4.2 / TICK;       // 歩く速さ（1コマ）
  const SLIDE = 11 / TICK;       // スライディングの速さ（1コマ）
  const SLIDE_T = 12;            // スライディング1回のコマ数（0.2秒）
  const GETUP_T = 30;            // 起き上がりのコマ数（0.5秒）
  const LETHAL = 7;              // 爆発してから危ない時間（コマ）
  const FINAL_AT = 114 * TICK;   // 最後の全面空襲の予告が始まる
  const END = 120 * TICK;        // ここで必ず全員やられる
  const V = 1;                   // 計算の版
  // 32方向（三角関数は端末で結果がずれることがあるので、数字で持つ）
  const DIR = [[1,0],[0.980785,0.19509],[0.92388,0.382683],[0.83147,0.55557],[0.707107,0.707107],[0.55557,0.83147],[0.382683,0.92388],[0.19509,0.980785],[0,1],[-0.19509,0.980785],[-0.382683,0.92388],[-0.55557,0.83147],[-0.707107,0.707107],[-0.83147,0.55557],[-0.92388,0.382683],[-0.980785,0.19509],[-1,0],[-0.980785,-0.19509],[-0.92388,-0.382683],[-0.83147,-0.55557],[-0.707107,-0.707107],[-0.55557,-0.83147],[-0.382683,-0.92388],[-0.19509,-0.980785],[0,-1],[0.19509,-0.980785],[0.382683,-0.92388],[0.55557,-0.83147],[0.707107,-0.707107],[0.83147,-0.55557],[0.92388,-0.382683],[0.980785,-0.19509]];

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // サーバーの時刻から爆撃の並びを決める
  function seedOf(st) { return ((st % 4294967296) ^ 0x5bd1e995) >>> 0; }
  const clampX = x => Math.max(-AW + PR, Math.min(AW - PR, x));
  const clampZ = z => Math.max(-AH + PR, Math.min(AH - PR, z));

  function create(seed) {
    return { tick: 0, x: 0, z: 2, face: 24, mode: 'walk', mt: 0, sd: 24, moving: false,
      bombs: [], nid: 1, next: 90, R: rng(seed), final: false, dead: false, ev: [] };
  }

  // 爆撃を足す（k：種類 / w：予告のコマ数）
  function add(S, x, z, r, w, k, delay) {
    const b = { id: S.nid++, x, z, r, t0: S.tick, ti: S.tick + w + (delay || 0), k };
    S.bombs.push(b); S.ev.push({ e: 'warn', b });
  }
  function spawn(S) {
    const R = S.R, t = S.tick / TICK;
    const rx = () => (R() * 2 - 1) * (AW - .3), rz = () => (R() * 2 - 1) * (AH - .3);
    const w0 = Math.max(46, Math.round(84 - t * .35));   // 予告の長さ（だんだん短く）
    const rs = 1 + t * .004;
    // 種類をえらぶ
    const W = [
      ['one', 3],
      ['aim', t < 5 ? 0 : 2 + t * .02],
      ['line', t < 10 ? 0 : 1.2 + t * .012],
      ['big', t < 25 ? 0 : .8],
      ['cross', t < 45 ? 0 : .7],
      ['ring', t < 60 ? 0 : .9],
    ];
    let sum = 0; for (const [, v] of W) sum += v;
    let p = R() * sum, kind = 'one';
    for (const [k, v] of W) { if (p < v) { kind = k; break; } p -= v; }
    if (kind === 'one') add(S, rx(), rz(), (.85 + R() * .35) * rs, w0, 'one');
    else if (kind === 'aim') add(S, clampX(S.x + (R() - .5) * .8), clampZ(S.z + (R() - .5) * .8), (.9 + R() * .2) * rs, Math.max(40, w0 - 12), 'aim');
    else if (kind === 'big') add(S, R() < .5 ? rx() * .7 : clampX(S.x + (R() - .5) * 2), R() < .5 ? rz() * .7 : clampZ(S.z + (R() - .5) * 2), (2.2 + R() * .5) * rs, w0 + 36, 'big');
    else if (kind === 'line' || kind === 'cross') {
      const lines = kind === 'cross' ? [0, 1] : [R() < .5 ? 0 : 1];
      for (const h of lines) {
        const at = kind === 'cross' || R() < .5 ? (h ? S.x : S.z) : (h ? rx() : rz());
        const len = h ? AH : AW, n = Math.floor(len * 2 / 1.25) + 1, fwd = R() < .5;
        for (let i = 0; i < n; i++) {
          const u = -len + i * (len * 2 / (n - 1)), j = fwd ? i : n - 1 - i;
          if (h) add(S, at, u, .8 * rs, w0 + 10, 'line', j * 4);
          else add(S, u, at, .8 * rs, w0 + 10, 'line', j * 4);
        }
      }
    } else if (kind === 'ring') {
      add(S, S.x, S.z, .9 * rs, w0, 'ring');
      const k0 = Math.floor(R() * 32);
      for (let i = 0; i < 6; i++) { const d = DIR[(k0 + i * 5 + (i > 2 ? 1 : 0)) % 32]; add(S, clampX(S.x + d[0] * 1.7), clampZ(S.z + d[1] * 1.7), .9 * rs, w0, 'ring', 6 + Math.floor(R() * 18)); }
    }
    const gap = Math.max(9, Math.round(66 - t * .5));
    S.next = S.tick + gap + Math.floor(R() * gap * .4);
  }
  function finalRaid(S) {
    S.final = true;
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 10; j++) {
      const x = -AW + i * (AW * 2 / 8), z = -AH + j * (AH * 2 / 10);
      const b = { id: S.nid++, x, z, r: 1.2, t0: S.tick, ti: END, k: 'final' };
      S.bombs.push(b); S.ev.push({ e: 'warn', b });
    }
  }

  // 1コマ進める。d：0＝止まる / 1〜32＝方向 / sl：スライディングを押した
  function step(S, d, sl) {
    if (S.dead) return S;
    S.ev.length = 0;
    S.tick++;
    const dir = d > 0 && d <= 32 ? d - 1 : -1;
    if (dir >= 0) S.face = dir;
    // スライディング
    if (sl && (S.mode === 'walk' || S.mode === 'slide')) {
      S.mode = 'slide'; S.mt = SLIDE_T; S.sd = dir >= 0 ? dir : S.face; S.ev.push({ e: 'slide' });
    }
    S.moving = false;
    if (S.mode === 'slide') {
      const v = DIR[S.sd]; S.x = clampX(S.x + v[0] * SLIDE); S.z = clampZ(S.z + v[1] * SLIDE); S.moving = true;
      if (--S.mt <= 0) { S.mode = 'getup'; S.mt = GETUP_T; }
    } else if (S.mode === 'getup') {
      if (--S.mt <= 0) S.mode = 'walk';
    } else if (dir >= 0) {
      const v = DIR[dir]; S.x = clampX(S.x + v[0] * WALK); S.z = clampZ(S.z + v[1] * WALK); S.moving = true;
    }
    // 爆撃
    if (!S.final && S.tick >= FINAL_AT) finalRaid(S);
    if (S.tick >= S.next && S.tick < END - 90) spawn(S);
    for (const b of S.bombs) {
      if (b.ti === S.tick) S.ev.push({ e: 'boom', b });
      if (S.tick >= b.ti && S.tick < b.ti + LETHAL) {
        const dx = S.x - b.x, dz = S.z - b.z, rr = b.r + PR;
        if (dx * dx + dz * dz < rr * rr && !S.dead && !S.ghost) { S.dead = true; S.by = b; S.ev.push({ e: 'dead', b }); }
      }
    }
    if (S.tick % 30 === 0) S.bombs = S.bombs.filter(b => S.tick < b.ti + LETHAL + 2);
    return S;
  }

  // 操作の記録 ⇔ 文字
  const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg';
  function enc(D, SL) {
    let s = '', i = 0;
    while (i < D.length) { let j = i; while (j < D.length && D[j] === D[i]) j++; s += AL[D[i]] + (j - i > 1 ? (j - i) : ''); i = j; }
    const out = []; let last = 0;
    for (let k = 0; k < SL.length; k++) if (SL[k]) { out.push((k - last).toString(36)); last = k; }
    return s + '~' + out.join('.');
  }
  function dec(str) {
    if (typeof str !== 'string' || str.length > 40000) return null;
    const [a, b] = str.split('~'); if (b == null) return null;
    const D = [];
    const re = /([A-Za-g])(\d*)/g; let m, used = 0;
    while ((m = re.exec(a))) {
      if (m.index !== used) return null; used = re.lastIndex;
      const v = AL.indexOf(m[1]); if (v < 0) return null;
      const n = m[2] ? +m[2] : 1; if (n < 1 || D.length + n > END + 10) return null;
      for (let k = 0; k < n; k++) D.push(v);
    }
    if (used !== a.length) return null;
    const SL = new Array(D.length).fill(0);
    if (b) { let last = 0; for (const x of b.split('.')) { const dd = parseInt(x, 36); if (!(dd >= 0)) return null; last += dd; if (last >= D.length) return null; SL[last] = 1; } }
    return { D, SL };
  }
  // 記録の確かめ：同じ操作で、同じコマにやられるか
  function ms(n) { return Math.round(n * 1000 / TICK); }
  function check(r) {
    try {
      if (!r || r.v !== V || typeof r.st !== 'number') return false;
      const o = dec(r.in); if (!o || !o.D.length) return false;
      const S = create(seedOf(r.st));
      for (let i = 0; i < o.D.length; i++) { step(S, o.D[i], o.SL[i]); if (S.dead && i < o.D.length - 1) return false; }
      return S.dead && ms(S.tick) === r.s;
    } catch (e) { return false; }
  }
  const HK = { TICK, AW, AH, PR, SLIDE_T, GETUP_T, LETHAL, FINAL_AT, END, V, DIR, create, step, enc, dec, check, seedOf, ms };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK;
  else root.HK = HK;
})(typeof self !== 'undefined' ? self : this);
