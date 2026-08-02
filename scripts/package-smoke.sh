#!/usr/bin/env bash
set -euo pipefail

package_dir="$(mktemp -d "${TMPDIR:-/tmp}/runcard-package-smoke.XXXXXX")"
trap 'rm -rf "$package_dir"' EXIT

tarball="$(npm pack --pack-destination "$package_dir" --silent)"
npm install --prefix "$package_dir/install" "$package_dir/$tarball" --ignore-scripts
"$package_dir/install/node_modules/.bin/runcard" --help >/dev/null

echo "Package smoke passed: installed $tarball and executed runcard --help"
