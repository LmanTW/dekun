import { useState, useRef } from 'preact/hooks'

import State from '../scripts/state'

const Keybind = (properties: { id: keyof typeof State.keybinds }) => {
  const [recording, setRecording] = useState<boolean>(false)
  const [combination, setCombination] = useState<Combination>(keysToCombination([]))

  const keys = useRef(new Set<string>())
  const pressed = useRef<number>(0)

  // Start the recoding.
  const startRecording = (): void => {
    keys.current.clear()
    pressed.current = 0

    setRecording(true)
    setCombination(keysToCombination([]))
  }

  // Handle keydown.
  const handleKeydown = (key: string): void => {
    key = key.toLowerCase()

    if (recording) {
      if (key === 'escape') {
        setRecording(false)
        setCombination(State.keybinds[properties.id])
      } else {
        keys.current.add(key)
        pressed.current++

        setCombination(keysToCombination(Array.from(keys.current)))
      }
    }
  }

  // Handle keydown.
  const handleKeyup = (): void => {
    console.log(true)

    if (recording) {
      pressed.current--

      if (pressed.current === 0) {
        setRecording(false)

        const modifications: Partial<typeof State.keybinds> = {}
        modifications[properties.id] = combination

        State.updateKeybind(modifications)
      }
    }
  }

  // Reset the keybind.
  const resetKeybind = (): void => {
    setRecording(false)
    setCombination(State.keybinds[properties.id])
  }

  return (
    <button onClick={startRecording} onKeyDown={(event) => handleKeydown(event.key)} onKeyUp={handleKeyup} onFocusOut={resetKeybind} style={{ backgroundColor: 'color-mix(in srgb, var(--color-foreground), transparent 80%)', color: (recording) ? 'color-mix(in srgb, var(--color-foreground), transparent 75%)' : 'var(--color-foreground)', border: 'none', borderRadius: '0.25rem', fontSize: 'calc(var(--size-tiny) * 0.75)', minWidth: '5rem', padding: 'calc(var(--spacing-tiny) * 0.75) var(--spacing-small)', cursor: 'pointer' }}>
      {
        (recording)
          ? (pressed.current === 0) ? 'Enter Combination' : combinationToString(combination)
          : combinationToString(State.keybinds[properties.id])
      }
    </button>
  )
}

// The keybinds component.
export default () => {
  return (
    <div class='shadow' style={{ display: (State.layout.keybinds) ? 'block' : 'none', border: '0.05rem solid ', borderRadius: '0.5rem', marginRight: 'var(--spacing-medium)', marginBottom: 'var(--spacing-medium)', overflow: 'hidden' }}>
      <div class={(State.settings.reduceTransparency) ? 'container-solid-light' : 'container-glassy-light'} style={{ display: 'flex', alignItems: 'center', padding: 'var(--spacing-medium)' }}>
        <h3 style={{ flex: 1 }}>Keybinds</h3>
        <button onClick={() => State.updateKeybind(State.defaultKeybinds)}>Reset</button>
      </div>

      <div class={(State.settings.reduceTransparency) ? 'container-solid-dark' : 'container-glassy-dark'}>
        <div style={{ width: '100%', height: '0.05rem', backgroundColor: 'var(--color-foreground)', opacity: 0.1 }}></div>
        <div style={{ padding: 'var(--spacing-medium)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Move Left:</p>
            <Keybind id='moveLeft'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Move Right:</p>
            <Keybind id='moveRight'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Move Up:</p>
            <Keybind id='moveUp'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Move Down:</p>
            <Keybind id='moveDown'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Zoom In:</p>
            <Keybind id='zoomIn'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Zoom Out:</p>
            <Keybind id='zoomOut'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-big)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Reset Camera:</p>
            <Keybind id='resetCamera'/>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Change Stroke Type to 1:</p>
            <Keybind id='changeStrokeType1'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Change Stroke Type to 2:</p>
            <Keybind id='changeStrokeType2'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Change Stroke Type to 3:</p>
            <Keybind id='changeStrokeType3'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Increase Stroke Size:</p>
            <Keybind id='increaseStrokeSize'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Decrease Stroke Size:</p>
            <Keybind id='decreaseStrokeSize'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-big)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Change Stroke Opacity:</p>
            <Keybind id='changeStrokeOpacity'/>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Remove Last Stroke or Point:</p>
            <Keybind id='undoLastAction'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Skip Current Image:</p>
            <Keybind id='skipImage'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-big)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Submit Current Image:</p>
            <Keybind id='submitImage'/>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-small)' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Jump to Bottom Entry:</p>
            <Keybind id='jumpToTopEntry'/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <p style={{ marginRight: 'var(--spacing-small)' }}>Jump to Top Entry:</p>
            <Keybind id='jumpToBottomEntry'/>
          </div>
        </div>
      </div>
    </div>
  )
}

// Convert keys to combination.
export function keysToCombination(keys: string[]): Combination {
  return {
    keys: keys.filter((key) => key.length === 1),

    modifiers: {
      control: keys.includes('control'),
      option: keys.includes('alt'),
      meta: keys.includes('meta'),
      shift: keys.includes('shift')
    }
  }
}

// Convert a combination to a string.
export function combinationToString(combination: Combination): string {
  const parts: string[] = []

  if (combination.modifiers.control) parts.push('Control')
  if (combination.modifiers.option) parts.push('Option')
  if (combination.modifiers.meta) parts.push('Meta')
  if (combination.modifiers.shift) parts.push('Shift')

  return parts.concat(combination.keys.map((key) => key.toUpperCase())).join(' + ')
}

// The data structure of a key combination.
export interface Combination {
  keys: string[],

  modifiers: {
    control: boolean,
    option: boolean,
    meta: boolean,
    shift: boolean
  }
}
