const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {createServer} = require('http');
const ncFileHandler = require('./scalar/ncFileHandler');
const vectorHandler = require('./vector/vectorHandler');
const util = require('./scalar/util');


const app = express();
const httpServer = createServer(app);

// 配置上传临时目录
const uploadDir = path.join(__dirname, 'scalar', 'temp_files');
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
    res.json({message: 'Express服务器运行正常'});
});

// 标量场数据路由
app.post('/api/ncFileHandler', upload.single('file'), ncFileHandler);

// 获取网格数据路由
app.get('/api/getGridData', async (req, res) => {
    try {
        let {filePath, params} = req.query;

        if (!filePath) {
            return res.status(400).json({error: '缺少filePath参数'});
        }

        if (filePath.includes('qinyimingOwner')) {
            filePath = path.resolve(__dirname, 'scalar', 'forever_files', path.basename(filePath));
        }

        // 解析params参数
        let parsedParams = {};
        try {
            parsedParams = params ? JSON.parse(params) : {};
        } catch (e) {
            return res.status(400).json({error: 'params参数格式不正确'});
        }

        let {resultArr: sampledData, dataInfo} = util.getTemperatureData(filePath, parsedParams);

        // 点渲染逻辑 - 根据温度范围从白到红渐变
        const temps = sampledData.map(item => item[2]);
        const min = Math.min(...temps);
        const max = Math.max(...temps);

        const renderPointsLength = sampledData.length;

        res.json({
            status: 'success',
            data: {
                header: {
                    min,
                    max,
                    sampleRate: dataInfo.sampleRate,
                    originLength: dataInfo.originLength,
                    renderPointsLength,
                    lonDistance: dataInfo.lonDistance,
                    latDistance: dataInfo.latDistance,
                    textureWidth: dataInfo.textureWidth,
                    textureHeight: dataInfo.textureHeight,
                    latRange: dataInfo.latRange,
                    lonRange: dataInfo.lonRange,
                },
                sampledData
            }
        });

    } catch (error) {
        console.error('获取网格数据时出错:', error);
        res.status(500).json({
            status: 'error',
            error: '获取网格数据时出错: ' + error.message
        });
    }
});

// 矢量场数据路由
app.post('/api/vectorData', upload.single('file'), vectorHandler);

// 启动服务器
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});
