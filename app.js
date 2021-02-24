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

    objectToDraw.reverse()

    objectToDraw.forEach((object) => {
        let vertices = [];

        object.vertices.forEach((pos) => {
            vertices.push(
                -1 + 2 * pos.x / canvas.width, // x
                -1 + 2 * (canvas.height - pos.y) / canvas.height // y
            );
        });

        let color = [];
        color.push(
            parseInt("0x" + object.color.slice(1, 3)) / 256.0,
            parseInt("0x" + object.color.slice(3, 5)) / 256.0,
            parseInt("0x" + object.color.slice(5, 7)) / 256.0);

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
        gl.uniform3fv(colorLoc, color);

        gl.drawElements(object.glType, object.indices.length, gl.UNSIGNED_SHORT, 0);
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
let nSide;
let posMouse = [];

function getMousePos(event) {
    const x = event.clientX - canvas.getBoundingClientRect().left;
    const y = event.clientY - canvas.getBoundingClientRect().top;

    return { x, y };
}

function draw(glType, vertices, type, otherProperty = {}) {
    let indices = [];
    for (let i = 0; i < vertices.length; ++i) {
        indices.push(i);
    }

    objectToDraw[lastIndex] = Object.assign({
        glType, vertices, color: getColor(), indices, type
    }, otherProperty);

    render();
}

function drawShape(pos1, pos2) {
    if (isEditing) {
        if (idxEdit !== null) {
            objectToDraw[idxEdit.objIdx].vertices[idxEdit.posIdx] = pos2;
            if (objectToDraw[idxEdit.objIdx].type === 'square') {
                objectToDraw[idxEdit.objIdx].type = 'polygon';
            }
            return render();
        }
        return;
    }

    if (drawType === 'line') {
        draw(gl.LINES, [pos1, pos2], drawType)
    } else if (drawType === 'square') {
        let orientation; // kuadran
        const length = Math.min(Math.abs(pos2.x - pos1.x), Math.abs(pos2.y - pos1.y));
        const sign = { x: Math.sign(pos2.x - pos1.x), y: Math.sign(pos2.y - pos1.y) };
        const pos = [
            { x: pos1.x, y: pos1.y },
            { x: pos1.x, y: pos1.y + sign.y * length },
            { x: pos1.x + sign.x * length, y: pos1.y + sign.y * length },
            { x: pos1.x + sign.x * length, y: pos1.y }
        ];
        if (pos2.x - pos1.x > 0) {
            if (pos2.y - pos1.y > 0) {
                orientation = 4
            } else {
                orientation = 1
            }
        } else {
            if (pos2.y - pos1.y > 0) {
                orientation = 3
            } else {
                orientation = 2
            }
        }
        draw(gl.TRIANGLE_FAN, pos, drawType, { orientation });
    } else if (drawType === 'polygon-angle') {
        const polygonSides = getSides();
        const radius = Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y)
        const pos = []
        for (let i = 0; i < polygonSides; i++) {
            pos.push({
                x: pos1.x + radius * Math.cos( 2 * Math.PI / polygonSides * i + Math.PI / 10),
                y: pos1.y - radius * Math.sin( 2 * Math.PI / polygonSides * i + Math.PI / 10)
            })
        }
        draw(gl.TRIANGLE_FAN, pos, 'polygon');
    }
}

function dragStart(event) {
    drawType = document.getElementById('type').value;
    clicked = true;
    dragStartLocation = getMousePos(event);
    lastIndex = objectToDraw.length;

    if (drawType === 'polygon' && !isEditing) {
        if (posMouse.length === 0) {
            nSide = Number(getSides());
        }
        if (posMouse.length < nSide) {
            posMouse.push(dragStartLocation);
        }
        if (posMouse.length ===  nSide) {
            draw(gl.TRIANGLE_FAN, posMouse, drawType);
            posMouse = [];
        }
    }

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
    const text = await file.text();
    const loaded = JSON.parse(text);

    clearCanvas();
    objectToDraw = loaded.object;
    render();
}

// Function button sidebar
const clearButton = document.querySelector('#clear');
clearButton.addEventListener('click', clearCanvas);

const editButton = document.getElementById('edit');
editButton.addEventListener('click', toggleEdit);

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
        for (const [posIdx, pos] of obj.vertices.entries()) {
            if (Math.hypot(point.x - pos.x, point.y - pos.y) < epsilon) {
                return { objIdx, posIdx }
            }
        }
    }
    return null;
}

function toggleEdit() {
    isEditing = !isEditing;
    if (isEditing) {
        editButton.classList.add('active')
    } else {
        editButton.classList.remove('active')
    }
}

// editing object when right click
canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    clicked = false;
    idxEdit = findPoint(getMousePos(event));
    if (idxEdit !== null) {
        let isChange = false;
        if (objectToDraw[idxEdit.objIdx].type === 'line') {
            const p1 = objectToDraw[idxEdit.objIdx].vertices[0],
                p2 = objectToDraw[idxEdit.objIdx].vertices[1];
            // set default length value
            const val = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const newLength = prompt(`Insert new length for object ${idxEdit.objIdx + 1}`, val);
            if (!(newLength === "" || newLength === null || isNaN(Number(newLength)))) {
                changeLineLength(idxEdit.objIdx, Number(newLength));
                isChange = true;
            }
        }

        if (objectToDraw[idxEdit.objIdx].type === 'square') {
            const p1 = objectToDraw[idxEdit.objIdx].vertices[0]
            const p2 = objectToDraw[idxEdit.objIdx].vertices[1];
            const val = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const newEdge = prompt(`Insert new edge for object ${idxEdit.objIdx + 1}`, val);
            if (!(newEdge === "" || newEdge === null || isNaN(Number(newEdge)))) {
                changeSquareEdge(idxEdit.objIdx, Number(newEdge));
                isChange = true;
            }
        }

        const newColor = prompt(`Insert new color for object ${idxEdit.objIdx + 1}`, objectToDraw[idxEdit.objIdx].color);
        if (!(newColor === "" || newColor === null) && /^#[0-9A-Fa-f]{6}$/.test(newColor)) {
            objectToDraw[idxEdit.objIdx].color = newColor;
            isChange = true;
        }
        if (isChange) render();
    }
});

// function to handling the editing
function changeLineLength(objIdx, newLength) {
    if (objectToDraw[objIdx].type === 'line') {
        const p1 = objectToDraw[objIdx].vertices[0];
        const p2 = objectToDraw[objIdx].vertices[1];

        const lengthBefore = Math.hypot(p2.x - p1.x, p2.y - p1.y);

        objectToDraw[objIdx].vertices[1] = {
            x: p1.x + (p2.x - p1.x) * newLength / lengthBefore,
            y: p1.y + (p2.y - p1.y) * newLength / lengthBefore
        };
    }
}

function changeSquareEdge(objIdx, newEdge) {
    const obj = objectToDraw[objIdx];
    if (obj.type === 'square') {
        if (obj.orientation === 4) {
            // top right
            obj.vertices[3].x = obj.vertices[0].x + newEdge
            // bottom left
            obj.vertices[1].y = obj.vertices[0].y + newEdge
            // bottom right
            obj.vertices[2].x = obj.vertices[1].x + newEdge
            obj.vertices[2].y = obj.vertices[3].y + newEdge
        } else if (obj.orientation === 1) {
            // bottom right
            obj.vertices[3].x = obj.vertices[0].x + newEdge
            // top left
            obj.vertices[1].y = obj.vertices[0].y - newEdge
            // top right
            obj.vertices[2].x = obj.vertices[1].x + newEdge
            obj.vertices[2].y = obj.vertices[3].y - newEdge
        } else if (obj.orientation === 2) {
            // bottom left
            obj.vertices[3].x = obj.vertices[0].x - newEdge
            // top right
            obj.vertices[1].y = obj.vertices[0].y - newEdge
            // top left
            obj.vertices[2].x = obj.vertices[1].x - newEdge
            obj.vertices[2].y = obj.vertices[3].y - newEdge
        } else {
            // top left
            obj.vertices[3].x = obj.vertices[0].x - newEdge
            // bottom right
            obj.vertices[1].y = obj.vertices[0].y + newEdge
            // bottom left
            obj.vertices[2].x = obj.vertices[1].x - newEdge
            obj.vertices[2].y = obj.vertices[3].y + newEdge
        }
    }
}

function onChangeSide(val) {
    const shapeSides = document.getElementById('shape-side')
    if (val === 'polygon' || val === 'polygon-angle') {
        shapeSides.style.display = ''
    } else {
        shapeSides.style.display = 'none'
    }
}

function getSides() {
    return document.getElementById('sides').value;
}
