#!/usr/bin/env python3
"""
Coach Mind — Full Product Audit Report (Arabic PDF)
"""
import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus.flowables import Flowable
from reportlab.lib.colors import HexColor
import os

# ── Fonts ──────────────────────────────────────────────────────────────────
# Using Amiri — a high-quality OpenType Arabic font with full Unicode coverage
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
pdfmetrics.registerFont(TTFont("Arabic",      os.path.join(BASE_DIR, "Amiri-Regular.ttf")))
pdfmetrics.registerFont(TTFont("ArabicBold",  os.path.join(BASE_DIR, "Amiri-Bold.ttf")))
pdfmetrics.registerFont(TTFont("ArabicRegular", os.path.join(BASE_DIR, "Amiri-Regular.ttf")))

# ── Brand Colors ───────────────────────────────────────────────────────────
NAVY       = HexColor("#1C2D5A")
MINT       = HexColor("#63C0B0")
ORANGE     = HexColor("#FF6A00")
LIGHT_GRAY = HexColor("#F4F6F9")
MID_GRAY   = HexColor("#DDE3EC")
DARK_TEXT  = HexColor("#1A1A2E")
WHITE      = colors.white
YELLOW     = HexColor("#FFC857")


# ── Arabic helper ──────────────────────────────────────────────────────────
def ar(text: str) -> str:
    """Reshape + bidi an Arabic string for correct PDF rendering."""
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)


# ── Page decorations ───────────────────────────────────────────────────────
def _cover_bg(canvas, doc):
    w, h = A4
    canvas.saveState()
    # Navy background top half
    canvas.setFillColor(NAVY)
    canvas.rect(0, h * 0.42, w, h * 0.58, fill=1, stroke=0)
    # Mint accent bar
    canvas.setFillColor(MINT)
    canvas.rect(0, h * 0.40, w, h * 0.025, fill=1, stroke=0)
    # Light gray bottom
    canvas.setFillColor(LIGHT_GRAY)
    canvas.rect(0, 0, w, h * 0.40, fill=1, stroke=0)
    # Decorative circle
    canvas.setFillColor(HexColor("#2A3F7A"))
    canvas.circle(w * 0.85, h * 0.75, 80, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#162347"))
    canvas.circle(w * 0.12, h * 0.55, 55, fill=1, stroke=0)
    canvas.restoreState()


def _inner_header(canvas, doc):
    w, h = A4
    canvas.saveState()
    # Top stripe
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 18 * mm, w, 18 * mm, fill=1, stroke=0)
    # Mint line
    canvas.setFillColor(MINT)
    canvas.rect(0, h - 19.5 * mm, w, 1.5 * mm, fill=1, stroke=0)
    # Header text
    canvas.setFont("Arabic", 8)
    canvas.setFillColor(WHITE)
    canvas.drawString(15 * mm, h - 12 * mm, ar("كوتش مايند — تقرير التدقيق الشامل ٢٠٢٦"))
    canvas.drawRightString(w - 15 * mm, h - 12 * mm, ar(f"صفحة {doc.page}"))
    # Footer
    canvas.setFillColor(MID_GRAY)
    canvas.rect(0, 0, w, 12 * mm, fill=1, stroke=0)
    canvas.setFont("Arabic", 7)
    canvas.setFillColor(HexColor("#666688"))
    canvas.drawCentredString(w / 2, 4 * mm, ar("سري — للاستخدام الداخلي فقط | Coach Mind © 2026"))
    canvas.restoreState()


# ── Styles ─────────────────────────────────────────────────────────────────
def styles():
    def s(name, **kw):
        return ParagraphStyle(name, **kw)
    return {
        "h1": s("h1", fontName="Arabic", fontSize=22, textColor=WHITE,
                alignment=TA_CENTER, leading=30, spaceAfter=10, spaceBefore=8),
        "h2": s("h2", fontName="ArabicBold", fontSize=16, textColor=NAVY,
                alignment=TA_RIGHT, leading=24, spaceBefore=14, spaceAfter=8),
        "h3": s("h3", fontName="ArabicBold", fontSize=13, textColor=MINT,
                alignment=TA_RIGHT, leading=22, spaceBefore=10, spaceAfter=6),
        "h4": s("h4", fontName="ArabicBold", fontSize=11, textColor=NAVY,
                alignment=TA_RIGHT, leading=20, spaceBefore=8, spaceAfter=4),
        "body": s("body", fontName="Arabic", fontSize=10, textColor=DARK_TEXT,
                  alignment=TA_RIGHT, leading=22, spaceAfter=8),
        "bullet": s("bullet", fontName="Arabic", fontSize=10, textColor=DARK_TEXT,
                    alignment=TA_RIGHT, leading=20, rightIndent=12, spaceAfter=5),
        "caption": s("caption", fontName="Arabic", fontSize=8,
                     textColor=HexColor("#888888"), alignment=TA_CENTER, leading=14),
        "cover_title": s("cover_title", fontName="ArabicBold", fontSize=32,
                         textColor=WHITE, alignment=TA_CENTER, leading=44, spaceAfter=10),
        "cover_sub": s("cover_sub", fontName="Arabic", fontSize=15,
                       textColor=MINT, alignment=TA_CENTER, leading=26, spaceAfter=6),
        "cover_meta": s("cover_meta", fontName="Arabic", fontSize=11,
                        textColor=HexColor("#AAC4FF"), alignment=TA_CENTER, leading=20),
        "toc_section": s("toc_s", fontName="ArabicBold", fontSize=11,
                         textColor=NAVY, alignment=TA_RIGHT, leading=20,
                         spaceBefore=6, spaceAfter=2),
        "toc_item": s("toc_i", fontName="Arabic", fontSize=10,
                      textColor=DARK_TEXT, alignment=TA_RIGHT, leading=18,
                      rightIndent=15, spaceAfter=2),
        "tag_good": s("tg", fontName="ArabicBold", fontSize=9,
                      textColor=WHITE, alignment=TA_CENTER, leading=14),
        "tag_warn": s("tw", fontName="ArabicBold", fontSize=9,
                      textColor=WHITE, alignment=TA_CENTER, leading=14),
        "white": s("wh", fontName="Arabic", fontSize=10,
                   textColor=WHITE, alignment=TA_RIGHT, leading=22),
        "white_bold": s("whb", fontName="ArabicBold", fontSize=12,
                        textColor=WHITE, alignment=TA_RIGHT, leading=24),
    }


# ── Reusable blocks ────────────────────────────────────────────────────────
def section_header(title: str, S, color=NAVY) -> list:
    """Colored section heading with underline."""
    items = [
        Spacer(1, 6 * mm),
        Paragraph(ar(title), S["h2"]),
        HRFlowable(width="100%", thickness=2, color=MINT, spaceAfter=4),
    ]
    return items


def sub_header(title: str, S) -> Paragraph:
    return Paragraph(ar(title), S["h3"])


def body(text: str, S) -> Paragraph:
    return Paragraph(ar(text), S["body"])


def bullet(text: str, S, icon="●") -> Paragraph:
    return Paragraph(ar(f"{icon}  {text}"), S["bullet"])


def info_box(title: str, items: list, S, bg=LIGHT_GRAY, border=MINT) -> Table:
    """Colored info box with title and bullet items."""
    content = [Paragraph(ar(title), S["h4"])]
    for it in items:
        content.append(Paragraph(ar(f"◀  {it}"), S["bullet"]))
    t = Table([[content]], colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 2, border),
        ("ROUNDEDCORNERS", [6]),
    ]))
    return t


def score_table(rows: list, S) -> Table:
    """Two-column score table: [aspect, rating]"""
    data = [[Paragraph(ar(r[0]), S["body"]), Paragraph(ar(r[1]), S["body"])] for r in rows]
    t = Table(data, colWidths=[130 * mm, 40 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 1), (-1, -1), LIGHT_GRAY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GRAY),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def two_col_table(left_items: list, right_items: list, S,
                  left_title="", right_title="") -> Table:
    """Side-by-side comparison table."""
    def col(title, items):
        cell = []
        if title:
            cell.append(Paragraph(ar(title), S["h4"]))
        for it in items:
            cell.append(Paragraph(ar(f"◀  {it}"), S["bullet"]))
        return cell

    data = [[col(right_title, right_items), col(left_title, left_items)]]
    t = Table(data, colWidths=[83 * mm, 83 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), HexColor("#E8F5F3")),
        ("BACKGROUND", (1, 0), (1, 0), HexColor("#EEF1F8")),
        ("BOX", (0, 0), (0, 0), 1, MINT),
        ("BOX", (1, 0), (1, 0), 1, NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def priority_row(label: str, impact: str, effort: str, S, color=NAVY) -> Table:
    data = [[
        Paragraph(ar(label), S["body"]),
        Paragraph(ar(impact), S["body"]),
        Paragraph(ar(effort), S["body"]),
    ]]
    t = Table(data, colWidths=[90 * mm, 40 * mm, 40 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("LEFTBORDER", (0, 0), (0, -1), 4, color),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.3, MID_GRAY),
        ("ALIGN", (1, 0), (2, -1), "CENTER"),
    ]))
    return t


# ══════════════════════════════════════════════════════════════════════════
# CONTENT BUILDER
# ══════════════════════════════════════════════════════════════════════════
def build_story(S):
    story = []

    # ── COVER PAGE ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 55 * mm))
    story.append(Paragraph(ar("تقرير التدقيق الشامل"), S["cover_title"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(ar("كوتش مايند — منصة تصميم تدريبات كرة القدم"), S["cover_sub"]))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(ar("نحو أفضل منصة تدريبية في العالم"), S["cover_sub"]))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(ar("إعداد: فريق التحليل الاستراتيجي"), S["cover_meta"]))
    story.append(Paragraph(ar("التاريخ: أبريل ٢٠٢٦"), S["cover_meta"]))
    story.append(Paragraph(ar("الإصدار: ١.٠ — سري للاستخدام الداخلي"), S["cover_meta"]))
    story.append(Spacer(1, 30 * mm))

    # Stat boxes on cover
    stats = [
        ["١٨ صفحة", "مسارات"],
        ["٤٠+ نوع", "بيانات"],
        ["٨ متاجر", "حالة"],
        ["١٥ أداة", "لوحة"],
    ]
    stat_data = []
    for val, lbl in stats:
        stat_data.append(
            Paragraph(f'<font size="18" color="#1C2D5A"><b>{ar(val)}</b></font><br/>'
                      f'<font size="9" color="#63C0B0">{ar(lbl)}</font>', S["h2"])
        )
    st = Table([stat_data], colWidths=[42 * mm] * 4)
    st.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 1, MID_GRAY),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, MID_GRAY),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(st)
    story.append(PageBreak())

    # ── TABLE OF CONTENTS ──────────────────────────────────────────────────
    story += section_header("فهرس المحتويات", S)
    story.append(Spacer(1, 4 * mm))

    toc_data = [
        ("الجزء الأول — تقرير غير تقني (للمدربين وأصحاب الأكاديميات)", [
            "١. نظرة عامة على المنصة",
            "٢. ما يعمل بشكل جيد",
            "٣. المشاكل التي تؤثر على تجربة المستخدم",
            "٤. أين سيتعثر المستخدمون أو يشعرون بالإرباك",
            "٥. اقتراحات لجعل التطبيق أسهل وأسرع",
            "٦. التحسينات الرئيسية للوصول إلى مستوى عالمي",
            "٧. مقارنة مع TacticalPad و SessionLab",
            "٨. ما يجعل هذا المنتج فريداً",
            "٩. ما ينقص للوصول إلى ١٠/١٠",
        ]),
        ("الجزء الثاني — تقرير تقني (للمطورين)", [
            "١. تقييم جودة الكود",
            "٢. تحليل البنية المعمارية",
            "٣. مناطق الدين التقني",
            "٤. مشاكل الأداء",
            "٥. مشاكل إدارة الحالة",
            "٦. نقاط ضعف نظام اللوحة",
            "٧. مشاكل إعادة الاستخدام والموديولية",
            "٨. أخطاء محتملة ومناطق خطرة",
            "٩. اقتراحات لإعادة الهيكلة",
            "١٠. اقتراحات لتوسيع النظام",
            "١١. تحسينات الإصدار الثاني الموصى بها",
        ]),
        ("تحليل التوسع في المنصات", [
            "متطلبات تطبيق سطح المكتب",
            "متطلبات تطبيق الجهاز اللوحي (iPad)",
        ]),
        ("استراتيجية التحسين والأولويات", [
            "تحسينات عالية التأثير",
            "مكاسب سريعة",
            "تحسينات متوسطة المدى",
            "ميزات متقدمة",
        ]),
        ("الطريق نحو ١٠/١٠ — خطة التحول", []),
        ("الجزء الثالث — دليل التنفيذ العملي", [
            "١. خارطة التنفيذ — ٦ مراحل",
            "٢. مصفوفة الأولويات (التأثير × الجهد)",
            "٣. تعريف المنتج الأدنى القابل للإطلاق (MVP)",
            "٤. نظام المجتمع — من الصفر إلى القيمة",
            "٥. استراتيجية تبسيط تجربة المستخدم",
            "٦. مخاطر المنتج وكيفية تفاديها",
            "٧. استراتيجية المنتج — لماذا يختار المدرب كوتش مايند؟",
            "٨. الطريق نحو ١٠/١٠ — نسخة عملية قابلة للتنفيذ",
        ]),
    ]

    for section_title, items in toc_data:
        story.append(Paragraph(ar(section_title), S["toc_section"]))
        for item in items:
            story.append(Paragraph(ar(f"    {item}"), S["toc_item"]))
        story.append(Spacer(1, 3 * mm))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════
    # PART 1 — NON-TECHNICAL (COACHES)
    # ══════════════════════════════════════════════════════════════════════
    # Part title banner
    part1_banner = Table(
        [[Paragraph(ar("الجزء الأول"), S["h1"]),
          Paragraph(ar("تقرير غير تقني — للمدربين وأصحاب الأكاديميات"), S["cover_sub"])]],
        colWidths=[50 * mm, 120 * mm]
    )
    part1_banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 15),
        ("RIGHTPADDING", (0, 0), (-1, -1), 15),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTBORDER", (0, 0), (0, -1), 6, MINT),
    ]))
    story.append(part1_banner)
    story.append(Spacer(1, 8 * mm))

    # 1. Overview
    story += section_header("١. نظرة عامة على المنصة", S)
    story.append(body(
        "كوتش مايند هو تطبيق متكامل مصمم خصيصاً للمدربين وأكاديميات كرة القدم، "
        "يتيح لهم تصميم التمارين التدريبية بشكل بصري واحترافي، وبناء جلسات تدريبية "
        "كاملة، وإدارة الفرق والموسم التنافسي — كل ذلك في مكان واحد.", S))
    story.append(body(
        "يعمل التطبيق عبر المتصفح على الحاسوب، ويوجد أيضاً نسخة مكتبية (Desktop) "
        "تعمل بشكل مستقل دون الحاجة إلى إنترنت. يتميز بلوحة رسم تفاعلية تشبه "
        "السبورة التكتيكية الرقمية، حيث يمكن للمدرب وضع اللاعبين والكرات والمخاريط "
        "والأسهم على ملعب افتراضي، وتحديد تسلسل التمرين بخطوات متعاقبة.", S))

    story.append(info_box("ما يستطيع المدرب فعله بهذا التطبيق", [
        "تصميم تمارين تدريبية كاملة بأدوات بصرية احترافية",
        "بناء جلسات تدريبية منظمة بتسلسل زمني واضح",
        "إدارة الفرق وقوائم اللاعبين بألوان مميزة",
        "التخطيط التكتيكي للمباريات (الشكل التكتيكي، الضغط، الانتقال)",
        "التخطيط للموسم كاملاً عبر تقويم تفاعلي",
        "عرض التمارين على شاشة كبيرة أثناء التدريب (وضع العرض)",
        "طباعة الجلسات والخطط التدريبية",
        "حفظ قوالب تمارين جاهزة لإعادة الاستخدام",
    ], S))
    story.append(Spacer(1, 4 * mm))

    # 2. What works well
    story += section_header("٢. ما يعمل بشكل جيد", S)
    story.append(body(
        "بناءً على تحليل شامل للمنصة، يوجد عدد من المزايا القوية التي تجعل "
        "كوتش مايند يتميز عن المنافسين في بعض الجوانب:", S))
    story.append(sub_header("أ. غنى الأدوات التصميمية", S))
    story.append(body(
        "تحتوي لوحة التصميم على أكثر من ١٥ نوعاً من العناصر: لاعبون، كرات، مخاريط، "
        "أهداف، أسهم تكتيكية (تمرير، جري، مراوغة، ضغط، دعم)، مناطق تركيز، نصوص، "
        "أشكال هندسية، وخطوط منحنية. هذا التنوع يجعل التمثيل البصري للتمارين دقيقاً "
        "ومعبراً.", S))

    story.append(sub_header("ب. نظام الخطوات التدريجية (Progressions)", S))
    story.append(body(
        "ميزة رائعة تتيح للمدرب تصميم تمرين واحد بعدة مراحل متدرجة (من السهل إلى "
        "الصعب)، مع إمكانية عرض تحريك للتمرين لإظهار حركات اللاعبين.", S))

    story.append(sub_header("ج. وضع العرض الميداني", S))
    story.append(body(
        "يمكن للمدرب عرض الجلسة التدريبية على شاشة أو جهاز لوحي أثناء التدريب "
        "الفعلي بشكل احترافي، مع التنقل بين التمارين بلوحة المفاتيح أو اللمس.", S))

    story.append(sub_header("د. إدارة الجلسة الذكية", S))
    story.append(body(
        "يحلل التطبيق تلقائياً جودة الجلسة التدريبية ويُنبّه المدرب إذا كانت "
        "مدتها قصيرة جداً أو طويلة، أو إذا غابت مرحلة الإحماء أو التهدئة، "
        "أو إذا كانت كثافة التمارين غير متوازنة.", S))

    story.append(sub_header("هـ. شمولية التخطيط", S))
    story.append(body(
        "يغطي التطبيق دورة العمل الكاملة للمدرب: التمارين ← الجلسات ← التخطيط "
        "التكتيكي للمباريات ← التخطيط للموسم ← التقويم. هذا التكامل نادر في "
        "المنصات المنافسة.", S))

    story.append(Spacer(1, 4 * mm))

    # 3. UX Problems
    story += section_header("٣. المشاكل التي تؤثر على تجربة المستخدم", S)
    story.append(body(
        "رغم المزايا الكثيرة، يعاني التطبيق من عدة مشاكل تجعل التجربة "
        "أصعب مما ينبغي — خاصة للمدربين الذين يستخدمون التكنولوجيا بشكل محدود:", S))

    problems = [
        ("صعوبة اكتشاف الأدوات",
         "كثير من الأدوات مخفية أو غير واضحة. المدرب الجديد لن يعرف كيف يرسم "
         "سهم تمرير محدد، أو كيف يضع تشكيلة كاملة بنقرة واحدة."),
        ("غياب الشرح والتلميحات",
         "لا توجد تلميحات (tooltips) كافية توضح وظيفة كل أداة عند التحويم عليها. "
         "المستخدم يحتاج لتجربة كل شيء بالمحاولة والخطأ."),
        ("كثرة خطوات إنشاء التمرين",
         "لإنشاء تمرين بسيط، يحتاج المدرب لخطوات عديدة: اختيار نوع الملعب، "
         "إضافة عنوان، بناء المحتوى، ثم الحفظ. لا يوجد 'وضع سريع' لرسم تمرين في دقيقة."),
        ("عدم وضوح الاختصارات",
         "يحتوي التطبيق على اختصارات لوحة مفاتيح قوية (RR=جري، PP=تمرير، الخ) "
         "لكن لا توجد وثيقة أو نافذة مساعدة تشرحها."),
        ("البيانات محفوظة محلياً فقط",
         "كل البيانات محفوظة في المتصفح فقط. إذا حذف المدرب بيانات المتصفح، "
         "أو انتقل لجهاز آخر، فقد كل عمله. لا يوجد نسخ احتياطي تلقائي."),
        ("لا يوجد تعاون بين المدربين",
         "كل مدرب يعمل بمفرده. لا يمكن مشاركة تمرين مع مدرب آخر، أو العمل "
         "الجماعي على خطة موسم."),
        ("تجربة الجهاز اللوحي ضعيفة",
         "التطبيق مصمم أساساً للحاسوب. على iPad أو الجهاز اللوحي، مساحات "
         "الضغط صغيرة، والرسم بالإصبع غير مريح."),
    ]
    for title, desc in problems:
        box = Table([[
            Paragraph(ar(f"▶  {title}"), S["h4"]),
        ], [
            Paragraph(ar(desc), S["body"]),
        ]], colWidths=[170 * mm])
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#FFF3E0")),
            ("BACKGROUND", (0, 1), (-1, 1), WHITE),
            ("BOX", (0, 0), (-1, -1), 1, ORANGE),
            ("LEFTBORDER", (0, 0), (0, -1), 4, ORANGE),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(box)
        story.append(Spacer(1, 3 * mm))

    # 4. Where users struggle
    story += section_header("٤. أين سيتعثر المستخدمون أو يشعرون بالإرباك", S)
    story.append(body(
        "بناءً على تحليل تدفق المستخدم، هذه هي نقاط الاحتكاك الرئيسية التي "
        "ستعيق المدربين الجدد:", S))

    friction_points = [
        ("المرة الأولى — أين أبدأ؟",
         "لا توجد صفحة ترحيبية أو جولة إرشادية للمستخدم الجديد. "
         "يجد المدرب نفسه أمام قائمة تمارين جاهزة دون شرح واضح لكيفية البدء."),
        ("رسم الأسهم التكتيكية",
         "يتطلب رسم سهم 'تمرير' تحديد نوع الأداة أولاً ثم النقر مرتين. "
         "مربك للمستخدمين الذين يتوقعون رسماً مباشراً بالسحب."),
        ("إضافة تشكيلة كاملة",
         "زر 'التشكيلة' موجود في قسم 'حامل اللاعبين' أسفل الصفحة، "
         "وليس في الشريط الجانبي الرئيسي. يصعب إيجاده."),
        ("خطوات التمرين التدريجي",
         "نظام الخطوات التدريجية قوي لكن مربك للمرة الأولى. "
         "المدرب لا يفهم الفرق بين 'إضافة خطوة' و'نسخ الخطوة الحالية'."),
        ("حفظ وتصدير العمل",
         "لا يوجد زر 'تصدير' واضح للنسخة الويب. المدرب لا يعرف كيف "
         "يأخذ نسخة احتياطية من عمله أو يشاركه مع زميل."),
        ("التنقل بين التمارين والجلسات",
         "لا يوجد مسار واضح من 'التمرين' إلى 'الجلسة'. المدرب الجديد "
         "لن يدرك تلقائياً أنه يجب إنشاء التمارين أولاً ثم إضافتها للجلسة."),
    ]
    for i, (title, desc) in enumerate(friction_points):
        bg = LIGHT_GRAY if i % 2 == 0 else WHITE
        row = Table([[
            Paragraph(ar(f"{i+1}"), ParagraphStyle("num", fontName="ArabicBold",
                                                    fontSize=18, textColor=MINT,
                                                    alignment=TA_CENTER)),
            [Paragraph(ar(title), S["h4"]),
             Paragraph(ar(desc), S["body"])],
        ]], colWidths=[18 * mm, 152 * mm])
        row.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(row)
        story.append(Spacer(1, 2 * mm))

    story.append(PageBreak())

    # 5. Suggestions for ease
    story += section_header("٥. اقتراحات لجعل التطبيق أسهل وأسرع", S)

    suggestions = [
        ("جولة إرشادية تفاعلية للمستخدم الجديد",
         "عند أول دخول، تظهر جولة قصيرة (٥ خطوات) تشرح: "
         "كيف تُنشئ تمريناً، كيف تُضيف لاعبين، كيف تبني جلسة. "
         "هذا وحده سيرفع معدل الاحتفاظ بالمستخدمين بشكل كبير."),
        ("وضع الرسم السريع",
         "زر 'تمرين سريع' يفتح لوحة فارغة بملعب افتراضي وأدوات "
         "أساسية فقط (لاعبون + أسهم). بدون حقول بيانات إضافية. "
         "المدرب يرسم فكرته في ٣٠ ثانية."),
        ("شريط أدوات أذكى (Smart Toolbar)",
         "بدلاً من قوائم طويلة، عرض الأدوات الأكثر استخداماً في شريط "
         "أفقي كبير في أعلى اللوحة، مع تلميحات عند التحويم."),
        ("اقتراح تلقائي للتمارين",
         "بناءً على الفريق والعمر والهدف التدريبي، يقترح التطبيق "
         "تمارين من المكتبة مباشرة. يوفر وقتاً كبيراً في البحث."),
        ("مشاركة التمارين برابط",
         "زر 'مشاركة' يُنشئ رابطاً أو رمز QR يمكن إرساله للاعبين "
         "أو المدربين المساعدين لعرض التمرين."),
        ("لوحة مفاتيح مرئية",
         "نافذة منبثقة (Ctrl+/) تعرض جميع اختصارات لوحة المفاتيح "
         "مقسمة بوضوح. المدرب المحترف سيستخدمها كثيراً."),
        ("نسخ احتياطي تلقائي",
         "تصدير تلقائي لملف JSON كل يوم، أو مزامنة مع Google Drive / "
         "iCloud بنقرة واحدة."),
    ]
    for title, desc in suggestions:
        box = Table([[
            [Paragraph(ar(f"✦  {title}"), S["h4"]),
             Paragraph(ar(desc), S["body"])],
        ]], colWidths=[170 * mm])
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F0FAF8")),
            ("BOX", (0, 0), (-1, -1), 1, MINT),
            ("LEFTBORDER", (0, 0), (0, -1), 4, MINT),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(box)
        story.append(Spacer(1, 3 * mm))

    # 6. Key improvements for world-class
    story += section_header("٦. التحسينات الرئيسية للوصول إلى مستوى عالمي", S)
    story.append(body(
        "للوصول إلى مستوى TacticalPad أو SessionLab بل وتجاوزهما، "
        "يجب التركيز على هذه المحاور الاستراتيجية:", S))

    improvements = [
        ("السحابة والمزامنة", "CRITICAL",
         "حفظ البيانات على خوادم سحابية مع مزامنة فورية بين الأجهزة. "
         "هذا هو الشرط الأساسي لأي منتج احترافي."),
        ("تطبيق iPad محسّن للمس", "HIGH",
         "تصميم خاص للجهاز اللوحي بمساحات ضغط كبيرة وأدوات سحب مريحة "
         "بالإصبع. أكثر من ٦٠٪ من المدربين يستخدمون iPad أثناء التدريب."),
        ("مكتبة تمارين عالمية", "HIGH",
         "مكتبة مفتوحة يمكن للمدربين نشر تمارينهم فيها ومشاركتها مع "
         "المجتمع، مع إمكانية الاستيراد المباشر."),
        ("تحليل ذكي للجلسات", "MEDIUM",
         "بعد كل جلسة، يعرض التطبيق تحليلاً يوضح: توزيع الكثافة، "
         "نسبة وقت اللعب الفعلي، مقارنة مع الجلسات السابقة."),
        ("تكامل مع الفيديو", "MEDIUM",
         "إمكانية إرفاق مقطع فيديو بكل تمرين لإظهار مثال حقيقي، "
         "أو تسجيل الجلسة ومقارنتها بالخطة الأصلية."),
        ("نظام التقييم والتغذية الراجعة", "MEDIUM",
         "المدرب يُقيّم كل تمرين بعد تنفيذه (هل نجح؟ ما المستوى؟)، "
         "ويحتفظ بسجل تاريخي للتمارين المستخدمة مع كل فريق."),
    ]
    for title, level, desc in improvements:
        level_color = {"CRITICAL": ORANGE, "HIGH": NAVY, "MEDIUM": MINT}[level]
        level_text = {"CRITICAL": "أساسي", "HIGH": "عالي", "MEDIUM": "متوسط"}[level]
        row = Table([[
            Paragraph(ar(level_text),
                      ParagraphStyle("lv", fontName="ArabicBold", fontSize=8,
                                     textColor=WHITE, alignment=TA_CENTER)),
            [Paragraph(ar(title), S["h4"]),
             Paragraph(ar(desc), S["body"])],
        ]], colWidths=[22 * mm, 148 * mm])
        row.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), level_color),
            ("BACKGROUND", (1, 0), (1, -1), LIGHT_GRAY),
            ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(row)
        story.append(Spacer(1, 2 * mm))

    story.append(PageBreak())

    # 7. Comparison vs competitors
    story += section_header("٧. مقارنة مع TacticalPad و SessionLab", S)
    story.append(body(
        "إليك مقارنة مباشرة بين كوتش مايند والمنافسين الرئيسيين:", S))

    comp_headers = [
        ar("الميزة"), ar("كوتش مايند"), ar("TacticalPad"), ar("SessionLab")
    ]
    comp_rows = [
        ["تصميم التمارين البصري", "✅ ممتاز", "✅ ممتاز", "⚠️ محدود"],
        ["بناء الجلسات التدريبية", "✅ متكامل", "⚠️ أساسي", "✅ ممتاز"],
        ["التخطيط التكتيكي للمباريات", "✅ شامل", "✅ شامل", "❌ غير موجود"],
        ["تخطيط الموسم", "✅ موجود", "⚠️ بسيط", "✅ موجود"],
        ["التطبيق المكتبي (Offline)", "✅ Electron", "❌ غير موجود", "❌ غير موجود"],
        ["خطوات تدريجية (Progressions)", "✅ متقدم", "⚠️ بسيط", "❌ غير موجود"],
        ["مكتبة تمارين مجتمعية", "❌ غير موجود", "✅ موجود", "⚠️ محدود"],
        ["التزامن السحابي", "❌ غير موجود", "✅ موجود", "✅ موجود"],
        ["تطبيق iPad محسّن", "⚠️ جزئي", "✅ ممتاز", "✅ جيد"],
        ["دعم عربي / RTL", "❌ غير موجود", "❌ غير موجود", "❌ غير موجود"],
        ["السعر", "مجاني / محلي", "$$$/شهر", "$$/شهر"],
    ]
    comp_data = [comp_headers]
    for row in comp_rows:
        comp_data.append([ar(cell) for cell in row])

    ct = Table(comp_data, colWidths=[60 * mm, 37 * mm, 37 * mm, 36 * mm])
    ct.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "ArabicBold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GRAY),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 1), (-1, -1), "Arabic"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
    ]))
    story.append(ct)
    story.append(Spacer(1, 6 * mm))
    story.append(body(
        "الخلاصة: كوتش مايند يتفوق على المنافسين في الشمولية (يغطي كل دورة عمل المدرب) "
        "وفي وجود نسخة مكتبية تعمل بدون إنترنت. لكنه يتأخر في التزامن السحابي "
        "والمكتبة المجتمعية — وهما الميزتان اللتان تصنع الفرق في الاحتفاظ بالمستخدمين.", S))

    # 8. What makes it unique
    story += section_header("٨. ما يجعل هذا المنتج فريداً", S)
    unique = [
        ("دورة عمل متكاملة بالكامل",
         "من تصميم التمرين إلى التخطيط للموسم — كل شيء في تطبيق واحد. "
         "لا يوجد منافس يقدم هذا المستوى من الشمولية."),
        ("نظام الخطوات التدريجية (Drill Progressions)",
         "ميزة نادرة تتيح تصميم تطور التمرين خلال الجلسة بصرياً مع إمكانية "
         "التحريك. TacticalPad يقدم نسخة بسيطة منها فقط."),
        ("التطبيق المكتبي المستقل (Electron)",
         "يعمل بدون إنترنت ويحفظ الملفات محلياً كمنصة كاملة. مثالي للأكاديميات "
         "في المناطق ذات الاتصال المحدود أو التي تهتم بالخصوصية."),
        ("التحليل الذكي لجودة الجلسة",
         "يُحلل التطبيق الجلسة ويُنبّه تلقائياً لأي خلل في التوازن أو التسلسل. "
         "ميزة تعليمية نادرة في المنافسين."),
        ("الأسهم التكتيكية المتخصصة (٧ أنواع)",
         "تمييز دقيق بين أنواع الحركات التكتيكية (جري، تمرير، مراوغة، ضغط، دعم) "
         "بألوان وأشكال مختلفة. أكثر تفصيلاً من معظم المنافسين."),
        ("اللغة العربية — فرصة استراتيجية ضخمة",
         "لا يوجد منافس يقدم واجهة عربية احترافية للمدربين. "
         "هذا وحده يمكن أن يجعل كوتش مايند الخيار الأول في أكثر من ٢٠ دولة عربية."),
    ]
    for title, desc in unique:
        box = Table([[
            [Paragraph(ar(f"★  {title}"), S["h4"]),
             Paragraph(ar(desc), S["body"])],
        ]], colWidths=[170 * mm])
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F8F0FF")),
            ("BOX", (0, 0), (-1, -1), 1, HexColor("#9B59B6")),
            ("LEFTBORDER", (0, 0), (0, -1), 4, HexColor("#9B59B6")),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(box)
        story.append(Spacer(1, 3 * mm))

    # 9. What's missing for 10/10
    story += section_header("٩. ما ينقص للوصول إلى ١٠/١٠", S)
    story.append(body(
        "بشكل صريح وموضوعي، هذه هي الفجوات التي تفصل كوتش مايند "
        "عن الوصول إلى درجة ١٠/١٠:", S))

    missing_items = [
        ("✗", ORANGE, "التزامن السحابي والنسخ الاحتياطي",
         "حتماً سيفقد مستخدمو الإصدار الحالي بياناتهم في مرحلة ما. "
         "لا يمكن لمنصة احترافية الاعتماد فقط على ذاكرة المتصفح."),
        ("✗", ORANGE, "تطبيق iPad احترافي",
         "المدرب يستخدم iPad على أرض الملعب. الإصدار الحالي غير متوافق "
         "مع اللمس بشكل كافٍ. هذا يُلغي سيناريو الاستخدام الأهم."),
        ("✗", NAVY, "واجهة عربية كاملة",
         "المنصة المستهدفة عربياً لكن الواجهة بالكامل بالإنجليزية. "
         "الاستثمار في عربية كاملة سيفتح سوقاً ضخماً لا منافس فيه."),
        ("✗", NAVY, "تعاون بين المدربين",
         "الفرق والأكاديميات تحتاج لمشاركة المحتوى بين المدربين. "
         "غياب هذا يجعل المنصة فردية فقط."),
        ("✗", NAVY, "مكتبة محتوى احترافي",
         "قوالب تمارين من محترفين، مكتبة من الاتحادات، "
         "تمارين مصنفة حسب المرحلة العمرية والمستوى."),
        ("✗", MINT, "إشعارات وتذكيرات الجلسات",
         "إرسال تذكير للمدرب قبل كل تدريب مع ملخص الجلسة المخططة."),
        ("✗", MINT, "تقارير أداء الفريق",
         "إحصاءات عن التمارين المنفذة، معدل التكرار، تطور الكثافة عبر الوقت."),
    ]
    for icon, color, title, desc in missing_items:
        row = Table([[
            Paragraph(ar(icon),
                      ParagraphStyle("ic", fontName="ArabicBold", fontSize=14,
                                     textColor=color, alignment=TA_CENTER)),
            [Paragraph(ar(title), S["h4"]),
             Paragraph(ar(desc), S["body"])],
        ]], colWidths=[15 * mm, 155 * mm])
        row.setStyle(TableStyle([
            ("BACKGROUND", (1, 0), (1, -1), LIGHT_GRAY),
            ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
            ("LEFTBORDER", (0, 0), (0, -1), 3, color),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(row)
        story.append(Spacer(1, 2 * mm))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════
    # PART 2 — TECHNICAL REPORT
    # ══════════════════════════════════════════════════════════════════════
    part2_banner = Table(
        [[Paragraph(ar("الجزء الثاني"), S["h1"]),
          Paragraph(ar("التقرير التقني — للمطورين والمهندسين"), S["cover_sub"])]],
        colWidths=[50 * mm, 120 * mm]
    )
    part2_banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#0F2040")),
        ("LEFTPADDING", (0, 0), (-1, -1), 15),
        ("RIGHTPADDING", (0, 0), (-1, -1), 15),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTBORDER", (0, 0), (0, -1), 6, ORANGE),
    ]))
    story.append(part2_banner)
    story.append(Spacer(1, 8 * mm))

    # Tech stack summary
    story.append(body(
        "المكدس التقني المستخدم: Next.js 14.2.5 (App Router) + TypeScript + Tailwind CSS + "
        "react-konva (Canvas) + Zustand 4.5 (State) + @dnd-kit (Drag & Drop) + "
        "Electron (Desktop) + localStorage (Persistence).", S))
    story.append(Spacer(1, 4 * mm))

    # Score table
    story.append(sub_header("تقييم إجمالي للجودة التقنية", S))
    score_rows = [
        [ar("المعيار"), ar("الدرجة"), ar("ملاحظة")],
        [ar("جودة الكود العامة"), ar("٧/١٠"), ar("منطقي ومنظم مع بعض ملفات ضخمة")],
        [ar("البنية المعمارية"), ar("٧.٥/١٠"), ar("نمط جيد مع وجود نظامين متوازيين للـ Canvas")],
        [ar("إدارة الحالة (State)"), ar("٧/١٠"), ar("Zustand جيد لكن تكرار نمط التخزين")],
        [ar("أداء اللوحة (Canvas)"), ar("٦/١٠"), ar("يعاني مع 100+ كائن بدون culling")],
        [ar("قابلية التوسع"), ar("٦/١٠"), ar("localStorage فقط — لا backend")],
        [ar("أمان البيانات"), ar("٤/١٠"), ar("لا validation، لا تشفير، لا auth")],
        [ar("الاختبارات"), ar("١/١٠"), ar("لا يوجد أي اختبار مكتشف")],
        [ar("التوثيق (Documentation)"), ar("٤/١٠"), ar("لا توجد JSDoc أو README تقني")],
        [ar("إمكانية الصيانة"), ar("٧/١٠"), ar("مكونات منفصلة، لكن ملفات ضخمة جداً")],
        [ar("نظام نوع TypeScript"), ar("٨/١٠"), ar("أنواع شاملة ومحكمة بشكل جيد")],
    ]
    st2 = Table(score_rows, colWidths=[80 * mm, 25 * mm, 65 * mm])
    st2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "ArabicBold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GRAY),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 1), (-1, -1), "Arabic"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
    ]))
    story.append(st2)
    story.append(Spacer(1, 6 * mm))

    # 1. Code quality
    story += section_header("١. تقييم جودة الكود", S)
    story.append(sub_header("نقاط القوة", S))
    code_strengths = [
        "TypeScript صارم مع strict mode — يمنع أخطاء كثيرة في وقت التطوير",
        "نظام الأنواع (types/index.ts) محكم ومنظم — 40+ نوع بـ discriminated unions",
        "فصل المسؤوليات جيد: stores منفصلة، مكونات منفصلة، lib منفصلة",
        "أنماط hooks صحيحة مع Zustand (useXxxStore hooks)",
        "معالجة SSR صحيحة لـ Konva عبر dynamic import",
        "معالجة localStorage آمنة مع typeof window guards",
    ]
    for s in code_strengths:
        story.append(bullet(s, S, "✓"))

    story.append(sub_header("نقاط الضعف", S))
    code_weaknesses = [
        "ملفات ضخمة جداً: PitchCanvas.tsx (600+ سطر)، DrillEditorPage.tsx (800+ سطر) — صعبة الاختبار والصيانة",
        "تكرار نمط storageImpl في جميع الـ 8 stores — انتهاك DRY واضح",
        "كثير من type casts (as SomeType) بدون validation — خطر runtime",
        "لا توجد error boundaries — crash مكون واحد يُسقط الصفحة كاملة",
        "لا يوجد أي اختبار (unit/integration/e2e) — مخاطر regression عالية",
        "اختصارات لوحة المفاتيح غير موثقة في الكود (double-key combos خفية)",
        "hardcoded pitch dimensions كأرقام سحرية في ملفات متعددة",
    ]
    for w in code_weaknesses:
        story.append(bullet(w, S, "✗"))

    story.append(PageBreak())

    # 2. Architecture
    story += section_header("٢. تحليل البنية المعمارية", S)
    story.append(body(
        "البنية العامة للتطبيق منطقية وتتبع أفضل ممارسات Next.js 14 App Router:", S))

    arch_layers = [
        ("طبقة الصفحات (Pages)", "18 مسار — App Router، server-side بشكل افتراضي مع client components حيث يلزم"),
        ("طبقة المكونات (Components)", "39 مكون موزع على 7 مجلدات منطقية"),
        ("طبقة الحالة (State)", "8 Zustand stores مستقلة مع persist middleware"),
        ("طبقة المنطق (Lib)", "6 ملفات utility: storage, seed, templates, session quality"),
        ("طبقة الأنواع (Types)", "ملف مركزي واحد (types/index.ts) — مرجع موحد"),
        ("طبقة سطح المكتب (Electron)", "main.js + preload.js + IPC handlers للملفات المحلية"),
    ]
    for layer, desc in arch_layers:
        row = Table([[
            Paragraph(ar(layer), ParagraphStyle("lname", fontName="ArabicBold",
                                                fontSize=10, textColor=NAVY,
                                                alignment=TA_RIGHT)),
            Paragraph(ar(desc), S["body"]),
        ]], colWidths=[55 * mm, 115 * mm])
        row.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), HexColor("#E8EEF8")),
            ("BACKGROUND", (1, 0), (1, -1), WHITE),
            ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(row)
        story.append(Spacer(1, 1.5 * mm))

    story.append(Spacer(1, 4 * mm))
    story.append(sub_header("مشكلة معمارية رئيسية: نظامان متوازيان للـ Canvas", S))
    story.append(body(
        "يوجد تطبيقان كاملان لنظام اللوحة (Canvas): V1 في src/components/drill-editor/ "
        "و V2 التجريبي في src/v2/. كلاهما كامل ومكتوب بعناية، لكنهما يُشكلان "
        "عبئاً مزدوجاً على الصيانة. V2 معمارياً أفضل (Command Pattern، renderers منفصلة) "
        "لكنه غير مدمج في التدفق الرئيسي. هذا الوضع يجب حسمه فوراً.", S))

    # 3. Technical Debt
    story += section_header("٣. مناطق الدين التقني", S)

    tech_debt = [
        ("عالي", ORANGE, "تكرار storageImpl",
         "نفس 20 سطراً من كود localStorage مكرر في 8 ملفات stores. "
         "الحل: نقله لـ src/lib/storage.ts واستيراده."),
        ("عالي", ORANGE, "لا validation للبيانات",
         "لا يوجد Zod أو runtime type guards. أي بيانات فاسدة في localStorage "
         "ستُسبب crash صامتاً."),
        ("عالي", ORANGE, "نظامان للـ Canvas",
         "V1 و V2 يتنافسان. يجب اختيار أحدهما والالتزام به."),
        ("متوسط", NAVY, "Undo/Redo بـ Array Cloning",
         "كل action يُخزن نسخة كاملة من مصفوفة الكائنات. مع 100+ كائن و50+ action "
         "يصبح هذا مشكلة ذاكرة. الحل: Command Pattern (موجود في V2)."),
        ("متوسط", NAVY, "ملفات مكونات ضخمة",
         "PitchCanvas.tsx و DrillEditorPage.tsx أكبر من 600 سطر. "
         "يجب تفكيكهما لـ hooks و subcomponents."),
        ("متوسط", NAVY, "لا Error Boundaries",
         "خطأ في أي مكون فرعي يسقط الصفحة بالكامل. "
         "يجب إضافة React Error Boundaries حول الأقسام الرئيسية."),
        ("منخفض", MINT, "Hardcoded pitch dimensions",
         "840×540، 840×420، 840×300 مكتوبة كأرقام في ملفات متعددة. "
         "الحل: تمركيز في PITCH_SIZES constant."),
        ("منخفض", MINT, "لا debounce للـ localStorage persist",
         "كل تغيير صغير يُطلق serialization كامل للـ store. "
         "إضافة debounce (300ms) ستحسن الأداء."),
    ]
    for severity, color, title, desc in tech_debt:
        sev_text = severity
        row = Table([[
            Paragraph(ar(sev_text),
                      ParagraphStyle("sv", fontName="ArabicBold", fontSize=8,
                                     textColor=WHITE, alignment=TA_CENTER)),
            [Paragraph(ar(title), S["h4"]),
             Paragraph(ar(desc), S["body"])],
        ]], colWidths=[20 * mm, 150 * mm])
        row.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), color),
            ("BACKGROUND", (1, 0), (1, -1), LIGHT_GRAY),
            ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(row)
        story.append(Spacer(1, 2 * mm))

    story.append(PageBreak())

    # 4. Performance
    story += section_header("٤. مشاكل الأداء", S)
    perf_issues = [
        ("رسم الكائنات على اللوحة",
         "يُرسم جميع الكائنات في كل frame بدون culling (تجاهل الكائنات خارج الشاشة). "
         "مع 200+ كائن يصبح الأداء ملحوظاً على الأجهزة المتوسطة.",
         "HIGH"),
        ("Undo Stack مستهلك للذاكرة",
         "كل نسخة احتياطية في undo stack تُخزن مصفوفة كاملة من الكائنات. "
         "50 action × 100 كائن = استهلاك ذاكرة كبير.",
         "HIGH"),
        ("localStorage Serialization",
         "كل تغيير يُطلق JSON.stringify() للـ store بالكامل بدون debounce. "
         "على أجهزة بطيئة مع بيانات كثيرة قد يُسبب تأخيراً ملحوظاً.",
         "MEDIUM"),
        ("تحميل صور الأصول (Field Assets)",
         "صور الملعب تُحمل عند الطلب بدون preloading. "
         "أول استخدام قد يُسبب وميضاً.",
         "LOW"),
        ("Virtual Scrolling غير موجود",
         "قوائم التمارين والجلسات تُرسم بالكامل. مع 500+ تمرين ستصبح بطيئة.",
         "MEDIUM"),
    ]
    for title, desc, level in perf_issues:
        level_color = {"HIGH": ORANGE, "MEDIUM": NAVY, "LOW": MINT}[level]
        level_ar = {"HIGH": "عالي", "MEDIUM": "متوسط", "LOW": "منخفض"}[level]
        row = Table([[
            Paragraph(ar(level_ar),
                      ParagraphStyle("lv2", fontName="ArabicBold", fontSize=8,
                                     textColor=WHITE, alignment=TA_CENTER)),
            [Paragraph(ar(title), S["h4"]),
             Paragraph(ar(desc), S["body"])],
        ]], colWidths=[20 * mm, 150 * mm])
        row.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), level_color),
            ("BACKGROUND", (1, 0), (1, -1), LIGHT_GRAY),
            ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(row)
        story.append(Spacer(1, 2 * mm))

    # 5. State management
    story += section_header("٥. مشاكل إدارة الحالة", S)
    story.append(body(
        "تُستخدم Zustand بشكل سليم عموماً، لكن توجد نقاط تستحق الانتباه:", S))
    state_issues = [
        "تكرار نمط storageImpl في 8 ملفات — يجب نقله لـ createPersistedStore helper",
        "لا يوجد Zustand DevTools — يجعل debugging صعباً",
        "المزامنة بين calendarStore و seasonPlansStore يدوية — لا ضمان للاتساق (no transactions)",
        "الـ undo/redo في component state وليس في store — صعوبة في الـ persistence",
        "لا batched updates — كل action يُطلق re-render منفصل",
        "editorStore في V2 يُكرر بيانات من drillsStore — ازدواجية مصادر الحقيقة",
    ]
    for issue in state_issues:
        story.append(bullet(issue, S))

    # 6. Canvas weaknesses
    story += section_header("٦. نقاط ضعف نظام اللوحة (Canvas)", S)

    canvas_issues = [
        ("لا touch support للرسم", "المستخدمون على iPad لا يستطيعون الرسم بالإصبع. يتطلب Konva touch event handlers منفصلة."),
        ("لا collision detection", "الكائنات يمكن وضعها فوق بعضها بدون أي تحذير أو snap."),
        ("play simulation بسيطة", "التحريك لا يتبع مسار الأسهم الفعلية — مجرد حركة خطية للاعبين. ليست محاكاة حقيقية."),
        ("لا multi-layer z-order UI", "المستخدم لا يستطيع التحكم في ترتيب طبقات الكائنات يدوياً (bring to front / send to back)."),
        ("Transformer overhead", "Konva Transformer يُضيف حمل rendering كبير عند تحريك كائنات متعددة."),
        ("لا keyboard navigation على اللوحة", "لا يمكن تحريك الكائنات بمفاتيح الأسهم (Arrow Keys) للتحكم الدقيق."),
        ("Text editing محدود", "لا يوجد rich text editor على اللوحة — نص عادي فقط."),
    ]
    for title, desc in canvas_issues:
        story.append(bullet(f"{title}: {desc}", S))

    story.append(PageBreak())

    # 7. Reusability
    story += section_header("٧. مشاكل إعادة الاستخدام والموديولية", S)
    story.append(body(
        "التطبيق يُظهر اتجاهاً جيداً نحو الموديولية في الأجزاء الحديثة (V2)، "
        "لكن يُعاني من بعض المشاكل في الكود الأقدم:", S))
    reuse_issues = [
        ("جيد: مكونات القوائم",
         "DrillsList و SessionsList و TeamsList تتبع نمطاً موحداً: search + create + grid cards. "
         "يمكن استخراج GenericListPage component."),
        ("جيد: MiniPitchPreview",
         "مكون SVG مستقل قابل لإعادة الاستخدام في أي مكان يحتاج thumbnail للتمرين."),
        ("ضعيف: Canvas Tool Logic",
         "منطق أدوات الرسم في DrillEditorPage.tsx — مكثف جداً في مكون واحد. "
         "يجب استخراجه لـ useDrawTool custom hook."),
        ("ضعيف: Inspector Panel",
         "InspectorPanel.tsx يحتوي منطق كل نوع كائن. يمكن تقسيمه "
         "لـ PlayerInspector, ArrowInspector, ShapeInspector."),
        ("مفقود: Design Token System",
         "V2 لديه src/v2/lib/tokens.ts لكن V1 لا يُستخدمه. "
         "الألوان وأحجام الخطوط مبعثرة."),
        ("مفقود: Form Components",
         "الـ TacticalUI تحتوي 50+ field مكتوبة يدوياً. "
         "يجب استخدام form library (react-hook-form) وإنشاء shared form components."),
    ]
    for title, desc in reuse_issues:
        box = Table([[
            [Paragraph(ar(title), S["h4"]),
             Paragraph(ar(desc), S["body"])],
        ]], colWidths=[170 * mm])
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
            ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
            ("LEFTBORDER", (0, 0), (0, -1), 3, NAVY),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(box)
        story.append(Spacer(1, 2 * mm))

    # 8. Potential bugs
    story += section_header("٨. أخطاء محتملة ومناطق خطرة", S)
    bugs = [
        ("خطر: بيانات فاسدة في localStorage",
         "لا validation عند قراءة البيانات. localStorage قديم بصيغة مختلفة "
         "يمكن أن يُسبب crash عند تحديث التطبيق مع تغيير نموذج البيانات."),
        ("خطر: Race condition في Calendar/SeasonPlan sync",
         "التزامن بين calendarStore و seasonPlansStore يتم بـ 2 استدعاءين منفصلين. "
         "إذا فشل أحدهما ستُصبح البيانات غير متسقة."),
        ("خطر: Stale closure في canvas event handlers",
         "المعالجة الموجودة بالفعل في DrillEditorPage لهذه المشكلة (استخدام useRef)، "
         "لكن قد تظهر حالات مشابهة عند إضافة features جديدة."),
        ("خطر: Memory leak في Konva Stage",
         "لم يُتحقق من cleanup كامل لـ Konva event listeners عند unmount. "
         "استخدام طويل قد يُسبب memory leak."),
        ("تحذير: V2 يقرأ من drillsStore",
         "صفحة /v2/editor/[drillId] تحاول قراءة drill بـ ID لكن editorStore "
         "لا يُزامن مع drillsStore — قد تُعرض بيانات قديمة."),
        ("تحذير: Formation placement بدون team",
         "عند وضع تشكيلة بدون اختيار فريق، يستخدم التطبيق generateDefaultSquad() "
         "وقد يُنتج أرقاماً متعارضة مع لاعبين موجودين."),
    ]
    for title, desc in bugs:
        row = Table([[
            Paragraph(ar("!"),
                      ParagraphStyle("warn", fontName="ArabicBold", fontSize=16,
                                     textColor=ORANGE, alignment=TA_CENTER)),
            [Paragraph(ar(title), S["h4"]),
             Paragraph(ar(desc), S["body"])],
        ]], colWidths=[15 * mm, 155 * mm])
        row.setStyle(TableStyle([
            ("BACKGROUND", (1, 0), (1, -1), HexColor("#FFF8F0")),
            ("BOX", (0, 0), (-1, -1), 1, ORANGE),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(row)
        story.append(Spacer(1, 2 * mm))

    story.append(PageBreak())

    # 9. Refactoring suggestions
    story += section_header("٩. اقتراحات لإعادة الهيكلة", S)
    refactors = [
        ("استخراج createPersistedStore",
         "إنشاء helper factory: createPersistedStore(key, initialState, actions) "
         "يتضمن storageImpl الموحد. يُقلص كل store من ~80 سطر إلى ~40 سطر."),
        ("تفكيك DrillEditorPage",
         "استخراج: useDrawTool hook (منطق الرسم)، useUndoRedo hook (undo/redo)، "
         "useClipboard hook (copy/paste)، useFormation hook (تشكيلات). "
         "DrillEditorPage يصبح orchestrator نظيف."),
        ("تفكيك InspectorPanel",
         "استخراج PlayerInspector، ArrowInspector، ShapeInspector، TextInspector "
         "كمكونات منفصلة يُعرضها InspectorPanel بـ conditional rendering."),
        ("اعتماد V2 Command Pattern للـ Undo/Redo",
         "نقل CommandHistory من V2 إلى V1 (أو الترحيل الكامل لـ V2). "
         "يحل مشكلة الذاكرة في undo stack بشكل جذري."),
        ("إضافة Zod Schemas",
         "تعريف Zod schema لكل نوع رئيسي (Drill, Session, Team). "
         "استخدامها في schema.parse() عند قراءة localStorage."),
        ("إضافة Error Boundaries",
         "تغليف DrillEditorPage و SessionBuilderPage بـ ErrorBoundary "
         "مع fallback UI واضح."),
        ("تمركيز Design Tokens",
         "نقل PITCH_SIZES، TACTIC_COLORS، DEFAULT_PLAYER_COLORS "
         "لملف src/lib/constants.ts واستيراده في كل المكونات."),
    ]
    for title, desc in refactors:
        story.append(info_box(title, [desc], S))
        story.append(Spacer(1, 2 * mm))

    # 10. Scaling suggestions
    story += section_header("١٠. اقتراحات لتوسيع النظام", S)
    story.append(body(
        "للانتقال من MVP إلى منتج قابل للتوسع لآلاف المستخدمين:", S))

    scaling = [
        ("Backend API", "Express/Fastify/Next.js API Routes + PostgreSQL. "
         "نقل الـ 8 Zustand stores لـ REST API مع JWT auth."),
        ("Real-time Collaboration", "Yjs أو Liveblocks لـ CRDT-based collaboration. "
         "مدربان يُعدلان نفس التمرين في آنٍ واحد."),
        ("Cloud Storage للصور", "AWS S3 أو Cloudinary لتخزين صور التمارين والملفات."),
        ("CDN للأصول الثابتة", "نقل field-assets PNG إلى CDN لتحميل أسرع."),
        ("Database Indexing", "PostgreSQL indexes على: drillId، sessionId، teamId، "
         "updatedAt — لاستعلامات سريعة."),
        ("Queue System", "Bull/BullMQ لعمليات background: PDF generation، "
         "email notifications، analytics processing."),
        ("Caching Layer", "Redis لـ session data و hot drills. "
         "تقليل database queries بنسبة 70%."),
        ("Mobile App", "React Native + Expo بإعادة استخدام Zustand stores "
         "والـ business logic."),
    ]
    for title, desc in scaling:
        story.append(bullet(f"{title}: {desc}", S))

    # 11. V2 recommendations
    story += section_header("١١. تحسينات الإصدار الثاني الموصى بها", S)
    story.append(body(
        "الإصدار الثاني يجب أن يُركز على ٣ محاور رئيسية:", S))

    v2_recs = [
        ("المحور الأول: الترحيل الكامل لـ V2 Canvas",
         [
             "اعتماد معمارية V2 (Command Pattern + Modular Renderers) كنظام وحيد",
             "حذف V1 canvas system بعد الترحيل",
             "إضافة Touch Event handlers لـ Konva لدعم iPad",
             "تطبيق viewport culling لتحسين الأداء مع 200+ كائن",
             "إضافة Arrow key movement للكائنات المحددة",
         ]),
        ("المحور الثاني: Backend + Authentication",
         [
             "API Layer مع PostgreSQL",
             "Auth (Google OAuth + Email/Password)",
             "Multi-user support مع roles (Head Coach, Assistant, Viewer)",
             "Drill sharing system (public/private/team)",
             "Automatic cloud backup كل 5 دقائق",
         ]),
        ("المحور الثالث: تجربة مستخدم محسّنة",
         [
             "Onboarding flow تفاعلي (5 خطوات)",
             "Keyboard shortcuts help modal (Ctrl+/)",
             "Quick drill mode (رسم سريع بدون metadata)",
             "Arabic language support كامل",
             "iPad-optimized UI مع touch tools",
         ]),
    ]
    for axis_title, items in v2_recs:
        story.append(sub_header(axis_title, S))
        for item in items:
            story.append(bullet(item, S))
        story.append(Spacer(1, 3 * mm))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════
    # PLATFORM EXPANSION
    # ══════════════════════════════════════════════════════════════════════
    story += section_header("تحليل التوسع في المنصات", S)

    story.append(sub_header("متطلبات سطح المكتب (Desktop)", S))
    story.append(body(
        "التطبيق المكتبي (Electron) موجود بالفعل وهو نقطة قوة كبيرة. "
        "للوصول للكمال على سطح المكتب:", S))
    desktop_reqs = [
        "نظام ملفات محلي: حفظ/فتح مشاريع بصيغة .coachmd مع File System Access API",
        "قوائم نظام تشغيل native (File، Edit، View، Help) مع اختصارات قياسية",
        "Auto-update system عبر electron-updater",
        "Crash reporting وtelemetry لرصد الأخطاء (opt-in)",
        "دعم multiple windows — فتح عدة تمارين في آن واحد",
        "درج النظام (System Tray) مع إشعارات التدريب القادم",
        "اختصارات عالمية (Global Shortcuts) للوصول السريع",
        "Export to PDF/PNG مدمج مع printer system",
        "Offline-first مع sync تلقائي عند توفر الإنترنت",
        "دعم dual-monitor: عرض لوحة التصميم على شاشة + controls على الأخرى",
    ]
    for r in desktop_reqs:
        story.append(bullet(r, S))

    story.append(Spacer(1, 4 * mm))
    story.append(sub_header("متطلبات الجهاز اللوحي - iPad (Touch-First)", S))
    story.append(body(
        "هذا هو السيناريو الأهم: المدرب على الملعب بيده iPad. "
        "التصميم الحالي غير مناسب لهذا السيناريو. المتطلبات:", S))

    ipad_reqs = [
        ("أدوات رسم بالإصبع", "أحجام touch targets لا تقل عن 44×44pt. رسم السهم بسحبة واحدة مريحة."),
        ("شريط أدوات عائم", "Floating Toolbar قابل للتحريك بدلاً من قائمة جانبية ثابتة."),
        ("Palm rejection", "تجاهل لمس اليد عند استخدام Apple Pencil."),
        ("Gesture support", "Pinch to zoom، two-finger pan، double-tap لتحديد كائن."),
        ("Quick actions", "Long-press على كائن لقائمة سياق بـ large action buttons."),
        ("Simplified palette", "عرض 8 أدوات فقط في وضع اللوحي (الأكثر استخداماً)."),
        ("Large canvas area", "تقليل مساحة الـ UI لصالح لوحة الرسم — الملعب يأخذ 80% الشاشة."),
        ("Session presenter mode", "وضع خاص للعرض على الملعب: خط مقروء من بعيد، أزرار كبيرة."),
        ("Offline-capable PWA", "إمكانية تثبيت كـ PWA على الهوم سكرين بدون App Store."),
        ("Apple Pencil pressure", "دعم ضغط القلم لتحديد سمك السهم أو حجم العنصر."),
    ]
    for title, desc in ipad_reqs:
        story.append(bullet(f"{title}: {desc}", S))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════
    # IMPROVEMENT STRATEGY
    # ══════════════════════════════════════════════════════════════════════
    story += section_header("استراتيجية التحسين والأولويات", S)
    story.append(body(
        "مرتبة حسب تأثير المستخدم × جهد التطوير:", S))

    # Priority table headers
    story.append(Paragraph(ar("  التأثير | الجهد | التحسين"), S["h4"]))
    story.append(Spacer(1, 2 * mm))

    priorities = [
        # [label, impact, effort, color]
        ("التحسينات عالية التأثير / سريعة التنفيذ (Quick Wins)", MINT),
        None,  # separator
        ("Keyboard shortcuts help modal (Ctrl+/)", "عالي جداً", "ساعة واحدة", MINT),
        ("Tooltips لجميع أدوات اللوحة", "عالي", "نصف يوم", MINT),
        ("تصدير JSON للنسخ الاحتياطي", "عالي", "يوم واحد", MINT),
        ("Error boundaries للصفحات الرئيسية", "عالي", "نصف يوم", MINT),
        ("استخراج storageImpl المكرر", "متوسط", "ساعتان", MINT),
        None,
        ("التحسينات متوسطة المدى (1-4 أسابيع)", NAVY),
        None,
        ("Onboarding flow للمستخدم الجديد", "عالي جداً", "أسبوع", NAVY),
        ("تفكيك DrillEditorPage + PitchCanvas", "متوسط", "أسبوع", NAVY),
        ("Zod validation لبيانات localStorage", "عالي", "يومان", NAVY),
        ("Touch support للـ Canvas (iPad)", "عالي جداً", "أسبوعان", NAVY),
        ("Command Pattern Undo/Redo (V2 migration)", "عالي", "أسبوعان", NAVY),
        ("Virtual scrolling لقوائم التمارين", "متوسط", "يومان", NAVY),
        None,
        ("الميزات المتقدمة (1-3 أشهر)", ORANGE),
        None,
        ("Backend API + PostgreSQL", "عالي جداً", "شهران", ORANGE),
        ("Authentication + Multi-user", "عالي جداً", "شهر", ORANGE),
        ("Cloud sync + Auto-backup", "عالي جداً", "أسبوعان", ORANGE),
        ("Arabic UI كاملة", "استراتيجي", "شهر", ORANGE),
        ("Drill sharing system", "عالي", "شهر", ORANGE),
        ("Mobile/iPad app", "عالي جداً", "ثلاثة أشهر", ORANGE),
        ("Video integration", "متوسط", "شهران", ORANGE),
        ("Community drill library", "عالي", "شهران", ORANGE),
    ]
    for item in priorities:
        if item is None:
            story.append(Spacer(1, 3 * mm))
            continue
        if len(item) == 2:
            label, color = item
            title_row = Table([[Paragraph(ar(label), S["white_bold"])]],
                              colWidths=[170 * mm])
            title_row.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(title_row)
        else:
            label, impact, effort, color = item
            row = Table([[
                Paragraph(ar(label), S["body"]),
                Paragraph(ar(impact), ParagraphStyle("imp", fontName="ArabicBold",
                                                      fontSize=9, textColor=color,
                                                      alignment=TA_CENTER)),
                Paragraph(ar(effort), ParagraphStyle("eff", fontName="Arabic",
                                                      fontSize=9, textColor=DARK_TEXT,
                                                      alignment=TA_CENTER)),
            ]], colWidths=[100 * mm, 35 * mm, 35 * mm])
            row.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
                ("GRID", (0, 0), (-1, -1), 0.3, MID_GRAY),
                ("LEFTBORDER", (0, 0), (0, -1), 3, color),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ALIGN", (1, 0), (2, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]))
            story.append(row)
            story.append(Spacer(1, 1 * mm))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════
    # ROAD TO 10/10
    # ══════════════════════════════════════════════════════════════════════
    road_banner = Table([[Paragraph(ar("الطريق نحو ١٠/١٠"), S["h1"])]],
                        colWidths=[170 * mm])
    road_banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#0A1A35")),
        ("LEFTPADDING", (0, 0), (-1, -1), 15),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))
    story.append(road_banner)
    story.append(Spacer(1, 6 * mm))
    story.append(body(
        "خطة واضحة للتحول من MVP إلى أفضل منصة تدريب كرة قدم في العالم:", S))

    phases = [
        ("المرحلة الأولى — الأساس (الأشهر ١-٢)", MINT, [
            ("يجب إصلاحه", [
                "إزالة أو دمج V2 Canvas system (اختر واحداً فقط)",
                "إضافة Zod validation لحماية البيانات",
                "إضافة Error Boundaries لكل الصفحات الرئيسية",
                "استخراج storageImpl المكرر",
                "تفكيك الملفات الضخمة (DrillEditorPage, PitchCanvas)",
            ]),
            ("يجب إضافته", [
                "Keyboard shortcuts help modal",
                "Tooltips شاملة لجميع الأدوات",
                "Onboarding flow للمستخدم الجديد (5 خطوات)",
                "نسخ احتياطي يدوي (تصدير JSON)",
                "وضع الرسم السريع (Quick Draw Mode)",
            ]),
            ("يجب تبسيطه", [
                "تبسيط قائمة أدوات اللوحة — الأدوات الأقل شيوعاً في قائمة 'المزيد'",
                "تبسيط نموذج إنشاء تمرين جديد — الحقول المطلوبة فقط",
            ]),
        ]),
        ("المرحلة الثانية — النمو (الأشهر ٣-٥)", NAVY, [
            ("يجب إضافته", [
                "Backend API + PostgreSQL + Authentication",
                "Cloud sync تلقائي",
                "Touch support كامل للـ Canvas",
                "iPad-optimized UI",
                "نظام مشاركة التمارين",
            ]),
            ("يجب تحسينه", [
                "أداء اللوحة (viewport culling + command-based undo)",
                "بحث متقدم (فلتر حسب الفئة العمرية والمعدات والهدف)",
                "تحليل الجلسة المحسّن مع تقرير مرئي",
            ]),
        ]),
        ("المرحلة الثالثة — التميز (الأشهر ٦-٩)", ORANGE, [
            ("يجب إضافته", [
                "واجهة عربية كاملة (أولوية استراتيجية قصوى)",
                "مكتبة تمارين مجتمعية",
                "تكامل مع الفيديو",
                "تطبيق Mobile (React Native)",
                "Analytics: تقارير تفصيلية لكل مدرب وفريق",
                "نظام subscriptions واشتراكات",
            ]),
            ("يجب إزالته", [
                "أي كود تجريبي غير مدمج (V2 إذا لم يُدمج في المرحلة الأولى)",
                "seed data الافتراضية في النسخة الإنتاجية",
                "console.log statements المتبقية",
            ]),
        ]),
    ]

    for phase_title, phase_color, sections in phases:
        phase_header = Table([[Paragraph(ar(phase_title), S["white_bold"])]],
                             colWidths=[170 * mm])
        phase_header.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), phase_color),
            ("LEFTPADDING", (0, 0), (-1, -1), 15),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(phase_header)

        for sec_title, items in sections:
            story.append(Spacer(1, 3 * mm))
            story.append(Paragraph(ar(sec_title), S["h4"]))
            for item in items:
                story.append(bullet(item, S, "◀"))
        story.append(Spacer(1, 6 * mm))

    # Final score
    story.append(HRFlowable(width="100%", thickness=2, color=MINT, spaceAfter=6))
    story.append(Spacer(1, 4 * mm))
    story.append(sub_header("التقييم الحالي مقابل الهدف", S))

    final_scores = [
        [ar("المحور"), ar("الحالي"), ar("بعد المرحلة ١"), ar("بعد المرحلة ٢"), ar("بعد المرحلة ٣")],
        [ar("أدوات التصميم البصري"), ar("٨/١٠"), ar("٩/١٠"), ar("٩/١٠"), ar("١٠/١٠")],
        [ar("بناء الجلسات"), ar("٧/١٠"), ar("٨/١٠"), ar("٩/١٠"), ar("١٠/١٠")],
        [ar("سهولة الاستخدام (UX)"), ar("٦/١٠"), ar("٨/١٠"), ar("٩/١٠"), ar("١٠/١٠")],
        [ar("استمرارية البيانات"), ar("٣/١٠"), ar("٤/١٠"), ar("٩/١٠"), ar("١٠/١٠")],
        [ar("دعم الجهاز اللوحي"), ar("٣/١٠"), ar("٤/١٠"), ar("٨/١٠"), ar("١٠/١٠")],
        [ar("التعاون الجماعي"), ar("١/١٠"), ar("١/١٠"), ar("٧/١٠"), ar("١٠/١٠")],
        [ar("اللغة العربية"), ar("٠/١٠"), ar("٠/١٠"), ar("٠/١٠"), ar("١٠/١٠")],
        [ar("جودة الكود"), ar("٧/١٠"), ar("٨.٥/١٠"), ar("٩/١٠"), ar("١٠/١٠")],
        [ar("المجموع"), ar("٥.٥/١٠"), ar("٦.٨/١٠"), ar("٨.٨/١٠"), ar("١٠/١٠")],
    ]
    fst = Table(final_scores, colWidths=[60 * mm, 27 * mm, 27 * mm, 27 * mm, 29 * mm])
    fst.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "ArabicBold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [WHITE, LIGHT_GRAY]),
        ("BACKGROUND", (0, -1), (-1, -1), HexColor("#1C2D5A")),
        ("TEXTCOLOR", (0, -1), (-1, -1), WHITE),
        ("FONTNAME", (0, -1), (-1, -1), "ArabicBold"),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GRAY),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 1), (-1, -2), "Arabic"),
        ("FONTSIZE", (0, 1), (-1, -2), 9),
    ]))
    story.append(fst)

    story += build_playbook(S)

    story.append(Spacer(1, 8 * mm))
    # Closing statement
    closing = Table([[
        Paragraph(ar(
            "كوتش مايند يملك الأساس التقني القوي والرؤية المنتجية الشاملة. "
            "مع تنفيذ خارطة الطريق هذه بشكل منهجي، يمكن لهذه المنصة "
            "أن تُصبح فعلاً أفضل منصة تدريب كرة قدم في العالم — "
            "وبالذات في السوق العربي الذي لا يوجد فيه منافس حقيقي بعد."
        ), S["white"]),
    ]], colWidths=[170 * mm])
    closing.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("BOX", (0, 0), (-1, -1), 3, MINT),
    ]))
    story.append(closing)
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(ar("Coach Mind © 2026 — تقرير سري للاستخدام الداخلي"), S["caption"]))

    return story


# ══════════════════════════════════════════════════════════════════════════
# PART 3 — EXECUTION PLAYBOOK (new sections)
# ══════════════════════════════════════════════════════════════════════════
def build_playbook(S) -> list:
    story = []
    story.append(PageBreak())

    # ── Part 3 banner ──────────────────────────────────────────────────────
    banner = Table([[
        Paragraph(ar("الجزء الثالث"), S["h1"]),
        Paragraph(ar("دليل التنفيذ العملي — كتاب اللعب"), S["cover_sub"]),
    ]], colWidths=[50 * mm, 120 * mm])
    banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#0D2137")),
        ("LEFTPADDING", (0, 0), (-1, -1), 15),
        ("RIGHTPADDING", (0, 0), (-1, -1), 15),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTBORDER", (0, 0), (0, -1), 6, YELLOW),
    ]))
    story.append(banner)
    story.append(Spacer(1, 6 * mm))
    story.append(body(
        "هذا القسم يُحوّل التقرير من وثيقة رؤية إلى دليل تنفيذ حقيقي. "
        "كل قسم هنا مكتوب ليكون قابلاً للتطبيق المباشر من قِبَل الفريق التطويري "
        "والقيادة الاستراتيجية.", S))

    # ══════════════════════════════════════════════════════════════════════
    # 1. EXECUTION ROADMAP — 6 PHASES
    # ══════════════════════════════════════════════════════════════════════
    story += section_header("١. خارطة التنفيذ — ٦ مراحل", S)
    story.append(body(
        "كل مرحلة تبني على السابقة. لا تبدأ مرحلة قبل إكمال المرحلة التي قبلها "
        "بنجاح ومُراجعة المستخدمين.", S))
    story.append(Spacer(1, 3 * mm))

    phases = [
        {
            "num": "١",
            "title": "استقرار المحرر الأساسي",
            "subtitle": "Core Editor Stability",
            "duration": "٤-٦ أسابيع",
            "color": MINT,
            "why": "المحرر هو قلب المنتج. أي خلل فيه يُبطل كل ما بُني فوقه.",
            "features": [
                "إصلاح نظام اللوحة: اختيار V1 أو V2 والالتزام به نهائياً",
                "تفكيك DrillEditorPage إلى hooks منفصلة (useDrawTool, useUndoRedo, useClipboard)",
                "Command Pattern لـ Undo/Redo بدلاً من array cloning",
                "Touch support كامل للـ Canvas (Konva touch events)",
                "Viewport culling لتحسين الأداء مع 200+ كائن",
                "Error Boundaries لجميع الصفحات الرئيسية",
                "Zod Schemas لحماية بيانات localStorage",
                "Keyboard shortcuts modal (Ctrl+/)",
                "Tooltips شاملة لكل أداة في اللوحة",
                "إزالة جميع الـ console.log وكود التطوير من الإنتاج",
            ],
            "user_gain": "تجربة رسم سلسة، undo/redo موثوق، لا crashes، دعم iPad أساسي",
            "success": "المدرب يرسم تمريناً كاملاً في أقل من ٣ دقائق دون أي أخطاء",
        },
        {
            "num": "٢",
            "title": "الأنظمة الذكية والبنية التحتية",
            "subtitle": "Smart Systems & Infrastructure",
            "duration": "٦-٨ أسابيع",
            "color": NAVY,
            "why": "بدون سحابة وتسجيل دخول، المنتج لا يمكن مشاركته أو بيعه كخدمة احترافية.",
            "features": [
                "Backend API (Next.js API Routes + PostgreSQL)",
                "Authentication: Google OAuth + Email/Password",
                "Cloud sync تلقائي كل ٣ دقائق مع مؤشر الحفظ",
                "Onboarding flow تفاعلي (٥ خطوات للمستخدم الجديد)",
                "Quick Draw Mode: رسم تمرين في ٣٠ ثانية",
                "واجهة مستخدم عربية كاملة (Arabic UI first)",
                "تصدير JSON يدوي + استيراد (نسخ احتياطي)",
                "نظام أدوار: مدرب رئيسي، مساعد، مشاهد",
                "إشعارات في التطبيق (جلسة قادمة، تذكير تدريب)",
                "Debounce لـ localStorage persist (300ms)",
            ],
            "user_gain": "حفظ آمن، دخول من أي جهاز، واجهة عربية، بدء أسرع",
            "success": "المدرب يسجل دخوله من iPad ويرى كل عمله جاهزاً من الحاسوب",
        },
        {
            "num": "٣",
            "title": "منشئ الجلسات المتقدم",
            "subtitle": "Advanced Session Builder",
            "duration": "٤-٥ أسابيع",
            "color": HexColor("#2E7D32"),
            "why": "الجلسة التدريبية هي المنتج اليومي للمدرب — يجب أن تكون مثالية.",
            "features": [
                "Session Templates ذكية: ١٢ قالب جلسة جاهز (إحماء، تكتيك، لياقة...)",
                "تحليل الجلسة المرئي: رسم بياني للكثافة عبر الزمن",
                "اقتراح تلقائي لتمارين بناءً على هدف الجلسة والفئة العمرية",
                "تقدير وقت الجلسة الفعلي (يشمل وقت الشرح والانتقال)",
                "Session Notes للمدرب (خاصة) + Player Notes (للاعبين)",
                "Equipment Checklist تلقائية من التمارين المضافة",
                "Session Sharing: رابط للمساعد + رابط للاعبين (مختلفان)",
                "وضع العرض الميداني المحسّن: خط كبير + أزرار عملاقة لـ iPad",
                "تقييم الجلسة بعد التنفيذ (١-٥ نجوم + ملاحظات)",
                "Session History: سجل كل الجلسات المنفذة مع الفريق",
            ],
            "user_gain": "جلسات مُعدّة بشكل أسرع، تغذية راجعة فورية، عرض ميداني احترافي",
            "success": "المدرب يُعدّ جلسة كاملة في أقل من ١٠ دقائق ويُشاركها فوراً",
        },
        {
            "num": "٤",
            "title": "التخطيط التكتيكي للمباريات",
            "subtitle": "Match Planning Excellence",
            "duration": "٤ أسابيع",
            "color": HexColor("#6A1B9A"),
            "why": "التحليل التكتيكي يُميز المدربين المحترفين ويُقنع الأكاديميات بالاشتراك.",
            "features": [
                "Match Report: تقرير ما بعد المباراة مرتبط بخطة ما قبلها",
                "Opposition Scouting: لوحة لتسجيل ملاحظات على الخصم مع مرئيات",
                "Video Timestamp Integration: ربط الملاحظات التكتيكية بوقت في الفيديو",
                "Set Pieces Designer المحسّن: ركلات ثابتة مع أسهم تفاعلية",
                "Formation Comparison: عرض تشكيلتين جنباً لجنب للمقارنة",
                "Player Heatmap: خريطة حرارية يدوية لمواقع اللاعبين",
                "Tactical Tags: تصنيف المواقف التكتيكية بتصنيفات قابلة للبحث",
                "PDF Match Brief: تقرير PDF تلقائي للمدرب قبل المباراة",
                "خط الزمن التكتيكي: تسلسل الأحداث في خطة المباراة",
            ],
            "user_gain": "استعداد أعمق للمباريات، تواصل أوضح مع اللاعبين",
            "success": "المدرب يُعدّ تقريراً تكتيكياً كاملاً في ٢٠ دقيقة قبل أي مباراة",
        },
        {
            "num": "٥",
            "title": "المجتمع والمشاركة",
            "subtitle": "Community & Sharing",
            "duration": "٦ أسابيع",
            "color": ORANGE,
            "why": "المجتمع هو ما يُحوّل أداة إلى منصة — يخلق network effect ويُبقي المستخدمين.",
            "features": [
                "Drill Library: مكتبة تمارين عامة قابلة للبحث والفلترة",
                "نشر التمرين: زر 'انشر للمجتمع' مع وصف + مستوى + فئة عمرية",
                "Fork & Customize: استيراد تمرين من المكتبة وتعديله كنسخة خاصة",
                "نظام التقييم: ٥ نجوم + تعليق + عدد مرات الاستخدام",
                "Coach Profiles: صفحة عامة للمدرب مع تمارينه المنشورة",
                "Collections: مجموعات تمارين مُنظّمة (مثل: تمارين رونو، ضغط عالٍ)",
                "Following: متابعة مدربين آخرين ومشاهدة تمارينهم الجديدة",
                "Featured Drills: تمارين مميزة يختارها فريق كوتش مايند أسبوعياً",
                "Academy Packages: أكاديميات تنشر مكتبات تمارين خاصة بمنهجها",
            ],
            "user_gain": "إلهام من مدربين آخرين، توفير وقت التصميم، بناء سمعة مهنية",
            "success": "١٠٠٠ تمرين منشور خلال ٩٠ يوماً من الإطلاق مع متوسط تقييم ٤+",
        },
        {
            "num": "٦",
            "title": "الأنظمة المتقدمة",
            "subtitle": "Advanced Systems",
            "duration": "٨-١٢ أسبوع",
            "color": HexColor("#B71C1C"),
            "why": "هذه الأنظمة تُحوّل كوتش مايند من أداة تدريب إلى منصة إدارة أكاديمية شاملة.",
            "features": [
                "AI Drill Suggestions: ذكاء اصطناعي يقترح تمارين بناءً على أهداف الموسم",
                "Player Performance Tracking: تتبع أداء اللاععبين عبر الجلسات",
                "Video Integration: رفع مقاطع فيديو + ربطها بالتمارين",
                "Analytics Dashboard: لوحة تحليلات للمدرب (كثافة الموسم، أكثر التمارين استخداماً)",
                "Academy Management: إدارة فِرق متعددة تحت نادٍ واحد",
                "Parent Portal: بوابة لأولياء الأمور لمتابعة جلسات أبنائهم",
                "Custom Branding: شعار الأكاديمية + ألوانها على كل المطبوعات والتقارير",
                "API Integration: ربط مع أنظمة إدارة الأكاديميات الخارجية",
                "Mobile App: تطبيق iOS/Android بـ React Native",
                "Offline-first PWA محسّن للمدربين في الميدان",
            ],
            "user_gain": "إدارة كاملة للأكاديمية، رؤية شاملة للأداء، احترافية تامة",
            "success": "أكاديميات كاملة تعتمد كوتش مايند كنظام إدارة تدريب رئيسي",
        },
    ]

    for ph in phases:
        story.append(PageBreak() if ph["num"] in ("٢", "٤", "٦") else Spacer(1, 4 * mm))

        # Phase header
        ph_hdr = Table([[
            Paragraph(ar(f"المرحلة {ph['num']}"), S["white_bold"]),
            Paragraph(ar(ph["title"]), S["white_bold"]),
            Paragraph(ar(ph["duration"]),
                      ParagraphStyle("dur", fontName="Arabic", fontSize=9,
                                     textColor=WHITE, alignment=TA_LEFT, leading=16)),
        ]], colWidths=[30 * mm, 105 * mm, 35 * mm])
        ph_hdr.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), ph["color"]),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ]))
        story.append(ph_hdr)

        # Why / user gain / success in 3-col row
        meta = Table([[
            [Paragraph(ar("لماذا تأتي هذه المرحلة أولاً؟"),
                       ParagraphStyle("lm", fontName="ArabicBold", fontSize=9,
                                      textColor=ph["color"], alignment=TA_RIGHT, leading=16)),
             Paragraph(ar(ph["why"]), S["bullet"])],
            [Paragraph(ar("ما يكسبه المدرب"),
                       ParagraphStyle("lg", fontName="ArabicBold", fontSize=9,
                                      textColor=ph["color"], alignment=TA_RIGHT, leading=16)),
             Paragraph(ar(ph["user_gain"]), S["bullet"])],
            [Paragraph(ar("معيار النجاح"),
                       ParagraphStyle("ls", fontName="ArabicBold", fontSize=9,
                                      textColor=ph["color"], alignment=TA_RIGHT, leading=16)),
             Paragraph(ar(ph["success"]), S["bullet"])],
        ]], colWidths=[56 * mm, 56 * mm, 58 * mm])
        meta.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
            ("GRID", (0, 0), (-1, -1), 0.3, MID_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(meta)

        # Features grid (2 columns)
        feats = ph["features"]
        mid = (len(feats) + 1) // 2
        left_col = feats[:mid]
        right_col = feats[mid:]
        while len(right_col) < len(left_col):
            right_col.append("")

        feat_rows = []
        for lf, rf in zip(left_col, right_col):
            feat_rows.append([
                Paragraph(ar(f"◀  {lf}"), S["bullet"]) if lf else Paragraph("", S["bullet"]),
                Paragraph(ar(f"◀  {rf}"), S["bullet"]) if rf else Paragraph("", S["bullet"]),
            ])
        feat_tbl = Table(feat_rows, colWidths=[85 * mm, 85 * mm])
        feat_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("GRID", (0, 0), (-1, -1), 0.2, MID_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTBORDER", (0, 0), (0, -1), 3, ph["color"]),
            ("LEFTBORDER", (1, 0), (1, -1), 3, ph["color"]),
        ]))
        story.append(feat_tbl)
        story.append(Spacer(1, 2 * mm))

    # ══════════════════════════════════════════════════════════════════════
    # 2. PRIORITIZATION MATRIX
    # ══════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story += section_header("٢. مصفوفة الأولويات — التأثير × الجهد", S)
    story.append(body(
        "هذه المصفوفة تُحدد بوضوح ما يجب تنفيذه أولاً وما يجب تأجيله، "
        "بناءً على تأثيره على المستخدم مقارنةً بجهد التطوير المطلوب:", S))
    story.append(Spacer(1, 4 * mm))

    quadrants = [
        {
            "title": "تأثير عالٍ × جهد منخفض — افعل الآن",
            "desc": "هذه هي الذهب الحقيقي. تُحسّن تجربة المستخدم بشكل فوري وتحتاج وقتاً قليلاً.",
            "color": MINT,
            "bg": HexColor("#F0FAF8"),
            "items": [
                ("Tooltips لكل أداة في اللوحة", "نصف يوم", "ترفع معدل اكتشاف الأدوات بـ 60%"),
                ("Keyboard shortcuts modal (Ctrl+/)", "ساعة واحدة", "يُحوّل المستخدمين لمحترفين"),
                ("Error Boundaries للصفحات الرئيسية", "ساعتان", "يمنع فقدان العمل بسبب crash"),
                ("Debounce لـ localStorage persist", "ساعة", "يمنع التأخير على الأجهزة البطيئة"),
                ("إزالة storageImpl المكرر", "ساعتان", "يقلص الكود 200 سطر + يسهل الصيانة"),
                ("Quick Draw Mode للرسم السريع", "يوم واحد", "يقلص وقت إنشاء تمرين من 5 دقائق لـ 30 ثانية"),
                ("تصدير JSON للنسخ الاحتياطي", "يوم واحد", "يمنع فقدان البيانات نهائياً"),
            ],
        },
        {
            "title": "تأثير عالٍ × جهد عالٍ — استثمر فيها",
            "desc": "هذه هي الميزات الاستراتيجية التي تُعرّف المنتج وتُميزه. تتطلب تخطيطاً لكنها ضرورية.",
            "color": NAVY,
            "bg": HexColor("#EEF1F8"),
            "items": [
                ("Backend API + PostgreSQL + Auth", "شهران", "الشرط الأساسي لأي مستخدم جديد"),
                ("Cloud sync تلقائي", "أسبوعان", "يُزيل أكبر خطر على البيانات"),
                ("iPad Touch Support كامل", "أسبوعان", "يفتح 60% من سيناريوهات الاستخدام"),
                ("Arabic UI كاملة", "شهر", "يفتح سوق 400 مليون مستخدم عربي"),
                ("Onboarding flow تفاعلي", "أسبوع", "يرفع معدل الإكمال للمستخدمين الجدد"),
                ("Command Pattern Undo/Redo", "أسبوعان", "يحل مشكلة الأداء مع التمارين الكبيرة"),
                ("Community Drill Library (MVP)", "شهر", "يخلق network effect ويُبقي المستخدمين"),
            ],
        },
        {
            "title": "تأثير منخفض × جهد منخفض — أضفها عند الفراغ",
            "desc": "ميزات مفيدة لكن ليست أولوية. تُنفَّذ عندما يتوفر وقت بين المهام الكبيرة.",
            "color": HexColor("#795548"),
            "bg": HexColor("#FFF8F5"),
            "items": [
                ("Dark Mode للواجهة", "يومان", "تفضيل شخصي — لا يؤثر على الوظيفة"),
                ("تخصيص ألوان اللوحة", "يوم", "جمالي بحت"),
                ("Confetti عند إنهاء الجلسة", "ساعة", "لمسة ممتعة فقط"),
                ("Sound effects خفيفة", "يوم", "تجربة ترفيهية"),
                ("Custom pitch colors", "يومان", "تفضيل بصري"),
            ],
        },
        {
            "title": "تأثير منخفض × جهد عالٍ — تجنبها الآن",
            "desc": "هذه الميزات قد تبدو جذابة لكنها تستهلك وقتاً لا يُبرره تأثيرها في هذه المرحلة.",
            "color": ORANGE,
            "bg": HexColor("#FFF3E0"),
            "items": [
                ("AI ذكاء اصطناعي لاقتراح التمارين", "٣ أشهر", "قبل وجود بيانات كافية لتدريب النموذج"),
                ("AR/VR للتمارين", "٦+ أشهر", "السوق غير جاهز والتكلفة مرتفعة"),
                ("Live tracking للاعبين بـ GPS", "٤ أشهر", "خارج نطاق المنتج الأساسي"),
                ("3D pitch visualization", "٤ أشهر", "الـ 2D يُغطي 100% من الاحتياجات"),
                ("Marketplace مع مدفوعات", "٣ أشهر", "يتطلب legal + payment infra معقدة"),
            ],
        },
    ]

    for q in quadrants:
        q_title = Table([[Paragraph(ar(q["title"]), S["white_bold"])]],
                        colWidths=[170 * mm])
        q_title.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), q["color"]),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(q_title)
        story.append(Paragraph(ar(q["desc"]), S["body"]))

        rows = [[
            Paragraph(ar("الميزة"), ParagraphStyle("h", fontName="ArabicBold", fontSize=9,
                                                    textColor=WHITE, alignment=TA_RIGHT, leading=14)),
            Paragraph(ar("الجهد"), ParagraphStyle("h", fontName="ArabicBold", fontSize=9,
                                                   textColor=WHITE, alignment=TA_CENTER, leading=14)),
            Paragraph(ar("السبب"), ParagraphStyle("h", fontName="ArabicBold", fontSize=9,
                                                   textColor=WHITE, alignment=TA_RIGHT, leading=14)),
        ]]
        for feat, effort, reason in q["items"]:
            rows.append([
                Paragraph(ar(feat), S["bullet"]),
                Paragraph(ar(effort), ParagraphStyle("ef", fontName="Arabic", fontSize=9,
                                                      textColor=DARK_TEXT, alignment=TA_CENTER,
                                                      leading=16)),
                Paragraph(ar(reason), S["bullet"]),
            ])
        qt = Table(rows, colWidths=[70 * mm, 25 * mm, 75 * mm])
        qt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), q["color"]),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, q["bg"]]),
            ("GRID", (0, 0), (-1, -1), 0.3, MID_GRAY),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
            ("ALIGN", (2, 0), (2, -1), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTNAME", (0, 1), (-1, -1), "Arabic"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
        ]))
        story.append(qt)
        story.append(Spacer(1, 5 * mm))

    # ══════════════════════════════════════════════════════════════════════
    # 3. MVP DEFINITION
    # ══════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story += section_header("٣. تعريف المنتج الأدنى القابل للإطلاق — MVP", S)
    story.append(body(
        "السؤال الجوهري: ما هو أبسط إصدار من كوتش مايند يستحق أن يدفع له مدرب حقيقي؟ "
        "ليس أقل منه، وليس أكثر. هذا هو الـ MVP.", S))
    story.append(Spacer(1, 4 * mm))

    mvp_cols = Table([[
        [
            Paragraph(ar("يجب أن يكون موجوداً في الـ MVP"), S["h4"]),
            Paragraph(ar("لوحة رسم تمارين تعمل بدون أخطاء"), S["bullet"]),
            Paragraph(ar("١٢+ نوع كائن (لاعبون، أسهم، كرات، مخاريط، مناطق)"), S["bullet"]),
            Paragraph(ar("Undo/Redo موثوق (٢٠+ خطوة على الأقل)"), S["bullet"]),
            Paragraph(ar("حفظ تلقائي للتمارين (localStorage أو Cloud)"), S["bullet"]),
            Paragraph(ar("منشئ الجلسات مع drag & drop وإعادة الترتيب"), S["bullet"]),
            Paragraph(ar("تسجيل دخول بسيط (Google OAuth)"), S["bullet"]),
            Paragraph(ar("وضع العرض الميداني (presentation mode)"), S["bullet"]),
            Paragraph(ar("تصدير PDF/PNG للتمارين والجلسات"), S["bullet"]),
            Paragraph(ar("٣ قوالب جلسة جاهزة على الأقل"), S["bullet"]),
            Paragraph(ar("دعم iPad أساسي (اللمس + الرسم بالإصبع)"), S["bullet"]),
        ],
        [
            Paragraph(ar("يمكن تأجيله لما بعد الـ MVP"), S["h4"]),
            Paragraph(ar("مكتبة المجتمع والمشاركة العامة"), S["bullet"]),
            Paragraph(ar("الذكاء الاصطناعي واقتراح التمارين"), S["bullet"]),
            Paragraph(ar("التحليلات المتقدمة ولوحة الإحصاءات"), S["bullet"]),
            Paragraph(ar("تكامل الفيديو"), S["bullet"]),
            Paragraph(ar("تطبيق الهاتف المحمول (Mobile App)"), S["bullet"]),
            Paragraph(ar("التخطيط التكتيكي المتقدم للمباريات"), S["bullet"]),
            Paragraph(ar("نظام الاشتراكات والمدفوعات"), S["bullet"]),
            Paragraph(ar("إدارة الأكاديميات المتعددة"), S["bullet"]),
            Paragraph(ar("بوابة أولياء الأمور"), S["bullet"]),
            Paragraph(ar("Custom branding للأكاديميات"), S["bullet"]),
        ],
    ]], colWidths=[85 * mm, 85 * mm])
    mvp_cols.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), HexColor("#E8F8F0")),
        ("BACKGROUND", (1, 0), (1, 0), HexColor("#FFF3E0")),
        ("BOX", (0, 0), (0, 0), 1.5, MINT),
        ("BOX", (1, 0), (1, 0), 1.5, ORANGE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(mvp_cols)
    story.append(Spacer(1, 5 * mm))

    # Definition of "ready"
    ready_box = Table([[
        Paragraph(ar(
            "تعريف: متى يكون المنتج جاهزاً للمستخدمين؟\n\n"
            "المنتج جاهز عندما يستطيع مدرب لم يرَ التطبيق من قبل أن:\n"
            "  ◀  يُنشئ تمرينه الأول في أقل من ٥ دقائق\n"
            "  ◀  يبني جلسة تدريبية كاملة في أقل من ١٥ دقيقة\n"
            "  ◀  يعرضها على الملعب باستخدام iPad\n"
            "  ◀  يُصدّرها كـ PDF ويُشاركها مع مساعده\n"
            "  ◀  يجد بياناته في نفس المكان في اليوم التالي\n\n"
            "إذا تحقق هذا بدون أي مساعدة — المنتج جاهز للإطلاق."
        ), S["body"]),
    ]], colWidths=[170 * mm])
    ready_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("BOX", (0, 0), (-1, -1), 3, MINT),
        ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
    ]))
    story.append(ready_box)

    # ══════════════════════════════════════════════════════════════════════
    # 4. COMMUNITY SYSTEM
    # ══════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story += section_header("٤. نظام المجتمع — من الصفر إلى القيمة الحقيقية", S)
    story.append(body(
        "المجتمع ليس ميزة تُضيفها — هو نظام حي يحتاج تصميماً دقيقاً. "
        "إذا أُطلق بشكل خاطئ سيملأ المنصة بمحتوى رديء. "
        "إذا صُمّم بشكل صحيح سيُصبح أقوى ميزة تنافسية في المنتج.", S))
    story.append(Spacer(1, 3 * mm))

    community_stages = [
        ("المرحلة الصفر — المحتوى الأولي (قبل الإطلاق)", MINT, [
            "فريق كوتش مايند يُنشئ ٥٠+ تمريناً احترافياً مصنفاً بعناية قبل الإطلاق",
            "دعوة ١٠-٢٠ مدرباً احترافياً (early adopters) لملء المكتبة",
            "كل تمرين مُراجَع ومعتمد من فريق المحتوى قبل نشره",
            "المكتبة تبدأ بمحتوى عالي الجودة — لا تبدأ فارغة أبداً",
        ]),
        ("المرحلة الأولى — MVP المجتمع (الشهر ١-٣)", NAVY, [
            "نشر التمرين يتطلب: عنوان + هدف + فئة عمرية + صورة المنصة (إلزامية)",
            "المنشور الأول لكل حساب يخضع لمراجعة يدوية (72 ساعة)",
            "بعد ٣ منشورات معتمدة: نشر فوري بدون مراجعة",
            "تقييم المجتمع (١-٥ نجوم) يُحدد ترتيب الظهور",
            "أي تمرين تحت ٣ نجوم بعد ١٠ تقييمات يُخفى تلقائياً",
            "Fork & Edit: استيراد تمرين وتعديله كنسخة جديدة منسوبة للأصل",
        ]),
        ("المرحلة الثانية — النضج (الشهر ٤-٨)", ORANGE, [
            "Coach Verification: شارة 'مدرب محترف' للحسابات الموثقة",
            "نظام Karma: نقاط للنشر، التقييم، التعليق — يُحدد ترتيب الظهور",
            "Collections المنظمة: مجموعات تمارين مُعدّة من فريق كوتش مايند شهرياً",
            "Drill of the Week: تمرين مميز أسبوعي مع شرح سبب الاختيار",
            "Report System: المستخدمون يُبلّغون عن المحتوى الرديء — فريق يُراجع خلال ٢٤ ساعة",
            "Academy Profiles: أكاديميات تنشر مكتباتها الرسمية كـ Collections متكاملة",
        ]),
    ]
    for stage_title, color, items in community_stages:
        st = Table([[Paragraph(ar(stage_title), S["white_bold"])]],
                   colWidths=[170 * mm])
        st.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), color),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(st)
        for item in items:
            story.append(bullet(item, S, "◀"))
        story.append(Spacer(1, 3 * mm))

    story.append(Spacer(1, 3 * mm))
    story.append(sub_header("كيف يُبنى الـ Network Effect؟", S))

    ne_rows = [
        [ar("مرحلة"), ar("الزخم"), ar("الآلية")],
        [ar("صفر → ١٠٠ مدرب"), ar("المجتمع الأولي"), ar("دعوة شخصية + early access مجاني")],
        [ar("١٠٠ → ١٠٠٠ مدرب"), ar("المحتوى يجذب المزيد"), ar("SEO للتمارين العامة + مشاركة على وسائل التواصل")],
        [ar("١٠٠٠ → ١٠٠٠٠"), ar("المكتبة تُصبح قيمة بحد ذاتها"), ar("مدربون يأتون لأن المكتبة لا توجد في أي مكان آخر")],
        [ar("١٠٠٠٠+"), ar("المنصة المرجعية"), ar("الأكاديميات تُلزم مدربيها باستخدامها")],
    ]
    ne_tbl = Table(ne_rows, colWidths=[45 * mm, 55 * mm, 70 * mm])
    ne_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "ArabicBold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.4, MID_GRAY),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 1), (-1, -1), "Arabic"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(ne_tbl)

    # ══════════════════════════════════════════════════════════════════════
    # 5. UX SIMPLIFICATION STRATEGY
    # ══════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story += section_header("٥. استراتيجية تبسيط تجربة المستخدم", S)
    story.append(body(
        "التحدي الحقيقي ليس بناء المزيد من الميزات — "
        "بل إخفاء التعقيد عن المستخدم مع الحفاظ على كامل القوة. "
        "المدرب الجيد لا يريد أن يُفكر في التكنولوجيا — يريد أن يُفكر في كرة القدم.", S))
    story.append(Spacer(1, 4 * mm))

    ux_layers = [
        ("ما يجب إخفاؤه عن المستخدم الاعتيادي", NAVY, [
            ("إعدادات اللوحة التقنية", "حجم الملعب، نوع الإحداثيات، خيارات الـ snap — تُخفى في 'إعدادات متقدمة'"),
            ("أنواع الأسهم التقنية", "الـ 7 أنواع تُدمج في ٣ فقط للمستخدم العادي: تمرير، جري، منطقة — الباقي في 'المزيد'"),
            ("إعدادات التصدير المعقدة", "خيارات DPI، حجم الصفحة، الهوامش — المستخدم يضغط 'تصدير PDF' فقط"),
            ("خيارات الخطوط والألوان المتقدمة", "لوحة الألوان الكاملة تُخفى خلف زر 'تخصيص' — الألوان الافتراضية كافية"),
            ("تفاصيل إدارة الـ localStorage", "المستخدم لا يعرف ولا يهتم بكيفية الحفظ — فقط يرى مؤشر 'تم الحفظ'"),
        ]),
        ("ما يجب أتمتته بالكامل", MINT, [
            ("الحفظ", "الحفظ التلقائي كل ٣٠ ثانية + عند كل تغيير. لا زر حفظ يدوي."),
            ("ترقيم اللاعبين", "عند إضافة لاعب، يأخذ أول رقم متاح تلقائياً. المدرب يُغيّره إذا أراد."),
            ("تقدير مدة الجلسة", "يُحسب تلقائياً بناءً على عدد التمارين ومدة كل منها."),
            ("قائمة المعدات", "تُجمع تلقائياً من كل تمارين الجلسة — المدرب يُراجعها فقط."),
            ("التحذيرات والتنبيهات", "تظهر تلقائياً: 'الجلسة تفتقر إلى إحماء'، 'مدة التمرين قصيرة جداً'."),
            ("تحديد اتجاه الملعب", "يُكتشف تلقائياً من نوع الملعب المختار (كامل/نصف/ثلث)."),
        ]),
        ("ما يجب أن يكون افتراضياً ومثالياً", ORANGE, [
            ("ملعب نصفي", "الأكثر استخداماً — يكون هو الافتراضي دائماً عند إنشاء تمرين جديد."),
            ("لون أخضر للملعب", "الأكثر وضوحاً بصرياً — الافتراضي. المدرب يُغيّره اختيارياً."),
            ("حجم اللاعب الأنسب", "حجم متوسط يُقرأ بوضوح على شاشات مختلفة — محسوب مسبقاً."),
            ("خط النص الأكبر في وضع العرض", "وضع العرض الميداني يُكبّر كل شيء تلقائياً بدون ضبط."),
            ("الوضع الأول: إضافة لاعبين", "أول ما يرى المدرب في لوحة جديدة: زر 'أضف لاعبين' كبير."),
        ]),
        ("ما يُوضع في قسم 'للمحترفين' فقط", HexColor("#6A1B9A"), [
            ("Custom arrow colors per type", "المدرب المحترف يريد تمييز دقيق — الأداة موجودة لكن مخفية"),
            ("Multi-step drill progressions", "مفيدة جداً لكن تُعرض فقط بعد رسم الخطوة الأولى"),
            ("Formation fine-tuning", "ضبط مواقع اللاععبين يدوياً بإحداثيات دقيقة"),
            ("Export with custom DPI", "للطباعة الاحترافية — متاح في إعدادات التصدير المتقدمة"),
            ("Tactical line types (7 types)", "كل الأنواع متاحة لكن المبتدئ يرى ٣ فقط افتراضياً"),
        ]),
    ]

    for layer_title, color, items in ux_layers:
        lt = Table([[Paragraph(ar(layer_title), S["white_bold"])]],
                   colWidths=[170 * mm])
        lt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), color),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(lt)
        rows = []
        for feat, desc in items:
            rows.append([
                Paragraph(ar(feat),
                          ParagraphStyle("ft", fontName="ArabicBold", fontSize=9,
                                         textColor=color, alignment=TA_RIGHT, leading=16)),
                Paragraph(ar(desc), S["bullet"]),
            ])
        ft_tbl = Table(rows, colWidths=[50 * mm, 120 * mm])
        ft_tbl.setStyle(TableStyle([
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, LIGHT_GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.3, MID_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(ft_tbl)
        story.append(Spacer(1, 4 * mm))

    # ══════════════════════════════════════════════════════════════════════
    # 6. PRODUCT RISKS
    # ══════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story += section_header("٦. مخاطر المنتج وكيفية تفاديها", S)
    story.append(body(
        "كل منتج ناجح يواجه مخاطر حقيقية. تجاهلها لا يُلغيها — "
        "التعرف عليها مبكراً هو الفارق بين منتج يصمد ومنتج يفشل.", S))
    story.append(Spacer(1, 4 * mm))

    risks = [
        {
            "title": "خطر التعقيد الزائد (Feature Overload)",
            "level": "عالٍ جداً",
            "color": ORANGE,
            "desc": "إضافة كل ميزة تُطلب من المستخدمين بدون فلترة. النتيجة: واجهة مربكة، "
                    "مستخدمون يشعرون بالإرهاق، معدل استخدام منخفض.",
            "signs": [
                "المستخدمون يتذمرون من 'صعوبة إيجاد الأدوات'",
                "الأكثر طلباً هو 'تبسيط' لا 'إضافة'",
                "فريق التطوير يُضيف ميزات لم يطلبها أحد",
            ],
            "prevention": [
                "قاعدة: كل ميزة جديدة تُزيل ميزة قائمة أو تُبسطها",
                "معيار القبول: هل ٨٠٪ من المدربين سيستخدمون هذه الميزة؟",
                "Progressive disclosure: الميزات المتقدمة مخفية افتراضياً",
                "User testing شهري مع مدربين حقيقيين قبل إضافة أي شيء",
            ],
        },
        {
            "title": "خطر ضعف الأداء (Performance Degradation)",
            "level": "عالٍ",
            "color": HexColor("#B71C1C"),
            "desc": "مع نمو حجم البيانات وتعقيد التمارين، يتباطأ التطبيق على الأجهزة المتوسطة. "
                    "المدرب في الميدان على iPad قديم لن يتسامح مع أي تأخير.",
            "signs": [
                "تمارين بـ 100+ كائن تصبح بطيئة عند التحريك",
                "localStorage يستغرق وقتاً ملحوظاً عند الفتح مع 500+ تمرين",
                "اليوم الأول سريع، بعد شهر يصبح بطيئاً",
            ],
            "prevention": [
                "Viewport culling: لا ترسم ما هو خارج الشاشة",
                "Command Pattern undo/redo بدلاً من array cloning",
                "Debounce لكل عمليات الكتابة على localStorage",
                "Performance budget: كل صفحة يجب أن تفتح في أقل من 1.5 ثانية",
                "Lazy loading للقوائم الطويلة (virtual scroll)",
            ],
        },
        {
            "title": "خطر فقدان البيانات (Data Loss)",
            "level": "كارثي",
            "color": HexColor("#4A0E0E"),
            "desc": "المدرب يفقد شهوراً من العمل بسبب: تحديث المتصفح، خطأ في الكود، "
                    "تغيير الجهاز، أو مسح بيانات المتصفح. هذا وحده كافٍ لتدمير سمعة المنتج.",
            "signs": [
                "مستخدمون يُبلّغون عن اختفاء بياناتهم بعد التحديث",
                "تغيير نموذج البيانات (schema) يُكسر البيانات القديمة",
                "المستخدم ينتقل لجهاز جديد ولا يجد بياناته",
            ],
            "prevention": [
                "Cloud sync إجباري بمجرد إنشاء حساب",
                "Zod validation عند قراءة البيانات من localStorage",
                "Migration scripts لتحويل البيانات القديمة عند تغيير الـ schema",
                "Export JSON يدوي متاح دائماً في القائمة",
                "Backup تلقائي يومي للخادم",
                "Toast notification: 'تم الحفظ' بعد كل تغيير مهم",
            ],
        },
        {
            "title": "خطر جودة المجتمع المنخفضة",
            "level": "متوسط",
            "color": NAVY,
            "desc": "مكتبة التمارين تملأ بمحتوى رديء، غير مُكتمل، أو منسوخ. "
                    "المستخدمون يفقدون الثقة في المكتبة ويتوقفون عن استخدامها.",
            "signs": [
                "تمارين بدون وصف أو بوصف مبهم",
                "صور مُصمَّمة بشكل عشوائي",
                "تكرار نفس التمرين من مستخدمين مختلفين",
            ],
            "prevention": [
                "الإلزام بحقول دنيا: عنوان + هدف + فئة عمرية + صورة",
                "مراجعة أول منشور لكل حساب يدوياً",
                "نظام تقييم صارم: أقل من ٣ نجوم يُخفى",
                "فريق تحرير يختار Featured Drills أسبوعياً لرفع المعيار",
                "مكافأة الجودة: المدربون المميزون يحصلون على شارة وظهور أعلى",
            ],
        },
        {
            "title": "خطر المنافسة (TacticalPad يُضيف ما يُميزنا)",
            "level": "متوسط",
            "color": HexColor("#1565C0"),
            "desc": "TacticalPad أو SessionLab يُضيفان ميزة تُميزنا (Arabic UI مثلاً) "
                    "مما يُقلص فارق التميز.",
            "signs": [
                "المنافسون يُعلنون دعم اللغة العربية",
                "منافس جديد يُركز على السوق العربي",
            ],
            "prevention": [
                "بناء الـ community moat أولاً — المكتبة الأكبر بالعربية لا يُنافَس",
                "التميز بالتجربة لا بالميزات — أسرع + أبسط + أجمل",
                "الأكاديميات العربية كشركاء استراتيجيين قبل المنافسين",
                "IP محلية: فهم عميق للسوق العربي لا يملكه منافس أجنبي",
            ],
        },
        {
            "title": "خطر بطء التطوير (Over-Engineering)",
            "level": "متوسط",
            "color": HexColor("#4E342E"),
            "desc": "الفريق يُمضي وقتاً طويلاً في إعادة الهيكلة المعمارية بينما "
                    "المنافسون يُطلقون ميزات جديدة كل أسبوع.",
            "signs": [
                "شهر كامل لإعادة هيكلة ملف واحد",
                "مناقشات تقنية لا تنتهي حول أفضل pattern",
                "لا ميزات جديدة للمستخدمين منذ شهرين",
            ],
            "prevention": [
                "قاعدة ٢٠/٨٠: ٢٠٪ وقت إعادة هيكلة، ٨٠٪ ميزات للمستخدمين",
                "Ship first, refactor later — أطلق ثم حسّن",
                "Sprint bi-weekly: كل أسبوعين يُطلق شيء للمستخدمين",
                "Tech debt backlog منفصل — لا تخلطه مع ميزات المستخدمين",
            ],
        },
    ]

    for risk in risks:
        r_hdr = Table([[
            Paragraph(ar(risk["title"]), S["white_bold"]),
            Paragraph(ar(f"مستوى الخطر: {risk['level']}"),
                      ParagraphStyle("rl", fontName="ArabicBold", fontSize=8,
                                     textColor=WHITE, alignment=TA_LEFT, leading=14)),
        ]], colWidths=[125 * mm, 45 * mm])
        r_hdr.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), risk["color"]),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(r_hdr)
        story.append(Paragraph(ar(risk["desc"]), S["body"]))

        inner = Table([[
            [
                Paragraph(ar("علامات التحذير المبكرة"),
                          ParagraphStyle("ws", fontName="ArabicBold", fontSize=9,
                                         textColor=risk["color"], alignment=TA_RIGHT, leading=16)),
                *[Paragraph(ar(f"◀  {s}"), S["bullet"]) for s in risk["signs"]],
            ],
            [
                Paragraph(ar("كيف نتفادى هذا الخطر"),
                          ParagraphStyle("pr", fontName="ArabicBold", fontSize=9,
                                         textColor=MINT, alignment=TA_RIGHT, leading=16)),
                *[Paragraph(ar(f"◀  {p}"), S["bullet"]) for p in risk["prevention"]],
            ],
        ]], colWidths=[83 * mm, 87 * mm])
        inner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), HexColor("#FFF5F5")),
            ("BACKGROUND", (1, 0), (1, 0), HexColor("#F0FAF8")),
            ("BOX", (0, 0), (0, 0), 0.5, MID_GRAY),
            ("BOX", (1, 0), (1, 0), 0.5, MINT),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(inner)
        story.append(Spacer(1, 4 * mm))

    # ══════════════════════════════════════════════════════════════════════
    # 7. PRODUCT STRATEGY
    # ══════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story += section_header("٧. استراتيجية المنتج — لماذا يختار المدرب كوتش مايند؟", S)
    story.append(body(
        "لا يكفي أن تكون جيداً — يجب أن تكون الخيار الواضح. "
        "هذا القسم يُحدد بدقة الجملة التي يقولها المدرب لزميله عند التوصية بالمنتج.", S))
    story.append(Spacer(1, 4 * mm))

    # Positioning statement
    pos_box = Table([[
        Paragraph(ar(
            "عبارة التموضع الاستراتيجي:\n\n"
            "كوتش مايند هو المنصة الوحيدة التي تمنح المدرب العربي "
            "أداة تصميم تمارين احترافية + بناء جلسات متكامل + تخطيط تكتيكي شامل "
            "في واجهة عربية واحدة — تعمل على الحاسوب والـ iPad حتى بدون إنترنت."
        ), S["white_bold"]),
    ]], colWidths=[170 * mm])
    pos_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ("BOX", (0, 0), (-1, -1), 3, YELLOW),
    ]))
    story.append(pos_box)
    story.append(Spacer(1, 6 * mm))

    story.append(sub_header("أ. كوتش مايند ضد TacticalPad", S))
    vs_tp = [
        [ar("المحور"), ar("TacticalPad"), ar("كوتش مايند"), ar("الفائز")],
        [ar("تصميم التمارين البصري"), ar("ممتاز"), ar("ممتاز + أدوات أكثر"), ar("كوتش مايند")],
        [ar("بناء الجلسات التدريبية"), ar("أساسي"), ar("متكامل مع تحليل ذكي"), ar("كوتش مايند")],
        [ar("التخطيط للموسم"), ar("بسيط"), ar("تقويم متكامل + إحصاءات"), ar("كوتش مايند")],
        [ar("واجهة عربية"), ar("لا توجد"), ar("كاملة (المرحلة ٢)"), ar("كوتش مايند")],
        [ar("التطبيق المكتبي Offline"), ar("لا يوجد"), ar("Electron — كامل offline"), ar("كوتش مايند")],
        [ar("مكتبة المجتمع"), ar("موجودة ونشطة"), ar("قادمة في المرحلة ٥"), ar("TacticalPad (حالياً)")],
        [ar("التطبيق على iPad"), ar("ممتاز"), ar("متوسط (قادم في المرحلة ١)"), ar("TacticalPad (حالياً)")],
        [ar("السعر"), ar("مرتفع $/شهر"), ar("تنافسي جداً"), ar("كوتش مايند")],
    ]
    vt = Table(vs_tp, colWidths=[50 * mm, 35 * mm, 50 * mm, 35 * mm])
    vt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "ArabicBold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.4, MID_GRAY),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 1), (-1, -1), "Arabic"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(vt)
    story.append(Spacer(1, 4 * mm))

    story.append(sub_header("ب. كوتش مايند ضد SessionLab", S))
    vs_sl = [
        [ar("المحور"), ar("SessionLab"), ar("كوتش مايند"), ar("الفائز")],
        [ar("بناء الجلسات"), ar("ممتاز — الأفضل في السوق"), ar("قوي + مرتبط بالتمارين"), ar("SessionLab (حالياً)")],
        [ar("تصميم التمارين البصري"), ar("محدود — نصوص فقط"), ar("لوحة رسم كاملة"), ar("كوتش مايند")],
        [ar("التخطيط التكتيكي"), ar("غير موجود"), ar("متكامل"), ar("كوتش مايند")],
        [ar("إدارة الفرق"), ar("محدود"), ar("كاملة مع ألوان وأرقام"), ar("كوتش مايند")],
        [ar("تخطيط الموسم"), ar("موجود"), ar("موجود + تقويم"), ar("متساويان")],
        [ar("واجهة عربية"), ar("لا توجد"), ar("كاملة (المرحلة ٢)"), ar("كوتش مايند")],
        [ar("التطبيق المكتبي"), ar("ويب فقط"), ar("Electron offline"), ar("كوتش مايند")],
        [ar("قوالب الجلسات"), ar("مئات القوالب"), ar("١٢ قالب (قادم)"), ar("SessionLab (حالياً)")],
    ]
    sl = Table(vs_sl, colWidths=[50 * mm, 35 * mm, 50 * mm, 35 * mm])
    sl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "ArabicBold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.4, MID_GRAY),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 1), (-1, -1), "Arabic"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(sl)
    story.append(Spacer(1, 5 * mm))

    strategy_points = [
        ("لماذا سيختارنا المدرب العربي قبل أي أحد؟",
         "لأننا الوحيدون الذين نفهمه ونتحدث لغته. "
         "TacticalPad و SessionLab أدوات غربية مترجمة — كوتش مايند "
         "مبني للمدرب العربي من البداية. هذا الفرق يُحسّ به في كل نقرة."),
        ("ما الذي يجعلنا لا يُستبدَل؟",
         "المكتبة المجتمعية بالعربية. بمجرد أن يُنشئ آلاف المدربين تمارينهم "
         "على كوتش مايند، تُصبح المكتبة نفسها سبباً للبقاء. "
         "لا يمكن نقل هذا المحتوى لأي منافس."),
        ("ما هي رسالتنا التسويقية الجوهرية؟",
         "لا نبيع برمجيات. نبيع وقت المدرب. "
         "كل دقيقة توفرها من التحضير = دقيقة إضافية مع اللاعبين. "
         "هذه هي القيمة الحقيقية."),
    ]
    for sp_title, sp_desc in strategy_points:
        sp_box = Table([[
            [Paragraph(ar(sp_title), S["h4"]),
             Paragraph(ar(sp_desc), S["body"])],
        ]], colWidths=[170 * mm])
        sp_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F0F4FF")),
            ("BOX", (0, 0), (-1, -1), 1, NAVY),
            ("LEFTBORDER", (0, 0), (0, -1), 4, NAVY),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(sp_box)
        story.append(Spacer(1, 3 * mm))

    # ══════════════════════════════════════════════════════════════════════
    # 8. ROAD TO 10/10 — PRACTICAL & ACTIONABLE
    # ══════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    r10_banner = Table([[Paragraph(ar("الطريق نحو ١٠/١٠ — النسخة القابلة للتنفيذ"), S["h1"])]],
                       colWidths=[170 * mm])
    r10_banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#0A1A35")),
        ("LEFTPADDING", (0, 0), (-1, -1), 15),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("BOX", (0, 0), (-1, -1), 3, YELLOW),
    ]))
    story.append(r10_banner)
    story.append(Spacer(1, 5 * mm))
    story.append(body(
        "هذا ليس قائمة أمنيات — هذا قائمة قرارات. "
        "كل بند هنا إما تُبنيه، تُحسّنه، تُبسّطه، أو تُزيله.", S))
    story.append(Spacer(1, 4 * mm))

    action_sections = [
        ("ما يجب بناؤه — لا يوجد ولا بديل عنه", MINT, [
            ("Cloud Sync + Authentication",
             "الحفظ على localStorage وحده يعني أن المنتج لا يُباع كخدمة. "
             "يجب أن يكون الحفظ السحابي هو الافتراضي من اليوم الأول للمستخدم المسجّل."),
            ("Touch-first Canvas للـ iPad",
             "المدرب على الملعب يستخدم iPad. الرسم بالإصبع يجب أن يكون سلساً كالورقة. "
             "الكونفا تدعم touch events — يجب تفعيلها وتحسينها."),
            ("Onboarding Flow (٥ خطوات)",
             "المستخدم الجديد يجب أن يرسم تمرينه الأول خلال ٥ دقائق من التسجيل. "
             "هذه الـ ٥ دقائق تُحدد هل يبقى أم يرحل إلى الأبد."),
            ("Arabic UI كاملة",
             "ليست ترجمة — هي إعادة تفكير في كل عنصر من منظور عربي: "
             "RTL، التواريخ الهجرية اختيارياً، مصطلحات كروية عربية صحيحة."),
            ("Community Drill Library",
             "المكتبة هي الخندق الدفاعي ضد المنافسين. "
             "كل تمرين يُنشر يُصعّب على المدرب المغادرة."),
        ]),
        ("ما يجب تحسينه — موجود لكن غير كافٍ", NAVY, [
            ("نظام Undo/Redo",
             "الحل الحالي (array cloning) يعمل لكنه بطيء مع التمارين الكبيرة. "
             "Command Pattern (موجود في V2) يجب أن يُصبح هو النظام الوحيد."),
            ("أداء اللوحة",
             "اللوحة مقبولة مع ٢٠-٣٠ كائناً. مع ١٠٠+ تبدأ المشاكل. "
             "Viewport culling + بتش الرسم يحلان ٨٠٪ من المشكلة."),
            ("InspectorPanel",
             "لوحة الخصائص الحالية تخلط بين أنواع الكائنات المختلفة. "
             "كل نوع كائن يجب أن يُرى خصائصه المناسبة فقط."),
            ("Session Quality Analyzer",
             "التحليل الموجود ذكي لكن يظهر كتحذير نصي. "
             "يجب أن يكون مرئياً: رسم بياني للكثافة + تعليق صوتي أو مرئي."),
            ("وضع العرض الميداني",
             "مفيد لكن يحتاج أزراراً أكبر، خطاً أوضح، وإمكانية التعليق المباشر "
             "على الشاشة أثناء شرح التمرين."),
        ]),
        ("ما يجب تبسيطه — موجود لكن معقد جداً", ORANGE, [
            ("عملية إنشاء تمرين جديد",
             "حالياً: ٣+ نقرات قبل رؤية الملعب. يجب: نقرة واحدة → ملعب فارغ جاهز. "
             "البيانات الإضافية (عنوان، هدف، فئة) تُدخل لاحقاً اختيارياً."),
            ("قائمة الأدوات (Palette)",
             "١٥+ أداة في قائمة تتطلب التمرير. يجب: ٦ أدوات في شريط رئيسي + "
             "باقي الأدوات في 'المزيد' قابلة للتخصيص."),
            ("نظام التشكيلات",
             "زر التشكيلة مخفي في أسفل الصفحة. يجب أن يكون في شريط الأدوات الرئيسي "
             "كزر كبير واضح مع اختيار عدد اللاعبين مباشرة."),
            ("التخطيط التكتيكي Pro Mode",
             "٥٠+ حقل في وضع Pro Mode. يجب تقسيمها لـ 'أساسي' (١٠ حقول) "
             "و'تفصيلي' (الباقي مخفي) مع إمكانية التوسع."),
            ("Session Timeline",
             "السحب والإفلات يعمل لكن المستخدم لا يُدرك ذلك. "
             "يجب مؤشر مرئي واضح: أيقونة سحب + تعليمة أولى مرة."),
        ]),
        ("ما يجب إزالته أو دمجه — يُسبب تشتتاً", HexColor("#B71C1C"), [
            ("V2 Canvas System (إذا لم يُدمج)",
             "نظامان متوازيان للـ Canvas هو أسوأ قرار معماري. "
             "اختر V2 وادمجه كاملاً، أو احذفه. لا خيار ثالث."),
            ("storageImpl المكرر في 8 ملفات",
             "هذا ليس رأياً تقنياً — هو خطر فعلي. "
             "أي تغيير في منطق التخزين يتطلب تعديل 8 ملفات. يجب توحيده اليوم."),
            ("seed data في الإنتاج",
             "بيانات التجربة (٣ تمارين + فريقان وهميان) يجب حذفها من النسخة الإنتاجية. "
             "المستخدم الحقيقي يُريد أن يبدأ بصفحة نظيفة."),
            ("console.log في الكود",
             "أي console.log أو debug code في الإنتاج يعكس عدم احترافية. "
             "يجب تفعيل eslint rule تمنع ذلك."),
            ("الازدواجية في TOC والمسميات",
             "بعض عناوين الصفحات والأزرار لها مسميات متعددة في أماكن مختلفة. "
             "يجب Glossary موحد لمصطلحات المنتج."),
        ]),
    ]

    for sec_title, color, items in action_sections:
        sec_hdr = Table([[Paragraph(ar(sec_title), S["white_bold"])]],
                        colWidths=[170 * mm])
        sec_hdr.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), color),
            ("LEFTPADDING", (0, 0), (-1, -1), 14),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(sec_hdr)
        story.append(Spacer(1, 2 * mm))

        for item_title, item_desc in items:
            row = Table([[
                Paragraph(ar(item_title),
                          ParagraphStyle("it", fontName="ArabicBold", fontSize=10,
                                         textColor=color, alignment=TA_RIGHT, leading=18)),
                Paragraph(ar(item_desc), S["body"]),
            ]], colWidths=[55 * mm, 115 * mm])
            row.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
                ("LEFTBORDER", (0, 0), (0, -1), 4, color),
                ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            story.append(row)
            story.append(Spacer(1, 2 * mm))
        story.append(Spacer(1, 4 * mm))

    # Final commitment table
    story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceAfter=6))
    story.append(Spacer(1, 3 * mm))

    commit_rows = [
        [ar("الإطار الزمني"), ar("ما يُطلقه المستخدم"), ar("ما يُرى من الخارج")],
        [ar("بعد المرحلة ١ (شهران)"),
         ar("محرر مستقر + iPad touch + onboarding + Arabic UI"),
         ar("MVP حقيقي قابل للإطلاق للمدربين الأوائل")],
        [ar("بعد المرحلة ٢ (٤ أشهر)"),
         ar("Cloud + Auth + Session Builder المتقدم"),
         ar("SaaS حقيقي قابل للاشتراك المدفوع")],
        [ar("بعد المرحلة ٣ (٦ أشهر)"),
         ar("Match Planning + Community Library"),
         ar("المنصة الأشمل لكرة القدم في العالم العربي")],
        [ar("بعد المرحلة ٤ (٩ أشهر)"),
         ar("Analytics + Academy Management + Mobile"),
         ar("منصة إدارة أكاديميات متكاملة — لا منافس")],
    ]
    ct = Table(commit_rows, colWidths=[50 * mm, 70 * mm, 50 * mm])
    ct.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#0A1A35")),
        ("TEXTCOLOR", (0, 0), (-1, 0), YELLOW),
        ("FONTNAME", (0, 0), (-1, 0), "ArabicBold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#EEF1F8"), WHITE]),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GRAY),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("FONTNAME", (0, 1), (-1, -1), "Arabic"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(ct)
    story.append(Spacer(1, 6 * mm))

    final_call = Table([[
        Paragraph(ar(
            "الرسالة الأخيرة:\n\n"
            "كوتش مايند ليس مجرد تطبيق آخر لكرة القدم.\n"
            "هو الفرصة لبناء المنصة المرجعية الأولى للمدربين في العالم العربي — "
            "حيث لا يوجد حتى الآن أي منافس حقيقي يفهم هذا السوق.\n\n"
            "الفجوة موجودة. الأدوات موجودة. الرؤية موجودة.\n"
            "المطلوب الآن: التنفيذ."
        ), S["white_bold"]),
    ]], colWidths=[170 * mm])
    final_call.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#0A1A35")),
        ("LEFTPADDING", (0, 0), (-1, -1), 22),
        ("RIGHTPADDING", (0, 0), (-1, -1), 22),
        ("TOPPADDING", (0, 0), (-1, -1), 18),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
        ("BOX", (0, 0), (-1, -1), 4, YELLOW),
    ]))
    story.append(final_call)

    return story


# ══════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════
def main():
    out = "C:/Users/asus/sessionbuilder/coach-mind-full-audit-report-v3.pdf"
    S = styles()

    doc = SimpleDocTemplate(
        out,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=25 * mm,
        bottomMargin=18 * mm,
        title=ar("تقرير التدقيق الشامل — كوتش مايند"),
        author=ar("فريق التحليل الاستراتيجي"),
        subject=ar("تقرير منتج ومنصة"),
    )

    def on_page(canvas, doc):
        if doc.page == 1:
            _cover_bg(canvas, doc)
        else:
            _inner_header(canvas, doc)

    story = build_story(S)
    doc.build(story, onFirstPage=on_page, onLaterPages=_inner_header)
    print(f"PDF generated: {out}")


if __name__ == "__main__":
    main()
