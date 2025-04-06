import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const TemperaturePage = () => {
  return (
    <div>
      <Title level={3}>温度数据可视化</Title>
      <p>这里是温度数据的详细页面</p>
    </div>
  );
};

export default TemperaturePage;
