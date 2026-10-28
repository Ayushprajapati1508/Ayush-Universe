import * as THREE from './vendor/three.module.js';

// Everything in this scene is drawn locally. No remote textures or tracking.
const POINT_VERTEX = `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vGlow;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  void main() {
    vColor = aColor;
    vGlow = .76 + .24 * sin(uTime * .42 + aPhase);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(aSize * uPixelRatio * uScale / max(3.0, -viewPosition.z), 1.0, 65.0);
  }
`;
const POINT_FRAGMENT = `
  varying vec3 vColor;
  varying float vGlow;
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.0;
    if (d > 1.0) discard;
    float a = exp(-d*d*6.0) * (.44 + .56 * pow(1.0-d, 4.0));
    gl_FragColor = vec4(vColor, a * vGlow * uOpacity);
  }
`;
const WORLD_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying vec3 vView;
  void main() {
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;
const WORLD_FRAGMENT = `
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying vec3 vView;
  uniform vec3 uColor;
  uniform vec3 uDark;
  uniform float uTime;
  uniform float uSun;
  float hash(vec3 p) {
    p = fract(p * .3183099 + vec3(.1,.2,.3));
    p *= 17.0;
    return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  void main() {
    vec3 p = vLocal * 8.0 + vec3(0.0, uTime*.035, 0.0);
    float n = noise(p) * .6 + noise(p*2.7) * .3 + noise(p*6.0)*.1;
    float lit = max(.07, dot(normalize(vNormal), normalize(vec3(-.7,.8,1.0))));
    float rim = pow(1.0 - max(0.0, dot(normalize(vNormal), vView)), 2.6);
    vec3 terrain = mix(uDark, uColor, smoothstep(.3,.77,n));
    vec3 color = terrain * (.13 + lit * .92) + uColor * rim * 1.8;
    float veins = pow(1.0-abs(sin(n*19.0 + p.y*.7)), 9.0);
    color = mix(color, uColor*(.65+n*.9) + vec3(.5,.62,.78)*veins, uSun);
    color += rim * uSun * vec3(.6,.7,1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function random(seed) {
  let n = seed >>> 0;
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296; };
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(.08, 'rgba(255,255,255,.9)');
  g.addColorStop(.2, 'rgba(255,255,255,.35)');
  g.addColorStop(.42, 'rgba(255,255,255,.10)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function makePoints(positions, colors, sizes, phases, opacity, pixelRatio, scale) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: POINT_VERTEX, fragmentShader: POINT_FRAGMENT,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uPixelRatio: { value: pixelRatio },
      uOpacity: { value: opacity }, uScale: { value: scale }
    }
  });
  return new THREE.Points(geometry, material);
}

/** A self-contained, disposable, progressively enhanced galaxy renderer. */
export function createUniverse({ container, onSelect = () => {}, onReady = () => {} }) {
  if (!container) throw new Error('Universe container is required.');
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = container.clientWidth < 600;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.className = 'universe-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '0' });
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 100);
  const universe = new THREE.Group();
  universe.position.y = .28;
  scene.add(universe);
  const galaxy = new THREE.Group();
  galaxy.rotation.z = .25;
  universe.add(galaxy);
  const rng = random(2601);
  const glow = glowTexture();
  const pointMaterials = [];
  const bodyMaterials = [];
  const makeGlow = (color, size, opacity) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    sprite.scale.set(size, size, 1);
    return sprite;
  };
  const colors = [new THREE.Color('#4bc7ff'), new THREE.Color('#7650ff'), new THREE.Color('#b983ff'), new THREE.Color('#feb28b')];

  // A fine spiral disk with bright arms, an irregular halo and warm inner dust.
  const disk = { p: [], c: [], s: [], a: [] };
  const count = compact ? 18000 : 32000;
  for (let i = 0; i < count; i++) {
    const r = .52 + Math.pow(rng(), .72) * 4.6;
    const arm = i % 4;
    const theta = arm * Math.PI / 2 + r * .92 + (rng()-.5) * (.24 + r*.075);
    const spread = (rng()-.5) * .12 * r;
    const x = Math.cos(theta)*r + spread;
    const y = Math.sin(theta)*r;
    disk.p.push(x, y*.38 + (rng()-.5)*.12, y*.67 + (rng()-.5)*.22);
    let c = colors[Math.floor(rng()*3)].clone();
    if (r < 1.6) c.lerp(colors[3], .6 + rng()*.35);
    else if (rng() < .15) c.lerp(new THREE.Color('#ffffff'), .7);
    c.multiplyScalar(.6 + rng()*.85);
    disk.c.push(c.r,c.g,c.b);
    disk.s.push(rng() < .012 ? 8 + rng()*7 : 1.4 + rng()*3.2);
    disk.a.push(rng()*Math.PI*2);
  }
  const diskPoints = makePoints(disk.p,disk.c,disk.s,disk.a,.82,renderer.getPixelRatio(),10);
  galaxy.add(diskPoints); pointMaterials.push(diskPoints.material);

  // Larger translucent points form a subtle nebula behind the fine star dust.
  const cloud = { p: [], c: [], s: [], a: [] };
  for (let i=0; i<(compact ? 750 : 1500); i++) {
    const r = .9 + rng()*4.5;
    const t = (i%3)*Math.PI*2/3 + r*.8 + (rng()-.5)*.7;
    cloud.p.push(Math.cos(t)*r,Math.sin(t)*r*.42+(rng()-.5)*.3,Math.sin(t)*r*.7-.8);
    const c = colors[i%3]; cloud.c.push(c.r,c.g,c.b);
    cloud.s.push(15+rng()*35); cloud.a.push(rng()*Math.PI*2);
  }
  const nebula = makePoints(cloud.p,cloud.c,cloud.s,cloud.a,.045,renderer.getPixelRatio(),32);
  galaxy.add(nebula); pointMaterials.push(nebula.material);

  const field = { p: [], c: [], s: [], a: [] };
  for (let i=0; i<(compact ? 600 : 1150); i++) {
    field.p.push((rng()-.5)*19,(rng()-.5)*15,-2-rng()*9);
    const c = new THREE.Color().setHSL(.58+rng()*.14,.35+rng()*.35,.64+rng()*.3);
    field.c.push(c.r,c.g,c.b); field.s.push(rng()<.035 ? 9 : 2+rng()*4); field.a.push(rng()*6.28);
  }
  const stars = makePoints(field.p,field.c,field.s,field.a,.9,renderer.getPixelRatio(),30);
  scene.add(stars); pointMaterials.push(stars.material);

  // The central Ayush star: procedural plasma, corona and fine accretion rings.
  const coreMaterial = new THREE.ShaderMaterial({
    vertexShader: WORLD_VERTEX, fragmentShader: WORLD_FRAGMENT,
    uniforms: { uColor: {value:new THREE.Color('#9bbfff')},uDark:{value:new THREE.Color('#354eb6')},uTime:{value:0},uSun:{value:1} }
  });
  bodyMaterials.push(coreMaterial);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.43,48,32), coreMaterial);
  universe.add(core);
  const coreGlow = makeGlow('#b3adff',3.1,.68);
  universe.add(coreGlow);
  const whiteCore = makeGlow('#e9f8ff',1.25,.6);
  whiteCore.position.z=.38; universe.add(whiteCore);
  const lightBeam = makeGlow('#aaa5ff',1,.3);
  lightBeam.scale.set(.065,3.6,1); lightBeam.position.z=.1; universe.add(lightBeam);
  const innerRingGroup = new THREE.Group();
  innerRingGroup.rotation.set(.99,.18,.26);
  universe.add(innerRingGroup);
  for (let i=0;i<5;i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.66+i*.105,.005+(i===1?.014:0),5,180),new THREE.MeshBasicMaterial({color:i<2?'#fac18e':'#a388ff',transparent:true,opacity:i<2?.8:.3,blending:THREE.AdditiveBlending,depthWrite:false}));
    innerRingGroup.add(ring);
  }

  const definitions = [
    {id:'about',color:'#38dcff',dark:'#073451',radius:.25,a:4.03,b:2.45,phase:2.25,speed:.025,tilt:-.15},
    {id:'learning',color:'#b884ff',dark:'#271254',radius:.29,a:4.49,b:2.15,phase:.65,speed:.021,tilt:.11},
    {id:'journey',color:'#d5e2ff',dark:'#41475d',radius:.28,a:3.83,b:2.78,phase:3.98,speed:.018,tilt:-.12},
    {id:'contact',color:'#ff957b',dark:'#51201d',radius:.25,a:4.64,b:2.62,phase:5.69,speed:.016,tilt:.1}
  ];
  function orbitPosition(d,theta,out=new THREE.Vector3()) {
    const x=Math.cos(theta)*d.a, y=Math.sin(theta)*d.b;
    return out.set(x*Math.cos(d.tilt)-y*Math.sin(d.tilt), x*Math.sin(d.tilt)+y*Math.cos(d.tilt), Math.sin(theta)*.38);
  }
  const pickables=[];
  const planets=definitions.map(d=>{
    const group=new THREE.Group(); universe.add(group);
    const mat=new THREE.ShaderMaterial({vertexShader:WORLD_VERTEX,fragmentShader:WORLD_FRAGMENT,uniforms:{uColor:{value:new THREE.Color(d.color)},uDark:{value:new THREE.Color(d.dark)},uTime:{value:0},uSun:{value:0}}});
    bodyMaterials.push(mat);
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(d.radius,32,24),mat);
    mesh.userData.id=d.id; pickables.push(mesh); group.add(mesh);
    const halo=makeGlow(d.color,d.radius*5,.52); group.add(halo);
    if(d.id==='learning'){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(d.radius*1.48,.009,5,90),new THREE.MeshBasicMaterial({color:d.color,transparent:true,opacity:.7,blending:THREE.AdditiveBlending}));
      ring.rotation.set(.8,.15,-.55); group.add(ring);
    }
    const positions=[];
    for(let j=0;j<=180;j++){const v=orbitPosition(d,j/180*Math.PI*2);positions.push(v.x,v.y,v.z);}
    const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:d.color,transparent:true,opacity:.16,depthWrite:false,blending:THREE.AdditiveBlending}));
    universe.add(line);
    const trailGeometry=new THREE.BufferGeometry();
    trailGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(54*3),3));
    trailGeometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(54*3),3));
    const trail=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));
    universe.add(trail);
    return {...d,group,mesh,halo,line,trail,label:container.querySelector('[data-planet="'+d.id+'"]'),angle:d.phase};
  });

  const coreLabel=container.querySelector('.core-label');
  const projected=new THREE.Vector3();
  const focusPoint=new THREE.Vector3();
  const cameraTarget=new THREE.Vector3();
  const raycaster=new THREE.Raycaster();
  const pointer=new THREE.Vector2();
  const pointerAim=new THREE.Vector2();
  const pointerSmooth=new THREE.Vector2();
  let width=1,height=1,baseDistance=15,raf=0,last=0,elapsed=0,disposed=false;
  let motionEnabled=!reducedQuery.matches,visible=!document.hidden,focused=null;
  let currentDistance=15;
  let ready=false;

  function updatePlanetPositions(){
    planets.forEach(p=>{
      p.angle=p.phase+elapsed*p.speed;
      orbitPosition(p,p.angle,p.group.position);
      p.mesh.rotation.y=elapsed*.065;
      const attr=p.trail.geometry.attributes.position, colorAttr=p.trail.geometry.attributes.color;
      const c=new THREE.Color(p.color);
      for(let i=0;i<54;i++){
        const v=orbitPosition(p,p.angle-.5+(i/53)*.5);
        attr.setXYZ(i,v.x,v.y,v.z);
        const alpha=(i/53)*(i/53);colorAttr.setXYZ(i,c.r*alpha,c.g*alpha,c.b*alpha);
      }
      attr.needsUpdate=true;colorAttr.needsUpdate=true;
    });
  }

  function positionLabels(){
    universe.updateMatrixWorld(true);
    const small=width<600;
    planets.forEach(p=>{
      if(!p.label)return;
      p.group.getWorldPosition(projected);projected.project(camera);
      const x=(projected.x*.5+.5)*width;
      const y=(-projected.y*.5+.5)*height+(small?23:30);
      p.label.style.left=Math.max(45,Math.min(width-45,x))+'px';
      p.label.style.top=Math.max(35,Math.min(height-30,y))+'px';
      p.label.style.transform='translate(-50%, -50%)';
      p.label.style.opacity=focused&&focused!==p.id?'.35':'1';
      p.label.dataset.ready='true';
    });
    if(coreLabel){
      projected.set(0,-.75,.5);universe.localToWorld(projected);projected.project(camera);
      coreLabel.style.left=(projected.x*.5+.5)*width+'px';
      coreLabel.style.top=(-projected.y*.5+.5)*height+'px';
      coreLabel.style.transform='translate(-50%, -50%)';
      coreLabel.style.opacity=focused?'.2':'1';
    }
  }

  function render(time){
    if(disposed)return;
    raf=0;
    const dt=last?Math.min((time-last)/1000,.05):0;
    last=time;
    if(motionEnabled&&visible)elapsed+=dt;
    pointMaterials.forEach(m=>m.uniforms.uTime.value=elapsed);
    bodyMaterials.forEach(m=>m.uniforms.uTime.value=elapsed);
    galaxy.rotation.z=.25+elapsed*.005;
    core.rotation.y=elapsed*.08;
    innerRingGroup.rotation.z=.26+elapsed*.025;
    updatePlanetPositions();
    pointerSmooth.lerp(pointerAim,motionEnabled?.035:1);
    const selected=planets.find(p=>p.id===focused);
    if(selected)focusPoint.copy(selected.group.position).multiplyScalar(.48).add(universe.position);
    else focusPoint.set(0,0,0);
    const targetDistance=selected?baseDistance*.77:baseDistance;
    const ease=motionEnabled?1-Math.exp(-Math.max(dt,.016)*5):1;
    currentDistance+=(targetDistance-currentDistance)*ease;
    cameraTarget.lerp(focusPoint,ease);
    camera.position.set(cameraTarget.x+pointerSmooth.x*.23,cameraTarget.y+pointerSmooth.y*.16,currentDistance);
    camera.lookAt(cameraTarget);
    camera.updateMatrixWorld();
    renderer.render(scene,camera);
    positionLabels();
    if(!ready){ready=true;container.dataset.universe='ready';onReady();}
    if(motionEnabled&&visible)raf=requestAnimationFrame(render);
    else if(Math.abs(targetDistance-currentDistance)>.001)raf=requestAnimationFrame(render);
  }
  function schedule(){if(!raf&&!disposed)raf=requestAnimationFrame(render);}
  function resize(){
    width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);
    camera.aspect=width/height;
    baseDistance=Math.max(12.3,11.3/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
    if(!ready)currentDistance=baseDistance;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
    schedule();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);
  function pointerMove(event){
    const rect=container.getBoundingClientRect();
    pointerAim.set(((event.clientX-rect.left)/rect.width-.5)*2,-((event.clientY-rect.top)/rect.height-.5)*2);
    if(!motionEnabled)pointerAim.set(0,0);
  }
  function pointerLeave(){pointerAim.set(0,0);}
  function canvasClick(event){
    const r=renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(pickables,false)[0];
    if(hit)onSelect(hit.object.userData.id);
  }
  function visibility(){visible=!document.hidden;last=0;if(visible)schedule();}
  function reducedChanged(){motionEnabled=!reducedQuery.matches;pointerAim.set(0,0);schedule();}
  container.addEventListener('pointermove',pointerMove,{passive:true});
  container.addEventListener('pointerleave',pointerLeave,{passive:true});
  renderer.domElement.addEventListener('click',canvasClick);
  document.addEventListener('visibilitychange',visibility);
  reducedQuery.addEventListener('change',reducedChanged);
  resize();

  return {
    setMotion(enabled){motionEnabled=Boolean(enabled);if(!motionEnabled)pointerAim.set(0,0);last=0;schedule();},
    focus(id){if(!planets.some(p=>p.id===id))return;focused=id;last=0;schedule();},
    reset(){focused=null;last=0;schedule();},
    dispose(){
      disposed=true;cancelAnimationFrame(raf);observer.disconnect();
      container.removeEventListener('pointermove',pointerMove);container.removeEventListener('pointerleave',pointerLeave);
      renderer.domElement.removeEventListener('click',canvasClick);document.removeEventListener('visibilitychange',visibility);
      reducedQuery.removeEventListener('change',reducedChanged);
      scene.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(m=>m.dispose());}});
      glow.dispose();renderer.dispose();renderer.domElement.remove();
    }
  };
}
