const core = require("@actions/core");
const exec = require("@actions/exec");
const path = require("node:path");

const dockerfile =
  "FROM alpine:latest\nCOPY . /image-context\nWORKDIR /image-context\nCMD find . -type f | sort";

async function run() {
  try {
    const build_context = core.getInput("build_context");
    const extra_tree_objects = core.getMultilineInput("extra_tree_objects");

    core.startGroup(`Parsed config values`);
    core.info(build_context);
    core.info(extra_tree_objects);
    core.endGroup();

    await core.group(`Build context image`, async () => {
      await exec.exec(
        "docker",
        ["build", "-f-", "-t", "hasher", build_context],
        {
          input: Buffer.from(dockerfile, "utf-8"),
          env: { DOCKER_SCAN_SUGGEST: "false" },
        }
      );
    });

    core.startGroup(`Collect image context`);
    const image_context = await exec
      .getExecOutput("docker", ["run", "--pull", "never", "--rm", "hasher"], {
        failOnStdErr: true,
      })
      .then((res) => {
        // TODO: Use `git rev-parse --show-prefix build_context`(git relative path to
        //       top-level directory) result instead just `build_context`? Naive case is
        //       that they give the same result but there might be edge cases not doing
        //       that..
        return res.stdout
          .trim()
          .split("\n")
          .map((filepath) => path.join(build_context, filepath))
          .join("\n");
      });
    core.info(image_context);
    core.endGroup();

    core.startGroup(`Collect all file object names from git tree`);
    const tree_object_paths = image_context.split("\n");
    tree_object_paths.push(...extra_tree_objects);
    const ls_tree_cmd = [
      "ls-tree",
      "-r",
      "--format=%(objectname) %(path)",
      "--full-tree",
      "HEAD",
    ];
    ls_tree_cmd.push(...tree_object_paths);
    const tree_object_names = await exec.getExecOutput("git", ls_tree_cmd, {
      failOnStdErr: true,
    });
    core.endGroup();

    core.startGroup(`Generate hash from git tree objects`);
    const hash = await exec.getExecOutput("git", ["hash-object", "--stdin"], {
      failOnStdErr: true,
      input: Buffer.from(tree_object_names.stdout, "utf-8"),
    });
    core.endGroup();

    core.setOutput("hash", hash.stdout.trim());
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = {
  run,
};
