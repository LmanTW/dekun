// The nHentai driver.
export default class {
  static latest = null
  static current = null

  // Get the next image.
  static async next(source) {
    if (source.length > 0) {
      const parts = source.split('/')

      try {
        if (this.current === null || this.current.id !== parts[0]) {
          this.current = {
            id: parts[0],

            pages: await (await fetch(`/drivers/nHentai/pages/${parts[0]}`)).json(),
            index: (parts.length > 1) ? parseInt(parts[1]) : 0
          }
        }

        if (this.current.index >= this.current.pages.length) {
          return this.next('')
        } else {
          const urlParts = this.current.pages[this.current.index].split('/')

          this.current.index += 1

          return {
            name: `${this.current.id}-${this.current.index + 1}`,
            url: `/drivers/nHentai/image/${urlParts.slice(4, 6).join('/')}`,

            source: `${this.current.id}/${this.current.index}`,
            update: true
          }
        }

      } catch (_) {
        this.current = null
      }
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
            name: `${galleryID}-${pageIndex + 1}`,
            url: `/drivers/nHentai/image/${urlParts.slice(4, 6).join('/')}`,

            source: `${galleryID}/${pageIndex + 1}`,
            update: false
          }
        }
      } catch (error) {
        console.log(error)
      }
    }

    return await this.next('')
  }
}
