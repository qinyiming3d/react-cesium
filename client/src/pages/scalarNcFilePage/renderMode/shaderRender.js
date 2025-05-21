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
    const shader = /*glsl*/ `
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

    let aper = new Cesium.MaterialAppearance({
        material: new Cesium.Material({
            fabric: {
                uniforms: {
                    iTime: 0,
                },
                source: `
        const int NUM_STEPS = 8;
      const float PI     = 3.141592;
      const float EPSILON  = 1e-3;
      //#define EPSILON_NRM (0.1 / iResolution.x)
      #define EPSILON_NRM (0.1 / 200.0)
      // sea
      const int ITER_GEOMETRY = 3;
      const int ITER_FRAGMENT = 5;
      const float SEA_HEIGHT = 0.6;
      const float SEA_CHOPPY = 4.0;
      const float SEA_SPEED = 1.8;
      const float SEA_FREQ = 0.16;
      const vec3 SEA_BASE = vec3(0.1,0.19,0.22);
      const vec3 SEA_WATER_COLOR = vec3(0.8,0.9,0.6);
      //#define SEA_TIME (1.0 + iTime * SEA_SPEED)
      const mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);
      // math
      mat3 fromEuler(vec3 ang) {
        vec2 a1 = vec2(sin(ang.x),cos(ang.x));
        vec2 a2 = vec2(sin(ang.y),cos(ang.y));
        vec2 a3 = vec2(sin(ang.z),cos(ang.z));
        mat3 m;
        m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
        m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
        m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
        return m;
      }
      float hash( vec2 p ) {
        float h = dot(p,vec2(127.1,311.7));
        return fract(sin(h)*43758.5453123);
      }
      float noise( in vec2 p ) {
        vec2 i = floor( p );
        vec2 f = fract( p );
        vec2 u = f*f*(3.0-2.0*f);
        return -1.0+2.0*mix( mix( hash( i + vec2(0.0,0.0) ),
                 hash( i + vec2(1.0,0.0) ), u.x),
              mix( hash( i + vec2(0.0,1.0) ),
                 hash( i + vec2(1.0,1.0) ), u.x), u.y);
      }
      // lighting
      float diffuse(vec3 n,vec3 l,float p) {
        return pow(dot(n,l) * 0.4 + 0.6,p);
      }
      float specular(vec3 n,vec3 l,vec3 e,float s) {
        float nrm = (s + 8.0) / (PI * 8.0);
        return pow(max(dot(reflect(e,n),l),0.0),s) * nrm;
      }
      // sky
      vec3 getSkyColor(vec3 e) {
        e.y = max(e.y,0.0);
        return vec3(pow(1.0-e.y,2.0), 1.0-e.y, 0.6+(1.0-e.y)*0.4);
      }
      // sea
      float sea_octave(vec2 uv, float choppy) {
        uv += noise(uv);
        vec2 wv = 1.0-abs(sin(uv));
        vec2 swv = abs(cos(uv));
        wv = mix(wv,swv,wv);
        return pow(1.0-pow(wv.x * wv.y,0.65),choppy);
      }
      float map(vec3 p) {
        float freq = SEA_FREQ;
        float amp = SEA_HEIGHT;
        float choppy = SEA_CHOPPY;
        vec2 uv = p.xz; uv.x *= 0.75;
        float d, h = 0.0;
        float SEA_TIME = 1.0 + iTime * SEA_SPEED;
        for(int i = 0; i < ITER_GEOMETRY; i++) {
          d = sea_octave((uv+SEA_TIME)*freq,choppy);
          d += sea_octave((uv-SEA_TIME)*freq,choppy);
          h += d * amp;
          uv *= octave_m; freq *= 1.9; amp *= 0.22;
          choppy = mix(choppy,1.0,0.2);
        }
        return p.y - h;
      }
      float map_detailed(vec3 p) {
        float freq = SEA_FREQ;
        float amp = SEA_HEIGHT;
        float choppy = SEA_CHOPPY;
        vec2 uv = p.xz; uv.x *= 0.75;
        float SEA_TIME = 1.0 + iTime * SEA_SPEED;
        float d, h = 0.0;
        for(int i = 0; i < ITER_FRAGMENT; i++) {
          d = sea_octave((uv+SEA_TIME)*freq,choppy);
          d += sea_octave((uv-SEA_TIME)*freq,choppy);
          h += d * amp;
          uv *= octave_m; freq *= 1.9; amp *= 0.22;
          choppy = mix(choppy,1.0,0.2);
        }
        return p.y - h;
      }
      vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist) {
        float fresnel = clamp(1.0 - dot(n,-eye), 0.0, 1.0);
        fresnel = pow(fresnel,3.0) * 0.65;
        vec3 reflected = getSkyColor(reflect(eye,n));
        vec3 refracted = SEA_BASE + diffuse(n,l,80.0) * SEA_WATER_COLOR * 0.12;
        vec3 color = mix(refracted,reflected,fresnel);
        float atten = max(1.0 - dot(dist,dist) * 0.001, 0.0);
        color += SEA_WATER_COLOR * (p.y - SEA_HEIGHT) * 0.18 * atten;
        color += vec3(specular(n,l,eye,60.0));
        return color;
      }
      // tracing
      vec3 getNormal(vec3 p, float eps) {
        vec3 n;
        n.y = map_detailed(p);
        n.x = map_detailed(vec3(p.x+eps,p.y,p.z)) - n.y;
        n.z = map_detailed(vec3(p.x,p.y,p.z+eps)) - n.y;
        n.y = eps;
        return normalize(n);
      }
      float heightMapTracing(vec3 ori, vec3 dir, out vec3 p) {
        float tm = 0.0;
        float tx = 1000.0;
        float hx = map(ori + dir * tx);
        if(hx > 0.0) return tx;
        float hm = map(ori + dir * tm);
        float tmid = 0.0;
        for(int i = 0; i < NUM_STEPS; i++) {
          tmid = mix(tm,tx, hm/(hm-hx));
          p = ori + dir * tmid;
          float hmid = map(p);
          if(hmid < 0.0) {
            tx = tmid;
            hx = hmid;
          } else {
            tm = tmid;
            hm = hmid;
          }
        }
        return tmid;
      }
           vec4 czm_getMaterial(vec2 vUv)
           {
            vec2 uv = vUv;
            uv = vUv * 2.0 - 1.0;
            float time = iTime * 0.3 + 0.0*0.01;
            // ray
            vec3 ang = vec3(0, 1.2, 0.0);
              vec3 ori = vec3(0.0,3.5,0);
            vec3 dir = normalize(vec3(uv.xy,-2.0)); dir.z += length(uv) * 0.15;
            dir = normalize(dir) * fromEuler(ang);
            // tracing
            vec3 p;
            heightMapTracing(ori,dir,p);
            vec3 dist = p - ori;
            vec3 n = getNormal(p, dot(dist,dist) * EPSILON_NRM);
            vec3 light = normalize(vec3(0.0,1.0,0.8));
            // color
            vec3 color = mix(
              getSkyColor(dir),
              getSeaColor(p,n,light,dir,dist),
              pow(smoothstep(0.0,-0.05,dir.y),0.3));
               return vec4( pow(color,vec3(0.75)), 1.0 );
           }
        `,
            }
        }),
        translucent: true,

        vertexShaderSource: `
        in vec3 position3DHigh;
        in vec3 position3DLow;
        in float batchId;
        in vec2 st;
        in vec3 normal;
        out vec2 v_st;
        out vec3 v_positionEC;
        out vec3 v_normalEC;
        void main() {
            v_st = st;
            vec4 p = czm_computePosition();
            v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
            v_normalEC = czm_normal * normal;                         // normal in eye coordinates
            gl_Position = czm_modelViewProjectionRelativeToEye * p;
        }
                    `,
        fragmentShaderSource: `
      in vec2 v_st;
      in vec3 v_positionEC;
      in vec3 v_normalEC;
      void main()  {
        vec3 positionToEyeEC = -v_positionEC;
        vec3 normalEC = normalize(v_normalEC);
        czm_materialInput materialInput;
        materialInput.normalEC = normalEC;
        materialInput.positionToEyeEC = positionToEyeEC;
        materialInput.st = v_st;
        vec4 color = czm_getMaterial(v_st);
        out_FragColor = color;
      }
                `,
    });

    let appearance1 = new Cesium.MaterialAppearance({
        material: new Cesium.Material({
            fabric: {
                uniforms: {
                    u_time: 0.0,
                    u_waterColor: new Cesium.Cartesian3(0.1, 0.19, 0.22),
                    u_alpha: 1.0,
                    u_speed: 0.8,
                    u_choppy: 4.0,
                    u_height: 0.6,
                    u_freq: 0.1
                },
                source: `
            const int NUM_STEPS = 8;
            const float PI = 3.141592;
            const float EPSILON  = 1e-3;
            //#define EPSILON_NRM (0.1 / iResolution.x)
            #define EPSILON_NRM (0.1 / 200.0)

            // sea
            const int ITER_GEOMETRY = 3;
            const int ITER_FRAGMENT = 5;
            const float SEA_HEIGHT = 0.6;
            const float SEA_CHOPPY = 4.0;
            const float SEA_SPEED = 1.8;
            const float SEA_FREQ = 0.16;
            const vec3 SEA_WATER_COLOR = vec3(0.0,0.09,0.18);
            // const vec3 SEA_WATER_COLOR = vec3( 74./255., 133./255., 54./255.);

       
            //#define SEA_TIME (1.0 + u_time * SEA_SPEED)

            const mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);

            // math
            mat3 fromEuler(vec3 ang) {
                vec2 a1 = vec2(sin(ang.x),cos(ang.x));
                vec2 a2 = vec2(sin(ang.y),cos(ang.y));
                vec2 a3 = vec2(sin(ang.z),cos(ang.z));
                mat3 m;
                m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
                m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
                m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
                return m;
            }
            float hash( vec2 p ) {
                float h = dot(p,vec2(127.1,311.7));
                return fract(sin(h)*43758.5453123);
            }
            //2d 随机数
            float random ( vec2 st) {
                return fract(sin(dot(st.xy,
                                    vec2(12.9898,78.233)))
                            * 43758.5453123);
            }
            //噪声函数3
            vec4 permute(vec4 x)
            {
                return mod(((x*34.0)+1.0)*x, 289.0);
            }
            vec2 fade(vec2 t)
            {
                return t*t*t*(t*(t*6.0-15.0)+10.0);
            }
            float noise(vec2 P)
            {
                vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
                vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
                Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
                vec4 ix = Pi.xzxz;
                vec4 iy = Pi.yyww;
                vec4 fx = Pf.xzxz;
                vec4 fy = Pf.yyww;
                vec4 i = permute(permute(ix) + iy);
                vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
                vec4 gy = abs(gx) - 0.5;
                vec4 tx = floor(gx + 0.5);
                gx = gx - tx;
                vec2 g00 = vec2(gx.x,gy.x);
                vec2 g10 = vec2(gx.y,gy.y);
                vec2 g01 = vec2(gx.z,gy.z);
                vec2 g11 = vec2(gx.w,gy.w);
                vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
                g00 *= norm.x;
                g01 *= norm.y;
                g10 *= norm.z;
                g11 *= norm.w;
                float n00 = dot(g00, vec2(fx.x, fy.x));
                float n10 = dot(g10, vec2(fx.y, fy.y));
                float n01 = dot(g01, vec2(fx.z, fy.z));
                float n11 = dot(g11, vec2(fx.w, fy.w));
                vec2 fade_xy = fade(Pf.xy);
                vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
                float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
                return 2.3 * n_xy;
            }
            // float noise( vec2 p ) {
            //     vec2 i = floor( p );
            //     vec2 f = fract( p );
            //     vec2 u = f*f*(3.0-2.0*f);
            //     return -1.0+2.0*mix( mix( hash( i + vec2(0.0,0.0) ),
            //             hash( i + vec2(1.0,0.0) ), u.x),
            //         mix( hash( i + vec2(0.0,1.0) ),
            //             hash( i + vec2(1.0,1.0) ), u.x), u.y);
            // }

            // lighting
            float diffuse(vec3 n,vec3 l,float p) {
                return pow(dot(n,l) * 0.4 + 0.6,p);
            }
            float specular(vec3 n,vec3 l,vec3 e,float s) {
                float nrm = (s + 8.0) / (PI * 8.0);
                return pow(max(dot(reflect(e,n),l),0.0),s) * nrm;
            }

            // sky
            vec3 getSkyColor(vec3 e) {
                e.y = max(e.y,0.0);
                return vec3(pow(1.0-e.y,2.0), 1.0-e.y, 0.6+(1.0-e.y)*0.4);
            }

            // sea
            float sea_octave(vec2 uv, float choppy) {
                uv += noise(uv);
                vec2 wv = 1.0-abs(sin(uv));
                vec2 swv = abs(cos(uv));
                wv = mix(wv,swv,wv);
                return pow(1.0-pow(wv.x * wv.y,0.65),choppy);
            }

            float map(vec3 p) {
                float freq = SEA_FREQ;
                float amp = u_height;
                float choppy = u_choppy;
                vec2 uv = p.xz; uv.x *= 0.75;

                float d, h = 0.0;
                float SEA_TIME = 1.0 + u_time * u_speed;
                for(int i = 0; i < ITER_GEOMETRY; i++) {
                d = sea_octave((uv+SEA_TIME)*freq,choppy);
                d += sea_octave((uv-SEA_TIME)*freq,choppy);
                h += d * amp;
                uv *= octave_m; freq *= 1.9; amp *= 0.22;
                choppy = mix(choppy,1.0,0.2);
                }
                return p.y - h;
            }

            float map_detailed(vec3 p) {
                float freq = SEA_FREQ;
                float amp = u_height;
                float choppy = u_choppy;
                vec2 uv = p.xz; uv.x *= 0.75;

                float SEA_TIME = 1.0 + u_time * u_speed;

                float d, h = 0.0;
                for(int i = 0; i < ITER_FRAGMENT; i++) {
                d = sea_octave((uv+SEA_TIME)*freq,choppy);
                d += sea_octave((uv-SEA_TIME)*freq,choppy);
                h += d * amp;
                uv *= octave_m; freq *= 1.9; amp *= 0.22;
                choppy = mix(choppy,1.0,0.2);
                }
                return p.y - h;
            }

            vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist) {
                float fresnel = clamp(1.0 - dot(n,-eye), 0.0, 1.0);
                fresnel = pow(fresnel,3.0) * 0.65;

                vec3 reflected = getSkyColor(reflect(eye,n));
                // vec3 refracted = u_waterColor + diffuse(n,l,80.0) * SEA_WATER_COLOR * 0.12;
                vec3 refracted = u_waterColor + diffuse(n,l,80.0) * SEA_WATER_COLOR ;


                vec3 color = mix(refracted,reflected,fresnel);

                float atten = max(1.0 - dot(dist,dist) * 0.001, 0.0);
                color += SEA_WATER_COLOR * (p.y - u_height) * 0.18 * atten;

                color += vec3(specular(n,l,eye,60.0));

                return color;
            }

            // tracing
            vec3 getNormal(vec3 p, float eps) {
                vec3 n;
                n.y = map_detailed(p);
                n.x = map_detailed(vec3(p.x+eps,p.y,p.z)) - n.y;
                n.z = map_detailed(vec3(p.x,p.y,p.z+eps)) - n.y;
                n.y = eps;
                return normalize(n);
            }

            float heightMapTracing(vec3 ori, vec3 dir, out vec3 p) {
                float tm = 0.0;
                float tx = 1000.0;
                float hx = map(ori + dir * tx);
                if(hx > 0.0) return tx;
                float hm = map(ori + dir * tm);
                float tmid = 0.0;
                for(int i = 0; i < NUM_STEPS; i++) {
                tmid = mix(tm,tx, hm/(hm-hx));
                p = ori + dir * tmid;
                float hmid = map(p);
                if(hmid < 0.0) {
                    tx = tmid;
                    hx = hmid;
                } else {
                    tm = tmid;
                    hm = hmid;
                }
            }
                return tmid;
            }

        vec4 czm_getMaterial(vec2 vUv)
        {
            vec2 uv = vUv;
            uv = vUv * 2.0 - 1.0;

            float time = u_time * 0.3 + 0.0*0.01;


            // ray
            vec3 ang = vec3(0, 1.2, 0.0);
            vec3 ori = vec3(0.0,3.5,0);
            vec3 dir = normalize(vec3(uv.xy,-2.0)); dir.z += length(uv) * 0.15;
            dir = normalize(dir) * fromEuler(ang);

            // tracing
            vec3 p;
            heightMapTracing(ori,dir,p);
            vec3 dist = p - ori;
            vec3 n = getNormal(p, dot(dist,dist) * EPSILON_NRM);
            vec3 light = normalize(vec3(0.0,1.0,0.8));

            // color
            vec3 color = mix(
            getSkyColor(dir),
            getSeaColor(p,n,light,dir,dist),
            pow(smoothstep(0.0,-0.05,dir.y),0.3));

            return vec4( pow(color,vec3(0.75)), u_alpha );
        }
        `,
            }
        }),
        // translucent: true,
        vertexShaderSource: `
            in vec3 position3DHigh;
            in vec3 position3DLow;
            in float batchId;
            in vec2 st;
            in vec3 normal;
            out vec2 v_st;
            out vec3 v_positionEC;
            out vec3 v_normalEC;
            void main() {
                v_st = st;
                vec4 p = czm_computePosition();
                v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
                v_normalEC = czm_normal * normal;                         // normal in eye coordinates
                gl_Position = czm_modelViewProjectionRelativeToEye * p;
            }
                            `,
        fragmentShaderSource: `
            in vec2 v_st;
            in vec3 v_positionEC;
            in vec3 v_normalEC;
            void main()  {
                vec3 positionToEyeEC = v_positionEC;
                vec3 normalEC = normalize(v_normalEC);
                czm_materialInput materialInput;
                materialInput.normalEC = normalEC;
                materialInput.positionToEyeEC = positionToEyeEC;
                materialInput.st = v_st;
                vec4 color = czm_getMaterial(v_st);
                out_FragColor =color;
            }
                    `,
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
            new Cartesian3(0.0, 0.0, 20000.0),
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

const computedAbsoluteDistance = (point1, point2) => {
    return Math.abs(Cesium.Cartesian3.distance(point1, point2));
}