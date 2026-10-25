import json
from typing import Dict, Any, List
from app.services.parsers.base import BaseParser, ParsedDependency, ParseResult


class NpmLockfileParser(BaseParser):
    def parse(self, content: str, filename: str) -> ParseResult:
        warnings: List[str] = []
        dependencies: List[ParsedDependency] = []
        seen_keys = set()

        try:
            data = json.loads(content)
        except Exception as e:
            raise ValueError(f"Invalid package-lock.json format: {str(e)}")

        if not isinstance(data, dict):
            raise ValueError("package-lock.json root must be a JSON object")

        lockfile_version = data.get("lockfileVersion", 1)

        # Identify direct dependency names if available from root package
        direct_names = set()
        if "packages" in data and "" in data["packages"]:
            root_pkg = data["packages"][""]
            direct_names.update(root_pkg.get("dependencies", {}).keys())
            direct_names.update(root_pkg.get("devDependencies", {}).keys())
            direct_names.update(root_pkg.get("optionalDependencies", {}).keys())

        # Support Lockfile v2 and v3: packages map
        if "packages" in data and isinstance(data["packages"], dict):
            for path_key, pkg_info in data["packages"].items():
                if not path_key or not isinstance(pkg_info, dict):
                    continue
                # Standard path: node_modules/xyz or node_modules/@scope/xyz
                if "node_modules/" not in path_key:
                    continue

                # Extract package name (last node_modules segment)
                segments = path_key.split("node_modules/")
                pkg_name = segments[-1]
                version = pkg_info.get("version")

                if not pkg_name or not version or not isinstance(version, str):
                    continue

                dedup_key = f"{pkg_name}@{version}"
                if dedup_key in seen_keys:
                    continue
                seen_keys.add(dedup_key)

                # Determine if direct or transitive
                is_direct = (
                    pkg_name in direct_names
                    and len(segments) == 2  # top-level node_modules
                )

                dep = ParsedDependency(
                    package_name=pkg_name,
                    ecosystem="npm",
                    resolved_version=version.strip(),
                    declared_version=version.strip(),
                    direct_or_transitive="direct" if is_direct else "transitive",
                    package_metadata={
                        "integrity": pkg_info.get("integrity"),
                        "resolved": pkg_info.get("resolved"),
                        "dev": pkg_info.get("dev", False),
                        "lockfile_version": lockfile_version,
                    }
                )
                dependencies.append(dep)

        # Fallback for Lockfile v1 (or v2 dependencies tree if packages empty)
        elif "dependencies" in data and isinstance(data["dependencies"], dict):
            def parse_v1_deps(dep_dict: Dict[str, Any], is_top_level: bool = True):
                for pkg_name, info in dep_dict.items():
                    if not isinstance(info, dict):
                        continue
                    version = info.get("version")
                    if not version or not isinstance(version, str):
                        continue

                    dedup_key = f"{pkg_name}@{version}"
                    if dedup_key not in seen_keys:
                        seen_keys.add(dedup_key)
                        dep = ParsedDependency(
                            package_name=pkg_name,
                            ecosystem="npm",
                            resolved_version=version.strip(),
                            declared_version=version.strip(),
                            direct_or_transitive="direct" if is_top_level else "transitive",
                            package_metadata={
                                "integrity": info.get("integrity"),
                                "resolved": info.get("resolved"),
                                "dev": info.get("dev", False),
                                "lockfile_version": 1,
                            }
                        )
                        dependencies.append(dep)

                    # Nested dependencies in v1
                    if "dependencies" in info and isinstance(info["dependencies"], dict):
                        parse_v1_deps(info["dependencies"], is_top_level=False)

            parse_v1_deps(data["dependencies"], is_top_level=True)

        if not dependencies:
            warnings.append("No resolved dependencies were found in the package-lock.json file.")

        return ParseResult(
            dependencies=dependencies,
            warnings=warnings,
            ecosystem="npm",
            manifest_type="package-lock.json"
        )
