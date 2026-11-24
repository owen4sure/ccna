#!/bin/bash
# 把桌面的 CCNA 題庫加密後上傳到 https://owen4sure.github.io/ccna/
# 第一次跑＝設定密碼；之後題庫更新再跑一次，輸入同一個密碼即可（已記住的裝置不用重打）。
set -euo pipefail
cd "$(dirname "$0")"
SRC="$HOME/Desktop/證照學習/CCNA_全題型考古題庫.html"
[ -f "$SRC" ] || { echo "找不到題庫：$SRC"; exit 1; }

read -rsp "題庫密碼（至少 8 個字，輸入時不會顯示）：" PW; echo
read -rsp "再輸入一次：" PW2; echo
[ "$PW" = "$PW2" ] || { echo "兩次不一樣，請重跑一次。"; exit 1; }

CCNA_PW="$PW" node tools/encrypt.mjs "$SRC" index.html
unset PW PW2

git add index.html tools 設定密碼並上傳.sh
git commit -qm "更新題庫" || { echo "內容沒有變，不用上傳。"; exit 0; }
git push -q
echo "上傳完成，約 1 分鐘後生效：https://owen4sure.github.io/ccna/"
