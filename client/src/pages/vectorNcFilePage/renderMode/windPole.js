import {
    Material,
    GeometryInstance,
    Primitive,
    RectangleGeometry,
    Rectangle,
    Color,
    EllipsoidSurfaceAppearance,
    ColorGeometryInstanceAttribute,
    Math as cesiumMath,
    Texture
} from 'cesium'
import windPoleFsShader from './shader/winPole/windPoleFsShader.glsl';
import windPoleVsShader from './shader/winPole/windPoleVsShader.glsl';
import {createColorTexture} from '@_public/util.js'

export default function windPoleRender(viewer, data, header, updateLegendData) {
    const {lonDistance, latDistance} = header;
    const scene = viewer.scene;

    let maxMagnitude = 0;
    let minMagnitude = 0;
    data.forEach(([lon, lat, u, v]) => {
        maxMagnitude = Math.max(maxMagnitude, Math.sqrt(u * u + v * v));
        minMagnitude = Math.min(minMagnitude, Math.sqrt(u * u + v * v));
    })
    const color = createColorTexture({minValue: minMagnitude, maxValue: maxMagnitude});
    const ctx = color.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, 256, 1);
    const colorTexture = new Texture({
        context: scene.context,
        source: {
            arrayBufferView: imageData.data,
            width: 256,
            height: 1
        }
    });

    const appearance = new EllipsoidSurfaceAppearance({
        material: new Material({
            fabric: {
                type: "Image",
                uniforms: {
                    image: "/arrow.png",
                },
            }
        }),
        fragmentShaderSource: windPoleFsShader,
        vertexShaderSource: windPoleVsShader,
        aboveGround: true,
    });

    appearance.uniforms = {
        u_colorTexture: colorTexture
    }


    const instance = [];
    // 遍历 data 动态生成多个 Instance
    data.forEach(item => {
        const [lon, lat, u, v] = item;

        const magnitude = Math.sqrt(u * u + v * v);
        const colorIntensity = Math.min(magnitude / (maxMagnitude - minMagnitude), 1.0); // 将模长归一化到 [0, 1]

        const rectangle = new RectangleGeometry({
            rectangle: Rectangle.fromDegrees(
                wrap(lon - lonDistance / 2, -180, 180),
                cesiumMath.clamp(lat - latDistance / 2, -90, 90),
                wrap(lon + lonDistance / 2, -180, 180),
                cesiumMath.clamp(lat + latDistance / 2, -90, 90)
            ),
            stRotation: getAngleFromUV(u, v),
            vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        });
        const geometry = RectangleGeometry.createGeometry(rectangle);
        const geometryInstance = new GeometryInstance({
            geometry: geometry,
            attributes: {
                // color: ColorGeometryInstanceAttribute.fromColor(color), // 设置颜色属性
                color: ColorGeometryInstanceAttribute.fromColor(new Color(colorIntensity, 0.0, 0.0, 0.0)), // 设置颜色属性
            },
        });

        instance.push(geometryInstance)
    });

    const primitives = new Primitive({
        geometryInstances: instance,
        appearance: appearance,
        asynchronous: false,
    })

    scene.primitives.add(primitives);

    updateLegendData({min: minMagnitude, max: maxMagnitude, colors: color.canvas.toDataURL()})

    return {
        type: 'primitives',
        dispose: () => {
            viewer.scene.primitives.remove(primitives);
        }
    }
}

function wrap(value, min, max) {
    const range = max - min;
    return ((value - min) % range + range) % range + min;
}

function getAngleFromUV(u, v) {
    // 计算逆时针弧度（以正北为0°）
    return -Math.atan2(u, v);
}