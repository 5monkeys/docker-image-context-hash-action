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
    process.env["INPUT_EXTRA_VALUES"] = "test/.dockerignore\ntest/Dockerfile";
    // Expected hash generated from command below
    // {\
    //   git ls-tree -r --format='%(objectname)' HEAD \
    //     test/a/b \
    //     test/context/file \
    //     test/filename \
    //     test/.dockerignore \
    //     test/Dockerfile\
    //   ; \
    //   printf "test/a/b\ntest/context/file\ntest/filename\ntest/.dockerignore\ntest/Dockerfile" | \
    //     git hash-object --stdin\
    //   ;\
    // } | git hash-object --stdin
    await run();
    // See https://github.com/actions/toolkit/issues/777 regarding the newline..
    expect(process.stdout.write).toHaveBeenLastCalledWith(
      `::set-output name=hash::6d09883618bd309806be67847737b1a5a4aa1f40\n`
    );
    // Expect a second run to produce the same output
    await run();
    expect(process.stdout.write).toHaveBeenLastCalledWith(
      `::set-output name=hash::6d09883618bd309806be67847737b1a5a4aa1f40\n`
    );
  }, 30000);

  test("errors when extra tree objects doesn't match", async () => {
    const { run } = require("./action");
    process.env["INPUT_BUILD_CONTEXT"] = "./test";
    process.env["INPUT_EXTRA_TREE_OBJECTS"] = "non_matching_stuff";
    await run();
    expect(process.stdout.write).toHaveBeenLastCalledWith(
      `::error::Object paths did not match the intended amount of objects in the tree (3 != 4)\n`
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
