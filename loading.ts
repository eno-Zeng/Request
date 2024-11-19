import useAppStore from '@/store/app';

export default class Loading {
  private loadingApiList: string[] = [];

  private _loading: () => void;

  private _closeLoading: () => void;

  constructor() {
    const { loading, closeLoading } = useAppStore();
    this._loading = loading;
    this._closeLoading = closeLoading;
  }

  open(key: string) {
    if (this.loadingApiList.length === 0) this._loading();
    this.loadingApiList.push(key);
  }

  close(key: string) {
    const index = this.loadingApiList.indexOf(key);
    if (index > -1) this.loadingApiList.splice(index, 1);
    if (this.loadingApiList.length === 0) this._closeLoading();
  }
}
