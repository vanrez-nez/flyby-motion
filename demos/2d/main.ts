import * as PIXI from 'pixi.js'

const app = new PIXI.Application()
await app.init({
  width: 800,
  height: 600,
  backgroundColor: 0x1a1a2e,
  resizeTo: window,
})

document.querySelector('#app').appendChild(app.canvas)

const circle = new PIXI.Graphics().circle(0, 0, 64).fill(0xe94560)
circle.x = app.screen.width / 2
circle.y = app.screen.height / 2
app.stage.addChild(circle)

let vx = 4
let vy = 3
app.ticker.add(() => {
  circle.x += vx
  circle.y += vy
  if (circle.x > app.screen.width - 64 || circle.x < 64) vx *= -1
  if (circle.y > app.screen.height - 64 || circle.y < 64) vy *= -1
})
