import ee from '@google/earthengine';
import key from './gee-key.json.json' assert { type: 'json' };

export const initGEE = () => {
  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(key, () => {
      ee.initialize(null, null, () => {
        console.log("GEE initialized");
        resolve(true);
      }, reject);
    }, reject);
  });
};

/**
 * Build a merged Sentinel-2 + Landsat-8 NDVI collection.
 * Returns the clipped median image alongside the collection for tile generation.
 */
function buildNdviImage(region: any, startDate: string, endDate: string) {
  const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(region)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .select(['B8', 'B4'])
    .map((img: any) => img.normalizedDifference(['B8', 'B4']).rename('NDVI'));

  const l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(region)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUD_COVER', 30))
    .select(['SR_B5', 'SR_B4'])
    .map((img: any) => img.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI'));

  return ee.ImageCollection(s2.merge(l8)).median().clip(region);
}

const NDVI_VIS = {
  min: -0.1,
  max: 0.8,
  palette: ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850'],
};

/**
 * Compute median NDVI value + generate a GEE map tile URL.
 *
 * @param polygon   - Array of [lng, lat] coordinate pairs (closed ring)
 * @param startDate - ISO date string (inclusive), default '2023-01-01'
 * @param endDate   - ISO date string (exclusive), default '2023-07-01'
 */
export const getNDVI = async (
  polygon: any,
  startDate = '2023-01-01',
  endDate   = '2023-07-01'
): Promise<{ NDVI: number | null; cloudCoverPct: number | null; tileUrl: string | null }> => {
  const region = ee.Geometry.Polygon(polygon).simplify(100);
  const ndviImage = buildNdviImage(region, startDate, endDate);

  const params = {
    reducer: ee.Reducer.mean(),
    geometry: region,
    scale: 30,
    maxPixels: 1e9,
    bestEffort: true,
  };

  // Run NDVI value + tile map generation in parallel
  const [ndviValue, tileUrl] = await Promise.all([
    new Promise<number | null>((resolve, reject) => {
      ndviImage.reduceRegion(params).evaluate((data: any, err: any) => {
        if (err) reject(new Error(err));
        else {
          const v = typeof data?.NDVI === 'number' ? data.NDVI : null;
          console.log(`[GEE] NDVI=${v} for range ${startDate}→${endDate}`);
          resolve(v);
        }
      });
    }),
    new Promise<string | null>((resolve) => {
      try {
        ndviImage.getMap(NDVI_VIS, (mapObj: any, err: any) => {
          if (err || !mapObj) {
            console.warn('[GEE] Tile map generation failed:', err);
            resolve(null);
          } else {
            // GEE tile URL pattern
            const url = `https://earthengine.googleapis.com/v1alpha/${mapObj.mapid}/tiles/{z}/{x}/{y}`;
            console.log('[GEE] Tile URL generated');
            resolve(url);
          }
        });
      } catch (e) {
        console.warn('[GEE] getMap threw:', e);
        resolve(null);
      }
    }),
  ]);

  return { NDVI: ndviValue, cloudCoverPct: null, tileUrl };
};
