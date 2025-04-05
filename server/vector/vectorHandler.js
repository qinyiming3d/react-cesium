const fs = require('fs');
const path = require('path');

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

    // TODO: 添加矢量场数据处理逻辑
    res.status(501).json({
      status: 'error',
      error: '矢量场数据处理功能尚未实现'
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('处理矢量场数据时出错:', error);
    res.status(500).json({ 
      status: 'error',
      error: '处理矢量场数据时出错: ' + error.message 
    });
  }
};
