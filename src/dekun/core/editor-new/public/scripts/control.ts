import Editor from './editor'
import State from './state'
import Image from './image'

// The control.
export default class Control {
  public static mouse: {
    button: {
      left: 0 | 1 | 2 | 3,
      right: 0 | 1 | 2| 3
    }

    editorX: number,
    editorY: number,

    imageX: number,
    imageY: number
  } = {
    button: {
      left: 0,
      right: 0
    },

    editorX: 0,
    editorY: 0,

    imageX: 0,
    imageY: 0
  }

  public static keyboard: Map<string, 1 | 2> = new Map()

  static strokeType: 1 | 2 | 3 = 1
  static strokeSize: number = 2
  static strokePoints: { x: number, y: number }[] = []

  static startX: null | number = null
  static startY: null | number = null
  static moveIndex: null | number = null

  static strokeOpacity: number = 1
  static saveConfirm: number = 0

  // Update the control.
  public static update(_: number): void {
    if (Image.data !== null) {
      Control.mouse.imageX = ((Control.mouse.editorX / Editor.camera.scale) + (Editor.camera.x - Image.data.transform.x)) / Image.data.transform.widthScale
      Control.mouse.imageY = ((Control.mouse.editorY / Editor.camera.scale) + (Editor.camera.y - Image.data.transform.y)) / Image.data.transform.heightScale

      if (this.mouse.button.left === 1 && (this.strokeType == 1 || this.strokeType === 2)) {
        this.startX = this.mouse.imageX
        this.startY = this.mouse.imageY
      } else if (this.mouse.button.left === 3 && (Control.strokeType === 1 || Control.strokeType === 2) && (Control.startX !== null && Control.startY !== null)) {
        Image.data.strokes.push({
          type: Control.strokeType,
          size: Control.strokeSize,

          x1: Control.startX,
          y1: Control.startY,
          x2: Control.mouse.imageX,
          y2: Control.mouse.imageY
        })

        Control.startX = null
        Control.startY = null
      }
    }

    if (this.keyboard.get('1') === 1) {
      this.strokeType = 1
      this.strokePoints = []
    } else if (this.keyboard.get('2') === 1) {
      this.strokeType = 2
      this.strokePoints = []
    } else if (this.keyboard.get('3') === 1) {
      this.strokeType = 3
      this.startX = null
      this.startY = null
    }

    if (this.keyboard.get('-')) {
      Control.strokeSize -= 1
      Control.strokeSize = Math.min(100 / Editor.camera.scale, Math.max(0.5 / Editor.camera.scale, Control.strokeSize))
    } else if (this.keyboard.get('+')) {
      Control.strokeSize += 1
      Control.strokeSize = Math.min(100 / Editor.camera.scale, Math.max(0.5 / Editor.camera.scale, Control.strokeSize)) 
    }

    if (this.keyboard.has('a')) {
      Editor.camera.xSpeed = -3 * State.settings.moveSpeed
    } else if (this.keyboard.has('d')) {
      Editor.camera.xSpeed = 3 * State.settings.moveSpeed
    }

    if (this.keyboard.has('w')) {
      Editor.camera.ySpeed = -3 * State.settings.moveSpeed
    } else if (this.keyboard.has('s')) {
      Editor.camera.ySpeed = 3 * State.settings.moveSpeed
    }

    if (this.keyboard.has('q')){
      Editor.camera.scaleSpeed = -0.005 * State.settings.scaleSpeed
    } else if (this.keyboard.has('e')) {
      Editor.camera.scaleSpeed = 0.005 * State.settings.scaleSpeed
    }

    if (this.keyboard.get('r') === 1) {
      Editor.reset()
    } else if (this.keyboard.get('f') === 1) {
      this.strokeOpacity -= 0.5

      if (this.strokeOpacity < 0) {
        this.strokeOpacity = 1
      }
    }

    if (this.keyboard.get('z') === 1) {
      Image.next()
    } else if (this.keyboard.get('x') === 1) {
      if (this.strokePoints.length > 0) {
        this.strokePoints.splice(this.strokePoints.length - 1)
      } else if (Image.data !== null && Image.data.strokes.length > 0) {
        Image.data.strokes.splice(Image.data.strokes.length - 1)
      } 
    } else if (this.keyboard.get('c') === 1) {

    }

    if (this.mouse.button.left === 1) {
      this.mouse.button.left = 2
    } else if (this.mouse.button.left === 3) {
      this.mouse.button.left = 0
    }
    
    if (this.mouse.button.right === 1) {
      this.mouse.button.right = 2
    } else if (this.mouse.button.right === 3) {
      this.mouse.button.right = 0
    }

    this.keyboard.forEach((_, key) => {
      this.keyboard.set(key, 2)
    })
  }
}

window.addEventListener('mousedown', (event) => {
  if (event.button === 0) {
    Control.mouse.button.left = 1
  } else if (event.button === 2) {
    Control.mouse.button.right = 1
  }
})

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    Control.mouse.button.left = 3
  } else if (event.button === 2) {
    Control.mouse.button.right = 3
  }
})

window.addEventListener('mousemove', (event) => {
  Control.mouse.editorX = event.x * State.settings.resolution 
  Control.mouse.editorY = event.y * State.settings.resolution

  if (Image.data !== null) {
    Control.mouse.imageX = ((Control.mouse.editorX / Editor.camera.scale) + (Editor.camera.x - Image.data.transform.x)) / Image.data.transform.widthScale
    Control.mouse.imageY = ((Control.mouse.editorY / Editor.camera.scale) + (Editor.camera.y - Image.data.transform.y)) / Image.data.transform.heightScale
  }
})

window.addEventListener('keydown', (event) => {
  if (event.target === document.body) {
    if (!Control.keyboard.has(event.key)) {
      Control.keyboard.set(event.key, 1)
    }
  }
})

window.addEventListener('keyup', (event) => {
  Control.keyboard.delete(event.key)
})
