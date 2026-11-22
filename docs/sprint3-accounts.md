# Sprint 3 accounts: local branch stack

No branch is pushed, deployed, or merged by this work. Linear records stay unchanged.

| Issue  | Branch                     | Parent                     | Worktree                                          |
| ------ | -------------------------- | -------------------------- | ------------------------------------------------- |
| SFT-41 | codex/sft-41-auth-learning | origin/main at 673f488     | C:/Users/fkbr1/Documents/Sift-sft41-auth-learning |
| SFT-38 | codex/sft-38-registration  | codex/sft-41-auth-learning | C:/Users/fkbr1/Documents/Sift-sft38-registration  |
| SFT-39 | codex/sft-39-sessions      | codex/sft-38-registration  | C:/Users/fkbr1/Documents/Sift-sft39-sessions      |
| SFT-40 | codex/sft-40-server-roles  | codex/sft-39-sessions      | C:/Users/fkbr1/Documents/Sift-sft40-server-roles  |

Review and eventually merge in this order: **41 → 38 → 39 → 40**. Before each parent
merges, review the child against its parent branch so its diff contains only that issue.
If the team preserves merge commits, the ancestry remains intact. If a parent is squash
merged, the owner must explicitly reconcile the child onto the new main before its PR;
do not merge a child with duplicated parent changes. No such rebase is performed here.

Inspect a worktree using Codex's folder picker, or use `git -C <worktree> diff <parent>...HEAD`
and `git -C <worktree> log --oneline <parent>..HEAD`. Commit hashes are reported in the final
handoff; branch names in this document avoid self-referential commit hashes.

SFT-41's technical demonstration and learning exercise are in [auth-learning.md](auth-learning.md).
The team learning outcome and linking a published summary to Linear require human follow-through.
The repository Definition of Done also requires CI, PR merge and deployment; those actions are
outside the authorized local-only work. Local implementation readiness is reported separately.
