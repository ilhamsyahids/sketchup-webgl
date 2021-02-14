const canvas = document.getElementById('drawer-canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

gl.viewport(0, 0, canvas.width, canvas.height);

// vertex & fragment shader source code
const vertCode = [
    'attribute vec2 coordinate;',
    'attribute vec3 color;',
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
        vertices: [-0.5, 0.5, -0.5, -0.5, 0.0, -0.5, 0.0, 0.5],
        colors: [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1,
            1, 0, 1
        ]
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

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.colors), gl.STATIC_DRAW);

        // associate attribute and buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        const coord = gl.getAttribLocation(shaderProgram, "coordinate");
        gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(coord);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        const color = gl.getAttribLocation(shaderProgram, "color");
        gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(color);

        gl.drawArrays(object.type, 0, object.vertices.length);
    });
}


// live drawing

let drawType;
let drawing = false;
let vertices = [];
let colors = [];

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
    const mousePos = getMousePos(canvas, e);
    const mouseCoord = {
        x: -1 + 2 * mousePos.x / canvas.width,
        y: -1 + 2 * (canvas.height - mousePos.y) / canvas.height
    }

    const colorInput = document.getElementById('color').value;
    const color = {
        r: parseInt("0x" + colorInput.slice(1, 3)) / 256.0,
        g: parseInt("0x" + colorInput.slice(3, 5)) / 256.0,
        b: parseInt("0x" + colorInput.slice(5, 7)) / 256.0
    }

    vertices.push(mouseCoord.x, mouseCoord.y);
    colors.push(color.r, color.g, color.b);

    if (!drawing) {
        drawType = document.getElementById('type').value;
        drawing = true;
    }
    else {
        if (drawType === 'line') {
            objectToDraw.push({
                type: gl.LINES, vertices, colors
            });
            vertices = [];
            colors = [];
            drawing = false;
            render();
        }
    }
});

render();