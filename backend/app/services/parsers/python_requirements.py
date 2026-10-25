import re
from typing import List
from app.services.parsers.base import BaseParser, ParsedDependency, ParseResult


# Matches package name with optional extras, followed by comparator and version
REQ_LINE_REGEX = re.compile(
    r"^([A-Za-z0-9_.\-]+)(?:\[[^\]]*\])?\s*([<>=!~].*)?$"
)
EXACT_EQ_REGEX = re.compile(r"^==\s*([A-Za-z0-9_.\-]+)$")


class PythonRequirementsParser(BaseParser):
    def parse(self, content: str, filename: str) -> ParseResult:
        warnings: List[str] = []
        dependencies: List[ParsedDependency] = []
        seen_packages = set()
        has_ranges = False

        lines = content.splitlines()
        for raw_line in lines:
            line = raw_line.strip()
            # Remove comments
            if not line or line.startswith("#"):
                continue
            if " #" in line:
                line = line.split(" #")[0].strip()

            # Ignore pip CLI options like -r, -i, -f, --extra-index-url
            if line.startswith(("-", "--")):
                warnings.append(f"Ignored pip directive in requirements: '{line}'")
                continue

            # Strip environment markers (e.g. ; python_version >= '3.8')
            marker = None
            if ";" in line:
                parts = line.split(";", 1)
                line = parts[0].strip()
                marker = parts[1].strip()

            match = REQ_LINE_REGEX.match(line)
            if not match:
                continue

            pkg_name = match.group(1).strip()
            specifier = match.group(2).strip() if match.group(2) else ""

            # Normalize package name (PEP 503: lowercased, hyphens/underscores/dots normalized)
            normalized_name = re.sub(r"[-_.]+", "-", pkg_name).lower()
            if normalized_name in seen_packages:
                continue
            seen_packages.add(normalized_name)

            resolved_ver = None
            if specifier:
                exact_match = EXACT_EQ_REGEX.match(specifier)
                if exact_match:
                    resolved_ver = exact_match.group(1).strip()
                else:
                    has_ranges = True
            else:
                has_ranges = True

            dep = ParsedDependency(
                package_name=pkg_name,
                ecosystem="PyPI",
                resolved_version=resolved_ver,
                declared_version=specifier if specifier else "latest / unpinned",
                direct_or_transitive="direct",
                package_metadata={
                    "marker": marker,
                    "is_exact": resolved_ver is not None,
                }
            )
            dependencies.append(dep)

        if has_ranges:
            warnings.append(
                "One or more requirements are unpinned or use version ranges (>=, ~=). "
                "For exact vulnerability scanning, generate a pinned requirements.txt via 'pip freeze'."
            )

        return ParseResult(
            dependencies=dependencies,
            warnings=warnings,
            ecosystem="PyPI",
            manifest_type="requirements.txt"
        )
