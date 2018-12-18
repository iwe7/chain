import { IDBReadonly } from "./readonly";
import { IDB } from "./idb";

export class IDBIndexed extends IDBReadonly {
  constructor(tableName: string, idb: IDB) {
    super(tableName, idb);
  }
  init() {
    this.model = "indexed";
    let [table, index] = this.tableName.split(".");
    this.translation = this.idb.transaction(table, "readonly");
    this.store = this.translation.objectStore(table).index(index) as any;
  }
}
