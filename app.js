const canvas = document.getElementById('drawer-canvas');
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

// TODO: hapus isi ini jika tidak dipakai
const objectToDraw = [
    {
        type: gl.TRIANGLE_FAN,
        vertices: [-0.5, 0.5, -0.5, 0.3, 0.0, 0.3, 0.0, 0.5],
        indices: [0, 1, 2, 3],
        color: [1, 0, 0]
    }
];

function render() {
    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);

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
let drawing = false;
let mousePos = [];

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect(),
        scaleX = canvas.width / rect.width,
        scaleY = canvas.height / rect.height;

    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    }
}

// canvas event listener
canvas.addEventListener('mousedown', (e) => {
    mousePos.push(getMousePos(canvas, e));

    if (!drawing) {
        drawType = document.getElementById('type').value;
        drawing = true;
    }
    else {
        function doneDrawing(type) {
            let vertices = [];
            mousePos.forEach((pos) => {
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

            objectToDraw.push({
                type, vertices, color, indices
            });

            mousePos = [];
            drawing = false;
            render();
        }

        if (drawType === 'line') {
            doneDrawing(gl.LINES);
        }
        else if (drawType === 'square') {
            const min_x = Math.min(mousePos[0].x, mousePos[1].x), max_x = Math.max(mousePos[0].x, mousePos[1].x),
                min_y = Math.min(mousePos[0].y, mousePos[1].y), max_y = Math.max(mousePos[0].y, mousePos[1].y);
            const length = Math.min(max_x - min_x, max_y - min_y);
            mousePos = [
                { x: min_x, y: max_y },                   // upper left
                { x: min_x, y: max_y - length },          // bottom left
                { x: min_x + length, y: max_y - length }, // bottom right
                { x: min_x + length, y: max_y },          // upper right
            ];
            doneDrawing(gl.TRIANGLE_FAN);
        }
    }
});

render();