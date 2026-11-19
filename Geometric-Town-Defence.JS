const q5 = new Q5();

const CELL = 70;
const towers = [];
const enemies = [];
const bullet = [];
let coins;
let townhall;
let waves;
let grid;

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
  for (let x = 0; x <= Grid.width; x += CELL) Grid.line(x, 0, x, Grid.height);
  for (let y = 0; y <= Grid.height; y += CELL) Grid.line(0, y, Grid.width, y);
  return Grid;
}

q5.draw = function () {
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

//=============

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
    this.lastShot = 0;
  }

  damage(amount) {
    this.#hp -= amount;
  }

  healthbar(){
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

  constructor(wave) {
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

    super(x, y, CELL, "red");
    this.rounded = 50;

    this.speed = Math.min(1 + (wave - 1) * 0.05, 2.5);
    this.#hp = Math.floor(10 * Math.pow(1.1, wave - 1));
    this.attackDamage = Math.floor(20 * Math.pow(1.05, wave - 1));
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

//=============

class Wave {
  constructor() {
    this.number = 1;
    this.toSpawn = 1;
    this.spawnTimer = 0;
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
          enemies.push(new Enemy(this.number));
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

//=============

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

//=============

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

//=============

q5.mousePressed = function () {
  const x = Math.floor(q5.mouseX / CELL) * CELL + CELL / 2;
  const y = Math.floor(q5.mouseY / CELL) * CELL + CELL / 2;

  if (x === townhall.x && y === townhall.y) return;
  if (towers.some(t => t.x === x && t.y === y)) return;

  const price = Math.ceil(25 * Math.pow(2.27, towers.length));

  if (coins.spend(price)) {
    towers.push(new Tower(x, y));
  }
};
