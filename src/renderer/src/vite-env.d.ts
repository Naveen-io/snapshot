/// <reference types="vite/client" />

import type { SnapshotAPI } from '../../preload/index';

declare global {
  interface Window {
    snapshotAPI: SnapshotAPI;
  }
}
