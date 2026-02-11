#!/usr/bin/env python3
# Copyright (c) 2020 Project CHIP Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Validate filesystem paths referenced in third_party/silabs/efr32_sdk.gni and
third_party/silabs/SiWx917_sdk.gni.

Paths are extracted from include_dirs, libs, and sources. Variables are
resolved using chip_root, efr32_sdk_root, wifi_sdk_root (from sdk_paths.gni or
arguments), and matter_support_root. Paths using wifi_sdk_root are validated when
wifi_sdk_root is set. For paths containing silabs_family, silabs_board, or
silabs_mcu (efr32) or silabs_board (SiWx917), validation is run for each known
board combination.

Usage:
  From repo root:
    python3 scripts/setup/silabs/validate_efr32_sdk_paths.py
  With explicit roots:
    python3 scripts/setup/silabs/validate_efr32_sdk_paths.py \\
      --chip-root /path/to/repo \\
      --efr32-sdk-root /path/to/sdk \\
      [--wifi-sdk-root /path/to/wifi-sdk]
  SiWx917_sdk.gni is validated by default when --also-siwx917 is set (default);
  wifi_sdk_root is required for SiWx917 path validation.
"""

import argparse
import os
import re
import sys
from pathlib import Path


# File extensions that denote files; otherwise path is treated as directory.
LIB_EXT = ".a"
SOURCE_EXTENSIONS = (".c", ".cpp", ".h", ".S", ".hpp")


def find_repo_root(script_dir: Path) -> Path:
    """Locate repo root (directory containing third_party/silabs/efr32_sdk.gni)."""
    candidate = script_dir
    for _ in range(10):
        if (candidate / "third_party" / "silabs" / "efr32_sdk.gni").exists():
            return candidate
        parent = candidate.parent
        if parent == candidate:
            break
        candidate = parent
    return script_dir  # fallback


def load_sdk_paths(gni_path: Path) -> tuple[str | None, str | None]:
    """Parse sdk_paths.gni for _efr32_sdk_root_from_setup and _wifi_sdk_root_from_setup."""
    efr32_root = None
    wifi_root = None
    if not gni_path.exists():
        return efr32_root, wifi_root
    text = gni_path.read_text()
    for name, var in (
        ("_efr32_sdk_root_from_setup", "efr32_root"),
        ("_wifi_sdk_root_from_setup", "wifi_root"),
    ):
        m = re.search(rf'{re.escape(name)}\s*=\s*"([^"]+)"', text)
        if m:
            if var == "efr32_root":
                efr32_root = m.group(1).strip()
            else:
                wifi_root = m.group(1).strip()
    return efr32_root, wifi_root


def extract_path_expressions(content: str) -> list[tuple[str, str]]:
    """
    Extract (raw_expression, context) from efr32_sdk.gni.
    context is one of: include_dir, lib, source (used to decide file vs dir).
    """
    results = []
    lines = content.split("\n")
    context = "source"
    for line in lines:
        if "include_dirs" in line or "_include_dirs" in line:
            context = "include_dir"
        elif "libs +=" in line or "libs =" in line:
            context = "lib"
        elif "sources" in line and ("sources +=" in line or "sources =" in line):
            context = "source"

        pattern = re.compile(r'"(\$\{[^}]+\}[^"]*)"')
        for m in pattern.finditer(line):
            raw = m.group(1)
            raw = raw.split("//")[0].strip().rstrip(",").strip()
            if raw.endswith('"'):
                raw = raw[:-1]
            if "${" in raw and ("/" in raw or raw.endswith("}")):
                if ":" in raw:
                    continue
                if raw.strip().endswith(".gni"):
                    continue
                results.append((raw, context))
    return results


def resolve_path(
    expr: str,
    vars_dict: dict[str, str],
) -> str | None:
    """Substitute variables in expr. Returns None if unresolved vars remain."""
    out = expr
    max_iter = 20
    while "${" in out and max_iter > 0:
        max_iter -= 1
        m = re.search(r"\$\{([^}]+)\}", out)
        if not m:
            break
        key = m.group(1)
        if key not in vars_dict:
            return None
        out = out.replace(m.group(0), vars_dict[key], 1)
    if "${" in out:
        return None
    return out.replace("//", "/")


def discover_board_combinations(matter_support_root: Path) -> list[tuple[str, str, str]]:
    """List (silabs_family, silabs_board, silabs_mcu) from matter_support/board-support/efr32."""
    combos = []
    efr32 = matter_support_root / "board-support" / "efr32"
    if not efr32.is_dir():
        return combos
    # MCU defaults per family (used when path does not depend on silabs_mcu)
    mcu_defaults = {
        "efr32mg24": "EFR32MG24B310F1536IM48",
        "efr32mg26": "EFR32MG26B222F1536IM48",
        "mgm24": "MGM240PB32VNA",
    }
    for family_dir in efr32.iterdir():
        if not family_dir.is_dir():
            continue
        family = family_dir.name
        mcu = mcu_defaults.get(family, "")
        for board_dir in family_dir.iterdir():
            if board_dir.is_dir():
                combos.append((family, board_dir.name, mcu))
    return combos


def discover_siwx917_boards(matter_support_root: Path) -> list[str]:
    """List silabs_board names from matter_support/board-support/si91x/siwx917."""
    boards = []
    siwx917 = matter_support_root / "board-support" / "si91x" / "siwx917"
    if not siwx917.is_dir():
        return boards
    for board_dir in siwx917.iterdir():
        if board_dir.is_dir():
            boards.append(board_dir.name)
    return boards


def is_file_path(path_str: str, context: str) -> bool:
    if context == "include_dir":
        return False
    if context == "lib":
        return True
    if context == "source":
        return path_str.endswith(LIB_EXT) or any(
            path_str.endswith(ext) for ext in SOURCE_EXTENSIONS
        )
    return path_str.endswith(LIB_EXT) or any(
        path_str.endswith(ext) for ext in SOURCE_EXTENSIONS
    )


def validate_path(
    resolved: str,
    context: str,
    base_path: Path,
) -> tuple[bool, str]:
    """
    Check if path exists. Return (exists, message).
    When resolved is not absolute, it is joined with base_path.
    """
    p = Path(resolved)
    if not p.is_absolute():
        p = base_path / p
    expect_file = is_file_path(resolved, context)
    if p.exists():
        if expect_file and p.is_dir():
            return False, f"expected file, found directory: {p}"
        if not expect_file and p.is_file():
            return False, f"expected directory, found file: {p}"
        return True, ""
    return False, f"missing: {p}"


def run_gni_validation(
    content: str,
    base_vars: dict[str, str],
    board_combos: list,
    board_var_substrings: list[str],
    get_board_vars,
    chip_root: Path,
    skip_slc_gen: bool,
    skip_conditional: bool,
) -> tuple[list[tuple[str, str, str]], int, int, int]:
    """
    Validate path expressions from a GNI file. Return (missing, checked, unresolved, conditional_skipped).
    get_board_vars(combo) must return a dict of variable names to values for the given board combo.
    """
    expressions = extract_path_expressions(content)
    missing: list[tuple[str, str, str]] = []
    conditional_skipped = 0
    unresolved = 0
    checked = 0
    seen: set[tuple[str, str]] = set()

    for raw_expr, context in expressions:
        if (raw_expr, context) in seen:
            continue
        seen.add((raw_expr, context))

        has_board_var = any(s in raw_expr for s in board_var_substrings)
        if skip_slc_gen and "${slc_gen_path}" in raw_expr and "slc_gen" in raw_expr:
            conditional_skipped += 1
            continue

        if has_board_var:
            if skip_conditional:
                conditional_skipped += 1
                continue
            any_ok = False
            resolved_cond = None
            for combo in board_combos:
                vars_with_board = {**base_vars, **get_board_vars(combo)}
                resolved_cond = resolve_path(raw_expr, vars_with_board)
                if resolved_cond is None:
                    unresolved += 1
                    break
                ok, _ = validate_path(resolved_cond, context, chip_root)
                checked += 1
                if ok:
                    any_ok = True
                    break
            if not any_ok and resolved_cond is not None:
                missing.append((raw_expr, context, "(missing for all board combinations)"))
            continue

        resolved = resolve_path(raw_expr, base_vars)
        if resolved is None:
            unresolved += 1
            continue
        checked += 1
        ok, msg = validate_path(resolved, context, chip_root)
        if not ok:
            missing.append((raw_expr, context, msg))

    return (missing, checked, unresolved, conditional_skipped)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate paths referenced in efr32_sdk.gni"
    )
    parser.add_argument(
        "--chip-root",
        type=Path,
        default=None,
        help="Repo root (default: auto-detect from script location)",
    )
    parser.add_argument(
        "--efr32-sdk-root",
        type=Path,
        default=None,
        help="Simplicity SDK root (default: from scripts/setup/silabs/sdk_paths.gni)",
    )
    parser.add_argument(
        "--wifi-sdk-root",
        type=Path,
        default=None,
        help="WiseConnect SDK root (default: from sdk_paths.gni)",
    )
    parser.add_argument(
        "--gni",
        type=Path,
        default=None,
        help="Path to efr32_sdk.gni (default: chip_root/third_party/silabs/efr32_sdk.gni)",
    )
    parser.add_argument(
        "--skip-conditional",
        action="store_true",
        help="Skip paths that depend on silabs_family/silabs_board/silabs_mcu",
    )
    parser.add_argument(
        "--skip-slc-gen",
        action="store_true",
        help="Do not report missing slc_gen_path (created at build time when slc_generate/slc_reuse_files is set)",
    )
    parser.add_argument(
        "--no-siwx917",
        action="store_true",
        help="Skip validation of third_party/silabs/SiWx917_sdk.gni (and wifi_sdk_root paths in it)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default="path_not_found",
        metavar="FILE",
        help="Write list of missing paths from efr32_sdk.gni to FILE",
    )
    parser.add_argument(
        "--output-siwx917",
        type=Path,
        default="path_not_found_siwx917",
        metavar="FILE",
        help="Write list of missing paths from SiWx917_sdk.gni to FILE (separate from efr32 output)",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    chip_root = args.chip_root or find_repo_root(script_dir)
    chip_root = chip_root.resolve()

    sdk_paths_gni = chip_root / "scripts" / "setup" / "silabs" / "sdk_paths.gni"
    efr32_from_gni, wifi_from_gni = load_sdk_paths(sdk_paths_gni)
    efr32_sdk_root = args.efr32_sdk_root or (Path(efr32_from_gni) if efr32_from_gni else None)
    wifi_sdk_root = args.wifi_sdk_root or (Path(wifi_from_gni) if wifi_from_gni else None)

    if efr32_sdk_root is not None:
        efr32_sdk_root = Path(efr32_sdk_root).resolve()
    if wifi_sdk_root is not None:
        wifi_sdk_root = Path(wifi_sdk_root).resolve()

    matter_support_root = chip_root / "third_party" / "silabs" / "matter_support"
    sl_ot_platform_abstraction = (
        f"{efr32_sdk_root}/openthread/platform-abstraction" if efr32_sdk_root else ""
    )
    sl_ot_efr32_root = f"{sl_ot_platform_abstraction}/efr32" if sl_ot_platform_abstraction else ""

    efr32_base_vars = {
        "chip_root": str(chip_root),
        "efr32_sdk_root": str(efr32_sdk_root) if efr32_sdk_root else "",
        "wifi_sdk_root": str(wifi_sdk_root) if wifi_sdk_root else "",
        "matter_support_root": str(matter_support_root),
        "examples_plat_dir": str(chip_root / "examples" / "platform" / "silabs" / "efr32"),
        "silabs_plat_efr32_wifi_dir": str(chip_root / "src" / "platform" / "silabs" / "efr32" / "wifi"),
        "silabs_common_plat_dir": str(chip_root / "examples" / "platform" / "silabs"),
        "silabs_platform_dir": str(chip_root / "src" / "platform" / "silabs"),
        "sl_ot_platform_abstraction": sl_ot_platform_abstraction,
        "sl_ot_efr32_root": sl_ot_efr32_root,
        "segger_rtt_root": str(chip_root),
    }

    efr32_board_combos = discover_board_combinations(matter_support_root)
    if not efr32_board_combos:
        efr32_board_combos = [
            ("efr32mg24", "BRD4187A", "EFR32MG24B310F1536IM48"),
            ("mgm24", "BRD4316A", "MGM240PB32VNA"),
            ("efr32mg26", "BRD4117A", "EFR32MG26B222F1536IM48"),
        ]

    def get_efr32_board_vars(combo: tuple[str, str, str]) -> dict[str, str]:
        family, board, mcu = combo
        return {
            "silabs_family": family,
            "silabs_board": board,
            "silabs_mcu": mcu,
            "silabs_gen_folder": str(matter_support_root / "board-support" / "efr32" / family / board),
            "sl_pre_gen_path": str(matter_support_root / "board-support" / "efr32" / family / board),
            "slc_gen_path": str(chip_root / "third_party" / "silabs" / "slc_gen" / board),
        }

    efr32_board_var_substrings = [
        "${silabs_family}",
        "${silabs_board}",
        "${silabs_mcu}",
        "${silabs_gen_folder}",
        "${sl_pre_gen_path}",
        "${slc_gen_path}",
    ]

    all_missing: list[tuple[str, str, str, str]] = []  # (gni_name, raw, context, msg)
    total_checked = 0
    total_unresolved = 0
    total_conditional_skipped = 0

    gni_path = args.gni or (chip_root / "third_party" / "silabs" / "efr32_sdk.gni")
    if not gni_path.exists():
        print(f"Error: {gni_path} not found", file=sys.stderr)
        return 1

    content = gni_path.read_text()
    missing, checked, unresolved, conditional_skipped = run_gni_validation(
        content,
        efr32_base_vars,
        efr32_board_combos,
        efr32_board_var_substrings,
        get_efr32_board_vars,
        chip_root,
        args.skip_slc_gen,
        args.skip_conditional,
    )
    for raw, ctx, msg in missing:
        all_missing.append(("efr32_sdk.gni", raw, ctx, msg))
    total_checked += checked
    total_unresolved += unresolved
    total_conditional_skipped += conditional_skipped

    if not args.no_siwx917 and wifi_sdk_root:
        siwx917_gni = chip_root / "third_party" / "silabs" / "SiWx917_sdk.gni"
        if siwx917_gni.exists():
            # SiWx917_sdk.gni sets _mbedtls_root to openthread mbedtls (both psa and tinycrypt).
            _mbedtls_root = (
                f"{efr32_sdk_root}/openthread_stack/util/third_party/ot-br-posix/third_party/openthread/repo/third_party/mbedtls/repo"
                if efr32_sdk_root else ""
            )
            sl_si91x_psa_crypto_path = f"{wifi_sdk_root}/components/device/silabs/si91x/wireless/crypto"
            siwx917_base_vars = {
                "chip_root": str(chip_root),
                "efr32_sdk_root": str(efr32_sdk_root) if efr32_sdk_root else "",
                "wifi_sdk_root": str(wifi_sdk_root),
                "matter_support_root": str(matter_support_root),
                "examples_plat_dir": str(chip_root / "examples" / "platform" / "silabs" / "SiWx917"),
                "_mbedtls_root": _mbedtls_root,
                "sl_si91x_psa_crypto_path": sl_si91x_psa_crypto_path,
            }
            siwx917_boards = discover_siwx917_boards(matter_support_root)
            if not siwx917_boards:
                siwx917_boards = ["BRD4342A", "BRD2708A", "BRD4338A", "BRD2911A", "BRD2605A", "BRD4343A"]

            def get_siwx917_board_vars(combo: tuple[str, ...]) -> dict[str, str]:
                (board,) = combo
                return {"silabs_board": board}

            siwx917_content = siwx917_gni.read_text()
            missing_siwx, checked_siwx, unresolved_siwx, cond_siwx = run_gni_validation(
                siwx917_content,
                siwx917_base_vars,
                [(b,) for b in siwx917_boards],
                ["${silabs_board}"],
                get_siwx917_board_vars,
                chip_root,
                args.skip_slc_gen,
                args.skip_conditional,
            )
            for raw, ctx, msg in missing_siwx:
                all_missing.append(("SiWx917_sdk.gni", raw, ctx, msg))
            total_checked += checked_siwx
            total_unresolved += unresolved_siwx
            total_conditional_skipped += cond_siwx
        else:
            print("Note: SiWx917_sdk.gni not found, skipping SiWx917 validation.", file=sys.stderr)
    elif not args.no_siwx917 and not wifi_sdk_root:
        print("Note: wifi_sdk_root not set; skipping SiWx917_sdk.gni validation (paths use wifi_sdk_root).", file=sys.stderr)

    if total_unresolved:
        print(f"Unresolved expressions (missing variable or unknown var): {total_unresolved}")
    if total_conditional_skipped:
        print(f"Skipped conditional paths: {total_conditional_skipped}")
    print(f"Checked: {total_checked}")

    if all_missing:
        missing_efr32 = [(g, raw, ctx, msg) for g, raw, ctx, msg in all_missing if g == "efr32_sdk.gni"]
        missing_siwx917 = [(g, raw, ctx, msg) for g, raw, ctx, msg in all_missing if g == "SiWx917_sdk.gni"]

        print("\nMissing or invalid paths:")
        for gni_name, raw, ctx, msg in all_missing:
            print(f"  [{gni_name}] [{ctx}] {raw}")
            print(f"    -> {msg}")

        if missing_efr32 and args.output is not None:
            lines_efr32 = []
            lines_efr32.append("Missing or invalid paths from efr32_sdk.gni")
            lines_efr32.append("=" * 60)
            for _, raw, ctx, msg in missing_efr32:
                lines_efr32.append(f"[{ctx}] {raw}")
                lines_efr32.append(f"  -> {msg}")
                lines_efr32.append("")
            out_efr32 = Path(args.output)
            out_efr32.write_text("\n".join(lines_efr32), encoding="utf-8")
            print(f"\nefr32_sdk.gni report written to {out_efr32.resolve()}")

        if missing_siwx917 and args.output_siwx917 is not None:
            lines_siwx = []
            lines_siwx.append("Missing or invalid paths from SiWx917_sdk.gni")
            lines_siwx.append("=" * 60)
            for _, raw, ctx, msg in missing_siwx917:
                lines_siwx.append(f"[{ctx}] {raw}")
                lines_siwx.append(f"  -> {msg}")
                lines_siwx.append("")
            out_siwx = Path(args.output_siwx917)
            out_siwx.write_text("\n".join(lines_siwx), encoding="utf-8")
            print(f"SiWx917_sdk.gni report written to {out_siwx.resolve()}")

        return 1
    print("All resolved paths exist.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
