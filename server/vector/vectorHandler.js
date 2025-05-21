const fs = require('fs');
const path = require('path');
const util = require('./util');

module.exports = async (req, res) => {
  try {
    const result = await util.parseNCFile(req.file.path);
    res.json({
      status: 'success',
      data: {
        header: result.header,
        filePath: result.filePath
      }
    });

    // 设置一个小时后删除文件
    setTimeout(() => {
      fs.existsSync(req.file.path) && fs.unlink(req.file.path, () => {
      });
    }, 60 * 60 * 1000); // 1小时 = 60分钟 * 60秒 * 1000毫秒

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
