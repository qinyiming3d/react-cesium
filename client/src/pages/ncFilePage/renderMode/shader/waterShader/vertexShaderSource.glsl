in vec3 position3DHigh;
in vec3 position3DLow;
in float batchId;
in vec2 st;
in vec3 normal;
out vec2 v_st;
out vec3 v_positionEC;
out vec3 v_normalEC;

uniform sampler2D u_image;
uniform vec2 u_image_res;

// 从纹理中获取指定 UV 坐标的红色通道值
float calcTexture(sampler2D tex, const vec2 uv) {
    return texture(tex, uv).r;
}

// 使用双线性插值从纹理中获取更平滑的值
float bilinear(sampler2D tex, const vec2 uv) {
    vec2 px = 1.0 / u_image_res; // 单个像素的大小
    vec2 vc = (floor(uv * u_image_res)) * px; // 当前像素的左上角坐标
    vec2 f = fract(uv * u_image_res); // 当前 UV 坐标的小数部分

    // 获取四个相邻像素的值
    float tl = calcTexture(tex, vc); // 左上角
    float tr = calcTexture(tex, vc + vec2(px.x, 0)); // 右上角
    float bl = calcTexture(tex, vc + vec2(0, px.y)); // 左下角
    float br = calcTexture(tex, vc + px); // 右下角

    // 对水平和垂直方向进行插值
    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
}

void main() {
    v_st = st;
    vec4 p = czm_computePosition(); // 世界坐标（不确定是不是世界坐标）平移到相机坐标系  世界坐标减去相机中心坐标（将世界坐标平移到相机坐标系下）
    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;     // 得到相机坐标（旋转）
    v_normalEC = czm_normal * normal;                       // 局部坐标系法向量->相机坐标系下的法线向量

    float height = bilinear(u_image, v_st);

    vec4 positionMC = czm_inverseModelView * vec4(v_positionEC, 1.0);
    vec3 offset = normalize(positionMC.xyz)  * 3000000.0 * pow(height, 2.0); // 计算偏移量
    vec4 positionMC_new = vec4(positionMC.xyz + offset, 1.0); // z轴向上平移动画
    vec4 resultPosition = czm_modelViewInfiniteProjection * positionMC_new;

//    mat4 m4 = mat4(1.0,0.0,0.0,0.0,  0.0,1.0,0.0,0.0,  0.0,0.0,1.0,0.0,  0.0,25000.0 * 100.0,0.0,1.0);
//    vec4 positionMC_new = m4 * czm_inverseModelView * vec4(v_positionEC, 1.0);
//    vec4 resultPosition = czm_modelViewInfiniteProjection * positionMC_new;
    gl_Position = resultPosition;
}