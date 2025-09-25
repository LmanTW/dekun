import { render } from 'preact'

import Navbar from './components/Navbar'

render(<Navbar/>, document.getElementById('container-navbar')!)

// Every stage shows all the images.
//
// [Image Upload Stage]
//
// Drag and drop and button for adding images.
// A button to mark the images -> [Image Result Stage]
// A button to inpaint the images -> [Image Edit Stage]
//
// [Image Edit Stage]
//
// When images are clicked it gets expended:
//   | A button to download the image or mask depdning on the "process mode".
//   | A canvas for the editing the mask manually.
//   |
//   | (Maybe use the layout like in the entries viewer)
// A button to process the images depending on the "process mode".
//  | Mark Mode: After processing -> [Image Edit Stage]
//  | Inpaint Mode: [Image Result Stage]
//
// Process the images depending on
//
// [Image Result Stage] 
//
//   | A button to download the image.
//   |
//   | (Maybe use the layout like in the entries viewer) 
