import './style.css';
import * as PIXI from 'pixi.js';
import gemSrc from './assets/gem.png';

const app = new PIXI.Application({
  width: 512,
  height: 512,
  antialias: true,
  transparent: true,
  view: document.querySelector('#scene'),
  resolution: window.devicePixelRatio || 1
});

const FIELD_SIZE = 54
const NUMBER_GRID = 8
const GEM_SIZE = 40
const LINE_SIZE = 2

const container = new PIXI.Container();
app.stage.addChild(container);

const containerGrid = new PIXI.Container();
container.addChild(containerGrid);

const containerGem = new PIXI.Container();
containerGem.sortableChildren = true;
container.addChild(containerGem);

const texture = PIXI.Texture.from(gemSrc);

const colors = [0xe62323, 0x8b38d6, 0x253cda, 0x00a267, 0xfffa54, 0x43fff7, 0xff7cdc, 0xff8d00];

const getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
}

// Create a 8x8 grid of gems
for (let i = 0; i < NUMBER_GRID * NUMBER_GRID; i++) {
  let rectangle = new PIXI.Graphics();
  rectangle.lineStyle(LINE_SIZE, 0xc8c9d8, 1);
  rectangle.drawRect(0, 0, FIELD_SIZE, FIELD_SIZE);
  rectangle.endFill();
  rectangle.x = (i % NUMBER_GRID) * FIELD_SIZE;
  rectangle.y = Math.floor(i / NUMBER_GRID) * FIELD_SIZE;
  containerGrid.addChild(rectangle);

  const gem = new PIXI.Sprite(texture);
  gem.width = GEM_SIZE;
  gem.height = GEM_SIZE;
  const numberColor = getRandomNumber(0, colors.length)
  gem.tint = colors[numberColor];
  gem.interactive = true;
  gem.buttonMode = true;
  gem.anchor.set(0.5);
  gem.x = (i % NUMBER_GRID) * FIELD_SIZE + FIELD_SIZE / 2;
  gem.y = Math.floor(i / NUMBER_GRID) * FIELD_SIZE + FIELD_SIZE / 2;
  gem.alpha = 1;
  gem
    .on('pointerdown', onDragStart)
    .on('pointerup', onDragEnd)
    .on('pointermove', onDragMove);
  containerGem.addChild(gem);
}

// Move container to the center
container.x = app.screen.width / 2 - container.width / 2;
container.y = app.screen.height / 2 - container.height / 2;

const getPotentialSwapFields = (currentItem) => {
  const index = currentItem.parent.getChildIndex(currentItem);
  const items = currentItem.parent.children;
  const left = index % NUMBER_GRID ? currentItem.parent.getChildAt(index - 1) : null;
  const right = (index < items.length - 1) && ((index + 1) % NUMBER_GRID) ? currentItem.parent.getChildAt(index + 1) : null;
  const bot = (index + NUMBER_GRID) < (items.length - 1) ? currentItem.parent.getChildAt(index + NUMBER_GRID) : null;
  const top = index - NUMBER_GRID >= 0 ? currentItem.parent.getChildAt(index - NUMBER_GRID) : null;
  return {
    top,
    bot,
    left,
    right,
  }
}

const hitTestRectangle = (r1, r2) => {
  //Define the variables we'll need to calculate
  let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;
  //hit will determine whether there's a collision
  hit = false;
  //Find the center points of each sprite
  r1.centerX = r1.x + r1.width / 2;
  r1.centerY = r1.y + r1.height / 2;
  r2.centerX = r2.x + r2.width / 2;
  r2.centerY = r2.y + r2.height / 2;
  //Find the half-widths and half-heights of each sprite
  r1.halfWidth = r1.width / 2;
  r1.halfHeight = r1.height / 2;
  r2.halfWidth = r2.width / 2;
  r2.halfHeight = r2.height / 2;
  //Calculate the distance vector between the sprites
  vx = r1.centerX - r2.centerX;
  vy = r1.centerY - r2.centerY;
  //Figure out the combined half-widths and half-heights
  combinedHalfWidths = r1.halfWidth + r2.halfWidth;
  combinedHalfHeights = r1.halfHeight + r2.halfHeight;
  //Check for a collision on the x axis
  if (Math.abs(vx) < combinedHalfWidths) {
    //A collision might be occurring. Check for a collision on the y axis
    hit = Math.abs(vy) < combinedHalfHeights;
  } else {
    //There's no collision on the x axisW
    hit = false;
  }
  //`hit` will be either `true` or `false`
  return hit
};

const swapPositions = (currentElem, startPosition) => {
  const currentPosition = currentElem.getBounds();
  const xOffset = startPosition.x - currentElem.x
  const yOffset = startPosition.y - currentElem.y
  let hit = false;
  let hitElement = null;
  Object.entries(currentElem.closestFields).map((item) => {
    if (item[1] && (yOffset !== 0 || xOffset !== 0) && !hit) {
      hit = hitTestRectangle(currentPosition, item[1].getBounds())
      if (hit) {
        hitElement = item[1];
      }
    }
  })
  if (hit && hitElement) {
    currentElem.parent.setChildIndex(currentElem, currentElem.startIndex);
    hitElement.parent.swapChildren(currentElem, hitElement)
    currentElem.x = hitElement.x;
    currentElem.y = hitElement.y;
    hitElement.x = startPosition.x;
    hitElement.y = startPosition.y;
  } else {
    currentElem.x = startPosition.x;
    currentElem.y = startPosition.y;
  }
}

function onDragStart(event) {
  this.data = event.data;
  this.alpha = 0.5;
  this.closestFields = getPotentialSwapFields(this);
  this.dragging = true;
  this.startPosition = {
    x: this.x,
    y: this.y
  }
  this.parent.startWidth = this.parent.width;
  this.parent.startHeight = this.parent.height;
  this.startIndex = this.parent.getChildIndex(this);
  this.zIndex += 100;
}

function onDragEnd() {
  this.alpha = 1;
  this.dragging = false;
  this.zIndex -= 100;
  this.data = null;
  if (this.startPosition) {
    swapPositions(this, this.startPosition)
  }
}

function onDragMove() {
  if (this.dragging) {
    const newPosition = this.data.getLocalPosition(this.parent);
    let xPoint = newPosition.x;
    let yPoint = newPosition.y;
    // not exist movement over borders
    if ((newPosition.x - GEM_SIZE / 2) - LINE_SIZE < 0) {
      xPoint = (GEM_SIZE / 2) - LINE_SIZE;
    }
    if (newPosition.x > this.parent.startWidth - LINE_SIZE * 2) {
      xPoint = this.parent.startWidth - LINE_SIZE * 2;
    }
    if (newPosition.y < GEM_SIZE / 2 - LINE_SIZE) {
      yPoint = GEM_SIZE / 2 - LINE_SIZE;
    }
    if (newPosition.y > this.parent.startHeight - LINE_SIZE * 2) {
      yPoint = this.parent.startHeight- LINE_SIZE * 2;
    }
    this.x = xPoint;
    this.y = yPoint;
  }
}
