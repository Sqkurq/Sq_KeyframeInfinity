// KEYFRAME ∞ — After Effects 側。作業の変化を数項目だけ読み取って「作業量|プリセット枚数|作業秒|内容」を返す。
// プロジェクトは読むだけで、何も書き換えない。
var KFI_fp = { init: false, items: 0, dirty: false, done: 0, comp: -1, layers: 0, time: -1, lyr: -1, nsel: 0, fx: 0, sig: 0, nprop: 0, keys: 0, dur: 0, tmv: 0 };
// 作業時間: 作業を検知した間隔が 90 秒以内ならその間を作業中として足す(離れていた時間は数えない)。
// AE の ExtendScript 全体で共有する $.global に置くので、パネルを開き直しても続き、AE を再起動すると 0 から。
function KFI_work(wu) {
  var g = $.global, t = new Date().getTime();
  if (typeof g.KFI_wsec !== 'number') { g.KFI_wsec = 0; g.KFI_wlast = 0; }
  if (wu > 0) { g.KFI_wsec += (g.KFI_wlast && t - g.KFI_wlast <= 90000) ? (t - g.KFI_wlast) / 1000 : 2; g.KFI_wlast = t; }
  return Math.floor(g.KFI_wsec);
}
function KFI_probe() {
  var fp = KFI_fp, lastEvt = '', cards = 0, r = 0;
  function giveCard(n) { cards += n; }
  try { r = KFI_scan(fp, giveCard, function (t) { lastEvt = t; }); } catch (e) { r = 0; }
  return r + '|' + cards + '|' + KFI_work(r) + '|' + lastEvt; // 作業量|プリセット|作業秒|内容
}
function KFI_scan(fp, giveCard, say) {
  var lastEvt = '';
    var wu = 0, p = app.project, n, d, c, sl, L, v, k, sp, kk, tg, rq;
    if (!p) return 0;
    n = p.numItems; if (fp.init && n > fp.items) { wu += Math.min(5, n - fp.items) * 3; lastEvt = '素材を追加'; } fp.items = n;
    d = false; try { d = p.dirty; } catch (e1) { }
    if (fp.init) { if (fp.dirty && !d) { wu += 12; lastEvt = '保存'; } else if (!fp.dirty && d) { wu += 1; lastEvt = '編集'; } } fp.dirty = d;
    rq = p.renderQueue; n = 0;
    try { for (k = Math.min(rq.numItems, 40); k >= 1; k--) if (rq.item(k).status === RQItemStatus.DONE) n++; } catch (e2) { }
    if (fp.init && n > fp.done) { wu += 60 * (n - fp.done); giveCard(n - fp.done); lastEvt = 'レンダー完了'; } fp.done = n;
    c = p.activeItem;
    if (c && (c instanceof CompItem)) {
      if (c.id !== fp.comp) { if (fp.init && fp.comp !== -1) { wu += 1; lastEvt = 'コンポを切り替え'; } fp.comp = c.id; fp.layers = c.numLayers; fp.time = c.time; fp.dur = c.duration; fp.lyr = -1; }
      n = c.numLayers; if (n > fp.layers) { wu += Math.min(6, n - fp.layers) * 4; lastEvt = 'レイヤーを追加'; } else if (n < fp.layers) { wu += 1; lastEvt = 'レイヤーを整理'; } fp.layers = n;
      if (c.time !== fp.time) { fp.tmv++; if (fp.tmv <= 3) { wu += 0.4; if (wu < 1) lastEvt = '時間を移動'; } fp.time = c.time; } else fp.tmv = 0; // プレビュー再生しっぱなしは作業に数えない
      if (c.duration !== fp.dur) { wu += 1; fp.dur = c.duration; lastEvt = 'コンポ設定を変更'; }
      sl = c.selectedLayers; n = sl.length;
      if (n !== fp.nsel) { wu += 0.3; fp.nsel = n; }
      if (n) {
        L = sl[0];
        try {
          tg = L.property('ADBE Transform Group'); v = 0;
          k = tg.property('ADBE Opacity'); if (k) v += k.value;
          k = tg.property('ADBE Rotate Z'); if (k) v += k.value * 3;
          k = tg.property('ADBE Scale'); if (k) v += k.value[0] * 7 + k.value[1] * 11;
          k = tg.property('ADBE Position'); if (k && k.dimensionsSeparated !== true) v += k.value[0] * 13 + k.value[1] * 17;
          v += L.inPoint * 19 + L.outPoint * 23 + L.startTime * 29;
          k = L.property('ADBE Effect Parade'); kk = k ? k.numProperties : 0;
          if (L.index === fp.lyr) {
            if (kk > fp.fx) { wu += 4 * Math.min(3, kk - fp.fx); lastEvt = 'エフェクトを適用'; }
            else if (v !== fp.sig) { wu += 1.5; lastEvt = '値を調整'; }
          } else { wu += 0.3; }
          fp.lyr = L.index; fp.fx = kk; fp.sig = v;
        } catch (e3) { }
        try {
          sp = c.selectedProperties; n = sp.length; kk = 0;
          for (k = 0; k < n && k < 8; k++) if (sp[k].propertyType === PropertyType.PROPERTY) kk += sp[k].numKeys;
          if (n === fp.nprop && kk > fp.keys) { wu += 3 * Math.min(10, kk - fp.keys); lastEvt = 'キーフレーム'; }
          fp.nprop = n; fp.keys = kk;
        } catch (e4) { }
      } else fp.lyr = -1;
    } else fp.comp = -1;
    if (lastEvt) say(lastEvt);
    if (!fp.init) { fp.init = true; return 0; }
    return wu;
}
