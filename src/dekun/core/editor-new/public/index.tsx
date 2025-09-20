import { render } from 'preact'

import Settings from './components/Settings'
import Navbar from './components/Navbar'
import Control from './scripts/control'
import Editor from './scripts/editor'
import State from './scripts/state'

render(<Navbar/>, document.getElementById('container-navbar')!)
render(<Settings/>, document.getElementById('container-settings')!)

let lastTick = performance.now()

// The main update loop.
function tick(): void {
  const deltaTime = performance.now() - lastTick
  lastTick = performance.now()

  Editor.update(deltaTime)
  Control.update(deltaTime)

  if (State.settings.fps === 0) {
    requestAnimationFrame(tick)
  } else {
    setTimeout(tick, (1000 / State.settings.fps) - (performance.now() - lastTick))
  }
}

tick()
