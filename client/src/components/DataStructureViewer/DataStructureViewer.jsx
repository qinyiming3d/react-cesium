import React, { useState } from 'react';
import { Layout, Menu, Table, Typography, Card } from 'antd';
import { DatabaseOutlined, FileTextOutlined, BarsOutlined } from '@ant-design/icons';
import { Popover } from 'antd';

const { Sider, Content } = Layout;
const { Title } = Typography;

const DataStructureViewer = ({ data }) => {
  const [selectedKey, setSelectedKey] = useState('dimensions');

  // 完全动态生成菜单项
  const menuItems = Object.keys(data)
    .filter(key => Array.isArray(data[key]) && data[key].length > 0)
    .map(key => ({
      key,
      icon: <DatabaseOutlined />,
      label: key
    }));

  // 优化列配置生成（支持Popover）
  const generateColumns = (dataType) => {
    const sampleItem = data[dataType][0];
    if (!sampleItem) return [];

    return Object.keys(sampleItem).map(key => ({
      title: key,
      dataIndex: key,
      key,
      render: (value) => {
        // if (key === 'value') {
        //   return <span style={{ wordBreak: 'break-word' }}>{value}</span>;
        // }
        if (Array.isArray(value)) {
          if (typeof value[0] === 'object') {
            return (
              <Popover content={value.join(', ')} title="Details">
                <span style={{ cursor: 'pointer' }}>{value.length} items</span>
              </Popover>
            );
          } else {
            return <span style={{ wordBreak: 'break-word' }}>[{value.toString()}]</span>;
          }

        }
        if (typeof value === 'object' && value !== null) {
          return (
            <Popover
              content={<pre>{JSON.stringify(value, null, 2)}</pre>}
              title="Details"
              overlayStyle={{ maxWidth: 500 }}
            >
              <span style={{ cursor: 'pointer' }}>View details</span>
            </Popover>
          );
        }
        if (typeof value === 'boolean') {
          return value ? 'true' : 'false';
        }
        return value;
      }
    }));
  };

  return (
    <Layout style={{ background: 'transparent' }}>
      <div style={{ marginBottom: 16 }}>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onSelect={({ key }) => setSelectedKey(key)}
        />
      </div>
      <Content style={{ padding: '0 24px' }}>
        {menuItems.map(item => (
          selectedKey === item.key && (
            <Table
              key={item.key}
              columns={generateColumns(item.key)}
              dataSource={data[item.key]}
              rowKey="name"
              pagination={false}
              bordered
            />
          )
        ))}
      </Content>
    </Layout>
  );
};

export default DataStructureViewer;
