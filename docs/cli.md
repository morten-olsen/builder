# CLI Reference

The `builder` CLI is the primary way to interact with the server. Install it globally:

```sh
npm install -g @morten-olsen/builder-cli
```

## Server

```sh
builder server start
```

Starts the HTTP server with the bundled web UI. Binds to the configured `HOST` and `PORT` (defaults to `0.0.0.0:4120`).

## Auth

```sh
builder auth register --email <email> [--password <password>]
builder auth login --email <email> [--password <password>]
builder auth me
builder auth logout
```

If `--password` is omitted, you'll be prompted with masked input (not saved to shell history). For `register`, you'll be asked to confirm the password. Pass `--password` directly for scripting or CI.

| Command    | Description                                           |
| ---------- | ----------------------------------------------------- |
| `register` | Create a new account and save the auth token locally. |
| `login`    | Log in to an existing account.                        |
| `me`       | Show the currently authenticated user.                |
| `logout`   | Clear saved credentials.                              |

## Identities

An identity holds an SSH keypair and Git author info. It's used for cloning repos and authoring commits.

```sh
builder identity create --name <name> --git-name <name> --git-email <email>
builder identity list
builder identity get <id>
builder identity delete <id>
```

| Command       | Description                                              |
| ------------- | -------------------------------------------------------- |
| `create`      | Generate a new Ed25519 identity. Outputs the public key. |
| `list`        | List all identities for the current user.                |
| `get <id>`    | Show identity details including the public key.          |
| `delete <id>` | Permanently delete an identity.                          |

### Create options

| Flag                  | Required | Description                                          |
| --------------------- | -------- | ---------------------------------------------------- |
| `--name <name>`       | Yes      | A label for this identity (e.g. "personal", "work"). |
| `--git-name <name>`   | Yes      | Git author name used in commits.                     |
| `--git-email <email>` | Yes      | Git author email used in commits.                    |

## Repos

Repos save a repository URL with default branch and identity settings, so you don't have to repeat them for every session.

```sh
builder repo create --name <name> --url <git-url> [--branch <branch>] [--identity <id>]
builder repo list
builder repo get <id>
builder repo update <id> [--name <name>] [--url <url>] [--branch <branch>] [--identity <id>]
builder repo delete <id>
builder repo sessions <id>
```

| Command         | Description                                             |
| --------------- | ------------------------------------------------------- |
| `create`        | Register a new repo.                                    |
| `list`          | List all repos for the current user.                    |
| `get <id>`      | Show repo details.                                      |
| `update <id>`   | Update repo settings. Only provided fields are changed. |
| `delete <id>`   | Permanently delete a repo.                              |
| `sessions <id>` | List all sessions for a repo.                           |

### Create / update options

| Flag                | Required    | Description                                         |
| ------------------- | ----------- | --------------------------------------------------- |
| `--name <name>`     | create only | A label for this repo.                              |
| `--url <git-url>`   | create only | SSH clone URL (e.g. `git@github.com:you/repo.git`). |
| `--branch <branch>` | No          | Default branch for new sessions.                    |
| `--identity <id>`   | No          | Default identity ID for new sessions.               |

## Sessions

A session is a single agentic task execution. The agent clones the repo into an isolated worktree and works until the task is complete.

```sh
builder session create --repo <id> --prompt "..." [--identity <id>] [--branch <branch>]
builder session run --repo <id> --prompt "..." [--identity <id>] [--branch <branch>]
builder session list
builder session get <id>
builder session send <id> --message "..."
builder session stop <id>
builder session delete <id>
```

| Command       | Description                                                                       |
| ------------- | --------------------------------------------------------------------------------- |
| `create`      | Create a session without starting the agent.                                      |
| `run`         | Create a session and immediately run the agent, streaming output to the terminal. |
| `list`        | List all sessions for the current user.                                           |
| `get <id>`    | Show session details and status.                                                  |
| `send <id>`   | Send a follow-up message to an idle session and stream the agent's response.      |
| `stop <id>`   | Gracefully stop an idle session.                                                  |
| `delete <id>` | Abort (if running) and permanently delete a session.                              |

### Create / run options

| Flag                | Required | Description                           |
| ------------------- | -------- | ------------------------------------- |
| `--repo <id>`       | Yes      | Repo ID to use.                       |
| `--prompt "..."`    | Yes      | Task description for the agent.       |
| `--identity <id>`   | No       | Override the repo's default identity. |
| `--branch <branch>` | No       | Override the repo's default branch.   |

### Send options

| Flag              | Required | Description                             |
| ----------------- | -------- | --------------------------------------- |
| `--message "..."` | Yes      | Follow-up message to send to the agent. |

## Admin

Admin commands operate across all users. Useful for inspecting server state.

```sh
builder admin users
builder admin repos [--user <id>]
builder admin identities [--user <id>]
builder admin sessions [--user <id>]
```

All admin commands accept an optional `--user <id>` filter (except `users`).

## Global Options

All commands that produce output support `--json` for machine-readable JSON output. For list commands this returns an array; for single-entity commands it returns the entity object.

## Environment Variables

See the [configuration table in the README](../README.md#configuration) for all supported environment variables. The CLI auto-generates secrets and sets sensible defaults — you typically only need `ANTHROPIC_API_KEY`.
