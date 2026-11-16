<script>
(function(){
const canvas = document.getElementById('c');
const stage = canvas.parentElement;
if(!window.THREE){ stage.insertAdjacentHTML('beforeend','<div class="err">3D 函式庫載入失敗，請重新整理。</div>'); return; }
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const COMMON = `
precision highp float;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+17.1; a*=.5; } return v; }
float dots(vec2 fc, float dens, float cell, float a){
  float c=cos(a), s=sin(a); vec2 p = mat2(c,-s,s,c)*fc/cell;
  vec2 g = fract(p)-.5; float r = sqrt(clamp(dens,0.,1.))*.62;
  return (1.-smoothstep(r-.07, r+.07, length(g)))*smoothstep(.03,.08,dens);
}
float sdEll2(vec2 p, vec2 r){ float k0=length(p/r); float k1=length(p/(r*r)); return k0*(k0-1.)/k1; }
float foot(vec2 w){
  float sec = 6.28318/8.; float a = atan(w.y,w.x); float id = floor((a+sec*.5)/sec); float la = a-id*sec; float r = length(w);
  vec2 q = vec2(cos(la)*r-1.2, sin(la)*r); q.y += .2*q.x*q.x;
  return sdEll2(q, vec2(.62,.25));
}
`;
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`;

/* reaction-diffusion over world xz in [-2.2, 2.2] */
const FS_RD_INIT = COMMON + `
uniform float uSeed; varying vec2 vUv;
void main(){
  vec2 w = (vUv-.5)*4.4; float d = foot(w);
  float B = 0.;
  if(d>.0 && d<.06) B = step(.3, hash(vUv*613.+uSeed));
  if(length(w)<2. && d>0. && hash(floor(vUv*80.)+uSeed*1.7)>.99) B = 1.;
  gl_FragColor = vec4(1.,B,0.,1.);
}`;
const FS_RD_SIM = COMMON + `
uniform sampler2D uState; uniform vec2 uTexel; uniform vec2 uPour; uniform float uDown; varying vec2 vUv;
void main(){
  vec2 uv = vUv; vec2 e = uTexel;
  vec4 s = texture2D(uState,uv);
  vec2 lap = -s.xy
    + .2*(texture2D(uState,uv+vec2(e.x,0.)).xy + texture2D(uState,uv-vec2(e.x,0.)).xy + texture2D(uState,uv+vec2(0.,e.y)).xy + texture2D(uState,uv-vec2(0.,e.y)).xy)
    + .05*(texture2D(uState,uv+e).xy + texture2D(uState,uv-e).xy + texture2D(uState,uv+vec2(e.x,-e.y)).xy + texture2D(uState,uv+vec2(-e.x,e.y)).xy);
  float A = s.x, B = s.y;
  vec2 w = (uv-.5)*4.4; float r = length(w);
  float f = mix(.0545,.038, smoothstep(1.4,2.05,r));
  float k = mix(.062,.0605, smoothstep(1.4,2.05,r));
  float abb = A*B*B;
  float nA = A + (lap.x - abb + f*(1.-A));
  float nB = B + (.5*lap.y + abb - (k+f)*B);
  float age = s.z + .0007*step(.2,B);
  if(uDown>.5 && length(uv-uPour)<.012 && r<2.05) nB = .9;
  float d = foot(w);
  if(d<-.03){ nA=1.; nB=0.; }
  if(r>2.08){ nA=1.; nB=0.; }
  gl_FragColor = vec4(clamp(nA,0.,1.), clamp(nB,0.,1.), min(age,.95), 1.);
}`;

/* screen-space wet ink: r = pigment, g = water */
const FS_INK = COMMON + `
uniform sampler2D uState; uniform vec2 uTexel; uniform vec2 uB0, uB1; uniform float uBR, uBAmt, uAspect; varying vec2 vUv;
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.); return length(pa-ba*h); }
void main(){
  vec4 s = texture2D(uState,vUv); float I = s.r, W = s.g;
  vec4 l = texture2D(uState,vUv-vec2(uTexel.x,0.)), r = texture2D(uState,vUv+vec2(uTexel.x,0.));
  vec4 d = texture2D(uState,vUv-vec2(0.,uTexel.y)), u = texture2D(uState,vUv+vec2(0.,uTexel.y));
  float fib = noise(vUv*vec2(170.,130.));
  float fibx = noise(vUv*vec2(60.,240.)+3.), fiby = noise(vUv*vec2(240.,60.)+7.);
  W += .22*(l.g+r.g+u.g+d.g-4.*W) - .0022; W = max(W,0.);
  float k = clamp(W*1.4,0.,1.)*(.06+.16*fib);
  I += k*((l.r+r.r-2.*I)*(.6+.8*fibx) + (u.r+d.r-2.*I)*(.6+.8*fiby));
  vec2 P = vec2(vUv.x*uAspect, vUv.y);
  float sd = seg(P, vec2(uB0.x*uAspect,uB0.y), vec2(uB1.x*uAspect,uB1.y));
  float b = (1.-smoothstep(uBR*.35, uBR, sd))*uBAmt;
  W += b*.55; I += b*.32*(.55+.9*noise(vUv*vec2(420.,380.)));
  gl_FragColor = vec4(clamp(I,0.,1.), clamp(W,0.,1.), 0., 1.);
}`;

const FS_MAIN = COMMON + `
uniform vec2 uRes; uniform float uTime, uP, uCook, uLace, uDpr, uPress, uRDN;
uniform vec3 uRo, uTa, uUp; uniform vec2 uMouse;
uniform sampler2D uRD; uniform sampler2D uInk;
varying vec2 vUv;
const vec3 INK_PAPER = vec3(.925,.906,.863);
const vec3 INK_INK   = vec3(.075,.07,.068);
const vec3 HT_PAPER  = vec3(.906,.898,.875);
const vec3 HT_INK    = vec3(.118,.094,.188);
const vec3 HT_OR     = vec3(.941,.478,.165);
const vec3 HT_RED    = vec3(.78,.24,.12);
const vec3 HT_SKIN   = vec3(.965,.957,.94);
const vec3 NE_BG     = vec3(.047,.035,.075);
const vec3 NE_OR     = vec3(1.,.541,.239);
const vec3 NE_CY     = vec3(.243,.902,1.);
const vec3 NE_PK     = vec3(1.,.31,.639);
const vec3 L = vec3(-.4835,.8703,.0967);
vec3 gMP; float gDum; vec3 gQ; float gIdx;
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float smax(float a,float b,float k){ return -smin(-a,-b,k); }
float sdEll(vec3 p, vec3 r){ float k0=length(p/r); float k1=length(p/(r*r)); return k0*(k0-1.)/k1; }
float dumplingL(vec3 q){
  q.z += .2*q.x*q.x;
  float pinch = 1. + 1.5*smoothstep(-.15,.3,q.y);
  float body = sdEll(vec3(q.x,q.y,q.z*pinch), vec3(.64,.3,.27))/pinch;
  float pl = sin(q.x*30.)*.5+.5;
  float crest = sdEll(q-vec3(0.,.27,0.), vec3(.56,.09+.03*pl,.03+.022*pl));
  float d = smin(body, crest, .05);
  d = smax(d, -(q.y+.2), .04);
  d += .008*sin(q.x*30.)*smoothstep(0.,.28,q.y)*smoothstep(.62,.35,abs(q.x));
  return d;
}
float dumplings(vec3 p){
  float sec = 6.28318/8.;
  float a = atan(p.z,p.x);
  float id = floor((a+sec*.5)/sec);
  float la = a-id*sec;
  float r = length(p.xz);
  vec3 q = vec3(cos(la)*r-1.2, p.y-.2, sin(la)*r);
  gIdx = mod(id,8.); gQ = q;
  return dumplingL(q);
}
vec2 map(vec3 p){
  float d = dumplings(p);
  vec3 dm = p-gMP; float m = exp(-dot(dm,dm)*14.);
  d -= m*.06*(1.-3.*uPress);
  d += .004*sin(p.x*9.+uTime*2.)*sin(p.z*8.+uTime*2.6);
  gDum = d;
  return d<p.y ? vec2(d,1.) : vec2(p.y,2.);
}
vec3 calcN(vec3 p){ vec2 e=vec2(.0015,0.);
  return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x, map(p+e.yxy).x-map(p-e.yxy).x, map(p+e.yyx).x-map(p-e.yyx).x)); }
float shadow(vec3 ro, vec3 rd){ float res=1., t=.05;
  for(int i=0;i<36;i++){ map(ro+rd*t); float h=gDum; res=min(res, 7.*h/t); t+=clamp(h,.015,.2); if(res<.001||t>3.) break; }
  return clamp(res,0.,1.); }
float calcAO(vec3 p, vec3 n){ float o=0., s=1.;
  for(int i=0;i<4;i++){ float h=.015+.05*float(i); map(p+n*h); o+=(h-gDum)*s; s*=.7; }
  return clamp(1.-3.*o,0.,1.); }
vec4 sampRD(vec2 uv){ uv = clamp(uv,0.,1.); vec2 st = uv*uRDN-.5; vec2 i = floor(st), f = fract(st);
  vec4 a = texture2D(uRD,(i+vec2(.5,.5))/uRDN), b = texture2D(uRD,(i+vec2(1.5,.5))/uRDN);
  vec4 c = texture2D(uRD,(i+vec2(.5,1.5))/uRDN), d = texture2D(uRD,(i+vec2(1.5,1.5))/uRDN);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 suv = fc/uRes;
  vec2 uv = (fc-.5*uRes)/uRes.y;
  float tq = floor(uTime*8.);
  float n1 = fbm(suv*vec2(3.,2.)+3.1);
  float n2 = fbm(suv*2.5+9.7);
  float k1 = smoothstep(-.5,.5,(uP-1.)*3.2 + (n1-.5)*1.2 + (suv.x-.5)*.5);
  float v2 = (uP-2.)*3.2 - (length(suv-.5)*1.4-.35)*1.2 + (n2-.5)*.8 + (fbm(suv*14.)-.5)*.12;
  float k2 = smoothstep(-.5,.5,v2);
  float burn = smoothstep(-.32,-.26,v2);
  float ember = exp(-pow((v2+.29)/.035,2.));
  uv += (vec2(noise(uv*5.+tq), noise(uv*5.+tq+7.))-.5)*.005*(1.-k2);

  vec3 ww = normalize(uTa-uRo), uu = normalize(cross(ww,uUp)), vv = cross(uu,ww);
  vec3 rd = normalize(uv.x*uu+uv.y*vv+1.75*ww);
  vec2 mm = uMouse*vec2(uRes.x/uRes.y,1.)*.5;
  vec3 mrd = normalize(mm.x*uu+mm.y*vv+1.75*ww);
  gMP = uMouse.x>4. ? vec3(99.) : uRo + mrd*(dot(uTa-uRo,ww)/dot(mrd,ww));

  float t=0., id=0., minD=1e3;
  for(int i=0;i<128;i++){
    vec3 pp = uRo+rd*t; vec2 h = map(pp);
    minD = min(minD,gDum);
    if(h.x<.0005*t+.0003){ id=h.y; break; }
    t += h.x*.85; if(t>30.) break;
  }
  vec3 p = uRo+rd*t;
  float isD=0., isF=0., tone=1., brown=0., facing=1., sh=1., spec=0., fres=0., B=0., age=0.;
  vec3 q = vec3(0.,1.,0.);
  float panR = length(p.xz);
  if(id>0.){
    vec3 n = calcN(p);
    sh = shadow(p+n*.004, L);
    if(id<1.5){
      isD = 1.; map(p); q = gQ;
      float ao = calcAO(p,n);
      float diff = clamp(dot(n,L),0.,1.);
      tone = clamp(.3+.7*diff,0.,1.)*mix(.8,1.,sh)*mix(.72,1.,ao);
      brown = smoothstep(-.1,-.19,q.y)*uCook*(.75+.5*noise(q.xz*20.+gIdx*3.));
      facing = clamp(dot(n,-rd),0.,1.);
      fres = pow(1.-facing,3.);
      spec = pow(clamp(dot(reflect(-L,n),-rd),0.,1.),24.);
    } else {
      isF = 1.; vec4 s = sampRD(p.xz/4.4+.5); B = s.y; age = s.z;
    }
  }

  /* fields shared by all styles (derivatives taken in uniform control flow) */
  float pxW = t/(1.75*uRes.y);
  float dpx = isD>.5 ? 0. : minD/pxW;
  vec2 gd = vec2(dFdx(dpx), dFdy(dpx));
  float pw = q.x*30./6.2832; float fwPw = fwidth(pw)+1e-4;
  float cv = q.y*24.; float fwCv = fwidth(cv)+1e-4;
  float inLace = uLace*step(panR,2.08)*isF;
  float lace = smoothstep(.2,.28,B)*inLace;
  float fwB = fwidth(B)+1e-4;
  float laceEdge = (1.-smoothstep(0.,1.6*fwB,abs(B-.24)))*inLace;
  float pleatL = isD*(1.-smoothstep(0.,1.5*fwPw,abs(fract(pw)-.5)))*smoothstep(.1,.26,q.y)*smoothstep(.6,.4,abs(q.x))*smoothstep(.6,.3,fwPw);
  float contour = isD*(1.-smoothstep(0.,1.4*fwCv,abs(fract(cv+.5)-.5)))*smoothstep(.5,.2,fwCv);
  float D0 = isD*((1.-tone)*.46 + brown*.55) + isF*((1.-sh)*.34 + lace*(.12+age*.45));
  float Dw = D0 + (fbm(fc*.011+3.)-.5)*.2*step(.01,D0);
  float fwDw = fwidth(Dw)+1e-4;
  vec4 ink = texture2D(uInk, suv);
  float I = ink.r;

  /* ---- B: ink wash ---- */
  vec3 cInk = vec3(0.); float DInk = 0.;
  if(k1<.999){
    float a1 = smoothstep(.16-fwDw,.16+fwDw,Dw), a2 = smoothstep(.38-fwDw,.38+fwDw,Dw), a3 = smoothstep(.62-fwDw,.62+fwDw,Dw);
    float dens = a1*.2 + a2*.22 + a3*.28;
    float we = a1*(1.-smoothstep(0.,.05,Dw-.16)) + a2*(1.-smoothstep(0.,.05,Dw-.38)) + a3*(1.-smoothstep(0.,.05,Dw-.62));
    dens += we*.17;
    dens *= .82+.36*noise(fc*.45);
    float pr = fbm(fc*.004+7.);
    float Wp = (1.8+4.2*pr)*uDpr;
    vec2 gn = normalize(gd+vec2(1e-6)); vec2 tg = vec2(-gn.y,gn.x);
    float streak = noise(vec2(dot(fc,tg)*.025, dot(fc,gn)*.9));
    float fly = mix(1., step(.36,streak), smoothstep(Wp*.25,Wp,dpx));
    float stroke = (1.-isD)*(1.-smoothstep(Wp-1.,Wp+1.,dpx))*fly;
    stroke = max(stroke, isD*(1.-smoothstep(.07,.15+.08*pr,facing))*step(.3,streak+.2));
    float halo = (1.-isD)*exp(-dpx/(16.*uDpr))*.12*(.5+fbm(fc*.02));
    float pl = pleatL*.8*step(.3,noise(fc*.15+3.));
    float ang = atan(p.z,p.x);
    float rim = isF*(1.-smoothstep(0.,.02+.05*fbm(vec2(ang*3.,1.)),abs(panR-2.1)))*step(.34,fbm(vec2(ang*9.,panR*2.)));
    float inkV = smoothstep(.02,.2,I)*(.45+.55*smoothstep(.5,.1,I)) + smoothstep(.6,.95,I)*.4;
    dens = max(dens, max(stroke*.94, max(pl, rim*.85)));
    dens = 1.-(1.-dens)*(1.-halo)*(1.-clamp(inkV,0.,1.)*.92);
    DInk = clamp(dens,0.,1.);
    float fiber = noise(vec2(fc.x*.02+fc.y*.35, fc.y*.02-fc.x*.05));
    vec3 paper = INK_PAPER*(.955+.045*fbm(fc*.04))*(1.-.03*fiber)*(1.-ink.g*.07);
    cInk = mix(paper, INK_INK, DInk);
  }

  /* ---- A': halftone, new palette ---- */
  vec3 cHT = vec3(0.); float DHT = 0.;
  if(k1>.001 && k2<.999){
    vec3 paper = HT_PAPER*(.95+.05*noise(fc*.6));
    vec3 col = paper; float dd = 0.;
    if(isD>.5){
      float br = clamp(brown,0.,1.);
      vec3 base = mix(HT_SKIN, HT_OR, br);
      col = base*(tone>.5 ? 1. : tone>.28 ? .9 : .78);
      float ds = smoothstep(.55,.08,tone)*.85;
      col = mix(col, HT_INK, dots(fc,ds,6.*uDpr,.785)*.85);
      col = mix(col, HT_RED, dots(fc+vec2(2.,1.)*uDpr, br*.85, 5.*uDpr,.26)*br*.8);
      col = mix(col, HT_SKIN, step(.6,spec));
      col = mix(col, HT_INK, max(pleatL*.85, 1.-smoothstep(.14,.26,facing)));
      dd = ds*.8 + br*.6 + pleatL*.5;
    } else if(isF>.5){
      float inPan = step(panR,2.1);
      float pd = mix(.1,.62,inPan) + (1.-sh)*.3;
      col = mix(paper, HT_INK, dots(fc,pd,5.*uDpr,.785)*mix(.5,.95,inPan));
      dd = pd*.6;
      vec3 lc = mix(mix(HT_SKIN,HT_OR,smoothstep(0.,.5,age)), HT_RED*.85, smoothstep(.55,.95,age));
      col = mix(col, lc, lace);
      col = mix(col, HT_INK, dots(fc+vec2(1.,2.)*uDpr, age*.45, 4.*uDpr,.26)*lace*.6);
      col = mix(col, HT_INK, laceEdge);
      dd = max(mix(dd,.5+age*.4,lace), laceEdge);
      float rim = 1.-smoothstep(0.,.03,abs(panR-2.1));
      col = mix(col, HT_INK, rim); dd = max(dd,rim);
    }
    float so = (1.-isD)*(1.-smoothstep(1.5*uDpr,2.8*uDpr,dpx));
    col = mix(col, HT_INK, so); dd = max(dd,so);
    col = mix(col, HT_INK, dots(fc, clamp(I*1.3,0.,1.)*.85, 6.*uDpr,.785)*step(.02,I));
    DHT = clamp(dd + I*.6,0.,1.);
    cHT = col;
  }

  /* ---- C: neon ---- */
  vec3 cNe = vec3(0.);
  if(k2>.001){
    vec3 col = NE_BG;
    if(isD>.5){
      vec3 lc = mix(NE_OR, NE_PK, clamp(brown*1.4,0.,1.));
      col = NE_BG*1.6 + lc*contour*(.35+.9*tone) + NE_CY*pleatL*1.2 + NE_CY*fres*1.3 + lc*spec*.5;
    } else if(isF>.5){
      float inPan = step(panR,2.1);
      col = NE_BG*(1.+.6*inPan);
      col += NE_CY*.05*(1.-smoothstep(0.,.04,abs(fract(panR*4.)-.5)))*inPan;
      vec2 g = abs(fract(p.xz*1.5)-.5);
      col += NE_CY*.05*(1.-smoothstep(0.,.02,min(g.x,g.y)))*(1.-inPan)*smoothstep(14.,4.,t);
      vec3 lcol = mix(NE_OR, NE_PK, smoothstep(.3,.95,age));
      col += lcol*lace*.12 + lcol*laceEdge*1.4;
      col *= mix(.4,1.,sh);
      col += NE_OR*1.3*(1.-smoothstep(0.,.03,abs(panR-2.1)));
    }
    col += (1.-isD)*(NE_CY*.0035/max(minD,.0035) + NE_OR*.0012/max(minD,.003))*.8;
    cNe = 1.-exp(-col*1.25);
  }

  /* ---- transition 1: wash crystallises into a dot screen ---- */
  vec3 cA;
  if(k1<=.001) cA = cInk;
  else if(k1>=.999) cA = cHT;
  else {
    float Dm = mix(DInk, DHT, smoothstep(.2,.8,k1));
    float warp = 1.-k1;
    vec2 wv = (vec2(fbm(fc*.01+1.), fbm(fc*.01+8.))-.5)*warp*26.*uDpr;
    float cc = .7071;
    vec2 gp = mat2(cc,-cc,cc,cc)*(fc+wv)/(6.*uDpr);
    vec2 gg = (fract(gp)-.5)*(1.+vec2(.6,-.3)*warp);
    float rr = sqrt(clamp(Dm,0.,1.))*.66*(1.+warp*.5);
    float soft = mix(.3,.06,k1);
    float dm = (1.-smoothstep(rr-soft, rr+soft, length(gg)))*smoothstep(.02,.08,Dm);
    vec3 cryst = mix(mix(INK_PAPER,HT_PAPER,k1), mix(INK_INK,HT_INK,k1), dm);
    cA = mix(cInk, cryst, smoothstep(0.,.35,k1));
    cA = mix(cA, cHT, smoothstep(.6,1.,k1));
  }

  /* ---- transition 2: paper goes dark, dots ignite and gather into lines ---- */
  vec3 col;
  if(k2<=.001) col = cA;
  else if(k2>=.999) col = cNe;
  else {
    float lumN = dot(cNe, vec3(.35,.45,.2));
    float w = clamp(mix(DHT, lumN*1.6, smoothstep(.25,.85,k2)),0.,1.);
    float cell = mix(6.,4.5,k2*k2)*uDpr;
    float cc = .7071;
    vec2 gg = fract(mat2(cc,-cc,cc,cc)*fc/cell)-.5;
    float r = .12+.3*sqrt(w);
    float glow = exp(-dot(gg,gg)/(r*r))*w;
    vec3 gc = mix(NE_OR, normalize(cNe+.02)*1.2, smoothstep(.3,.9,k2));
    vec3 lit = min(NE_BG + gc*glow*1.6, vec3(1.));
    col = mix(cA, lit, burn);
    col = mix(col, NE_OR*1.1, ember*.85);
    col = mix(col, HT_INK*.6, (1.-burn)*smoothstep(-.5,-.3,v2)*.35);
    col = mix(col, cNe, smoothstep(.65,1.,k2));
  }
  gl_FragColor = vec4(col,1.);
}`;

/* ---------- setup ---------- */
let renderer;
try{ renderer = new THREE.WebGLRenderer({canvas, antialias:false, powerPreference:'high-performance'}); }
catch(e){ stage.insertAdjacentHTML('beforeend','<div class="err">這台裝置的瀏覽器不支援 WebGL。</div>'); return; }
const PR = Math.min(devicePixelRatio||1, 1.25);
renderer.setPixelRatio(PR);
const gl = renderer.getContext();
const isFloat = renderer.capabilities.isWebGL2 && gl.getExtension('EXT_color_buffer_float');
const CAM = new THREE.Camera();
const qScene = new THREE.Scene(); const qMesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2)); qScene.add(qMesh);
function pass(mat, target){ qMesh.material = mat; renderer.setRenderTarget(target); renderer.render(qScene, CAM); }
const mk = (fs,u)=> new THREE.ShaderMaterial({uniforms:u, vertexShader:VS, fragmentShader:fs});

const RDN = 384;
const rdOpt = {type: isFloat ? THREE.FloatType : THREE.HalfFloatType, format:THREE.RGBAFormat, minFilter:THREE.NearestFilter, magFilter:THREE.NearestFilter, depthBuffer:false, stencilBuffer:false};
const rd = [new THREE.WebGLRenderTarget(RDN,RDN,rdOpt), new THREE.WebGLRenderTarget(RDN,RDN,rdOpt)];
let rdCur = 0, rdNeedsReset = true;
const rdInit = mk(FS_RD_INIT, {uSeed:{value:0}});
const rdSimU = {uState:{value:null}, uTexel:{value:new THREE.Vector2(1/RDN,1/RDN)}, uPour:{value:new THREE.Vector2(-1,-1)}, uDown:{value:0}};
const rdSim = mk(FS_RD_SIM, rdSimU);
function rdReset(){ rdInit.uniforms.uSeed.value = Math.random()*100; pass(rdInit, rd[0]); rdCur = 0; rdStep(160); rdNeedsReset = false; }
function rdStep(n){ for(let i=0;i<n;i++){ rdSimU.uState.value = rd[rdCur].texture; pass(rdSim, rd[1-rdCur]); rdCur = 1-rdCur; } }

let ink = null;
const inkU = {uState:{value:null}, uTexel:{value:new THREE.Vector2()}, uB0:{value:new THREE.Vector2()}, uB1:{value:new THREE.Vector2()}, uBR:{value:.02}, uBAmt:{value:0}, uAspect:{value:1}};
const inkMat = mk(FS_INK, inkU);
let inkCur = 0;
function makeInk(w,h){
  if(ink) ink.forEach(r=>r.dispose());
  const iw = Math.max(64, Math.round(w/2.5)), ih = Math.max(64, Math.round(h/2.5));
  const o = {type:THREE.HalfFloatType, format:THREE.RGBAFormat, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, depthBuffer:false, stencilBuffer:false};
  ink = [new THREE.WebGLRenderTarget(iw,ih,o), new THREE.WebGLRenderTarget(iw,ih,o)];
  ink.forEach(r=>{ renderer.setRenderTarget(r); renderer.setClearColor(0x000000,1); renderer.clear(); });
  inkU.uTexel.value.set(1/iw,1/ih); inkU.uAspect.value = w/h; inkCur = 0;
}

const U = {
  uRes:{value:new THREE.Vector2()}, uTime:{value:0}, uP:{value:0}, uCook:{value:0}, uLace:{value:0}, uDpr:{value:PR}, uPress:{value:0}, uRDN:{value:RDN},
  uRo:{value:new THREE.Vector3()}, uTa:{value:new THREE.Vector3()}, uUp:{value:new THREE.Vector3(0,1,0)}, uMouse:{value:new THREE.Vector2(9,9)},
  uRD:{value:null}, uInk:{value:null}
};
const mainMat = mk(FS_MAIN, U);
mainMat.extensions.derivatives = true;

let W = 1, H = 1;
function resize(){
  const r = stage.getBoundingClientRect(); W = Math.max(1,r.width); H = Math.max(1,r.height);
  renderer.setSize(W,H,false); U.uRes.value.set(W*PR, H*PR); makeInk(W,H);
}

/* ---------- camera path ---------- */
const sstep = (a,b,x)=>{ const t = Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
const lerp3 = (a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const norm = v=>{ const l = Math.hypot(v[0],v[1],v[2])||1; return [v[0]/l,v[1]/l,v[2]/l]; };
const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
function camera(P,t){
  const s1 = sstep(.55,1.5,P), s2 = sstep(1.6,2.55,P);
  const om = reduce ? 0 : t;
  const a = .75 + Math.sin(om*.12)*.12 + P*.3;
  const c0t = [1.15,.14,0], c0p = [1.15+Math.cos(a)*2.8, 1.15, Math.sin(a)*2.8];
  const b = .7 + om*.025;
  const c1t = [0,0,0], c1p = [Math.sin(b)*4.7, 3.4, Math.cos(b)*4.7];
  const c2t = [-.8,0,0], c2p = [-.8+Math.sin(om*.02)*.02, 8.6, .02];
  return { ro: lerp3(lerp3(c0p,c1p,s1),c2p,s2), ta: lerp3(lerp3(c0t,c1t,s1),c2t,s2), up: norm(lerp3([0,1,0],[0,0,-1],s2)) };
}
function rayToFloor(x,y,cam){
  const uv = [(x-W/2)/H, (H/2-y)/H];
  const ww = norm([cam.ta[0]-cam.ro[0],cam.ta[1]-cam.ro[1],cam.ta[2]-cam.ro[2]]);
  const uu = norm(cross(ww,cam.up)), vv = cross(uu,ww);
  const d = norm([uv[0]*uu[0]+uv[1]*vv[0]+1.75*ww[0], uv[0]*uu[1]+uv[1]*vv[1]+1.75*ww[1], uv[0]*uu[2]+uv[1]*vv[2]+1.75*ww[2]]);
  if(d[1] > -1e-3) return null;
  const tt = -cam.ro[1]/d[1];
  return [cam.ro[0]+d[0]*tt, cam.ro[2]+d[2]*tt];
}

