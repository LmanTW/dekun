import State from './state'
import Image from './image'

// The editor.
export default class {
  public static canvas = document.getElementById('canvas-main') as HTMLCanvasElement
  public static ctx = this.canvas.getContext('2d')!

  public static camera = {
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
  }

  // Update the editor.
  public static update(_: number): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.imageSmoothingEnabled = false

    if (Image.data !== null) {
      this.ctx.drawImage(
        Image.data.element,

        (Image.data.transform.x - this.camera.x) * this.camera.scale,
        (Image.data.transform.y - this.camera.y) * this.camera.scale,

        Image.data.transform.width * this.camera.scale,
        Image.data.transform.height * this.camera.scale
      )     
    }
  }
}
