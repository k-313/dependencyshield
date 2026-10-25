import os
from typing import Optional
from app.services.parsers.base import BaseParser, ParsedDependency, ParseResult
from app.services.parsers.npm_package_json import NpmPackageJsonParser
from app.services.parsers.npm_lockfile import NpmLockfileParser
from app.services.parsers.python_requirements import PythonRequirementsParser
from app.services.parsers.python_pyproject import PythonPyprojectParser


def get_parser(filename: str) -> BaseParser:
    base_name = os.path.basename(filename).lower()

    if base_name == "package-lock.json":
        return NpmLockfileParser()
    elif base_name == "package.json":
        return NpmPackageJsonParser()
    elif base_name == "requirements.txt" or (base_name.endswith(".txt") and "requirement" in base_name):
        return PythonRequirementsParser()
    elif base_name == "pyproject.toml":
        return PythonPyprojectParser()
    else:
        raise ValueError(
            f"Unsupported manifest file '{filename}'. Supported manifest files are: "
            "package.json, package-lock.json, requirements.txt, pyproject.toml."
        )


__all__ = [
    "BaseParser",
    "ParsedDependency",
    "ParseResult",
    "NpmPackageJsonParser",
    "NpmLockfileParser",
    "PythonRequirementsParser",
    "PythonPyprojectParser",
    "get_parser",
]
