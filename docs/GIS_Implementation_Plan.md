# NEVARA — Geospatial Verification Layer
## Production Implementation Plan

**Prepared by:** Tahir Tamam, Lead Engineer  
**Date:** April 2026  
**Classification:** Internal — Engineering  
**Coexists with:** NEVARA MRV System (mrv-service/)

---

## What This Document Is

This document defines the complete, production-grade implementation plan for the NEVARA Geospatial Verification Layer — an automated satellite intelligence system that takes a user-drawn land boundary and tells you, with scientific certainty, whether the ecosystem the contributor claims actually exists there.

It is written for developers. Every instruction specifies exact file paths, service boundaries, database changes, and integration points within the current NEVARA codebase. Nothing in the existing live platform is broken or replaced.

---

## The Core Idea in One Line

**Polygon → Satellite Data → ML Segmentation → Percentage Coverage → Verified or Rejected**

A contributor draws a boundary on the map and says "this is mangrove land." The geospatial layer fetches real satellite imagery for that exact polygon, runs a machine learning segmentation model across it, calculates what percentage of the area is actually mangrove versus water, soil, or other vegetation, and returns a verdict — verified or flagged.

---

## Why This Coexists With MRV (Not Replaces It)

The MRV system you already built measures how healthy the vegetation is over time. It answers the question: "Is this ecosystem getting better or worse?"

The Geospatial Verification Layer answers a different, earlier question: "Is this ecosystem what the contributor claims it is?"

They run at different points in the project lifecycle.

The Geospatial Layer runs once, at the moment a project is submitted. It is the first gate — a snapshot classification of what exists in the polygon right now.

The MRV system runs continuously, every month after approval. It tracks change over time.

Together they form a complete verification chain. No existing project can claim to be a mangrove and pass both gates unless satellite data confirms it — at submission and over time.

---

## How It Fits Into the Existing Platform

The geospatial layer is a new standalone Python service. It sits alongside the MRV service you already built. It does not touch the Node.js backend except through two new API routes. It does not touch the frontend except through one new component.

Here is the full system with the new layer added:

```
Contributor draws polygon in browser (Leaflet — already live)
         |
         | Project submitted
         v
Node.js Backend (server/routes.ts — existing)
         |
         |--- Triggers MRV Service (port 8001 — already built)
         |
         |--- Triggers GEO Service (port 8002 — NEW)
                    |
                    v
         Sentinel-2 Satellite API (Google Earth Engine)
                    |
                    v
         Image Preprocessing (clip, normalize, compute NDVI/NDWI)
                    |
                    v
         ML Segmentation Model (U-Net — classifies every pixel)
                    |
                    v
         Aggregation (pixel counts → area percentages)
                    |
                    v
         Verification Logic (does the dominant class match the claim?)
                    |
                    v
         Result written to database + webhook to Node.js backend
                    |
                    v
         Verifier sees classification result alongside MRV score
```

---

## What the System Does NOT Do

It is important to be clear about this before building.

It does not classify land from a simple photo or RGB image. Classification from RGB alone is unreliable and scientifically invalid for carbon credit verification. The system uses multi-band satellite imagery — specifically bands B2, B3, B4, B8, B11, and B12 from Sentinel-2 — because different vegetation types have distinct signatures across these bands that are invisible to the naked eye.

It does not use a large language model. It uses a semantic segmentation neural network, which is a computer vision model that assigns a class label to every pixel in an image.

It does not replace human verifiers. It gives verifiers a scientifically grounded breakdown before they make their decision. The human remains in the loop.

It does not run continuously. It is a one-time snapshot at project submission. The MRV service handles ongoing monitoring.

---

## Output the System Must Produce

For every submitted project, the system must produce one structured result that gets stored in the database and displayed to the verifier.

```
{
  "project_id": 42,
  "ecosystem_breakdown": {
    "mangrove": "68%",
    "water": "12%",
    "other_vegetation": "15%",
    "soil_bare": "5%"
  },
  "claimed_type": "mangrove",
  "verification_status": "verified",
  "confidence_score": 0.87,
  "dominant_class": "mangrove",
  "threshold_met": true,
  "classification_map_url": "https://storage.googleapis.com/nevara-bucket/geo/42/mask.png",
  "report_url": "https://storage.googleapis.com/nevara-bucket/geo/42/report.pdf",
  "input_hash": "sha256_of_polygon_and_bands",
  "scored_at": "2026-04-25T10:30:00Z"
}
```

The verification threshold is 50 percent. If the claimed ecosystem type covers more than 50 percent of the polygon area, the project is verified. Below 50 percent, it is flagged for review. Below 30 percent, it is rejected automatically.

---

## Repository Structure — Where to Create Files

The geospatial service lives in a new top-level folder called geo-service. It sits at the same level as the existing mrv-service, client, and server folders. Nothing inside those existing folders is created or deleted as part of this plan.

```
BLUECARBONPROJECT-main/
├── client/              (existing — do not touch)
├── server/              (existing — additive changes only)
├── mrv-service/         (existing — do not touch)
├── migrations/          (existing — add one new file here)
│
└── geo-service/         (CREATE THIS — new standalone service)
    ├── main.py
    ├── config.py
    ├── satellite_fetch.py
    ├── preprocessor.py
    ├── segmentation_model.py
    ├── aggregator.py
    ├── verification_engine.py
    ├── report_generator.py
    ├── audit_logger.py
    ├── database.py
    ├── requirements.txt
    ├── models/
    │   └── unet_mangrove_v1.pt   (downloaded pretrained weight)
    ├── templates/
    │   └── geo_report.html
    └── tests/
        ├── test_aggregator.py
        └── test_verification.py
```

---

## Database Changes — New Tables Only

Run this as a new Drizzle migration. File goes in the migrations folder with the name 0005_geo_verification.sql. Do not alter any existing table.

### Table 1 — geo_satellite_bands

Stores the raw band data retrieved for each project. This is the audit record of exactly what satellite data was used.

Each row records which project was analysed, when the imagery was captured, which bands were retrieved, the percentage of cloud cover in the image at that time, and the full response from Google Earth Engine stored as JSON for audit purposes.

The polygon geometry is stored using PostGIS, which is already enabled from the MRV migration.

### Table 2 — geo_classifications

Stores the pixel-level classification results and the final verification decision.

Each row records the project ID, when the classification was run, the breakdown of ecosystem classes as percentages stored in a JSON column, the dominant class identified, the confidence score produced by the model, whether the dominant class matched the contributor's claim, whether the coverage threshold was met, the final verification status, URLs for the generated classification map image and PDF report, and the SHA-256 hashes of both the inputs and outputs for audit integrity.

### Table 3 — geo_audit_log

Identical in structure to the mrv_audit_log you already built. Append-only. Revoke UPDATE and DELETE permissions after creation. This table records every event in the geospatial pipeline in sequence, with each row hashed and linked to the previous row to form a tamper-evident chain.

---

## Service Files — What Each One Does

### config.py

Reads environment variables. Uses the same .env file at the project root as the MRV service. You only need to append new keys — you do not replace or modify any existing ones.

New environment variables to add to the existing .env:

- GEO_SERVICE_PORT set to 8002
- GEE_SERVICE_ACCOUNT — same value as already added for MRV
- GEE_PRIVATE_KEY_FILE — same value as already added for MRV
- GCS_BUCKET — same value as already used by MRV
- GEO_MODEL_PATH pointing to geo-service/models/unet_mangrove_v1.pt
- GEO_VERIFICATION_THRESHOLD set to 50 (the percentage cutoff for verified status)
- GEO_REJECTION_THRESHOLD set to 30 (automatic rejection below this)
- GEO_INTERNAL_SECRET — a new random string for webhook authentication

### satellite_fetch.py

Handles communication with Google Earth Engine. Takes a GeoJSON polygon and returns multi-band image tiles for that area. The bands to retrieve are B2, B3, B4, B8, B11, and B12 from the Sentinel-2 Surface Reflectance harmonised collection.

The fetch filters the collection to images with less than 20 percent cloud cover. It takes the most recent cloud-free composite available, ideally within the past 90 days. If no image is available within 90 days, it extends to 180 days and records a data quality flag.

The function returns the band arrays as a NumPy tensor along with metadata including capture date, actual cloud cover percentage, and the number of valid pixels in the polygon.

### preprocessor.py

Takes the raw band tensor from the satellite fetch and prepares it for the segmentation model.

The steps are: clip the image to the exact polygon boundary so no data outside the contributor's drawn area is included; normalise each band to a zero-to-one range based on the documented Sentinel-2 reflectance limits; compute NDVI from bands B8 and B4 using the formula (B8 minus B4) divided by (B8 plus B4); compute NDWI from bands B3 and B8 using (B3 minus B8) divided by (B3 plus B8), which helps distinguish water from vegetation; stack all bands plus the two indices into a single multi-channel tensor ready for the model.

The output is a tensor with eight channels: B2, B3, B4, B8, B11, B12, NDVI, and NDWI.

### segmentation_model.py

Loads and runs the U-Net segmentation model. U-Net is the standard architecture for semantic segmentation of satellite imagery. It was originally designed for biomedical image segmentation and has been widely adopted for remote sensing because it works well with small training datasets and produces clean, spatially accurate outputs.

The model takes the eight-channel preprocessed tensor and produces a pixel-wise classification mask. Each pixel is assigned one of five classes: mangrove, seagrass, saltmarsh, water, or other. The other class covers soil, bare ground, urban areas, and non-coastal vegetation.

The model also produces a confidence score for each pixel, which is the probability assigned to the winning class. The overall scene confidence score is the mean confidence across all classified pixels.

For the initial deployment, use a pretrained U-Net weight trained on the DeepGlobe Land Cover dataset and fine-tuned on the Global Mangrove Watch dataset. Both are publicly available and free. The weight file is approximately 120 megabytes and is stored in the models folder.

In a later phase, the model can be fine-tuned on Karnataka coastline data once ground truth labels are collected from the Mangalore pilot site.

### aggregator.py

Converts the pixel-wise classification mask into meaningful statistics.

The aggregator counts the total number of valid pixels in the polygon, then counts the pixels assigned to each class. It divides class pixel counts by the total to get percentage coverage. It identifies the dominant class — the one with the highest percentage. It returns the full breakdown dictionary.

This is the layer that produces the numbers that actually matter to the business. The ML model does the science. The aggregator translates it into something a verifier, investor, or regulator can read.

### verification_engine.py

Applies the business logic to the aggregation results. This layer is where NEVARA's specific rules live.

The engine takes the aggregated breakdown and the contributor's claimed ecosystem type. It checks whether the claimed type is present in the breakdown at all. It checks whether the claimed type is the dominant class. It compares the percentage of the claimed type against the verification threshold and the rejection threshold.

The output is a structured verification result with four possible statuses: verified, flagged, and rejected. Verified means the claimed type covers more than 50 percent of the polygon. Flagged means it covers between 30 and 50 percent — a human verifier must review it. Rejected means it covers less than 30 percent — the claim is scientifically inconsistent with what the satellite shows.

The engine also writes a human-readable explanation of the decision, such as "Mangrove coverage of 68% exceeds the 50% verification threshold. Claim is consistent with satellite data."

### report_generator.py

Generates a PDF report for the verifier and the contributor. The report includes the polygon location on a map, the classification mask rendered as a colour-coded overlay image, the percentage breakdown as a chart, the verification decision and confidence score, the satellite data source and capture date, and the SHA-256 hash of inputs and outputs for audit.

The report is generated using WeasyPrint and a Jinja2 HTML template, identical to the approach used in the MRV report generator. The finished PDF is uploaded to the existing GCS bucket under a geo-reports path and the URL is stored in the geo_classifications table.

### audit_logger.py

Works identically to the MRV audit logger. Records every pipeline event — satellite fetch triggered, preprocessing complete, model run complete, aggregation complete, verification decision made, report generated — as an append-only row in geo_audit_log. Each row includes the full inputs and outputs as JSON, a SHA-256 hash of the payload, and a reference to the hash of the previous row.

---

## Node.js Backend Integration — Additive Changes Only

Add these changes to server/routes.ts. Do not modify any existing route.

### New Route 1 — Trigger Geospatial Verification

This route is called when a project is submitted. It fires alongside the existing MRV trigger. Both are non-blocking — project submission succeeds regardless of whether either service is reachable.

The route accepts the project ID, the GeoJSON polygon from the contributor's map drawing, the claimed ecosystem type, and the area in hectares. It sends these to the geo service running on port 8002 and returns a job ID immediately. The actual classification runs in the background.

### New Route 2 — Webhook Receiver

When the geospatial pipeline finishes, the geo service calls this route to deliver the result. The route verifies the internal secret header, saves the classification result to the database using a new storage method, updates the project's geo status to complete, and writes an audit log entry.

### New Route 3 — Get Classification Result

Returns the latest geospatial classification for a given project ID. Used by the verifier dashboard to display the result.

### Modification to Existing Project Submission Route

Find the existing project submission route in server/routes.ts. After the project is created and the MRV trigger is fired, add a second fire-and-forget call to the geo service. It must be non-blocking. If the geo service is offline, project submission still succeeds and the geo status shows as pending.

---

## Frontend Integration — New Component Only

Create one new React component: geo-classification-card.tsx in client/src/components/.

This component fetches the geospatial result for a given project ID and displays it in the verifier dashboard. It shows the percentage breakdown as a horizontal bar chart using the existing Recharts library. It shows the verification status as a coloured badge — green for verified, amber for flagged, red for rejected. It shows the confidence score. It shows a thumbnail of the classification map image. It provides a link to the full PDF report.

Add this component to the verifier dashboard below the existing MRV score section. Add it to the project detail view visible to contributors so they can see what the satellite found on their land.

Do not add it to the public marketplace. Classification data is internal — it informs verifiers, not buyers. Buyers see the final verified or unverified status only.

---

## Deployment — Running as a Third PM2 Process

The geo service runs on port 8002 as a third process alongside the existing nevara-backend on port 5000 and the existing nevara-mrv on port 8001.

Update the existing ecosystem.config.js file by adding a new app entry for nevara-geo. The script is uvicorn, the args are main:app with host 0.0.0.0 and port 8002 and two workers, the cwd is ./geo-service, the interpreter is python3. Set autorestart to true and max memory restart to 768 megabytes because the ML model keeps weights in memory.

Port 8002 must not have an inbound rule in the AWS security group. It is accessible only from localhost, exactly like the MRV service on port 8001.

---

## ML Model — Where to Get It and How to Use It

### Phase 1 Model (Use This Now)

Use a U-Net pre-trained on the Global Mangrove Watch dataset combined with the DeepGlobe Land Cover Challenge dataset. Both are publicly available.

The Global Mangrove Watch is produced by JAXA (Japan Aerospace Exploration Agency) and provides annual global mangrove maps from 1996 to present. It is used as ground truth for the mangrove class.

The DeepGlobe dataset provides additional classes including water, urban, agriculture, rangeland, and forest.

A combined weight fine-tuned on Sentinel-2 imagery is available from the following research repositories on Hugging Face and GitHub: search for "mangrove segmentation sentinel-2 unet" to find current openly available weights. Place the downloaded .pt file in geo-service/models/unet_mangrove_v1.pt.

This Phase 1 model is good enough for the pilot. It will produce reliable results for mangrove classification because mangroves have a very distinct spectral signature, particularly in the near-infrared band (B8) and the SWIR bands (B11, B12).

### Phase 2 Model (Build This Later)

After six months of operation on the Mangalore pilot, you will have ground truth labels from the actual pilot site. Fine-tune the Phase 1 weights on this Karnataka-specific data. This will produce a model that is specifically calibrated for the spectral characteristics of Indian coastal mangroves and will improve accuracy from the expected Phase 1 range of 78 to 85 percent to a target of 88 to 94 percent.

Fine-tuning can be done on a free Google Colab GPU instance using PyTorch. The training dataset does not need to be large. Fifty to one hundred labelled patches from the pilot site are sufficient for fine-tuning.

---

## Verification Thresholds — Scientific Basis

The 50 percent threshold for verified status is derived from the Green Credit Rules 2025, which require 40 percent canopy density as a minimum threshold for credit issuance. A 50 percent coverage threshold at the polygon level is a conservative interpretation that gives a 10 percent safety margin above the regulatory requirement.

The 30 percent threshold for automatic rejection is the point below which a claim of a specific ecosystem type is scientifically inconsistent. A polygon where the claimed type covers less than 30 percent of the area is more likely to be mislabelled, fraudulently submitted, or at a stage of degradation that disqualifies it from carbon credit consideration.

These thresholds are configurable through environment variables. They are not hardcoded in the verification engine. If regulatory guidance changes or if the NEVARA team decides to adjust them based on pilot data, they can be updated without touching code.

---

## How the Two Services (MRV and GEO) Work Together

When a contributor submits a project, both services are triggered simultaneously.

The geo service runs first in terms of what matters most to the verifier — it answers whether the ecosystem exists. The MRV service runs alongside it — it answers how healthy the ecosystem currently is.

When the verifier opens a project for review, they see both results on the same screen:

On the left side, the geospatial classification card shows what the land actually contains, with a percentage breakdown and a verification status.

On the right side, the MRV score card shows the vegetation health index, the NDVI trend, and the carbon credit estimate.

A project passes through the verification workflow only when both results are present and both are satisfactory. If the geo layer rejects a project because the land is less than 30 percent mangrove, the verifier cannot approve it regardless of the NDVI score. If the MRV score is low because the vegetation is degraded, the verifier is informed even if the geo layer confirms the ecosystem type.

This is the full trust architecture. It is what separates NEVARA from a listing platform.

---

## Phased Build Plan

### Phase 1 — Service Skeleton and Database

Create the geo-service directory and all empty file stubs. Install requirements. Write config.py reading from the existing .env file. Run the database migration to create the three new tables. Write a basic health endpoint. Verify the service starts with PM2 and responds on port 8002.

This phase is complete when: pm2 status shows nevara-geo running, a browser request to localhost:8002/health returns a success response, and the three new database tables exist in the production PostgreSQL instance.

### Phase 2 — Satellite Fetch and Preprocessing

Write satellite_fetch.py and test it with the Gurupur Estuary polygon coordinates hardcoded as a test input. Verify that Sentinel-2 band arrays are returned and contain real reflectance values. Write preprocessor.py and verify that the NDVI values computed for the mangrove test polygon fall in the expected range of 0.5 to 0.9 for healthy mangroves.

This phase is complete when: a test call to the satellite fetch function returns a valid multi-band tensor for the Mangalore pilot polygon, and computed NDVI values match the expected scientific range for the claimed ecosystem type.

### Phase 3 — Model Integration

Download the pretrained U-Net weights. Write segmentation_model.py and test it with the preprocessed tensor from Phase 2. Verify that the output mask has the correct dimensions and that the pixel classes are plausible for the test polygon. Write aggregator.py and verify that percentages sum to 100.

This phase is complete when: running the full pipeline from polygon to percentage breakdown produces a result where mangrove is the dominant class for the Gurupur Estuary test polygon.

### Phase 4 — Verification Engine and Report

Write verification_engine.py and test it with both a case that should be verified and a case that should be rejected. Write report_generator.py and verify that the PDF is generated, uploaded to GCS, and publicly accessible. Connect the full pipeline together in main.py.

This phase is complete when: a test HTTP call to the geo service trigger endpoint with the Mangalore pilot polygon returns a job ID and within three minutes produces a PDF report accessible via a GCS URL.

### Phase 5 — Node.js and Frontend Integration

Add the three new routes to server/routes.ts. Add the fire-and-forget geo trigger to the existing project submission route. Create the geo-classification-card.tsx React component. Add it to the verifier dashboard. Test the full end-to-end flow: contributor submits project, both services trigger, verifier sees both MRV score and geo classification on the same screen.

This phase is complete when: submitting a test project through the contributor dashboard results in both an MRV score and a geo classification appearing in the verifier dashboard within five minutes, with no errors in any PM2 log.

---

## Cost — Keeping It Free for MVP

Google Earth Engine is free for research and development use. You already have a service account configured for the MRV service. Use the same account for the geo service.

The pretrained U-Net model is open-source and free. Running inference on CPU for a single project polygon takes approximately 20 to 45 seconds depending on polygon size. This is acceptable for the MVP given that projects are not submitted in high volume. If inference speed becomes an issue at scale, move the model to a GPU EC2 instance or use AWS SageMaker for inference.

WeasyPrint, Jinja2, NumPy, and all other Python dependencies are open-source and free.

GCS storage for classification maps and reports is effectively free at pilot scale. An average classification map image is approximately 200 kilobytes and an average report PDF is approximately 500 kilobytes. At 100 projects per year, total storage cost is under one dollar.

---

## Implementation Safety Rules

Do not modify any file in client, server, or mrv-service during this build. Every change to the live system is additive — new routes, new components, new environment variables, one new PM2 app.

Do not make the geo service synchronous with project submission. It must always be fire-and-forget. If the geo service is offline, contributors can still submit projects. Projects show a geo status of pending until the classification completes.

Do not hardcode thresholds in the verification engine. They must be read from environment variables so they can be adjusted without a code deployment.

Do not store raw band arrays in the database. Store only metadata — the GCS URL of the processed tiles, the source collection, the capture date, and the cloud cover percentage. Raw arrays are large and do not need to be in PostgreSQL.

Do not run the segmentation model on the full Earth Engine image. Always clip to the exact polygon boundary first. Running on the clipped region reduces computation time and ensures the classification is specific to the contributor's land, not surrounding areas.

---

## The Investor Statement After This is Built

Before this system: "We verify that the contributor's land is the ecosystem they claim using expert human review."

After this system: "When a contributor draws a polygon on our map and claims it is mangrove land, our geospatial engine retrieves Sentinel-2 satellite imagery for that exact boundary, runs a semantic segmentation model across all six spectral bands, classifies every pixel in the polygon, and tells the verifier what percentage of the area is actually mangrove, water, soil, and other vegetation — before a human reviews anything. A contributor cannot submit fraudulent land claims that survive satellite scrutiny."

That is the difference between a carbon registry and a trusted carbon infrastructure platform.

---

*NEVARA BlueCarbon Ledger — Geospatial Verification Layer Implementation Plan — Tahir Tamam — April 2026*
