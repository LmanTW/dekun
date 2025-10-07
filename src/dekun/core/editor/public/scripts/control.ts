import { Combination } from '../components/Keybinds'
import Editor from './editor'
import State from './state'
import Image from './image'

// The control.
export default class Control {
  public static mouse: {
    button: {
      left: 0 | 1 | 2 | 3,
      middle: 0 | 1 | 2 | 3,
      right: 0 | 1 | 2| 3
    },

    editorX: number,
    editorY: number,
    imageX: number,
    imageY: number,

    trackpad:number,
  } = {
    button: {
      left: 0,
      middle: 0,
      right: 0
    },

    editorX: 0,
    editorY: 0,
    imageX: 0,
    imageY: 0,

    trackpad: 0
  }

  public static keyboard: Map<string, 1 | 2> = new Map()

  static strokeType: 1 | 2 | 3 = 1
  static strokeSize: number = 2
  static strokePoints: { x: number, y: number }[] = []
  static strokeOpacity: number = 1
  static imageFilter: number = 0

  static startX: null | number = null
  static startY: null | number = null
  static moveIndex: null | number = null

  static saveConfirm: number = 0
  static skipConfirm: number = 1

  // Reset the control.
  public static reset(): void {
    this.strokePoints = []

    this.startX = null
    this.startY = null
    this.moveIndex = null

    if (this.keyboard.has('z')) {
      this.saveConfirm = -1
    }

    if (this.keyboard.has('c')) {
      this.skipConfirm = -1
    }
  }

  // Update the control.
  public static update(deltaTime: number): void {
    if (Image.data !== null) {
      Control.mouse.imageX = ((this.mouse.editorX / Editor.camera.scale) + (Editor.camera.x - Image.data.transform.x)) / Image.data.transform.widthScale
      Control.mouse.imageY = ((this.mouse.editorY / Editor.camera.scale) + (Editor.camera.y - Image.data.transform.y)) / Image.data.transform.heightScale

      if (!State.settings.randomStrokes) {
        if (this.mouse.button.left === 1) {
          if (this.strokeType == 1 || this.strokeType === 2) {
            this.startX = this.mouse.imageX
            this.startY = this.mouse.imageY
          } else if (this.strokeType === 3) {
            for (let i = 0; i < this.strokePoints.length; i++) {
              const renderX = ((Image.data.transform.x + (Control.strokePoints[i].x * Image.data.transform.widthScale)) - Editor.camera.x) * Editor.camera.scale
              const renderY = ((Image.data.transform.y + (Control.strokePoints[i].y * Image.data.transform.heightScale)) - Editor.camera.y) * Editor.camera.scale

              if (Math.hypot(renderX - this.mouse.editorX, renderY - this.mouse.editorY) < 7.5 * State.settings.resolution) {
                this.moveIndex = i

                break
              }
            }

            if (this.moveIndex === null) {
              this.strokePoints.push({
                x: this.mouse.imageX,
                y: this.mouse.imageY
              })

              Image.renderBase()
            }
          }
        } else if (this.mouse.button.right === 1) {
          if (this.strokeType === 1 || this.strokeType === 2) {
            const lastStroke = Image.data.strokes[Image.data.strokes.length - 1]

            if (lastStroke !== undefined && lastStroke.type === this.strokeType) {
              this.startX = lastStroke.x2
              this.startY = lastStroke.y2
            }
          } else if (this.strokeType === 3) {
            if (this.strokePoints.length === 0) {
              const lastStroke = Image.data.strokes[Image.data.strokes.length - 1]

              if (lastStroke !== undefined && lastStroke.type === 3) {
                this.strokePoints = (Image.data.strokes.splice(Image.data.strokes.length - 1, 1)[0] as { points: { x: number, y: number }[] }).points 

                Image.renderBase()
              }
            } else {
              if (this.strokePoints.length > 2) {
                Image.data.strokes.push({
                  type: 3,
                  points: this.strokePoints
                })

                Image.renderBase()
              }

              this.strokePoints = []
            }
          }
        } else if (this.mouse.button.left === 2) {
          if (this.moveIndex !== null) {
            this.strokePoints[this.moveIndex] = {
              x: this.mouse.imageX,
              y: this.mouse.imageY
            }
          }
        } else if (this.mouse.button.left === 3 || this.mouse.button.right === 3) {
          if ((this.strokeType === 1 || this.strokeType === 2) && (this.startX !== null && this.startY !== null)) {
            Image.data.strokes.push({
              type: this.strokeType,
              size: this.strokeSize,

              x1: this.startX,
              y1: this.startY,
              x2: this.mouse.imageX,
              y2: this.mouse.imageY
            })

            this.startX = null
            this.startY = null

            Image.renderBase()
          } else if (this.strokeType === 3) {
            this.moveIndex = null
          }
        }
      } 
    }

    Control.strokeSize = Math.min(250 / Editor.camera.scale, Math.max(1 / Editor.camera.scale, Control.strokeSize))

    if (this.keyboard.get('Escape') === 1) {
      this.reset()
    } else if (this.isCombinationClicked(State.keybinds.changeStrokeType1)) {
      this.strokeType = 1
      this.strokePoints = []
    } else if (this.isCombinationClicked(State.keybinds.changeStrokeType2)) {
      this.strokeType = 2
      this.strokePoints = []
    } else if (this.isCombinationClicked(State.keybinds.changeStrokeType3)) {
      this.strokeType = 3
      this.startX = null
      this.startY = null
    }

    if (this.isCombinationClicked(State.keybinds.decreaseStrokeSize)) {
      this.strokeSize -= 1
      this.strokeSize = Math.min(100 / Editor.camera.scale, Math.max(0.5 / Editor.camera.scale, Control.strokeSize))
    } else if (this.isCombinationClicked(State.keybinds.increaseStrokeSize)) {
      this.strokeSize += 1
      this.strokeSize = Math.min(100 / Editor.camera.scale, Math.max(0.5 / Editor.camera.scale, Control.strokeSize)) 
    }

    if (State.settings.trackpad && this.mouse.button.middle === 1) {
      this.strokeSize += 5 / Editor.camera.scale

      if (Control.strokeSize >= 20 / Editor.camera.scale){
        this.strokeSize=5 / Editor.camera.scale
      } 
    }

    if (this.isCombinationPressed(State.keybinds.moveLeft)) Editor.camera.xSpeed = -2.5 * State.settings.moveSpeed
    else if (this.isCombinationPressed(State.keybinds.moveRight)) Editor.camera.xSpeed = 2.5 * State.settings.moveSpeed

    if (this.isCombinationPressed(State.keybinds.moveUp)) Editor.camera.ySpeed = -2.5 * State.settings.moveSpeed
    else if (this.isCombinationPressed(State.keybinds.moveDown)) Editor.camera.ySpeed = 2.5 * State.settings.moveSpeed

    if (this.isCombinationPressed(State.keybinds.zoomOut)) Editor.camera.scaleSpeed = -0.005 * State.settings.scaleSpeed
    else if (this.isCombinationPressed(State.keybinds.zoomIn)) Editor.camera.scaleSpeed = 0.005 * State.settings.scaleSpeed

    if (this.isCombinationClicked(State.keybinds.resetCamera)) {
      Editor.reset()
    } else if (this.isCombinationClicked(State.keybinds.changeStrokeOpacity)) {
      this.strokeOpacity -= 0.5

      if (this.strokeOpacity < 0) {
        this.strokeOpacity = 1
      }

      Image.renderBase()
    } else if (this.isCombinationClicked(State.keybinds.changeImageFilter)) {
      this.imageFilter++

      if (this.imageFilter > 1) {
        this.imageFilter = 0
      }

      Image.renderBase()
    } else if (this.isCombinationClicked(State.keybinds.undoLastAction)) {
      if (this.strokePoints.length > 0) {
        this.strokePoints.splice(this.strokePoints.length - 1)
      } else if (Image.data !== null && Image.data.strokes.length > 0) {
        Image.data.strokes.splice(Image.data.strokes.length - 1)
        Image.renderBase()
      }
    }

    if (Image.data !== null) {
      if (this.isCombinationPressed(State.keybinds.skipImage)) {
        if (this.skipConfirm >= 0) {
          this.skipConfirm += 0.003 * deltaTime

          if (this.skipConfirm > 1) {
            Image.next()

            this.skipConfirm = -1
          }
        }
      } else {
        this.skipConfirm = 0
      }

      if (this.isCombinationPressed(State.keybinds.submitImage)) {
        if (this.saveConfirm >= 0) {
          this.saveConfirm += 0.003 * deltaTime

          if (this.saveConfirm > 1) {
            Image.submit()

            this.saveConfirm = -1
          }
        }
      } else {
        this.saveConfirm = 0
      }
    }

    if (this.mouse.button.left === 1) this.mouse.button.left = 2
    else if (this.mouse.button.left === 3) this.mouse.button.left = 0

    if (this.mouse.button.middle === 1) this.mouse.button.middle = 2
    else if (this.mouse.button.middle === 3) this.mouse.button.middle = 0

    if (this.mouse.button.right === 1) this.mouse.button.right = 2
    else if (this.mouse.button.right === 3) this.mouse.button.right = 0

    this.keyboard.forEach((_, key) => {
      this.keyboard.set(key, 2)
    })
  }

  // Check if a combination is clicked.
  public static isCombinationClicked(combination: Combination): boolean {
    if (combination.modifiers.control !== this.keyboard.has('control')) return false
    if (combination.modifiers.option !== this.keyboard.has('option')) return false
    if (combination.modifiers.meta !== this.keyboard.has('meta')) return false
    if (combination.modifiers.shift !== this.keyboard.has('shift')) return false

    let points: number = 0

    for (const key of combination.keys) {
      if (this.keyboard.has(key)) {
        points += this.keyboard.get(key)!
      } else {
        return false
      } 
    }

    return points < combination.keys.length * 2
  }

  // Check if a combination is pressed.
  public static isCombinationPressed(combination: Combination): boolean {
    if (combination.modifiers.control !== this.keyboard.has('control')) return false
    if (combination.modifiers.option !== this.keyboard.has('option')) return false
    if (combination.modifiers.meta !== this.keyboard.has('meta')) return false
    if (combination.modifiers.shift !== this.keyboard.has('shift')) return false

    for (const key of combination.keys) {
      if (!this.keyboard.has(key)) {
        return false
      }
    }

    return true
  }
}

window.addEventListener('mousedown', (event) => {
  if (event.target === Editor.canvas) {
    if (event.button === 0) Control.mouse.button.left = 1
    else if (event.button === 1) Control.mouse.button.middle = 1
    else if (event.button === 2) Control.mouse.button.right = 1
  }
})

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) Control.mouse.button.left = 3
  else if (event.button === 1) Control.mouse.button.middle = 3
  else if (event.button === 2) Control.mouse.button.right = 3
})

window.addEventListener('mousemove', (event) => {
  Control.mouse.editorX = event.x * State.settings.resolution
  Control.mouse.editorY = event.y * State.settings.resolution
})

window.addEventListener('wheel', (event) => {
  if (event.target === Editor.canvas) {
    if (State.settings.trackpad) {
      if (event.ctrlKey === true){
        if (Math.abs(event.deltaY - Control.mouse.trackpad) > 0.2){
          Editor.camera.scaleSpeed = 0.002 * -event.deltaY
          Control.mouse.trackpad = event.deltaY
        }
      } else {
        Editor.camera.ySpeed = event.deltaY * 0.5
        Editor.camera.xSpeed = event.deltaX * 0.5
      }

      event.preventDefault()
    } else {
      Control.strokeSize += -event.deltaY / (10 * Editor.camera.scale)
    }
  }
}, { passive: false })

window.addEventListener('keydown', (event) => {
  if (event.target === document.body) {
    const key = event.key.toLowerCase()

    if (!Control.keyboard.has(key)) {
      Control.keyboard.set(key, 1)
    }
  }
})

window.addEventListener('keyup', (event) => {
  Control.keyboard.delete(event.key.toLowerCase())
})
