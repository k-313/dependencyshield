import pytest
from app.services.parsers import get_parser
from app.services.parsers.npm_package_json import NpmPackageJsonParser
from app.services.parsers.npm_lockfile import NpmLockfileParser
from app.services.parsers.python_requirements import PythonRequirementsParser
from app.services.parsers.python_pyproject import PythonPyprojectParser


def test_package_json_parser():
    content = """{
        "name": "sample-app",
        "dependencies": {
            "lodash": "4.17.21",
            "express": "^4.18.2"
        },
        "devDependencies": {
            "jest": "~29.5.0"
        }
    }"""
    parser = get_parser("package.json")
    res = parser.parse(content, "package.json")

    assert res.ecosystem == "npm"
    assert len(res.dependencies) == 3

    # lodash is exact
    lodash_dep = next(d for d in res.dependencies if d.package_name == "lodash")
    assert lodash_dep.resolved_version == "4.17.21"

    # express is range
    express_dep = next(d for d in res.dependencies if d.package_name == "express")
    assert express_dep.resolved_version is None
    assert express_dep.declared_version == "^4.18.2"

    # warnings recorded for range
    assert any("version ranges" in w for w in res.warnings)


def test_package_lock_parser():
    content = """{
        "name": "sample-app",
        "lockfileVersion": 3,
        "packages": {
            "": {
                "name": "sample-app",
                "dependencies": {
                    "lodash": "^4.17.21"
                }
            },
            "node_modules/lodash": {
                "version": "4.17.21",
                "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
                "integrity": "sha512-..."
            },
            "node_modules/nested/node_modules/transitive-lib": {
                "version": "1.0.4"
            }
        }
    }"""
    parser = get_parser("package-lock.json")
    res = parser.parse(content, "package-lock.json")

    assert res.ecosystem == "npm"
    assert len(res.dependencies) == 2

    lodash = next(d for d in res.dependencies if d.package_name == "lodash")
    assert lodash.resolved_version == "4.17.21"
    assert lodash.direct_or_transitive == "direct"

    trans = next(d for d in res.dependencies if d.package_name == "transitive-lib")
    assert trans.resolved_version == "1.0.4"
    assert trans.direct_or_transitive == "transitive"


def test_python_requirements_parser():
    content = """
    # Requirements file
    requests==2.28.1
    urllib3>=1.26.5,<2.0.0
    flask~=2.3.0
    pytest
    -i https://pypi.org/simple
    """
    parser = get_parser("requirements.txt")
    res = parser.parse(content, "requirements.txt")

    assert res.ecosystem == "PyPI"
    assert len(res.dependencies) == 4

    req = next(d for d in res.dependencies if d.package_name == "requests")
    assert req.resolved_version == "2.28.1"

    urllib = next(d for d in res.dependencies if d.package_name == "urllib3")
    assert urllib.resolved_version is None
    assert ">=1.26.5" in urllib.declared_version

    assert any("unpinned or use version ranges" in w for w in res.warnings)
    assert any("Ignored pip directive" in w for w in res.warnings)


def test_python_pyproject_parser():
    content = """
    [project]
    name = "my-fastapi-app"
    version = "0.1.0"
    dependencies = [
        "fastapi==0.110.0",
        "uvicorn>=0.28.0",
    ]

    [tool.poetry.dependencies]
    requests = "^2.28.0"
    """
    parser = get_parser("pyproject.toml")
    res = parser.parse(content, "pyproject.toml")

    assert res.ecosystem == "PyPI"
    fastapi_dep = next(d for d in res.dependencies if d.package_name == "fastapi")
    assert fastapi_dep.resolved_version == "0.110.0"

    uvicorn_dep = next(d for d in res.dependencies if d.package_name == "uvicorn")
    assert uvicorn_dep.resolved_version is None


def test_malformed_manifest_raises():
    parser = get_parser("package.json")
    with pytest.raises(ValueError):
        parser.parse("{not valid json", "package.json")


def test_unsupported_manifest_raises():
    with pytest.raises(ValueError, match="Unsupported manifest file"):
        get_parser("build.gradle")
