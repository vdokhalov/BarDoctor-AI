/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { createBrotliDecompress } = require("node:zlib");
const { extract } = require("tar-fs");
const ServerlessChromium = require("@sparticuz/chromium").default;

ServerlessChromium.setGraphicsMode = false;

function isUsableBrowser(executable) {
  try {
    const stat = fs.statSync(executable);
    return stat.isFile() && stat.size > 1024 * 1024;
  } catch {
    return false;
  }
}

async function inflateTarArchive(archive, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  await pipeline(
    fs.createReadStream(archive),
    createBrotliDecompress(),
    extract(outputDir, { chown: false }),
  );
}

async function inflatePackagedChromium() {
  const runtimeDir = path.join(os.tmpdir(), "bardoctor-chromium-149");
  const executable = path.join(runtimeDir, "chromium");
  const swiftshader = path.join(runtimeDir, "libGLESv2.so");
  if (fs.existsSync(executable) && fs.existsSync(swiftshader)) return executable;

  fs.mkdirSync(runtimeDir, { recursive: true });
  const packageEntry = require.resolve("@sparticuz/chromium");
  const packageBin = path.resolve(path.dirname(packageEntry), "../bin");
  const archive = path.join(packageBin, "chromium.br");
  const partial = `${executable}.partial-${process.pid}`;
  try {
    if (!fs.existsSync(executable)) {
      await pipeline(
        fs.createReadStream(archive),
        createBrotliDecompress(),
        fs.createWriteStream(partial, { mode: 0o700 }),
      );
      fs.renameSync(partial, executable);
      fs.chmodSync(executable, 0o700);
    }
    await inflateTarArchive(path.join(packageBin, "swiftshader.tar.br"), runtimeDir);
  } finally {
    if (fs.existsSync(partial)) fs.unlinkSync(partial);
  }
  return executable;
}

async function resolveBrowserExecutable(playwrightExecutable) {
  const explicit = process.env.BD_QA_BROWSER;
  if (explicit) return explicit;
  if (playwrightExecutable && isUsableBrowser(playwrightExecutable)) return playwrightExecutable;

  return inflatePackagedChromium();
}

module.exports = {
  chromiumArgs: ServerlessChromium.args.filter((argument) => argument !== "--single-process"),
  resolveBrowserExecutable,
};
