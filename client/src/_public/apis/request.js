import Request from '../tools/request';

const BASE_URL = '';

export const request = new Request({
    baseURL: BASE_URL,
});

export const requestWithNoProgress = new Request({
    baseURL: BASE_URL,
    hideProgress: true,
})