const fs = require("fs");
const path = require("path");
const os = require("os");
const uuid = require("uuid");
const { test, beforeEach, describe } = require("@jest/globals");

jest.mock("uuid");

const UUID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const DELIMITER = `ghadelimiter_${UUID}`;

describe("run", () => {
  beforeAll(() => {
    const dirPath = path.join(__dirname, `test`);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
  });

  beforeEach(() => {
    process.env["GITHUB_OUTPUT"] = "";
    process.stdout.write = jest.fn();

    jest.spyOn(uuid, "v4").mockImplementation(() => UUID);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    const dirPath = path.join(__dirname, `test`);
    fs.rmdirSync(dirPath);
  });

  test("can output hash", async () => {
    const { run } = require("./action");
    process.env["INPUT_BUILD_CONTEXT"] = "./test";
    process.env["INPUT_EXTRA_TREE_OBJECTS"] =
      "test/.dockerignore\ntest/Dockerfile";
    createFileCommandFile("OUTPUT");
    // Expected hash generated from command below
    // git ls-tree -r --format='%(objectname) %(path)' --full-tree HEAD \
    //   test/a/b \
    //   test/context/file \
    //   test/filename \
    //   test/.dockerignore \
    //   test/Dockerfile | \
    // git hash-object --stdin
    await run();
    verifyFileCommand(
      "OUTPUT",
      serializeOutput("hash", "6c867c528d4bf0844d5176f78f6abfee0adfff2b")
    );
    createFileCommandFile("OUTPUT");
    // Expect a second run to produce the same output
    await run();
    verifyFileCommand(
      "OUTPUT",
      serializeOutput("hash", "6c867c528d4bf0844d5176f78f6abfee0adfff2b")
    );
    expect(1).toBe(1);
  }, 30000);

  test("errors when given an invalid build context", async () => {
    const { run } = require("./action");
    process.env["INPUT_BUILD_CONTEXT"] = "./invalid";
    await run();
    expect(process.stdout.write).toHaveBeenLastCalledWith(
      expect.stringMatching(
        `::error::The process '.*/docker' failed with exit code 1`
      )
    );
  });
});

function serializeOutput(key, value) {
  return `${key}<<${DELIMITER}${os.EOL}${value}${os.EOL}${DELIMITER}${os.EOL}`;
}

function createFileCommandFile(command) {
  const filePath = path.join(__dirname, `test/${command}`);
  process.env[`GITHUB_${command}`] = filePath;
  fs.appendFileSync(filePath, "", {
    encoding: "utf8",
  });
}

function verifyFileCommand(command, expectedContents) {
  const filePath = path.join(__dirname, `test/${command}`);
  const contents = fs.readFileSync(filePath, "utf8");
  try {
    expect(contents).toEqual(expectedContents);
  } finally {
    fs.unlinkSync(filePath);
  }
}
