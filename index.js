const {
  existsSync,
  writeFileSync,
  mkdirSync,
  createWriteStream,
} = require("fs");
const https = require("https");

if (!existsSync("package.json")) {
  writeFileSync("package.json", JSON.stringify({ dependencies: {} }), null, 2);
}

function safeRequire(name) {
  try {
    return require(name);
  } catch (error) {
    console.log(`installing package ${name}`);
    console.log(execSync(`npm install ${name} --save-dev`).toString());
    return require(name);
  }
}

const packageLockJSON = require("./package-lock.json");
const { execSync } = require("child_process");

const tarballDirectory = "./tarballs";
const tarballs = [];

enumerateDependencies(packageLockJSON.packages);

function enumerateDependencies(dependencies) {
  for (const dependencyName in dependencies) {
    const dependency = dependencies[dependencyName];
    if (dependency.resolved) {
      tarballs.push({
        filename: `${dependencyName}-${dependency.version}.tgz`,
        url: dependency.resolved,
      });
    }
    if (dependency.dependencies) {
      enumerateDependencies(dependency.dependencies);
    }
  }
}

if (!existsSync(tarballDirectory)) {
  mkdirSync(tarballDirectory);
}

const start = async () => {
  for (const tarball of tarballs) {
    const splited = tarball.filename.split("/");
    const filename = splited.pop();
    const dir = tarballDirectory + "/" + splited.join("/");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const result = await download(
      tarball.url,
      tarballDirectory + "/" + tarball.filename,
    );
    console.log(`Done ${result}`);
  }
};

function download(url, dest, cb) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, function (response) {
      response.pipe(file);
      file.on("finish", function () {
        file.close(cb);
        resolve(dest);
      });
      file.on("error", function (err) {
        console.log(err);
        reject(err);
      });
    });
  });
}

start();
