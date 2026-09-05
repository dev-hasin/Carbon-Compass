---
kind: external_dependency
name: Alibaba Cloud Model Studio — Qwen vision + text LLM
slug: alibaba-cloud-model-studio-qwen
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

Carbon Compass calls Alibaba Cloud's Model Studio (DashScope) compatible-mode Chat Completions endpoint at `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` using a Bearer token from `QWEN_API_KEY`. Two models are used: `qwen-vl-max` for satellite image vision analysis and `qwen-max` for ESG disclosure text analysis and discrepancy detection. When no key is configured the service falls back to deterministic mock responses so the pipeline runs without credentials. The response is parsed as JSON (with markdown-fenced code-block stripping) and validated against expected fields before being passed into scoring.