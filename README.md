# 基于 axios 的 http 请求工具

基于 axios 实现一个 http 请求工具，支持设置请求缓存和取消 http 请求等功能

**完整的工具代码已经上传到 [github 仓库](https://github.com/eno-Zeng/Request.git)，可以直接上去 github 下载， 或直接下载绑定资源**

## 首先实现一个 简单的 http 请求工具

```ts
import axios, {
  AxiosError,
  AxiosInterceptorManager,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

// 接口返回的数据格式
interface ResponseData<T = any> {
  code: number;
  data: T;
  message: string;
}

// 发起请求的参数
interface RequestConfig extends AxiosRequestConfig {
  url: string;
}

class Request {
  private instance = axios.create({
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
    withCredentials: true,
  });

  constructor() {
    // 设置请求拦截
    const request = this.instance.interceptors.request as AxiosInterceptorManager<RequestConfig>;
    request.use(config => this.handleRequest(config));

    // 设置响应拦截
    const { response } = this.instance.interceptors;
    response.use(config => this.handleResponse(config));
  }

  // 请求拦截
  private handleRequest(config: RequestConfig): RequestConfig {
    // TODO: 请求前拦截处理 loading, url 或请求头等
    return config;
  }

  // 响应拦截
  private handleResponse(response: AxiosResponse<Blob>): AxiosResponse {
    // TODO: 响应后拦截处理 loading, 状态码或数据等
    return response;
  }

  // 错误拦截: 处理错误
  private handleError(error: AxiosError) {
    // TODO: 请求出错时的处理
    return Promise.reject(error);
  }

  async request<T = any>(requestConfig: RequestConfig) {
    const { method = 'GET', ...config } = requestConfig;
    try {
      const response = await this.instance.request<ResponseData<T>>({ ...config, method });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error; // 将异常重新抛出去，不要吃掉异常
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
```

封装 Request 类，将 axios 示例缓存在 instance 中，在 Request 类构造函数中设置拦截器。封装 request 函数作为发起请求的函数， 接收泛型表示接口返回的 data 字段的数据类型。增加 get、post、patch 等别名函数，代替传入 method。

**示例**
```ts
interface ResData {
  name: string;
  age: number;
}

const request = new Request()
const result = await request.get<ResData>({
  url: '/user-info',
  params: {
    id: '12138',
  },
});
```


## 增加拦截器的处理

在拦截器中同意处理一些东西，比如在请求拦截中发起全局 loading，在响应拦截中处理数据等等

### loading

```ts
import axios, {
  AxiosError,
  AxiosInterceptorManager,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

// 接口返回的数据格式
interface ResponseData<T = any> {
  code: number;
  data: T;
  message: string;
}

// 发起请求的参数
interface RequestConfig extends AxiosRequestConfig {
  url: string;
  // 请求时是否需要发起 loaing，默认为 true
  loading?： boolean；
}

class Request {
  ...
  constructor() {
    // 设置请求拦截
    const request = this.instance.interceptors.request as AxiosInterceptorManager<RequestConfig>;
    request.use(config => this.handleRequestLoading(config));
    request.use(config => this.handleRequest(config));

    // 设置响应拦截
    const { response } = this.instance.interceptors;
    response.use(config => this.handleResponseLoading(config));
    response.use(config => this.handleResponse(config));
  }

  // 请求拦截: 处理 loading
  private handleRequestLoading(config: RequestConfig): RequestConfig {
    const { loading = true, url } = config;
    if (loading) openLoading(); // openLoading 是开启全局 Loading 的方法
    return config;
  }

  // 响应拦截: 处理 loading
  private handleResponseLoading(response: AxiosResponse<Blob>): AxiosResponse {
    const {
      config: { url, loading },
    } = response;
    closeLoading(); // closeLoading 是关闭全局 Loading 的方法
    return response;
  }

  // 请求拦截
  private handleRequest(config: RequestConfig): RequestConfig {
    // TODO: 请求前拦截处理 loading, url 或请求头等
    return config;
  }

  // 响应拦截
  private handleResponse(response: AxiosResponse<Blob>): AxiosResponse {
    // TODO: 响应后拦截处理 loading, 状态码或数据等
    return response;
  }

  // 错误拦截: 处理错误
  private handleError(error: AxiosError) {
    // TODO: 请求出错时的处理
    return Promise.reject(error);
  }
  ...
}

export default Request;

```

上面的代码分别在请求拦截和响应拦截中获取 requestConfig 中的 loading 字段的值，如果 loading 的值为 true，则开启/关闭全局的 loading。

**但是这样做有一个缺陷，全局 loading 一般都是单例的，如果同时有两个需要 loading 的请求发起，那么当一个请求完成时会关闭 loading，此时另一个请求还未完成，这样就不符合实际需求了**

我们可以设计一个 Loading 类来管理 loading 状态
```ts
class Loading {
  private loadingApiList: string[] = [];
   
  open(key: string) {
    if (this.loadingApiList.length === 0) openLoading();
    this.loadingApiList.push(key);
  }

  close(key: string) {
    const index = this.loadingApiList.indexOf(key);
    if (index > -1) this.loadingApiList.splice(index, 1);
    if (this.loadingApiList.length === 0) closeLoading();
  }
}
```

 - Loaing 类使用了 loadingApiList 将正在进行且需要 loading 的请求的 url 缓存起来。 
 - 每次请求需要 loading  时，调用 Loading 类的 open 函数，open 函数会判断当前是否有还在 Loading 的请求，如果没有则调起 loading，将请求的 url 存入 loadingApiList
 - 当请求结束时调用 Loading 类的 close   函数，close 函数会将该请求的 url 从 loadingApiList 中删除，再判断当前是否还有请求需要   Loading，如果没有则关闭 loading

```ts
class Request {
  ...
  constructor(){
    ...
    this.loading = new Loagn();
  }
  
  // 请求拦截: 处理 loading
  private handleRequestLoading(config: RequestConfig): RequestConfig {
    const { loading = true, url } = config;
    if (loading) this.loading!.open(url);
    return config;
  }
  
  // 响应拦截: 处理 loading
  private handleResponseLoading(response: AxiosResponse<Blob>): AxiosResponse {
    const {
      config: { url },
    } = response;
    this.loading!.close(url!);
    return response;
  }
  ...
}
```

*注：使用 Class 类来处理 loading 是基于业务系统上的其他需要，或为了更优雅的应对其他复杂情况，并非一定要使用 Class 写法，用 hooks 或工具函数也可以*

### 处理 http 响应状态和业务响应状态

```ts
// http 状态码对应的 message
const RESPONSE_STATUS_MESSAGE_MAP: Record<number | 'other', string> = {
  400: '客户端请求的语法错误，服务器无法理解。',
  401: '请求未经授权。',
  403: '服务器是拒绝执行此请求。',
  404: '请求不存在。',
  405: '请求方法不被允许。',
  500: '服务器内部错误，无法完成请求。',
  501: '服务器不支持当前请求所需要的功能。',
  502: '作为网关或代理工作的服务器尝试执行请求时，从上游服务器接收到无效的响应。',
  503: '由于临时的服务器维护或者过载，服务器当前无法处理请求。',
  504: '作为网关或者代理服务器尝试执行请求时，没有从上游服务器收到及时的响应。',
  other: '未知错误, 请稍后尝试',
};

class Request {
  ...
  constructor(){
    ...
    const { response } = this.instance.interceptors;
    response.use(config => this.handleResponseLoading(config));
    response.use(
      config => this.handleResponseStatus(config),
      error => this.handleError(error)
    );
  }
  
  // 请求拦截: http 响应状态和业务响应状态
  private handleResponseStatus(response: AxiosResponse<ResponseData>): Promise<AxiosResponse> {
    const { status, data } = response;
    if (status !== 200) {
      const statusMessage = RESPONSE_STATUS_MESSAGE_MAP[status] || '服务器错误, 请稍后尝试';
      return Promise.reject(new AxiosError('', response.statusText, response.config, response.request, response));
    }
    // 业务状态码根据自身系统接口规范处理
    const { code } = data || {};
    if (code === 401) {
      // 401 一般为未登录或 token 过期处理，这里一般处理为退出登录和 refresh
      return this.refresh(response); // refresh 函数会实现 token 刷新并重新请求，这里可以忽略
    }
    // 一般非 200 未错误状态，显示提示消息
    if (code !== 200) {
      const { message } = data;
      // 将接口的 message 传递给 AxiosError
      return Promise.reject(new AxiosError(message, response.statusText, response.config, response.request, response));
    }

    return Promise.resolve(response);
  }
  
  // 错误拦截: 处理错误，处理通知消息
  private handleError(error: AxiosError) {
    this.loading.close(error.config!.url!);
    // 判断请求是否被取消，若果被取消不需要处理通知消息
    if (axios.isCancel(error)) return error;
    const { status, message } = error as AxiosError;
    // 如果是 http 错误，使用状态码匹配错误信息，否则使用接口返回的 mesage
    const _message = status === 200 ? message : RESPONSE_STATUS_MESSAGE_MAP[status!];
    sendMessage(_message || RESPONSE_STATUS_MESSAGE_MAP.other); // 发送错误信息的 message
    return error;
  }
  ...
}
```

## 实现取消请求功能 -- abort

axios 的取消功能我们使用 AbortController, 具体使用方式可以查看 [axios 文档](https://axios-http.com/zh/docs/cancellation)

**使用示例**
```ts
interface ResData {
  name: string;
  age: number;
}

const request = new Request();
const abortController = new AbortController();

const sendRequest = async () => {
  const result = await request.get<ResData>({
    url: '/user-info',
    signal: abortController.signal,
    params: {
      id: '12138',
    },
  });
}

const abortRequest = () => {
  abortController.abort();
}
```

实例化一个 AbortController 类对象，该对象包好了 signal 属性和 abort 方法，只要将 signal 传入 axios 请求参数的 signale 字段中，调用 abort 方法是便可取消该请求。

这种做法虽然简单，看起来并不需要做任何封装，但是有一个问题：**每一个 AbortController 对象只能使用一次**；
这就意味着如果你多次调用 sendRequest 和 abortRequest，第二次开始 abortRequest 将不在生效，所以你必须每次请求时都生成一个 AbortController 对象，例如这样：

```ts
interface ResData {
  name: string;
  age: number;
}

const request = new Request();
const abortController: AbortController;

const sendRequest = async () => {
  abortController = new AbortController();
  const result = await request.get<ResData>({
    url: '/user-info',
    signal: abortController.signal,
    params: {
      id: '12138',
    },
  });
}

const abortRequest = () => {
  abortController.abort();
}
```

这样每次 sendRequest 都生成新的 AbortController，这样每次请求都是用新的 signal 便能保证每次都能生效。

不过这样每次的写法既不好用，也不优雅。并且如果在调用 sendRequest 之后，并且还未调用 abortRequest 情况下再次调用 sendRequest 的话，会替换 abortController 导致上一次的 abortController 丢失从而无法 abort

**解决思路**
如果我们每次给相同的请求函数配置一个固定的 abortKey，然后使用 abortKey 生成并缓存 AbortController 对象，并在请求结束或请求取消之后删除 AbortController。如果请求未结束或请求未取消时又发起相同的请求，则使用上一次缓存的 AbortController 对象。这样解决了每次请求都要重新生产 AbortController 对象的问题，有解决了 AbortController 对象被覆盖的问题

**AbortRequest**: 用于生产 abortKey 和对 AbortController 对象进行管理
```ts
import { nanoid } from 'nanoid';

interface AbortControllerRecordItem {
  count: number;
  controller: AbortController;
}

export default class AbortRequest {
  private static abortControllerRecord: Record<string, AbortControllerRecordItem> = {};

  static get key() {
    return nanoid(); // 使用 nanoid 生成唯一的 key
  }

  static getItem(key: string) {
    return this.abortControllerRecord[key]?.controller;
  }

  static setItem(key: string) {
    const abortControllerItem = this.abortControllerRecord[key];
    // 使用 count 记录当前有多上个请求在使用这个 AbortController 对象， 只有使用数量为 0 是才清楚
    this.abortControllerRecord[key] = {
      count: (abortControllerItem?.count || 0) + 1,
      controller: abortControllerItem?.controller || new AbortController(),
    };
  }

  static removeItem(key: string) {
    const abortControllerItem = this.abortControllerRecord[key];
    if (!abortControllerItem) return;
    // 删除是只减少当前对象的使用数量，避免前面的请求已经完成而影响后续请求的 abort
    abortControllerItem.count -= 1;
    if (abortControllerItem.count <= 0) delete this.abortControllerRecord[key];
  }

  static abort(key: string) {
    const abortController = this.getItem(key);
    abortController?.abort();
    // 如果进行了 abort 那么 AbortController 对象已经失效，直接清除即可
    delete this.abortControllerRecord[key];
  }
}

```

**将 abort 逻辑加入到 Request 类的拦截器中**
```ts
// 给 RequestConfig 增加一个 abortKey 的选项
interface RequestConfig extends AxiosRequestConfig {
  ...
  abortKey?: string;
}
class Request {
  ...
  // 请求拦截: 处理 abortKey
  private handleRequestAbortKey(config: RequestConfig): RequestConfig {
    const { abortKey } = config;
    if (abortKey) {
      AbortRequest.setItem(abortKey);
      config.signal = AbortRequest.getItem(abortKey).signal;
    }
    return config;
  }
  // 响应拦截: 处理 abortKey
  private handleResponseAbortKey(response: AxiosResponse<Blob>): AxiosResponse {
    const { abortKey } = response.config as RequestConfig;
    if (abortKey) AbortRequest.removeItem(abortKey);
    return response;
  }
}
```

再请求拦截中给带有 abortKey 的请求添加 signal 属性值，并在响应拦截中删除 AbortRequest 对象


**使用示例**
```ts
interface ResData {
  name: string;
  age: number;
}

const request = new Request();
const abortKey = AbortRequest.key;

const sendRequest = async () => {
  abortController = new AbortController();
  const result = await request.get<ResData>({
    url: '/user-info',
    abortKey: abortKey,
    params: {
      id: '12138',
    },
  });
}

const abortRequest = () => {
  AbortRequest.abort(abortKey);
}
```

只要获取 AbortRequest 中的 key 和 abort，分别请求是传入 abortkey 和在需要取消是调用 abort 即可完成 http 请求 abort 功能。
我们也可以在 Request 中增加一个工具函数用于生成 abortKey 和 abort 方法

```ts
class Request {
  ...
  createAbort(): [string, () => void] {
    const abortKey = AbortRequest.key;
    const abort = () => AbortRequest.abort(abortKey);
    return [abortKey, abort];
  }
  ...
}
```

这样使用时便可更加简单一点

**使用示例**
```ts
interface ResData {
  name: string;
  age: number;
}

const request = new Request();
const [abortKey, abortRequest] = request.createAbort();

const sendRequest = async () => {
  const result = await request.get<ResData>({
    url: '/user-info',
    abortKey,
    params: {
      id: '12138',
    },
  });
}
```

以上就是整个 Request 工具 abort 逻辑的实现思路和代码

## 实现 http 缓存功能 -- cache

一个请求在 method、url、params 或 data 相同的情况下，短时间内可以不需要再重新想后端服务发起请求，可以设置一个缓存时间，然后条件相同的请求在短时间内不再想服务器请求数据。

**实现思路**
若请求需要缓存，在第一次发起请求时，将请求的 Promise 对象缓存起来，以请求的 method，url，params 和 data 作为缓存的 key，当相同的请求再次发起时，直接返回第一次请求时缓存的 Promise，从而实现缓存效果

**CacheRequest**

```ts
// 给 RequestConfig 增加一个缓存的字段 cache
interface RequestConfig extends AxiosRequestConfig {
  ...
  /**
   * 请求缓存时间(单位毫秒), 默认为 false 不缓存
   */
  cache?: false | number;
}

// 缓存使用的 key 的字段
type RequestCacheRecordKeyOptions = Pick<RequestConfig, 'method' | 'url' | 'params' | 'data'>;

class CacheRequest {
  static requestCacheRecord: Record<string, Promise<AxiosResponse<ResponseData, any>>> = {};

  // 将包含 method，url，params 和 data 的对象直接转换成 JSON 字符串作为 key
  static createKey(options: RequestCacheRecordKeyOptions) {
    return JSON.stringify(options);
  }

  static getItem(key: string) {
    return this.requestCacheRecord[key];
  }
  // 将 promise 缓存并在设定的时长后将其删除
  static setItem(key: string, requestPromise: Promise<any>, removeTimeout: number) {
    this.requestCacheRecord[key] = requestPromise;
    setTimeout(() => {
      this.removeItem(key);
    }, removeTimeout);
  }

  static removeItem(key: RequestCacheRecordKey) {
    delete this.requestCacheRecord[key];
  }
}
```

在 Request 类的 request 函数中将缓存逻辑添加上去

```ts
class Request {
  ...
  async request<T = any>(requestConfig: RequestConfig) {
    const { method = 'GET', url, params, data, cache = false, ...config } = requestConfig;
    // 判断是否是需要缓存的请求，如果是，首先获取是否已有缓存
    if (cache) {
      const cacheKey = CacheRequest.createKey({ method, service, url, params, data });
      const requestPromise: Promise<AxiosResponse<ResponseData<T>>> | undefined = CacheRequest.getItem(cacheKey);
      // 若已经有缓存，则直接返回缓存的 Promise 对象
      if (requestPromise) return requestPromise;
    }
    
    try {
      const requestPromise = this.instance.request<ResponseData<T>>({ ...config, method });
      // 判断是否需要缓存，如果需要先将 requestPromise 缓存起来
      if (cache) {
        const cacheKey = CacheRequest.createKey({ method, service, url, params, data });
        CacheRequest.setItem(cacheKey, requestPromise, cache as Number);
      }
      const response = await requestPromise;
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      // 若请求出现错误并且该请求的使用了缓存， 那么该请求的缓存将不可用，将缓存删除
      if (cache) CacheRequest.removeItem(CacheRequest.create({ method, service, url, params, data }));
      throw error; // 将异常重新抛出去，不要吃掉异常
    }
  }
  ...
}
```

**使用示例**
```ts
interface ResData {
  name: string;
  age: number;
}

const request = new Request();

const sendRequest = async () => {
  const result = await request.get<ResData>({
    url: '/user-info',
    cache: 1e3 * 60 * 5, // 缓存 5 分钟
    params: {
      id: '12138',
    },
  });
  return result;
}
// 发起两次请求，但是只会向服务器发送一次请求，第二次将使用第一次缓存的内容
const sendCacheRequest = async () => {
  const result = await sendRequest();
  const cacheResult = await sendRequest();
}
```

**优化**

上面 Request 类种的 request 方法在加入了缓存的逻辑之后，不止变得复杂，而且代码的阅读性连贯性都不是很好。

可以将针对 cache 的逻辑都封装到 CacheRequest 中，新增一个 useCache 方法来处理

```ts
class CacheRequest {
  ...
  static useCache<T>(
    options: RequestConfig,
    requestFunc: () => Promise<AxiosResponse<ResponseData<T>>>
  ): Promise<AxiosResponse<ResponseData<T>>> {
    const { method = 'GET', service, url, params, data, cache } = options;
    
	// 如果不需要缓存，直接放回 requestFunc 的执行结果
    if (!cache) return requestFunc();

    const key = this.createKey({ method, service, url, params, data });
    // 若已存在缓存知己诶返回缓存内容
    const cachePromise: Promise<AxiosResponse<ResponseData<T>>> = this.getItem(key);
    if (cachePromise) return cachePromise;
    
    // 执行 requestFunc 获取 requestPromise 并缓存，然后将 requestPromise 返回
    const requestPromise = requestFunc();
    this.setItem(key, requestPromise, cache as number);
    // 如果请求错误，直接将缓存删除
    requestPromise.catch(() => {
      this.removeItem(key);
    });
    return requestPromise;
  }
}
```

useCache 方法接收一个两个参数：
- options: 请求的参数配置，requestCOnfig，用于判断是否需要缓存以及生成缓存的 key
- requestFunc：请求函数，需要返回一个请求的 Promise 对象

Request 类的 request 函数将不在需要处理 cache 的逻辑

```ts
class Request {
  ...
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
  ...
}
```

可以看到优化过后的 request 方法要比原来的简单了很多


---

*以上便是整个 Request 的实现逻辑和思路*

*PS：对于全程使用了 class 写法纯属个人风格和对负责业务需要的兼容，当然完全可以使用 hooks 或工具函数方式完成*


