// KEYFRAME ∞ — ゲームの計算部分(パネルと検証用の Node の両方から使う)
// 盤面を持たず、同じ数式から「作業 1 回ぶんの進み」を概算する。毎回の処理で配列やオブジェクトを新しく作らない。
var KFI = (function () {
  var NAME = 'KEYFRAME ∞';
  var pw = Math.pow, LN10 = Math.LN10;
  function now() { return new Date().getTime(); }

  /* ───────── データ(ブラウザ版と同じ数値) ───────── */
  // [id, 基本コスト, 成長率, 最大Lv(0=無限), 必要エフェクト]
  var TR = [
    ['power', 8, 1.32, 0, ''], ['quality', 20, 2.2, 0, ''], ['spawn', 25, 1.6, 30, ''], ['cap', 60, 1.5, 30, ''],
    ['radius', 40, 1.55, 25, ''], ['rate', 50, 1.6, 25, ''], ['chain', 150, 1.6, 0, 'echo'], ['sweep', 300, 1.8, 40, ''],
    ['bots', 2000, 5, 8, ''], ['flow', 800, 1.9, 10, ''], ['special', 5000, 2.2, 15, 'echo'], ['botpow', 1e4, 1.9, 20, '#bots'],
    ['critx', 2e4, 2.4, 20, 'crit1'], ['boss', 5e4, 2.5, 15, '#boss'], ['chainv', 600, 1.8, 25, 'echo'], ['goldv', 5e7, 2.5, 20, 'gold']
  ];
  // 連鎖シェイプ: [id, コスト, 出現の重み, 段階数]  2段階目は ×1e3、3段階目は ×1e6
  var SP = [
    ['echo', 80, 9, 3], ['wig', 1500, 8, 3], ['flare', 2e4, 5, 2], ['glow', 4e5, 7, 3], ['matte', 1e7, 4, 2], ['nul', 3e8, 2.5, 1], ['orbit', 1e10, 3, 2],
    ['pre', 5e11, 4, 2], ['rep', 3e13, 4, 2], ['gold', 2e15, 1.5, 2], ['vortex', 2e17, 3, 2], ['time', 3e19, 2, 2], ['expr', 5e21, 2.5, 2], ['shake', 1e24, 2, 2]
  ];
  var MISC = [['pen', 400], ['brush', 3000], ['anchor', 5e4], ['crit1', 600], ['crit2', 2e5], ['crit3', 4e8]];
  var FXU = [], i, j; // {id, cost, req}
  for (i = 0; i < SP.length; i++) for (j = 1; j <= SP[i][3]; j++) FXU.push({ id: SP[i][0] + (j > 1 ? j : ''), cost: SP[i][1] * pw(1e3, j - 1), req: j > 1 ? SP[i][0] + (j > 2 ? j - 1 : '') : '' });
  for (i = 0; i < MISC.length; i++) FXU.push({ id: MISC[i][0], cost: MISC[i][1], req: MISC[i][0] === 'crit2' ? 'crit1' : MISC[i][0] === 'crit3' ? 'crit2' : '' });
  for (i = 0; i < 16; i++) FXU.push({ id: 'v' + i, cost: 500 * pw(60, i), req: '', mul: 2 });
  var COMPS = ['メインコンポ', 'キネティックタイポ', 'インフォグラフィック', 'キャラクターアニメ', 'UIモーション', 'VFX合成', 'タイトルシーケンス', '3Dシーン', 'ライブ演出', 'フルCG映画'];
  var MAXCOMP = 100, COMP_VAL = 5, COMP_HP = 25;
  // スタジオ研究: [id, 最大Lv(0=無限), コスト基準, コスト成長, 種類]  種類 q=1+l² / e=基準×成長^l
  var PERKS = [
    ['val', 20, 1, 0, 'q'], ['start', 8, 1, 3, 'e'], ['bot', 3, 3, 5, 'e'], ['crit', 10, 2, 2, 'e'], ['gold', 5, 4, 3, 'e'], ['flow', 6, 5, 3, 'e'],
    ['chain', 10, 3, 2.2, 'e'], ['boss', 5, 6, 3, 'e'], ['insp', 20, 4, 2, 'e'], ['mis', 6, 3, 2.5, 'e'], ['pick', 4, 8, 3, 'e'], ['comp', 5, 5, 3, 'e'],
    ['xval', 0, 1e7, 4, 'x'], ['xchain', 0, 2e7, 4, 'x'], ['xinsp', 0, 5e7, 5, 'x']
  ];
  var MAST = [['mval', 10, 0], ['minsp', 10, 0], ['mcomp', 6, 0], ['mpick', 5, 0], ['mflow', 5, 0], ['xfame', 0, 1], ['xeye', 0, 1]]; // [id, 最大, 無限型か]
  var STYLES = [['sspd', 20], ['sval', 0], ['sinsp', 0], ['sbot', 4], ['scard', 5], ['stro', 5]];
  var CARDS = ['val', 'dmg', 'rate', 'rad', 'spawn', 'chain', 'crit', 'critx', 'spec', 'gold', 'boss', 'bot', 'sweep', 'flow'];
  var FLOWM = [1, 1.3, 1.7, 2.2, 3];
  var UNITS = ['', '万', '億', '兆', '京', '垓', '秭', '穣', '溝', '澗', '正', '載', '極'];

  /* ───────── 状態 ───────── */
  function fresh() {
    return {
      frames: 0, runTotal: 0, allTotal: 0, pops: 0, tr: {}, fx: {}, perks: {}, mast: {}, style: {}, cards: {},
      insp: 0, inspEarned: 0, inspAll: 0, exports: 0, trophies: 0, stars: 0, starsAll: 0,
      comp: 0, compMax: 0, bossLv: 0, bossWins: 0, misDone: 0, misRun: 0, misPops: 0, bossSec: 0, runActive: 0,
      flow: 0, work: 0, playSec: 0, idleSec: 0, lastSave: 0, auto: true
    };
  }
  var S = fresh(), G = 1, rate = 0, lastEvt = '起動', dirtyUI = true;
  function lv(id) { return S.tr[id] || 0; } function has(id) { return !!S.fx[id]; } function pk(id) { return S.perks[id] || 0; }
  function ms(id) { return S.mast[id] || 0; } function st(id) { return S.style[id] || 0; } function cd(id) { return S.cards[id] || 0; }

  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 1e4) return (n < 100 && n % 1 !== 0) ? n.toFixed(1) : String(Math.floor(n));
    var k = Math.floor(Math.log(n) / LN10 / 4 + 1e-9);
    if (k >= UNITS.length) { var e = Math.floor(Math.log(n) / LN10); return (n / pw(10, e)).toFixed(2) + 'e' + e; }
    var v = n / pw(10, k * 4);
    return (v < 100 ? v.toFixed(2) : v < 1000 ? v.toFixed(1) : String(Math.floor(v))) + UNITS[k];
  }

  /* ───────── 計算(ブラウザ版の式を、盤面なしで概算に置き換えたもの) ───────── */
  function dmgBase() { return pw(1.2, lv('power')) * (1 + 0.3 * cd('dmg')); }
  function tickRate() { return 3 * pw(1.08, lv('rate')) * (1 + 0.12 * cd('rate')); }
  function spawnRate() { return 2 * pw(1.08, lv('spawn')) * (1 + 0.12 * cd('spawn')); }
  function capN() { return 14 + 2 * lv('cap'); }
  function hpAt(c) { return 3 * pw(1.2, lv('quality')) * pw(COMP_HP, c); }
  function valAt(c) { return pw(1.25, lv('quality')) * pw(COMP_VAL, c) * G; }
  function chainDmg() { return dmgBase() * 1.5 * pw(1.25, lv('chain')) * (1 + 0.5 * pk('chain')) * (1 + 0.4 * cd('chain')) * pw(1.3, pk('xchain')); }
  function critCh() { return (has('crit1') ? 0.08 : 0) + (has('crit2') ? 0.1 : 0) + 0.03 * pk('crit') + 0.04 * cd('crit') + (has('pen') ? 0.15 : 0); }
  function critMul() { return (has('crit3') ? 8 : 4) + 0.25 * lv('critx') + cd('critx'); }
  function botCount() { return lv('bots') + pk('bot') + st('sbot'); }
  function autoDps() {
    var d = botCount() * tickRate() * 0.5 * dmgBase() * 0.6 * pw(1.1, lv('botpow')) * (1 + 0.6 * cd('bot')) * pw(2, st('sbot'));
    if (lv('sweep')) d += dmgBase() * (0.8 + 0.3 * lv('sweep')) * (1 + 0.6 * cd('sweep')) / Math.max(2.5, 8 - 0.25 * lv('sweep')) * capN() * 0.6;
    return d;
  }
  var specW = 0, specP = 0; // 連鎖シェイプの出現率と連鎖の強さ(エフェクト購入時に再計算)
  function recalc() {
    var g = 1, w = 0, p = 0, k, t;
    for (k = 0; k < FXU.length; k++) if (FXU[k].mul && S.fx[FXU[k].id]) g *= FXU[k].mul;
    for (k = 0; k < SP.length; k++) if (S.fx[SP[k][0]]) { t = 1 + (S.fx[SP[k][0] + '2'] ? 0.6 : 0) + (S.fx[SP[k][0] + '3'] ? 0.6 : 0); w += SP[k][2]; p += SP[k][2] * t; }
    w *= (1 + 0.15 * pk('gold')) * (1 + 0.04 * lv('special')) * (1 + 0.2 * cd('spec'));
    specW = w / (100 + w); specP = p / (100 + w) * (w ? 1 : 0);
    G = g * pw(1 + S.inspEarned, 0.2) * (1 + 0.25 * pk('val')) * (1 + 0.03 * S.bossLv) * (1 + 0.5 * S.trophies) * (1 + 0.3 * cd('val'))
      * pw(2, ms('mval')) * pw(1.15, pk('xval')) * pw(1.5, ms('xfame')) * pw(2, st('sval'));
  }
  function flowTier() { return S.flow >= 99.5 ? 5 : Math.floor(S.flow / 20); }
  function flowMul() { var t = flowTier(); return t >= 5 ? 4 + pk('flow') + ms('mflow') : FLOWM[t]; }
  function activeDps() { // なぞっている時に出せる毎秒ダメージ
    var brush = dmgBase() * tickRate() * (1 + (9 + 0.6 * lv('radius')) * (1 + 0.1 * cd('rad')) / 14) * (1 + critCh() * (critMul() - 1)) * (has('pen') ? 1.3 : 1);
    return brush + chainDmg() * specP * spawnRate() * 5 + autoDps();
  }
  function activeRate(c) { // 作業中の毎秒 F(コンポ c にいる場合)
    var pops = Math.min(spawnRate() * (has('rep') ? 1.15 : 1), activeDps() / hpAt(c));
    var chainN = Math.min(30, pops * 0.6 * (1 + specW * 8));
    var v = valAt(c) * (1 + 2 * specW + (has('gold') ? 0.25 * (5 + 0.25 * lv('goldv')) * (1 + 0.25 * cd('gold')) / 5 : 0)) * (1 + (0.005 + 0.002 * lv('chainv')) * chainN);
    actPops = pops; return pops * v * flowMul();
  }
  var actPops = 0;
  function idleRate(c) { return Math.min(spawnRate(), autoDps() / hpAt(c)) * valAt(c) * 1.3; }
  function inspMult() { return (1 + 0.1 * pk('insp')) * pw(1.5, ms('minsp')) * pw(1.1, pk('xinsp')) * pw(1.25, ms('xeye')) * (1 + 0.5 * S.starsAll) * pw(1.5, st('sinsp')); }
  function inspGain() { return Math.floor(pw(S.runTotal / 2e5, 0.25) * inspMult()); }
  function troGain() { return S.inspEarned >= 2000 ? Math.floor(Math.log(S.inspEarned / 200) / LN10) + st('stro') : 0; }
  function legGain() { return Math.floor(S.trophies / 30); }
  function speedMul() { return 1 + 0.1 * st('sspd'); }
  function compPrice(k) { return 5000 * pw(500, k - 1) * (1 - 0.15 * pk('comp')); }
  function earn(n) { S.frames += n; S.runTotal += n; S.allTotal += n; if (!(S.allTotal < 1e300)) { S.frames = S.runTotal = S.allTotal = 1e300; } }

  /* ───────── 自動進行 ───────── */
  function trOk(t) { var need = t[4]; if (t[3] && lv(t[0]) >= t[3]) return false; if (!need) return true; if (need === '#bots') return botCount() > 0; if (need === '#boss') return S.bossWins > 0; return has(need); }
  function autoBuy() {
    var k, u, best, bc, c, n, changed = false;
    if (S.compMax < MAXCOMP && S.frames >= compPrice(S.compMax + 1)) { S.frames -= compPrice(S.compMax + 1); S.compMax++; lastEvt = 'コンポ' + (S.compMax + 1) + ' 解禁'; }
    for (k = 0; k < FXU.length; k++) { u = FXU[k]; if (!S.fx[u.id] && S.frames >= u.cost && (!u.req || S.fx[u.req])) { S.frames -= u.cost; S.fx[u.id] = 1; changed = true; } }
    if (changed) recalc();
    for (n = 0; n < 24; n++) {
      best = -1; bc = Infinity;
      for (k = 0; k < TR.length; k++) if (trOk(TR[k])) { c = TR[k][1] * pw(TR[k][2], lv(TR[k][0])); if (c < bc) { bc = c; best = k; } }
      if (best < 0 || S.frames < bc) break;
      S.frames -= bc; S.tr[TR[best][0]] = lv(TR[best][0]) + 1;
    }
    // 一番稼げるコンポへ移動(上位は硬すぎて逆に遅いことがある)
    var bi = S.compMax, br = activeRate(S.compMax), r;
    for (k = S.compMax - 1; k >= 0 && k >= S.compMax - 3; k--) { r = activeRate(k); if (r > br) { br = r; bi = k; } }
    S.comp = bi;
  }
  function cardOk(id) { if (id === 'gold') return has('gold'); if (id === 'bot') return botCount() > 0; if (id === 'sweep') return lv('sweep') > 0; if (id === 'crit' || id === 'critx') return critCh() > 0; if (id === 'chain' || id === 'spec') return has('echo'); if (id === 'boss') return S.bossWins > 0; return true; }
  function giveCard(n) { var k, id, tries; for (k = 0; k < n; k++) { for (tries = 0; tries < 8; tries++) { id = CARDS[Math.floor(Math.random() * CARDS.length)]; if (cardOk(id)) break; id = 'val'; } S.cards[id] = cd(id) + 1; } recalc(); }
  function perkCost(p, l) { return p[4] === 'q' ? 1 + l * l : Math.ceil(p[2] * pw(p[3], l)); }
  function shop() {
    var n, k, p, l, c, best, bc, m, y;
    for (n = 0; n < 300; n++) {
      best = -1; bc = Infinity;
      for (k = 0; k < PERKS.length; k++) { p = PERKS[k]; l = pk(p[0]); if ((p[1] && l >= p[1]) || (p[4] === 'x' && S.inspAll < 1e6)) continue; c = perkCost(p, l); if (c < bc) { bc = c; best = k; } }
      if (best < 0 || S.insp < bc) break; S.insp -= bc; S.perks[PERKS[best][0]] = pk(PERKS[best][0]) + 1;
    }
    for (n = 0; n < 100; n++) { // マスタリー
      var spent = 0, bought = false;
      for (k = 0; k < MAST.length; k++) { l = ms(MAST[k][0]); spent += MAST[k][2] ? 3 * l + l * (l - 1) / 2 : l * (l + 1) / 2; }
      for (k = 0; k < MAST.length; k++) { m = MAST[k]; l = ms(m[0]); if ((m[1] && l >= m[1]) || (m[2] && S.trophies < 20 && !l)) continue; c = m[2] ? 3 + l : l + 1; if (S.trophies - spent >= c) { S.mast[m[0]] = l + 1; spent += c; bought = true; } }
      if (!bought) break;
    }
    for (n = 0; n < 100; n++) { // スタイル
      var ok = false;
      for (k = 0; k < STYLES.length; k++) { y = STYLES[k]; l = st(y[0]); if ((y[1] && l >= y[1]) || S.stars < l + 1) continue; S.stars -= l + 1; S.style[y[0]] = l + 1; ok = true; }
      if (!ok) break;
    }
    recalc();
  }
  function resetRun() {
    S.frames = pk('start') ? 50 * pw(10, pk('start')) : 0; S.runTotal = 0; S.tr = {}; S.fx = {}; S.bossLv = 0; S.cards = {};
    S.comp = 0; S.compMax = Math.min(ms('mcomp'), MAXCOMP); S.misRun = 0; S.misPops = 0; S.bossSec = 0; S.runActive = 0; S.flow = 0;
    recalc(); giveCard(2 * ms('mpick') + 3 * st('scard'));
  }
  function doExport() { var g = inspGain(); if (g < 1) return false; S.insp += g; S.inspEarned += g; S.inspAll += g; S.exports++; resetRun(); lastEvt = '書き出し +' + fmt(g); return true; }
  function doAward() { var g = troGain(); if (g < 1) return false; S.trophies += g; S.insp = 0; S.inspEarned = 0; S.perks = {}; resetRun(); lastEvt = 'アワード +' + g; return true; }
  function doLegacy() { var g = legGain(); if (g < 1) return false; S.stars += g; S.starsAll += g; S.trophies = 0; S.mast = {}; S.insp = 0; S.inspEarned = 0; S.perks = {}; resetRun(); lastEvt = 'レガシー +' + g; return true; }
  function autoPrestige() {
    var g = inspGain();
    if (g >= 1 && S.runActive >= 420 && (g >= Math.max(2, S.inspEarned * 0.4) || S.runActive >= 1800)) {
      doExport();
      var tg = troGain();
      if (tg >= 1 && (tg >= 3 || S.trophies < 3) && g < S.inspEarned * 0.3) doAward();
      if (legGain() >= 1) doLegacy();
      shop();
    }
  }

  // 1ステップ進める。dt = 経過秒、wu = その間に検知した作業量
  // AE で作業していない間は何も進めない(F・フロー・自動購入・転生すべて止まる)。作業 1 回ごとにまとめて進める。
  function step(dt, wu) {
    var sp = speedMul(), act = wu * 2.5 * sp, c = S.comp, r, n, f0 = S.runTotal;
    S.playSec += dt;
    if (!(wu > 0)) { S.idleSec += dt; return; }
    S.flow = Math.max(0, S.flow - (1.2 + 0.02 * S.flow) * (1 - 0.06 * lv('flow')) * Math.min(dt + S.idleSec, 120)); // 手を止めていた分のフロー減衰は、作業を再開した時にまとめて
    S.idleSec = 0;
    {
      S.work += wu; S.runActive += act; S.bossSec += act;
      S.flow = Math.min(100, S.flow + wu * 9);
      r = activeRate(c) + idleRate(c); earn(r * act);                      // アシスタントとオートプレイヘッドも作業 1 回ぶんだけ働く
      n = actPops * act; S.pops += n; S.misPops += n;
      n = 100 * pw(1.15, S.misRun) * (1 - 0.05 * pk('mis'));          // クライアントの要望(達成でプリセット)
      if (S.misPops >= n) { S.misPops = 0; S.misRun++; S.misDone++; giveCard(1 + (Math.random() < 0.15 * pk('pick') ? 1 : 0)); }
      n = 70 * (1 - 0.08 * pk('boss'));                                 // クライアント案件(納期内に倒せれば報酬)
      if (S.bossSec >= n) {
        S.bossSec = 0;
        if (activeDps() * (20 + lv('boss')) >= hpAt(c) * 30 * pw(1.3, S.bossLv)) { earn(valAt(c) * 25 * pw(1.08, S.bossLv) * (1 + 0.3 * lv('boss')) * (1 + 0.5 * cd('boss')) * flowMul()); S.bossLv++; S.bossWins++; giveCard(1); lastEvt = '案件を納品 Lv' + S.bossLv; }
      }
    }
    rate = S.runTotal - f0;                                              // 直近の作業 1 回で得た F
    autoBuy();
    if (S.auto) autoPrestige();
    dirtyUI = true;
  }
  function offline(sec) { } // AE を閉じていた間は進めない(互換のため関数だけ残す)

  function statsText() {
    var g = inspGain();
    return 'フレーム: ' + fmt(S.frames) + ' F(今回 ' + fmt(S.runTotal) + ' / 累計 ' + fmt(S.allTotal) + ')\n'
      + 'コンポ: ' + (S.comp + 1) + ' 個目「' + COMPS[S.comp % 10] + (S.comp >= 10 ? ' Vol.' + (Math.floor(S.comp / 10) + 1) : '') + '」(解禁 ' + (S.compMax + 1) + ')\n'
      + '品質 Lv' + lv('quality') + ' ・ 威力 Lv' + lv('power') + ' ・ 連鎖シェイプ ' + Math.round(specW * 100) + '%\n'
      + '着想(✺): ' + fmt(S.insp) + '(累計 ' + fmt(S.inspEarned) + ')・ 次の書き出しで +' + fmt(g) + '\n'
      + 'トロフィー: ' + S.trophies + ' ・ ★: ' + S.stars + '(累計 ' + S.starsAll + ')・ 書き出し ' + S.exports + ' 回\n'
      + '完成させた図形: ' + fmt(S.pops) + ' ・ 納品した案件: ' + S.bossWins + ' ・ 要望: ' + S.misDone + '\n'
      + '検知した作業量: ' + fmt(S.work) + '\n'
      + '価値倍率: ×' + fmt(G) + ' ・ ゲーム速度: ×' + speedMul().toFixed(1);
  }
  return {
    step: step, shop: shop, offline: offline, giveCard: giveCard, doExport: doExport, recalc: recalc, fresh: fresh, fmt: fmt, stats: statsText,
    inspGain: inspGain, inspMult: inspMult, flowTier: flowTier, flowMul: flowMul,
    state: function () { return S; }, set: function (x) { S = x; recalc(); }, rate: function () { return rate; },
    evt: function () { return lastEvt; }, setEvt: function (t) { lastEvt = t; }
  };
})();
if (typeof module !== 'undefined') module.exports = KFI;
