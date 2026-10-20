export type PageSize = 'a4' | 'letter' | 'legal' | 'a3' | 'a5' | 'fit';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type FitMode = 'contain' | 'cover' | 'stretch';

export interface ImageItem {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
}

export interface PdfConversionSettings {
  pageSize: PageSize;
  orientation: PageOrientation;
  margin: number; // in mm (0, 5, 10, 15, 20)
  fitMode: FitMode;
  backgroundColor: string; // '#FFFFFF', '#090D14', etc.
  imageQuality: number; // 0.5 to 1.0
  addPageNumbers: boolean;
  pageNumberPosition: 'bottom-center' | 'bottom-right';
  headerTitle: string;
  footerText: string;
  compressOutput: boolean;
}

export interface AnnotationItem {
  id: string;
  pageIndex: number; // 0-based
  type: 'text' | 'signature' | 'stamp' | 'watermark' | 'highlight' | 'redact';
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number; // percentage or fixed
  height: number;
  text?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  imageDataUrl?: string;
  rotation?: number;
  borderWidth?: number;
}

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  color: string;
  opacity: number; // 0.05 to 0.5
  fontSize: number;
  rotation: number; // e.g. -45
  applyToAllPages: boolean;
}

export interface CloudDocumentVersion {
  version: number;
  timestamp: number;
  note: string;
  sizeBytes: number;
}

export interface CloudDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
  sizeBytes: number;
  tags: string[];
  cloudSyncStatus: 'synced' | 'syncing' | 'local-cached';
  thumbnailUrl?: string;
  pdfDataUrl: string; // Base64 data URL for instant viewing and offline storage
  versions: CloudDocumentVersion[];
  isStarred?: boolean;
}

export interface StudioStorageStats {
  usedBytes: number;
  totalBytes: number; // e.g. 5GB = 5368709120 bytes
  documentCount: number;
  lastSyncedAt: number;
  cloudHealth: 'healthy' | 'syncing' | 'offline';
}

export type HistoryActionType =
  | 'convert_image_pdf'
  | 'edit_pdf'
  | 'sign_document'
  | 'merge_pdf'
  | 'cloud_sync'
  | 'download'
  | 'export_share';

export interface HistoryRecord {
  id: string;
  title: string;
  actionType: HistoryActionType;
  timestamp: number;
  pageCount: number;
  sizeBytes: number;
  details: string;
  status: 'Completed' | 'Cloud Synced' | 'Exported';
  thumbnailUrl?: string;
  pdfDataUrl?: string;
}
