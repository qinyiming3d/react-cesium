import { request } from "@_public/apis/request";

// 从nc文件获取温度数据
export const getTempByNc = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return request.post({
        url: '/api/temperatureData',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

export const getTempdata = (filePath, params) => {
    return request.get({
        url: '/api/getTemperatureData',
        params: {
            filePath,
            params
        }
    })
}