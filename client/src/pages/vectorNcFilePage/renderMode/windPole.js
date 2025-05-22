import {
    Material,
    GeometryInstance,
    Primitive,
    RectangleGeometry,
    Rectangle,
    EllipsoidSurfaceAppearance,
    Math as cesiumMath,
} from 'cesium'

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
        aboveGround: true,
    });


    const instance = [];
    // 遍历 data 动态生成多个 Instance
    data.forEach(item => {
        const [lon, lat, u, v] = item;

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