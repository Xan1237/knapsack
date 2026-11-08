"""Import native (mm, Z up) collections and the older cm / Y-up collection format."""

from pydantic import BaseModel, Field

from .domain import (
    CATEGORIES,
    PERMUTATIONS,
    SUITCASE_IDS,
    ApiModel,
    Item,
    Suitcase,
    create_item_fields,
)

_AXIS_SWAP = (0, 2, 1)
_DEFAULT_UPRIGHT = [[0, 1, 2], [2, 1, 0]]
_DEFAULT_ANY = [[0, 1, 2], [2, 1, 0], [0, 2, 1], [1, 2, 0], [1, 0, 2], [2, 0, 1]]


class PhotoRecord(ApiModel):
    """Exports omit images; `url` is present only when importing a web-app export."""

    id: str
    name: str
    url: str = Field(
        default="",
        max_length=9_000_000,
        pattern=r"^(data:image/(jpeg|png|webp);base64,|$)",
    )
    status: str = Field(pattern=r"^(queued|analyzing|done|error)$")
    request_id: str
    accepted: bool
    error: str | None = None


class RawCollection(BaseModel):
    items: list[dict] = Field(max_length=80)
    bag: dict | None = None
    customBag: dict | None = None
    bagId: str | None = None
    units: str | None = None
    upAxis: str | None = None
    photos: list[PhotoRecord] | None = Field(default=None, max_length=12)


def _cm_to_native(value) -> list[float]:
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError("Expected three dimensions.")
    d = [float(n) for n in value]
    return [d[0] * 10, d[2] * 10, d[1] * 10]


def import_collection(data: dict) -> dict:
    raw = RawCollection.model_validate(data)
    legacy = bool(raw.bag) and raw.units != "mm"
    if raw.units == "mm" and raw.upAxis and raw.upAxis != "z":
        raise ValueError("Millimeter collections must declare upAxis z.")
    custom_bag: Suitcase | None = None
    supplied = raw.bag or raw.customBag
    bag_id = raw.bagId or "cabin"
    if supplied:
        source_id = str(supplied.get("id") or "collection")
        fields = {
            **supplied,
            "id": source_id if source_id.startswith("import-") else f"import-{source_id}",
            "name": supplied.get("name") or "Your bag",
            "subtitle": "Imported collection",
            "dimensions": _cm_to_native(supplied.get("dimensions"))
            if legacy
            else supplied.get("dimensions"),
            "clearance": float(supplied.get("clearance") or 0) * 10
            if legacy
            else supplied.get("clearance", 3),
        }
        for name in ("modelDimensions", "modelOffset"):
            if supplied.get(name) and legacy:
                fields[name] = _cm_to_native(supplied[name])
        custom_bag = Suitcase.model_validate(fields)
        if any(n <= custom_bag.clearance * 2 for n in custom_bag.dimensions) or (
            custom_bag.clamshell and custom_bag.dimensions[2] / 2 <= custom_bag.clearance * 2
        ):
            raise ValueError("Bag clearance leaves no usable interior.")
        bag_id = custom_bag.id
    elif bag_id not in SUITCASE_IDS:
        raise ValueError("Choose a known suitcase or supply its dimensions.")

    seen: set[str] = set()
    items: list[Item] = []
    for index, source in enumerate(raw.items):
        item_id = str(source.get("id", f"collection-{index + 1}"))
        if not item_id or item_id in seen:
            raise ValueError("Every item needs a unique ID.")
        seen.add(item_id)
        category = source.get("category") if source.get("category") in CATEGORIES else "other"
        estimate = (
            _cm_to_native(source.get("dimensions"))
            if legacy
            else source.get("estimate") or source.get("dimensions")
        )
        orientations = source.get("orientations")
        if legacy:
            allowed = source.get("allowedPermutations") or (
                _DEFAULT_UPRIGHT if source.get("upright") else _DEFAULT_ANY
            )
            orientations = []
            for p in allowed:
                if sorted(p) != [0, 1, 2]:
                    raise ValueError("Invalid item rotation.")
                native = tuple(_AXIS_SWAP[p[i]] for i in _AXIS_SWAP)
                orientations.append(PERMUTATIONS.index(native))
        items.append(
            Item.model_validate(
                {
                    **create_item_fields(category, item_id),
                    **source,
                    "id": item_id,
                    "key": str(source.get("key") or item_id),
                    "label": source.get("label") or source.get("name") or f"Item {index + 1}",
                    "category": category,
                    "dimensions": estimate,
                    "estimate": estimate,
                    "scale": [1, 1, 1] if legacy else source.get("scale") or [1, 1, 1],
                    "orientations": orientations or [0, 1, 2, 3, 4, 5],
                    "sourceIds": source.get("sourceIds") or source.get("sourcePhotoIds") or [],
                    "required": bool(source.get("required")),
                    "included": bool(source.get("required")) or source.get("included") is not False,
                    "priority": source.get("priority", 3),
                }
            )
        )

    photos = []
    for photo in raw.photos or []:
        if photo.status in ("queued", "analyzing"):
            photo = photo.model_copy(
                update={
                    "status": "error",
                    "error": "Imported analysis was interrupted. Retry when ready.",
                }
            )
        photos.append(photo.model_dump(by_alias=True, exclude_none=True))
    return {
        "items": [i.model_dump(by_alias=True, exclude_none=True) for i in items],
        "photos": photos,
        "bagId": bag_id,
        "customBag": custom_bag.model_dump(by_alias=True, exclude_none=True)
        if custom_bag
        else None,
        "dismissed": [],
        "demo": False,
    }
