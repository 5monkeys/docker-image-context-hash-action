const { test, beforeEach, describe } = require("@jest/globals");

beforeEach(() => {
  process.stdout.write = jest.fn();
});

describe("run", () => {
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
    await run();
    // See https://github.com/actions/toolkit/issues/777 regarding the newline..
    expect(process.stdout.write).toHaveBeenLastCalledWith(
      `::set-output name=hash::6c867c528d4bf0844d5176f78f6abfee0adfff2b\n`
    );
    // Expect a second run to produce the same output
    await run();
    expect(process.stdout.write).toHaveBeenLastCalledWith(
      `::set-output name=hash::6c867c528d4bf0844d5176f78f6abfee0adfff2b\n`
    );
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
