---
kind: external_dependency
name: Sentinel Hub — Sentinel-2 optical imagery via Process API
slug: sentinel-hub
category: external_dependency
category_hints:
    - sdk_real_api
    - client_constraint
scope:
    - '**'
---

Satellite imagery is fetched through Sentinel Hub's OAuth client_credentials flow (`/oauth/token`) followed by a POST to `/api/v1/process` requesting a 512×512 RGB PNG of `sentinel-2-l2a` over a small bbox around the target coordinates. An evalscript extracts bands B04/B03/B02 with a simple scaling factor. If authentication or the process call fails the service returns an `insufficient_data` result and writes a locally generated synthetic image instead. Credentials come from `SENTINEL_HUB_CLIENT_ID` / `SENTINEL_HUB_CLIENT_SECRET`.