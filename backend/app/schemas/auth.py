from marshmallow import Schema, fields, validate

class RegisterSchema(Schema):
    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.String(
        required=True,
        validate=[
            validate.Length(min=8, max=100),
            validate.Regexp(
                r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,100}$",
                error="Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&)."
            )
        ]
    )
    display_name = fields.String(required=False, validate=validate.Length(max=100))

class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)

class PasswordResetRequestSchema(Schema):
    email = fields.Email(required=True)

class PasswordResetConfirmSchema(Schema):
    token = fields.String(required=True)
    new_password = fields.String(required=True, validate=validate.Length(min=8, max=100))
