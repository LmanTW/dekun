import Control from './control'
import State from './state'
import Image from './image'

let previousX: number = 0
let previousY: number = 0

let targetAngle: number = 0
let previousAngle: number = 0

// Get the angle the mouse is moving to.
function getAngle(deltaTime: number): number {
  const distant = Math.hypot((Control.mouse.imageX * Editor.camera.scale) - previousX, (Control.mouse.imageY * Editor.camera.scale) - previousY)

  if (distant > 25) {
    targetAngle = Math.atan2((Control.mouse.imageY * Editor.camera.scale) - previousY, (Control.mouse.imageX * Editor.camera.scale) - previousX)
   
    previousX += (distant - 25) * Math.cos(targetAngle)
    previousY += (distant - 25) * Math.sin(targetAngle)
  }

  let difference = targetAngle - previousAngle

  while (difference < -Math.PI) {
    difference += 2 * Math.PI
  }

  while (difference > Math.PI) {
    difference -= 2 * Math.PI
  }

  previousAngle += difference * (0.025 * deltaTime)

  return previousAngle
}

// The editor.
export default class Editor {
  public static canvas = document.getElementById('canvas-main') as HTMLCanvasElement
  public static ctx = this.canvas.getContext('2d')!

  public static camera: {
    x: number,
    xSpeed: number,

    y: number,
    ySpeed: number,

    scale: number,
    scaleSpeed: number
  } = {
    x: 0,
    xSpeed: 0,

    y: 0,
    ySpeed: 0,

    scale: 1,
    scaleSpeed: 0
  } 

  // Resize the editor.
  public static resize(): void {
    const bound = this.canvas.getBoundingClientRect()

    this.canvas.width = bound.width * State.settings.resolution
    this.canvas.height = bound.height * State.settings.resolution

    Image.updateTransform()

    if (State.settings.fps !== 0) {
      this.update(0)
    }
  }

  // Reset the editor.
  public static reset(): void {
    this.camera = {
      x: 0,
      xSpeed: 0,

      y: 0,
      ySpeed: 0,

      scale: 1,
      scaleSpeed: 0
    }
  }

  // Update the editor.
  public static update(deltaTime: number): void {
    const oldX = this.camera.x
    const oldY = this.camera.y
    const oldScale = this.camera.scale

    this.camera.scale *= 1 + (this.camera.scaleSpeed * deltaTime)
    this.camera.scale = Math.min(500, this.camera.scale)

    const centerX = oldX + (Control.mouse.editorX / oldScale)
    const centerY = oldY + (Control.mouse.editorY / oldScale)
    const scaleChange = this.camera.scale / oldScale

    this.camera.x = centerX + (oldX - centerX) / scaleChange
    this.camera.y = centerY + (oldY - centerY) / scaleChange
    this.camera.x += ((this.camera.xSpeed * deltaTime) / this.camera.scale) * State.settings.resolution
    this.camera.y += ((this.camera.ySpeed * deltaTime) / this.camera.scale) * State.settings.resolution

    this.camera.xSpeed *= Math.pow(0.99, deltaTime)
    this.camera.ySpeed *= Math.pow(0.99, deltaTime)
    this.camera.scaleSpeed *= Math.pow(0.99, deltaTime)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.imageSmoothingEnabled = false

    if (Image.data !== null) {
      const transform = Image.data.transform

      if (Control.skipConfirm > 0) {
        this.ctx.globalAlpha = 1 - Control.skipConfirm
      }

      this.ctx.drawImage(
        Image.data.element,

        (transform.x - this.camera.x) * this.camera.scale,
        (transform.y - this.camera.y) * this.camera.scale,

        transform.width * this.camera.scale,
        transform.height * this.camera.scale
      )
 
      this.ctx.drawImage(
        Image.canvas,

        (transform.x - this.camera.x) * this.camera.scale,
        (transform.y - this.camera.y) * this.camera.scale,

        transform.width * this.camera.scale,
        transform.height * this.camera.scale
      )

      this.ctx.globalAlpha = 1

      if (!State.settings.randomStrokes) {
        this.ctx.drawImage(
          Image.renderOverlay(),

          (transform.x - this.camera.x) * this.camera.scale,
          (transform.y - this.camera.y) * this.camera.scale,

          transform.width * this.camera.scale,
          transform.height * this.camera.scale
        )

        this.ctx.fillStyle = 'rgba(255,0,0,0.5)'
        this.ctx.strokeStyle = 'rgba(255,0,0,0.5)'

        if ((Control.strokeType === 1 || Control.strokeType === 2) && (Control.startX === null && Control.startY === null)) {
          this.ctx.arc(Control.mouse.editorX, Control.mouse.editorY, ((Image.data.transform.width + Image.data.transform.height) * ((Control.strokeSize / 2) * 0.0025)) * this.camera.scale, 0, 2 * Math.PI)
          this.ctx.fill()
          this.ctx.beginPath()

          if (Control.strokeType === 1) {
            const angle = getAngle(deltaTime) + (Math.PI / 2)
            const width = ((Image.data.transform.width + Image.data.transform.height) * ((Control.strokeSize / 2) * 0.0025)) * Editor.camera.scale
  
            const startX = Control.mouse.editorX + (width * Math.cos(angle))
            const startY = Control.mouse.editorY + (width * Math.sin(angle))

            const endX = Control.mouse.editorX + (width * Math.cos(angle + Math.PI))
            const endY = Control.mouse.editorY + (width * Math.sin(angle + Math.PI))

            this.ctx.lineCap = 'butt'
            this.ctx.lineWidth = 2.5 * State.settings.resolution 
            this.ctx.moveTo(startX, startY)
            this.ctx.lineTo(endX, endY)
            this.ctx.stroke()
            this.ctx.beginPath()
          }
        } else if (Control.strokeType === 3) {
          for (const point of Control.strokePoints) {
            this.ctx.arc(((Image.data.transform.x + (point.x * Image.data.transform.widthScale)) - this.camera.x) * this.camera.scale, ((Image.data.transform.y + (point.y * Image.data.transform.heightScale)) - this.camera.y) * this.camera.scale, 5 * State.settings.resolution, 0, 2 * Math.PI)
            this.ctx.fill()
            this.ctx.beginPath() 
          }
        }
      } 

      if (Control.saveConfirm > 0) {
        this.ctx.fillStyle = `rgba(255,255,255,${Control.saveConfirm})`
        this.ctx.fillRect(
          (transform.x - this.camera.x) * this.camera.scale,
          (transform.y - this.camera.y) * this.camera.scale,

          transform.width * this.camera.scale,
          transform.height * this.camera.scale
        )
      }
    }
  }
}

window.addEventListener('load', () => {
  Editor.resize()
  window.addEventListener('resize', () => Editor.resize())
})

Editor.canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

Editor.canvas.addEventListener('click', () => {
  State.updateLayout({
    help: false,
    settings: false,
    entries: false
  })
})
