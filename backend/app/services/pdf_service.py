import re
from datetime import datetime
import bleach
from fpdf import FPDF
from fpdf.enums import XPos, YPos

class VaultPDF(FPDF):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.current_writing_title = None
        self.show_header_footer = True
        self.title_gold_color = (212, 175, 55)
        self.text_color_slate = (45, 55, 72)
        self.border_color_light = (226, 232, 240)

    def header(self):
        if not self.show_header_footer:
            return
        
        # Running header: Title on the left, "The Vault" on the right
        self.set_font("helvetica", "I", 8)
        self.set_text_color(113, 128, 150) # Slate light
        
        title_text = self.current_writing_title or ""
        self.cell(0, 10, title_text, align="L", new_x=XPos.LMARGIN, new_y=YPos.TOP)
        self.cell(0, 10, "The Vault", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        # Horizontal thin line under header
        self.set_draw_color(*self.border_color_light)
        self.set_line_width(0.3)
        self.line(self.l_margin, 20, 210 - self.r_margin, 20)
        self.ln(5)

    def footer(self):
        if not self.show_header_footer:
            return
            
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(113, 128, 150)
        
        # Line above footer
        self.set_draw_color(*self.border_color_light)
        self.set_line_width(0.3)
        self.line(self.l_margin, 297 - 18, 210 - self.r_margin, 297 - 18)
        
        # Footer text: Page X
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

def clean_unicode_to_latin1(text: str) -> str:
    if not text:
        return ""
    # Map common curly quotes, dashes, ellipsis, spaces, bullet points, etc.
    replacements = {
        '\u2018': "'",  # Left single quote
        '\u2019': "'",  # Right single quote
        '\u201c': '"',  # Left double quote
        '\u201d': '"',  # Right double quote
        '\u2013': '-',  # En dash
        '\u2014': '--', # Em dash
        '\u2026': '...',# Ellipsis
        '\u2022': '*',  # Bullet character
        '\xa0': ' ',    # Non-breaking space
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
    # Encode to latin-1 and ignore or replace characters that don't fit
    return text.encode('latin-1', 'replace').decode('latin-1')

def clean_html_for_pdf(html_content: str) -> str:
    if not html_content:
        return ""
    # 1. Clean unicode characters first
    html_content = clean_unicode_to_latin1(html_content)
    
    # 2. Map common editor tags that FPDF's write_html doesn't style by default
    html_content = re.sub(r'<strong>', '<b>', html_content)
    html_content = re.sub(r'</strong>', '</b>', html_content)
    html_content = re.sub(r'<em>', '<i>', html_content)
    html_content = re.sub(r'</em>', '</i>', html_content)
    
    # 3. Sanitize the HTML using bleach to keep only valid PDF-friendly tags.
    # This also auto-closes tags and outputs well-formed HTML.
    allowed_tags = ['p', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'ul', 'ol', 'li', 'blockquote']
    cleaned_html = bleach.clean(html_content, tags=allowed_tags, attributes={}, strip=True)
    
    return cleaned_html

def generate_writing_pdf(writing) -> bytes:
    """
    Generates a beautifully laid out PDF document of the writing.
    """
    pdf = VaultPDF()
    pdf.show_header_footer = True
    pdf.current_writing_title = writing.title
    pdf.add_page()
    
    # ── Header / Title Card ──
    # Content Type Badge
    pdf.set_font("helvetica", "B", 8)
    pdf.set_text_color(113, 128, 150) # Grey/slate
    pdf.cell(0, 5, f"TYPE: {writing.content_type.upper()}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    
    # Main Title
    pdf.set_font("helvetica", "B", 22)
    pdf.set_text_color(212, 175, 55) # Gold
    pdf.cell(0, 15, writing.title, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    
    # Metadata Block (Category, Created, Word Count)
    pdf.set_font("helvetica", "I", 9)
    pdf.set_text_color(128, 128, 128)
    
    meta_parts = []
    if writing.category:
        meta_parts.append(f"Category: {writing.category.name}")
    meta_parts.append(f"Created: {writing.created_at.strftime('%b %d, %Y')}")
    meta_parts.append(f"Words: {writing.word_count}")
    
    pdf.cell(0, 8, "   |   ".join(meta_parts), new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    
    # Render Tags if any
    if writing.tags:
        tags_str = " ".join([f"#{t.name}" for t in writing.tags])
        pdf.set_font("helvetica", "B", 8)
        pdf.set_text_color(113, 128, 150)
        pdf.cell(0, 6, tags_str, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        
    # Decorative divider
    pdf.set_draw_color(212, 175, 55)
    pdf.set_line_width(0.5)
    curr_y = pdf.get_y() + 4
    pdf.line(50, curr_y, 160, curr_y)
    pdf.set_y(curr_y + 10)
    
    # ── Content Body ──
    cleaned_html = clean_html_for_pdf(writing.content)
    
    pdf.set_font("helvetica", size=11)
    pdf.set_text_color(50, 50, 50)
    
    try:
        pdf.write_html(cleaned_html)
    except Exception:
        # Fallback to plain text if HTML rendering fails
        html_stripped = re.sub(r'<[^>]+>', '\n', writing.content)
        cleaned_plain = clean_unicode_to_latin1(html_stripped)
        for line in cleaned_plain.split('\n'):
            pdf.multi_cell(0, 7, line.strip(), align="L")
            
    return pdf.output()

def _generate_multi_writing_pdf(title: str, subtitle: str, writings) -> bytes:
    pdf = VaultPDF()
    
    # ── 1. COVER PAGE ──
    pdf.show_header_footer = False
    pdf.add_page()
    
    # Add some top spacing
    pdf.set_y(80)
    
    # Main gold title
    pdf.set_font("helvetica", "B", 26)
    pdf.set_text_color(212, 175, 55) # Gold
    pdf.cell(0, 15, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    
    # Subtitle
    pdf.set_font("helvetica", "I", 12)
    pdf.set_text_color(113, 128, 150) # Slate light
    pdf.cell(0, 10, subtitle, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    
    # Decorative line
    pdf.set_draw_color(212, 175, 55)
    pdf.set_line_width(1.0)
    pdf.line(60, pdf.get_y() + 5, 150, pdf.get_y() + 5)
    pdf.ln(20)
    
    # Metadata footer on cover page
    pdf.set_y(220)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(0, 6, f"Compiled on {datetime.now().strftime('%B %d, %Y')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.cell(0, 6, f"Total Entries: {len(writings)}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.cell(0, 6, "Powered by The Vault", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    
    # ── 2. TABLE OF CONTENTS RESERVATION ──
    pdf.add_page() # Page 2 is reserved for ToC
    toc_page = pdf.page_no()
    
    # ── 3. RENDER WRITINGS ──
    pdf.show_header_footer = True
    writing_pages = [] # List of tuples: (title, page_number)
    
    for writing in writings:
        pdf.add_page()
        start_page = pdf.page_no()
        writing_pages.append((writing.title, start_page))
        
        pdf.current_writing_title = writing.title
        
        # Render header inside page (analogous to generate_writing_pdf but within book layout)
        # Content Type Badge
        pdf.set_font("helvetica", "B", 8)
        pdf.set_text_color(113, 128, 150)
        pdf.cell(0, 5, f"TYPE: {writing.content_type.upper()}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        
        # Title
        pdf.set_font("helvetica", "B", 20)
        pdf.set_text_color(212, 175, 55)
        pdf.cell(0, 12, writing.title, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        
        # Meta info
        pdf.set_font("helvetica", "I", 9)
        pdf.set_text_color(128, 128, 128)
        meta_parts = []
        if writing.category:
            meta_parts.append(f"Category: {writing.category.name}")
        meta_parts.append(f"Created: {writing.created_at.strftime('%b %d, %Y')}")
        meta_parts.append(f"Words: {writing.word_count}")
        pdf.cell(0, 6, "   |   ".join(meta_parts), new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        
        # Tags
        if writing.tags:
            tags_str = " ".join([f"#{t.name}" for t in writing.tags])
            pdf.set_font("helvetica", "B", 8)
            pdf.set_text_color(113, 128, 150)
            pdf.cell(0, 5, tags_str, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
            
        # Divider line
        pdf.set_draw_color(212, 175, 55)
        pdf.set_line_width(0.4)
        curr_y = pdf.get_y() + 4
        pdf.line(50, curr_y, 160, curr_y)
        pdf.set_y(curr_y + 8)
        
        # Body Content
        cleaned_html = clean_html_for_pdf(writing.content)
        pdf.set_font("helvetica", size=11)
        pdf.set_text_color(50, 50, 50)
        
        try:
            pdf.write_html(cleaned_html)
        except Exception:
            # Fallback
            html_stripped = re.sub(r'<[^>]+>', '\n', writing.content)
            cleaned_plain = clean_unicode_to_latin1(html_stripped)
            for line in cleaned_plain.split('\n'):
                pdf.multi_cell(0, 7, line.strip(), align="L")
                
    # ── 4. POPULATE TABLE OF CONTENTS (LATE BINDING) ──
    pdf.page = toc_page
    pdf.set_y(25)
    
    # Title
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(212, 175, 55)
    pdf.cell(0, 10, "TABLE OF CONTENTS", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    
    # Spacer
    pdf.set_draw_color(212, 175, 55)
    pdf.set_line_width(0.5)
    pdf.line(70, pdf.get_y() + 2, 140, pdf.get_y() + 2)
    pdf.ln(12)
    
    # Render ToC items
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(45, 55, 72) # Slate dark
    
    for title_text, p_num in writing_pages:
        # Prevent title_text from breaking layout if extremely long
        short_title = title_text[:40] + "..." if len(title_text) > 43 else title_text
        
        # Dot leaders
        dots_count = 65 - len(short_title)
        dots = "." * max(5, dots_count)
        
        # Render left-aligned title, right-aligned page num
        pdf.set_x(25) # Margin padding
        pdf.cell(0, 8, short_title, new_x=XPos.LMARGIN, new_y=YPos.TOP)
        
        # Render dots and page number right-aligned
        pdf.set_x(25)
        pdf.cell(150, 8, f"{dots} {p_num}", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
    return pdf.output()

def generate_category_pdf(category, writings) -> bytes:
    title = f"Category: {category.name}"
    subtitle = "A classified vault category collection"
    return _generate_multi_writing_pdf(title, subtitle, writings)

def generate_collection_pdf(collection_title: str, writings) -> bytes:
    title = collection_title or "The Vault Collection"
    subtitle = "A customized collection of compiled writings"
    return _generate_multi_writing_pdf(title, subtitle, writings)

