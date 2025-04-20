import {
    Color,
    Cartesian3,
    CustomDataSource,
    Entity,
    HeightReference,
    ArcType,
    ConstantProperty,
    PolylineGraphics,
    ColorMaterialProperty
} from 'cesium';

const cylinderRender = (viewer, data, header) => {
    const {min, max} = header;
    // 改用EllipsoidPrimitive实现柱渲染效果
    const dataSource = new CustomDataSource('cylinder');

    const batchSize = 5000;
    const hightScale = 3000000;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        batch.forEach(([longitude, latitude, temp]) => {
            const colorRatio = (temp - min) / (max - min);
            // 增强高度差异：使用colorRatio的立方放大高值区间差异
            const enhancedRatio = Math.pow(colorRatio, 3);
            let height = enhancedRatio * hightScale;
            // console.log(colorRatio)
            const surfacePosition = Cartesian3.fromDegrees(
                longitude,
                latitude,
                0,
            );

            const heightPosition = Cartesian3.fromDegrees(
                longitude,
                latitude,
                height,
            );
            // 单色渐变：从白色(饱和度0)到纯红色(饱和度1)，亮度从1(最亮)到0.5(中等)
            const color = Color.fromHsl(
                0, // 固定红色色调
                enhancedRatio, // 饱和度从0(白色)到1(纯色)
                1 - enhancedRatio * 0.5 // 亮度从1(最亮)到0.5(中等)
            );

            //WebGL Globe only contains lines, so that's the only graphics we create.
            const polyline = new PolylineGraphics();
            polyline.material = new ColorMaterialProperty(color);
            polyline.width = new ConstantProperty(2);
            polyline.arcType = new ConstantProperty(ArcType.NONE);
            polyline.positions = new ConstantProperty([
                surfacePosition,
                heightPosition,
            ]);

            //The polyline instance itself needs to be on an entity.
            const entity = new Entity({
                show: true,
                polyline: polyline,
            });

            dataSource.entities.add(entity);
        });
    }
    console.log('柱渲染完成', dataSource.entities.values.length, '个柱体');

    viewer.dataSources.add(dataSource);

    return dataSource;
}

export default cylinderRender;