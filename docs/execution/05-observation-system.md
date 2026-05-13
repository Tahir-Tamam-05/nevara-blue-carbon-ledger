\# 6\. OPEN SOURCE DATASETS ENCYCLOPEDIA

\# Continuing from Section 6: ENVIRONMENTAL ANALYSIS MODULES

\---

\#\# 6\. ENVIRONMENTAL ANALYSIS MODULES {\#6-analysis-modules}

\#\#\# 6.1 Module Architecture Overview

Each analysis module is a \*\*self-contained Python class\*\* within the MRV Engine that:  
\- Accepts a polygon geometry \+ date range  
\- Calls specific GEE datasets  
\- Returns structured JSON results \+ optional raster artifacts  
\- Logs provenance (dataset, algorithm, parameters, confidence)

\`\`\`  
gee-service/  
└── modules/  
    ├── ndvi\_module.py  
    ├── vegetation\_health\_module.py  
    ├── water\_moisture\_module.py  
    ├── flood\_analysis\_module.py  
    ├── historical\_degradation\_module.py  
    ├── vegetation\_recovery\_module.py  
    ├── erosion\_indicator\_module.py  
    ├── biomass\_estimation\_module.py  
    ├── restoration\_suitability\_module.py  
    ├── ecosystem\_trend\_module.py  
    ├── surface\_temperature\_module.py  
    └── base\_module.py  (abstract base with shared utilities)  
\`\`\`

\#\#\# 6.2 Base Module Contract

\`\`\`python  
\# modules/base\_module.py  
from abc import ABC, abstractmethod  
from dataclasses import dataclass, field  
from typing import Optional, Dict, List, Any  
import ee  
import time

@dataclass  
class AnalysisResult:  
    module\_name: str  
    indicators: Dict\[str, float\]  
    metadata: Dict\[str, Any\]  
    raster\_paths: Dict\[str, str\] \= field(default\_factory=dict)  
    thumbnail\_paths: Dict\[str, str\] \= field(default\_factory=dict)  
    quality\_score: float \= 1.0  
    interpretation: str \= ""  
    risk\_flags: List\[Dict\] \= field(default\_factory=list)  
    datasets\_used: List\[str\] \= field(default\_factory=list)  
    execution\_time\_ms: int \= 0  
    confidence: float \= 1.0

class BaseAnalysisModule(ABC):  
      
    def \_\_init\_\_(self, geometry: ee.Geometry, date\_start: str, date\_end: str,  
                 project\_id: str, export\_path: str):  
        self.geometry \= geometry  
        self.date\_start \= date\_start  
        self.date\_end \= date\_end  
        self.project\_id \= project\_id  
        self.export\_path \= export\_path  
      
    def execute(self) \-\> AnalysisResult:  
        start \= time.time()  
        result \= self.run\_analysis()  
        result.execution\_time\_ms \= int((time.time() \- start) \* 1000\)  
        return result  
      
    @abstractmethod  
    def run\_analysis(self) \-\> AnalysisResult:  
        pass  
      
    def \_zonal\_stats(self, image: ee.Image, band: str, scale: int \= 10\) \-\> dict:  
        """Standard zonal statistics over the polygon."""  
        stats \= image.select(band).reduceRegion(  
            reducer=ee.Reducer.mean()  
                .combine(ee.Reducer.min(), '', True)  
                .combine(ee.Reducer.max(), '', True)  
                .combine(ee.Reducer.stdDev(), '', True)  
                .combine(ee.Reducer.median(), '', True)  
                .combine(ee.Reducer.percentile(\[10, 90\]), '', True),  
            geometry=self.geometry,  
            scale=scale,  
            maxPixels=1e9,  
            bestEffort=True  
        ).getInfo()  
        return stats  
      
    def \_compute\_valid\_pixel\_percent(self, image: ee.Image, scale: int \= 10\) \-\> float:  
        mask \= image.select(0).mask()  
        coverage \= mask.reduceRegion(  
            reducer=ee.Reducer.mean(),  
            geometry=self.geometry,  
            scale=scale,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
        vals \= list(coverage.values())  
        return round((vals\[0\] if vals else 0\) \* 100, 1\)  
\`\`\`

\#\#\# 6.3 Module 1: NDVI Module

\`\`\`python  
\# modules/ndvi\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult  
from modules.cloud\_masking import mask\_s2\_clouds

class NDVIModule(BaseAnalysisModule):  
    """  
    NDVI \= (NIR \- Red) / (NIR \+ Red)  
    Range: \-1 to \+1  
    Healthy vegetation: \> 0.3  
    Sparse vegetation: 0.1 \- 0.3  
    Bare soil/water: \< 0.1  
      
    Uses: Sentinel-2 Band 8 (NIR, 10m) and Band 4 (Red, 10m)  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# Fetch cloud-masked Sentinel-2 composite  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(mask\_s2\_clouds)  
        )  
          
        image\_count \= s2.size().getInfo()  
        if image\_count \== 0:  
            return AnalysisResult(  
                module\_name='NDVI',  
                indicators={},  
                metadata={'error': 'No clear imagery available'},  
                quality\_score=0.0,  
                interpretation='Insufficient cloud-free imagery for this period.',  
                datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\]  
            )  
          
        composite \= s2.median().clip(self.geometry)  
          
        \# Compute NDVI  
        ndvi \= composite.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
          
        \# Zonal statistics  
        stats \= self.\_zonal\_stats(ndvi, 'NDVI', scale=10)  
          
        \# Coverage quality  
        valid\_pct \= self.\_compute\_valid\_pixel\_percent(ndvi, scale=10)  
          
        \# Classification histogram (what % is each NDVI class)  
        classification \= self.\_classify\_ndvi\_zones(ndvi)  
          
        \# Export raster tile for Leaflet  
        raster\_path \= self.\_export\_ndvi\_raster(ndvi)  
        thumbnail\_path \= self.\_export\_ndvi\_thumbnail(ndvi)  
          
        \# Interpret results  
        mean\_ndvi \= stats.get('NDVI\_mean', 0\)  
        interpretation \= self.\_interpret\_ndvi(mean\_ndvi, classification)  
        risk\_flags \= self.\_check\_ndvi\_risks(mean\_ndvi, classification)  
          
        return AnalysisResult(  
            module\_name='NDVI',  
            indicators={  
                'ndvi\_mean': round(stats.get('NDVI\_mean', 0), 4),  
                'ndvi\_min': round(stats.get('NDVI\_min', 0), 4),  
                'ndvi\_max': round(stats.get('NDVI\_max', 0), 4),  
                'ndvi\_std\_dev': round(stats.get('NDVI\_stdDev', 0), 4),  
                'ndvi\_median': round(stats.get('NDVI\_median', 0), 4),  
                'ndvi\_p10': round(stats.get('NDVI\_p10', 0), 4),  
                'ndvi\_p90': round(stats.get('NDVI\_p90', 0), 4),  
                'green\_cover\_percent': classification.get('healthy\_vegetation', 0),  
                'sparse\_cover\_percent': classification.get('sparse\_vegetation', 0),  
                'bare\_soil\_percent': classification.get('bare\_soil', 0),  
                'water\_percent': classification.get('water', 0),  
            },  
            metadata={  
                'image\_count': image\_count,  
                'cloud\_threshold': 25,  
                'composite\_method': 'median',  
                'resolution\_m': 10,  
                'valid\_pixel\_percent': valid\_pct,  
                'classification': classification,  
            },  
            raster\_paths={'ndvi\_heatmap': raster\_path},  
            thumbnail\_paths={'ndvi\_thumbnail': thumbnail\_path},  
            quality\_score=min(valid\_pct / 100.0, 1.0),  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\],  
            confidence=self.\_compute\_confidence(image\_count, valid\_pct),  
        )  
      
    def \_classify\_ndvi\_zones(self, ndvi: ee.Image) \-\> dict:  
        """Classify NDVI into ecological zones and compute area percentages."""  
        \# Water: \< 0  
        \# Bare soil: 0 \- 0.1  
        \# Sparse vegetation: 0.1 \- 0.3  
        \# Moderate vegetation: 0.3 \- 0.5  
        \# Healthy vegetation: \> 0.5  
          
        total\_area \= self.geometry.area()  
          
        water \= ndvi.lt(0).selfMask().multiply(ee.Image.pixelArea())  
        bare \= ndvi.gte(0).And(ndvi.lt(0.1)).selfMask().multiply(ee.Image.pixelArea())  
        sparse \= ndvi.gte(0.1).And(ndvi.lt(0.3)).selfMask().multiply(ee.Image.pixelArea())  
        moderate \= ndvi.gte(0.3).And(ndvi.lt(0.5)).selfMask().multiply(ee.Image.pixelArea())  
        healthy \= ndvi.gte(0.5).selfMask().multiply(ee.Image.pixelArea())  
          
        def get\_pct(zone\_image):  
            area \= zone\_image.reduceRegion(  
                reducer=ee.Reducer.sum(),  
                geometry=self.geometry,  
                scale=10,  
                maxPixels=1e8,  
                bestEffort=True  
            ).getInfo()  
            vals \= list(area.values())  
            zone\_area \= vals\[0\] if vals else 0  
            total \= total\_area.getInfo()  
            return round((zone\_area / total) \* 100, 1\) if total \> 0 else 0  
          
        return {  
            'water': get\_pct(water),  
            'bare\_soil': get\_pct(bare),  
            'sparse\_vegetation': get\_pct(sparse),  
            'moderate\_vegetation': get\_pct(moderate),  
            'healthy\_vegetation': get\_pct(healthy),  
        }  
      
    def \_interpret\_ndvi(self, mean\_ndvi: float, classification: dict) \-\> str:  
        if mean\_ndvi \> 0.5:  
            return f"Site shows healthy vegetation cover (mean NDVI: {mean\_ndvi:.3f}). {classification.get('healthy\_vegetation', 0)}% of the area has dense vegetation."  
        elif mean\_ndvi \> 0.3:  
            return f"Site shows moderate vegetation cover (mean NDVI: {mean\_ndvi:.3f}). Recovery indicators are present with {classification.get('moderate\_vegetation', 0)}% moderate and {classification.get('healthy\_vegetation', 0)}% healthy vegetation."  
        elif mean\_ndvi \> 0.1:  
            return f"Site shows sparse vegetation (mean NDVI: {mean\_ndvi:.3f}). {classification.get('bare\_soil', 0)}% bare soil detected. Active restoration efforts should focus on ground cover establishment."  
        else:  
            return f"Site is predominantly barren or water-covered (mean NDVI: {mean\_ndvi:.3f}). {classification.get('bare\_soil', 0)}% bare soil and {classification.get('water', 0)}% water detected."  
      
    def \_check\_ndvi\_risks(self, mean\_ndvi: float, classification: dict) \-\> list:  
        flags \= \[\]  
        if mean\_ndvi \< 0.1:  
            flags.append({  
                'type': 'LOW\_VEGETATION',  
                'severity': 'HIGH',  
                'description': 'Critically low vegetation cover detected'  
            })  
        if classification.get('bare\_soil', 0\) \> 60:  
            flags.append({  
                'type': 'HIGH\_BARE\_SOIL',  
                'severity': 'MODERATE',  
                'description': f"{classification\['bare\_soil'\]}% bare soil increases erosion risk"  
            })  
        return flags  
      
    def \_export\_ndvi\_raster(self, ndvi: ee.Image) \-\> str:  
        """Export NDVI as GeoTIFF for tile generation."""  
        url \= ndvi.getDownloadURL({  
            'scale': 10,  
            'crs': 'EPSG:4326',  
            'region': self.geometry,  
            'format': 'GEO\_TIFF',  
        })  
        filepath \= f"{self.export\_path}/{self.project\_id}/ndvi\_{self.date\_end}.tif"  
        \# Download logic with requests  
        return filepath  
      
    def \_export\_ndvi\_thumbnail(self, ndvi: ee.Image) \-\> str:  
        """Generate NDVI visualization thumbnail."""  
        vis\_params \= {  
            'min': \-0.2, 'max': 0.8,  
            'palette': \['\#d73027', '\#fc8d59', '\#fee08b', '\#d9ef8b', '\#91cf60', '\#1a9850'\],  
            'region': self.geometry,  
            'dimensions': '1024x1024',  
            'format': 'png'  
        }  
        url \= ndvi.getThumbURL(vis\_params)  
        filepath \= f"{self.export\_path}/{self.project\_id}/ndvi\_thumb\_{self.date\_end}.png"  
        \# Download and save  
        return filepath  
      
    def \_compute\_confidence(self, image\_count: int, valid\_pct: float) \-\> float:  
        img\_conf \= min(image\_count / 10, 1.0) \* 0.4  
        pix\_conf \= (valid\_pct / 100.0) \* 0.6  
        return round(img\_conf \+ pix\_conf, 2\)  
\`\`\`

\#\#\# 6.4 Module 2: Vegetation Health Module

\`\`\`python  
\# modules/vegetation\_health\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult  
from modules.cloud\_masking import mask\_s2\_clouds

class VegetationHealthModule(BaseAnalysisModule):  
    """  
    Multi-index vegetation health assessment combining:  
    \- NDVI (general greenness)  
    \- EVI (Enhanced Vegetation Index \- better in dense canopy)  
    \- SAVI (Soil Adjusted Vegetation Index \- better for sparse cover/barren land)  
    \- NDMI (Normalized Difference Moisture Index \- plant water stress)  
    \- LAI proxy (Leaf Area Index estimation)  
      
    Produces composite Vegetation Health Score (VHS): 0-100  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(mask\_s2\_clouds)  
        )  
          
        image\_count \= s2.size().getInfo()  
        if image\_count \== 0:  
            return self.\_empty\_result('No clear imagery')  
          
        composite \= s2.median().clip(self.geometry)  
          
        \# NDVI  
        ndvi \= composite.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
          
        \# EVI: Enhanced Vegetation Index  
        \# EVI \= 2.5 \* (NIR \- Red) / (NIR \+ 6\*Red \- 7.5\*Blue \+ 1\)  
        evi \= composite.expression(  
            '2.5 \* ((NIR \- RED) / (NIR \+ 6 \* RED \- 7.5 \* BLUE \+ 1))', {  
                'NIR': composite.select('B8'),  
                'RED': composite.select('B4'),  
                'BLUE': composite.select('B2')  
            }  
        ).rename('EVI')  
          
        \# SAVI: Soil Adjusted Vegetation Index (L \= 0.5)  
        \# SAVI \= ((NIR \- Red) / (NIR \+ Red \+ L)) \* (1 \+ L)  
        savi \= composite.expression(  
            '((NIR \- RED) / (NIR \+ RED \+ 0.5)) \* 1.5', {  
                'NIR': composite.select('B8'),  
                'RED': composite.select('B4')  
            }  
        ).rename('SAVI')  
          
        \# NDMI: Plant moisture stress  
        \# NDMI \= (NIR \- SWIR1) / (NIR \+ SWIR1)  
        ndmi \= composite.normalizedDifference(\['B8', 'B11'\]).rename('NDMI')  
          
        \# LAI Proxy using empirical relationship with EVI  
        \# LAI ≈ 3.618 \* EVI \- 0.118 (simplified empirical model)  
        lai \= evi.multiply(3.618).subtract(0.118).rename('LAI\_proxy')  
          
        \# Green Chlorophyll Index  
        \# GCI \= (NIR / Green) \- 1  
        gci \= composite.select('B8').divide(composite.select('B3')).subtract(1).rename('GCI')  
          
        \# Compute statistics for all  
        stacked \= ndvi.addBands(\[evi, savi, ndmi, lai, gci\])  
          
        ndvi\_stats \= self.\_zonal\_stats(stacked, 'NDVI')  
        evi\_stats \= self.\_zonal\_stats(stacked, 'EVI')  
        savi\_stats \= self.\_zonal\_stats(stacked, 'SAVI')  
        ndmi\_stats \= self.\_zonal\_stats(stacked, 'NDMI')  
        lai\_stats \= self.\_zonal\_stats(stacked, 'LAI\_proxy')  
        gci\_stats \= self.\_zonal\_stats(stacked, 'GCI')  
          
        \# Compute Vegetation Health Score (0-100)  
        vhs \= self.\_compute\_vhs(  
            ndvi\_mean=ndvi\_stats.get('NDVI\_mean', 0),  
            evi\_mean=evi\_stats.get('EVI\_mean', 0),  
            savi\_mean=savi\_stats.get('SAVI\_mean', 0),  
            ndmi\_mean=ndmi\_stats.get('NDMI\_mean', 0),  
        )  
          
        interpretation \= self.\_interpret\_health(vhs, ndvi\_stats, ndmi\_stats)  
        risk\_flags \= self.\_check\_health\_risks(vhs, ndmi\_stats)  
          
        return AnalysisResult(  
            module\_name='VEGETATION\_HEALTH',  
            indicators={  
                'ndvi\_mean': round(ndvi\_stats.get('NDVI\_mean', 0), 4),  
                'evi\_mean': round(evi\_stats.get('EVI\_mean', 0), 4),  
                'savi\_mean': round(savi\_stats.get('SAVI\_mean', 0), 4),  
                'ndmi\_mean': round(ndmi\_stats.get('NDMI\_mean', 0), 4),  
                'lai\_proxy\_mean': round(lai\_stats.get('LAI\_proxy\_mean', 0), 2),  
                'gci\_mean': round(gci\_stats.get('GCI\_mean', 0), 2),  
                'vegetation\_health\_score': vhs,  
            },  
            metadata={  
                'image\_count': image\_count,  
                'resolution\_m': 10,  
                'index\_descriptions': {  
                    'NDVI': 'General vegetation greenness (0-1)',  
                    'EVI': 'Enhanced index, better in dense canopy (-1 to 1)',  
                    'SAVI': 'Soil-adjusted, better for sparse areas (-1 to 1)',  
                    'NDMI': 'Plant water stress indicator (-1 to 1)',  
                    'LAI\_proxy': 'Estimated Leaf Area Index (m²/m²)',  
                    'GCI': 'Green Chlorophyll Index, photosynthetic capacity',  
                }  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\],  
            confidence=self.\_compute\_confidence(image\_count,   
                                                self.\_compute\_valid\_pixel\_percent(ndvi)),  
        )  
      
    def \_compute\_vhs(self, ndvi\_mean, evi\_mean, savi\_mean, ndmi\_mean) \-\> float:  
        """  
        Composite Vegetation Health Score (0-100).  
        Weighted blend of normalized indices.  
        """  
        \# Normalize each index to 0-100 range  
        ndvi\_score \= max(0, min(100, ((ndvi\_mean \+ 0.2) / 1.0) \* 100))  
        evi\_score \= max(0, min(100, ((evi\_mean \+ 0.2) / 0.8) \* 100))  
        savi\_score \= max(0, min(100, ((savi\_mean \+ 0.2) / 0.9) \* 100))  
        ndmi\_score \= max(0, min(100, ((ndmi\_mean \+ 0.5) / 1.0) \* 100))  
          
        \# Weighted average  
        vhs \= (ndvi\_score \* 0.35 \+ evi\_score \* 0.25 \+   
               savi\_score \* 0.20 \+ ndmi\_score \* 0.20)  
          
        return round(max(0, min(100, vhs)), 1\)  
      
    def \_interpret\_health(self, vhs, ndvi\_stats, ndmi\_stats) \-\> str:  
        if vhs \>= 70:  
            return f"Vegetation health is GOOD (VHS: {vhs}/100). Strong photosynthetic activity detected with adequate moisture levels."  
        elif vhs \>= 45:  
            return f"Vegetation health is MODERATE (VHS: {vhs}/100). Partial canopy recovery observed. NDMI suggests {'adequate' if ndmi\_stats.get('NDMI\_mean', 0\) \> 0 else 'stressed'} moisture conditions."  
        elif vhs \>= 20:  
            return f"Vegetation health is POOR (VHS: {vhs}/100). Sparse or stressed vegetation. {'Water stress detected.' if ndmi\_stats.get('NDMI\_mean', 0\) \< \-0.1 else 'Low vegetation density.'}"  
        else:  
            return f"Vegetation health is CRITICAL (VHS: {vhs}/100). Minimal vegetation present. Site requires active intervention."  
      
    def \_check\_health\_risks(self, vhs, ndmi\_stats) \-\> list:  
        flags \= \[\]  
        if vhs \< 20:  
            flags.append({'type': 'CRITICAL\_VEGETATION\_LOSS', 'severity': 'CRITICAL',  
                          'description': 'Vegetation health critically low'})  
        if ndmi\_stats.get('NDMI\_mean', 0\) \< \-0.2:  
            flags.append({'type': 'WATER\_STRESS', 'severity': 'HIGH',  
                          'description': 'Significant plant water stress detected'})  
        if vhs \< 45 and ndmi\_stats.get('NDMI\_mean', 0\) \< 0:  
            flags.append({'type': 'DEGRADATION\_RISK', 'severity': 'MODERATE',  
                          'description': 'Combined low vegetation and moisture stress indicates degradation risk'})  
        return flags  
      
    def \_empty\_result(self, reason):  
        return AnalysisResult(  
            module\_name='VEGETATION\_HEALTH',  
            indicators={}, metadata={'error': reason},  
            quality\_score=0.0, interpretation=f'Analysis unavailable: {reason}',  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\]  
        )  
\`\`\`

\#\#\# 6.5 Module 3: Water & Moisture Analysis Module

\`\`\`python  
\# modules/water\_moisture\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class WaterMoistureModule(BaseAnalysisModule):  
    """  
    Multi-sensor water and moisture analysis:  
      
    1\. NDWI (Optical) \- Surface water detection using Sentinel-2  
       NDWI \= (Green \- NIR) / (Green \+ NIR)  
      
    2\. MNDWI (Modified NDWI) \- Better water/built-up discrimination  
       MNDWI \= (Green \- SWIR) / (Green \+ SWIR)  
      
    3\. NDMI (Moisture Index) \- Vegetation moisture content  
       NDMI \= (NIR \- SWIR1) / (NIR \+ SWIR1)  
      
    4\. SAR Water Detection (Sentinel-1) \- All-weather water mapping  
       VV backscatter \< \-15 dB threshold for open water  
      
    5\. JRC Global Surface Water \- Historical water occurrence  
      
    Critical for: Lake restoration, wetland recovery  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        indicators \= {}  
        metadata \= {}  
        risk\_flags \= \[\]  
          
        \# \=== PART 1: Optical water indices (Sentinel-2) \===  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(self.\_mask\_s2\_clouds)  
            .median()  
            .clip(self.geometry)  
        )  
          
        ndwi \= s2.normalizedDifference(\['B3', 'B8'\]).rename('NDWI')  
        mndwi \= s2.normalizedDifference(\['B3', 'B11'\]).rename('MNDWI')  
        ndmi \= s2.normalizedDifference(\['B8', 'B11'\]).rename('NDMI')  
          
        ndwi\_stats \= self.\_zonal\_stats(ndwi, 'NDWI')  
        mndwi\_stats \= self.\_zonal\_stats(mndwi, 'MNDWI')  
        ndmi\_stats \= self.\_zonal\_stats(ndmi, 'NDMI')  
          
        \# Water area percentage (MNDWI \> 0 typically indicates water)  
        water\_mask \= mndwi.gt(0).selfMask()  
        water\_area \= water\_mask.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(),  
            geometry=self.geometry,  
            scale=10,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
        total\_area \= self.geometry.area().getInfo()  
        water\_pct \= (list(water\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        indicators.update({  
            'ndwi\_mean': round(ndwi\_stats.get('NDWI\_mean', 0), 4),  
            'mndwi\_mean': round(mndwi\_stats.get('MNDWI\_mean', 0), 4),  
            'ndmi\_mean': round(ndmi\_stats.get('NDMI\_mean', 0), 4),  
            'ndmi\_min': round(ndmi\_stats.get('NDMI\_min', 0), 4),  
            'surface\_water\_area\_percent': round(water\_pct, 2),  
        })  
          
        \# \=== PART 2: SAR-based water detection (Sentinel-1) \===  
        s1 \= (  
            ee.ImageCollection('COPERNICUS/S1\_GRD')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))  
            .filter(ee.Filter.eq('instrumentMode', 'IW'))  
            .select(\['VV', 'VH'\])  
            .median()  
            .clip(self.geometry)  
        )  
          
        vv\_stats \= self.\_zonal\_stats(s1, 'VV')  
        vh\_stats \= self.\_zonal\_stats(s1, 'VH')  
          
        \# SAR water mask: VV \< \-15 dB generally indicates open water  
        sar\_water \= s1.select('VV').lt(-15).selfMask()  
        sar\_water\_area \= sar\_water.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(),  
            geometry=self.geometry,  
            scale=10,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
        sar\_water\_pct \= (list(sar\_water\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        indicators.update({  
            'sar\_vv\_mean\_db': round(vv\_stats.get('VV\_mean', 0), 2),  
            'sar\_vh\_mean\_db': round(vh\_stats.get('VH\_mean', 0), 2),  
            'sar\_water\_area\_percent': round(sar\_water\_pct, 2),  
        })  
          
        \# \=== PART 3: JRC Historical Water Surface \===  
        jrc \= ee.Image('JRC/GSW1\_4/GlobalSurfaceWater')  
        occurrence \= jrc.select('occurrence').clip(self.geometry)  
          
        occ\_stats \= self.\_zonal\_stats(occurrence, 'occurrence', scale=30)  
          
        \# Seasonal water \= occurrence 25-75%, Permanent water \= occurrence \> 75%  
        seasonal\_water \= occurrence.gte(25).And(occurrence.lt(75)).selfMask()  
        permanent\_water \= occurrence.gte(75).selfMask()  
          
        seasonal\_area \= seasonal\_water.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(), geometry=self.geometry,  
            scale=30, maxPixels=1e8, bestEffort=True  
        ).getInfo()  
        permanent\_area \= permanent\_water.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(), geometry=self.geometry,  
            scale=30, maxPixels=1e8, bestEffort=True  
        ).getInfo()  
          
        seasonal\_pct \= (list(seasonal\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
        permanent\_pct \= (list(permanent\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        indicators.update({  
            'jrc\_water\_occurrence\_mean': round(occ\_stats.get('occurrence\_mean', 0), 1),  
            'seasonal\_water\_percent': round(seasonal\_pct, 2),  
            'permanent\_water\_percent': round(permanent\_pct, 2),  
            'historical\_water\_coverage': round(seasonal\_pct \+ permanent\_pct, 2),  
        })  
          
        \# \=== Risk assessment \===  
        if water\_pct \< 5 and permanent\_pct \> 20:  
            risk\_flags.append({  
                'type': 'WATER\_LOSS',  
                'severity': 'HIGH',  
                'description': f'Current water ({water\_pct:.1f}%) significantly below historical ({permanent\_pct:.1f}%). Possible water body shrinkage.'  
            })  
          
        if ndmi\_stats.get('NDMI\_mean', 0\) \< \-0.2:  
            risk\_flags.append({  
                'type': 'MOISTURE\_STRESS',  
                'severity': 'MODERATE',  
                'description': 'Low soil/vegetation moisture detected. May impact restoration success.'  
            })  
          
        interpretation \= self.\_build\_interpretation(indicators)  
          
        return AnalysisResult(  
            module\_name='WATER\_MOISTURE',  
            indicators=indicators,  
            metadata={  
                'optical\_source': 'Sentinel-2 SR Harmonized',  
                'sar\_source': 'Sentinel-1 GRD',  
                'historical\_source': 'JRC Global Surface Water v1.4',  
                'water\_thresholds': {  
                    'mndwi\_water\_threshold': 0.0,  
                    'sar\_vv\_water\_threshold\_db': \-15,  
                    'jrc\_seasonal\_min': 25,  
                    'jrc\_permanent\_min': 75,  
                }  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\[  
                'COPERNICUS/S2\_SR\_HARMONIZED',  
                'COPERNICUS/S1\_GRD',  
                'JRC/GSW1\_4/GlobalSurfaceWater'  
            \],  
            confidence=0.8,  
        )  
      
    def \_build\_interpretation(self, ind) \-\> str:  
        parts \= \[\]  
        water\_pct \= ind.get('surface\_water\_area\_percent', 0\)  
        hist\_water \= ind.get('historical\_water\_coverage', 0\)  
        ndmi \= ind.get('ndmi\_mean', 0\)  
          
        if water\_pct \> 20:  
            parts.append(f"Significant surface water detected ({water\_pct:.1f}% of site).")  
        elif water\_pct \> 5:  
            parts.append(f"Moderate surface water presence ({water\_pct:.1f}% of site).")  
        else:  
            parts.append(f"Minimal surface water ({water\_pct:.1f}%).")  
          
        if hist\_water \> water\_pct \+ 10:  
            parts.append(f"Historical water extent ({hist\_water:.1f}%) exceeds current, suggesting water recession.")  
        elif water\_pct \> hist\_water \+ 10:  
            parts.append(f"Current water exceeds historical norms, possibly indicating flooding or restoration success.")  
          
        if ndmi \> 0.1:  
            parts.append("Vegetation moisture levels are healthy.")  
        elif ndmi \> \-0.1:  
            parts.append("Moderate vegetation moisture levels.")  
        else:  
            parts.append("Low vegetation moisture — possible drought stress.")  
          
        return " ".join(parts)  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
\`\`\`

\#\#\# 6.6 Module 4: Flood Analysis Module

\`\`\`python  
\# modules/flood\_analysis\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class FloodAnalysisModule(BaseAnalysisModule):  
    """  
    Flood extent and frequency analysis using:  
    1\. Sentinel-1 SAR (all-weather flood mapping)  
    2\. JRC Global Surface Water (historical flood frequency)  
    3\. MODIS NRT Flood (near-real-time alerts, when available)  
      
    SAR advantage: Penetrates clouds, critical during flood events  
      
    Method: Change detection between dry-period reference and   
    analysis period SAR backscatter. VV decrease \> 3dB indicates flooding.  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# Reference dry period (3 months before analysis)  
        from datetime import datetime, timedelta  
        analysis\_start \= datetime.fromisoformat(self.date\_start)  
        ref\_end \= analysis\_start \- timedelta(days=30)  
        ref\_start \= ref\_end \- timedelta(days=90)  
          
        \# Dry reference composite  
        ref\_collection \= (  
            ee.ImageCollection('COPERNICUS/S1\_GRD')  
            .filterBounds(self.geometry)  
            .filterDate(ref\_start.strftime('%Y-%m-%d'), ref\_end.strftime('%Y-%m-%d'))  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))  
            .filter(ee.Filter.eq('instrumentMode', 'IW'))  
            .select('VV')  
        )  
          
        ref\_composite \= ref\_collection.median().clip(self.geometry)  
          
        \# Analysis period composite  
        analysis\_collection \= (  
            ee.ImageCollection('COPERNICUS/S1\_GRD')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))  
            .filter(ee.Filter.eq('instrumentMode', 'IW'))  
            .select('VV')  
        )  
          
        analysis\_composite \= analysis\_collection.median().clip(self.geometry)  
          
        \# Change detection: decrease in VV backscatter indicates flooding  
        vv\_diff \= ref\_composite.subtract(analysis\_composite).rename('VV\_change')  
          
        \# Flood mask: VV decreased by more than 3 dB  
        flood\_mask \= vv\_diff.gt(3).selfMask()  
          
        \# Compute flood extent  
        total\_area \= self.geometry.area().getInfo()  
        flood\_area \= flood\_mask.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(),  
            geometry=self.geometry,  
            scale=10,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
          
        flood\_area\_val \= list(flood\_area.values())\[0\] if flood\_area else 0  
        flood\_pct \= (flood\_area\_val / total\_area \* 100\) if total\_area \> 0 else 0  
          
        \# JRC Flood recurrence  
        jrc \= ee.Image('JRC/GSW1\_4/GlobalSurfaceWater')  
        recurrence \= jrc.select('recurrence').clip(self.geometry)  
        recurrence\_stats \= self.\_zonal\_stats(recurrence, 'recurrence', scale=30)  
          
        \# JRC transition classification  
        transition \= jrc.select('transition').clip(self.geometry)  
        \# Transition values: 0=no change, 1=permanent, 2=new permanent,   
        \# 3=lost permanent, 4=seasonal, 5=new seasonal, etc.  
          
        interpretation \= self.\_interpret\_flood(flood\_pct, recurrence\_stats)  
        risk\_flags \= self.\_assess\_flood\_risk(flood\_pct, recurrence\_stats)  
          
        return AnalysisResult(  
            module\_name='FLOOD\_ANALYSIS',  
            indicators={  
                'current\_flood\_extent\_percent': round(flood\_pct, 2),  
                'current\_flood\_area\_ha': round(flood\_area\_val / 10000, 2),  
                'vv\_change\_mean\_db': round(self.\_zonal\_stats(vv\_diff, 'VV\_change').get('VV\_change\_mean', 0), 2),  
                'flood\_recurrence\_mean': round(recurrence\_stats.get('recurrence\_mean', 0), 1),  
                'flood\_recurrence\_max': round(recurrence\_stats.get('recurrence\_max', 0), 1),  
            },  
            metadata={  
                'method': 'SAR change detection (VV polarization)',  
                'reference\_period': f'{ref\_start.strftime("%Y-%m-%d")} to {ref\_end.strftime("%Y-%m-%d")}',  
                'flood\_threshold\_db': 3.0,  
                'ref\_images': ref\_collection.size().getInfo(),  
                'analysis\_images': analysis\_collection.size().getInfo(),  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S1\_GRD', 'JRC/GSW1\_4/GlobalSurfaceWater'\],  
            confidence=0.75,  
        )  
      
    def \_interpret\_flood(self, flood\_pct, recurrence\_stats):  
        if flood\_pct \> 30:  
            return f"Significant flooding detected over {flood\_pct:.1f}% of the site. This may represent active inundation or seasonal water expansion."  
        elif flood\_pct \> 10:  
            return f"Moderate flood extent ({flood\_pct:.1f}%). Partial waterlogging consistent with wetland or lake fringe dynamics."  
        elif flood\_pct \> 2:  
            return f"Minor flood signals ({flood\_pct:.1f}%). Localized wet areas detected."  
        else:  
            return "No significant flooding detected in the analysis period."  
      
    def \_assess\_flood\_risk(self, flood\_pct, recurrence\_stats):  
        flags \= \[\]  
        rec\_mean \= recurrence\_stats.get('recurrence\_mean', 0\)  
          
        if flood\_pct \> 30:  
            flags.append({'type': 'ACTIVE\_FLOODING', 'severity': 'HIGH',  
                          'description': f'{flood\_pct:.1f}% of site showing flood signatures'})  
        if rec\_mean \> 50:  
            flags.append({'type': 'HIGH\_FLOOD\_FREQUENCY', 'severity': 'MODERATE',  
                          'description': f'Historical flood recurrence {rec\_mean:.0f}% — site prone to regular inundation'})  
        return flags  
\`\`\`

