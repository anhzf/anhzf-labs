import {getApp, getApps, initializeApp} from "firebase-admin/app";
import {getStorage} from "firebase-admin/storage";

export const admin = getApps().length ? getApp() : initializeApp();

export const storage = () => getStorage();
