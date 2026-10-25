from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from abc import ABC, abstractmethod


@dataclass
class ParsedDependency:
    package_name: str
    ecosystem: str  # "npm" or "PyPI"
    resolved_version: Optional[str] = None
    declared_version: Optional[str] = None
    direct_or_transitive: str = "direct"  # "direct" or "transitive"
    package_metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ParseResult:
    dependencies: List[ParsedDependency]
    warnings: List[str] = field(default_factory=list)
    ecosystem: str = "unknown"
    manifest_type: str = "unknown"


class BaseParser(ABC):
    @abstractmethod
    def parse(self, content: str, filename: str) -> ParseResult:
        """Parse manifest content string and return parsed dependencies and warnings."""
        pass
