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
      
      temperaturePage: {
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
      
      temperaturePage: {
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
        }
      }
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
