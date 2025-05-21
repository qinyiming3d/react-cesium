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