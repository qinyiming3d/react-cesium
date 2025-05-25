import {
    GeometryInstance,
    RectangleGeometry,
    Ellipsoid,
    Rectangle,
    EllipsoidSurfaceAppearance,
    Cartesian2,
    Primitive,
    Texture,
    MaterialAppearance,
    BoundingSphere,
    Cartesian3,
} from 'cesium';
import * as Util from './util.js';
import ParticleManager from "@pages/vectorNcFilePage/renderMode/windParticleSystem/ParticleManager.js";
import * as Cesium from 'cesium';
import eventBus from "@_public/eventBus.js";
import {createColorTexture} from "@_public/util.js";

let isRender = false;

const addPrimitives = (scene, particleManager) => {
    scene.primitives.add(particleManager.particlesComputing.primitives.calculateSpeed);
    scene.primitives.add(particleManager.particlesComputing.primitives.updatePosition);
    scene.primitives.add(particleManager.particlesComputing.primitives.postProcessingPosition);

    scene.primitives.add(particleManager.particlesRendering.primitives.segments);
    scene.primitives.add(particleManager.particlesRendering.primitives.trails);
    scene.primitives.add(particleManager.particlesRendering.primitives.screen);

    scene.primitives.show = true;
    isRender = true;
}

const removePrimitives = (scene, particleManager) => {
    isRender = false;
    scene.primitives.remove(particleManager.particlesComputing.primitives.calculateSpeed);
    scene.primitives.remove(particleManager.particlesComputing.primitives.updatePosition);
    scene.primitives.remove(particleManager.particlesComputing.primitives.postProcessingPosition);

    scene.primitives.remove(particleManager.particlesRendering.primitives.segments);
    scene.primitives.remove(particleManager.particlesRendering.primitives.trails);
    scene.primitives.remove(particleManager.particlesRendering.primitives.screen);
}

const initEventListener = (camera, scene, particleManager) => {
    let resized = false;


    window.addEventListener("resize", () => {
        if(isRender) {
            resized = true;
            scene.primitives.show = false;
            isRender && scene.primitives.removeAll();
        }
    });

    scene.preRender.addEventListener(() => {
        if (resized) {
            particleManager.canvasResize(scene.context);
            isRender && scene.primitives.removeAll();
            resized = false;
            addPrimitives(scene, particleManager);
        }
    });
}

const getCurrentViewerParameters = (camera, scene) => {
    let viewRectangle = camera.computeViewRectangle(scene.globe.ellipsoid);
    let lonLatRange = Util.viewRectangleToLonLatRange(viewRectangle);
    let viewerParameters = {
        lonRange: new Cesium.Cartesian2(),
        latRange: new Cesium.Cartesian2(),
        pixelSize: 0.0
    }
    viewerParameters.lonRange.x = lonLatRange.lon.min;
    viewerParameters.lonRange.y = lonLatRange.lon.max;
    viewerParameters.latRange.x = lonLatRange.lat.min;
    viewerParameters.latRange.y = lonLatRange.lat.max;

    const pixelSize = camera.getPixelSize(
        new BoundingSphere(Cartesian3.ZERO, 0.99 * 6378137.0),
        scene.drawingBufferWidth,
        scene.drawingBufferHeight,
    ); // 屏幕上一个像素对应的实际地理尺寸（以米为单位）。

    if (pixelSize > 0) {
        viewerParameters.pixelSize = pixelSize;
    }

    return viewerParameters;
}

// 渲染矩形区域
export default function particleRender(viewer, data, header, updateLegendData) {
    const scene = viewer.scene;
    const camera = viewer.camera;
    data.U.array = new Float32Array(data.U.array);
    data.V.array = new Float32Array(data.V.array);
    data.lon.array = new Float32Array(data.lon.array);
    data.lat.array = new Float32Array(data.lat.array);
    data.lev.array = new Float32Array(data.lev.array);

    const viewerParameters = getCurrentViewerParameters(camera, scene)

    const color = createColorTexture({minValue: 0, maxValue: 1});
    const ctx = color.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, 256, 1);
    const colorTexture = new Texture({
        context: scene.context,
        source: {
            arrayBufferView: imageData.data,
            width: 256,
            height: 1
        }
    });

    const particleManager = new ParticleManager(scene.context, data, viewerParameters, colorTexture)
    addPrimitives(scene, particleManager);

    initEventListener(camera, scene, particleManager);

    updateLegendData({min: 0, max: 1, colors: color.canvas.toDataURL()})

    return {
        type: 'MyPrimitives',
        dispose: () => {
            // 提供清理函数以移除 Primitive
            removePrimitives(scene, particleManager);
            eventBus.emit('removeImageList')
        },
        // uv: textureGen.generate().toDataURL(),
    }
}