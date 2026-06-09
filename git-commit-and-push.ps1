# Helper script to commit and push changes from workspace
$changes = git status --porcelain
if ($changes) {
  $branch = git rev-parse --abbrev-ref HEAD
  git add -A
  git commit -m "chore(admin): harmonize Super-Admin UI — pill buttons and badges"
  git push origin $branch
  Write-Output "PUSHED: $branch"
} else {
  Write-Output "NO_CHANGES"
}
