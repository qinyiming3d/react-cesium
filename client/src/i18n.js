import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      title: 'Ocean Field Visualization System',
      author: 'Author: qinyiming',
      scalar: 'Scalar Field',
      vector: 'Vector Field',
      ncFile: 'nc file',
      salinity: 'Salinity',
      density: 'Density',
      velocity: 'Velocity',
      direction: 'Direction',
      
      vectorNcFilePage: {
        upload: {
          title: 'Data Upload',
          selectFile: 'Select .nc File',
          selectedFile: 'Selected File',
          uploadButton: 'Upload'
        },
        query: {
          title: 'Data Query',
          x: 'Longitude (x-coordinate)',
          y: 'Latitude (y-coordinate)',
          z: 'Z Variable (Time/Height)',
          f: 'f(Longitude, Latitude, Z)',
          selectPlaceholder: 'Please select',
          submitButton: 'Query and Render'
        },
        actions: {
          title: 'Data Operations',
          clearHeatmap: 'Clear Heatmap',
          viewStructure: 'View Data Structure'
        },
        rendering: {
          title: 'Rendering Efficiency',
          dataPoints: 'Data Points',
          sampleRate: 'Sample Rate',
          actualPoints: 'Actual Points'
        },
        messages: {
          selectFileFirst: 'Please select a file first',
          uploadSuccess: 'Upload successful',
          uploadFailed: 'Data processing failed, please upload NetCDF v3.x file',
          renderSuccess: 'Render successful',
          cesiumNotLoaded: 'Cesium vector map not loaded, please check network connection',
          uploadDataFirst: 'Please upload data file first',
          clickToRender: 'none'
        },
        presetFiles: {
          wind: 'Wind field nc data'
        },
        renderMode: {
          label: 'Render Mode',
          windPole: 'Wind Pole Render',
          particleSystem: 'Particle System Render',
          viewUV: 'View UV'
        }
      },
      scalarNcFilePage: {
        upload: {
          title: 'Data Upload',
          selectFile: 'Select .nc File',
          selectedFile: 'Selected File',
          uploadButton: 'Upload'
        },
        query: {
          title: 'Data Query',
          x: 'Longitude (x-coordinate)',
          y: 'Latitude (y-coordinate)',
          z: 'Z Variable (Time/Height)',
          f: 'f(Longitude, Latitude, Z)',
          selectPlaceholder: 'Please select',
          submitButton: 'Query and Render'
        },
        actions: {
          title: 'Data Operations',
          clearHeatmap: 'Clear Heatmap',
          viewStructure: 'View Data Structure'
        },
        rendering: {
          title: 'Rendering Efficiency',
          dataPoints: 'Data Points',
          sampleRate: 'Sample Rate',
          actualPoints: 'Actual Points'
        },
        messages: {
          selectFileFirst: 'Please select a file first',
          uploadSuccess: 'Upload successful',
          uploadFailed: 'Data processing failed, please upload NetCDF v3.x file',
          renderSuccess: 'Render successful',
          cesiumNotLoaded: 'Cesium vector map not loaded, please check network connection',
          uploadDataFirst: 'Please upload data file first',
          clickToRender: 'none '
        },
        presetFiles: {
          temperature: 'Temperature field nc data',
          co2Pressure: 'CO2 partial pressure', 
          salinity: 'Salinity field data',
          selectPlaceholder: 'Select preset file'
        },
        renderMode: {
          label: 'Render Mode',
          point: 'Point Render',
          column: 'Column Render',
          shader: 'Shader Render',
          rectangleRender: 'Texture Render',
          waterRender: 'Water Surface Render',
          viewUV: 'View UV'
        }
      }
    }
  },
  zh: {
    translation: {
      title: '海洋要素场可视化系统',
      author: '作者: 覃艺明',
      scalar: '标量场可视化',
      vector: '矢量场可视化',
      ncFile: 'nc文件',
      salinity: '盐度场',
      density: '密度场',
      velocity: '流速场',
      direction: '流向场',
      
      scalarNcFilePage: {
        upload: {
          title: '数据上传',
          selectFile: '选择.nc文件',
          selectedFile: '已选择文件',
          uploadButton: '上传'
        },
        query: {
          title: '数据查询',
          x: 'x位置(经度)',
          y: 'y位置(纬度)',
          z: 'z变量(时间/高度)',
          f: 'f(x,y,z)',
          selectPlaceholder: '请选择',
          submitButton: '查询并渲染'
        },
        actions: {
          title: '数据操作',
          clearHeatmap: '清除',
          viewStructure: '查看数据结构'
        },
        rendering: {
          title: '渲染效率',
          dataPoints: '数据点数',
          sampleRate: '采样率',
          actualPoints: '实际渲染点数'
        },
        messages: {
          selectFileFirst: '请先选择文件',
          uploadSuccess: '上传成功',
          uploadFailed: '数据处理失败, 请上传NetCDF v3.x文件',
          renderSuccess: '渲染成功',
          cesiumNotLoaded: 'cesium矢量地图未加载，请检查网络是否正常',
          uploadDataFirst: '请先上传数据文件',
          clickToRender: '无'
        },
        presetFiles: {
          temperature: '温度场nc数据',
          co2Pressure: '二氧化碳分压',
          salinity: '盐度场数据',
          selectPlaceholder: '请选择预设文件'
        },
        renderMode: {
          label: '渲染方式',
          point: '点渲染',
          column: '柱渲染',
          shader: 'shader渲染',
          rectangleRender: '纹理渲染',
          waterRender: '水面渲染',
          viewUV: '查看uv图'
        }
      },

      vectorNcFilePage: {
        upload: {
          title: '数据上传',
          selectFile: '选择.nc文件',
          selectedFile: '已选择文件',
          uploadButton: '上传'
        },
        query: {
          title: '数据查询',
          x: 'x位置(经度)',
          y: 'y位置(纬度)',
          z: 'z变量(时间/高度)',
          f: 'f(x,y,z)',
          selectPlaceholder: '请选择',
          submitButton: '查询并渲染'
        },
        actions: {
          title: '数据操作',
          clearHeatmap: '清除',
          viewStructure: '查看数据结构'
        },
        rendering: {
          title: '渲染效率',
          dataPoints: '数据点数',
          sampleRate: '采样率',
          actualPoints: '实际渲染点数'
        },
        messages: {
          selectFileFirst: '请先选择文件',
          uploadSuccess: '上传成功',
          uploadFailed: '数据处理失败, 请上传NetCDF v3.x文件',
          renderSuccess: '渲染成功',
          cesiumNotLoaded: 'cesium矢量地图未加载，请检查网络是否正常',
          uploadDataFirst: '请先上传数据文件',
          clickToRender: '无'
        },
        presetFiles: {
          wind: '风场nc数据'
        },
        renderMode: {
          label: '渲染方式',
          windPole: '风杆渲染',
          particleSystem: '粒子系统渲染',
          viewUV: '查看uv图'
        }
      },
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh',
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
