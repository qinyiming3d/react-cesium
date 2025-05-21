uniform sampler2D u_image;
const int NUM_STEPS = 8; // 光线步进迭代次数，影响追踪精度。
const float PI = 3.141592;
const float EPSILON = 1e-3;
//#define EPSILON_NRM (0.1 / iResolution.x)
#define EPSILON_NRM (0.1 / 200.0)
      // sea
const int ITER_GEOMETRY = 3;
const int ITER_FRAGMENT = 5;
const float SEA_HEIGHT = 0.6; // 波浪高度
const float SEA_CHOPPY = 4.0; // 尖锐度
const float SEA_SPEED = 1.4; // 运动速度
const float SEA_FREQ = 0.26; // 频率
const vec3 SEA_BASE = vec3(0.1, 0.19, 0.22); // 海水基底色
const vec3 SEA_WATER_COLOR = vec3(0.8, 0.9, 0.6); // 反光色
//#define SEA_TIME (1.0 + iTime * SEA_SPEED)
const mat2 octave_m = mat2(1.6, 1.2, -1.2, 1.6);
// math 欧拉角转换为旋转矩阵，用于调整光线方向。
mat3 fromEuler(vec3 ang) {
    vec2 a1 = vec2(sin(ang.x), cos(ang.x));
    vec2 a2 = vec2(sin(ang.y), cos(ang.y));
    vec2 a3 = vec2(sin(ang.z), cos(ang.z));
    mat3 m;
    m[0] = vec3(a1.y * a3.y + a1.x * a2.x * a3.x, a1.y * a2.x * a3.x + a3.y * a1.x, -a2.y * a3.x);
    m[1] = vec3(-a2.y * a1.x, a1.y * a2.y, a2.x);
    m[2] = vec3(a3.y * a1.x * a2.x + a1.y * a3.x, a1.x * a3.x - a1.y * a3.y * a2.x, a2.y * a3.y);
    return m;
}

float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
}
float noise(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return -1.0 + 2.0 * mix(mix(hash(i + vec2(0.0, 0.0)),
                                hash(i + vec2(1.0, 0.0)), u.x),
                            mix(hash(i + vec2(0.0, 1.0)),
                                hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// lighting
float diffuse(vec3 n, vec3 l, float p) {
    return pow(dot(n, l) * 0.4 + 0.6, p);
}
float specular(vec3 n, vec3 l, vec3 e, float s) {
    float nrm = (s + 8.0) / (PI * 8.0);
    return pow(max(dot(reflect(e, n), l), 0.0), s) * nrm;
}
// sky 根据视线方向生成渐变色天空，低角度偏蓝，高处偏白。
vec3 getSkyColor(vec3 e) {
    e.y = max(e.y, 0.0);
    return vec3(pow(1.0 - e.y, 2.0), 1.0 - e.y, 0.6 + (1.0 - e.y) * 0.4);
}
// sea 通过噪声叠加生成波浪形状，choppy参数控制波峰锐度
float sea_octave(vec2 uv, float choppy) {
    uv += noise(uv);
    vec2 wv = 1.0 - abs(sin(uv));
    vec2 swv = abs(cos(uv));
    wv = mix(wv, swv, wv);
    return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);
}
float map(vec3 p) {
    float freq = SEA_FREQ;
    float amp = SEA_HEIGHT;
    float choppy = SEA_CHOPPY;
    vec2 uv = p.xz; uv.x *= 0.75;
    float d, h = 0.0;
    float SEA_TIME = 1.0 + iTime * SEA_SPEED;
    for (int i = 0; i < ITER_GEOMETRY; i++) {
        d = sea_octave((uv + SEA_TIME) * freq, choppy);
        d += sea_octave((uv - SEA_TIME) * freq, choppy);
        h += d * amp;
        uv *= octave_m; freq *= 1.9; amp *= 0.22;
        choppy = mix(choppy, 1.0, 0.2);
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
    for (int i = 0; i < ITER_FRAGMENT; i++) {
        d = sea_octave((uv + SEA_TIME) * freq, choppy);
        d += sea_octave((uv - SEA_TIME) * freq, choppy);
        h += d * amp;
        uv *= octave_m; freq *= 1.9; amp *= 0.22;
        choppy = mix(choppy, 1.0, 0.2);
    }
    return p.y - h;
}
// 结合菲涅尔效应混合折射/反射颜色，添加距离衰减和高光。
vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist) {
    float fresnel = clamp(1.0 - dot(n, -eye), 0.0, 1.0);
    fresnel = pow(fresnel, 3.0) * 0.65;
    vec3 reflected = getSkyColor(reflect(eye, n));
    vec3 refracted = SEA_BASE + diffuse(n, l, 80.0) * SEA_WATER_COLOR * 0.12;
    vec3 color = mix(refracted, reflected, fresnel);
    float atten = max(1.0 - dot(dist, dist) * 0.001, 0.0);
    color += SEA_WATER_COLOR * (p.y - SEA_HEIGHT) * 0.18 * atten;
    color += vec3(specular(n, l, eye, 60.0));
    return color;
}
// tracing 通过中心差分计算法线，增强光照细节。
vec3 getNormal(vec3 p, float eps) {
    vec3 n;
    n.y = map_detailed(p);
    n.x = map_detailed(vec3(p.x + eps, p.y, p.z)) - n.y;
    n.z = map_detailed(vec3(p.x, p.y, p.z + eps)) - n.y;
    n.y = eps;
    return normalize(n);
}
// 二分法光线步进检测海面交点，平衡性能与精度
float heightMapTracing(vec3 ori, vec3 dir, out vec3 p) {
    float tm = 0.0;
    float tx = 1000.0;
    float hx = map(ori + dir * tx);
    if (hx > 0.0) return tx;
    float hm = map(ori + dir * tm);
    float tmid = 0.0;
    for (int i = 0; i < NUM_STEPS; i++) {
        tmid = mix(tm, tx, hm / (hm - hx));
        p = ori + dir * tmid;
        float hmid = map(p);
        if (hmid < 0.0) {
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
    float time = iTime * 0.3 + 0.0 * 0.01;
    // ray
    vec3 ang = vec3(0, 1.2, 0.0); //欧拉角
    vec3 ori = vec3(0.0, 3.5, 0);  // 观察者位置
    vec3 dir = normalize(vec3(uv.xy, -2.0)); dir.z += length(uv) * 0.15; // 光线方向
    dir = normalize(dir) * fromEuler(ang);
    // tracing
    vec3 p; // 存储光线与海平面的交点
    heightMapTracing(ori, dir, p); // 调用光线追踪函数，计算光线从 ori 出发沿 dir 方向与海面的交点，并将结果存储在 p 中。
    vec3 dist = p - ori; // 计算观察点到交点的向量 dist
    vec3 n = getNormal(p, dot(dist, dist) * EPSILON_NRM); // 调用法线计算函数 getNormal，根据交点 p 和距离 dist 计算海面的法线。
    vec3 light = normalize(vec3(0.0, 1.0, 0.8)); // 定义并归一化光源方向，模拟从上方斜向照射的光线。
    // color
    vec3 color = mix( // 将天空颜色和海水颜色混合，权重由菲涅尔效应决定。
        getSkyColor(dir), // 计算天空颜色，基于光线方向 dir
        getSeaColor(p, n, light, dir, dist), // 计算海水颜色，结合交点 p、法线 n、光源方向 light、视线方向 dir 和距离 dist。
        pow(smoothstep(0.0, -0.05, dir.y), 0.3)); // 计算光线方向与海平面的夹角，用于平滑过渡。
    vec4 resultColor = vec4(pow(color, vec3(0.75)), 1.0);
    float value = texture(u_image, vUv).r;
    if(!bool(value)){
        resultColor.a = 0.0;
    }
    return resultColor;
}