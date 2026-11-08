"""The travel demo's reserved space for a 500 ml water bottle."""

from .domain import (
    PERMUTATIONS,
    Item,
    Placement,
    Plan,
    Suitcase,
    create_item_fields,
    revision_of,
    size_of,
)
from .validate import validate_plan

DEMO_BOTTLE_ID = "demo-water-bottle"
_DEMO_BOTTLE_DIMENSIONS = [75, 75, 220]


def _demo_water_bottle() -> Item:
    return Item.model_validate(
        {
            **create_item_fields("bottle", DEMO_BOTTLE_ID),
            "demo": True,
            "label": "500 ml water bottle",
            "appearance": "Reusable blue water bottle, lying on its side",
            "color": "#91b6c2",
            "dimensions": _DEMO_BOTTLE_DIMENSIONS,
            "estimate": _DEMO_BOTTLE_DIMENSIONS,
            "orientations": [2],
        }
    )


def demo_bottle_space(items: list[Item], bag: Suitcase, plan: Plan) -> Placement | None:
    """Only show a reservation that really fits beside the currently packed belongings."""
    if (
        plan.outcome != "complete"
        or not bag.clamshell
        or bag.id != "cabin"
        or any(i.id == DEMO_BOTTLE_ID for i in items)
    ):
        return None
    bank = next((i for i in items if i.id == "demo-8" and i.demo), None)
    support = bank and next((p for p in plan.placements if p.id == bank.id), None)
    if not support:
        return None
    bottle = _demo_water_bottle()
    size = size_of(bottle)
    dimensions = tuple(size[k] for k in PERMUTATIONS[2])
    if (
        min(support.dimensions[0], dimensions[0]) * min(support.dimensions[1], dimensions[1])
        < dimensions[0] * dimensions[1] * 0.65
    ):
        return None
    placement = Placement(
        id=bottle.id,
        position=(
            support.position[0],
            support.position[1],
            support.position[2] + support.dimensions[2] + bag.clearance,
        ),
        dimensions=dimensions,
        orientation=2,
        order=len(plan.placements) + 1,
        compartment=support.compartment,
    )
    inventory = [*items, bottle]
    candidate = Plan(
        revision=revision_of(inventory, bag),
        placements=[*plan.placements, placement],
        unplaced=plan.unplaced,
        outcome=plan.outcome,
    )
    return placement if validate_plan(candidate, inventory, bag)[0] else None
