(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const laneX = [220, 450, 680];
  const lanesY = [H - 120, H - 220, H - 320];
  
  let running = false, gameOver = false, lastTime = 0;
  let speed = 320, score = 0, coins = 0, charIndex = 0;
  
  const characters = [{name: "Roman"}, {name: "Cena"}, {name: "Becky"}];
  const player = { lane: 1, w: 60, h: 90, x: laneX[1]-30, y: lanesY[1]-90, vy: 0, gravity: 1600, jumpPower: 700, jumping: false };
  
  const obstacles = [];
  const pickups = [];
  let spawnTimer = 0;
  
  function reset(){
    running=false; gameOver=false; speed=320; score=0; coins=0; obstacles.length=0; pickups.length=0;
    player.lane = 1; player.x = laneX[player.lane]-30; player.y = lanesY[player.lane]-player.h; player.vy = 0; player.jumping = false;
    document.getElementById("status").innerText = "Press Space to Start";
    document.getElementById("overlayStart").classList.remove("hidden");
    document.getElementById("overlayGameOver").classList.add("hidden");
    updateUI();
  }
  
  function start(){
    running = true;
    lastTime = performance.now();
    document.getElementById("overlayStart").classList.add("hidden");
    document.getElementById("status").innerText = "Running";
  }
  
  function spawnObstacle(){
    const lane = Math.floor(Math.random()*3);
    obstacles.push({x: W+100, lane, w: 60, h: 80});
  }
  
  function spawnPickup(){
    const lane = Math.floor(Math.random()*3);
    pickups.push({x: W+100, lane, r: 18});
  }
  
  function updateUI(){
    document.getElementById("score").innerText = "Score: " + Math.floor(score);
    document.getElementById("coins").innerText = "Coins: " + coins;
  }
  
  function update(dt){
    if(!running || gameOver) return;
    score += dt * 12;
    speed += dt * 3;
    
    const targetX = laneX[player.lane]-30;
    player.x += (targetX - player.x) * Math.min(16*dt,1);
    
    if(player.jumping){
      player.vy += player.gravity * dt;
      player.y += player.vy * dt;
      if(player.y >= lanesY[player.lane]-player.h){
        player.y = lanesY[player.lane]-player.h;
        player.jumping = false;
        player.vy = 0;
      }
    }
    
    spawnTimer += dt;
    const spawnInterval = Math.max(0.5, 1.6 - speed/1400);
    if(spawnTimer > spawnInterval){
      spawnTimer = 0;
      if(Math.random() < 0.7) spawnObstacle();
      if(Math.random() < 0.45) spawnPickup();
    }
    
    for(let i=obstacles.length-1; i>=0; i--){
      obstacles[i].x -= speed * dt;
      if(obstacles[i].x < -200) obstacles.splice(i,1);
    }
    
    for(let i=pickups.length-1; i>=0; i--){
      pickups[i].x -= (speed+50) * dt;
      if(pickups[i].x < -100) pickups.splice(i,1);
    }
    
    const px = player.x, py = player.y, pw = player.w, ph = player.h;
    for(let i=obstacles.length-1; i>=0; i--){
      const o = obstacles[i];
      const ox = o.x, oy = lanesY[o.lane]-o.h, ow = o.w, oh = o.h;
      if(px < ox+ow && px+pw > ox && py < oy+oh && py+ph > oy){
        running = false;
        gameOver = true;
        document.getElementById("status").innerText = "Game Over";
        document.getElementById("finalScore").innerText = "Score: " + Math.floor(score);
        document.getElementById("overlayGameOver").classList.remove("hidden");
      }
    }
    
    for(let i=pickups.length-1; i>=0; i--){
      const p = pickups[i];
      const cx = p.x, cy = lanesY[p.lane]-30, r = p.r;
      if(px < cx+r && px+pw > cx-r && py < cy+r && py+ph > cy-r){
        coins++;
        pickups.splice(i,1);
      }
    }
    
    updateUI();
  }
  
  function draw(){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "#2b8a3e";
    ctx.fillRect(0, H-100, W, 100);
    
    for(let i=0; i<3; i++){
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, lanesY[i]+10);
      ctx.lineTo(W, lanesY[i]+10);
      ctx.stroke();
    }
    
    for(const o of obstacles){
      const ox = o.x, oy = lanesY[o.lane]-o.h;
      ctx.fillStyle = "#5a2d2d";
      ctx.fillRect(ox, oy, o.w, o.h);
      ctx.fillStyle = "#fff";
      ctx.font = "14px Arial";
      ctx.fillText("TRUCK", ox+6, oy+40);
    }
    
    for(const p of pickups){
      const cx = p.x, cy = lanesY[p.lane]-30;
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(cx, cy, p.r, 0, Math.PI*2);
      ctx.fill();
    }
    
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";
    ctx.fillText(characters[charIndex].name, player.x-5, player.y-5);
    
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(10,10,200,54);
    ctx.fillStyle = "#fff";
    ctx.font = "16px Arial";
    ctx.fillText("Score: "+Math.floor(score), 20, 34);
    ctx.fillText("Coins: "+coins, 20, 54);
  }
  
  function loop(t){
    const dt = Math.min(0.033, (t-lastTime)/1000);
    lastTime = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  
  window.addEventListener("keydown", e=>{
    if(e.code === "Space"){
      if(gameOver) reset();
      if(!running) start();
    }
    if(!running || gameOver) return;
    if(e.key === "ArrowLeft" || e.key === "a") player.lane = Math.max(0, player.lane-1);
    if(e.key === "ArrowRight" || e.key === "d") player.lane = Math.min(2, player.lane+1);
    if(e.key === "ArrowUp" || e.key === "w"){
      if(!player.jumping){
        player.jumping = true;
        player.vy = -player.jumpPower;
      }
    }
    if(["1","2","3"].includes(e.key)) charIndex = Number(e.key)-1;
  });
  
  canvas.addEventListener("click", e=>{
    if(!running) start();
    else if(!player.jumping){
      player.jumping = true;
      player.vy = -player.jumpPower;
    }
  });
  
  document.getElementById("btnStart").addEventListener("click", () => start());
  document.getElementById("btnRestart").addEventListener("click", () => reset());
  
  reset();
  requestAnimationFrame(loop);
})();
