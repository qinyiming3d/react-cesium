import Request from '../tools/request';

export const BASE_URL = 'http://localhost:3001';

export const request = new Request({
    baseURL: '',
});

export const requestWithNoProgress = new Request({
    baseURL: '',
    hideProgress: true,
})