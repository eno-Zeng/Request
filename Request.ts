import axios, { AxiosError, AxiosInterceptorManager, AxiosResponse } from 'axios';
import { Notification } from '@arco-design/web-vue';
import { RequestConfig, ResponseData } from './type';
import { RESPONSE_STATUS_MESSAGE_MAP } from './constant';
import AbortRequest from './abort-request';
import CacheRequest from './cache-request';
import Loading from './loading';

class Request {
  private instance = axios.create({
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
    withCredentials: true,
  });

  private loading = new Loading();

  // 对 refresh 的处理
  private refresh = () => Promise.resolve();

  constructor() {
    // 设置请求拦截
    const request = this.instance.interceptors.request as AxiosInterceptorManager<RequestConfig>;
    request.use(config => this.handleRequestLoading(config));
    request.use(config => this.handleRequestAbortKey(config));

    // 设置响应拦截
    const { response } = this.instance.interceptors;
    response.use(config => this.handleResponseLoading(config));
    response.use(config => this.handleResponseAbortKey(config));
    response.use(config => this.handleResponseStatus(config));
  }

  // 请求拦截: 处理 loading
  private handleRequestLoading(config: RequestConfig): RequestConfig {
    const { loading = true, url } = config;
    if (loading) this.loading!.open(url);
    return config;
  }

  // 请求拦截: 处理 abortKey
  private handleRequestAbortKey(config: RequestConfig): RequestConfig {
    const { abortKey } = config;
    if (abortKey) {
      AbortRequest.setItem(abortKey);
      config.signal = AbortRequest.getItem(abortKey).signal;
    }

    return config;
  }

  // 请求拦截
  private handleRequest(config: RequestConfig): RequestConfig {
    // TODO: 处理请求的 header 等信息
    return config;
  }

  // 响应拦截: 处理 loading
  private handleResponseLoading(response: AxiosResponse<Blob>): AxiosResponse {
    const {
      config: { url },
    } = response;
    this.loading.close(url!);
    return response;
  }

  // 响应拦截: 处理 abortKey
  private handleResponseAbortKey(response: AxiosResponse<Blob>): AxiosResponse {
    const { abortKey } = response.config as RequestConfig;
    if (abortKey) AbortRequest.removeItem(abortKey);
    return response;
  }

  // 响应拦截: 处理业务响应状态
  private handleResponseStatus(response: AxiosResponse<ResponseData>): Promise<AxiosResponse> {
    const { status, data } = response;
    if (status !== 200) {
      return Promise.reject(
        new AxiosError('', response.statusText, response.config, response.request, response)
      );
    }

    const { code } = data || {};
    if (code === 401) {
      // TODO: 处理 token 过期或未登录的情况
      return this.refresh() as any;
    }
    if (code !== 200) {
      const { message } = data;
      return Promise.reject(
        new AxiosError(message, response.statusText, response.config, response.request, response)
      );
    }

    return Promise.resolve(response);
  }

  // 错误拦截: 处理错误
  private handleError(error: AxiosError) {
    this.loading!.close(error.config!.url!);
    if (axios.isCancel(error)) return error;
    const { status, message } = error as AxiosError;
    const _message = status === 200 ? message : RESPONSE_STATUS_MESSAGE_MAP[status!];
    Notification.error(_message || RESPONSE_STATUS_MESSAGE_MAP.other);
    return error;
  }

  createAbort(): [string, () => void] {
    const abortKey = AbortRequest.key;
    const abort = () => AbortRequest.abort(abortKey);
    return [abortKey, abort];
  }

  async request<T = any>(requestConfig: RequestConfig) {
    const { method = 'GET' } = requestConfig;

    try {
      const response = await CacheRequest.useCache(requestConfig, () =>
        this.instance.request<ResponseData<T>>({ ...requestConfig, method })
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  get<T = any>(requestConfig: RequestConfig) {
    return this.request<T>({ method: 'GET', ...requestConfig });
  }

  post<T = any>(requestConfig: RequestConfig) {
    return this.request<T>({ method: 'POST', ...requestConfig });
  }

  put<T = any>(requestConfig: RequestConfig) {
    return this.request<T>({ method: 'PUT', ...requestConfig });
  }

  patch<T = any>(requestConfig: RequestConfig) {
    return this.request<T>({ method: 'PATCH', ...requestConfig });
  }

  delete<T = any>(requestConfig: RequestConfig) {
    return this.request<T>({ method: 'DELETE', ...requestConfig });
  }
}

export default Request;
