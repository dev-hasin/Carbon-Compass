---
kind: external_dependency
name: OpenCage Geocoder — address/company name → coordinates
slug: opencage-geocoder
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

Geocoding uses OpenCage (configured via `GEOCODING_API_KEY`). When no key is set the service returns pre-set Pakistani coordinates for known demo locations, keeping the full pipeline runnable in mock mode. The geocoder is only invoked when the user supplies a company name or address rather than raw GPS coordinates.