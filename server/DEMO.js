const { readFileSync } = require("fs");
const { NetCDFReader } = require("netcdfjs");
const arr = [1,2,3,[1,5,5]]
const data = readFileSync('./vector/2017.nc');
const reader = new NetCDFReader(data);
console.log(reader.getDataVariable('u10'))


function getAngleFromUV(u, v) {
    let angleRad = Math.atan2(v, u); // 从x轴正向开始，逆时针
    let angleDeg = angleRad * (180 / Math.PI); // 转成角度
    if(angleDeg > 0 && angleDeg < 180) {
        angleDeg -= 90
    }else {
        angleDeg = angleDeg + 360 - 90
    }
    // angleDeg -= 90
    // // 将角度调整为以正北为0，逆时针为正
    // let angleFromNorth = (90 - angleDeg);
    // // 归一化在0 到 360 度之间
    // if (angleFromNorth < 0) {
    //     angleFromNorth += 360;
    // }
    return angleDeg;
}

function getRotationAngle(u, v) {
    let angleRad = Math.atan2(v, u); // 从y轴正向开始，逆时针
    let angleDeg = angleRad * (180 / Math.PI); // 转成角度

    // 将角度调整为以正北为0，逆时针为正
    let angleFromNorth = (90 - angleDeg);
    // 归一化在0 到 360 度之间
    if (angleFromNorth < 0) {
        angleFromNorth += 360;
    }
    return angleFromNorth;
}

function calculateRotationAngle(u, v) {
    // 计算逆时针弧度（以正北为0°）
    const radians = - Math.atan2(u, v);
    // 转换为度数（范围：-180° ~ 180°）
    const degrees = radians * (180 / Math.PI);
    return radians;
}

// 示例
// const u = -1; // 东向
// const v = 0; // 北向
// console.log(calculateRotationAngle(u, v)); // 90°，表示向东
// console.log(getRotationAngle(u, v)); // 90°，表示向东


// const arr = [1,2,3];
// const float32Arr = new Float32Array(arr);
// console.log(float32Arr);