import { nanoid } from 'nanoid';

interface AbortControllerRecordItem {
  count: number;
  controller: AbortController;
}

export default class AbortRequest {
  private static abortControllerRecord: Record<string, AbortControllerRecordItem> = {};

  static get key() {
    return nanoid();
  }

  static getItem(key: string) {
    return this.abortControllerRecord[key]?.controller;
  }

  static setItem(key: string) {
    const abortControllerItem = this.abortControllerRecord[key];
    this.abortControllerRecord[key] = {
      count: (abortControllerItem?.count || 0) + 1,
      controller: abortControllerItem?.controller || new AbortController(),
    };
  }

  static removeItem(key: string) {
    const abortControllerItem = this.abortControllerRecord[key];
    if (!abortControllerItem) return;
    abortControllerItem.count -= 1;
    if (abortControllerItem.count <= 0) delete this.abortControllerRecord[key];
  }

  static abort(key: string) {
    const abortController = this.getItem(key);
    abortController?.abort();
    delete this.abortControllerRecord[key];
  }
}
