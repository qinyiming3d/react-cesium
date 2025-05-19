// 图像分辨率，表示纹理的宽度和高度
uniform vec2 u_image_res;

// 数据范围，表示输入数据的最小值和最大值
uniform vec2 u_range;

// 颜色范围，表示颜色映射的最小值和最大值
uniform vec2 u_color_range;

uniform sampler2D u_image;

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

// 根据 UV 坐标从纹理中获取实际数据值
float getValue(sampler2D tex, const vec2 uv) {
    float min = u_range.x; // 数据最小值
    float max = u_range.y; // 数据最大值
    float r = bilinear(tex, uv); // 获取纹理值
    return r * (max - min) + min; // 将纹理值映射到数据范围
}

// 定义材质的主函数
czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput); // 初始化默认材质

    // 根据 UV 坐标获取数据值
    float value = getValue(u_image, materialInput.st);

    // 将数据值映射到颜色范围 [0, 1]
    float value_t = (value - u_color_range.x) / (u_color_range.y - u_color_range.x);

    // 根据映射值从颜色纹理中获取颜色
    vec4 color = texture(color_ramp, vec2(value_t, 0.5));

    // 对颜色进行伽马校正
    color = czm_gammaCorrect(color);

    // 设置材质的颜色和透明度

    material.diffuse = color.rgb;
    material.alpha = color.a;


    if(!bool(calcTexture(u_image, materialInput.st))){
        material.alpha = 0.0;
    }

    return material;
}
