import Control from './control'
import State from './state'
import Image from './image'

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
    } else {

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
    settings: false
  })
})
