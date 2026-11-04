# 避難の訓練ですぞ

上から空爆が降ってくる。よけて、生きのびるだけ。

遊ぶ：https://nasubi-no-oniwa.github.io/hinan-kunren/

- `index.html` … ゲーム本体
- `sim.js` … 動きと爆撃の計算（ゲームと記録の確認で同じものを使う）
- `database.rules.hk.json` … ランキングのルール。GitHub に上げると自動で ft-green に反映（フェアリーズタワーのルールはそのまま）
- `hk-remove.txt` … 消したい記録のIDを1行ずつ書いて上げると、その記録を消す
- 記録の確認は10分ごとに自動で動き、計算が合わない記録を消す
