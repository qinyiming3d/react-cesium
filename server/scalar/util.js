const path = require("path");
const { readFileSync } = require("fs");
const { NetCDFReader } = require('netcdfjs');

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
 * 根据参数获取温度数据
 * @param {String} filePath - .nc文件路径
 * @param {Object} params - 请求参数 {lon, lat, depth_std, temperature}
 * @returns {Array} 二维数组数据
 */
const getTemperatureData = (filePath, params) => {
  const data = readFileSync(filePath);
  const reader = new NetCDFReader(data);
  const result = [];
  const lon = reader.getDataVariable(params.lon);
  const lat = reader.getDataVariable(params.lat);
  const depth = reader.getDataVariable(params.height);
  const tempData = reader.getDataVariable(params.temperature);
  // console.log(lon.length)
  // console.log(lat.length)
  // console.log(depth.length)
  console.log(tempData.length)

  for (let i = 0; i < lon.length; i++) {
    for (let j = 0; j < lat.length; j++) {
      const tempIndex = i * lat.length * depth.length + j * depth.length; // 假设我们关心的是深度为0的数据
      result.push([lon[i], lat[j], tempData[tempIndex]]);
    }
  }

  // 遍历所有经度、纬度和高度层  
  // for (let lonIndex = 0; lonIndex < lon.length; lonIndex++) {
  //   for (let latIndex = 0; latIndex < lat.length; latIndex++) {
  //     for (let heightIndex = 0; heightIndex < depth.length; heightIndex++) {
  //       const tempIndex = lonIndex * lat.length * depth.length + latIndex * depth.length + heightIndex;
  //       const temperature = tempData[tempIndex];
  //       temperature && result.push([lon[lonIndex], lat[latIndex], temperature]);
  //     }
  //   }
  // }

  console.log(result.length);

  return result;
};

module.exports = {
  parseNCFile,
  getTemperatureData
};
