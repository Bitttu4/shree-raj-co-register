from pathlib import Path

IGNORE = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".expo",
    ".expo-shared",
    ".metro",
    ".cache",
    "android",
    "ios",
    "dist",
    "build",
    "coverage",
}

def should_ignore(path: Path) -> bool:
    name = path.name.lower()

    # Exact match
    if name in {x.lower() for x in IGNORE}:
        return True

    # Ignore anything starting with these
    prefixes = (
        ".expo",
        ".metro",
        ".cache",
        "__pycache__",
    )

    return name.startswith(prefixes)


def print_tree(path: Path, prefix=""):
    items = sorted(
        [p for p in path.iterdir() if not should_ignore(p)],
        key=lambda p: (p.is_file(), p.name.lower()),
    )

    for i, item in enumerate(items):
        last = i == len(items) - 1
        print(prefix + ("└── " if last else "├── ") + item.name)

        if item.is_dir():
            print_tree(item, prefix + ("    " if last else "│   "))


print(Path(".").resolve().name)
print_tree(Path("."))