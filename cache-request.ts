import { AxiosResponse } from 'axios';
import {
  RequestCacheRecordKey as RequestCacheRecordKeyOptions,
  RequestConfig,
  ResponseData,
} from './type';

export default class CacheRequest {
  static requestCacheRecord: Record<string, Promise<AxiosResponse<ResponseData, any>>> = {};

  static createKey(options: RequestCacheRecordKeyOptions) {
    return JSON.stringify(options);
  }

  static getItem(key: string) {
    return this.requestCacheRecord[key];
  }

  static setItem(key: string, requestPromise: Promise<any>, removeTimeout: number) {
    this.requestCacheRecord[key] = requestPromise;
    setTimeout(() => {
      this.removeItem(key);
    }, removeTimeout);
  }

  static removeItem(key: string) {
    delete this.requestCacheRecord[key];
  }

  static useCache<T>(
    options: RequestConfig,
    requestFunc: () => Promise<AxiosResponse<ResponseData<T>>>
  ): Promise<AxiosResponse<ResponseData<T>>> {
    const { method = 'GET', url, params, data, cache } = options;

    if (!cache) return requestFunc();

    const key = this.createKey({ method, url, params, data });
    const cachePromise: Promise<AxiosResponse<ResponseData<T>>> = this.getItem(key);
    if (cachePromise) return cachePromise;
    const requestPromise = requestFunc();
    this.setItem(key, requestPromise, cache as number);
    requestPromise.catch(() => {
      this.removeItem(key);
    });
    return requestPromise;
  }
}
