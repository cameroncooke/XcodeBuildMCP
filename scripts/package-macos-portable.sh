#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR_DEFAULT="$PROJECT_ROOT/dist/portable"

ARCH=""
UNIVERSAL=false
ARM64_ROOT=""
X64_ROOT=""
DIST_DIR="$DIST_DIR_DEFAULT"
VERSION=""

usage() {
  cat <<'EOF'
Usage:
  scripts/package-macos-portable.sh [--arch arm64|x64] [--dist-dir <path>] [--version <semver>]
  scripts/package-macos-portable.sh --universal --arm64-root <path> --x64-root <path> [--dist-dir <path>] [--version <semver>]

Notes:
  - Arch mode packages a bundled Node runtime plus compiled JS entrypoint.
  - Universal mode expects prebuilt arm64/x64 roots and combines Node runtimes with lipo.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --arch)
      ARCH="${2:-}"
      shift 2
      ;;
    --universal)
      UNIVERSAL=true
      shift
      ;;
    --arm64-root)
      ARM64_ROOT="${2:-}"
      shift 2
      ;;
    --x64-root)
      X64_ROOT="${2:-}"
      shift 2
      ;;
    --dist-dir)
      DIST_DIR="${2:-}"
      shift 2
      ;;
    --version)
      VERSION="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  VERSION="$(node -p "require('$PROJECT_ROOT/package.json').version")"
fi

mkdir -p "$DIST_DIR"

verify_axe_assets() {
  local bundled_dir="$PROJECT_ROOT/bundled"
  local axe_bin="$bundled_dir/axe"
  local frameworks_dir="$bundled_dir/Frameworks"

  if [[ ! -x "$axe_bin" ]]; then
    echo "Missing executable AXe binary at $axe_bin"
    exit 1
  fi
  if [[ ! -d "$frameworks_dir" ]]; then
    echo "Missing AXe frameworks at $frameworks_dir"
    exit 1
  fi
  if [[ "$(find "$frameworks_dir" -name "*.framework" -type d | wc -l | tr -d ' ')" -eq 0 ]]; then
    echo "No frameworks found under $frameworks_dir"
    exit 1
  fi

  if [[ "$(uname -s)" == "Darwin" ]]; then
    codesign --verify --deep --strict "$axe_bin"
    while IFS= read -r framework_path; do
      framework_name="$(basename "$framework_path" .framework)"
      framework_binary="$framework_path/Versions/A/$framework_name"
      if [[ ! -f "$framework_binary" ]]; then
        framework_binary="$framework_path/Versions/Current/$framework_name"
      fi
      if [[ ! -f "$framework_binary" ]]; then
        echo "Missing framework binary at $framework_binary"
        exit 1
      fi
      codesign --verify --deep --strict "$framework_binary"
    done < <(find "$frameworks_dir" -name "*.framework" -type d)
    spctl_log="$(mktemp)"
    if ! spctl --assess --type execute "$axe_bin" 2>"$spctl_log"; then
      if grep -q "does not seem to be an app" "$spctl_log"; then
        echo "Gatekeeper execute assessment is inconclusive for CLI binaries; continuing"
      else
        cat "$spctl_log"
        rm "$spctl_log"
        exit 1
      fi
    fi
    rm "$spctl_log"
  fi
}

install_node_runtime_for_arch() {
  local target_arch="$1"
  local output_path="$2"
  local node_version="${NODE_RUNTIME_VERSION:-$(node -p "process.versions.node")}"
  local node_arch=""

  case "$target_arch" in
    arm64)
      node_arch="arm64"
      ;;
    x64)
      node_arch="x64"
      ;;
    *)
      echo "Unsupported target arch for Node runtime: $target_arch"
      exit 1
      ;;
  esac

  local archive_name="node-v${node_version}-darwin-${node_arch}.tar.gz"
  local download_url="https://nodejs.org/dist/v${node_version}/${archive_name}"
  local temp_dir
  temp_dir="$(mktemp -d)"

  curl -fLsS "$download_url" -o "$temp_dir/$archive_name"
  tar -xzf "$temp_dir/$archive_name" -C "$temp_dir"

  local extracted_node="$temp_dir/node-v${node_version}-darwin-${node_arch}/bin/node"
  if [[ ! -x "$extracted_node" ]]; then
    echo "Failed to locate extracted Node runtime at $extracted_node"
    rm -r "$temp_dir"
    exit 1
  fi

  cp "$extracted_node" "$output_path"
  chmod +x "$output_path"
  rm -r "$temp_dir"
}

write_wrapper_scripts() {
  local root="$1"
  local bin_dir="$root/bin"
  local libexec_dir="$root/libexec"

  cat > "$libexec_dir/xcodebuildmcp" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$ROOT/node-runtime" "$ROOT/build/cli.js" "$@"
EOF

  cat > "$bin_dir/xcodebuildmcp" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SOURCE="${BASH_SOURCE[0]}"
while [[ -L "$SOURCE" ]]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
RESOURCE_ROOT="$(cd "$SCRIPT_DIR/../libexec" && pwd)"
export XCODEBUILDMCP_RESOURCE_ROOT="$RESOURCE_ROOT"
export DYLD_FRAMEWORK_PATH="$RESOURCE_ROOT/bundled/Frameworks${DYLD_FRAMEWORK_PATH:+:$DYLD_FRAMEWORK_PATH}"
exec "$RESOURCE_ROOT/xcodebuildmcp" "$@"
EOF

  cat > "$bin_dir/xcodebuildmcp-doctor" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SOURCE="${BASH_SOURCE[0]}"
while [[ -L "$SOURCE" ]]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
RESOURCE_ROOT="$(cd "$SCRIPT_DIR/../libexec" && pwd)"
export XCODEBUILDMCP_RESOURCE_ROOT="$RESOURCE_ROOT"
export DYLD_FRAMEWORK_PATH="$RESOURCE_ROOT/bundled/Frameworks${DYLD_FRAMEWORK_PATH:+:$DYLD_FRAMEWORK_PATH}"
exec "$RESOURCE_ROOT/xcodebuildmcp" doctor "$@"
EOF

  chmod +x "$libexec_dir/xcodebuildmcp" "$bin_dir/xcodebuildmcp" "$bin_dir/xcodebuildmcp-doctor"
}

create_tarball_and_checksum() {
  local portable_root="$1"
  local artifact_name="$2"
  local tarball_path="$DIST_DIR/$artifact_name.tar.gz"
  local checksum_path="$tarball_path.sha256"

  (
    cd "$(dirname "$portable_root")"
    tar -czf "$tarball_path" "$(basename "$portable_root")"
  )
  shasum -a 256 "$tarball_path" > "$checksum_path"
  echo "Created artifact: $tarball_path"
  echo "Created checksum: $checksum_path"
}

if [[ "$UNIVERSAL" == "true" ]]; then
  if [[ -z "$ARM64_ROOT" || -z "$X64_ROOT" ]]; then
    echo "--universal requires --arm64-root and --x64-root"
    exit 1
  fi
  if [[ ! -x "$ARM64_ROOT/libexec/node-runtime" || ! -x "$X64_ROOT/libexec/node-runtime" ]]; then
    echo "Missing per-arch node runtimes under provided roots"
    exit 1
  fi

  UNIVERSAL_ROOT="$DIST_DIR/xcodebuildmcp-$VERSION-darwin-universal"
  if [[ -d "$UNIVERSAL_ROOT" ]]; then
    rm -r "$UNIVERSAL_ROOT"
  fi
  mkdir -p "$UNIVERSAL_ROOT/bin" "$UNIVERSAL_ROOT/libexec"
  cp -R "$ARM64_ROOT/libexec/build" "$UNIVERSAL_ROOT/libexec/"
  cp -R "$ARM64_ROOT/libexec/manifests" "$UNIVERSAL_ROOT/libexec/"
  cp -R "$ARM64_ROOT/libexec/bundled" "$UNIVERSAL_ROOT/libexec/"
  cp -R "$ARM64_ROOT/libexec/node_modules" "$UNIVERSAL_ROOT/libexec/"
  cp "$ARM64_ROOT/libexec/package.json" "$UNIVERSAL_ROOT/libexec/package.json"

  lipo -create \
    "$ARM64_ROOT/libexec/node-runtime" \
    "$X64_ROOT/libexec/node-runtime" \
    -output "$UNIVERSAL_ROOT/libexec/node-runtime"
  chmod +x "$UNIVERSAL_ROOT/libexec/node-runtime"

  write_wrapper_scripts "$UNIVERSAL_ROOT"
  create_tarball_and_checksum "$UNIVERSAL_ROOT" "xcodebuildmcp-$VERSION-darwin-universal"
  exit 0
fi

if [[ -z "$ARCH" ]]; then
  machine_arch="$(uname -m)"
  if [[ "$machine_arch" == "arm64" ]]; then
    ARCH="arm64"
  elif [[ "$machine_arch" == "x86_64" ]]; then
    ARCH="x64"
  else
    echo "Unsupported machine architecture: $machine_arch"
    exit 1
  fi
fi

if [[ "$ARCH" != "arm64" && "$ARCH" != "x64" ]]; then
  echo "Unsupported arch: $ARCH (expected arm64 or x64)"
  exit 1
fi

cd "$PROJECT_ROOT"
npm run build:tsup
AXE_FORCE_REMOTE=1 npm run bundle:axe
verify_axe_assets

PORTABLE_ROOT="$DIST_DIR/xcodebuildmcp-$VERSION-darwin-$ARCH"
if [[ -d "$PORTABLE_ROOT" ]]; then
  rm -r "$PORTABLE_ROOT"
fi
mkdir -p "$PORTABLE_ROOT/bin" "$PORTABLE_ROOT/libexec"

install_node_runtime_for_arch "$ARCH" "$PORTABLE_ROOT/libexec/node-runtime"

cp -R "$PROJECT_ROOT/build" "$PORTABLE_ROOT/libexec/"
cp -R "$PROJECT_ROOT/manifests" "$PORTABLE_ROOT/libexec/"
cp -R "$PROJECT_ROOT/bundled" "$PORTABLE_ROOT/libexec/"
cp "$PROJECT_ROOT/package.json" "$PORTABLE_ROOT/libexec/package.json"
cp "$PROJECT_ROOT/package-lock.json" "$PORTABLE_ROOT/libexec/package-lock.json"
npm ci --omit=dev --ignore-scripts --prefix "$PORTABLE_ROOT/libexec"

write_wrapper_scripts "$PORTABLE_ROOT"
create_tarball_and_checksum "$PORTABLE_ROOT" "xcodebuildmcp-$VERSION-darwin-$ARCH"
