import * as Cesium from 'cesium';
import {
    Primitive,
} from 'cesium'
import sourceShader from './shader/rectangleSorceShader.glsl'

// 定义颜色带数组，每个元素包含温度值和对应的 RGBA 颜色值
function generateColorArray(minTemp, maxTemp) {
    const step = (maxTemp - minTemp) / 12; // 将范围分为 12 个区间
    const colors = [
        [115, 70, 105, 1],
        [202, 172, 195, 1],
        [162, 70, 145, 1],
        [143, 89, 169, 1],
        [157, 219, 217, 1],
        [106, 191, 181, 1],
        [100, 166, 189, 1],
        [93, 133, 198, 1],
        [68, 125, 99, 1],
        [128, 147, 24, 1],
        [243, 183, 4, 1],
        [232, 83, 25, 1],
        [71, 14, 0, 1]
    ];

    const colorArray = [];
    for (let i = 0; i <= 12; i++) {
        const temp = minTemp + step * i;
        colorArray.push([temp, colors[i]]);
    }

    return colorArray;
}

// 配置选项，用于控制颜色比例尺的类型和步长
const options = {
    colorScaleType: 'linear', // step 表示分段渐变，linear 表示线性渐变
    step: 3, // 分段步长，可以是布尔值或数字
};

// 创建线性渐变——使用CanvasGradient.addColorStop(offset, color) 方法
function createGradient(interpolateColor, min, max, w, h, gradient, ctx) {
    // 遍历颜色映射数组，设置渐变的颜色停靠点
    for (let i = 0; i < interpolateColor.length; i += 1) {
        const key = interpolateColor[i].key;
        const color = interpolateColor[i].value;
        gradient.addColorStop((key - min) / (max - min), color);
    }

    // 填充渐变到画布
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
}

// 创建分段渐变
function createStepGradient(interpolateColor, min, max, w, h, ctx) {
    // 遍历颜色映射数组，按分段填充颜色
    for (let i = 0; i < interpolateColor.length; i += 1) {
        const key = interpolateColor[i].key;
        let keyNext = key;
        if (i < interpolateColor.length - 1) {
            keyNext = interpolateColor[i + 1].key;
        } else {
            keyNext = max;
        }
        const color = interpolateColor[i].value;
        const current = ((key - min) / (max - min)) * w; // 当前段的起点
        const next = ((keyNext - min) / (max - min)) * w; // 当前段的终点
        ctx.fillStyle = color;
        ctx.fillRect(current, 0, next - current, 1);
    }
}

// 创建颜色纹理
function createColorTexture(range = [], colors) {
    // 将颜色数组转换为键值对形式
    const interpolateColor = colors.map((item) => ({
        key: item[0],
        value: item[1],
    }));
    const keys = interpolateColor
        .map(d => parseFloat(d.key));
    // 颜色带的最大最小值
    const [min, max] = [range[0] || Math.min(...keys), range[1] || Math.max(...keys)];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const w = 256; // 纹理宽度
    const h = 1;   // 纹理高度
    canvas.width = w;
    canvas.height = h;

    if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        if (options.colorScaleType === 'linear') {
            // 创建线性渐变
            createGradient(interpolateColor, min, max, w, h, gradient, ctx);
        } else if (options.colorScaleType === 'step') {
            if (options.step === false || options.step === undefined) {
                // 创建分段渐变
                createStepGradient(interpolateColor, min, max, w, h, ctx);
            } else {
                // 创建带步长的分段渐变
                const interval = Number(options?.step); // 步长
                createGradient(interpolateColor, min, max, w, h, gradient, ctx);
                const len = Math.round((max - min) / interval);
                const canvas2 = document.createElement('canvas');
                const ctx2 = canvas2.getContext('2d');
                canvas2.width = w;
                canvas2.height = h;
                for (let j = 0; j < len; j++) {
                    let keyNext = j;
                    if (j < len - 1) {
                        keyNext = j + 1;
                    } else {
                        keyNext = len;
                    }
                    const current = Math.round((j / len) * w); // 当前段的起点
                    const color = ctx.getImageData(current, 0, 1, 1).data;
                    const next = Math.round((keyNext / len) * w); // 当前段的终点
                    ctx2.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
                    ctx2.fillRect(current, 0, next - current, h);
                }

                return {
                    canvas: canvas2,
                    colorRange: [min, max],
                };
            }
        }

        return {
            canvas,
            colorRange: [min, max]
        };
    }
}


class TemperatureTextureGenerator {
    constructor(options) {
        this.resolution = options.resolution; // 匹配 u_image_res
        this.dataRange = options.dataRange;         // 对应 u_range
        this.colorRange = options.colorRange;       // 对应 u_color_range
        this.latRange = options.latRange;           // 纬度范围
        this._initGrid();
    }

    // 初始化空网格
    _initGrid() {
        this.grid = new Float32Array(this.resolution[0] * this.resolution[1]); // 默认填充0
        this.grid.fill(Infinity);
    }

    // 经纬度转纹理坐标（适配Cesium矩形范围）
    _lonLatToUV(lon, lat) {
        // const lonRadio = lon <= 180 ? (1 - lon / 180) : (((lon - 180) / 180) * 0.5);
        // const lonRadio = (lon - 0.5) / (360 - 0.5);
        const lonRadio = lon / 360
        const latRadio = (0 - lat - this.latRange[0]) / (this.latRange[1] - this.latRange[0]);
        return [
            lonRadio,                  // u ∈ [0,1]
            latRadio  // v ∈ [0,1]
        ];
    }

    // 添加原始数据点
    addDataPoint(lon, lat, value) {
        const [u, v] = this._lonLatToUV(lon, lat);
        let x = Math.round(u * this.resolution[0]);
        x = x > this.resolution[0] / 2 ? x - this.resolution[0] / 2 : x + this.resolution[0] / 2;
        const y = Math.floor(v * this.resolution[1]);
        const idx = y * this.resolution[0] + x;
        this.grid[idx] = value
    }

    // 生成插值后纹理
    generate() {
        const canvas = document.createElement('canvas');
        [canvas.width, canvas.height] = this.resolution;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(...this.resolution);

        // 数据归一化
        const minVal = this.dataRange[0];
        const maxVal = this.dataRange[1];
        const normalize = v => (v - minVal) / (maxVal - minVal);

        // 填充像素（单通道R）
        for (let i = 0; i < this.grid.length; i++) {
            const val = this.grid[i];
            if (val === Infinity) {
                imageData.data[i * 4 + 3] = 255;                   // Alpha通道
                continue;
            }
            const normVal = normalize(val) + 0.1;
            imageData.data[i * 4] = Math.floor(normVal * 255); // R通道
            imageData.data[i * 4 + 3] = 255;                   // Alpha通道
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
}


// 渲染矩形区域
export default function rectangleRender(viewer, data, header, updateLegendData) {
    const {lonDistance, latDistance, min, max, textureWidth, textureHeight, latRange, lonRange} = header; // 提取头部信息
    const scene = viewer.scene;

    const width = textureWidth;
    const height = textureHeight;

    // 将颜色数组转换为以摄氏度为单位的颜色映射
    const colors = generateColorArray(min, max).map(item => [item[0], 'rgba(' + item[1].join(',') + ')']);

    // 创建颜色纹理对象
    const color = createColorTexture([], colors);

    const textureGen = new TemperatureTextureGenerator({
        resolution: [width, height],
        dataRange: [min, max],     // u_range: 温度实际范围10~40℃
        colorRange: [color.colorRange[0], color.colorRange[1]],    // u_color_range: 颜色映射15~35℃
        latRange: latRange,
    });

    data.forEach(([lon, lat, temp]) => {
        textureGen.addDataPoint(lon, lat, temp);
    });


    const tempCanvas = textureGen.generate();

    const dataUrl = tempCanvas.toDataURL(); // 默认生成PNG格式
    const imgElement = document.createElement('img');
    imgElement.src = dataUrl;
    Object.assign(imgElement.style, {
        display: 'block',                     // 块级元素
        margin: '20px auto',                  // 居中布局
        border: '2px solid #e0e0e0',          // 边框
        borderRadius: '8px',                  // 圆角
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', // 阴影
        imageRendering: 'crisp-edges'         // 缩放模式 (auto/crisp-edges/pixelated)
    });

    // document.body.appendChild(imgElement);


    const material = new Cesium.Material({
        fabric: {
            type: 'TemperatureOverlay',
            uniforms: {
                u_image_res: new Cesium.Cartesian2(width, height),
                u_range: new Cesium.Cartesian2(min, max), // 数据范围,
                u_color_range: new Cesium.Cartesian2(color.colorRange[0], color.colorRange[1]), // 颜色范围
                u_image: tempCanvas.toDataURL(),
                color_ramp: color.canvas, // 颜色纹理
            },
            source: sourceShader
        },
    });
    const rectangleInstance = new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
            ellipsoid: Cesium.Ellipsoid.WGS84,
            rectangle: Cesium.Rectangle.fromDegrees(-180, latRange[0], 180, latRange[1]),
            vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT
        }),
    });


    // 添加到场景
    const primitives = new Cesium.Primitive({
        geometryInstances: [rectangleInstance],
        appearance: new Cesium.EllipsoidSurfaceAppearance({
            material: material,
            aboveGround: true,
            translucent: true,
        }),
        asynchronous: false,
    });

    // 将 Primitive 添加到场景中
    scene.primitives.add(primitives);
    // viewer.scene.globe.material = material;
    updateLegendData({min, max, colors: color.canvas.toDataURL()})

    return {
        type: 'primitives',
        dispose: () => {
            // 提供清理函数以移除 Primitive
            viewer.scene.primitives.remove(primitives);
        }
    }
}

