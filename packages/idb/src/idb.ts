import { Observable } from "rxjs";
import { IDBChange, IDbInstall } from "./types";
import { IDBReadonly } from "./readonly";
import { IDBReadWrite } from "./readwrite";
import { IDBIndexed } from "./indexed";
import { getGlobal } from "@imeepos/core";
type IDBTableName = string;
export class IDB {
  cache: Map<IDBTableName, Map<string, any>> = new Map();

  constructor(public db: IDBDatabase, public name: string) {}

  static open(
    name: string = "imeepos",
    version: number = 1,
    install?: IDbInstall
  ) {
    return new Observable<IDB>(obs => {
      function onupgradeneeded(event: IDBVersionChangeEvent) {
        let db: IDBDatabase = (event.target as any).result;
        let { newVersion, oldVersion } = event;
        // install
        if (install) {
          for (oldVersion; oldVersion < newVersion; oldVersion++) {
            let item = install[`${oldVersion}-${newVersion}`];
            if (item.create) {
              item.create.forEach(store => {
                let { name, index, data, ...opt } = store;
                if (!db.objectStoreNames.contains(name)) {
                  let objectStore = db.createObjectStore(name, opt);
                  index.forEach(idx => {
                    let { name, keyPath, ...opt } = idx;
                    objectStore.createIndex(name, keyPath, opt);
                  });
                  // data
                  data.map(da => {
                    objectStore.add(da);
                  });
                }
              });
            }
            if (item.delete) {
              item.delete.forEach(store => {
                db.deleteObjectStore(store);
              });
            }
            if (item.update) {
              let keys = Object.keys(item.update);
              let transaction: IDBTransaction = db.transaction(
                keys,
                "versionchange"
              );
              if (keys.length > 0) {
                keys.map((key, index) => {
                  let store: IDBObjectStore = transaction.objectStore(key);
                  let data = item.update[key];
                  data.create.map(idx => {
                    let { name, keyPath, ...opt } = idx;
                    store.createIndex(name, keyPath, opt);
                  });
                  data.delete.map(name => {
                    store.deleteIndex(name);
                  });
                });
                transaction.onerror = function() {
                  obs.error(new Error(`更新失败`));
                };
              }
            }
          }
        }
      }
      // indexedDB
      let indexedDB = getGlobal<IDBFactory>("indexedDB");
      let openDBRequest: IDBOpenDBRequest = indexedDB.open(name, version);
      openDBRequest.onerror = function() {
        obs.error(new Error(`打开数据库错误`));
      };
      openDBRequest.onupgradeneeded = onupgradeneeded;
      openDBRequest.onblocked = function() {
        console.log("onblocked");
      };
      openDBRequest.onsuccess = function() {
        let idb = new IDB(openDBRequest.result, name);
        obs.next(idb);
        obs.complete();
      };
    });
  }

  change(tableName: string, type: IDBChange) {
    let set = this.cache.get(tableName);
    set.forEach((it: any) => {
      it.run();
    });
  }

  addListener(tableName, it: any) {
    let set = this.cache.get(tableName);
    set.set(it.getKey(), it);
    this.cache.set(tableName, set);
  }
  removeListener(tableName: string, item: any) {
    let set = this.cache.get(tableName);
    set.delete(item.getKey());
    this.cache.set(tableName, set);
  }

  transaction(
    storeNames: string | string[],
    mode?: IDBTransactionMode
  ): IDBTransaction {
    return this.db.transaction(storeNames, mode);
  }

  readonly(name: string): IDBReadonly {
    if (!this.cache.has(name)) {
      this.cache.set(name, new Map());
    }
    return new IDBReadonly(name, this);
  }
  index(name: string): IDBIndexed {
    let table = name.split(".")[0];
    if (!this.cache.has(table)) {
      this.cache.set(table, new Map());
    }
    return new IDBIndexed(name, this);
  }
  readwrite(name: string): IDBReadWrite {
    if (!this.cache.has(name)) {
      this.cache.set(name, new Map());
    }
    return new IDBReadWrite(name, this);
  }
}
