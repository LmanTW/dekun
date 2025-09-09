const container_settings = document.getElementById('container-settings')
const container_entries = document.getElementById('container-entries')
const input_resolution = document.getElementById('input-resolution')
const select_provider = document.getElementById('select-provider')
const button_settings = document.getElementById('button-settings')
const text_resolution = document.getElementById('text-resolution')
const container_help = document.getElementById('container-help')
const container_all = document.getElementById('container-all')
const button_reload = document.getElementById('button-reload')
const input_source = document.getElementById('input-source')
const button_help = document.getElementById('button-help')
const input_speed = document.getElementById('input-speed')
const button_all = document.getElementById('button-all')
const text_speed = document.getElementById('text-speed')
const text_total = document.getElementById('text-total')

const settings = {
  resolution: parseFloat(input_resolution.value),
  controlSpeed: parseFloat(input_speed.value)
}

text_resolution.textContent = input_resolution.value
text_speed.textContent = input_speed.value

const drivers = {
  pixiv: (await import('./drivers/pixiv.js')).default,
  nHentai: (await import('./drivers/nHentai.js')).default
}

let source = ''

select_provider.addEventListener('change', () => {
  if (Image.element !== null) {
    Image.next()
  }
})

input_source.addEventListener('change', () => {
  if (Image.element !== null) {
    source = input_source.value

    Image.next()
  }
})

// The current image.
class Image {
  static canvas = document.createElement('canvas')
  static ctx = this.canvas.getContext('2d')

  static name = null
  static element = null
  static transform = null
  static strokes = []

  // Resize the image.
  static resize() {
    if (this.element === null) {
      this.transform = null

      return
    }

    const canvasAspect = Editor.canvas.width / Editor.canvas.height
    const imageAspect = this.element.width / this.element.height

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

    this.transform = {
      x: (Editor.canvas.width - targetWidth) / 2,
      y: (Editor.canvas.height - targetHeight) / 2,
      width: targetWidth,
      height: targetHeight,
      widthScale: targetWidth / this.element.width,
      heightScale: targetHeight / this.element.height
    }
  }

  // Switch to the next image.
  static async next() {
    Editor.reset()
    Control.reset()

    this.name = null
    this.element = null
    this.transform = null
    this.strokes = []

    const info = await drivers[select_provider.value].next(source)
    const element = document.createElement('img')

    this.name = info.name

    source = info.value
    input_source.value = info.display

    element.src = info.url
    element.crossOrigin = 'anonymous'

    element.addEventListener('load', () => {
      this.element = element

      this.resize()
    })
  }

  // Submit the image.
  static async submit() {
    Editor.reset()
    Control.reset()

    const name = this.name
    const element = this.element
    const strokes = this.strokes

    this.name = null
    this.element = null
    this.transform = null
    this.strokes = []

    this.canvas.width = element.width
    this.canvas.height = element.height

    this.ctx.drawImage(element, 0, 0)

    const image = this.canvas.toDataURL('image/jpeg', 1).substring(23)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.fillStyle = 'rgb(255,255,255)'
    this.ctx.strokeStyle = 'rgb(255,255,255)'

    for (const stroke of strokes) {
      if (stroke.type === 1 || stroke.type === 2) {
        this.ctx.lineCap = (stroke.type === 1) ? 'butt' : 'round'
        this.ctx.lineWidth = (element.width + element.height) * (stroke.size * 0.0025)
        this.ctx.moveTo(stroke.x1, stroke.y1)
        this.ctx.lineTo(stroke.x2, stroke.y2)
        this.ctx.stroke()
        this.ctx.beginPath()
      } else if (stroke.type === 3) {
        for (let i = 0; i < stroke.points.length; i++) {
          if (i === 0) {
            this.ctx.moveTo(stroke.points[i].x, stroke.points[i].y)
          } else {
            this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
          }
        }

        this.ctx.lineTo(stroke.points[0].x, stroke.points[0].y)
        this.ctx.fill()
        this.ctx.beginPath()
      }
    }

    const mask = this.canvas.toDataURL('image/png', 1).substring(22)

    await fetch(`/submit?name=${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mask }),
    })

    await this.next()
  }
}

// The editor.
class Editor {
  static canvas = document.getElementById('canvas-main')
  static ctx = this.canvas.getContext('2d')

  static xOffset = 0
  static yOffset = 0

  static camera = {
    x: 0,
    y: 0,
    scale: 1,

    xSpeed: 0,
    ySpeed: 0,
    scaleSpeed: 0
  }

  // Resize the editor.
  static resize() {
    const bound = this.canvas.getBoundingClientRect()

    this.canvas.width = bound.width * settings.resolution
    this.canvas.height = bound.height * settings.resolution

    this.xOffset = bound.left
    this.yOffset = bound.top

    Image.resize()
  }

  // Reset the editor.
  static reset() {
    this.camera = {
      x: 0,
      y: 0,
      scale: 1,

      xSpeed: 0,
      ySpeed: 0,
      scaleSpeed: 0
    }
  }

  // Render the editor
  static render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (Image.element !== null && Image.transform !== null) {
      this.ctx.imageSmoothingEnabled = false

      this.ctx.drawImage(
        Image.element,

        (Image.transform.x - this.camera.x) * this.camera.scale,
        (Image.transform.y - this.camera.y) * this.camera.scale,

        Image.transform.width * this.camera.scale,
        Image.transform.height * this.camera.scale
      )
    }

    if (Image.transform !== null) {
      this.ctx.fillStyle = 'rgb(0,255,0)'
      this.ctx.strokeStyle = 'rgb(0,255,0)'

      for (const stroke of Image.strokes) {
        if (stroke.type === 1 || stroke.type === 2) {
          this.ctx.lineCap = (stroke.type === 1) ? 'butt' : 'round'
          this.ctx.lineWidth = ((Image.transform.width + Image.transform.height) * (stroke.size * 0.0025)) * Editor.camera.scale
          this.ctx.moveTo(((Image.transform.x + (stroke.x1 * Image.transform.widthScale)) - this.camera.x) * this.camera.scale, ((Image.transform.y + (stroke.y1 * Image.transform.heightScale)) - this.camera.y) * this.camera.scale)
          this.ctx.lineTo(((Image.transform.x + (stroke.x2 * Image.transform.widthScale)) - this.camera.x) * this.camera.scale, ((Image.transform.y + (stroke.y2 * Image.transform.heightScale)) - this.camera.y) * this.camera.scale)
          this.ctx.stroke()
          this.ctx.beginPath()
        } else if (stroke.type === 3) {
          for (let i = 0; i < stroke.points.length; i++) {
            const renderX = ((Image.transform.x + (stroke.points[i].x * Image.transform.widthScale)) - this.camera.x) * this.camera.scale
            const renderY = ((Image.transform.y + (stroke.points[i].y * Image.transform.heightScale)) - this.camera.y) * this.camera.scale

            if (i === 0) {
              this.ctx.moveTo(renderX, renderY)
            } else {
              this.ctx.lineTo(renderX, renderY)
            }
          }

          const renderX = ((Image.transform.x + (stroke.points[0].x * Image.transform.widthScale)) - this.camera.x) * this.camera.scale
          const renderY = ((Image.transform.y + (stroke.points[0].y * Image.transform.heightScale)) - this.camera.y) * this.camera.scale

          this.ctx.lineTo(renderX, renderY)
          this.ctx.fill()
          this.ctx.beginPath()
        }
      }

      this.ctx.fillStyle = 'rgba(0,255,0,0.5)'
      this.ctx.strokeStyle = 'rgba(0,255,0,0.5)'

      if (Control.strokeType === 1 || Control.strokeType === 2) {
        if (Control.startX === null || Control.startY === null) {
          this.ctx.fillStyle = 'rgba(255,0,0,0.5)'
          this.ctx.arc(Control.mouse.editorX, Control.mouse.editorY, ((Image.transform.width + Image.transform.height) * ((Control.strokeSize / 2) * 0.0025)) * Editor.camera.scale, 0, 2 * Math.PI);
          this.ctx.fill()
          this.ctx.beginPath() 
        } else {
          this.ctx.lineCap = (Control.strokeType === 1) ? 'butt' : 'round'
          this.ctx.lineWidth = ((Image.transform.width + Image.transform.height) * (Control.strokeSize * 0.0025)) * Editor.camera.scale
          this.ctx.moveTo(((Image.transform.x + (Control.startX * Image.transform.widthScale)) - this.camera.x) * this.camera.scale, ((Image.transform.y + (Control.startY * Image.transform.heightScale)) - this.camera.y) * this.camera.scale)
          this.ctx.lineTo(Control.mouse.editorX, Control.mouse.editorY)
          this.ctx.stroke()
          this.ctx.beginPath()
        }
      } else {
        for (let i = 0; i < Control.strokePoints.length; i++) {
          const renderX = ((Image.transform.x + (Control.strokePoints[i].x * Image.transform.widthScale)) - this.camera.x) * this.camera.scale
          const renderY = ((Image.transform.y + (Control.strokePoints[i].y * Image.transform.heightScale)) - this.camera.y) * this.camera.scale

          if (i === 0) {
            this.ctx.moveTo(renderX, renderY)
          } else {
            this.ctx.lineTo(renderX, renderY)
          }
        }

        if (Control.strokePoints.length > 1) {
          const renderX = ((Image.transform.x + (Control.strokePoints[0].x * Image.transform.widthScale)) - this.camera.x) * this.camera.scale
          const renderY = ((Image.transform.y + (Control.strokePoints[0].y * Image.transform.heightScale)) - this.camera.y) * this.camera.scale

          this.ctx.lineTo(renderX, renderY)
        }

        this.ctx.fill()
        this.ctx.beginPath()

        for (const point of Control.strokePoints) {
          this.ctx.fillStyle = 'rgba(255,0,0,0.5)'
          this.ctx.arc(((Image.transform.x + (point.x * Image.transform.widthScale)) - this.camera.x) * this.camera.scale, ((Image.transform.y + (point.y * Image.transform.heightScale)) - this.camera.y) * this.camera.scale, 7.5, 0, 2 * Math.PI);
          this.ctx.fill()
          this.ctx.beginPath()
        }
      }

      this.ctx.fillStyle = `rgba(255,255,255,${Control.saveConfirm})`
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    requestAnimationFrame(() => this.render())
  }

  // Apply camera transform.
  static applyCameraTransform(x, y) {
    return {
      x: (x - this.camera.x) * this.camera.scale,
      y: (y - this.camera.y) * this.camera.scale
    }
  }
}

Editor.resize()
window.addEventListener('resize', () => Editor.resize())

// The controller.
class Control {
  static mouse = {
    clicked: false,
    pressed: false,

    editorX: 0,
    editorY: 0,

    imageX: 0,
    imageY: 0
  }

  static keyboard = {}

  static strokeType = 1
  static strokeSize = 2
  static strokePoints = []

  static startX = null
  static startY = null
  static moveIndex = null

  static saveConfirm = 0

  // Reset the control.
  static reset() {
    Control.strokePoints = []
    Control.startX = null
    Control.startY = null
    Control.moveIndex = null
  }

  // Update the control.
  static update() {
    if (this.keyboard['a']) {
      Editor.camera.xSpeed = -50 * settings.controlSpeed
    } else if (this.keyboard['d']) {
      Editor.camera.xSpeed = 50 * settings.controlSpeed
    }

    if (this.keyboard['w']) {
      Editor.camera.ySpeed = -50 * settings.controlSpeed
    } else if (this.keyboard['s']) {
      Editor.camera.ySpeed = 50 * settings.controlSpeed
    }

    if (this.keyboard['q']) {
      Editor.camera.scaleSpeed = -0.05 * settings.controlSpeed
    } else if (this.keyboard['e']) {
      Editor.camera.scaleSpeed = 0.05 * settings.controlSpeed
    }

    const oldX = Editor.camera.x;
    const oldY = Editor.camera.y;
    const oldScale = Editor.camera.scale;

    Editor.camera.scale *= 1 + Editor.camera.scaleSpeed

    const centerX = oldX + (Control.mouse.editorX / oldScale)
    const centerY = oldY + (Control.mouse.editorY / oldScale)
    const scaleChange = Editor.camera.scale / oldScale

    Editor.camera.x = centerX + (oldX - centerX) / scaleChange
    Editor.camera.y = centerY + (oldY - centerY) / scaleChange
    Editor.camera.x += Editor.camera.xSpeed / Editor.camera.scale
    Editor.camera.y += Editor.camera.ySpeed / Editor.camera.scale

    Editor.camera.xSpeed *= 0.8
    Editor.camera.ySpeed *= 0.8
    Editor.camera.scaleSpeed *= 0.8

    if (Image.transform !== null) {
      Control.mouse.imageX = ((Control.mouse.editorX / Editor.camera.scale) + (Editor.camera.x - Image.transform.x)) / Image.transform.widthScale
      Control.mouse.imageY = ((Control.mouse.editorY / Editor.camera.scale) + (Editor.camera.y - Image.transform.y)) / Image.transform.heightScale

      if (Control.moveIndex !== null) {
        Control.strokePoints[Control.moveIndex] = {
          x: Control.mouse.imageX,
          y: Control.mouse.imageY
        }
      }
    }

    if (this.keyboard['Escape'] === 1) {
      this.reset()
    } else if (this.keyboard['1'] === 1) {
      this.strokeType = 1
      this.strokePoints = []
    } else if (this.keyboard['2'] === 1) {
      this.strokeType = 2
      this.strokePoints = []
    } else if (this.keyboard['3'] === 1) {
      this.strokeType = 3
      this.startX = null
      this.startY = null
    } else if (this.keyboard['-'] === 1) {
      Control.strokeSize -= 1
      Control.strokeSize = Math.min(100 / Editor.camera.scale, Math.max(0.5 / Editor.camera.scale, Control.strokeSize))
    } else if (this.keyboard['='] === 1) {
      Control.strokeSize += 1
      Control.strokeSize = Math.min(100 / Editor.camera.scale, Math.max(0.5 / Editor.camera.scale, Control.strokeSize))
    } else if (this.keyboard['r'] === 1) {
      Editor.reset()
    } else if (this.keyboard['z'] === 1) {
      if (Image.element !== null) {
        Image.next()
      }
    } else if (this.keyboard['x'] === 1) {
      if (this.strokePoints.length > 0) {
        this.strokePoints.splice(this.strokePoints.length - 1)
      } else if (Image.strokes.length > 0) {
        Image.strokes.splice(Image.strokes.length - 1)
      }
    }

    if (Image.element !== null) {
      if (this.keyboard['c']) {
        this.saveConfirm += 0.05

        if (this.saveConfirm > 1 && Image.element !== null) {
          Image.submit()

          this.saveConfirm = 0
        }
      } else if (this.saveConfirm > 0) {
        this.saveConfirm -= 0.025
      }
    }

    if (this.mouse.clicked && Control.strokeType === 3) {
      for (let i = 0; i < Control.strokePoints.length; i++) {
        const renderX = ((Image.transform.x + (Control.strokePoints[i].x * Image.transform.widthScale)) - Editor.camera.x) * Editor.camera.scale
        const renderY = ((Image.transform.y + (Control.strokePoints[i].y * Image.transform.heightScale)) - Editor.camera.y) * Editor.camera.scale

        if (Math.hypot(renderX - this.mouse.editorX, renderY - this.mouse.editorY) < 7.5) {
          this.moveIndex = i

          return 
        }
      }

      Control.strokePoints.push({
        x: this.mouse.imageX,
        y: this.mouse.imageY
      })
    }

    for (const key of Object.keys(this.keyboard)) {
      this.keyboard[key] = 2
    }

    this.mouse.clicked = false
  }
}

window.addEventListener('mousemove', (event) => {
  Control.mouse.editorX = (event.x - Editor.xOffset) * settings.resolution 
  Control.mouse.editorY = (event.y - Editor.yOffset) * settings.resolution

  if (Image.transform !== null) {
    Control.mouse.imageX = ((Control.mouse.editorX / Editor.camera.scale) + (Editor.camera.x - Image.transform.x)) / Image.transform.widthScale
    Control.mouse.imageY = ((Control.mouse.editorY / Editor.camera.scale) + (Editor.camera.y - Image.transform.y)) / Image.transform.heightScale

    if (Control.moveIndex !== null) {
      Control.strokePoints[Control.moveIndex] = {
        x: Control.mouse.imageX,
        y: Control.mouse.imageY
      }
    }
  }
})

window.addEventListener('mousedown', (event) => {
  if (event.target === Editor.canvas) {
    if (event.buttons === 1) {
      Control.mouse.clicked = true
      Control.mouse.pressed = true

      if (Control.strokeType === 1 || Control.strokeType === 2) {
        Control.startX = Control.mouse.imageX
        Control.startY = Control.mouse.imageY
      }
    } else if (event.buttons === 2) {
      event.preventDefault()

      if (Control.strokeType === 1 || Control.strokeType === 2) {
        const lastStroke = Image.strokes[Image.strokes.length - 1]

        if (lastStroke !== undefined && lastStroke.type === Control.strokeType) {
          Control.startX = lastStroke.x2
          Control.startY = lastStroke.y2
        }
      } else if (Control.strokePoints.length > 0) {
        if (Control.strokePoints.length > 2) {
          Image.strokes.push({
            type: 3,
            points: Control.strokePoints
          })
        }

        Control.strokePoints = []
      }
    }
  }
})

window.addEventListener('mouseup', () => {
  if (event.target === Editor.canvas) {
    Control.mouse.clicked = false
    Control.mouse.pressed = false

    if (Image.element !== null && (Control.strokeType === 1 || Control.strokeType === 2) && (Control.startX !== null && Control.startY !== null)) {
      Image.strokes.push({
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

    Control.moveIndex = null
  }
})

window.addEventListener('wheel', (event) => {
  if (event.target === Editor.canvas) {
    Control.strokeSize += -event.deltaY / (10 * Editor.camera.scale)
    Control.strokeSize = Math.min(100 / Editor.camera.scale, Math.max(0.5 / Editor.camera.scale, Control.strokeSize))
  }
})

window.addEventListener('keydown', (event) => {
  if (event.target === document.body) {
    if (Control.keyboard[event.key] === undefined) {
      Control.keyboard[event.key] = 1
    }
  }
})

window.addEventListener('keyup', (event) => {
  if (event.target === document.body) {
    delete Control.keyboard[event.key]
  }
})

Image.next()
Editor.render()

setInterval(() => Control.update(), 1000 / 60)

// Create an element.
function createElement(tagName, attributes, children) {
  const element = document.createElement(tagName)

  if (attributes !== undefined) {
    for (const name of Object.keys(attributes)) {
      if (name !== 'textContent' && name !== 'innerHTML' && attributes[name] !== false) {
        element.setAttribute(name, attributes[name].toString())
      }
    }

    if (attributes.textContent !== undefined) element.textContent = attributes.textContent.toString()
    if (attributes.innerHTML !== undefined) element.innerHTML = attributes.innerHTML.toString()
  }

  if (children !== undefined) {
    for (const child of children) {
      if (child instanceof Element) element.appendChild(child)
    }
  }

  return element
}

let entries = null
let index = 0
let loading = 0

// Load more images.
function loadImages(amount) {
  for (let i = 0; i < amount && index < entries.length; i++) {
    const name = entries[index]

    const element = container_entries.appendChild(createElement('div', { style: 'position: relative; width: min(50dvw, 25rem); margin-top: var(--spacing-medium)' }, [
      createElement('img', { id: 'image-image', src: `/image/${name}`, style: 'content-visibility: auto; width: 100%' }),
      createElement('img', { id: 'image-mask', src: `/mask/${name}`, style: 'position: absolute; content-visibility: auto; left: 0rem; top: 0rem; width: 100%; filter: invert(46%) sepia(88%) saturate(3060%) hue-rotate(87deg) brightness(126%) contrast(119%); cursor: pointer' }),
      createElement('button', { id: 'button-remove', textContent: 'Remove', style: 'position: absolute; right: 0.5rem; bottom: 0.5rem; margin: 0rem; cursor: pointer; user-select: none' })
    ]))

    const image_image = element.querySelector('#image-image')
    const image_mask = element.querySelector('#image-mask')
    const button_remove = element.querySelector('#button-remove')

    loading += 2

    image_image.addEventListener('load', () => {
      loading -= 1
    })

    image_mask.addEventListener('load', () => {
      loading -= 1
    })

    image_mask.addEventListener('click', () => {
      image_mask.style.opacity = (image_mask.style.opacity === '1') ? '0' : '1'
    })

    button_remove.addEventListener('click', async () => {
      await fetch(`/remove/${name}`, {
        method: 'DELETE'
      })

      entries.splice(entries.indexOf(name), 1)
      element.remove()

      text_total.textContent = `${entries.length} Entries`
    })

    index++
  }
}

button_help.addEventListener('click', () => {
  Editor.canvas.style.opacity = (container_help.style.display === 'none') ? '0.5' : '1'
  container_help.style.display = (container_help.style.display === 'none') ? 'block' : 'none'
})

button_settings.addEventListener('click', () => {
  Editor.canvas.style.opacity = (container_settings.style.display === 'none') ? '0.5' : '1'
  container_settings.style.display = (container_settings.style.display === 'none') ? 'block' : 'none'
})

input_resolution.addEventListener('input', () => {
  settings.resolution = parseFloat(input_resolution.value)
  text_resolution.textContent = input_resolution.value

  Editor.reset()
  Editor.resize()
})

input_speed.addEventListener('input', () => {
  settings.controlSpeed = parseFloat(input_speed.value)
  text_speed.textContent = input_speed.value
})

button_all.addEventListener('click', async () => {
  Editor.canvas.style.opacity = (container_all.style.display === 'none') ? '0.5' : '1'
  container_all.style.display = (container_all.style.display === 'none') ? 'flex' : 'none'

  if (entries === null) {
    entries = await (await fetch('/list')).json()

    text_total.textContent = `${entries.length} Entries`
  }
})

button_reload.addEventListener('click', async () => {
    entries = await (await fetch('/list')).json()
    index = 0

    while (container_entries.firstChild) {
      container_entries.removeChild(container_entries.lastChild);
    }

    text_total.textContent = `${entries.length} Entries`

    loadImages(10)
})

setInterval(() => {
  if ((entries !== null && loading === 0) && Math.round(container_all.scrollTop + container_all.clientHeight) >= container_all.scrollHeight - (container_all.scrollHeight / 10)) {
    loadImages(10)
  }
}, 100)
