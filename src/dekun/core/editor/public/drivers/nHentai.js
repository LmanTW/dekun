// The nHentai driver.
export default class {
  static latest = null
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
            pages: await (await fetch(`/drivers/nHentai/pages/${parts[0]}`)).json(),

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
          const urlParts = this.current.pages[this.current.cacheIndex].split('/')

          fetch(`/drivers/nHentai/image/${urlParts.slice(4, 6).join('/')}`)

          this.current.cacheIndex++
        }

        if (this.current.index >= this.current.pages.length) {
          this.current = null

          return this.next('')
        } else {
          const urlParts = this.current.pages[this.current.index].split('/') 

          return {
            name: `nHentai-${this.current.id}-${this.current.index + 1}`,
            url: `/drivers/nHentai/image/${urlParts.slice(4, 6).join('/')}`,

            display: `${this.current.id}/${this.current.index + 1}`,
            value: `${this.current.id}/${this.current.index + 1}`
          }
        }
      } catch (error) {
        this.current = null
      }
    } else {
      if (this.queue.length > 0) {
        const current = this.queue[0]

        this.queue.splice(0, 1)

        return current
      } else {
        try {
          if (this.latest === null) {
            this.latest = await (await fetch('/drivers/nHentai/latest')).json()
          }

          const galleryID = Math.round(Math.random() * this.latest)
          const galleryPages = await (await fetch(`/drivers/nHentai/pages/${galleryID}`)).json()
    
          if (Array.isArray(galleryPages)) {
            const pageIndex = Math.floor(Math.random() * galleryPages.length)
            const urlParts = galleryPages[pageIndex].split('/')

            return {
              name: `nHentai-${galleryID}-${pageIndex + 1}`,
              url: `/drivers/nHentai/image/${urlParts.slice(4, 6).join('/')}`,

              display: `${galleryID}/${pageIndex + 1}`,
              value: ''
            }
          }
        } catch (_) {}
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
            if (this.latest === null) {
              this.latest = await (await fetch('/drivers/nHentai/latest')).json()
            }

            const galleryID = Math.round(Math.random() * this.latest)
            const galleryPages = await (await fetch(`/drivers/nHentai/pages/${galleryID}`)).json()
    
            if (Array.isArray(galleryPages)) {
              const pageIndex = Math.floor(Math.random() * galleryPages.length)
              const urlParts = galleryPages[pageIndex].split('/')

              fetch(`/drivers/nHentai/image/${urlParts.slice(4, 6).join('/')}`)

              this.queue.push({
                name: `nHentai-${galleryID}-${pageIndex + 1}`,
                url: `/drivers/nHentai/image/${urlParts.slice(4, 6).join('/')}`,

                display: `${galleryID}/${pageIndex + 1}`,
                value: ''
              })

              break
            }
          } catch (_) {}
        }
      }
    }

    setTimeout(() => this.checkQueue(), 100)
  }
}
