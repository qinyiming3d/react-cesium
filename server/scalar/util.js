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
 * @param {String} filePath - .nc文件路径
 * @param {Object} params - 请求参数 {lon, lat, depth_std, temperature}
 * @returns {Array} 二维数组数据
 */
const getTemperatureData = (filePath, params) => {
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
  const indexOrder = reader.variables.find(item => item.name === params.f).dimensions;
  // [3, 2, 1]
  const f = reader.getDataVariable(params.f);
  const resultArray = convertTo2DArray(params.lon, params.lat, params.z, f, indexOrder, indexMapping);


  // for (let i = 0; i < lat.length; i++) {
  //   for (let j = 0; j < lon.length; j++) {
  //     const tempIndex = i * lat.length * depth.length + j * depth.length; // 假设我们关心的是深度为0的数据
  //     result.push([lon[j], lat[i], tempData[tempIndex]]);
  //   }
  // }

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

  return resultArray;
};

function convertTo2DArray(lonName, latName, zName, f, index, indexMapping) {
  const xObject = indexMapping[index[0]];
  xObject.demension = '一维';
  const yObject = indexMapping[index[1]];
  yObject.demension = '二维';
  const zObject = indexMapping[index[2]];
  zObject.demension = '三维';

  const strids = {
      '一维': yObject.data.length * zObject.data.length,
      '二维': zObject.data.length,
      '三维': 1
  };

  const lonObject = [xObject, yObject, zObject].find(item => item.name === lonName);
  const latObject = [xObject, yObject, zObject].find(item => item.name === latName);
  const heightObject = [xObject, yObject, zObject].find(item => item.name === zName);
  const resultArr = [];

  // 默认显示高度为0层  
  for (let i = 0; i < lonObject.data.length; i++){
      for (let j = 0; j < latObject.data.length; j++){
          const lon = lonObject.data[i];
          const lat = latObject.data[j];
          const fIndex = i * strids[lonObject.demension] + j * strids[latObject.demension];
          resultArr.push([lon, lat, f[fIndex]]);
      }
  }
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
  return resultArr;
}

module.exports = {
  parseNCFile,
  getTemperatureData
};
