# Employee Management Authentication Fix

## Issue Description

The employee management API endpoints are returning 401 Unauthorized errors despite valid Cognito authentication tokens being sent from the frontend. The frontend logs indicate that the Cognito tokens are being processed correctly, but the backend API is rejecting the requests.

Backend logs reveal the specific error:
```
ERROR 2025-04-21 12:00:28,362 authentication [Auth] Error creating/updating user: User() got unexpected keyword arguments: 'username'
```

This error occurs in the `get_or_create_user` method of the `CognitoAuthentication` class when it attempts to create a new user with a `username` parameter. The custom `User` model in the application has explicitly removed the `username` field (setting it to `None`), which is causing the authentication to fail.

## Root Cause Analysis

1. The custom `User` model in `custom_auth/models.py` extends `AbstractUser` but sets `username = None` to use email-based authentication instead of username-based authentication.

2. The `CognitoAuthentication` class in `custom_auth/authentication.py` tries to create a user with both `email` and `username` parameters:
   ```python
   user = User.objects.create_user(
       email=email,
       username=email,  # This is causing the error
       first_name=first_name,
       last_name=last_name,
       cognito_sub=cognito_sub
   )
   ```

3. Since `username` is not a valid field in the custom `User` model, Django raises an error: `User() got unexpected keyword arguments: 'username'`

4. This authentication failure prevents CRUD operations on employees from working properly.

## Solution

The solution is to modify the `get_or_create_user` method in `CognitoAuthentication` to:

1. Remove the `username` parameter when creating a new user
2. Skip the `username` attribute when updating user attributes

The fix script (`Version0001_Fix_Employee_Authentication.py`) makes these changes:

1. Updates the user creation code to remove the `username` parameter
2. Adds explicit handling to skip the username field in the attribute updates section

## Implementation Details

The fix modifies two sections of the `custom_auth/authentication.py` file:

1. User creation section:
```python
# Original
user = User.objects.create_user(
    email=email,
    username=email,  # Use email as username
    first_name=first_name,
    last_name=last_name,
    cognito_sub=cognito_sub
)

# Fixed
user = User.objects.create_user(
    email=email,
    # Remove username parameter which is not supported in custom User model
    first_name=first_name,
    last_name=last_name,
    cognito_sub=cognito_sub
)
```

2. Attribute update section:
```python
# Original
# Update custom attributes if they exist in the User model
for attr_name, attr_value in user_custom_attributes.items():
    try:
        if hasattr(user, attr_name):
            setattr(user, attr_name, attr_value)
            update_fields.append(attr_name)
    except Exception as e:
        # Error handling...

# Fixed
# Update custom attributes if they exist in the User model
for attr_name, attr_value in user_custom_attributes.items():
    try:
        # Skip username field which is not in our User model
        if attr_name == 'username':
            logger.debug(f"[Auth] Skipping username attribute as it's not in User model")
            continue
            
        if hasattr(user, attr_name):
            setattr(user, attr_name, attr_value)
            update_fields.append(attr_name)
    except Exception as e:
        # Error handling...
```

## How to Apply the Fix

1. Run the fix script:
   ```bash
   python /Users/kuoldeng/projectx/backend/pyfactor/scripts/Version0001_Fix_Employee_Authentication.py
   ```

2. Restart the Django server:
   ```bash
   python /Users/kuoldeng/projectx/run_server.py
   ```

3. Verify that employee management API requests now work correctly.

## Additional Recommendations

1. **Test coverage**: Add tests specifically for the authentication flow to prevent similar issues in the future.

2. **Consistent model fields**: Review other code that might assume the presence of a username field and update accordingly.

3. **Logging improvements**: Consider adding more detailed logging around authentication failures to make debugging easier.

## Related Components

- `custom_auth/models.py`: Defines the custom User model without username field
- `custom_auth/authentication.py`: Handles Cognito authentication and user creation/updates
- `hr/views.py`: Contains the employee management API endpoints
- `hr/models.py`: Defines the Employee model which is different from the User model

## Security Considerations

This fix maintains the security model of the application while fixing a compatibility issue. It does not change the authentication mechanism itself, only how the user data is processed internally.

## Version Information

- **Script**: Version0001_Fix_Employee_Authentication.py
- **Fix applied**: April 21, 2025
- **Author**: AI Assistant 