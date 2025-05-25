uniform sampler2D particlesSpeed; // 传入速度纹理
uniform sampler2D colorTexture;
in vec2 textureCoordinate; // 纹理坐标

void main() {
    float speed = texture(particlesSpeed, textureCoordinate).a; // 从速度纹理中获取速度值
//    vec4 color = mix(vec4(1.0, 1.0, 1.0, 1.0), vec4(1.0, 0.0, 0.0, 1.0), speed); // 根据速度插值颜色
    vec4 color = texture(colorTexture, vec2(speed, 0.5));
    out_FragColor = color;
}