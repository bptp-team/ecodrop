# ecodrop

Web application for finding waste collection and disposal points in Caçapava, São Paulo, Brazil.

Built with [React](https://react.dev) and [Vite](https://vite.dev).

## Requirements

- Node.js 20.19+ or 22.12+

## Getting started

```bash
npm install   # installs the dependencies
npm run dev   # starts the development server at http://localhost:5173
```

Other scripts:

- `npm run build`: builds the production version into `dist/`
- `npm run preview`: serves the contents of `dist/` locally
- `npm run lint`: lints the code with oxlint

## Structure

```
public/        files served as-is (favicon)
src/
  components/  React components (e.g. the collection points map)
  config/      app configuration (e.g. initial map center and zoom)
  data/        static data (e.g. collection points)
  App.jsx      root component
  index.css    global styles
  main.jsx     entry point
```

New directories (`assets/`, `pages/`) should be created once there is content for them.

## Map

The map uses [Leaflet](https://leafletjs.com) with [React Leaflet](https://react-leaflet.js.org) and the standard [OpenStreetMap](https://www.openstreetmap.org) tiles. These tiles are subject to the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/): they are meant for low traffic and require the attribution shown in the corner of the map. If traffic grows, replace the URL in `TileLayer` with a self-hosted or commercial tile provider.

### Collection points

The points are stored in [`src/data/collectionPoints.json`](src/data/collectionPoints.json). Each item in the list becomes a marker on the map, and its fields make up the popup:

| Field | Required | Where it appears in the popup |
| --- | --- | --- |
| `id` | yes | Not shown. It is the point's unique identifier |
| `name` | yes | Title |
| `address`, `city` | yes | Address line: "`address`, `city`" |
| `lat`, `lng` | yes | Marker position, in decimal degrees |
| `hours` | no | "Horário: …" (opening hours) |
| `materials` | no | "Recebe:" list (accepted materials) |
| `notes` | no | Note in italics |
| `sources` | yes | "Fonte: …" (source), with one entry per item. `label` is the displayed text and `url` is the link address. `url` is optional: without it, the label is shown as plain text (used for in-person verification) |

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
  "materials": ["Materiais recicláveis", "Pilhas e baterias", "Eletrônicos", "Óleo de cozinha usado"],
  "sources": [
    {
      "label": "Prefeitura de Caçapava",
      "url": "https://cacapava.sp.gov.br/coleta-certa-pev-reabre-no-dia-19-de-maio-em-cacapava"
    }
  ]
}
```

In the popup, this `sources` entry is rendered as "Fonte: [Prefeitura de Caçapava](https://cacapava.sp.gov.br/coleta-certa-pev-reabre-no-dia-19-de-maio-em-cacapava)". When there is more than one source, the links are separated by " · ".

The popup text is in Portuguese, the language of the app's users.

### Data sources

A point is only included if its location is precise and it is confirmed to be operating, either by a verifiable source or by an in-person visit from the project team. Points in neighboring cities are included when they appear on the city hall's official list, are mapped in OSM and lie within 20 km of central Caçapava. "PEV" stands for *Ponto de Entrega Voluntária*, a public drop-off point run by the city. Data verified on October 13, 2026:

| Point | Distance | Information | Location |
| --- | --- | --- | --- |
| PEV Vila Santos (Caçapava) | 0.4 km | [Caçapava City Hall, news article of May 15, 2025](https://cacapava.sp.gov.br/coleta-certa-pev-reabre-no-dia-19-de-maio-em-cacapava) | Map of the Public Works Department published on the [city hall's website](https://www.cacapava.sp.gov.br/obras-e-servicos-municipais/coleta-de-lixo) (same address) |
| Carrefour Bairro Caçapava (Caçapava), battery drop-off | 0.4 km | In-person verification (October 2026). No public information was found | [OSM way 558135447](https://www.openstreetmap.org/way/558135447) (supermarket building, Avenida Brasil, 401) |
| Droga Raia (Caçapava), medicine drop-off | 0.2 km | In-person verification (October 2026). No public information was found | [Tiendeo store directory](https://www.tiendeo.com.br/Lojas/cacapava/droga-raia) (Praça da Bandeira, 45) |
| Drogaria São Paulo (Caçapava), medicine drop-off | 0.2 km | In-person verification (October 2026). No public information was found | [Tiendeo store directory](https://www.tiendeo.com.br/Lojas/cacapava/av-cel-manoel-inoc%C3%AAncio-centro/90762) (Avenida Coronel Manoel Inocêncio, 141) |
| PEV Portal da Mantiqueira (Taubaté) | 14.0 km | [City Hall Service Charter (March 2025)](https://taubate.sp.gov.br/anexos/ouvidoria/CARTA_DE_SERVICO_SESP.pdf) and [EcoTaubaté](http://www.ecotaubate.com.br/servicos-e-tecnologia/coleta-de-residuos-dos-pontos-de-entrega-voluntaria-pevs) | [OSM node 10759204861](https://www.openstreetmap.org/node/10759204861) |
| PEV Jardim Copacabana (São José dos Campos) | 16.5 km | [São José dos Campos City Hall](https://www.sjc.sp.gov.br/servicos/manutencao-da-cidade/pevs-na-cidade/) | [OSM way 1187312060](https://www.openstreetmap.org/way/1187312060) |
| PEV Vila Jaci (São José dos Campos) | 19.8 km | [São José dos Campos City Hall](https://www.sjc.sp.gov.br/servicos/manutencao-da-cidade/pevs-na-cidade/) | [OSM way 1281244617](https://www.openstreetmap.org/way/1281244617) |

The city halls of São José dos Campos and Taubaté describe their PEVs as intended for waste from their own residents. That is why the popup for these points includes that notice.

Where each kind of information comes from:

- **Name, address, opening hours and materials:** official pages of the city halls and of Taubaté's waste management concessionaire ("Information" column).
- **Coordinates of the neighboring points:** OpenStreetMap elements ("Location" column). When the element is an area (`way`), the coordinate used is its center. This data is licensed under the [ODbL](https://www.openstreetmap.org/copyright), and the "© OpenStreetMap contributors" attribution shown on the map satisfies that requirement.
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
