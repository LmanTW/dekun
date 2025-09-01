const loaded = document.getElementById('loaded')
const images = await (await fetch('/list')).json()

let index = 0
let loading = 0

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

// Load more images.
function load(amount) {
  for (let i = 0; i < amount && index < images.length; i++) {
    const id = images[index]

    const element = loaded.appendChild(createElement('div', { style: 'position: relative; width: min(50dvw, 25rem)' }, [
      createElement('img', { id: 'image', src: `/image/${id}`, style: 'width: 100%' }),
      createElement('img', { id: 'mask', src: `/mask/${id}`, style: 'position: absolute; left: 0rem; top: 0rem; width: 100%; filter: invert(46%) sepia(88%) saturate(3060%) hue-rotate(87deg) brightness(126%) contrast(119%); cursor: pointer' }),
      createElement('p', { id: 'remove', textContent: 'Remove', style: 'position: absolute; background-color: black; color: white; right: 0.5rem; bottom: 0.5rem; margin: 0rem; cursor: pointer; user-select: none' })
    ]))

    const image = element.querySelector('#image')
    const mask = element.querySelector('#mask')
    const remove = element.querySelector('#remove')

    loading += 2

    image.addEventListener('load', () => loading -= 1)
    mask.addEventListener('load', () => loading -= 1)

    mask.addEventListener('click', () => {
      mask.style.opacity = (mask.style.opacity === '1') ? '0' : '1'
    })

    remove.addEventListener('click', async () => {
      await fetch(`/remove/${id}`, {
        method: 'DELETE'
      })

      element.remove()
    })

    index++
  }
}

loaded.appendChild(createElement('h1', { textContent: `${images.length} Entries`, style: 'color: white' }))


setInterval(() => {
  if (loading === 0 && Math.round(loaded.scrollTop + loaded.clientHeight) >= loaded.scrollHeight - (loaded.scrollHeight / 10)) {
    load(10)
  }
}, 100)
