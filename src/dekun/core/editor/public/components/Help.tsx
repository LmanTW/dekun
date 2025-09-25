import { combinationToString } from './Keybinds'
import State from '../scripts/state'

// The help component.
export default () => {
  return (
    <div class='shadow' style={{ display: (State.layout.help) ? 'block' : 'none', border: '0.05rem solid ', borderRadius: '0.5rem', marginRight: 'var(--spacing-medium)', marginBottom: 'var(--spacing-medium)', overflow: 'hidden' }}>
      <h3 class={(State.settings.reduceTransparency) ? 'container-solid-light' : 'container-glassy-light'} style={{ padding: 'var(--spacing-medium)' }}>Help</h3>
      <div class={(State.settings.reduceTransparency) ? 'container-solid-dark' : 'container-glassy-dark'}>
        <div style={{ width: '100%', height: '0.05rem', backgroundColor: 'var(--color-foreground)', opacity: 0.1 }}></div>
        <div style={{ padding: 'var(--spacing-medium)', overflowX: 'auto' }}>
          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.moveUp)}</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.moveLeft)}</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.moveDown)}</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.moveRight)}</span>
            <span style={{ marginRight: 'var(--spacing-tiny)' }}>to move,</span>
            <span class="key" style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.zoomIn)}</span>
            <span class="key" style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.zoomOut)}</span>
            <span>to zoom in and out.</span> 
          </p>

          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-big)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.resetCamera)}</span>
            <span>to reset the camera.</span>
          </p>

          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.changeStrokeType1)}</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.changeStrokeType2)}</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.changeStrokeType3)}</span>
            <span>to change the stroke type.</span>
          </p>

          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Mouse Wheel</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.increaseStrokeSize)}</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.decreaseStrokeSize)}</span>
            <span>to change the stroke size.</span>
          </p>

          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-big)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.changeStrokeOpacity)}</span>
            <span>to change the stroke opacity.</span>
          </p>

          <h5 style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-small)' }}>Stroke Type 1 or 2</h5>

          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Left Click</span>
            <span>to draw.</span>
          </p>

          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-big)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Right Click</span>
            <span>to continue from the last stroke.</span>
          </p>

          <h5 style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-small)' }}>Stroke Type 3</h5>

          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Left Click</span>
            <span>to add a point or move a point.</span>
          </p>

          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-big)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Right Click</span>
            <span>to complete or edit the last shape.</span>
          </p>

          <p style={{ textWrap: 'nowrap', marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.undoLastAction)}</span>
            <span>to remove the last stroke or point.</span>
          </p>

          <p style={{ textWrap: 'nowrap' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.skipImage)}</span>
            <span style={{ marginRight: 'var(--spacing-tiny)' }}>to skip the image,</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>{combinationToString(State.keybinds.submitImage)}</span>
            <span>to submit.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
