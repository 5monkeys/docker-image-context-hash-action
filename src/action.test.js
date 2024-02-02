const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const os = require("os");
const uuid = require("uuid");
const { test, beforeEach, describe } = require("@jest/globals");

jest.mock("uuid");

const UUID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const DELIMITER = `ghadelimiter_${UUID}`;
const OUTPUT_DIR = path.join(__dirname, `test`);
const GITHUB_OUTPUT = path.join(OUTPUT_DIR, `OUTPUT`);

describe("run", () => {
  beforeAll(() => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
      fs.appendFileSync(GITHUB_OUTPUT, "", { encoding: `utf8` });
    }
  });

  beforeEach(() => {
    jest.spyOn(process, "exitCode", "set").mockReturnValue(0);
    process.env["GITHUB_OUTPUT"] = GITHUB_OUTPUT;
    process.stdout.write = jest.fn();

    jest.spyOn(uuid, "v4").mockImplementation(() => UUID);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.truncateSync(GITHUB_OUTPUT);
  });

  afterAll(() => {
    fs.rmSync(path.join(__dirname, `test`), { recursive: true });
  });

  test("can output hash", async () => {
    const { run } = require("./action");
    process.env["INPUT_BUILD_CONTEXT"] = "./test";
    process.env["INPUT_EXTRA_TREE_OBJECTS"] =
      "test/.dockerignore\ntest/Dockerfile";
    // Expected hash generated from command below
    // git ls-tree -r --format='%(objectname) %(path)' --full-tree HEAD \
    //   test/a/b \
    //   test/context/file \
    //   test/filename \
    //   test/.dockerignore \
    //   test/Dockerfile | \
    // git hash-object --stdin
    const expectedOutput = serializeOutput(
      "hash",
      "6c867c528d4bf0844d5176f78f6abfee0adfff2b"
    );

    await run();
    expect(fs.readFileSync(GITHUB_OUTPUT, "utf8")).toEqual(expectedOutput);

    // Expect a second run to produce the same output
    fs.truncateSync(GITHUB_OUTPUT);
    await run();
    expect(fs.readFileSync(GITHUB_OUTPUT, "utf8")).toEqual(expectedOutput);
  }, 30000);

  test("errors when given an invalid build context", async () => {
    const setFailedMock = jest.spyOn(core, "setFailed");
    const { run } = require("./action");
    process.env["INPUT_BUILD_CONTEXT"] = "./invalid";
    await run();
    expect(process.stdout.write).toHaveBeenLastCalledWith(
      expect.stringMatching(
        `::error::The process '.*/docker' failed with exit code 1[^0-9]`
      )
    );
    expect(setFailedMock).toHaveBeenCalled();
  });
});

function serializeOutput(key, value) {
  return `${key}<<${DELIMITER}${os.EOL}${value}${os.EOL}${DELIMITER}${os.EOL}`;
}
