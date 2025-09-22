import Control from './control'
import Editor from './editor'
import State from './state'

const modules = import.meta.glob('./drivers/*.ts', { eager: true }) as {
  [key: string]: {
    default: Driver
  }
}

let loadTask: null | symbol = null

// The current image.
export default class Image {
  public static canvas = document.createElement('canvas')
  public static ctx = this.canvas.getContext('2d')!

  public static drivers: { [key: string]: Driver } = {
    pixiv: modules['./drivers/pixiv.ts'].default,
    nhentai: modules['./drivers/nhentai.ts'].default
  }

  public static data: null | {
    id: string,
    page: string,

    element: HTMLImageElement,
    transform: ImageTransform
    info: string

    strokes: Stroke[]
  } = null

  public static timestamp: number = 0

  // Switch to the next image.
  public static async next(override?: string): Promise<void> {
    const data = this.data
    const timestamp = performance.now()

    this.data = null
    this.timestamp = performance.now()

    loadTask = (loadTask === null)
      ? State.addTask('success', 'Load', (override === undefined) ? State.source.value : override)
      : State.updateTask(loadTask, { type: 'success', message: (override === undefined) ? State.source.value : override })

    try {
      const info = await this.drivers[State.source.driver].next((override === undefined) ? State.source.value : override)

      if (info === null) {
        this.data = data
      } else {
        State.updateSource({
          value: info.source,
          display: `${info.id}/${info.page}`
        })

        const element = document.createElement('img')
        element.src = info.url

        element.addEventListener('load', () => {
          if (this.timestamp === timestamp) {
            this.data = {
              id: info.id,
              page: info.page,

              element: element,
              transform: this.calculateTransform(element.width, element.height),
              info: `${element.width} x ${element.height} (${element.src.substring(element.src.lastIndexOf('.') + 1).toUpperCase()})`,

              strokes: []
            }

            this.canvas.width = element.width
            this.canvas.height = element.height
          }
        })
      }
    } catch (error) {
      this.data = data
    }
  }

  // Update the image.
  public static update(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.imageSmoothingEnabled = false

    if (this.data !== null) {
      this.ctx.fillStyle = 'rgba(0,255,0,0.5)'
      this.ctx.strokeStyle = 'rgba(0,255,0,0.5)'

      if (Control.strokeType === 1 || Control.strokeType === 2) {
        if (Control.startX !== null && Control.startY !== null) {
          this.ctx.lineCap = (Control.strokeType === 1) ? 'butt' : 'round'
          this.ctx.lineWidth = (this.data.element.width + this.data.element.height) * (Control.strokeSize * 0.0025)
          this.ctx.moveTo(Control.startX, Control.startY)
          this.ctx.lineTo(Control.mouse.imageX, Control.mouse.imageY)
          this.ctx.stroke()
          this.ctx.beginPath()
        }
      }
    }
  }

  // Preload the following image.
  public static async preload(): ReturnType<Driver['preload']> {
    return await Image.drivers[State.source.driver].preload(State.settings.preload)
  }

  // Update the transform of the image.
  public static updateTransform(): void {
    if (this.data !== null) {
      this.data.transform = this.calculateTransform(this.data.element.width, this.data.element.height)
    }
  }

  // Calculate the transform of the image.
  public static calculateTransform(width: number, height: number): ImageTransform {
    const canvasAspect = Editor.canvas.width / Editor.canvas.height
    const imageAspect = width / height

    let newWidth, newHeight

    if (imageAspect > canvasAspect) {
        newWidth = Editor.canvas.width
        newHeight = Editor.canvas.width / imageAspect
    } else {
        newWidth = Editor.canvas.height * imageAspect
        newHeight = Editor.canvas.height
    }

    const yOffset = (3.5 * parseFloat(getComputedStyle(document.documentElement).fontSize)) * State.settings.resolution

    newWidth *= 0.9
    newHeight *= 0.9
    newHeight -= yOffset / 2

    return {
      x: (Editor.canvas.width - newWidth) / 2,
      y: (((Editor.canvas.height + yOffset) - newHeight) / 2),
      width: newWidth,
      height: newHeight,
      widthScale: newWidth / width,
      heightScale: newHeight / height
    }
  }
}

// The data structure of a driver.
export interface Driver {
  id: string,
  name: string,

  next: (source: string) => Promise<{
    id: string,
    page: string,

    url: string,
    source: string
  }>,

  preload: (amount: number) => Promise<null | {
    id: string,
    page: string,

    url: string,
    amount: number
  }>
}

// The data structure of a stroke
export type Stroke = {
  type: 1 | 2,
  size: number,

  x1: number,
  y1: number,
  x2: number,
  y2: number
} | {
  type: 3,
  points: { x: number, y: number }[]
}

// The data structure of the image transform.
export interface ImageTransform {
  x: number,
  y: number,
  width: number,
  height: number,
  widthScale: number,
  heightScale: number
}
