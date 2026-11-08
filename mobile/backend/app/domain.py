"""Shared types. All geometry is in mm with solver axes X width, Y length, Z up."""

import json
import math
from dataclasses import dataclass, field
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

Category = Literal[
    "clothing", "shoes", "bottle", "pouch", "camera", "headphones", "book", "other"
]
CATEGORIES = ("clothing", "shoes", "bottle", "pouch", "camera", "headphones", "book", "other")
PERMUTATIONS = ((0, 1, 2), (1, 0, 2), (0, 2, 1), (2, 0, 1), (1, 2, 0), (2, 1, 0))
HEX_COLOR = r"^#[0-9a-fA-F]{6}$"
MODEL_URL = r"^(https?://|/[^/])"
MESH_MAX_VERTICES = 512
MESH_MAX_TRIANGLES = 1024
MESH_MAX_MATERIALS = 16

Dimension = Annotated[float, Field(ge=5, le=2000, allow_inf_nan=False)]
Dimensions = tuple[Dimension, Dimension, Dimension]
ScaleAxis = Annotated[float, Field(ge=0.1, le=5)]
AnchorAxis = Annotated[float, Field(ge=0, le=2000, allow_inf_nan=False)]
Orientation = Annotated[int, Field(ge=0, le=5)]
Coordinate = Annotated[float, Field(ge=-0.5, le=0.5)]
VertexIndex = Annotated[int, Field(ge=0, le=MESH_MAX_VERTICES - 1)]
MaterialIndex = Annotated[int, Field(ge=0, le=MESH_MAX_MATERIALS - 1)]


class ApiModel(BaseModel):
    """JSON uses the app's camelCase field names."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="ignore"
    )


class Vertex(BaseModel):
    x: Coordinate
    y: Coordinate
    z: Coordinate


class Triangle(BaseModel):
    a: VertexIndex
    b: VertexIndex
    c: VertexIndex
    material: MaterialIndex


class MeshMaterial(BaseModel):
    color: str = Field(pattern=HEX_COLOR)


class MeshData(BaseModel):
    """Data only: centered, normalized X-width / Y-length / Z-up geometry."""

    version: Literal[1]
    vertices: list[Vertex] = Field(min_length=4, max_length=MESH_MAX_VERTICES)
    triangles: list[Triangle] = Field(min_length=4, max_length=MESH_MAX_TRIANGLES)
    materials: list[MeshMaterial] = Field(min_length=1, max_length=MESH_MAX_MATERIALS)


class Mesh(MeshData):
    """MeshData plus the topology checks a structured-output schema cannot express."""

    @model_validator(mode="after")
    def check_topology(self):
        used: set[int] = set()
        for t in self.triangles:
            indices = (t.a, t.b, t.c)
            if any(i >= len(self.vertices) for i in indices):
                raise ValueError("Triangle refers to a missing vertex.")
            if t.material >= len(self.materials):
                raise ValueError("Triangle refers to a missing material.")
            a, b, c = (self.vertices[i] for i in indices)
            u = (b.x - a.x, b.y - a.y, b.z - a.z)
            v = (c.x - a.x, c.y - a.y, c.z - a.z)
            area = math.hypot(
                u[1] * v[2] - u[2] * v[1],
                u[2] * v[0] - u[0] * v[2],
                u[0] * v[1] - u[1] * v[0],
            )
            if len(set(indices)) != 3 or area < 1e-8:
                raise ValueError("Triangle has no usable surface area.")
            used.update(indices)
        for axis in ("x", "y", "z"):
            values = [getattr(self.vertices[i], axis) for i in used]
            if not values or max(values) - min(values) < 1e-4:
                raise ValueError("Mesh must have visible extent on all three axes.")
        return self


class Proposal(ApiModel):
    key: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=60)
    category: Category
    color: str = Field(pattern=HEX_COLOR)
    appearance: str = Field(max_length=240)
    dimensions: Dimensions
    mesh: Mesh | None = None
    mesh_model: str | None = Field(default=None, min_length=1, max_length=100)


class Anchor(ApiModel):
    position: tuple[AnchorAxis, AnchorAxis, AnchorAxis]
    orientation: Orientation
    compartment: Literal["base", "lid"] | None = None


class Item(Proposal):
    id: str
    source_ids: list[str]
    estimate: Dimensions
    scale: tuple[ScaleAxis, ScaleAxis, ScaleAxis]
    included: bool
    orientations: list[Orientation] = Field(min_length=1)
    edited: bool
    demo: bool | None = None
    proposal_id: str | None = None
    required: bool | None = None
    priority: int | None = Field(default=None, ge=1, le=5)
    compression: float | None = Field(default=None, ge=0, le=0.4, allow_inf_nan=False)
    anchor: Anchor | None = None
    model_url: str | None = Field(default=None, max_length=2048, pattern=MODEL_URL)


class Suitcase(ApiModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    subtitle: str = Field(max_length=150)
    dimensions: Dimensions
    clearance: float = Field(ge=0, le=50, allow_inf_nan=False)
    clamshell: bool | None = None
    color: str | None = Field(default=None, pattern=HEX_COLOR)
    model_url: str | None = Field(default=None, max_length=2048, pattern=MODEL_URL)
    model_dimensions: Dimensions | None = None
    model_offset: tuple[float, float, float] | None = None


class PackingInput(ApiModel):
    items: list[Item] = Field(max_length=80)
    bag: Suitcase
    revision: str | None = None
    preference: str | None = Field(default=None, max_length=1500)

    @model_validator(mode="after")
    def check_consistency(self):
        if len({i.id for i in self.items}) != len(self.items):
            raise ValueError("Duplicate item IDs.")
        if any(i.required and not i.included for i in self.items):
            raise ValueError("Essential items must stay included.")
        d, clearance = self.bag.dimensions, self.bag.clearance
        if any(n <= clearance * 2 for n in d) or (
            self.bag.clamshell and d[2] / 2 <= clearance * 2
        ):
            raise ValueError("Bag clearance leaves no usable space.")
        return self


SUITCASE_IDS = {"cabin", "personal", "checked"}
TEMPLATES: dict[str, tuple[str, tuple[float, float, float], str]] = {
    "clothing": ("Folded shirt", (220, 270, 45), "#b9c9a4"),
    "shoes": ("Sneaker", (110, 280, 70), "#e3cba7"),
    "bottle": ("Travel bottle", (50, 50, 70), "#9db5c7"),
    "pouch": ("Toiletry pouch", (180, 110, 70), "#d9a180"),
    "camera": ("Little film camera", (140, 110, 70), "#4d6056"),
    "headphones": ("Over-ear headphones", (180, 160, 70), "#b3a0b5"),
    "book": ("A good paperback", (140, 210, 30), "#d3a250"),
    "other": ("Travel essential", (120, 90, 40), "#b8abc5"),
}


def create_item_fields(category: str, item_id: str) -> dict:
    label, dimensions, color = TEMPLATES[category]
    return {
        "id": item_id,
        "key": item_id,
        "label": label,
        "category": category,
        "color": color,
        "appearance": label,
        "dimensions": list(dimensions),
        "estimate": list(dimensions),
        "scale": [1, 1, 1],
        "sourceIds": [],
        "included": True,
        "orientations": [0, 1] if category == "bottle" else [0, 1, 2, 3, 4, 5],
        "edited": False,
        "required": False,
        "priority": 3,
    }


def size_of(item: Item) -> tuple[float, float, float]:
    compression = (item.compression or 0) if item.category == "clothing" else 0
    return tuple(  # type: ignore[return-value]
        # floor(x + 0.5) matches JavaScript's Math.round, unlike Python's round().
        math.floor(n * item.scale[i] * ((1 - compression) if i == 2 else 1) * 100 + 0.5) / 100
        for i, n in enumerate(item.estimate)
    )


@dataclass(slots=True)
class Placement:
    id: str
    position: tuple[float, float, float]
    dimensions: tuple[float, float, float]
    orientation: int
    order: int
    compartment: str | None = None

    def to_json(self) -> dict:
        data = {
            "id": self.id,
            "position": list(self.position),
            "dimensions": list(self.dimensions),
            "orientation": self.orientation,
            "order": self.order,
        }
        if self.compartment:
            data["compartment"] = self.compartment
        return data


@dataclass(slots=True)
class Plan:
    revision: str
    placements: list[Placement]
    unplaced: list[dict]
    outcome: str
    conflicts: list[str] = field(default_factory=list)
    attempts: int = 0
    exhausted: bool = False

    def to_json(self, revision: str | None = None) -> dict:
        return {
            # The app compares this to the revision it computed for its own state.
            "revision": revision if revision is not None else self.revision,
            "placements": [p.to_json() for p in self.placements],
            "unplaced": self.unplaced,
            "outcome": self.outcome,
            "conflicts": self.conflicts,
            "attempts": self.attempts,
            "exhausted": self.exhausted,
        }


def revision_of(items: list[Item], bag: Suitcase) -> str:
    return json.dumps(
        [
            bag.id,
            bag.dimensions,
            bag.clearance,
            bool(bag.clamshell),
            [
                [
                    i.id,
                    i.included,
                    size_of(i),
                    i.orientations,
                    bool(i.required),
                    3 if i.priority is None else i.priority,
                    i.anchor.model_dump() if i.anchor else None,
                ]
                for i in items
            ],
        ]
    )
