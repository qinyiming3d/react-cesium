// import { CustomDataSource, Color, Cartesian3 } from 'cesium';
// import * as d3Contour from 'd3-contour';
//
// const lineRender = (viewer, data, header) => {
//     const dataSource = new CustomDataSource('line');
//     // 生成等值线
//     const contours = generateContours(data);
//     contours.forEach(contour => {
//         // 确保坐标格式正确
//         const flatCoords = contour.coordinates
//             .flat().flat().flat()
//             // .filter(coord => coord.length === 2) // 确保每个坐标点有经度和纬度
//             // .flat(); // 展平为[lon1, lat1, lon2, lat2,...]格式
//         console.log(flatCoords)
//         if (flatCoords.length >= 2 && flatCoords.length % 2 === 0) {
//             dataSource.entities.add({
//                 polyline: {
//                     positions: Cartesian3.fromDegreesArray(flatCoords),
//                     width: 2,
//                     material: Color.RED
//                 }
//             });
//         }
//     });
//
//     viewer.dataSources.add(dataSource);
//
//     return {
//         type: 'dataSource',
//         dispose: () => {
//             viewer.dataSources.remove(dataSource);
//         }
//     }
// }
//
// export default lineRender;
//
// /**
//  * 动态计算网格大小
//  * @param {Array} data - 输入数据数组，格式为[[lon, lat, value], ...]
//  * @returns {number} - 计算出的网格大小
//  *
//  * 算法原理：
//  * 1. 设置基础网格大小baseSize=50
//  * 2. 目标每个网格单元包含约5个数据点(pointsPerCell=5)
//  * 3. 计算需要的网格大小：sqrt(数据点数/pointsPerCell)
//  * 4. 取计算值和baseSize中的较大值，确保网格不会太小
//  */
// function calculateGridSize(data) {
//     const baseSize = 50; // 基础网格大小
//     const pointsPerCell = 5; // 每个网格单元的目标数据点数
//     return Math.max(baseSize, Math.ceil(Math.sqrt(data.length / pointsPerCell)));
// }
//
// /**
//  * 将离散点数据网格化
//  * @param {Array} data - 输入数据数组，格式为[[lon, lat, value], ...]
//  * @returns {Array} - 网格化后的二维数组
//  *
//  * 算法步骤：
//  * 1. 计算数据经纬度范围
//  * 2. 动态确定网格大小
//  * 3. 对每个网格点：
//  *    a. 使用反距离加权插值(IDW)计算值
//  *    b. 使用Cesium的Cartesian3计算准确距离
//  *    c. 权重=1/(距离^2)
//  */
// function gridData(data) {
//     // 1. 计算经纬度范围
//     const lons = data.map(d => d[0]);
//     const lats = data.map(d => d[1]);
//     const minLon = Math.min(...lons);
//     const maxLon = Math.max(...lons);
//     const minLat = Math.min(...lats);
//     const maxLat = Math.max(...lats);
//
//     // 动态计算gridSize
//     const gridSize = calculateGridSize(data);
//     console.log('使用网格大小:', gridSize);
//
//     // 2. 创建网格
//     const grid = new Array(gridSize * gridSize).fill(0);
//
//     // 3. 使用反距离加权插值(IDW)填充网格
//     for (let y = 0; y < gridSize; y++) {
//         for (let x = 0; x < gridSize; x++) {
//             // 计算当前网格点的经纬度
//             const lon = minLon + (maxLon - minLon) * (x / gridSize);
//             const lat = minLat + (maxLat - minLat) * (y / gridSize);
//             const gridPos = Cartesian3.fromDegrees(lon, lat);
//
//             // 计算权重和加权值
//             let sumWeights = 0;
//             let sumValues = 0;
//
//             for (const point of data) {
//                 const [pointLon, pointLat, value] = point;
//                 const pointPos = Cartesian3.fromDegrees(pointLon, pointLat);
//
//                 // 使用Cesium的Ellipsoid.WGS84计算两点间距离(米)
//                 const distance = Cartesian3.distance(gridPos, pointPos);
//
//                 if (distance === 0) {
//                     sumValues = value;
//                     sumWeights = 1;
//                     break;
//                 }
//
//                 const weight = 1 / (distance * distance);
//                 sumWeights += weight;
//                 sumValues += value * weight;
//             }
//
//             grid[y * gridSize + x] = sumWeights > 0 ? sumValues / sumWeights : 0;
//         }
//     }
//
//     return grid;
// }
//
// function generateContours(data) {
//     // 1. 将数据网格化
//     const grid = gridData(data);
//     const gridSize = Math.sqrt(grid.length); // 从网格数据反推gridSize
//
//     // 2. 使用d3-contour生成等值线
//     const thresholds = [0, 10, 20, 30]; // 等值线阈值
//     const contours = d3Contour.contours()
//         .size([gridSize, gridSize])
//         .thresholds(thresholds)
//         (grid);
//
//     return contours;
// }