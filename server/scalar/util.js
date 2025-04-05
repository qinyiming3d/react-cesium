const { resolve } = require("path");
const { readFileSync } = require("fs");
const { NetCDFReader } = require('netcdfjs');

/**
 * 解析.nc文件
 * @param {Buffer} buffer - .nc文件Buffer
 * @returns {Promise<Object>} 解析后的数据
 */
const parseNCFile = async (filePath) => {
  // console.log(new Uint8Array(buffer))
  const data = readFileSync(filePath);
  const reader = new NetCDFReader(data);


  // 读取元数据
  const dimensions = {
    lon: reader.getDataVariable('lon'),
    lat: reader.getDataVariable('lat'),
    height: reader.getDataVariable('depth_std')
  };

  // 读取温度数据
  const tempData = reader.getDataVariable('temperature');

  // 转换为传输格式
  return {
    header: {
      dataType: 'float32',
      dimensions: {
        x: dimensions.lon,
        y: dimensions.lat,
        z: dimensions.height
      }
    },
    buffer: Buffer.from(tempData),
  };
};

module.exports = {
  parseNCFile
};
