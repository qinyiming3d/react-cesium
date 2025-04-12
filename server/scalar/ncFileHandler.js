const fs = require('fs');
const path = require('path');
const util = require('./util');

module.exports = async (req, res) => {
  try {
    const saveDir = path.join(__dirname, 'temp_files');
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }
    const fileName = `${Date.now()}_${req.file.originalname}`;
    const filePath = path.join(saveDir, fileName);

    // 获取socket.io实例
    const io = req.app.get('socketio');
    const socketId = req.headers['socket-id'];
    
    // 使用流式处理支持进度反馈
    const readStream = fs.createReadStream(req.file.path);
    const writeStream = fs.createWriteStream(filePath);
    
    const fileSize = req.file.size;
    let uploadedBytes = 0;
    
    readStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const progress = Math.round((uploadedBytes / fileSize) * 100);
      // 通过socket.io发送进度到特定客户端
      io.to(socketId).emit('upload-progress', { progress });
    });

    readStream.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const result = await util.parseNCFile(filePath);

    res.json({
      status: 'success',
      data: {
        header: result.header,
        filePath: result.filePath
      }
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('处理.nc文件时出错:', error);
    res.status(500).json({
      status: 'error',
      error: '处理.nc文件时出错: ' + error.message
    });
  }
};
