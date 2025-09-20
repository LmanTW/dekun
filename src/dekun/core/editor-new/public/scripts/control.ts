// The control.
class Control {
  public static mouse = {
    clicked: false,
    pressed: false,

    editorX: 0,
    editorY: 0,

    imageX: 0,
    imageY: 0
  }

  public static keyboard = {}

  // Update the control.
  public static update(_: number): void {

  }
}

export default Control
