import { signal } from '@preact/signals'

import Image from './image'
import { ParamHTMLAttributes } from 'react-dom/src'

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
  tasks: boolean,

  entries: boolean
}>({
  help: false,
  settings: false,
  tasks: false,

  entries: false
})

const settings = signal<{
  username: string,

  fps: number,
  resolution: number,
  preload: number,

  moveSpeed: number,
  scaleSpeed: number,

  reduceTransparency: boolean
}>(recoverStates('settings', {
  username: 'unknown',

  fps: 0,
  resolution: window.devicePixelRatio,
  preload: 5,

  moveSpeed: 1,
  scaleSpeed: 1,

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

const taskMap: {
  [key: symbol]: Task
} = {}

const taskList = signal<symbol[]>([])

// All the global states.
export default class {
  public static get layout() {return layout.value}
  public static get settings() {return settings.value}
  public static get source() {return source.value}

  public static get taskMap() {return taskMap}
  public static get taskList() {return taskList.value}

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

  // Add a task.
  public static addTask(type: Task['type'], title: string, message: string): symbol {
    const id = Symbol()

    taskMap[id] = {
      type,
      title,
      message
    }

    taskList.value = Reflect.ownKeys(taskMap) as symbol[]

    return id
  }

  // Update a task.
  public static updateTask(id: symbol, modificaitons: Partial<Task>): symbol {
    if (taskMap.hasOwnProperty(id)) {
      taskMap[id] = Object.assign(taskMap[id], modificaitons)
      taskList.value = Reflect.ownKeys(taskMap) as symbol[]
    }

    return id
  }

  // Remove a task.
  public static removeTask(id: symbol): null {
    if (taskMap.hasOwnProperty(id)) {
      delete taskMap[id]

      taskList.value = [...taskList.value.slice(0, taskList.value.indexOf(id)), ...taskList.value.slice(taskList.value.indexOf(id) + 1)]
    }

    return null
  }
}

// The data structure of a task.
interface Task {
  type: 'success' | 'error' | 'warning',
  title: string,
  message: string
}
