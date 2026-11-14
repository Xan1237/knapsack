"""Deterministic bounded extreme-edge grid search; no claim of global optimality."""

from .domain import (
    PERMUTATIONS,
    Item,
    Placement,
    Plan,
    Suitcase,
    max_squish,
    revision_of,
    size_of,
    squeezed,
    weight_of,
)


def squish_levels(item: Item, start: int = 0) -> list[float]:
    """
    Natural size first, then halfway, then as squeezed as the item allows. `start` skips the
    gentler levels, for passes that squeeze every soft item evenly.
    """
    limit = max_squish(item)
    if limit < 0.02:
        return [0.0]
    return [0.0, round(limit / 2, 4), round(limit, 4)][start:]


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
    """
    The traveler's hand placement. On the floor it is reserved before anything else; dropped onto
    other belongings (z above the floor) it is settled by gravity after them, see `_drop`.
    Invalidated anchors from older or imported bags fall back to automatic packing.
    """
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
    # A drop above the floor only needs its footprint inside; gravity settles its height.
    floor = abs(anchor.position[2] - bag.clearance) < 1e-5
    if anchor.position[2] < bag.clearance - 1e-5 or any(
        n < bag.clearance - 1e-5 or n + dimensions[k] > cavity[k] - bag.clearance + 1e-5
        for k, n in enumerate(anchor.position)
        if floor or k < 2
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


def on_floor(p: Placement, gap: float) -> bool:
    return abs(p.position[2] - gap) < 1e-5


def _drop(
    anchor: Placement, size, placed: list[Placement], cavity, gap, squishes: list[float]
) -> Placement | None:
    """
    Let a dropped item fall at its x, y: it rests on whatever is beneath it, or slips into a gap
    down to the floor. A soft item squeezes to fit under the lid if it has to.
    """
    same_side = [p for p in placed if p.compartment == anchor.compartment]
    for squish in squishes:
        d = squeezed(size, squish)
        dims = tuple(d[axis] for axis in PERMUTATIONS[anchor.orientation])
        x, y = anchor.position[0], anchor.position[1]
        heights = sorted(
            {gap}
            | {
                p.position[2] + p.dimensions[2] + gap
                for p in same_side
                if p.position[0] < x + dims[0] + gap and x < p.position[0] + p.dimensions[0] + gap
                and p.position[1] < y + dims[1] + gap and y < p.position[1] + p.dimensions[1] + gap
            }
        )
        for z in heights:
            if z + dims[2] > cavity[2] - gap + 1e-6:
                break
            candidate = Placement(
                anchor.id, (x, y, z), dims, anchor.orientation, len(placed) + 1,
                anchor.compartment, squish,
            )
            if any(_overlap(candidate, b, gap) for b in same_side):
                continue
            # Gravity: it can only rest at the lowest clear height with something under it.
            if _supported(candidate, same_side, gap):
                return candidate
            break
    return None


def _find_spot(item, d, placed, compartments, cavity, gap, anchor, budget, evaluations, squish=0.0):
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
                            item.id, (x, y, z), dims, orientation, len(placed) + 1, compartment, squish
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
        # Too large even squeezed as far as it goes.
        d = squeezed(sizes[i.id], max_squish(i))
        if not any(
            all(d[axis] + gap * 2 <= cavity[k] for k, axis in enumerate(PERMUTATIONS[o]))
            for o in i.orientations
        ):
            conflicts.append(i.id)
    if any(n <= gap * 2 for n in cavity):
        raise ValueError("Invalid suitcase")
    usable = (cavity[0] - gap * 2) * (cavity[1] - gap * 2) * (cavity[2] - gap * 2)
    volume_conflict = (
        sum(_volume(squeezed(sizes[i.id], max_squish(i))) for i in included)
        > usable * len(compartments)
    )

    def vol(i: Item) -> float:
        return _volume(sizes[i.id])

    def priority(i: Item) -> int:
        return 3 if i.priority is None else i.priority

    orders = [
        sorted(included, key=lambda i: (-vol(i), i.id)),
        sorted(included, key=lambda i: (-max(sizes[i.id]), i.id)),
        sorted(included, key=lambda i: (len(i.orientations), -vol(i), i.id)),
        sorted(included, key=lambda i: (-sizes[i.id][0] * sizes[i.id][1], i.id)),
        # Heaviest first, so dense things end up at the bottom as a person would pack them.
        sorted(included, key=lambda i: (-weight_of(i), i.id)),
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
    # The latest moved item: on the floor it is reserved first and everything else moves around
    # it; dropped onto other belongings it settles by gravity once they are in place.
    moved = next(
        (p for p in (anchored_placement(i, bag, sizes[i.id]) for i in included) if p), None
    )
    anchor = moved if moved and on_floor(moved, gap) else None
    dropped = moved if moved and not anchor else None
    # Soft things squeeze one at a time as needed; if that still leaves something out, try
    # again with every soft item squeezed evenly, halfway and then fully.
    passes = [(order, start) for start in (0, 1, 2) for order in orders]
    for order, start in passes:
        if start and len(best) == len(included):
            break
        attempts += 1
        placed: list[Placement] = [anchor] if anchor else []
        evaluations = 0
        for item in order:
            if moved and item.id == moved.id:
                continue
            if item.id in conflicts:
                continue
            found = None
            # A soft item squeezes only when it doesn't fit at its natural size.
            for squish in squish_levels(item, start):
                found, evaluations, ran_out = _find_spot(
                    item, squeezed(sizes[item.id], squish), placed, compartments, cavity, gap,
                    anchor, budget, evaluations, squish,
                )
                exhausted = exhausted or ran_out
                if found or ran_out:
                    break
            if found:
                placed.append(found)
        if dropped:
            item = by_id[dropped.id]
            found = _drop(dropped, sizes[item.id], placed, cavity, gap, squish_levels(item))
            if not found and item.id not in conflicts:
                for squish in squish_levels(item):
                    found, evaluations, ran_out = _find_spot(
                        item, squeezed(sizes[item.id], squish), placed, compartments, cavity,
                        gap, None, budget, evaluations, squish,
                    )
                    exhausted = exhausted or ran_out
                    if found or ran_out:
                        break
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
