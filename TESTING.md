# Verification record — 2026-10-30

Package: PeakaWebDataConnector-1.0.3.taco (unsigned).
Host: macOS, Apple silicon. Tableau Desktop Free Edition 2026.3.0.

## Default runtime

With 1.0.2, the plugin loaded with signature verification disabled for the test process,
but selecting it failed before the form opened: `6CE8887E` / `DataSourceClassMissing: eps`.
Version 1.0.3 retains the EPS superclass and does not remove this runtime requirement.

Tableau disables the legacy EPS runtime by default in 2026.3, 2026.2.4, 2025.3.11 and
2025.1.21. A minimum-version-only compatibility statement is misleading. See the
[official runtime notice](https://help.salesforce.com/s/articleView?id=005461746&language=en_US&type=1).

## Temporary EPS runtime test (1.0.3)

With an explicitly approved temporary `EPSRuntimeEnable` preference, the WDC form opened.
A restricted partner/organization key plus a separate Project ID passed authorization,
catalog/schema/table listing, selection of one synthetic sample table and the import
summary. The selected API address was a non-default HTTPS deployment.

After Finish, the Tableau EPS extractor exited with code 1 and the form remained at
“Exporting Tables”. Captured process output reported `ERR_DLOPEN_FAILED` loading EPS's
native `isolated_vm.node`: “mapping process and mapped file (non-platform) have different
Team IDs”. Read-only `codesign` inspection showed a Team ID on Tableau's EPS executable
and an ad-hoc signature with no Team ID on the extracted native module. This is separate
from the unsigned TACO package. The module was not modified or re-signed.

The previous EPS preference was restored and the temporary key was deleted after testing.
Desktop extraction, save/reopen and unattended refresh remain **not verified end to end**.
The manifest minimum is 2023.3; no earlier Desktop release was tested. WDC 3.0 is legacy;
this release is for evaluation, not a new Tableau Cloud integration strategy.

## Automated and package checks

All 13 Node tests, the TypeScript application check, production build and toolkit package
validation passed. Tests cover project-key discovery, partner keys with an explicit
project, mismatched or inaccessible projects, malformed responses, invalid saved Project
IDs, saved endpoint refresh, Cloud fallback for old workbooks, invalid destinations, and
the installed Tableau toolkit's actual wildcard host/port/method permission checker.

The packaged manifest declares 1.0.3. App source maps and signatures are absent; a SHA-256
digest is distributed with the package. These checks do not replace Desktop runtime tests.
No JDBC JAR is used by WDC.
