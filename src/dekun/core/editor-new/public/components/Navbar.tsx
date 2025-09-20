import State from '../scripts/state'
import Image from '../scripts/image'

// The navbar component.
export default () => {

  // Update the source.
  const updateSource = (source: string): void => {
    State.updateSource({
      value: source,
      display: source
    })
  }

  return (
    <nav class='shadow' style={{ position: 'fixed', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-container-light)', left: '0rem', top: '0rem', width: '100%', height: '3.5rem' }}>
      <h1 style={{ textWrap: 'nowrap', marginLeft: 'var(--spacing-medium)', marginRight: 'var(--spacing-medium)' }}>Dataset Editor</h1>
      <button onClick={() => State.updateLayout({ help: !State.layout.help })} style={{ marginRight: 'var(--spacing-medium)', cursor: 'pointer' }}>Help</button>
      <button onClick={() => State.updateLayout({ settings: !State.layout.settings })} style={{ marginRight: 'var(--spacing-medium)', cursor: 'pointer' }}>Settings</button>

      <div style="flex: 1"></div>

      <select onChange={(event) => State.updateSource({ driver: (event.target as HTMLInputElement).value })} style={{ marginRight: 'var(--spacing-small)' }}>
        {
          Object.keys(Image.drivers).map((id) => (
            <option value={Image.drivers[id].id} selected={(id === State.source.driver) ? true : undefined}>{Image.drivers[id].name}</option>
          ))
        }
      </select>

      <input value={State.source.display} autocomplete="off" onChange={(event) => updateSource((event.target as HTMLInputElement).value)} style={{ width: '7.5rem', marginRight: 'var(--spacing-small)' }}/>
      <button style={{ marginRight: 'var(--spacing-medium)', cursor: 'pointer' }}>Entries</button>
    </nav>
  )
}
