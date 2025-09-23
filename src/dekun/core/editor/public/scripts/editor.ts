import Control from './control'
import State from './state'
import Image from './image'

let previousAngle: number = 0

// Get the angle the mouse is moving to.
function getAngle(): number {
  const distant = Math.hypot(Control.mouse.imageX - Control.mouse.oldImageX, Control.mouse.imageY - Control.mouse.oldImageY)

  if (distant > 0.1) { 
    let differece = Math.atan2(Control.mouse.imageY - Control.mouse.oldImageY, Control.mouse.imageX - Control.mouse.oldImageX) - previousAngle;

    while (differece < -Math.PI) {
      differece += 2 * Math.PI
    }

    while (differece > Math.PI) {
      differece -= 2 * Math.PI
    }

    previousAngle += differece * 0.25
  }

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

      this.ctx.drawImage(
        Image.data.element,

        (transform.x - this.camera.x) * this.camera.scale,
        (transform.y - this.camera.y) * this.camera.scale,

        transform.width * this.camera.scale,
        transform.height * this.camera.scale
      )

      Image.update()
 
      this.ctx.drawImage(
        Image.canvas,

        (transform.x - this.camera.x) * this.camera.scale,
        (transform.y - this.camera.y) * this.camera.scale,

        transform.width * this.camera.scale,
        transform.height * this.camera.scale
      )

      this.ctx.fillStyle = 'rgba(255,0,0,0.5)'
      this.ctx.strokeStyle = 'rgba(255,0,0,0.5)'

      if (Control.strokeType === 1 && (Control.startX === null && Control.startY === null)) {
        const angle = getAngle() + (Math.PI / 2)
        const width = ((Image.data.transform.width + Image.data.transform.height) * ((Control.strokeSize / 2) * 0.0025)) * Editor.camera.scale

        const startX = Control.mouse.editorX + (width * Math.cos(angle))
        const startY = Control.mouse.editorY + (width * Math.sin(angle))

        const endX = Control.mouse.editorX + (width * Math.cos(angle + Math.PI))
        const endY = Control.mouse.editorY + (width * Math.sin(angle + Math.PI))

        this.ctx.lineCap = 'butt'
        this.ctx.lineWidth = (Control.strokeSize * 0.25) * Editor.camera.scale
        this.ctx.moveTo(startX, startY)
        this.ctx.lineTo(endX, endY)
        this.ctx.stroke()
        this.ctx.beginPath()
      } else if (Control.strokeType === 2 && (Control.startX === null && Control.startY === null)) {
        this.ctx.arc(Control.mouse.editorX, Control.mouse.editorY, ((Image.data.transform.width + Image.data.transform.height) * ((Control.strokeSize / 2) * 0.0025)) * this.camera.scale, 0, 2 * Math.PI)
        this.ctx.fill()
        this.ctx.beginPath() 
      } else if (Control.strokeType === 3) {
        for (const point of Control.strokePoints) {
          this.ctx.arc(((Image.data.transform.x + (point.x * Image.data.transform.widthScale)) - this.camera.x) * this.camera.scale, ((Image.data.transform.y + (point.y * Image.data.transform.heightScale)) - this.camera.y) * this.camera.scale, 5 * State.settings.resolution, 0, 2 * Math.PI)
          this.ctx.fill()
          this.ctx.beginPath() 
        }
      }

      if (Control.saveConfirm > 0) {
        this.ctx.fillStyle = `rgba(255,255,255,${Control.saveConfirm})`
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
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
