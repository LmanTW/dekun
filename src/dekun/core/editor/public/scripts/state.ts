import { signal } from '@preact/signals'

import { Combination, keysToCombination } from '../components/Keybinds'
import Image from './image'

// Recover states from the local storage.
function recoverStates <T extends object> (name: string, value: T): T {
  if (localStorage.hasOwnProperty(name)) {
    return Object.assign(value, JSON.parse(localStorage.getItem(name)!))
  }

  return value  
}

const layout = signal<{
  help: boolean,
  settings: boolean,
  keybinds: boolean,
  entries: boolean
}>({
  help: false,
  settings: false,
  keybinds: false,
  entries: false
})

const defaultSettings: {
  username: string,

  fps: number,
  resolution: number,
  preload: number,

  trackpad: boolean,
  moveSpeed: number,
  scaleSpeed: number,

  randomStrokes: boolean,
  reduceTransparency: boolean
} = {
  username: 'unknown',

  fps: 0,
  resolution: window.devicePixelRatio,
  preload: 5,

  trackpad: false,
  moveSpeed: 1,
  scaleSpeed: 1,

  randomStrokes: false,
  reduceTransparency: false
}

const defaultKeybinds: {
  moveLeft: Combination,
  moveRight: Combination,
  moveUp: Combination,
  moveDown: Combination,
  zoomIn: Combination,
  zoomOut: Combination,
  resetCamera: Combination,

  changeStrokeType1: Combination,
  changeStrokeType2: Combination,
  changeStrokeType3: Combination,
  increaseStrokeSize: Combination,
  decreaseStrokeSize: Combination,
  changeStrokeOpacity: Combination,
  changeImageFilter: Combination,

  undoLastAction: Combination,
  skipImage: Combination,
  submitImage: Combination
} = {
  moveLeft: keysToCombination(['a']),
  moveRight: keysToCombination(['d']),
  moveUp: keysToCombination(['w']),
  moveDown: keysToCombination(['s']),
  zoomIn: keysToCombination(['e']),
  zoomOut: keysToCombination(['q']),
  resetCamera: keysToCombination(['r']),

  changeStrokeType1: keysToCombination(['1']),
  changeStrokeType2: keysToCombination(['2']),
  changeStrokeType3: keysToCombination(['3']),
  increaseStrokeSize: keysToCombination(['=']),
  decreaseStrokeSize: keysToCombination(['-']),
  changeStrokeOpacity: keysToCombination(['f']),
  changeImageFilter: keysToCombination(['v']),

  undoLastAction: keysToCombination(['x']),
  skipImage: keysToCombination(['z']),
  submitImage: keysToCombination(['c'])
}

const settings = signal<typeof defaultSettings>(recoverStates('settings', defaultSettings))
const keybinds = signal<typeof defaultKeybinds>(recoverStates('keybinds', defaultKeybinds))

const source = signal<{
  driver: string,

  value: string,
  display: string,

  locked: boolean,
  duplicate: boolean
}>(recoverStates('source', {
  driver: Object.keys(Image.drivers)[0],

  value: '',
  display: '',

  locked: false,
  duplicate: false
}))

// All the global states.
export default class {
  public static get layout() {return layout.value}
  public static get settings() {return settings.value}
  public static get keybinds() {return keybinds.value}
  public static get source() {return source.value}

  public static get layoutSignal() {return layout}
  public static get settingsSignal() {return settings}
  public static get keybindsSignal() {return keybinds}
  public static get sourceSignal() {return source}

  public static get defaultSettings() {return defaultSettings}
  public static get defaultKeybinds() {return defaultKeybinds}

  // Update the layout.
  public static updateLayout(modifications: Partial<typeof layout.value>): void {
    layout.value = { ...layout.value, ...modifications }
  }

  // Update the settings.
  public static updateSettings(modifications: Partial<typeof settings.value>): void {
    settings.value = { ...settings.value, ...modifications }

    localStorage.setItem('settings', JSON.stringify(settings.value))
  }

  // Update the keybind.
  public static updateKeybind(modifications: Partial<typeof keybinds.value>): void {
    keybinds.value = { ...keybinds.value, ...modifications }

    localStorage.setItem('keybinds', JSON.stringify(keybinds.value))
  }

  // Update the source.
  public static updateSource(modifications: Partial<typeof source.value>): void {
    source.value = { ...source.value, ...modifications }

    localStorage.setItem('source', JSON.stringify(source.value))
  }
}
