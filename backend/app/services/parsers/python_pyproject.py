import re
from typing import List, Dict, Any
from app.services.parsers.base import BaseParser, ParsedDependency, ParseResult

try:
    import tomllib  # Built-in in Python 3.11+
except ImportError:
    import tomli as tomllib


REQ_LINE_REGEX = re.compile(
    r"^([A-Za-z0-9_.\-]+)(?:\[[^\]]*\])?\s*([<>=!~].*)?$"
)
EXACT_EQ_REGEX = re.compile(r"^==\s*([A-Za-z0-9_.\-]+)$")


class PythonPyprojectParser(BaseParser):
    def parse(self, content: str, filename: str) -> ParseResult:
        warnings: List[str] = []
        dependencies: List[ParsedDependency] = []
        seen_packages = set()
        has_ranges = False

        try:
            data = tomllib.loads(content)
        except Exception as e:
            raise ValueError(f"Invalid pyproject.toml format: {str(e)}")

        if not isinstance(data, dict):
            raise ValueError("pyproject.toml root must be a table")

        # 1. Check PEP 621 [project.dependencies]
        project_table = data.get("project", {})
        if isinstance(project_table, dict):
            deps = project_table.get("dependencies", [])
            if isinstance(deps, list):
                for item in deps:
                    if not isinstance(item, str):
                        continue
                    item = item.strip()
                    if ";" in item:
                        item = item.split(";")[0].strip()
                    match = REQ_LINE_REGEX.match(item)
                    if match:
                        pkg_name = match.group(1).strip()
                        spec = match.group(2).strip() if match.group(2) else ""
                        norm_name = re.sub(r"[-_.]+", "-", pkg_name).lower()
                        if norm_name in seen_packages:
                            continue
                        seen_packages.add(norm_name)

                        exact_match = EXACT_EQ_REGEX.match(spec) if spec else None
                        resolved_ver = exact_match.group(1).strip() if exact_match else None
                        if not resolved_ver:
                            has_ranges = True

                        dependencies.append(
                            ParsedDependency(
                                package_name=pkg_name,
                                ecosystem="PyPI",
                                resolved_version=resolved_ver,
                                declared_version=spec if spec else "unpinned",
                                direct_or_transitive="direct",
                                package_metadata={"standard": "PEP 621"}
                            )
                        )

        # 2. Check Poetry [tool.poetry.dependencies]
        tool_table = data.get("tool", {})
        if isinstance(tool_table, dict):
            poetry_table = tool_table.get("poetry", {})
            if isinstance(poetry_table, dict):
                p_deps = poetry_table.get("dependencies", {})
                if isinstance(p_deps, dict):
                    for pkg_name, spec_info in p_deps.items():
                        if not isinstance(pkg_name, str) or pkg_name.lower() == "python":
                            continue
                        norm_name = re.sub(r"[-_.]+", "-", pkg_name).lower()
                        if norm_name in seen_packages:
                            continue
                        seen_packages.add(norm_name)

                        version_str = ""
                        if isinstance(spec_info, str):
                            version_str = spec_info.strip()
                        elif isinstance(spec_info, dict):
                            version_str = str(spec_info.get("version", "")).strip()

                        # In Poetry, "1.2.3" without operator means exact; ^1.2.3 or ~1.2.3 means range
                        exact_match = re.match(r"^(\d+\.\d+\.\d+(?:[a-zA-Z0-9.-]+)?)$", version_str)
                        if exact_match and not version_str.startswith(("^", "~", ">", "<", "*")):
                            resolved_ver = exact_match.group(1)
                        else:
                            resolved_ver = None
                            has_ranges = True

                        dependencies.append(
                            ParsedDependency(
                                package_name=pkg_name,
                                ecosystem="PyPI",
                                resolved_version=resolved_ver,
                                declared_version=version_str if version_str else "unpinned",
                                direct_or_transitive="direct",
                                package_metadata={"standard": "Poetry"}
                            )
                        )

        if has_ranges:
            warnings.append(
                "pyproject.toml contains version ranges. For exact dependency vulnerability scanning, "
                "supply a lockfile (poetry.lock or pip freeze requirements.txt)."
            )

        if not dependencies:
            warnings.append("No standard dependencies found under [project.dependencies] or [tool.poetry.dependencies].")

        return ParseResult(
            dependencies=dependencies,
            warnings=warnings,
            ecosystem="PyPI",
            manifest_type="pyproject.toml"
        )
