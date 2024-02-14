[![GitHub release](https://img.shields.io/github/release/5monkeys/docker-image-context-hash-action.svg?style=flat-square)](https://github.com/5monkeys/docker-image-context-hash-action/releases/latest)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-docker_image_context_hash-blue?style=flat-square&logo=github)](https://github.com/marketplace/actions/docker-image-context-hash)
[![CI workflow](https://img.shields.io/github/actions/workflow/status/5monkeys/docker-image-context-hash-action/ci.yml?branch=main&label=ci&logo=github&style=flat-square)](https://github.com/5monkeys/docker-image-context-hash-action/actions?workflow=ci)

## About

This GitHub Action calculates a hash from the _maximal_ Docker image context. Which can
be useful to get a reproducible value for an arbitrary Git
[tree-ish object](https://git-scm.com/docs/gitglossary#Documentation/gitglossary.txt-aiddeftree-ishatree-ishalsotreeish).

Hash inputs are taken from [git ls-tree](https://git-scm.com/docs/git-ls-tree). Which
means that when any object name or path that is part of the Docker image context
changes, the calculated hash changes.

This could be leveraged to e.g.

- Push docker images with tags that can be found in different contexts, across the Git
  repository as a whole. For example: a release workflow could find an image built by a
  test workflow.
- Skip unnecessary image builds if there has been no changes to any files included in
  the maximal Docker image context.

While using e.g. a Git commit hash could work correspondingly it is more sensitive. For
example: if contents of a Docker image context hasn't changed between 2 commits, the
hash calculation produces identical output.

Note that `docker-image-context-hash-action` does _not_ calculate the hash of the
_actual_ Docker image context.

---

## Inputs

- `build_context`: (optional) The path to the Docker image context. Defaults to the
  current working directory.

- `extra_tree_objects`: (optional) Additional Git tree objects, outside of the Docker
  image context, that should also be included when calculating the hash.

## Outputs

`hash`: The hash of the Docker image context.

## Usage

```yaml
on:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Calculate Docker image context hash
        id: context-hash
        uses: 5monkeys/docker-image-context-hash-action@main
        with:
          extra_tree_objects: |
            .dockerignore
            Dockerfile

      - name: Build and push Docker image
        uses: docker/build-push-action@v5.1.0
        with:
          context: .
          push: true
          tags: your-image:${{ steps.context-hash.outputs.hash }}
```

In this example, the `docker-image-context-hash-action` is used to calculate the hash
of the current path as Docker image context, and the resulting hash is used as part
of the Docker image tag when building and pushing the image.

The files `.dockerignore` and `Dockerfile` are added as extra Git tree objects since
they are implicitly excluded from the image context by Docker. Having them as extra Git
tree objects results in tracking changes to them identically to files included in the
image context.

Note that the [docker/build-push-action](https://github.com/docker/build-push-action) is
used in the example to build and push the Docker image, but this can be replaced with
any other action or script that builds and pushes Docker images.

## Development

- Install deps: `npm ci`
- Run tests: `npm run test`
- Run lint: `npm run lint`
- Package application: `npm run package`. Remember to run this before committing anything.
