import {
    Material,
    GeometryInstance,
    RectangleGeometry,
    Ellipsoid,
    Rectangle,
    EllipsoidSurfaceAppearance,
    Cartesian2,
    Primitive
} from 'cesium';
import sourceShader from './shader/waterShader/sourceShader.glsl';
import fragmentShader from './shader/waterShader/fragmentShaderSource.glsl';
import vertexShader from './shader/waterShader/vertexShaderSource.glsl';
import GeneratorTexture from "@pages/ncFilePage/renderMode/GeneratorTexture.js";


// 渲染矩形区域
export default function waterRender(viewer, data, header, updateLegendData) {
    const {lonDistance, latDistance, min, max, textureWidth, textureHeight, latRange, lonRange} = header; // 提取头部信息
    console.log(latRange, lonRange)
    const scene = viewer.scene;

    const width = textureWidth;
    const height = textureHeight;


    const textureGen = new GeneratorTexture({
        resolution: [width, height],
        dataRange: [min, max],     // u_range: 温度实际范围10~40℃
        latRange: latRange,
        viewer: viewer,
    });

    data.forEach(([lon, lat, temp]) => {
        textureGen.addDataPoint(lon, lat, temp);
    });

    const material = new Material({
        fabric: {
            uniforms: {
                iTime: 0,
            },
            source: sourceShader
        },
    });
    const rectangleInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
            ellipsoid: Ellipsoid.WGS84,
            rectangle: Rectangle.fromDegrees(-180, latRange[0], 180, latRange[1]),
            vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT
        }),
    });

    const appearance = new EllipsoidSurfaceAppearance({
        material: material,
        // aboveGround: true,
        translucent: true,
        vertexShaderSource: vertexShader,
        fragmentShaderSource: fragmentShader,
    });


    appearance.uniforms = {
        u_image_res: new Cartesian2(width, height), // 纹理图像分辨率
        u_image: textureGen.generateTexture()
    }

    function renderLoop(timestamp) {
        appearance.material.uniforms.iTime = timestamp / 1000;
        requestAnimationFrame(renderLoop);
    }

    renderLoop();


    // 添加到场景
    const primitives = new Primitive({
        geometryInstances: [rectangleInstance],
        appearance,
        asynchronous: false,
    })

    // 将 Primitive 添加到场景中
    scene.primitives.add(primitives);
    // viewer.scene.globe.material = material;

    return {
        type: 'primitives',
        dispose: () => {
            // 提供清理函数以移除 Primitive
            viewer.scene.primitives.remove(primitives);
        },
        uv: textureGen.generate().toDataURL(),
    }
}