import { signal } from '@preact/signals'

import Image from './image'

// Recover states from the local storage.
function recoverStates <T> (name: string, value: T): T {
  if (localStorage.hasOwnProperty(name)) {
    return JSON.parse(localStorage.getItem(name)!)
  }

  return value  
}

const layout = signal<{
  help: boolean,
  settings: boolean,
  entries: boolean
}>({
  help: false,
  settings: false,
  entries: false
})

const settings = signal<{
  username: string,

  fps: number,
  resolution: number,
  preload: number,

  moveSpeed: number,
  scaleSpeed: number,

  randomStrokes: boolean,
  reduceTransparency: boolean
}>(recoverStates('settings', {
  username: 'unknown',

  fps: 0,
  resolution: window.devicePixelRatio,
  preload: 5,

  moveSpeed: 1,
  scaleSpeed: 1,

  randomStrokes: false,
  reduceTransparency: false
}))

const source = signal<{
  driver: string,

  value: string,
  display: string
}>(recoverStates('source', {
  driver: Object.keys(Image.drivers)[0],

  value: '',
  display: ''
}))

// All the global states.
export default class {
  public static get layout() {return layout.value}
  public static get settings() {return settings.value}
  public static get source() {return source.value}

  public static get layoutSignal() {return layout}
  public static get settingsSignal() {return settings}
  public static get sourceSignal() {return source}

  // Update the layout.
  public static updateLayout(modificaitons: Partial<typeof layout.value>): void {
    layout.value = { ...layout.value, ...modificaitons }
  }

  // Update the settings.
  public static updateSettings(modificaitons: Partial<typeof settings.value>): void {
    settings.value = { ...settings.value, ...modificaitons }

    localStorage.setItem('settings', JSON.stringify(settings.value))
  }

  // Update the source.
  public static updateSource(modificaitons: Partial<typeof source.value>): void {
    source.value = { ...source.value, ...modificaitons }

    localStorage.setItem('source', JSON.stringify(source.value))
  }
}
