# Sprint 3 authentication finalization

Branch: `codex/sprint-3-auth-finalization`, isolated at
`C:/Users/fkbr1/Documents/Sift-sprint3-auth-finalization`, based on SFT-40 `6a7b053`.
The original four branches remain unchanged. Linear was reread directly; it specifies no higher
minimum password length. No remote records, production data, or shared package versions change.

## Password decision

The product policy is 8–128 Unicode code points, with Arabic/English/symbols/passphrases allowed,
no composition rule, and a small local common/repetition blocklist. Nothing is sent to an external
password service. The UI/server share the same policy. Actual passwords are never normalized or
trimmed. The 8-character password-only minimum is the owner's explicit product decision; it is
weaker against guessing than a longer minimum. Encourage unique long passphrases, reject known
weak values, and provision production abuse protection before release. The small blocklist is
not a comprehensive breached-password database or an assurance of password entropy.

New rows use Node 22's built-in scrypt: N=32768, r=8, p=3, 16 random salt bytes, 32-byte key,
64 MiB maxmem, constant-time key comparison, and a versioned self-describing string. This is one
of [OWASP's scrypt profiles](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).
[Node crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)
provides the implementation without a new native dependency or a Node-version upgrade.
At most two expensive hash operations and sixteen queued operations run per module/worker;
excess work fails safely. This is a resource bound, not a distributed brute-force limiter.

Existing bcrypt hashes remain readable, including the development fixtures. Their input still
has a strict 72-byte limit, so aliases caused by truncation never authenticate. New scrypt
passwords safely exceed that byte limit without exposing byte jargon in the form. No schema
migration or bulk password rewrite is performed. Do not roll back to readers that understand
only bcrypt after new accounts have been created; include the versioned verifier in any rollback.

## Redirect repair

Navigation must carry a canonical destination. The resolver unwraps bounded legacy auth-page
wrappers and whole-value percent encodings, rewrites the locale, and preserves the final page's
query and fragment without decoding their values. External/protocol-relative destinations,
control characters, encoded path separators, invalid locales and excessive nesting fall back
to the account page. `authHref()` creates one encoding layer; the UI must use it consistently.
