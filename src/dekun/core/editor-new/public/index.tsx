import { render } from 'preact'

import Settings from './components/Settings'
import Navbar from './components/Navbar'
import Control from './scripts/control'
import Tasks from './components/Tasks'
import Editor from './scripts/editor'
import State from './scripts/state'
import Image from './scripts/image'

render(<Navbar/>, document.getElementById('container-navbar')!)
render(<Settings/>, document.getElementById('container-settings')!)
render(<Tasks/>, document.getElementById('container-tasks')!)

let lastTick = performance.now()

// The main update loop.
function mainTick(): void {
  const deltaTime = performance.now() - lastTick
  lastTick = performance.now()

  Control.update(deltaTime) 
  Editor.update(deltaTime)

  if (State.settings.fps === 0) {
    requestAnimationFrame(mainTick)
  } else {
    setTimeout(mainTick, (1000 / State.settings.fps) - (performance.now() - lastTick))
  }
}

let preloadTask: null | symbol = null

// The image preload loop.
async function preloadTick(attempt: number): Promise<void> {
  try {
    const info = await Image.drivers[State.source.driver].preload(State.settings.preload)

    if (info === null) {
      if (preloadTask !== null) {
        preloadTask = State.removeTask(preloadTask)
      }

      setTimeout(() => preloadTick(1), 100)
    } else {
      preloadTask = (preloadTask === null)
        ? State.addTask('success', 'Preload', `${info.amount} (${info.id}/${info.page})`)
        : State.updateTask(preloadTask, { type: 'success', message: `${info.amount} (${info.id}/${info.page})` })

      await fetch(info.url)

      setTimeout(() => preloadTick(1), 50)
    }
  } catch (error) {
    if (attempt < 4) {
      preloadTask = (preloadTask === null)
        ? State.addTask('warning', 'Preload', `${attempt} (${(error as Error).message})`)
        : State.updateTask(preloadTask, { type: 'warning', message: `${attempt} (${(error as Error).message})` })

      setTimeout(() => preloadTick(attempt + 1), 1000)
    } else {
      preloadTask = (preloadTask === null)
        ? State.addTask('error', 'Preload', (error as Error).message)
        : State.updateTask(preloadTask, { type: 'error', message: (error as Error).message })
    }
  }
}

window.addEventListener('load', () => {
  mainTick()
  preloadTick(1)

  Image.next()
})
