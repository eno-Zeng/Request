export const RESPONSE_STATUS_MESSAGE_MAP: Record<number | 'other', string> = {
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
