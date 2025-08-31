const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

const image = {
  id: 0,
  page: '',

  element: document.createElement('img'),
  transform: undefined
}

image.element.crossOrigin = 'anonymous'

const mouse = {
  globalX: 0,
  globalY: 0,
  imageX: 0,
  imageY: 0,

  state: 'none',
  pressed: false,

  startX: 0,
  startY: 0
}

function updateImageTransform() {
  if (image.element.complete) {
    const canvasAspect = canvas.width / canvas.height
    const imageAspect = image.element.width / image.element.height

    let targetWidth, targetHeight

    if (imageAspect > canvasAspect) {
        targetWidth = canvas.width
        targetHeight = canvas.width / imageAspect
    } else {
        targetWidth = canvas.height * imageAspect
        targetHeight = canvas.height
    }

    targetWidth *= 0.9
    targetHeight *= 0.9

    image.transform = {
      x: (canvas.width - targetWidth) / 2,
      y: (canvas.height - targetHeight) / 2,
      width: targetWidth,
      height: targetHeight,
      widthScale: targetWidth / image.element.width,
      heightScale: targetHeight / image.element.height
    }
  } 
}

window.addEventListener('resize', updateImageTransform)
image.element.addEventListener('load', updateImageTransform)

// The scene.
class Scene {

  // Resize the scene.
  static resize() {
    const bound = canvas.getBoundingClientRect()

    canvas.width = bound.width * window.devicePixelRatio
    canvas.height = bound.height * window.devicePixelRatio
  }

  // Render the scene.
  static render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (image.transform !== undefined) {
      ctx.drawImage(image.element, image.transform.x, image.transform.y, image.transform.width, image.transform.height)

      for (const stroke of Control.strokes) {
        Scene.drawLine('rgb(0,255,0)', stroke.type, stroke.size, stroke.x1, stroke.y1, stroke.x2, stroke.y2)
      }

      if (mouse.state === 'create') {
        Scene.drawLine('rgba(0,255,0,0.5)', Control.stroke_type, Control.stroke_size, mouse.startX, mouse.startY, mouse.imageX, mouse.imageY)
      } else {
        ctx.fillStyle = 'rgba(255,0,0,0.5)'
        ctx.arc(mouse.globalX * window.devicePixelRatio, mouse.globalY * window.devicePixelRatio, (image.transform.widthScale + image.transform.heightScale) * (Control.stroke_size / 2), 0, 2 * Math.PI);
        ctx.fill()
        ctx.beginPath()
      }
    }

    if (Control.save_start !== undefined) {
      ctx.fillStyle = `rgba(255,255,255,${(performance.now() - Control.save_start) / 300})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
    }

    requestAnimationFrame(Scene.render)
  } 

  // Draw a line in image space.
  static drawLine(color, type, size, x1, y1, x2, y2) {
    ctx.strokeStyle = color
    ctx.lineCap = type
    ctx.lineWidth = (image.transform.widthScale + image.transform.heightScale) * size
    ctx.moveTo(image.transform.x + (x1 * image.transform.widthScale), image.transform.y + y1 * image.transform.heightScale)
    ctx.lineTo(image.transform.x + (x2 * image.transform.widthScale), image.transform.y + y2 * image.transform.heightScale)
    ctx.stroke()
    ctx.beginPath()
  }
}

Scene.resize()
window.addEventListener('load', Scene.render)
window.addEventListener('resize', Scene.resize)

// The control.
class Control {
  static strokes = []
  static stroke_type = 'butt'
  static stroke_size = 5

  static save_start = undefined

  // Load the next image.
  static async next() {
    image.transform = undefined

    let data

    while (true) {
      try {
        data = await (await fetch('/next')).json()

        break
      } catch (_) {}
    }

    image.id = data.id
    image.page = data.page
    image.element.src = `/image/${data.media}/${data.page}`

    Control.strokes = []
  }

  // Save the image.
  static async save() {
    image.transform = undefined

    const image_canvas = document.createElement('canvas')
    const image_ctx = image_canvas.getContext('2d')

    image_canvas.width = image.element.width
    image_canvas.height = image.element.height

    image_ctx.drawImage(image.element, 0, 0)

    const original = image_canvas.toDataURL('image/jpeg', 1).substring(23)

    image_ctx.clearRect(0, 0, image_canvas.width, image_canvas.height)

    for (const stroke of Control.strokes) {
      image_ctx.strokeStyle = 'rgb(255,255,255)'
      image_ctx.lineCap = stroke.type
      image_ctx.lineWidth = stroke.size * 2
      image_ctx.moveTo(stroke.x1, stroke.y1)
      image_ctx.lineTo(stroke.x2, stroke.y2)
      image_ctx.stroke()
      image_ctx.beginPath()
    }

    const mask = image_canvas.toDataURL('image/png', 1).substring(22)

    fetch(`/save?id=${image.id}&page=${image.page.split('.')[0]}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original, mask }),
    })

    Control.next()
  }
}

Control.next()

window.addEventListener('mousemove', (event) => {
  mouse.globalX = event.x
  mouse.globalY = event.y

  if (image.transform !== undefined) {
    const widthScale = image.element.width / (image.transform.width / window.devicePixelRatio)
    const heightScale = image.element.height / (image.transform.height / window.devicePixelRatio)

    mouse.imageX = (event.x - (image.transform.x / window.devicePixelRatio)) * widthScale
    mouse.imageY = (event.y - (image.transform.y / window.devicePixelRatio)) * heightScale
  }
})

window.addEventListener('mousedown', () => {
  if (image.transform !== undefined) {
    mouse.state = 'create'
  }

  mouse.pressed = true
  mouse.startX = mouse.imageX
  mouse.startY = mouse.imageY
})

window.addEventListener('mouseup', () => {
  mouse.pressed = false

  if (image.transform !== undefined) {
    if (mouse.state === 'create') {
      Control.strokes.push({
        x1: mouse.startX,
        y1: mouse.startY,
        x2: mouse.imageX,
        y2: mouse.imageY,
        type: Control.stroke_type,
        size: Control.stroke_size
      })
    }
  } 

  mouse.state = 'none'
})

window.addEventListener('wheel', (event) => {
  Control.stroke_size += -event.deltaY / 10
  Control.stroke_size = Math.max(2, Control.stroke_size)
})

window.addEventListener('keydown', (event) => {
  if (image.transform !== undefined) {
    if (event.key === '1') {
      Control.stroke_type = 'butt'
    } else if (event.key === '2') {
      Control.stroke_type = 'round'
    } else if (Control.strokes.length > 0 && (event.key === 'Backspace' || event.key === 'Delete')) {
      Control.stroke_size = Control.strokes[Control.strokes.length - 1].size
      Control.strokes.splice(Control.strokes.length - 1, 1)
    } else if (Control.save_start === undefined && event.key === 'Enter') {
      Control.save_start = performance.now()
    } else if (event.key === ' ') {
      Control.next()
    }
  } 
})

window.addEventListener('keyup', (event) => {
  if (image.transform !== undefined) {
    if (Control.save_start !== undefined && event.key === 'Enter') {
      if (performance.now() - Control.save_start > 300) {
        Control.save()
      }

      Control.save_start = undefined
    }
  }
})
