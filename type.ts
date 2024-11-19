import { AxiosRequestConfig } from 'axios';

export interface ResponseData<T = any> {
  code: number;
  data: T;
  message: string;
}

export interface RequestConfig extends AxiosRequestConfig {
  url: string;
  loading?: boolean;
  abortKey?: string;
  /**
   * 请求缓存时间(单位毫秒), 默认为 false 不缓存
   */
  cache?: false | number;
}

export interface RequestCacheRecordKey {
  method: RequestConfig['method'];
  url: string;
  params: RequestConfig['params'];
  data: RequestConfig['data'];
}
