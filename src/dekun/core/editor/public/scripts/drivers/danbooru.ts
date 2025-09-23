import { type Driver } from '../image'

const cache: {
  id: string,
  page: number,

  url: string,
  source: string  
}[] = []

// Fetch a random post.
async function fetchRandomPost(): Promise<{ id: string, page: number, url: string, source: string }> {
  const postID = await (await fetch('/api/drivers/danbooru/random')).text()
  const post = await (await fetch(`/api/drivers/danbooru/post/${postID}`)).json()

  return {
    id: postID,
    page: 1,

    url: `/resource/danbooru/${post.file_url.substring(post.file_url.lastIndexOf('/') + 1)}`,
    source: `${postID}/1`
  }
}

// The danbooru driver.
export default {
  id: 'danbooru',
  name: 'Danbooru',

  async next(source) {
    const parts = source.split('/').map((part) => part.trim()).filter((part) => part.length > 0)

    if (parts.length > 0) {
      const post = await (await fetch(`/api/drivers/danbooru/post/${source[0]}`)).json()

      return {
        id: source[0],
        page: 1,

        url: `/resource/danbooru/${post.file_url.substring(post.file_url.lastIndexOf('/') + 1)}`,
        source: `${source[0]}/1`
      }
    }

    if (cache.length > 0) {
      return Object.assign(cache.splice(0, 1)[0], { source: '' })
    }

    return Object.assign(await fetchRandomPost(), { source: '' })
  },

  async preload(amount) {
    if (cache.length < amount) {
      const info = cache[cache.push(await fetchRandomPost()) - 1]

      return {
        id: info.id,
        page: info.page,

        url: info.url,
        amount: cache.length
      }
    }
  }
} as Driver
