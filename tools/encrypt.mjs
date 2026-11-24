// 用法：CCNA_PW=密碼 node tools/encrypt.mjs <原始題庫.html> <輸出 index.html>
// 原檔先 gzip 再用 AES-256-GCM 加密（金鑰由密碼經 PBKDF2-SHA256 60 萬次導出）。
// 輸出的頁面只有密碼畫面與密文，解開後在瀏覽器裡還原成原本的題庫頁面。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [src, out] = process.argv.slice(2);
const pw = process.env.CCNA_PW || '';
if (!src || !out) { console.error('缺少輸入或輸出路徑'); process.exit(1); }
if (pw.length < 8) { console.error('密碼至少 8 個字'); process.exit(1); }

// 鹽值固定存檔：同一個密碼重新上傳時，已記住密碼的裝置不用重打
const saltFile = join(dirname(fileURLToPath(import.meta.url)), 'salt.txt');
if (!existsSync(saltFile)) writeFileSync(saltFile, randomBytes(16).toString('base64') + '\n');
const salt = Buffer.from(readFileSync(saltFile, 'utf8').trim(), 'base64');
const iterations = 600000;
const iv = randomBytes(12);
const key = pbkdf2Sync(pw, salt, iterations, 32, 'sha256');
const c = createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([c.update(gzipSync(readFileSync(src), { level: 9 })), c.final(), c.getAuthTag()]);

const P = JSON.stringify({ salt: salt.toString('base64'), iv: iv.toString('base64'), it: iterations, data: ct.toString('base64') });

const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light"><meta name="robots" content="noindex,nofollow">
<link rel="icon" href="data:,"><title>CCNA 練習題庫</title>
<style>
:root{--canvas:#f4f6f8;--surface:#fff;--ink:#1d2935;--muted:#566575;--accent:#176b63;--line:#dde4e9;--bad:#a33535}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:var(--canvas);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang TC","Microsoft JhengHei",sans-serif}
form{width:100%;max-width:360px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:28px 24px}
h1{margin:0 0 20px;font-size:22px;line-height:1.3}
label{display:block;font-size:14px;color:var(--muted);margin-bottom:6px}
input[type=password]{width:100%;min-height:46px;border:1px solid #b9c5ce;border-radius:8px;padding:10px 12px;font:inherit;font-size:16px}
input:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.remember{display:flex;align-items:center;gap:8px;margin:14px 0 18px;font-size:15px;color:var(--ink)}
.remember input{width:18px;height:18px;accent-color:var(--accent);margin:0}
button{width:100%;min-height:46px;border:0;border-radius:8px;background:var(--accent);color:#fff;font:inherit;font-weight:600;cursor:pointer}
button:disabled{opacity:.6;cursor:default}
#msg{min-height:22px;margin:12px 0 0;font-size:14px;color:var(--bad)}
#msg.wait{color:var(--muted)}
</style></head><body>
<form id="f" hidden autocomplete="on">
<h1>CCNA 練習題庫</h1>
<label for="pw">密碼</label>
<input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
<label class="remember"><input id="rm" type="checkbox" checked>在這台裝置記住</label>
<button id="go" type="submit">開啟</button>
<p id="msg" role="status"></p>
</form>
<script>
(function(){
var P=${P};
var LS='ccna_unlock_v1';
var f=document.getElementById('f'),pw=document.getElementById('pw'),rm=document.getElementById('rm'),go=document.getElementById('go'),msg=document.getElementById('msg');
function b64(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function u2b(u){var s='';for(var i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
function say(t,wait){msg.textContent=t;msg.className=wait?'wait':''}
function store(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}
function read(k){try{return localStorage.getItem(k)}catch(e){return null}}
function derive(p){return crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveKey']).then(function(b){return crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(P.salt),iterations:P.it,hash:'SHA-256'},b,{name:'AES-GCM',length:256},true,['decrypt'])})}
function unlock(key){return crypto.subtle.decrypt({name:'AES-GCM',iv:b64(P.iv)},key,b64(P.data)).then(function(buf){return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text()})}
function show(html){document.open();document.write(html);document.close()}
function ask(){f.hidden=false;pw.focus()}
if(!window.crypto||!crypto.subtle||typeof DecompressionStream==='undefined'){f.hidden=false;go.disabled=true;say('這個瀏覽器太舊，請更新後再開。');return}
f.addEventListener('submit',function(e){
  e.preventDefault();var key;go.disabled=true;say('開啟中…',true);
  derive(pw.value).then(function(k){key=k;return unlock(k)}).then(function(html){
    if(rm.checked){return crypto.subtle.exportKey('raw',key).then(function(r){store(LS,u2b(new Uint8Array(r)));show(html)})}
    store(LS,null);show(html);
  }).catch(function(){go.disabled=false;say('密碼不對，再試一次。');pw.select()});
});
var saved=read(LS);
if(!saved){ask();return}
crypto.subtle.importKey('raw',b64(saved),{name:'AES-GCM'},false,['decrypt']).then(unlock).then(show).catch(function(){store(LS,null);ask()});
})();
</script></body></html>
`;
writeFileSync(out, html);
console.log('已加密：' + out + '（' + (Buffer.byteLength(html) / 1048576).toFixed(1) + ' MB）');
