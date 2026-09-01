1. **Analyze Security Risk:** Review `Projects.tsx` and identify the XSS vulnerability where `proj.githubUrl` is used in an `href` without validation.
2. **Implement Fix:** Modify `Projects.tsx` to validate that `proj.githubUrl` starts with `http://` or `https://` before rendering the `<a>` tag. We can use a regex like `/^https?:\/\//i.test(proj.githubUrl)` to ensure it safely covers upper/lower cases, or use `new URL(url).protocol`. A simple helper function `isSafeUrl(url)` can be added in the file or we can use an inline check.
3. **Verify:** Check that the projects page compiles and functions as expected.
4. **Pre-commit:** Run `pre_commit_instructions` and follow the required checks.
5. **Submit:** Submit a PR with the security fix described.
