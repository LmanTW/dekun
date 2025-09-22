import { type Driver } from '../image'

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

// Fetch a random illustration.
async function fetchRandomIllustration(): Promise<{ id: string, page: number, url: string, source: string }> {
  const illustrations = (await (await fetch('/api/drivers/pixiv/discovery')).json()).body.illusts
  const illustration = illustrations[Math.floor(Math.random() * illustrations.length)]
  const illustrationPages = (await (await fetch(`/api/drivers/pixiv/pages/${illustration.id}`)).json()).body
  const pageIndex = Math.floor(Math.random() * illustration.pageCount)
  const urlParts = illustrationPages[pageIndex].urls.original.split('/')

  return {
    id: `${illustration.id}`,
    page: pageIndex + 1,

    url: `/resource/pixiv/${urlParts.slice(5, 11).join('-')}/${urlParts[11]}`,
    source: `${illustration.id}/${pageIndex + 1}`
  }
}

// The pixiv driver.
export default {
  id: 'pixiv',
  name: 'Pixiv',

  async next(source) {
    const parts = source.split('/').map((part) => part.trim()).filter((part) => part.length > 0)

    if (parts.length > 0) {
      if (current === null || parts[0] !== current.id) {
        current = {
          id: parts[0],
          pages: (await (await fetch(`/api/drivers/pixiv/pages/${parts[0]}`)).json()).body.map((page: { urls: { original: string }}) => {
            const urlParts = page.urls.original.split('/')

            return `/resource/pixiv/${urlParts.slice(5, 11).join('-')}/${urlParts[11]}`
          }),

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

    return Object.assign(await fetchRandomIllustration(), { source: '' })
  },

  preload: async (amount) => {
    if (current === null) {
      if (cache.length < amount) {
        const info = cache[cache.push(await fetchRandomIllustration()) - 1]

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

    return null
  }
} as Driver
