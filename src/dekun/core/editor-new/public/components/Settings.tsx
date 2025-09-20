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

  return (
    <div class='shadow' style={{ display: (State.layout.settings) ? 'block' : 'none', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <h3 style={{ backgroundColor: 'var(--color-container-light)', padding: 'var(--spacing-medium)' }}>Settings</h3>
      <div style={{ backgroundColor: 'var(--color-container-dark)', padding: 'var(--spacing-medium)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-big)' }}>
          <p style={{ marginRight: 'var(--spacing-small)' }}>Username:</p>
          <input value={State.settings.username} onChange={(event) => updateUsername((event.target as HTMLInputElement).value)} style={{ width: '5rem' }}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-tiny)' }}>
          <p style={{ marginRight: 'var(--spacing-small)' }}>FPS:</p>
          <input type="range" step="10" min="0" max="120" value={State.settings.fps} onInput={(event) => State.updateSettings({ fps: parseInt((event.target as HTMLInputElement).value) })} style={{ marginRight: 'var(--spacing-small)' }}/>
          <p>{(State.settings.fps === 0) ? '(VSync)' : `(${State.settings.fps})`}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-big)' }}>
          <p style={{ marginRight: 'var(--spacing-small)' }}>Resolution:</p>
          <input type="range" step="0.1" min="0.5" max="2" value={State.settings.resolution} onInput={(event) => State.updateSettings({ resolution: parseFloat((event.target as HTMLInputElement).value) })} style={{ marginRight: 'var(--spacing-small)' }}/>
          <p>{(State.settings.resolution === window.devicePixelRatio) ? '(Native)' : `(${State.settings.resolution}x)`}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <p style={{ marginRight: 'var(--spacing-small)', marginBottom: 'var(--spacing-tiny)' }}>Move Speed:</p>
          <input type="range" step="0.1" min="0.5" max="1.5" value={State.settings.moveSpeed} onInput={(event) => State.updateSettings({ moveSpeed: parseFloat((event.target as HTMLInputElement).value) })} style={{ marginRight: 'var(--spacing-small)' }}/>
          <p>{(State.settings.moveSpeed === 1) ? '(Default)' : `(${State.settings.moveSpeed}x)`}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <p style={{ marginRight: 'var(--spacing-small)', marginBottom: 'var(--spacing-tiny)' }}>Zoom Speed:</p>
          <input type="range" step="0.1" min="0.5" max="1.5" value={State.settings.zoomSpeed} onInput={(event) => State.updateSettings({ zoomSpeed: parseFloat((event.target as HTMLInputElement).value) })} style={{ marginRight: 'var(--spacing-small)' }}/>
          <p>{(State.settings.zoomSpeed === 1) ? '(Default)' : `(${State.settings.zoomSpeed}x)`}</p>
        </div>
      </div>
    </div>
  )
}
