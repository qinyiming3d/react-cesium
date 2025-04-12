import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Typography, Button, message, Upload, Card, theme, Modal, Form, Select, Progress } from 'antd';
import EmptyState from '@components/EmptyState/EmptyState';
import { useTranslation } from 'react-i18next';
import DataStructureViewer from '@components/DataStructureViewer/DataStructureViewer';
import { vectorController, scalarController } from '@_public/apis/index.js';
import { Color, Cartesian3, CustomDataSource, Entity, HeightReference } from 'cesium';
import { BASE_URL } from '@_public/apis/request.js';
import styles from './index.module.scss';

const { Title } = Typography;
const { useToken } = theme;
const { Option } = Select;

const NcFilePage = ({ viewer }) => {
  const { t } = useTranslation();
  const { token } = useToken();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [queryLoading, setQueryLoading] = useState(false);
  const [data, setData] = useState([]);
  const [variables, setVariables] = useState([]);
  const [filePath, setFilePath] = useState('');
  const [form] = Form.useForm();
  const [header, setHeader] = useState({});

  const [dataSource, setDataSource] = useState(null);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(BASE_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('upload-progress', (data) => {
      setUploadProgress(data.progress);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket连接错误:', err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 清除热力图
  const clearHeatmap = () => {
    if (viewer && dataSource) {
      viewer.dataSources.remove(dataSource);
      setDataSource(null);
    }
  };

  // 渲染热力图 (优化版)
  const renderHeatmap = (points) => {
    if (!viewer || !points.length) return;

    clearHeatmap();
    console.log('开始渲染热力图，数据点数:', points.length);

    try {
      const newDataSource = new CustomDataSource('temperatureHeatmap');
      console.log(points.length); // 16w个点
      const sampleRate = Math.max(1, Math.floor(points.length / 10000)); // 采样率
      const sampledPoints = points.filter((_, index) => index % sampleRate === 0);

      console.log('采样后数据点数:', sampledPoints.length);

      // 找到温度范围用于颜色映射
      const temps = sampledPoints.map(item => item[2]);
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      console.log('温度范围:', minTemp, maxTemp);

      // 分批处理数据
      const batchSize = 5000;
      for (let i = 0; i < sampledPoints.length; i += batchSize) {
        const batch = sampledPoints.slice(i, i + batchSize);
        batch.forEach(([longitude, latitude, temp]) => {
          // 计算颜色 (从蓝色到红色)
          const ratio = (temp - minTemp) / (maxTemp - minTemp);
          const color = Color.fromHsl(
            0, // 固定为红色色相
            ratio, // 饱和度从0到1
            1 - ratio * 0.5 // 亮度从1到0.5
          );

          const position = Cartesian3.fromDegrees(longitude, latitude);

          newDataSource.entities.add(new Entity({
            position,
            point: {
              color,
              pixelSize: 10,
              heightReference: HeightReference.CLAMP_TO_GROUND
            }
          }));
        });
      }

      viewer.dataSources.add(newDataSource);
      setDataSource(newDataSource);
      console.log('热力图渲染完成');
    } catch (error) {
      console.error('热力图渲染错误:', error);
      message.error('热力图渲染失败');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      message.warning('请先选择文件');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await scalarController.getHeaderByNc(file, socket);
      message.success('上传成功');
      setVariables(res.data.header.variables || []);
      setFilePath(res.data.filePath);
      setHeader(res.data.header);
    } catch (error) {
      message.error('上传失败');
      console.error('上传错误:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async (values) => {
    try {
      setQueryLoading(true);
      const params = {
        lon: values.lon,
        lat: values.lat,
        height: values.height,
        temperature: values.temperature
      };

      const res = await scalarController.getTempdata(filePath, JSON.stringify(params));

      setData(res.data);
      renderHeatmap(res.data);
      message.success('数据查询成功');
    } catch (error) {
      message.error('数据查询失败');
      console.error('查询错误:', error);
    } finally {
      setQueryLoading(false);
    }
  };

  const beforeUpload = (file) => {
    setFile(file);
    return false; // 阻止自动上传
  };



  useEffect(() => {
    return () => {
      clearHeatmap();
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* 左侧容器 */}
      <div className={styles.leftContainer}>
        <Card title={t('temperaturePage.upload.title')} className={styles.card}>
          {
            <>
              <Upload
                beforeUpload={beforeUpload}
                showUploadList={false}
                accept=".nc"
                disabled={uploading}
              >
                <Button>{t('temperaturePage.upload.selectFile')}</Button>
              </Upload>
              {file && (<p className={styles.fileName}>{t('temperaturePage.upload.selectedFile')}: {file.name}
                <Button
                  type="primary"
                  onClick={handleUpload}
                  loading={uploading}
                  className={styles.uploadButton}
                >
                  {t('temperaturePage.upload.uploadButton')}
                </Button></p>)}
              {uploading && (
                <Progress
                  percent={uploadProgress}
                  status="active"
                />
              )}
            </>
          }
        </Card>


        <Card title={t('temperaturePage.query.title')} className={styles.card}>
          {variables.length === 0 ? (
            <EmptyState description="请先上传数据文件" />
          ) : (
            <Form form={form} onFinish={handleQuery}>
              <Form.Item name="lon" label={t('temperaturePage.query.longitude')} rules={[{ required: true }]}>
                <Select placeholder={t('temperaturePage.query.selectPlaceholder')}>
                  {variables.map(v => (
                    <Option key={v.name} value={v.name}>{v.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="lat" label={t('temperaturePage.query.latitude')} rules={[{ required: true }]}>
                <Select placeholder={t('temperaturePage.query.selectPlaceholder')}>
                  {variables.map(v => (
                    <Option key={v.name} value={v.name}>{v.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="height" label={t('temperaturePage.query.height')} rules={[{ required: true }]}>
                <Select placeholder={t('temperaturePage.query.selectPlaceholder')}>
                  {variables.map(v => (
                    <Option key={v.name} value={v.name}>{v.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="temperature" label={t('temperaturePage.query.temperature')} rules={[{ required: true }]}>
                <Select placeholder={t('temperaturePage.query.selectPlaceholder')}>
                  {variables.map(v => (
                    <Option key={v.name} value={v.name}>{v.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={queryLoading} className={styles.queryButton}>
                {t('temperaturePage.query.submitButton')}
              </Button>
            </Form>)}

        </Card>

        <Modal
          open={isStructureModalOpen}
          onCancel={() => setIsStructureModalOpen(false)}
          footer={null}
          width="80%"
        >
          <DataStructureViewer
            data={header}
          />
        </Modal>
      </div>

      {/* 右侧卡片组 */}
      <div className={styles.rightContainer}>
        <Card title={t('temperaturePage.actions.title')} className={styles.card}>
          {!data.length > 0 ? <EmptyState description="请先上传数据文件" /> : <><Button onClick={clearHeatmap}>{t('temperaturePage.actions.clearHeatmap')}</Button>
            <Button
              onClick={() => setIsStructureModalOpen(true)}
              className={styles.actionButton}
            >
              {t('temperaturePage.actions.viewStructure')}
            </Button></>}
        </Card>


        <Card title={t('temperaturePage.rendering.title')} className={styles.card}>
          {data.length > 0 ? <><div>{t('temperaturePage.rendering.dataPoints')}: {data.length}</div>
            <div>{t('temperaturePage.rendering.sampleRate')}: {Math.max(1, Math.floor(data.length / 10000))}</div>
            <div>{t('temperaturePage.rendering.actualPoints')}: {Math.floor(data.length / Math.max(1, Math.floor(data.length / 10000)))}</div></> : <EmptyState description="请先上传数据文件" />}

        </Card>
      </div>
    </div>

  );
};

export default NcFilePage;
