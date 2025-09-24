import State from '../scripts/state'
import Image from '../scripts/image'

// The navbar component.
export default () => {

  // Update the driver.
  const updateDriver = async (driver: string): Promise<void> => {
    State.updateSource({
      driver
    })

    await Image.next()
  }

  // Update the source.
  const updateSource = async (source: string): Promise<void> => {
    State.updateSource({
      value: source,
      display: source
    })

    await Image.next()
  }

  return (
    <nav class={(State.settings.reduceTransparency) ? 'container-solid-light shadow' : 'container-glassy-light shadow'} style={{ position: 'fixed', display: 'flex', alignItems: 'center', left: '0rem', top: '0rem', width: '100%', height: '3.5rem' }}>
      <h1 style={{ textWrap: 'nowrap', marginLeft: 'var(--spacing-medium)', marginRight: 'var(--spacing-medium)' }}>Dataset Editor</h1>
      <button onClick={() => State.updateLayout({ help: !State.layout.help })} style={{ marginRight: 'var(--spacing-medium)', cursor: 'pointer' }}>Help</button>
      <button onClick={() => State.updateLayout({ settings: !State.layout.settings })} style={{ marginRight: 'var(--spacing-medium)', cursor: 'pointer' }}>Settings</button>

      <div style='flex: 1'></div>

      <select value={State.source.driver} disabled={State.source.locked} onChange={(event) => updateDriver((event.target as HTMLInputElement).value)} style={{ marginRight: 'var(--spacing-small)' }}>
        {
          Object.keys(Image.drivers).map((id) => (
            <option value={Image.drivers[id].id}>{Image.drivers[id].name}</option>
          ))
        }
      </select>

      <input value={State.source.display} autocomplete='off' disabled={State.source.locked} onChange={(event) => updateSource((event.target as HTMLInputElement).value)} style={{ width: '7.5rem', marginRight: 'var(--spacing-small)' }}/>
      <button onClick={() => State.updateLayout({ entries: !State.layout.entries })} style={{ marginRight: 'var(--spacing-medium)', cursor: 'pointer' }}>Entries</button>
    </nav>
  )
}
