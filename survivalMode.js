// survivalMode.js
// ============================
// CHAOS KEYBOARD BATTLE - SURVIVAL MODE
// ============================

let canvas, ctx;
let paused = false;
let gameOverState = false;
let startTime = 0;
let enemySpawnInterval, powerUpSpawnInterval;
let prevTime = Date.now(); // for delta time in movement
let survivalPlayerName = "Player 1"; // to update winner name

const enemyBullets = [];
const enemies = [];
const powerUps = [];

// Player setup
const player = {
  x: 0,
  y: 0,
  width: 50,
  height: 50,
  speed: 5,
  baseSpeed: 5,
  health: 100,
  score: 0,
  bullets: [],
  shieldActive: false,
  dashCooldown: 0,
  lastShot: 0,
};

// Controls
const keys = {};

// 1. Attach keydown and keyup listeners inside Survival Mode.
function attachEventListeners() {
  document.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });
}

function spawnEnemy() {
  // Example spawn
  const enemy = {
    x: Math.random() * (canvas.width - 50),
    y: -50,
    width: 50,
    height: 50,
    speed: Math.random() * 2 + 1 + getWave() * 0.2,
    health: 30 + getWave() * 5,
    lastShot: Date.now(),
  };
  enemies.push(enemy);
}

function spawnPowerUp() {
  const types = ["health", "shield", "speed", "bullet"];
  const type = types[Math.floor(Math.random() * types.length)];
  const powerUp = {
    x: Math.random() * (canvas.width - 30),
    y: Math.random() * (canvas.height - 30),
    width: 30,
    height: 30,
    type: type,
    spawnTime: Date.now(),
  };
  powerUps.push(powerUp);
}

// 7. Modified shootBullet to fire in all directions based on arrow keys.
function shootBullet() {
  // Determine directional vector based on arrow key presses
  let dx = 0, dy = 0;
  if (keys["arrowup"]) dy -= 1;
  if (keys["arrowdown"]) dy += 1;
  if (keys["arrowleft"]) dx -= 1;
  if (keys["arrowright"]) dx += 1;
  // Default to upward if no arrow key is pressed
  if (dx === 0 && dy === 0) dy = -1;
  // Normalize vector
  const mag = Math.sqrt(dx * dx + dy * dy);
  dx /= mag;
  dy /= mag;
  
  // Create bullet with the specified direction
  const bulletSpeed = 10;
  player.bullets.push({
    x: player.x + player.width / 2 - 5,
    y: player.y + player.height / 2 - 5,
    width: 10,
    height: 10,
    dx: dx * bulletSpeed,
    dy: dy * bulletSpeed,
  });
  // Play shooting sound (if available)
  const shootSound = document.getElementById("shootSound");
  if (shootSound) shootSound.play();
}

function dash() {
  if (player.dashCooldown <= 0) {
    player.speed = player.baseSpeed * 3;
    player.dashCooldown = 2000; // cooldown in ms
    setTimeout(() => {
      player.speed = player.baseSpeed;
    }, 300); // dash lasts 300ms
  }
}

function isColliding(obj1, obj2) {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
}

function getWave() {
  const elapsed = Date.now() - startTime;
  return Math.floor(elapsed / 30000) + 1;
}

function update() {
  // 1. Use delta time for smoother movement
  const now = Date.now();
  const dt = (now - prevTime) / 16; // assuming 60 FPS ~16ms per frame
  prevTime = now;

  if (paused) {
    // Keep requesting frames so that when unpaused, we continue
    requestAnimationFrame(update);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const wave = getWave();

  // Movement with delta time multiplier
  if (keys["a"] && player.x > 0) player.x -= player.speed * dt;
  if (keys["d"] && player.x + player.width < canvas.width) player.x += player.speed * dt;
  if (keys["w"] && player.y > 0) player.y -= player.speed * dt;
  if (keys["s"] && player.y + player.height < canvas.height) player.y += player.speed * dt;

  // Shooting - using space key (" ") remains same
  if (keys[" "] && Date.now() - player.lastShot > 300) {
    shootBullet();
    player.lastShot = Date.now();
  }

  // Shield activation (using key 'q')
  player.shieldActive = !!keys["q"];

  // Dash (using key 'e')
  if (keys["e"]) dash();
  if (player.dashCooldown > 0) {
    player.dashCooldown -= dt * 16; // adjust dash cooldown reduction by dt
  }

  // Update player bullets (using new directional velocity)
  player.bullets.forEach((bullet, index) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    // Remove bullet if off-screen
    if (
      bullet.x < 0 ||
      bullet.x > canvas.width ||
      bullet.y < 0 ||
      bullet.y > canvas.height
    )
      player.bullets.splice(index, 1);
  });

  // Enemies
  enemies.forEach((enemy, eIndex) => {
    enemy.y += enemy.speed * dt;
    // Remove enemy if off-screen
    if (enemy.y > canvas.height) {
      enemies.splice(eIndex, 1);
      return;
    }
    // Enemy shooting every 2 seconds
    if (Date.now() - enemy.lastShot > 2000) {
      enemy.lastShot = Date.now();
      enemyBullets.push({
        x: enemy.x + enemy.width / 2 - 5,
        y: enemy.y + enemy.height,
        width: 10,
        height: 10,
        speed: 4,
      });
    }
    // Collision with player
    if (isColliding(player, enemy)) {
      if (!player.shieldActive) {
        player.health -= 10;
        // Play hit sound when player is hit
        const hitSound = document.getElementById("hitSound");
        if (hitSound) hitSound.play();
      }
      enemies.splice(eIndex, 1);
      return;
    }
    // Collision with player's bullets
    player.bullets.forEach((bullet, bIndex) => {
      if (isColliding(bullet, enemy)) {
        enemy.health -= 20;
        player.bullets.splice(bIndex, 1);
        // Play hit sound when enemy is hit
        const hitSound = document.getElementById("hitSound");
        if (hitSound) hitSound.play();
        if (enemy.health <= 0) {
          player.score += 10;
          enemies.splice(eIndex, 1);
        }
      }
    });
  });

  // Enemy bullets
  enemyBullets.forEach((bullet, index) => {
    bullet.y += bullet.speed * dt;
    if (bullet.y > canvas.height) {
      enemyBullets.splice(index, 1);
      return;
    }
    if (isColliding(bullet, player)) {
      if (!player.shieldActive) {
        player.health -= 10;
        // Play a sound for player hit (can use same hit sound)
        const hitSound = document.getElementById("hitSound");
        if (hitSound) hitSound.play();
      }
      enemyBullets.splice(index, 1);
    }
  });

  // Power-ups with info display (8)
  powerUps.forEach((powerUp, index) => {
    // If collides with player, apply effect and remove
    if (isColliding(player, powerUp)) {
      if (powerUp.type === "health") player.health = Math.min(100, player.health + 20);
      if (powerUp.type === "shield") player.shieldActive = true;
      if (powerUp.type === "speed") player.speed += 2;
      if (powerUp.type === "bullet") {
        // Increase speed for all current bullets
        player.bullets.forEach((b) => {
          b.dx *= 1.2;
          b.dy *= 1.2;
        });
      }
      powerUps.splice(index, 1);
    }
  });

  // --- Draw Section ---
  // Draw player
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, player.width, player.height);
  if (player.shieldActive) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw player bullets
  ctx.fillStyle = "red";
  player.bullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  // Draw enemies
  ctx.fillStyle = "green";
  enemies.forEach((enemy) => {
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });

  // Draw enemy bullets
  ctx.fillStyle = "orange";
  enemyBullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  // Draw power-ups and (8) display info for 5 seconds
  ctx.fillStyle = "yellow";
  powerUps.forEach((powerUp) => {
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
    // Display power-up type and remaining time if less than 5s old
    const elapsed = Date.now() - powerUp.spawnTime;
    if (elapsed < 5000) {
      const remaining = Math.ceil((5000 - elapsed) / 1000);
      ctx.fillStyle = "black";
      ctx.font = "14px Arial";
      ctx.fillText(`${powerUp.type} (${remaining})`, powerUp.x, powerUp.y - 5);
      ctx.fillStyle = "yellow";
    }
  });

  // UI (Health, Score, Wave, Timer)
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Health: ${player.health}`, 10, 30);
  ctx.fillText(`Score: ${player.score}`, 10, 60);
  ctx.fillText(`Wave: ${wave}`, 10, 90);
  const timerSeconds = Math.floor((Date.now() - startTime) / 1000);
  ctx.fillText(`Time: ${timerSeconds}s`, 10, 120);

  // Check for game over
  if (player.health <= 0) {
    gameOver();
    return;
  }

  requestAnimationFrame(update);
}

function gameOver() {
  gameOverState = true;
  // Clear spawn intervals to fix play again glitch (4)
  clearInterval(enemySpawnInterval);
  clearInterval(powerUpSpawnInterval);

  ctx.fillStyle = "red";
  ctx.font = "40px Arial";
  ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
  // Update winner name (6) using survivalPlayerName
  const gameOverScreen = document.getElementById("gameOverScreen");
  if (gameOverScreen) {
    const winnerNameEl = document.getElementById("winnerName");
    if (winnerNameEl) winnerNameEl.innerText = survivalPlayerName;
    gameOverScreen.classList.remove("hidden");
  }
}

// Called when Survival Mode starts
function survivalStartGame(playerName) {
  console.log("Survival mode starting...");
  // Store player name globally for later display (6)
  survivalPlayerName = playerName || "Player 1";

  // Get canvas & context
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  // 2. Center controls for survival mode (if exists)
  const controlsContainer = document.getElementById("controlsContainer");
  if (controlsContainer) {
    controlsContainer.style.position = "fixed";
    controlsContainer.style.bottom = "20px";
    controlsContainer.style.left = "50%";
    controlsContainer.style.transform = "translateX(-50%)";
  }

  // Play background music from index (3 & 10)
  const bgMusic = document.getElementById("bgMusic");
  if (bgMusic) {
    bgMusic.currentTime = 0;
    const volumeSlider = document.getElementById("volumeSlider");
    if (volumeSlider) bgMusic.volume = volumeSlider.value;
    bgMusic.play();
  }

  // Reset player properties
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - 100;
  player.health = 100;
  player.score = 0;
  player.bullets = [];
  player.shieldActive = false;
  player.speed = player.baseSpeed;
  player.lastShot = 0;
  player.dashCooldown = 0;

  // Clear arrays
  enemies.length = 0;
  enemyBullets.length = 0;
  powerUps.length = 0;
  gameOverState = false;
  paused = false;

  // Reset timer and previous frame time for delta time calculations
  startTime = Date.now();
  prevTime = Date.now();

  // Start spawn intervals
  enemySpawnInterval = setInterval(spawnEnemy, 2000);
  powerUpSpawnInterval = setInterval(spawnPowerUp, 10000);

  // Attach event listeners (only once)
  attachEventListeners();

  // Start the game loop
  update();
}

/* ===== BUTTON FUNCTIONALITY ===== */
function togglePause() {
  paused = !paused;
  const pauseScreen = document.getElementById("pauseScreen");
  if (pauseScreen) {
    if (paused) pauseScreen.classList.remove("hidden");
    else pauseScreen.classList.add("hidden");
  }
  // When unpausing and game is not over, resume the update loop.
  if (!paused && !gameOverState) {
    prevTime = Date.now(); // reset delta time clock for smoothness
    requestAnimationFrame(update);
  }
}

function restartGame() {
  // Simple approach: reload the page
  location.reload();
}

function playAgain() {
  // Hide the game over overlay and restart survival mode (4)
  const gameOverScreen = document.getElementById("gameOverScreen");
  if (gameOverScreen) {
    gameOverScreen.classList.add("hidden");
  }
  survivalStartGame(survivalPlayerName);
}

// Expose functions globally for HTML button callbacks
window.survivalStartGame = survivalStartGame;
window.togglePause = togglePause;
window.restartGame = restartGame;
window.playAgain = playAgain;
