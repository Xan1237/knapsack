"""Independent checker: does not import the search or its collision/orientation helpers."""

import math

from .domain import Item, Plan, Suitcase, revision_of, size_of

_ORIENTATIONS = ((0, 1, 2), (1, 0, 2), (0, 2, 1), (2, 0, 1), (1, 2, 0), (2, 1, 0))
_EPSILON = 1e-5


def validate_plan(plan: Plan, items: list[Item], bag: Suitcase) -> tuple[bool, list[str]]:
    errors: list[str] = []
    seen: set[str] = set()
    cavity = (
        bag.dimensions[0],
        bag.dimensions[1],
        bag.dimensions[2] / (2 if bag.clamshell else 1),
    )
    if plan.revision != revision_of(items, bag):
        errors.append("Stale revision")
    if bag.clearance < 0 or any(n <= bag.clearance * 2 for n in cavity):
        errors.append("Invalid suitcase dimensions")
    if len({i.id for i in items}) != len(items):
        errors.append("Duplicate inventory identities")
    for item in items:
        if any(n <= 0 for n in size_of(item)) or not item.orientations:
            errors.append(f"Invalid item {item.id}")
    included = {i.id: i for i in items if i.included}
    for p in plan.placements:
        if (p.compartment not in ("base", "lid")) if bag.clamshell else bool(p.compartment):
            errors.append(f"Invalid compartment {p.id}")
        item = included.get(p.id)
        if item is None or p.id in seen:
            errors.append(f"Unknown or duplicate placement {p.id}")
            continue
        seen.add(p.id)
        if p.orientation not in item.orientations:
            errors.append(f"Forbidden orientation {p.id}")
        else:
            d = size_of(item)
            rotation = _ORIENTATIONS[p.orientation]
            if any(
                not math.isfinite(n) or n <= 0 or abs(n - d[rotation[k]]) > _EPSILON
                for k, n in enumerate(p.dimensions)
            ):
                errors.append(f"Wrong envelope {p.id}")
        if any(
            not math.isfinite(n)
            or n < bag.clearance - _EPSILON
            or n + p.dimensions[k] > cavity[k] - bag.clearance + _EPSILON
            for k, n in enumerate(p.position)
        ):
            errors.append(f"Out of bounds {p.id}")
        if p.order < 1:
            errors.append(f"Invalid sequence {p.id}")
    if len({p.order for p in plan.placements}) != len(plan.placements):
        errors.append("Duplicate sequence positions")
    if any(p.order > len(plan.placements) for p in plan.placements):
        errors.append("Non-contiguous sequence")
    for i, a in enumerate(plan.placements):
        for b in plan.placements[i + 1 :]:
            if a.compartment != b.compartment:
                continue
            separate = any(
                a.position[k] + a.dimensions[k] + bag.clearance <= b.position[k] + _EPSILON
                or b.position[k] + b.dimensions[k] + bag.clearance <= a.position[k] + _EPSILON
                for k in range(3)
            )
            if not separate:
                errors.append(f"Overlap {a.id}/{b.id}")
    for u in plan.unplaced:
        if u["id"] not in included or u["id"] in seen:
            errors.append(f"Unknown or duplicate unplaced {u['id']}")
        seen.add(u["id"])
    if len(seen) != len(included) or any(i not in seen for i in included):
        errors.append("Incomplete accounting")
    if plan.outcome == "complete" and plan.unplaced:
        errors.append("Incorrect complete outcome")
    return (not errors, errors)
