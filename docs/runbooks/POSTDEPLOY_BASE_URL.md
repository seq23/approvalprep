# Postdeploy Base URL

Canonical postdeploy validation base URL:

```text
https://approvalprep.pages.dev
```

Use this URL for postdeploy smoke checks until the custom domain is fully verified and routed.

Recommended local variables for postdeploy validation:

```text
POSTDEPLOY_BASE_URL=https://approvalprep.pages.dev
PLAYWRIGHT_BASE_URL=https://approvalprep.pages.dev
```

Production canonical URL remains:

```text
https://approvalprep.com
```
