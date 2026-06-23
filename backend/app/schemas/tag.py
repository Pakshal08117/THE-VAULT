from marshmallow import Schema, fields, validate

class TagSchema(Schema):
    id = fields.String(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    slug = fields.String(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
