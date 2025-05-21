import {Color, Cartesian3, CustomDataSource, Entity, HeightReference} from 'cesium';

const pointRender = (viewer, data, header) => {
    const {min, max} = header;
    const dataSource = new CustomDataSource('point');
    const batchSize = 5000;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        batch.forEach(([longitude, latitude, temp]) => {
            const ratio = (temp - min) / (max - min);
            const color = Color.fromHsl(
                0, // 固定为红色色相
                ratio, // 饱和度从0到1
                1 - ratio * 0.5 // 亮度从1到0.5
            );

            const position = Cartesian3.fromDegrees(longitude, latitude);
            dataSource.entities.add(new Entity({
                position,
                point: {
                    color,
                    pixelSize: 5,
                    heightReference: HeightReference.CLAMP_TO_GROUND
                }
            }));
        });
    }

    viewer.dataSources.add(dataSource);
    return {
        type: 'dataSource',
        dispose: () => {
            viewer.dataSources.remove(dataSource);
        }
    }
}

export default pointRender;