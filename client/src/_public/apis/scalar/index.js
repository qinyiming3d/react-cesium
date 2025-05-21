import {request} from "@_public/apis/request";

export const getHeaderByNc = (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    return request.post({
        url: '/api/scalarNcFileHandler',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
    });
}
// const result = {
//     status: 'success',
//     data: {
//         header: {
//             filePath: 'C:\\Users\\ZhuanZ/Desktop\\demo.nc',
//             headers: {
//                 dimensions: [{name: "time", size: 12}, {name: "lat", size: 8}],
//                 globalAttributes: [{name: "version", type: "char", value: "2022 version 2.0"}],
//                 recordDimensions: {length: 0, recordStep: 0},
//                 variables: [{
//                     name: "latitude",
//                     dimensions: [1],
//                     attributes: [],
//                     type: "double",
//                     size: 1440,
//                     offset: 880,
//                 }],
//                 version: 1
//             }
//         }
//     }
// }


export const getGridData = (filePath, params) => {
    return request.get({
        url: '/api/getScalarGridData',
        params: {
            filePath,
            params
        }
    })
}

// const result = {
//     status: 'success',
//     data: {
//         header: {
//             min: -180,
//             max: 180,
//             sampleRate: 1,
//             originLength: 360,
//             renderPointsLength: 120,
//         },
//         sampledData: [['经度', '纬度', '温度'],[],[]]
//     }
// }

export const getPresetData = (url) => {
    return request.get({
        url,
    })
}