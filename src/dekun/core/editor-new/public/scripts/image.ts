import Editor from './editor'
import State from './state'

const modules = import.meta.glob('./drivers/*.ts', { eager: true }) as {
  [key: string]: {
    default: Driver
  }
}

// The current image.
export default class {
  public static canvas = document.createElement('canvas')
  public static ctx = this.canvas.getContext('2d')

  public static drivers: { [key: string]: Driver } = {
    pixiv: modules['./drivers/pixiv.ts'].default,
    nhentai: modules['./drivers/nhentai.ts'].default
  }

  public static data: null | {
    id: string,
    page: string,

    element: HTMLImageElement,
    transform: ImageTransform

    strokes: Stroke[]
  } = null

  public static timestamp: number = 0

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

    let targetWidth, targetHeight

    if (imageAspect > canvasAspect) {
        targetWidth = Editor.canvas.width
        targetHeight = Editor.canvas.width / imageAspect
    } else {
        targetWidth = Editor.canvas.height * imageAspect
        targetHeight = Editor.canvas.height
    }

    targetWidth *= 0.9
    targetHeight *= 0.9

    return {
      x: (Editor.canvas.width - targetWidth) / 2,
      y: (Editor.canvas.height - targetHeight) / 2,
      width: targetWidth,
      height: targetHeight,
      widthScale: targetWidth / width,
      heightScale: targetHeight / height
    }
  }

  // Switch to the next image.
  public static async next(override?: string): Promise<void> {
    const data = this.data
    const timestamp = performance.now()

    this.data = null
    this.timestamp = performance.now()

    const info = await this.drivers[State.settings.driver].next((override === undefined) ? State.source.real : override, 1)
    const element = document.createElement('img')

    if (info === null) {
      this.data = data
    } else {
      State.updateSource({
        real: info.source,
        display: `${info.id}/${info.page}`
      })

      element.addEventListener('load', () => {
        if (this.timestamp === timestamp) {
          this.data = {
            id: info.id,
            page: info.page,

            element: element,
            transform: this.calculateTransform(element.width, element.height),

            strokes: []
          }
        }
      })
    }
  }
}

// The data structure of a driver.
export interface Driver {
  id: string,
  name: string,

  next: (source: string, attempt: number) => Promise<null | {
    id: string,
    page: string,

    url: string,
    source: string
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
