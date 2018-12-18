export type IDBChange = "add" | "delete" | "clear" | "put";
interface IdbCreate extends IDBObjectStoreParameters {
  name: string;
  index: IdbIndex[];
  data?: any[];
}
interface IdbIndex extends IDBIndexParameters {
  name: string;
  keyPath: string | string[];
}
export interface IDbInstall {
  [key: string]: {
    create?: IdbCreate[];
    update?: {
      [key: string]: {
        create: IdbIndex[];
        delete: string[];
        data?: any[];
      };
    };
    delete?: string[];
  };
}
