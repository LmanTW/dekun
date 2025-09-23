import { type Driver } from '../image'

let latest: null | number = null

let current: null | {
  id: string,
  pages: string[],

  index: number,
  cacheIndex: number
} = null

const cache: {
  id: string,
  page: number,

  url: string,
  source: string  
}[] = []

// Fetch a random gallery.
async function fetchRandomGallery(): Promise<{ id: string, page: number, url: string, source: string }> {
  if (latest === null) {
    latest = await (await fetch('/api/drivers/nhentai/latest')).json()
  }

  const galleryID = Math.round(Math.random() * latest!)
  const galleryPages = await (await fetch(`/api/drivers/nhentai/pages/${galleryID}`)).json()
  const pageIndex = Math.floor(Math.random() * galleryPages.length)
  const urlParts = galleryPages[pageIndex].split('/')

  return {
    id: galleryID.toString(),
    page: pageIndex + 1,

    url: `/resource/nhentai/${urlParts.slice(4, 6).join('/')}`,
    source: `${galleryID}/${pageIndex + 1}`
  }
}

// The nHentai driver.
export default {
  id: 'nhentai',
  name: 'nHentai',

  async next(source) {
    const parts = source.split('/').map((part) => part.trim()).filter((part) => part.length > 0)

    if (parts.length > 0) {
      if (current === null || parts[0] !== current.id) {
        current = {
          id: parts[0],
          pages: (await (await fetch(`/api/drivers/nhentai/pages/${parts[0]}`)).json()).map((url: string) => `/resource/nhentai/${url.split('/').slice(4, 6).join('/')}`),

          index: (parts.length > 1) ? parseInt(parts[1]) - 1 : 0,
          cacheIndex: (parts.length > 1) ? parseInt(parts[1]) - 1 : 0
        }
      } else {
        const index = (isNaN(parseInt(parts[1]))) ? 1 : parseInt(parts[1]) - 1

        current.index = (index === current.index) ? current.index + 1 : index
      }

      if (current.index >= current.pages.length) {
        current = null

        return await this.next('')
      }

      return {
        id: current.id,
        page: current.index + 1,

        url: current.pages[current.index],
        source: `${current.id}/${current.index + 1}`
      }      
    }

    if (cache.length > 0) {
      return Object.assign(cache.splice(0, 1)[0], { source: '' })
    }

    return Object.assign(await fetchRandomGallery(), { source: '' })
  },

  async preload(amount) {
    if (current === null) {
      if (cache.length < amount) {
        const info = cache[cache.push(await fetchRandomGallery()) - 1]

        return {
          id: info.id,
          page: info.page,

          url: info.url,
          amount: cache.length
        }
      }
    } else {
      if (current.cacheIndex < Math.min(current.index + amount, current.pages.length)) {
        current.cacheIndex++

        return {
          id: current.id,
          page: current.cacheIndex,

          url: current.pages[current.cacheIndex - 1],
          amount: current.cacheIndex - current.index
        }
      }
    }
  }
} as Driver
