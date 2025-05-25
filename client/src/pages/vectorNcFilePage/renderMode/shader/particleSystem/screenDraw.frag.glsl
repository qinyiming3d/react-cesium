uniform sampler2D trailsColorTexture;
uniform sampler2D trailsDepthTexture;

in vec2 textureCoordinate;

void main() {
    vec4 trailsColor = texture(trailsColorTexture, textureCoordinate);
    float trailsDepth = texture(trailsDepthTexture, textureCoordinate).r;
    float globeDepth = czm_unpackDepth(texture(czm_globeDepthTexture, textureCoordinate));

    if (trailsDepth < globeDepth) {
        out_FragColor = trailsColor;
    } else {
        out_FragColor = vec4(0.0);
    }
}