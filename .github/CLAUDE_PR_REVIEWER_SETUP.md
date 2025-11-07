# Claude PR Reviewer Setup

This repository uses Claude AI to automatically review pull requests.

## Setup Instructions

### 1. Add Anthropic API Key to GitHub Secrets

To enable the Claude PR reviewer, you need to add your Anthropic API key as a GitHub repository secret:

1. Get an Anthropic API key from https://console.anthropic.com/
2. Go to your GitHub repository settings
3. Navigate to **Settings** → **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `ANTHROPIC_API_KEY`
6. Value: Your Anthropic API key
7. Click **Add secret**

### 2. How It Works

The workflow (`.github/workflows/claude-pr-review.yml`) will automatically:

- Trigger on pull request events (opened, synchronized, reopened)
- Fetch the PR diff and changed files
- Send the changes to Claude Sonnet 4.5 for review
- Post a comprehensive review comment on the PR

### 3. What Claude Reviews

Claude will analyze:

- **Summary**: What the PR accomplishes
- **Potential Issues**: Bugs or logic errors
- **Code Quality**: Best practices and improvements
- **Security**: Security vulnerabilities or concerns
- **Overall Assessment**: APPROVE, REQUEST_CHANGES, or COMMENT

### 4. Customization

You can customize the review prompt by editing the workflow file at `.github/workflows/claude-pr-review.yml`. Look for the `prompt.json` section to modify what Claude focuses on.

### 5. Cost Considerations

Each PR review costs API credits based on the size of the diff. The workflow limits diffs to 50,000 characters to manage costs. For large PRs, the diff will be truncated.

### 6. Troubleshooting

If the workflow fails:

- Check that `ANTHROPIC_API_KEY` is correctly set in repository secrets
- Verify your API key is valid and has available credits
- Check the Actions tab for detailed error logs
- Ensure the workflow has proper permissions (pull-requests: write)

## Example Output

Claude will post a comment on each PR with structured feedback covering code quality, potential issues, security concerns, and actionable suggestions.
