# Credits & data attribution

WaniKanji generates its runtime data (`data/kanji.json`, `data/radicals.json`)
from the sources below via [`tools/build-data.js`](tools/build-data.js).

## WaniKani kanji metadata (`kanji-wanikani.json`)

WaniKani level assignments, meanings, readings, and radical composition come
from `kanji-wanikani.json`. "WaniKani" is a product of
[Tofugu / WaniKani](https://www.wanikani.com/); the level/radical structure it
defines is used here for educational, non-commercial study purposes. This app
is **not** affiliated with or endorsed by WaniKani.

## Example words & sentences (from the kanji-drill dataset)

The per-kanji example **words** and example **sentences** shown in the item-info
panel are taken from the sibling project
[kanji-drill](https://github.com/bagustris/kanji-drill), whose data derives
from:

### JMdict / KANJIDIC (dictionary data)

> This application uses the JMdict, KANJIDIC and related dictionary files. These
> files are the property of the [Electronic Dictionary Research and Development
> Group (EDRDG)](https://www.edrdg.org/), and are used in conformance with the
> Group's licence.

- Copyright © Electronic Dictionary Research and Development Group.
- Licence: **CC BY-SA 4.0** — <https://creativecommons.org/licenses/by-sa/4.0/>
- EDRDG licence: <https://www.edrdg.org/edrdg/licence.html>

Because this data is CC BY-SA, redistributing it (or derived works) must keep
this attribution and remain under a compatible share-alike licence.

### Kanji alive (some example words)

Some `examples` were backfilled from the
[Kanji alive](https://kanjialive.com) project
(<https://github.com/kanjialive/kanji-data-media>).

- Copyright © Kanji alive.
- Licence: **CC BY 4.0** — <https://creativecommons.org/licenses/by/4.0/>

## Radical glyphs (`tools/wk-radicals-source.json`)

The authoritative radical name → Unicode character mapping used to resolve
radical glyphs comes from
[baerrach/wanikani_exporter](https://github.com/baerrach/wanikani_exporter)
(`radicals.json`), a JSON export of WaniKani radical data.

- Licence: **MIT** — <https://github.com/baerrach/wanikani_exporter/blob/master/LICENSE>
- Radicals WaniKani renders as custom images (no Unicode `character`) are not
  reproduced here; they are omitted from the curriculum. "WaniKani" and its
  radical names/artwork are property of [Tofugu / WaniKani](https://www.wanikani.com/).

## Language facts

Kanji readings, okurigana, and radical names are language facts, not copied from
any commercial workbook.
