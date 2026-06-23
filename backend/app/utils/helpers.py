import re
import bleach

def slugify(text: str) -> str:
    """
    Generate a URL-friendly slug from text.
    """
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")

def sanitize_html(html_content: str) -> str:
    """
    Sanitize HTML input to prevent XSS attacks.
    """
    allowed_tags = [
        "p", "br", "strong", "em", "u", "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li", "span", "blockquote", "pre", "code"
    ]
    allowed_attrs = {
        "span": ["class"],
        "p": ["class"],
    }
    return bleach.clean(html_content, tags=allowed_tags, attributes=allowed_attrs, strip=True)
