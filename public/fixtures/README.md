# Recognition fixtures

These images are bundled for reproducible live vision checks. They are never automatic demo responses. Upload them through **Upload item photos** in `/pack` after resetting the session.

| File | Expected recognition attributes | Source/license |
| --- | --- | --- |
| pump-bottle.jpg | Exactly one dark pump bottle, category bottle, positive dimensions, source photo retained. Suitable for the genuine live photo-to-plan smoke journey. | Crop of cosmetics.jpg (230 × 590, offset X490/Y70) showing the right bottle. Same author and CC BY-SA 4.0; crop is the only modification. |
| foam-bottle.jpg | A dark foam-pump bottle with translucent cap, category bottle, distinct from the liquid-pump bottle above. A partly occluded jar edge may yield another proposal. | Crop of cosmetics.jpg (190 × 590, offset X315/Y70) showing the central bottle. Same author and CC BY-SA 4.0; crop is the only modification. |
| cosmetics.jpg | At least one black/dark cosmetic bottle, category bottle; another black jar/container may be proposed separately as other/bottle. Positive finite dimensions; source association retained. Do not require an exact model-generated label or absolute dimensions. | [Black cosmetic plastic bottle](https://commons.wikimedia.org/wiki/File:Black_cosmetic_plastic_bottle.jpg), Plasticbottlesupplier, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), original JPEG unchanged. |
| water-bottle.png | One transparent/blue-tinted bottle with blue cap, category bottle; positive finite dimensions. This is a stock digital illustration, not a real-object photograph. | [Empty plastic bottle](https://commons.wikimedia.org/wiki/File:Empty_plastic_bottle.png), KDADA / Pixabay, [CC0](https://creativecommons.org/publicdomain/zero/1.0/), original PNG unchanged. |
| corrupt-photo.jpg | Deliberately invalid JPEG payload. Analysis must produce a recoverable error while another valid photo succeeds; it is not recognition evidence. | Repository-created test data. |

The original cosmetics photograph contains four objects (tube, jar, two pump bottles). Live recognition may miss a small or partly occluded object; review and add it manually. API smoke observed two bottles plus the tube and missed the jar. The isolated pump crop returned exactly one dark bottle. These observations are separate from browser journey validation.

The `demoItems()` fixture in src/lib/domain.ts is a separate deterministic nine-item inventory. It needs no credentials and is explicitly labeled Demo inventory. Passing its regressions does not establish live vision success. Recognition cannot establish physical dimensions; a real packing trial remains a separate validation activity.
