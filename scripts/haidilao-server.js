const http = require('http');
const https = require('https');

const HAIDILAO_API = '/api/gateway/tydc/front/queue/getVipCodeAndTime';
const HEADER_SETS = [
  { k2: '3oGEz5VWFjTWhsSpUVXZctVWDifexJ2I', k4: 'MI56AX7gMmD34mQF', k6: 'a23ufHMFhEj64yAF6hlMs7y2VqE=' },
  { k2: '0nZBSgo33VqrYhlFefpMlgX2Z5zzsoDG', k4: 'bGEjl70Epa86zfk1', k6: 'rBYDIG60AwDbmaQtiX1jtGm4ZYM=' },
  { k2: 'vjHNxq36vTWDqpBaR7SvZFVCW17oaQEM', k4: 'LM59HYtHktWS4DxW', k6: 'bfxKJFFtiojIFVvOfd8lWNo/ZCQ=' },
  { k2: 'SboX7mrkzZoWQf3Fds4rIcYtDNr5jM5i', k4: '9iPvW3326wkIDSwu', k6: 'DtWipNVLwHplJ1zZl5Y9/F1pryc=' },
  { k2: 'DaLS7X5J9V5DKuytSge57QRhVqRoP6GY', k4: 'U5tG2dKLlvN0meS1', k6: 'upgFjAmdHpm4b4gTb/ne7eCxoUA=' },
  { k2: 'QjhtV4eS9voRP6RCZiivoJEaL1Gbfzbl', k4: 'Rlfu5j5BGjPy6DQT', k6: 'RKnYLO/p4QMlPm3HaQV6/UCrWeA=' },
  { k2: 'TCBsJgYzVsmhp3rrCiSSK4o8ZmDYauSk', k4: 'pkhCbu1qtkkApAZI', k6: 'xY+pemIoufgiSRwmaSb1gnCH/Dw=' },
  { k2: 'XLj9HwQt07fIaIdqSVnxY1enWk7qpp0D', k4: 'rDEA7n4QIEzuZBHJ', k6: 'ZL2AKSgm+Bh4GcYVxK002T5yG1w=' },
];

const BASE = {
  '_haidilao_app_token': 'TOKEN_APP_e8ac04f6-6bbf-47a8-873d-aff8e0c60511',
  'user-agent': 'Dart/3.6 (dart:io)',
  'k1': 'Android', 'publicattribute': '{"$lib": "Android"}', 'content-type': 'application/json',
  'x-source': 'app', 'http_wallet_api_version': '2.0', 'systype': 'Android',
  'k5': '0a13c288', 'kid': 'Android.20260628.9cf3.3c5f07', 'x-device-model': 'Phone',
  'version': '9.10.4', 'x-device-mobile-type': 'REDMI-2510DRK44C', 'platformname': 'app',
  'x-device-id': '692152c9-3090-4106-9340-fcdfc2f5e1ad', 'x-device-mobile-name': 'REDMI-2510DRK44C',
};

let idx = 0;
function callAPI() {
  return new Promise((resolve, reject) => {
    const set = HEADER_SETS[idx++ % HEADER_SETS.length];
    const headers = { ...BASE, k3: String(Date.now()), k4: set.k4, k6: set.k6, k2: set.k2 };
    const body = JSON.stringify(headers);
    const req = https.request({
      hostname: 'superapp-public.kiwa-tech.com', path: HAIDILAO_API, method: 'POST',
      headers: { ...headers, 'accept-encoding': 'gzip', 'content-length': String(Buffer.byteLength('{}')) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const ct = res.headers['content-type'] || '';
        resolve({ status: res.statusCode, body: data, ct, cookie: res.headers['set-cookie'] || '' });
      });
    });
    req.on('error', reject);
    req.write('{}');
    req.end();
  });
}

// For QR code generation, we use a CDN library in the browser
const HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>海底捞动态码</title>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
.card{background:white;border-radius:24px;padding:40px 32px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.08);max-width:380px;width:90%}
h1{font-size:22px;color:#1f2937;margin-bottom:4px}
.nick{color:#6b7280;font-size:14px;margin-bottom:16px}
#qrcode-wrap{display:inline-block;padding:16px;border:3px solid #fee2e2;border-radius:16px;margin:8px auto;background:white}
#qrcode-wrap img,#qrcode-wrap canvas{width:260px!important;height:260px!important;border-radius:8px;display:block}
#qrcode-wrap canvas{width:260px!important;height:260px!important}
.status{color:#9ca3af;font-size:13px;margin:12px 0}
.error{color:#dc2626;font-size:13px;margin:12px 0;word-break:break-all}
.btn-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:4px}
button{border:none;padding:10px 24px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-primary{background:#dc2626;color:white}.btn-primary:hover{background:#b91c1c}
.btn-green{background:#16a34a;color:white}.btn-gray{background:#e5e7eb;color:#4b5563}
.btn-gray:hover{background:#d1d5db}
.loading{width:260px;height:260px;display:flex;align-items:center;justify-content:center;background:#fafafa;border-radius:8px;color:#d1d5db;font-size:14px}
.spinner{width:36px;height:36px;border:4px solid #fecaca;border-top-color:#dc2626;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
.footer{color:#d1d5db;font-size:11px;margin-top:16px}
</style>
</head>
<body>
<div class="card">
<h1>海底捞黑海会员</h1>
<p class="nick" id="nick">加载中...</p>
<div id="qrcode-wrap"><div class="loading" id="loading"><div class="spinner"></div></div><div id="qrcode" style="display:none"></div></div>
<p class="status" id="status">正在获取动态码...</p>
<div class="btn-row">
<button class="btn-primary" onclick="refresh()">手动刷新</button>
<button id="autoBtn" class="btn-green">自动刷新 ON</button>
<button class="btn-gray" onclick="downloadQR()">下载图片</button>
</div>
<p class="footer">本地服务 | 每10秒自动刷新</p>
</div>
<script>
var autoRefresh=true,countdown=10,qrInstance=null,currentVipCode='',currentNick='';

function showQR(vipCode,nickName){
  currentVipCode=vipCode;currentNick=nickName;
  document.getElementById('nick').textContent='昵称：'+nickName;
  document.getElementById('loading').style.display='none';
  var el=document.getElementById('qrcode');el.style.display='block';el.innerHTML='';
  if(qrInstance)qrInstance.clear();
  qrInstance=new QRCode(el,{text:vipCode,width:260,height:260});
}
function showError(msg){
  document.getElementById('status').className='error';
  document.getElementById('status').textContent=msg;
}
function updateStatus(s){document.getElementById('status').className='status';document.getElementById('status').textContent=s;}

function fetchQR(){
  updateStatus('刷新中...');
  fetch('/api/qr').then(function(r){return r.json()}).then(function(d){
    if(d.success){showQR(d.vipCode,d.nickName);countdown=10}else{showError(d.error||'获取失败')}
  }).catch(function(e){showError(e.message)});
}

function refresh(){countdown=10;fetchQR()}

function downloadQR(){
  if(!currentVipCode)return;
  var c=document.querySelector('#qrcode canvas');
  if(c){var link=document.createElement('a');link.download='haidilao_'+Date.now()+'.png';
  link.href=c.toDataURL('image/png');link.click()}
}

setInterval(function(){
  if(!autoRefresh)return;
  countdown--;
  if(countdown<=0){fetchQR();countdown=10}
  else{updateStatus(countdown+'s 后自动刷新')}
},1000);

document.getElementById('autoBtn').onclick=function(){
  autoRefresh=!autoRefresh;
  this.textContent=autoRefresh?'自动刷新 ON':'自动刷新 OFF';
  this.className=autoRefresh?'btn-green':'btn-gray';
  countdown=10;
  if(autoRefresh)updateStatus(countdown+'s 后自动刷新');
  else updateStatus('自动刷新已关闭');
};

fetchQR();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/api/qr') {
    callAPI().then(result => {
      if (result.ct.includes('json')) {
        try {
          const data = JSON.parse(result.body);
          if (data.success) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ success: true, vipCode: data.data.vipCode, nickName: data.data.nickName }));
            return;
          }
        } catch (e) {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'API错误: ' + result.body.substring(0, 80) }));
    }).catch(e => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

const PORT = 3456;
server.listen(PORT, () => {
  console.log('');
  console.log('  ===========================================');
  console.log('    海底捞黑海会员动态码 - 本地服务');
  console.log('  ===========================================');
  console.log('');
  console.log('  浏览器访问: http://localhost:' + PORT);
  console.log('');
  console.log('  按 Ctrl+C 停止服务');
  console.log('  ===========================================');
  console.log('');
});
