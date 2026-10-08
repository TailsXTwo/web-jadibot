import { randomUUID } from 'crypto'

const TTT_HTML = `<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
html,body{width:100%}
body{background:linear-gradient(165deg,#071538,#040a1e 60%,#02061a);padding:8px;color:#eaf2ff;overflow-y:auto}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:2px 2px 8px;gap:8px}
.tt{font:900 18px 'Arial Black';color:#58c7ff;text-shadow:0 0 12px #58c7ff66;letter-spacing:1px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:2px;color:#7a9cc8;text-shadow:none}
.hrs{display:flex;gap:5px;align-items:center}
.hr{background:rgba(0,0,0,.42);border:1px solid rgba(88,199,255,.3);border-radius:9px;padding:3px 7px;text-align:center;min-width:47px}
.hr i{display:block;font:700 7px Arial;font-style:normal;letter-spacing:1px;color:#7a9cc8}
.hr b{font:900 13px 'Arial Black';color:#ffd75e;font-variant-numeric:tabular-nums}
.mbtn{width:34px;height:34px;border:2px solid rgba(88,199,255,.3);border-radius:9px;background:rgba(0,0,0,.42);color:#fff;font-size:15px;cursor:pointer}
.mbtn:active{filter:brightness(1.6)}
.gw{position:relative;border:2px solid rgba(88,199,255,.3);border-radius:16px;overflow:hidden;background:#050b20;box-shadow:0 0 22px rgba(88,199,255,.16)}
canvas{width:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.pd{height:50px;border:2px solid rgba(255,255,255,.18);border-radius:14px;font:900 13px 'Arial Black';color:#fff;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.5)}
.pd:active{transform:translateY(3px);box-shadow:none;filter:brightness(1.3)}
#newB{background:linear-gradient(#58c7ff,#1f7fd6 60%,#0a3a6e)}
#botB{background:linear-gradient(#b792ff,#7049d1 60%,#39217f)}
.hint{text-align:center;font:600 9px Arial;color:#7a9cc8;margin-top:7px}
.credit{text-align:center;font:600 8px Arial;color:#647a9f;margin-top:7px;padding-bottom:2px}
</style>
<div id="app">
  <div class="hdr">
    <div class="tt">⭕ TIC TAC TOE<small>VALZZ ARCADE</small></div>
    <div class="hrs">
      <div class="hr"><i>WIN</i><b id="wn">0</b></div>
      <div class="hr"><i>LOSE</i><b id="ls">0</b></div>
      <div class="hr"><i>DRAW</i><b id="dr">0</b></div>
      <button class="mbtn" id="muteB">🔊</button>
    </div>
  </div>
  <div class="gw"><canvas id="cv" width="404" height="470"></canvas></div>
  <div class="pads">
    <button class="pd" id="newB">↻ NEW GAME</button>
    <button class="pd" id="botB">🤖 BOT: ON</button>
  </div>
  <div class="hint" id="hint">Kamu = X · bot = O · raih 3 kotak sejajar untuk menang</div>
  <div class="credit">Game by: Valzz</div>
</div>
<script>
(function(){
'use strict';
var cv=document.getElementById('cv'),x=cv.getContext('2d'),W=404,H=470,DPR=2;
cv.width=W*DPR;cv.height=H*DPR;
var wn=document.getElementById('wn'),ls=document.getElementById('ls'),dr=document.getElementById('dr');
var hint=document.getElementById('hint'),muteB=document.getElementById('muteB'),botB=document.getElementById('botB');
var scores={win:0,lose:0,draw:0}, board=[], turn='X', state='ready', botOn=true, winner=null, winLine=null, pulse=0, frame=0, lastMove=-1, muted=false, aiBusy=false;
try{scores=JSON.parse(localStorage.getItem('ttt_scores')||'{"win":0,"lose":0,"draw":0}')}catch(e){}
try{botOn=localStorage.getItem('ttt_bot')!=='0'}catch(e){}
try{muted=localStorage.getItem('ttt_mute')==='1'}catch(e){}
wn.textContent=scores.win;ls.textContent=scores.lose;dr.textContent=scores.draw;botB.textContent=botOn?'🤖 BOT: ON':'👥 2 PLAYER';muteB.textContent=muted?'🔇':'🔊';

var AC=null;
function ac(){if(muted)return null;if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended'){try{AC.resume()}catch(e){}}return AC}
function tone(f,d,t,v,at){var a=ac();if(!a)return;try{var n=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain();o.type=t||'sine';o.frequency.setValueAtTime(f,n);g.gain.setValueAtTime(v||.08,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g);g.connect(a.destination);o.start(n);o.stop(n+d+.02)}catch(e){}}
function sMove(){tone(420,.07,'sine',.07)}
function sWin(){[523,659,784,1047].forEach(function(f,i){tone(f,.12,'triangle',.11,i*.06)})}
function sLose(){[392,330,262].forEach(function(f,i){tone(f,.16,'sawtooth',.09,i*.08)})}
function sDraw(){[440,494,440].forEach(function(f,i){tone(f,.13,'triangle',.08,i*.08)})}

function saveScores(){try{localStorage.setItem('ttt_scores',JSON.stringify(scores))}catch(e){}}
function savePrefs(){try{localStorage.setItem('ttt_bot',botOn?'1':'0');localStorage.setItem('ttt_mute',muted?'1':'0')}catch(e){}}

function reset(){
  board=['','','','','','','','',''];turn='X';state='play';winner=null;winLine=null;lastMove=-1;aiBusy=false;
  hint.textContent=botOn?'Kamu = X · bot = O · giliran kamu':'2 PLAYER · giliran X';
}
function lines(){return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]}
function check(b){
  var ls2=lines();
  for(var i=0;i<ls2.length;i++){var a=ls2[i][0],c=ls2[i][1],d=ls2[i][2];if(b[a]&&b[a]===b[c]&&b[a]===b[d])return{winner:b[a],line:ls2[i]}}
  if(b.every(Boolean))return{winner:'draw',line:null};
  return null;
}
function finish(res){
  state='over';winner=res.winner;winLine=res.line; pulse=1;
  if(res.winner==='X'){scores.win++;hint.textContent='🏆 KAMU MENANG! Tekan NEW GAME untuk main lagi';sWin()}
  else if(res.winner==='O'){scores.lose++;hint.textContent='🤖 KAMU KALAH. Coba lagi!';sLose()}
  else{scores.draw++;hint.textContent='🤝 SERI! Tidak ada pemenang.';sDraw()}
  wn.textContent=scores.win;ls.textContent=scores.lose;dr.textContent=scores.draw;saveScores();
}
function place(i,p){
  if(state!=='play'||board[i]||aiBusy||(botOn&&turn==='O'))return false;
  board[i]=p;lastMove=i;sMove();
  var r=check(board);
  if(r){finish(r);return true}
  turn=p==='X'?'O':'X';
  hint.textContent=botOn?(turn==='X'?'Giliran kamu':'Bot sedang berpikir...'):('Giliran '+turn);
  if(botOn&&turn==='O'){aiBusy=true;setTimeout(botMove,280)}
  return true;
}
function bestMove(){
  var empt=[];for(var i=0;i<9;i++)if(!board[i])empt.push(i);
  if(!empt.length)return -1;
  for(var q=0;q<empt.length;q++){var id=empt[q],b=board.slice();b[id]='O';var r=check(b);if(r&&r.winner==='O')return id}
  for(q=0;q<empt.length;q++){id=empt[q];b=board.slice();b[id]='X';var rr=check(b);if(rr&&rr.winner==='X')return id}
  if(!board[4])return 4;
  var corners=[0,2,6,8].filter(function(i){return !board[i]});if(corners.length)return corners[Math.floor(Math.random()*corners.length)];
  return empt[Math.floor(Math.random()*empt.length)];
}
function botMove(){if(state!=='play'||!botOn||turn!=='O'){aiBusy=false;return}var i=bestMove();if(i>=0){board[i]='O';lastMove=i;sMove()}aiBusy=false;var r=check(board);if(r)finish(r);else{turn='X';hint.textContent='Giliran kamu'}} 
function cellAt(e){
  var r=cv.getBoundingClientRect(),mx=(e.clientX-r.left)*(W/r.width),my=(e.clientY-r.top)*(H/r.height);
  var sz=118,ox=26,oy=112,cx=Math.floor((mx-ox)/sz),cy=Math.floor((my-oy)/sz);
  if(cx<0||cx>2||cy<0||cy>2)return -1;
  return cy*3+cx;
}
function onTap(e){e.preventDefault();ac();var i=cellAt(e);if(i>=0)place(i,'X')}
cv.addEventListener('pointerdown',onTap);
document.getElementById('newB').addEventListener('pointerdown',function(e){e.preventDefault();ac();reset()});
botB.addEventListener('pointerdown',function(e){
  e.preventDefault();ac();botOn=!botOn;botB.textContent=botOn?'🤖 BOT: ON':'👥 2 PLAYER';savePrefs();reset()
});
muteB.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();muted=!muted;muteB.textContent=muted?'🔇':'🔊';savePrefs();if(!muted)ac()});
document.addEventListener('keydown',function(e){if(e.key.toLowerCase()==='r')reset()});

function rr(px,py,w,h,r){
  x.beginPath();x.moveTo(px+r,py);x.lineTo(px+w-r,py);x.quadraticCurveTo(px+w,py,px+w,py+r);x.lineTo(px+w,py+h-r);x.quadraticCurveTo(px+w,py+h,px+w-r,py+h);x.lineTo(px+r,py+h);x.quadraticCurveTo(px,py+h,px,py+h-r);x.lineTo(px,py+r);x.quadraticCurveTo(px,py,px+r,py);x.closePath()
}
function draw(){
  x.setTransform(DPR,0,0,DPR,0,0);frame++;pulse=Math.max(0,pulse-.035);
  var bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0d1f45');bg.addColorStop(1,'#050a1d');x.fillStyle=bg;x.fillRect(0,0,W,H);
  x.fillStyle='rgba(88,199,255,.06)';for(var s=0;s<20;s++){var yy=(s*31+(frame*.25))%H;x.fillRect(0,yy,W,1)}
  x.textAlign='center';x.font='900 26px Arial';x.fillStyle='#eaf2ff';x.fillText(state==='ready'?'TIC TAC TOE':'MATCH',W/2,42);
  x.font='700 10px Arial';x.fillStyle='#7a9cc8';x.fillText(botOn?'PLAYER X  VS  BOT O':'PLAYER X  VS  PLAYER O',W/2,59);
  rr(82,70,240,30,9);x.fillStyle='rgba(0,0,0,.28)';x.fill();x.strokeStyle='rgba(88,199,255,.2)';x.stroke();
  x.font='900 12px Arial';x.fillStyle=turn==='X'&&state==='play'?'#58c7ff':'#9aa7c7';x.fillText('X '+(turn==='X'&&state==='play'?'•':'')+'     ',W/2,89);
  x.fillStyle=turn==='O'&&state==='play'?'#ffd75e':'#9aa7c7';x.fillText('     O '+(turn==='O'&&state==='play'?'•':''),W/2,89);

  var ox=26,oy=112,sz=118;
  x.shadowColor='#58c7ff';x.shadowBlur=18;pulse>0&&(x.shadowBlur=26);x.fillStyle='rgba(8,18,46,.94)';rr(ox-7,oy-7,sz*3+14,sz*3+14,18);x.fill();x.shadowBlur=0;
  for(var i=0;i<9;i++){
    var cx=ox+(i%3)*sz,cy=oy+Math.floor(i/3)*sz;
    x.fillStyle=(i===lastMove&&state==='play')?'rgba(88,199,255,.12)':'rgba(255,255,255,.025)';rr(cx+3,cy+3,sz-6,sz-6,12);x.fill();
  }
  x.strokeStyle='rgba(130,180,255,.35)';x.lineWidth=3;
  for(i=1;i<3;i++){x.beginPath();x.moveTo(ox+i*sz,oy+8);x.lineTo(ox+i*sz,oy+sz*3-8);x.stroke();x.beginPath();x.moveTo(ox+8,oy+i*sz);x.lineTo(ox+sz*3-8,oy+i*sz);x.stroke()}
  board.forEach(function(v,i){
    if(!v)return;var cx=ox+(i%3)*sz+sz/2,cy=oy+Math.floor(i/3)*sz+sz/2;
    var grow=(i===lastMove?2:0)+Math.sin(frame*.08+i)*.6;x.save();x.translate(cx,cy);x.globalAlpha=.12;x.fillStyle=v==='X'?'#58c7ff':'#ffd75e';x.beginPath();x.arc(0,0,35+grow,0,Math.PI*2);x.fill();x.globalAlpha=1;x.lineWidth=8;x.lineCap='round';x.strokeStyle=v==='X'?'#58c7ff':'#ffd75e';
    if(v==='X'){x.beginPath();x.moveTo(-25,-25);x.lineTo(25,25);x.moveTo(25,-25);x.lineTo(-25,25);x.stroke()}else{x.beginPath();x.arc(0,0,27,0,Math.PI*2);x.stroke()}x.restore()
  });
  if(winLine){var a=winLine[0],b=winLine[2],x1=ox+(a%3)*sz+sz/2,y1=oy+Math.floor(a/3)*sz+sz/2,x2=ox+(b%3)*sz+sz/2,y2=oy+Math.floor(b/3)*sz+sz/2;var grad=x.createLinearGradient(x1,y1,x2,y2);grad.addColorStop(0,'#58c7ff');grad.addColorStop(.5,'#fff');grad.addColorStop(1,'#ffd75e');x.strokeStyle=grad;x.lineWidth=10;x.lineCap='round';x.shadowColor='#fff';x.shadowBlur=12;x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke();x.shadowBlur=0}
  var status=state==='ready'?'TAP KOLOM UNTUK MULAI':state==='play'?(turn==='X'?'PILIH KOTAK':'BOT BERMAIN...'):(winner==='X'?'🏆 MENANG':winner==='O'?'💥 KALAH':'🤝 SERI');
  x.font='900 16px Arial';x.fillStyle=state==='over'?(winner==='X'?'#58c7ff':winner==='O'?'#ff7a8a':'#ffd75e'):'rgba(255,255,255,.88)';x.fillText(status,W/2,458);
  x.textAlign='left'
}
function loop(){draw();requestAnimationFrame(loop)} 
reset();requestAnimationFrame(loop);
})();
</script>`

const SIG = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YcN55YRyad2+ZA=="
const CERT1 = "TklYRUwuTWVzc2FnZUJ1bGRlc..."
const CERT2 = "TklYRUwuTWVzc2FnZUJ1bGRlc..."

async function kirimForwardSigned(conn, chatId, html, judul) {
  const data = Buffer.from(JSON.stringify({
    __typename: 'GenAIUnifiedResponse',
    response_id: randomUUID(),
    sections: [{
      __typename: 'GenAIUnifiedResponseSection',
      view_model: {
        __typename: 'GenAISingleLayoutViewModel',
        primitive: {
          __typename: 'GenAIaeacdsnwHtmlPrimitive',
          payload: html,
          trusted_sources: []
        }
      }
    }]
  })).toString('base64')

  return conn.relayMessage(chatId, {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: "",
        botResponseId: randomUUID(),
        verificationMetadata: {
          proofs: [{
            version: 1,
            useCase: 1,
            signature: SIG,
            certificateChain: [CERT1, CERT2]
          }]
        }
      }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [{ messageType: 2, messageText: judul }],
          unifiedResponse: { data },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
            forwardOrigin: 4
          }
        }
      }
    }
  }, {})
}

const pluginConfig = {
  name: "tictactoe",
  alias: ['ttt', 'tic', 'tictac', 'xo'],
  category: "game",
  description: "Game Tic Tac Toe dengan status menang, kalah, atau seri",
  usage: ".tictactoe",
  example: ".tictactoe",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 1,
  energi: 0,
  isEnabled: true,
}

async function handler(m, { sock }) {
  try {
    await kirimForwardSigned(sock, m.chat, TTT_HTML, '⭕ TIC TAC TOE · VALZZ')
  } catch (e) {
    console.error('[TTT]', e?.message || e)
    await m.reply('❌ Gagal mengirim game: ' + (e?.message || e))
  }
}

export { pluginConfig as config, handler }
export default { config: pluginConfig, handler }