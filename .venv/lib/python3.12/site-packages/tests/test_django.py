from django.test import TestCase, override_settings
from django.utils import timezone
from tests.models import DogModel


class TestPool(TestCase):

    def test_simple_request(self):
        DogModel.objects.create(name='wow')
        DogModel.objects.create(name='gog')

    @override_settings(USE_TZ=True, TIME_ZONE='Asia/Hong_Kong')
    def test_datetime_timezone(self):
        dog = DogModel.objects.create(name="wow", created=timezone.now())
        self.assertEqual(dog.created.tzname(), "UTC")
        dog = DogModel.objects.get(name="wow")
        self.assertEqual(dog.created.tzname(), "UTC")

    def test_with_json(self):
        DogModel.objects.create(name="wow", attrs={"color": "pink"})
        dog = DogModel.objects.get(name="wow")
        self.assertEqual(dog.attrs, {"color": "pink"})
