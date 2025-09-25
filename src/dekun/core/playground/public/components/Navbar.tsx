import State from '../scripts/state'

// The navbar component.
export default () => {
  return (
    <nav class={(State.settings.reduceTransparency) ? 'container-solid-light shadow' : 'container-glassy-light shadow'} style={{ position: 'fixed', display: 'flex', alignItems: 'center', left: '0rem', top: '0rem', width: '100%', height: '3.5rem' }}>
      <h1 style={{ textWrap: 'nowrap', marginLeft: 'var(--spacing-medium)', marginRight: 'var(--spacing-medium)' }}>Model Playground</h1>
      <div style='flex: 1'></div>
      <div style={{ display: 'flex', alignItems: 'center', marginRight: 'var(--spacing-medium)' }}>
        <p style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>Reduce Transparency:</p>
        <input type="checkbox" checked={State.settings.reduceTransparency} onChange={(event) => State.updateSettings({ reduceTransparency: ((event.target as HTMLInputElement)).checked })}/>
      </div>
    </nav>
  )
}
