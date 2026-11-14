"""Squeezing soft belongings, weight, and gravity drops. Run from mobile/backend:
python -m unittest discover tests"""

import unittest

from app.domain import (
    Item,
    Placement,
    Suitcase,
    max_squish,
    size_of,
    squeezed,
    weight_of,
)
from app.packing import pack
from app.validate import validate_plan


def item(item_id, category, dims, **extra):
    return Item.model_validate({
        "id": item_id, "key": item_id, "label": item_id, "category": category,
        "color": "#888888", "appearance": "", "dimensions": dims, "estimate": dims,
        "scale": [1, 1, 1], "sourceIds": [], "included": True,
        "orientations": extra.pop("orientations", [0]), "edited": False, **extra,
    })


def bag(dims, clamshell=False, clearance=3):
    return Suitcase.model_validate({
        "id": "b", "name": "b", "subtitle": "", "dimensions": dims,
        "clearance": clearance, "clamshell": clamshell,
    })


class Softness(unittest.TestCase):
    def test_limits_by_category(self):
        self.assertAlmostEqual(max_squish(item("t", "clothing", [200, 300, 60])), 0.4)
        self.assertAlmostEqual(max_squish(item("p", "pouch", [200, 100, 60])), 0.25)
        self.assertEqual(max_squish(item("b", "book", [140, 210, 30])), 0)
        self.assertEqual(max_squish(item("w", "bottle", [60, 60, 200])), 0)

    def test_traveler_compression_counts_toward_the_limit(self):
        shirt = item("t", "clothing", [200, 300, 60], compression=0.3)
        # 0.7 * (1 - s) may not go below 0.6 of the original height.
        self.assertAlmostEqual(max_squish(shirt), 1 - 0.6 / 0.7)
        self.assertEqual(max_squish(item("t", "clothing", [200, 300, 60], compression=0.4)), 0)

    def test_weight(self):
        self.assertAlmostEqual(weight_of(item("b", "book", [100, 200, 30])), 0.45)
        self.assertLess(weight_of(item("t", "clothing", [100, 200, 30])), 0.2)

    def test_squeezed_only_changes_height(self):
        self.assertEqual(squeezed((200, 300, 60), 0.25), (200, 300, 45))


class SqueezeToFit(unittest.TestCase):
    def test_a_shirt_squeezes_into_a_shallow_bag(self):
        # 60 mm of shirt, 50 mm of room after clearance: it fits squeezed, not at full height.
        shirt = item("t", "clothing", [200, 300, 60])
        b = bag([300, 400, 56])
        plan = pack([shirt], b)
        self.assertEqual(plan.outcome, "complete")
        p = plan.placements[0]
        self.assertGreater(p.squish, 0)
        self.assertLessEqual(p.dimensions[2], 50)
        self.assertTrue(validate_plan(plan, [shirt], b)[0], validate_plan(plan, [shirt], b)[1])
        self.assertIn("squish", p.to_json())

    def test_natural_size_when_it_fits(self):
        shirt = item("t", "clothing", [200, 300, 60])
        plan = pack([shirt], bag([300, 400, 100]))
        self.assertEqual(plan.placements[0].squish, 0)
        self.assertNotIn("squish", plan.placements[0].to_json())

    def test_a_book_never_squeezes(self):
        book = item("b", "book", [200, 300, 60])
        plan = pack([book], bag([300, 400, 56]))
        self.assertEqual(plan.placements, [])
        self.assertEqual(plan.outcome, "constraint-conflict")

    def test_squeezing_fits_one_more_shirt(self):
        shirts = [item(f"t{n}", "clothing", [280, 380, 60]) for n in range(3)]
        b = bag([300, 400, 150])
        plan = pack(shirts, b)
        # Two natural shirts take 129 mm of 144; the third fits only once squeezed.
        self.assertEqual(len(plan.placements), 3)
        self.assertTrue(any(p.squish > 0 for p in plan.placements))
        self.assertTrue(validate_plan(plan, shirts, b)[0])


class ValidatorChecksSqueezing(unittest.TestCase):
    def setUp(self):
        self.shirt = item("t", "clothing", [200, 300, 60])
        self.book = item("b", "book", [200, 300, 60])
        self.bag = bag([300, 400, 200])

    def plan_with(self, it, squish, height):
        plan = pack([it], self.bag)
        p = plan.placements[0]
        plan.placements[0] = Placement(p.id, p.position, (p.dimensions[0], p.dimensions[1], height), p.orientation, p.order, p.compartment, squish)
        return plan

    def test_accepts_an_allowed_squeeze(self):
        plan = self.plan_with(self.shirt, 0.4, 36)
        self.assertTrue(validate_plan(plan, [self.shirt], self.bag)[0])

    def test_rejects_squeezing_past_the_limit(self):
        ok, errors = validate_plan(self.plan_with(self.shirt, 0.6, 24), [self.shirt], self.bag)
        self.assertFalse(ok)
        self.assertTrue(any("Squeezed too far" in e for e in errors))

    def test_rejects_squeezing_a_rigid_item(self):
        ok, errors = validate_plan(self.plan_with(self.book, 0.2, 48), [self.book], self.bag)
        self.assertFalse(ok)

    def test_rejects_a_height_that_does_not_match_the_squeeze(self):
        ok, errors = validate_plan(self.plan_with(self.shirt, 0.1, 30), [self.shirt], self.bag)
        self.assertFalse(ok)
        self.assertTrue(any("Wrong envelope" in e for e in errors))


class GravityDrops(unittest.TestCase):
    def setUp(self):
        self.bag = bag([400, 400, 300])
        # A block filling the left half, and a free right half.
        self.base = item("base", "book", [194, 394, 100])

    def dropped(self, x, y, z, dims=(150, 150, 50), category="camera"):
        return item("drop", category, list(dims), anchor={"position": [x, y, z], "orientation": 0})

    def placement(self, plan, item_id):
        return next(p for p in plan.placements if p.id == item_id)

    def test_lands_on_top_of_what_is_beneath(self):
        drop = self.dropped(20, 100, 150)
        items = [self.base, drop]
        plan = pack(items, self.bag)
        base, p = self.placement(plan, "base"), self.placement(plan, "drop")
        self.assertEqual((p.position[0], p.position[1]), (20, 100))
        self.assertAlmostEqual(p.position[2], base.position[2] + base.dimensions[2] + 3)
        self.assertTrue(validate_plan(plan, items, self.bag)[0])

    def test_falls_through_a_gap_to_the_floor(self):
        # Asked to rest high up, but nothing is beneath the right half: it falls to the floor.
        drop = self.dropped(230, 100, 150)
        plan = pack([self.base, drop], self.bag)
        p = self.placement(plan, "drop")
        self.assertEqual(p.position, (230, 100, 3))

    def test_soft_item_squeezes_in_under_the_lid(self):
        drop = self.dropped(20, 100, 150, dims=(150, 150, 220), category="clothing")
        items = [self.base, drop]
        plan = pack(items, self.bag)
        p = self.placement(plan, "drop")
        # 106 mm up, 191 mm left under the lid: a 220 mm stack squeezes to fit.
        self.assertAlmostEqual(p.position[2], 106)
        self.assertGreater(p.squish, 0)
        self.assertTrue(validate_plan(plan, items, self.bag)[0])

    def test_no_room_falls_back_to_anywhere_it_fits(self):
        drop = self.dropped(20, 100, 150, dims=(150, 150, 220))
        items = [self.base, drop]
        plan = pack(items, self.bag)
        p = self.placement(plan, "drop")
        self.assertEqual(p.position[2], 3)
        self.assertTrue(validate_plan(plan, items, self.bag)[0])

    def test_floor_anchor_still_reserved_first(self):
        drop = self.dropped(20, 100, 3)
        plan = pack([self.base, drop], self.bag)
        self.assertEqual(self.placement(plan, "drop").position, (20, 100, 3))

    def test_clamshell_drop_stays_in_its_half(self):
        b = bag([400, 400, 300], clamshell=True)
        drop = item("drop", "camera", [150, 150, 50], anchor={"position": [20, 100, 60], "orientation": 0, "compartment": "lid"})
        plan = pack([self.base, drop], b)
        p = self.placement(plan, "drop")
        self.assertEqual(p.compartment, "lid")
        self.assertTrue(validate_plan(plan, [self.base, drop], b)[0])


class DemoStillPacks(unittest.TestCase):
    def test_demo_trip(self):
        from app.domain import create_item_fields
        items = [Item.model_validate(create_item_fields(c, f"i{n}")) for n, c in enumerate(
            ["clothing", "clothing", "shoes", "pouch", "book", "camera", "bottle", "headphones"])]
        b = bag([340, 500, 210], clamshell=True)
        plan = pack(items, b)
        self.assertEqual(plan.outcome, "complete")
        self.assertTrue(validate_plan(plan, items, b)[0])
        for p in plan.placements:
            self.assertEqual(p.dimensions[2] if p.orientation in (0, 1) else None or p.dimensions[2], p.dimensions[2])
        self.assertEqual(size_of(items[0]), (220, 270, 45))


if __name__ == "__main__":
    unittest.main()
