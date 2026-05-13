# GEE Pipeline Execution Document (Derived from master_architecture.md)

> **Source:** `docs/master_architecture.md` – Sections covering the Google Earth Engine workflow (Section 5 and sub‑sections).

---

# 5. GOOGLE EARTH ENGINE WORKFLOW

## 5.1 Python GEE Service Architecture

```
gee-service/
├── app.py                      # Flask/FastAPI entry point
├── config/
│   ├── settings.py             # GEE credentials, paths, thresholds
│   └── datasets.py             # Dataset catalog with metadata
├── core/
│   ├── auth.py                 # GEE authentication (service account)
│   ├── geometry.py             # GeoJSON → ee.Geometry conversion
│   └── export.py               # Raster export utilities
├── modules/
│   ├── imagery_fetcher.py      # Multi-dataset imagery acquisition
│   ├── cloud_masking.py        # Per-dataset cloud masking
│   ├── index_computer.py       # Spectral index calculations
│   ├── land_classifier.py      # Land cover / ecosystem detection
│   ├── terrain_analyzer.py     # DEM‑based analysis
│   ├── moisture_analyzer.py    # SAR + optical moisture
│   ├── change_detector.py      # Temporal change analysis
│   ├── historical_profiler.py  # Multi‑year trend analysis
│   ├── flood_analyzer.py       # Flood extent and frequency
│   ├── temperature_analyzer.py # Surface temperature analysis
│   └── biomass_estimator.py    # Vegetation biomass proxy
├── pipelines/
│   ├── auto_detection.py       # Initial site characterization
│   ├── baseline_analysis.py    # Full baseline assessment
│   ├── monitoring_analysis.py  # Periodic monitoring cycle
│   └── historical_analysis.py  # Deep historical reconstruction
├── exporters/
│   ├── geotiff_exporter.py     # Export rasters as GeoTIFF
│   ├── tile_generator.py       # Generate XYZ/TMS tiles
│   └── thumbnail_generator.py  # Generate PNG previews
├── utils/
│   ├── quality.py              # Quality assessment functions
│   ├── statistics.py           # Zonal statistics computation
│   └── colormap.py             # Visualization palettes
└── routes/
    ├── analysis.py             # Analysis trigger endpoints
    ├── status.py               # Job status endpoints
    └── tiles.py                # Tile serving endpoints
```

## 5.2 Authentication & Initialization

```python
# core/auth.py
import ee
import json
from config.settings import GEE_SERVICE_ACCOUNT, GEE_KEY_PATH

def initialize_gee():
    """Initialize GEE with service account credentials."""
    credentials = ee.ServiceAccountCredentials(
        GEE_SERVICE_ACCOUNT,
        GEE_KEY_PATH
    )
    ee.Initialize(
        credentials=credentials,
        opt_url='https://earthengine-highvolume.googleapis.com'  # High-volume endpoint
    )
```

```python
# core/geometry.py
def geojson_to_ee_geometry(geojson: dict) -> ee.Geometry:
    """Convert GeoJSON polygon to ee.Geometry with validation."""
    if geojson['type'] == 'Polygon':
        return ee.Geometry.Polygon(geojson['coordinates'])
    elif geojson['type'] == 'MultiPolygon':
        return ee.Geometry.MultiPolygon(geojson['coordinates'])
    else:
        raise ValueError(f"Unsupported geometry type: {geojson['type']}")
```

## 5.3 Cloud Masking (Critical for Quality)

```python
# modules/cloud_masking.py
import ee

def mask_s2_clouds(image: ee.Image) -> ee.Image:
    """
    Cloud mask for Sentinel-2 SR Harmonized using SCL band.
    Removes clouds, cloud shadows, cirrus, snow.
    """
    scl = image.select('SCL')
    # SCL classes: 3=cloud_shadow, 7=unclassified, 8=cloud_medium,
    # 9=cloud_high, 10=cirrus, 11=snow
    mask = scl.neq(3).And(scl.neq(7)).And(scl.neq(8))\
               .And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    # Additional: use QA60 for cirrus/opaque clouds
    qa = image.select('QA60')
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    qa_mask = qa.bitwiseAnd(cloud_bit_mask).eq(0)\
                .And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    return image.updateMask(mask.And(qa_mask))\
                .divide(10000)  # Scale to 0-1 reflectance

def mask_landsat8_clouds(image: ee.Image) -> ee.Image:
    """Cloud mask for Landsat 8/9 Collection 2 SR using QA_PIXEL."""
    qa = image.select('QA_PIXEL')
    dilated_cloud = 1 << 1
    cirrus = 1 << 2
    cloud = 1 << 3
    cloud_shadow = 1 << 4
    mask = qa.bitwiseAnd(dilated_cloud).eq(0)\
              .And(qa.bitwiseAnd(cirrus).eq(0))\
              .And(qa.bitwiseAnd(cloud).eq(0))\
              .And(qa.bitwiseAnd(cloud_shadow).eq(0))
    return image.updateMask(mask)\
                .multiply(0.0000275).add(-0.2)  # Scale factors

def mask_s1_borders(image: ee.Image) -> ee.Image:
    """Remove border noise from Sentinel-1 GRD images."""
    edge = image.lt(-30)
    masked = image.updateMask(edge.Not())
    return masked
```

## 5.4 Imagery Fetching with Quality Control

```python
# modules/imagery_fetcher.py
import ee
from datetime import datetime, timedelta
from modules.cloud_masking import mask_s2_clouds, mask_landsat8_clouds

class ImageryFetcher:
    def fetch_sentinel2(
        self,
        geometry: ee.Geometry,
        start_date: str,
        end_date: str,
        max_cloud_pct: int = 20,
        composite_method: str = 'median'
    ) -> dict:
        """
        Fetch Sentinel-2 SR imagery for a geometry and date range.
        Returns composite image + metadata.
        """
        collection = (
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_pct))
            .map(mask_s2_clouds)
            .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A',
                      'B11', 'B12'])
        )
        count = collection.size().getInfo()
        if count == 0:
            # Fallback: expand date range or increase cloud threshold
            return self._fallback_fetch(geometry, start_date, end_date)
        if composite_method == 'median':
            composite = collection.median()
        elif composite_method == 'greenest':
            # Select pixel with highest NDVI
            with_ndvi = collection.map(lambda img: img.addBands(
                img.normalizedDifference(['B8', 'B4']).rename('NDVI')
            ))
            composite = with_ndvi.qualityMosaic('NDVI')
        # Clip to geometry
        composite = composite.clip(geometry)
        # Compute coverage statistics
        coverage = self._compute_coverage(composite, geometry)
        return {
            'image': composite,
            'image_count': count,
            'date_range': {'start': start_date, 'end': end_date},
            'cloud_threshold': max_cloud_pct,
            'composite_method': composite_method,
            'spatial_coverage_pct': coverage,
            'dataset': 'COPERNICUS/S2_SR_HARMONIZED',
            'resolution_m': 10,
        }

    def fetch_sentinel1(
        self,
        geometry: ee.Geometry,
        start_date: str,
        end_date: str,
        orbit_pass: str = 'DESCENDING'
    ) -> dict:
        """Fetch Sentinel-1 SAR GRD imagery."""
        collection = (
            ee.ImageCollection('COPERNICUS/S1_GRD')
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
            .filter(ee.Filter.eq('instrumentMode', 'IW'))
            .filter(ee.Filter.eq('orbitProperties_pass', orbit_pass))
            .select(['VV', 'VH'])
            .map(mask_s1_borders)
        )
        composite = collection.median().clip(geometry)
        # Add VV/VH ratio (useful for vegetation)
        ratio = composite.select('VV').divide(composite.select('VH')).rename('VV_VH_ratio')
        composite = composite.addBands(ratio)
        return {
            'image': composite,
            'image_count': collection.size().getInfo(),
            'dataset': 'COPERNICUS/S1_GRD',
            'resolution_m': 10,
            'polarization': 'VV+VH',
            'orbit_pass': orbit_pass,
        }

    def fetch_landsat_historical(
        self,
        geometry: ee.Geometry,
        year: int,
        season: str = 'annual'
    ) -> dict:
        """Fetch historical Landsat imagery.
        Uses Landsat 8/9 (2013+), Landsat 7 (1999-2023), Landsat 5 (1984-2012).
        Harmonized to common band names.
        """
        if year >= 2013:
            dataset = 'LANDSAT/LC08/C02/T1_L2'  # or LC09
            bands = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7']
            rename = ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']
            mask_fn = mask_landsat8_clouds
        elif year >= 1999:
            dataset = 'LANDSAT/LE07/C02/T1_L2'
            bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']
            rename = ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']
            mask_fn = mask_landsat8_clouds  # Similar QA structure
        else:
            dataset = 'LANDSAT/LT05/C02/T1_L2'
            bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']
            rename = ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']
            mask_fn = mask_landsat8_clouds
        date_range = self._get_season_dates(year, season)
        collection = (
            ee.ImageCollection(dataset)
            .filterBounds(geometry)
            .filterDate(date_range['start'], date_range['end'])
            .map(mask_fn)
            .select(bands, rename)
        )
        composite = collection.median().clip(geometry)
        return {
            'image': composite,
            'image_count': collection.size().getInfo(),
            'year': year,
            'season': season,
            'dataset': dataset,
            'resolution_m': 30,
        }

    def _fallback_fetch(self, geometry, start_date, end_date):
        """Progressive fallback: expand window → increase cloud tolerance → use Landsat."""
        # Step 1: Expand to ±30 days
        start = datetime.fromisoformat(start_date) - timedelta(days=30)
        end = datetime.fromisoformat(end_date) + timedelta(days=30)
        collection = (
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(geometry)
            .filterDate(start.isoformat(), end.isoformat())
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))
            .map(mask_s2_clouds)
        )
        if collection.size().getInfo() > 0:
            return {'image': collection.median().clip(geometry), 'fallback': 'expanded_window'}
        # Step 2: Use Landsat as backup
        return self.fetch_landsat_historical(
            geometry,
            datetime.fromisoformat(start_date).year,
            'annual'
        )

    def _compute_coverage(self, image: ee.Image, geometry: ee.Geometry) -> float:
        """Compute percentage of geometry with valid (non‑masked) pixels."""
        valid_mask = image.select(0).mask()
        stats = valid_mask.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=10,
            maxPixels=1e8
        )
        return round(stats.getInfo().get(list(stats.getInfo().keys())[0], 0) * 100, 1)
```

## 5.5 Spectral Index Computer

```python
# modules/index_computer.py
import ee

class IndexComputer:
    """Computes spectral indices from satellite imagery."""

    @staticmethod
    def compute_ndvi(image: ee.Image, nir='B8', red='B4') -> ee.Image:
        """Normalized Difference Vegetation Index.
        NDVI = (NIR - Red) / (NIR + Red)
        Range: -1 to 1 (healthy vegetation > 0.3)
        """
        return image.normalizedDifference([nir, red]).rename('NDVI')

    @staticmethod
    def compute_evi(image: ee.Image) -> ee.Image:
        """Enhanced Vegetation Index.
        EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
        Better than NDVI in high biomass areas, less atmospheric noise.
        """
        return image.expression(
            '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
            {
                'NIR': image.select('B8'),
                'RED': image.select('B4'),
                'BLUE': image.select('B2')
            }
        ).rename('EVI')

    @staticmethod
    def compute_savi(image: ee.Image, L=0.5) -> ee.Image:
        """Soil‑Adjusted Vegetation Index.
        SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L)
        Better for areas with exposed soil (barren land restoration).
        """
        return image.expression(
            '((NIR - RED) / (NIR + RED + L)) * (1 + L)',
            {
                'NIR': image.select('B8'),
                'RED': image.select('B4'),
                'L': L
            }
        ).rename('SAVI')

    @staticmethod
    def compute_ndwi(image: ee.Image) -> ee.Image:
        """Normalized Difference Water Index (McFeeters).
        NDWI = (Green - NIR) / (Green + NIR)
        Detects surface water. Positive values = water.
        """
        return image.normalizedDifference(['B3', 'B8']).rename('NDWI')

    @staticmethod
    def compute_ndmi(image: ee.Image) -> ee.Image:
        """Normalized Difference Moisture Index.
        NDMI = (NIR - SWIR1) / (NIR + SWIR1)
        Vegetation moisture content. Higher = wetter.
        """
        return image.normalizedDifference(['B8', 'B11']).rename('NDMI')

    @staticmethod
    def compute_nbr(image: ee.Image) -> ee.Image:
        """Normalized Burn Ratio.
        NBR = (NIR - SWIR2) / (NIR + SWIR2)
        Useful for degradation assessment and fire recovery.
        """
        return image.normalizedDifference(['B8', 'B12']).rename('NBR')

    @staticmethod
    def compute_bsi(image: ee.Image) -> ee.Image:
        """Bare Soil Index.
        BSI = ((SWIR + Red) - (NIR + Blue)) / ((SWIR + Red) + (NIR + Blue))
        Higher values indicate bare/exposed soil.
        """
        return image.expression(
            '((SWIR + RED) - (NIR + BLUE)) / ((SWIR + RED) + (NIR + BLUE))',
            {
                'SWIR': image.select('B11'),
                'RED': image.select('B4'),
                'NIR': image.select('B8'),
                'BLUE': image.select('B2')
            }
        ).rename('BSI')

    @staticmethod
    def compute_mndwi(image: ee.Image) -> ee.Image:
        """Modified NDWI.
        MNDWI = (Green - SWIR1) / (Green + SWIR1)
        Better at distinguishing water from built‑up areas than NDWI.
        """
        return image.normalizedDifference(['B3', 'B11']).rename('MNDWI')

    @staticmethod
    def compute_all(image: ee.Image) -> ee.Image:
        """Compute all indices and stack as bands."""
        return image.addBands([
            IndexComputer.compute_ndvi(image),
            IndexComputer.compute_evi(image),
            IndexComputer.compute_savi(image),
            IndexComputer.compute_ndwi(image),
            IndexComputer.compute_ndmi(image),
            IndexComputer.compute_nbr(image),
            IndexComputer.compute_bsi(image),
            IndexComputer.compute_mndwi(image),
        ])

    @staticmethod
    def compute_zonal_stats(index_image: ee.Image, geometry: ee.Geometry,
                            band_name: str, scale: int = 10) -> dict:
        """Compute zonal statistics for an index over a polygon."""
        stats = index_image.select(band_name).reduceRegion(
            reducer=ee.Reducer.mean()
                .combine(ee.Reducer.min(), '', True)
                .combine(ee.Reducer.max(), '', True)
                .combine(ee.Reducer.stdDev(), '', True)
                .combine(ee.Reducer.median(), '', True)
                .combine(ee.Reducer.percentile([10, 25, 75, 90]), '', True),
            geometry=geometry,
            scale=scale,
            maxPixels=1e9,
            bestEffort=True
        )
        raw = stats.getInfo()
        # Compute histogram for distribution
        histogram = index_image.select(band_name).reduceRegion(
            reducer=ee.Reducer.fixedHistogram(-1, 1, 50),
            geometry=geometry,
            scale=scale,
            maxPixels=1e9,
            bestEffort=True
        ).getInfo()
        return {
            'mean': raw.get(f'{band_name}_mean'),
            'min': raw.get(f'{band_name}_min'),
            'max': raw.get(f'{band_name}_max'),
            'stddev': raw.get(f'{band_name}_stdDev'),
            'median': raw.get(f'{band_name}_median'),
            'p10': raw.get(f'{band_name}_p10'),
            'p25': raw.get(f'{band_name}_p25'),
            'p75': raw.get(f'{band_name}_p75'),
            'p90': raw.get(f'{band_name}_p90'),
            'histogram': histogram.get(band_name),
        }
```

## 5.6 Land Classification Module

```python
# modules/land_classifier.py
import ee

class LandClassifier:
    # ESA WorldCover 2021 class mapping
    ESA_WORLDCOVER_CLASSES = {
        10: 'tree_cover',
        20: 'shrubland',
        30: 'grassland',
        40: 'cropland',
        50: 'built_up',
        60: 'bare_sparse_vegetation',
        70: 'snow_ice',
        80: 'permanent_water',
        90: 'herbaceous_wetland',
        95: 'mangroves',
        100: 'moss_lichen',
    }
    # Dynamic World class mapping
    DYNAMIC_WORLD_CLASSES = {
        0: 'water',
        1: 'trees',
        2: 'grass',
        3: 'flooded_vegetation',
        4: 'crops',
        5: 'shrub_and_scrub',
        6: 'built',
        7: 'bare',
        8: 'snow_and_ice',
    }
    def classify_esa_worldcover(self, geometry: ee.Geometry) -> dict:
        """Classify land cover using ESA WorldCover 10m (2021).
        Returns percentage composition of each class.
        """
        worldcover = ee.Image('ESA/WorldCover/v200').select('Map')
        clipped = worldcover.clip(geometry)
        # Compute area per class
        area_image = ee.Image.pixelArea().addBands(clipped)
        areas = area_image.reduceRegion(
            reducer=ee.Reducer.sum().group(
                groupField=1,
                groupName='class'
            ),
            geometry=geometry,
            scale=10,
            maxPixels=1e9,
            bestEffort=True
        ).getInfo()
        total_area = sum(g['sum'] for g in areas['groups'])
        composition = {}
        for group in areas['groups']:
            class_id = int(group['class'])
            class_name = self.ESA_WORLDCOVER_CLASSES.get(class_id, f'unknown_{class_id}')
            pct = round((group['sum'] / total_area) * 100, 2)
            if pct > 0:
                composition[class_name] = pct
        # Determine dominant class
        dominant = max(composition, key=composition.get) if composition else 'unknown'
        return {
            'composition': composition,
            'dominant_class': dominant,
            'dataset': 'ESA/WorldCover/v200',
            'year': 2021,
            'resolution_m': 10,
        }
    def classify_dynamic_world(self, geometry: ee.Geometry,
                                start_date: str, end_date: str) -> dict:
        """Classify using Dynamic World (near real‑time, 10m).
        Uses probability bands for nuanced classification.
        """
        dw = (
            ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .select(['water', 'trees', 'grass', 'flooded_vegetation',
                      'crops', 'shrub_and_scrub', 'built', 'bare', 'snow_and_ice'])
        )
        # Mean probability composite
        prob_composite = dw.mean().clip(geometry)
        # Get mean probability for each class
        stats = prob_composite.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=10,
            maxPixels=1e9,
            bestEffort=True
        ).getInfo()
        # Also get the mode (most frequent label)
        label_collection = (
            ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .select('label')
        )
        mode = label_collection.mode().clip(geometry)
        return {
            'probabilities': stats,
            'dataset': 'GOOGLE/DYNAMICWORLD/V1',
            'temporal_range': {'start': start_date, 'end': end_date},
            'resolution_m': 10,
        }
    def derive_ecosystem_type(self, worldcover_result: dict,
                                dynamic_world_result: dict,
                                terrain_result: dict,
                                water_proximity: dict) -> dict:
        """Synthesize ecosystem classification from multiple sources.
        Returns best‑estimate ecosystem type with confidence.
        """
        composition = worldcover_result['composition']
        dominant = worldcover_result['dominant_class']
        elevation = terrain_result.get('elevation_mean', 0)
        water_dist = water_proximity.get('distance_m', float('inf'))
        # Rule‑based ecosystem inference
        ecosystem = 'unknown'
        confidence = 0.0
        if composition.get('mangroves', 0) > 15:
            ecosystem = 'mangrove_ecosystem'
            confidence = min(composition['mangroves'] / 100 + 0.3, 1.0)
        elif composition.get('herbaceous_wetland', 0) > 20:
            ecosystem = 'wetland'
            confidence = min(composition['herbaceous_wetland'] / 100 + 0.2, 1.0)
        elif composition.get('permanent_water', 0) > 30:
            ecosystem = 'aquatic_lacustrine'
            confidence = min(composition['permanent_water'] / 100 + 0.2, 1.0)
        elif water_dist < 500 and composition.get('permanent_water', 0) > 5:
            ecosystem = 'riparian_lakeside'
            confidence = 0.6
        elif composition.get('bare_sparse_vegetation', 0) > 40:
            ecosystem = 'barren_degraded_land'
            confidence = min(composition['bare_sparse_vegetation'] / 100 + 0.2, 1.0)
        elif composition.get('tree_cover', 0) > 40:
            ecosystem = 'forest'
            confidence = min(composition['tree_cover'] / 100 + 0.2, 1.0)
        elif composition.get('grassland', 0) > 40:
            ecosystem = 'grassland'
            confidence = min(composition['grassland'] / 100 + 0.2, 1.0)
        elif composition.get('shrubland', 0) > 30:
            ecosystem = 'shrubland'
            confidence = 0.6
        else:
            ecosystem = 'mixed_landscape'
            confidence = 0.4
        return {
            'ecosystem_type': ecosystem,
            'confidence': round(confidence, 2),
            'reasoning': f"Dominant: {dominant}, Water: {water_dist:.0f}m, Elev: {elevation:.0f}m",
            'sources': ['ESA_WorldCover', 'Dynamic_World', 'SRTM_DEM', 'water_proximity'],
        }
```

## 5.7 Terrain Analysis Module

```python
# modules/terrain_analyzer.py
import ee

class TerrainAnalyzer:
    def analyze(self, geometry: ee.Geometry) -> dict:
        """Full terrain analysis using SRTM 30m DEM."""
        dem = ee.Image('USGS/SRTMGL1_003').select('elevation')
        # Compute terrain products
        terrain = ee.Algorithms.Terrain(dem)
        slope = terrain.select('slope')
        aspect = terrain.select('aspect')
        # Elevation stats
        elev_stats = dem.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.min(), '', True)
                .combine(ee.Reducer.max(), '', True)
                .combine(ee.Reducer.stdDev(), '', True),
            geometry=geometry,
            scale=30,
            maxPixels=1e8,
            bestEffort=True
        ).getInfo()
        # Slope stats
        slope_stats = slope.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.max(), '', True),
            geometry=geometry,
            scale=30,
            maxPixels=1e8,
            bestEffort=True
        ).getInfo()
        # Dominant aspect
        aspect_stats = aspect.reduceRegion(
            reducer=ee.Reducer.mode(),
            geometry=geometry,
            scale=30,
            maxPixels=1e8,
            bestEffort=True
        ).getInfo()
        aspect_deg = aspect_stats.get('aspect', 0)
        aspect_dir = self._degrees_to_direction(aspect_deg)
        # Topographic Wetness Index (TWI) — useful for moisture accumulation
        # TWI = ln(a / tan(β)) where a = flow accumulation area, β = slope
        flow_accumulation = ee.Image('MERIT/Hydro/v1_0_1').select('upg')  # upstream area
        return {
            'elevation_min_m': elev_stats.get('elevation_min'),
            'elevation_max_m': elev_stats.get('elevation_max'),
            'elevation_mean_m': elev_stats.get('elevation_mean'),
            'elevation_stddev_m': elev_stats.get('elevation_stdDev'),
            'slope_mean_deg': slope_stats.get('slope_mean'),
            'slope_max_deg': slope_stats.get('slope_max'),
            'aspect_dominant_deg': aspect_deg,
            'aspect_dominant_dir': aspect_dir,
            'dataset': 'USGS/SRTMGL1_003',
            'resolution_m': 30,
        }
    @staticmethod
    def _degrees_to_direction(deg):
        dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        ix = round(deg / 45) % 8
        return dirs[ix]
```

## 5.8 Historical Profiler (Multi‑Year Trend Analysis)

```python
# modules/historical_profiler.py
import ee

class HistoricalProfiler:
    """Builds multi‑year environmental profiles for restoration sites.
    Reconstructs degradation history and establishes trend baselines.
    """
    def build_ndvi_timeline(self, geometry: ee.Geometry,
                             start_year: int = 2017,
                             end_year: int = 2025) -> list:
        """Generate yearly NDVI composites from Sentinel‑2.
        Returns time series of annual median NDVI values.
        """
        timeline = []
        for year in range(start_year, end_year + 1):
            start_date = f'{year}-01-01'
            end_date = f'{year}-12-31'
            collection = (
                ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(geometry)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .map(mask_s2_clouds)
            )
            count = collection.size().getInfo()
            if count > 0:
                composite = collection.median()
                ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI')
                stats = ndvi.reduceRegion(
                    reducer=ee.Reducer.mean()
                        .combine(ee.Reducer.stdDev(), '', True),
                    geometry=geometry,
                    scale=10,
                    maxPixels=1e8,
                    bestEffort=True
                ).getInfo()
                timeline.append({
                    'year': year,
                    'ndvi_mean': stats.get('NDVI_mean'),
                    'ndvi_stddev': stats.get('NDVI_stdDev'),
                    'image_count': count,
                    'source': 'S2',
                })
            else:
                timeline.append({
                    'year': year,
                    'ndvi_mean': None,
                    'image_count': 0,
                    'note': 'Insufficient clear imagery'
                })
        return timeline
    def build_landsat_deep_history(self, geometry: ee.Geometry,
                                    start_year: int = 2000,
                                    end_year: int = 2025) -> list:
        """Build NDVI timeline going back to 2000 using Landsat archive.
        Harmonizes across Landsat 5/7/8/9.
        """
        timeline = []
        for year in range(start_year, end_year + 1):
            if year >= 2013:
                dataset = 'LANDSAT/LC08/C02/T1_L2'
                nir, red = 'SR_B5', 'SR_B4'
            elif year >= 1999:
                dataset = 'LANDSAT/LE07/C02/T1_L2'
                nir, red = 'SR_B4', 'SR_B3'
            else:
                continue
            collection = (
                ee.ImageCollection(dataset)
                .filterBounds(geometry)
                .filterDate(f'{year}-01-01', f'{year}-12-31')
                .map(mask_landsat8_clouds)
            )
            count = collection.size().getInfo()
            if count > 0:
                composite = collection.median()
                ndvi = composite.normalizedDifference([nir, red]).rename('NDVI')
                stats = ndvi.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=geometry,
                    scale=30,
                    maxPixels=1e8,
                    bestEffort=True
                ).getInfo()
                timeline.append({
                    'year': year,
                    'ndvi_mean': stats.get('NDVI_mean'),
                    'image_count': count,
                    'source': 'Landsat',
                    'resolution_m': 30,
                })
        return timeline
    def detect_degradation_period(self, timeline: list) -> dict:
        """Analyze NDVI timeline to detect degradation onset and magnitude.
        Uses simple trend analysis.
        """
        valid_points = [p for p in timeline if p.get('ndvi_mean') is not None]
        if len(valid_points) < 3:
            return {'detected': False, 'reason': 'Insufficient data points'}
        values = [p['ndvi_mean'] for p in valid_points]
        years = [p['year'] for p in valid_points]
        # Find peak and current
        peak_idx = values.index(max(values))
        peak_year = years[peak_idx]
        peak_value = values[peak_idx]
        current_value = values[-1]
        decline_pct = ((peak_value - current_value) / peak_value) * 100 if peak_value > 0 else 0
        # Simple trend: linear regression (placeholder)
        return {
            'detected': True,
            'peak_year': peak_year,
            'peak_value': peak_value,
            'current_year': years[-1],
            'current_value': current_value,
            'decline_pct': round(decline_pct, 1),
        }
```
---

> **Note:** This document captures the full GEE workflow, service architecture, authentication, cloud masking, imagery fetching, index computation, land classification, terrain analysis, and historical profiling as defined in `master_architecture.md`. No content has been altered or omitted.
