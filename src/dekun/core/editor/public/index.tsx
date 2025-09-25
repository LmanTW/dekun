import { render } from 'preact'

import Settings from './components/Settings'
import Keybinds from './components/Keybinds'
import Entries from './components/Entries'
import Navbar from './components/Navbar'
import Control from './scripts/control'
import Editor from './scripts/editor'
import Help from './components/Help'
import State from './scripts/state'
import Image from './scripts/image'

render(<Navbar/>, document.getElementById('container-navbar')!)
render(<Help/>, document.getElementById('container-help')!)
render(<Settings/>, document.getElementById('container-settings')!)
render(<Keybinds/>, document.getElementById('container-keybinds')!)
render(<Entries/>, document.getElementById('container-entries')!)

let lastTick = performance.now()

// The main update loop.
function mainTick(): void {
  const deltaTime = performance.now() - lastTick
  lastTick = performance.now()

  if (document.hasFocus()) {
    Control.update(deltaTime)
    Editor.update(deltaTime)
  }

  if (State.settings.fps === 0) {
    requestAnimationFrame(mainTick)
  } else {
    setTimeout(mainTick, (1000 / State.settings.fps) - (performance.now() - lastTick))
  }
}

let preloading: boolean = true

// The image preload loop.
async function preloadTick(): Promise<void> {
  try {
    const info = await Image.drivers[State.source.driver].preload(State.settings.preload)

    if (info === null) {
      setTimeout(preloadTick, 100)
    } else {
      await fetch(info.url)

      preloadTick()
    }
  } catch (_) {
    preloading = false
  } 
}

window.addEventListener('load', () => {
  mainTick()
  preloadTick()

  Image.next()

  State.sourceSignal.subscribe(() => {
    if (!preloading) {
      preloadTick()
    }
  })
})
