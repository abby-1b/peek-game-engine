import { error } from '../errors.ts';
import { Control } from './Control.ts';
import { Scene } from './World.ts';

interface ShaderProgramWithLocations {
  program: WebGLProgram,
  locations: {
    attributes: Record<string, number>,
    uniforms: Record<string, WebGLUniformLocation>
  }
}

type SceneIdx = number;
type ShaderType =
  'bool' | 'int' | 'uint' | 'float' | 'double' |
  'vec2' | 'vec3' | 'vec4' |
  'mat2' | 'mat3' | 'mat4' | 'mat2x2' | 'mat2x3' | 'mat2x4' | 'mat3x2' |
  'mat3x3' | 'mat3x4' | 'mat4x2' | 'mat4x3' | 'mat4x4' |
  'sampler2D';

/** Maps inner format to base format */
const FORMAT_MAPPINGS = {
  'RGB': 'RGB',
  'RGBA': 'RGBA',
  'LUMINANCE_ALPHA': 'LUMINANCE_ALPHA',
  'LUMINANCE': 'LUMINANCE',
  'ALPHA': 'ALPHA',
  'R8': 'RED',
  'R16F': 'RED',
  'R32F': 'RED',
  'R8UI': 'RED_INTEGER',
  'RG8': 'RG',
  'RG16F': 'RG',
  'RG32F': 'RG',
  'RG8UI': 'RG_INTEGER',
  'RGB8': 'RGB',
  'SRGB8': 'RGB',
  'RGB565': 'RGB',
  'R11F_G11F_B10F': 'RGB',
  'RGB9_E5': 'RGB',
  'RGB16F': 'RGB',
  'RGB32F': 'RGB',
  'RGB8UI': 'RGB_INTEGER',
  'RGBA8': 'RGBA',
  'SRGB8_ALPHA8': 'RGBA',
  'RGB5_A1': 'RGBA',
  'RGB10_A2': 'RGBA',
  'RGBA4': 'RGBA',
  'RGBA16F': 'RGBA',
  'RGBA32F': 'RGBA',
  'RGBA8UI': 'RGBA_INTEGER'
} as const;

/** Maps inner format to possible types */
const POSSIBLE_FORMAT_CHOICES = {
  'RGB': [ 'UNSIGNED_BYTE', 'UNSIGNED_SHORT_5_6_5' ],
  'RGBA': [ 'UNSIGNED_BYTE', 'UNSIGNED_SHORT_4_4_4_4', 'UNSIGNED_SHORT_5_5_5_1' ],
  'LUMINANCE_ALPHA': [ 'UNSIGNED_BYTE' ],
  'LUMINANCE': [ 'UNSIGNED_BYTE' ],
  'ALPHA': [ 'UNSIGNED_BYTE' ],
  'R8': [ 'UNSIGNED_BYTE' ],
  'R16F': [ 'HALF_FLOAT', 'FLOAT' ],
  'R32F': [ 'FLOAT' ],
  'R8UI': [ 'UNSIGNED_BYTE' ],
  'RG8': [ 'UNSIGNED_BYTE' ],
  'RG16F': [ 'HALF_FLOAT', 'FLOAT' ],
  'RG32F': [ 'FLOAT' ],
  'RG8UI': [ 'UNSIGNED_BYTE' ],
  'RGB8': [ 'UNSIGNED_BYTE' ],
  'SRGB8': [ 'UNSIGNED_BYTE' ],
  'RGB565': [ 'UNSIGNED_BYTE', 'UNSIGNED_SHORT_5_6_5' ],
  'R11F_G11F_B10F': [ 'UNSIGNED_INT_10F_11F_11F_REV', 'HALF_FLOAT', 'FLOAT' ],
  'RGB9_E5': [ 'HALF_FLOAT', 'FLOAT' ],
  'RGB16F': [ 'HALF_FLOAT', 'FLOAT' ],
  'RGB32F': [ 'FLOAT' ],
  'RGB8UI': [ 'UNSIGNED_BYTE' ],
  'RGBA8': [ 'UNSIGNED_BYTE' ],
  'SRGB8_ALPHA8': [ 'UNSIGNED_BYTE' ],
  'RGB5_A1': [ 'UNSIGNED_BYTE', 'UNSIGNED_SHORT_5_5_5_1' ],
  'RGB10_A2': [ 'UNSIGNED_INT_2_10_10_10_REV' ],
  'RGBA4': [ 'UNSIGNED_BYTE', 'UNSIGNED_SHORT_4_4_4_4' ],
  'RGBA16F': [ 'HALF_FLOAT', 'FLOAT' ],
  'RGBA32F': [ 'FLOAT' ],
  'RGBA8UI': [ 'UNSIGNED_BYTE' ],
} as const;
type InnerFormatType = keyof typeof FORMAT_MAPPINGS;

// TODO: Remove this (eventually)
const fieldOfViewRadians = Math.PI * 0.35;
let modelXRotationRadians = -0.819;
let modelYRotationRadians = 0.468;

/**
 * Holds all the methods necessary to draw to the screen and/or otherwise
 * display information.
 */
export class Frame {

  /// PRIVATE VARIABLES ///

  /** The scenes that the frame can switch to */
  public static scenes: Scene[] = [];
  /** The scene we're displaying */
  private static currScene: SceneIdx = -1;

  /** The canvas */
  private static cnv: HTMLCanvasElement;
  /** The rendering context */
  private static gl: WebGL2RenderingContext;

  /** The amount of pixels visible on the screen */
  private static pixelCount = 10000;

  private static shaderProgram: ShaderProgramWithLocations;

  private static positionBuffer: WebGLBuffer;
  private static vertexArray: WebGLVertexArrayObject;

  private static texcoordBuffer: WebGLBuffer;

  private static exampleTexture: WebGLTexture;
  // REMEMBER: A FrameBuffer is to a texture what a PGraphics is to a PImage.
  // It allows writing to the texture as if it was the screen!
  private static targetTexture: WebGLTexture;
  private static frameBuffer: WebGLFramebuffer;

  /// PUBLIC VARIABLES ///

  public static frameCount = 0;

  public static width = 0;
  public static height = 0;

  /// BASIC FUNCTIONS ///

  /**
   * Initiates the project
   * @param canvasElement The HTMLCanvasElement we're using to draw
   */
  public static init(
    canvasElement: HTMLCanvasElement
  ) {
    // Initiate the canvas...
    this.cnv = canvasElement;
    this.gl = this.cnv.getContext('webgl2', {
      antialias: false
    }) as WebGL2RenderingContext;

    // Compile the shaders
    this.shaderProgram = this.createProgram(
      vertexShaderSource, fragmentShaderSource,
      {
        a_position: 'vec4',
        a_texcoord: 'vec2'
      }, {
        u_matrix: 'mat4',
        u_texture: 'sampler2D'
      }, {
        v_texcoord: 'vec2'
      }, {
        outColor: 'vec4'
      }
    );

    /// Setup the vertex buffer ///
    this.positionBuffer = this.gl.createBuffer()!;
    this.vertexArray = this.gl.createVertexArray()!;

    this.gl.bindVertexArray(this.vertexArray);
    this.gl.enableVertexAttribArray(
      this.shaderProgram.locations.attributes['a_position']
    );

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

    // TODO: Remove this (eventually)
    setGeometry(this.gl);

    this.gl.vertexAttribPointer(
      this.shaderProgram.locations.attributes['a_position'],
      3, // Number of floats per point
      this.gl.FLOAT, // The type of the array
      true, // Normalize the data (does nothing for float, helps for int)
      0, // Stride. Data is tightly packed, so skip
      0 // Offset. See above
    );

    /// Setup the texture coordinate buffer ///
    this.texcoordBuffer = this.gl.createBuffer()!;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texcoordBuffer);

    // TODO: Remove this (eventually)
    setTexcoords(this.gl);

    this.gl.enableVertexAttribArray(
      this.shaderProgram.locations.attributes['a_texcoord']
    );

    this.gl.vertexAttribPointer(
      this.shaderProgram.locations.attributes['a_texcoord'],
      2, // Number of floats per point
      this.gl.FLOAT, // The type of the array
      true, // Normalize the data (does nothing for float, helps for int)
      0, // Stride. Data is tightly packed, so skip
      0 // Offset. See above
    );

    /// Texture stuff ///
    this.exampleTexture = this.createTexture(
      3, 2, 'R8', 'UNSIGNED_BYTE', new Uint8Array([
        128, 64, 128,
        0, 192, 0,
      ])
    );
    this.targetTexture = this.createTexture(16, 16, 'RGBA', 'UNSIGNED_BYTE');

    // Make the framebuffer
    this.frameBuffer = this.gl.createFramebuffer()!;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);

    // Attach the texture as the first color attachment
    const attachmentPoint = this.gl.COLOR_ATTACHMENT0;
    const level = 0;
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER, attachmentPoint, this.gl.TEXTURE_2D,
      this.targetTexture, level
    );

    // Initiate the frame loop
    const frameRate = 30;
    const frameTime = 1000 / frameRate;
    let lastFrameTime = performance.now();
    setInterval(() => {
      const currFrameTime = performance.now();
      this.frame((currFrameTime - lastFrameTime) / frameTime);
      lastFrameTime = currFrameTime;
      this.frameCount++;
    }, frameTime);
  }

  /**
   * Finalizes a shader, adding everything it needs before it gets used by
   * WebGL and compled to a shader
   * @param shaderSource The source of the shader
   * @param attributes The attributes it will have access to
   * @param uniforms The uniforms it will have access to
   * @param varyings These turn into input or output depending on `receiving`
   * @param receiving If true, varyings are set to `in`, else they're `out`
   * @returns The finalized shader source
   */
  private static finalizeShader(
    shaderSource: string,
    attributes: Record<string, ShaderType>,
    uniforms: Record<string, ShaderType>,
    varyings: Record<string, ShaderType> = {},
    outputs: Record<string, ShaderType> = {},
    receiving: boolean
  ) {
    // Start with the version string
    let finalSource = '#version 300 es\n';

    // Append the fragment shader header
    if (receiving) {
      finalSource += 'precision highp float;\n';
    }
    
    // Append attributes
    for (const attribute in attributes) {
      finalSource += `in ${attributes[attribute]} ${attribute};\n`;
    }

    // Append uniforms
    for (const uniform in uniforms) {
      finalSource += `uniform ${uniforms[uniform]} ${uniform};\n`;
    }

    // Append varyings
    for (const varying in varyings) {
      finalSource += (receiving ? 'in' : 'out') +
        ` ${varyings[varying]} ${varying};\n`;
    }

    // Append outputs
    if (receiving) {
      for (const output in outputs) {
        finalSource += `out ${outputs[output]} ${output};\n`;
      }
    }

    // Finally, return
    return finalSource + shaderSource;
  }

  /**
   * Compiles a vertex and fragment shader into a shader program, which gets
   * used directly by WebGL to draw things to the canvas
   * @param vertSource The source of the vertex shader
   * @param fragSource The source of the fragment shader
   * @param attributes Attributes both the vertex and fragment shader will have
   * access to during their execution. Attributes are basically values that are
   * passed through buffers, as they constitute large amounts of data.
   * @param uniforms Uniforms both the vertex and fragment shader will have
   * access to during their execution. Uniforms are values that change around
   * once (or less) per shader usage.
   * @param varyings Varyings both the vertex and fragment shader will have
   * access to during their execution. Varyings are small amounts of data that
   * can be passed from the vertex to the fragment shader.
   * @param outputs Values that the fragment shader will output. These are
   * things like the calculated color, normal, depth, etc.
   * @returns The compiled shader program, along with the attribute and uniform
   * locations for the given attribytes and uniforms
   */
  public static createProgram<
    Attributes extends Record<string, ShaderType>,
    Uniforms extends Record<string, ShaderType>
  >(
    vertSource: string, fragSource: string,
    attributes: Attributes,
    uniforms: Uniforms,
    varyings: Record<string, ShaderType>,
    outputs: Record<string, ShaderType>
  ): {
    program: WebGLProgram,
    locations: {
      attributes: { [K in keyof Attributes]: number },
      uniforms: { [K in keyof Uniforms]: WebGLUniformLocation }
    }
  } {
    // Finalize and load the shaders
    const finalVertSource = this.finalizeShader(
      vertSource,
      attributes, uniforms, varyings, outputs, false
    );
    const finalFragSource = this.finalizeShader(
      fragSource,
      attributes, uniforms, varyings, outputs, true
    );
    const shaders = [
      loadShader(this.gl, finalVertSource, this.gl.VERTEX_SHADER),
      loadShader(this.gl, finalFragSource, this.gl.FRAGMENT_SHADER),
    ];
    
    // Create the program and attach each shader to it
    const program = this.gl.createProgram() as WebGLProgram;
    shaders.forEach((shader) => {
      this.gl.attachShader(program, shader);
    });

    // Link the program
    this.gl.linkProgram(program);
    const linked = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
    if (!linked) {
      // Something went wrong with the link
      const lastError = this.gl.getProgramInfoLog(program);
      error(`Error in program linking: ${lastError}`);
    }

    // Get all the attribute and uniform locations
    const locations = {
      attributes: {} as { [K in keyof Attributes]: number },
      uniforms: {} as { [K in keyof Uniforms]: WebGLUniformLocation }
    };
    for (const attribute in attributes) {
      locations.attributes[attribute] =
        this.gl.getAttribLocation(program, attribute);
    }
    for (const uniform in uniforms) {
      locations.uniforms[uniform] =
        this.gl.getUniformLocation(program, uniform)!;
    }

    return {
      program,
      locations
    };
  }

  /**
   * Creates a WebGL texture
   * @param width Width of the texture
   * @param height Height of the texture
   * @param format The internal format representation
   * @param type How the data buffer is structured (if no data buffer is passed,
   * then this still affects how data written will be structured!)
   * @param data The data used to fill the texture
   * @returns The created texture
   */
  public static createTexture<T extends InnerFormatType>(
    width: number,
    height: number,
    format: T,
    type: typeof POSSIBLE_FORMAT_CHOICES[T][number],
    data?: Uint8Array
  ) {
    const ret = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, ret);

    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl[format], width, height, 0,
      this.gl[FORMAT_MAPPINGS[format]], this.gl[type], data ?? null
    );

    // Sets the minification, magnification and wrapping functions
    const tex2D = this.gl.TEXTURE_2D;
    this.gl.texParameteri(tex2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(tex2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(tex2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(tex2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    return ret;
  }

  /**
   * Creates a framebuffer from a texture
   * @param texture The texture that the framebuffer will write to
   * @returns The created framebuffer
   */
  public static createFrameBuffer(texture: WebGLTexture) {
    const frameBuffer = this.gl.createBuffer()!;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0, // This should eventually be editable!
      this.gl.TEXTURE_2D,
      texture,
      0
    );
    return frameBuffer;
  }

  /// SCENE MANAGEMENT ///

  /**
   * Adds a scene that can be switched to on the fly.
   * @param scene The scene to be added
   * @returns The index of the scene, so it can be swapped to
   */
  public static addScene(scene: Scene): SceneIdx {
    if (this.scenes.includes(scene)) {
      // If the scene is already in the list, don't load it again
      return this.scenes.indexOf(scene);
    }

    // Otherwise, push the scene
    this.scenes.push(scene);

    // Return the index of the scene
    return this.scenes.length - 1;
  }

  /// FRAME METHODS ///

  /**
   * Runs every frame, and draws everything
   * @param delta The time elapsed since the last frame
   */
  private static frame(delta: number) {
    // Resize the canvas according to the window's size
    const wWidth = window.innerWidth;
    const wHeight = window.innerHeight;

    // Calculate the new canvas height, keeping the final number of pixels
    // As close to `this.pixelCount` as possible.
    const sizeMult = Math.sqrt(this.pixelCount / (wWidth * wHeight));
    const cWidth = Math.round(wWidth * sizeMult);
    const cHeight = Math.round(wHeight * sizeMult);

    if (cWidth != this.width || cHeight != this.height) {
      // If the canvas size changed, update the canvas' inner size
      this.cnv.width = this.width = cWidth;
      this.cnv.height = this.height = cHeight;
    }

    // Step through each scene
    for (let s = 0; s < this.scenes.length; s++) {
      this.scenes[s].step(delta);
    }

    // Draw each scene
    for (let s = 0; s < this.scenes.length; s++) {
      this.scenes[s].frame(delta);
    }

    // TODO: Remove this (eventually)
    drawScene(
      this.gl, this.frameBuffer, this.exampleTexture, this.targetTexture,
      this.cnv, this.shaderProgram, this.vertexArray
    );
  }

  /// DRAWING METHODS ///

  /**
   * Draws a line
   * @param x1 The X position of the starting point
   * @param y1 The Y position of the starting point
   * @param x2 The X position of the ending point
   * @param y2 The Y position of the ending point
  */
  /// public static line(x1: number, y1: number, x2: number, y2: number) {
  ///   this.gl.uniform4fv(this.shaderProgram.locations.color, this.drawColor);
  ///   this.vertexData[0] = x1 - 0.5;
  ///   this.vertexData[1] = y1 - 0.5;
  ///   this.vertexData[2] = x2;
  ///   this.vertexData[3] = y2;
  ///   this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexData, this.gl.DYNAMIC_DRAW);
  ///   this.gl.drawArrays(this.gl.LINES, 0, 2);
  /// }
}

// This is just here so we can have proper syntax highlighting in VSCode!
const glsl = (...x: (TemplateStringsArray | string | number)[]) => x.join('');

const vertexShaderSource = glsl`

// All shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;

  // Pass the texcoord to the fragment shader.
  v_texcoord = a_texcoord;
}

`;

const fragmentShaderSource = glsl`

void main() {
  outColor = texture(u_texture, v_texcoord);
}

`;

// eslint-disable-next-line require-jsdoc
function drawCube(
  aspect: number,
  gl: WebGL2RenderingContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  program: ShaderProgramWithLocations,
  vao: WebGLVertexArrayObject,
) {
  // Tell it to use our program (pair of shaders)
  gl.useProgram(program.program);

  // Bind the attribute/buffer set we want.
  gl.bindVertexArray(vao);

  // Compute the projection matrix
  const projectionMatrix = perspective(fieldOfViewRadians, aspect, 1, 2000);

  const cameraPosition: Vector3 = [0, 0, 2];
  const target: Vector3 = [0, 0, 0];
  const up: Vector3 = [0, 1, 0];

  // Compute the camera's matrix using look at.
  const cameraMatrix = lookAt(cameraPosition, target, up);

  // Make a view matrix from the camera matrix.
  const viewMatrix = inverse(cameraMatrix);

  const viewProjectionMatrix = multiply(projectionMatrix, viewMatrix);

  let matrix = xRotate(viewProjectionMatrix, modelXRotationRadians);
  matrix = yRotate(matrix, modelYRotationRadians);

  // Set the matrix.
  gl.uniformMatrix4fv(program.locations.uniforms.u_matrix, false, matrix);

  // Tell the shader to use texture unit 0 for u_texture
  gl.uniform1i(program.locations.uniforms.u_texture, 0);

  // Draw the geometry.
  const primitiveType = gl.TRIANGLES;
  const offset = 0;
  const count = 6 * 6;
  gl.drawArrays(primitiveType, offset, count);
}

// Draw the scene.
// eslint-disable-next-line require-jsdoc, @typescript-eslint/no-unused-vars
function drawScene(
  gl: WebGL2RenderingContext,
  fb: WebGLFramebuffer,
  texture: WebGLTexture,
  targetTexture: WebGLTexture,
  canvas: HTMLCanvasElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  program: ShaderProgramWithLocations,
  vao: WebGLVertexArrayObject
) {
  const deltaTime = Control.mouseDown ? 0.03 : 0;

  // Animate the rotation
  modelYRotationRadians += -0.7 * deltaTime;
  modelXRotationRadians += -0.4 * deltaTime;

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  {
    // Render to our targetTexture by binding the framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // Render cube with our 3x2 texture
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, 16, 16);

    // Clear the canvas AND the depth buffer.
    gl.clearColor(0, 0, 1, 1);   // Clear to blue
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawCube(1, gl, program, vao);
  }

  {
    // Render to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Render the cube with the texture we just rendered to
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas AND the depth buffer.
    gl.clearColor(1, 1, 1, 1);   // Clear to white
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    drawCube(aspect, gl, program, vao);
  }
}

// Fill the buffer with the values that define a cube.
// eslint-disable-next-line require-jsdoc
function setGeometry(gl: WebGL2RenderingContext) {
  const positions = new Float32Array([
    -0.5, -0.5, -0.5,
    -0.5, 0.5, -0.5,
    0.5, -0.5, -0.5,
    -0.5, 0.5, -0.5,
    0.5, 0.5, -0.5,
    0.5, -0.5, -0.5,

    -0.5, -0.5, 0.5,
    0.5, -0.5, 0.5,
    -0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,
    0.5, -0.5, 0.5,
    0.5, 0.5, 0.5,

    -0.5, 0.5, -0.5,
    -0.5, 0.5, 0.5,
    0.5, 0.5, -0.5,
    -0.5, 0.5, 0.5,
    0.5, 0.5, 0.5,
    0.5, 0.5, -0.5,

    -0.5, -0.5, -0.5,
    0.5, -0.5, -0.5,
    -0.5, -0.5, 0.5,
    -0.5, -0.5, 0.5,
    0.5, -0.5, -0.5,
    0.5, -0.5, 0.5,

    -0.5, -0.5, -0.5,
    -0.5, -0.5, 0.5,
    -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5,
    -0.5, 0.5, 0.5,
    -0.5, 0.5, -0.5,

    0.5, -0.5, -0.5,
    0.5, 0.5, -0.5,
    0.5, -0.5, 0.5,
    0.5, -0.5, 0.5,
    0.5, 0.5, -0.5,
    0.5, 0.5, 0.5,
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

// Fill the buffer with texture coordinates the cube.
// eslint-disable-next-line require-jsdoc
function setTexcoords(gl: WebGL2RenderingContext) {
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(
      [
        0, 0,
        0, 1,
        1, 0,
        0, 1,
        1, 1,
        1, 0,

        0, 0,
        0, 1,
        1, 0,
        1, 0,
        0, 1,
        1, 1,

        0, 0,
        0, 1,
        1, 0,
        0, 1,
        1, 1,
        1, 0,

        0, 0,
        0, 1,
        1, 0,
        1, 0,
        0, 1,
        1, 1,

        0, 0,
        0, 1,
        1, 0,
        0, 1,
        1, 1,
        1, 0,

        0, 0,
        0, 1,
        1, 0,
        1, 0,
        0, 1,
        1, 1,

      ]),
    gl.STATIC_DRAW);
}

/**
 * Loads a shader.
 * @param gl The WebGLRenderingContext to use.
 * @param shaderSource The shader source.
 * @param shaderType The type of shader.
 * @param opt_errorCallback callback for
 * errors.
 * @return The created shader.
 */
function loadShader(
  gl: WebGL2RenderingContext,
  shaderSource: string,
  shaderType: number
): WebGLShader {
  // Create the shader object
  const shader = gl.createShader(shaderType) as WebGLShader;

  // Load the shader source
  gl.shaderSource(shader, shaderSource);

  // Compile the shader
  gl.compileShader(shader);

  // Check the compile status
  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    // Something went wrong during compilation; get the error
    const lastError = gl.getShaderInfoLog(shader);
    error(`Error compiling shader: ${lastError}`);
  }

  return shader;
}

const MatType = Float32Array;

// eslint-disable-next-line require-jsdoc
function perspective(
  fieldOfViewInRadians: number,
  aspect: number, near: number,
  far: number
) {
  const dst = new MatType(16);
  const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
  const rangeInv = 1.0 / (near - far);

  dst[0] = f / aspect;
  dst[1] = 0;
  dst[2] = 0;
  dst[3] = 0;
  dst[4] = 0;
  dst[5] = f;
  dst[6] = 0;
  dst[7] = 0;
  dst[8] = 0;
  dst[9] = 0;
  dst[10] = (near + far) * rangeInv;
  dst[11] = -1;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = near * far * rangeInv * 2;
  dst[15] = 0;

  return dst;
}

type Vector3 = [number, number, number] | Float32Array;
// eslint-disable-next-line require-jsdoc
function lookAt(
  cameraPosition: Vector3, target: Vector3, up: Vector3
) {
  const dst = new MatType(16);
  const zAxis = normalize(subtractVectors(cameraPosition, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = normalize(cross(zAxis, xAxis));

  dst[0] = xAxis[0];
  dst[1] = xAxis[1];
  dst[2] = xAxis[2];
  dst[3] = 0;
  dst[4] = yAxis[0];
  dst[5] = yAxis[1];
  dst[6] = yAxis[2];
  dst[7] = 0;
  dst[8] = zAxis[0];
  dst[9] = zAxis[1];
  dst[10] = zAxis[2];
  dst[11] = 0;
  dst[12] = cameraPosition[0];
  dst[13] = cameraPosition[1];
  dst[14] = cameraPosition[2];
  dst[15] = 1;

  return dst;
}

// eslint-disable-next-line require-jsdoc
function cross(a: Vector3, b: Vector3) {
  const dst = new MatType(3);
  dst[0] = a[1] * b[2] - a[2] * b[1];
  dst[1] = a[2] * b[0] - a[0] * b[2];
  dst[2] = a[0] * b[1] - a[1] * b[0];
  return dst;
}

// eslint-disable-next-line require-jsdoc
function subtractVectors(a: Vector3, b: Vector3) {
  const dst = new MatType(3);
  dst[0] = a[0] - b[0];
  dst[1] = a[1] - b[1];
  dst[2] = a[2] - b[2];
  return dst;
}

// eslint-disable-next-line require-jsdoc
function normalize(v: Vector3) {
  const dst = new MatType(3);
  const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (length > 0.00001) {
    dst[0] = v[0] / length;
    dst[1] = v[1] / length;
    dst[2] = v[2] / length;
  }
  return dst;
}

// eslint-disable-next-line require-jsdoc
function inverse(m: Float32Array) {
  const dst = new MatType(16);
  const m00 = m[0 * 4 + 0];
  const m01 = m[0 * 4 + 1];
  const m02 = m[0 * 4 + 2];
  const m03 = m[0 * 4 + 3];
  const m10 = m[1 * 4 + 0];
  const m11 = m[1 * 4 + 1];
  const m12 = m[1 * 4 + 2];
  const m13 = m[1 * 4 + 3];
  const m20 = m[2 * 4 + 0];
  const m21 = m[2 * 4 + 1];
  const m22 = m[2 * 4 + 2];
  const m23 = m[2 * 4 + 3];
  const m30 = m[3 * 4 + 0];
  const m31 = m[3 * 4 + 1];
  const m32 = m[3 * 4 + 2];
  const m33 = m[3 * 4 + 3];
  const tmp_0 = m22 * m33;
  const tmp_1 = m32 * m23;
  const tmp_2 = m12 * m33;
  const tmp_3 = m32 * m13;
  const tmp_4 = m12 * m23;
  const tmp_5 = m22 * m13;
  const tmp_6 = m02 * m33;
  const tmp_7 = m32 * m03;
  const tmp_8 = m02 * m23;
  const tmp_9 = m22 * m03;
  const tmp_10 = m02 * m13;
  const tmp_11 = m12 * m03;
  const tmp_12 = m20 * m31;
  const tmp_13 = m30 * m21;
  const tmp_14 = m10 * m31;
  const tmp_15 = m30 * m11;
  const tmp_16 = m10 * m21;
  const tmp_17 = m20 * m11;
  const tmp_18 = m00 * m31;
  const tmp_19 = m30 * m01;
  const tmp_20 = m00 * m21;
  const tmp_21 = m20 * m01;
  const tmp_22 = m00 * m11;
  const tmp_23 = m10 * m01;

  const t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
		(tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
  const t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
		(tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
  const t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
		(tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
  const t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
		(tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

  const d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

  dst[0] = d * t0;
  dst[1] = d * t1;
  dst[2] = d * t2;
  dst[3] = d * t3;
  dst[4] = d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
		(tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30));
  dst[5] = d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
		(tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30));
  dst[6] = d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
		(tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30));
  dst[7] = d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
		(tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20));
  dst[8] = d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
		(tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33));
  dst[9] = d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
		(tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33));
  dst[10] = d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
		(tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33));
  dst[11] = d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
		(tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23));
  dst[12] = d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
		(tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22));
  dst[13] = d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
		(tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02));
  dst[14] = d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
		(tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12));
  dst[15] = d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
		(tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02));

  return dst;
}

// eslint-disable-next-line require-jsdoc
function multiply(a: Float32Array, b: Float32Array) {
  const dst = new MatType(16);
  const b00 = b[0 * 4 + 0];
  const b01 = b[0 * 4 + 1];
  const b02 = b[0 * 4 + 2];
  const b03 = b[0 * 4 + 3];
  const b10 = b[1 * 4 + 0];
  const b11 = b[1 * 4 + 1];
  const b12 = b[1 * 4 + 2];
  const b13 = b[1 * 4 + 3];
  const b20 = b[2 * 4 + 0];
  const b21 = b[2 * 4 + 1];
  const b22 = b[2 * 4 + 2];
  const b23 = b[2 * 4 + 3];
  const b30 = b[3 * 4 + 0];
  const b31 = b[3 * 4 + 1];
  const b32 = b[3 * 4 + 2];
  const b33 = b[3 * 4 + 3];
  const a00 = a[0 * 4 + 0];
  const a01 = a[0 * 4 + 1];
  const a02 = a[0 * 4 + 2];
  const a03 = a[0 * 4 + 3];
  const a10 = a[1 * 4 + 0];
  const a11 = a[1 * 4 + 1];
  const a12 = a[1 * 4 + 2];
  const a13 = a[1 * 4 + 3];
  const a20 = a[2 * 4 + 0];
  const a21 = a[2 * 4 + 1];
  const a22 = a[2 * 4 + 2];
  const a23 = a[2 * 4 + 3];
  const a30 = a[3 * 4 + 0];
  const a31 = a[3 * 4 + 1];
  const a32 = a[3 * 4 + 2];
  const a33 = a[3 * 4 + 3];
  dst[ 0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
  dst[ 1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
  dst[ 2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
  dst[ 3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
  dst[ 4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
  dst[ 5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
  dst[ 6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
  dst[ 7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
  dst[ 8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
  dst[ 9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
  dst[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
  dst[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
  dst[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
  dst[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
  dst[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
  dst[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
  return dst;
}


// eslint-disable-next-line require-jsdoc
function xRotate(m: Float32Array, angleInRadians: number) {
  // This is the optimized version of
  // Return multiply(m, xRotation(angleInRadians), dst);
  const dst = new MatType(16);

  const m10 = m[4];
  const m11 = m[5];
  const m12 = m[6];
  const m13 = m[7];
  const m20 = m[8];
  const m21 = m[9];
  const m22 = m[10];
  const m23 = m[11];
  const c = Math.cos(angleInRadians);
  const s = Math.sin(angleInRadians);

  dst[4] = c * m10 + s * m20;
  dst[5] = c * m11 + s * m21;
  dst[6] = c * m12 + s * m22;
  dst[7] = c * m13 + s * m23;
  dst[8] = c * m20 - s * m10;
  dst[9] = c * m21 - s * m11;
  dst[10] = c * m22 - s * m12;
  dst[11] = c * m23 - s * m13;

  if (m !== dst) {
    dst[0] = m[0];
    dst[1] = m[1];
    dst[2] = m[2];
    dst[3] = m[3];
    dst[12] = m[12];
    dst[13] = m[13];
    dst[14] = m[14];
    dst[15] = m[15];
  }

  return dst;
}

// eslint-disable-next-line require-jsdoc
function yRotate(m: Float32Array, angleInRadians: number) {
  // This is the optimized version of
  // Return multiply(m, yRotation(angleInRadians), dst);
  const dst = new MatType(16);

  const m00 = m[0 * 4 + 0];
  const m01 = m[0 * 4 + 1];
  const m02 = m[0 * 4 + 2];
  const m03 = m[0 * 4 + 3];
  const m20 = m[2 * 4 + 0];
  const m21 = m[2 * 4 + 1];
  const m22 = m[2 * 4 + 2];
  const m23 = m[2 * 4 + 3];
  const c = Math.cos(angleInRadians);
  const s = Math.sin(angleInRadians);

  dst[0] = c * m00 - s * m20;
  dst[1] = c * m01 - s * m21;
  dst[2] = c * m02 - s * m22;
  dst[3] = c * m03 - s * m23;
  dst[8] = c * m20 + s * m00;
  dst[9] = c * m21 + s * m01;
  dst[10] = c * m22 + s * m02;
  dst[11] = c * m23 + s * m03;

  if (m !== dst) {
    dst[4] = m[4];
    dst[5] = m[5];
    dst[6] = m[6];
    dst[7] = m[7];
    dst[12] = m[12];
    dst[13] = m[13];
    dst[14] = m[14];
    dst[15] = m[15];
  }

  return dst;
}
// */
