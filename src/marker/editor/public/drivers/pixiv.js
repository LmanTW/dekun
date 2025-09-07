// The Pixiv driver.
export default class {
  static current = null
  static queue = null

  // Get the next image.
  static async next(source) {
    if (this.queue === null) {
      await this.checkQueue()
    }

    if (source.length > 0) {
      const parts = source.split('/')

      try {
        if (this.current === null || this.current.id !== parts[0]) {
          this.current = {
            id: parts[0],
            pages: (await (await fetch(`/drivers/pixiv/pages/${parts[0]}`)).json()).body,

            index: (parts.length > 1) ? parseInt(parts[1]) - 1 : 0,
            cacheIndex: (parts.length > 1) ? parseInt(parts[1]) - 1 : 0
          }
        } else if (parts.length > 1) {
          const index = parseInt(parts[1]) - 1

          if (index === this.current.index) {
            this.current.index += 1
          } else {
            this.current.index = parseInt(parts[1]) - 1
          }
        }

        while (this.current.cacheIndex < Math.min(this.current.index + 5, this.current.pages.length)) {
          const urlParts = this.current.pages[this.current.cacheIndex].urls.original.split('/')

          fetch(`/drivers/pixiv/image/${urlParts.slice(5, 11).join('-')}/${urlParts[11]}`)

          this.current.cacheIndex++
        }

        if (this.current.index >= this.current.pages.length) {
          this.current = null

          return this.next('')
        } else {
          const urlParts = this.current.pages[this.current.index].urls.original.split('/') 

          return {
            name: `nHentai-${this.current.id}-${this.current.index + 1}`,
            url: `/drivers/pixiv/image/${urlParts.slice(5, 11).join('-')}/${urlParts[11]}`,

            display: `${this.current.id}/${this.current.index + 1}`,
            value: `${this.current.id}/${this.current.index + 1}`
          }
        }
      } catch (error) {
        console.log(error)

        this.current = null
      }
    } else {
      if (this.queue.length > 0) {
        const current = this.queue[0]

        this.queue.splice(0, 1)

        return current
      } else {
        try {
          const illustration = (await (await fetch('/drivers/pixiv/discovery')).json()).body.illusts[0]
          const illustrationPages = (await (await fetch(`/drivers/pixiv/pages/${illustration.id}`)).json()).body
          const pageIndex = Math.floor(Math.random() * illustration.pageCount)
          const urlParts = illustrationPages[pageIndex].urls.original.split('/')

          return {
            name: `pixiv-${illustration.id}-${pageIndex + 1}`,
            url: `/drivers/pixiv/image/${urlParts.slice(5, 11).join('-')}/${urlParts[11]}`,

            display: `${illustration.id}/${pageIndex + 1}`,
            value: ''
          }
        } catch (error) {}
      } 
    }

    return await this.next('')
  }

  // Check the queue.
  static async checkQueue() {
    if (this.queue === null) {
      this.queue = []
    }

    if (this.queue.length < 5) {
      if (this.current === null) {
        while (true) {
          try {
            const illustration = (await (await fetch('/drivers/pixiv/discovery')).json()).body.illusts[0]
            const illustrationPages = (await (await fetch(`/drivers/pixiv/pages/${illustration.id}`)).json()).body
            const pageIndex = Math.floor(Math.random() * illustration.pageCount)
            const urlParts = illustrationPages[pageIndex].urls.original.split('/')

            fetch(`/drivers/pixiv/image/${urlParts.slice(5, 11).join('-')}/${urlParts[11]}`)

            this.queue.push({
              name: `pixiv-${illustration.id}-${pageIndex + 1}`,
              url: `/drivers/pixiv/image/${urlParts.slice(5, 11).join('-')}/${urlParts[11]}`,

              display: `${illustration.id}/${pageIndex + 1}`,
              value: ''
            })

            break
          } catch (_) {}
        }
      }
    }

    setTimeout(() => this.checkQueue(), 100)
  }
}
