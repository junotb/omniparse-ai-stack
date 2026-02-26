"""
Parser 서비스: 텍스트 구조화 및 테이블 추출.

- struct: 텍스트를 헤더/문단/리스트 등으로 구조화
- table: 텍스트에서 테이블 데이터 추출
향후 Unstructured, LayoutParser 등으로 확장 가능.
"""

import re
from typing import Any, Optional

from app.schemas.parser import ParserStructResponse, ParserTableResponse, StructuredSection


class ParserService:
    """텍스트/문서 파싱 서비스."""

    def struct(self, text: str, options: Optional[dict[str, Any]] = None) -> ParserStructResponse:
        """
        텍스트를 구조화된 섹션으로 분할.

        휴리스틱: 빈 줄 구분, 짧은 줄→헤더, 불릿/숫자→리스트
        """
        opts = options or {}
        sections: list[StructuredSection] = []
        lines = text.strip().split("\n")

        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()
            if not stripped:
                i += 1
                continue

            # 헤더 감지: 짧은 줄, 또는 #으로 시작, 또는 대문자만
            if opts.get("detect_headers", True):
                if stripped.startswith("#"):
                    level = len(stripped) - len(stripped.lstrip("#"))
                    content = stripped.lstrip("#").strip()
                    if content:
                        sections.append(
                            StructuredSection(type="header", content=content, level=level)
                        )
                    i += 1
                    continue
                if len(stripped) < 80 and stripped.isupper() and len(stripped) > 1:
                    sections.append(
                        StructuredSection(type="header", content=stripped, level=1)
                    )
                    i += 1
                    continue

            # 리스트 감지
            bullet_match = re.match(r"^[\s]*([\-\*•\d]+[\.\)]\s*)(.+)", line)
            if bullet_match:
                content = bullet_match.group(2).strip()
                if content:
                    sections.append(
                        StructuredSection(type="list", content=content, level=None)
                    )
                i += 1
                continue

            # 문단: 연속된 줄 모음
            para_lines = [stripped]
            j = i + 1
            while j < len(lines) and lines[j].strip():
                para_lines.append(lines[j].strip())
                j += 1
            para_text = " ".join(para_lines)
            if para_text:
                sections.append(
                    StructuredSection(type="paragraph", content=para_text, level=None)
                )
            i = j

        return ParserStructResponse(
            sections=sections,
            raw_length=len(text),
        )

    def extract_tables(
        self,
        text: str,
        delimiter: Optional[str] = None,
    ) -> ParserTableResponse:
        """
        텍스트에서 테이블 형태 데이터 추출.

        - 파이프(|), 탭, 쉼표로 구분된 블록을 테이블로 인식
        - delimiter가 주어지면 해당 구분자로 컬럼 분리
        """
        tables: list[list[list[str]]] = []
        lines = text.strip().split("\n")

        # 구분자 자동 감지 (가장 많이 등장하는 것)
        def _detect_delimiter(row: str) -> str:
            candidates = ["|", "\t", ","]
            counts = [(c, row.count(c)) for c in candidates if row.count(c) >= 2]
            if not counts:
                return "\t"  # 기본값
            return max(counts, key=lambda x: x[1])[0]

        def _parse_row(row: str, delim: str) -> list[str]:
            if delim == "|":
                # 파이프 테이블: | a | b | -> ["a","b"]
                cells = [c.strip() for c in row.split("|") if c.strip() or row.count("|") > 1]
                return cells
            return [c.strip() for c in row.split(delim)]

        i = 0
        while i < len(lines):
            line = lines[i]
            if not line.strip():
                i += 1
                continue

            delim = delimiter or _detect_delimiter(line)
            table_rows: list[list[str]] = []

            while i < len(lines) and (
                lines[i].strip()
                and (delim in lines[i] or (delimiter and delimiter in lines[i]))
            ):
                row = _parse_row(lines[i], delim)
                if row:
                    table_rows.append(row)
                i += 1

            if len(table_rows) >= 1:
                # 구분선 행 제거 (---|--|-- 형태)
                filtered = [
                    r
                    for r in table_rows
                    if not re.match(r"^[\s\|\-\:\t,]+$", "".join(r))
                ]
                if filtered:
                    tables.append(filtered)
            else:
                i += 1

        return ParserTableResponse(
            tables=tables,
            table_count=len(tables),
        )


def get_parser_service() -> ParserService:
    """Parser 서비스 팩토리."""
    return ParserService()
