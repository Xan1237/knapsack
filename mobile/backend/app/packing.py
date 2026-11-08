"""Deterministic bounded extreme-edge grid search; no claim of global optimality."""

from .domain import PERMUTATIONS, Item, Placement, Plan, Suitcase, revision_of, size_of


def _volume(d) -> float:
    return d[0] * d[1] * d[2]


def _overlap(a: Placement, b: Placement, gap: float) -> bool:
    return all(
        a.position[k] < b.position[k] + b.dimensions[k] + gap - 1e-6
        and b.position[k] < a.position[k] + a.dimensions[k] + gap - 1e-6
        for k in range(3)
    )


def _supported(p: Placement, placed: list[Placement], gap: float) -> bool:
    if abs(p.position[2] - gap) < 1e-6:
        return True
    area = 0.0
    for b in placed:
        if abs(b.position[2] + b.dimensions[2] + gap - p.position[2]) > 1e-5:
            continue
        x = max(
            0,
            min(p.position[0] + p.dimensions[0], b.position[0] + b.dimensions[0])
            - max(p.position[0], b.position[0]),
        )
        y = max(
            0,
            min(p.position[1] + p.dimensions[1], b.position[1] + b.dimensions[1])
            - max(p.position[1], b.position[1]),
        )
        area += x * y
    return area >= p.dimensions[0] * p.dimensions[1] * 0.65


def anchored_placement(item: Item, bag: Suitcase, size=None) -> Placement | None:
    """Invalidated anchors from older or imported bags fall back to automatic packing."""
    anchor = item.anchor
    if not anchor or anchor.orientation not in item.orientations:
        return None
    if (anchor.compartment not in ("base", "lid")) if bag.clamshell else bool(anchor.compartment):
        return None
    size = size or size_of(item)
    dimensions = tuple(size[axis] for axis in PERMUTATIONS[anchor.orientation])
    cavity = (
        bag.dimensions[0],
        bag.dimensions[1],
        bag.dimensions[2] / (2 if bag.clamshell else 1),
    )
    if abs(anchor.position[2] - bag.clearance) > 1e-5 or any(
        n < bag.clearance - 1e-5 or n + dimensions[k] > cavity[k] - bag.clearance + 1e-5
        for k, n in enumerate(anchor.position)
    ):
        return None
    return Placement(
        id=item.id,
        position=tuple(anchor.position),
        dimensions=dimensions,
        orientation=anchor.orientation,
        order=1,
        compartment=anchor.compartment,
    )


def _find_spot(item, d, placed, compartments, cavity, gap, anchor, budget, evaluations):
    """Return (placement or None, evaluations so far, whether the budget ran out)."""
    side_volume = {
        c: sum(_volume(p.dimensions) for p in placed if p.compartment == c) for c in compartments
    }
    for compartment in sorted(compartments, key=lambda c: side_volume[c]):
        same_side = [p for p in placed if p.compartment == compartment]
        axes = []
        for k in range(3):
            values = {gap}
            if anchor:
                for p in same_side:
                    for o in item.orientations:
                        n = p.position[k] - d[PERMUTATIONS[o][k]] - gap
                        if n >= gap:
                            values.add(n)
            for p in same_side:
                values.add(p.position[k] + p.dimensions[k] + gap)
            axes.append(sorted(values))
        for z in axes[2]:
            for y in axes[1]:
                for x in axes[0]:
                    for orientation in item.orientations:
                        evaluations += 1
                        if evaluations > budget:
                            return None, evaluations, True
                        perm = PERMUTATIONS[orientation]
                        dims = (d[perm[0]], d[perm[1]], d[perm[2]])
                        if (
                            x + dims[0] > cavity[0] - gap + 1e-6
                            or y + dims[1] > cavity[1] - gap + 1e-6
                            or z + dims[2] > cavity[2] - gap + 1e-6
                        ):
                            continue
                        candidate = Placement(
                            item.id, (x, y, z), dims, orientation, len(placed) + 1, compartment
                        )
                        if any(_overlap(candidate, b, gap) for b in same_side):
                            continue
                        if not _supported(candidate, same_side, gap):
                            continue
                        return candidate, evaluations, False
    return None, evaluations, False


def pack(items: list[Item], bag: Suitcase, budget: int = 80000) -> Plan:
    included = [i for i in items if i.included]
    gap = bag.clearance
    cavity = (
        bag.dimensions[0],
        bag.dimensions[1],
        bag.dimensions[2] / (2 if bag.clamshell else 1),
    )
    compartments: list[str | None] = ["base", "lid"] if bag.clamshell else [None]
    sizes = {i.id: size_of(i) for i in included}
    by_id = {i.id: i for i in included}
    conflicts: list[str] = []
    for i in included:
        d = sizes[i.id]
        if not any(
            all(d[axis] + gap * 2 <= cavity[k] for k, axis in enumerate(PERMUTATIONS[o]))
            for o in i.orientations
        ):
            conflicts.append(i.id)
    if any(n <= gap * 2 for n in cavity):
        raise ValueError("Invalid suitcase")
    usable = (cavity[0] - gap * 2) * (cavity[1] - gap * 2) * (cavity[2] - gap * 2)
    volume_conflict = sum(_volume(sizes[i.id]) for i in included) > usable * len(compartments)

    def vol(i: Item) -> float:
        return _volume(sizes[i.id])

    def priority(i: Item) -> int:
        return 3 if i.priority is None else i.priority

    orders = [
        sorted(included, key=lambda i: (-vol(i), i.id)),
        sorted(included, key=lambda i: (-max(sizes[i.id]), i.id)),
        sorted(included, key=lambda i: (len(i.orientations), -vol(i), i.id)),
        sorted(included, key=lambda i: (-sizes[i.id][0] * sizes[i.id][1], i.id)),
    ]
    if any(i.required or priority(i) != 3 for i in included):
        orders.insert(
            0,
            sorted(
                included,
                key=lambda i: (-int(bool(i.required)), -priority(i), -vol(i), i.id),
            ),
        )

    def quality(placements: list[Placement]) -> float:
        score = 0.0
        for p in placements:
            item = by_id[p.id]
            score += (
                (1e9 if item.required else 0)
                + priority(item) * 1e6
                + 1000
                + _volume(p.dimensions) / 1e9
            )
        return score

    best: list[Placement] = []
    attempts = 0
    exhausted = False
    # The latest moved item is reserved first; every other item may move around it.
    anchor = next(
        (p for p in (anchored_placement(i, bag, sizes[i.id]) for i in included) if p), None
    )
    for order in orders:
        attempts += 1
        placed: list[Placement] = [anchor] if anchor else []
        evaluations = 0
        for item in order:
            if anchor and item.id == anchor.id:
                continue
            if item.id in conflicts:
                continue
            found, evaluations, ran_out = _find_spot(
                item, sizes[item.id], placed, compartments, cavity, gap, anchor, budget, evaluations
            )
            exhausted = exhausted or ran_out
            if found:
                placed.append(found)
        if quality(placed) > quality(best):
            best = placed
        if len(best) == len(included):
            break
    ids = {p.id for p in best}
    if len(best) == len(included):
        outcome = "complete"
    elif conflicts or volume_conflict:
        outcome = "constraint-conflict"
    elif exhausted:
        outcome = "search-exhausted"
    else:
        outcome = "partial"
    return Plan(
        revision=revision_of(items, bag),
        placements=best,
        unplaced=[
            {
                "id": i.id,
                "reason": "Too large in every permitted orientation"
                if i.id in conflicts
                else "No supported space found in the bounded search",
            }
            for i in included
            if i.id not in ids
        ],
        outcome=outcome,
        conflicts=[*conflicts, *(["total-volume"] if volume_conflict else [])],
        attempts=attempts,
        exhausted=exhausted,
    )
