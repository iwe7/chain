import {
  Subscriber,
  Observable,
  Subject,
  Subscription,
  PartialObserver
} from "rxjs";
import { IDBChange } from "./types";
import { IDB } from "./idb";
type IDBMethod =
  | "count"
  | "get"
  | "getAll"
  | "getAllKeys"
  | "getKey"
  | "openCursor"
  | "openKeyCursor"
  | "add"
  | "delete"
  | "clear"
  | "put";
export abstract class IDBBase extends Observable<any> {
  update: Subject<IDBChange> = new Subject();
  store: IDBObjectStore;
  translation: IDBTransaction;
  public listen: boolean;
  public subscriber?: BaseSubscriber;

  constructor(
    public tableName: string,
    public idb: IDB,
    public model?: "readonly" | "readwrite" | "indexed"
  ) {
    super();
    this.init();
  }

  abstract init(): any;

  method: IDBMethod;
  params: any[];
  create<T>(
    listen: boolean,
    method: IDBMethod,
    ...params: any[]
  ): Observable<T> {
    this.method = method;
    this.params = params;
    this.listen = listen;
    return this;
  }
  _subscribe(subscriber: Subscriber<any>): Subscription {
    this.subscriber =
      this.subscriber ||
      new BaseSubscriber(
        subscriber,
        this.translation,
        this.listen,
        this.idb,
        this.tableName,
        this.method,
        this.params,
        this.model
      );
    return this.subscriber;
  }
  setValue(value: any) {
    this.subscriber.setValue(value);
  }
  setError(err: any) {
    this.subscriber.error(err);
  }
}

export class BaseSubscriber<T = any> extends Subscriber<T> {
  value: any;
  constructor(
    destination: PartialObserver<T>,
    public translation: IDBTransaction,
    public listen: boolean,
    public idb: IDB,
    public tableName: string,
    public method: IDBMethod,
    public params: any[],
    public model: "readonly" | "readwrite" | "indexed"
  ) {
    super(destination);
    if (this.listen) {
      this.id = getSetIndex(this.params);
      this.addListener();
    }
    this.translation.oncomplete = () => {
      if (!this.listen) {
        this.addListener();
        this.complete();
      }
    };
    this.translation.onerror = (err: any) => {
      this.error(err.target.error);
    };
    this.run();
  }

  addListener() {
    if (
      this.method === "add" ||
      this.method === "clear" ||
      this.method === "put" ||
      this.method === "delete"
    ) {
      this.idb.change(this.tableName, this.method);
    } else {
      if (this.listen) {
        if (this.model === "indexed") {
          this.idb.addListener(this.tableName.split(".")[0], this);
        } else {
          this.idb.addListener(this.tableName, this);
        }
      }
    }
  }

  run() {
    let store: any;
    if (this.model === "indexed") {
      let [table, index] = this.tableName.split(".");
      store = this.idb
        .transaction(table, "readonly")
        .objectStore(table)
        .index(index);
    } else if (this.model === "readonly") {
      store = this.idb
        .transaction(this.tableName, "readonly")
        .objectStore(this.tableName);
    } else {
      store = this.idb
        .transaction(this.tableName, "readwrite")
        .objectStore(this.tableName);
    }
    let target = (store[this.method] as any)(...this.params);
    let that = this;
    target.onsuccess = () => {
      this.value = target.result;
      this.next(this.value);
    };
    target.onerror = function(res: any) {
      that.error(res.target.error);
    };
  }

  next(value: T) {
    this.destination.next(value);
  }

  setValue(value: T) {
    this.value = value;
  }

  unsubscribe() {
    if (this.listen) {
      this.idb.removeListener(this.tableName, this);
      paramsSet.delete(this.params);
    }
    super.unsubscribe();
  }
  id: number;
  getKey() {
    paramsSet.add(this.params);
    getSetIndex(this.params);
    return `${this.tableName}.${this.method}.${this.id}`;
  }
}

let paramsSet = new Set();
let id = 1;
function getSetIndex(params: any) {
  if (!paramsSet.has(params)) {
    paramsSet.add(params);
    return ++id;
  }
  return id;
}

export class IDBReadonly extends IDBBase {
  constructor(tableName: string, idb: IDB) {
    super(tableName, idb);
  }
  init() {
    this.model = "readonly";
    this.translation = this.idb.transaction(this.tableName, "readonly");
    this.store = this.translation.objectStore(this.tableName);
  }
  count(listen: boolean, key?: IDBValidKey | IDBKeyRange): Observable<number> {
    return this.create(listen, "count", key);
  }
  get(listen: boolean, query: IDBValidKey | IDBKeyRange): Observable<any> {
    return this.create(listen, "get", query);
  }
  getAll(
    listen: boolean,
    query?: IDBValidKey | IDBKeyRange,
    count?: number
  ): Observable<any[]> {
    return this.create(listen, "getAll", query, count);
  }
  getAllKeys(
    listen: boolean,
    query?: IDBValidKey | IDBKeyRange,
    count?: number
  ): Observable<IDBValidKey[]> {
    return this.create(listen, "getAllKeys", query, count);
  }
  getKey(
    listen: boolean,
    query: IDBValidKey | IDBKeyRange
  ): Observable<IDBValidKey | undefined> {
    return this.create(listen, "getKey", query);
  }
  openCursor(
    listen: boolean,
    range?: IDBValidKey | IDBKeyRange,
    direction?: IDBCursorDirection
  ): Observable<IDBCursorWithValue | null> {
    return this.create(listen, "openCursor", range, direction);
  }
  openKeyCursor(
    listen: boolean,
    query?: IDBValidKey | IDBKeyRange,
    direction?: IDBCursorDirection
  ): Observable<IDBCursor | null> {
    return this.create(listen, "openKeyCursor", query, direction);
  }
}
