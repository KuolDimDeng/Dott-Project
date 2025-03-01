from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Update existing user with Cognito sub ID'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email')
        parser.add_argument('cognito_sub', type=str, help='Cognito sub ID')

    def handle(self, *args, **options):
        email = options['email']
        cognito_sub = options['cognito_sub']

        try:
            with transaction.atomic():
                user = User.objects.get(email=email)
                user.cognito_sub = cognito_sub
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully updated user {email} with Cognito sub {cognito_sub}'
                    )
                )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    f'User with email {email} does not exist'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Error updating user: {str(e)}'
                )
            )