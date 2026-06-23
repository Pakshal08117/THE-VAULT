from marshmallow import Schema, fields, validate

class CategorySchema(Schema):
    id = fields.String(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    slug = fields.String(dump_only=True)
    color_hex = fields.String(validate=validate.Regexp(r"^#[0-9a-fA-F]{6}$"), default="#d4af37")
    created_at = fields.DateTime(dump_only=True)
