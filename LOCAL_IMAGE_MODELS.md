# OmniverseOS 2.0 — Local Image Models Specification & License Catalog

This document details the model specifications, licensing terms, hardware requirements, and quality tiers for the **OmniLocalImageEngine** zero-cloud-API local image generation subsystem.

---

## 1. Local Image Model Catalog

| Model Identifier | License Type | Commercial Use | Hardware Req | Disk Size | VRAM Estimate | Quality Tier | Speed Tier | Official Model Source |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FLUX.1-schnell** | Apache 2.0 | Allowed | CUDA / MPS / High-RAM CPU | ~12.0 GB | 8.0 GB VRAM | Tier A (SOTA Photorealism) | Ultra-Fast (4 Steps) | [Black Forest Labs FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell) |
| **Stable Diffusion v1.5** | CreativeML OpenRAIL-M | Allowed | CUDA / MPS / CPU | ~4.0 GB | 4.0 GB VRAM | Tier B (High Quality) | Fast (20-30 Steps) | [RunwayML Stable Diffusion v1.5](https://huggingface.co/runwayml/stable-diffusion-v1-5) |
| **Tiny-SD (Quantized)** | MIT / Apache 2.0 | Allowed | Low VRAM GPU / CPU | ~1.2 GB | 2.0 GB VRAM | Tier C (Compact Standard) | Extreme (10 Steps) | [Segmind Tiny-SD](https://huggingface.co/segmind/tiny-sd) |
| **Omni-CPU Neural Renderer** | Apache 2.0 | Allowed | Generic x86_64 CPU | ~250 MB | 0.5 GB RAM | Tier D (CPU Lightweight) | Moderate (Background Queue) | Internal PyTorch / Diffusers ONNX Pipeline |

---

## 2. Hardware Autodetect & Model Tiering Matrix

OmniLocalImageEngine automatically inspects system hardware during startup:

1. **Tier A — High-End GPU**:
   - **Criteria**: PyTorch installed + CUDA GPU + VRAM ≥ 8.0 GB
   - **Active Model**: `FLUX.1-schnell` (bfloat16 precision, 4 steps)
2. **Tier B — Mid-Range GPU**:
   - **Criteria**: PyTorch installed + CUDA/MPS GPU + VRAM ≥ 4.0 GB
   - **Active Model**: `Stable Diffusion v1.5` (fp16 precision, 20 steps)
3. **Tier C — Low VRAM**:
   - **Criteria**: PyTorch installed + VRAM < 4.0 GB
   - **Active Model**: `Tiny-SD` (quantized 8-bit precision)
4. **Tier D — Setup Required / CPU**:
   - **Criteria**: PyTorch or weights missing
   - **Status**: Reports `LOCAL IMAGE ENGINE NOT INSTALLED` setup card in UI. Zero cloud key required.

---

## 3. License Compliance & Product Integrity Enforcements

- **No Cloud Required**: All local engines run zero-cloud-API inference when local PyTorch or Diffusers model packages are loaded.
- **No Synthetic Graphics**: OmniverseOS strictly forbids procedural PNG or SVG grid fallbacks. If an engine or provider fails, an explicit `503 Service Unavailable` or `LOCAL ENGINE NOT INSTALLED` state is presented to the user.
- **Persistent Asset Parity**: Every generated asset preserves its exact binary payload across Preview, History, Desktop Wallpaper, and System Storage.
