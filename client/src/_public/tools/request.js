import axios from 'axios';
import NProgress from 'nprogress';

class Requst {
    constructor(deliverConfig) {
        this.instance = axios.create(deliverConfig);

        // 每个instance实例都添加拦截器
        this.instance.interceptors.request.use(config => {
            // loading/token
            console.log("全局请求成功的拦截")
            !deliverConfig.hideProgress && NProgress.start();
            return config
        }, err => {
            console.log("全局请求失败的拦截")
            !deliverConfig.hideProgress && NProgress.done();
            return err
        })
        this.instance.interceptors.response.use(res => {
            console.log("全局响应成功的拦截")
            !deliverConfig.hideProgress && NProgress.done();
            return res.data
        }, err => {
            console.log("全局响应失败的拦截")
            !deliverConfig.hideProgress && NProgress.done();
            return err
        })

        // 针对特定的hyRequest实例添加拦截器
        this.instance.interceptors.request.use(
            deliverConfig.interceptors?.requestSuccessFn,
            deliverConfig.interceptors?.requestFailureFn
        )
        this.instance.interceptors.response.use(
            deliverConfig.interceptors?.responseSuccessFn,
            deliverConfig.interceptors?.responseFailureFn
        )
    }

    request(config) {
        // 单次请求的成功拦截处理
        if (config.interceptors?.requestSuccessFn) {
            config = config.interceptors.requestSuccessFn(config)
        }

        return new Promise((resolve, reject) => {
            this.instance.request(config).then(res => {
                // 单词响应的成功拦截处理
                if (config.interceptors?.responseSuccessFn) {
                    res = config.interceptors.responseSuccessFn(res)
                }
                resolve(res)
            }).catch(err => {
                reject(err)
            })
        })
    }

    get(config) {
        return this.request({ ...config, method: "GET" })
    }
    post(config) {
        return this.request({ ...config, method: "POST" })
    }
    delete(config) {
        return this.request({ ...config, method: "DELETE" })
    }
    patch(config) {
        return this.request({ ...config, method: "PATCH" })
    }
}

export default Requst
