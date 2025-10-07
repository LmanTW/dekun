import { useRef, useEffect, useState } from 'preact/hooks'
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
  public static loadingImages = new Set<string>()

  // Load the entries.
  public static async loadEntries(): Promise<void> {
    data.value = null

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

    this.loadBottom(10, 20, 0, 0) 
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
  public static loadTop(amount: number, max: number, top?: number, bottom?: number): void {
    if (data.value !== null) {
      let topIndex = (top !== undefined) ? top : range.value.top
      let bottomIndex = (bottom !== undefined) ? bottom : range.value.bottom

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
  public static loadBottom(amount: number, max: number, top?: number, bottom?: number): void {
    if (data.value !== null) {
      let topIndex = (top !== undefined) ? top : range.value.top
      let bottomIndex = (bottom !== undefined) ? bottom : range.value.bottom

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

  // Jump to the top entry.
  public static jumpTop(): void {
    if (data.value !== null) {
      this.loadBottom(10, 20, 0, 0)
    }
  }

  // Jump to the bottom entry.
  public static jumpBottom(): void {
    if (data.value !== null) {
      this.loadTop(10, 20, data.value.filtered.length - 1, data.value.filtered.length - 1)
    }
  }
}

// The entry component.
const Entry = (id: string) => {
  const idRefrence = useRef<null | string>(null)
  const imageRefrence = useRef<HTMLImageElement>(null)
  const maskRefrence = useRef<HTMLImageElement>(null)

  const [toggled, setToggled] = useState<boolean>(true)

  // Handle when the image is loaded.
  const handleImageLoaded = (source: string): void => {
    EntryManager.loadingImages.delete(`${source.substring(source.lastIndexOf('/') + 1)}-image`)
  }

  // Handle when the mask is loaded.
  const handleMaskLoaded = (source: string): void => {
    EntryManager.loadingImages.delete(`${source.substring(source.lastIndexOf('/') + 1)}-mask`)
  }

  // Edit the entry.
  const editEntry = (): void => {
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

  // Remove the entry.
  const removeEntry = async (): Promise<void> => {
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
    if (id !== idRefrence.current) {
      EntryManager.loadingImages.delete(`${idRefrence.current}-image`)
      EntryManager.loadingImages.delete(`${idRefrence.current}-mask`)

      idRefrence.current = id

      if (imageRefrence.current !== null && !imageRefrence.current.complete) {
        EntryManager.loadingImages.add(`${id}-image`)
      }

      if (maskRefrence.current !== null && !maskRefrence.current.complete) {
        EntryManager.loadingImages.add(`${id}-mask`)
      }
    }
  })

  const parts = id.split('-')
 
  return (
    <div key={id}>
      <div style={{ position: 'relative', width: '100%', marginBottom: '-0.25rem', userSelect: 'none' }}>
        <img ref={imageRefrence} src={`/resource/image/${id}`} onLoad={(event) => handleImageLoaded((event.target as HTMLImageElement).src)} style={{ contentVisibility: 'auto', borderRadius: '0.25rem 0.25rem 0rem 0rem', width: '100%' }}/>
        <img ref={maskRefrence} src={`/resource/mask/${id}`} onLoad={(event) => handleMaskLoaded((event.target as HTMLImageElement).src)} onClick={() => setToggled(!toggled)} style={{ position: 'absolute', contentVisibility: 'auto', borderRadius: '0.25rem 0.25rem 0rem 0rem', left: '0rem', top: '0rem', width: '100%', filter: 'invert(46%) sepia(88%) saturate(3060%) hue-rotate(87deg) brightness(126%) contrast(119%)', opacity: (toggled) ? 1 : 0, cursor: 'pointer' }}/>
      </div>

      <div style={{ display: 'flex', backgroundColor: 'var(--color-container-light)', borderRadius: '0rem 0rem 0.25rem 0.25rem', padding: 'var(--spacing-small)' }}>
        <h5 style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-tiny)' }}>{(Image.drivers.hasOwnProperty(parts[0])) ? Image.drivers[parts[0]].name : parts[0]}:</h5>
        <p style={{ flex: 1, textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>{parts[1]}/{parts[2]} ({parts[3]})</p>
        <button onClick={removeEntry} style={{ marginRight: 'var(--spacing-small)', cursor: 'pointer' }}>Remove</button>
        <button onClick={editEntry} style={{ cursor: 'pointer' }}>Edit</button>
      </div>
    </div>
  )
}

// The entries component.
export default () => {
  const containerRefrence = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRefrence.current !== null) {
      // Handle when the container is scrolled.
      const handleScroll = () => {
        if (data.value !== null && EntryManager.loadingImages.size === 0) {
          if (range.value.top > 0 && containerRefrence.current!.scrollTop < window.innerHeight / 5) {
            EntryManager.loadTop(10, 20)
          } else if (Math.round(containerRefrence.current!.scrollTop + containerRefrence.current!.clientHeight) >= containerRefrence.current!.scrollHeight - (window.innerHeight / 5)) {
            EntryManager.loadBottom(10, 20)
          }
        }
      }

      containerRefrence.current.addEventListener('scroll', handleScroll)

      return () => {
        containerRefrence.current!.removeEventListener('scroll', handleScroll)
      }
    }
  })

  return (
    <div class='shadow' style={{ display: (State.layout.entries) ? 'flex' : 'none', flexDirection: 'column', border: '0.05rem solid ', borderRadius: '0.5rem', width: '65dvw', maxWidth: 'calc(100dvw - calc(var(--spacing-medium) * 2))', maxHeight: 'calc(100dvh - calc(3.5rem + calc(var(--spacing-medium) * 2)))', overflow: 'hidden' }}>
      <div class={(State.settings.reduceTransparency) ? 'container-solid-light' : 'container-glassy-light'} style={{ display: 'flex', padding: 'var(--spacing-medium)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginRight: 'var(--spacing-medium)' }}>
          <h3>Entries</h3>

          {
            (data.value === null) ? undefined : (
              <p style={{ textWrap: 'nowrap', marginLeft: 'var(--spacing-small)', opacity: 0.5 }}>(Found {data.value.filtered.length} / {data.value.entries.length})</p>
            )
          }
        </div>

        <button onClick={() => EntryManager.jumpTop()} style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-small)', cursor: 'pointer' }}>To Top</button>
        <button onClick={() => EntryManager.jumpBottom()} style={{ textWrap: 'nowrap', marginRight: 'var(--spacing-medium)',  cursor: 'pointer' }}>To Bottom</button>

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

        <button disabled={data.value === null} onClick={() => EntryManager.loadEntries()} style={{ cursor: 'pointer' }}>Refresh</button>
      </div> 

      <div class={(State.settings.reduceTransparency) ? 'container-solid-dark' : 'container-glassy-dark'} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ backgroundColor: 'var(--color-foreground)', width: '100%', height: '0.05rem', opacity: 0.1 }}></div>

        {
          (data.value === null) ? (
            <div style={{ padding: 'var(--spacing-medium)' }}>
              <p style={{ textAlign: 'center', opacity: 0.5 }}>Loading...</p>
            </div>
          ) : (
            <div ref={containerRefrence} style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-small)', padding: 'var(--spacing-medium)', overflowY: 'scroll' }}>
              {
                data.value.filtered.slice(range.value.top, range.value.bottom).map((id) => Entry(id))
              }
            </div>
          )
        }

        <div style={{ backgroundColor: 'var(--color-foreground)', width: '100%', height: '0.05rem', opacity: 0.1 }}></div>
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
