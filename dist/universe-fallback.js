// A rich Canvas2D universe for browsers and devices without WebGL.
// Static cosmic detail is painted once to offscreen canvases, then composited.
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function seeded(seed) { let n = seed >>> 0; return () => ((n = (1664525*n+1013904223)>>>0)/4294967296); }
function canvas(size) { const c=document.createElement('canvas');c.width=c.height=size;return c; }
function glow(ctx,x,y,r,color,alpha=1) {
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,`rgba(${color},${alpha})`);
  g.addColorStop(.15,`rgba(${color},${alpha*.45})`);
  g.addColorStop(.5,`rgba(${color},${alpha*.10})`);
  g.addColorStop(1,`rgba(${color},0)`);
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}

function galaxyTexture() {
  const image=canvas(1400),g=image.getContext('2d');
  const rng=seeded(8641),middle=700;
  g.globalCompositeOperation='screen';
  // Soft clouds underneath the pinpoints, so the spiral has volume.
  for(let i=0;i<190;i++){
    const radius=80+rng()*540;
    const t=(i%4)*Math.PI/2+radius*.009+(rng()-.5)*.7;
    const x=middle+Math.cos(t)*radius,y=middle+Math.sin(t)*radius;
    const hue=i%3===0?'73,85,255':i%3===1?'94,31,199':'15,125,211';
    glow(g,x,y,40+rng()*100,hue,.08+rng()*.07);
  }
  for(let i=0;i<26000;i++){
    const r=60+Math.pow(rng(),.66)*555;
    const arm=i%4;
    const theta=arm*Math.PI/2+r*.009+(rng()-.5)*(.19+r*.00055);
    const fuzz=(rng()-.5)*r*.07;
    const x=middle+Math.cos(theta)*r+fuzz,y=middle+Math.sin(theta)*r+fuzz;
    const warm=r<205;
    const white=rng()<.09;
    const hue=white?'210,224,255':warm?(rng()<.5?'255,152,108':'223,121,244'):(rng()<.48?'64,178,255':'152,103,255');
    const edge=1-Math.max(0,r-470)/200;
    const size=.35+rng()*1.6;
    g.fillStyle=`rgba(${hue},${(.17+rng()*.65)*edge})`;
    g.fillRect(x,y,size,size);
    if(i%170===0)glow(g,x,y,5+rng()*7,hue,.7);
  }
  // The diffuse warm inner disk bridges galaxy arms and the central sun.
  for(let i=0;i<3500;i++){
    const t=rng()*TAU,r=72+rng()*145;
    const x=middle+Math.cos(t)*r,y=middle+Math.sin(t)*r;
    g.fillStyle=`rgba(${rng()<.55?'255,187,129':'163,138,255'},${rng()*.48})`;
    g.fillRect(x,y,.6+rng(),.6+rng());
  }
  return image;
}

function planetTexture(color,dark,seed,isSun=false){
  const image=canvas(192),g=image.getContext('2d'),rng=seeded(seed),r=72,x=96,y=96;
  g.beginPath();g.arc(x,y,r,0,TAU);g.clip();
  const base=g.createRadialGradient(65,55,4,x,y,r*1.15);
  base.addColorStop(0,isSun?'#fcfbff':color);
  base.addColorStop(.22,isSun?'#d5d7ff':color);
  base.addColorStop(.65,isSun?'#7889e3':dark);
  base.addColorStop(1,isSun?'#737bbd':'#030813');
  g.fillStyle=base;g.fillRect(0,0,192,192);
  g.globalCompositeOperation='soft-light';
  for(let i=0;i<1100;i++){
    const px=24+rng()*144,py=24+rng()*144,rr=1+rng()*6;
    g.fillStyle=rng()<.5?'rgba(255,255,255,.18)':'rgba(0,0,0,.23)';
    g.beginPath();g.ellipse(px,py,rr,rr*.4,rng()*TAU,0,TAU);g.fill();
  }
  if(isSun){
    g.globalCompositeOperation='screen';
    for(let j=0;j<36;j++){
      g.beginPath();let px=40+rng()*112,py=40+rng()*112;g.moveTo(px,py);
      for(let k=0;k<10;k++){px+=(rng()-.5)*22;py+=(rng()-.5)*22;g.lineTo(px,py);}
      g.strokeStyle='rgba(226,241,255,.7)';g.lineWidth=.6+rng();g.shadowColor='#b7dfff';g.shadowBlur=2;g.stroke();
    }
  }
  g.shadowBlur=0;g.globalCompositeOperation='source-over';
  const edge=g.createRadialGradient(x,y,r-5,x,y,r);
  edge.addColorStop(0,'rgba(255,255,255,0)');edge.addColorStop(.5,color);edge.addColorStop(1,'#ffffff');
  g.strokeStyle=edge;g.lineWidth=2.8;g.beginPath();g.arc(x,y,r-1,0,TAU);g.stroke();
  return image;
}

export function createFallbackUniverse({container,onSelect=()=>{},onReady=()=>{}}){
  if(!container)throw new Error('Universe container is required.');
  const surface=document.createElement('canvas'),ctx=surface.getContext('2d',{alpha:true});
  if(!ctx)throw new Error('Canvas is unavailable.');
  surface.className='universe-canvas';surface.setAttribute('aria-hidden','true');
  Object.assign(surface.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0'});
  container.prepend(surface);
  const galaxy=galaxyTexture();
  const sun=planetTexture('#d2d8ff','#595bb3',68,true);
  const rng=seeded(719),stars=[];
  for(let i=0;i<760;i++)stars.push({x:rng(),y:rng(),r:.2+Math.pow(rng(),3)*1.3,a:.15+rng()*.7,p:rng()*TAU,color:i%3===0?'166,187,255':i%3===1?'198,171,255':'224,237,255',cross:i%48===0});
  const defs=[
    {id:'about',color:'#48e6ff',rgb:'72,230,255',dark:'#07516d',a:.36,b:.30,t:2.30,speed:.014,r:.024},
    {id:'learning',color:'#b980ff',rgb:'185,128,255',dark:'#381459',a:.39,b:.27,t:.62,speed:.012,r:.028},
    {id:'journey',color:'#e5e8ff',rgb:'216,222,255',dark:'#55556b',a:.35,b:.33,t:3.95,speed:.011,r:.027},
    {id:'contact',color:'#ff9b7f',rgb:'255,155,127',dark:'#672822',a:.41,b:.31,t:5.65,speed:.01,r:.025}
  ];
  const planets=defs.map((d,i)=>({...d,texture:planetTexture(d.color,d.dark,21+i),label:container.querySelector('[data-planet="'+d.id+'"]'),x:0,y:0}));
  const coreLabel=container.querySelector('.core-label');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let width=1,height=1,dpr=1,scale=1,cx=0,cy=0,raf=0,last=0,time=0,disposed=false,ready=false;
  let motion=!reduced.matches,visible=!document.hidden,focused=null,zoom=1,shiftX=0,shiftY=0;
  const pointer={x:0,y:0,tx:0,ty:0};

  function orbitPoint(p,angle){
    const x=Math.cos(angle)*p.a*scale,y=-Math.sin(angle)*p.b*scale;
    const tilt=-.10;
    return{x:cx+x*Math.cos(tilt)-y*Math.sin(tilt),y:cy+x*Math.sin(tilt)+y*Math.cos(tilt)};
  }
  function project(x,y){return{x:cx+(x-cx)*zoom+shiftX+pointer.x*7,y:cy+(y-cy)*zoom+shiftY+pointer.y*5};}
  function drawStarfield(){
    for(const s of stars){
      const x=s.x*width+pointer.x*(3+s.r*2),y=s.y*height+pointer.y*(3+s.r*2);
      const alpha=s.a*(.75+.25*Math.sin(time*.7+s.p));
      ctx.fillStyle=`rgba(${s.color},${alpha})`;ctx.beginPath();ctx.arc(x,y,s.r,0,TAU);ctx.fill();
      if(s.cross){
        glow(ctx,x,y,12,s.color,alpha*.25);
        const len=3+s.r*5;
        ctx.strokeStyle=`rgba(${s.color},${alpha*.6})`;ctx.lineWidth=.5;
        ctx.beginPath();ctx.moveTo(x-len,y);ctx.lineTo(x+len,y);ctx.moveTo(x,y-len);ctx.lineTo(x,y+len);ctx.stroke();
      }
    }
  }
  function drawGalaxy(){
    ctx.save();ctx.globalCompositeOperation='screen';
    ctx.translate(cx,cy);ctx.rotate(-.27);
    ctx.scale(1,.48);
    ctx.rotate(time*.006);
    const size=scale*1.16;
    ctx.globalAlpha=.96;ctx.drawImage(galaxy,-size/2,-size/2,size,size);ctx.restore();
    ctx.save();ctx.globalCompositeOperation='screen';
    glow(ctx,cx,cy,scale*.24,'87,59,195',.28);
    glow(ctx,cx-32,cy+14,scale*.18,'30,139,216',.15);
    ctx.restore();
  }
  function drawOrbit(p){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.1);
    ctx.strokeStyle=`rgba(${p.rgb},.20)`;ctx.lineWidth=.65;
    ctx.beginPath();ctx.ellipse(0,0,p.a*scale,p.b*scale,0,0,TAU);ctx.stroke();
    const t=p.t+time*p.speed;
    for(let i=0;i<27;i++){
      const a=-t+.37-i*.014;
      ctx.strokeStyle=`rgba(${p.rgb},${.08+i/27*.5})`;ctx.lineWidth=1.15;
      ctx.beginPath();ctx.ellipse(0,0,p.a*scale,p.b*scale,0,a-.018,a);ctx.stroke();
    }
    ctx.restore();
  }
  function drawCore(){
    const r=scale*.036;
    ctx.save();ctx.globalCompositeOperation='screen';
    glow(ctx,cx,cy,r*6,'125,105,255',.65);
    glow(ctx,cx,cy,r*2.7,'202,215,255',.75);
    ctx.translate(cx,cy);ctx.rotate(-.32);
    for(let i=0;i<10;i++){
      const rx=r*(1.55+i*.18),ry=rx*.36;
      ctx.strokeStyle=i<4?`rgba(255,185,143,${.88-i*.12})`:`rgba(181,137,255,${.43-(i-4)*.055})`;
      ctx.lineWidth=i===1?2.2:.7;ctx.shadowColor=i<4?'#ffb28b':'#9471ff';ctx.shadowBlur=i<4?8:3;
      ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,TAU);ctx.stroke();
    }
    ctx.restore();
    ctx.drawImage(sun,cx-r*1.32,cy-r*1.32,r*2.64,r*2.64);
    ctx.save();ctx.globalCompositeOperation='screen';
    glow(ctx,cx-r*.15,cy-r*.1,r*.7,'255,255,255',.8);
    const beam=ctx.createLinearGradient(cx,cy-r*5,cx,cy+r*5);
    beam.addColorStop(0,'rgba(176,177,255,0)');beam.addColorStop(.45,'rgba(199,207,255,.5)');beam.addColorStop(.5,'rgba(255,255,255,.9)');beam.addColorStop(.55,'rgba(199,207,255,.5)');beam.addColorStop(1,'rgba(176,177,255,0)');
    ctx.fillStyle=beam;ctx.fillRect(cx-.45,cy-r*5,.9,r*10);
    ctx.restore();
  }
  function drawPlanet(p){
    const r=p.r*scale,pos=orbitPoint(p,p.t+time*p.speed);p.x=pos.x;p.y=pos.y;
    ctx.save();ctx.globalCompositeOperation='screen';glow(ctx,p.x,p.y,r*3.4,p.rgb,.54);ctx.restore();
    ctx.drawImage(p.texture,p.x-r*1.32,p.y-r*1.32,r*2.64,r*2.64);
    if(p.id==='learning'){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.65);ctx.strokeStyle='rgba(197,155,255,.8)';ctx.lineWidth=.8;
      ctx.beginPath();ctx.ellipse(0,0,r*1.5,r*.55,0,0,TAU);ctx.stroke();ctx.restore();
    }
    ctx.save();ctx.globalCompositeOperation='screen';
    glow(ctx,p.x-r*.5,p.y-r*.53,r*.42,p.rgb,.8);ctx.restore();
  }
  function updateLabels(){
    for(const p of planets){
      if(!p.label)continue;
      const v=project(p.x,p.y);
      p.label.style.left=clamp(v.x,50,width-50)+'px';
      p.label.style.top=clamp(v.y+p.r*scale*zoom+22,36,height-30)+'px';
      p.label.style.transform='translate(-50%, -50%)';
      p.label.style.opacity=focused&&focused!==p.id?'.3':'1';
      p.label.dataset.ready='true';
    }
    if(coreLabel){
      const v=project(cx,cy+scale*.083);
      coreLabel.style.left=v.x+'px';coreLabel.style.top=v.y+'px';coreLabel.style.transform='translate(-50%, -50%)';coreLabel.style.opacity=focused?'.2':'1';
    }
  }
  function frame(stamp){
    if(disposed)return;raf=0;
    const dt=last?Math.min((stamp-last)/1000,.05):.016;last=stamp;
    if(motion&&visible)time+=dt;
    const easing=motion?1-Math.exp(-dt*5):1;
    pointer.x+=(pointer.tx-pointer.x)*easing;pointer.y+=(pointer.ty-pointer.y)*easing;
    const selected=planets.find(p=>p.id===focused),targetZoom=selected?1.18:1;
    zoom+=(targetZoom-zoom)*easing;
    const targetX=selected?(cx-selected.x)*.3:0,targetY=selected?(cy-selected.y)*.3:0;
    shiftX+=(targetX-shiftX)*easing;shiftY+=(targetY-shiftY)*easing;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    drawStarfield();
    ctx.save();ctx.translate(cx+shiftX+pointer.x*7,cy+shiftY+pointer.y*5);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
    drawGalaxy();planets.forEach(drawOrbit);drawCore();planets.forEach(drawPlanet);ctx.restore();
    updateLabels();
    if(!ready){ready=true;container.dataset.universe='ready';container.dataset.renderer='canvas';onReady();}
    if((motion&&visible)||Math.abs(targetZoom-zoom)>.001)raf=requestAnimationFrame(frame);
  }
  function schedule(){if(!disposed&&!raf)raf=requestAnimationFrame(frame);}
  function resize(){
    width=Math.max(container.clientWidth,1);height=Math.max(container.clientHeight,1);dpr=Math.min(devicePixelRatio||1,1.5);
    surface.width=Math.round(width*dpr);surface.height=Math.round(height*dpr);
    scale=Math.min(width*1.04,height*1.3);cx=width*.51;cy=height*.46;schedule();
  }
  function move(e){if(!motion)return;const b=container.getBoundingClientRect();pointer.tx=(e.clientX-b.left)/b.width*2-1;pointer.ty=(e.clientY-b.top)/b.height*2-1;}
  function leave(){pointer.tx=pointer.ty=0;}
  function click(e){const b=surface.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;for(const p of planets){const v=project(p.x,p.y);if(Math.hypot(v.x-x,v.y-y)<p.r*scale*zoom+12){onSelect(p.id);break;}}}
  function visibility(){visible=!document.hidden;last=0;if(visible)schedule();}
  function reduceChanged(){motion=!reduced.matches;pointer.tx=pointer.ty=0;schedule();}
  const observer=new ResizeObserver(resize);observer.observe(container);
  container.addEventListener('pointermove',move,{passive:true});container.addEventListener('pointerleave',leave,{passive:true});surface.addEventListener('click',click);
  document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',reduceChanged);resize();
  return{
    setMotion(enabled){motion=Boolean(enabled);if(!motion)pointer.tx=pointer.ty=0;last=0;schedule();},
    focus(id){if(!planets.some(p=>p.id===id))return;focused=id;schedule();},
    reset(){focused=null;schedule();},
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();container.removeEventListener('pointermove',move);container.removeEventListener('pointerleave',leave);surface.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reduceChanged);surface.remove();}
  };
}
