uniform sampler2D nextParticlesPosition;
uniform sampler2D particlesSpeed; // (u, v, w, norm)

// range (min, max)
uniform vec2 lonRange;
uniform vec2 latRange;

uniform float randomCoefficient; // use to improve the pseudo-random generator
uniform float dropRate; // drop rate is a chance a particle will restart at random position to avoid degeneration
uniform float dropRateBump;

in vec2 v_textureCoordinates;


// pseudo-random generator
const vec3 randomConstants = vec3(12.9898, 78.233, 4375.85453);
const vec2 normalRange = vec2(0.0, 1.0);
float rand(vec2 seed, vec2 range) {
    vec2 randomSeed = randomCoefficient * seed;
    float temp = dot(randomConstants.xy, randomSeed);
    temp = fract(sin(temp) * (randomConstants.z + temp));
    return temp * (range.y - range.x) + range.x;
}

vec3 generateRandomParticle(vec2 seed, float lev) {
    // ensure the longitude is in [0, 360]
    float randomLon = mod(rand(seed, lonRange), 360.0);
    float randomLat = rand(-seed, latRange);

    return vec3(randomLon, randomLat, lev);
}

bool particleOutbound(vec3 particle) {
    return particle.y < -90.0 || particle.y > 90.0;
}

void main() {
    vec3 nextParticle = texture(nextParticlesPosition, v_textureCoordinates).rgb;
    vec4 nextSpeed = texture(particlesSpeed, v_textureCoordinates);
    float speedNorm = nextSpeed.a;
    float particleDropRate = dropRate + dropRateBump * speedNorm; // 掉落概率+风越强掉落概率越大

    vec2 seed1 = nextParticle.xy + v_textureCoordinates;
    vec2 seed2 = nextSpeed.xy + v_textureCoordinates;
    vec3 randomParticle = generateRandomParticle(seed1, nextParticle.z); // 生成一个随机位置
    float randomNumber = rand(seed2, normalRange);

    if (randomNumber < particleDropRate || particleOutbound(nextParticle)) {
        // 粒子随机到了掉落，或者粒子飞出了边界
        out_FragColor = vec4(randomParticle, 1.0); // 1.0 means this is a random particle
    } else {
        out_FragColor = vec4(nextParticle, 0.0);
    }
}