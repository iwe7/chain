> 浏览器端 indexed db 封装成更简洁易操作的接口, 数据库变化监控!

### 技术栈

- rxjs 强大的异步管理库

### demo

```ts
import { openIdb, IDbInstall } from "imeepos/idb";
async function bootstrap() {
  let update: IDbInstall = {
    [`0-1`]: {
      create: [
        {
          name: "member",
          autoIncrement: true,
          keyPath: "id",
          index: [
            {
              name: "openid",
              keyPath: "openid",
              unique: true
            }
          ]
        }
      ]
    }
  };
  let db = await IDB.open("imeepos", 1, update, true).toPromise();
  let obs = db
    .readonly("member")
    .count(true)
    .pipe(distinctUntilChanged())
    .subscribe(res => console.log(res));
  let id = 1;
  setInterval(() => {
    db.readwrite("member")
      .add({
        openid: `fromUser${++id}`
      })
      .subscribe();
  }, 1000);
}
bootstrap();
```

### docs

#### IDB.open

```ts
export class IDB {
  static open(
    name: string = "imeepos",
    version: number = 1,
    install?: IDbInstall,
    listen?: boolean
  ): Observable<IDB>;
}
```

#### IDbInstall

```ts
// 改变数据库的操作
export type IDBChange = "add" | "delete" | "clear" | "put";
// 新建
interface IdbCreate extends IDBObjectStoreParameters {
  name: string;
  index: IdbIndex[];
}
// 索引
interface IdbIndex extends IDBIndexParameters {
  name: string;
  keyPath: string | string[];
}
export interface IDbInstall {
  [key: string]: {
    // 增
    create?: IdbCreate[];
    // 改
    update?: {
      [key: string]: {
        create: IdbIndex[];
        delete: string[];
      };
    };
    // 删
    delete?: string[];
  };
}
```

#### OpenIdbResult

```ts
// IDB.open返回结果
export class IDB {
  constructor(public db: IDBDatabase, public name: string);
  change(tableName: string, type: IDBChange): void;
  addListener(tableName, it: any): void;
  removeListener(tableName: string, item: any): void;
  transaction(
    storeNames: string | string[],
    mode?: IDBTransactionMode
  ): IDBTransaction;
  readonly(name: string): IDBReadonly;
  index(name: string): IDBIndexed;
  readwrite(name: string): IDBReadWrite;
}
```

#### IDBReadonly

```ts
export interface IDBReadonly {
  count(key?: IDBValidKey | IDBKeyRange): Observable<number>;
  get(query: IDBValidKey | IDBKeyRange): Observable<any | undefined>;
  getAllKeys(
    query?: IDBValidKey | IDBKeyRange,
    count?: number
  ): Observable<IDBValidKey[]>;
  getKey(query: IDBValidKey | IDBKeyRange): Observable<IDBValidKey | undefined>;
  openCursor(
    range?: IDBValidKey | IDBKeyRange,
    direction?: IDBCursorDirection
  ): Observable<IDBCursorWithValue | null>;
  openKeyCursor(
    query?: IDBValidKey | IDBKeyRange,
    direction?: IDBCursorDirection
  ): Observable<IDBCursor | null>;
}
```

#### IDBReadWrite

```ts
export interface IDBReadWrite extends IDBReadonly {
  add(value: any, key?: IDBValidKey | IDBKeyRange): Observable<IDBValidKey>;
  delete(key: IDBValidKey | IDBKeyRange): Observable<undefined>;
  clear(): Observable<undefined>;
  put(value: any, key?: IDBValidKey | IDBKeyRange): Observable<IDBValidKey>;
}
```

### IDBIndexed

```ts
export class IDBIndexed extends IDBReadonly {}
```
