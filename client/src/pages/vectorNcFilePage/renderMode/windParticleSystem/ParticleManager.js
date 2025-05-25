import {ClearCommand, Color, Pass} from 'cesium';
import * as Cesium from 'cesium';
import MyPrimitive from './MyPrimitive.js';
import * as Util from './util.js';
import calculateSpeedFsShader from '../shader/particleSystem/calculateSpeed.frag.glsl';
import updatePositionFsShader from '../shader/particleSystem/updatePosition.frag.glsl';
import postProcessingPositionFsShader from '../shader/particleSystem/postProcessingPosition.frag.glsl';
import segmentDrawFsShader from '../shader/particleSystem/segmentDraw.frag.glsl';
import segmentDrawVsShader from '../shader/particleSystem/segmentDraw.vert.glsl';
import trailDrawFsShader from '../shader/particleSystem/trailDraw.frag.glsl';
import trailDrawVsShader from '../shader/particleSystem/trailDraw.vert.glsl';
import screenDrawFsShader from '../shader/particleSystem/screenDraw.frag.glsl';
import screenDrawVsShader from '../shader/particleSystem/screenDraw.vert.glsl';
import eventBus from '@_public/eventBus.js';

// 负责粒子计算，包括速度计算，位置更新和后处理
class ParticlesComputing {
    constructor(context, data, viewerParameters) {
        this.data = data;
        this.createWindTextures(context, data);
        this.createParticlesTextures(context, viewerParameters, data);
        this.createComputingPrimitives(data, viewerParameters);
    }

    // 生成风场u方向和v方向纹理
    createWindTextures(context, data) {
        let windTextureOptions = {
            context: context,
            width: data.dimensions.lon,
            height: data.dimensions.lat,
            pixelFormat: Cesium.PixelFormat.RED,
            pixelDatatype: Cesium.PixelDatatype.FLOAT,
            flipY: false,
            sampler: new Cesium.Sampler({
                minificationFilter: Cesium.TextureMinificationFilter.NEAREST,
                magnificationFilter: Cesium.TextureMagnificationFilter.NEAREST
            })
        };

        this.windTextures = {
            U: Util.createTexture(windTextureOptions, data.U.array),
            V: Util.createTexture(windTextureOptions, data.V.array)
        };
        eventBus.emit('windTextureGenerated', [{
            title: 'U',
            array: data.U.array,
            width: data.dimensions.lon,
            height: data.dimensions.lat,
            min: data.U.min,
            max: data.U.max,
        },{
            title: 'V',
            array: data.V.array,
            width: data.dimensions.lon,
            height: data.dimensions.lat,
            min: data.U.min,
            max: data.U.max,
        }])
    }

    createParticlesTextures(context, viewerParameters) {
        let particlesTextureOptions = {
            context: context,
            width: 100, // 横向粒子数
            height: 100, // 纵向粒子数
            pixelFormat: Cesium.PixelFormat.RGBA,
            pixelDatatype: Cesium.PixelDatatype.FLOAT,
            flipY: false,
            sampler: new Cesium.Sampler({
                // the values of texture will not be interpolated
                minificationFilter: Cesium.TextureMinificationFilter.NEAREST,
                magnificationFilter: Cesium.TextureMagnificationFilter.NEAREST
            })
        };

        // r通道x坐标（经度）  g通道y坐标（纬度）  b通道z坐标（高度） a通道为0
        let particlesArray = randomizeParticles(10000, viewerParameters, this.data.lev);
        let zeroArray = new Float32Array(4 * 10000).fill(0); // 每个粒子需要4个浮点数存储（pixelFormat是RGBA）

        this.particlesTextures = {
            previousParticlesPosition: Util.createTexture(particlesTextureOptions, particlesArray),
            currentParticlesPosition: Util.createTexture(particlesTextureOptions, particlesArray),
            nextParticlesPosition: Util.createTexture(particlesTextureOptions, particlesArray),
            postProcessingPosition: Util.createTexture(particlesTextureOptions, particlesArray),

            particlesSpeed: Util.createTexture(particlesTextureOptions, zeroArray)
        };

        eventBus.emit('windTextureGenerated', [{
            title: '粒子初始位置',
            array: particlesArray,
            width: 100,
            height: 100,
        }])
    }

    destroyParticlesTextures() {
        Object.keys(this.particlesTextures).forEach((key) => {
            this.particlesTextures[key].destroy();
        });
    }

    createComputingPrimitives(data, viewerParameters) {
        const dimension = new Cesium.Cartesian3(data.dimensions.lon, data.dimensions.lat, data.dimensions.lev);
        const minimum = new Cesium.Cartesian3(data.lon.min, data.lat.min, data.lev.min);
        const maximum = new Cesium.Cartesian3(data.lon.max, data.lat.max, data.lev.max);
        const interval = new Cesium.Cartesian3(
            (maximum.x - minimum.x) / (dimension.x - 1),
            (maximum.y - minimum.y) / (dimension.y - 1),
            dimension.z > 1 ? (maximum.z - minimum.z) / (dimension.z - 1) : 1.0
        ); // 每个粒子之间经度、纬度、高度的距离（以度为单位）
        const uSpeedRange = new Cesium.Cartesian2(data.U.min, data.U.max);
        const vSpeedRange = new Cesium.Cartesian2(data.V.min, data.V.max);

        const that = this;

        let flag = true;

        this.primitives = {
            // 计算速度管线，rgb通道分别表示粒子在经度、纬度、高度上的速度，a表示风速强度  单位：经纬度
            calculateSpeed: new MyPrimitive({
                commandType: 'Compute',
                uniformMap: {
                    U: () => {
                        return that.windTextures.U;
                    },
                    V: () => {
                        return that.windTextures.V;
                    },
                    currentParticlesPosition: () => {
                        return that.particlesTextures.currentParticlesPosition;
                    },
                    dimension: () => {
                        return dimension;
                    }, // 分辨率，如经度纬度为720*360
                    minimum: () => {
                        return minimum;
                    }, // 左下角坐标
                    maximum: () => {
                        return maximum;
                    }, // 右上角坐标
                    interval: function () {
                        return interval;
                    },// 每个粒子之间的距离
                    uSpeedRange: function () {
                        return uSpeedRange;
                    }, // u分量的最大最小值
                    vSpeedRange: function () {
                        return vSpeedRange;
                    }, // v分量的最大最小值
                    pixelSize: function () {
                        return viewerParameters.pixelSize;
                    }, // 屏幕上一个像素对应的实际地理尺寸（以米为单位）
                    speedFactor: function () {
                        return 1.5;
                    }, // 粒子运动速度
                },
                fragmentShaderSource: new Cesium.ShaderSource({
                    sources: [calculateSpeedFsShader],
                }),
                outputTexture: this.particlesTextures.particlesSpeed,
                preExecute: function () {
                    // 每一帧都会调用这个函数，使用帧而不是时间。Cesium 的 scene.preRender 事件会在每一帧调用 update 方法，触发粒子系统的计算和渲染逻辑。通过这种逐帧更新机制，粒子看起来像是连续运动的。
                    let temp;
                    temp = that.particlesTextures.previousParticlesPosition;
                    that.particlesTextures.previousParticlesPosition = that.particlesTextures.currentParticlesPosition;
                    that.particlesTextures.currentParticlesPosition = that.particlesTextures.postProcessingPosition;
                    that.particlesTextures.postProcessingPosition = temp;

                    // keep the outputTexture up to date
                    that.primitives.calculateSpeed.commandToExecute.outputTexture = that.particlesTextures.particlesSpeed;
                }
            }),

            // 负责计算下一张粒子位置的管线（简单） 单位：经纬度
            updatePosition: new MyPrimitive({
                commandType: 'Compute',
                uniformMap: {
                    currentParticlesPosition: function () {
                        return that.particlesTextures.currentParticlesPosition;
                    },
                    particlesSpeed: function () {
                        return that.particlesTextures.particlesSpeed;
                    }
                },
                fragmentShaderSource: new Cesium.ShaderSource({
                    sources: [updatePositionFsShader],
                }),
                outputTexture: this.particlesTextures.nextParticlesPosition,
                preExecute: function () {
                    // keep the outputTexture up to date
                    that.primitives.updatePosition.commandToExecute.outputTexture = that.particlesTextures.nextParticlesPosition;
                }
            }),

            // 将下一张粒子的位置进行后处理，决定该粒子是否死亡，死亡则在随机位置生成
            postProcessingPosition: new MyPrimitive({
                commandType: 'Compute',
                uniformMap: {
                    nextParticlesPosition: function () {
                        return that.particlesTextures.nextParticlesPosition;
                    },
                    particlesSpeed: function () {
                        return that.particlesTextures.particlesSpeed;
                    },
                    lonRange: function () {
                        return viewerParameters.lonRange;
                    },
                    latRange: function () {
                        return viewerParameters.latRange;
                    },
                    randomCoefficient: function () {
                        var randomCoefficient = Math.random();
                        return randomCoefficient;
                    },
                    dropRate: function () {
                        return 0.01
                    },// 表示粒子掉落的基础概率。值越高，粒子被移除或重新生成的频率越高。
                    dropRateBump: function () {
                        return 0.01
                    }, // 表示在特定条件下对 dropRate 的额外增量。它可以用来动态调整粒子掉落的概率，使粒子系统更具变化性或响应性。
                },
                fragmentShaderSource: new Cesium.ShaderSource({
                    sources: [postProcessingPositionFsShader],
                }),
                outputTexture: this.particlesTextures.postProcessingPosition,
                preExecute: function () {
                    // keep the outputTexture up to date
                    that.primitives.postProcessingPosition.commandToExecute.outputTexture = that.particlesTextures.postProcessingPosition;
                }
            })
        }
    }

}

// 负责粒子的渲染，包括轨迹分段、轨迹渐隐和最终屏幕渲染
class ParticlesRendering {
    constructor(context, data, viewerParameters, particlesComputing, colorTexture) {
        this.colorTexture = colorTexture; // 我定义的颜色纹理
        this.createRenderingTextures(context, data);
        this.createRenderingFramebuffers(context);
        this.createRenderingPrimitives(context, viewerParameters, particlesComputing);
    }

    createRenderingTextures(context, data) {
        const colorTextureOptions = {
            context: context,
            width: context.drawingBufferWidth,
            height: context.drawingBufferHeight,
            pixelFormat: Cesium.PixelFormat.RGBA,
            pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE
        };
        const depthTextureOptions = {
            context: context,
            width: context.drawingBufferWidth,
            height: context.drawingBufferHeight,
            pixelFormat: Cesium.PixelFormat.DEPTH_COMPONENT,
            pixelDatatype: Cesium.PixelDatatype.UNSIGNED_INT
        };

        this.textures = {
            segmentsColor: Util.createTexture(colorTextureOptions),
            segmentsDepth: Util.createTexture(depthTextureOptions),

            currentTrailsColor: Util.createTexture(colorTextureOptions),
            currentTrailsDepth: Util.createTexture(depthTextureOptions),

            nextTrailsColor: Util.createTexture(colorTextureOptions),
            nextTrailsDepth: Util.createTexture(depthTextureOptions),
        };
    }

    createRenderingFramebuffers(context) {
        this.framebuffers = {
            segments: Util.createFramebuffer(context, this.textures.segmentsColor, this.textures.segmentsDepth),
            currentTrails: Util.createFramebuffer(context, this.textures.currentTrailsColor, this.textures.currentTrailsDepth),
            nextTrails: Util.createFramebuffer(context, this.textures.nextTrailsColor, this.textures.nextTrailsDepth)
        }
    }

    createSegmentsGeometry() {
        const repeatVertex = 6;

        let st = [];
        // 每个粒子生成 6 个顶点，每个顶点的纹理坐标为 (s/100, t/100)。
        for (let s = 0; s < 100; s++) {
            for (let t = 0; t < 100; t++) {
                for (let i = 0; i < repeatVertex; i++) {
                    st.push(s / 100);
                    st.push(t / 100);
                }
            }
        }
        st = new Float32Array(st);

        let normal = [];
        const pointToUse = [-1, 0, 1];
        const offsetSign = [-1, 1];
        for (let i = 0; i < 10000; i++) {
            for (let j = 0; j < pointToUse.length; j++) {
                for (let k = 0; k < offsetSign.length; k++) {
                    normal.push(pointToUse[j]);
                    normal.push(offsetSign[k]);
                    normal.push(0);
                }
            }
        }
        normal = new Float32Array(normal);

        const indexSize = 12 * 10000;
        let vertexIndexes = new Uint32Array(indexSize);
        for (let i = 0, j = 0, vertex = 0; i < 10000; i++) {
            vertexIndexes[j++] = vertex + 0;
            vertexIndexes[j++] = vertex + 1;
            vertexIndexes[j++] = vertex + 2;

            vertexIndexes[j++] = vertex + 2;
            vertexIndexes[j++] = vertex + 1;
            vertexIndexes[j++] = vertex + 3;

            vertexIndexes[j++] = vertex + 2;
            vertexIndexes[j++] = vertex + 4;
            vertexIndexes[j++] = vertex + 3;

            vertexIndexes[j++] = vertex + 4;
            vertexIndexes[j++] = vertex + 3;
            vertexIndexes[j++] = vertex + 5;

            vertex += repeatVertex;
        }

        let geometry = new Cesium.Geometry({
            attributes: new Cesium.GeometryAttributes({
                st: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 2,
                    values: st
                }),
                normal: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 3,
                    values: normal
                }),
            }),
            indices: vertexIndexes
        });

        return geometry;
    }

    createRenderingPrimitives(context, viewerParameters, particlesComputing) {
        const that = this;
        this.primitives = {
            // 粒子轨迹的分段图元。通过三角形模拟线段，并使用法线和斜接方向的偏移量来控制线段的宽度和连接效果。它结合了粒子的位置数据和屏幕投影坐标，最终实现粒子轨迹的可视化
            segments: new MyPrimitive({
                commandType: 'Draw',
                attributeLocations: {
                    st: 0,
                    normal: 1
                },
                geometry: this.createSegmentsGeometry(),
                primitiveType: Cesium.PrimitiveType.TRIANGLES,
                uniformMap: {
                    previousParticlesPosition: function () {
                        return particlesComputing.particlesTextures.previousParticlesPosition;
                    },
                    currentParticlesPosition: function () {
                        return particlesComputing.particlesTextures.currentParticlesPosition;
                    },
                    postProcessingPosition: function () {
                        return particlesComputing.particlesTextures.postProcessingPosition;
                    },
                    aspect: function () {
                        return context.drawingBufferWidth / context.drawingBufferHeight;
                    },
                    pixelSize: function () {
                        return viewerParameters.pixelSize;
                    },
                    lineWidth: function () {
                        return 2;
                    }, // 线的宽度
                    particleHeight: function () {
                        return 1000;
                    }, // 粒子高度
                    particlesSpeed: function () {
                        return particlesComputing.particlesTextures.particlesSpeed; // 传递速度纹理
                    },
                    colorTexture: function () {
                        return that.colorTexture;
                    }
                },
                vertexShaderSource: new Cesium.ShaderSource({
                    sources: [segmentDrawVsShader],
                }),
                fragmentShaderSource: new Cesium.ShaderSource({
                    sources: [segmentDrawFsShader],
                }),
                rawRenderState: Util.createRawRenderState({
                    // undefined value means let Cesium deal with it
                    viewport: undefined,
                    depthTest: {
                        enabled: true
                    },
                    depthMask: true
                }),
                framebuffer: this.framebuffers.segments,
                autoClear: true
            }),

            // 粒子轨迹的图元 控制颜色渐隐，并且与地球进行深度测试
            trails: new MyPrimitive({
                commandType: 'Draw',
                attributeLocations: {
                    position: 0,
                    st: 1
                },
                geometry: Util.getFullscreenQuad(),
                primitiveType: Cesium.PrimitiveType.TRIANGLES,
                uniformMap: {
                    segmentsColorTexture: function () {
                        return that.textures.segmentsColor;
                    },
                    segmentsDepthTexture: function () {
                        return that.textures.segmentsDepth;
                    },
                    currentTrailsColor: function () {
                        return that.framebuffers.currentTrails.getColorTexture(0);
                    },
                    trailsDepthTexture: function () {
                        return that.framebuffers.currentTrails.depthTexture;
                    },
                    fadeOpacity: function () {
                        return 0.95;
                    } // 用于控制粒子轨迹渐隐效果的参数
                },
                // prevent Cesium from writing depth because the depth here should be written manually
                vertexShaderSource: new Cesium.ShaderSource({
                    defines: ['DISABLE_GL_POSITION_LOG_DEPTH'],
                    sources: [trailDrawVsShader],
                }),
                fragmentShaderSource: new Cesium.ShaderSource({
                    defines: ['DISABLE_LOG_DEPTH_FRAGMENT_WRITE'],
                    sources: [trailDrawFsShader],
                }),
                rawRenderState: Util.createRawRenderState({
                    viewport: undefined,
                    depthTest: {
                        enabled: true,
                        func: Cesium.DepthFunction.ALWAYS // always pass depth test for full control of depth information
                    },
                    depthMask: true
                }),
                framebuffer: this.framebuffers.nextTrails,
                autoClear: true,
                preExecute: function () {
                    // swap framebuffers before binding
                    var temp;
                    temp = that.framebuffers.currentTrails;
                    that.framebuffers.currentTrails = that.framebuffers.nextTrails;
                    that.framebuffers.nextTrails = temp;

                    // keep the framebuffers up to date
                    that.primitives.trails.commandToExecute.framebuffer = that.framebuffers.nextTrails;
                    that.primitives.trails.clearCommand.framebuffer = that.framebuffers.nextTrails;
                }
            }),

            // 粒子到屏幕的最终图元 仅用于处理粒子轨迹的深度测试
            screen: new MyPrimitive({
                commandType: 'Draw',
                attributeLocations: {
                    position: 0,
                    st: 1
                },
                geometry: Util.getFullscreenQuad(),
                primitiveType: Cesium.PrimitiveType.TRIANGLES,
                uniformMap: {
                    trailsColorTexture: function () {
                        return that.framebuffers.nextTrails.getColorTexture(0);
                    },
                    trailsDepthTexture: function () {
                        return that.framebuffers.nextTrails.depthTexture;
                    }
                },
                // prevent Cesium from writing depth because the depth here should be written manually
                vertexShaderSource: new Cesium.ShaderSource({
                    defines: ['DISABLE_GL_POSITION_LOG_DEPTH'],
                    sources: [screenDrawVsShader],
                }),
                fragmentShaderSource: new Cesium.ShaderSource({
                    defines: ['DISABLE_LOG_DEPTH_FRAGMENT_WRITE'],
                    sources: [screenDrawFsShader],
                }),
                rawRenderState: Util.createRawRenderState({
                    viewport: undefined,
                    depthTest: {
                        enabled: false
                    },
                    depthMask: true,
                    blending: {
                        enabled: true
                    }
                }),
                framebuffer: undefined // undefined value means let Cesium deal with it
            })
        };
    }
}

const randomizeParticles = (maxParticles, viewerParameters, height) => {
    let array = new Float32Array(4 * maxParticles);
    for (let i = 0; i < maxParticles; i++) {
        array[4 * i] = Cesium.Math.randomBetween(viewerParameters.lonRange.x, viewerParameters.lonRange.y);
        array[4 * i + 1] = Cesium.Math.randomBetween(viewerParameters.latRange.x, viewerParameters.latRange.y);
        array[4 * i + 2] = Cesium.Math.randomBetween(height.min, height.max);
        array[4 * i + 3] = 0.0;
    }
    return array;
}

export default class ParticleManager {
    constructor(context, data, viewerParameters, colorTexture) {
        this.colorTexture = colorTexture;
        this.context = context;
        this.data = data;
        this.viewerParameters = viewerParameters;

        this.particlesComputing = new ParticlesComputing(
            this.context, this.data, this.viewerParameters
        );
        this.particlesRendering = new ParticlesRendering(
            this.context, this.data, this.viewerParameters, this.particlesComputing, this.colorTexture
        );
    }

    canvasResize(context) {
        this.particlesComputing.destroyParticlesTextures();
        Object.keys(this.particlesComputing.windTextures).forEach((key) => {
            this.particlesComputing.windTextures[key].destroy();
        });

        Object.keys(this.particlesRendering.framebuffers).forEach((key) => {
            this.particlesRendering.framebuffers[key].destroy();
        });

        this.context = context;
        this.particlesComputing = new ParticlesComputing(
            this.context, this.data, this.viewerParameters
        );
        this.particlesRendering = new ParticlesRendering(
            this.context, this.data, this.viewerParameters, this.particlesComputing, this.colorTexture
        );
    }
}