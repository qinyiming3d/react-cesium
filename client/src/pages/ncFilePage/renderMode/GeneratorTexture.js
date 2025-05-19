import {Texture} from 'cesium'

class GeneratorTexture {
    constructor(options) {
        this.resolution = options.resolution; // 匹配 u_image_res
        this.dataRange = options.dataRange;         // 对应 u_range
        this.latRange = options.latRange;           // 纬度范围
        this.viewer = options.viewer;                 // Cesium Viewer实例
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

    generateTexture() {
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
        return new Texture({
            context: this.viewer.scene.context,
            source: {
                arrayBufferView: imageData.data,
                width: this.resolution[0],
                height: this.resolution[1]
            }
        });
    }
}

export default GeneratorTexture;