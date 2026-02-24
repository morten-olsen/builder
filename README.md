# Builder

**Your coding agent doesn't need you staring at it. Go touch grass.**

You use [Claude Code](https://docs.anthropic.com/en/docs/claude-code). You love it. You also spend an mass amount of time watching a terminal scroll while an AI writes code that you could be reviewing from the couch. Or the park. Or literally anywhere that isn't your desk chair slowly fusing with your spine.

Builder is a self-hosted server that wraps Claude Code in a web UI with proper session management. Kick off a handful of tasks across different repos — or different branches of the same repo — and leave. Go for a walk. Make dinner. Touch grass. Each session gets its own Git worktree, so nothing steps on anything else while you're gone.

Your phone buzzes. The agent has a question. You glance at it, type "yes, use the existing auth middleware", and put your phone back in your pocket. Ten minutes later it buzzes again — session complete. You review the diff on your phone, it looks good, you push it to a new branch from the bus. PR created before you get home.

Notifications are coming soon (ntfy.sh, Pushover, webhooks) to make this loop even smoother.

Built on the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript).

---

## How It Works

**Kick off sessions, plural.** Register your repos, fire off coding tasks with a prompt, and let them run in parallel. Each session clones the repo into its own Git worktree — no conflicts, no manual worktree juggling, no tmux acrobatics. You're not limited to one agent at a time anymore.

**Manage everything from your phone.** The web UI is built mobile-first. Check session status, answer questions the agent is stuck on, send follow-ups, review diffs, and push branches — all from your phone. Your desk misses you. That's its problem.

**Or sit down for the big stuff.** Some changes deserve a proper look. The review screen works just as well on a big monitor with a cup of coffee. Go through the diff carefully, leave comments, push when you're satisfied. Builder doesn't rush you.

**Everything over Git.** Builder generates Ed25519 SSH keypairs for each identity you create. Add the public key to GitHub or GitLab and you're connected. The agent commits to branches in isolated worktrees — you decide when and what to push.

**An API underneath.** The web UI is just a client for a full REST + SSE API with interactive OpenAPI docs. Automate session creation from CI, build your own dashboard, or wire Builder into whatever Rube Goldberg machine you call a workflow.

---

## Getting Up and Running

You need three things on your machine:

- **Node.js** 20+
- **Git**
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** installed and authenticated

Then install the CLI:

```sh
npm install -g @morten-olsen/builder-cli
```

### Start the server

```sh
builder server start
```

That's it. Builder creates a SQLite database and generates encryption keys in `~/.builder/` on first launch. The server is now running on `http://localhost:3000`.

### Set up your account

```sh
builder auth register --email you@example.com --password yourpassword
```

### Create a Git identity

This is how Builder authenticates with your Git host. One command generates an SSH keypair and ties it to your Git author info:

```sh
builder identity create \
  --name "personal" \
  --git-name "Your Name" \
  --git-email "you@example.com"
```

Copy the public key from the output and add it to [GitHub](https://github.com/settings/keys), [GitLab](https://gitlab.com/-/user_settings/ssh_keys), or wherever your repos live.

### Open the dashboard

Head to **<http://localhost:3000>** from your laptop — or your phone, we don't judge. Log in, register a repo, and kick off your first session. Then close the laptop. That's the whole point.

---

## Heads Up: Security

Agent sessions run code directly on the host machine — there's no sandboxing yet. That means **every user account can execute arbitrary code on your server**. Only create accounts for people you trust. Container isolation is on the roadmap.

---

## Configuration

Builder works out of the box, but you can tune it with environment variables:

| Variable            | Default                    | Description                                          |
| ------------------- | -------------------------- | ---------------------------------------------------- |
| `ANTHROPIC_API_KEY` | from Claude Code           | Inherited automatically. Set explicitly to override. |
| `AGENT_MODEL`       | `claude-sonnet-4-20250514` | Which Claude model the agent uses.                   |
| `PORT`              | `3000`                     | Server port.                                         |
| `HOST`              | `0.0.0.0`                  | Server bind address.                                 |
| `DB_PATH`           | `~/.builder/builder.db`    | SQLite database location.                            |
| `SESSION_DATA_DIR`  | `~/.builder/data`          | Where repo clones and worktrees live.                |
| `JWT_SECRET`        | auto-generated             | JWT signing secret.                                  |
| `ENCRYPTION_KEY`    | auto-generated             | AES-256 key for encrypting SSH keys at rest.         |
| `JWT_EXPIRES_IN`    | `24h`                      | How long auth tokens last.                           |

Secrets are auto-generated on first run and stored in `~/.builder/secrets.json`.

---

## Going Deeper

| Doc                             | What's in it                                                          |
| ------------------------------- | --------------------------------------------------------------------- |
| [CLI Reference](docs/cli.md)   | Every command, flag, and option                                       |
| [API Guide](docs/api.md)       | Authentication, REST requests, SSE event streaming, TypeScript client |
| `/documentation` on your server | Interactive API explorer (Swagger UI)                                 |

---

## License

AGPL-3.0
