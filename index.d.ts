import { S3Client, StorageClass, ServerSideEncryption } from '@aws-sdk/client-s3';
import { S3 } from 'aws-sdk';

declare type ACL =
  | 'private'
  | 'public-read'
  | 'public-read-write'
  | 'aws-exec-read'
  | 'authenticated-read'
  | 'bucket-owner-read'
  | 'bucket-owner-full-control'
  | 'log-delivery-write';

declare type ContentDisposition =
  | 'inline'
  | 'attachment'
  | 'form-data'
  | 'signal'
  | 'alert'
  | 'icon'
  | 'render'
  | 'recipient-list-history'
  | 'session'
  | 'aib'
  | 'early-session'
  | 'recipient-list'
  | 'notification'
  | 'by-reference'
  | 'info-package'
  | 'recording-session';

declare interface MulterOptions {
  s3: S3Client | S3;
  bucket: string;
  key(req: any, file: any, cb: (...args: any) => any): void;
  metadata?(req: any, file: any, cb: (...args: any) => any): void;
  acl?: ACL;
  cacheControl?: string;
  contentType?: typeof autoContentType | typeof defaultContentType;
  storageClass?: StorageClass;
  contentDisposition?: ContentDisposition;
  serverSideEncryption?: ServerSideEncryption;
  contentEncoding?: string;
}

declare function _exports(opts: MulterOptions): S3Storage;
declare namespace _exports {
  export { autoContentType as AUTO_CONTENT_TYPE };
  export { defaultContentType as DEFAULT_CONTENT_TYPE };
}
export = _exports;
declare function S3Storage(opts: any): void;
declare class S3Storage {
  constructor(opts: any);
  s3: any;
  getBucket: any;
  getKey: any;
  getAcl: any;
  getContentType: any;
  getMetadata: any;
  getCacheControl: any;
  getContentDisposition: any;
  getContentEncoding: any;
  getStorageClass: any;
  getSSE: any;
  getSSEKMS: any;
  _handleFile(req: any, file: any, cb: any): void;
  _removeFile(req: any, file: any, cb: any): void;
}
declare function autoContentType(req: any, file: any, cb: (...args: any) => any): void;
declare function defaultContentType(req: any, file: any, cb: (...args: any) => any): void;
