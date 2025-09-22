import Editor from '../scripts/editor'
import State from '../scripts/state'

// The settings component.
export default () => {

  // Update the username.
  const updateUsername = (username: string): void => {
    const characters = username.substring(0, 20).toLowerCase().split('')

    for (let i = characters.length - 1; i >= 0; i--) {
      if (!'abcdefghijklmnopqrstuvwxyz0123456789'.includes(characters[i])) {
        characters.splice(i, 1)
      }
    }

    if (characters.length >= 5) {
      State.updateSettings({ username: characters.slice(0, 16).join('') })
    }
  }

  // Update the resolution
  const updateResolution = (resolution: number): void => {
    Editor.camera.x /= State.settings.resolution
    Editor.camera.y /= State.settings.resolution

    State.updateSettings({ resolution })

    Editor.camera.x *= State.settings.resolution
    Editor.camera.y *= State.settings.resolution

    Editor.resize()
  }

  return (
    <div class='shadow' style={{ display: (State.layout.settings) ? 'block' : 'none', border: '0.05rem solid ', borderRadius: '0.5rem', marginBottom: 'var(--spacing-medium)', overflow: 'hidden' }}>
      <h3 class={(State.settings.reduceTransparency) ? 'container-solid-light' : 'container-glassy-light'} style={{ padding: 'var(--spacing-medium)' }}>Settings</h3>
      <div class={(State.settings.reduceTransparency) ? 'container-solid-dark' : 'container-glassy-dark'}>
        <div style={{ width: '100%', height: '0.05rem', backgroundColor: 'var(--color-foreground)', opacity: 0.1 }}></div>
        <div style={{ padding: 'var(--spacing-medium)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-big)' }}>
            <p style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>Username:</p>
            <input value={State.settings.username} onChange={(event) => updateUsername((event.target as HTMLInputElement).value)}/>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-tiny)' }}>
            <p style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>FPS:</p>
            <input type="range" step="10" min="0" max="120" value={State.settings.fps} onInput={(event) => State.updateSettings({ fps: parseInt((event.target as HTMLInputElement).value) })} style={{ marginRight: 'var(--spacing-small)' }}/>
            <p>{(State.settings.fps === 0) ? '(VSync)' : `(${State.settings.fps})`}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-tiny)' }}>
            <p style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>Resolution:</p>
            <input type="range" step="0.1" min="0.5" max="2" value={State.settings.resolution} onInput={(event) => updateResolution(parseFloat((event.target as HTMLInputElement).value))} style={{ marginRight: 'var(--spacing-small)' }}/>
            <p>{(State.settings.resolution === window.devicePixelRatio) ? '(Native)' : `(${State.settings.resolution}x)`}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-big)' }}>
            <p style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>Preload Image:</p>
            <input type="range" step="1" min="0" max="10" value={State.settings.preload} onInput={(event) => State.updateSettings({ preload: parseInt((event.target as HTMLInputElement).value) })} style={{ marginRight: 'var(--spacing-small)' }}/>
            <p>{(State.settings.preload === 5) ? '(Default)' : `(${State.settings.preload})`}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-tiny)' }}>
            <p style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>Move Speed:</p>
            <input type="range" step="0.1" min="0.5" max="1.5" value={State.settings.moveSpeed} onInput={(event) => State.updateSettings({ moveSpeed: parseFloat((event.target as HTMLInputElement).value) })} style={{ marginRight: 'var(--spacing-small)' }}/>
            <p>{(State.settings.moveSpeed === 1) ? '(Default)' : `(${State.settings.moveSpeed}x)`}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-big)' }}>
            <p style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>Scale Speed:</p>
            <input type="range" step="0.1" min="0.5" max="1.5" value={State.settings.scaleSpeed} onInput={(event) => State.updateSettings({ scaleSpeed: parseFloat((event.target as HTMLInputElement).value) })} style={{ marginRight: 'var(--spacing-small)' }}/>
            <p>{(State.settings.scaleSpeed === 1) ? '(Default)' : `(${State.settings.scaleSpeed}x)`}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <p style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>Reduce Transparency:</p>
            <input type="checkbox" checked={State.settings.reduceTransparency} onChange={(event) => State.updateSettings({ reduceTransparency: ((event.target as HTMLInputElement)).checked })}/>
          </div>
        </div>
      </div>
    </div>
  )
}
