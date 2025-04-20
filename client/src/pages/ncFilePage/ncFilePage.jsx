import React, {useState, useEffect, useRef} from 'react';
import {io} from 'socket.io-client';
import {Button, message, Upload, Card, theme, Modal, Form, Select, Progress} from 'antd';
import EmptyState from '@components/EmptyState/EmptyState';
import {useTranslation} from 'react-i18next';
import DataStructureViewer from '@components/DataStructureViewer/DataStructureViewer';
import {vectorController, scalarController} from '@_public/apis/index.js';
import {BASE_URL} from '@_public/apis/request.js';
import pointRender from './renderMode/pointRender.js';
import cylinderRender from './renderMode/cylinderRender.js';
import lineRender from './renderMode/lineRender.js';
import shaderRender from "./renderMode/shaderRender.js";
import getPrimitiveEllipsoid from './test'
import styles from './index.module.scss';
import {Cartesian3} from 'cesium';

const {useToken} = theme;
const {Option} = Select;

const NcFilePage = ({viewer, measureRender, performanceData, measureUpload}) => {
    const {t} = useTranslation();
    const {token} = useToken();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [confirmLoading, seConfirmLoading] = useState(false);
    const [variables, setVariables] = useState([]); // 用于生成下拉框选项
    const [filePath, setFilePath] = useState('');  // 用于后续查询
    const [form] = Form.useForm();
    const [header, setHeader] = useState(null); // 用于渲染头文件表格
    const [messageApi, contextHolder] = message.useMessage({
        top: '10vh',
    });
    const [renderInfo, setRenderInfo] = useState(null);

    const [presetFiles, setPresetFiles] = useState([
        {name: '温度场nc数据', path: '/data/temperature.json'},
        {name: '二氧化碳分压', path: '/data/co2Pressure.json'},
        {name: '盐度场数据', path: '/data/salinity.json'},
    ]);
    const [selectedPreset, setSelectedPreset] = useState(null);

    const renderMethods = {
        point: pointRender, // 点渲染
        column: cylinderRender, // 柱渲染
        contour: lineRender, // 等值线渲染
        shader: shaderRender, // 着色渲染
    };

    const [dataSource, setDataSource] = useState(null); // entity实例
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
            messageApi.destroy();
            clearHeatmap();
        };
    }, []);

    const handlePresetSelect = async (value) => {
        const preset = presetFiles.find((file) => file.name === value);
        const res = await scalarController.getPresetData(preset.path);
        setSelectedPreset(preset.name);
        setVariables(res.data.header.variables || []);
        setFilePath(res.data.filePath);
        setHeader(res.data.header);
        console.log(res.data.selectOption)
        form?.setFields(res.data.selectOption);
    };

    const handleUpload = async () => {
        const cartesian3_1 = Cartesian3.fromDegrees(0, 0); // {x: 6378137, y: 0, z: 0}
        const cartesian3_2 = Cartesian3.fromDegrees(90, 0); // {x: 0, y: 6378137, z: 0}
        const cartesian3_3 = Cartesian3.fromDegrees(0, 90); // {x: 0, y: 0, z: 6356752.314245179}
        const cartesian3_4 = Cartesian3.fromDegrees(0, 0, -6378137); //{x: 0, y: 0, z: 0}


        if (!file) {
            messageApi.warning('请先选择文件');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        try {
            const res = await scalarController.getHeaderByNc(file, socket)
            messageApi.success('上传成功');
            setVariables(res.data.header.variables || []);
            setFilePath(res.data.filePath);
            setHeader(res.data.header);
            form?.resetFields();
            setSelectedPreset(null);
        } catch (error) {
            messageApi.error('上传失败');
        } finally {
            setUploading(false);
        }
    };

    const confirm = async (values) => {
        if (!viewer) {
            messageApi.warning('cesium矢量地图未加载，请检查网络是否正常');
        }
        try {
            seConfirmLoading(true);
            const params = {
                lon: values.lon,
                lat: values.lat,
                z: values.z,
                f: values.f
            };

            const res = await scalarController.getGridData(filePath, JSON.stringify(params));

            clearHeatmap();

            const renderMode = form.getFieldValue('renderMode') || 'point';

            setRenderInfo({...res.data.header})

            await scalarController.getGridData(filePath, JSON.stringify(params));

            clearHeatmap();
            setRenderInfo({...res.data.header});

            const newDataSource = renderMethods[renderMode](viewer, res.data.sampledData, res.data.header);
            setDataSource(newDataSource);

            messageApi.success('渲染成功');
        } catch (error) {
            messageApi.error('结构选择不符合规范');
        } finally {
            seConfirmLoading(false);
        }
    };

    const beforeUpload = (file) => {
        setFile(file);
        return false; // 阻止自动上传
    };

    // 清除热力图
    const clearHeatmap = () => {
        if (viewer && dataSource) {
            viewer.dataSources.remove(dataSource);
            setDataSource(null);
            setRenderInfo(null);
        }
    };

    return (
        <div className={styles.container}>
            {contextHolder}
            {/* 左侧容器 */}
            <div className={styles.leftContainer}>
                {/* 数据上传 */}
                <Card title={t('temperaturePage.upload.title')} className={styles.card}>
                    {
                        <>
                            {/* 上传按钮 */}
                            <Upload
                                beforeUpload={beforeUpload}
                                showUploadList={false}
                                accept=".nc"
                                disabled={uploading}
                            >
                                <Button>{t('temperaturePage.upload.selectFile')}</Button>
                            </Upload>

                            {/* 预设文件下拉框 */}
                            <Select
                                placeholder="选择预设文件"
                                value={selectedPreset}
                                onChange={handlePresetSelect}
                                className={styles.presetSelect}
                            >
                                {presetFiles.map((preset) => (
                                    <Option key={preset.name} value={preset.name}>
                                        {preset.name}
                                    </Option>
                                ))}
                            </Select> (预设文件)

                            {/* 进度条 */}
                            <div className={styles.uploadContainer}>
                                {uploading && (
                                    <Progress
                                        percent={uploadProgress}
                                        status="active"
                                    />
                                )}
                            </div>

                            {/* 文件名 */}
                            <p className={styles.fileName}>{t('temperaturePage.upload.selectedFile')}: {file?.name}</p>
                            {/* 上传文件 */}
                            <Button
                                type="primary"
                                onClick={handleUpload}
                                loading={uploading}
                                className={styles.uploadButton}
                                disabled={!file}
                            >
                                {t('temperaturePage.upload.uploadButton')}
                            </Button>

                            <Button
                                onClick={() => setIsStructureModalOpen(true)}
                                className={styles.actionButton}
                                disabled={!header}
                            >
                                {t('temperaturePage.actions.viewStructure')}
                            </Button>
                        </>
                    }
                </Card>

                {/* 数据查询 */}
                <Card title={t('temperaturePage.query.title')} className={styles.card}>
                    {variables.length === 0 ? (
                        <EmptyState description="请先上传数据文件"/>
                    ) : (
                        <Form form={form} onFinish={confirm}>
                            <Form.Item name="lon" label={t('temperaturePage.query.x')} rules={[{required: true}]}>
                                <Select placeholder={t('temperaturePage.query.selectPlaceholder')}>
                                    {variables.map(v => (
                                        <Option key={v.name} value={v.name}>{v.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="lat" label={t('temperaturePage.query.y')} rules={[{required: true}]}>
                                <Select placeholder={t('temperaturePage.query.selectPlaceholder')}>
                                    {variables.map(v => (
                                        <Option key={v.name} value={v.name}>{v.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="z" label={t('temperaturePage.query.z')}>
                                <Select placeholder={t('temperaturePage.query.selectPlaceholder')}>
                                    {variables.map(v => (
                                        <Option key={v.name} value={v.name}>{v.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="f" label={t('temperaturePage.query.f')} rules={[{required: true}]}>
                                <Select placeholder={t('temperaturePage.query.selectPlaceholder')}>
                                    {variables.map(v => (
                                        <Option key={v.name} value={v.name}>{v.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="renderMode" label="渲染方式" initialValue="point">
                                <Select>
                                    <Option value="point">点渲染</Option>
                                    <Option value="column">柱渲染</Option>
                                    <Option value="contour">等值线渲染</Option>
                                    <Option value="shader">shader渲染</Option>
                                </Select>
                            </Form.Item>

                            <Button type="primary" htmlType="submit" loading={confirmLoading}
                                    className={styles.confirmButton}>
                                确认
                            </Button>

                            <Button onClick={clearHeatmap}
                                    className={styles.actionButton}>{t('temperaturePage.actions.clearHeatmap')}</Button>
                        </Form>)}

                </Card>
            </div>

            {/* 右侧卡片组 */}
            <div className={styles.rightContainer}>
                {/* 数据操作 */}
                {/* <Card title={t('temperaturePage.actions.title')} className={styles.card}>
          {!data.length > 0 ? <EmptyState description="请先上传数据文件" /> : <>
          </>}
        </Card> */}

                {/* 渲染效率 */}
                <Card title={t('temperaturePage.rendering.title')} className={styles.card}>
                    {renderInfo ? <>
                        <div>{t('temperaturePage.rendering.dataPoints')}: {renderInfo.originLength}</div>
                        <div>{t('temperaturePage.rendering.actualPoints')}: {renderInfo.renderPointsLength}</div>
                        <div>{t('temperaturePage.rendering.sampleRate')}: {renderInfo.sampleRate}</div>
                    </> : <EmptyState description="请点击确认渲染"/>}

                </Card>
            </div>


            {/* 表格模态框 */}
            <Modal
                open={isStructureModalOpen}
                onCancel={() => setIsStructureModalOpen(false)}
                footer={null}
                width="80%"
                wrapClassName={styles.modalWrap}

            >
                <DataStructureViewer
                    data={header}
                />
            </Modal>
        </div>

    );
};


export default NcFilePage;

