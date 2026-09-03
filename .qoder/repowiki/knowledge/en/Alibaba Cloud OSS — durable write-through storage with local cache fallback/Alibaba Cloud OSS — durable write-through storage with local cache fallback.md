---
kind: external_dependency
name: Alibaba Cloud OSS — durable write-through storage with local cache fallback
slug: alibaba-cloud-oss
category: external_dependency
category_hints:
    - vendor_identity
    - migration_status
scope:
    - '**'
---

Storage is local-first: every analysis JSON and satellite image is written to `data/analyses` and `data/satellite` on disk. When `ALIBABA_OSS_*` credentials and the `oss2` SDK are present, each write is also uploaded to OSS under `analyses/<id>.json` and `satellite/<filename>` prefixes; reads always hit the local cache first and fall back to OSS if the local copy was deleted. This write-through pattern means the demo runs fully offline while production can persist artifacts durably. Health reporting reflects the actual mode (`local_cache` vs live). Keys are `ALIBABA_OSS_ACCESS_KEY_ID`, `ALIBABA_OSS_ACCESS_KEY_SECRET`, `ALIBABA_OSS_BUCKET_NAME`, `ALIBABA_OSS_ENDPOINT`.