const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');
const util = require('./util');

module.exports = async (req, res) => {
  try {
    const saveDir = path.join(__dirname, 'temp_files');
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${req.file.originalname}`;
    const filePath = path.join(saveDir, fileName);

    fs.renameSync(req.file.path, filePath);

    // 1分钟后自动删除文件
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`已自动删除临时文件: ${filePath}`);
      }
    }, 60000);

    const result = await util.parseNCFile(filePath);

    const root = await protobuf.load(path.join(__dirname, 'temperatureData.proto'));
    const TemperatureData = root.lookupType('TemperatureData');
    
    const message = TemperatureData.create({
      buffer: result.buffer,
      metadata: {
        dimensions: result.header.dimensions,
        dataType: result.header.dataType,
        length: result.buffer.length
      }
    });
    
    const buffer = TemperatureData.encode(message).finish();
    res.set('Content-Type', 'application/x-protobuf');
    res.send(buffer);

    // res.json({
    //   status: 'success',
    //   data: {
    //     buffer: result.buffer.toString('base64'),
    //     metadata: {
    //       dimensions: result.header.dimensions,
    //       dataType: result.header.dataType,
    //       length: result.buffer.length
    //     }
    //   }
    // });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('处理.nc文件时出错:', error);
    res.status(500).json({ 
      status: 'error',
      error: '处理.nc文件时出错: ' + error.message 
    });
  }
};
