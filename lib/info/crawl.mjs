// crawl-flat-sync.js (ESM)
import fs from "node:fs";
import path from "node:path";

/**
 * Recursively crawls a directory and returns a flat JSON mapping (synchronously).
 *
 * @param {string} rootDir - The directory to crawl (absolute or relative).
 * @param {object} [opts]
 * @param {"basename"|"relative"} [opts.nameMode="basename"]
 *   - "basename": name is just the last segment (default)
 *   - "relative": name is the POSIX relative path from root (like your sample)
 * @param {string[]} [opts.ignore=[]] - Substrings to skip if the *key* contains any of them.
 * @param {boolean} [opts.followSymlinks=false] - If true, follows symlinks to dirs.
 * @returns {object} Flat object like { "_": "flat", "/root/path": { ... }, ... }
 */
export function crawlFlat(rootDir, opts = {}) {
    const {
              nameMode = "basename",
              ignore = [],
              followSymlinks = false,
          } = opts;

    const absRoot = rootDir;
    const out = { _: "flat" };

    const toPosix = (p) => p.split(path.sep).join(path.posix.sep);

    const relKey = (absolutePath) => {
        const rel = toPosix(path.relative(absRoot, absolutePath));
        const rootName = path.basename(absRoot);
        return rel ? `/${rootName}/${rel}` : `/${rootName}`;
    };

    const pickName = (absolutePath) => {
        if (nameMode === "relative") {
            const rel = toPosix(path.relative(absRoot, absolutePath));
            return rel || path.basename(absRoot);
        }
        return path.basename(absolutePath);
    };

    const shouldIgnore = (keyPath) => ignore.some((needle) => keyPath.includes(needle));

    function visit(absolutePath) {
        let lstat;
        try {
            lstat = fs.lstatSync(absolutePath);
        } catch {
            // Unreadable path (permissions, etc.) — skip it gracefully
            return;
        }

        // If it's a symlink and we don't follow them, record as file-like and stop.
        if (lstat.isSymbolicLink() && !followSymlinks) {
            const key = relKey(absolutePath);
            if (!shouldIgnore(key)) {
                out[key] = {
                    name: pickName(absolutePath),
                    path: key,
                    type: "file", // change to "symlink" if you want to distinguish
                };
            }
            return;
        }

        const stat = lstat.isSymbolicLink() ? safeStatSync(absolutePath) ?? lstat : lstat;
        const key = relKey(absolutePath);

        if (stat.isDirectory()) {
            if (shouldIgnore(key)) return;

            out[key] = {
                name: pickName(absolutePath),
                path: key,
                type: "dir",
            };

            let entries = [];
            try {
                entries = fs.readdirSync(absolutePath, { withFileTypes: true });
            } catch {
                // Unreadable directory — already recorded the dir; skip children
                return;
            }

            for (const dirent of entries) {
                const childAbs = path.join(absolutePath, dirent.name);
                const childKey = relKey(childAbs);
                if (shouldIgnore(childKey)) continue;
                visit(childAbs);
            }
        } else if (stat.isFile()) {
            if (shouldIgnore(key)) return;

            out[key] = {
                name: pickName(absolutePath),
                path: key,
                type: "file",
            };
        }
        // sockets/FIFOs/etc. are ignored; add branches if needed.
    }

    function safeStatSync(p) {
        try {
            return fs.statSync(p);
        } catch {
            return null;
        }
    }

    visit(absRoot);
    return out;
}

/* ---------- Example usage ----------
import { crawlFlat } from "./crawl-flat-sync.js";

const flat = crawlFlat("./easypay-application-dashboard", {
  nameMode: "relative",      // to match your sample's "name" field
  ignore: ["node_modules", ".git"],
  followSymlinks: false,
});

console.log(JSON.stringify(flat, null, 2));
------------------------------------ */
