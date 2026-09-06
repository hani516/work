from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


OUT = Path("applications/pdm")
OUT.mkdir(parents=True, exist_ok=True)
PHOTO = Path("applications/pdm/reki-photo-optimized.jpg")
FONT = "Noto Sans JP"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, color="D9D9D9", size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = "w:" + edge
        el = borders.find(qn(tag))
        if el is None:
            el = OxmlElement(tag)
            borders.append(el)
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), size)
        el.set(qn("w:color"), color)


def set_cell_margins(cell, top=90, start=100, bottom=90, end=100):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn("w:" + m))
        if node is None:
            node = OxmlElement("w:" + m)
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_run_font(run, size=10.5, bold=False, color="000000"):
    run.font.name = FONT
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)
    rpr = run._element.get_or_add_rPr()
    fonts = rpr.rFonts
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.insert(0, fonts)
    for key in ("ascii", "hAnsi", "eastAsia"):
        fonts.set(qn("w:" + key), FONT)


def set_para(paragraph, size=10.5, bold=False, align=None, before=0, after=0, line=1.15):
    if align is not None:
        paragraph.alignment = align
    paragraph.paragraph_format.space_before = Pt(before)
    paragraph.paragraph_format.space_after = Pt(after)
    paragraph.paragraph_format.line_spacing = line
    for run in paragraph.runs:
        set_run_font(run, size=size, bold=bold)


def replace_cell_text(cell, text, size=9.5, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.08
    r = p.add_run(text)
    set_run_font(r, size=size, bold=bold)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)


def set_table_widths(table, widths):
    table.autofit = False
    tbl_pr = table._tbl.tblPr
    layout = tbl_pr.find(qn("w:tblLayout"))
    if layout is None:
        layout = OxmlElement("w:tblLayout")
        tbl_pr.append(layout)
    layout.set(qn("w:type"), "fixed")
    for idx, width in enumerate(widths):
        if idx < len(table.columns):
            table.columns[idx].width = Cm(width)
    for row in table.rows:
        for idx, width in enumerate(widths):
            if idx < len(row.cells):
                row.cells[idx].width = Cm(width)


def add_heading(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8 if level == 1 else 5)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    set_run_font(r, size=12 if level == 1 else 10.5, bold=True)
    return p


def add_body(doc, text, size=10.2, after=5):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.22
    r = p.add_run(text)
    set_run_font(r, size=size)
    return p


def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Cm(0.55 + level * 0.4)
    p.paragraph_format.first_line_indent = Cm(-0.2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.12
    r = p.add_run(text)
    set_run_font(r, size=9.8)
    return p


def setup_doc(doc, top=1.5, bottom=1.5, left=1.6, right=1.6):
    sec = doc.sections[0]
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(top)
    sec.bottom_margin = Cm(bottom)
    sec.left_margin = Cm(left)
    sec.right_margin = Cm(right)
    styles = doc.styles
    for style_name in ("Normal", "Title", "Heading 1", "Heading 2"):
        style = styles[style_name]
        style.font.name = FONT
        style._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
        style.font.color.rgb = RGBColor(0, 0, 0)


def build_resume():
    doc = Document()
    setup_doc(doc, top=1.0, bottom=1.0, left=1.15, right=1.15)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(6)
    set_run_font(title.add_run("履 歴 書"), size=18, bold=True)
    date = doc.add_paragraph()
    date.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    date.paragraph_format.space_after = Pt(5)
    set_run_font(date.add_run("2026年9月6日現在"), size=9.5)

    info = doc.add_table(rows=4, cols=3)
    info.alignment = WD_TABLE_ALIGNMENT.CENTER
    info.autofit = False
    set_table_widths(info, [3.0, 10.5, 4.8])
    for row in info.rows:
        for cell in row.cells:
            set_cell_border(cell, "A6A6A6", "7")
    replace_cell_text(info.cell(0, 0), "ふりがな", 8.5, True, WD_ALIGN_PARAGRAPH.CENTER)
    replace_cell_text(info.cell(0, 1), "きむ よはん", 9.5)
    photo_cell = info.cell(0, 2).merge(info.cell(3, 2))
    photo_cell.text = ""
    pp = photo_cell.paragraphs[0]
    pp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if PHOTO.exists():
        pp.add_run().add_picture(str(PHOTO), width=Cm(2.9), height=Cm(4.0))
    replace_cell_text(info.cell(1, 0), "氏名", 8.5, True, WD_ALIGN_PARAGRAPH.CENTER)
    replace_cell_text(info.cell(1, 1), "金耀韓  KIM YOHAN", 13, True)
    replace_cell_text(info.cell(2, 0), "生年月日", 8.5, True, WD_ALIGN_PARAGRAPH.CENTER)
    replace_cell_text(info.cell(2, 1), "1993年5月16日  満33歳  男", 9.5)
    replace_cell_text(info.cell(3, 0), "現住所", 8.5, True, WD_ALIGN_PARAGRAPH.CENTER)
    replace_cell_text(info.cell(3, 1), "〒598-0052  大阪府泉佐野市旭町3-10-102", 9.5)

    contact = doc.add_table(rows=1, cols=4)
    contact.alignment = WD_TABLE_ALIGNMENT.CENTER
    contact.autofit = False
    set_table_widths(contact, [2.0, 5.1, 2.0, 9.2])
    labels = ["電話", "080-4249-9595", "E-mail", "kim93yohan@gmail.com"]
    for i, text in enumerate(labels):
        replace_cell_text(contact.cell(0, i), text, 8.7 if i % 2 == 0 else 9.2, i % 2 == 0,
                          WD_ALIGN_PARAGRAPH.CENTER if i % 2 == 0 else WD_ALIGN_PARAGRAPH.LEFT)
        set_cell_border(contact.cell(0, i), "A6A6A6", "7")

    add_heading(doc, "学歴", 1)
    edu = [
        ("2007", "3", "Hwan-il Middle School 入学"),
        ("2009", "2", "Hwan-il Middle School 卒業"),
        ("2009", "3", "Hwan-il High School 入学"),
        ("2012", "2", "Hwan-il High School 卒業"),
        ("2013", "3", "Korea Polytechnic University Computer Science 入学"),
        ("2013", "7", "Korea Polytechnic University Computer Science 中途退学"),
        ("2014", "3", "Sangmyung University Geography 入学"),
        ("2020", "2", "Sangmyung University Geography Global Business 卒業"),
    ]
    hist = doc.add_table(rows=1, cols=3)
    hist.alignment = WD_TABLE_ALIGNMENT.CENTER
    hist.autofit = False
    set_table_widths(hist, [2.0, 1.2, 15.1])
    for i, text in enumerate(("年", "月", "学歴")):
        replace_cell_text(hist.cell(0, i), text, 9, True, WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(hist.cell(0, i), "E7EBF0")
    set_repeat_table_header(hist.rows[0])
    for y, m, text in edu:
        cells = hist.add_row().cells
        for c in cells:
            set_cell_border(c, "BFBFBF", "6")
        replace_cell_text(cells[0], y, 8.8, align=WD_ALIGN_PARAGRAPH.CENTER)
        replace_cell_text(cells[1], m, 8.8, align=WD_ALIGN_PARAGRAPH.CENTER)
        replace_cell_text(cells[2], text, 8.8)
    for c in hist.rows[0].cells:
        set_cell_border(c, "BFBFBF", "6")

    add_heading(doc, "職歴", 1)
    jobs = [
        ("2020", "2", "ユニクロ 大阪心斎橋店 入社"),
        ("2020", "2", "ファーストキャビンホテル 入社"),
        ("2020", "12", "ファーストキャビンホテル 退社"),
        ("2022", "3", "ユニクロ 大阪心斎橋店 退社"),
        ("2022", "3", "株式会社TIKA&GROSS 入社"),
        ("", "", "現在に至る"),
        ("", "", "以上"),
    ]
    jt = doc.add_table(rows=1, cols=3)
    jt.alignment = WD_TABLE_ALIGNMENT.CENTER
    jt.autofit = False
    set_table_widths(jt, [2.0, 1.2, 15.1])
    for i, text in enumerate(("年", "月", "職歴")):
        replace_cell_text(jt.cell(0, i), text, 9, True, WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(jt.cell(0, i), "E7EBF0")
        set_cell_border(jt.cell(0, i), "BFBFBF", "6")
    for y, m, text in jobs:
        cells = jt.add_row().cells
        for c in cells:
            set_cell_border(c, "BFBFBF", "6")
        replace_cell_text(cells[0], y, 8.8, align=WD_ALIGN_PARAGRAPH.CENTER)
        replace_cell_text(cells[1], m, 8.8, align=WD_ALIGN_PARAGRAPH.CENTER)
        replace_cell_text(cells[2], text, 8.8, align=WD_ALIGN_PARAGRAPH.RIGHT if text == "以上" else WD_ALIGN_PARAGRAPH.LEFT)

    add_heading(doc, "免許 資格", 1)
    qt = doc.add_table(rows=1, cols=3)
    qt.alignment = WD_TABLE_ALIGNMENT.CENTER
    qt.autofit = False
    set_table_widths(qt, [2.0, 1.2, 15.1])
    for i, text in enumerate(("年", "月", "免許 資格")):
        replace_cell_text(qt.cell(0, i), text, 9, True, WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(qt.cell(0, i), "E7EBF0")
        set_cell_border(qt.cell(0, i), "BFBFBF", "6")
    for y, m, text in (("2021", "2", "TOEIC 765"), ("2021", "8", "日本語能力試験 JLPT N1")):
        cells = qt.add_row().cells
        for c in cells:
            set_cell_border(c, "BFBFBF", "6")
        replace_cell_text(cells[0], y, 9, align=WD_ALIGN_PARAGRAPH.CENTER)
        replace_cell_text(cells[1], m, 9, align=WD_ALIGN_PARAGRAPH.CENTER)
        replace_cell_text(cells[2], text, 9)

    add_heading(doc, "志望動機 自己PR", 1)
    box = doc.add_table(rows=1, cols=1)
    box.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = box.cell(0, 0)
    set_cell_border(cell, "A6A6A6", "7")
    motivation = (
        "Webデザイナーとして約4年間、ECサイトLaLaTulleの情報設計、UI改善、実装、検証を担当してきました。"
        "GA4、Search Console、Clarity、ユーザーテストから課題を特定し、改善項目を整理した上で、導線や画面仕様へ落とし込んでいます。\n\n"
        "個人ではWivlo、Snapside、Tramiを企画し、対象ユーザーと解決する課題を定め、UX UI設計、Web iOS実装、リリースまで進めました。"
        "Blinqでは開発者と協業し、情報設計とUI UXを担当しています。\n\n"
        "PdMとして、ユーザー課題と事業上の制約を整理し、優先順位と要件を明確にした上で、デザイナーやエンジニアと改善を進めたいと考えています。"
        "デザインと実装の知識を生かし、仮説を検証可能な仕様へ変換し、リリース後のデータを次の判断につなげられる点が強みです。"
    )
    replace_cell_text(cell, motivation, 10.2)
    cell.paragraphs[0].paragraph_format.line_spacing = 1.25

    add_heading(doc, "本人希望記入欄", 1)
    pref = doc.add_table(rows=1, cols=1)
    pref.alignment = WD_TABLE_ALIGNMENT.CENTER
    pc = pref.cell(0, 0)
    set_cell_border(pc, "A6A6A6", "7")
    replace_cell_text(pc, "プロダクトマネージャー職を希望します。勤務地、給与、勤務時間は貴社規定に従います。", 10)

    path = OUT / "履歴書_KIMYOHAN_202609_PdM.docx"
    doc.save(path)
    return path


def add_project_table(doc, title, background, actions, outcome, role, tools):
    table = doc.add_table(rows=2, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_widths(table, [9.0, 4.9, 4.2])
    merged = table.cell(0, 0)
    replace_cell_text(merged, title, 9.5, True)
    replace_cell_text(table.cell(0, 1), "担当業務", 8.7, True, WD_ALIGN_PARAGRAPH.CENTER)
    replace_cell_text(table.cell(0, 2), "使用ツール", 8.7, True, WD_ALIGN_PARAGRAPH.CENTER)
    for c in table.rows[0].cells:
        set_cell_shading(c, "DCE6F1")
        set_cell_border(c)
    left = f"背景\n{background}\n\n対応\n" + "\n".join("・" + x for x in actions) + f"\n\n結果\n{outcome}"
    replace_cell_text(table.cell(1, 0), left, 8.8)
    replace_cell_text(table.cell(1, 1), "\n".join("・" + x for x in role), 8.5)
    replace_cell_text(table.cell(1, 2), "\n".join("・" + x for x in tools), 8.5)
    for c in table.rows[1].cells:
        set_cell_border(c)
        c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
    doc.add_paragraph().paragraph_format.space_after = Pt(1)


def build_career():
    doc = Document()
    setup_doc(doc, top=1.35, bottom=1.35, left=1.7, right=1.7)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(2)
    set_run_font(p.add_run("職務経歴書"), size=17, bold=True)
    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    meta.paragraph_format.space_after = Pt(6)
    set_run_font(meta.add_run("2026年9月6日  金耀韓"), size=9.3)

    add_heading(doc, "職務要約")
    add_body(doc, (
        "Product DesignerおよびUX UI Designerとして、課題定義、情報設計、要件整理、UI設計、実装、検証まで一貫して担当してきました。"
        "株式会社TIKA&GROSSのECサイトLaLaTulleでは、GA4、Search Console、Clarity、ユーザーテストを用いて行動課題を特定し、"
        "改善項目を整理してHalloween Page、Landing Page、PDPの構造と導線へ反映しました。実装後のデータを確認し、次の検証方針まで整理しています。"
    ))
    add_body(doc, (
        "個人プロジェクトではWivlo、Snapside、Tramiの企画、UX UI設計、Web iOS実装、リリースを担当しました。"
        "Blinqでは開発者と協業して情報設計とUI UXを担当しています。ユーザー課題と制約を整理し、優先順位と仕様を明確にして、"
        "実装可能なプロダクトへ落とし込む経験をPdM業務に生かしたいと考えています。"
    ))

    add_heading(doc, "PdM業務に活かせる経験")
    for item in (
        "ユーザー行動データと定性調査を組み合わせた課題発見",
        "課題、仮説、対応範囲を整理した改善優先順位の検討",
        "ユーザーフロー、画面要件、インタラクション仕様の設計",
        "デザイン、フロントエンド、iOS実装を踏まえた開発者との仕様調整",
        "ユーザーテスト、A Bテスト、アクセス解析によるリリース後の検証",
        "個人プロダクトにおける企画からリリースまでの一貫した推進",
    ):
        add_bullet(doc, item)

    add_heading(doc, "使用可能なツール")
    skills = doc.add_table(rows=4, cols=2)
    skills.alignment = WD_TABLE_ALIGNMENT.CENTER
    skills.autofit = False
    set_table_widths(skills, [4.2, 14.0])
    skill_rows = [
        ("設計 デザイン", "Figma、Photoshop、Illustrator 基礎、Notion"),
        ("分析 検証", "Google Analytics 4、Search Console、Microsoft Clarity、Lighthouse"),
        ("実装", "HTML、CSS、JavaScript、Web、iOS、Xcode、Firebase、Codex、Cursor"),
        ("自動化 AI", "Google Apps Script、LLMを用いた業務設計と実装支援"),
    ]
    for row, (label, value) in zip(skills.rows, skill_rows):
        replace_cell_text(row.cells[0], label, 9, True)
        set_cell_shading(row.cells[0], "E7EBF0")
        replace_cell_text(row.cells[1], value, 9)
        for c in row.cells:
            set_cell_border(c)

    doc.add_page_break()
    add_heading(doc, "職務経歴詳細")
    company = doc.add_paragraph()
    company.paragraph_format.space_after = Pt(4)
    set_run_font(company.add_run("株式会社TIKA&GROSS  制作部 LaLaTulleチーム  2022年3月から現在"), size=10.2, bold=True)

    add_project_table(
        doc,
        "2025年8月から2025年10月  ECサイトUX改善  SEOとUX",
        "検索流入後に商品の閲覧や購入へつながりにくく、情報構造の複雑化による離脱が発生していました。",
        [
            "GA4、Search Console、Clarity、ユーザーテストから課題を整理",
            "ユーザー行動を基に見出し、内部リンク、スクロール構造を再設計",
            "改善候補を整理し、A Bテストで検証",
            "UI設計からフロントエンド実装まで担当",
        ],
        "商品到達率と検索流入の改善につながる導線を設計しました。検証期間が限定的だったため、購買判断プロセスに課題が残ることを特定し、次の検証方針を整理しました。",
        ["課題定義", "要件整理", "UX UI設計", "検証設計", "行動分析", "実装"],
        ["Figma", "GA4", "Search Console", "Clarity", "Cursor"],
    )

    add_project_table(
        doc,
        "2026年2月から現在  業務プロセス改善と自動化検証",
        "分析データを手入力するスプレッドシート業務に時間がかかっていました。",
        [
            "業務フローと入力項目を整理",
            "Google Apps Scriptを用いた入力と整理用シートを試作",
            "運用可否を検証し、導入判断に必要な条件を明確化",
            "商品スペックをHTMLへ移行するフローを設計し、22商品で先行検証",
        ],
        "重要資料の数値確認工程が残るため本導入は見送りました。既存手入力運用を継続しながら、商品更新への展開と検証を進めています。",
        ["業務UX設計", "課題定義", "要件整理", "AI活用設計", "自動化検証"],
        ["GAS", "GA4", "Google Search Console", "LLM"],
    )

    add_project_table(
        doc,
        "2025年9月から現在  個人プロダクト開発",
        "身近な業務と生活上の課題を起点に、対象ユーザーと利用場面を定めてプロダクトを企画しています。",
        [
            "Wivlo  AI Writing Workspaceの企画、UX UI、Web iOS実装",
            "Snapside  Product History Platformの企画、UX UI、Web実装",
            "Trami  運動記録アプリの調査、UX UI、iOS実装",
            "Blinq  開発者と協業し、情報設計、User Flow、UI UXを担当",
        ],
        "企画、要件整理、プロトタイプ、実装、リリースまでを一貫して進め、技術的制約を踏まえて仕様を具体化する経験を積みました。",
        ["プロダクト企画", "UXリサーチ", "情報設計", "要件設計", "リリース", "開発者との協業"],
        ["Figma", "Codex", "Cursor", "HTML CSS JS", "Firebase", "Xcode"],
    )

    add_heading(doc, "自己PR")
    add_body(doc, (
        "私の強みは、ユーザーの行動と事業上の制約を整理し、チームが判断できる課題と実装可能な仕様へ変換できる点です。"
        "LaLaTulleでは、アクセス解析とユーザーテストから改善対象を特定し、情報構造、導線、画面仕様を設計しました。"
        "検証期間や運用上の制約も明確にし、結果を次の判断につなげています。"
    ))
    add_body(doc, (
        "個人プロジェクトでは、対象ユーザーと解決する課題を定め、必要な機能を絞り、デザインと実装を往復しながらリリースまで進めました。"
        "今後はPdMとして、ユーザー価値と事業目標を踏まえて優先順位を整理し、デザイナーやエンジニアと共通認識をつくりながら、"
        "リリースと検証を継続的に進めたいと考えています。"
    ))
    end = doc.add_paragraph()
    end.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    set_run_font(end.add_run("以上"), size=10.5)

    path = OUT / "職務経歴書_KIMYOHAN_202609_PdM.docx"
    doc.save(path)
    return path


if __name__ == "__main__":
    for created in (build_resume(), build_career()):
        print(created)
