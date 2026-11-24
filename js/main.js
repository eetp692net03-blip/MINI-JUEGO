import * as THREE from 'three';

const $=s=>document.querySelector(s);
const canvas=$('#game-canvas');

const CHAMPIONS=[
 {key:'artemisa',name:'Artemisa',role:'tirador',icon:'🏹',origin:'Diosa griega de la caza',color:0x22c55e,maxHp:520,damage:48,range:8.5,speed:8.2,description:'Ataques a distancia y gran precisión.'},
 {key:'ares',name:'Ares',role:'luchador',icon:'⚔️',origin:'Dios griego de la guerra',color:0xef4444,maxHp:700,damage:66,range:4.8,speed:7.6,description:'Sigue vivo gracias al instinto guerrero.'},
 {key:'hades',name:'Hades',role:'mago',icon:'🔥',origin:'Dios griego del inframundo',color:0xa855f7,maxHp:570,damage:72,range:7.2,speed:7.7,description:'Poder mágico de enorme alcance.'},
 {key:'atenea',name:'Atenea',role:'tanque',icon:'🦉',origin:'Diosa griega de la estrategia',color:0x38bdf8,maxHp:950,damage:42,range:4.2,speed:6.8,description:'Resistencia divina y escudo frontal.'},
 {key:'loki',name:'Loki',role:'asesino',icon:'🗡️',origin:'Engañador de la mitología nórdica',color:0xeab308,maxHp:560,damage:82,range:4.5,speed:9.3,description:'Asalta enemigos con velocidad y engaño.'}
];

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x080c14);
scene.fog=new THREE.FogExp2(0x080c14,.012);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,300);
camera.position.set(-45,55,45);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;
scene.add(new THREE.HemisphereLight(0x93c5fd,0x111827,1.8));
const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-30,50,-20);sun.castShadow=true;scene.add(sun);

const grid=new THREE.GridHelper(116,29,0x38bdf8,0x334155);scene.add(grid);
const ground=new THREE.Mesh(new THREE.CircleGeometry(58,64),new THREE.MeshStandardMaterial({color:0x172033,roughness:.8}));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);

for(const [x,z,c] of [[-48,48,0x38bdf8],[48,-48,0xef4444],[-46,-46,0x38bdf8],[46,46,0xef4444],[-46,46,0x38bdf8],[46,-46,0xef4444]]){
 const base=new THREE.Mesh(new THREE.CylinderGeometry(5,6,1,16),new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.15}));base.position.set(x,.5,z);base.castShadow=true;scene.add(base);
}

class Hero{
 constructor(data,team='blue',pos=new THREE.Vector3(-38,0,38)){
  Object.assign(this,data);this.team=team;this.hp=data.maxHp;this.maxHp=data.maxHp;this.isDead=false;this.radius=.9;this.target=null;this.attackCd=0;this.qCd=0;this.wCd=0;this.eCd=0;this.rCd=0;this.shield=0;
  this.mesh=new THREE.Group();scene.add(this.mesh);this.mesh.position.copy(pos);
  const body=new THREE.Mesh(new THREE.DodecahedronGeometry(.85,1),new THREE.MeshStandardMaterial({color:data.color,emissive:data.color,emissiveIntensity:.25,roughness:.35}));body.castShadow=true;body.position.y=1;this.mesh.add(body);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.08,8,28),new THREE.MeshBasicMaterial({color:team==='blue'?0x38bdf8:0xf87171}));ring.rotation.x=Math.PI/2;ring.position.y=.05;this.mesh.add(ring);
 }
 get position(){return this.mesh.position}
 takeDamage(n){if(this.isDead)return;if(this.shield>0){const absorbed=Math.min(this.shield,n);this.shield-=absorbed;n-=absorbed}this.hp=Math.max(0,this.hp-n);damage(n,this.position,n>100?'#f59e0b':'#fff');if(this.hp<=0)this.die()}
 die(){this.isDead=true;this.mesh.visible=false}
}

const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();let player=null,enemy=null,selected=null,last=performance.now(),elapsed=0,gameOver=false;

function buildSelection(){const grid=$('#champion-grid');grid.innerHTML='';for(const ch of CHAMPIONS){const b=document.createElement('button');b.className='champion-option';b.innerHTML=`<span class="god-icon">${ch.icon}</span><h3>${ch.name}</h3><span class="role">${ch.role}</span><p>${ch.description}<br><small>${ch.origin}</small></p>`;b.onclick=()=>start(ch);grid.appendChild(b)}}

function start(ch){$('#champion-modal').classList.add('hidden');selected=ch;player=new Hero(ch,'blue',new THREE.Vector3(-38,0,38));const foe=CHAMPIONS[(CHAMPIONS.indexOf(ch)+2)%CHAMPIONS.length];enemy=new Hero(foe,'red',new THREE.Vector3(38,0,-38));$('#avatar').textContent=ch.icon;$('#q-icon').textContent='✨';$('#w-icon').textContent='🛡️';$('#e-icon').textContent='💨';$('#r-icon').textContent=ch.role==='mago'?'🌩️':'⚡';updateHud()}

function damage(amount,pos,color){const v=pos.clone();v.y+=2;v.project(camera);const el=document.createElement('div');el.className='damage-number';el.textContent=Math.round(amount);el.style.left=((v.x*.5+.5)*innerWidth)+'px';el.style.top=((-.5*v.y+.5)*innerHeight)+'px';el.style.color=color;$('#damage-layer').appendChild(el);setTimeout(()=>el.remove(),800)}

function click(e){if(!player||player.isDead)return;if(e.pointerType==='touch')mouse.x=e.clientX/innerWidth*2-1;else mouse.x=(e.clientX/innerWidth)*2-1;mouse.y=-(e.clientY/innerHeight)*2+1;raycaster.setFromCamera(mouse,camera);const point=new THREE.Vector3();raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),point);if(point)player.target=point}
canvas.addEventListener('pointerdown',click);canvas.addEventListener('contextmenu',e=>e.preventDefault());

addEventListener('keydown',e=>{if(!player||gameOver)return;if(e.code==='KeyS')player.target=null;if(e.code==='KeyQ')castQ();if(e.code==='KeyW')castW();if(e.code==='KeyE')castE();if(e.code==='KeyR')castR()});

function dist(a,b){return a.distanceTo(b)}
function inMap(p){p.x=Math.max(-54,Math.min(54,p.x));p.z=Math.max(-54,Math.min(54,p.z))}
function castQ(){if(player.qCd>0)return;player.qCd=4;const dir=enemy.position.clone().sub(player.position).setY(0).normalize();const orb=new THREE.Mesh(new THREE.SphereGeometry(.35,12,12),new THREE.MeshBasicMaterial({color:0x38bdf8}));orb.position.copy(player.position);orb.position.y=1;scene.add(orb);let t=0;const timer=setInterval(()=>{t+=.05;if(t>.9||enemy.isDead){clearInterval(timer);scene.remove(orb);return}orb.position.addScaledVector(dir,selected.range*2*.05);if(dist(orb.position,enemy.position)<1.5){enemy.takeDamage(selected.damage*1.7);scene.remove(orb);clearInterval(timer)}},50)}
function castW(){if(player.wCd>0)return;player.wCd=7;player.shield+=selected.role==='tanque'?260:180}
function castE(){if(player.eCd>0)return;player.eCd=5.5;const dir=enemy.position.clone().sub(player.position).setY(0).normalize();if(dir.lengthSq())player.mesh.position.addScaledVector(dir,8);inMap(player.position)}
function castR(){if(player.rCd>0)return;player.rCd=18;const blast=new THREE.Mesh(new THREE.SphereGeometry(5,20,20),new THREE.MeshBasicMaterial({color:selected.color,transparent:true,opacity:.55,wireframe:true}));blast.position.copy(enemy.position);scene.add(blast);setTimeout(()=>scene.remove(blast),500);if(dist(player.position,enemy.position)<12)enemy.takeDamage(selected.role==='mago'?240:selected.damage*3.2)}

function update(dt){if(!player||gameOver)return;elapsed+=dt;for(const k of ['q','w','e','r']){const key=k+'Cd';if(player[key]>0)player[key]=Math.max(0,player[key]-dt)}if(player.target&&!player.isDead){const d=player.target.clone().sub(player.position);d.y=0;if(d.length()>1){d.normalize();player.mesh.position.addScaledVector(d,player.speed*dt);inMap(player.position)}else player.target=null}
 if(enemy&&!enemy.isDead){const d=player.position.clone().sub(enemy.position);d.y=0;const dis=d.length();if(dis>enemy.range)d.normalize(),enemy.mesh.position.addScaledVector(d,enemy.speed*.72*dt),inMap(enemy.mesh.position);else if(dis<enemy.range){enemy.attackCd-=dt;if(enemy.attackCd<=0){enemy.attackCd=1.1;player.takeDamage(enemy.damage*.9)}}}
 if(player&&!player.isDead&&enemy&&!enemy.isDead&&dist(player.position,enemy.position)<player.range&&player.attackCd<=0){player.attackCd=1.2;enemy.takeDamage(player.damage)};player.attackCd=Math.max(0,(player.attackCd||0)-dt);
 if(player.isDead||enemy.isDead)finish(player.isDead?false:true)}

function updateHud(){if(!player)return;$('#hp-fill').style.width=(player.hp/player.maxHp*100)+'%';$('#mp-fill').style.width='100%';$('#hp-text').textContent=`${Math.ceil(player.hp)} / ${player.maxHp}${player.shield?` +${player.shield}`:''}`;$('#mp-text').textContent='350 / 350';for(const k of ['q','w','e','r']){$('#'+k+'-time').textContent=player[k+'Cd']>0?player[k+'Cd'].toFixed(1):''}$('#timer').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`}

function drawMinimap(){const ctx=$('#minimap').getContext('2d'),w=150;ctx.clearRect(0,0,w,w);ctx.fillStyle='#090e17';ctx.fillRect(0,0,w,w);ctx.strokeStyle='#334155';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(15,135);ctx.lineTo(135,15);ctx.moveTo(15,135);ctx.lineTo(15,15);ctx.lineTo(135,15);ctx.moveTo(15,135);ctx.lineTo(135,135);ctx.lineTo(135,15);ctx.stroke();const dot=(hero,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(75+(hero.position.x/58)*60,75+(hero.position.z/58)*60,5,0,Math.PI*2);ctx.fill()};if(player)dot(player,'#38bdf8');if(enemy)dot(enemy,'#ef4444')}
function finish(victory){if(gameOver)return;gameOver=true;$('#game-over').classList.remove('hidden');$('#game-over-title').textContent=victory?'¡VICTORIA DIVINA!':'DERROTA';$('#game-over-desc').textContent=victory?`${selected.name} ha vencido al héroe del Inframundo.`:'La fuerza enemiga ha dominado el campo.'}
$('#restart').onclick=()=>location.reload();

function animate(now){requestAnimationFrame(animate);const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);updateHud();drawMinimap();camera.position.x+=((-32-Math.sin(elapsed*.08)*8)-camera.position.x)*.015;camera.lookAt(player?.position||new THREE.Vector3());renderer.render(scene,camera)}

buildSelection();requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
