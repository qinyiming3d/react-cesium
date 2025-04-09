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

    fs.renameSync(req.file.path, filePath);

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
