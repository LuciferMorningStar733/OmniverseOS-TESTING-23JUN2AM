# Workspace Customizations & Agent Rules

## Git Remote & Credentials
- The GitHub remote URL for this repository is configured with the user's GitHub Personal Access Token in local `.git/config`.
- When running `git push` or `git pull`, always use `origin` or the authenticated remote URL so non-interactive background commands succeed cleanly without hanging on credential popups.

