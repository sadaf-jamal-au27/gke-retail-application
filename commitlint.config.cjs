/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // ─── Type ────────────────────────────────────────────────
    // Allowed commit types — must use one of these
    'type-enum': [
      2, // error (not warning)
      'always',
      [
        'feat',     // naya feature
        'fix',      // bug fix
        'hotfix',   // emergency production fix
        'docs',     // sirf documentation
        'style',    // formatting, missing semi-colons (no logic change)
        'refactor', // code change — not a fix, not a feature
        'perf',     // performance improvement
        'test',     // tests add/fix karna
        'build',    // build system ya external deps (Dockerfile, pnpm, etc.)
        'ci',       // CI/CD pipeline changes
        'chore',    // tooling, config, scripts
        'revert',   // revert a previous commit
        'release',  // version bump / release commit
        'db',       // database migration
        'infra',    // infrastructure changes (K8s, Helm, GCP)
        'sec',      // security patch
        'wip',      // work in progress (do NOT use on main/develop)
      ],
    ],

    // type lowercase mandatory
    'type-case': [2, 'always', 'lower-case'],

    // type required
    'type-empty': [2, 'never'],

    // ─── Scope ───────────────────────────────────────────────
    // Scope is optional but if given must be lowercase
    'scope-case': [2, 'always', 'lower-case'],

    // ─── Subject ─────────────────────────────────────────────
    // Subject (short description) rules
    'subject-empty': [2, 'never'],                  // required
    'subject-full-stop': [2, 'never', '.'],         // no period at end
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-min-length': [2, 'always', 5],         // minimum 5 chars
    'subject-max-length': [2, 'always', 72],        // max 72 chars

    // ─── Header (type + scope + subject) ─────────────────────
    'header-max-length': [2, 'always', 100],

    // ─── Body ────────────────────────────────────────────────
    'body-leading-blank': [1, 'always'],            // blank line before body
    'body-max-line-length': [2, 'always', 120],

    // ─── Footer ──────────────────────────────────────────────
    'footer-leading-blank': [1, 'always'],          // blank line before footer
    'footer-max-line-length': [2, 'always', 120],
  },

  // Help text shown on failure
  helpUrl: 'https://github.com/sadaf-jamal-au27/gke-retail-application/blob/main/.github/COMMIT_CONVENTION.md',
};
