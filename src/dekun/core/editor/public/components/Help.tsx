import State from '../scripts/state'

// The help component.
export default () => {
  return (
    <div class='shadow' style={{ display: (State.layout.help) ? 'block' : 'none', border: '0.05rem solid ', borderRadius: '0.5rem', marginRight: 'var(--spacing-medium)', marginBottom: 'var(--spacing-medium)', overflow: 'hidden'}}>
      <h3 class={(State.settings.reduceTransparency) ? 'container-solid-light' : 'container-glassy-light'} style={{ padding: 'var(--spacing-medium)' }}>Help</h3>
      <div class={(State.settings.reduceTransparency) ? 'container-solid-dark' : 'container-glassy-dark'}>
        <div style={{ width: '100%', height: '0.05rem', backgroundColor: 'var(--color-foreground)', opacity: 0.1 }}></div>
        <div style={{ padding: 'var(--spacing-medium)' }}>
          <p style={{ marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>W</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>A</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>S</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>D</span>
            <span style={{ marginRight: 'var(--spacing-tiny)' }}>to move,</span>
            <span class="key" style={{ marginRight: 'var(--spacing-tiny)' }}>E</span>
            <span class="key" style={{ marginRight: 'var(--spacing-tiny)' }}>Q</span>
            <span>to zoom in and out.</span> 
          </p>

          <p style={{marginBottom: 'var(--spacing-big)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>R</span>
            <span>to reset the camera.</span>
          </p>

          <p style={{ marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>1</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>2</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>3</span>
            <span>to change the stroke type.</span>
          </p>

          <p style={{ marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Mouse Wheel</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>+</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>=</span>
            <span>to change the stroke size.</span>
          </p>

          <p style={{ marginBottom: 'var(--spacing-big)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>F</span>
            <span>to change the stroke opacity.</span>
          </p>

          <h5 style={{ marginBottom: 'var(--spacing-small)' }}>Stroke Type 1 or 2</h5>

          <p style={{ lineHeight: 'var(--size-big)', marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Left Click</span>
            <span>to draw.</span>
          </p>

          <p style={{ marginBottom: 'var(--spacing-big)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Right Click</span>
            <span>to continue from the last stroke.</span>
          </p>

          <h5 style={{ marginBottom: 'var(--spacing-small)' }}>Stroke Type 3</h5>

          <p style={{ lineHeight: 'var(--size-big)', marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Left Click</span>
            <span>to add a point or move a point.</span>
          </p>

          <p style={{ marginBottom: 'var(--spacing-big)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Right Click</span>
            <span>to complete or edit the last shape.</span>
          </p>

          <p style={{ marginBottom: 'var(--spacing-small)' }}>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>X</span>
            <span>to delete the last stroke or point.</span>
          </p>

          <p>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>Z</span>
            <span style={{ marginRight: 'var(--spacing-tiny)' }}>to skip the image,</span>
            <span class='key' style={{ marginRight: 'var(--spacing-tiny)' }}>C</span>
            <span>to submit.</span>
          </p>          
        </div>
      </div>
    </div>
  )
}
