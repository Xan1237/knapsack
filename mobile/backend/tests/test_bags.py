"""Custom bags from photos. Run from mobile/backend: python -m unittest discover tests"""

import io
import os
import unittest
from unittest import mock

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("OPENAI_API_KEY", "test-key")

from fastapi.testclient import TestClient  # noqa: E402

from app import astra, auth, main, trips  # noqa: E402
from app.domain import PackingInput  # noqa: E402

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 64


def box_mesh(color="#334455"):
    """A closed unit box: eight corners, twelve outward triangles."""
    v = [
        {"x": x, "y": y, "z": z}
        for x in (-0.5, 0.5)
        for y in (-0.5, 0.5)
        for z in (-0.5, 0.5)
    ]
    faces = [
        (0, 1, 3), (0, 3, 2), (4, 6, 7), (4, 7, 5),
        (0, 4, 5), (0, 5, 1), (2, 3, 7), (2, 7, 6),
        (0, 2, 6), (0, 6, 4), (1, 5, 7), (1, 7, 3),
    ]
    return {
        "version": 1,
        "vertices": v,
        "triangles": [{"a": a, "b": b, "c": c, "material": 0} for a, b, c in faces],
        "materials": [{"color": color}],
    }


def live_bag(**overrides):
    fields = {
        "name": "Grey day pack",
        "kind": "backpack",
        "opensFlat": False,
        "color": "#5a6470",
        "appearance": "A grey backpack with a front pocket.",
        "assumptions": "The back panel was not visible.",
        "exterior": {"width": 320, "length": 480, "height": 200},
        "interior": {"width": 290, "length": 440, "height": 160},
        "shape": "daypack",
        "material": "nylon",
        "accent": "#c8553d",
        "frontPocket": True,
        "sidePockets": True,
        "wheels": False,
    }
    fields.update(overrides)
    return astra._LiveBag.model_validate(fields)


class BagFromAnalysis(unittest.TestCase):
    def test_backpack_is_one_open_compartment(self):
        result = astra.bag_from_analysis(live_bag(), "test-model", 3)
        bag = result["bag"]
        self.assertEqual(list(bag["dimensions"]), [290, 440, 160])
        self.assertEqual(list(bag["exterior"]), [320, 480, 200])
        self.assertFalse(bag["clamshell"])
        self.assertEqual(bag["kind"], "backpack")
        self.assertEqual(bag["clearance"], 5)
        self.assertEqual(bag["photoCount"], 3)
        self.assertEqual(bag["meshModel"], "test-model")
        self.assertNotIn("mesh", bag)
        self.assertEqual(
            bag["style"],
            {"shape": "daypack", "material": "nylon", "accent": "#c8553d",
             "frontPocket": True, "sidePockets": True, "wheels": False},
        )
        self.assertEqual(result["assumptions"], "The back panel was not visible.")

    def test_interior_never_exceeds_exterior(self):
        bag = astra.bag_from_analysis(
            live_bag(interior={"width": 400, "length": 440, "height": 260}), "m", 1
        )["bag"]
        self.assertEqual(list(bag["dimensions"]), [320, 440, 200])

    def test_only_suitcases_open_flat(self):
        flat_pack = astra.bag_from_analysis(live_bag(opensFlat=True), "m", 1)["bag"]
        self.assertFalse(flat_pack["clamshell"])
        case = astra.bag_from_analysis(
            live_bag(kind="suitcase", opensFlat=True), "m", 1
        )["bag"]
        self.assertTrue(case["clamshell"])
        self.assertEqual(case["clearance"], 3)

    def test_a_pouch_is_not_a_bag(self):
        with self.assertRaises(astra.BagUnusable):
            astra.bag_from_analysis(
                live_bag(interior={"width": 60, "length": 200, "height": 100}), "m", 1
            )

    def test_shape_follows_the_kind(self):
        # A duffel read with a backpack's shape gets the duffel's usual barrel.
        bag = astra.bag_from_analysis(live_bag(kind="duffel", shape="rolltop"), "m", 1)["bag"]
        self.assertEqual(bag["style"]["shape"], "barrel")
        case = astra.bag_from_analysis(live_bag(kind="suitcase", shape="soft"), "m", 1)["bag"]
        self.assertEqual(case["style"]["shape"], "soft")

    def test_unknown_material_is_rejected(self):
        with self.assertRaises(ValueError):
            live_bag(material="velvet")

    def test_older_bags_with_a_mesh_still_validate(self):
        from app.domain import Suitcase
        Suitcase.model_validate({
            "id": "bag-old", "name": "Old", "subtitle": "", "dimensions": [300, 400, 150],
            "clearance": 5, "mesh": box_mesh(), "kind": "backpack",
        })


class FakeResponses:
    def __init__(self, parsed):
        self.parsed = parsed
        self.calls = []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        return mock.Mock(output_parsed=self.parsed)


class AnalyzeBagRoute(unittest.TestCase):
    def setUp(self):
        signed_in = mock.patch.object(auth, "user_id", return_value="user-1")
        signed_in.start()
        self.addCleanup(signed_in.stop)
        self.responses = FakeResponses(live_bag())
        client = mock.Mock(responses=self.responses)
        provider = mock.patch.object(astra, "OpenAI", return_value=client)
        provider.start()
        self.addCleanup(provider.stop)
        self.client = TestClient(main.app)

    def post(self, count, content_type="image/jpeg", data=JPEG):
        files = [("photos", (f"bag-{i}.jpg", io.BytesIO(data), content_type)) for i in range(count)]
        return self.client.post(
            "/api/analyze-bag", files=files, headers={"Authorization": "Bearer token"}
        )

    def test_sends_every_angle_in_one_request(self):
        response = self.post(3)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["bag"]["name"], "Grey day pack")
        self.assertEqual(body["bag"]["photoCount"], 3)
        self.assertEqual(len(self.responses.calls), 1)
        content = self.responses.calls[0]["input"][1]["content"]
        images = [c for c in content if c["type"] == "input_image"]
        self.assertEqual(len(images), 3)
        self.assertTrue(all(i["image_url"].startswith("data:image/jpeg;base64,") for i in images))
        self.assertIn("these 3 photos of the same bag", content[0]["text"])
        self.assertIn("how it looks", content[0]["text"])

    def test_one_photo_is_enough(self):
        self.assertEqual(self.post(1).status_code, 200)

    def test_too_many_photos(self):
        response = self.post(5)
        self.assertEqual(response.status_code, 400)
        self.assertIn("1 to 4 photos", response.json()["error"])
        self.assertEqual(self.responses.calls, [])

    def test_no_photos(self):
        response = self.client.post(
            "/api/analyze-bag", headers={"Authorization": "Bearer token"}
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_images_that_are_not_what_they_claim(self):
        self.assertEqual(self.post(2, data=b"not a jpeg at all").status_code, 400)
        self.assertEqual(self.post(1, content_type="image/gif").status_code, 400)

    def test_unusable_bag_is_a_clear_error(self):
        self.responses.parsed = live_bag(interior={"width": 50, "length": 50, "height": 50})
        response = self.post(1)
        self.assertEqual(response.status_code, 422)
        self.assertIn("enter its size yourself", response.json()["error"])

    def test_provider_failure_is_a_clear_error(self):
        self.responses.parse = mock.Mock(side_effect=RuntimeError("upstream exploded"))
        response = self.post(2)
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("exploded", response.json()["error"])

    def test_requires_sign_in(self):
        with mock.patch.object(auth, "user_id", return_value=None):
            self.assertEqual(self.post(1).status_code, 401)

    def test_not_configured(self):
        with mock.patch.object(astra, "is_configured", return_value=False):
            response = self.post(1)
        self.assertEqual(response.status_code, 503)
        self.assertIn("enter your bag's size yourself", response.json()["error"])


class AnalyzeItemPhotoStillWorks(unittest.TestCase):
    """The single-photo item route shares the upload checks with the bag route."""

    def setUp(self):
        signed_in = mock.patch.object(auth, "user_id", return_value="user-1")
        signed_in.start()
        self.addCleanup(signed_in.stop)
        self.client = TestClient(main.app)

    def test_item_photo(self):
        with mock.patch.object(astra, "analyze_photo", return_value={"items": []}) as analyze:
            response = self.client.post(
                "/api/analyze",
                files={"photo": ("a.jpg", io.BytesIO(JPEG), "image/jpeg")},
                headers={"Authorization": "Bearer token"},
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(analyze.call_args.args[0].startswith("data:image/jpeg;base64,"))

    def test_item_photo_type_check(self):
        response = self.client.post(
            "/api/analyze",
            files={"photo": ("a.jpg", io.BytesIO(b"nope"), "image/jpeg")},
            headers={"Authorization": "Bearer token"},
        )
        self.assertEqual(response.status_code, 400)

    def test_slots_are_released_after_failures(self):
        with mock.patch.object(astra, "analyze_photo", side_effect=RuntimeError("x")):
            for _ in range(main.MAX_ACTIVE_ANALYSES + 1):
                response = self.client.post(
                    "/api/analyze",
                    files={"photo": ("a.jpg", io.BytesIO(JPEG), "image/jpeg")},
                    headers={"Authorization": "Bearer token"},
                )
                self.assertEqual(response.status_code, 502)
        self.assertEqual(main._active, 0)


class PackingIntoPhotographedBags(unittest.TestCase):
    def setUp(self):
        signed_in = mock.patch.object(auth, "user_id", return_value="user-1")
        signed_in.start()
        self.addCleanup(signed_in.stop)
        self.client = TestClient(main.app)

    def item(self, item_id, dims):
        return {
            "id": item_id, "key": item_id, "label": item_id, "category": "other",
            "color": "#888888", "appearance": "", "dimensions": dims, "estimate": dims,
            "scale": [1, 1, 1], "sourceIds": [], "included": True,
            "orientations": [0, 1, 2, 3, 4, 5], "edited": False,
        }

    def bag(self, **overrides):
        fields = astra.bag_from_analysis(live_bag(), "m", 2)["bag"]
        fields["id"] = "bag-abc"
        fields.update(overrides)
        return fields

    def pack(self, bag, items):
        return self.client.post(
            "/api/pack",
            json={"items": items, "bag": bag, "revision": "r1"},
            headers={"Authorization": "Bearer token"},
        )

    def test_backpack_packs_into_its_one_compartment(self):
        items = [self.item("a", [200, 300, 60]), self.item("b", [200, 300, 60])]
        response = self.pack(self.bag(), items)
        self.assertEqual(response.status_code, 200, response.text)
        plan = response.json()["plan"]
        self.assertEqual(len(plan["placements"]), 2)
        self.assertTrue(all("compartment" not in p for p in plan["placements"]))

    def test_style_is_optional_for_packing(self):
        bag = self.bag()
        bag.pop("style")
        self.assertEqual(self.pack(bag, [self.item("a", [100, 100, 50])]).status_code, 200)

    def test_too_large_item_is_reported_unplaced(self):
        response = self.pack(self.bag(), [self.item("big", [600, 600, 600])])
        self.assertEqual(response.status_code, 200)
        self.assertEqual([u["id"] for u in response.json()["plan"]["unplaced"]], ["big"])

    def test_photographed_suitcase_uses_both_halves(self):
        case = astra.bag_from_analysis(
            live_bag(kind="suitcase", opensFlat=True,
                     exterior={"width": 400, "length": 560, "height": 250},
                     interior={"width": 360, "length": 520, "height": 220}),
            "m", 2,
        )["bag"]
        case["id"] = "bag-case"
        items = [self.item(f"i{n}", [340, 500, 90]) for n in range(2)]
        response = self.pack(case, items)
        self.assertEqual(response.status_code, 200, response.text)
        placements = response.json()["plan"]["placements"]
        self.assertEqual(sorted(p["compartment"] for p in placements), ["base", "lid"])

    def test_export_keeps_the_bag_model(self):
        response = self.client.post(
            "/api/packing/export",
            json={"items": [self.item("a", [100, 100, 50])], "bag": self.bag()},
            headers={"Authorization": "Bearer token"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        bag = response.json()["bag"]
        self.assertEqual(bag["kind"], "backpack")
        self.assertEqual(bag["style"]["shape"], "daypack")

    def test_validated_as_packing_input(self):
        PackingInput.model_validate({"items": [], "bag": self.bag()})


class TripSync(unittest.TestCase):
    def state(self, bags):
        return {"items": [], "photos": [], "bagId": "bag-1", "dismissed": [], "demo": False,
                "customBags": bags}

    def test_own_bags_are_saved(self):
        bag = {"id": "bag-1", "name": "Mine", "dimensions": [300, 400, 150]}
        self.assertEqual(trips._clean(self.state([bag]))["customBags"], [bag])

    def test_bag_limit(self):
        with self.assertRaises(trips.TripError):
            trips._clean(self.state([{"id": f"bag-{n}"} for n in range(trips.MAX_CUSTOM_BAGS + 1)]))
        with self.assertRaises(trips.TripError):
            trips._clean(self.state("not a list"))


if __name__ == "__main__":
    unittest.main()
