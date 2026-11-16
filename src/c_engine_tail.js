
/* ---------- scroll → P (captions map to a P value; sheets hold P while they cover the stage) ---------- */
const story = document.getElementById('story');
const anchorEls = [...story.querySelectorAll('[data-p],[data-hold]')];
const menuSheet = document.getElementById('order');
let Pcur = 0, forceP = null;
const docTop = el => el.getBoundingClientRect().top + scrollY;
function scrollP(){
  const vh = innerHeight, mid = scrollY + vh/2;
  const st = docTop(story);
  const xs = [st + vh/2], ps = [0];
  anchorEls.forEach(el=>{
    const top = docTop(el), h = el.offsetHeight;
    if(el.dataset.hold){ const p = +el.dataset.hold; xs.push(top + vh/2); ps.push(p); xs.push(Math.max(top + vh/2 + 1, top + h - vh/2)); ps.push(p); }
    else { xs.push(top + h/2); ps.push(+el.dataset.p); }
  });
  xs.push(st + story.offsetHeight - vh/2); ps.push(2.85);
  if(mid <= xs[0]) return 0;
  for(let i=1;i<xs.length;i++){ if(mid <= xs[i]) return ps[i-1] + (ps[i]-ps[i-1])*(mid-xs[i-1])/Math.max(1, xs[i]-xs[i-1]); }
  return ps[ps.length-1];
}
let lastPhase = '';
function updatePhase(P, past){
  const ph = past ? 'neon' : P < 1 ? 'ink' : P < 2 ? 'ht' : 'neon';
  if(ph !== lastPhase){ document.body.dataset.phase = ph; lastPhase = ph; }
}

/* ---------- hover only: the dough leans toward the cursor ---------- */
let hover = null, mouseSm = [9,9];
canvas.addEventListener('pointermove', e=>{ const r = canvas.getBoundingClientRect(); hover = [e.clientX-r.left, e.clientY-r.top]; });
canvas.addEventListener('pointerleave', ()=>{ hover = null; });

/* ---------- opening ensō, painted once ---------- */
let enso = null, ensoDone = reduce;
function ensoBrush(now){
  if(ensoDone) return [];
  if(!enso) enso = {t0: now + .5, prev: null, prog: 0};
  if(now < enso.t0) return [];
  const prog = Math.min(1, (now-enso.t0)/1.9);
  const asp = W/H, r = Math.min(.36, .3*asp), cx = (asp > 1.1 ? .62 : .5)*asp, cy = .5;
  const segs = [];
  const n = Math.max(1, Math.ceil((prog-enso.prog)*40));
  for(let i=1;i<=n;i++){
    const pg = enso.prog + (prog-enso.prog)*i/n, th = 2.2 + pg*5.5;
    const pt = [(cx + Math.cos(th)*r*(1+.04*Math.sin(pg*9)))/asp, cy + Math.sin(th)*r];
    segs.push({a: enso.prev || pt, b: pt, r: .012 + .026*Math.sin(Math.PI*Math.min(1,pg*1.05))});
    enso.prev = pt;
  }
  enso.prog = prog;
  if(prog >= 1) ensoDone = true;
  return segs;
}

/* ---------- loop ---------- */
function frame(ms){
  requestAnimationFrame(frame);
  const t = ms/1000;
  const sr = story.getBoundingClientRect();
  const past = sr.bottom <= 0;
  const target = forceP !== null ? forceP : scrollP();
  Pcur += (target-Pcur)*.12; if(Math.abs(target-Pcur) < 1e-4) Pcur = target;
  const P = Pcur;
  updatePhase(P, past);
  const mr = menuSheet.getBoundingClientRect();
  if(past || document.hidden || (mr.top <= 0 && mr.bottom >= innerHeight)) return;

  const cam = camera(P,t);
  const brs = (P < .6) ? ensoBrush(t) : [];
  const nPass = Math.max(2, brs.length);
  for(let i=0;i<nPass;i++){
    const br = brs[i];
    if(br){ inkU.uB0.value.set(br.a[0],br.a[1]); inkU.uB1.value.set(br.b[0],br.b[1]); inkU.uBR.value = br.r; inkU.uBAmt.value = 1; }
    else inkU.uBAmt.value = 0;
    inkU.uState.value = ink[inkCur].texture; pass(inkMat, ink[1-inkCur]); inkCur = 1-inkCur;
  }

  if(P < .95) rdNeedsReset = true;
  if(P > 1.15){ if(rdNeedsReset) rdReset(); rdSimU.uDown.value = 0; rdStep(reduce ? 4 : 10); }

  const mt = hover && P < 1.6 ? [hover[0]/W*2-1, -(hover[1]/H*2-1)] : [9,9];
  if(mt[0] > 4 || mouseSm[0] > 4) mouseSm = mt.slice();
  else { mouseSm[0] += (mt[0]-mouseSm[0])*.15; mouseSm[1] += (mt[1]-mouseSm[1])*.15; }
  U.uMouse.value.set(mouseSm[0], mouseSm[1]);
  U.uPress.value = 0;
  U.uTime.value = t; U.uP.value = P;
  U.uCook.value = sstep(1.0,2.1,P);
  U.uLace.value = sstep(1.2,1.65,P);
  U.uRo.value.set(...cam.ro); U.uTa.value.set(...cam.ta); U.uUp.value.set(...cam.up);
  U.uRD.value = rd[rdCur].texture; U.uInk.value = ink[inkCur].texture;
  pass(mainMat, null);
}

let rzT; addEventListener('resize', ()=>{ clearTimeout(rzT); rzT = setTimeout(resize,150); });
resize();
updatePhase(0, false);
requestAnimationFrame(frame);
})();
</script>
