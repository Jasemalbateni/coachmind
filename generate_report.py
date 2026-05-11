# -*- coding: utf-8 -*-
"""
Coach Mind — Arabic PDF Product Report Generator
Uses: reportlab, arabic-reshaper, python-bidi
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display

# ─────────────────────────────────────────────
# BRAND COLORS
# ─────────────────────────────────────────────
NAVY       = colors.HexColor('#1C2D5A')
MINT       = colors.HexColor('#63C0B0')
WHITE      = colors.HexColor('#FFFFFF')
LIGHT_GRAY = colors.HexColor('#F5F7FA')
CHARCOAL   = colors.HexColor('#333F48')
DARK_MINT  = colors.HexColor('#4AA898')
LIGHT_MINT = colors.HexColor('#E8F7F5')
MID_GRAY   = colors.HexColor('#AABBC8')

PAGE_W, PAGE_H = A4  # 595.27 x 841.89 pt

# ─────────────────────────────────────────────
# FONT REGISTRATION
# ─────────────────────────────────────────────
FONTS_DIR = r'C:\Windows\Fonts'

def register_fonts():
    font_candidates = [
        ('ArabicRegular', 'arial.ttf'),
        ('ArabicBold',    'arialbd.ttf'),
        ('ArabicRegular', 'calibri.ttf'),
        ('ArabicBold',    'calibrib.ttf'),
        ('ArabicRegular', 'arabtype.ttf'),
        ('ArabicRegular', 'trado.ttf'),
        ('ArabicBold',    'tradbdo.ttf'),
    ]
    registered = {}
    for name, fname in font_candidates:
        if name in registered:
            continue
        fpath = os.path.join(FONTS_DIR, fname)
        if os.path.exists(fpath):
            try:
                pdfmetrics.registerFont(TTFont(name, fpath))
                registered[name] = fpath
                print(f"Registered font: {name} -> {fpath}")
            except Exception as e:
                print(f"Failed to register {name} from {fpath}: {e}")

    # Ensure both exist
    if 'ArabicRegular' not in registered:
        raise RuntimeError("No Arabic regular font found in C:\\Windows\\Fonts\\")
    if 'ArabicBold' not in registered:
        # Fall back to regular
        pdfmetrics.registerFont(TTFont('ArabicBold', registered['ArabicRegular']))
        print("ArabicBold not found; using ArabicRegular as bold")

register_fonts()

# ─────────────────────────────────────────────
# ARABIC TEXT HELPER
# ─────────────────────────────────────────────
def ar(text):
    """Reshape Arabic text and apply BiDi algorithm for correct RTL display."""
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)

# ─────────────────────────────────────────────
# PARAGRAPH STYLES
# ─────────────────────────────────────────────
def make_styles():
    styles = {}

    styles['cover_title'] = ParagraphStyle(
        'cover_title',
        fontName='ArabicBold',
        fontSize=42,
        textColor=WHITE,
        alignment=TA_CENTER,
        leading=56,
        spaceAfter=10,
    )
    styles['cover_subtitle_ar'] = ParagraphStyle(
        'cover_subtitle_ar',
        fontName='ArabicBold',
        fontSize=22,
        textColor=MINT,
        alignment=TA_CENTER,
        leading=32,
        spaceAfter=8,
    )
    styles['cover_subtitle_en'] = ParagraphStyle(
        'cover_subtitle_en',
        fontName='ArabicRegular',
        fontSize=14,
        textColor=WHITE,
        alignment=TA_CENTER,
        leading=22,
        spaceAfter=6,
    )
    styles['cover_date'] = ParagraphStyle(
        'cover_date',
        fontName='ArabicBold',
        fontSize=16,
        textColor=NAVY,
        alignment=TA_CENTER,
        leading=24,
    )
    styles['toc_title'] = ParagraphStyle(
        'toc_title',
        fontName='ArabicBold',
        fontSize=28,
        textColor=NAVY,
        alignment=TA_CENTER,
        leading=40,
        spaceAfter=20,
    )
    styles['toc_item'] = ParagraphStyle(
        'toc_item',
        fontName='ArabicBold',
        fontSize=14,
        textColor=CHARCOAL,
        alignment=TA_RIGHT,
        leading=26,
        spaceAfter=4,
        rightIndent=10,
    )
    styles['section_num'] = ParagraphStyle(
        'section_num',
        fontName='ArabicBold',
        fontSize=13,
        textColor=MINT,
        alignment=TA_RIGHT,
        leading=18,
    )
    styles['section_title'] = ParagraphStyle(
        'section_title',
        fontName='ArabicBold',
        fontSize=20,
        textColor=NAVY,
        alignment=TA_RIGHT,
        leading=30,
        spaceAfter=6,
    )
    styles['body'] = ParagraphStyle(
        'body',
        fontName='ArabicRegular',
        fontSize=12,
        textColor=CHARCOAL,
        alignment=TA_RIGHT,
        leading=22,
        spaceAfter=6,
        rightIndent=6,
    )
    styles['body_bold'] = ParagraphStyle(
        'body_bold',
        fontName='ArabicBold',
        fontSize=12,
        textColor=CHARCOAL,
        alignment=TA_RIGHT,
        leading=22,
        spaceAfter=4,
        rightIndent=6,
    )
    styles['bullet'] = ParagraphStyle(
        'bullet',
        fontName='ArabicRegular',
        fontSize=12,
        textColor=CHARCOAL,
        alignment=TA_RIGHT,
        leading=22,
        spaceAfter=3,
        rightIndent=16,
        leftIndent=0,
    )
    styles['card_text'] = ParagraphStyle(
        'card_text',
        fontName='ArabicRegular',
        fontSize=11,
        textColor=CHARCOAL,
        alignment=TA_RIGHT,
        leading=20,
        spaceAfter=3,
        rightIndent=8,
    )
    styles['card_title'] = ParagraphStyle(
        'card_title',
        fontName='ArabicBold',
        fontSize=12,
        textColor=NAVY,
        alignment=TA_RIGHT,
        leading=22,
        spaceAfter=4,
        rightIndent=8,
    )
    styles['sub_heading'] = ParagraphStyle(
        'sub_heading',
        fontName='ArabicBold',
        fontSize=14,
        textColor=DARK_MINT,
        alignment=TA_RIGHT,
        leading=24,
        spaceAfter=4,
        spaceBefore=8,
        rightIndent=6,
    )
    return styles

STYLES = make_styles()

# ─────────────────────────────────────────────
# COVER PAGE CANVAS CALLBACK
# ─────────────────────────────────────────────
def cover_page_background(canvas, doc):
    canvas.saveState()
    # Full navy background
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Decorative mint accent — top bar
    canvas.setFillColor(MINT)
    canvas.rect(0, PAGE_H - 8, PAGE_W, 8, fill=1, stroke=0)

    # Large faded circle decoration (top right)
    canvas.setFillColor(colors.HexColor('#253870'))
    canvas.circle(PAGE_W - 60, PAGE_H - 60, 160, fill=1, stroke=0)

    # Smaller circle (bottom left)
    canvas.setFillColor(colors.HexColor('#213166'))
    canvas.circle(60, 80, 120, fill=1, stroke=0)

    # Mint accent line (horizontal, middle area)
    canvas.setStrokeColor(MINT)
    canvas.setLineWidth(1.5)
    canvas.line(60, PAGE_H * 0.38, PAGE_W - 60, PAGE_H * 0.38)

    # Bottom mint bar
    canvas.setFillColor(MINT)
    canvas.rect(0, 0, PAGE_W, 60, fill=1, stroke=0)

    canvas.restoreState()

def normal_page_background(canvas, doc):
    canvas.saveState()
    # White background
    canvas.setFillColor(WHITE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Top navy bar
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 40, PAGE_W, 40, fill=1, stroke=0)
    # Mint accent line below header
    canvas.setFillColor(MINT)
    canvas.rect(0, PAGE_H - 44, PAGE_W, 4, fill=1, stroke=0)
    # Bottom footer
    canvas.setFillColor(LIGHT_GRAY)
    canvas.rect(0, 0, PAGE_W, 30, fill=1, stroke=0)
    canvas.setFillColor(MID_GRAY)
    canvas.setFont('ArabicRegular', 9)
    page_num = doc.page
    canvas.drawCentredString(PAGE_W / 2, 10, str(page_num))
    canvas.restoreState()

# ─────────────────────────────────────────────
# HELPER FLOWABLES
# ─────────────────────────────────────────────
class SectionHeader(Table):
    """A section header with mint left-border accent."""
    pass

def section_header(num_ar, title_ar):
    """Return a list of flowables for a section header."""
    items = []
    items.append(Spacer(1, 8))
    # Accent bar as a colored table cell on the right side
    num_text = ar(num_ar)
    title_text = ar(title_ar)
    data = [[
        Paragraph(f'<font color="#63C0B0">{num_text}</font>  {title_text}',
                  STYLES['section_title']),
    ]]
    tbl = Table(data, colWidths=[PAGE_W - 100])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), WHITE),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEAFTER', (0, 0), (0, -1), 5, MINT),  # right border accent
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [LIGHT_MINT]),
    ]))
    items.append(tbl)
    items.append(Spacer(1, 10))
    return items

def bullet_item(text_ar):
    """Single bullet point paragraph."""
    return Paragraph(f'\u2022 {ar(text_ar)}', STYLES['bullet'])

def sub_heading(text_ar):
    return Paragraph(ar(text_ar), STYLES['sub_heading'])

def body_para(text_ar):
    return Paragraph(ar(text_ar), STYLES['body'])

def body_bold(text_ar):
    return Paragraph(ar(text_ar), STYLES['body_bold'])

def card_box(title_ar, items_ar):
    """Light gray card with title and bullet items."""
    content = []
    if title_ar:
        content.append(Paragraph(ar(title_ar), STYLES['card_title']))
    for item in items_ar:
        content.append(Paragraph(f'\u2022 {ar(item)}', STYLES['card_text']))

    data = [[content]]
    tbl = Table(data, colWidths=[PAGE_W - 100])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('BOX', (0, 0), (-1, -1), 1, MID_GRAY),
        ('LINEBEFORE', (0, 0), (0, -1), 4, MINT),
    ]))
    return tbl

def sp(h=6):
    return Spacer(1, h)

# ─────────────────────────────────────────────
# BUILD DOCUMENT
# ─────────────────────────────────────────────
OUTPUT_PATH = r'C:\Users\asus\sessionbuilder\coach-mind-product-report.pdf'

def build_pdf():
    story = []

    # ── PAGE 1: COVER ──────────────────────────────────────────────────
    # We use a special first-page template via onFirstPage / onLaterPages
    # The cover content is placed with spacers to position vertically

    # Top spacer — push content down from top bar
    story.append(Spacer(1, 100))

    # Platform icon / logo placeholder (mint circle with text)
    logo_data = [[Paragraph(ar('⚽'), ParagraphStyle(
        'logo', fontName='ArabicRegular', fontSize=48,
        textColor=MINT, alignment=TA_CENTER, leading=60))]]
    logo_tbl = Table(logo_data, colWidths=[PAGE_W - 80])
    logo_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.transparent),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(logo_tbl)
    story.append(sp(20))

    # Main title
    story.append(Paragraph(ar('منصة المدرب'), STYLES['cover_title']))
    story.append(sp(10))

    # Arabic subtitle
    story.append(Paragraph(ar('Coach Mind'), ParagraphStyle(
        'cm', fontName='ArabicBold', fontSize=24,
        textColor=colors.HexColor('#A0C8E0'), alignment=TA_CENTER, leading=34)))
    story.append(sp(20))

    # Mint separator line
    story.append(HRFlowable(width='70%', thickness=2, color=MINT, spaceAfter=16, spaceBefore=4))

    # Arabic product subtitle
    story.append(Paragraph(ar('تقرير تطوير المنتج الاستراتيجي'), STYLES['cover_subtitle_ar']))
    story.append(sp(12))

    # English subtitle
    story.append(Paragraph(
        'Drill Editor & Coaching Platform — Product Vision Report',
        STYLES['cover_subtitle_en']))

    story.append(Spacer(1, 200))

    # Date bar content (will sit over the mint bar drawn in background)
    story.append(Paragraph(ar('مارس ٢٠٢٦'), STYLES['cover_date']))

    story.append(PageBreak())

    # ── PAGE 2: TABLE OF CONTENTS ──────────────────────────────────────
    story.append(sp(20))
    story.append(Paragraph(ar('فهرس المحتويات'), STYLES['toc_title']))
    story.append(HRFlowable(width='80%', thickness=2, color=MINT, spaceAfter=20, spaceBefore=4))

    toc_items = [
        ('١', 'نظرة عامة على المشروع'),
        ('٢', 'تقييم الحالة الحالية'),
        ('٣', 'تجربة المستخدم (UX)'),
        ('٤', 'مقارنة مع أفضل الأدوات العالمية'),
        ('٥', 'الرؤية للوصول إلى منتج عالمي'),
        ('٦', 'أهم التعديلات المطلوبة'),
        ('٧', 'إضافات للوصول لمستوى عالمي'),
        ('٨', 'كيف نجعل المنتج سهلاً لأي مستخدم'),
        ('٩', 'التحول إلى برنامج على الكمبيوتر'),
        ('١٠', 'التحول إلى تطبيق iPad'),
        ('١١', 'أخطر 10 أفكار للتفوق عالمياً'),
    ]

    for num, title in toc_items:
        row_data = [[
            Paragraph(ar(num), ParagraphStyle(
                'toc_num', fontName='ArabicBold', fontSize=13,
                textColor=MINT, alignment=TA_LEFT, leading=22)),
            Paragraph(ar(title), STYLES['toc_item']),
        ]]
        tbl = Table(row_data, colWidths=[40, PAGE_W - 140])
        tbl.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, MID_GRAY),
        ]))
        story.append(tbl)
        story.append(sp(2))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 1 — نظرة عامة على المشروع
    # ══════════════════════════════════════════
    story.extend(section_header('١', 'نظرة عامة على المشروع'))

    story.append(body_para(
        'منصة المدرب هي منصة رقمية متخصصة تُمكّن المدربين وأكاديميات كرة القدم '
        'من تصميم التمارين، بناء الجلسات التدريبية، والتخطيط الموسمي بشكل احترافي '
        'وسهل الاستخدام.'))
    story.append(sp(10))

    story.append(sub_heading('المحاور الرئيسية الثلاثة'))
    story.append(card_box(None, [
        'محرر التمارين — تصميم تمارين تكتيكية تفاعلية على ملعب رقمي',
        'منشئ الجلسات — بناء جلسات تدريبية متكاملة بترتيب منطقي',
        'التخطيط الموسمي — تقويم موسمي شامل لتنظيم الخطط السنوية',
    ]))
    story.append(sp(10))

    story.append(sub_heading('المستخدمون المستهدفون'))
    story.append(bullet_item('المدربون الميدانيون في جميع المستويات'))
    story.append(bullet_item('مديرو الأكاديميات ومراكز التدريب'))
    story.append(bullet_item('المحللون التكتيكيون والمساعدون الفنيون'))
    story.append(bullet_item('المدربون المستقلون ومدربو النشء والشباب'))
    story.append(sp(12))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 2 — تقييم الحالة الحالية
    # ══════════════════════════════════════════
    story.extend(section_header('٢', 'تقييم الحالة الحالية'))

    story.append(sub_heading('ما تم إنجازه'))
    story.append(card_box('الإنجازات المكتملة', [
        'ملعب رقمي تفاعلي بأحجام متعددة (كامل، نصف، ثلث)',
        'لاعبون بألوان الفريقين مع أرقام وأدوار محددة',
        'أسهم وخطوط تكتيكية بأنواع مختلفة (تمرير، ركض، ضغط)',
        'خطوط منحنية للحركات الدقيقة والمسارات المعقدة',
        'نظام خطوات متعددة داخل التمرين الواحد',
        'محاكاة حركة اللاعبين بصرياً بشكل متسلسل',
        'مكتبة تمارين منظمة في مجلدات وفئات وفئات فرعية',
        'تقويم موسمي متكامل للتخطيط والجدولة',
        'طباعة احترافية للتمارين والجلسات',
    ]))
    story.append(sp(12))

    story.append(sub_heading('ما يحتاج تحسيناً'))
    story.append(bullet_item('سرعة الوصول للأدوات والعناصر'))
    story.append(bullet_item('التغذية الراجعة البصرية عند تنفيذ الإجراءات'))
    story.append(bullet_item('تجربة المستخدم الأول ونظام الإرشاد'))
    story.append(bullet_item('تحسين التجربة على الشاشات الصغيرة'))
    story.append(sp(10))

    story.append(sub_heading('ما ينقص حالياً'))
    story.append(bullet_item('مكتبة عناصر غنية (أهداف، أقماع، حواجز)'))
    story.append(bullet_item('نظام تعاون متعدد المستخدمين'))
    story.append(bullet_item('مشاركة التمارين مع مدربين آخرين'))
    story.append(bullet_item('نسخة متخصصة للجوال والـ iPad'))
    story.append(sp(12))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 3 — تجربة المستخدم (UX)
    # ══════════════════════════════════════════
    story.extend(section_header('٣', 'تجربة المستخدم (UX)'))

    story.append(sub_heading('نقاط الضعف الحالية'))
    story.append(bullet_item('المستخدم الجديد لا يعرف من أين يبدأ عند فتح التطبيق'))
    story.append(bullet_item('الأدوات كثيرة ومربكة في الواجهة الرئيسية'))
    story.append(bullet_item('وضع اللاعبين على الملعب يتطلب خطوات متعددة'))
    story.append(bullet_item('نظام الخطوات غير واضح بصرياً ولا يُفهم بسهولة'))
    story.append(sp(12))

    story.append(sub_heading('الحلول المقترحة'))

    solutions = [
        ('نظام Quick Start الذكي',
         'عند فتح تمرين جديد تظهر نافذة ترحيبية تسأل المدرب عن نوع التمرين وعدد اللاعبين لتبدأ بإعداد الملعب تلقائياً'),
        ('شريط أدوات مبسط',
         'عرض 5 أدوات فقط في الوضع الافتراضي مع إمكانية التوسع لعرض كل الأدوات للمستخدمين المتقدمين'),
        ('Smart Arrow — السهم الذكي',
         'اضغط على لاعب واسحب نحو مكان آخر يرسم السهم تلقائياً دون الحاجة لتحديد نوع السهم مسبقاً'),
        ('توجيه مرئي للمستخدم الأول',
         'نظام Onboarding تفاعلي يرشد المستخدم الجديد خطوة بخطوة في أول استخدام'),
    ]

    for title, desc in solutions:
        story.append(sp(6))
        data = [[
            Paragraph(ar(title), STYLES['card_title']),
        ], [
            Paragraph(ar(desc), STYLES['card_text']),
        ]]
        tbl = Table(data, colWidths=[PAGE_W - 100])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_MINT),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
            ('RIGHTPADDING', (0, 0), (-1, -1), 14),
            ('TOPPADDING', (0, 0), (0, 0), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LINEBEFORE', (0, 0), (0, -1), 4, MINT),
            ('BOX', (0, 0), (-1, -1), 0.5, MINT),
        ]))
        story.append(tbl)

    story.append(sp(12))
    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 4 — مقارنة مع أفضل الأدوات العالمية
    # ══════════════════════════════════════════
    story.extend(section_header('٤', 'مقارنة مع أفضل الأدوات العالمية'))

    story.append(sub_heading('مقارنة مع TacticalPad'))

    comp1_data = [
        [Paragraph(ar('أين نتفوق'), STYLES['card_title']),
         Paragraph(ar('أين نحن أضعف'), STYLES['card_title'])],
        [Paragraph(ar('• نظام الجلسات التدريبية المتكامل\n• التخطيط الموسمي الشامل\n• نظام الخطوات المتعددة\n• المحاكاة الحركية للاعبين'),
                   STYLES['card_text']),
         Paragraph(ar('• مكتبة العناصر الجاهزة أقل ثراءً\n• غياب نسخة iPad مخصصة'),
                   STYLES['card_text'])],
    ]
    tbl1 = Table(comp1_data, colWidths=[(PAGE_W - 100) / 2, (PAGE_W - 100) / 2])
    tbl1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('BACKGROUND', (0, 1), (0, -1), LIGHT_MINT),
        ('BACKGROUND', (1, 1), (1, -1), colors.HexColor('#FFF5F5')),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, MID_GRAY),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, MID_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(tbl1)
    story.append(sp(14))

    story.append(sub_heading('مقارنة مع SessionLab'))

    comp2_data = [
        [Paragraph(ar('أين نتفوق'), STYLES['card_title']),
         Paragraph(ar('أين نحن أضعف'), STYLES['card_title'])],
        [Paragraph(ar('• الرسم التكتيكي الكامل والمتقدم\n• التخصص الكامل في كرة القدم\n• أدوات تكتيكية احترافية'),
                   STYLES['card_text']),
         Paragraph(ar('• قوالب الجلسات الجاهزة أقل عدداً\n• نظام التعاون بين المدربين غير موجود'),
                   STYLES['card_text'])],
    ]
    tbl2 = Table(comp2_data, colWidths=[(PAGE_W - 100) / 2, (PAGE_W - 100) / 2])
    tbl2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('BACKGROUND', (0, 1), (0, -1), LIGHT_MINT),
        ('BACKGROUND', (1, 1), (1, -1), colors.HexColor('#FFF5F5')),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, MID_GRAY),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, MID_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(tbl2)
    story.append(sp(14))

    # Conclusion card
    concl_data = [[Paragraph(
        ar('الخلاصة: منتجنا يجمع قوة TacticalPad في الرسم التكتيكي مع قوة SessionLab '
           'في التخطيط والتنظيم — وهذا المزيج الفريد لا يوجد في أي منتج آخر حالياً في السوق.'),
        ParagraphStyle('concl', fontName='ArabicBold', fontSize=13, textColor=WHITE,
                       alignment=TA_RIGHT, leading=24, rightIndent=8))]]
    concl_tbl = Table(concl_data, colWidths=[PAGE_W - 100])
    concl_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LINEBEFORE', (0, 0), (0, -1), 5, MINT),
    ]))
    story.append(concl_tbl)
    story.append(sp(12))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 5 — الرؤية للوصول إلى منتج عالمي
    # ══════════════════════════════════════════
    story.extend(section_header('٥', 'الرؤية للوصول إلى منتج عالمي'))

    pillars = [
        ('البساطة القصوى', 'بديهي لدرجة أن أي مدرب يستطيع استخدامه بكفاءة في اليوم الأول دون تدريب مسبق'),
        ('السرعة الاستثنائية', 'من فكرة التمرين إلى تصميم احترافي جاهز للطباعة في أقل من 5 دقائق'),
        ('القوة الخفية', 'أدوات متقدمة وخيارات قوية موجودة لكنها لا تظهر في الواجهة الرئيسية حتى لا تربك المستخدم'),
        ('المجتمع والمشاركة', 'مكتبة مفتوحة يشارك فيها المدربون من حول العالم تمارينهم وخططهم'),
    ]

    for i, (title, desc) in enumerate(pillars):
        num = ['١', '٢', '٣', '٤'][i]
        data = [[
            Paragraph(ar(num), ParagraphStyle(
                f'pil{i}', fontName='ArabicBold', fontSize=22,
                textColor=MINT, alignment=TA_CENTER, leading=30)),
            [Paragraph(ar(title), STYLES['card_title']),
             Paragraph(ar(desc), STYLES['card_text'])],
        ]]
        tbl = Table(data, colWidths=[50, PAGE_W - 150])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BOX', (0, 0), (-1, -1), 1, MID_GRAY),
            ('LINEAFTER', (1, 0), (1, -1), 4, MINT),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(tbl)
        story.append(sp(8))

    story.append(sp(12))
    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 6 — أهم التعديلات المطلوبة
    # ══════════════════════════════════════════
    story.extend(section_header('٦', 'أهم التعديلات المطلوبة'))

    edits = [
        ('١ — نظام Quick Start الذكي',
         'عند فتح تمرين جديد تظهر نافذة تسأل عن نوع التمرين وعدد اللاعبين، ثم تُعِد الملعب تلقائياً بالتشكيل المناسب وتضع الأدوات الضرورية في متناول اليد.'),
        ('٢ — شريط أدوات مبسط',
         'وضع بسيط يعرض 5 أدوات فقط للمبتدئين، ووضع متقدم يعرض كل الأدوات للمستخدمين ذوي الخبرة. يمكن التبديل بينهما بضغطة واحدة.'),
        ('٣ — Smart Arrow — السهم الذكي',
         'اضغط على أي لاعب واسحب نحو مكان أو لاعب آخر فيرسم السهم المناسب تلقائياً مع تتبع حركة اللاعب في نظام الخطوات.'),
        ('٤ — معاينة فورية للطباعة',
         'زر معاينة يظهر التمرين بشكله النهائي المطبوع مباشرة دون مغادرة المحرر، مع خيارات سريعة لتعديل التخطيط قبل الطباعة.'),
        ('٥ — تبسيط نظام الخطوات',
         'شريط خطوات مرئي يشبه Timeline الزمني بأرقام واضحة، مع إمكانية السحب لإعادة الترتيب ومعاينة سريعة لكل خطوة عند التحويم.'),
        ('٦ — نظام أقماع ذكي',
         'قوالب جاهزة للأقماع والعناصر التدريبية توضع على الملعب بضغطة واحدة، مع قوالب تكتيكية شائعة (مربع، خط، دائرة) جاهزة للاستخدام.'),
    ]

    for title, desc in edits:
        story.append(sp(6))
        data = [
            [Paragraph(ar(title), STYLES['card_title'])],
            [Paragraph(ar(desc), STYLES['card_text'])],
        ]
        tbl = Table(data, colWidths=[PAGE_W - 100])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EEF3FA')),
            ('BACKGROUND', (0, 1), (-1, -1), LIGHT_GRAY),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
            ('RIGHTPADDING', (0, 0), (-1, -1), 14),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 0.5, MID_GRAY),
            ('LINEAFTER', (0, 0), (0, -1), 4, MINT),
        ]))
        story.append(tbl)

    story.append(sp(12))
    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 7 — إضافات للوصول لمستوى عالمي
    # ══════════════════════════════════════════
    story.extend(section_header('٧', 'إضافات للوصول لمستوى عالمي'))

    additions = [
        ('أ) إضافات تجربة المستخدم', [
            'نظام Onboarding تفاعلي يرشد المستخدم الجديد',
            'Undo/Redo موثوق 100% مع تاريخ لا محدود',
            'Auto-save تلقائي مع مؤشر حالة دائم',
            'وضع Dark Mode للعمل في الإضاءة المنخفضة',
            'تاريخ التعديلات مع إمكانية الرجوع لأي نسخة',
        ]),
        ('ب) إضافات المحرر', [
            'مكتبة عناصر غنية (أهداف، أقماع، حواجز، علامات)',
            'رسم حر بالفأرة للشرح السريع والتوضيح',
            'طبقات (Layers) منفصلة للاعبين والعناصر والأسهم',
            'قفل العناصر الثابتة لمنع تحريكها بالخطأ',
        ]),
        ('ج) إضافات ذكية', [
            'اقتراح التمارين المشابهة بالذكاء الاصطناعي',
            'تحليل توازن الجلسة التدريبية تلقائياً',
            'تنبيه عند تكرار نفس التمرين في فترة قصيرة',
            'مساعد ذكي لكتابة وصف التمرين وأهدافه',
        ]),
        ('د) إضافات تنظيمية', [
            'تحضير المباريات تكتيكياً مع تحليل المنافس',
            'تتبع تطور اللاعبين عبر الموسم',
            'تقرير نهاية الأسبوع الآلي مقارنة بالخطة',
        ]),
    ]

    for cat_title, items in additions:
        story.append(sub_heading(cat_title))
        story.append(card_box(None, items))
        story.append(sp(8))

    story.append(sp(12))
    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 8 — كيف نجعل المنتج سهلاً لأي مستخدم
    # ══════════════════════════════════════════
    story.extend(section_header('٨', 'كيف نجعل المنتج سهلاً لأي مستخدم'))

    story.append(sub_heading('مبدأ الثلاث طبقات'))

    layers_data = [
        [Paragraph(ar('الطبقة'), STYLES['card_title']),
         Paragraph(ar('نوع المستخدم'), STYLES['card_title']),
         Paragraph(ar('ما يراه ويستخدمه'), STYLES['card_title'])],
        [Paragraph(ar('الأولى'), STYLES['card_text']),
         Paragraph(ar('المبتدئ'), STYLES['card_text']),
         Paragraph(ar('قوالب جاهزة + 5 أدوات فقط'), STYLES['card_text'])],
        [Paragraph(ar('الثانية'), STYLES['card_text']),
         Paragraph(ar('المتوسط'), STYLES['card_text']),
         Paragraph(ar('تحرير حر + كل الأدوات المتاحة'), STYLES['card_text'])],
        [Paragraph(ar('الثالثة'), STYLES['card_text']),
         Paragraph(ar('المتقدم'), STYLES['card_text']),
         Paragraph(ar('خطوات + محاكاة + تكتيك متعمق'), STYLES['card_text'])],
    ]
    layers_tbl = Table(layers_data, colWidths=[
        (PAGE_W - 100) * 0.2,
        (PAGE_W - 100) * 0.3,
        (PAGE_W - 100) * 0.5,
    ])
    layers_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_MINT),
        ('BACKGROUND', (0, 2), (-1, 2), LIGHT_GRAY),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#EEF3FA')),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, MID_GRAY),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, MID_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(layers_tbl)
    story.append(sp(14))

    story.append(sub_heading('ما يجب إخفاؤه في الواجهة الافتراضية'))
    story.append(bullet_item('الأدوات التكتيكية المتخصصة (الخطوط الدفاعية، مناطق الضغط)'))
    story.append(bullet_item('إعدادات الملعب والأبعاد والنسب التفصيلية'))
    story.append(bullet_item('خيارات الطبقات والمحاذاة الدقيقة'))
    story.append(sp(10))

    story.append(sub_heading('ما يجب جعله تلقائياً'))
    story.append(bullet_item('الحفظ التلقائي كل 30 ثانية'))
    story.append(bullet_item('ترقيم اللاعبين تلقائياً عند إضافتهم'))
    story.append(bullet_item('تسمية التمرين بالتاريخ كاسم افتراضي'))
    story.append(bullet_item('تطبيق ألوان الفريق تلقائياً على اللاعبين الجدد'))
    story.append(sp(12))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 9 — التحول إلى برنامج على الكمبيوتر
    # ══════════════════════════════════════════
    story.extend(section_header('٩', 'التحول إلى برنامج على الكمبيوتر'))

    story.append(sub_heading('الفوائد الكبرى'))
    benefits = [
        ('يعمل بدون إنترنت', 'متاح على أرض الملعب وفي أي مكان بدون الحاجة لشبكة'),
        ('أسرع وأكثر استجابة', 'أداء أعلى من المتصفح بكثير، خاصة مع الملاعب المعقدة'),
        ('تكامل مع الطابعة', 'طباعة مباشرة بدون إعدادات معقدة أو مشاكل المتصفح'),
        ('حفظ الملفات محلياً', 'بيانات المدرب آمنة على جهازه تماماً'),
        ('أيقونة سطح المكتب', 'تزيد الاستخدام اليومي وتجعل التطبيق جزءاً من الروتين'),
    ]
    for title, desc in benefits:
        story.append(bullet_item(f'{title}: {desc}'))
    story.append(sp(10))

    story.append(sub_heading('ما يجب إضافته للنسخة المكتبية'))
    story.append(card_box(None, [
        'مزامنة ذكية تلقائية عند الاتصال بالإنترنت',
        'مدير ملفات بسيط داخل التطبيق',
        'إشعارات الكمبيوتر للتذكير بالجلسات القادمة',
        'استيراد وتصدير الملفات بتنسيقات متعددة',
    ]))
    story.append(sp(12))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 10 — التحول إلى تطبيق iPad
    # ══════════════════════════════════════════
    story.extend(section_header('١٠', 'التحول إلى تطبيق iPad'))

    story.append(sub_heading('لماذا iPad مهم جداً'))
    story.append(bullet_item('المدربون في أوروبا وأمريكا يستخدمونه يومياً على أرض الملعب'))
    story.append(bullet_item('حجم الشاشة مثالي للرسم التكتيكي والتوضيح البصري'))
    story.append(bullet_item('يمكن عرضه على اللاعبين مباشرة في غرفة التبديل'))
    story.append(bullet_item('TacticalPad نجح عالمياً بسبب تركيزه الأساسي على iPad'))
    story.append(sp(10))

    story.append(sub_heading('تغييرات التصميم المطلوبة للـ iPad'))

    ipad_changes = [
        ('أزرار أكبر حجماً', 'مصممة خصيصاً للتفاعل بالأصابع بدون دقة الفأرة'),
        ('شريط أدوات عائم', 'قابل للسحب والتموضع في أي مكان على الشاشة'),
        ('إيماءات اللمس', 'الضغط بإصبعين للتكبير والتصغير، والسحب بثلاث أصابع للتحريك'),
        ('دعم Apple Pencil', 'رسم حر دقيق ومريح للشرح والتوضيح السريع'),
        ('وضع العرض للفريق', 'شاشة كاملة مبسطة للعرض على اللاعبين بدون أدوات التحرير'),
    ]

    for title, desc in ipad_changes:
        data = [[
            Paragraph(ar(title), STYLES['card_title']),
            Paragraph(ar(desc), STYLES['card_text']),
        ]]
        tbl = Table(data, colWidths=[
            (PAGE_W - 100) * 0.35,
            (PAGE_W - 100) * 0.65,
        ])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_MINT),
            ('BACKGROUND', (1, 0), (1, -1), LIGHT_GRAY),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 0.5, MID_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(tbl)
        story.append(sp(4))

    story.append(sp(12))
    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 11 — أخطر 10 أفكار للتفوق عالمياً
    # ══════════════════════════════════════════
    story.extend(section_header('١١', 'أخطر 10 أفكار للتفوق عالمياً'))

    ideas = [
        ('١', 'مكتبة المجتمع المفتوحة',
         'مدربون من حول العالم يشاركون تمارينهم وخططهم في مكتبة مفتوحة، مما يخلق قيمة متراكمة لا يمكن لأي منافس نسخها.'),
        ('٢', 'الشاشة التكتيكية المباشرة',
         'عرض فوري للتمارين والتكتيكات على شاشة غرفة التبديل مع تأثيرات مرئية جذابة وتحريك سلس.'),
        ('٣', 'وصف التمرين بالذكاء الاصطناعي',
         'يحلل الذكاء الاصطناعي التمرين المرسوم ويكتب وصفاً احترافياً كاملاً مع الأهداف والنقاط التدريبية تلقائياً.'),
        ('٤', 'مكتبة الفيديو المرتبطة',
         'ربط كل تمرين بمقطع فيديو شارح من YouTube أو المكتبة الخاصة لتوضيح التنفيذ للاعبين.'),
        ('٥', 'مشاركة فورية برابط',
         'رابط مباشر للتمرين يُرسل عبر واتساب أو إيميل بضغطة واحدة، يعرضه أي شخص بدون تسجيل.'),
        ('٦', 'المدرب المساعد الذكي',
         'يتعلم من أسلوب المدرب وتفضيلاته ثم يقترح تمارين ملائمة بناءً على ما استخدمه سابقاً.'),
        ('٧', 'قالب اللعبة الصغيرة الذكي',
         'ينشئ تمرين Small-Sided Game كامل تلقائياً بتحديد عدد اللاعبين والهدف التدريبي فقط.'),
        ('٨', 'تقرير الأسبوع الآلي',
         'ملخص أسبوعي تلقائي لما نُفِّذ فعلياً مقارنة بالخطة مع رسوم بيانية واضحة.'),
        ('٩', 'وضع الملعب المباشر',
         'واجهة مبسطة للغاية للاستخدام على أرض الملعب تحت الشمس — أزرار كبيرة وشاشة واضحة.'),
        ('١٠', 'نظام الترقيم التلقائي',
         'كل تمرين يحصل على كود فريد تلقائياً (مثل: TRN-2026-0042) للمرجعية والبحث السريع.'),
    ]

    for num, title, desc in ideas:
        data = [[
            Paragraph(ar(num), ParagraphStyle(
                f'idea_num_{num}', fontName='ArabicBold', fontSize=18,
                textColor=WHITE, alignment=TA_CENTER, leading=26)),
            [Paragraph(ar(title), STYLES['card_title']),
             Paragraph(ar(desc), STYLES['card_text'])],
        ]]
        tbl = Table(data, colWidths=[44, PAGE_W - 144])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), NAVY),
            ('BACKGROUND', (1, 0), (1, -1), LIGHT_GRAY),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 0.5, MID_GRAY),
            ('LINEAFTER', (1, 0), (1, -1), 4, MINT),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(tbl)
        story.append(sp(6))

    story.append(sp(20))

    # Final closing card
    final_data = [[Paragraph(
        ar('منصة المدرب — المنتج الذي يستحقه المدرب العربي والعالمي'),
        ParagraphStyle('final', fontName='ArabicBold', fontSize=16, textColor=WHITE,
                       alignment=TA_CENTER, leading=28))]]
    final_tbl = Table(final_data, colWidths=[PAGE_W - 80])
    final_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('TOPPADDING', (0, 0), (-1, -1), 20),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
        ('LINEBELOW', (0, 0), (-1, -1), 5, MINT),
    ]))
    story.append(final_tbl)

    # ─────────────────────────────────────────────
    # BUILD PDF
    # ─────────────────────────────────────────────
    def on_first_page(canvas, doc):
        cover_page_background(canvas, doc)

    def on_later_pages(canvas, doc):
        normal_page_background(canvas, doc)
        # Header text
        canvas.saveState()
        canvas.setFont('ArabicBold', 11)
        canvas.setFillColor(WHITE)
        canvas.drawRightString(PAGE_W - 20, PAGE_H - 26, ar('منصة المدرب | تقرير المنتج الاستراتيجي'))
        canvas.drawString(20, PAGE_H - 26, ar('Coach Mind'))
        canvas.restoreState()

    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=60,
        bottomMargin=50,
        title='Coach Mind — Product Report',
        author='Coach Mind Team',
    )

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(f"\nPDF generated successfully: {OUTPUT_PATH}")
    file_size = os.path.getsize(OUTPUT_PATH)
    print(f"File size: {file_size:,} bytes ({file_size / 1024:.1f} KB)")
    return file_size

if __name__ == '__main__':
    size = build_pdf()
    if size < 100 * 1024:
        print("WARNING: File size seems small, may be incomplete.")
        sys.exit(1)
    else:
        print("SUCCESS: PDF is > 100KB, looks good!")
