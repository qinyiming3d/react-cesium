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
} from 'cesium'
import windPoleFsShader from './shader/winPole/windPoleFsShader.glsl';
import windPoleVsShader from './shader/winPole/windPoleVsShader.glsl';

export default function windPoleRender(viewer, data, header) {
    const {lonDistance, latDistance} = header;
    const scene = viewer.scene;

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
        })
    ;

    console.log(appearance.fragmentShaderSource)


    const instance = [];
    // 遍历 data 动态生成多个 Instance
    data.forEach(item => {
        const [lon, lat, u, v] = item;

        const angle = Math.abs(getAngleFromUV(u, v)); // 计算角度的绝对值
        const colorIntensity = Math.min(angle / Math.PI, 1.0); // 将角度归一化到 [0, 1]
        const color = new Color(colorIntensity, colorIntensity, colorIntensity, 1.0); // 角度越大，颜色越白

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
                color: ColorGeometryInstanceAttribute.fromColor(color), // 设置颜色属性
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