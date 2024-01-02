/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from '../Module.ts';
import { error } from '../errors.ts';

export interface ShaderProgramWithLocations {
  program: WebGLProgram,
  locations: {
    attributes: Record<string, number>,
    uniforms: Record<string, WebGLUniformLocation>
  }
}

export interface Framebuffer {
  glfb: WebGLFramebuffer,
  width: number,
  height: number
}

export interface Texture {
  gltx: WebGLTexture,
  width: number,
  height: number
}

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
  'RGBA': [
    'UNSIGNED_BYTE', 'UNSIGNED_SHORT_4_4_4_4', 'UNSIGNED_SHORT_5_5_5_1'
  ],
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

type TransformMatrix = Float32Array

/**
 * Holds all the methods necessary to draw to the screen and/or otherwise
 * display information.
 */
export class Frame extends Module {

  /// PRIVATE VARIABLES ///

  /** The canvas */
  private static cnv: HTMLCanvasElement;
  /** The rendering context */
  private static gl: WebGL2RenderingContext;

  private static clearColor: [number, number, number] = [0, 0, 0.1];

  /** The amount of pixels visible on the screen */
  public static pixelCount = 25000;

  /** The main shader used for rendering pretty much everything */
  private static shaderProgram: ShaderProgramWithLocations;

  /** The vertex position buffer! */
  private static vertexDataBuffer: WebGLBuffer;
  private static vertexData: Float32Array = new Float32Array(64);

  private static textureData = new Float32Array(6);

  /** A secondary transform matrix,  */
  private static secondaryTransformMatrix: TransformMatrix =
    new Float32Array(9);

  /** The current transform matrix. Gets passed to the matrix uniform. */
  private static transformMatrix: TransformMatrix = new Float32Array(9);

  /** The stack for transform matrices */
  private static transformMatrixStack: Array<TransformMatrix> = [ ];

  /** Functions that run every frame */
  private static frameFunctions: Array<(delta: number) => void> = [ ];

  private static drawColor: [number, number, number, number] = [ 1, 0, 0, 1 ];

  /// PUBLIC VARIABLES ///

  public static frameCount = 0;

  public static width = 0;
  public static height = 0;

  /// BASIC FUNCTIONS ///

  /**
   * Initiates the frame
   * @param canvasElement The HTMLCanvasElement we're using to draw
   */
  public static init(
    canvas: string | HTMLCanvasElement
  ) {
    super.init();
    const canvasElement = canvas instanceof HTMLCanvasElement ? canvas
      : document.querySelector(canvas)! as HTMLCanvasElement;

    // Initiate the canvas...
    this.cnv = canvasElement;
    this.gl = this.cnv.getContext('webgl2', {
      antialias: false
    }) as WebGL2RenderingContext;

    // Set the blending
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Make sure the size is correct
    this.resize();

    // Compile the shaders
    this.shaderProgram = this.createProgram(
      vertexShaderSource, fragmentShaderSource,
      {
        a_position: 'vec2'
      }, {
        u_tex_info: 'float[6]' as 'float',
        u_texture: 'sampler2D',
        u_matrix: 'mat3',
        color: 'vec4'
      }, {
        v_texcoord: 'vec2'
      }, {
        out_color: 'vec4'
      }
    );

    /// Setup the vertex buffer ///
    this.vertexDataBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexDataBuffer);
    this.gl.enableVertexAttribArray(
      this.shaderProgram.locations.attributes['a_position']
    );
    this.gl.vertexAttribPointer(
      this.shaderProgram.locations.attributes['a_position'],
      2, // Number of floats per point
      this.gl.FLOAT, // The type of the array
      true, // Normalize the data (does nothing for float, helps for int)
      0, // Stride. Data is tightly packed, so skip
      0 // Offset. See above
    );

    // Bind the shader
    this.gl.useProgram(this.shaderProgram.program);

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

    return this;
  }

  /**
   * Finalizes a shader, adding everything it needs before it gets used by
   * WebGL and compled to a shader
   * @param shaderSource The source of the shader
   * @param attributes The attributes it will have access to
   * @param uniforms The uniforms it will have access to
   * @param varyings These turn into input or output depending on `receiving`
   * @param isFragment If true, varyings are set to `in`, else they're `out`
   * @returns The finalized shader source
   */
  private static finalizeShaderSource(
    shaderSource: string,
    attributes: Record<string, ShaderType>,
    uniforms: Record<string, ShaderType>,
    varyings: Record<string, ShaderType> = {},
    outputs: Record<string, ShaderType> = {},
    isFragment: boolean
  ) {
    // Start with the version string
    let finalSource = '#version 300 es\n';

    /**
     * Adds a variable to the shader source. Takes care of converting array
     * types to their respective names as well.
     * @param varKind 
     * @param name 
     * @param type 
     */
    function addVar(varKind: string, name: string, type: string) {
      if (type.includes('[')) {
        const [ actualType, arrLen ] = type.split('[');
        finalSource += `${varKind} ${actualType} ${name}[${arrLen};\n`;
      } else {
        finalSource += `${varKind} ${type} ${name};\n`;
      }
    }

    // Append the fragment shader header
    if (isFragment) {
      finalSource += 'precision highp float;\n';
    }

    // Append attributes
    for (const attribute in attributes) {
      addVar('in', attribute, attributes[attribute]);
    }

    // Append uniforms
    for (const uniform in uniforms) {
      addVar('uniform', uniform, uniforms[uniform]);
    }

    // Append varyings
    for (const varying in varyings) {
      addVar(isFragment ? 'in' : 'out', varying, varyings[varying]);
    }

    // Append outputs
    if (isFragment) {
      for (const output in outputs) {
        addVar('out', output, outputs[output]);
      }
    }

    // Finally, return
    return finalSource + shaderSource;
  }

  /// SHADERS ///

  /**
   * Loads a shader.
   * @param gl The WebGLRenderingContext to use.
   * @param shaderSource The shader source.
   * @param shaderType The type of shader.
   * @param opt_errorCallback callback for
   * errors.
   * @return The created shader.
   */
  public static loadShader(
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

  /**
   * Compiles a vertex and fragment shader into a shader program, which gets
   * used directly by WebGL to draw things to the canvas
   * @param vertSource The source of the vertex shader. This should be passed
   * without the GLSL header and without uniform, attribute, nor varying
   * declarations, as they are all generated.
   * @param fragSource The source of the fragment shader. This should be passed
   * without the GLSL header and without uniform, attribute, varying, nor output
   * declarations, as they are all generated.
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
    const finalVertSource = this.finalizeShaderSource(
      vertSource,
      attributes, uniforms, varyings, outputs, false
    );
    const finalFragSource = this.finalizeShaderSource(
      fragSource,
      attributes, uniforms, varyings, outputs, true
    );
    console.log(finalFragSource);
    const shaders = [
      this.loadShader(this.gl, finalVertSource, this.gl.VERTEX_SHADER),
      this.loadShader(this.gl, finalFragSource, this.gl.FRAGMENT_SHADER),
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

  /// TEXTURE / FRAMEBUFFER THINGS ///

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
    data?: Uint8Array | HTMLImageElement | HTMLCanvasElement
  ): Texture {
    // Floor the width and height
    width = ~~width;
    height = ~~height;

    const texture = this.gl.createTexture()!; // Create the texture
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture); // Bind it

    /*
    Set the texture data from the `data` parameter. When it's null, this just
    sets the size of the texture, setting all color values to zero.
    */
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl[format], width, height, 0,
      this.gl[FORMAT_MAPPINGS[format]], this.gl[type], (data ?? null) as null
    );

    // Sets the minification, magnification and wrapping functions
    const tex2D = this.gl.TEXTURE_2D;
    this.gl.texParameteri(tex2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(tex2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(tex2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(tex2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    return {
      gltx: texture,
      width,
      height
    };
  }

  /**
   * Creates a framebuffer from a texture
   * @param texture The texture that the framebuffer will write to
   * @returns The created framebuffer
   */
  public static createFrameBuffer(texture: Texture): Framebuffer {
    const frameBuffer = this.gl.createFramebuffer()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture.gltx);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0, // TODO: This should eventually be editable!
      this.gl.TEXTURE_2D,
      texture.gltx,
      0
    );
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return {
      glfb: frameBuffer,
      width: texture.width,
      height: texture.height,
    };
  }

  /** Starts drawing to a framebuffer instead of to the main canvas. */
  public static drawToFramebuffer(fb: Framebuffer) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb.glfb);
    this.gl.viewport(0, 0, fb.width, fb.height);
    this.transformResetStack(fb.width, fb.height);
  }

  /**
   * Stops drawing to a framebuffer. Note that calling this more than once will
   * cause issues with the transform matrix stack!
   */
  public static stopDrawingToFramebuffer() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, this.width, this.height);
    this.transformPop();
  }

  /** Puts data in a texture (in a specified format) */
  public static setTextureData<T extends InnerFormatType>(
    texture: Texture,
    width: number,
    height: number,
    format: T,
    type: typeof POSSIBLE_FORMAT_CHOICES[T][number],
    data: Uint8Array | HTMLImageElement | HTMLCanvasElement
  ) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture.gltx);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl[format], width, height, 0,
      this.gl[FORMAT_MAPPINGS[format]], this.gl[type], data as unknown as any
    );
  }

  /// KEEP SCREEN SIZE CONSTANT
  /** Resizes the screen if it has been resized! */
  private static resize() {
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

      // Update the viewport transform
      this.gl.viewport(0, 0, this.width, this.height);
    }
  }

  /// FRAME METHODS ///

  /**
   * Runs every frame, and draws everything
   * @param delta The time elapsed since the last frame
   */
  private static frame(delta: number) {
    this.resize();

    // Go back to the default framebuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    // Clear the canvas
    this.gl.clearColor(...this.clearColor, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Reset the transform stack
    if (this.transformMatrixStack.length > 0) {
      this.transformMatrixStack = [];
    }

    // Reset the transform matrix
    this.transformMatrix[0] = 2 / this.width;
    this.transformMatrix[1] = 0;
    this.transformMatrix[2] = 0;
    this.transformMatrix[3] = 0;
    this.transformMatrix[4] = -2 / this.height;
    this.transformMatrix[5] = 0;
    this.transformMatrix[6] = -1;
    this.transformMatrix[7] = 1;
    this.transformMatrix[8] = 1;

    // Run all the frame functions (in the order they were added!)
    for (const el of this.frameFunctions) {
      el(delta);
    }
  }

  /** Adds a function that will run every frame */
  public static addFrameFunction(
    fn: (delta: number) => void,
    context?: unknown
  ) {
    this.frameFunctions.push(fn.bind(context));
  }

  /// TRANSFORM METHODS ///
  /**
   * Translates everything that is drawn by (x, y)
   */
  public static translate(x: number, y: number) {
    // Save the old matrix
    this.transformMatrixStack.push(new Float32Array(this.transformMatrix));

    // Multiply by the translation matrix
    this.secondaryTransformMatrix[0] = 1;
    this.secondaryTransformMatrix[1] = 0;
    this.secondaryTransformMatrix[2] = 0;
    this.secondaryTransformMatrix[3] = 0;
    this.secondaryTransformMatrix[4] = 1;
    this.secondaryTransformMatrix[5] = 0;
    this.secondaryTransformMatrix[6] = x;
    this.secondaryTransformMatrix[7] = y;
    this.secondaryTransformMatrix[8] = 1;
    multiply(this.transformMatrix, this.secondaryTransformMatrix);

    // Update the matrix uniform
    this.gl.uniformMatrix3fv(
      this.shaderProgram.locations.uniforms.u_matrix, // Matrix uniform location
      false, // Don't transpose
      this.transformMatrix // Pass the transformation matrix
    );
  }

  /**
   * Makes the transform go back to its normal form without deleting the stack
   */
  public static transformResetStack(width: number, height: number) {
    // Save the old matrix
    this.transformMatrixStack.push(new Float32Array(this.transformMatrix));

    // Make the new matrix
    // For some reason, THIS transform can't be y-flipped, as it's ALREADY
    // FLIPPED FOR SOME REASON. I don't know why this happens.
    this.transformMatrix[0] = 2 / width;
    this.transformMatrix[1] = 0;
    this.transformMatrix[2] = 0;
    this.transformMatrix[3] = 0;
    this.transformMatrix[4] = 2 / height;
    this.transformMatrix[5] = 0;
    this.transformMatrix[6] = -1;
    this.transformMatrix[7] = -1;
    this.transformMatrix[8] = 1;

    // Update the matrix uniform
    this.gl.uniformMatrix3fv(
      this.shaderProgram.locations.uniforms.u_matrix, // Matrix uniform location
      false, // Don't transpose
      this.transformMatrix // Pass the transformation matrix
    );
  }

  /**
   * Goes back to the last saved transform matrix
   */
  public static transformPop() {
    this.transformMatrix = this.transformMatrixStack.pop()!;

    // Update the matrix uniform
    this.gl.uniformMatrix3fv(
      this.shaderProgram.locations.uniforms.u_matrix, // Matrix uniform location
      false, // Don't transpose
      this.transformMatrix // Pass the transformation matrix
    );
  }

  /// DRAWING METHODS ///

  /** Sets the drawing color, using RGBA from 0-1 */
  public static color(r: number, g: number, b: number, a: number = 1) {
    this.drawColor[0] = r;
    this.drawColor[1] = g;
    this.drawColor[2] = b;
    this.drawColor[3] = a;
  }

  /** Multiplies the drawing color by the given values */
  public static multiplyColor(r: number, g: number, b: number, a: number = 1) {
    this.drawColor[0] *= r;
    this.drawColor[1] *= g;
    this.drawColor[2] *= b;
    this.drawColor[3] *= a;
  }

  /**
   * Draws a line
   * @param x1 The X position of the starting point
   * @param y1 The Y position of the starting point
   * @param x2 The X position of the ending point
   * @param y2 The Y position of the ending point
  */
  public static line(x1: number, y1: number, x2: number, y2: number) {
    this.gl.uniform4fv(
      this.shaderProgram.locations.uniforms.color,
      this.drawColor
    );
    this.vertexData[0] = x1 - 0.5;
    this.vertexData[1] = y1 - 0.5;
    this.vertexData[2] = x2;
    this.vertexData[3] = y2;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexDataBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER, this.vertexData, this.gl.DYNAMIC_DRAW
    );
    this.gl.drawArrays(this.gl.LINES, 0, 2);
  }


  /**
   * Draws a line
   * @param x The X position of the starting point
   * @param y The Y position of the starting point
   * @param width The X position of the ending point
   * @param height The Y position of the ending point
  */
  public static rect(x: number, y: number, width: number, height: number) {
    this.gl.uniform4fv(
      this.shaderProgram.locations.uniforms.color,
      this.drawColor
    );
    x = ~~x;
    y = ~~y;
    width = ~~width;
    height = ~~height;
    this.vertexData[0] = x;
    this.vertexData[1] = y;
    this.vertexData[2] = x + width;
    this.vertexData[3] = y;
    this.vertexData[4] = x;
    this.vertexData[5] = y + height;
    this.vertexData[6] = x + width;
    this.vertexData[7] = y + height;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexDataBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER, this.vertexData, this.gl.DYNAMIC_DRAW
    );
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Draws a circle! This is slow because the circle's vertices are generated
   * on demand, every time a circle is drawn.
   * Note: the circle will be drawn with 32 vertices. To draw a higher-quality
   * circle, use `Frame.slowCircle()`.
   * @param x The x position
   * @param y The y position
   * @param radius The radius
   * @param offset How many radians to turn the circle as its vertices are being
   * generated.
   */
  public static circle(x: number, y: number, radius: number, offset = 0) {
    this.gl.uniform4fv(
      this.shaderProgram.locations.uniforms.color,
      this.drawColor
    );
    for (let i = 0; i < 64; i += 2) {
      const a = i * 0.1013416985 + offset;
      this.vertexData[i    ] = ~~(Math.cos(a) * radius + x);
      this.vertexData[i + 1] = ~~(Math.sin(a) * radius + y);
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexDataBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER, this.vertexData, this.gl.DYNAMIC_DRAW
    );
    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 32);
  }

  /**
   * Draws a texture!
   * @param texture The texture to be drawn
   * @param x The x position
   * @param y The y position
   * @param width The destination width
   * @param height The destination height
   */
  public static drawTexture(
    texture: Texture,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture.gltx);
    this.vertexData[0] = x;
    this.vertexData[1] = y;
    this.vertexData[2] = x + width;
    this.vertexData[3] = y;
    this.vertexData[4] = x;
    this.vertexData[5] = y + height;
    this.vertexData[6] = x + width;
    this.vertexData[7] = y + height;
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER, this.vertexData, this.gl.DYNAMIC_DRAW
    );

    this.textureData[0] = this.vertexData[0]; // X (top-left)
    this.textureData[1] = this.vertexData[1]; // Y (top-left)
    this.textureData[2] = 0; // X offset (as 0-1)
    this.textureData[3] = 0; // Y offset (as 0-1)
    this.textureData[4] = (1 / width); // Texture width (inverse)
    this.textureData[5] = (1 / height); // Texture height (inverse)
    this.gl.uniform1fv(
      this.shaderProgram.locations.uniforms.u_tex_info,
      this.textureData
    );

    this.drawColor[3] *= -1;
    this.gl.uniform4fv(
      this.shaderProgram.locations.uniforms.color,
      this.drawColor
    );
    this.drawColor[3] *= -1;

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

// This is just here so we can have proper syntax highlighting in VSCode!
const glsl = (...x: (TemplateStringsArray | string | number)[]) => x.join('');

const vertexShaderSource = glsl`

// All shaders have a main function
void main() {
  // Pass the texcoord to the fragment shader.
  v_texcoord = a_position.xy - vec2(u_tex_info[0], u_tex_info[1]);

  // Multiply the position by the matrix.
  gl_Position = vec4(u_matrix * vec3(a_position, 1.0), 1.0);
}

`;

const fragmentShaderSource = glsl`

void main() {
  if (color.w < 0.0) {
    out_color = texture(
      u_texture,
      // v_texcoord * vec2(u_tex_info[4], u_tex_info[5])
      (floor(v_texcoord) + 0.5) * vec2(u_tex_info[4], u_tex_info[5]) +
      vec2(u_tex_info[2], u_tex_info[3])
    ) * vec4(color.rgb, -color.a);
  } else { out_color = color; }
}

`;

// eslint-disable-next-line require-jsdoc, @typescript-eslint/no-unused-vars
export function multiply(a: TransformMatrix, b: TransformMatrix) {
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a10 = a[3],
    a11 = a[4],
    a12 = a[5],
    a20 = a[6],
    a21 = a[7],
    a22 = a[8];

  const b00 = b[0],
    b01 = b[1],
    b02 = b[2],
    b10 = b[3],
    b11 = b[4],
    b12 = b[5],
    b20 = b[6],
    b21 = b[7],
    b22 = b[8];

  a[0] = b00 * a00 + b01 * a10 + b02 * a20;
  a[1] = b00 * a01 + b01 * a11 + b02 * a21;
  a[2] = b00 * a02 + b01 * a12 + b02 * a22;

  a[3] = b10 * a00 + b11 * a10 + b12 * a20;
  a[4] = b10 * a01 + b11 * a11 + b12 * a21;
  a[5] = b10 * a02 + b11 * a12 + b12 * a22;

  a[6] = b20 * a00 + b21 * a10 + b22 * a20;
  a[7] = b20 * a01 + b21 * a11 + b22 * a21;
  a[8] = b20 * a02 + b21 * a12 + b22 * a22;
  return a;
}
