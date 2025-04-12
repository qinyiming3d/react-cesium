import { request } from "@_public/apis/request";

// 从nc文件获取温度数据
export const getHeaderByNc = (file, socket) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return request.post({
        url: '/api/ncFileHandler',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
            'socket-id': socket.id
        },
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