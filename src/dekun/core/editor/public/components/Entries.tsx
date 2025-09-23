import { useRef, useEffect } from 'preact/hooks'
import { batch, signal } from '@preact/signals'

import State from '../scripts/state'
import Image from '../scripts/image'

const data = signal<null | {
  entries: string[],
  filtered: string[],
  
  providers: string[],
  authors: string[]
}>(null)

const filter = signal<{
  provider: string,
  author: string
}>({
  provider: 'all',
  author: 'all'
})

const range = signal<{
  top: number,
  bottom: number
}>({
  top: 0,
  bottom: 0
})

// The entry manager.
class EntryManager {
  static loading: number = 0

  // Load the entries.
  public static async loadEntries(): Promise<void> {
    const entries = await (await fetch('/api/list')).json()
    const providers: string[] = []
    const authors: string[] = []

    for (const entry of entries) {
      const parts = entry.split('-')
    
      if (!providers.includes(parts[0])) {
        providers.push(parts[0])
      }

      if (!authors.includes(parts[3])) {
        authors.push(parts[3])
      }
    }

    data.value = {
      entries,
      filtered: [],

      providers,
      authors
    }

    this.updateFilter({})
  }

  // Filter the entries.
  public static filterEntries(): void {
    if (data.value !== null) {
      const filtered: string[] = []

      for (const entry of data.value.entries) {
        const parts = entry.split('-')

        if ((filter.value.provider === 'all' || (parts[0] === filter.value.provider)) && (filter.value.author === 'all' || (parts[3] === filter.value.author))) {
          filtered.push(entry)
        }
      }

      data.value = {
        entries: data.value.entries,
        filtered,

        providers: data.value.providers,
        authors: data.value.authors
      }
    }

    batch(() => {
      range.value = {
        top: 0,
        bottom: 0
      }

      this.loadBottom(10, 20) 
    })
  }

  // update the filter.
  public static updateFilter(modifications: Partial<Filter>): void {
    filter.value = Object.assign(filter.value, modifications)

    if (data.value !== null) {
      if (filter.value.provider !== 'all' && !data.value.providers.includes(filter.value.provider)) {
        filter.value.provider = (data.value.providers.length > 0) ? data.value.providers[0] : 'all'
      }

      if (filter.value.author !== 'all' && !data.value.authors.includes(filter.value.author)) {
        filter.value.author = (data.value.authors.length > 0) ? data.value.authors[0] : 'all'
      }
    }

    this.filterEntries()
  }

  // Load entries at the top.
  public static loadTop(amount: number, max: number): void {
    if (data.value !== null) {
      let topIndex = range.value.top
      let bottomIndex = range.value.bottom

      if (Math.abs(topIndex - bottomIndex) > max) {
        for (let i = 0; i < amount; i++) {
          bottomIndex--
        }
      }

      for (let i = 0; i < amount && topIndex > 0; i++) {
        topIndex--
      }

      range.value = {
        top: topIndex,
        bottom: bottomIndex
      }
    }
  }

  // Load entries at the bottom.
  public static loadBottom(amount: number, max: number): void {
    if (data.value !== null) {
      let topIndex = range.value.top
      let bottomIndex = range.value.bottom

      if (Math.abs(topIndex - bottomIndex) > max) {
        for (let i = 0; i < amount; i++) {
          topIndex++
        }
      }

      for (let i = 0; i < amount && bottomIndex < data.value.filtered.length; i++) {
        bottomIndex++
      } 

      range.value = {
        top: topIndex,
        bottom: bottomIndex
      }
    }
  }
}

// The entry component.
const Entry = (id: string) => {
  const imageRefrence = useRef<HTMLImageElement>(null)
  const maskRefrence = useRef<HTMLImageElement>(null)

  const imageLoadedRefrence = useRef<boolean>(false)
  const maskLoadedRefrence = useRef<boolean>(false)

  // Handle image loaded.
  const imageLoaded = (): void => {
    if (!imageLoadedRefrence.current) {
      imageLoadedRefrence.current = true
      EntryManager.loading--
    }
  }

  // Handle mask loaded.
  const maskLoaded = (): void => {
    if (!maskLoadedRefrence.current) {
      maskLoadedRefrence.current = true
      EntryManager.loading--
    }
  }

  // Edit the image.
  const edit = (): void => {
    if (Image.drivers.hasOwnProperty(parts[0])) {
      Image.next({
        driver: parts[0],
        id: parts[1],
        page: parts[2]
      })

      State.updateLayout({
        help: false,
        settings: false,
        entries: false
      })
    }
  }

  // Remove the image.
  const remove = async (): Promise<void> => {
    if (data.value !== null) {
      await fetch(`/api/remove/${id}`, {
        method: 'DELETE'
      })

      const entriesIndex = data.value.entries.indexOf(id)
      const entries = [...data.value.entries.slice(0, entriesIndex), ...data.value.entries.slice(entriesIndex + 1)]

      const filteredIndex = data.value.filtered.indexOf(id)
      const filtered = [...data.value.filtered.slice(0, filteredIndex), ...data.value.filtered.slice(filteredIndex + 1)]

      const providers: string[] = []
      const authors: string[] = []
  
      for (const entry of entries) {
        const parts = entry.split('-')
      
        if (!providers.includes(parts[0])) {
          providers.push(parts[0])
        }
  
        if (!authors.includes(parts[3])) {
          authors.push(parts[3])
        }
      }

      batch(() => {
        data.value = {
          entries,
          filtered,

          providers,
          authors
        }

        range.value = {
          top: Math.min(entries.length - 1, range.value.top),
          bottom: Math.min(entries.length - 1, range.value.bottom)
        }
      })
    }
  }

  useEffect(() => {
    EntryManager.loading += 2

    maskRefrence.current!.addEventListener('click', () => {
      maskRefrence.current!.style.opacity = (maskRefrence.current!.style.opacity === '1') ? '0' : '1'
    })

    return () => {
      EntryManager.loading -= (imageLoadedRefrence.current) ? 0 : 1
      EntryManager.loading -= (maskLoadedRefrence.current) ? 0 : 1
    }
  }, [])

  const parts = id.split('-')
 
  return (
    <div key={id}>
      <div style={{ position: 'relative', width: '100%', marginBottom: '-0.25rem', userSelect: 'none' }}>
        <img ref={imageRefrence} src={`/resource/image/${id}`} onLoad={imageLoaded} style={{ borderRadius: '0.25rem 0.25rem 0rem 0rem', width: '100%' }}/>
        <img ref={maskRefrence} src={`/resource/mask/${id}`} onLoad={maskLoaded} style={{ position: 'absolute', borderRadius: '0.25rem 0.25rem 0rem 0rem', left: '0rem', top: '0rem', width: '100%', filter: 'invert(46%) sepia(88%) saturate(3060%) hue-rotate(87deg) brightness(126%) contrast(119%)', cursor: 'pointer' }}/>
      </div>

      <div style={{ display: 'flex', backgroundColor: 'var(--color-container-light)', borderRadius: '0rem 0rem 0.25rem 0.25rem', padding: 'var(--spacing-small)' }}>
        <h5 style={{ marginRight: 'var(--spacing-small)' }}>{(Image.drivers.hasOwnProperty(parts[0])) ? Image.drivers[parts[0]].name : parts[0]}:</h5>
        <p style={{ flex: 1, marginRight: 'var(--spacing-small)' }}>{parts[1]}/{parts[2]}</p>
        <button onClick={remove} style={{ marginRight: 'var(--spacing-small)', cursor: 'pointer' }}>Remove</button>
        <button onClick={edit} style={{ cursor: 'pointer' }}>Edit</button>
      </div>
    </div>
  )
}

// The entries component.
export default () => {
  const containerRefrence = useRef<HTMLDivElement>(null)
 
  useEffect(() => {
    if (containerRefrence.current !== null) {
      const interval = setInterval(() => {
        if (data.value !== null && EntryManager.loading === 0) {
          if (containerRefrence.current!.scrollTop < window.innerHeight / 5) {
            EntryManager.loadTop(10, 20)
          } else if (Math.round(containerRefrence.current!.scrollTop + containerRefrence.current!.clientHeight) >= containerRefrence.current!.scrollHeight - (window.innerHeight / 5)) {
            EntryManager.loadBottom(10, 20)
          }
        }
      }, 100)

      return () => {
        clearInterval(interval)
      }
    }
  })

  return (
    <div class='shadow' style={{ display: (State.layout.entries) ? 'flex' : 'none', flexDirection: 'column', border: '0.05rem solid ', borderRadius: '0.5rem', width: '50rem', maxWidth: 'calc(100dvw - calc(var(--spacing-medium) * 2))', maxHeight: 'calc(100dvh - calc(3.5rem + calc(var(--spacing-medium) * 2)))', overflow: 'hidden' }}>
      <div class={(State.settings.reduceTransparency) ? 'container-solid-light' : 'container-glassy-light'} style={{ display: 'flex', padding: 'var(--spacing-medium)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginRight: 'var(--spacing-medium)' }}>
          <h3>Entries</h3>

          {
            (data.value === null) ? undefined : (
              <p style={{ marginLeft: 'var(--spacing-small)', opacity: 0.5 }}>(Found {data.value.filtered.length})</p>
            )
          }
        </div>

        {
          (data.value === null) ? (
            <select disabled={true} style={{ marginRight: 'var(--spacing-small)' }}>
              <option selected={true}>Loading...</option>
            </select>
          ) : (
            <select value={filter.value.provider} onChange={(event) => EntryManager.updateFilter({ provider: (event.target as HTMLSelectElement).value })} style={{ marginRight: 'var(--spacing-small)' }}>
              {
                [(
                  <option value='all'>All Providers</option>
                )].concat(data.value.providers.map((provider) => (
                  <option value={provider} selected={provider === filter.value.provider}>{(Image.drivers.hasOwnProperty(provider)) ? Image.drivers[provider].name : provider}</option>
                )))
              }
            </select>
          )
        }

        {
          (data.value === null) ? (
            <select disabled={true} style={{ marginRight: 'var(--spacing-small)' }}>
              <option selected={true}>Loading...</option>
            </select>
          ) : (
            <select value={filter.value.author} onChange={(event) => EntryManager.updateFilter({ author: (event.target as HTMLSelectElement).value })} style={{ marginRight: 'var(--spacing-small)' }}>
              {
                [(
                  <option value='all'>All Authors</option>
                )].concat(data.value.authors.map((author) => (
                  <option value={author}>{author}</option>
                )))
              }
            </select>
          )
        }

        <button onClick={() => EntryManager.loadEntries()} style={{ cursor: 'pointer' }}>Refresh</button>
      </div> 

      <div class={(State.settings.reduceTransparency) ? 'container-solid-dark' : 'container-glassy-dark'} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ width: '100%', height: '0.05rem', backgroundColor: 'var(--color-foreground)', opacity: 0.1 }}></div>
        {
          (data.value === null) ? (
            <div style={{ padding: 'var(--spacing-medium)' }}>
              <p style={{ textAlign: 'center', opacity: 0.5 }}>Loading...</p>
            </div>
          ) : (
            <div ref={containerRefrence} style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-small)', padding: 'var(--spacing-medium)', overflowY: 'scroll' }}>
              {
                data.value.filtered.slice(range.value.top, range.value.bottom).map((id) => Entry(id))
              }
            </div>
          )
        }
      </div>
    </div>
  )
}

State.layoutSignal.subscribe((layout) => {
  if (layout.entries && data.value === null) {
    EntryManager.loadEntries()
    EntryManager.filterEntries()
  }
})

// The data structure of the filter.
interface Filter {
  provider: string,
  author: string
}
