// KEYFRAME ∞ — パネル側。2秒に1回 AE に作業量を問い合わせ、作業があった時だけゲームを進める。変わった文字だけ書き換える。
// 音・アニメーション・通知なし。タイマーは1本だけで、パネルを閉じればページごと破棄される。
// 詳細は右クリックメニューから別ウィンドウ(info.html)で開く。状態はそのウィンドウが開いている間だけ送る。
(function () {
  var K = KFI, cep = window.__adobe_cep__, SAVE = 'kfi_save_v1', TICK = 2000;
  var INFO_ID = 'io.sq.keyframeinfinity.info', EV_STATE = 'io.sq.keyframeinfinity.state', EV_CMD = 'io.sq.keyframeinfinity.cmd';
  var demo = !cep && /demo/.test(location.search); // ブラウザで見た目を確かめる用
  function $(id) { return document.getElementById(id); }
  var el = { f: $('f'), r: $('r'), w: $('w'), fl: $('fl'), b: $('b'), s: $('s') };
  var cache = { f: '', r: '', w: '', fl: '', s: '', b: -1 };
  function setT(k, v) { if (cache[k] !== v) { cache[k] = v; el[k].textContent = v; } }
  var wsec = 0; // この AE 起動からの作業時間(秒)。AE 側が数えて返してくる
  function hm(s) { var m = Math.floor(s / 60); return Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); }
  function hmJa(s) { var m = Math.floor(s / 60); return (m >= 60 ? Math.floor(m / 60) + '時間' : '') + (m % 60) + '分'; }

  function save() { var S = K.state(); S.lastSave = Date.now(); try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { } }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(SAVE)); if (!d) return;
      var b = K.fresh(), k; for (k in b) if (d[k] !== undefined && typeof d[k] === typeof b[k]) b[k] = d[k];
      K.set(b); // 閉じていた間の進行はなし
    } catch (e) { }
  }

  function refresh() {
    var S = K.state(), t = K.flowTier(), r = K.rate();
    setT('f', K.fmt(Math.floor(S.frames)) + ' F'); setT('r', r > 0 ? '+' + K.fmt(r) : ''); setT('w', '作業 ' + hm(wsec)); setT('fl', t ? 'フロー ×' + K.flowMul() : '');
    setT('s', 'コンポ' + (S.comp + 1) + '/' + (S.compMax + 1) + ' ・ 着想 ' + K.fmt(S.insp) + (S.trophies ? ' ・ 賞 ' + S.trophies : '') + (S.starsAll ? ' ・ ★' + S.starsAll : '') + ' ・ ' + K.evt());
    var g = K.inspGain(), m = K.inspMult(), lo = Math.pow(g / m, 4) * 2e5, hi = Math.pow((g + 1) / m, 4) * 2e5;
    var v = Math.floor(Math.max(0, Math.min(1, (S.runTotal - lo) / (hi - lo))) * 100);
    if (cache.b !== v) { cache.b = v; el.b.style.width = v + '%'; }
    menu(); if (infoOpen()) sendState();
  }

  /* ───────── 詳細ウィンドウとのやりとり ───────── */
  var infoAt = 0, lastSent = '';
  function infoOpen() { return infoAt && Date.now() - infoAt < 10000; } // ウィンドウは4秒ごとに生存を知らせてくる
  function stateText() {
    var S = K.state();
    return 'K|' + (S.auto ? 1 : 0) + '|' + (K.inspGain() >= 1 ? 1 : 0) + '|作業時間(この起動から): ' + hmJa(wsec) + '\n' + K.stats();
  }
  function sendState(force) {
    var d = stateText(); if (!force && d === lastSent) return; lastSent = d;
    if (cep) { try { cep.dispatchEvent({ type: EV_STATE, scope: 'APPLICATION', appId: '', extensionId: '', data: d }); } catch (e) { } }
    else if (demo) demoState = d;
  }
  function command(c) {
    infoAt = Date.now();
    if (c === 'export') { if (K.doExport()) { K.shop(); save(); } }
    else if (c === 'auto:1' || c === 'auto:0') { K.state().auto = c === 'auto:1'; save(); }
    else if (c === 'reset') { K.set(K.fresh()); save(); }
    if (c !== 'ping') { refresh(); sendState(true); }
  }
  function openInfo() {
    if (cep) { try { cep.requestOpenExtension(INFO_ID, ''); } catch (e) { } }
    else if (demo) window.open('info.html?demo', 'kfi_info', 'width=320,height=330');
  }
  if (cep) {
    try { cep.addEventListener(EV_CMD, function (e) { var d = e && e.data; command(typeof d === 'string' ? d : String(d)); }); } catch (e) { }
  }
  var demoState = ''; if (demo) window.KFI_demoBridge = { state: function () { infoAt = Date.now(); return demoState || stateText(); }, cmd: command };

  /* ───────── 右クリックメニュー(内容が変わった時だけ登録し直す) ───────── */
  var menuKey = '';
  function onMenu(id) {
    if (id === 'info') openInfo();
    else if (id === 'auto') command(K.state().auto ? 'auto:0' : 'auto:1');
    else if (id === 'export') command('export');
  }
  function menu() {
    if (!cep) return;
    var S = K.state(), canEx = K.inspGain() >= 1, key = (S.auto ? 1 : 0) + '' + (canEx ? 1 : 0);
    if (key === menuKey) return; menuKey = key;
    var m = { menu: [
      { id: 'info', label: '詳細を開く…', enabled: true, checkable: false, checked: false },
      { label: '---' },
      { id: 'auto', label: '書き出し・アワード・レガシーを自動で行う', enabled: true, checkable: true, checked: !!S.auto },
      { id: 'export', label: '今すぐ書き出す', enabled: canEx, checkable: false, checked: false }
    ] };
    try { cep.invokeAsync('setContextMenuByJSON', JSON.stringify(m), onMenu); } catch (e) { }
  }
  if (demo) document.addEventListener('contextmenu', function (e) { e.preventDefault(); openInfo(); });

  /* ───────── 進行 ───────── */
  var last = Date.now(), idleN = 0, saveN = 0, busyAt = 0;
  function advance(wu) {
    var t = Date.now(), dt = Math.min(30, (t - last) / 1000); last = t;
    if (wu > 0) { idleN = 0; K.step(dt, wu); refresh(); if (++saveN >= 20) { saveN = 0; save(); } } // 作業がなければ何も進めない
    else { idleN++; K.step(dt, 0); if (infoOpen()) sendState(); }
  }
  function onProbe(res) {
    busyAt = 0;
    var wu = 0, p;
    if (typeof res === 'string' && res.indexOf('|') > 0) {
      p = res.split('|'); // 作業量|プリセット|作業秒|内容
      wu = parseFloat(p[0]) || 0;
      if ((parseInt(p[1], 10) || 0) > 0) K.giveCard(parseInt(p[1], 10));
      wsec = parseInt(p[2], 10) || wsec;
      if (p[3]) K.setEvt(p[3]);
    }
    advance(wu);
  }
  function tick() {
    if (busyAt) { if (Date.now() - busyAt > 20000) busyAt = 0; else return; } // AE がレンダー中などで返事がない間は待つ
    if (cep) { if (idleN < 60 || idleN % 3 === 0) { busyAt = Date.now(); cep.evalScript('KFI_probe()', onProbe); } else advance(0); } // 2分ほど何もなければ問い合わせを1/3に
    else if (demo) { var w = Math.random() < 0.5 ? 1 + Math.random() * 4 : 0; if (w > 0) wsec += 2; advance(w); }
  }

  $('main').title = '右クリックで詳細';
  window.addEventListener('beforeunload', save);
  load(); refresh();
  setInterval(tick, TICK);
  if (demo) window.KFI_demo = { tick: tick, advance: advance };
})();
