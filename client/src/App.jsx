import { Viewer, Ion, ScreenSpaceEventHandler, Cartographic, ScreenSpaceEventType, Math as cesiumMath, ImageryLayer, WebMapTileServiceImageryProvider, createWorldTerrainAsync } from 'cesium';
import { useEffect, useState } from "react";

import TopBar from './components/TopBar/TopBar';
import { VolumePrimitive } from './volumePrimitive';
import { createVolumeTexture } from './glUtils';
import { Upload, Button, message, ConfigProvider, theme } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import "./App.css";

const App = () => {
  const [viewerState, setViewer] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const savedLang = localStorage.getItem('language');
    return savedLang || 'zh';
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 951);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const changeLanguage = (lng) => {
    const newLang = lng || (currentLanguage === 'en' ? 'zh' : 'en');
    setCurrentLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleThemeChange = (checked) => {
    setIsDarkTheme(checked);
    localStorage.setItem('theme', checked ? 'dark' : 'light');
  };



  const createViewer = async () => {
    const viewer = new Viewer("cesiumContainer", {
      contextOptions: { webgl: { powerPreference: 'high-performance' } },

      //是否显示 信息窗口
      infoBox: false,
      //是否显示 搜索框
      geocoder: false,
      //是否显示 home
      // homeButton: false,
      //是否显示 2d->3d
      sceneModePicker: false,
      //是否显示 图层选择器
      baseLayerPicker: false,
      //是否显示 帮助按钮
      navigationHelpButton: false,
      //-------------------------------------底部的
      //是否显示 播放
      animation: false,
      //是否显示 时间轴
      timeline: false,
      //是否显示 全屏
      fullscreenButton: false,
      shouldAnimate: true,

      // baseLayer: new ImageryLayer(
      //   new WebMapTileServiceImageryProvider({
      //     url: 'http://t{s}.tianditu.com/img_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=5e3ccd9c1bb8a99f8dfe06948174dcc5',
      //     subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      //     layer: 'tdtBasicLayer',
      //     style: 'default',
      //     format: 'image/jpeg',
      //     tileMatrixSetID: 'GoogleMapsCompatible',
      //     maximumLevel: 18,
      //   }),
      //   {}
      // ),
    });

    viewer.terrainProvider = await createWorldTerrainAsync({
      requestVertexNormals: true, //开启地形光照
      // requestWaterMask: true, // 开启水面波纹
    });

    //抗锯齿
    viewer.scene.postProcessStages.fxaa.enabled = true;

    // 去除logo
    const logo = viewer.cesiumWidget.creditContainer
    logo.style.display = "none";
    // 显示帧率
    viewer.scene.debugShowFramesPerSecond = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;

    

    setViewer(viewer);

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((e) => {
      const clickPosition = viewer.scene.camera.pickEllipsoid(e.position);
      const randiansPos = Cartographic.fromCartesian(clickPosition);
      console.log(
        "经度：" +
        cesiumMath.toDegrees(randiansPos.longitude) +
        ", 纬度：" +
        cesiumMath.toDegrees(randiansPos.latitude)
      );
    }, ScreenSpaceEventType.LEFT_CLICK);

  }


  useEffect(() => {
    // 设置初始主题
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');

    // 初始化Cesium
    Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlZjdlNTE2Mi05MjE4LTQ1OGMtOGQ1ZS0wODdiNzI5YWQxYzYiLCJpZCI6MjI5NDYzLCJpYXQiOjE3MjEzOTA3OTR9.Vyt-kvvNogPDPw4y74AMwsJDHUUBuhHtwyGDuCBDtSw"
    createViewer();
  }, []);

  useEffect(() => {
    // 主题变化时更新data-theme属性
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  const currentTheme = {
    algorithm: isDarkTheme ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorBgBase: isDarkTheme ? 'rgba(31,31,31, 0.5)' : 'rgba(224,224,224, 0.5)',
      colorTextBase: isDarkTheme ? 'rgba(224,224,224, 0.5)' : 'rgba(31,31,31, 0.5)',
    },
  };

  return (
    <ConfigProvider theme={currentTheme}>
      <div className="visualization-container">
        <TopBar
          className="top-bar"
          isDarkTheme={isDarkTheme}
          onThemeChange={handleThemeChange}
          currentLanguage={currentLanguage}
          onChangeLanguage={changeLanguage}
          isMobile={isMobile}
        />
        <div id="cesiumContainer" />
        {/* <div className="control-panel">
        <button onClick={() => showVectorField()}>显示矢量场</button>
        <Upload
          // beforeUpload={handleUpload}
          accept=".nc"
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />}>标量nc数据上传</Button>
        </Upload>
      </div> */}
      </div>
    </ConfigProvider>
  );
}

export default App;
