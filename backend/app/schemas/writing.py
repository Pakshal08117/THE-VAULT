from marshmallow import Schema, fields, validate

class WritingSchema(Schema):
    id = fields.String(dump_only=True)
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True)
    content_type = fields.String(
        required=True,
        validate=validate.OneOf(["SHAYARI", "POEM", "QUOTE", "THOUGHT", "JOURNAL", "NOTE"])
    )
    category_id = fields.String(allow_none=True, missing=None)
    is_favorite = fields.Boolean()
    is_archived = fields.Boolean()
    tags = fields.List(fields.String(), missing=[])
