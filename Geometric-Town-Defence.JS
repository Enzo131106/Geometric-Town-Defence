const q5 = new Q5();

const CELL = 70;
const towers = [];
const enemies = [];
const bullet = [];
let coins;
let townhall;
let waves;
let grid;

let gameState = "menu";
let gameMode = "navigation";
let modeMessageStart = -120;

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

function displayMenu() {
  q5.background(30);

  q5.fill(255);
  q5.textAlign(q5.CENTER, q5.CENTER);
  q5.textSize(Math.min(50, q5.width * 0.09, q5.height * 0.1));

  q5.text("TOWER DEFENSE", q5.width / 2, q5.height * 0.38);

  drawButton("Jouer", q5.height * 0.62, "#2ecc71");
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
  drawButton("Menu principal", q5.height * 0.74, "#555555");
}

function restartGame() {
  towers.length = 0;
  enemies.length = 0;
  bullet.length = 0;

  townhall = new Townhall();
  coins = new Coins();
  waves = new Wave();

  gameMode = "navigation";
  modeMessageStart = -120;
  gameState = "playing";
}

function displayControls() {
  q5.fill(180);
  q5.textSize(Math.min(16, q5.width * 0.04, q5.height * 0.04));
  q5.textAlign(q5.LEFT, q5.BOTTOM);
  q5.text("C : Construction\nN : Navigation", 20, q5.height - 20);
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
  if (gameState === "menu") {
    displayMenu();
    return;
  }

  if (gameState === "gameover") {
    displayGameOver();
    return;
  }

  q5.background(30);
  q5.image(grid, 0, 0, q5.width, q5.height);

  waves.update();
  waves.display();

  townhall.display();
  townhall.healthbar();
  townhall.shoot();

  for (const t of towers) {
    t.display();
    t.shoot();
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    e.move();

    if (e.damage()) {
      enemies.splice(i, 1);

      if (gameState === "gameover") {
        displayGameOver();
        return;
      }
    } else {
      e.display();
    }
  }

  for (let i = bullet.length - 1; i >= 0; i--) {
    const b = bullet[i];

    b.move();

    if (b.damage() || b.outOfRange()) {
      bullet.splice(i, 1);
    } else {
      b.display();
    }
  }

  coins.display();
  displayControls();
  displayModeMessage();
};

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

  shoot() {
    if (q5.frameCount - this.lastShot < this.fireRate) return;

    for (const e of enemies) {
      const distance = Math.hypot(e.x - this.x, e.y - this.y);

      if (distance <= this.range) {
        bullet.push(new Bullet(this.x, this.y, e));
        this.lastShot = q5.frameCount;
        return;
      }
    }
  }
}

class Townhall extends Entity {
  #hp = 100;

  constructor() {
    super(
      Math.floor(q5.width / 2 / CELL) * CELL + CELL / 2,
      Math.floor(q5.height / 2 / CELL) * CELL + CELL / 2,
      CELL,
      "#1262daff"
    );

    this.range = 200;
    this.fireRate = 60;
    this.lastShot = q5.frameCount;
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

class Tower extends Entity {
  constructor(x, y) {
    super(x, y, CELL, "#da6c12ff");

    this.range = 200;
    this.fireRate = 60;
    this.lastShot = 0;
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
    this.spawnTimer = q5.frameCount;
    this.waitTimer = 0;
    this.waiting = false;
  }

  update() {
    if (this.toSpawn > 0) {
      if (q5.frameCount - this.spawnTimer >= 60) {
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
        this.spawnTimer = q5.frameCount;
      }
    } else if (enemies.length === 0) {
      if (!this.waiting) {
        this.waiting = true;
        this.waitTimer = q5.frameCount;
      }

      if (q5.frameCount - this.waitTimer >= 300) {
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
  #damage = 20;

  constructor(x, y, target) {
    this.x = x;
    this.y = y;

    this.target = target;

    this.speed = 5;
    this.range = 200;
    this.startX = this.x;
    this.startY = this.y;

    this.size = 10;
    this.color = "yellow";

    const distance = Math.hypot(target.x - x, target.y - y);

    this.dx = distance > 0 ? (target.x - x) / distance : 0;
    this.dy = distance > 0 ? (target.y - y) / distance : 0;
  }

  move() {
    if (enemies.includes(this.target)) {
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

  damage() {
    if (!enemies.includes(this.target)) return false;

    const distance = Math.hypot(
      this.target.x - this.x,
      this.target.y - this.y
    );

    if (distance < (this.size + this.target.size) / 2) {
      if (this.target.takeDamage(this.#damage)) {
        enemies.splice(enemies.indexOf(this.target), 1);

        const reward = Math.ceil(20 * Math.pow(1.05, waves.number - 1));

        coins.add(reward);
      }

      return true;
    }

    return false;
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

  if ((q5.key === "c" || q5.key === "C") && gameMode !== "construction") {
    gameMode = "construction";
    modeMessageStart = q5.frameCount;
  }

  if ((q5.key === "n" || q5.key === "N") && gameMode !== "navigation") {
    gameMode = "navigation";
    modeMessageStart = q5.frameCount;
  }
};

q5.mousePressed = function () {
  if (gameState === "menu") {
    if (isButtonClicked(q5.height * 0.62)) {
      restartGame();
    }
    return;
  }

  if (gameState === "gameover") {
    if (isButtonClicked(q5.height * 0.58)) {
      restartGame();
    } else if (isButtonClicked(q5.height * 0.74)) {
      gameState = "menu";
    }
    return;
  }

  if (gameMode !== "construction") return;

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

  const price = Math.ceil(25 * Math.pow(2.27, towers.length));

  if (coins.spend(price)) {
    towers.push(new Tower(x, y));
  }
};
