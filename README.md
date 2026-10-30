# Peaka Tableau Web Data Connector (legacy)

WDC 3.0 is deprecated by Tableau and receives no further updates. This connector is
maintained for existing users; prefer the [JDBC connector](https://github.com/peakacom/tableau-connector) for new SQL/live deployments.

**Desktop 2026.3 default configuration:** the package loads, but selecting it fails with
`6CE8887E` / `DataSourceClassMissing: eps`, before the API form opens. Do not assume that
newer Desktop releases can run WDC 3.0 just because the manifest declares 2023.3 as its
minimum. Tableau disables the legacy EPS runtime in recent releases. With a temporary
runtime override, 1.0.3 authorization and table selection passed, but extraction hit a
native EPS module signing error on this macOS host. See [TESTING.md](TESTING.md).

Source code and unsigned packages are distributed through
[GitHub Releases](https://github.com/peakacom/tableau-web-data-connector/releases), not a Peaka CDN upload.
Use the versioned download and verify its SHA-256 digest. WDC is extract-only and is not
a browser-only Tableau Cloud connector.

## One package for Cloud and on-prem (1.0.3)

The user enters **Peaka API address**, an API key and an optional **Project ID** in the connection form.
The default is `https://partner.peaka.studio/api/v1`. Any valid HTTPS Partner API origin
(with optional port) or full `/api/v1` base URL can be entered. The connector normalizes
the URL and stores it with the connection for metadata, export and unattended refresh.
Existing Cloud workbooks without a saved endpoint retain the Cloud default. Switching
instance, API key or project clears selections and cached metadata.

Get the external **Partner API/cloud-gateway URL** from the installation's ingress/load
balancer configuration. The Studio URL and DBC/JDBC address are separate endpoints.
Verify routing, trusted TLS, the expected `/api/v1/info` API and reachability from both
Desktop and the refresh machine. Enter only the intended Peaka installation's address:
the API key will be sent to that address. The connector accepts no embedded URL
credentials, query strings, fragments, HTTP URLs or arbitrary API paths.

No customer-specific rebuild or static address list is required.

## Project keys and partner/organization keys

For a project API key, leave **Project ID** blank to discover its project from `/info`.
For a partner/organization key, enter the target **Project ID** separately. Enter the
raw key in the API key field; the JDBC `key:project` syntax is not used by this REST connector.

Authorization checks `/info`, then verifies catalog access to the selected project with
`GET /data/projects/<PROJECT_ID>/catalogs`. A project-bound key cannot be pointed at a
different project. A denied or missing project does not advance to table selection;
an authorized project with no catalogs is allowed. The selected Project ID is displayed
on the table selection screen and saved with the API key in connector secrets for refresh.

This REST project selection is independent of JDBC project selection support on older
Peaka installations. The key must still have the permissions needed to read metadata
and execute the selected table queries. It does not grant additional Peaka permissions.

## Network permissions

`permission.api` uses `https://*/api/v1/` with GET, POST and OPTIONS. Tableau's wildcard
checker permits different installation hosts/ports while application code limits requests
to the user-selected API origin. The package can contact arbitrary HTTPS Peaka API
addresses; it does not verify that a hostname is owned by Peaka. This permission grants no
Peaka roles and bypasses no network policy, TLS validation or API key authorization.

Browser requests reject redirects. Refresh uses the Tableau toolkit's network adapter,
which does not expose a redirect option. Configure a direct API URL without redirects.
Removing the destination allowlist is intentional for this generic connector; customers
requiring a fixed network allowlist can apply their own network restrictions.

## Build, test and package

Use Node 20 with the locked toolkit, Python 3.10/3.11, and native build tools (Xcode Command Line Tools on macOS). The locked node-gyp requires Python distutils, removed in Python 3.12. Select a supported Python if your system default is newer. From `connector/`:

```sh
npm_config_python="$(command -v python3.11)" npm ci
npm test
npm run typecheck
npm run build
```

The type check skips declaration issues in the locked third-party toolkit. Build cleans
stale output and excludes app source maps. From the repository root, package with:

```sh
connector/node_modules/.bin/taco pack
```

The CLI requires explicit acceptance of Tableau's WDC SDK license; the release operator
must authorize acceptance. The generated manifest retains the connector class identity.

An unsigned development package requires Tableau's signature verification to be disabled.
For signed distribution, use Peaka's trusted CA-issued code-signing certificate and a
secure key service/HSM/keystore, then verify the final archive:

```sh
jarsigner -keystore "$SIGNING_KEYSTORE" "$TACO_FILE" "$SIGNING_ALIAS" -tsa "$TIMESTAMP_URL"
jarsigner -verify -verbose -certs -strict "$TACO_FILE"
```

Do not commit private keys or passwords. Changing a signed file invalidates its signature.
No signing credentials or automated release pipeline are stored in this repository.
Publish a new versioned filename and SHA-256 digest in GitHub Releases; update documentation links together.

## Acceptance

Use the exact package and customer Tableau version to authorize, list metadata, export,
save/reopen and refresh an extract without the UI on both Cloud and on-prem. Verify no
request falls back to Cloud after entering a customer address. The automated tests cover
saved refresh URLs, legacy Cloud compatibility, rejected destinations, and the actual
Tableau toolkit permission checker against custom hostnames, ports and disallowed methods.

Official references:
- https://help.tableau.com/current/api/webdataconnector/en-us/docs/wdc_customize_connector.html
- https://help.tableau.com/current/api/webdataconnector/en-us/docs/wdc_packaging.html
- https://help.tableau.com/current/api/webdataconnector/en-us/docs/wdc_overview.html

## License

ISC; see [LICENSE](LICENSE). The Tableau SDK has its own license agreement.
