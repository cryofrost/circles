import * as glLib from './libs/gl.js';
import * as twgl from './node_modules/twgl.js/dist/5.x/twgl-full.module.js';

// Магноцеллюлярные слои обрабатывают информацию о движении, скорости и временных изменениях. 
// имеют более высокую временную, но более низкую пространственную разрешающую способность.
// Парвоцеллюлярные слои обрабатывают информацию о мелких деталях и цветах. 
// имеют более высокую пространственную, но более низкую временную разрешающую способность.


document.addEventListener('DOMContentLoaded', function() {


  // Utility function to create a DOM element
  function createElement(tag, attributes, ...children) {
    const element = document.createElement(tag);
    // Sort attributes alphabetically, just to set value after min and max
    const sortedAttributes = Object.entries(attributes || {}).sort(([a], [b]) => a.localeCompare(b));

    for (const [key, value] of sortedAttributes) {
      if (key.startsWith('on')) {
        element.addEventListener(key.substring(2).toLowerCase(), value);
      } else if (key in element && typeof value !== 'string') {
        element[key] = value; // Directly set the property if it exists on the element
      } else {
        element.setAttribute(key, value); // Use setAttribute for other attributes
      }
    }
    for (const child of children) {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    }
    return element;
  }


  function updateLayerControls() {
    const layersContainer = document.getElementById('layers');
    layersContainer.innerHTML = ''; // Clear existing controls

    layers.forEach((layer, index) => {
      const speedInput = createElement('input', {
        type: 'range',
        value: layer.speed,
        min: 0.1,
        max: 10,
        step: 0.1
      });
      speedInput.addEventListener('change', (e) => updateLayerSpeed(layer, e.target.value));

      const opacityInput = createElement('input', {
        type: 'range',
        value: layer.opacity,
        min: 0,
        max: 1,
        // onchange: (e) => console.log(e.target.value),
        step: 0.1
      });
      opacityInput.addEventListener('change', (e) => updateLayerOpacity(layer, e.target.value));
      
      const numberInput = createElement('input', {
        type: 'range',
        value: layer.number,
        min: 1,
        max: 420,
        // onchange: (e) => console.log(e.target.value),
        step: 1
      });
      numberInput.addEventListener('change', (e) => updateLayerNumber(layer, e.target.value));

      // const spinInput = createElement('label', {}, 'Spin: ', createElement('input', {
      //   type: 'radio',
      //   onchange: (e) => updateLayerSpin(layer, e.target.value),
      //   name: `spin-${index}-neg`,
      //   value: -1,
      //   checked: layer.spin === -1,
      // }),
      //   createElement('input', {
      //     type: 'radio',
      //     onchange: (e) => updateLayerSpin(layer, e.target.value),
      //     name: `spin-${index}-pos`,
      //     value: 1,
      //     checked: layer.spin === 1,
      //   }));


      const layerDiv = createElement('div', {
        class: 'layer', draggable: true
      },
        createElement('label', {}, 'Type: ',
          createElement('select', {
            onchange: (e) => updateLayerType(layer, e.target.value),
            value: layer.type
          },
            createElement('option', {
              value: 'circles',
              selected: layer.type === 'circles'
            }, 'Circles'),
            createElement('option', {
              value: 'mantras',
              selected: layer.type === 'mantras'
            }, 'Mantras'),
            createElement('option', {
              value: 'mantrasGL',
              selected: layer.type === 'mantrasGL'
            }, 'MantrasGL'),
            createElement('option', {
              value: 'lines',
              selected: layer.type === 'lines'
            }, 'Lines')
          )
        ),
        createElement('label', {}, 'Speed: ', speedInput),
        createElement('label', {}, 'Number: ', numberInput, ` ${layer.number}`),
        createElement('label', {}, 'Spin: ', createElement('input', {
          type: 'radio',
          onchange: (e) => updateLayerSpin(layer, e.target.value),
          name: `spin-${index}`,
          value: -1,
          checked: layer.spin === -1,
        }),
          createElement('input', {
            type: 'radio',
            onchange: (e) => updateLayerSpin(layer, e.target.value),
            name: `spin-${index}`,
            value: 1,
            checked: layer.spin === 1,
          })),
        createElement('label', {}, 'Opacity: ', opacityInput)
      );
      layerDiv.addEventListener('dragstart', (e) => onDragStart(e, index));
      layerDiv.addEventListener('dragover', (e) => e.preventDefault());
      layerDiv.addEventListener('drop', (e) => onDrop(e, index));
      layersContainer.appendChild(layerDiv);
    });
  }

  function recalculateOpacity() {
    layers.forEach((layer, index) => {
      layer.opacity = 1 - index * 0.1;
    });
  }

  function onDragStart(e,
    index) {
    e.dataTransfer.setData('text/plain',
      index);
  }

  function onDrop(e,
    index) {
    const draggedIndex = e.dataTransfer.getData('text/plain');
    if (draggedIndex === index.toString()) {
      return; // Prevent dropping on the same position
    }
    const draggedLayer = layers.splice(draggedIndex, 1)[0];
    layers.splice(index, 0, draggedLayer);
    recalculateOpacity();
    updateLayerControls();
  }

  // Add new layer with specific type and speed
  function addLayer(e) {
    const layer = {
      type: 'lines',
      speed: 1.0,
      number: 420,
      spin: 1,
      opacity: 1.0
    };
    // layer.speed = 1;
    // layer.spin = 1;
    layers.push(layer);
    updateLayerControls();
  }

  function updateLayerType(layer, value) {
    layer.type = value;
  }

  function updateLayerSpeed(layer, value) {
    layer.speed = parseFloat(value);
  }

function updateLayerNumber(layer, value) {
    layer.number = parseInt(value);
  }

  function updateLayerOpacity(layer, value) {
    layer.opacity = parseFloat(value);
  }

  function updateLayerSpin(layer, value) {
    layer.spin = parseInt(value);
  }

  function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, foregroundCanvas.width, foregroundCanvas.height);
    bg_ctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    twgl.resizeCanvasToDisplaySize(glLib.gl.canvas);
    glLib.gl.viewport(0, 0, glLib.gl.canvas.width, glLib.gl.canvas.height);
    glLib.gl.clearColor(0, 0, 0, 0);
    glLib.gl.clear(glLib.gl.COLOR_BUFFER_BIT | glLib.gl.DEPTH_BUFFER_BIT);



    layers.forEach(layer => {
      ctx.save();
      ctx.globalAlpha = layer.opacity;

      switch (layer.type) {
        case 'circles':
          drawCircles(layer);
          break;
        case 'lines':
          drawLines(layer);
          break;
        case 'mantras':
          drawMantras(layer);
          break;
        case 'mantrasGL':
          glLib.drawMantrasGL(layer);
          break;
      }

      ctx.restore();
    });

    requestAnimationFrame(draw);
  }

  function drawMantras(layer) {
    const centerX = foregroundCanvas.width / 2;
    const centerY = foregroundCanvas.height / 2;
    const radius = Math.min(foregroundCanvas.width, foregroundCanvas.height) * 0.4;

    const text = "ॐ आकाश सत्य ओङ्";
    const textLength = text.length;
    const lengthFactor = Math.PI / textLength / 2;
    const speedFactor = 0.001 * layer.speed;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const angleStep = (2 * Math.PI) / textLength;


    for (let i = 0; i < layer.number; i++) {
      const size = 10 + i * 5;
      const color = `hsl(${i * 18}, 100%, 50%)`;
      const radiusOffset = radius - i;

      // Draw text along the circle
      ctx.font = '${18 - i}px Arial'; // Set your font style
      const animation_angle = layer.spin * (i * lengthFactor + performance.now() * speedFactor);

      for (let c = 0; c < textLength; c++) {
        const angle = c * angleStep * layer.speed;

        const x = centerX + (radiusOffset) * Math.cos(angle + animation_angle);
        const y = centerY + (radiusOffset) * Math.sin(angle + animation_angle);

        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillText(text[c], 0, 0);
        ctx.restore();
      }
    }
  }


  function drawCircles(layer) {
    const centerX = foregroundCanvas.width / 2;
    const centerY = foregroundCanvas.height / 2;
    const radius = Math.min(foregroundCanvas.width, foregroundCanvas.height) * 0.4;

    for (let i = 0; i < 20; i++) {
      const angle = layer.spin * (i * Math.PI / 10 + performance.now() * 0.001 * layer.speed);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const size = 10 + i * 5;
      const color = `hsl(${i * 19}, 100%, 50%)`;

      //Radial gradients created using ctx.createRadialGradient(x0, y0, r0, x1, y1, r1
      const bg_radius = Math.max(backgroundCanvas.width, backgroundCanvas.height);

      const bg_gradient = ctx.createRadialGradient(centerX, centerY, 0, x, y, bg_radius);
      bg_gradient.addColorStop(1, 'black');
      bg_gradient.addColorStop(0, 'darkblue');

      // Fill the entire canvas with the gradient
      bg_ctx.fillStyle = bg_gradient;
      bg_ctx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

      const gradient = ctx.createRadialGradient(x, y, size, x + size, y + size, size);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'blue');
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  function drawLines(layer) {
    const lineCount = 30;
    const length = Math.min(foregroundCanvas.width, foregroundCanvas.height) * 0.4;
    const centerX = foregroundCanvas.width / 2;
    const centerY = foregroundCanvas.height / 2;

    for (let i = 0; i < lineCount; i++) {
      const angle = layer.spin * (i * Math.PI / 15 + performance.now() * 0.001 * layer.speed);
      const x = centerX + length * Math.cos(angle);
      const y = centerY + length * Math.sin(angle);

      ctx.strokeStyle = `hsl(${i * 12}, 100%, 50%)`;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  // Function to calculate layer speeds to achieve blinking effect
  function calculateSpeeds(frequency) {
    const baseSpeed = frequency / 2;
    const layerSpeeds = [baseSpeed];

    for (let i = 1; i < layers.length; i++) {
      layerSpeeds.push(baseSpeed + (i * (frequency / layers.length)));
    }

    return layerSpeeds;
  }

  // Update speeds of all layers based on current frequency input value
  function updateLayerSpeeds(frequency) {
    const speeds = calculateSpeeds(frequency);
    layers.forEach((layer, index) => {
      layer.speed = speeds[index];
    });
    updateLayerControls();
  }


  // Save layout to a file
  function saveLayout() {
    const layout = JSON.stringify(layers, null, 2);
    const blob = new Blob([layout], {
      type: 'application/json'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'layout.json';
    a.click();
  }

  // Load layout from a file
  function loadLayout(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      const layout = JSON.parse(e.target.result);
      layers.length = 0;
      layers.push(...layout);
      // recalculateOpacity();
      updateLayerControls();
    };
    reader.readAsText(file);
  }

  // Export animation
  function exportAnimation() {
    const frameCount = 100;
    const zip = new JSZip();

    function drawFrame(frameNumber) {
      ctx.clearRect(0, 0, foregroundCanvas.width, foregroundCanvas.height);
      layers.forEach(layer => {
        ctx.save();
        ctx.globalAlpha = layer.opacity;

        switch (layer.type) {
          case 'circles':
            drawCircles(layer.speed + frameNumber * 0.01);
            break;
          case 'lines':
            drawLines(layer.speed + frameNumber * 0.01);
            break;
        }

        ctx.restore();
      });
    }

    function saveFrame(frameNumber) {
      return new Promise(resolve => {
        drawFrame(frameNumber);
        foregroundCanvas.toBlob(blob => {
          zip.file(`frame${frameNumber}.png`, blob);
          resolve();
      });
      });
  }

  async function exportFrames() {
    for (let i = 0; i < frameCount; i++) {
      await saveFrame(i);
    }
    zip.generateAsync({
      type: 'blob'
    }).then(content => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'animation.zip';
      a.click();
    });
  }

  exportFrames();
}


  function updateFrequencyRange() {
    const [min,
      max] = rangeSelect.value.split('-').map(parseFloat);
    frequencyInput.min = min;
    frequencyInput.max = max;
    frequencyInput.value = min;
    updateLayerSpeeds(min); // Set initial layer speeds to the minimum value of the selected range
  }
  

  
  
  
  const layers = [];
  
  const text = "ॐ आकाश सत्य ओङ्";
  const letters = glLib.renderLetters(text, 18);

  const backgroundCanvas = document.getElementById('backgroundCanvas');
  const foregroundCanvas = document.getElementById('foregroundCanvas');
  

  const bg_ctx = backgroundCanvas.getContext('2d');
  const ctx = foregroundCanvas.getContext('2d');

  // Set canvas size
  backgroundCanvas.width = window.innerWidth;
  backgroundCanvas.height = window.innerHeight;
  foregroundCanvas.width = window.innerWidth;
  foregroundCanvas.height = window.innerHeight;
  
  const rangeSelect = document.getElementById('rangeSelect');
  const frequencyInput = document.getElementById('frequencyInput');

  // Initialize frequency input range and values
  updateFrequencyRange();

  // Attach event listener to frequency input to update layer speeds dynamically
  frequencyInput.addEventListener('input', (e) => updateLayerSpeeds(parseFloat(e.target.value)));


  // Start animation
  draw();

  // Attach addLayer function to the button click event
  document.getElementById('addLayerButton').addEventListener('click', addLayer);
  document.getElementById('saveLayoutButton').addEventListener('click', saveLayout);
  document.getElementById('loadLayoutButton').addEventListener('click', () => document.getElementById('loadLayoutInput').click());
  document.getElementById('loadLayoutInput').addEventListener('change', loadLayout);
  document.getElementById('exportAnimationButton').addEventListener('click', exportAnimation);

  // Update frequency input range based on selected range
  rangeSelect.addEventListener('change', updateFrequencyRange);

  document.getElementById('toggleControlPanelButton').addEventListener('click', function() {
    const controlPanel = document.getElementById('controlPanel');
    if (controlPanel.style.display === 'none' || controlPanel.style.display === '') {
      controlPanel.style.display = 'block';
    } else {
      controlPanel.style.display = 'none';
    }
  });

  updateLayerControls();

});