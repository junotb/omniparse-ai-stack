"""
Image 서비스: 이미지 분석 (크기, 포맷, 객체 탐지 등).

- 기본: PIL로 dimensions, format 등 추출
- 객체 탐지: 향후 PyTorch/YOLO 등으로 확장
"""

from pathlib import Path
from typing import Any

from app.schemas.image import ImageAnalyzeResult, ImageResultResponse


class ImageService:
    """이미지 분석 서비스."""

    def analyze(self, image_path: str | Path) -> dict[str, Any]:
        """
        이미지 분석 수행.

        Returns:
            results: [{type, data}, ...]
            - dimensions: width, height
            - format: format, mode
            - (향후) objects: 객체 탐지 결과
        """
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"이미지를 찾을 수 없습니다: {path}")

        results: list[dict[str, Any]] = []

        try:
            from PIL import Image

            with Image.open(path) as img:
                # dimensions
                results.append(
                    ImageAnalyzeResult(
                        type="dimensions",
                        data={"width": img.width, "height": img.height},
                    ).model_dump()
                )
                # format
                results.append(
                    ImageAnalyzeResult(
                        type="format",
                        data={
                            "format": img.format or "unknown",
                            "mode": img.mode,
                            "is_animated": getattr(img, "is_animated", False),
                        },
                    ).model_dump()
                )

                # 기본 인사이트 (휴리스틱)
                w, h = img.width, img.height
                aspect = w / h if h else 0
                orientation = "landscape" if w > h else ("portrait" if h > w else "square")
                results.append(
                    ImageAnalyzeResult(
                        type="insights",
                        data={
                            "orientation": orientation,
                            "aspect_ratio": round(aspect, 2),
                            "megapixels": round(w * h / 1_000_000, 2),
                        },
                    ).model_dump()
                )

        except ImportError as e:
            raise RuntimeError(
                "Pillow가 설치되지 않았습니다. pip install Pillow"
            ) from e

        return {
            "results": results,
        }


def get_image_service() -> ImageService:
    """Image 서비스 팩토리."""
    return ImageService()
