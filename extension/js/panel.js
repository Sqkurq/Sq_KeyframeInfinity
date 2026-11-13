// KEYFRAME ∞ — パネル側。2秒に1回 AE に作業量を問い合わせてゲームを進め、変わった文字だけ書き換える。
// 音・アニメーション・通知なし。タイマーは1本だけで、パネルを閉じればページごと破棄される。
(function () {
  var K = KFI, cep = window.__adobe_cep__, SAVE = 'kfi_save_v1', TICK = 2000;
  var demo = !cep && /demo/.test(location.search); // ブラウザで見た目を確かめる用
  function $(id) { return document.getElementById(id); }
  var el = { f: $('f'), r: $('r'), fl: $('fl'), b: $('b'), s: $('s'), st: $('st'), auto: $('auto'), ex: $('ex') };
  var cache = { f: '', r: '', fl: '', s: '', b: -1 };
  function setT(k, v) { if (cache[k] !== v) { cache[k] = v; el[k].textContent = v; } }

  function save() { var S = K.state(); S.lastSave = Date.now(); try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { } }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(SAVE)); if (!d) return;
      var b = K.fresh(), k; for (k in b) if (d[k] !== undefined && typeof d[k] === typeof b[k]) b[k] = d[k];
      K.set(b); if (b.lastSave) K.offline((Date.now() - b.lastSave) / 1000);
    } catch (e) { }
  }

  function refresh() {
    var S = K.state(), t = K.flowTier();
    setT('f', K.fmt(Math.floor(S.frames)) + ' F'); setT('r', '+' + K.fmt(K.rate()) + '/秒'); setT('fl', t ? 'フロー ×' + K.flowMul() : '');
    setT('s', 'コンポ' + (S.comp + 1) + '/' + (S.compMax + 1) + ' ・ 着想 ' + K.fmt(S.insp) + (S.trophies ? ' ・ 賞 ' + S.trophies : '') + (S.starsAll ? ' ・ ★' + S.starsAll : '') + ' ・ ' + K.evt());
    var g = K.inspGain(), m = K.inspMult(), lo = Math.pow(g / m, 4) * 2e5, hi = Math.pow((g + 1) / m, 4) * 2e5;
    var v = Math.floor(Math.max(0, Math.min(1, (S.runTotal - lo) / (hi - lo))) * 100);
    if (cache.b !== v) { cache.b = v; el.b.style.width = v + '%'; }
    if (open) { el.st.textContent = K.stats(); el.ex.disabled = g < 1; }
  }

  var last = Date.now(), idleN = 0, saveN = 0, busyAt = 0, open = false;
  function advance(wu) {
    var t = Date.now(), dt = (t - last) / 1000; last = t;
    if (dt > 30) { K.offline(dt); dt = 2; }           // AE が止まっていた時間は放置扱い
    if (wu > 0) idleN = 0; else idleN++;
    K.step(dt, wu); refresh();
    if (++saveN >= 45) { saveN = 0; save(); }          // 約90秒ごとに保存
  }
  function onProbe(res) {
    busyAt = 0;
    var wu = 0, i, j, n;
    if (typeof res === 'string' && (i = res.indexOf('|')) > 0) {
      wu = parseFloat(res) || 0; j = res.indexOf('|', i + 1);
      n = parseInt(res.substring(i + 1, j), 10) || 0; if (n > 0) K.giveCard(n);
      if (j + 1 < res.length) K.setEvt(res.substring(j + 1));
    }
    advance(wu);
  }
  function tick() {
    if (busyAt) { if (Date.now() - busyAt > 20000) busyAt = 0; else return; } // AE がレンダー中などで返事がない間は待つ
    if (cep && (idleN < 60 || idleN % 3 === 0)) { busyAt = Date.now(); cep.evalScript('KFI_probe()', onProbe); } // 2分ほど何もなければ問い合わせを1/3に
    else advance(demo && Math.random() < 0.5 ? 1 + Math.random() * 4 : 0);
  }

  $('main').onclick = function () { open = !open; document.body.className = open ? 'open' : ''; el.auto.checked = !!K.state().auto; refresh(); };
  el.auto.onchange = function () { K.state().auto = el.auto.checked; save(); };
  el.ex.onclick = function () { if (K.doExport()) { K.shop(); save(); refresh(); } };
  $('rs').onclick = function () { if (confirm('進行状況をすべて消します。よろしいですか?')) { K.set(K.fresh()); save(); refresh(); } };
  window.addEventListener('beforeunload', save);

  load(); refresh();
  setInterval(tick, TICK);
  if (demo) window.KFI_demo = { tick: tick, advance: advance };
})();
