import { request } from "@_public/apis/request";

// 获取技能树名称
export const getHeaderByNc = (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    return request.post({
        url: '/api/vectorNcFileHandler',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
    });
}

export const getGridData = (filePath, params) => {
    return request.get({
        url: '/api/getVectorGridData',
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