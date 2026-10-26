# ecodrop

Web application for finding waste collection and disposal points in Caçapava, São Paulo, Brazil.

Built with [React](https://react.dev) and [Vite](https://vite.dev).

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

Create a version tag and push it:

```bash
git tag 1.0.1
git push origin 1.0.1
```

The pipeline in [`.github/workflows/ecodrop.yaml`](.github/workflows/ecodrop.yaml) then:

1. runs the usual checks: lint, tests and build;
2. builds the image and stores it in the registry;
3. updates the site and checks that it answers.

Pushes without a tag only run the checks. Each version number can be used only once.

The pipeline signs in to Azure through a trust relationship between GitHub and Azure, so no password is stored in GitHub. Its identity can only publish images and update the app.

### Infrastructure

Terraform creates and manages these resources, all in the `mexicocentral` region:

| Resource                   | Name           | Purpose                                      |
| -------------------------- | -------------- | -------------------------------------------- |
| Resource group             | `ecodrop-rg`   | Groups the resources below                   |
| Container registry         | `ecodropacr`   | Stores the published images                  |
| Container Apps environment | `ecodrop-env`  | The space where the app runs                 |
| Container app              | `ecodrop`      | Runs the site                                |
| Identity                   | `ecodrop-pull` | Lets the app download its image              |
| Identity                   | `ecodrop-cd`   | Lets the pipeline publish and update the app |

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

| Field                      | Purpose                                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                       | Stable, unique item identifier.                                                                                                                      |
| `name`                     | Item's primary display/search name.                                                                                                                  |
| `synonyms`                 | Alternative names that safely mean the same item.                                                                                                    |
| `wasteType`                | Exact key of this item's educational entry in `wasteTypeDetails.json`. Items that share a waste type share its content and learning page.            |
| `collectionPointMaterials` | Explicit accepted-material labels that connect this item to collection points. Each value must match a `materials` value in `collectionPoints.json`. |

Do not guess item-to-point compatibility from similar wording. Add a material here only after confirming that it represents this item and is listed for the intended point(s). Matching ignores letter case and accents, but otherwise uses the full material label.

#### `collectionPoints.json`: locations and accepted materials

Each collection point has its own stable `id`, `name`, `address`, `city`, map coordinates, and verified `materials`. The `materials` array supplies the accepted labels used by the item catalog's `collectionPointMaterials` mapping. A point is listed under a search result and kept on the filtered map when at least one of the result item's mapped materials matches one of the point's accepted materials. If no point matches, the result shows the no-compatible-points state.

Add or update the point itself in this file; do not duplicate point names or addresses in the item catalog. The result card derives the point count, name, and address from the matching entries here.

#### `wasteTypeDetails.json`: educational content by waste type

This file is an object keyed by the exact `wasteType` string from the item catalog. Every distinct item waste type must have an entry, even while content is being collected:

| Field           | Shape                                          | Display                                                                                      |
| --------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `impacts`       | Array of strings                               | Impacts on the learning page.                                                                |
| `disposalGuide` | Array of strings                               | Ordered disposal steps on the result and learning page.                                      |
| `sources`       | Array of `{ "label": string, "url"?: string }` | Official references rendered by `SourceList`. A source without a URL is shown as plain text. |

For missing content, keep at least one explicit placeholder in the relevant array, such as `"[Impacto ambiental a pesquisar com fonte oficial]"`, `"[Passo de descarte confirmado pela equipe]"`, or `"[Nome da fonte oficial]"`. The UI recognizes bracketed placeholder strings and displays a pending-content message instead of presenting them as verified facts. Do not use a fake URL as a real source link.

The **Saiba mais** action opens the same learning page for every waste type, using the selected item's `wasteType` to load impacts, disposal steps, and sources. Thus, adding a new item with a new waste type requires adding both the item to `searchableItems.json` and the matching educational entry to `wasteTypeDetails.json`. Adding an item to an existing type reuses that type's page and content.

#### Tests that guard the relationships

The test suite checks that each catalog waste type has educational data, each mapped material exists in collection-point data, all learning-data structures include placeholders, and the learning page is reachable and renders its sections for every distinct waste type. Update these tests and run `npm test` and `npm run test:e2e` when adding or changing a type. These checks are intended to catch missing JSON links before the new entry is considered complete.

### Data sources

A point is only included if its location is precise and it is confirmed to be operating, either by a verifiable source or by an in-person visit from the project team. The current dataset is limited to Caçapava. "PEV" stands for _Ponto de Entrega Voluntária_, a public drop-off point run by the city. Data verified on October 13, 2026:

| Point                                                  | Distance | Information                                                                                                                          | Location                                                                                                                                                            |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PEV Vila Santos (Caçapava)                             | 0.4 km   | [Caçapava City Hall, news article of May 15, 2025](https://cacapava.sp.gov.br/coleta-certa-pev-reabre-no-dia-19-de-maio-em-cacapava) | Map of the Public Works Department published on the [city hall's website](https://www.cacapava.sp.gov.br/obras-e-servicos-municipais/coleta-de-lixo) (same address) |
| Carrefour Bairro Caçapava (Caçapava), battery drop-off | 0.4 km   | In-person verification (October 2026). No public information was found                                                               | [OSM way 558135447](https://www.openstreetmap.org/way/558135447) (supermarket building, Avenida Brasil, 401)                                                        |
| Droga Raia (Caçapava), medicine drop-off               | 0.2 km   | In-person verification (October 2026). No public information was found                                                               | [Tiendeo store directory](https://www.tiendeo.com.br/Lojas/cacapava/droga-raia) (Praça da Bandeira, 45)                                                             |
| Drogaria São Paulo (Caçapava), medicine drop-off       | 0.2 km   | In-person verification (October 2026). No public information was found                                                               | [Tiendeo store directory](https://www.tiendeo.com.br/Lojas/cacapava/av-cel-manoel-inoc%C3%AAncio-centro/90762) (Avenida Coronel Manoel Inocêncio, 141)              |

Where each kind of information comes from:

- **Name, address, opening hours and materials:** official Caçapava City Hall information ("Information" column) and in-person verification.
- **Coordinates of points mapped in OSM:** OpenStreetMap elements ("Location" column). When the element is an area (`way`), the coordinate used is its center. This data is licensed under the [ODbL](https://www.openstreetmap.org/copyright), and the "© OpenStreetMap contributors" attribution shown on the map satisfies that requirement.
- **Coordinate of PEV Vila Santos:** map link for the Public Works Department published on the Caçapava City Hall website. The PEV is in the department's yard, at the same address.
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

1. Confirm that the point is operating, with a recent official source or an in-person visit, and note its address, opening hours and accepted materials. For an in-person visit, add a `sources` entry without `url` that says so and gives the date.
2. Get the exact coordinate, from an OpenStreetMap element or from a map published by the source itself. If neither exists, a store directory's coordinate can be used, as long as it falls on the street in the address when checked in OSM. Do not use geocoding that only finds the street, or approximate coordinates for the neighborhood: the marker would end up in the wrong place.
3. Add the point to `src/data/collectionPoints.json`, with its sources in `sources`.
4. Update the table above and the verification date.
5. Run `npm run dev`, click the new marker and check the popup.

### Coverage limitations

- **OpenStreetMap has no recycling or disposal points mapped in Caçapava.** The Overpass query only returned sewage treatment plants, which do not accept waste from the public.
- **PEV Santa Luzia II** (Rua João das Chagas do Nascimento) was not included. The latest official news about it is from 2019, the source does not give the building number, and the central PEV was closed between 2021 and 2025. There is no confirmation that it is operating today.
- **The mobile PEV, Cata-Treco (bulky waste pickup) and door-to-door recycling collection** have no fixed address, so they are not shown as markers. Recycling collection follows a schedule by neighborhood, published by the city hall.
- **National reverse logistics programs** (electronics, batteries, tires, light bulbs) do not publish open data with coordinates, and no confirmed point from them was found in Caçapava.
- **Most official PEVs in the neighboring cities are not on the map.** São José dos Campos lists 15 PEVs and Taubaté lists 14, but only a few are mapped in OSM. Geocoding the official addresses only locates the street, without the building number. Among the precisely located PEVs, Interlagos (25 km) and 31 de Março (27 km), both in São José dos Campos, fall outside the 20 km radius.

The most effective way to improve coverage is to map confirmed Caçapava points in OpenStreetMap itself (tag `amenity=recycling`), which also benefits other projects.
