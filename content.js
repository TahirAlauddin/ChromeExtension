// Variables declaration
let interactivityStyle;
let previewShape;
let extensionIsToggled = true;
let shapes = []; // Array to store drawn shapes
let isCreating = false;
let shapeType = null; // Type of shape being created ('circle' or 'rectangle')
let startPoint = null;
let capturedImages = [];
let cropDimensions = [];
let croppedImgDiv, pageSSImage;
let isBlurred = false;
let pageScreenshot = null; // Variable to store the screenshot
let width = window.screen.width;
let height = window.screen.height;
let shapesHistory = []
let blurExceptionShapes = []
let shapesColor = 'tomato';
let shapeBorderWidth = 5

function createCanvas() {  
  let canvas = document.createElement('canvas');
  // Adjust the temporary canvas size to match the capture area
  canvas.width = document.documentElement.scrollWidth
  canvas.height = document.documentElement.scrollHeight 
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.zIndex = 10.1e4; // Ensure canvas is above everything
  canvas.style.pointerEvents = 'none'; // Allow clicking through the canvas
  document.body.appendChild(canvas)

  return canvas;
}

function createArrow(fromx, fromy, tox, toy) {
  let width = Math.abs(fromx - tox);
  let height = Math.abs(fromy - toy);
  if (width < 10 || height < 10) {
    return null
  }

  let canvas = createCanvas();
  const ctx = canvas.getContext('2d',  {'willReadFrequently': true});
  ctx.strokeStyle = shapesColor; // Replace shapesColor with your color variable
  ctx.lineWidth = shapeBorderWidth;
  ctx.beginPath();
  let headlen = 20; // length of head in pixels
  let dx = tox - fromx;
  let dy = toy - fromy;
  let angle = Math.atan2(dy, dx);
  
  // Start drawing the main line
  ctx.moveTo(fromx, fromy);
  ctx.lineTo(tox, toy);
  
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  // Calculate the offset starting point for the arrowhead
  let offset = 1; // Distance you want to move the head back by
  let arrowBaseX = tox - offset * Math.cos(angle);
  let arrowBaseY = toy - offset * Math.sin(angle);
  
  // Draw the lines for the arrowhead starting from the new offset position
  ctx.moveTo(arrowBaseX, arrowBaseY);
  ctx.lineTo(arrowBaseX - headlen * Math.cos(angle - Math.PI / 6), arrowBaseY - headlen * Math.sin(angle - Math.PI / 6));
  
  ctx.moveTo(arrowBaseX, arrowBaseY);
  ctx.lineTo(arrowBaseX - headlen * Math.cos(angle + Math.PI / 6), arrowBaseY - headlen * Math.sin(angle + Math.PI / 6));
  
  // Apply the stroke to the path
  ctx.stroke();
  

  return canvas;
}

function drawShape(type, x, y, width, height) {
  
  const shapeDiv = document.createElement('div');
  shapeDiv.style.position = 'absolute';
  shapeDiv.style.left = `${x}px`;
  shapeDiv.style.top = `${y}px`;
  shapeDiv.style.zIndex = 10e4
  shapeDiv.style.borderWidth = `${shapeBorderWidth}px`

  if (type === 'circle') {
    shapeDiv.style.width = `${width}px`;
    shapeDiv.style.height = `${height}px`; // Make height equal to width for a circle
    shapeDiv.style.borderRadius = '50%';
  } else if (type === 'rectangle') {
    shapeDiv.style.width = `${width}px`;
    shapeDiv.style.height = `${height}px`;
    shapeDiv.style.borderRadius = `8px`
  }  else if (type === 'triangle') {
    shapeDiv.style = `border-left: 50px solid ${shapesColor}; border-right: 50px solid ${shapesColor}; border-bottom: 100px solid ${shapesColor}` 
    shapeDiv.style.width = `${width}px`;
    shapeDiv.style.height = `${height}px`;
  }

  return shapeDiv
}

// Utility function to create a shape
function createShape(type, x, y, width, height) {
  
  if (width < 10 || height < 10) {
    return null;
  }

  const shapeDiv = drawShape(type, x, y, width, height) 

  //? Keep adding images to the dimensions list, for later cropping
  cropDimensions.push(
    { x: x-10, y: y, width: width+10, height: height+10, type: type }
  )
  
  shapeDiv.style.backgroundColor = 'transparent';
  shapeDiv.style.border = `${shapeBorderWidth}px solid ` + shapesColor || 'lightblue'; // Use global color or default
  shapeDiv.classList.add('shape');
  document.body.appendChild(shapeDiv);
  shapes.push(shapeDiv);
  return shapeDiv;
}

// Function to handle the start of shape creation
function startCreatingShape(e) {
  if (!shapeType) return; // Exit if no shape type is selected

  isCreating = true;
  startPoint = { x: e.pageX, y: e.pageY };
}


function moveShape(e) {
  
  if (isCreating && startPoint) {
    
    const [adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight] = getDimensions(e); 
    drawShapePreview(e, adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight);

  }

}

function drawShapePreview(e, adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight) {
  
  if (previewShape) {
    previewShape.remove()
    previewShape = null
  }
  if (shapeType === 'circle' || shapeType === 'rectangle') {
      previewShape = drawShape(shapeType, adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight)
      previewShape.style.border = `${shapeBorderWidth}px solid ` + shapesColor || 'lightblue'; // Use global color or default
  }
  else if (shapeType === 'triangle')
    previewShape = createTriangle(adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight);
  else if (shapeType == 'textbox') {
    previewShape = createTextBox(adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight);
    if (previewShape) {
      previewShape.addEventListener('focusin', () => {
        shapeType = null;
        document.removeEventListener('keydown', keypressHandler)
      })
      previewShape.addEventListener('focusout', () => {
        document.addEventListener('keydown', keypressHandler)   
      })
    }

  }
  

  else if (shapeType === 'arrow') 
    previewShape = createArrow(startPoint.x, startPoint.y, e.pageX, e.pageY);

  if (previewShape) {
    previewShape.style.backgroundColor = 'transparent';
    previewShape.classList.add('shape');
    document.body.appendChild(previewShape)
  }
}

function getDimensions(e) {
  const width = e.pageX - startPoint.x;
  const height = e.pageY - startPoint.y;

  // Adjust dimensions for positive values and correct positioning
  const adjustedStartX = width < 0 ? e.pageX : startPoint.x;
  const adjustedStartY = height < 0 ? e.pageY : startPoint.y;
  const adjustedWidth = Math.abs(width);
  const adjustedHeight = Math.abs(height);

  return [adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight]
}

// Modified stopCreatingShape function to include triangle creation
function stopCreatingShape(e) {
    if (!isCreating || !startPoint) return;
  
    if (previewShape) {
      previewShape.remove()
      previewShape = null
    }

  
    let shape;    
    const [adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight] = getDimensions(e);
  
    if (shapeType === 'circle' || shapeType === 'rectangle') {
      shape = createShape(shapeType, adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight);
      blurExceptionShapes.push(shape)
    } else if (shapeType === 'triangle') {
      shape = createTriangle(adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight);
    } else if (shapeType == 'textbox') {
      shape = createTextBox(adjustedStartX, adjustedStartY, adjustedWidth, adjustedHeight);
      if (shape) {
        shape.addEventListener('focusin', () => {
          shapeType = null;
          document.removeEventListener('keydown', keypressHandler)
        })
        shape.addEventListener('focusout', () => {
          document.addEventListener('keydown', keypressHandler)   
        })
      }
  
    } else if (shapeType === 'arrow') {
      shape = createArrow(startPoint.x, startPoint.y, e.pageX, e.pageY);
    }
    
    if (shape) {
      shapesHistory.push(shape)
    }
    // Reset state
    isCreating = false;
    startPoint = null;
  }


  function extractShapesInfo(divElements) {
    const shapes = divElements.map(div => {
      // Skip if div is falsy
      if (!div) {
        return null; // Use 'null' as a placeholder for items to skip
      }
      
      const style = window.getComputedStyle(div);
      const x = parseInt(style.left, 10);
      const y = parseInt(style.top, 10);
      const width = parseInt(style.width, 10);
      const height = parseInt(style.height, 10);
      const borderRadius = style.borderRadius;
    
      // Check if the border-radius is 50% to determine if the shape is a circle
      const shape = borderRadius === '50%' ? 'circle' : 'rectangle';
    
      return { x, y, width, height, shape };
    }).filter(shape => shape !== null); // Filter out the 'null' placeholders
    
    // Now, shapes array will only contain valid shapes objects, skipping over undefined or null divs.    
    console.log(shapes)
    return shapes;
  }


function keypressHandler(e) {

  if (e.key === 'c' || e.key === 'C') {
    if (shapeType === 'circle') {
      shapeType = null;
    } else {
      shapeType = 'circle';
    }
  } else if (e.key === 'r' || e.key === 'R') {
    if (shapeType === 'rectangle') {
      shapeType = null
    } else {
      shapeType = 'rectangle';
    }
  } else if (e.key === 'Escape') {
    disableExtension()    
  } else if (e.key === 'w' || e.key === 'W') {
    if (shapeType === 'textbox') {
      shapeType = null
    } else {
      shapeType = 'textbox'
    }
    } else if (e.key === 'b' || e.key === 'B') { 
      
    const shapesList = extractShapesInfo(blurExceptionShapes);
    let polygonDiv = document.getElementById('polygon-div');
    
    let width = document.documentElement.scrollWidth
    let height = document.documentElement.scrollHeight
  
    if (shapesList) {
      blurScreen(shapesList, width, height)
    }
    polygonDiv.classList.toggle('blur-div-ammotation')

  } else if (e.key === 'a' || e.key === 'A') {
    if (shapeType === 'arrow') {
      shapeType = null
    } else {
      shapeType = 'arrow'
    }
  } else if (e.key === 'Backspace') {

    let shape = shapesHistory.pop()
    if (blurExceptionShapes.includes(shape)) {
      blurExceptionShapes.pop()
    }
    if (shape) 
      shape.remove()
  } 
}


// Function to create a triangle
function createTriangle(x, y, width, height) {
  
  if (width < 10 || height < 10) {
    return null;
  }  
    
  const shapeDiv = document.createElement('div');
    shapeDiv.style.position = 'absolute';
    shapeDiv.style.left = `${x}px`;
    shapeDiv.style.top = `${y}px`;
    shapeDiv.style.width = `0px`;
    shapeDiv.style.height = `0px`;
    shapeDiv.style.borderLeft = `${width / 2}px solid transparent`;
    shapeDiv.style.borderRight = `${width / 2}px solid transparent`;
    shapeDiv.style.borderBottom = `${height}px solid ${shapesColor || 'lightblue'}`; // Use global color or default
    shapeDiv.style.zIndex = 10.1e4;
    shapeDiv.classList.add('shape');
    document.body.appendChild(shapeDiv);
    shapes.push(shapeDiv);
    return shapeDiv;
}  

  
function createTextBox(x, y, width, height) {
    // Create an input element
    if (width < 10 || height < 10) {
      return null
    }
    const input = document.createElement('div');
    input.contentEditable = true;
    input.type = 'text';
    input.className = 'canvas-input'; // Assign class for styling
    input.style.position = 'absolute'
    input.style.left = x + 'px';
    input.style.top = y + 'px';
    input.style.width = width + 'px';
    input.style.height = height + 'px';
    input.style.fontSize = '18px';
    input.style.fontFamily = 'sans-serif';
    input.style.color = shapesColor;
    input.style.padding = '8px';
    input.style.border = `${shapeBorderWidth}px solid ${shapesColor}`;
    input.style.borderRadius = '5px';
    input.placeholder = 'Enter message here...';
    input.style.zIndex = 10.1e4
    input.style.outline = 'none'
    input.style.overflow = 'auto'

    // Append the input to the body or a specific container
    document.body.appendChild(input);
    return input
}


function setupDocumentInteractivity() {
    // Create and append a style element to the document head for CSS rules
    interactivityStyle = document.createElement('style');
    document.head.appendChild(interactivityStyle);
    // Insert CSS rules to prevent user selection
    interactivityStyle.sheet.insertRule(`.polygon-div {
      position: absolute;
      top: 0;
      left: 0;
      width: ${document.documentElement.scrollWidth}px;
      height: ${document.documentElement.scrollHeight}px;
      z-index: 99999;
    }`, 0)
    interactivityStyle.sheet.insertRule(`* {
        -webkit-user-select: none; /* Chrome, Safari, Opera */
        -moz-user-select: none; /* Firefox */
        -ms-user-select: none; /* Internet Explorer */
        user-select: none; /* Non-prefixed version, currently supported by Chrome, Edge, Opera and Firefox */
    }`, 1);
    interactivityStyle.sheet.insertRule(`.blur-div-ammotation {
      backdrop-filter: blur(10px);
    }`, 2)
 
}

function resetAll() {
  shapesHistory.forEach((shape) =>
    shape.remove())
  shapesHistory = [];
  blurExceptionShapes = [];
  let polygonDiv = document.getElementById('polygon-div')
  if (polygonDiv) {
    polygonDiv.style.clipPath = '';
    polygonDiv.classList.remove('blur-div-ammotation')
  }
}

function enableExtension() {
  // Execute the function to apply settings
  setupDocumentInteractivity();

  // Modified event listener for keydown to include triangle
  document.addEventListener('keydown', keypressHandler)
  // Example usage and event listeners
  document.addEventListener('mousedown', startCreatingShape);
  document.addEventListener('mousemove', moveShape);
  document.addEventListener('mouseup', stopCreatingShape);

  document.getElementById('polygon-div').style.display = 'block'
}


function disableExtension () {
  resetAll()
  document.removeEventListener('keydown', keypressHandler);
  document.removeEventListener('mousedown', startCreatingShape);
  document.removeEventListener('mousemove', moveShape);
  document.removeEventListener('mouseup', stopCreatingShape);
  extensionIsToggled = false;

  if (interactivityStyle) 
    interactivityStyle.sheet.deleteRule(1)
  document.getElementById('polygon-div').style.display = 'none'

}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.action) {
      case 'changeColor':
        console.log('its coming here')
        if (/^#[0-9A-F]{6}$/i.test(message.color) || /^[a-zA-Z]+$/.test(message.color)) {
          // Apply the color
          sendResponse({status: "Color changed to " + message.color});
          shapesColor = message.color;
          console.log('color changed yay')
        } else {
          console.log('invalid color')
          sendResponse({status: "Invalid color value"});
        }
        break;
    default:
      console.log('Unknown action:', message.action);
  }
});


document.addEventListener('keydown', function(event) {
  // Check if Control (or Command in Mac) and Alt (Option in Mac) are pressed along with 'A'
  // if ((event.ctrlKey || event.metaKey) && event.altKey && event.key === 'a') {
  // if (event.ctrlKey && event.metaKey && event.key === 'a') {
  if (event.ctrlKey && event.shiftKey && event.key === 'a') {

    console.log('Control + Alt + A was pressed');
    if (extensionIsToggled) {
      extensionIsToggled = false; 
      console.log("Disabled")
      disableExtension()
    }
    else {
        console.log("Enabled")
        enableExtension();
        extensionIsToggled = true
      }
    }
});


document.addEventListener('DOMContentLoaded', () => {
  let div = document.createElement('div')
  div.classList.add('polygon-div')
  div.id = 'polygon-div'
  document.body.appendChild(div)

  

  if (extensionIsToggled) {
    enableExtension()
  }
})