const q5 = new Q5();

const CELL = 70;

// Town hall : départ au niveau 0, 5 améliorations (niveaux 1 à 5). Index = niveau.
const TOWNHALL_MAX_LEVEL = 5;
const TOWNHALL_UPGRADE_COST = [3000, 10000, 10000, 50000, 100000]; // prix pour atteindre le niveau 1, 2, 3, 4, 5
const TOWNHALL_REGEN_TICKS = [0, 180, 120, 90, 60, 30]; // 1 PV regagné tous les N ticks (0 = aucune régénération)
const towers = [];
const enemies = [];
const bullet = [];
const effects = [];
let coins;
let townhall;
let waves;
let grid;

let gameState = "playing";
let gameMode = "navigation";
let modeMessageStart = -120;
let paused = false;
let tick = 0;
let speed = 1;
let tutorialShown = false;
let mergeTutorialShown = false;
let tutorialStep = "press";
let draggingTower = null;
let manualPause = false;

q5.setup = function () {
  q5.createCanvas(q5.windowWidth, q5.windowHeight);
  townhall = new Townhall();
  coins = new Coins();
  grid = drawGrid();
  waves = new Wave();
};

function drawGrid() {
  const Grid = q5.createGraphics(q5.width, q5.height);
  Grid.stroke(255, 200);

  for (let x = 0; x <= Grid.width; x += CELL) {
    Grid.line(x, 0, x, Grid.height);
  }

  for (let y = 0; y <= Grid.height; y += CELL) {
    Grid.line(0, y, Grid.width, y);
  }

  return Grid;
}

function getButton(y) {
  return {
    x: q5.width / 2,
    y: y,
    width: Math.min(240, q5.width * 0.8),
    height: Math.min(60, q5.height * 0.11)
  };
}

function isButtonClicked(y) {
  const b = getButton(y);

  return (
    q5.mouseX >= b.x - b.width / 2 &&
    q5.mouseX <= b.x + b.width / 2 &&
    q5.mouseY >= b.y - b.height / 2 &&
    q5.mouseY <= b.y + b.height / 2
  );
}

function drawButton(text, y, color) {
  const b = getButton(y);

  q5.rectMode(q5.CENTER);
  q5.noStroke();

  q5.fill(isButtonClicked(y) ? "#39d980" : color);
  q5.rect(b.x, b.y, b.width, b.height, 10);

  q5.fill(255);
  q5.textAlign(q5.CENTER, q5.CENTER);
  q5.textSize(Math.min(24, q5.width * 0.065, q5.height * 0.06));
  q5.text(text, b.x, b.y);
}

function displayGameOver() {
  q5.background(30);

  q5.fill(255);
  q5.textAlign(q5.CENTER, q5.CENTER);
  q5.textSize(Math.min(50, q5.width * 0.09, q5.height * 0.1));

  q5.text("GAME OVER", q5.width / 2, q5.height * 0.28);

  q5.textSize(Math.min(24, q5.width * 0.06, q5.height * 0.06));
  q5.text(`Vague atteinte : ${waves.number}`, q5.width / 2, q5.height * 0.4);

  drawButton("Rejouer", q5.height * 0.58, "#2ecc71");
}

function restartGame() {
  towers.length = 0;
  enemies.length = 0;
  bullet.length = 0;
  effects.length = 0;
  draggingTower = null;

  townhall = new Townhall();
  coins = new Coins();
  waves = new Wave();

  gameMode = "navigation";
  modeMessageStart = -120;
  paused = false;
  manualPause = false;
  speed = 1;
  gameState = "playing";
  tutorialShown = false;
  mergeTutorialShown = false;
  tutorialStep = "press";
}

function tutorialBox(message, maxWidth) {
  const x = q5.width / 2;
  const size = Math.min(20, q5.width * 0.05, q5.height * 0.05);
  const width = Math.min(maxWidth, q5.width * 0.9);
  const height = size * 1.5 + 24;
  const y = q5.height * 0.22;

  q5.rectMode(q5.CENTER);
  q5.noStroke();
  q5.fill(20, 20, 20, 220);
  q5.rect(x, y, width, height, 10);

  q5.fill(255, 215, 0);
  q5.textAlign(q5.CENTER, q5.CENTER);
  q5.textSize(size);
  q5.text(message, x, y);
}

// Redessine les tours par-dessus le voile sombre, avec un halo fixe
function highlightTowers() {
  for (const t of towers) {
    const isDragged = t === draggingTower;
    const x = isDragged ? q5.mouseX : t.x;
    const y = isDragged ? q5.mouseY : t.y;

    // Halo statique derrière la tour
    q5.noStroke();
    q5.fill(255, 255, 255, 70);
    q5.circle(x, y, CELL + 16);
    q5.fill(255, 215, 0, 60);
    q5.circle(x, y, CELL - 10);

    // Tour redessinée par-dessus le voile (à la position de la souris si on la glisse)
    const ox = t.x;
    const oy = t.y;
    t.x = x;
    t.y = y;
    t.display();
    t.x = ox;
    t.y = oy;
  }
}

function displayTutorial() {
  if (tutorialStep === "place") {
    tutorialBox("Clique sur une case pour poser une tour", 520);
    return;
  }

  if (tutorialStep === "close") {
    tutorialBox("Appuie sur C pour fermer le mode construction", 520);
    return;
  }

  q5.rectMode(q5.CORNER);
  q5.noStroke();
  q5.fill(0, tutorialStep === "merge" ? 150 : 190);
  q5.rect(0, 0, q5.width, q5.height);

  if (tutorialStep === "merge") {
    highlightTowers();
    tutorialBox("Glisse un triangle sur l'autre pour les fusionner", 460);
  } else {
    tutorialBox("Appuie sur C pour construire", 420);
  }
}

function displayModeMessage() {
  const elapsed = q5.frameCount - modeMessageStart;

  if (elapsed >= 120) return;

  const alpha = Math.min(255, (120 - elapsed) * 10);
  const x = q5.width / 2;
  const y = q5.height * 0.12;
  const width = Math.min(280, q5.width * 0.85);
  const height = Math.min(50, q5.height * 0.12);

  q5.rectMode(q5.CENTER);
  q5.noStroke();
  q5.fill(20, 20, 20, alpha * 0.85);
  q5.rect(x, y, width, height, 10);

  q5.fill(255, alpha);
  q5.textAlign(q5.CENTER, q5.CENTER);
  q5.textSize(Math.min(20, q5.width * 0.055, q5.height * 0.06));
  q5.text(
    gameMode === "construction" ? "Mode construction" : "Mode navigation",
    x,
    y
  );
}

q5.draw = function () {
  if (gameState === "gameover") {
    displayGameOver();
    return;
  }

  if (!tutorialShown && coins.amount > 25) {
    tutorialShown = true;
    paused = true;
  }

  if (!paused && !manualPause) {
    for (let i = 0; i < speed; i++) {
      updateGame();
      if (gameState === "gameover") {
        displayGameOver();
        return;
      }
    }
  }

  q5.background(30);
  if (gameMode === "construction") {
    q5.image(grid, 0, 0, q5.width, q5.height);
  }

  waves.display();

  townhall.display();
  townhall.healthbar();

  for (const t of towers) {
    if (t === draggingTower) continue;
    t.display();
  }

  if (draggingTower) {
    const ox = draggingTower.x;
    const oy = draggingTower.y;

    draggingTower.x = q5.mouseX;
    draggingTower.y = q5.mouseY;
    draggingTower.display();
    draggingTower.x = ox;
    draggingTower.y = oy;

    const target = towers.find(
      t => t !== draggingTower && Math.hypot(t.x - q5.mouseX, t.y - q5.mouseY) < CELL / 2
    );

    if (target && target.level === draggingTower.level && target.level < 3) {
      q5.noFill();
      q5.stroke(255, 255, 255, 200);
      q5.strokeWeight(3);
      q5.circle(target.x, target.y, CELL - 5);
      q5.noStroke();
    }
  }

  for (const e of enemies) e.display();
  for (const b of bullet) b.display();
  displayEffects();

  coins.display();
  displayModeMessage();
  displayHelp();
  displayPauseLabel();
  if (paused) displayTutorial();
};

function nextTowerPrice() {
  const base = 25 * Math.pow(2.27, towers.length);

  return Math.max(1, Math.ceil(base / townhall.priceDivider));
}

// Aide des touches (bas gauche) et prix de la prochaine tour (bas droite)
function displayHelp() {
  const size = Math.min(16, q5.width * 0.04, q5.height * 0.04);
  const margin = 20;
  const lineHeight = size * 1.5;

  q5.noStroke();
  q5.textSize(size);

  // Bas gauche : touches
  const lines = [
    "C : mode construction / navigation",
    "P : pause",
    "U : améliorer le town hall"
  ];

  q5.textAlign(q5.LEFT, q5.BOTTOM);
  q5.fill(255, 200);

  for (let i = 0; i < lines.length; i++) {
    const y = q5.height - margin - (lines.length - 1 - i) * lineHeight;
    q5.text(lines[i], margin, y);
  }

  // Bas droite : prix et town hall
  const price = nextTowerPrice();
  const cost = townhall.upgradeCost;
  const divider = townhall.priceDivider;

  const right = [
    {
      text: `Prochaine tour : 🪙${price}` + (divider > 1 ? ` (÷${divider})` : ""),
      color: coins.amount >= price ? q5.color(46, 204, 113) : q5.color(255, 215, 0)
    },
    cost === null
      ? { text: "Town hall au niveau max", color: q5.color(255, 215, 0) }
      : {
          text: `Améliorer le town hall (U) : 🪙${cost}`,
          color: coins.amount >= cost ? q5.color(46, 204, 113) : q5.color(255, 215, 0)
        }
  ];

  q5.textAlign(q5.RIGHT, q5.BOTTOM);

  for (let i = 0; i < right.length; i++) {
    const y = q5.height - margin - (right.length - 1 - i) * lineHeight;
    q5.fill(right[i].color);
    q5.text(right[i].text, q5.width - margin, y);
  }
}

function displayPauseLabel() {
  if (!manualPause) return;

  q5.rectMode(q5.CENTER);
  q5.noStroke();
  q5.fill(20, 20, 20, 200);
  q5.rect(q5.width / 2, q5.height * 0.5, 220, 70, 10);

  q5.fill(255);
  q5.textAlign(q5.CENTER, q5.CENTER);
  q5.textSize(28);
  q5.text("PAUSE", q5.width / 2, q5.height * 0.5);
}

// Anneau orange qui s'étend à l'endroit où une balle de niveau 3 se divise
function displayEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    const t = fx.age / fx.life;

    q5.noFill();
    q5.stroke(255, 159, 67, 255 * (1 - t));
    q5.strokeWeight(4);
    q5.circle(fx.x, fx.y, 20 + 70 * t);
    q5.noStroke();

    if (!paused && !manualPause) fx.age += speed;
    if (fx.age >= fx.life) effects.splice(i, 1);
  }
}

function updateGame() {
  tick++;

  waves.update();
  townhall.update();
  townhall.shoot();

  for (const t of towers) t.shoot();

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    e.move();

    if (e.damage()) enemies.splice(i, 1);
  }

  for (let i = bullet.length - 1; i >= 0; i--) {
    const b = bullet[i];

    b.move();

    if (b.damage() || b.outOfRange()) bullet.splice(i, 1);
  }
}

q5.windowResized = function () {
  const oldX = townhall.x;
  const oldY = townhall.y;

  q5.resizeCanvas(q5.windowWidth, q5.windowHeight);

  grid = drawGrid();

  townhall.x = Math.floor(q5.width / 2 / CELL) * CELL + CELL / 2;
  townhall.y = Math.floor(q5.height / 2 / CELL) * CELL + CELL / 2;

  const dx = townhall.x - oldX;
  const dy = townhall.y - oldY;

  for (const t of towers) {
    t.x += dx;
    t.y += dy;
  }

  for (const e of enemies) {
    e.x += dx;
    e.y += dy;
  }

  for (const b of bullet) {
    b.x += dx;
    b.y += dy;
    b.startX += dx;
    b.startY += dy;
  }
};

class Entity {
  constructor(x, y, size, color) {
    this.x = x;
    this.y = y;
    this.size = size - 15;
    this.rounded = 10;
    this.color = color;
  }

  display() {
    q5.rectMode(q5.CENTER);
    q5.noStroke();
    q5.fill(this.color);
    q5.square(this.x, this.y, this.size, this.rounded);
  }

  polygon(sides, radius, rotation = -Math.PI / 2) {
    q5.beginShape();
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i * 2 * Math.PI) / sides;
      q5.vertex(this.x + Math.cos(a) * radius, this.y + Math.sin(a) * radius);
    }
    q5.endShape(q5.CLOSE);
  }

  shoot() {
    if (tick - this.lastShot < this.fireRate) return;

    for (const e of enemies) {
      const distance = Math.hypot(e.x - this.x, e.y - this.y);

      if (distance <= this.range) {
        const b = new Bullet(this.x, this.y, e, this.level);
        b.range = this.range + 60; // sinon la balle disparaît avant d'atteindre les ennemis lointains
        bullet.push(b);
        this.lastShot = tick;
        return;
      }
    }
  }
}

class Townhall extends Entity {
  #hp = 100;
  #maxHp = 100; // +100 à chaque niveau

  constructor() {
    super(
      Math.floor(q5.width / 2 / CELL) * CELL + CELL / 2,
      Math.floor(q5.height / 2 / CELL) * CELL + CELL / 2,
      CELL,
      "#1262da"
    );

    this.level = 0; // niveau des balles (pas le niveau d'amélioration)
    this.upgradeLevel = 0;
    this.range = 200;
    this.fireRate = 60;
    this.lastShot = tick;
  }

  // 7 faces au départ, +1 face par niveau
  get sides() {
    return 7 + this.upgradeLevel;
  }

  // Le prix des tours est divisé par 2 à chaque niveau (x1, /2, /4, /8, /16, /32)
  get priceDivider() {
    return Math.pow(2, this.upgradeLevel);
  }

  get regenTicks() {
    return TOWNHALL_REGEN_TICKS[this.upgradeLevel];
  }

  // Prix de la prochaine amélioration, ou null si niveau max
  get upgradeCost() {
    if (this.upgradeLevel >= TOWNHALL_MAX_LEVEL) return null;
    return TOWNHALL_UPGRADE_COST[this.upgradeLevel];
  }

  tryUpgrade() {
    const cost = this.upgradeCost;

    if (cost === null) return false;
    if (!coins.spend(cost)) return false;

    this.upgradeLevel++;
    this.#maxHp += 100;
    this.#hp += 100; // gagne les PV ajoutés
    this.color = this.levelColor();
    return true;
  }

  // Couleur qui passe progressivement du bleu au vert (vert complet au niveau max)
  levelColor() {
    const from = [18, 98, 218]; // #1262da
    const to = [46, 204, 113]; // #2ecc71
    const t = this.upgradeLevel / TOWNHALL_MAX_LEVEL;

    const c = from.map((v, i) => Math.round(v + (to[i] - v) * t));

    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }

  // Régénération passive
  update() {
    if (this.regenTicks > 0 && this.#hp < this.#maxHp && tick % this.regenTicks === 0) {
      this.#hp++;
    }
  }

  display() {
    const radius = CELL / 2 - 5;

    q5.noFill();
    q5.stroke(this.color);
    q5.strokeWeight(3);
    this.polygon(this.sides, radius);

    if (this.#hp > 0) {
      q5.noStroke();
      q5.fill(this.color);
      this.polygon(this.sides, radius * Math.sqrt(this.#hp / this.#maxHp));
    }

    q5.noStroke();
  }

  damage(amount) {
    this.#hp = Math.max(0, this.#hp - amount);

    if (this.#hp === 0) {
      gameState = "gameover";
    }
  }

  healthbar() {
    q5.fill(232, 18, 90);
    q5.textSize(24);
    q5.textAlign(q5.LEFT, q5.TOP);
    q5.text(`❤️${this.#hp}`, 20, 20);
  }
}

// Tower levels: 1 = triangle jaune,
// 2 = carré rouge (2x vitesse de tir, +50% portée),
// 3 = pentagone rouge (2x vitesse de tir et 2x portée par rapport au niveau 2,
// les balles se dispersent en 3 à l'impact)
class Tower extends Entity {
  constructor(x, y, level = 1) {
    super(x, y, CELL, "#f1c40f");
    this.level = level;
    this.lastShot = 0;
    this.applyStats();
  }

  applyStats() {
    if (this.level === 1) {
      this.range = 200;
      this.fireRate = 60;
      this.color = "#f1c40f";
    } else if (this.level === 2) {
      this.range = 300;
      this.fireRate = 30;
      this.color = "#e74c3c";
    } else {
      // niveau 3 : 2x la portée et 2x la vitesse de tir du niveau 2
      this.range = 600;
      this.fireRate = 15;
      this.color = "#e74c3c";
    }
  }

  upgrade() {
    this.level++;
    this.applyStats();
  }

  display() {
    q5.noFill();
    q5.stroke(this.color);
    q5.strokeWeight(3);

    if (this.level === 1) this.polygon(3, CELL / 2 - 8);
    else if (this.level === 2) this.polygon(4, CELL / 2 - 5);
    else this.polygon(5, CELL / 2 - 5);

    q5.noStroke();
  }
}

class Enemy extends Entity {
  #hp;

  constructor(wave, speedMultiplier = 1, hpMultiplier = 1, damageMultiplier = 1, color = "red") {
    let x, y;
    const side = Math.floor(q5.random(4));

    if (side === 0) {
      x = -CELL;
      y = q5.random(q5.height);
    } else if (side === 1) {
      x = q5.width + CELL;
      y = q5.random(q5.height);
    } else if (side === 2) {
      x = q5.random(q5.width);
      y = -CELL;
    } else {
      x = q5.random(q5.width);
      y = q5.height + CELL;
    }

    super(x, y, CELL, color);
    this.rounded = 50;

    this.speed = Math.min(1 + (wave - 1) * 0.05, 2.5) * speedMultiplier;
    this.#hp = Math.max(1, Math.floor(10 * Math.pow(1.1, wave - 1) * hpMultiplier));
    this.attackDamage = Math.max(1, Math.floor(20 * Math.pow(1.05, wave - 1) * damageMultiplier));
  }

  move() {
    const dx = townhall.x - this.x;
    const dy = townhall.y - this.y;

    const distance = Math.hypot(dx, dy);

    if (distance === 0) return;

    this.x += dx / distance * this.speed;
    this.y += dy / distance * this.speed;
  }

  damage() {
    const distance = Math.hypot(
      townhall.x - this.x,
      townhall.y - this.y
    );

    if (distance < (this.size + townhall.size) / 2) {
      townhall.damage(this.attackDamage);
      return true;
    }

    return false;
  }

  takeDamage(amount) {
    this.#hp -= amount;

    return this.#hp <= 0;
  }
}

class FastEnemy extends Enemy {
  constructor(wave) {
    super(wave, 1.8, 0.5, 0.5, "#f1c40f");
    this.size = CELL - 30;
  }
}

class SlowEnemy extends Enemy {
  constructor(wave) {
    super(wave, 0.6, 3, 2, "#9b59b6");
    this.size = CELL - 5;
  }
}

class Wave {
  constructor() {
    this.number = 1;
    this.toSpawn = 1;
    this.spawnTimer = tick;
    this.waitTimer = 0;
    this.waiting = false;
  }

  update() {
    if (this.toSpawn > 0) {
      if (tick - this.spawnTimer >= 60) {
        let amount = 1;

        if (q5.random() < 0.25) {
          amount = Math.floor(q5.random(3, 6));
        }

        amount = Math.min(amount, this.toSpawn);

        for (let i = 0; i < amount; i++) {
          const type = this.number === 1 ? 0 : q5.random();

          if (type < 0.5) {
            enemies.push(new Enemy(this.number));
          } else if (type < 0.8) {
            enemies.push(new FastEnemy(this.number));
          } else {
            enemies.push(new SlowEnemy(this.number));
          }
        }

        this.toSpawn -= amount;
        this.spawnTimer = tick;
      }
    } else if (enemies.length === 0) {
      if (!this.waiting) {
        this.waiting = true;
        this.waitTimer = tick;
      }

      if (tick - this.waitTimer >= 300) {
        this.number++;

        if (this.number <= 5) {
          this.toSpawn = 1 + (this.number - 1) * 2;
        } else {
          this.toSpawn = Math.ceil(9 * Math.pow(1.2, this.number - 5));
        }

        this.waiting = false;
      }
    }
  }

  display() {
    q5.fill(255);
    q5.textSize(24);
    q5.textAlign(q5.RIGHT, q5.TOP);
    q5.text(`Wave ${this.number}`, q5.width - 20, 20);
  }
}

class Bullet {
  #damage;

  constructor(x, y, target, sourceLevel = 0, canSplit = true, scale = 1, angle = 0) {
    this.x = x;
    this.y = y;

    this.target = target;
    this.homing = !!target;
    this.sourceLevel = sourceLevel;
    this.canSplit = canSplit;

    this.speed = 5;
    this.range = 200;
    this.#damage = 20 * scale;
    this.startX = this.x;
    this.startY = this.y;

    this.size = 10;
    this.color = "yellow";

    if (target) {
      const distance = Math.hypot(target.x - x, target.y - y);

      this.dx = distance > 0 ? (target.x - x) / distance : 0;
      this.dy = distance > 0 ? (target.y - y) / distance : 0;
    } else {
      this.dx = Math.cos(angle);
      this.dy = Math.sin(angle);
    }
  }

  // Si la cible est morte (tuée par une autre balle), vise l'ennemi le plus proche
  retarget() {
    let best = null;
    let bestD = 300;

    for (const e of enemies) {
      const d = Math.hypot(e.x - this.x, e.y - this.y);

      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }

    this.target = best;
  }

  hasLiveTarget() {
    return this.target !== null && enemies.includes(this.target);
  }

  move() {
    if (this.homing && !this.hasLiveTarget()) {
      this.retarget();
    }

    if (this.hasLiveTarget()) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 0) {
        this.dx = dx / distance;
        this.dy = dy / distance;
      }
    }

    this.x += this.dx * this.speed;
    this.y += this.dy * this.speed;
  }

  display() {
    q5.fill(this.color);
    q5.noStroke();
    q5.circle(this.x, this.y, this.size);
  }

  touches(e) {
    return Math.hypot(e.x - this.x, e.y - this.y) < (this.size + e.size) / 2;
  }

  damage() {
    let victim = null;

    if (this.target) {
      if (this.hasLiveTarget() && this.touches(this.target)) {
        victim = this.target;
      }
    } else {
      victim = enemies.find(e => this.touches(e)) ?? null;
    }

    if (!victim) return false;

    const hitX = this.x;
    const hitY = this.y;

    if (victim.takeDamage(this.#damage)) {
      enemies.splice(enemies.indexOf(victim), 1);

      const reward = Math.ceil(20 * Math.pow(1.05, waves.number - 1));

      coins.add(reward);
    }

    if (this.sourceLevel === 3 && this.canSplit) {
      this.splitAt(hitX, hitY, victim);
    }

    return true;
  }

  // À l'impact d'une balle de niveau 3 : 3 petites boules apparaissent.
  // Chaque boule vise un ennemi proche différent (les plus proches du point d'impact).
  // S'il y a moins de 3 ennemis, les boules en trop partent dans le vide.
  splitAt(x, y, victim) {
    const radius = 160;

    const nearby = enemies
      .filter(e => e !== victim)
      .map(e => ({ e, d: Math.hypot(e.x - x, e.y - y) }))
      .filter(o => o.d <= radius)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);

    const start = q5.random(Math.PI * 2);

    for (let i = 0; i < 3; i++) {
      const target = nearby[i] ? nearby[i].e : null;
      const angle = start + (i * 2 * Math.PI) / 3;

      const b = new Bullet(x, y, target, 0, false, 0.5, angle);
      b.range = 200; // assez de portée pour rejoindre les ennemis dans le rayon
      b.color = "#ff9f43";
      b.size = 14;
      b.speed = 4;
      bullet.push(b);
    }

    effects.push({ x, y, age: 0, life: 25 });
  }

  outOfRange() {
    const distance = Math.hypot(
      this.x - this.startX,
      this.y - this.startY
    );

    return distance >= this.range;
  }
}

class Coins {
  #amount = 0;

  get amount() {
    return this.#amount;
  }

  add(value) {
    this.#amount += value;
  }

  spend(value) {
    if (value > this.#amount) return false;

    this.#amount -= value;
    return true;
  }

  display() {
    q5.fill(255, 215, 0);
    q5.textSize(24);
    q5.textAlign(q5.LEFT, q5.TOP);
    q5.text(`🪙${this.#amount}`, 20, 55);
  }
}

q5.keyPressed = function () {
  if (gameState !== "playing") return;

  if ((q5.key === "p" || q5.key === "P") && !paused) {
    manualPause = !manualPause;
    return;
  }

  if ((q5.key === "u" || q5.key === "U") && !paused) {
    townhall.tryUpgrade();
    return;
  }

  if (paused) {
    if (q5.key === "c" || q5.key === "C") {
      if (tutorialStep === "press") {
        tutorialStep = "place";
        gameMode = "construction";
        modeMessageStart = q5.frameCount;
      } else if (tutorialStep === "close") {
        tutorialStep = "done";
        paused = false;
        gameMode = "navigation";
        draggingTower = null;
        modeMessageStart = q5.frameCount;
      }
    }
    return;
  }

  if (q5.key === "c" || q5.key === "C") {
    if (gameMode === "construction") {
      gameMode = "navigation";
      draggingTower = null;
    } else {
      gameMode = "construction";
    }
    modeMessageStart = q5.frameCount;
  }
};

q5.mousePressed = function () {
  if (gameState === "gameover") {
    if (isButtonClicked(q5.height * 0.58)) {
      restartGame();
    }
    return;
  }

  if (gameMode !== "construction") return;

  // Clic sur une tour existante : démarre le glisser pour fusion
  const clicked = towers.find(
    t => Math.hypot(t.x - q5.mouseX, t.y - q5.mouseY) < CELL / 2
  );

  if (clicked) {
    draggingTower = clicked;
    return;
  }

  if (paused && tutorialStep !== "place") return;

  const x = Math.floor(q5.mouseX / CELL) * CELL + CELL / 2;
  const y = Math.floor(q5.mouseY / CELL) * CELL + CELL / 2;

  if (
    q5.mouseX < 0 ||
    q5.mouseX >= q5.width ||
    q5.mouseY < 0 ||
    q5.mouseY >= q5.height
  ) return;

  if (x === townhall.x && y === townhall.y) return;
  if (towers.some(t => t.x === x && t.y === y)) return;

  const price = nextTowerPrice();

  if (coins.spend(price)) {
    towers.push(new Tower(x, y));

    if (towers.length === 2 && !mergeTutorialShown) {
      mergeTutorialShown = true;
      tutorialStep = "merge";
      paused = true;
    } else if (tutorialStep === "place") {
      tutorialStep = "close";
    }
  }
};

q5.mouseReleased = function () {
  if (!draggingTower) return;

  const target = towers.find(
    t =>
      t !== draggingTower &&
      Math.hypot(t.x - q5.mouseX, t.y - q5.mouseY) < CELL / 2
  );

  if (target && target.level === draggingTower.level && target.level < 3) {
    target.upgrade();
    towers.splice(towers.indexOf(draggingTower), 1);

    if (tutorialStep === "merge") {
      tutorialStep = "done";
      paused = false;
    }
  }

  draggingTower = null;
};
