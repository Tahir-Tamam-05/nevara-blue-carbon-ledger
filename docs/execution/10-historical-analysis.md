\#\#\# 6.7 Module 5: Historical Degradation Module

\`\`\`python  
\# modules/historical\_degradation\_module.py  
import ee  
import numpy as np  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class HistoricalDegradationModule(BaseAnalysisModule):  
    """  
    Reconstructs degradation history over 5-10 years using:  
    \- Annual NDVI composites from Sentinel-2 (2017-present) and Landsat 8/9 (2013-present)  
    \- Land cover change from Dynamic World annual composites  
    \- Linear regression trend analysis  
    \- Breakpoint detection for sudden degradation events  
      
    Critical for establishing pre-restoration baseline and   
    demonstrating restoration need.  
    """  
      
    def \_\_init\_\_(self, geometry, date\_start, date\_end, project\_id, export\_path,  
                 lookback\_years=7):  
        super().\_\_init\_\_(geometry, date\_start, date\_end, project\_id, export\_path)  
        self.lookback\_years \= lookback\_years  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        current\_year \= int(self.date\_end\[:4\])  
        start\_year \= current\_year \- self.lookback\_years  
          
        \# Build annual NDVI time series  
        ndvi\_timeline \= \[\]  
        for year in range(start\_year, current\_year \+ 1):  
            annual\_ndvi \= self.\_get\_annual\_ndvi(year)  
            if annual\_ndvi is not None:  
                ndvi\_timeline.append(annual\_ndvi)  
          
        if len(ndvi\_timeline) \< 3:  
            return self.\_empty\_result('Insufficient historical data')  
          
        \# Trend analysis  
        years \= np.array(\[p\['year'\] for p in ndvi\_timeline\])  
        values \= np.array(\[p\['ndvi\_mean'\] for p in ndvi\_timeline\])  
          
        \# Linear regression  
        coeffs \= np.polyfit(years, values, 1\)  
        trend\_per\_year \= float(coeffs\[0\])  
        r\_squared \= float(np.corrcoef(years, values)\[0, 1\] \*\* 2\)  
          
        \# Breakpoint detection (simple: largest year-over-year drop)  
        diffs \= np.diff(values)  
        worst\_drop\_idx \= np.argmin(diffs)  
        worst\_drop\_year \= int(years\[worst\_drop\_idx \+ 1\])  
        worst\_drop\_magnitude \= float(diffs\[worst\_drop\_idx\])  
          
        \# Overall degradation assessment  
        peak\_ndvi \= float(np.max(values))  
        peak\_year \= int(years\[np.argmax(values)\])  
        current\_ndvi \= float(values\[-1\])  
        total\_change \= current\_ndvi \- peak\_ndvi  
        total\_change\_pct \= (total\_change / peak\_ndvi \* 100\) if peak\_ndvi \!= 0 else 0  
          
        \# Classify degradation severity  
        if total\_change\_pct \< \-30:  
            degradation\_class \= 'SEVERE'  
        elif total\_change\_pct \< \-15:  
            degradation\_class \= 'MODERATE'  
        elif total\_change\_pct \< \-5:  
            degradation\_class \= 'MILD'  
        elif total\_change\_pct \> 5:  
            degradation\_class \= 'RECOVERING'  
        else:  
            degradation\_class \= 'STABLE'  
          
        \# Trend direction  
        if trend\_per\_year \> 0.01:  
            trend\_direction \= 'IMPROVING'  
        elif trend\_per\_year \< \-0.01:  
            trend\_direction \= 'DECLINING'  
        else:  
            trend\_direction \= 'STABLE'  
          
        interpretation \= self.\_interpret(  
            degradation\_class, trend\_direction, peak\_year, peak\_ndvi,  
            current\_ndvi, total\_change\_pct, worst\_drop\_year, worst\_drop\_magnitude  
        )  
          
        risk\_flags \= \[\]  
        if degradation\_class in \['SEVERE', 'MODERATE'\]:  
            risk\_flags.append({  
                'type': 'HISTORICAL\_DEGRADATION',  
                'severity': 'HIGH' if degradation\_class \== 'SEVERE' else 'MODERATE',  
                'description': f'{degradation\_class} degradation from {peak\_year} peak. NDVI declined {abs(total\_change\_pct):.1f}%.'  
            })  
        if abs(worst\_drop\_magnitude) \> 0.1:  
            risk\_flags.append({  
                'type': 'SUDDEN\_DECLINE\_EVENT',  
                'severity': 'MODERATE',  
                'description': f'Sharp NDVI drop of {worst\_drop\_magnitude:.3f} detected in {worst\_drop\_year}. Possible disturbance event.'  
            })  
          
        return AnalysisResult(  
            module\_name='HISTORICAL\_DEGRADATION',  
            indicators={  
                'peak\_ndvi': round(peak\_ndvi, 4),  
                'peak\_year': peak\_year,  
                'current\_ndvi': round(current\_ndvi, 4),  
                'total\_ndvi\_change': round(total\_change, 4),  
                'total\_change\_percent': round(total\_change\_pct, 1),  
                'trend\_per\_year': round(trend\_per\_year, 5),  
                'trend\_r\_squared': round(r\_squared, 3),  
                'trend\_direction': trend\_direction,  
                'degradation\_class': degradation\_class,  
                'worst\_decline\_year': worst\_drop\_year,  
                'worst\_decline\_magnitude': round(worst\_drop\_magnitude, 4),  
                'years\_analyzed': len(ndvi\_timeline),  
            },  
            metadata={  
                'ndvi\_timeline': ndvi\_timeline,  
                'lookback\_years': self.lookback\_years,  
                'analysis\_period': f'{start\_year}-{current\_year}',  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED', 'LANDSAT/LC08/C02/T1\_L2'\],  
            confidence=min(r\_squared \+ 0.3, 1.0),  
        )  
      
    def \_get\_annual\_ndvi(self, year: int) \-\> dict:  
        """Get annual median NDVI for a given year."""  
        \# Try Sentinel-2 first (2017+), fall back to Landsat 8  
        if year \>= 2017:  
            collection \= (  
                ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
                .filterBounds(self.geometry)  
                .filterDate(f'{year}-01-01', f'{year}-12-31')  
                .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 30))  
                .map(self.\_mask\_s2\_clouds)  
            )  
            nir, red \= 'B8', 'B4'  
            source \= 'Sentinel-2'  
        else:  
            collection \= (  
                ee.ImageCollection('LANDSAT/LC08/C02/T1\_L2')  
                .filterBounds(self.geometry)  
                .filterDate(f'{year}-01-01', f'{year}-12-31')  
                .map(self.\_mask\_landsat\_clouds)  
            )  
            nir, red \= 'SR\_B5', 'SR\_B4'  
            source \= 'Landsat-8'  
          
        count \= collection.size().getInfo()  
        if count \== 0:  
            return None  
          
        composite \= collection.median().clip(self.geometry)  
        ndvi \= composite.normalizedDifference(\[nir, red\]).rename('NDVI')  
          
        stats \= ndvi.reduceRegion(  
            reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True),  
            geometry=self.geometry,  
            scale=30,  \# Use 30m for consistency across sensors  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
          
        return {  
            'year': year,  
            'ndvi\_mean': round(stats.get('NDVI\_mean', 0), 4),  
            'ndvi\_stddev': round(stats.get('NDVI\_stdDev', 0), 4),  
            'image\_count': count,  
            'source': source,  
        }  
      
    def \_interpret(self, deg\_class, trend, peak\_year, peak\_ndvi,   
                   current\_ndvi, change\_pct, worst\_year, worst\_drop):  
        msg \= f"Historical analysis ({self.lookback\_years}-year lookback): "  
        msg \+= f"Peak vegetation was in {peak\_year} (NDVI: {peak\_ndvi:.3f}). "  
        msg \+= f"Current NDVI: {current\_ndvi:.3f} ({change\_pct:+.1f}% from peak). "  
          
        if deg\_class \== 'SEVERE':  
            msg \+= "SEVERE degradation detected — site has lost significant vegetation cover. "  
        elif deg\_class \== 'MODERATE':  
            msg \+= "MODERATE degradation detected — notable vegetation decline from historical levels. "  
        elif deg\_class \== 'RECOVERING':  
            msg \+= "Site appears to be in RECOVERY — vegetation improving from lowest levels. "  
        else:  
            msg \+= f"Site classified as {deg\_class}. "  
          
        if abs(worst\_drop) \> 0.05:  
            msg \+= f"A sharp decline occurred in {worst\_year} (NDVI drop: {worst\_drop:.3f}), possibly due to a disturbance event."  
          
        return msg  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
      
    def \_mask\_landsat\_clouds(self, image):  
        qa \= image.select('QA\_PIXEL')  
        mask \= qa.bitwiseAnd(1 \<\< 3).eq(0).And(qa.bitwiseAnd(1 \<\< 4).eq(0))  
        return image.updateMask(mask).multiply(0.0000275).add(-0.2)  
      
    def \_empty\_result(self, reason):  
        return AnalysisResult(  
            module\_name='HISTORICAL\_DEGRADATION',  
            indicators={}, metadata={'error': reason},  
            quality\_score=0.0, interpretation=f'Historical analysis unavailable: {reason}',  
            datasets\_used=\[\]  
        )  
\`\`\`

\#\#\# 6.8 Module 6: Vegetation Recovery Tracker

\`\`\`python  
\# modules/vegetation\_recovery\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class VegetationRecoveryModule(BaseAnalysisModule):  
    """  
    Tracks restoration progress by comparing current state   
    against baseline across multiple indices.  
      
    Computes:  
    \- NDVI recovery rate (per month, per quarter)  
    \- Green cover area expansion  
    \- Bare soil reduction  
    \- Vegetation density improvement  
    \- Recovery trajectory classification  
    \- Estimated time to target recovery  
    """  
      
    def \_\_init\_\_(self, geometry, date\_start, date\_end, project\_id, export\_path,  
                 baseline\_snapshot: dict \= None):  
        super().\_\_init\_\_(geometry, date\_start, date\_end, project\_id, export\_path)  
        self.baseline \= baseline\_snapshot  \# {ndvi\_mean, ndwi\_mean, bare\_pct, green\_pct, date}  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        if not self.baseline:  
            return self.\_empty\_result('No baseline available for comparison')  
          
        \# Current period analysis  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(self.\_mask\_s2\_clouds)  
            .median()  
            .clip(self.geometry)  
        )  
          
        ndvi \= s2.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
        ndvi\_stats \= self.\_zonal\_stats(ndvi, 'NDVI')  
          
        current\_ndvi \= ndvi\_stats.get('NDVI\_mean', 0\)  
        baseline\_ndvi \= self.baseline.get('ndvi\_mean', 0\)  
          
        \# Absolute and relative change  
        ndvi\_change \= current\_ndvi \- baseline\_ndvi  
        ndvi\_change\_pct \= (ndvi\_change / abs(baseline\_ndvi) \* 100\) if baseline\_ndvi \!= 0 else 0  
          
        \# Green cover classification  
        green\_mask \= ndvi.gt(0.3).selfMask()  
        total\_area \= self.geometry.area().getInfo()  
        green\_area \= green\_mask.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(), geometry=self.geometry,  
            scale=10, maxPixels=1e8, bestEffort=True  
        ).getInfo()  
        green\_pct \= (list(green\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        \# Bare soil detection  
        bsi \= s2.expression(  
            '((SWIR \+ RED) \- (NIR \+ BLUE)) / ((SWIR \+ RED) \+ (NIR \+ BLUE))', {  
                'SWIR': s2.select('B11'), 'RED': s2.select('B4'),  
                'NIR': s2.select('B8'), 'BLUE': s2.select('B2')  
            }  
        ).rename('BSI')  
        bare\_mask \= bsi.gt(0.1).selfMask()  
        bare\_area \= bare\_mask.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(), geometry=self.geometry,  
            scale=10, maxPixels=1e8, bestEffort=True  
        ).getInfo()  
        bare\_pct \= (list(bare\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        baseline\_green \= self.baseline.get('green\_cover\_percent', 0\)  
        baseline\_bare \= self.baseline.get('bare\_land\_percent', 100\)  
          
        green\_change \= green\_pct \- baseline\_green  
        bare\_change \= bare\_pct \- baseline\_bare  
          
        \# Recovery trajectory  
        from datetime import datetime  
        baseline\_date \= datetime.fromisoformat(self.baseline.get('date', self.date\_start))  
        current\_date \= datetime.fromisoformat(self.date\_end)  
        months\_elapsed \= max(1, (current\_date \- baseline\_date).days / 30.0)  
          
        ndvi\_recovery\_rate\_per\_month \= ndvi\_change / months\_elapsed  
          
        \# Trajectory classification  
        if ndvi\_change \> 0.1:  
            trajectory \= 'STRONG\_RECOVERY'  
        elif ndvi\_change \> 0.03:  
            trajectory \= 'MODERATE\_RECOVERY'  
        elif ndvi\_change \> \-0.03:  
            trajectory \= 'STABLE'  
        elif ndvi\_change \> \-0.1:  
            trajectory \= 'MODERATE\_DECLINE'  
        else:  
            trajectory \= 'SIGNIFICANT\_DECLINE'  
          
        \# Recovery score (0-100)  
        \# Based on how much the NDVI has improved relative to a "healthy" target (0.5)  
        target\_ndvi \= 0.5  
        if target\_ndvi \> baseline\_ndvi:  
            recovery\_progress \= max(0, (current\_ndvi \- baseline\_ndvi) / (target\_ndvi \- baseline\_ndvi) \* 100\)  
        else:  
            recovery\_progress \= 100  \# Already at/above target  
        recovery\_progress \= min(100, round(recovery\_progress, 1))  
          
        interpretation \= self.\_build\_interpretation(  
            ndvi\_change, ndvi\_change\_pct, green\_change, bare\_change,  
            trajectory, recovery\_progress, months\_elapsed  
        )  
          
        risk\_flags \= \[\]  
        if trajectory in \['MODERATE\_DECLINE', 'SIGNIFICANT\_DECLINE'\]:  
            risk\_flags.append({  
                'type': 'RESTORATION\_REGRESSION',  
                'severity': 'HIGH',  
                'description': f'Vegetation declining since baseline ({ndvi\_change\_pct:+.1f}%). Restoration may be at risk.'  
            })  
        if bare\_pct \> 60 and bare\_change \> 0:  
            risk\_flags.append({  
                'type': 'INCREASING\_BARE\_SOIL',  
                'severity': 'MODERATE',  
                'description': f'Bare soil increased to {bare\_pct:.1f}% from {baseline\_bare:.1f}%.'  
            })  
          
        return AnalysisResult(  
            module\_name='VEGETATION\_RECOVERY',  
            indicators={  
                'current\_ndvi\_mean': round(current\_ndvi, 4),  
                'baseline\_ndvi\_mean': round(baseline\_ndvi, 4),  
                'ndvi\_change\_absolute': round(ndvi\_change, 4),  
                'ndvi\_change\_percent': round(ndvi\_change\_pct, 1),  
                'ndvi\_recovery\_rate\_per\_month': round(ndvi\_recovery\_rate\_per\_month, 5),  
                'green\_cover\_percent': round(green\_pct, 1),  
                'green\_cover\_change': round(green\_change, 1),  
                'bare\_soil\_percent': round(bare\_pct, 1),  
                'bare\_soil\_change': round(bare\_change, 1),  
                'trajectory': trajectory,  
                'recovery\_progress\_score': recovery\_progress,  
                'months\_since\_baseline': round(months\_elapsed, 1),  
            },  
            metadata={  
                'baseline\_date': self.baseline.get('date'),  
                'target\_ndvi': target\_ndvi,  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\],  
            confidence=0.85,  
        )  
      
    def \_build\_interpretation(self, ndvi\_chg, ndvi\_chg\_pct, green\_chg, bare\_chg,  
                               trajectory, progress, months):  
        msg \= f"Over {months:.0f} months since baseline: "  
        if trajectory \== 'STRONG\_RECOVERY':  
            msg \+= f"STRONG recovery detected. NDVI improved by {ndvi\_chg:+.3f} ({ndvi\_chg\_pct:+.1f}%). "  
        elif trajectory \== 'MODERATE\_RECOVERY':  
            msg \+= f"Moderate recovery underway. NDVI improved by {ndvi\_chg:+.3f} ({ndvi\_chg\_pct:+.1f}%). "  
        elif trajectory \== 'STABLE':  
            msg \+= f"Conditions are stable (NDVI change: {ndvi\_chg:+.3f}). "  
        else:  
            msg \+= f"Concerning decline detected. NDVI dropped by {ndvi\_chg:.3f} ({ndvi\_chg\_pct:.1f}%). "  
          
        msg \+= f"Green cover: {green\_chg:+.1f}pp change. Bare soil: {bare\_chg:+.1f}pp change. "  
        msg \+= f"Recovery progress: {progress:.0f}% toward healthy target."  
        return msg  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
      
    def \_empty\_result(self, reason):  
        return AnalysisResult(  
            module\_name='VEGETATION\_RECOVERY', indicators={},  
            metadata={'error': reason}, quality\_score=0.0,  
            interpretation=f'Recovery tracking unavailable: {reason}', datasets\_used=\[\]  
        )  
\`\`\`

\#\#\# 6.9 Module 7: Erosion Indicator Module

\`\`\`python  
\# modules/erosion\_indicator\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class ErosionIndicatorModule(BaseAnalysisModule):  
    """  
    Erosion risk assessment combining:  
    1\. BSI (Bare Soil Index) from Sentinel-2 — exposed soil surface  
    2\. Slope analysis from SRTM DEM — steeper slopes \= higher erosion  
    3\. NDVI (low vegetation \= less protection)  
    4\. Rainfall erosivity proxy from CHIRPS  
    5\. RUSLE-inspired simplified erosion risk scoring  
      
    RUSLE: A \= R × K × LS × C × P  
    We approximate:  
    \- R (rainfall erosivity) ← CHIRPS annual rainfall  
    \- LS (slope length/steepness) ← SRTM DEM slope  
    \- C (cover management) ← inverse of NDVI  
    \- K (soil erodibility) ← approximated from bare soil index  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# \=== Bare Soil Index \===  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(self.\_mask\_s2\_clouds)  
            .median()  
            .clip(self.geometry)  
        )  
          
        bsi \= s2.expression(  
            '((SWIR \+ RED) \- (NIR \+ BLUE)) / ((SWIR \+ RED) \+ (NIR \+ BLUE))', {  
                'SWIR': s2.select('B11'), 'RED': s2.select('B4'),  
                'NIR': s2.select('B8'), 'BLUE': s2.select('B2')  
            }  
        ).rename('BSI')  
          
        ndvi \= s2.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
          
        bsi\_stats \= self.\_zonal\_stats(bsi, 'BSI')  
        ndvi\_stats \= self.\_zonal\_stats(ndvi, 'NDVI')  
          
        \# \=== Slope from SRTM \===  
        dem \= ee.Image('USGS/SRTMGL1\_003').select('elevation')  
        slope \= ee.Terrain.slope(dem).clip(self.geometry)  
        slope\_stats \= self.\_zonal\_stats(slope, 'slope', scale=30)  
          
        \# \=== Rainfall from CHIRPS \===  
        year \= int(self.date\_end\[:4\])  
        chirps \= (  
            ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')  
            .filterBounds(self.geometry)  
            .filterDate(f'{year}-01-01', f'{year}-12-31')  
            .select('precipitation')  
            .sum()  \# Annual total  
            .clip(self.geometry)  
        )  
        rain\_stats \= self.\_zonal\_stats(chirps, 'precipitation', scale=5000)  
          
        \# \=== Simplified RUSLE-inspired erosion risk score \===  
        bsi\_mean \= bsi\_stats.get('BSI\_mean', 0\)  
        ndvi\_mean \= ndvi\_stats.get('NDVI\_mean', 0\)  
        slope\_mean \= slope\_stats.get('slope\_mean', 0\)  
        rain\_annual \= rain\_stats.get('precipitation\_mean', 500\)  
          
        \# Normalize factors to 0-1 range  
        rain\_factor \= min(rain\_annual / 2000, 1.0)     \# R proxy  
        slope\_factor \= min(slope\_mean / 30, 1.0)         \# LS proxy  
        cover\_factor \= 1 \- max(0, min(ndvi\_mean, 1))     \# C proxy (less veg \= more erosion)  
        soil\_factor \= max(0, min((bsi\_mean \+ 0.3) / 0.6, 1.0))  \# K proxy  
          
        erosion\_risk\_score \= round(  
            (rain\_factor \* 0.25 \+ slope\_factor \* 0.30 \+ cover\_factor \* 0.25 \+ soil\_factor \* 0.20) \* 100,  
            1  
        )  
          
        \# Classify  
        if erosion\_risk\_score \> 70:  
            risk\_class \= 'VERY\_HIGH'  
        elif erosion\_risk\_score \> 50:  
            risk\_class \= 'HIGH'  
        elif erosion\_risk\_score \> 30:  
            risk\_class \= 'MODERATE'  
        elif erosion\_risk\_score \> 15:  
            risk\_class \= 'LOW'  
        else:  
            risk\_class \= 'VERY\_LOW'  
          
        interpretation \= (  
            f"Erosion risk score: {erosion\_risk\_score}/100 ({risk\_class}). "  
            f"Contributing factors — Bare soil (BSI: {bsi\_mean:.3f}), "  
            f"Slope ({slope\_mean:.1f}°), Vegetation cover (NDVI: {ndvi\_mean:.3f}), "  
            f"Annual rainfall ({rain\_annual:.0f} mm). "  
        )  
          
        if risk\_class in \['HIGH', 'VERY\_HIGH'\]:  
            interpretation \+= "Active erosion control measures recommended. "  
          
        risk\_flags \= \[\]  
        if risk\_class in \['VERY\_HIGH', 'HIGH'\]:  
            risk\_flags.append({  
                'type': 'EROSION\_RISK',  
                'severity': 'HIGH' if risk\_class \== 'VERY\_HIGH' else 'MODERATE',  
                'description': f'Erosion risk classified as {risk\_class} (score: {erosion\_risk\_score})'  
            })  
          
        return AnalysisResult(  
            module\_name='EROSION\_INDICATOR',  
            indicators={  
                'bsi\_mean': round(bsi\_mean, 4),  
                'ndvi\_mean': round(ndvi\_mean, 4),  
                'slope\_mean\_degrees': round(slope\_mean, 1),  
                'slope\_max\_degrees': round(slope\_stats.get('slope\_max', 0), 1),  
                'annual\_rainfall\_mm': round(rain\_annual, 0),  
                'erosion\_risk\_score': erosion\_risk\_score,  
                'erosion\_risk\_class': risk\_class,  
                'rain\_factor': round(rain\_factor, 3),  
                'slope\_factor': round(slope\_factor, 3),  
                'cover\_factor': round(cover\_factor, 3),  
                'soil\_exposure\_factor': round(soil\_factor, 3),  
            },  
            metadata={  
                'method': 'Simplified RUSLE-inspired scoring',  
                'factor\_weights': {'R': 0.25, 'LS': 0.30, 'C': 0.25, 'K': 0.20},  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\[  
                'COPERNICUS/S2\_SR\_HARMONIZED',  
                'USGS/SRTMGL1\_003',  
                'UCSB-CHG/CHIRPS/DAILY'  
            \],  
            confidence=0.65,  
        )  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
\`\`\`

\#\#\# 6.10 Module 8: Biomass Estimation Module

\`\`\`python  
\# modules/biomass\_estimation\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class BiomassEstimationModule(BaseAnalysisModule):  
    """  
    Above-ground biomass proxy estimation using:  
      
    1\. NDVI-based regression model (Sentinel-2)  
       AGB ≈ a × exp(b × NDVI) — empirical exponential model  
      
    2\. SAR-based estimation (Sentinel-1)  
       VH cross-polarization correlates with biomass in forest/shrub  
      
    3\. GEDI L4A (when available in GEE)  
       Direct lidar-based AGB estimates at 25m footprint  
      
    NOTE: This produces PROXY estimates, not field-calibrated measurements.  
    Suitable for relative comparison over time, not absolute biomass.  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# \=== Optical biomass proxy \===  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(self.\_mask\_s2\_clouds)  
            .median()  
            .clip(self.geometry)  
        )  
          
        ndvi \= s2.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
        ndvi\_stats \= self.\_zonal\_stats(ndvi, 'NDVI')  
          
        \# Empirical AGB model: AGB (Mg/ha) ≈ 10 \* exp(2.5 \* NDVI)  
        \# This is a generic tropical/subtropical approximation  
        \# Should be calibrated per-region for accuracy  
        agb\_proxy \= ndvi.expression(  
            '10 \* exp(2.5 \* NDVI)', {'NDVI': ndvi}  
        ).rename('AGB\_proxy')  
          
        agb\_stats \= self.\_zonal\_stats(agb\_proxy, 'AGB\_proxy')  
          
        \# Vegetation fraction cover  
        fvc \= ndvi.expression(  
            '(NDVI \- 0.05) / (0.85 \- 0.05)', {'NDVI': ndvi}  
        ).clamp(0, 1).rename('FVC')  
        fvc\_stats \= self.\_zonal\_stats(fvc, 'FVC')  
          
        \# \=== SAR biomass proxy \===  
        s1 \= (  
            ee.ImageCollection('COPERNICUS/S1\_GRD')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))  
            .filter(ee.Filter.eq('instrumentMode', 'IW'))  
            .select('VH')  
            .median()  
            .clip(self.geometry)  
        )  
          
        vh\_stats \= self.\_zonal\_stats(s1, 'VH')  
          
        \# VH to biomass proxy: AGB ≈ 0.5 \* 10^((VH \+ 20\) / 10\)  
        \# Higher VH backscatter (less negative) \= more biomass  
        sar\_agb\_proxy \= s1.expression(  
            '0.5 \* pow(10, (VH \+ 20\) / 10)', {'VH': s1.select('VH')}  
        ).rename('SAR\_AGB\_proxy')  
        sar\_agb\_stats \= self.\_zonal\_stats(sar\_agb\_proxy, 'SAR\_AGB\_proxy')  
          
        \# Ensemble estimate (average of optical and SAR proxies)  
        optical\_agb \= agb\_stats.get('AGB\_proxy\_mean', 0\)  
        sar\_agb \= sar\_agb\_stats.get('SAR\_AGB\_proxy\_mean', 0\)  
        ensemble\_agb \= (optical\_agb \* 0.6 \+ sar\_agb \* 0.4) if sar\_agb \> 0 else optical\_agb  
          
        total\_area\_ha \= self.geometry.area().getInfo() / 10000  
        total\_biomass\_estimate \= ensemble\_agb \* total\_area\_ha  
          
        \# Carbon stock estimate (generic: \~50% of AGB is carbon)  
        carbon\_stock\_estimate \= total\_biomass\_estimate \* 0.5  
          
        interpretation \= (  
            f"Estimated above-ground biomass: {ensemble\_agb:.1f} Mg/ha "  
            f"(optical proxy: {optical\_agb:.1f}, SAR proxy: {sar\_agb:.1f}). "  
            f"Total site biomass: \~{total\_biomass\_estimate:.0f} Mg over {total\_area\_ha:.1f} ha. "  
            f"Fractional vegetation cover: {fvc\_stats.get('FVC\_mean', 0\) \* 100:.1f}%. "  
            f"NOTE: These are satellite-derived proxies. Field validation recommended for calibration."  
        )  
          
        return AnalysisResult(  
            module\_name='BIOMASS\_ESTIMATION',  
            indicators={  
                'ndvi\_mean': round(ndvi\_stats.get('NDVI\_mean', 0), 4),  
                'optical\_agb\_proxy\_mg\_ha': round(optical\_agb, 1),  
                'sar\_agb\_proxy\_mg\_ha': round(sar\_agb, 1),  
                'ensemble\_agb\_mg\_ha': round(ensemble\_agb, 1),  
                'total\_biomass\_mg': round(total\_biomass\_estimate, 0),  
                'fractional\_veg\_cover': round(fvc\_stats.get('FVC\_mean', 0), 3),  
                'vh\_backscatter\_db': round(vh\_stats.get('VH\_mean', 0), 2),  
                'carbon\_stock\_proxy\_mg': round(carbon\_stock\_estimate, 0),  
                'site\_area\_ha': round(total\_area\_ha, 2),  
            },  
            metadata={  
                'optical\_model': 'AGB \= 10 \* exp(2.5 \* NDVI)',  
                'sar\_model': 'AGB \= 0.5 \* 10^((VH+20)/10)',  
                'ensemble\_weights': {'optical': 0.6, 'sar': 0.4},  
                'carbon\_fraction': 0.5,  
                'disclaimer': 'Proxy estimates only. Not field-calibrated.',  
            },  
            interpretation=interpretation,  
            risk\_flags=\[\],  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED', 'COPERNICUS/S1\_GRD'\],  
            confidence=0.5,  \# Lower confidence — proxy estimates  
        )  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
\`\`\`

\#\#\# 6.11 Module 9: Restoration Suitability Module

\`\`\`python  
\# modules/restoration\_suitability\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class RestorationSuitabilityModule(BaseAnalysisModule):  
    """  
    Assesses site suitability for specific restoration types based on:  
    1\. Current land cover (Dynamic World)  
    2\. Soil moisture proxy (Sentinel-1 \+ NDMI)  
    3\. Terrain (slope, elevation, aspect)  
    4\. Climate (rainfall, temperature)  
    5\. Historical land use change trajectory  
    6\. Water proximity and availability  
      
    Produces suitability scores for each restoration type.  
    """  
      
    RESTORATION\_CRITERIA \= {  
        'LAKE\_RESTORATION': {  
            'water\_proximity\_max\_km': 5,  
            'slope\_max\_deg': 10,  
            'elevation\_max\_m': 2000,  
            'preferred\_land\_cover': \['water', 'flooded\_vegetation', 'bare'\],  
            'min\_rainfall\_mm': 400,  
        },  
        'WETLAND\_RECOVERY': {  
            'water\_proximity\_max\_km': 3,  
            'slope\_max\_deg': 5,  
            'elevation\_max\_m': 1500,  
            'preferred\_land\_cover': \['water', 'flooded\_vegetation', 'grass'\],  
            'min\_rainfall\_mm': 500,  
        },  
        'MANGROVE\_RESTORATION': {  
            'water\_proximity\_max\_km': 1,  
            'slope\_max\_deg': 3,  
            'elevation\_max\_m': 10,  
            'preferred\_land\_cover': \['water', 'flooded\_vegetation'\],  
            'min\_rainfall\_mm': 1000,  
        },  
        'BARREN\_LAND\_RESTORATION': {  
            'water\_proximity\_max\_km': 50,  
            'slope\_max\_deg': 25,  
            'elevation\_max\_m': 3000,  
            'preferred\_land\_cover': \['bare', 'shrub\_and\_scrub', 'grass'\],  
            'min\_rainfall\_mm': 200,  
        },  
        'FOREST\_RESTORATION': {  
            'water\_proximity\_max\_km': 50,  
            'slope\_max\_deg': 35,  
            'elevation\_max\_m': 3500,  
            'preferred\_land\_cover': \['trees', 'shrub\_and\_scrub', 'grass', 'bare'\],  
            'min\_rainfall\_mm': 600,  
        },  
    }  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# Gather all environmental factors  
          
        \# Terrain  
        dem \= ee.Image('USGS/SRTMGL1\_003').select('elevation')  
        slope \= ee.Terrain.slope(dem).clip(self.geometry)  
        elevation\_stats \= self.\_zonal\_stats(dem.clip(self.geometry), 'elevation', scale=30)  
        slope\_stats \= self.\_zonal\_stats(slope, 'slope', scale=30)  
          
        \# Land cover from Dynamic World  
        dw \= (  
            ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .select('label')  
            .mode()  
            .clip(self.geometry)  
        )  
          
        \# Rainfall  
        year \= int(self.date\_end\[:4\])  
        chirps \= (  
            ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')  
            .filterBounds(self.geometry)  
            .filterDate(f'{year-1}-01-01', f'{year}-01-01')  
            .select('precipitation')  
            .sum()  
            .clip(self.geometry)  
        )  
        rain\_stats \= self.\_zonal\_stats(chirps, 'precipitation', scale=5000)  
          
        \# Water proximity (simplified: use NDWI)  
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
        ndwi\_stats \= self.\_zonal\_stats(ndwi, 'NDWI')  
          
        \# Score each restoration type  
        env\_factors \= {  
            'elevation\_mean': elevation\_stats.get('elevation\_mean', 0),  
            'slope\_mean': slope\_stats.get('slope\_mean', 0),  
            'rainfall\_annual\_mm': rain\_stats.get('precipitation\_mean', 500),  
            'ndwi\_mean': ndwi\_stats.get('NDWI\_mean', 0),  
        }  
          
        suitability\_scores \= {}  
        for resto\_type, criteria in self.RESTORATION\_CRITERIA.items():  
            score \= self.\_compute\_suitability(env\_factors, criteria)  
            suitability\_scores\[resto\_type\] \= score  
          
        \# Best match  
        best\_match \= max(suitability\_scores, key=suitability\_scores.get)  
          
        interpretation \= (  
            f"Restoration suitability assessment based on terrain, climate, and land cover analysis. "  
            f"Best suited for: {best\_match.replace('\_', ' ').title()} "  
            f"(score: {suitability\_scores\[best\_match\]}/100). "  
            f"Site factors: elevation {env\_factors\['elevation\_mean'\]:.0f}m, "  
            f"slope {env\_factors\['slope\_mean'\]:.1f}°, "  
            f"rainfall {env\_factors\['rainfall\_annual\_mm'\]:.0f}mm/year."  
        )  
          
        return AnalysisResult(  
            module\_name='RESTORATION\_SUITABILITY',  
            indicators={  
                \*\*{f'suitability\_{k.lower()}': v for k, v in suitability\_scores.items()},  
                'best\_suited\_type': best\_match,  
                'best\_suitability\_score': suitability\_scores\[best\_match\],  
            },  
            metadata={  
                'env\_factors': env\_factors,  
                'criteria': self.RESTORATION\_CRITERIA,  
            },  
            interpretation=interpretation,  
            risk\_flags=\[\],  
            datasets\_used=\[  
                'USGS/SRTMGL1\_003', 'GOOGLE/DYNAMICWORLD/V1',  
                'UCSB-CHG/CHIRPS/DAILY', 'COPERNICUS/S2\_SR\_HARMONIZED'  
            \],  
            confidence=0.6,  
        )  
      
    def \_compute\_suitability(self, factors, criteria) \-\> float:  
        score \= 100  
          
        \# Slope penalty  
        if factors\['slope\_mean'\] \> criteria\['slope\_max\_deg'\]:  
            overshoot \= factors\['slope\_mean'\] \- criteria\['slope\_max\_deg'\]  
            score \-= min(40, overshoot \* 4\)  
          
        \# Elevation penalty  
        if factors\['elevation\_mean'\] \> criteria\['elevation\_max\_m'\]:  
            score \-= 30  
          
        \# Rainfall penalty  
        if factors\['rainfall\_annual\_mm'\] \< criteria\['min\_rainfall\_mm'\]:  
            deficit\_pct \= (criteria\['min\_rainfall\_mm'\] \- factors\['rainfall\_annual\_mm'\]) / criteria\['min\_rainfall\_mm'\]  
            score \-= min(30, deficit\_pct \* 50\)  
          
        \# Water proximity bonus for water-dependent types  
        if criteria\['water\_proximity\_max\_km'\] \<= 5:  
            if factors\['ndwi\_mean'\] \> 0:  
                score \+= 10  \# Water present on site  
            elif factors\['ndwi\_mean'\] \< \-0.3:  
                score \-= 20  \# Very dry for water-dependent restoration  
          
        return round(max(0, min(100, score)), 1\)  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
\`\`\`

\#\#\# 6.12 Module 10: Ecosystem Trend Analysis Module

\`\`\`python  
\# modules/ecosystem\_trend\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class EcosystemTrendModule(BaseAnalysisModule):  
    """  
    Holistic ecosystem trend analysis combining all indicators  
    into a single Ecosystem Health Index (EHI) with trend.  
      
    Uses the latest 6-12 snapshots to compute trend.  
      
    EHI components:  
    \- Vegetation vigor (NDVI trend)  
    \- Moisture status (NDMI trend)  
    \- Surface water stability (NDWI/MNDWI)  
    \- Land cover diversity (Shannon index)  
    \- Bare soil trajectory  
    """  
      
    def \_\_init\_\_(self, geometry, date\_start, date\_end, project\_id, export\_path,  
                 historical\_snapshots: list \= None):  
        super().\_\_init\_\_(geometry, date\_start, date\_end, project\_id, export\_path)  
        self.snapshots \= historical\_snapshots or \[\]  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        if len(self.snapshots) \< 2:  
            return self.\_single\_point\_analysis()  
          
        \# Extract time series from snapshots  
        ndvi\_series \= \[(s\['imagery\_date'\], s.get('ndvi\_mean', 0)) for s in self.snapshots if s.get('ndvi\_mean') is not None\]  
        ndmi\_series \= \[(s\['imagery\_date'\], s.get('ndmi\_mean', 0)) for s in self.snapshots if s.get('ndmi\_mean') is not None\]  
        water\_series \= \[(s\['imagery\_date'\], s.get('water\_area\_percent', 0)) for s in self.snapshots if s.get('water\_area\_percent') is not None\]  
        bare\_series \= \[(s\['imagery\_date'\], s.get('bare\_land\_percent', 0)) for s in self.snapshots if s.get('bare\_land\_percent') is not None\]  
          
        \# Compute trends using simple linear regression  
        import numpy as np  
          
        def compute\_trend(series):  
            if len(series) \< 2:  
                return {'slope': 0, 'direction': 'INSUFFICIENT\_DATA'}  
            from datetime import datetime  
            days \= np.array(\[(datetime.fromisoformat(d) \- datetime.fromisoformat(series\[0\]\[0\])).days   
                            for d, \_ in series\])  
            values \= np.array(\[v for \_, v in series\])  
            if len(days) \< 2:  
                return {'slope': 0, 'direction': 'INSUFFICIENT\_DATA'}  
            coeffs \= np.polyfit(days, values, 1\)  
            slope\_per\_month \= float(coeffs\[0\]) \* 30  
            direction \= 'IMPROVING' if slope\_per\_month \> 0.002 else 'DECLINING' if slope\_per\_month \< \-0.002 else 'STABLE'  
            return {'slope\_per\_month': round(slope\_per\_month, 5), 'direction': direction}  
          
        ndvi\_trend \= compute\_trend(ndvi\_series)  
        ndmi\_trend \= compute\_trend(ndmi\_series)  
        water\_trend \= compute\_trend(water\_series)  
        bare\_trend \= compute\_trend(bare\_series)  
          
        \# Compute Ecosystem Health Index (EHI)  
        latest \= self.snapshots\[-1\]  
        ndvi\_score \= max(0, min(100, (latest.get('ndvi\_mean', 0\) \+ 0.2) / 1.0 \* 100)) \* 0.30  
        ndmi\_score \= max(0, min(100, (latest.get('ndmi\_mean', 0\) \+ 0.5) / 1.0 \* 100)) \* 0.20  
        green\_score \= min(100, latest.get('green\_cover\_percent', 0)) \* 0.25  
        bare\_penalty \= max(0, latest.get('bare\_land\_percent', 0)) \* 0.25  
          
        ehi \= round(ndvi\_score \+ ndmi\_score \+ green\_score \- bare\_penalty \+ 25, 1\)  \# Offset to center  
        ehi \= max(0, min(100, ehi))  
          
        \# Overall ecosystem trajectory  
        improving\_count \= sum(1 for t in \[ndvi\_trend, ndmi\_trend, bare\_trend\]   
                            if t.get('direction') \== 'IMPROVING')  
        declining\_count \= sum(1 for t in \[ndvi\_trend, ndmi\_trend, bare\_trend\]  
                            if t.get('direction') \== 'DECLINING')  
          
        if improving\_count \>= 2:  
            overall\_trajectory \= 'IMPROVING'  
        elif declining\_count \>= 2:  
            overall\_trajectory \= 'DECLINING'  
        else:  
            overall\_trajectory \= 'MIXED'  
          
        interpretation \= (  
            f"Ecosystem Health Index: {ehi}/100. Overall trajectory: {overall\_trajectory}. "  
            f"Vegetation trend: {ndvi\_trend.get('direction', 'N/A')} "  
            f"({ndvi\_trend.get('slope\_per\_month', 0):+.4f}/month). "  
            f"Moisture trend: {ndmi\_trend.get('direction', 'N/A')}. "  
            f"Bare soil trend: {bare\_trend.get('direction', 'N/A')}. "  
            f"Based on {len(self.snapshots)} monitoring snapshots."  
        )  
          
        return AnalysisResult(  
            module\_name='ECOSYSTEM\_TREND',  
            indicators={  
                'ecosystem\_health\_index': ehi,  
                'overall\_trajectory': overall\_trajectory,  
                'ndvi\_trend\_direction': ndvi\_trend.get('direction', 'N/A'),  
                'ndvi\_trend\_per\_month': ndvi\_trend.get('slope\_per\_month', 0),  
                'ndmi\_trend\_direction': ndmi\_trend.get('direction', 'N/A'),  
                'ndmi\_trend\_per\_month': ndmi\_trend.get('slope\_per\_month', 0),  
                'water\_trend\_direction': water\_trend.get('direction', 'N/A'),  
                'bare\_soil\_trend\_direction': bare\_trend.get('direction', 'N/A'),  
                'snapshots\_analyzed': len(self.snapshots),  
            },  
            metadata={  
                'ehi\_weights': {'ndvi': 0.30, 'ndmi': 0.20, 'green\_cover': 0.25, 'bare\_penalty': 0.25},  
                'trends': {  
                    'ndvi': ndvi\_trend,  
                    'ndmi': ndmi\_trend,  
                    'water': water\_trend,  
                    'bare': bare\_trend,  
                }  
            },  
            interpretation=interpretation,  
            risk\_flags=\[\],  
            datasets\_used=\['Derived from monitoring snapshots'\],  
            confidence=min(0.5 \+ len(self.snapshots) \* 0.05, 0.95),  
        )  
      
    def \_single\_point\_analysis(self):  
        """Fallback when only one snapshot or no history."""  
        return AnalysisResult(  
            module\_name='ECOSYSTEM\_TREND',  
            indicators={'snapshots\_analyzed': len(self.snapshots)},  
            metadata={}, quality\_score=0.3,  
            interpretation='Insufficient monitoring history for trend analysis. At least 2 snapshots required.',  
            datasets\_used=\[\]  
        )  
\`\`\`

\#\#\# 6.13 Module 11: Surface Temperature Module

\`\`\`python  
\# modules/surface\_temperature\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class SurfaceTemperatureModule(BaseAnalysisModule):  
    """  
    Land Surface Temperature (LST) analysis using MODIS LST products.  
      
    Dataset: MODIS/061/MOD11A2 (8-day composite, 1km resolution)  
      
    Why it matters for restoration:  
    \- Urban heat island effects  
    \- Vegetation cooling effect (restored areas should cool over time)  
    \- Drought/stress indicators  
    \- Seasonal thermal patterns  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        lst\_collection \= (  
            ee.ImageCollection('MODIS/061/MOD11A2')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .select('LST\_Day\_1km')  
        )  
          
        image\_count \= lst\_collection.size().getInfo()  
        if image\_count \== 0:  
            return self.\_empty\_result('No MODIS LST data available')  
          
        \# Convert from Kelvin \* 0.02 scale factor to Celsius  
        def to\_celsius(image):  
            return image.multiply(0.02).subtract(273.15).copyProperties(image, \['system:time\_start'\])  
          
        lst\_celsius \= lst\_collection.map(to\_celsius)  
          
        \# Mean composite  
        lst\_mean \= lst\_celsius.mean().clip(self.geometry)  
        lst\_stats \= self.\_zonal\_stats(lst\_mean, 'LST\_Day\_1km', scale=1000)  
          
        \# Also get night temperature for diurnal range  
        lst\_night \= (  
            ee.ImageCollection('MODIS/061/MOD11A2')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .select('LST\_Night\_1km')  
            .map(to\_celsius)  
            .mean()  
            .clip(self.geometry)  
        )  
        night\_stats \= self.\_zonal\_stats(lst\_night, 'LST\_Night\_1km', scale=1000)  
          
        day\_temp \= lst\_stats.get('LST\_Day\_1km\_mean', 0\)  
        night\_temp \= night\_stats.get('LST\_Night\_1km\_mean', 0\)  
        diurnal\_range \= day\_temp \- night\_temp  
          
        interpretation \= (  
            f"Mean daytime land surface temperature: {day\_temp:.1f}°C. "  
            f"Nighttime: {night\_temp:.1f}°C. Diurnal range: {diurnal\_range:.1f}°C. "  
        )  
          
        if day\_temp \> 40:  
            interpretation \+= "Extremely high surface temperatures detected — thermal stress likely impacting vegetation. "  
        elif day\_temp \> 35:  
            interpretation \+= "High surface temperatures — may contribute to water stress. "  
          
        if diurnal\_range \> 20:  
            interpretation \+= "Large diurnal temperature range suggests low vegetation/moisture buffering."  
          
        return AnalysisResult(  
            module\_name='SURFACE\_TEMPERATURE',  
            indicators={  
                'lst\_day\_mean\_c': round(day\_temp, 1),  
                'lst\_day\_min\_c': round(lst\_stats.get('LST\_Day\_1km\_min', 0), 1),  
                'lst\_day\_max\_c': round(lst\_stats.get('LST\_Day\_1km\_max', 0), 1),  
                'lst\_night\_mean\_c': round(night\_temp, 1),  
                'diurnal\_range\_c': round(diurnal\_range, 1),  
            },  
            metadata={  
                'dataset': 'MODIS/061/MOD11A2',  
                'resolution\_m': 1000,  
                'temporal\_composite': '8-day',  
                'images\_used': image\_count,  
            },  
            interpretation=interpretation,  
            risk\_flags=\[{'type': 'HEAT\_STRESS', 'severity': 'HIGH',  
                        'description': f'Daytime LST {day\_temp:.0f}°C exceeds stress threshold'}\] if day\_temp \> 40 else \[\],  
            datasets\_used=\['MODIS/061/MOD11A2'\],  
            confidence=0.7,  
        )  
      
    def \_empty\_result(self, reason):  
        return AnalysisResult(  
            module\_name='SURFACE\_TEMPERATURE', indicators={},  
            metadata={'error': reason}, quality\_score=0.0,  
            interpretation=f'LST analysis unavailable: {reason}', datasets\_used=\[\]  
        )  
\`\`\`

\#\#\# 6.14 Analysis Pipeline Orchestrator

\`\`\`python  
\# pipelines/monitoring\_analysis.py  
from modules.ndvi\_module import NDVIModule  
from modules.vegetation\_health\_module import VegetationHealthModule  
from modules.water\_moisture\_module import WaterMoistureModule  
from modules.flood\_analysis\_module import FloodAnalysisModule  
from modules.historical\_degradation\_module import HistoricalDegradationModule  
from modules.vegetation\_recovery\_module import VegetationRecoveryModule  
from modules.erosion\_indicator\_module import ErosionIndicatorModule  
from modules.biomass\_estimation\_module import BiomassEstimationModule  
from modules.restoration\_suitability\_module import RestorationSuitabilityModule  
from modules.ecosystem\_trend\_module import EcosystemTrendModule  
from modules.surface\_temperature\_module import SurfaceTemperatureModule

class MonitoringPipeline:  
    """  
    Orchestrates execution of all analysis modules for a monitoring cycle.  
      
    BASELINE pipeline: Runs ALL modules for initial assessment.  
    MONITORING pipeline: Runs core subset \+ recovery tracker.  
    """  
      
    BASELINE\_MODULES \= \[  
        'ndvi', 'vegetation\_health', 'water\_moisture', 'flood',  
        'historical\_degradation', 'erosion', 'biomass',   
        'restoration\_suitability', 'surface\_temperature'  
    \]  
      
    MONITORING\_MODULES \= \[  
        'ndvi', 'vegetation\_health', 'water\_moisture',  
        'vegetation\_recovery', 'biomass', 'surface\_temperature',  
        'ecosystem\_trend'  
    \]  
      
    def \_\_init\_\_(self, geometry\_geojson: dict, project\_id: str, export\_path: str):  
        self.geometry \= ee.Geometry.Polygon(geometry\_geojson\['coordinates'\])  
        self.project\_id \= project\_id  
        self.export\_path \= export\_path  
      
    def run\_baseline(self, date\_start: str, date\_end: str) \-\> dict:  
        """Run full baseline analysis."""  
        results \= {}  
        errors \= \[\]  
          
        for module\_name in self.BASELINE\_MODULES:  
            try:  
                module \= self.\_create\_module(module\_name, date\_start, date\_end)  
                result \= module.execute()  
                results\[module\_name\] \= result.\_\_dict\_\_  
            except Exception as e:  
                errors.append({'module': module\_name, 'error': str(e)})  
                results\[module\_name\] \= {'error': str(e)}  
          
        return {  
            'pipeline': 'BASELINE',  
            'results': results,  
            'errors': errors,  
            'modules\_completed': len(results) \- len(errors),  
            'modules\_failed': len(errors),  
        }  
      
    def run\_monitoring(self, date\_start: str, date\_end: str,  
                        baseline\_snapshot: dict \= None,  
                        historical\_snapshots: list \= None) \-\> dict:  
        """Run periodic monitoring analysis."""  
        results \= {}  
        errors \= \[\]  
          
        for module\_name in self.MONITORING\_MODULES:  
            try:  
                module \= self.\_create\_module(  
                    module\_name, date\_start, date\_end,  
                    baseline\_snapshot=baseline\_snapshot,  
                    historical\_snapshots=historical\_snapshots  
                )  
                result \= module.execute()  
                results\[module\_name\] \= result.\_\_dict\_\_  
            except Exception as e:  
                errors.append({'module': module\_name, 'error': str(e)})  
                results\[module\_name\] \= {'error': str(e)}  
          
        return {  
            'pipeline': 'MONITORING',  
            'results': results,  
            'errors': errors,  
            'modules\_completed': len(results) \- len(errors),  
            'modules\_failed': len(errors),  
        }  
      
    def \_create\_module(self, name, date\_start, date\_end, \*\*kwargs):  
        common\_args \= (self.geometry, date\_start, date\_end, self.project\_id, self.export\_path)  
          
        MODULE\_MAP \= {  
            'ndvi': lambda: NDVIModule(\*common\_args),  
            'vegetation\_health': lambda: VegetationHealthModule(\*common\_args),  
            'water\_moisture': lambda: WaterMoistureModule(\*common\_args),  
            'flood': lambda: FloodAnalysisModule(\*common\_args),  
            'historical\_degradation': lambda: HistoricalDegradationModule(\*common\_args, lookback\_years=7),  
            'erosion': lambda: ErosionIndicatorModule(\*common\_args),  
            'biomass': lambda: BiomassEstimationModule(\*common\_args),  
            'restoration\_suitability': lambda: RestorationSuitabilityModule(\*common\_args),  
            'surface\_temperature': lambda: SurfaceTemperatureModule(\*common\_args),  
            'vegetation\_recovery': lambda: VegetationRecoveryModule(  
                \*common\_args, baseline\_snapshot=kwargs.get('baseline\_snapshot')  
            ),  
            'ecosystem\_trend': lambda: EcosystemTrendModule(  
                \*common\_args, historical\_snapshots=kwargs.get('historical\_snapshots')  
            ),  
        }  
          
        return MODULE\_MAP\[name\]()  
\`\`\`

\---

