const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const temperatureHandler = require('./scalar/temperatureHandler');
const vectorHandler = require('./vector/vectorHandler');

const app = express();

// 配置上传临时目录
const uploadDir = path.join(__dirname, 'saved_files');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 配置multer
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024 // 限制100MB
  },
  fileFilter: (req, file, cb) => {
    // 验证文件类型
    const isNCFile = file.mimetype === 'application/x-netcdf' || 
                    path.extname(file.originalname).toLowerCase() === '.nc';
    
    if (!isNCFile) {
      const error = new Error('只支持.nc文件上传');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    cb(null, true);
  }
});

// 中间件
app.use(cors());
app.use(express.json());

// 测试路由
app.get('/', (req, res) => {
  res.json({ message: 'Express服务器运行正常' });
});

// 标量场数据路由
app.post('/api/temperatureData', upload.single('file'), temperatureHandler);

// 矢量场数据路由
app.post('/api/vectorData', upload.single('file'), vectorHandler);

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
