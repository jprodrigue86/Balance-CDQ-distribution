import {normalizeFloorMicroV2727} from './reader-floor-micro-v2727.mjs';
import {normalizeTablePhotoV2727} from './reader-table-photo-v2727.mjs';
import {normalizeTruckPhotoV2730} from './reader-truck-photo-v2730.mjs';
export const normalizeTruckDoorV2728=normalizeTruckPhotoV2730;
export async function normalizeReportCorrectionsV2728(pdf,L,options={}){return (await normalizeFloorMicroV2727(pdf,L,options))|(await normalizeTablePhotoV2727(pdf,L,options))|(await normalizeTruckDoorV2728(pdf,L,options));}
