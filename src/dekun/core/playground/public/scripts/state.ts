import { signal } from '@preact/signals'

// Recover states from the local storage.
function recoverStates <T> (name: string, value: T): T {
  if (localStorage.hasOwnProperty(name)) {
    return JSON.parse(localStorage.getItem(name)!)
  }

  return value
}

const layout = signal<{

}>({

})

const defaultSettings: {
  reduceTransparency: boolean
} = {
  reduceTransparency: false
}

const settings = signal<typeof defaultSettings>(recoverStates('settings', defaultSettings))

// All the global states.
export default class {
  public static get layout() {return layout.value}
  public static get settings() {return settings.value}

  // Update the settings.
  public static updateSettings(modificaitons: Partial<typeof settings.value>): void {
    settings.value = { ...settings.value, ...modificaitons }

    localStorage.setItem('settings', JSON.stringify(settings.value))
  }
}
