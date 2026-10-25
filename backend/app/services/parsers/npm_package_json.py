import json
import re
from typing import Dict, Any, List
from app.services.parsers.base import BaseParser, ParsedDependency, ParseResult


EXACT_SEMVER_REGEX = re.compile(r"^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$")


class NpmPackageJsonParser(BaseParser):
    def parse(self, content: str, filename: str) -> ParseResult:
        warnings: List[str] = []
        dependencies: List[ParsedDependency] = []
        seen_packages = set()

        try:
            data = json.loads(content)
        except Exception as e:
            raise ValueError(f"Invalid package.json format: {str(e)}")

        if not isinstance(data, dict):
            raise ValueError("package.json root must be a JSON object")

        dep_sections = [
            ("dependencies", "direct"),
            ("devDependencies", "direct"),
            ("peerDependencies", "direct"),
            ("optionalDependencies", "direct"),
        ]

        has_ranges = False

        for section_key, scope in dep_sections:
            deps_dict = data.get(section_key, {})
            if isinstance(deps_dict, dict):
                for pkg_name, version_spec in deps_dict.items():
                    if not isinstance(pkg_name, str) or not isinstance(version_spec, str):
                        continue
                    
                    pkg_name = pkg_name.strip()
                    version_spec = version_spec.strip()

                    if pkg_name in seen_packages:
                        continue
                    seen_packages.add(pkg_name)

                    # Check if exact semver
                    match = EXACT_SEMVER_REGEX.match(version_spec)
                    if match:
                        resolved_ver = match.group(1)
                    else:
                        resolved_ver = None
                        has_ranges = True

                    dep = ParsedDependency(
                        package_name=pkg_name,
                        ecosystem="npm",
                        resolved_version=resolved_ver,
                        declared_version=version_spec,
                        direct_or_transitive=scope,
                        package_metadata={
                            "section": section_key,
                            "is_exact": resolved_ver is not None,
                        }
                    )
                    dependencies.append(dep)

        if has_ranges:
            warnings.append(
                "One or more dependencies in package.json specify version ranges (^, ~, >=). "
                "For exact vulnerability scanning, upload a package-lock.json."
            )

        return ParseResult(
            dependencies=dependencies,
            warnings=warnings,
            ecosystem="npm",
            manifest_type="package.json"
        )
