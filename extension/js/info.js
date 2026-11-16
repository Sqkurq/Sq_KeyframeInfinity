// KEYFRAME ∞ — 詳細ウィンドウ。パネルから状態を受け取って表示し、操作はパネルへ送り返すだけ(ゲームの計算はしない)。
// 4秒ごとにパネルへ生存を知らせる。閉じればこのページごと破棄され、パネルも送るのをやめる。
(function () {
  var cep = window.__adobe_cep__, EV_STATE = 'io.sq.keyframeinfinity.state', EV_CMD = 'io.sq.keyframeinfinity.cmd';
  var bridge = !cep && window.opener && window.opener.KFI_demoBridge; // ブラウザでの確認用
  function $(id) { return document.getElementById(id); }
  var st = $('st'), auto = $('auto'), ex = $('ex'), rs = $('rs'), last = '', armT = 0;

  function show(d) {
    if (typeof d !== 'string' || d.indexOf('K|') !== 0 || d === last) return; last = d;
    var p = d.split('|'); // K|自動|書き出し可|本文
    auto.checked = p[1] === '1'; ex.disabled = p[2] !== '1';
    st.textContent = p.slice(3).join('|');
  }
  function send(c) {
    if (cep) { try { cep.dispatchEvent({ type: EV_CMD, scope: 'APPLICATION', appId: '', extensionId: '', data: c }); } catch (e) { } }
    else if (bridge) { bridge.cmd(c); show(bridge.state()); }
  }
  if (cep) { try { cep.addEventListener(EV_STATE, function (e) { show(e && e.data); }); } catch (e) { } }

  auto.onchange = function () { send(auto.checked ? 'auto:1' : 'auto:0'); };
  ex.onclick = function () { send('export'); };
  rs.onclick = function () { // 確認ダイアログを使わず、3秒以内にもう一度押したら消す
    if (Date.now() - armT < 3000) { armT = 0; rs.className = ''; rs.textContent = 'リセット'; send('reset'); return; }
    armT = Date.now(); rs.className = 'arm'; rs.textContent = 'もう一度押すと全消去';
    setTimeout(function () { if (armT && Date.now() - armT >= 3000) { armT = 0; rs.className = ''; rs.textContent = 'リセット'; } }, 3100);
  };
  function ping() { if (bridge) show(bridge.state()); else send('ping'); }
  send('hello'); setInterval(ping, 4000);
})();
