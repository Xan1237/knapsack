"""Keep/leave swaps that make room for one wanted item while protecting essentials."""

from .domain import Item, Suitcase, size_of
from .packing import pack
from .validate import validate_plan


def _priority(item: Item) -> int:
    return 3 if item.priority is None else item.priority


def find_packing_choices(items: list[Item], bag: Suitcase, wanted_id: str) -> list[dict]:
    original = pack(items, bag)
    wanted = next((i for i in items if i.id == wanted_id and i.included), None)
    if not wanted or any(p.id == wanted_id for p in original.placements):
        return []
    packed = {p.id for p in original.placements}

    def volume(item: Item) -> float:
        d = size_of(item)
        return d[0] * d[1] * d[2]

    candidates = sorted(
        (i for i in items if i.id in packed and not i.required),
        key=lambda i: (_priority(i), -volume(i)),
    )[:10]
    options: list[dict] = []

    def attempt(remove_ids: list[str]) -> None:
        revised = [
            i.model_copy(
                update={
                    "included": i.id == wanted_id or (i.included and i.id not in remove_ids),
                    "priority": 5 if i.id == wanted_id else i.priority,
                }
            )
            for i in items
        ]
        plan = pack(revised, bag)
        placed = {p.id for p in plan.placements}
        if (
            wanted_id not in placed
            or not validate_plan(plan, revised, bag)[0]
            or any(i not in remove_ids and i not in placed for i in packed)
        ):
            return
        options.append(
            {
                "removeIds": remove_ids,
                "includeIds": [i.id for i in revised if i.included],
                "placed": len(placed),
                "unplaced": len(plan.unplaced),
                "cost": sum(_priority(i) for i in items if i.id in remove_ids),
            }
        )

    for candidate in candidates:
        attempt([candidate.id])
    if len(options) < 3:
        for i, first in enumerate(candidates):
            for second in candidates[i + 1 :]:
                attempt([first.id, second.id])
    options.sort(key=lambda o: (len(o["removeIds"]), o["cost"]))
    return [{k: v for k, v in o.items() if k != "cost"} for o in options[:3]]
