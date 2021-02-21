const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

gl.viewport(0, 0, canvas.width, canvas.height);

// vertex & fragment shader source code
const vertCode = [
    'attribute vec2 coordinate;',
    'uniform vec3 color;',
    'varying vec3 vColor;',
    'void main(void) {',
    '   gl_Position = vec4(coordinate, 0.0, 1.0);',
    '   vColor = color;',
    '}'].join('\n');

const fragCode = [
    'precision mediump float;',
    'varying vec3 vColor;',
    'void main(void) {',
    '   gl_FragColor = vec4(vColor, 1.0);',
    '}'].join('\n');

// vertex & fragment shader
const vertShader = gl.createShader(gl.VERTEX_SHADER);
const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(vertShader, vertCode);
gl.shaderSource(fragShader, fragCode);
gl.compileShader(vertShader);
gl.compileShader(fragShader);

// shader program
const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertShader);
gl.attachShader(shaderProgram, fragShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);

// List of object in canvas
const objectToDraw = [];

function render() {
    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);

    // Glitch when drag object
    // gl.clear(gl.COLOR_BUFFER_BIT);

    objectToDraw.forEach((object) => {

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.vertices), gl.STATIC_DRAW);

        var index_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(object.indices), gl.STATIC_DRAW);

        // associate attribute and buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
        const coordLoc = gl.getAttribLocation(shaderProgram, "coordinate");
        gl.vertexAttribPointer(coordLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(coordLoc);

        const colorLoc = gl.getUniformLocation(shaderProgram, "color");
        gl.uniform3fv(colorLoc, object.color);

        gl.drawElements(object.type, object.indices.length, gl.UNSIGNED_SHORT, 0);
    });
}


// live drawing

let drawType;
let dragging = false;
let dragStartLocation;
let lastIndex;

function getMousePos(event) {
    const x = event.clientX - canvas.getBoundingClientRect().left;
    const y = event.clientY - canvas.getBoundingClientRect().top;

    return {x: x, y: y};
}

function draw(type, arrPos) {
    let vertices = [];

    arrPos.forEach((pos) => {
        vertices.push(
            -1 + 2 * pos.x / canvas.width, // x
            -1 + 2 * (canvas.height - pos.y) / canvas.height // y
        );
    })

    let indices = [];
    for (let vertex = 0, i = 0; vertex < vertices.length; vertex += 2, ++i) {
        indices.push(i);
    }

    const colorInput = document.getElementById('color').value;
    let color = [];
    color.push(
        parseInt("0x" + colorInput.slice(1, 3)) / 256.0,
        parseInt("0x" + colorInput.slice(3, 5)) / 256.0,
        parseInt("0x" + colorInput.slice(5, 7)) / 256.0);

    objectToDraw[lastIndex] = {
        type, vertices, color, indices
    };

    render();
}

function drawShape(pos1, pos2) {
    if (drawType === 'line') {
        draw(gl.LINES, [pos1, pos2])
    } else if (drawType === 'square') {
        const min_x = Math.min(pos1.x, pos2.x), max_x = Math.max(pos1.x, pos2.x),
            min_y = Math.min(pos1.y, pos2.y), max_y = Math.max(pos1.y, pos2.y);
        const length = Math.min(max_x - min_x, max_y - min_y);
        const pos = [
            { x: min_x, y: max_y },                   // upper left
            { x: min_x, y: max_y - length },          // bottom left
            { x: min_x + length, y: max_y - length }, // bottom right
            { x: min_x + length, y: max_y },          // upper right
        ];
        draw(gl.TRIANGLE_FAN, pos);
    }
}

function dragStart(event) {
    drawType = document.getElementById('type').value;
    dragging = true;
    dragStartLocation = getMousePos(event);
    lastIndex = objectToDraw.length;
}

function drag(event) {
    if (dragging === true) {
        const currPos = getMousePos(event);
        drawShape(dragStartLocation, currPos);
    }
}

function dragStop(event) {
    dragging = false;
    const currPos = getMousePos(event);
    drawShape(dragStartLocation, currPos);
}

canvas.addEventListener('mousedown', dragStart, false);
canvas.addEventListener('mousemove', drag, false);
canvas.addEventListener('mouseup', dragStop, false);

render();
