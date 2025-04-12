import React from 'react';
import { Empty } from 'antd';

const EmptyState = ({ description = '请先上传数据文件' }) => {
  return (
    <Empty 
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={description}
    />
  );
};

export default EmptyState;
