# Sq_KeyframeInfinity

After Effects で作業するほど勝手に進む、放置型インクリメンタルゲームのパネルです。
モーショングラフィックス題材のブラウザゲーム「KEYFRAME ∞」を、AE の中で動く小さなパネルに移植したものです。

- 操作は不要。キーフレームを打つ、レイヤーを足す、値を調整する、保存する、レンダーが終わる — そのたびにゲームが進みます。
- 表示は3行だけ。音・アニメーション・通知はありません。
- プロジェクトは読むだけで、何も書き換えません。

## インストール

### ZXP(おすすめ)
1. [Releases](../../releases) から `Sq_KeyframeInfinity-x.y.z-win.zxp` をダウンロード
2. ZXP インストーラー(aescripts の ZXP Installer など)で読み込む
3. AE を再起動し、**Window > Extensions > KEYFRAME Infinity** を開く

### スクリプト版(エクステンションを入れたくない場合)
`script/KeyframeInfinity.jsx` を次のフォルダに置いて AE を再起動すると、Window メニューに出ます。

```
%APPDATA%\Adobe\After Effects\<バージョン>\Scripts\ScriptUI Panels
```

スクリプト版はセーブをファイルに書くため、Preferences > Scripting & Expressions の
「Allow Scripts to Write Files and Access Network」をオンにしてください。

## 何をすると進むか

| AE での作業 | 進み方 |
|---|---|
| キーフレームを打つ | 大(1個ごと) |
| レイヤー追加、エフェクト適用、素材の読み込み | 大 |
| 位置・スケールなどの値の調整 | 中 |
| 再生ヘッドの移動、選択の変更 | 小 |
| 保存 | ボーナス |
| レンダー完了 | 大ボーナス + プリセット1枚 |

レイヤー購入、エフェクト、コンポ移動、プリセット選択、書き出し・アワード・レガシー(転生3層)まですべて自動です。
パネルをクリックすると詳細が開き、自動転生のオン・オフとリセットができます。

## 軽さについて
- 2秒に1回、プロジェクトの状態を十数項目読むだけです。2分ほど作業がなければ頻度を 1/3 に落とします。
- 文字は内容が変わった時だけ書き換えます。保存は約90秒に1回です。
- ゲームの計算は毎回の処理でオブジェクトを新しく作りません(1回あたり数マイクロ秒)。

## 構成
```
extension/            CEP エクステンション本体(これを ZXP にする)
  CSXS/manifest.xml
  index.html          3行のパネル
  js/core.js          ゲームの計算(Node でも動く)
  js/panel.js         表示とタイマー
  jsx/host.jsx        AE 側の作業検知
script/               ScriptUI 版(1ファイル)
scripts/build-zxp.ps1 ZXP のビルド
```

## ビルド
Sq Baton / Sq_PseudoEffectMaker と同じ方式です。

```powershell
npm run build:zxp
```

- 署名ツール(Adobe ZXPSignCmd 4.1.3)は `.tools/` に置かれ、ハッシュを照合してから使います。無ければ Adobe 公式リポジトリから取得します。
- 開発用の自己署名証明書は初回に `.signing/` へ作られます。パスワードは DPAPI で暗号化して保存します。どちらもコミットしません。
- `dist/Sq_KeyframeInfinity-<version>-win.zxp` と `.sha256` ができます。

## 開発メモ
- `extension/index.html?demo` をブラウザで開くと、AE なしで見た目と進行を確認できます。
- `js/core.js` は `require()` できるので、Node で長時間ぶんの進行を一気に回してバランスを確認できます。
