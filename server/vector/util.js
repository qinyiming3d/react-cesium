const path = require("path");
const {readFileSync} = require("fs");
const {NetCDFReader} = require('netcdfjs');

/**
 * 解析.nc文件
 * @param {String} filePath - .nc文件路径
 * @returns {Promise<Object>} 解析后的数据
 */
const parseNCFile = async (filePath) => {
    const data = readFileSync(filePath);
    const reader = new NetCDFReader(data);
    // console.log(reader.variables);
    // console.log(reader.dimensions);

    // 返回绝对路径，使用path.resolve确保跨平台兼容性
    return {
        header: reader.header,
        filePath: path.resolve(filePath)
    };
};

/**
 * @param {String} filePath - .nc文件路径
 * @param {Object} params - 请求参数 {lon, lat, depth_std, temperature}
 * @returns {Array} 二维数组数据
 */
const handleWindPole = (filePath, params, res) => {
    const data = readFileSync(filePath);
    const reader = new NetCDFReader(data);

    const indexMapping = reader.variables.reduce((acc, cur) => {
        if (cur.dimensions.length === 1) {
            acc[cur.dimensions[0]] = {}
            acc[cur.dimensions[0]].name = cur.name;
            acc[cur.dimensions[0]].data = reader.getDataVariable(cur.name);
        }
        return acc;
    }, {});
    // {
    //   '1': { name: 'lon', data: [1, 2, 3] },
    //   "2": { name: 'lat', data: [4, 5, 6] },
    //   "3": { name: 'depth', data: [0, 10, 20] },
    // }
    const indexOrder = reader.variables.find(item => item.name === params.u).dimensions;
    // [3, 2, 1]
    const u = reader.getDataVariable(params.u).flat();
    const v = reader.getDataVariable(params.v).flat();
    const {resultArr: sampledData, dataInfo} = convertTo2DArray(params.lon, params.lat, params.z, u, v, indexOrder, indexMapping, params.isSample);

    const uArray = sampledData.map(item => item[2]);
    const vArray = sampledData.map(item => item[3]);
    const uMin = Math.min(...uArray);
    const uMax = Math.max(...uArray);

    const vMin = Math.min(...vArray);
    const vMax = Math.max(...vArray);

    const renderPointsLength = sampledData.length;

    res.json({
        status: 'success',
        data: {
            header: {
                uMin,
                uMax,
                vMin,
                vMax,
                sampleRate: dataInfo.sampleRate,
                originLength: dataInfo.originLength,
                renderPointsLength,
                lonDistance: dataInfo.lonDistance,
                latDistance: dataInfo.latDistance,
                textureWidth: dataInfo.textureWidth,
                textureHeight: dataInfo.textureHeight,
                latRange: dataInfo.latRange,
            },
            sampledData
        }
    });
};

const handleParticleSystem = (filePath, params, res) => {
    const originData = readFileSync(filePath);
    const NetCDF = new NetCDFReader(originData);

    const uArray = NetCDF.getDataVariable(params.u).flat();
    const U = {
        array: uArray,
        min: uArray.reduce((min, val) => (val < min ? val : min), Infinity),
        max: uArray.reduce((max, val) => (val > max ? val : max), -Infinity),
        // max: Math.max(...arr),
        // min: Math.min(...arr),
    };
    const vArray = NetCDF.getDataVariable(params.v).flat();
    const V = {
        array: vArray,
        min: vArray.reduce((min, val) => (val < min ? val : min), Infinity),
        max: vArray.reduce((max, val) => (val > max ? val : max), -Infinity),
        // max: Math.max(...vArray),
        // min: Math.min(...vArray),
    }

    const ncDimensions = NetCDF.dimensions;
    const dimensions = {
        lat: ncDimensions.find(item => item.name === params.lat).size,
        lon: ncDimensions.find(item => item.name === params.lon).size,
        lev: ncDimensions.find(item => item.name === params.z)?.size || ncDimensions['time'],
    }

    const lonArray = NetCDF.getDataVariable(params.lon).flat();
    const lon = {
        array: lonArray,
        min: lonArray.reduce((min, val) => (val < min ? val : min), Infinity),
        max: lonArray.reduce((max, val) => (val > max ? val : max), -Infinity),
        // min: Math.min(...lonArray),
        // max: Math.max(...lonArray),
    }

    const latArray = NetCDF.getDataVariable(params.lat).flat();
    const lat = {
        array: latArray,
        min: latArray.reduce((min, val) => (val < min ? val : min), Infinity),
        max: latArray.reduce((max, val) => (val > max ? val : max), -Infinity),
    }

    let levArray;
    let lev;
    if(!params.z) {
        lev = {
            array: [1],
            min: 1,
            max: 1,
        }
    }else {
        levArray = NetCDF.getDataVariable(params.z).flat();
        lev = {
            array: levArray,
            min: Math.min(...levArray),
            max: Math.max(...levArray),
        }
    }
    res.json({
        status: 'success',
        data: {
            sampledData: {
                U,
                V,
                dimensions,
                lat,
                lev,
                lon,
            },
        }
    })
}

function convertTo2DArray(lonName, latName, zName, u, v, index, indexMapping, isSample) {
    console.log(indexMapping)
    const xObject = indexMapping[index[0]];
    xObject.demension = '一维';
    const yObject = indexMapping[index[1]];
    yObject.demension = '二维';
    const zObject = indexMapping[index[2]];
    zObject.demension = '三维';

    let wObject;
    if(Object.keys(indexMapping).length === 4) {
        wObject = indexMapping[index[3]];
        wObject.demension = '四维';
    }

    // const strids = {
    //     '一维': yObject.data.length * zObject.data.length,
    //     '二维': zObject.data.length,
    //     '三维': 1
    // };

    const strids = {
        '一维': yObject.data.length * zObject.data.length * (wObject?.data.length || 1),
        '二维': zObject.data.length * (wObject?.data.length || 1),
        '三维': wObject?.data.length || 1,
        '四维': 1
    };

    const lonObject = [xObject, yObject, zObject, wObject].find(item => item.name === lonName);
    const latObject = [xObject, yObject, zObject, wObject].find(item => item.name === latName);
    const heightObject = [xObject, yObject, zObject, wObject].find(item => item.name === zName);


    const originLength = lonObject.data.length * latObject.data.length;
    const sampleRate = isSample ? Math.max(1, Math.floor(originLength / 50000)) : 1; // 采样率
    // const lonDistance = lonObject.data[1] - lonObject.data[0];
    // const latDistance = latObject.data[1] - latObject.data[0];
    const latRange = [Math.min(...latObject.data), Math.max(...latObject.data)];

    const textureWidth = lonObject.data.length / sampleRate;
    const textureHeight = latObject.data.length / sampleRate;

    let resultArr = [];


    // 默认显示高度为0层
    for (let i = 0; i < lonObject.data.length; i += sampleRate) {
        for (let j = 0; j < latObject.data.length; j += sampleRate) {
            const lon = lonObject.data[i];
            const lat = latObject.data[j];
            const fIndex = i * strids[lonObject.demension] + j * strids[latObject.demension];
            resultArr.push([lon, lat, u[fIndex], v[fIndex]]);
        }
    }
    const sampledLons = [...new Set(resultArr.map(item => item[0]))].sort((a, b) => a - b);
    const sampledLats = [...new Set(resultArr.map(item => item[1]))].sort((a, b) => a - b);
    const lonDistance = sampledLons.length > 1 ? sampledLons[1] - sampledLons[0] : 0;
    const latDistance = sampledLats.length > 1 ? sampledLats[1] - sampledLats[0] : 0;

    resultArr = resultArr.filter(item => item[2] && item[3]);

    // for (let k = 0; k < heightObject.data.length; k++) {
    //     for (let i = 0; i < lonObject.data.length; i++) {
    //         for (let j = 0; j < latObject.data.length; j++) {
    //             const lon = lonObject.data[i];
    //             const lat = latObject.data[j];
    //             const height = heightObject.data[k];
    //             const fIndex = i * strids[lonObject.demension] + j * strids[latObject.demension] + k * strids[heightObject.demension];
    //             resultArr.push([lon, lat, height, f[fIndex]]);
    //         }
    //     }
    // }
    return {resultArr, dataInfo: {lonDistance, latDistance, sampleRate, originLength, textureWidth, textureHeight, latRange}};
}

module.exports = {
    parseNCFile,
    handleWindPole,
    handleParticleSystem
};
