import { h } from 'preact'
import Control from './control'
import Editor from './editor'
import State from './state'

const modules = import.meta.glob('./drivers/*.ts', { eager: true }) as {
  [key: string]: {
    default: Driver
  }
}

// The current image.
export default class Image {
  public static baseCanvas = document.createElement('canvas')
  public static baseCtx = this.baseCanvas.getContext('2d')!

  public static overlayCanvas = document.createElement('canvas')
  public static overlayCtx = this.overlayCanvas.getContext('2d')!

  public static submitCanvas = document.createElement('canvas')
  public static submitCtx = this.submitCanvas.getContext('2d')!

  public static drivers: { [key: string]: Driver } = {
    pixiv: modules['./drivers/pixiv.ts'].default,
    nhentai: modules['./drivers/nhentai.ts'].default,
    danbooru: modules['./drivers/danbooru.ts'].default
  }

  public static data: null | {
    provider: string,
    id: string,
    page: number,

    element: HTMLImageElement,
    transform: ImageTransform,

    strokes: Stroke[]
  } = null

  public static timestamp: number = 0

  // Switch to the next image.
  public static async next(override?: { driver: string, id: string, page: string }): Promise<void> {
    State.updateSource({ locked: true })

    const data = this.data
    const timestamp = performance.now()

    this.data = null
    this.timestamp = performance.now()

    try {
      const driver = (override === undefined) ? State.source.driver : override.driver
      const info = await this.drivers[driver].next((override === undefined) ? State.source.value : `${override.id}/${override.page}`)

      if (info === null) {
        this.data = data
      } else {
        State.updateSource({
          value: info.source,
          display: `${info.id}/${info.page}`,
          duplicate: await (await fetch(`/api/check/${driver}/${info.id}/${info.page}`)).json()
        }) 

        const element = document.createElement('img')
        element.src = info.url

        element.addEventListener('load', () => {
          if (this.timestamp === timestamp) {
            this.data = {
              provider: driver,
              id: info.id,
              page: info.page,

              element: element,
              transform: this.calculateTransform(element.width, element.height),

              strokes: []
            }

            this.baseCanvas.width = element.width
            this.baseCanvas.height = element.height
            this.overlayCanvas.width = element.width
            this.overlayCanvas.height = element.height

            if (State.settings.randomStrokes) {
              this.generateRandomStrokes()
            }

            Editor.reset()
            Control.reset()

            this.renderBase()
          }
        })
      }
    } catch (_) {
      this.data = data
    }

    State.updateSource({ locked: false })
  }

  // Submit the current image.
  public static async submit(): Promise<void> {
    if (this.data !== null) {
      const data = this.data

      this.data = null

      Editor.reset()
      Control.reset()

      this.submitCanvas.width = data.element.width
      this.submitCanvas.height = data.element.height

      this.submitCtx.fillStyle = 'white'
      this.submitCtx.strokeStyle = 'white'

      for (const stroke of data.strokes) {
        if (stroke.type === 1 || stroke.type === 2) {
          this.submitCtx.lineCap = (stroke.type === 1) ? 'butt' : 'round'
          this.submitCtx.lineWidth = (data.element.width + data.element.height) * (stroke.size * 0.0025)
          this.submitCtx.moveTo(stroke.x1, stroke.y1)
          this.submitCtx.lineTo(stroke.x2, stroke.y2)
          this.submitCtx.stroke()
          this.submitCtx.beginPath()          
        } else if (stroke.type === 3) {
          for (const [index, point] of stroke.points.entries()) {
            if (index === 0) {
              this.submitCtx.moveTo(point.x, point.y)
            } else {
              this.submitCtx.lineTo(point.x, point.y)
            }
          }

          this.submitCtx.lineTo(stroke.points[0].x, stroke.points[0].y)
          this.submitCtx.fill()
          this.submitCtx.beginPath()
        }
      }

      const maskURL = this.submitCanvas.toDataURL('image/png', 1).substring(22)

      this.submitCtx.clearRect(0, 0, this.submitCanvas.width, this.submitCanvas.height)
      this.submitCtx.imageSmoothingEnabled = false
      this.submitCtx.drawImage(data.element, 0, 0, this.submitCanvas.width, this.submitCanvas.height)

      const imageURL = this.submitCanvas.toDataURL('image/jpeg', 1).substring(23)

      try {
        await fetch('/api/submit', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({
            provider: data.provider,
            id: data.id,
            page: data.page,

            image: imageURL,
            mask: maskURL,

            author: State.settings.username
          })
        })

        await this.next()
      } catch (_) {
        this.data = data
      }
    }
  }

  // Render the base.
  public static renderBase(): HTMLCanvasElement {
    this.baseCtx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height)
    this.baseCtx.imageSmoothingEnabled = false

    if (this.data !== null) {
      if (Control.imageFilter === 1) {
        this.baseCtx.filter = 'invert(100%)'
      }

      this.baseCtx.drawImage(this.data.element, 0, 0, this.baseCanvas.width, this.baseCanvas.height)
      this.baseCtx.filter = 'none'

      if (Control.strokeOpacity > 0) {
        this.baseCtx.fillStyle = `rgba(0,255,0,${Control.strokeOpacity})`
        this.baseCtx.strokeStyle = `rgba(0,255,0,${Control.strokeOpacity})`

        for (const stroke of this.data.strokes) {
          if (stroke.type === 1 || stroke.type === 2) {
            this.baseCtx.lineCap = (stroke.type === 1) ? 'butt' : 'round'
            this.baseCtx.lineWidth = (this.data.element.width + this.data.element.height) * (stroke.size * 0.0025)
            this.baseCtx.moveTo(stroke.x1, stroke.y1)
            this.baseCtx.lineTo(stroke.x2, stroke.y2)
            this.baseCtx.stroke()
            this.baseCtx.beginPath()          
          } else if (stroke.type === 3) {
            for (const [index, point] of stroke.points.entries()) {
              if (index === 0) {
                this.baseCtx.moveTo(point.x, point.y)
              } else {
                this.baseCtx.lineTo(point.x, point.y)
              }
            }

            this.baseCtx.lineTo(stroke.points[0].x, stroke.points[0].y)
            this.baseCtx.fill()
            this.baseCtx.beginPath()
          }
        }
      } 
    }

    return this.baseCanvas
  }

  // Render the overlay.
  public static renderOverlay(): HTMLCanvasElement {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height)
    this.overlayCtx.imageSmoothingEnabled = false

    if (this.data !== null) {
      this.overlayCtx.fillStyle = 'rgba(0,255,0,0.5)'
      this.overlayCtx.strokeStyle = 'rgba(0,255,0,0.5)'

      if (Control.strokeType === 1 || Control.strokeType === 2) {
        if (Control.startX !== null && Control.startY !== null) {
          this.overlayCtx.lineCap = (Control.strokeType === 1) ? 'butt' : 'round'
          this.overlayCtx.lineWidth = (this.data.element.width + this.data.element.height) * (Control.strokeSize * 0.0025)
          this.overlayCtx.moveTo(Control.startX, Control.startY)
          this.overlayCtx.lineTo(Control.mouse.imageX, Control.mouse.imageY)
          this.overlayCtx.stroke()
          this.overlayCtx.beginPath()
        }
      } else if (Control.strokeType === 3) {
        for (const [index, point] of Control.strokePoints.entries()) {
          if (index === 0) {
            this.overlayCtx.moveTo(point.x, point.y)
          } else {
            this.overlayCtx.lineTo(point.x, point.y)
          }
        }

        if (Control.strokePoints.length > 2) {
          this.overlayCtx.lineTo(Control.strokePoints[0].x, Control.strokePoints[0].y)
        }

        this.overlayCtx.fill()
        this.overlayCtx.beginPath()
      }
    }

    return this.overlayCanvas
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

  // Generate random strokes.
  public static generateRandomStrokes(): void {
    if (this.data !== null) {
      this.data.strokes = []

      for (let i = 0; i < 5; i++) {
        const x = Math.random() * this.data.element.width
        const y = Math.random() * this.data.element.height
        const width = Math.max(0.5, Math.random()) * (this.data.element.width / 2)
        const height = Math.max(0.5, Math.random()) * (this.data.element.height / 2)

        this.data.strokes.push({
          type: 3,
          points: [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + height },
            { x: x, y: y + height }
          ]
        })
      }

      for (let i = 0; i < 20; i++) {
        this.data.strokes.push({
          type: (Math.random() > 0.5) ? 2 : 1,
          size: Math.max(0.5, Math.random()) * ((this.data.element.width + this.data.element.height) / 250),

          x1: Math.random() * this.data.element.width,
          y1: Math.random() * this.data.element.height,
          x2: Math.random() * this.data.element.width,
          y2: Math.random() * this.data.element.height
        })
      }

      for (let i = 0; i < 5; i++) {
        const startX = Math.random() * this.data.element.width
        const startY = Math.random() * this.data.element.height

        this.data.strokes.push({
          type: 2,
          size: Math.max(0.5, Math.random()) * ((this.data.element.width + this.data.element.height) / 100),

          x1: startX,
          y1: startY,
          x2: startX,
          y2: startY
        })
      }
    }
  }
}

// The data structure of a driver.
export interface Driver {
  id: string,
  name: string,

  next: (source: string) => Promise<{
    id: string,
    page: number,

    url: string,
    source: string
  }>,

  preload: (amount: number) => Promise<null | {
    id: string,
    page: number,

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
