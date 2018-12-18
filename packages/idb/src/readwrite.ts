import { Observable } from "rxjs";
import { IDBReadonly } from "./readonly";
import { IDB } from "./idb";

export class IDBReadWrite extends IDBReadonly {
  constructor(tableName: string, idb: IDB) {
    super(tableName, idb);
  }
  init() {
    this.model = "readwrite";
    this.translation = this.idb.transaction(this.tableName, "readwrite");
    this.store = this.translation.objectStore(this.tableName);
  }
  add(value: any, key?: IDBValidKey | IDBKeyRange): Observable<IDBValidKey> {
    return this.create(false, "add", value, key);
  }
  delete(key: IDBValidKey | IDBKeyRange): Observable<undefined> {
    return this.create(false, "delete", key);
  }
  clear(): Observable<undefined> {
    return this.create(false, "clear");
  }
  put(value: any, key?: IDBValidKey | IDBKeyRange): Observable<IDBValidKey> {
    return this.create(false, "put", value, key);
  }
}
