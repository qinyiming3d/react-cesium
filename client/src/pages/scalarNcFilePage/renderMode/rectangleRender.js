import * as Cesium from 'cesium';
import {
    Primitive,
} from 'cesium'
import sourceShader from './shader/rectangleSorceShader.glsl'
import GeneratorTexture from "@pages/scalarNcFilePage/renderMode/GeneratorTexture.js";
import {createColorTexture} from '@_public/util.js'


// 渲染矩形区域
export default function rectangleRender(viewer, data, header, updateLegendData) {
    const {lonDistance, latDistance, min, max, textureWidth, textureHeight, latRange} = header; // 提取头部信息
    const scene = viewer.scene;

    const width = textureWidth;
    const height = textureHeight;

    const color = createColorTexture({minValue: min, maxValue: max});

    const textureGen = new GeneratorTexture({
        resolution: [width, height],
        dataRange: [min, max],     // u_range: 温度实际范围10~40℃
        latRange: latRange,
    });

    data.forEach(([lon, lat, temp]) => {
        textureGen.addDataPoint(lon, lat, temp);
    });


    const tempCanvas = textureGen.generate();


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
        },
        uv: tempCanvas.toDataURL(),
    }
}

