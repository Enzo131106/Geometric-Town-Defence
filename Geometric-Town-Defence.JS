const q5 = new Q5();

let townhall;
let towers = [];

q5.setup = function () {
  q5.createCanvas(q5.windowWidth, q5.windowHeight);
  townhall = new Townhall();
};

q5.draw = function () {
  q5.background(30, 30, 30);
  townhall.display();
  for (let t of towers) t.display();
};

class Townhall {
  #hp;

  constructor() {
    this.x = q5.width / 2;
    this.y = q5.height / 2;
    this.size = 50;
    this.rounded = 10;
    this.color = "#1262daff";
    this.#hp = 100;
  }

  display() {
    q5.rectMode(q5.CENTER);             //pour que x, y désignent le centre du carré
    q5.noStroke();                      //enlever contour noir
    q5.fill(this.color); 
    q5.square(this.x, this.y, this.size, this.rounded);
  }

  healthpoint() {
    q5.fill("#00a516ff");

  }
}


class Tower {

  constructor() {
    this.x = q5.mouseX;
    this.y = q5.mouseY;
    this.size = 40;
    this.rounded = 10;
    this.color = "#da6c12ff";
  }

  display() {
    q5.noStroke();                      //enlever contour noir
    q5.fill(this.color); 
    q5.square(this.x, this.y, this.size, this.rounded);
  }
}

q5.mousePressed = function () {
  towers.push(new Tower(q5.mouseX, q5.mouseY));
}