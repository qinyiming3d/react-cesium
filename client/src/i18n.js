import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      title: 'Ocean Field Visualization System',
      author: 'Author: qinyiming',
      scalar: 'Scalar Field',
      vector: 'Vector Field',
      temperature: 'Temperature',
      salinity: 'Salinity',
      density: 'Density',
      velocity: 'Velocity',
      direction: 'Direction'
    }
  },
  zh: {
    translation: {
      title: '海洋要素场可视化系统',
      author: '作者: 覃艺明',
      scalar: '标量场可视化',
      vector: '矢量场可视化',
      temperature: '温度场',
      salinity: '盐度场',
      density: '密度场',
      velocity: '流速场',
      direction: '流向场'
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
