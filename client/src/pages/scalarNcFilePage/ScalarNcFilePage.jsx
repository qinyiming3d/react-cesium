import React, {useState, useEffect, useContext, useRef} from 'react';
import {Button, message, Upload, Card, theme, Modal, Form, Select, Progress, Spin} from 'antd';
import EmptyState from '@components/EmptyState/EmptyState';
import {useTranslation} from 'react-i18next';
import DataStructureViewer from '@components/DataStructureViewer/DataStructureViewer';
import {scalarController} from '@_public/apis/index.js';
import pointRender from './renderMode/pointRender.js';
import cylinderRender from './renderMode/cylinderRender.js';
// import lineRender from './renderMode/lineRender.js';
import shaderRender from "./renderMode/shaderRender.js";
import styles from './index.module.scss';
import {Cartesian3} from 'cesium';
import rectangleRender from "@pages/scalarNcFilePage/renderMode/rectangleRender.js";
import waterRender from "@pages/scalarNcFilePage/renderMode/waterRender.js";
import Legend from "@components/Legend/Legend.jsx";
import ViewerContext from '../../viewContext.js';

const {useToken} = theme;
const {Option} = Select;
const isGenerateUV = (renderMode) => ['rectangleRender', 'waterRender'].includes(renderMode)

const ScalarNcFilePage = () => {
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
    const [legendData, setLegendData] = useState(null);
    const [fileName, setFileName] = useState('');
    const renderUnit = useRef(null); // 渲染结果
    const [isStructureModalOpen, setIsStructureModalOpen] = useState(false); // 表格显隐
    const [uvOpen, setUvOpen] = useState(false); // uv图显隐

    const [presetFiles, setPresetFiles] = useState([
        {name: '温度场nc数据', path: '/data/temperature.json'},
        {name: '二氧化碳分压', path: '/data/co2Pressure.json'},
        {name: '盐度场数据', path: '/data/salinity.json'},
    ]);
    const [selectedPreset, setSelectedPreset] = useState(null);

    const viewer = useContext(ViewerContext);

    const renderMethods = {
        point: pointRender, // 点渲染
        column: cylinderRender, // 柱渲染
        // contour: lineRender, // 等值线渲染
        shader: shaderRender, // shader渲染
        rectangleRender: rectangleRender, // 矩形渲染
        waterRender: waterRender, // 水面渲染
    };

    useEffect(() => {
        return () => {
            messageApi.destroy();
            clearRenderUnit();
        }
    }, [])

    const handlePresetSelect = async (value) => {
        const preset = presetFiles.find((file) => file.name === value);
        const res = await scalarController.getPresetData(preset.path);
        setSelectedPreset(preset.name);
        setVariables(res.data.header.variables || []);
        setFilePath(res.data.filePath);
        setHeader(res.data.header);
        setFileName(res.data.filePath)
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
            const res = await scalarController.getHeaderByNc(file, (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
            });
            if (res.status !== "success") {
                throw new Error(res.error)
            }
            messageApi.success('上传成功');
            setVariables(res.data.header.variables || []);
            setFilePath(res.data.filePath);
            setHeader(res.data.header);
            form?.resetFields();
            setSelectedPreset(null);
        } catch (error) {
            messageApi.error('数据处理失败, 请上传NetCDF v3.x文件', error);
        } finally {
            setUploading(false);
        }
    };

    const updateLegendData = (data) => {
        setLegendData(data)
    };

    const confirm = async (values) => {
        if (!viewer) {
            messageApi.warning('cesium矢量地图未加载，请检查网络是否正常');
        }
        try {
            seConfirmLoading(true);
            const renderMode = form.getFieldValue('renderMode') || 'point';
            const params = {
                lon: values.lon,
                lat: values.lat,
                z: values.z,
                f: values.f,
                isSample: !(isGenerateUV(renderMode)),
            };

            const res = await scalarController.getGridData(filePath, JSON.stringify(params));

            clearRenderUnit();


            setRenderInfo({...res.data.header})


            clearRenderUnit();
            setRenderInfo({...res.data.header});

            renderUnit.current = renderMethods[renderMode](viewer, res.data.sampledData, res.data.header, updateLegendData);

            messageApi.success('渲染成功');
        } catch (error) {
            messageApi.error(error.message);
        } finally {
            seConfirmLoading(false);
        }
    };

    const beforeUpload = (file) => {
        setFile(file);
        setFileName(file.name);
        return false; // 阻止自动上传
    };

    // 清除热力图
    const clearRenderUnit = () => {
        if (viewer && renderUnit.current) {
            renderUnit.current.dispose();
            setRenderInfo(null);
            setLegendData(null);
        }
    };

    return (
        <div className={styles.container}>
            {contextHolder}
            <Spin spinning={confirmLoading} fullscreen/>
            {/* 左侧容器 */}
            <div className={styles.leftContainer}>
                {/* 数据上传 */}
                <Card title={t('temperaturePage.upload.title')} className={styles.card}>
                    {
                        <>
                            <div className={styles.flex}>
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
                                </Select>
                            </div>
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
                            <p className={styles.fileName}>{t('temperaturePage.upload.selectedFile')}: {fileName}</p>
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
                            {/* 查看数据结构 */}
                            <Button
                                onClick={() => setIsStructureModalOpen(true)}
                                className={styles.actionButton}
                                disabled={!header}
                            >
                                {t('temperaturePage.actions.viewStructure')}
                            </Button>

                            {/* 查看uv图 */}
                            <Button
                                onClick={() => setUvOpen(true)}
                                className={styles.actionButton}
                                disabled={!renderUnit.current || !isGenerateUV(form.getFieldValue('renderMode'))}
                            >
                                查看uv图
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

                            <Form.Item name="renderMode" label="渲染方式" initialValue="rectangleRender">
                                <Select>
                                    <Option value="point">点渲染</Option>
                                    <Option value="column">柱渲染</Option>
                                    <Option value="shader">shader渲染</Option>
                                    <Option value="rectangleRender">纹理渲染</Option>
                                    <Option value="waterRender">水面渲染</Option>
                                </Select>
                            </Form.Item>

                            <Button type="primary" htmlType="submit" loading={confirmLoading}
                                    className={styles.confirmButton}>
                                确认
                            </Button>

                            <Button onClick={clearRenderUnit}
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

            {legendData && <Legend
                min={legendData.min}
                max={legendData.max}
                gradient={legendData.colors}
                width={200}
                height={30}/>}


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

            {/* uv图模态框 */}
            <Modal
                open={uvOpen}
                onCancel={() => setUvOpen(false)}
                footer={null}
                width="80%"
                wrapClassName={styles.modalWrap}
                centered
            >
                <img src={renderUnit.current?.uv} style={{display: 'block', margin: '0 auto', maxWidth: '100%'}}/>
            </Modal>
        </div>

    );
};


export default ScalarNcFilePage;

