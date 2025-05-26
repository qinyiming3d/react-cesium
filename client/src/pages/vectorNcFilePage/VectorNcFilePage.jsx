import React, {useState, useEffect, useContext, useRef} from 'react';
import {Button, message, Upload, Card, theme, Modal, Form, Select, Progress, Spin} from 'antd';
import EmptyState from '@components/EmptyState/EmptyState';
import {useTranslation} from 'react-i18next';
import DataStructureViewer from '@components/DataStructureViewer/DataStructureViewer';
import {vectorController} from '@_public/apis/index.js';
import styles from './index.module.scss';
import Legend from "@components/Legend/Legend.jsx";
import ViewerContext from '../../viewContext.js';
import windPole from './renderMode/windPole.js'
import particleSystem from './renderMode/windParticleSystem/particleSystem.js'
import eventBus from '@_public/eventBus.js';


const {useToken} = theme;
const {Option} = Select;
const isGenerateUV = (renderMode) => ['particleSystem'].includes(renderMode)

const NcFilePage = () => {
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
    const [imgList, setImageList] = useState([]);

    const [presetFiles, setPresetFiles] = useState([
        {name: 'vectorNcFilePage.presetFiles.wind', path: '/data/wind.json'},
    ]);
    const [selectedPreset, setSelectedPreset] = useState(null);

    const viewer = useContext(ViewerContext);

    const renderMethods = {
        windPole: windPole,
        particleSystem: particleSystem,
    };

    const handleTextureGenerated = (data) => {
        const img = data.map(item => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (item.title === '粒子初始位置') {
                canvas.width = item.width; // 设置 canvas 宽度
                canvas.height = item.height; // 设置 canvas 高度
                const imageData = ctx.createImageData(item.width, item.height);
                for (let i = 0; i < item.array.length / 4; i++) {
                    const value = item.array[i];
                    // r通道x坐标（经度）  g通道y坐标（纬度）  b通道z坐标（高度） a通道为0
                    imageData.data[i * 4] = value / 360; // R通道
                    imageData.data[i * 4 + 1] = value + 90 / 180; // G通道
                    imageData.data[i * 4 + 2] = 0; // B通道
                    imageData.data[i * 4 + 3] = 255;                   // Alpha通道
                }
                ctx.putImageData(imageData, 0, 0);
            } else {
                canvas.width = item.width; // 设置 canvas 宽度
                canvas.height = item.height; // 设置 canvas 高度
                const imageData = ctx.createImageData(item.width, item.height);
                const normalize = v => (v - item.min) / (item.max - item.min);
                for (let i = 0; i < item.array.length; i++) {
                    imageData.data[i * 4] = Math.floor(normalize(item.array[i]) * 255); // R通道
                    imageData.data[i * 4 + 3] = 255;                   // Alpha通道
                }
                // const imageData = new ImageData(Uint8ClampedArray.from(item.array), item.width, item.height);
                ctx.putImageData(imageData, 0, 0);
            }
            return {
                title: item.title,
                url: canvas.toDataURL(),
            }
        });
        setImageList(originImg => {
            const newTitleArr = img.map(item => item.title);
            const originUV = originImg.filter(item => !newTitleArr.includes(item.title));
            return [...originUV, ...img];
        });
    }

    const handleRemoveImageList = () => {
        setImageList([]);
    }

    useEffect(() => {
        eventBus.on('windTextureGenerated', handleTextureGenerated);
        eventBus.on('removeImageList', handleRemoveImageList);
        return () => {
            eventBus.off('windTextureGenerated', handleTextureGenerated);
            eventBus.off('removeImageList', handleRemoveImageList);
            messageApi.destroy();
            clearRenderUnit();
        }
    }, [])

    const handlePresetSelect = async (value) => {
        const preset = presetFiles.find((file) => file.name === value);
        const res = await vectorController.getPresetData(preset.path);
        setSelectedPreset(preset.name);
        setVariables(res.data.header.variables || []);
        setFilePath(res.data.filePath);
        setHeader(res.data.header);
        setFileName(res.data.filePath)
        form?.setFields(res.data.selectOption);
    };

    const handleUpload = async () => {
        if (!file) {
            messageApi.warning(t('vectorNcFilePage.messages.selectFileFirst'));
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        try {
            const res = await vectorController.getHeaderByNc(file, (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
            });
            if (res.status !== "success") {
                throw new Error(res.error)
            }
            messageApi.success(t('vectorNcFilePage.messages.uploadSuccess'));
            setVariables(res.data.header.variables || []);
            setFilePath(res.data.filePath);
            setHeader(res.data.header);
            form?.resetFields();
            setSelectedPreset(null);
        } catch (error) {
            messageApi.error(t('vectorNcFilePage.messages.uploadFailed'), error);
        } finally {
            setUploading(false);
        }
    };

    const updateLegendData = (data) => {
        setLegendData(data)
    };

    const confirm = async (values) => {
        if (!viewer) {
            messageApi.warning(t('vectorNcFilePage.messages.cesiumNotLoaded'));
        }
        try {
            seConfirmLoading(true);
            const renderMode = form.getFieldValue('renderMode') || 'windPole';
            const params = {
                lon: values.lon,
                lat: values.lat,
                z: values.z,
                u: values.u,
                v: values.v,
                isSample: !(isGenerateUV(renderMode)),
                renderMode
            };

            const res = await vectorController.getGridData(filePath, JSON.stringify(params));

            clearRenderUnit();

            clearRenderUnit();
            renderMode === 'windPole' && setRenderInfo({...res.data.header});

            renderUnit.current = renderMethods[renderMode](viewer, res.data.sampledData, res.data.header, updateLegendData);

            messageApi.success(t('vectorNcFilePage.messages.renderSuccess'));
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
                <Card title={t('vectorNcFilePage.upload.title')} className={styles.card}>
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
                                    <Button>{t('vectorNcFilePage.upload.selectFile')}</Button>
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
                                            {t(preset.name)}
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
                            <p className={styles.fileName}>{t('vectorNcFilePage.upload.selectedFile')}: {fileName}</p>
                            <div className={styles.divButton}>
                                {/* 上传文件 */}
                                <Button
                                    type="primary"
                                    onClick={handleUpload}
                                    loading={uploading}
                                    disabled={!file}
                                >
                                    {t('vectorNcFilePage.upload.uploadButton')}
                                </Button>
                                {/* 查看数据结构 */}
                                <Button
                                    onClick={() => setIsStructureModalOpen(true)}
                                    disabled={!header}
                                >
                                    {t('vectorNcFilePage.actions.viewStructure')}</Button>

                                {/* 查看uv图 */}
                                <Button
                                    onClick={() => setUvOpen(true)}
                                    disabled={!imgList.length}
                                >
                                    {t('vectorNcFilePage.renderMode.viewUV')}
                                </Button>
                            </div>
                        </>
                    }
                </Card>

                {/* 数据查询 */}
                <Card title={t('vectorNcFilePage.query.title')} className={styles.card}>
                    {variables.length === 0 ? (
                        <EmptyState description={t('vectorNcFilePage.messages.uploadDataFirst')}/>
                    ) : (
                        <Form form={form} onFinish={confirm}>
                            <Form.Item name="lon" label={t('vectorNcFilePage.query.x')} rules={[{required: true}]}>
                                <Select placeholder={t('vectorNcFilePage.query.selectPlaceholder')}>
                                    {variables.map(v => (
                                        <Option key={v.name} value={v.name}>{v.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="lat" label={t('vectorNcFilePage.query.y')} rules={[{required: true}]}>
                                <Select placeholder={t('vectorNcFilePage.query.selectPlaceholder')}>
                                    {variables.map(v => (
                                        <Option key={v.name} value={v.name}>{v.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="z" label={t('vectorNcFilePage.query.z')}>
                                <Select placeholder={t('vectorNcFilePage.query.selectPlaceholder')}>
                                    {variables.map(v => (
                                        <Option key={v.name} value={v.name}>{v.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="u" label={t('vectorNcFilePage.query.u')} rules={[{required: true}]}>
                                <Select placeholder={t('vectorNcFilePage.query.selectPlaceholder')}>
                                    {variables.map(v => (
                                        <Option key={v.name} value={v.name}>{v.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="v" label={t('vectorNcFilePage.query.v')} rules={[{required: true}]}>
                                <Select placeholder={t('vectorNcFilePage.query.selectPlaceholder')}>
                                    {variables.map(v => (
                                        <Option key={v.name} value={v.name}>{v.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="renderMode" label={t('vectorNcFilePage.renderMode.label')} initialValue="particleSystem">
                                <Select>
                                    <Option value="windPole">{t('vectorNcFilePage.renderMode.windPole')}</Option>
                                    <Option value="particleSystem">{t('vectorNcFilePage.renderMode.particleSystem')}</Option>
                                </Select>
                            </Form.Item>

                            <div className={styles.divButton}>
                                <Button type="primary" htmlType="submit" loading={confirmLoading}
                                    className={styles.confirmButton}>
                                    {t('vectorNcFilePage.query.submitButton')}
                                </Button>

                                <Button onClick={clearRenderUnit}
                                    className={styles.actionButton}>{t('vectorNcFilePage.actions.clearHeatmap')}</Button>
                            </div>
                        </Form>)}

                </Card>
            </div>

            {/* 右侧卡片组 */}
            <div className={styles.rightContainer}>

                {/* 渲染效率 */}
                <Card title={t('vectorNcFilePage.rendering.title')} className={styles.card}>
                    {renderInfo ? <>
                        <div>{t('vectorNcFilePage.rendering.dataPoints')}: {renderInfo.originLength}</div>
                        <div>{t('vectorNcFilePage.rendering.actualPoints')}: {renderInfo.renderPointsLength}</div>
                        <div>{t('vectorNcFilePage.rendering.sampleRate')}: {renderInfo.sampleRate}</div>
                    </> : <EmptyState description={t('vectorNcFilePage.messages.clickToRender')}/>}
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
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        alignItems: 'center',
                    }}>
                    {imgList.map((item, index) => (
                        <div key={item.title} style={{textAlign: 'center'}}>
                            <img src={item.url}
                                 style={{width: '100%', height: 'auto', display: 'block', margin: '0 auto'}}/>
                            <p style={{marginTop: '8px'}}>{item.title}</p>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>

    );
};


export default NcFilePage;

