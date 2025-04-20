import * as Cesium from 'cesium';
import {
    MaterialAppearance,
    Material,
    BoxGeometry,
    Matrix4,
    Cartesian3,
    Transforms,
    GeometryInstance,
    Primitive,
    VertexFormat,
} from 'cesium'

export default function shaderRender(viewer, data, header) {
    const {lonDistance, latDistance, min, max} = header;
    const scene = viewer.scene;
    // 定义 fabric shader
    /*
    struct czm_material {
      vec3 diffuse;——漫反射颜色
      float specular;——高光强度
      float shininess;——镜面反射强度
      vec3 normal;——相机或眼坐标中的法线
      vec3 emission;——自发光颜色
      float alpha;
    }
    */
    const shader = `
    czm_material czm_getMaterial(czm_materialInput materialInput) {
        czm_material material = czm_getDefaultMaterial(materialInput);
        // material.diffuse = vec3(0.8, 0.2, 0.1);
        // material.specular = 3.0;
        // material.shininess = 0.8;
        material.alpha = 0.3;
        return material;
    }`;

    const vertexShader = `
    in vec3 position3DHigh;
    in vec3 position3DLow;
    in vec3 normal;
    in vec2 st;
    in float batchId;
    
    in vec4 color; // 从 attributes 获取颜色
    out vec4 v_color; // 传递到 fragment shader
    
    out vec3 v_positionEC;
    out vec3 v_normalEC;
    out vec2 v_st;
    
    void main()
    {
        v_color = color; // 将颜色传递给 out
        vec4 p = czm_computePosition();
    
        v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
        v_normalEC = czm_normal * normal;                         // normal in eye coordinates
        v_st = st;
    
        gl_Position = czm_modelViewProjectionRelativeToEye * p;
    }`;

    const fragmentShader = `
    in vec3 v_positionEC;
    in vec3 v_normalEC;
    in vec2 v_st;
    in vec4 v_color; // 接收 vertex shader 传递的颜色
    
    void main()
    {
        vec3 positionToEyeEC = -v_positionEC;
    
        vec3 normalEC = normalize(v_normalEC);
    #ifdef FACE_FORWARD
        normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
    #endif
    
        czm_materialInput materialInput;
        materialInput.normalEC = normalEC;
        materialInput.positionToEyeEC = positionToEyeEC;
        materialInput.st = v_st;
        czm_material material = czm_getMaterial(materialInput);
    
    #ifdef FLAT
        out_FragColor = vec4(material.diffuse + material.emission, material.alpha);
    #else
        // out_FragColor = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
        out_FragColor = vec4(v_color.rgb, material.alpha);
    #endif
    }`;


    const appearance = new MaterialAppearance({
        material: new Material({
            fabric: {
                source: shader
            },
        }),
        vertexShaderSource: vertexShader,
        fragmentShaderSource: fragmentShader,
    });
    console.log(appearance.vertexShaderSource);
    console.log('-------------------');
    console.log(appearance.fragmentShaderSource)

    const point1 = Cesium.Cartesian3.fromDegrees(lonDistance, 0);
    const point2 = Cesium.Cartesian3.fromDegrees(0, 0);
    const lonDist = computedAbsoluteDistance(point1, point2);
    const point3 = Cesium.Cartesian3.fromDegrees(0, latDistance);
    const point4 = Cesium.Cartesian3.fromDegrees(0, 0);
    const latDist = computedAbsoluteDistance(point3, point4);
    const instance = [];
    const scaleFactor = 5000000.0; // 控制高度的比例因子
    // 遍历 data 动态生成多个 Instance
    data.forEach(item => {
        const [lon, lat, dimensions] = item;

        const Ratio = (dimensions - min) / (max - min);
        const enhancedRatio = Math.pow(Ratio, 5); // 立方增强高度差异
        const height = scaleFactor * enhancedRatio

        const color = Cesium.Color.fromHsl(
            enhancedRatio * 0.8, // 色相范围从0到0.8（红到紫）
            1.0,         // 饱和度固定为1
            0.5          // 亮度固定为0.5
        );

        const boxModelMatrix = Matrix4.multiplyByTranslation(
            Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(lon, lat)),
            new Cartesian3(0.0, 0.0, 500000 * 0.5),
            new Matrix4()
        )


        const geometry = BoxGeometry.fromDimensions({
            vertexFormat: VertexFormat.POSITION_NORMAL_AND_ST,
            dimensions: new Cesium.Cartesian3(lonDist, latDist, height)
        });

        const geometryInstance = new GeometryInstance({
            geometry: geometry,
            modelMatrix: boxModelMatrix, // 应用 ENU + 平移矩阵
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
            }
        });


        instance.push(geometryInstance)

    });
    // const test = new Primitive({
    //     geometryInstances: instance,
    //     appearance: appearance,
    // })
    // console.log(test.vertexShaderSource);
    // console.log(test.fragmentShaderSource);
    scene.primitives.add(
        new Primitive({
            geometryInstances: instance,
            appearance: appearance,
        })
    );
}

const computedAbsoluteDistance = (point1, point2) => {
    return Math.abs(Cesium.Cartesian3.distance(point1, point2));
}