const canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 5;

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
let objectToDraw = [];

function render() {
    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);

    // Glitch when drag object
    // gl.clear(gl.COLOR_BUFFER_BIT);

    objectToDraw.reverse()

    objectToDraw.forEach((object) => {
        let vertices = [];

        object.arrPos.forEach((pos) => {
            vertices.push(
                -1 + 2 * pos.x / canvas.width, // x
                -1 + 2 * (canvas.height - pos.y) / canvas.height // y
            );
        });

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

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

    objectToDraw.reverse()
}


// live drawing

let drawType;
let dragging = false, clicked = false;
let dragStartLocation;
let lastIndex;
let isEditing = false;
let idxEdit = null;

function getMousePos(event) {
    const x = event.clientX - canvas.getBoundingClientRect().left;
    const y = event.clientY - canvas.getBoundingClientRect().top;

    return { x, y };
}

function draw(type, arrPos) {
    let indices = [];
    for (let i = 0; i < arrPos.length; ++i) {
        indices.push(i);
    }

    const colorInput = getColor();
    let color = [];
    color.push(
        parseInt("0x" + colorInput.slice(1, 3)) / 256.0,
        parseInt("0x" + colorInput.slice(3, 5)) / 256.0,
        parseInt("0x" + colorInput.slice(5, 7)) / 256.0);

    objectToDraw[lastIndex] = {
        type, arrPos, color, indices
    };

    render();
}

function drawShape(pos1, pos2) {
    if (isEditing) {
        if (idxEdit !== null) {
            objectToDraw[idxEdit.objIdx].arrPos[idxEdit.posIdx] = pos2;
            return render();
        }
        return;
    }

    if (drawType === 'line') {
        draw(gl.LINES, [pos1, pos2])
    } else if (drawType === 'square') {
        const length = Math.min(Math.abs(pos2.x - pos1.x), Math.abs(pos2.y - pos1.y));
        const sign = { x: Math.sign(pos2.x - pos1.x), y: Math.sign(pos2.y - pos1.y) };
        const pos = [
            { x: pos1.x, y: pos1.y },
            { x: pos1.x, y: pos1.y + sign.y * length },
            { x: pos1.x + sign.x * length, y: pos1.y + sign.y * length },
            { x: pos1.x + sign.x * length, y: pos1.y }
        ];
        draw(gl.TRIANGLE_FAN, pos);
    }
}

function dragStart(event) {
    drawType = document.getElementById('type').value;
    clicked = true;
    dragStartLocation = getMousePos(event);
    lastIndex = objectToDraw.length;

    isEditing = document.getElementById('edit').value === 'true';
    if (isEditing) {
        idxEdit = findPoint(dragStartLocation);
    }
}

function drag(event) {
    if (clicked) {
        dragging = true;
        const currPos = getMousePos(event);
        drawShape(dragStartLocation, currPos);
    }
}

function dragStop(event) {
    clicked = false;
    if (dragging) {
        const currPos = getMousePos(event);
        drawShape(dragStartLocation, currPos);
        dragging = false;
    }
}

function getColor() {
    return document.getElementById('color').value;
}

function clearCanvas() {
    objectToDraw = []
    gl.clear(gl.DEPTH_BUFFER_BIT);
}

function saveCanvas() {
    const obj = {
        object: objectToDraw
    }
    downloadObject(obj, `${Date.now()}.json`)
}

function downloadObject(obj, filename) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var elem = document.createElement("a");
    elem.href = url;
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
}

function loadCanvas(loader) {
    loader.click()
}

const processFile = async (file) => {
    const fr = new FileReader();

    fr.readAsArrayBuffer(file);
    const text = await file.text();
    const loaded = JSON.parse(text);

    clearCanvas();
    objectToDraw = loaded.object;
    render();
}

// Function button sidebar
const clearButton = document.querySelector('#clear');
clearButton.addEventListener('click', clearCanvas);

const saveButton = document.querySelector('#save');
saveButton.addEventListener('click', saveCanvas);

const loadButton = document.querySelector('#load');
const loaderButton = document.querySelector('#loader');

loadButton.addEventListener('click', () => {
    loadCanvas(loaderButton)
});
loaderButton.addEventListener('change', () => {
    const file = loaderButton.files[0];
    if (file) {
        processFile(file);
    }
})

canvas.addEventListener('mousedown', dragStart, false);
canvas.addEventListener('mousemove', drag, false);
canvas.addEventListener('mouseup', dragStop, false);

render();


// function to find nearest vertex of object
function findPoint(point, epsilon = 7) {
    for (const [objIdx, obj] of objectToDraw.entries()) {
        for (const [posIdx, pos] of obj.arrPos.entries()) {
            // console.log(Math.hypot(point.x - pos.x, point.y - pos.y));
            if (Math.hypot(point.x - pos.x, point.y - pos.y) < epsilon) {
                return { objIdx, posIdx }
            }
        }
    }
    return null;
}