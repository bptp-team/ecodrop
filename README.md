# ecodrop

Web application for finding waste collection and disposal points in Caçapava, São Paulo, Brazil.

Built with [React](https://react.dev) and [Vite](https://vite.dev).

## Contents

- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Structure](#structure)
- [Deployment](#deployment)
  - [How it works](#how-it-works)
  - [Publishing a new version](#publishing-a-new-version)
  - [Infrastructure](#infrastructure)
  - [Domain](#domain)
- [Analytics](#analytics)
  - [Metrics and events](#metrics-and-events)
  - [Monitoring coverage](#monitoring-coverage)
  - [Pending items](#pending-items)
  - [KQL queries](#kql-queries)
    - [Before running a query](#before-running-a-query)
    - [Checking a release](#checking-a-release)
    - [Page views](#page-views)
    - [Searches](#searches)
    - [Clicks and other interactions](#clicks-and-other-interactions)
    - [Investigating missing data](#investigating-missing-data)
  - [Privacy and setup](#privacy-and-setup)
- [Map](#map)
  - [Collection points](#collection-points)
  - [Item search](#item-search)
  - [Relationships between data files](#relationships-between-data-files)
    - [`searchableItems.json`: item catalog](#searchableitemsjson-item-catalog)
    - [`collectionPoints.json`: locations and accepted materials](#collectionpointsjson-locations-and-accepted-materials)
    - [`wasteTypeDetails.json`: educational content by waste type](#wastetypedetailsjson-educational-content-by-waste-type)
    - [Tests that guard the relationships](#tests-that-guard-the-relationships)
  - [Data sources](#data-sources)
  - [Adding or updating a point](#adding-or-updating-a-point)
  - [Coverage limitations](#coverage-limitations)

## Requirements

- Node.js 22.12+

## Getting started

```bash
make install
make dev
```

## Commands

- `make dev`: starts the development server at http://localhost:5173
- `make build`: builds the production version into `dist/`
- `make preview`: serves the contents of `dist/` locally
- `make lint`: checks JavaScript and JSX with ESLint
- `make format`: formats project files with Prettier
- `make format-check`: checks formatting without changing files
- `make test`: runs the unit tests (Vitest) and the end-to-end tests (Playwright). The first time, install the test browser with `npx playwright install chromium`
- `make prepare`: installs the Git hooks

The Makefile delegates to the corresponding npm scripts.

Git hooks are installed with the project dependencies. The pre-commit hook runs lint and formatting checks; the pre-push hook runs the test suite.

## Structure

```
.github/workflows/  pipeline: checks on every push, deployment on version tags
nginx/              web server settings used to serve the site in production
public/             files served as-is (favicon)
src/
  components/       React components (map, search panel, learning pages)
  config/           app settings (initial map center and zoom)
  data/             static data (collection points, searchable items, waste types)
  search/           item search and collection point filtering
  utils/            small shared helpers
  App.jsx           root component
  index.css         global styles
  main.jsx          entry point
terraform/          Azure infrastructure
tests/              end-to-end tests
Dockerfile          builds the production image
```

New directories (`assets/`, `pages/`) should be created once there is content for them.

## Deployment

The site is live at **https://ecodrop.thomaspalma.com.br**.

### How it works

- The [`Dockerfile`](Dockerfile) builds the site into an image, and [`nginx/nginx.conf`](nginx/nginx.conf) serves it.
- The image is stored in the project's own Azure container registry.
- The site runs on Azure Container Apps, which provides HTTPS and a free certificate for the domain.
- The app stops when nobody is using it and starts again on the next visit, which keeps it within Azure's free monthly allowance. The first visit after a quiet period can take a few seconds.
- All Azure resources are described in [`terraform/`](terraform/).

### Publishing a new version

Releases use bare `MAJOR.MINOR.PATCH` Git tags, with no `v` prefix. Start from the reviewed commit on `main` and make sure the working tree is clean. A tag push starts the production release workflow, so it publishes an image and updates the live site.

Fetch the latest tags and check that the version you plan to use is not already present locally or on `origin`:

```bash
git status --short --branch
git fetch origin --tags
git tag --list --sort=-version:refname
git ls-remote --tags origin
```

Choose the next unused version. For example, to release `1.0.4`, create an annotated tag and push it:

```bash
git tag -a 1.0.4 -m "EcoDrop 1.0.4"
git push origin 1.0.4
```

The pipeline in [`.github/workflows/ecodrop.yaml`](.github/workflows/ecodrop.yaml) then:

1. runs lint, tests and build;
2. checks that the image version is not already in the registry, then builds and publishes it;
3. updates the production site to that image and checks `/healthz`.

Follow the workflow run in GitHub Actions and confirm that the publish and deploy jobs succeed. Pushes without a tag run checks but do not publish or deploy. Treat each version as one-time: if a run fails after the image is published, do not reuse that version or immediately push another tag. First inspect the failed job and the live deployment; the registry check prevents ordinary reuse but is not an atomic guarantee.

The pipeline signs in to Azure through a trust relationship between GitHub and Azure, so no password is stored in GitHub. Its identity can only publish images and update the app.

### Infrastructure

Terraform creates and manages these resources, all in the `mexicocentral` region:

| Resource                   | Name               | Purpose                                      |
| -------------------------- | ------------------ | -------------------------------------------- |
| Resource group             | `ecodrop-rg`       | Groups the resources below                   |
| Container registry         | `ecodropacr`       | Stores the published images                  |
| Container Apps environment | `ecodrop-env`      | The space where the app runs                 |
| Container app              | `ecodrop`          | Runs the site                                |
| Identity                   | `ecodrop-pull`     | Lets the app download its image              |
| Identity                   | `ecodrop-cd`       | Lets the pipeline publish and update the app |
| Application Insights       | `ecodrop-insights` | Receives the site's analytics                |
| Log Analytics workspace    | `ecodrop-logs`     | Stores the analytics data                    |

Things to know:

- The environment is created with the AzAPI provider instead of AzureRM. AzureRM cannot choose the environment type, and Azure's default type ("Express") does not support custom domains.
- The environment and the app are protected against deletion, because recreating them would change the address the domain points to.
- The Azure for Students subscription allows only one Container Apps environment per region.
- The registry is the only fixed cost, about US$ 5 per month.
- The pipeline reads the `ECODROP_CD_CLIENT_ID` repository variable, which holds the `cd_client_id` Terraform output.

Running Terraform requires Terraform and the Azure CLI, signed in to the subscription:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars   # first time only, then fill in the values
terraform -chdir=terraform init
terraform -chdir=terraform plan
terraform -chdir=terraform apply
```

`terraform.tfvars` must not be committed. Terraform keeps its state in the `ecodroptfstate` storage account, in the `ecodrop-tfstate-rg` resource group, which was created by hand before the first run. Anyone running Terraform needs the "Storage Blob Data Contributor" role on that account.

### Domain

The domain is managed in Registro.br with two records:

| Type | Name            | Value                                                      |
| ---- | --------------- | ---------------------------------------------------------- |
| A    | `ecodrop`       | The `container_app_environment_static_ip` Terraform output |
| TXT  | `asuid.ecodrop` | The `custom_domain_verification_id` Terraform output       |

The TXT record proves to Azure that the domain belongs to the project. Keep both records in place: the certificate renews automatically while they exist.

The domain was connected to the app once, after the records were published:

```bash
az containerapp hostname add -g ecodrop-rg -n ecodrop --hostname ecodrop.thomaspalma.com.br
az containerapp hostname bind -g ecodrop-rg -n ecodrop --environment ecodrop-env \
  --hostname ecodrop.thomaspalma.com.br --validation-method HTTP
```

This step is not part of Terraform because its Azure provider cannot link the free certificate yet. It only needs to be repeated if the app is ever recreated.

## Analytics

The published site sends usage data to Azure Application Insights, available in the Azure portal in the `ecodrop-insights` resource. The SDK is loaded only when the production connection string is present.

### Metrics and events

| Metric or event              | What it records and why it is useful                                                                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page views                   | A visit to the map (`/`), Aprenda index (`/aprenda`) or a valid waste-type page (`/aprenda/:wasteTypeId`). Shows which parts of the site are used. Query-string changes such as searches do not create extra page views.                                   |
| Page views per day           | Daily volume of page views; useful for comparing usage over time and seeing activity around educational events.                                                                                                                                            |
| Approximate city             | `client_City` estimates the city of access. It can show whether visits come from Caçapava or elsewhere; it is not a precise location.                                                                                                                      |
| Initial page load duration   | `pageViews.duration` for the first page view in a tab, marked by `isInitialLoad`. It reflects how long the browser took to load the site. Later page views in the same tab repeat this value, so they do not measure load time.                            |
| JavaScript errors            | Browser exceptions captured automatically by Application Insights, in the `exceptions` table. Helps identify client-side failures affecting visitors.                                                                                                      |
| `Search`                     | One submitted search, with `term` (lowercase), `results` (matching item count) and `points` (compatible collection-point count). A zero `results` count indicates a missing catalog item; zero `points` indicates a possible gap in collection-point data. |
| Searches without results     | Derived from `Search` where `results` is zero. Its rate helps prioritize additions to the item catalog.                                                                                                                                                    |
| Search terms                 | The `term` property of `Search`, useful for identifying common queries and catalog vocabulary.                                                                                                                                                             |
| Searches per map view        | The number of `Search` events divided by map page views. Indicates how often map visitors use search.                                                                                                                                                      |
| Aprenda visits by waste type | Page views grouped by route, showing which educational waste-type pages are viewed.                                                                                                                                                                        |
| `NavigationLinkClicked`      | A click on a main navigation link, the EcoDrop logo, the feedback link or the source-code repository link. Includes `item`, `destination` and `linkType`.                                                                                                  |
| `CollectionPointOpened`      | Opening a map point popup, with the point `id` and `name`. Shows which collection points attract interest.                                                                                                                                                 |
| `LearnMoreClick`             | Clicking “Saiba mais” from search results, with the `wasteType` and `destination`. Measures when a search leads to educational content.                                                                                                                    |
| `ViewOnMapClick`             | Clicking “Ver no mapa os pontos que recebem” on a waste-type page, with the `wasteType` and `destination`. Measures when educational content leads back to the map.                                                                                        |
| `CollectionPointLinkClick`   | Clicking the OpenStreetMap link in a point popup, with `pointId`. Indicates intent to visit a collection point; the destination URL is not sent.                                                                                                           |

`PageVisitTime` is not enabled. Sessions, unique users and retention are not reported because cookies are disabled and the app does not keep a visitor identifier. Whether consent is required depends on the full legal and data-processing context; disabling cookies alone is not a legal determination. Search terms are free text, so avoid entering personal information.

### Monitoring coverage

Every interactive element of the site, what it sends to Application Insights and whether its records have been seen in production. Checked against the code and the production data on October 29, 2026, after release 1.0.5.

- **Confirmed:** records with the expected properties were found in production.
- **Not validated:** the code sends the event, but no record has been found yet.
- **Page view only:** the click itself is not recorded, but the page it opens is. The page view does not show which link was used.
- **Not tracked:** nothing is sent.

| Element or interaction                                                                           | Location                          | Event sent                                                             | Record type                 | Status         |
| ------------------------------------------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------- | --------------------------- | -------------- |
| Opening the map                                                                                  | Map (`/`)                         | Page view `/`                                                          | `pageViews`                 | Confirmed      |
| Opening the Aprenda index                                                                        | Aprenda (`/aprenda`)              | Page view `/aprenda`                                                   | `pageViews`                 | Confirmed      |
| Opening a waste-type page                                                                        | Waste-type page (`/aprenda/<id>`) | Page view `/aprenda/<id>`                                              | `pageViews`                 | Confirmed      |
| Opening an address that does not exist                                                           | Page not found                    | None                                                                   | —                           | Not tracked    |
| “EcoDrop” logo                                                                                   | Header, every page                | `NavigationLinkClicked` (`item`: `logo`) and page view `/`             | `customEvents`, `pageViews` | Confirmed      |
| “Mapa”                                                                                           | Header, every page                | `NavigationLinkClicked` (`item`: `map`) and page view `/`              | `customEvents`, `pageViews` | Confirmed      |
| “Aprenda”                                                                                        | Header, every page                | `NavigationLinkClicked` (`item`: `learn`) and page view `/aprenda`     | `customEvents`, `pageViews` | Confirmed      |
| “Avaliar o EcoDrop ↗” (Microsoft Forms, external)                                                | Header, every page                | `NavigationLinkClicked` (`item`: `feedback`, `linkType`: `external`)   | `customEvents`              | Confirmed      |
| “Código-fonte ↗” (GitHub, external)                                                              | Header, every page                | `NavigationLinkClicked` (`item`: `repository`, `linkType`: `external`) | `customEvents`              | Confirmed      |
| “Buscar” button or Enter                                                                         | Map, search panel                 | `Search`                                                               | `customEvents`              | Confirmed      |
| “Buscar” with an empty field                                                                     | Map, search panel                 | None (only shows a message)                                            | —                           | Not tracked    |
| “Saiba mais ↗”                                                                                   | Map, search result                | `LearnMoreClick` and page view `/aprenda/<id>`                         | `customEvents`, `pageViews` | Confirmed      |
| “Limpar busca”, or erasing the search text                                                       | Map, search panel                 | None                                                                   | —                           | Not tracked    |
| “Fechar” and “Abrir busca” (close and reopen the search panel, on screens narrower than 1024 px) | Map, search panel                 | None                                                                   | —                           | Not tracked    |
| “Aprenda” link in the no-results message                                                         | Map, search panel                 | Page view `/aprenda`                                                   | `pageViews`                 | Page view only |
| Source links (“Fonte: …”, external)                                                              | Map, search result                | None                                                                   | —                           | Not tracked    |
| Collection point marker (click or Enter)                                                         | Map                               | `CollectionPointOpened`                                                | `customEvents`              | Confirmed      |
| “Ver no OpenStreetMap ↗” (external)                                                              | Map, point popup                  | `CollectionPointLinkClick`                                             | `customEvents`              | Not validated  |
| Source links (“Fonte: …”, external)                                                              | Map, point popup                  | None                                                                   | —                           | Not tracked    |
| Popup close button (×)                                                                           | Map, point popup                  | None                                                                   | —                           | Not tracked    |
| Zoom buttons, dragging and zooming the map                                                       | Map                               | None                                                                   | —                           | Not tracked    |
| Attribution links (Leaflet, OpenStreetMap; external)                                             | Map, bottom-right corner          | None                                                                   | —                           | Not tracked    |
| Location permission (allow or block)                                                             | Map, browser prompt               | None                                                                   | —                           | Not tracked    |
| Waste-type cards (“Ver como descartar ↗”)                                                        | Aprenda                           | Page view `/aprenda/<id>`                                              | `pageViews`                 | Page view only |
| Breadcrumb “Aprenda”                                                                             | Waste-type page                   | Page view `/aprenda`                                                   | `pageViews`                 | Page view only |
| “Ver no mapa os pontos que recebem”                                                              | Waste-type page                   | `ViewOnMapClick` and page view `/`                                     | `customEvents`, `pageViews` | Confirmed      |
| Official source links (“Fontes oficiais”, external)                                              | Waste-type page                   | None                                                                   | —                           | Not tracked    |
| “Voltar para Aprenda”                                                                            | Page not found                    | Page view `/aprenda`                                                   | `pageViews`                 | Page view only |
| Initial load timing                                                                              | Every page (automatic)            | Load timing of the first page                                          | `browserTimings`            | Confirmed      |
| JavaScript errors                                                                                | Every page (automatic)            | Exception                                                              | `exceptions`                | Confirmed      |

Things to know when reading these records:

- Links to other sites never create a page view. For “Avaliar o EcoDrop”, “Código-fonte” and “Ver no OpenStreetMap”, the click event is the only record. The other external links leave no record at all.
- A page view is recorded only when the page changes. Clicking the logo or “Mapa” while already on the map sends `NavigationLinkClicked` without a page view.
- Arriving at the map with a search already in the address (from “Ver no mapa os pontos que recebem”, a reload or the browser's back and forward buttons) shows results without sending `Search`. Only submitting the search form sends it.
- “Ver no OpenStreetMap ↗” appears only in the popups of points with an `osmUrl`, currently Carrefour Bairro Caçapava and Supermercado Shibata.

### Pending items

1. **Validate `CollectionPointLinkClick`.** The event is in the code but no record has arrived yet. Open the popup of Carrefour Bairro Caçapava or Supermercado Shibata, click “Ver no OpenStreetMap ↗” and check the result with the “OpenStreetMap links by point” query.
2. **Page-view timestamps.** For every page view after the first, the SDK reuses the initial load duration and sets the timestamp to the current time minus that duration. Counts are not affected, but a page view can be listed up to tens of seconds before the click that opened it. A possible fix, not applied: send `duration: 0` in the properties of the page views after the first one, in [`src/App.jsx`](src/App.jsx).
3. **Interactions without records.** Official source links and pages not found are not tracked. Tracking them would show whether visitors check the sources and which broken addresses are visited.

### KQL queries

Run these queries in the Azure portal: open the `ecodrop-insights` resource and select **Logs**, under **Monitoring**.

#### Before running a query

- Wait a few minutes after using the site before running a query.
- Ad blockers, including Brave's built-in blocker, stop the SDK. Test in a browser without one.
- A tab opened before a deploy keeps running the previous version until it is reloaded. Reload the site before testing a new release.
- Page views recorded until October 28, 2026 came from an older version and are named `EcoDrop`. The queries use `name startswith "/"` to leave them out.
- Each query sets its own time range with `timestamp > ago(...)`, so the portal shows the time range as “Set in query”.
- Do not use `views`, `first` or `last` as column names. They are reserved words and cause the error “Query could not be parsed”.

#### Checking a release

After a deploy, reload the site in a browser without an ad blocker, use the features you want to check, wait a few minutes and run these queries. They cover the last hour.

Everything recorded in the last hour:

```kusto
union customEvents, pageViews
| where timestamp > ago(1h)
| project timestamp, type = itemType, name, isInitialLoad = tostring(customDimensions.isInitialLoad), properties = tostring(customDimensions), browser = client_Browser
| order by timestamp desc
```

Each action should appear as a row: page views as `pageView`, clicks and searches as `customEvent`, with their properties. The first page view of your test should have `isInitialLoad` set to `true`. If it is `false`, the tab was opened earlier and may still be running the previous version.

Clicks on “Ver no mapa os pontos que recebem”:

```kusto
customEvents
| where timestamp > ago(1h) and name == "ViewOnMapClick"
| project timestamp, wasteType = tostring(customDimensions.wasteType), destination = tostring(customDimensions.destination), browser = client_Browser
| order by timestamp desc
```

Expect one row per click, with the waste type of the page and `destination` set to `/`.

The same click and the map page view it opened, grouped by visit:

```kusto
union
    (customEvents | where name == "ViewOnMapClick"),
    (pageViews | where name startswith "/")
| where timestamp > ago(1h)
| project timestamp, visit = session_Id, type = itemType, name, detail = tostring(customDimensions.wasteType)
| order by visit asc, timestamp asc
```

`visit` is the SDK's session ID, which changes when the page is reloaded. Expect a `ViewOnMapClick` row and a `pageView` row named `/` next to each other in the same visit. The page view may be listed before the click; see [Pending items](#pending-items).

“Ver no mapa”, “Avaliar o EcoDrop” and “Código-fonte” together:

```kusto
customEvents
| where timestamp > ago(1h)
| where name == "ViewOnMapClick"
    or (name == "NavigationLinkClicked" and tostring(customDimensions.item) in ("feedback", "repository"))
| extend interaction = case(
    name == "ViewOnMapClick", "Ver no mapa",
    tostring(customDimensions.item) == "feedback", "Avaliar o EcoDrop",
    "Código-fonte")
| project timestamp, interaction, browser = client_Browser
| order by timestamp desc
```

Expect one row for each click on these three elements.

#### Page views

Page views by page:

```kusto
pageViews
| where timestamp > ago(30d) and name startswith "/"
| summarize pageViewCount = count() by page = name
| order by pageViewCount desc
```

Shows which pages are used the most. Expect only `/`, `/aprenda` and `/aprenda/<id>` names.

Page views per day, as a chart:

```kusto
pageViews
| where timestamp > ago(30d) and name startswith "/"
| summarize pageViewCount = count() by day = bin(timestamp, 1d)
| render columnchart
```

Page views per day and page:

```kusto
pageViews
| where timestamp > ago(30d) and name startswith "/"
| summarize pageViewCount = count() by day = bin(timestamp, 1d), page = name
| order by day asc, pageViewCount desc
```

Aprenda visits by route:

```kusto
pageViews
| where timestamp > ago(30d) and name startswith "/aprenda"
| summarize pageViewCount = count() by page = name
| order by pageViewCount desc
```

Shows which waste-type pages are read the most.

Approximate city:

```kusto
pageViews
| where timestamp > ago(30d) and name startswith "/"
| summarize pageViewCount = count() by client_City
| order by pageViewCount desc
```

Shows where visits come from, estimated from the IP address. City names appear without accents, such as `Cacapava`.

Initial page load duration:

```kusto
pageViews
| where timestamp > ago(30d) and tostring(customDimensions.isInitialLoad) == "true"
| summarize averageDuration = avg(duration), p95Duration = percentile(duration, 95)
```

In milliseconds. Only the first page view of each tab counts, because later page views repeat the same value.

#### Searches

Search volume and no-result rate:

```kusto
customEvents
| where timestamp > ago(30d) and name == "Search"
| summarize totalSearches = count(), notFound = countif(toint(tostring(customDimensions.results)) == 0)
| extend notFoundRate = iff(totalSearches == 0, real(0), round(100.0 * notFound / totalSearches, 1))
```

`notFoundRate` is the percentage of searches that found no item.

Most searched terms:

```kusto
customEvents
| where timestamp > ago(30d) and name == "Search"
| summarize searches = count() by term = tolower(tostring(customDimensions.term))
| top 10 by searches desc
```

Searches that found no item or no collection point:

```kusto
customEvents
| where timestamp > ago(30d) and name == "Search"
| extend term = tostring(customDimensions.term), results = toint(tostring(customDimensions.results)), points = toint(tostring(customDimensions.points))
| where results == 0 or points == 0
| summarize searches = count() by term, gap = iff(results == 0, "item not in catalog", "no compatible point")
| order by searches desc
```

`item not in catalog` means the term matched no item and may be worth adding to `searchableItems.json`. `no compatible point` means the item exists but no collection point accepts it.

Searches per map view:

```kusto
// Page views are named by route only from this moment on
let since = toscalar(pageViews | where name startswith "/" | summarize min(timestamp));
let searches = toscalar(customEvents | where timestamp >= since and name == "Search" | count);
let mapViews = toscalar(pageViews | where timestamp >= since and name == "/" | count);
print searchesPerMapView = iff(mapViews == 0, real(0), todouble(searches) / todouble(mapViews))
```

Shows how often map visitors search. The `since` line leaves out the period before page views were named by route.

#### Clicks and other interactions

Events by name:

```kusto
customEvents
| where timestamp > ago(30d)
| summarize total = count() by name
| order by total desc
```

An overview of all custom events. Expect only the event names listed in [Metrics and events](#metrics-and-events).

Navigation clicks by link:

```kusto
customEvents
| where timestamp > ago(30d) and name == "NavigationLinkClicked"
| summarize clicks = count() by item = tostring(customDimensions.item), linkType = tostring(customDimensions.linkType)
| order by clicks desc
```

`item` is `logo`, `map`, `learn`, `feedback` or `repository`. The `external` links, `feedback` and `repository`, only appear here, never in `pageViews`.

Total clicks on “Ver no mapa os pontos que recebem”:

```kusto
customEvents
| where timestamp > ago(30d) and name == "ViewOnMapClick"
| summarize clicks = count()
```

Clicks on “Ver no mapa os pontos que recebem” by waste type:

```kusto
customEvents
| where timestamp > ago(30d) and name == "ViewOnMapClick"
| summarize clicks = count() by wasteType = tostring(customDimensions.wasteType)
| order by clicks desc
```

Clicks on “Saiba mais” by waste type:

```kusto
customEvents
| where timestamp > ago(30d) and name == "LearnMoreClick"
| summarize clicks = count() by wasteType = tostring(customDimensions.wasteType)
| order by clicks desc
```

Collection points opened on the map:

```kusto
customEvents
| where timestamp > ago(30d) and name == "CollectionPointOpened"
| summarize opens = count() by point = tostring(customDimensions.name)
| order by opens desc
```

Shows which points attract the most interest.

OpenStreetMap links by point:

```kusto
customEvents
| where timestamp > ago(30d) and name == "CollectionPointLinkClick"
| summarize clicks = count() by pointId = tostring(customDimensions.pointId)
| order by clicks desc
```

Returns no rows until someone clicks “Ver no OpenStreetMap ↗”; see [Pending items](#pending-items).

Clicks on “Ver no mapa”, “Avaliar o EcoDrop” and “Código-fonte” per day:

```kusto
customEvents
| where timestamp > ago(30d)
| where name == "ViewOnMapClick"
    or (name == "NavigationLinkClicked" and tostring(customDimensions.item) in ("feedback", "repository"))
| extend interaction = case(
    name == "ViewOnMapClick", "Ver no mapa",
    tostring(customDimensions.item) == "feedback", "Avaliar o EcoDrop",
    "Código-fonte")
| summarize clicks = count() by day = bin(timestamp, 1d), interaction
| order by day asc, interaction asc
```

#### Investigating missing data

Use these queries when an interaction does not show up.

Tables that received data:

```kusto
union withsource = sourceTable *
| where timestamp > ago(30d)
| summarize total = count(), lastSeen = max(timestamp) by sourceTable
| order by sourceTable asc
```

`pageViews`, `customEvents` and `browserTimings` should have recent rows whenever the site is used. The SDK fills `exceptions` and `customMetrics` by itself. If nothing arrives, the SDK is not loading: check for an ad blocker and the `ECODROP_APPINSIGHTS_CONNECTION_STRING` repository variable.

When each event was first and last received:

```kusto
customEvents
| where timestamp > ago(30d)
| summarize total = count(), firstSeen = min(timestamp), lastSeen = max(timestamp) by name
| order by name asc
```

An event from the code that is missing here has never been received. `lastSeen` shows whether it still arrives after a release.

Properties received by each event:

```kusto
customEvents
| where timestamp > ago(30d)
| mv-expand property = bag_keys(customDimensions) to typeof(string)
| summarize total = count() by name, property
| order by name asc, property asc
```

Compare with [Metrics and events](#metrics-and-events). A property missing from this list was not sent.

How long records take to be stored:

```kusto
customEvents
| where timestamp > ago(1d)
| extend delaySeconds = datetime_diff("second", ingestion_time(), timestamp)
| summarize averageDelay = round(avg(delaySeconds), 1), maxDelay = max(delaySeconds)
```

In seconds, between the action and the moment the record was stored. In October 2026 the average was about 10 seconds. If the delay is much longer, wait before concluding that a record is missing.

JavaScript errors:

```kusto
exceptions
| where timestamp > ago(30d)
| project timestamp, problemId, outerMessage, browser = client_Browser
| order by timestamp desc
```

Each row is an error in a visitor's browser. `Script error.` without details usually comes from code outside the site, such as a browser extension, and cannot be traced further.

Items the SDK reports as delivered:

```kusto
customMetrics
| where timestamp > ago(30d)
| summarize items = sum(valueSum) by name, telemetryType = tostring(customDimensions.telemetryType)
| order by name asc, telemetryType asc
```

The SDK sends these metrics by itself. `Item_Success_Count` counts the items it delivered, by type: `PAGE_VIEW`, `CUSTOM_EVENT` and `EXCEPTION`.

Data volume per day:

```kusto
union withsource = sourceTable *
| where timestamp > ago(7d)
| summarize megabytes = round(sum(_BilledSize) / 1024.0 / 1024.0, 3) by day = bin(timestamp, 1d)
| order by day asc
```

In megabytes. The workspace stores up to 0.1 GB (about 100 MB) per day. When the limit is reached, data stops being stored until the next day.

### Privacy and setup

- Cookies are disabled with `disableCookiesUsage: true`. While the page is open, the SDK keeps a session ID in the browser's local storage and discards it on the next load, so it does not identify a visitor between visits.
- Application Insights uses the visitor's IP address to estimate the city; the IP is not retained for that geolocation measurement.
- The code is in [`src/utils/telemetry.js`](src/utils/telemetry.js). Local development, tests and the CI build send nothing.
- The pipeline passes the connection string to the image build from the `ECODROP_APPINSIGHTS_CONNECTION_STRING` repository variable, which holds the `application_insights_connection_string` Terraform output. The connection string is not a secret: it only allows sending data, and every visitor's browser receives it.
- The Log Analytics workspace has a daily limit of 0.1 GB, which keeps a month of data within the 5 GB that Azure includes for free.
- Ad blockers often block analytics, so the numbers are somewhat lower than the real use.

## Map

The map uses [Leaflet](https://leafletjs.com) with [React Leaflet](https://react-leaflet.js.org) and the standard [OpenStreetMap](https://www.openstreetmap.org) tiles. These tiles are subject to the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/): they are meant for low traffic and require the attribution shown in the corner of the map. If traffic grows, replace the URL in `TileLayer` with a self-hosted or commercial tile provider.

### Collection points

The points are stored in [`src/data/collectionPoints.json`](src/data/collectionPoints.json). Each item in the list becomes a marker on the map, and its fields make up the popup:

The current dataset contains collection points in Caçapava only.

| Field             | Required | Where it appears in the popup                                                                                                                                                                                |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`              | yes      | Not shown. It is the point's unique identifier                                                                                                                                                               |
| `name`            | yes      | Title                                                                                                                                                                                                        |
| `address`, `city` | yes      | Address line: "`address`, `city`"                                                                                                                                                                            |
| `lat`, `lng`      | yes      | Marker position, in decimal degrees                                                                                                                                                                          |
| `hours`           | no       | "Horário: …" (opening hours)                                                                                                                                                                                 |
| `materials`       | no       | "Recebe:" list (accepted materials); omitted when empty                                                                                                                                                      |
| `notes`           | no       | Note in italics                                                                                                                                                                                              |
| `sources`         | yes      | "Fonte: …" (source), with one entry per item. `label` is the displayed text and `url` is the link address. `url` is optional: without it, the label is shown as plain text (used for in-person verification) |
| `osmUrl`          | no       | Link to the point in OpenStreetMap, shown as "Ver no OpenStreetMap ↗"                                                                                                                                        |

Example (the Caçapava point, exactly as it appears in the file):

```json
{
  "id": "cacapava-pev-vila-santos",
  "name": "PEV Vila Santos",
  "city": "Caçapava",
  "address": "Rua Regente Feijó, 18 (pátio da Secretaria de Obras)",
  "lat": -23.0985477,
  "lng": -45.7039216,
  "hours": "Segunda a sexta, das 8h às 15h",
  "materials": [
    "Materiais recicláveis",
    "Pilhas e baterias",
    "Eletrônicos",
    "Óleo de cozinha usado"
  ],
  "sources": [
    {
      "label": "Prefeitura de Caçapava",
      "url": "https://cacapava.sp.gov.br/coleta-certa-pev-reabre-no-dia-19-de-maio-em-cacapava"
    }
  ]
}
```

In the popup, this `sources` entry is rendered as "Fonte: [Prefeitura de Caçapava](https://cacapava.sp.gov.br/coleta-certa-pev-reabre-no-dia-19-de-maio-em-cacapava)". When there is more than one source, the links are separated by " · ".

External links open in a new tab and include a screen-reader-only notice. When `osmUrl` is absent, the dedicated OpenStreetMap link is omitted.
The Carrefour point intentionally keeps its OpenStreetMap URL in both `sources` and `osmUrl`, so it appears as a source and as the dedicated map link.

The popup text is in Portuguese, the language of the app's users.

### Item search

Searchable items are maintained in [`src/data/searchableItems.json`](src/data/searchableItems.json). Each entry explicitly defines its `name`, `synonyms`, and `wasteType`; add or correct search terms in this catalog and cover the change with a test in `src/search/itemSearch.test.js`. Do not infer an item's waste type from a collection point's `materials`.

The browser searches this catalog with MiniSearch. Searches ignore letter case and accents, support prefixes and a small fuzzy distance, and are submitted by Enter or the **Buscar** button. The submitted term is stored in the `busca` query parameter and restored on reload and browser back/forward navigation. The current catalog is an initial set whose waste-type assignments and synonyms should be reviewed by the project team.

The search panel sits to the left of the map on desktop with 24 px of horizontal inner spacing and moves above the map below 1024 px. The RF08 waste-type filter shown in the prototype is intentionally outside this search feature's scope.

### Relationships between data files

The app keeps searchable vocabulary, collection locations, and educational content in separate static JSON files. Keep the links between them explicit:

```text
searchableItems.json
  item.wasteType ───────────────► wasteTypeDetails.json key
  item.collectionPointMaterials ► collectionPoints.json[].materials

collectionPoints.json
  each entry ───────────────────► one map marker and one listed collection point
```

#### `searchableItems.json`: item catalog

Each entry describes one searchable item:

| Field                      | Purpose                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                       | Stable, unique item identifier.                                                                                                                              |
| `name`                     | Item's primary display/search name.                                                                                                                          |
| `synonyms`                 | Alternative names that safely mean the same item.                                                                                                            |
| `wasteType`                | Exact key of this item's educational entry in `wasteTypeDetails.json`. Items that share a waste type share its content and learning page.                    |
| `collectionPointMaterials` | Explicit accepted-material labels that connect this item to collection points. Each value must exactly match a `materials` value in `collectionPoints.json`. |

Do not guess item-to-point compatibility from similar wording. Every distinct label in `collectionPoints.json[].materials` must appear exactly in at least one item's `collectionPointMaterials`, and every catalog mapping must match a point material. Add a material here only after confirming that it represents this item and is listed for the intended point(s). Although search matching ignores letter case and accents, keep the stored labels identical.

#### `collectionPoints.json`: locations and accepted materials

Each collection point has its own stable `id`, `name`, `address`, `city`, map coordinates, and verified `materials`. The `materials` array supplies the accepted labels used by the item catalog's `collectionPointMaterials` mapping. A point is listed under a search result and kept on the filtered map when at least one of the result item's mapped materials matches one of the point's accepted materials. If no point matches, the result shows the no-compatible-points state.

Add or update the point itself in this file; do not duplicate point names or addresses in the item catalog. The result card derives the point count, name, and address from the matching entries here.

#### `wasteTypeDetails.json`: educational content by waste type

This file is an object keyed by the exact `wasteType` string from the item catalog. Every distinct item waste type must have an entry:

| Field           | Shape                                          | Display                                                                                      |
| --------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `id`            | String                                         | Stable identifier used in the learning page URL (`/aprenda/<id>`).                           |
| `summary`       | String                                         | Short description on the card of the learning index page.                                    |
| `impacts`       | Array of strings                               | Impacts on the learning page.                                                                |
| `disposalGuide` | Array of strings                               | Ordered disposal steps on the result and learning page.                                      |
| `sources`       | Array of `{ "label": string, "url"?: string }` | Official references rendered by `SourceList`. A source without a URL is shown as plain text. |

The content comes from official sources, verified in October 2026: federal laws and decrees (Planalto), Conama resolutions, the Ministry of the Environment and its reverse logistics portal (SINIR), CETESB, São Paulo state and city government pages, and the Caçapava City Hall. Keep impacts and steps as short sentences, state only what the listed sources support, and list every source used by an entry in its `sources` array. Facts specific to Caçapava, such as the collection schedules, come from the city hall. Caçapava does not publish preparation tips for recyclables, so tips such as rinsing packaging or wrapping broken glass come from the São Paulo city hall; review them if Caçapava publishes its own.

While a field is being researched, a bracketed placeholder such as `"[Impacto ambiental a pesquisar com fonte oficial]"`, `"[Passo de descarte confirmado pela equipe]"`, or `"[Nome da fonte oficial]"` makes the UI show a pending-content message instead of presenting it as a verified fact. The test suite rejects placeholders, so an entry is only complete once every field has sourced content. Do not use a fake URL as a real source link.

The **Saiba mais** action opens the same learning page for every waste type, using the selected item's `wasteType` to load impacts, disposal steps, and sources. Thus, adding a new item with a new waste type requires adding both the item to `searchableItems.json` and the matching educational entry to `wasteTypeDetails.json`. Adding an item to an existing type reuses that type's page and content.

#### Tests that guard the relationships

The test suite checks that each catalog waste type has a summary, impacts, disposal steps, and HTTPS sources without placeholders, each mapped material exists in collection-point data, the UI replaces placeholders with pending-content messages, and the learning page is reachable and renders its content for every distinct waste type. Update these tests and run `npm test` and `npm run test:e2e` when adding or changing a type. These checks are intended to catch missing JSON links before the new entry is considered complete.

### Data sources

A point is only included if its location is precise and it is confirmed to be operating, either by a verifiable source or by an in-person visit from the project team. The current dataset is limited to Caçapava. "PEV" stands for _Ponto de Entrega Voluntária_, a public drop-off point run by the city. Data verified on October 28, 2026:

| Point                                                  | Distance | Information                                                                                                                          | Location                                                                                                                                                            |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PEV Vila Santos (Caçapava)                             | 0.4 km   | [Caçapava City Hall, news article of May 15, 2025](https://cacapava.sp.gov.br/coleta-certa-pev-reabre-no-dia-19-de-maio-em-cacapava) | Map of the Public Works Department published on the [city hall's website](https://www.cacapava.sp.gov.br/obras-e-servicos-municipais/coleta-de-lixo) (same address) |
| Correios - Agência Central (Caçapava), electronics     | 0.1 km   | [Correios press release](https://saladeimprensa.correios.com.br/arquivos/14573); branch participation confirmed by the user          | [Google Maps](https://www.google.com/maps/search/?api=1&query=Correios+R.+Prudente+de+Moraes%2C+4%2C+Centro%2C+Ca%C3%A7apava+-+SP) (exact address)                  |
| Carrefour Bairro Caçapava (Caçapava), battery drop-off | 0.4 km   | In-person verification (October 2026). No public information was found                                                               | [OSM way 558135447](https://www.openstreetmap.org/way/558135447) (supermarket building, Avenida Brasil, 401)                                                        |
| Droga Raia (Caçapava), medicine drop-off               | 0.2 km   | In-person verification (October 2026). No public information was found                                                               | [Tiendeo store directory](https://www.tiendeo.com.br/Lojas/cacapava/droga-raia) (Praça da Bandeira, 45)                                                             |
| Drogaria São Paulo (Caçapava), medicine drop-off       | 0.2 km   | In-person verification (October 2026). No public information was found                                                               | [Tiendeo store directory](https://www.tiendeo.com.br/Lojas/cacapava/av-cel-manoel-inoc%C3%AAncio-centro/90762) (Avenida Coronel Manoel Inocêncio, 141)              |

Where each kind of information comes from:

- **Name, address, opening hours and materials:** official Caçapava City Hall information ("Information" column) and in-person verification.
- **Coordinates of points mapped in OSM:** OpenStreetMap elements ("Location" column). When the element is an area (`way`), the coordinate used is its center. This data is licensed under the [ODbL](https://www.openstreetmap.org/copyright), and the "© OpenStreetMap contributors" attribution shown on the map satisfies that requirement.
- **Coordinate of PEV Vila Santos:** map link for the Public Works Department published on the Caçapava City Hall website. The PEV is in the department's yard, at the same address.
- **Correios - Agência Central:** the Google Maps business pin matches the supplied address. The Correios press release confirms the electronics collection program at participating agencies; this branch's participation was separately confirmed by the user. The program accepts small electronics such as cellphones, but not batteries or lamps.
- **Carrefour Bairro Caçapava:** the battery drop-off point was observed in person by the project team, since neither the store nor the city publishes this information. The coordinate is the center of the supermarket building in OSM, so it marks the store rather than the exact spot of the bin.
- **Droga Raia and Drogaria São Paulo:** the medicine drop-off points were also observed in person. Neither store is mapped in OSM, so the coordinates come from the Tiendeo store directory. They were checked against OSM: each falls within about 20 m of the street in its address and outside the Praça da Bandeira square. Since Tiendeo is a third-party directory, these coordinates are less reliable than the others and should be replaced once the stores are mapped in OSM.

To check what exists in OSM, paste the query below into [overpass-turbo.eu](https://overpass-turbo.eu). It searches for recycling points and for elements with "PEV", "ecoponto" or "recicl" in their name in Caçapava and the neighboring municipalities. The results must be checked manually against the official lists, because the name search also returns elements unrelated to waste, such as "IPEV", an Air Force area.

```
[out:json][timeout:120];
// Caçapava and neighboring municipalities (OSM administrative boundaries)
rel(id:298443,298019,298039,298129,298450,298013);
map_to_area->.a;
(
  nwr(area.a)["amenity"~"^(recycling|waste_transfer_station)$"];
  nwr(area.a)["name"~"PEV|ecoponto|recicl",i];
);
out center tags;
```

### Adding or updating a point

Only add a point when its operation and accepted materials have been confirmed and its location can be placed precisely. A recent official source or an in-person visit by the project team can confirm the point. Do not add a location based only on an unverified listing, a street-level geocoding result, or an approximate neighborhood coordinate.

1. **Verify the point.** Confirm that it is currently operating, record its full address, opening hours (if available) and accepted materials. Keep the source URL for each published fact. For an in-person visit, record the verification month and year.
2. **Find a precise coordinate.** Prefer the point's OpenStreetMap element or a map published by the source. For an OSM area such as a `way`, use its center. If neither is available, a store-directory coordinate is acceptable only after checking in OSM that it falls on the street at the address. Do not use coordinates that only identify the street or neighborhood.
3. **Add the record** to `src/data/collectionPoints.json`. Give it a stable, unique `id` (a lowercase, hyphen-separated name is a good choice), and fill in `name`, `city`, `address`, `lat`, `lng`, and `sources`. Add `hours` and `materials` when verified; list only materials the point confirmed it accepts. Use decimal-degree coordinates.
4. **Record sources and verification date.** Each point needs at least one labeled `sources` entry. Use a URL for a linked source. Add a separate plain-text source entry for the verification, using exactly `Verificação presencial (mês de ano)` for a visit or `Verificação por fonte oficial (mês de ano)` for an official-source check; for example, `Verificação presencial (outubro de 2026)`. These labels are displayed in the point popup.
5. **Add the OSM link when available.** If the point has an OSM element, set `osmUrl` to its URL and include that OSM reference in `sources` as well. If it has no OSM element, omit `osmUrl`.
6. **Check item-search links.** `materials` are the labels displayed for the point. Add every accepted label exactly to at least one relevant item's `collectionPointMaterials` in `src/data/searchableItems.json`; if no relevant item exists, add one to the catalog. Keep the reverse link valid too: every catalog mapping must appear in at least one point's `materials`. Use an existing `wasteType` from the catalog; if adding a new type, also add its educational entry to `src/data/wasteTypeDetails.json`.
7. **Update the data-source table.** Add or update the point in the table above with its distance, information source, and location source. Refresh the `Data verified on ...` date to reflect the latest verification.
8. **Run the checks.** Run `npm test` and resolve any failures. Then run `npm run dev`, open the map, click the point's marker, and verify its name, address, hours, materials, sources and OSM link (when present) in the popup.

Example record:

```json
{
  "id": "cacapava-example-drop-off",
  "name": "Example drop-off point",
  "city": "Caçapava",
  "address": "Street name, 123",
  "lat": -23.1001,
  "lng": -45.7001,
  "hours": "Monday to Friday, 8 am to 5 pm",
  "materials": ["Pilhas e baterias"],
  "sources": [
    {
      "label": "Verificação presencial (outubro de 2026)"
    },
    {
      "label": "Official source",
      "url": "https://example.org/collection-point"
    }
  ]
}
```

Replace the example details with verified information. Do not use the example URL as a real source.

### Coverage limitations

- **OpenStreetMap has no recycling or disposal points mapped in Caçapava.** The Overpass query only returned sewage treatment plants, which do not accept waste from the public.
- **PEV Santa Luzia II** (Rua João das Chagas do Nascimento) was not included. The latest official news about it is from 2019, the source does not give the building number, and the central PEV was closed between 2021 and 2025. There is no confirmation that it is operating today.
- **The mobile PEV, Cata-Treco (bulky waste pickup) and door-to-door recycling collection** have no fixed address, so they are not shown as markers. Recycling collection follows a schedule by neighborhood, published by the city hall.
- **National reverse logistics programs** (electronics, batteries, tires, light bulbs) do not publish open data with coordinates, and no confirmed point from them was found in Caçapava.
- **Most official PEVs in the neighboring cities are not on the map.** São José dos Campos lists 15 PEVs and Taubaté lists 14, but only a few are mapped in OSM. Geocoding the official addresses only locates the street, without the building number. Among the precisely located PEVs, Interlagos (25 km) and 31 de Março (27 km), both in São José dos Campos, fall outside the 20 km radius.

The most effective way to improve coverage is to map confirmed Caçapava points in OpenStreetMap itself (tag `amenity=recycling`), which also benefits other projects.
